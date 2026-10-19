/* Cosmetic only: observes committed credits, never changes balances or lottery. */
(()=>{'use strict';
 const machine=document.getElementById('pachiDebugMachine');if(!machine)return;
 const canvas=document.createElement('canvas');canvas.width=1042;canvas.height=1618;canvas.setAttribute('aria-hidden','true');canvas.className='glass-payout-flow';
 Object.assign(canvas.style,{position:'absolute',left:'-8px',top:'-8px',width:'521px',height:'809px',zIndex:'14',pointerEvents:'none'});machine.append(canvas);
 const ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)'),ballImage=new Image();ballImage.src='assets/glass-girl/reward-rush-v1/chrome-ball.png';
 let particles=[],request=0,last=0,until=0,labelUntil=0,credited=0,events=0,emitted=0,kind='',nextBall=0,pulseAt=0,cumulative=0,sessionToken='',tier='normal';
 const visible=()=>!document.hidden&&document.getElementById('pachiMachine').dataset.activeMachine==='debug'&&machine.getClientRects().length>0;
 function reset(){cancelAnimationFrame(request);request=0;particles=[];until=labelUntil=credited=events=emitted=0;last=nextBall=pulseAt=cumulative=0;sessionToken='';ctx.clearRect(0,0,canvas.width,canvas.height);}
 function frame(now){
  request=0;if(!visible()){reset();return;}
  const dt=Math.min(.05,last?(now-last)/1000:0);last=now;
  if(!reduced.matches&&now<until&&now>=nextBall){
   const count=kind==='payout'?(tier==='super'?4:3):kind==='premium'?3:kind==='win'?2:1;
   for(let i=0;i<count&&particles.length<48;i++){particles.push({age:-i*.02,life:1.55,seed:Math.random(),x:350+Math.random()*8,y:688,vx:-90-Math.random()*65,vy:35+Math.random()*20,bounces:0});emitted++;}nextBall=now+65;
  }
  ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,521,809);
  const impulse=Math.min(1,Math.max(0,1-(now-pulseAt)/650)),strong=['win','premium','payout'].includes(kind);
  if(strong&&impulse>0&&!reduced.matches){ctx.save();ctx.beginPath();ctx.roundRect(115,682,267,47,12);ctx.clip();const g=ctx.createRadialGradient(290,711,2,290,711,140);g.addColorStop(0,`rgba(100,224,255,${impulse*.45})`);g.addColorStop(.45,`rgba(15,147,247,${impulse*.22})`);g.addColorStop(1,'rgba(0,120,255,0)');ctx.fillStyle=g;ctx.fillRect(115,682,267,47);ctx.strokeStyle=`rgba(145,239,255,${impulse*.7})`;ctx.lineWidth=1.3;ctx.beginPath();ctx.ellipse(290,713,15+(1-impulse)*95,2+(1-impulse)*11,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  // Stay inside the lower physical tray, clear of the LCD, handle and controls.
  ctx.save();ctx.beginPath();ctx.roundRect(112,683,278,47,12);ctx.clip();
  for(const p of particles){p.age+=dt;if(p.age<0)continue;const t=p.age/p.life;if(t>1)continue;
   p.vy+=430*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
   if(p.y>714){p.y=714;p.vy=-Math.abs(p.vy)*.44;p.vx*=.83;p.bounces++;}
   const x=p.x,y=p.y,r=strong?4.5:3.2;ctx.globalAlpha=Math.min(1,(1-t)*5);
   ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(x,720,r*1.1,r*.28,0,0,Math.PI*2);ctx.fill();
   if(ballImage.complete&&ballImage.naturalWidth){ctx.drawImage(ballImage,x-r*1.18,y-r*1.18,r*2.36,r*2.36);}else{const g=ctx.createRadialGradient(x-1.5,y-1.7,.2,x,y,r);g.addColorStop(0,'#fff');g.addColorStop(.28,'#e6f1f8');g.addColorStop(.58,'#8fabbf');g.addColorStop(.83,'#263e52');g.addColorStop(1,'#d7edf5');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
  }ctx.restore();particles=particles.filter(p=>p.age<p.life);
  if(now<labelUntil){const age=Math.max(0,(now-pulseAt)/1000),pop=reduced.matches?1:1+.24*Math.exp(-age*7)*Math.sin(Math.min(1,age/.22)*Math.PI);ctx.save();ctx.globalAlpha=Math.min(1,(labelUntil-now)/400);ctx.translate(254,659);ctx.scale(pop,pop);ctx.font='900 23px ui-monospace,monospace';ctx.textAlign='center';ctx.lineJoin='round';ctx.lineWidth=4;ctx.strokeStyle='#071927';ctx.fillStyle='#effcff';ctx.shadowColor='#53cfff';ctx.shadowBlur=strong?8:0;const label='＋'+credited.toLocaleString('ja-JP')+' 球';ctx.strokeText(label,0,0);ctx.fillText(label,0,0);ctx.restore();
   if(kind==='payout'&&cumulative>0){ctx.save();ctx.globalAlpha=Math.min(1,(labelUntil-now)/400);ctx.font='bold 11px ui-monospace,monospace';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#061321';ctx.fillStyle='#aff1ff';const total='今回の獲得 '+cumulative.toLocaleString('ja-JP')+' 球';ctx.strokeText(total,254,637);ctx.fillText(total,254,637);ctx.restore();}
  }
  if(particles.length||now<until||now<labelUntil)request=requestAnimationFrame(frame);else last=0;
 }
 function handle(e){
  if(!['win','premium','payout','start','side'].includes(e.type)||!Number.isFinite(e.award)||e.award<=0||!visible())return;
  const now=performance.now();
  if(now>labelUntil||kind!==e.type)credited=0;credited+=e.award;events++;kind=e.type;pulseAt=now;if(e.type==='payout')cumulative+=e.award;
  // A packet reflects this credit only; never keep emitting during a stopped payout.
  until=now+(e.type==='payout'?850:e.type==='premium'?1200:e.type==='win'?650:240);labelUntil=until+650;
  if(!request){last=0;request=requestAnimationFrame(frame);}
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
 function update(s,key){const token=s.jackpotSession?key+':'+s.jackpotSession.id:'';if(token!==sessionToken){sessionToken=token;cumulative=token?Math.max(0,s.jackpotTotal-s.pending):0;}tier=s.jackpotSession?.kind||'normal';}
 window.GlassPayoutVisual=Object.freeze({handle,update,reset,snapshot:()=>({credited,cumulative,events,emitted,particles:particles.length,active:!!request,kind,tier,textureReady:ballImage.complete&&ballImage.naturalWidth>0})});
})();
