/* Transparent Blender-rendered white glass; strictly confined behind the cabinet frame. */
(()=>{'use strict';
 const machine=document.getElementById('pachiDebugMachine');if(!machine)return;
 const mobileSheets=matchMedia('(pointer:coarse), (max-width:767px)').matches;
 const base=mobileSheets?'assets/glass-girl/mobile-v1/mode-transition-white/':'assets/glass-girl/mode-transition-white-v1/',duration=2.5,reveal=25/24,canvas=document.createElement('canvas'),audio=window.createGlassWhiteTransitionAudio();
 canvas.width=720;canvas.height=860;canvas.className='glass-mode-film';canvas.hidden=true;canvas.setAttribute('aria-hidden','true');machine.append(canvas);
 audio.preload='auto';audio.volume=.85;const ctx=canvas.getContext('2d');let state=null,key='',token='',lastFrame=-1,errors=[],trial=null,raf=0;
 document.addEventListener('glass-volume-change',()=>{audio.volume=.85*(window.GlassVolume?.sfx??1);});
 const visible=()=>!document.hidden&&!machine.hidden&&!document.getElementById('pachiPanel').hidden&&!document.getElementById('pachiGame').hidden&&document.getElementById('pachiMachine').dataset.activeMachine==='debug';
 const soundEnabled=()=>window.GlassTransitionAudio?.snapshot().enabled!==false;
 document.addEventListener('pointerdown',()=>{if(visible())audio.unlock();},{passive:true});
 document.addEventListener('keydown',()=>{if(visible())audio.unlock();});
 const bank=new GlassAssetBank(Array.from({length:5},(_,i)=>base+`sheet-${i}.webp`),{onReady:()=>{lastFrame=-1;paint();}});
 function paint(){
  audio.volume=.85*(window.GlassVolume?.sfx??1);
  const real=!!state?.modeTransitionRemaining&&!state?.jackpotSession,active=visible()&&(!!trial||real);
  if(canvas.hidden===active)canvas.hidden=!active;
  window.GlassHandleBgm?.setTransitionActive('white-film',active);
  if(!visible()){audio.pause();bank.release();return;}
  if(!active){bank.release();ctx.clearRect(0,0,720,860);lastFrame=-1;return;}
  const t=trial?trial.elapsed:duration-state.modeTransitionRemaining,id=trial?trial.id:key+':mode:'+state.modeSerial+':'+(state.modeTransitionFrom?'exit':'entry');
  if(token!==id){token=id;audio.pause();try{audio.currentTime=Math.max(0,t);}catch{}if(soundEnabled())audio.play().catch(e=>{if(!errors.includes(e.name)&&errors.length<8)errors.push(e.name)});lastFrame=-1;}
  if(!soundEnabled())audio.pause();else if(audio.paused&&!audio.ended){try{audio.currentTime=t;}catch{}audio.play().catch(e=>{if(!errors.includes(e.name)&&errors.length<8)errors.push(e.name)});}
  const index=Math.min(59,Math.floor(t*24));const image=bank.use(Math.floor(index/12));if(index===lastFrame&&image)return;lastFrame=index;ctx.clearRect(0,0,720,860);
  if(image){const w=image.width/4,h=image.height/3;ctx.drawImage(image,index%4*w,Math.floor(index%12/4)*h,w,h,0,0,720,860);}else{ctx.fillStyle='#effaff';ctx.globalAlpha=Math.sin(Math.PI*Math.max(0,Math.min(1,t/duration)))*.8;ctx.fillRect(0,0,720,860);ctx.globalAlpha=1;}
  if(trial&&t>=reveal&&!trial.revealed){trial.revealed=true;window.GlassAftermath?.preview(trial.kind);}
 }
 canvas.addEventListener('contextlost',e=>e.preventDefault());canvas.addEventListener('contextrestored',()=>{lastFrame=-1;paint();});
 function tick(now){if(!trial)return;const dt=trial.last&&visible()?Math.min(.1,(now-trial.last)/1000):0;trial.last=now;trial.elapsed+=dt;if(trial.elapsed>=duration){trial=null;raf=0;paint();return;}paint();raf=requestAnimationFrame(tick);}
 async function preview(kind='restoration'){if(!visible()||state?.jackpotSession||state?.pending||state?.modeTransitionRemaining||state?.transitionRemaining||state?.returnTransitionRemaining)return false;window.GlassAftermath?.cancelPreview();cancelAnimationFrame(raf);trial={kind,id:'white-preview-'+performance.now(),elapsed:0,last:0,revealed:false};paint();raf=requestAnimationFrame(tick);return true;}
 for(const[kind,label]of [['restoration','白ガラス切替を見る（修復）'],['life-return','白ガラス切替を見る（解放）']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.whiteTransitionPreview=kind;b.onclick=()=>preview(kind);document.querySelector('.glass-board-controls')?.append(b);}
 window.GlassModeTransition=Object.freeze({update(s,id){if(key!==id){trial=null;cancelAnimationFrame(raf);audio.pause();token='';key=id;}state=s;if((s.modeTransitionRemaining||s.jackpotSession||s.pending||s.transitionRemaining||s.returnTransitionRemaining)&&trial){trial=null;cancelAnimationFrame(raf);}paint();},preview,get hideModeBackground(){return!!trial&&!trial.revealed;},snapshot:()=>({active:!canvas.hidden,frame:lastFrame,loaded:bank.cache.size,cache:bank.snapshot(),trial:!!trial,width:canvas.width,height:canvas.height,board:{...window.GlassCabinetLayout.lcd},sound:{...audio.snapshot(),time:audio.currentTime},errors:[...new Set([...errors,...(bank.error?[bank.error]:[])])].slice(0,8)})});
 document.addEventListener('glass-cabinet-released',()=>{bank.release({retry:true});state=null;trial=null;cancelAnimationFrame(raf);raf=0;audio.pause();canvas.hidden=true;});
 document.addEventListener('visibilitychange',()=>{if(!visible())audio.pause();paint();});
 new MutationObserver(()=>{if(!visible()){audio.pause();window.GlassHandleBgm?.setTransitionActive('white-film',false);if(!canvas.hidden)canvas.hidden=true;if(trial){trial=null;cancelAnimationFrame(raf);}}}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden','data-active-machine']});
})();
