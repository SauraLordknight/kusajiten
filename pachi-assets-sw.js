/* Pachinko media only. This worker never stores documents, APIs or save data. */
'use strict';
const PREFIX='kusa-pachi-assets-';
const clientsCache=new Map();
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
 if(event.data?.type==='PACHI_ASSET_CACHE'&&/^kusa-pachi-assets-[a-f0-9]{20}$/.test(event.data.cacheName)){
  if(event.source?.id)clientsCache.set(event.source.id,event.data.cacheName);
  event.ports?.[0]?.postMessage({ready:true});
 }
});
async function stored(request,clientId){
 const url=new URL(request.url);url.search='';url.hash='';
 const preferred=clientsCache.get(clientId);
 // A worker can be stopped between requests. The page keeps just the current
 // manifest cache; discover it again without relying on persistent worker state.
 const keys=preferred?[preferred]:(await caches.keys()).filter(k=>k.startsWith(PREFIX)).reverse();
 for(const key of keys){const response=await(await caches.open(key)).match(url.href);if(response)return response;}
 return null;
}
async function serve(event){
 const request=event.request,response=await stored(request,event.clientId);
 if(!response)return fetch(request);
 if(request.method==='HEAD')return new Response(null,{status:200,headers:response.headers});
 const range=request.headers.get('Range');if(!range)return response;
 // MP4/audio on Safari commonly start with bytes=0-1. A cached 200 is not a
 // valid answer to that request: slice the complete body and return proper 206.
 const match=/^bytes=(\d*)-(\d*)$/.exec(range.trim());
 if(!match||(!match[1]&&!match[2]))return fetch(request);
 const blob=await response.blob(),size=blob.size;
 let start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
 let end=match[1]?(match[2]?Number(match[2]):size-1):size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||start<0||end<start){
  return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
 }
 end=Math.min(end,size-1);
 const headers=new Headers(response.headers);
 headers.delete('Content-Encoding');headers.set('Content-Range',`bytes ${start}-${end}/${size}`);
 headers.set('Content-Length',String(end-start+1));headers.set('Accept-Ranges','bytes');
 return new Response(blob.slice(start,end+1),{status:206,statusText:'Partial Content',headers});
}
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
 if(url.origin!==self.location.origin||!['GET','HEAD'].includes(request.method))return;
 // Admission must fetch the newly versioned bytes, never an older saved copy.
 if(url.searchParams.has('pachi_download_revision'))return;
 const path=url.pathname.slice(scope.pathname.length);
 if(!url.pathname.startsWith(scope.pathname)||!(/^(assets\/glass-girl\/|pachi-sounds\/)/.test(path)))return;
 event.respondWith(serve(event).catch(()=>fetch(request)));
});
