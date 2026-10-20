/* Raster sprites animated behind the transparent physical board. No physics writes. */
(()=>{
 'use strict';
 const machine=document.getElementById('pachiDebugMachine'),field=document.getElementById('pachiDebugCanvas');
 if(!machine||!field)return;
 const lcd=window.GlassCabinetLayout.lcd;
 const canvas=document.createElement('canvas');canvas.className='pdm-board-background';canvas.width=720;canvas.height=860;canvas.setAttribute('aria-hidden','true');machine.append(canvas);
 Object.assign(canvas.style,{position:'absolute',left:(lcd.x-8)+'px',top:(lcd.y-8)+'px',width:lcd.width+'px',height:lcd.height+'px',zIndex:'2',pointerEvents:'none'});
 const ctx=canvas.getContext('2d'),base='assets/glass-girl/floating-glass-v2/';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(pointer:coarse), (max-width:767px)').matches;
 let enabled=true,motion=!reduced.matches,time=0,last=0,raf=0,loaded=false,paintCount=0,transitionHold=false,transitionOccluded=false,holdKey='';
 const images={};
 // This is an LCD projection only: no collision body is created for the girl.
 const girlBase='assets/glass-girl/blender-hair-ink-v5/';
 const girlProjection=Object.freeze({x:120,y:232,width:200,height:300});
 const girl=document.createElement('video');girl.hidden=true;girl.setAttribute('aria-hidden','true');
 girl.muted=true;girl.defaultMuted=true;girl.loop=true;girl.playsInline=true;
 girl.setAttribute('playsinline','');girl.preload='none';
 machine.append(girl);
 const girlPoster=new Image();
 // Native v5 body/hair render with its actual alpha, not a white-color key.
 const girlAlphaBase=mobile?'assets/glass-girl/mobile-v1/back-girl-overlay/':'assets/glass-girl/back-girl-overlay-v1/';
 const alphaBank=new GlassAssetBank(Array.from({length:18},(_,i)=>girlAlphaBase+'sheet-'+i+'.webp'),{onReady:wake});
 let girlEnabled=true,girlMotion=!reduced.matches,girlLoaded=false,girlError='',jackpotScene=false,afterScene=false,girlClock=0,invalidated=true;
 const jackpotVideos=['glass-girl','nameless-girl'].map(slug=>{const v=document.createElement('video');v.hidden=true;v.muted=v.defaultMuted=true;v.loop=true;v.playsInline=true;v.preload='none';v.dataset.source=`assets/glass-girl/live2d-upgrade-v3/${slug}-deluxe.mp4`;machine.append(v);v.addEventListener('loadeddata',wake);return v;});
 const jackpotPosters=['glass-girl','nameless-girl'].map(slug=>{const im=new Image();im.datasetSource=`assets/glass-girl/live2d-upgrade-v3/${slug}-still.png`;im.onload=()=>wake();return im;});
 let jackpotIndex=0,jackpotReady=false,entrance=0,presentationToken='';
 const premiumBase=mobile?'assets/glass-girl/mobile-v1/premium-wings/':'assets/glass-girl/premium-wings-v1/';
 const premiumManifest={wings:{width:640,height:360,frames:72,sheets:Array.from({length:6},(_,i)=>`wings-${i}.webp`)}};
 const premiumBank=new GlassAssetBank(premiumManifest.wings.sheets.map(file=>premiumBase+file),{onReady:wake});
 let premiumElapsed=0,premiumActive=false,premiumTrial=false;
 function drawPremiumSprite(kind,frame,x,y,w,h){const m=premiumManifest[kind];frame=Math.max(0,Math.min(m.frames-1,frame));const image=premiumBank.use(Math.floor(frame/12));if(image)ctx.drawImage(image,frame%4*(image.width/4),Math.floor(frame%12/4)*(image.height/3),image.width/4,image.height/3,x,y,w,h);else{ctx.save();ctx.strokeStyle='#bdf4ff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w*.4,h*.3,0,0,Math.PI*2);ctx.stroke();ctx.restore();}}
 function specialChange(active){if(premiumActive===active)return;premiumActive=active;field.dispatchEvent(new Event('pachi-debug-overlay-change'));wake();}
 // Reserved center x140..300,y230..420: future girl and flowing figures remain clear.
 const pieces=[
  {x:74,y:68,size:138,type:'long',angle:-.3,phase:.2,period:13},
  {x:195,y:42,size:92,type:'wide',angle:.4,phase:2,period:17},
  {x:350,y:80,size:150,type:'wide',angle:-.8,phase:4,period:15},
  {x:44,y:225,size:116,type:'long',angle:.2,phase:1,period:18},
  {x:393,y:232,size:114,type:'long',angle:-.5,phase:3,period:14},
  {x:56,y:396,size:123,type:'wide',angle:.6,phase:5,period:16},
  {x:378,y:403,size:134,type:'wide',angle:-.2,phase:2.6,period:19},
  {x:111,y:526,size:133,type:'long',angle:1,phase:3.5,period:20},
  {x:325,y:530,size:132,type:'long',angle:-.8,phase:1.7,period:22},
  {x:124,y:160,size:39,type:'wide',angle:.2,phase:4,period:25,far:true},
  {x:306,y:185,size:34,type:'long',angle:1.2,phase:1,period:23,far:true},
  {x:125,y:444,size:37,type:'wide',angle:2,phase:2,period:26,far:true}
 ];
 const cabinetOpen=()=>document.getElementById('kusa-pachi-window')?.open&&document.getElementById('pachiMachine').dataset.activeMachine==='debug'&&!document.getElementById('pachiPanel').hidden&&!document.getElementById('pachiGame').hidden;
 function visible(){return machine.dataset.scrolling!=='true'&&document.getElementById('pachiMachine').dataset.activeMachine==='debug'&&!document.hidden&&canvas.getBoundingClientRect().width>0&&!document.getElementById('pachiPanel').hidden&&!document.getElementById('pachiGame').hidden;}
 function unloadVideo(v){if(v.hasAttribute('src')){v.pause();v.removeAttribute('src');v.load();}}
 function releaseMedia(){unloadVideo(girl);jackpotVideos.forEach(unloadVideo);girlLoaded=false;girlPoster.removeAttribute('src');jackpotPosters.forEach(im=>im.removeAttribute('src'));alphaBank.release({retry:true});premiumBank.release({retry:true});afterScene=false;girlClock=0;}
 function syncGirl(){
  if(!cabinetOpen()){releaseMedia();return;}
  loadBase();
  if(!girlPoster.hasAttribute('src'))girlPoster.src=girlBase+'preview-001.png';
  jackpotVideos.forEach((v,i)=>{
   if(jackpotScene&&i===jackpotIndex){const poster=jackpotPosters[i];if(!poster.hasAttribute('src'))poster.src=poster.datasetSource;
    if(visible()&&jackpotReady&&!transitionHold&&!transitionOccluded&&!reduced.matches){if(!v.hasAttribute('src')){v.preload='auto';v.src=v.dataset.source;}if(v.paused)v.play().catch(()=>{});}else v.pause();
   }else unloadVideo(v);
  });
  if(jackpotScene){unloadVideo(girl);girlLoaded=false;alphaBank.release();return;}
  const nextAfter=!!window.GlassAftermath?.snapshot().active;if(nextAfter!==afterScene){if(nextAfter)girlClock=girl.currentTime||girlClock;else try{girl.currentTime=girlClock%12;}catch{}afterScene=nextAfter;}
  const playing=visible()&&enabled&&girlEnabled&&girlMotion&&!afterScene&&!transitionHold&&!transitionOccluded;
  if(!playing){girl.pause();return;}
  if(!girl.hasAttribute('src')){girl.preload='auto';girl.src=girlBase+'hair-wind-ink-v5.mp4';}
  if(girl.paused)girl.play().catch(()=>{girlError='autoplay-blocked';});
 }
 function paint(){
  // Preserve the actual previous picture until the black film becomes opaque.
  if(!visible()||transitionHold||transitionOccluded)return;
  if(!premiumActive)premiumBank.release();
  ctx.setTransform(canvas.width/440,0,0,canvas.height/570,0,0);ctx.clearRect(0,0,440,570);
  if(!enabled&&!jackpotScene&&!window.GlassAftermath?.snapshot().active)return;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,440,570);
  if(jackpotScene){
   if(jackpotReady){const v=jackpotVideos[jackpotIndex],poster=jackpotPosters[jackpotIndex],source=v.readyState>=2?v:poster.complete&&poster.naturalWidth?poster:null;
    if(source){const p=reduced.matches?1:Math.min(1,entrance/1.4),ease=1-Math.pow(1-p,3),offset=(jackpotIndex===0?1:-1)*(1-ease)*850,zoom=1.14*(1+.06*(1-ease)),baseHeight=440*(source.videoHeight||source.naturalHeight)/(source.videoWidth||source.naturalWidth),w=440*zoom,h=baseHeight*zoom;
     // Match the face/hair close-up preview: width-fill, 114%, upper 14% pivot.
     ctx.save();ctx.beginPath();ctx.rect(0,0,440,570);ctx.clip();ctx.drawImage(source,(440-w)/2,(1-zoom)*baseHeight*.14+offset,w,h);ctx.restore();}
   }
   paintCount++;return;
  }
  if(window.GlassAftermath?.draw(ctx,440,570)){
   if(girlEnabled){const frame=Math.floor(girlClock*24)%288,sheet=alphaBank.use(Math.floor(frame/16)),cell=frame%16;
    if(sheet)ctx.drawImage(sheet,cell%4*(sheet.width/4),Math.floor(cell/4)*(sheet.height/4),sheet.width/4,sheet.height/4,girlProjection.x,girlProjection.y,girlProjection.width,girlProjection.height);}
   if(premiumActive){ctx.save();ctx.globalAlpha=Math.min(1,Math.max(0,(6.4-premiumElapsed)/.4));drawPremiumSprite('wings',Math.floor(premiumElapsed*12),40,242,360,202.5);ctx.restore();}
   paintCount++;return;
  }
  alphaBank.release();
  if(girlEnabled){
   const source=girlLoaded&&girl.readyState>=2?girl:girlPoster.complete&&girlPoster.naturalWidth?girlPoster:null;
   if(source){
    ctx.save();ctx.globalAlpha=.92;
    ctx.drawImage(source,girlProjection.x,girlProjection.y,girlProjection.width,girlProjection.height);
    ctx.restore();
   }
  }
  // Transparent wings are an additive presentation, not a replacement scene.
  // The root floats at the upper back (y353), over the unchanged hair image.
  if(premiumActive){
   ctx.save();ctx.globalAlpha=Math.min(1,Math.max(0,(6.4-premiumElapsed)/.4));
   drawPremiumSprite('wings',Math.floor(premiumElapsed*12),40,242,360,202.5);ctx.restore();
  }
  if(!loaded)return;
  for(const p of pieces){
   const phase=time*Math.PI*2/p.period+p.phase;
   const dx=Math.sin(phase*.83)*(p.far?3:5),dy=Math.sin(phase)*(p.far?4:9);
   ctx.save();ctx.translate(p.x+dx,p.y+dy);ctx.rotate(p.angle+Math.sin(phase*.7)*.055);
   const size=p.size*(1+Math.sin(phase*.6)*.012);
   ctx.globalAlpha=p.far ? .42 : 1;
   ctx.drawImage(images[p.type],-size/2,-size/2,size,size);
   // Emission artwork is separate. A narrow travelling window reveals its light.
   ctx.save();ctx.beginPath();ctx.rect(-size/2,-size/2+((time/7+p.phase)%1)*size,size,size*.28);ctx.clip();
   ctx.globalAlpha=(p.far ? .07 : .14)*(.5+.5*Math.sin(phase+1));
   ctx.drawImage(images[p.type+'Light'],-size/2,-size/2,size,size);ctx.restore();ctx.restore();
  }
  paintCount++;
 }
 function needsFrames(){return !transitionHold&&!transitionOccluded&&(afterScene||premiumActive||jackpotScene||enabled&&(motion||(girlEnabled&&girlMotion&&girlLoaded)));}
 function frame(now){raf=0;if(!visible()){last=0;syncGirl();return;}
  const dt=last?Math.min((now-last)/1000,.1):0;
  if(invalidated||!last||now-last>=1000/30){invalidated=false;last=now;if(motion)time+=dt;if(afterScene&&girlMotion&&!transitionHold&&!transitionOccluded)girlClock+=dt;else if(!afterScene)girlClock=girl.currentTime||girlClock;if(jackpotScene&&jackpotReady)entrance+=dt;if(premiumTrial){premiumElapsed+=dt;if(premiumElapsed>=6.4){premiumTrial=false;specialChange(false);}}paint();}
  if((needsFrames()||invalidated)&&!raf)raf=requestAnimationFrame(frame);
 }
 function wake(){syncGirl();invalidated=true;if(!cabinetOpen()){last=0;cancelAnimationFrame(raf);raf=0;return;}if(visible()&&!raf)raf=requestAnimationFrame(frame);}
 const controls=document.createElement('div');controls.className='glass-board-controls';
 controls.style.cssText='position:relative;z-index:36;display:flex;justify-content:center;gap:8px;padding:6px;margin-top:40px;';
 controls.style.flexWrap='wrap';
 const toggle=document.createElement('button'),pause=document.createElement('button'),girlToggle=document.createElement('button'),girlPause=document.createElement('button');
 for(const button of [toggle,pause,girlToggle,girlPause])button.type='button';
 controls.append(toggle,pause,girlToggle,girlPause);
 const specialPreview=document.createElement('button');specialPreview.type='button';specialPreview.textContent='特別当たり演出を見る';specialPreview.id='glassPremiumWingsPreview';controls.append(specialPreview);
 specialPreview.onclick=()=>{if(jackpotScene)return;premiumTrial=true;premiumElapsed=0;specialChange(true);};
 function labels(){toggle.textContent=enabled?'ガラス背景 ON':'ガラス背景 OFF';toggle.setAttribute('aria-pressed',String(enabled));pause.textContent=motion?'浮遊 ON':'浮遊 OFF';pause.setAttribute('aria-pressed',String(motion));girlToggle.textContent=girlEnabled?'少女 ON':'少女 OFF';girlToggle.setAttribute('aria-pressed',String(girlEnabled));girlPause.textContent=girlMotion?'少女の揺れ ON':'少女の揺れ OFF';girlPause.setAttribute('aria-pressed',String(girlMotion));}
 function notify(){machine.dataset.boardScene=enabled?'on':'off';field.dispatchEvent(new Event('pachi-debug-overlay-change'));labels();wake();}
 toggle.addEventListener('click',()=>{enabled=!enabled;notify();});pause.addEventListener('click',()=>{motion=!motion;last=0;notify();});
 girlToggle.addEventListener('click',()=>{girlEnabled=!girlEnabled;notify();});
 girlPause.addEventListener('click',()=>{girlMotion=!girlMotion;last=0;notify();});
 // Presentation controls were used during development only. The released board
 // always uses its authored background and character animation.
 reduced.addEventListener('change',()=>{motion=girlMotion=!reduced.matches;last=0;labels();wake();});
 new MutationObserver(wake).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden','open','data-active-machine','data-scrolling']});
 document.addEventListener('visibilitychange',()=>{last=0;wake();});
 girl.addEventListener('loadeddata',()=>{if(!cabinetOpen())return;girlLoaded=true;girlError='';wake();});
 girl.addEventListener('error',()=>{if(!girl.hasAttribute('src'))return;girlLoaded=false;girlError='video-load';wake();});
 girlPoster.addEventListener('load',wake);
 const files={long:'shard-long.png',wide:'shard-wide.png',longLight:'shard-long-light.png',wideLight:'shard-wide-light.png'};
 let baseLoading=null;
 function loadBase(){if(baseLoading)return;baseLoading=Promise.all(Object.entries(files).map(([key,file])=>new Promise((resolve,reject)=>{const img=new Image();images[key]=img;img.onload=resolve;img.onerror=reject;img.src=base+file;}))).then(()=>{loaded=true;notify();}).catch(()=>{enabled=false;machine.dataset.boardSceneError='image-load';notify();});}
 document.addEventListener('glass-cabinet-released',()=>{releaseMedia();transitionOccluded=false;cancelAnimationFrame(raf);raf=0;last=0;});

window.GlassBoardScene=Object.freeze({refresh:wake,setOccluded:value=>{if(transitionOccluded===!!value)return;transitionOccluded=!!value;wake();},holdForTransition:(s,key)=>{const blackOut=window.GlassPachiRuntime.config.transitionSeconds-1.25;const next=holdKey===key&&!!(s.jackpotSession?.phase==='reveal'||s.transitionRemaining>blackOut||s.returnTransitionRemaining>blackOut);const changed=next!==transitionHold;transitionHold=next;holdKey=key;if(changed)wake();},updateSpecial:s=>{if(s.pending||s.jackpotSession||s.transitionRemaining||s.returnTransitionRemaining){premiumTrial=false;specialChange(false);return;}if(premiumTrial)return;premiumElapsed=s.clock-s.lastSettleAt;specialChange(!!(s.lastHit&&!s.lastJackpot&&s.lastBaseAward===500&&s.afterRemaining>0));},snapshot:()=>({transitionHold,transitionOccluded,special:{active:premiumActive,trial:premiumTrial,ready:premiumBank.cache.size>0,elapsed:premiumElapsed,error:premiumBank.error,cache:premiumBank.snapshot()},enabled,motion,loaded,time,paintCount,jackpotScene,jackpot:{index:jackpotIndex,ready:jackpotReady,entrance,direction:jackpotIndex===0?'from-bottom':'from-top',playing:!jackpotVideos[jackpotIndex].paused,token:presentationToken,error:jackpotVideos[jackpotIndex].error?.message||''},pieces:pieces.length,girl:{alphaReady:alphaBank.cache.size>0,alphaError:alphaBank.error,cache:alphaBank.snapshot(),alphaVisible:girlEnabled&&alphaBank.cache.size>0&&!!window.GlassAftermath?.snapshot().active&&!jackpotScene,alphaFrame:Math.floor(girlClock*24)%288,enabled:girlEnabled,motion:girlMotion,loaded:girlLoaded,currentTime:girl.currentTime,paused:girl.paused,clock:girlClock,afterScene,mobile,error:girlError,projection:girlProjection}}),setEnabled:value=>{enabled=!!value;notify();},setJackpotScene:(value,options={})=>{
  const index=options.index===1?1:0,token=options.token||'',ready=options.ready!==false;
  if(jackpotScene===!!value&&jackpotReady===(!!value&&ready)&&(!value||index===jackpotIndex&&token===presentationToken))return;
  if(value&&(token!==presentationToken||index!==jackpotIndex)){presentationToken=token;jackpotIndex=index;entrance=0;try{jackpotVideos[index].currentTime=0;}catch{}}
  if(value&&ready&&!jackpotReady)entrance=0;
  jackpotScene=!!value;jackpotReady=!!value&&ready;machine.classList.toggle('glass-jackpot-character-active',jackpotScene);field.dispatchEvent(new Event('pachi-debug-overlay-change'));wake();
 }});
 canvas.addEventListener('contextlost',e=>e.preventDefault());canvas.addEventListener('contextrestored',()=>{last=0;wake();});
 labels();
})();
