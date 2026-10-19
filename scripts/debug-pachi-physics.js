(function(root) {
  'use strict';
  const exitAngle=30*Math.PI/180;
  // 旧版の出口高さ・接線・速度を復元。隠れた通路だけ左へ広げる。
  const oldTipY=110-76*Math.cos(exitAngle);
  const hiddenRadius=180,hiddenCenterX=136,hiddenCurveY=oldTipY+hiddenRadius*Math.cos(exitAngle);
  const launch = Object.freeze({
    baseX:-44,startY:536,curveStartY:hiddenCurveY,centerX:hiddenCenterX,radius:hiddenRadius,railGap:12,exitAngle,
    tipX:46,tipY:oldTipY
  });
  const straight = launch.startY-launch.curveStartY;
  const length = straight+launch.radius*(Math.PI/2-exitAngle);
  const gravity=750, ballRadius=6, pegRadius=2;
  // 試験役物はこの台だけが所有する。賞球・大当たり抽選は変更しない。
  const initial={time:0,repair:0,wingUntil:0,wingProgress:0,held:null,holdUntil:0,jackpot:false,jackpotRequested:false,jackpotKind:null,jackpotKindRequested:null,attackerHits:0,cycles:0,rotorAngle:.2,rotorOmega:0,rotorHits:0,reflectorAngle:-.18,reflectorOmega:0,reflectorHits:0,warps:0,holds:0,exitFlash:0};
  const state={...initial};
  const rotor={x:366,y:330,radius:24,inertia:240};
  const warp={entry:{x:220,y:190},exit:{x:354,y:242},delay:.32};
  const hold={x:81,y:380};
  // One source of truth for the visible mouth and physical flower hinges.
  const startGate=Object.freeze({x:220,y:510,captureX:28,radius:32,left:184,right:256,opening:17});
  // 外枠の開口から逆算した遊技領域。底辺中央だけ排出口として開放する。
  const boundary=[[28,24],[105,16],[180,24],[220,40],[260,32],[335,24],[412,44],[434,82],[434,365],[424,405],[400,440],[365,480],[310,520],[275,542],[165,542],[130,520],[75,480],[40,440],[16,405],[-12,365],[-12,100]].map(([x,y])=>({x,y}));
  const attacker={x:300,y:425,width:64,height:20};
  const jackpotAttacker=Object.freeze({x:220,y:512,width:286,height:22});
  const activeAttacker=()=>state.jackpot?jackpotAttacker:attacker;
  const reserves=[[180,164,260,212],[330,226,396,369],[40,240,112,407],[176,482,264,530]];
  function repair(n){if(state.time<state.wingUntil)return;state.repair=Math.min(100,state.repair+n);if(state.repair===100){state.wingUntil=state.time+3;state.repair=0;state.cycles++;}}
  function segments(){
    const progress=state.wingProgress;
    const lines=[{a:{x:184,y:170},b:{x:197,y:188},r:2},{a:{x:256,y:170},b:{x:243,y:188},r:2},
      {a:{x:40,y:260},b:{x:50,y:280},r:2},{a:{x:100,y:250},b:{x:72,y:280},r:2},
      {a:{x:50,y:280},b:{x:70,y:350},r:2},{a:{x:72,y:280},b:{x:92,y:350},r:2},
      {a:{x:startGate.left,y:510},b:{x:startGate.left-startGate.opening*progress,y:487+8*progress},r:2},
      {a:{x:startGate.right,y:510},b:{x:startGate.right+startGate.opening*progress,y:487+8*progress},r:2}];
    // 右入賞口の真上を塞がない短い結晶リフレクター。球が当たると微回転する。
    if(state.jackpot){
      const wide=false; // Both jackpot tiers share the approved normal-jackpot layout.
      lines.push({a:{x:wide?42:72,y:wide?286:326},b:{x:wide?174:184,y:wide?438:452},r:3,jackpotGuide:true});
      lines.push({a:{x:wide?398:368,y:wide?286:326},b:{x:wide?266:256,y:wide?438:452},r:3,jackpotGuide:true});
      lines.push({a:{x:wide?112:138,y:wide?410:426},b:{x:wide?190:196,y:wide?468:478},r:3,jackpotGuide:true});
      lines.push({a:{x:wide?328:302,y:wide?410:426},b:{x:wide?250:244,y:wide?468:478},r:3,jackpotGuide:true});
      return lines;
    }
    const rcx=282,rcy=404,half=27,ra=state.reflectorAngle;
    lines.push({a:{x:rcx-half*Math.cos(ra),y:rcy-half*Math.sin(ra)},b:{x:rcx+half*Math.cos(ra),y:rcy+half*Math.sin(ra)},r:2,reflector:true});
    for(let i=0;i<3;i++){const a=state.rotorAngle+i*Math.PI*2/3;lines.push({a:{x:rotor.x,y:rotor.y},b:{x:rotor.x+rotor.radius*Math.cos(a),y:rotor.y+rotor.radius*Math.sin(a)},r:2,rotor:true});}
    return lines;
  }
  function collideMechanisms(ball){let impact=0;for(const s of segments()){
    const q=nearest(ball,s.a,s.b),radius=ball.r+s.r;if(q.d>=radius)continue;
    const nx=q.d>1e-8?(ball.x-q.x)/q.d:0,ny=q.d>1e-8?(ball.y-q.y)/q.d:-1;
    const rx=q.x-rotor.x,ry=q.y-rotor.y;
    const ux=s.rotor?-state.rotorOmega*ry:0,uy=s.rotor?state.rotorOmega*rx:0;
    ball.x=q.x+nx*(radius+.001);ball.y=q.y+ny*(radius+.001);
    if(s.rotor){
      ball.contact=true;const relative=(ball.vx-ux)*nx+(ball.vy-uy)*ny;
      if(relative<0){const lever=rx*ny-ry*nx,j=-(1+.35)*relative/(1+lever*lever/rotor.inertia);
        ball.vx+=j*nx;ball.vy+=j*ny;state.rotorOmega-=lever*j/rotor.inertia;state.rotorHits++;impact=Math.max(impact,-relative);}
    }else{ball.vx-=ux;ball.vy-=uy;impact=Math.max(impact,reflect(ball,nx,ny,.25));ball.vx+=ux;ball.vy+=uy;
      if(s.reflector&&impact>.01){const rx=q.x-282,ry=q.y-404;const lever=rx*ny-ry*nx;state.reflectorOmega+=Math.max(-2.4,Math.min(2.4,lever*.012));state.reflectorHits++;}
    }
  }return impact;}
  function tick(dt,balls){
    const next=state.time+dt;
    // 閉じる範囲に球がある間は開放を延長し、閉鎖による押し出しを防ぐ。
    const occupied=balls.some(b=>b.phase==='field'&&((b.x>startGate.left-startGate.opening-ballRadius-2&&b.x<startGate.left+ballRadius+2)||(b.x>startGate.right-ballRadius-2&&b.x<startGate.right+startGate.opening+ballRadius+2))&&b.y>479&&b.y<528);
    if(state.wingUntil>state.time&&state.wingUntil<=next&&occupied)state.wingUntil=next+.1;
    if(!occupied){const target=next<state.wingUntil?1:0;state.wingProgress+=Math.sign(target-state.wingProgress)*Math.min(Math.abs(target-state.wingProgress),dt/0.4);}
    const prizeFieldOccupied=balls.some(b=>b.phase==='field'&&b.x>120&&b.x<360&&b.y>275&&b.y<505);
    if(state.jackpot===state.jackpotRequested||!prizeFieldOccupied){
      state.jackpot=state.jackpotRequested;
      state.jackpotKind=state.jackpot?state.jackpotKindRequested:null;
    }
    state.time=next;
    state.rotorAngle=(state.rotorAngle+state.rotorOmega*dt)%(Math.PI*2);state.rotorOmega*=Math.exp(-1.6*dt);
    state.reflectorAngle+=state.reflectorOmega*dt;state.reflectorOmega*=Math.exp(-5.2*dt);state.reflectorAngle=Math.max(-.42,Math.min(.42,state.reflectorAngle));
  }
  function reset(){Object.assign(state,initial);}
  function draw(ctx,palette={}){
    const ink=palette.ink||'#dbfaff';
    ctx.save();ctx.lineWidth=4;ctx.strokeStyle=palette.line||'#9eeeff';
    for(const s of segments()){ctx.beginPath();ctx.moveTo(s.a.x,s.a.y);ctx.lineTo(s.b.x,s.b.y);ctx.stroke();}
    ctx.fillStyle='rgba(145,230,255,.13)';ctx.beginPath();ctx.moveTo(52,280);ctx.lineTo(70,280);ctx.lineTo(90,350);ctx.lineTo(72,350);ctx.closePath();ctx.fill();
    ctx.lineWidth=2;ctx.beginPath();ctx.arc(hold.x,hold.y,14,0,Math.PI);ctx.stroke();
    for(const [label,p]of [['IN',warp.entry],['OUT',warp.exit]]){ctx.strokeStyle=state.time<state.exitFlash?'#fff':(palette.line||'#85bcff');ctx.beginPath();ctx.ellipse(p.x,p.y,21,8,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle=ink;ctx.font='9px monospace';ctx.textAlign='center';ctx.fillText(label,p.x,p.y-12);}
    ctx.setLineDash([3,3]);ctx.strokeRect(258,410,84,30);ctx.setLineDash([]);
    ctx.fillStyle=ink;ctx.font='9px monospace';ctx.textAlign='center';ctx.fillText('HOLD',hold.x,hold.y-17);ctx.fillText('ATTACKER '+state.attackerHits,300,404);
    ctx.fillText('BARRIER '+state.repair+'/100',220,365);
    ctx.restore();
  }
  const lcd={x:128,y:238,width:184,height:84};
  // LCD is behind the transparent playing board, never a physical obstacle.
  const body=[];
  const guides=[];
  // 受け板削除後も釘の位置を保つための配置余白。衝突判定には使用しない。
  const pegLayoutClearances=[];
  const pockets=[{x:81,y:460,r:13,captureX:8,captureY:12,type:'side'},
    {x:324,y:465,r:13,captureX:8,captureY:12,type:'side'},
    {x:startGate.x,y:startGate.y,r:startGate.radius,captureX:startGate.captureX,captureY:12,type:'start'}];
  const jackpotPockets=Object.freeze({
    normal:Object.freeze([{x:92,y:472,r:16,captureX:14,captureY:16,type:'side'},{x:348,y:472,r:16,captureX:14,captureY:16,type:'side'},{x:220,y:495,r:38,captureX:38,captureY:18,type:'start'}]),
  });
  const activePockets=()=>state.jackpot?jackpotPockets.normal:pockets;
  function point(s) {
    if(s<=straight)return {x:launch.baseX,y:launch.startY-s,tx:0,ty:-1};
    const a=Math.PI+Math.min(Math.PI/2-exitAngle,(s-straight)/launch.radius);
    return {x:launch.centerX+launch.radius*Math.cos(a),y:launch.curveStartY+launch.radius*Math.sin(a),tx:-Math.sin(a),ty:Math.cos(a)};
  }
  function railPoint(s) {
    const p=point(s);
    return {x:p.x-p.ty*launch.railGap,y:p.y+p.tx*launch.railGap};
  }
  // 隠れた通路の左上出口から右斜め上30度。50%時は中央上部(214,95)へ下降。
  // 天釘の衝突面と下部への分布も含めた比較計算で選んだ落下地点。
  const targetDx=214-launch.tipX,targetDy=95-launch.tipY;
  const centerSpeed=Math.sqrt(gravity*targetDx*targetDx/
    (2*Math.cos(exitAngle)**2*(targetDy+targetDx*Math.tan(exitAngle))));
  function muzzle(power){return centerSpeed+(power-.5)*180;}
  function launchSpeed(power,s,factor=1){
    // 重力による位置エネルギーの増加だけで減速。出口で速度を交換しない。
    const p=point(s);
    return Math.sqrt((muzzle(power)*factor)**2+2*gravity*Math.max(0,p.y-launch.tipY));
  }
  function nearest(p,a,b){
    const dx=b.x-a.x,dy=b.y-a.y;
    const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));
    const x=a.x+dx*t,y=a.y+dy*t;
    return {x,y,d:Math.hypot(p.x-x,p.y-y)};
  }
  function bodyDistance(){return Infinity;}
  function inside(){return false;}
  const pegs=[];
  function peg(x,y){
    const p={x,y,r:pegRadius};
    if(!withinBoundary(p)||boundary.some((a,i)=>nearest(p,a,boundary[(i+1)%boundary.length]).d<14))return;
    if(x>252&&x<348&&y>395&&y<455)return;
    if(reserves.some(([l,t,r,b])=>Math.hypot(Math.max(l-x,0,x-r),Math.max(t-y,0,y-b))<8))return;
    if(Math.hypot(x-rotor.x,y-rotor.y)<36)return;
    if(pegLayoutClearances.some(g=>nearest(p,{x:g.x1,y:g.y1},{x:g.x2,y:g.y2}).d<20))return;
    if(pegs.some(q=>Math.hypot(x-q.x,y-q.y)<24))return;
    if(pockets.some(q=>Math.hypot(x-q.x,y-q.y)<27))return;
    pegs.push(p);
  }
  // 天釘を千鳥三段にし、液晶屋根手前までで左右へ分岐させる。
  for(let row=0;row<3;row++)for(let x=112+(row%2)*16;x<=368;x+=32)peg(x,102+row*32);
  // 旧レールの跡を分流に使う。隠れた通路は遊技領域の衝突物にしない。
  [[46,132],[70,156],[38,190],[24,235],[24,285],[24,325],[28,365]].forEach(p=>peg(...p));
  // 上部から入口・左トンネル・右回転へ。液晶縮小で空いた下部は千鳥の分流域。
  [[60,205],[96,220],[58,247],[88,256],[350,204],[390,218],[412,260],
   [52,414],[146,374],[182,366],[220,382],[258,366],[294,374],
   [154,408],[190,418],[250,418],[286,408],[358,405],[400,398],
   [144,445],[174,456],[202,448],[238,448],[266,456],[294,445],[374,453],
   [140,490],[300,490],[62,495],[398,492]].forEach(p=>peg(...p));
  // 右回転役物から右入賞口へ向かう誘導レーン。入口の半径27以内は空ける。
  // 既存の役物・大当たり領域を避け、24以上のピッチで自然な千鳥配置にする。
  [[330,378],[378,382],[318,392],[366,414],[344,436],[378,438],[386,466],
   [382,500]].forEach(p=>peg(...p));
  // Reclaim the LCD area: 32-unit staggered rows, no invisible display reserve.
  for(let row=0;row<5;row++)for(let x=136+(row%2)*16;x<=304;x+=32)peg(x,218+row*32);
  // Dedicated prize fields. Their wide staggered funnels leave no trapping
  // gaps and converge on the enlarged centre entrance.
  const normalPegs=[
    [92,108],[152,100],[212,108],[272,100],[332,108],
    [72,172],[132,164],[192,172],[252,164],[312,172],[372,164],
    [84,238],[148,230],[212,238],[276,230],[340,238],
    [68,306],[118,326],[322,326],[372,306],
    [112,382],[148,414],[292,414],[328,382]
  ].map(([x,y])=>({x,y,r:pegRadius}));
  const activePegs=()=>state.jackpot?normalPegs:pegs;
  const posts=pockets.filter(p=>p.type!=='start').flatMap(p=>[{x:p.x-16,y:p.y-5,r:3},{x:p.x+16,y:p.y-5,r:3}]).filter(p=>boundary.every((a,i)=>nearest(p,a,boundary[(i+1)%boundary.length]).d>22));
  function reflect(ball,nx,ny,restitution){
    ball.contact=true;
    const v=ball.vx*nx+ball.vy*ny;
    if(v>=0)return 0;
    ball.vx-=(1+restitution)*v*nx;ball.vy-=(1+restitution)*v*ny;
    // 接線摩擦は減速のみ。乱数や停止球への追加エネルギーは与えない。
    const tangent=-ball.vx*ny+ball.vy*nx;
    ball.vx+=.018*tangent*ny;ball.vy-=.018*tangent*nx;
    return -v;
  }
  function circle(ball,p){
    const dx=ball.x-p.x,dy=ball.y-p.y,d=Math.hypot(dx,dy),r=ball.r+p.r;
    if(d>=r)return 0;
    const nx=d>1e-8?dx/d:0,ny=d>1e-8?dy/d:-1;
    ball.x=p.x+nx*(r+.001);ball.y=p.y+ny*(r+.001);
    return reflect(ball,nx,ny,.58);
  }
  const rail=[];
  for(let s=6;s<length;s+=2)rail.push(railPoint(s));rail.push(railPoint(length));
  function withinBoundary(p){let inside=false;for(let i=0,j=boundary.length-1;i<boundary.length;j=i++){const a=boundary[i],b=boundary[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
  function collideBoundary(ball){
    if(ball.y>=542&&ball.x>159&&ball.x<281)return 0;
    let closest=null,edge=null;
    boundary.forEach((a,i)=>{const b=boundary[(i+1)%boundary.length];if(a.y===542&&b.y===542)return;const q=nearest(ball,a,b);if(!closest||q.d<closest.d){closest=q;edge={a,b};}});
    const inside=withinBoundary(ball);if(inside&&closest.d>=ball.r)return 0;
    const dx=edge.b.x-edge.a.x,dy=edge.b.y-edge.a.y,l=Math.hypot(dx,dy);
    const nx=-dy/l,ny=dx/l;
    ball.x=closest.x+nx*(ball.r+.001);ball.y=closest.y+ny*(ball.r+.001);
    return reflect(ball,nx,ny,.35);
  }
  function advance(ball,dt,others=[]){
    let impact=0;
    ball.contact=false;
    // 高速球でも釘を飛び越さないよう、描画fpsと独立した最大240Hzで更新。
    for(let time=dt;time>1e-9;){
      let h=Math.min(time,1/240);time-=h;
      ball.age+=h;
      if(ball.phase==='warp'){
        if(state.time<ball.warpUntil||others.some(b=>b!==ball&&b.phase==='field'&&Math.hypot(b.x-warp.exit.x,b.y-warp.exit.y)<18))continue;
        ball.phase='field';ball.x=warp.exit.x;ball.y=warp.exit.y;ball.vx=35;ball.vy=90;state.exitFlash=state.time+.2;continue;
      }
      if(ball.phase==='held'){
        if(state.time<state.holdUntil){ball.x=hold.x;ball.y=hold.y;ball.vx=ball.vy=0;continue;}
        state.held=null;ball.phase='field';ball.vx=ball.vy=0;
      }
      if(ball.phase==='chute'){
        const s=ball.launchDistance||0;
        const factor=ball.launchFactor||1;
        const speed=launchSpeed(ball.power,s,factor);
        const midpoint=Math.min(length,s+speed*h*.5);
        const ds=launchSpeed(ball.power,midpoint,factor)*h;
        const remaining=length-s;
        if(ds<remaining){ball.launchDistance=s+ds;const p=point(s+ds),v=launchSpeed(ball.power,s+ds,factor);ball.x=p.x;ball.y=p.y;ball.vx=p.tx*v;ball.vy=p.ty*v;continue;}
        // 出口を越える時間も残して進める。座標の巻き戻しや一時停止は起こさない。
        h*=Math.max(0,1-remaining/ds);
        ball.launchDistance=length;const p=point(length),v=launchSpeed(ball.power,length,factor);
        ball.x=p.x;ball.y=p.y;ball.vx=p.tx*v;ball.vy=p.ty*v;ball.phase='field';
      }
      const oldY=ball.y;
      ball.x+=ball.vx*h;ball.y+=ball.vy*h+gravity*h*h*.5;
      ball.vy+=gravity*h;
      const drag=Math.exp(-.025*h);ball.vx*=drag;ball.vy*=drag;
      if(ball.x<ball.r){ball.x=ball.r;impact=Math.max(impact,reflect(ball,1,0,.4));}
      if(ball.x>440-ball.r){ball.x=440-ball.r;impact=Math.max(impact,reflect(ball,-1,0,.4));}
      if(ball.y<ball.r){ball.y=ball.r;impact=Math.max(impact,reflect(ball,0,1,.4));}
      impact=Math.max(impact,collideBoundary(ball));
      impact=Math.max(impact,collideMechanisms(ball));
      if(ball.vy>0&&oldY<=warp.entry.y&&ball.y>=warp.entry.y&&Math.abs(ball.x-warp.entry.x)<13&&!ball.gateSeen){ball.gateSeen=true;state.warps++;repair(8);ball.phase='warp';ball.warpUntil=state.time+warp.delay;ball.vx=ball.vy=0;continue;}
      if(!state.held&&!ball.holdSeen&&ball.vy>0&&oldY<=hold.y&&ball.y>=hold.y&&Math.abs(ball.x-hold.x)<12){ball.holdSeen=true;state.held=ball;state.holdUntil=state.time+1.4;state.holds++;ball.phase='held';ball.x=hold.x;ball.y=hold.y;ball.vx=ball.vy=0;repair(20);continue;}
      const prizeAttacker=activeAttacker();
      if(state.jackpot&&ball.vy>0&&oldY<=prizeAttacker.y&&ball.y>=prizeAttacker.y&&Math.abs(ball.x-prizeAttacker.x)<prizeAttacker.width/2){state.attackerHits++;return {type:'attacker',impact};}
      for(const p of activePegs())if(Math.abs(ball.x-p.x)<8.1&&Math.abs(ball.y-p.y)<8.1)impact=Math.max(impact,circle(ball,p));
      for(const p of posts)impact=Math.max(impact,circle(ball,p));
      // 開口を下向きに横切った球だけ入賞。周囲から触れただけで吸い込まない。
      if(ball.vy>0)for(const p of activePockets())if(oldY<=p.y&&ball.y>=p.y&&Math.abs(ball.x-p.x)<p.captureX){repair(p.type==='start'?15:10);return {type:p.type,impact};}
      if(ball.y>550+ball.r)return {type:'out',impact};
      if(ball.age>20)return {type:'out',impact,timeout:true};
    }
    return {impact,contact:ball.contact};
  }
  function advanceMany(balls,dt){
    const results=new Map(balls.map(b=>[b,{impact:0}]));
    for(let time=dt;time>1e-9;){
      const h=Math.min(time,1/240);time-=h;
      tick(h,balls);
      for(const b of balls){
        const total=results.get(b);if(total.type)continue;
        const result=advance(b,h,balls);total.impact=Math.max(total.impact,result.impact);
        if(result.type){total.type=result.type;total.timeout=result.timeout;}
      }
      for(let i=0;i<balls.length;i++){
        const a=balls[i];if(!['field','held'].includes(a.phase)||results.get(a).type)continue;
        for(let j=i+1;j<balls.length;j++){
          const b=balls[j];if(!['field','held'].includes(b.phase)||results.get(b).type)continue;
          if(a.phase==='held'&&b.phase==='held')continue;
          const dx=b.x-a.x,dy=b.y-a.y,r=a.r+b.r,d=Math.hypot(dx,dy);
          if(d>=r)continue;
          const nx=d>1e-8?dx/d:1,ny=d>1e-8?dy/d:0;
          const overlap=(r-d+.001)*.5;
          if(a.phase==='held'||b.phase==='held'){const held=a.phase==='held'?a:b,moving=held===a?b:a,sign=held===a?1:-1;moving.x=held.x+sign*nx*(r+.001);moving.y=held.y+sign*ny*(r+.001);reflect(moving,sign*nx,sign*ny,.25);continue;}
          a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap;
          const approach=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
          if(approach<0){
            const impulse=-(1+.45)*approach*.5;
            a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;
            results.get(a).impact=Math.max(results.get(a).impact,-approach);
          }
        }
      }
    }
    return results;
  }
  const api=Object.freeze({launch,point,rail,length,gravity,ballRadius,pegRadius,get pegs(){return activePegs();},get pockets(){return activePockets();},startGate,posts,body,guides,lcd,boundary,get attacker(){return activeAttacker();},muzzle,launchSpeed,advance,advanceMany,bodyDistance,inside,state,repair,reset,draw,segments,rotor,warp,hold,setJackpot:(active,kind='normal')=>{state.jackpotRequested=!!active;state.jackpotKindRequested=active&&kind==='super'?'super':active?'normal':null;}});
  root.DebugPachiPhysics=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
