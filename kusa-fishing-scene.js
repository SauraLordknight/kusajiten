import {FishingWorld} from './kusa-fishing-world.js';
import {FISHING_SPRITES} from './kusa-fishing-sprites.js';
import {COFFEE_SPOT,COFFEE_BOUNDS,nearCoffee,coffeePose} from './kusa-fishing-coffee.js';
const active=phase=>['casting','waiting','bite','reeling','reward'].includes(phase);
export class FishingScene {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.images={};this.actors={};this.actorErrors=[];this.camera={x:0,y:0,zoom:1};this.cameraReset=true;this.cameraAt=0;this.frame=0;this.last=0;this.p=FishingWorld.spawn('house');this.direction=null;this.distance=0;this.stepDistance=0;this.state={period:'day',character:'boy',phase:'idle'};this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.makeSprites();}
 set(state){Object.assign(this.state,state);if(this.loaded)this.loadPeriod();this.draw(performance.now());}
 loadPeriod(){const period=this.state.period;if(!['sunset','night','midnight'].includes(period))return;this.periodLoads??={};if(this.periodLoads[period])return;this.periodLoads[period]=true;for(const kind of ['map','house']){const img=new Image();img.onload=()=>{const cache=document.createElement('canvas');cache.width=384;cache.height=256;const c=cache.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(img,0,0,384,256);this.images[`${kind}-${period}`]=cache;this.draw(performance.now());};img.onerror=()=>{this.actorErrors.push(`${kind}-${period}: image load failed`);};img.src=new URL(`assets/fishing/time-maps-v1/${kind}-${period}.png`,document.baseURI).href;}}
 restore(p){this.p=FishingWorld.restore(p);this.direction=null;this.cameraReset=true;this.onMove?.(this.p,FishingWorld.context(this.p));}
 snapshot(){return {...this.p};}
 enter(map){this.restore(FishingWorld.spawn(map));}
 resume(place){this.restore(place==='river'?{map:'outdoor',x:230,y:97,direction:'right'}:{map:'outdoor',x:76,y:162,direction:'down'});}
 input(direction){this.direction=direction;}
 start(){if(!this.loaded){this.loaded=true;for(const [key,file] of Object.entries({map:'coast-map.png',land:'coast-land.png',house:'cottage-fisherman-v2.png',tableEmpty:'cottage-coffee-table-empty.png'})){const img=new Image();img.onload=()=>{const cache=document.createElement('canvas');cache.width=384;cache.height=256;const c=cache.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(img,0,0,384,256);this.images[key]=cache;};img.src=new URL(`assets/fishing/${file}`,document.baseURI).href;}
  const coffee=new Image();coffee.onload=()=>{try{this.prepareCoffee(coffee);}catch(e){this.actorErrors.push(`coffee: ${e.message}`);}};coffee.onerror=()=>this.actorErrors.push('coffee: image load failed');coffee.src=new URL('assets/fishing/hero-coffee-v1.png',document.baseURI).href;
  for(const character of ['boy','girl']){const img=new Image();img.onload=()=>{try{this.prepareActor(character,img);}catch(e){this.actorErrors.push(`${character}: ${e.message}`);}};img.onerror=()=>this.actorErrors.push(`${character}: image load failed`);img.src=new URL(`assets/fishing/hero-${character}-rpg-v2.png`,document.baseURI).href;}
 }this.loadPeriod();if(this.frame)return;this.last=0;const tick=t=>{this.frame=requestAnimationFrame(tick);if(t-this.last<1000/30)return;const dt=this.last?Math.min(.05,(t-this.last)/1000):0;this.last=t;this.updateCoffee(t);this.move(dt);this.draw(t);};this.frame=requestAnimationFrame(tick);}
 stop(){cancelAnimationFrame(this.frame);this.frame=0;this.direction=null;this.last=0;}
 move(dt){
  this.moving=false;
  if(!this.direction||this.rest||this.state.locked||this.isBlocked?.()||active(this.state.phase))return;
  const v={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[this.direction];if(!v)return;
  this.p.direction=this.direction;const length=43*dt,steps=Math.ceil(length);
  for(let i=0;i<steps;i++){
   const x=this.p.x+v[0]*length/steps,y=this.p.y+v[1]*length/steps;
   if([-3,3].every(dx=>[-1,1].every(dy=>FishingWorld.walkable(this.p.map,x+dx,y+dy)))){
    this.p.x=x;this.p.y=y;this.distance+=length/steps;this.stepDistance+=length/steps;this.moving=true;
   }
  }
  if(this.moving){if(this.stepDistance>10){this.stepDistance=0;this.onStep?.(FishingWorld.surface(this.p));}this.onMove?.(this.p,FishingWorld.context(this.p));}
 }
 makeSprites(){
  // Match each background with a visible, time-colored eight-frame water atlas.
  // Small tile sheets are cached once; never fade the whole night animation out.
  this.waterSprites={};
  const palettes={
   day:['#a4eee050','#efffffa0',['#b4f4f3b0','#f1ffffe0','#61cfe7a0'],'#e2ffffa0'],
   sunset:['#edbc8b70','#fff0c2a0',['#eecda5b0','#fff5dce0','#e9aa84a0'],'#ffe4bda0'],
   night:['#8bc9ed70','#d7edffa8',['#8cbce5b0','#dceeffe0','#689fd2a0'],'#c1e3ffa0'],
   midnight:['#71addc70','#bddcffa0',['#77a6d2b0','#c9e2ffe0','#588ebfa0'],'#b1d5f8a0']
  };
  for(const [period,[ripple,glint,fallColors,foam]] of Object.entries(palettes)){
   const water=document.createElement('canvas');water.width=256;water.height=32;
   const falls=document.createElement('canvas');falls.width=192;falls.height=32;
   const c=water.getContext('2d'),f=falls.getContext('2d');
   for(let frame=0;frame<8;frame++){
    for(let i=0;i<13;i++){const x=(i*13+frame*(i%2?1:-1)+32)%32,y=(i*7+Math.floor(frame/3))%32;c.fillStyle=i%3?ripple:glint;c.fillRect(frame*32+x,y,3+i%4,1);}
    for(let i=0;i<9;i++){f.fillStyle=fallColors[i%3];f.fillRect(frame*24+i*3%23,(i*11+frame*4)%32,1+i%2,5+i%5);}
    f.fillStyle=foam;for(let i=0;i<6;i++)f.fillRect(frame*24+(i*7+frame)%23,27+(i+frame)%5,3,1);
   }
   this.waterSprites[period]={water,falls};
  }
  this.water=this.waterSprites.day.water;this.falls=this.waterSprites.day.falls;
  this.overlay=document.createElement('canvas');this.overlay.width=384;this.overlay.height=256;
 }
 prepareActor(character,img){
  if(img.width!==1536||img.height!==1024)throw new Error('Unexpected sprite sheet dimensions');
  const sheet=document.createElement('canvas');sheet.width=8*144;sheet.height=4*168;const c=sheet.getContext('2d');c.imageSmoothingEnabled=false;
  // Keep three pixels per world pixel, matching the outdoor zoom without
  // discarding the generated face and clothing details before magnification.
  const bounds=FISHING_SPRITES[character],scale=72/(bounds[0][3]-bounds[0][1]+1);
  for(let row=0;row<4;row++)for(let col=0;col<8;col++){
   // Side animations share a mirrored sequence so the casting direction stays
   // correct even where the generator turned a side pose toward the viewer.
   let sourceRow=row===1?2:row;if(character==='boy'&&(row===1||row===2)&&col===3)sourceRow=1;
   const [left,top,right,bottom,anchor]=bounds[sourceRow*8+col],width=right-left+1,height=bottom-top+1;
   c.save();c.beginPath();c.rect(col*144,row*168,144,168);c.clip();c.translate(col*144+72,row*168+150);if(row===1)c.scale(-1,1);
   c.drawImage(img,col*192+left,sourceRow*256+top,width,height,Math.round((left-anchor)*scale),Math.round((top-bottom)*scale),Math.round(width*scale),Math.round(height*scale));c.restore();
  }
  if(character==='girl'){
   // Only the two downward walking frames: keep the frontal head identical
   // to the idle frame while retaining each frame's animated body and legs.
   const headHeight=118;
   for(const col of [1,2]){
    c.clearRect(col*144,0,144,headHeight);
    c.drawImage(sheet,0,0,144,headHeight,col*144,0,144,headHeight);
   }
  }
  this.actors[character]=sheet;
 }
 prepareCoffee(img){
  // Bake each transparent frame once, with a consistent hip/seat anchor.
  if(img.width!==1536||img.height!==1024)throw new Error('Unexpected coffee sprite dimensions');
  const cache=document.createElement('canvas');cache.width=4*144;cache.height=2*168;const c=cache.getContext('2d');c.imageSmoothingEnabled=false;
  for(let row=0;row<2;row++)for(let col=0;col<4;col++){
   const [left,top,right,bottom]=COFFEE_BOUNDS[row][col],width=right-left,height=bottom-top,scale=78/height;
   c.drawImage(img,col*384+left,row*512+top,width,height,col*144+96-width*scale*.82,row*168+100-78*.71,width*scale,78);
  }
  this.coffeeSprites=cache;
 }
 beginCoffee(){if(this.rest||!nearCoffee(this.p)||!this.coffeeSprites||!this.images.tableEmpty||!this.actors[this.state.character])return false;this.direction=null;this.moving=false;this.rest={at:performance.now(),origin:this.snapshot(),sips:0};return true;}
 endCoffee(notify=true){if(!this.rest)return;this.p={...this.rest.origin};this.rest=null;this.direction=null;this.moving=false;if(notify)this.onCoffeeEnd?.();}
 updateCoffee(t){if(!this.rest)return;const elapsed=t-this.rest.at;
  if(elapsed>=COFFEE_SPOT.duration){this.endCoffee();return;}
  const sips=elapsed>=4650?2:elapsed>=2100?1:0;if(sips>this.rest.sips){this.rest.sips=sips;this.onCoffeeSip?.();}
 }
 coffeeAvatar(c,t){
  const pose=coffeePose(this.rest,t);
  const scale=1.15;
  if(pose.walking){const actor=this.actors[this.state.character],row={down:0,left:1,right:2,up:3}[pose.direction],col=[0,1,0,2][Math.floor((t-this.rest.at)/140)%4],p=pose.point;this.drawActor(c,actor,row,col,p,scale);return;}
  const row=this.state.character==='girl'?1:0,p=pose.seat;c.drawImage(this.coffeeSprites,pose.col*144,row*168,144,168,p.x-32*scale,p.y-100/3*scale,48*scale,56*scale);
  if(pose.col>0){const x=p.x-10*scale,y=p.y-11*scale;c.strokeStyle='#fff4d399';c.lineWidth=.6;for(let i=0;i<2;i++){const drift=this.reduced?0:Math.sin(t*.002+i)*.7;c.beginPath();c.moveTo(x+i*1.5,y);c.quadraticCurveTo(x-1+drift+i*1.5,y-2,x+drift+i*1.5,y-4);c.stroke();}}
 }
 pose(t){
  const phase=this.state.phase,elapsed=t-(this.state.phaseAt||0),row={down:0,left:1,right:2,up:3}[this.p.direction]??0;
  let col=0;
  if(phase==='casting')col=elapsed<260?3:4;
  else if(phase==='waiting'||phase==='bite')col=5;
  else if(phase==='reeling')col=6;
  else if(phase==='reward')col=7;
  else if(this.moving)col=[0,1,0,2][Math.floor(this.distance/5)%4];
  return {row,col,direction:this.p.direction,character:this.state.character};
 }
 updateCamera(t){
  const house=this.p.map==='house',zoom=house?1:2,viewW=384/zoom,viewH=256/zoom,catching=!house&&active(this.state.phase);
  const targetX=Math.max(0,Math.min(384-viewW,this.p.x+(catching?(this.state.location==='river'?10:4):0)-viewW/2));
  const targetY=Math.max(0,Math.min(256-viewH,this.p.y+(catching?-4:-8)-viewH/2));
  const dt=Math.min(.05,Math.max(0,(t-this.cameraAt)/1000));this.cameraAt=t;
  if(this.cameraReset||this.camera.zoom!==zoom){this.camera.x=house?0:targetX;this.camera.y=house?0:targetY;this.cameraReset=false;}
  else {const blend=this.reduced?1:1-Math.exp(-14*dt);this.camera.x+=(targetX-this.camera.x)*blend;this.camera.y+=(targetY-this.camera.y)*blend;}
  this.camera.zoom=zoom;
 }
 screenPoint(x,y){return {x:(x-Math.round(this.camera.x))*this.camera.zoom,y:(y-Math.round(this.camera.y))*this.camera.zoom};}
 diagnostics(){return {camera:{...this.camera},timeMap:{period:this.state.period,key:this.mapKey,ready:!!this.images[this.mapKey],loaded:Object.keys(this.images)},playerScreen:this.screenPoint(this.p.x,this.p.y),sprite:{...this.pose(performance.now()),ready:!!this.actors[this.state.character],scale:this.p.map==='house'?1.15:1},coffee:{ready:!!this.coffeeSprites,active:!!this.rest,...(this.rest?coffeePose(this.rest,performance.now()):{})},loadedActors:Object.keys(this.actors),actorErrors:[...this.actorErrors]};}
 draw(t){const c=this.ctx;c.imageSmoothingEnabled=false;c.clearRect(0,0,384,256);const house=this.p.map==='house',kind=house?'house':'map',period=this.state.period||'day';this.mapKey=period==='day'?kind:`${kind}-${period}`;const bg=this.images[this.mapKey];if(!bg){c.fillStyle={day:'#387e87',sunset:'#553c43',night:'#131e38',midnight:'#0a1024'}[period]||'#131e38';c.fillRect(0,0,384,256);c.fillStyle='#eee2bf';c.font='10px sans-serif';c.textAlign='center';c.fillText('水辺の景色を準備しています…',192,128);c.textAlign='start';return;}this.updateCamera(t);c.save();c.scale(this.camera.zoom,this.camera.zoom);c.translate(-Math.round(this.camera.x),-Math.round(this.camera.y));c.drawImage(bg,0,0);if(!house)this.waterLayer(c,t);if(house&&this.rest&&coffeePose(this.rest,t).col>0&&this.images.tableEmpty)c.drawImage(this.images.tableEmpty,49,64,15,13,49,64,15,13);this.avatar(c,t);this.tackle(c,t);if(house){c.fillStyle='#fff1bc';c.font='9px monospace';c.fillText('▼ 出口',174,228);}c.restore();this.lighting(c,t,house);}
 waterLayer(c,t){
  const frame=this.reduced?0:Math.floor(t/130)%8,o=this.overlay.getContext('2d');
  const sprites=this.waterSprites[this.state.period]||this.waterSprites.day;
  o.clearRect(0,0,384,256);
  for(let y=0;y<256;y+=32)for(let x=0;x<384;x+=32){const offset=(frame+(x/32+y/32)%3)%8;o.drawImage(sprites.water,offset*32,0,32,32,x,y,32,32);}
  c.save();c.globalAlpha=1;
  if(this.images.land){o.globalCompositeOperation='destination-out';o.drawImage(this.images.land,0,0);o.globalCompositeOperation='source-over';c.drawImage(this.overlay,0,0);}
  for(const [x,y,w,h] of [[225,32,22,19],[372,3,12,15]])c.drawImage(sprites.falls,frame*24,0,24,32,x,y,w,h);
  c.restore();
 }
 drawActor(c,actor,row,col,p,scale){c.drawImage(actor,col*144,row*168,144,168,Math.round(p.x)-24*scale,Math.round(p.y)-50*scale,48*scale,56*scale);}
 avatar(c,t){if(this.rest){this.coffeeAvatar(c,t);return;}const actor=this.actors[this.state.character],{row,col}=this.pose(t),scale=this.p.map==='house'?1.15:1;if(actor){c.fillStyle='#102e3f44';c.beginPath();c.ellipse(Math.round(this.p.x),Math.round(this.p.y)+1,5*scale,1.5*scale,0,0,Math.PI*2);c.fill();this.drawActor(c,actor,row,col,this.p,scale);return;}
  // Loading-only silhouette; replaced as soon as the generated atlas loads.
  c.fillStyle=this.state.character==='girl'?'#d8799c':'#4c9c79';c.fillRect(Math.round(this.p.x)-5,Math.round(this.p.y)-20,10,20);
 }
 tackle(c,t){
  const {phase,phaseAt=0,location}=this.state;if(!active(phase)||phase==='reward'){this.bobberScreen=null;return;}
  const p=this.p,river=location==='river',elapsed=t-phaseAt,{col}=this.pose(t),reel=phase==='reeling'?Math.min(1,elapsed/500):0;
  const grip=col===3?[-6,-21]:col===4?[10.5,-13.5]:col===6?[6.75,-18]:river?[4.5,-9]:[.75,-9];
  const hand={x:p.x+grip[0],y:p.y+grip[1]},tip={x:hand.x+(col===3?-7:col===6?0:9),y:hand.y-(col===6?15:13)};
  const target=FishingWorld.fishingSpot(p)||{x:p.x+(river?26:9),y:p.y+(river?8:29)},flight=phase==='casting'?Math.max(0,Math.min(1,(elapsed-260)/390)):1;
  const bx=tip.x+(target.x-tip.x)*flight*(1-reel),by=tip.y+(target.y-tip.y)*flight*(1-reel)-(phase==='casting'?Math.sin(flight*Math.PI)*12:0)+(phase==='bite'?3:Math.sin(t*.004));
  this.bobberScreen=this.screenPoint(bx,by);
  c.strokeStyle='#57412d';c.lineWidth=2;c.beginPath();c.moveTo(hand.x,hand.y);c.lineTo(tip.x,tip.y);c.stroke();c.strokeStyle='#efdfad';c.lineWidth=1;c.beginPath();c.moveTo(hand.x,hand.y);c.lineTo(tip.x,tip.y);c.stroke();
  c.strokeStyle='#f8f3dc';c.lineWidth=.6;c.beginPath();c.moveTo(tip.x,tip.y);c.quadraticCurveTo((tip.x+bx)/2,(tip.y+by)/2+(phase==='bite'?0:4),bx,by);c.stroke();c.fillStyle='#fff6d5';c.fillRect(Math.round(bx)-1,Math.round(by)-3,3,5);c.fillStyle='#e7685b';c.fillRect(Math.round(bx)-1,Math.round(by)-3,3,2);
  if(phase==='waiting'||phase==='bite'){c.strokeStyle='#d5fff4a0';c.beginPath();c.ellipse(bx,by+3,5+Math.sin(t*.003),2,0,0,Math.PI*2);c.stroke();}
  if(phase==='bite'){c.fillStyle='#fff6d4';c.fillRect(p.x-5,p.y-38,10,12);c.fillStyle='#b64c36';c.font='bold 12px monospace';c.fillText('!',p.x-3,p.y-28);}
 }
 lighting(c,t,house){if(!house&&['night','midnight'].includes(this.state.period)){for(let i=0;i<10;i++){c.globalAlpha=this.reduced?.4:.25+.4*Math.abs(Math.sin(t*.0009+i));c.fillStyle='#ededa3';c.fillRect(20+i*37,40+i*7%80,1,1);}c.globalAlpha=1;}}
}
