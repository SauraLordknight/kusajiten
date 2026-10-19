/* Saved volume belongs exclusively to Glass Girl. */
(()=>{'use strict';
 const read=key=>{try{const n=Number(localStorage.getItem(key)??.7);return Number.isFinite(n)?Math.max(0,Math.min(1,n)):.7;}catch{return .7;}};
 const values={sfx:read('glassGirlSfxVolume'),bgm:read('glassGirlBgmVolume')};
 const apply=()=>{window.GlassHandleBgm?.setMaster(values.bgm);document.dispatchEvent(new CustomEvent('glass-volume-change',{detail:{...values}}));};
 const media=new WeakMap();let effectsContext=null;
 function amplifyEffect(audio){
  if(media.has(audio)){effectsContext?.resume().catch(()=>{});return;}
  try{effectsContext||=new(window.AudioContext||window.webkitAudioContext)();const source=effectsContext.createMediaElementSource(audio),gain=effectsContext.createGain();gain.gain.value=2;source.connect(gain).connect(effectsContext.destination);media.set(audio,{source,gain});effectsContext.resume().catch(()=>{});}catch{}
 }
 document.addEventListener('pointerdown',()=>effectsContext?.resume().catch(()=>{}),{passive:true});
 document.addEventListener('keydown',()=>effectsContext?.resume().catch(()=>{}));
 window.GlassVolume=Object.freeze({get sfx(){return values.sfx;},get bgm(){return values.bgm;},amplifyEffect});
 for(const [kind,id,key]of [['sfx','glassSfxVolume','glassGirlSfxVolume'],['bgm','glassBgmVolume','glassGirlBgmVolume']]){
  const input=document.getElementById(id),out=document.getElementById(id+'Value');if(!input)continue;
  input.value=Math.round(values[kind]*100);out.textContent=input.value+'%';
  input.addEventListener('input',()=>{values[kind]=Number(input.value)/100;out.textContent=input.value+'%';try{localStorage.setItem(key,String(values[kind]));}catch{}apply();});
 }
 apply();
})();
