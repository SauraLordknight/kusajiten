// Window plant coordinates use the room's 384 × 256 logical pixels.
export function nearWindowPlant(p){return p?.map==='house'&&p.x>=130&&p.x<=174&&p.y>=88&&p.y<=108;}
const heart=['0110110','1111111','1111111','0111110','0011100','0001000'];
export class FishingPlantEffect {
 constructor(stage,{sound=()=>{},ended=()=>{}}={}){
  this.sound=sound;this.ended=ended;this.active=false;this.frame=0;
  this.canvas=document.createElement('canvas');this.canvas.width=384;this.canvas.height=256;this.canvas.className='fishing-plant-effect';this.canvas.hidden=true;this.canvas.setAttribute('aria-hidden','true');stage.append(this.canvas);this.ctx=this.canvas.getContext('2d');
 }
 start(){
  if(this.active)return false;this.active=true;this.canvas.hidden=false;this.at=performance.now();this.last=0;this.sounded=new Set();this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.hearts=Array.from({length:36},(_,i)=>({at:1300+Math.floor(i/6)*190,x:35+(i*73)%315,y:166+(i*17)%49,size:2+(i%3)*.5,color:['#ff80ac','#ffb7dd','#ffe694','#b7e9ff','#d6b5ff','#ff698a'][i%6]}));
  this.sound('crunch');const tick=t=>{if(!this.active)return;const elapsed=t-this.at;if(elapsed>=5200){this.stop(true);return;}this.frame=requestAnimationFrame(tick);if(t-this.last<1000/30)return;this.last=t;this.draw(elapsed);};this.frame=requestAnimationFrame(tick);return true;
 }
 draw(t){
  const c=this.ctx;c.clearRect(0,0,384,256);c.imageSmoothingEnabled=false;
  const cue=(key,at,name,rate=1)=>{if(t>=at&&!this.sounded.has(key)){this.sounded.add(key);this.sound(name,rate);}};
  cue('swell',300,'rainbow');for(let i=0;i<6;i++)cue(`pop${i}`,1300+i*190,'heart',.9+i*.07);
  const strength=Math.max(0,Math.min(1,(t-300)/850,(4100-t)/1200));
  if(strength>0){
   const gradient=c.createLinearGradient(0,0,384,256);['#ff6b91','#ffb56b','#fff48d','#92efb1','#7de2fa','#b99aff','#ff9ce5'].forEach((color,i)=>gradient.addColorStop(i/6,color));
   c.globalAlpha=strength*(this.reduced?.18:.38);c.fillStyle=gradient;c.fillRect(0,0,384,256);
   if(!this.reduced){c.globalAlpha=strength*.18;for(let i=0;i<7;i++){c.strokeStyle=['#ff9ab8','#ffd595','#fff8b2','#b7ffd2','#9bf1ff','#c7b7ff','#ffc3ed'][i];c.lineWidth=10;c.beginPath();c.ellipse(192,130,35+i*28+(t-300)*.018,20+i*18+(t-300)*.01,-.2,0,Math.PI*2);c.stroke();}}
  }
  for(const h of this.hearts){const age=t-h.at;if(age<0||age>2550)continue;const fade=Math.min(1,age/140,(2550-age)/650);const size=h.size*(this.reduced?1:Math.min(1,age/160));const x=h.x+(this.reduced?0:Math.sin(age/440+h.x)*8),y=h.y-(this.reduced?age*.012:age*.046);
   c.globalAlpha=Math.max(0,fade);for(let row=0;row<heart.length;row++)for(let col=0;col<7;col++)if(heart[row][col]==='1'){c.fillStyle='#6f3764';c.fillRect(Math.round(x+col*size),Math.round(y+row*size+1),Math.ceil(size),Math.ceil(size));c.fillStyle=h.color;c.fillRect(Math.round(x+col*size),Math.round(y+row*size),Math.ceil(size),Math.ceil(size));}
   c.fillStyle='#fff4fc';c.fillRect(Math.round(x+size),Math.round(y+size),Math.ceil(size),Math.ceil(size));
  }c.globalAlpha=1;
 }
 stop(notify=false){if(!this.active)return;this.active=false;cancelAnimationFrame(this.frame);this.frame=0;this.canvas.hidden=true;this.ctx.clearRect(0,0,384,256);this.hearts=[];this.sounded.clear();if(notify)this.ended();}
 diagnostics(){return {active:this.active,hearts:this.hearts?.length||0,elapsed:this.active?Math.round(performance.now()-this.at):0,reduced:!!this.reduced};}
}
