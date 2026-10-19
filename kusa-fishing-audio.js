const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function distanceToPath(p,points){let result=Infinity;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy),0,1);result=Math.min(result,Math.hypot(p.x-a[0]-dx*t,p.y-a[1]-dy*t));}return result;}
const smooth=(distance,radius)=>{const x=clamp(1-distance/radius,0,1);return x*x*(3-2*x);};
export function fishingWaterLevels(p){
 if(!p||p.map!=='outdoor')return {sea:0,river:0,waterfall:0};
 return {
  sea:.216*smooth(distanceToPath(p,[[0,180],[100,178],[195,170]]),78),
  river:.20*smooth(distanceToPath(p,[[228,32],[245,98],[213,149]]),70),
  waterfall:.14*smooth(Math.hypot(p.x-235,p.y-44),78)
 };
}
export class FishingSoundscape {
 constructor(){this.context=null;this.buffers=new Map();this.loops=new Map();this.voices=new Set();this.enabled=false;this.position=null;this.ready=false;this.loading=null;this.errors=[];this.lastStep=-Infinity;this.stepCount=0;this.lastSurface=null;this.variants={wood:0,grass:0,sand:0};this.suspendTimer=0;this.targets={sea:0,river:0,waterfall:0};}
 async load(){
  if(this.loading)return this.loading;
  this.loading=(async()=>{
   if(!globalThis.KusaFishingRecordings)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('assets/fishing/audio/recordings-data.js?v=20261018-dirt-2',document.baseURI).href;script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error('録音素材を読み込めませんでした'));};document.head.append(script);});
   await Promise.all(Object.entries(globalThis.KusaFishingRecordings).map(async([name,encoded])=>{const raw=atob(encoded),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);const buffer=await this.context.decodeAudioData(bytes.buffer);this.buffers.set(name,buffer);}));
   this.ready=true;this.update(this.position);
  })().catch(error=>{this.errors.push(error.message);this.loading=null;});return this.loading;
 }
 start(position){
  this.position=position;this.enabled=true;clearTimeout(this.suspendTimer);
  try{this.context??=new (window.AudioContext||window.webkitAudioContext)();if(this.context.state!=='running')this.context.resume().catch(()=>{});this.load();this.loadCoffee();this.update(position);}catch(e){this.errors.push(e.message);}
 }
 async loadCoffee(){
  if(this.coffeeLoading)return this.coffeeLoading;
  this.coffeeLoading=(async()=>{
   if(!globalThis.KusaFishingCoffeeRecording)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('assets/fishing/audio/coffee-sip-data.js?v=20261018-sip-only-2',document.baseURI).href;script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error('飲む音を読み込めませんでした'));};document.head.append(script);});
   const raw=atob(globalThis.KusaFishingCoffeeRecording),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));this.coffeeBuffer=await this.context.decodeAudioData(bytes.buffer);
  })().catch(e=>{this.errors.push(e.message);this.coffeeLoading=null;});return this.coffeeLoading;
 }
 sip(){
  if(!this.enabled||!this.coffeeBuffer||this.context?.state!=='running'||document.hidden)return;
  this.stopSip();const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=this.coffeeBuffer;gain.gain.value=.18;source.connect(gain).connect(this.context.destination);this.coffeeVoice=source;this.voices.add(source);this.sips=(this.sips||0)+1;
  source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(source);if(this.coffeeVoice===source)this.coffeeVoice=null;};source.start();
 }
 stopSip(){if(this.coffeeVoice){try{this.coffeeVoice.stop();}catch{}this.voices.delete(this.coffeeVoice);this.coffeeVoice=null;}}
 update(position){
  this.position=position;this.targets=this.enabled?fishingWaterLevels(position):{sea:0,river:0,waterfall:0};
  if(!this.ready||!this.context||!this.enabled)return;
  const now=this.context.currentTime;
  for(const [name,target] of Object.entries(this.targets)){
   let node=this.loops.get(name);
   if(!node&&target>.001){
    const source=this.context.createBufferSource(),gain=this.context.createGain(),pan=this.context.createStereoPanner?.();source.buffer=this.buffers.get(`${name}-real-loop`);source.loop=true;gain.gain.value=0;source.connect(gain);
    if(pan)gain.connect(pan).connect(this.context.destination);else gain.connect(this.context.destination);
    source.start();node={source,gain,pan};this.loops.set(name,node);
   }
   if(node){node.gain.gain.cancelScheduledValues(now);node.gain.gain.setTargetAtTime(target,now,.22);if(node.pan){const emitterX=name==='sea'?position.x:235;node.pan.pan.setTargetAtTime(clamp((emitterX-position.x)/90,-.35,.35),now,.3);}}
  }
  // Indoors all emitters fade out, then release their playback sources.
  if(position?.map==='house')for(const [name,node] of this.loops){node.source.stop(now+.8);node.source.onended=()=>{node.source.disconnect();node.gain.disconnect();node.pan?.disconnect();};this.loops.delete(name);}
 }
 step(surface){
  if(!this.enabled||!this.ready||!this.context||this.context.state!=='running'||document.hidden)return;
  const now=this.context.currentTime;if(now-this.lastStep<.2||this.voices.size>=4)return;this.lastStep=now;
  surface=['wood','grass','sand'].includes(surface)?surface:'grass';
  const variant=this.variants[surface]%3+1;this.variants[surface]++;
  const recording=surface==='grass'?'dirt':surface;
  const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=this.buffers.get(`step-${recording}-real-${variant}`);if(!source.buffer)return;
  source.playbackRate.value=.98+Math.random()*.04;gain.gain.value=surface==='grass'?.20:surface==='wood'?.22:.30;source.connect(gain).connect(this.context.destination);this.voices.add(source);this.stepCount++;this.lastSurface=surface;this.lastRecording=recording;
  source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(source);};source.start();
 }
 stop(){
  this.enabled=false;this.targets={sea:0,river:0,waterfall:0};const now=this.context?.currentTime||0;
  for(const node of this.loops.values()){node.gain.gain.cancelScheduledValues(now);node.gain.gain.setTargetAtTime(0,now,.015);node.source.stop(now+.06);node.source.onended=()=>{node.source.disconnect();node.gain.disconnect();node.pan?.disconnect();};}this.loops.clear();
  this.stopSip();for(const source of this.voices){try{source.stop();}catch{}}this.voices.clear();clearTimeout(this.suspendTimer);this.suspendTimer=setTimeout(()=>{if(!this.enabled)this.context?.suspend().catch(()=>{});},100);
 }
 diagnostics(){return {enabled:this.enabled,ready:this.ready,context:this.context?.state||'uninitialized',buffers:this.buffers.size,loops:this.loops.size,targets:{...this.targets},gains:Object.fromEntries([...this.loops].map(([k,v])=>[k,v.gain.gain.value])),steps:this.stepCount,lastSurface:this.lastSurface,lastRecording:this.lastRecording||null,voices:this.voices.size,coffeeReady:!!this.coffeeBuffer,sips:this.sips||0,errors:[...this.errors]};}
}
