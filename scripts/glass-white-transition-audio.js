/* Decode the original mix directly: no MediaElementSource/CORS dependency. */
(()=>{'use strict';
 window.createGlassTransitionAudio=encoded=>{
  let context=null,buffer=null,loading=null,source=null,gain=null,offset=0,started=0,volume=.85,paused=true,ended=false,error=null,revision=0,plays=0;
  function load(){if(loading)return loading;
   try{context=new(window.AudioContext||window.webkitAudioContext)();gain=context.createGain();gain.gain.value=volume*2;gain.connect(context.destination);
    const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
    loading=context.decodeAudioData(bytes.buffer).then(b=>{buffer=b;return b;}).catch(e=>{error={message:e.message};throw e;});
   }catch(e){error={message:e.message};loading=Promise.reject(e);}return loading;
  }
  function time(){return source?Math.min(buffer.duration,offset+context.currentTime-started):offset;}
  function pause(){const t=time();revision++;paused=true;const previous=source;source=null;if(previous){previous.onended=null;try{previous.stop();}catch{}previous.disconnect();}offset=t;}
  function unlock(){load().catch(()=>{});return context?.resume().catch(e=>{error={message:e.message};});}
  const api={load,unlock,pause,
   play(){if(!paused)return Promise.resolve();paused=false;ended=false;const request=++revision;const ready=load();context?.resume().catch(e=>{error={message:e.message};});
    return ready.then(()=>{if(request!==revision||paused)return;if(context.state!=='running'){paused=true;throw Error('AudioContext is suspended');}
     if(offset>=buffer.duration){paused=true;ended=true;return;}
     const node=context.createBufferSource();node.buffer=buffer;node.connect(gain);source=node;started=context.currentTime;
     node.onended=()=>{node.disconnect();if(source===node){source=null;offset=buffer.duration;paused=true;ended=true;}};node.start(0,Math.max(0,offset));plays++;error=null;
    }).catch(e=>{if(request===revision){paused=true;error={message:e.message};}throw e;});
   },
   get currentTime(){return time();},set currentTime(t){pause();offset=Math.max(0,Number(t)||0);ended=false;},
   get volume(){return volume;},set volume(v){volume=Math.max(0,Math.min(1,Number(v)||0));if(gain)gain.gain.value=volume*2;},
   get paused(){return paused;},get ended(){return ended;},get error(){return error;},get readyState(){return buffer?4:0;},get duration(){return buffer?.duration||0;},
   snapshot:()=>({ready:!!buffer,context:context?.state||'uninitialized',playing:!!source&&context?.state==='running',gain:gain?.gain.value||0,plays,error:error?.message||''})
  };return api;
 };
 window.createGlassWhiteTransitionAudio=()=>window.createGlassTransitionAudio(window.GlassWhiteTransitionSoundData);
})();
