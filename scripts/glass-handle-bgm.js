/* Handle-driven music envelope only. Never changes gameplay or media positions. */
(function(root){'use strict';
  function create({now=()=>performance.now(),fadeIn=1.5,fadeOut=3,idleSeconds=30}={}){
  const tracks=new Set(),transitionBlocks=new Set();let holding=false,touched=false,releasedAt=0,from=0,target=0,rampAt=now(),player='',master=1;
  function gainAt(t){const duration=(target?fadeIn:fadeOut)*1000,p=Math.max(0,Math.min(1,(t-rampAt)/duration));return from+(target-from)*p;}
  function change(next,at){if(next===target)return;from=gainAt(at);target=next;rampAt=at;}
  function tick(){const t=now();if(touched&&!holding&&t>=releasedAt+idleSeconds*1000)change(0,releasedAt+idleSeconds*1000);const gain=gainAt(t);
    for(const track of tracks){const allowed=!transitionBlocks.size&&track.active&&track.allowed(),level=track.bypass?1:gain;track.audio.volume=transitionBlocks.size?0:Math.max(0,Math.min(1,track.volume*level*master));
    const play=allowed&&(track.bypass||touched&&level>0);
    if(!play){track.audio.pause();continue;}
    if(track.audio.paused&&!track.requesting){track.requesting=true;Promise.resolve(track.audio.play()).then(()=>{track.error='';if(transitionBlocks.size||!track.active||!track.allowed()||!track.bypass&&gainAt(now())<=0)track.audio.pause();}).catch(()=>{track.error='曲の再開にはハンドルを操作してください';}).finally(()=>track.requesting=false);}
   }
   return gain;
  }
  return {tick,setHolding(value){value=!!value;if(value===holding)return;const t=now();tick();holding=value;if(value){touched=true;change(1,t);}else releasedAt=t;tick();},
   setPlayer(key){if(player===key)return;player=key;holding=false;touched=false;from=target=0;rampAt=now();for(const track of tracks){track.active=false;track.audio.pause();}tick();},
   register(audio,{allowed=()=>true}={}){const track={audio,allowed,active:false,volume:0,bypass:false,requesting:false,error:''};audio.volume=0;tracks.add(track);return{update(options){Object.assign(track,options);tick();},get error(){return track.error;}};},
   setMaster(value){master=Math.max(0,Math.min(1,Number(value)||0));tick();},
   setTransitionActive(id,active){if(active)transitionBlocks.add(id);else transitionBlocks.delete(id);tick();},
   snapshot(){const t=now();return{holding,touched,gain:gainAt(t),master,transitionMuted:!!transitionBlocks.size,idleSeconds,fadeIn,fadeOut,idleElapsed:touched&&!holding?Math.max(0,(t-releasedAt)/1000):0};}
  };
 }
 if(typeof module!=='undefined')module.exports={create};
 if(root.document){const api=create();root.GlassHandleBgm=api;setInterval(()=>api.tick(),50);document.addEventListener('visibilitychange',()=>{if(document.hidden)api.setHolding(false);api.tick();});}
})(typeof window!=='undefined'?window:globalThis);
