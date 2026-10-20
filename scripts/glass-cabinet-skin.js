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
 const loader=document.createElement('section');loader.className='glass-cabinet-loading';loader.hidden=true;loader.setAttribute('aria-label','筐体の読み込み');
 loader.innerHTML='<p role="status">筐体を読み込んでいます…</p><button type="button" hidden>再試行</button>';win.append(loader);
 const status=loader.querySelector('p'),retry=loader.querySelector('button');retry.onclick=()=>document.dispatchEvent(new Event('glass-cabinet-retry'));
 new ResizeObserver(()=>win.style.setProperty('--cabinet-header-height',win.querySelector('.game-window-head').getBoundingClientRect().height+'px')).observe(win.querySelector('.game-window-head'));
 let preparing=null,generation=0;
 function cancel(){generation++;preparing=null;loader.hidden=true;panel.inert=false;win.classList.remove('glass-cabinet-loading-active');}
 async function prepare(){
  if(window.GlassCabinetSkin?.ready)return true;
  if(preparing)return preparing;
  const token=++generation;loader.hidden=false;retry.hidden=true;panel.inert=true;win.classList.add('glass-cabinet-loading-active');status.textContent='筐体を読み込んでいます…';
  let timeout;
  preparing=(async()=>{try{
   await new Promise(requestAnimationFrame);if(token!==generation||!win.open)return false;
   frame.src=base+'frame-atlas.png';
   const material=async file=>{const im=new Image();im.src=base+file;try{await im.decode();}finally{im.removeAttribute('src');}};
   const work=(async()=>{await frame.decode();if(token!==generation||!win.open)throw Error('cancelled');await material('handle.png');if(token!==generation||!win.open)throw Error('cancelled');await material('push.png');if(token!==generation||!win.open)throw Error('cancelled');if(!await window.GlassMechanismArt.prepare()||token!==generation||!win.open||!await window.GlassCrystalSymbols.prepare())throw Error('盤面素材を読み込めませんでした');})();
   await Promise.race([work,new Promise((_,reject)=>timeout=setTimeout(()=>reject(Error('読み込みがタイムアウトしました')),20000))]);
   if(token!==generation||!win.open)return false;
   machine.classList.add('has-raster-skin','has-continuous-skin');machine.dataset.skin='glass-v2';loader.hidden=true;panel.inert=false;win.classList.remove('glass-cabinet-loading-active');machine.dispatchEvent(new Event('glass-cabinet-ready'));document.getElementById('pachiDebugCanvas').dispatchEvent(new Event('pachi-debug-overlay-change'));return true;
  }catch(e){if(token===generation){generation++;preparing=null;machine.dataset.skin='load-error';machine.dataset.skinError=e.message;status.textContent='筐体を読み込めませんでした。再試行するか、上の「閉じる」で戻れます。';retry.hidden=false;panel.inert=false;window.GlassAssetDiagnostics.release();}return false;}
  finally{clearTimeout(timeout);if(token===generation)preparing=null;}})();return preparing;
 }
 new MutationObserver(()=>{if(!win.open)cancel();}).observe(win,{attributes:true,attributeFilter:['open']});
 window.GlassCabinetSkin=Object.freeze({prepare,cancel,get ready(){return machine.classList.contains('has-continuous-skin')&&frame.complete&&frame.naturalWidth>0&&window.GlassMechanismArt?.snapshot().loaded.length===7&&window.GlassCrystalSymbols?.snapshot().loaded.length===5;}});
 const power=document.getElementById('pdmPower');
 const update=()=>machine.style.setProperty('--glass-power-angle',`${(Number(power.value)-65)*.7}deg`);
 power.addEventListener('input',update);update();
 window.GlassCabinetLayout=layout;
})();
