/* Glass Girl only: image skins follow the existing physical segments and state. */
(function(root){
 'use strict';
 const crops={gate:[154,113,1864,499],blade:[423,20,178,1465],hub:[352,383,526,512],tunnel:[382,58,260,1404],pocket:[60,168,1662,600],'attacker-frame':[57,82,1989,563],'attacker-door':[39,295,2095,130]};
 const directory=new URL('../assets/glass-girl/mechanisms-v1/',document.currentScript.src),images={},failed=[],reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const keys=Object.keys(crops);
 const bank=new GlassAssetBank(keys.map(key=>new URL(key+'.png',directory).href),{capacity:keys.length,onReady:()=>{for(let i=0;i<keys.length;i++)if(bank.peek(i))images[keys[i]]=bank.peek(i);},transform:(im,index)=>{const[x,y,w,h]=crops[keys[index]],scale=Math.min(1,1024/Math.max(w,h)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));c.getContext('2d').drawImage(im,x,y,w,h,0,0,c.width,c.height);c.complete=true;c.naturalWidth=c.width;c.naturalHeight=c.height;c.src=im.src;return c;}});
 document.addEventListener('glass-cabinet-released',()=>{for(const key of keys)delete images[key];});
 function sprite(ctx,key,x,y,w,h,angle=0,alpha=1){
  const im=images[key];if(!im?.complete||!im.naturalWidth)return false;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=alpha;
  ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();return true;
 }
 function strip(ctx,s,key='attacker-door',width=4){
  const dx=s.b.x-s.a.x,dy=s.b.y-s.a.y,length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
  if(key==='blade')sprite(ctx,key,(s.a.x+s.b.x)/2,(s.a.y+s.b.y)/2,width,length,angle+Math.PI/2);
  else sprite(ctx,key,(s.a.x+s.b.x)/2,(s.a.y+s.b.y)/2,length,width,angle);
 }
 function light(ctx,x,y,r,strength=.6){
  ctx.save();ctx.globalAlpha*=strength;const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,'rgba(74,191,255,.9)');g.addColorStop(.35,'rgba(37,155,255,.35)');g.addColorStop(1,'rgba(37,155,255,0)');
  ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
 }
 function mouth(ctx,x,y,width=36,height=16){sprite(ctx,'pocket',x,y+height*.22,width,height);}
 function geometry(p){
  const lines=p.segments();return {pegs:p.pegs.map(q=>({...q})),posts:p.posts.map(q=>({...q})),pockets:p.pockets.map(q=>({...q})),reflector:lines.filter(s=>s.reflector).map(s=>({a:{...s.a},b:{...s.b},width:s.r*2})),rotor:lines.filter(s=>s.rotor).map(s=>({a:{...s.a},b:{...s.b},width:s.r*2})),flower:lines.slice(6,8).map(s=>({a:{...s.a},b:{...s.b},width:s.r*2})),tunnel:{a:{x:61,y:280},b:{x:81,y:350}},gate:{...p.warp.entry},exit:{...p.warp.exit},hold:{...p.hold},attacker:{...p.attacker},open:p.state.jackpot};
 }
 function draw(ctx,p,{diagnostic=false,balls=[]}={}){
  const state=p.state,lines=p.segments();ctx.save();
  // Warp apertures remain empty, and share the two blue seam marks.
  const entering=balls.some(b=>b.phase==='warp'),exiting=state.time<state.exitFlash;
  for(const [point,active]of [[p.warp.entry,entering],[p.warp.exit,exiting]]){
   if(active)light(ctx,point.x,point.y,26,.7);
   sprite(ctx,'gate',point.x,point.y,52,14);
  }
  for(const line of lines.slice(0,4))strip(ctx,line);
  // Rail centerlines bound a 22-unit passage; generated clear tube follows that same axis.
  const dx=20,dy=70;
  sprite(ctx,'tunnel',71,315,26,Math.hypot(dx,dy)+7,-Math.atan2(dx,dy));
  for(const line of lines.slice(4,6))strip(ctx,line,'attacker-door',2);
  const inside=balls.find(b=>b.phase==='field'&&b.y>=280&&b.y<=350&&Math.abs(b.x-(61+(b.y-280)*20/70))<11);
  if(inside)light(ctx,inside.x,inside.y,9,.3);
  mouth(ctx,p.hold.x,p.hold.y,40,18);
  if(state.held)light(ctx,p.hold.x,p.hold.y+5,16,.35+(reduce.matches?0:.18*Math.sin((state.time-(state.holdUntil-1.4))*Math.PI*2)));
  // Existing flower arms use the very same endpoints for rendering and collision.
  for(const pocket of p.pockets)mouth(ctx,pocket.x,pocket.y,pocket.type==='start'?2*(pocket.captureX+p.ballRadius+2):34,pocket.type==='start'?17:14);
  for(const line of lines.slice(6,8))strip(ctx,line,'blade',4);
  for(const line of lines.slice(6,8))sprite(ctx,'hub',line.a.x,line.a.y,7,7);
  for(const line of lines.filter(s=>s.jackpotGuide)){strip(ctx,line,'blade',7);light(ctx,(line.a.x+line.b.x)/2,(line.a.y+line.b.y)/2,18,state.jackpotKind==='super'?.32:.22);}
  sprite(ctx,'blade',220,531,4,15,Math.PI);
  if(state.wingProgress>0)light(ctx,220,515,28,state.wingProgress*.45);
  // Rotation is exclusively physical. The marked tip lets viewers read its direction.
  const blades=lines.filter(s=>s.rotor);
  for(const blade of blades)strip(ctx,blade,'blade',4);
  sprite(ctx,'hub',p.rotor.x,p.rotor.y,9,9);
  if(blades[0]){ctx.fillStyle='#f1fbff';ctx.beginPath();ctx.arc(blades[0].b.x,blades[0].b.y,1.5,0,Math.PI*2);ctx.fill();}
  if(Math.abs(state.rotorOmega)>.2)light(ctx,p.rotor.x,p.rotor.y,25,Math.min(.45,Math.abs(state.rotorOmega)*.045));
  // Crystal reflector: the visible blade follows the same segment as its collider.
  // Keep the right pocket mouth unobstructed; the old large frame is intentionally omitted.
  const shutter=lines.find((s,i)=>i>=8&&!s.rotor&&s.reflector);
  if(shutter){strip(ctx,shutter,'blade',7);light(ctx,(shutter.a.x+shutter.b.x)/2,(shutter.a.y+shutter.b.y)/2,22,.22);}
  if(diagnostic)p.draw(ctx,{ink:'#235169',line:'#20a6d4'});
  ctx.restore();
 }
 root.GlassMechanismArt=Object.freeze({draw,geometry,prepare:()=>bank.prepareAll(),snapshot:()=>({loaded:Object.keys(crops).filter(k=>images[k]?.complete&&images[k]?.naturalWidth),failed:[...failed],cache:bank.snapshot(),files:Object.fromEntries(keys.map(k=>[k,new URL(k+'.png',directory).href])),crops})});
})(window);
