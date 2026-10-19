/* Blender keyframed transparent sprites. No lottery, queued result, physics, or RNG access. */
(function(root){
 'use strict';const clamp=x=>Math.max(0,Math.min(1,x));
 function view(state){
  if(!state)return {phase:'idle',progress:0,scene:0,win:false,award:0};
  if(state.current){const c=state.current,duration=c.duration||1.2,progress=clamp(1-c.remaining/duration),elapsed=progress*4.8;return {phase:elapsed<.6?'arrival':elapsed<1.8?'life':elapsed<3.4?'erasure':elapsed<4.2?'thin':'connect',progress,scene:c.scene||0,win:false,award:0};}
  if(state.afterRemaining>1e-8)return {phase:state.lastHit?'saved':'broken',progress:clamp((state.clock-state.lastSettleAt)/(state.afterDuration||1.2)),scene:state.lastSpinId%3,win:!!state.lastHit,award:state.lastAward,jackpot:!!state.lastJackpot};
  return {phase:'idle',progress:0,scene:0,win:false,award:0};
 }
 const sheets={},errors=[],loaded=[];const browser=typeof document!=='undefined',script=browser?document.currentScript:null;
 const base=browser?new URL('../assets/glass-girl/flow-animation-v1/',script?.src||new URL('scripts/glass-win-flow.js',document.baseURI).href).href:'';
 const ready=browser?Promise.all(['normal','saved','broken'].flatMap(clip=>Array.from({length:clip==='normal'?3:1},(_,index)=>new Promise(resolve=>{const key=`${clip}-${index}`,im=new Image();sheets[key]=im;im.onload=()=>{loaded.push(key);resolve(true);};im.onerror=()=>{errors.push(key);resolve(false);};im.src=base+`${clip}-sheet-${index}.png`;})))):Promise.resolve([]);
 function draw(ctx,state,{reducedMotion=false}={}){
  const v=view(state);if(v.phase==='idle'||loaded.length!==5||errors.length)return v;
  const clip=v.phase==='saved'?'saved':v.phase==='broken'?'broken':'normal',count=clip==='normal'?36:12;
  const staticFrames={arrival:3,life:9,erasure:22,thin:29,connect:35,saved:11,broken:11};
  const frame=reducedMotion?staticFrames[v.phase]:v.progress*(count-1),first=Math.floor(frame),blend=frame-first;
  function sprite(index,alpha){const sheet=sheets[`${clip}-${Math.floor(index/12)}`],cell=index%12;ctx.globalAlpha=alpha;ctx.drawImage(sheet,(cell%4)*384,Math.floor(cell/4)*240,384,240,38,48,364,227.5);}
  ctx.save();
  // Premultiplied source-over blending on a blank reusable surface prevents duplicate silhouettes.
  if(!reducedMotion&&blend>0&&first<count-1&&mixCtx){mixCtx.clearRect(0,0,384,240);mixCtx.globalCompositeOperation='source-over';mixCtx.globalAlpha=1-blend;cell(mixCtx,clip,first);mixCtx.globalCompositeOperation='lighter';mixCtx.globalAlpha=blend;cell(mixCtx,clip,first+1);mixCtx.globalCompositeOperation='source-over';mixCtx.globalAlpha=1;ctx.drawImage(mixCanvas,38,48,364,227.5);}
  else sprite(first,1);
  ctx.restore();return v;
 }
 function cell(ctx,clip,index){const sheet=sheets[`${clip}-${Math.floor(index/12)}`],n=index%12;ctx.drawImage(sheet,n%4*384,Math.floor(n/4)*240,384,240,0,0,384,240);}
 const mixCanvas=browser?document.createElement('canvas'):null;if(mixCanvas){mixCanvas.width=384;mixCanvas.height=240;}const mixCtx=mixCanvas?.getContext('2d');
 const api=Object.freeze({view,draw,ready,snapshot:()=>({loaded:[...loaded],errors:[...errors],renderer:'blender-keyframes-v1',frames:60})});root.GlassWinFlow=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
