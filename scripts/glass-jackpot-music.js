/* Cosmetic playback is independent of the game's lottery. */
(()=>{'use strict';
 const tracks=['零','決戦','奔流','勇者'],audio=new Audio();audio.preload='metadata';
 let token='',index=-1,session=null,writer=null,lastSave=0,error='',preview=false;
 const visible=()=>!document.hidden&&!document.getElementById('pachiPanel').hidden&&!document.getElementById('pachiGame').hidden&&document.getElementById('pachiMachine').dataset.activeMachine==='debug';
 const enabled=()=>localStorage.getItem('glassGirlJackpotMusicV1')!=='off';
 const musicGate=window.GlassHandleBgm.register(audio,{allowed:()=>visible()&&enabled()});
 const poolFor=j=>j?.kind==='super'||j?.presentationIndex===1?[1,3]:[0,2];
 function choose(j){const a=new Uint32Array(1);crypto.getRandomValues(a);return poolFor(j)[a[0]%2];}
 function load(i,time=0){index=i;audio.src=`assets/glass-girl/jackpot-music-v1/track-${i}.mp3`;audio.load();try{audio.currentTime=time;}catch{} }
 function play(){musicGate.update({active:true,volume:session?.phase==='ending'?session.endingRemaining/1.5:1,bypass:preview});}
 function update(state,key,save){
   const j=state.jackpotSession;writer=save;session=j;
   if(!j){if(!preview)musicGate.update({active:false});if(token){audio.pause();token='';index=-1;}return;}
   preview=false;
   // Transition/return transition owns the sound field: no jackpot music may leak into it.
   if(j.phase==='reveal'||j.phase==='transition'||state.transitionRemaining>0||state.returnTransitionRemaining>0){musicGate.update({active:false});audio.pause();return;}
   const next=key+':'+j.id;
   if(token!==next){token=next;const valid=poolFor(j).includes(j.musicIndex),i=valid?j.musicIndex:choose(j),time=valid?j.musicTime:0;load(i,time);save(i,time);}
   play();
   if(performance.now()-lastSave>2000){lastSave=performance.now();save(index,audio.currentTime);}
 }
 // One song per jackpot session, including every continuation round.
 audio.addEventListener('ended',()=>{if(session?.phase==='active'){load(index);writer(index,0);if(visible()&&enabled())play();}});
 audio.addEventListener('canplay',()=>{if(session?.phase==='active'&&session?.id&&visible()&&enabled())play();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.pause();if(session&&index>=0)writer?.(index,audio.currentTime);}});
 document.addEventListener('pointerdown',()=>{if(session?.phase==='active'&&enabled()&&visible())play();});
 setInterval(()=>{if(!visible()&&!audio.paused){audio.pause();if(session&&index>=0)writer?.(index,audio.currentTime);}},200);
 const controls=document.getElementById('glassRateNote');
 if(controls){const button=document.createElement('button');button.type='button';button.textContent=enabled()?'大当たり曲 ON':'大当たり曲 OFF';button.addEventListener('click',()=>{const on=!enabled();localStorage.setItem('glassGirlJackpotMusicV1',on?'on':'off');button.textContent=on?'大当たり曲 ON':'大当たり曲 OFF';if(!on)audio.pause();else if(session?.phase==='active'&&visible())play();});controls.parentElement.append(button);}
 window.GlassJackpotMusic={update,snapshot:()=>({index,title:tracks[index],kind:session?.kind||null,pool:poolFor(session),time:audio.currentTime,playing:!audio.paused,error:musicGate.error||error}),preview(i){if(session)return;preview=true;load(i);play();},stop(){if(preview){musicGate.update({active:false});audio.pause();preview=false;}}};
})();
