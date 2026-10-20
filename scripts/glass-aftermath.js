/* Display-only movies and BGM. Counted probability modes are owned by the runtime. */
(()=>{'use strict';
 const machine=document.getElementById('pachiDebugMachine');if(!machine)return;
 const base='assets/glass-girl/aftermath-backgrounds-v4/',musicBase='assets/glass-girl/ambient-music-v1/';
 const titles={normal:'無音の雪原',restoration:'硝子の誓い','life-return':'消え残る灯'},audio=new Audio();audio.preload='metadata';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let state=null,key='',trial=null,lastClock=0,mode='',token='',video=null,paused=true,error='',ended=false,finish=null;
 let playbackRaf=0,playbackLast=0,mediaPhase='intro';
 const films={};
 for(const kind of ['restoration','life-return']){
  const poster=new Image();poster.datasetSource=base+kind+'-1.png';const still=new Image();still.datasetSource=base+kind+'-145.png';
  const clips={poster,still};for(const phase of ['intro','loop']){const v=document.createElement('video');v.hidden=true;v.muted=v.defaultMuted=true;v.playsInline=true;v.loop=phase==='loop';v.preload='none';v.dataset.source=base+kind+'-'+phase+'.mp4';v.setAttribute('aria-hidden','true');machine.append(v);clips[phase]=v;v.addEventListener('loadeddata',()=>window.GlassBoardScene?.refresh());if(phase==='intro')v.addEventListener('ended',()=>{if(video===v&&effective()?.aftermath?.kind===kind){mediaPhase='loop';video=null;sync();window.GlassBoardScene?.refresh();}});v.addEventListener('error',()=>{error='背景動画を読み込めません';});}films[kind]=clips;
 }
 // Scroll throttling affects pictures only. Music follows the open game/tab,
 // including while the cabinet moves out of the scroll viewport.
 const active=()=>!!document.getElementById('kusa-pachi-window')?.open&&!document.hidden&&!document.getElementById('pachiPanel').hidden&&!document.getElementById('pachiGame').hidden&&document.getElementById('pachiMachine').dataset.activeMachine==='debug';
 const visible=()=>machine.dataset.scrolling!=='true'&&active();
 const enabled=()=>localStorage.getItem('glassGirlAmbientMusicV1')!=='off';
 const musicGate=window.GlassHandleBgm.register(audio,{allowed:()=>active()&&enabled()});
 function effective(){if(window.GlassModeTransition?.hideModeBackground)return{...state,aftermath:null};if(trial)return{...state,aftermath:trial,returnTransitionRemaining:0};const c=window.GlassPachiRuntime.config;return state?.modeTransitionRemaining>c.modeTransitionSeconds-c.modeRevealSeconds?{...state,aftermath:state.modeTransitionFrom||null}:state;}
 function wakePlayback(){if(!playbackRaf&&visible()&&effective()?.aftermath)playbackRaf=requestAnimationFrame(playbackTick);}
 function playbackTick(now){playbackRaf=0;const dt=playbackLast?Math.min(.1,(now-playbackLast)/1000):0;playbackLast=now;if(!visible()){playbackLast=0;sync();return;}if(trial){trial.elapsed+=dt;if(trial.elapsed>=(window.GlassPachiRuntime?.aftermathDurations[trial.kind]||200))trial=null;}sync();wakePlayback();}
 function seek(media,t){if(!Number.isFinite(t))return;if(media.loop&&Number.isFinite(media.duration)&&media.duration>0)t%=media.duration;try{media.currentTime=t;}catch{}}
 function unloadMedia(){video?.pause();video=null;for(const clips of Object.values(films)){for(const phase of ['intro','loop']){const v=clips[phase];if(v.hasAttribute('src')){v.pause();v.removeAttribute('src');v.load();}}clips.poster.removeAttribute('src');clips.still.removeAttribute('src');}if(audio.hasAttribute('src')){audio.pause();audio.removeAttribute('src');audio.load();}token='';}
 function sync(){
  if(!active()){unloadMedia();musicGate.update({active:false,volume:1});return;}
  const s=effective(),a=s?.aftermath,blocked=!!(s?.jackpotSession||s?.pending||s?.transitionRemaining||s?.returnTransitionRemaining),next=a?.kind||'normal',nextToken=key+':'+next+':'+(a?.id||0),elapsed=a?.elapsed||0;
  if(token!==nextToken)mediaPhase=elapsed<6?'intro':'loop';else if(elapsed>=6)mediaPhase='loop';
  const v=a?films[a.kind]?.[mediaPhase]:null;
  for(const [kind,clips]of Object.entries(films)){
   if(kind===a?.kind){for(const phase of ['intro','loop']){const old=clips[phase];if(old!==v&&old.hasAttribute('src')){old.pause();old.removeAttribute('src');old.load();}}for(const im of [clips.poster,clips.still])if(!im.hasAttribute('src'))im.src=im.datasetSource;if(v&&!v.hasAttribute('src')){v.preload='auto';v.src=v.dataset.source;}}
   else{for(const phase of ['intro','loop']){const old=clips[phase];if(old.hasAttribute('src')){old.pause();old.removeAttribute('src');old.load();}}clips.poster.removeAttribute('src');clips.still.removeAttribute('src');}
  }

  if(v!==video||token!==nextToken){video?.pause();video=v;if(v)seek(v,mediaPhase==='intro'?elapsed:Math.max(0,elapsed-6)%10);}
  for(const clips of Object.values(films))for(const phase of ['intro','loop'])if(clips[phase]!==video||!visible()||blocked||reduced.matches)clips[phase].pause();
  if(video&&visible()&&!blocked&&!reduced.matches){if(video.paused&&(!video.ended||mediaPhase==='loop'))video.play().catch(()=>{});}
  if(token!==nextToken){token=nextToken;mode=next;ended=false;audio.pause();audio.src=musicBase+next+'.mp3';audio.loop=next==='normal'||!!s?.mode;seek(audio,elapsed);window.GlassBoardScene?.refresh();}
  audio.loop=next==='normal'||!!s?.mode&&!trial;
  paused=!s||!active()||blocked||!!s.modeTransitionRemaining||!!window.GlassModeTransition?.snapshot().active||!enabled()||!!window.GlassJackpotMusic?.snapshot().playing;
  musicGate.update({active:!paused&&!ended,volume:1,bypass:!!trial});
 }
 audio.addEventListener('ended',()=>{if(mode!=='normal'){if(state?.mode&&!trial){ended=false;seek(audio,0);}else{ended=true;if(trial){trial=null;}else if(state?.aftermath)finish?.(state.aftermath.id);}sync();window.GlassBoardScene?.refresh();}});audio.addEventListener('error',()=>{error='BGMを読み込めません';});
 const controls=document.querySelector('.glass-board-controls'),button=document.createElement('button');button.type='button';button.id='glassAmbientMusicToggle';
 function label(){button.textContent=enabled()?'通常・背景BGM ON':'通常・背景BGM OFF';button.setAttribute('aria-pressed',String(enabled()));}
 button.onclick=()=>{localStorage.setItem('glassGirlAmbientMusicV1',enabled()?'off':'on');label();sync();};controls?.append(button);label();
 for(const [kind,text]of [['restoration','修復背景＋硝子の誓いを見る'],['life-return','生命帰還＋消え残る灯を見る']]){const b=document.createElement('button');b.type='button';b.dataset.aftermathPreview=kind;b.textContent=text;b.onclick=()=>api.preview(kind);controls?.append(b);}
 const back=document.createElement('button');back.type='button';back.textContent='背景試聴を終了';back.onclick=()=>{trial=null;sync();window.GlassBoardScene?.refresh();};controls?.append(back);
 const api={update(s,id,onComplete){finish=onComplete;if(key!==id){trial=null;token='';key=id;lastClock=s.clock;}if(s.jackpotSession||s.pending||s.returnTransitionRemaining)trial=null;lastClock=s.clock;state=s;sync();wakePlayback();},
  draw(ctx,w,h){const s=effective(),a=s?.aftermath;if(!a||s.jackpotSession||s.pending||s.transitionRemaining)return false;const clips=films[a.kind],v=clips[mediaPhase],fallback=reduced.matches||mediaPhase==='loop'?clips.still:clips.poster,source=!reduced.matches&&v.readyState>=2?v:fallback.complete&&fallback.naturalWidth?fallback:null;
   // Native Blender output 720x860 is exactly twice the 360x430 LCD.
   // The 3D composition follows the cabinet aperture. No source cropping,
   // inset movie, flat padding, duplicate backdrop or cover scaling.
   if(source)ctx.drawImage(source,0,0,w,h);return true;},
  cancelPreview(){trial=null;sync();window.GlassBoardScene?.refresh();},
  preview(kind){if((trial||state?.aftermath)?.kind===kind){sync();wakePlayback();document.dispatchEvent(new Event('glass-aftermath-play'));return true;}if(!state||state.jackpotSession||state.pending||state.returnTransitionRemaining||!films[kind])return false;trial={kind,elapsed:0,id:'preview-'+performance.now()};lastClock=state.clock;sync();document.dispatchEvent(new Event('glass-aftermath-play'));window.GlassBoardScene?.refresh();return true;},
  snapshot(){const s=effective();return{active:!!s?.aftermath&&!s.jackpotSession&&!s.pending,kind:s?.aftermath?.kind||null,name:window.GlassPachiRuntime?.aftermathModes[s?.aftermath?.kind]?.name||null,elapsed:s?.aftermath?.elapsed||0,trial:!!trial,music:{mode,title:titles[mode],time:audio.currentTime,playing:!audio.paused,enabled:enabled(),error:musicGate.error||error,source:audio.src},video:{phase:mediaPhase,time:video?.currentTime||0,playing:!!video&&!video.paused,width:video?.videoWidth||0,height:video?.videoHeight||0,error:video?.error?.message||''}};}
 };
 window.GlassAftermath=Object.freeze(api);
 new MutationObserver(()=>{playbackLast=0;sync();wakePlayback();}).observe(machine,{attributes:true,attributeFilter:['data-scrolling']});
 document.addEventListener('pointerdown',()=>{sync();wakePlayback();});document.addEventListener('visibilitychange',()=>{playbackLast=0;sync();wakePlayback();});audio.addEventListener('loadedmetadata',()=>{seek(audio,effective()?.aftermath?.elapsed||0);sync();});
 setInterval(()=>{if(!active())audio.pause();if(!visible())for(const clips of Object.values(films)){clips.intro.pause();clips.loop.pause();}},200);
})();
