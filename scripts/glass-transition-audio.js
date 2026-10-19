/* CC0 recorded sources, edited for this transition; one synchronized mix. */
(()=>{
 'use strict';const audio=window.createGlassTransitionAudio(window.GlassBlackTransitionSoundData);
 audio.preload='auto';audio.volume=.85;let enabled=true,unlocked=false,token=null,plays=0,error='',wasActive=false;
 const volume=()=>.85*(window.GlassVolume?.sfx??1);
 document.addEventListener('glass-volume-change',()=>{audio.volume=volume();});
 try{enabled=localStorage.getItem('glassGirlTransitionSoundV1')!=='off';}catch{}
 const button=document.createElement('button');button.type='button';button.id='glassTransitionSound';
 function labels(){button.textContent=enabled?'切替効果音 ON':'切替効果音 OFF';button.setAttribute('aria-pressed',String(enabled));}
 document.querySelector('.glass-experiment-settings')?.append(button);labels();
 button.onclick=()=>{enabled=!enabled;try{localStorage.setItem('glassGirlTransitionSoundV1',enabled?'on':'off');}catch{}if(!enabled)audio.pause();else unlock();labels();};
 function stop(){audio.pause();token=null;wasActive=false;}
 function unlock(){if(!enabled)return;audio.unlock();}
 document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock);
 function sync({active,time,visible=true,id}){
  audio.volume=volume();
  if(!visible){stop();return;}
  if(!enabled){audio.pause();return;}
  if(!active){wasActive=false;return;} // Allow the shatter's echo to ring after white.
  const fresh=token!==id;wasActive=true;
  if(fresh){audio.pause();token=id;try{audio.currentTime=Math.min(time,8.95);}catch{}plays++;}
  else if(audio.readyState>=2&&Math.abs(audio.currentTime-time)>.22)audio.currentTime=Math.min(time,8.95);
  if(audio.paused&&!audio.ended)audio.play()?.then(()=>{unlocked=true;error='';}).catch(e=>{error=e.name;});
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.pause();});
 const machine=document.getElementById('pachiMachine');
 if(machine)new MutationObserver(()=>{if(machine.dataset.activeMachine!=='debug'||document.getElementById('pachiPanel').hidden||document.getElementById('pachiGame').hidden)stop();}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden','data-active-machine']});
 window.GlassTransitionAudio=Object.freeze({unlock,sync,stop,setEnabled:value=>{enabled=!!value;if(!enabled)audio.pause();labels();},snapshot:()=>({...audio.snapshot(),enabled,ready:audio.readyState>=2,duration:audio.duration||0,currentTime:audio.currentTime,error:audio.error?.message||error,plays,token})});
})();
