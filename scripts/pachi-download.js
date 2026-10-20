/* Persistent compressed-media cache; never expands images or touches player saves. */
(()=>{'use strict';
 const root=new URL('../',document.currentScript.src),PREFIX='kusa-pachi-assets-';
 let manifestPromise=null,workerPromise=null;
 const complete=new Map();
 class PachiDownloadError extends Error{
  constructor(message,code,cause){super(message);this.name='PachiDownloadError';this.code=code;this.recoverable=true;this.cause=cause;}
 }
 const abort=signal=>{if(signal?.aborted)throw new DOMException('ダウンロードを中止しました','AbortError');};
 function withAbort(promise,signal){if(!signal)return promise;abort(signal);return new Promise((resolve,reject)=>{const cancel=()=>reject(new DOMException('ダウンロードを中止しました','AbortError'));signal.addEventListener('abort',cancel,{once:true});promise.then(resolve,reject).finally(()=>signal.removeEventListener('abort',cancel));});}
 function supported(){return window.isSecureContext&&location.protocol!=='file:'&&'caches'in window&&'serviceWorker'in navigator;}
 async function manifest(){
  if(!manifestPromise)manifestPromise=fetch(new URL('pachi-download-manifest.json',root),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('manifest '+r.status);return r.json();}).then(m=>{if(m.schema!==1||!/^[a-f0-9]{20}$/.test(m.revision))throw Error('invalid manifest');return m;}).catch(e=>{manifestPromise=null;throw e;});
  return manifestPromise;
 }
 function bounded(promise,ms,label){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(label)),ms);promise.then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});});}
 async function worker(cacheName){
  if(!workerPromise)workerPromise=(async()=>{
   const registration=await navigator.serviceWorker.register(new URL('pachi-assets-sw.js',root),{scope:root.pathname,updateViaCache:'none'});
   await navigator.serviceWorker.ready;
   if(!navigator.serviceWorker.controller)await new Promise(resolve=>{const changed=()=>{if(navigator.serviceWorker.controller){navigator.serviceWorker.removeEventListener('controllerchange',changed);resolve();}};navigator.serviceWorker.addEventListener('controllerchange',changed);changed();});
   return registration;
  })().catch(e=>{workerPromise=null;throw e;});
  const registration=await bounded(workerPromise,12000,'service-worker-timeout');
  const target=navigator.serviceWorker.controller||registration.active;
  await bounded(new Promise(resolve=>{const channel=new MessageChannel();channel.port1.onmessage=()=>{channel.port1.close();resolve();};target.postMessage({type:'PACHI_ASSET_CACHE',cacheName},[channel.port2]);}),5000,'service-worker-handshake');
 }
 async function prepare(machine,{onProgress=()=>{},signal}={}){
  abort(signal);
  if(!supported())return{persistent:false,reason:'unsupported'};
  if(!['debug','kusa'].includes(machine))throw new TypeError('Unknown pachinko machine');
  let stage='manifest';
  try{
   const m=await withAbort(manifest(),signal);abort(signal);
   const mobile=matchMedia('(pointer:coarse), (max-width:767px)').matches;
   const list=machine==='kusa'?m.profiles.kusa:[...m.profiles.debug.common,...m.profiles.debug[mobile?'mobile':'desktop']];
   const key=PREFIX+m.revision,sessionKey=key+':'+machine+':'+mobile;
   let done=0,doneBytes=0,cached=0;const total=list.length,totalBytes=list.reduce((n,x)=>n+x.bytes,0);
   const progress=phase=>{const percent=totalBytes?Math.min(100,Math.floor(doneBytes/totalBytes*100)):100;onProgress({done,total,doneBytes,totalBytes,percent,remainingPercent:100-percent,cached,phase});};
   stage='storage';const cache=await caches.open(key);abort(signal);
   // Verify stored entries on each admission: eviction can happen while the page
   // stays open. Cache hits require no network, media decoding or body reads.
   const missing=[];progress('checking');
   for(const item of list){abort(signal);const url=new URL(item.url,root);if(url.origin!==location.origin||!url.href.startsWith(root.href))throw Error('asset outside site');const hit=await cache.match(url.href);if(hit?.ok&&hit.headers.get('X-Pachi-SHA256')===item.sha256){done++;doneBytes+=item.bytes;cached++;}else missing.push(item);}
   progress(missing.length?'downloading':'ready');stage='network';
   let next=0;
   const controller=new AbortController();
   const cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});
   try{
    const take=async()=>{for(;;){abort(signal);const item=missing[next++];if(!item)return;const url=new URL(item.url,root),downloadUrl=new URL(url);downloadUrl.searchParams.set('pachi_download_revision',item.sha256);
     await bounded((async()=>{const response=await fetch(downloadUrl,{cache:'reload',signal:controller.signal,credentials:'same-origin'});if(!response.ok||response.status===206)throw Error('asset '+response.status+': '+item.url);
     const headers=new Headers(response.headers);headers.set('X-Pachi-SHA256',item.sha256);headers.delete('Content-Encoding');headers.delete('Content-Length');
     // Stream the compressed response to Cache Storage. Never call Image.decode
     // or create a video during admission; that is a separate bounded step.
     stage='storage';await cache.put(url.href,new Response(response.body,{status:200,headers}));stage='network';})(),90000,'asset-timeout: '+item.url);
     if(controller.signal.aborted)throw new DOMException('Download cancelled','AbortError');
     abort(signal);done++;doneBytes+=item.bytes;progress('downloading');
    }};
    await Promise.all([take(),take()]);
   }catch(e){controller.abort();throw e;}finally{signal?.removeEventListener('abort',cancel);}
   abort(signal);stage='worker';await withAbort(worker(key),signal);abort(signal);
   complete.set(sessionKey,true);progress('ready');
   // Only pachinko asset caches are removed. Browser saves and other site caches
   // remain untouched, including all localStorage and IndexedDB player data.
   for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==key)await caches.delete(name);
   return{persistent:true,revision:m.revision,cached,total,downloaded:missing.length,totalBytes};
  }catch(e){
   if(e.name==='AbortError'||signal?.aborted)throw new DOMException('ダウンロードを中止しました','AbortError');
   const code=e.name==='QuotaExceededError'?'quota':stage;
   throw new PachiDownloadError(code==='quota'?'素材の保存容量が不足しています。':'パチンコ台のダウンロードを完了できませんでした。',code,e);
  }
 }
 window.PachiDownload=Object.freeze({prepare,supported,get completedSessions(){return complete.size;}});
})();
