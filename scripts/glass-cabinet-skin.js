/* One continuous raster frame. Display projection only; physics remains 440×570. */
(()=>{
 const machine=document.getElementById('pachiDebugMachine');if(!machine)return;
 const base='assets/glass-girl/cabinet-v1/';
 const layout=Object.freeze({cabinet:{width:521,height:809},board:{x:102.1,y:128,width:316.8,height:410.4},lcd:Object.freeze({x:80,y:118,width:360,height:430}),handle:{x:449,y:614.4,size:104},push:{x:449,y:521.5,size:68}});
 for(const [name,value] of Object.entries(layout.lcd))machine.style.setProperty('--glass-lcd-'+name,value+'px');
 const backdrop=document.createElement('div');backdrop.className='pdm-cabinet-interior';backdrop.setAttribute('aria-hidden','true');machine.prepend(backdrop);
 const art=document.createElement('div');art.className='pdm-cabinet-art';art.setAttribute('aria-hidden','true');
 const frame=document.createElement('img');frame.className='pdm-art-whole';frame.dataset.part='continuous-frame';frame.alt='';art.append(frame);machine.prepend(art);
 const sx=layout.board.width/451,sy=layout.board.height/499;
 machine.style.setProperty('--glass-board-x',(layout.board.x-8-15*sx)+'px');
 machine.style.setProperty('--glass-board-y',(layout.board.y-8-27*sy)+'px');
 machine.style.setProperty('--glass-board-sx',sx);machine.style.setProperty('--glass-board-sy',sy);
 const handle=machine.querySelector('.pdm-handle'),fire=document.getElementById('pdmFire'),push=document.getElementById('pdmPush');
 for(const node of [handle,fire])Object.assign(node.style,{left:(layout.handle.x-layout.handle.size/2-8)+'px',top:(layout.handle.y-layout.handle.size/2-8)+'px',width:layout.handle.size+'px',height:layout.handle.size+'px'});
 Object.assign(push.style,{left:(layout.push.x-layout.push.size/2-8)+'px',top:(layout.push.y-layout.push.size/2-8)+'px'});
 const win=document.getElementById('kusa-pachi-window'),panel=document.getElementById('pachiPanel');
 const loader=document.createElement('section');loader.className='glass-cabinet-loading';loader.hidden=true;loader.setAttribute('aria-label','パチンコ台の準備');
 loader.innerHTML='<p role="status">パチンコ台をダウンロードしています</p><progress max="100" value="0" aria-label="ダウンロード進捗"></progress><span class="pachi-download-percent">完了 0%・残り 100%</span><small class="pachi-download-note">次回からは、このブラウザに保存した素材を使用します。</small><button type="button" hidden>再試行</button><button type="button" class="pachi-download-skip" hidden>保存せずに開始</button>';win.append(loader);
 const status=loader.querySelector('p'),progress=loader.querySelector('progress'),percentage=loader.querySelector('.pachi-download-percent'),note=loader.querySelector('small'),retry=loader.querySelector('button'),skip=loader.querySelector('.pachi-download-skip');
 let preparing=null,generation=0,controller=null,currentMachine='debug';const downloaded=new Set(),bypass=new Set();
 const retryEvent=()=>document.dispatchEvent(new CustomEvent('glass-cabinet-retry',{detail:{machine:currentMachine}}));retry.onclick=retryEvent;skip.onclick=()=>{bypass.add(currentMachine);retryEvent();};
 new ResizeObserver(()=>win.style.setProperty('--cabinet-header-height',win.querySelector('.game-window-head').getBoundingClientRect().height+'px')).observe(win.querySelector('.game-window-head'));
 function cancel(){downloaded.clear();generation++;controller?.abort();controller=null;preparing=null;loader.hidden=true;panel.inert=false;win.classList.remove('glass-cabinet-loading-active');}
 function updateProgress(info){if(info.totalBytes)note.textContent=`素材 約${Math.ceil(info.totalBytes/1000000)}MB。保存済みの素材は再ダウンロードしません。`;const value=Math.max(0,Math.min(100,Math.floor(info.percent||0)));progress.value=value;percentage.textContent=`完了 ${value}%・残り ${100-value}%`;status.textContent=info.phase==='checking'?'保存済みのパチンコ台を確認しています':'パチンコ台をダウンロードしています';}
 async function prepare(kind='debug'){
  if(downloaded.has(kind)&&(kind==='kusa'||window.GlassCabinetSkin?.ready))return true;
  if(preparing&&currentMachine===kind)return preparing;
  if(preparing)cancel();currentMachine=kind;win.querySelector('.game-window-head h2').textContent=kind==='debug'?'ガラスの少女':'草パチ';
  const token=++generation;controller=new AbortController();const signal=controller.signal;loader.hidden=false;retry.hidden=skip.hidden=true;panel.inert=true;win.classList.add('glass-cabinet-loading-active');progress.value=0;percentage.textContent='完了 0%・残り 100%';status.textContent='パチンコ台をダウンロードしています';note.textContent='次回からは、このブラウザに保存した素材を使用します。';
  let timeout;
  preparing=(async()=>{try{
   await new Promise(requestAnimationFrame);if(token!==generation||!win.open)return false;
   if(!downloaded.has(kind)){
    if(!window.PachiDownload?.prepare)throw Object.assign(Error('ダウンロード機能を読み込めませんでした。ページを再読み込みするか保存せずに開始してください。'),{recoverable:true,code:'script'});
    const result=bypass.has(kind)?{persistent:false,reason:'skip'}:await window.PachiDownload?.prepare(kind,{signal,onProgress:info=>{if(token===generation)updateProgress(info);}});
    if(token!==generation||!win.open)return false;downloaded.add(kind);note.textContent=result?.persistent?'素材の保存が完了しました。':result?.reason==='unsupported'?'この環境では素材を保存せずに起動します。':'今回は素材を保存せずに起動します。';
   }
   progress.value=100;percentage.textContent='ダウンロード完了';status.textContent='表示の準備をしています…';
   if(kind==='debug'&&!window.GlassCabinetSkin.ready){
    frame.src=base+'frame-atlas.png';
    const material=async file=>{const im=new Image();im.src=base+file;try{await im.decode();}finally{im.removeAttribute('src');}};
    const work=(async()=>{await frame.decode();if(token!==generation||!win.open)throw Error('cancelled');await material('handle.png');if(token!==generation||!win.open)throw Error('cancelled');await material('push.png');if(token!==generation||!win.open)throw Error('cancelled');if(!await window.GlassMechanismArt.prepare()||token!==generation||!win.open||!await window.GlassCrystalSymbols.prepare())throw Error('盤面素材を読み込めませんでした');})();
    await Promise.race([work,new Promise((_,reject)=>timeout=setTimeout(()=>reject(Error('読み込みがタイムアウトしました')),20000))]);
    if(token!==generation||!win.open)return false;machine.classList.add('has-raster-skin','has-continuous-skin');machine.dataset.skin='glass-v2';machine.dispatchEvent(new Event('glass-cabinet-ready'));document.getElementById('pachiDebugCanvas').dispatchEvent(new Event('pachi-debug-overlay-change'));
   }
   loader.hidden=true;panel.inert=false;win.classList.remove('glass-cabinet-loading-active');return true;
  }catch(e){if(token===generation){generation++;preparing=null;machine.dataset.skin='load-error';machine.dataset.skinError=e.message;status.textContent='準備を完了できませんでした。再試行するか、上の「閉じる」で戻れます。';note.textContent=e.code==='quota'?'ブラウザの空き容量が不足しています。保存せずに遊ぶこともできます。':e.message||'';retry.hidden=false;skip.hidden=!e.recoverable;panel.inert=false;window.GlassAssetDiagnostics.release();}return false;}
  finally{clearTimeout(timeout);if(token===generation){preparing=null;controller=null;}}})();return preparing;
 }
 new MutationObserver(()=>{if(!win.open)cancel();}).observe(win,{attributes:true,attributeFilter:['open']});
 window.GlassCabinetSkin=Object.freeze({prepare,cancel,downloaded:kind=>downloaded.has(kind),get ready(){return machine.classList.contains('has-continuous-skin')&&frame.complete&&frame.naturalWidth>0&&window.GlassMechanismArt?.snapshot().loaded.length===7&&window.GlassCrystalSymbols?.snapshot().loaded.length===5;}});
 const power=document.getElementById('pdmPower');
 const update=()=>machine.style.setProperty('--glass-power-angle',`${(Number(power.value)-65)*.7}deg`);
 power.addEventListener('input',update);update();
 window.GlassCabinetLayout=layout;
})();
