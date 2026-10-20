/* Display-only Blender frames. Runtime owns the persisted countdown and prizes. */
(()=>{
 'use strict';const machine=document.getElementById('pachiDebugMachine');if(!machine)return;
 const film=document.createElement('canvas'),spill=document.createElement('canvas');
 film.width=480;film.height=624;film.className='glass-jackpot-film';spill.width=521;spill.height=809;spill.className='glass-jackpot-spill';
 for(const c of [film,spill]){c.hidden=true;c.setAttribute('aria-hidden','true');}
 machine.append(film,spill);
 const ctx=film.getContext('2d'),outside=spill.getContext('2d');let errors=[],state=null,key='',lastFrame=-1,trial=null,trialRaf=0,trialId=0;
 const duration=7.2,board=window.GlassCabinetLayout.lcd;
 const bank=new GlassAssetBank(Array.from({length:12},(_,i)=>`assets/glass-girl/jackpot-transition-v2/sheet-${i}.png`),{onReady:()=>{lastFrame=-1;paint();}});
 function paint(){
  if(!state||document.getElementById('pachiMachine').dataset.activeMachine!=='debug'||machine.hidden){film.hidden=spill.hidden=true;machine.classList.remove('glass-transition-active');window.GlassHandleBgm?.setTransitionActive('black-film',false);window.GlassTransitionAudio?.stop();return;}
  const trialReturning=!!trial&&trial.elapsed>=duration+4,trialTime=trial?trial.elapsed-(trialReturning?duration+4:0):0;
  const sessionId=state.jackpotSession?.id||state.lastJackpotId||state.lastSpinId;
  const returning=trialReturning||state.returnTransitionRemaining>0,active=!!trial&&(trial.elapsed<duration||trialReturning&&trialTime<duration)||!trial&&(state.transitionRemaining>0||state.returnTransitionRemaining>0),t=trial?Math.min(duration,trialTime):active?Math.min(duration,duration-(returning?state.returnTransitionRemaining:state.transitionRemaining)):duration,index=Math.min(143,Math.floor(t*20));
  window.GlassTransitionAudio?.sync({active,time:trial?trialTime:t,visible:!document.hidden&&!document.getElementById('pachiGame').hidden&&!document.getElementById('pachiPanel').hidden,id:(trial?'trial-'+trialId:key+':'+sessionId)+(returning?':return':':entry')});
  window.GlassBoardScene?.setJackpotScene(returning?t<1.25:state.jackpotSession?.phase!=='reveal'&&(!!trial||!!state.pending||!!state.jackpotSession)&&(!active||t>=1.25),{index:trial?trial.choice:state.jackpotSession?.presentationIndex??state.lastPresentationIndex??0,token:trial?'trial-'+trialId:key+':'+sessionId,ready:returning||!active||!!trial&&trial.elapsed>=duration});
  machine.classList.toggle('glass-transition-active',active);
  window.GlassHandleBgm?.setTransitionActive('black-film',active);
  const energy=t<1.5?.12*Math.sin(Math.PI*t/1.5):t<4?.03:t<6?.03+.97*((t-4)/2)**2:t<6.65?1:Math.max(0,1-(t-6.65)/.55);
  machine.style.setProperty('--glass-transition-light',String(energy));
  if(film.hidden===active)film.hidden=!active;const hideSpill=!active||t<6||t>=6.65;if(spill.hidden!==hideSpill)spill.hidden=hideSpill;
  if(!active){bank.release();ctx.clearRect(0,0,480,624);outside.clearRect(0,0,521,809);lastFrame=-1;return;}
  const image=bank.use(Math.floor(index/12));if(lastFrame===index&&image)return;lastFrame=index;
  ctx.clearRect(0,0,480,624);outside.clearRect(0,0,521,809);
  if(!image){ctx.fillStyle='#000';ctx.globalAlpha=Math.min(1,t/1.25);ctx.fillRect(0,0,480,624);ctx.globalAlpha=1;return;}
  const sheet=image,n=index%12,w=sheet.width/4,h=sheet.height/3;
  ctx.drawImage(sheet,n%4*w,Math.floor(n/4)*h,w,h,0,0,480,624);
  if(!spill.hidden){
   const scale=1.32,bw=board.width*scale,bh=board.height*scale,x=board.x-(bw-board.width)/2,y=board.y-(bh-board.height)/2;
   outside.save();outside.globalAlpha=Math.sin(Math.PI*(t-6)/.65)*.8;
   outside.drawImage(sheet,n%4*w,Math.floor(n/4)*h,w,h,x,y,bw,bh);
   outside.globalAlpha=1;outside.globalCompositeOperation='destination-in';
   outside.save();outside.translate(board.x+board.width/2,board.y+board.height/2);outside.scale(bw/2,bh/2);
   const feather=outside.createRadialGradient(0,0,.55,0,0,1);feather.addColorStop(0,'#fff');feather.addColorStop(.5,'#ffffffb0');feather.addColorStop(1,'#ffffff00');outside.fillStyle=feather;outside.fillRect(-1,-1,2,2);outside.restore();
   outside.globalCompositeOperation='destination-out';outside.fillRect(board.x,board.y,board.width,board.height);outside.restore();
  }
 }
 for(const c of [film,spill]){c.addEventListener('contextlost',e=>e.preventDefault());c.addEventListener('contextrestored',()=>{lastFrame=-1;paint();});}
 const stopTrial=()=>{trial=null;cancelAnimationFrame(trialRaf);trialRaf=0;lastFrame=-1;};
 function trialTick(now){if(!trial)return;const dt=trial.last&&!document.hidden?Math.min(.1,(now-trial.last)/1000):0;trial.last=now;trial.elapsed+=dt;if(trial.elapsed>=duration*2+5){stopTrial();paint();return;}paint();trialRaf=requestAnimationFrame(trialTick);}
 async function preview(){if(!state||machine.hidden||state.transitionRemaining>0||state.returnTransitionRemaining>0||state.jackpotSession)return false;window.GlassTransitionAudio?.unlock();if(!state||machine.hidden||document.getElementById('pachiMachine').dataset.activeMachine!=='debug'||state.transitionRemaining>0||state.returnTransitionRemaining>0||state.jackpotSession)return false;stopTrial();trialId++;trial={elapsed:0,last:0,choice:Math.random()<.5?0:1};paint();trialRaf=requestAnimationFrame(trialTick);return true;}
 const clear=()=>{stopTrial();bank.release({retry:true});state=null;window.GlassTransitionAudio?.stop();window.GlassHandleBgm?.setTransitionActive('black-film',false);film.hidden=spill.hidden=true;machine.classList.remove('glass-transition-active');window.GlassBoardScene?.setJackpotScene(false);lastFrame=-1;};
 new MutationObserver(()=>{if(document.getElementById('pachiMachine').dataset.activeMachine!=='debug')clear();else paint();}).observe(document.getElementById('pachiMachine'),{attributes:true,attributeFilter:['data-active-machine']});
 document.addEventListener('glass-cabinet-released',clear);
 document.addEventListener('visibilitychange',()=>{lastFrame=-1;paint();});
 window.GlassJackpotTransition=Object.freeze({preview,update:(s,id)=>{if(key!==id){clear();key=id;}state=s;if(s.transitionRemaining>0&&trial)stopTrial();paint();},snapshot:()=>({loaded:bank.cache.size,cache:bank.snapshot(),errors:bank.error?[bank.error]:errors.slice(),frame:lastFrame,active:!film.hidden,spill:!spill.hidden,trial:!!trial,key,board:{...board}})});
})();
