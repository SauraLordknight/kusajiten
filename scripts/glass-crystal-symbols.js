/* Transparent crystal sprites. Cosmetic only: no RNG, prizes or physics. */
(function(root){
  'use strict';
  const files={drop:'life-drop',flower:'crystal-flower',feather:'guardian-feather',seven:'crystal-seven',lifeWings:'life-wings'};
  const order=Object.keys(files),images={},failed=[];
  const script=document.currentScript;
  const directory=new URL('../assets/glass-girl/slot-symbols-v2/',script.src);
  for(const [key,file]of Object.entries(files)){
    const img=new Image();images[key]=img;
    img.onload=()=>document.getElementById('pachiDebugCanvas')?.dispatchEvent(new Event('pachi-debug-overlay-change'));
    img.onerror=()=>{failed.push(key);img.onload();};
    img.src=new URL(file+'.png',directory).href;
  }
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const glowDuration=state=>state?.afterDuration>0?state.afterDuration*.96:1.15;
  function animating(state,reducedMotion=reduce.matches){return !!state&&!reducedMotion&&(state.jackpotSession?.phase==='reveal'||!state.current&&state.lastAward>0&&state.clock>=state.lastSettleAt&&state.clock-state.lastSettleAt<glowDuration(state));}
  function draw(ctx,rect,state,{reducedMotion=reduce.matches}={}){
    // Display enlargement only. Keep the original LCD/physics coordinates untouched.
    rect={x:rect.x-rect.width/2,y:rect.y-rect.height/2,width:rect.width*2,height:rect.height*2};
    const faces=state?.current?.faces||state?.lastFaces||order;
    const duration=state?.current?.duration||1.2;
    const elapsed=state?.current?Math.max(0,duration-state.current.remaining):null;
    const time=state?.clock||0,cell=rect.width/3,height=rect.height*.95;
    const jackpotSpin=!!state?.current?.jackpot,reveal=state?.jackpotSession?.phase==='reveal';
    const revealTime=reveal?Math.max(0,(root.GlassPachiRuntime.config.jackpotRevealSeconds-state.jackpotRevealRemaining)):0;
    ctx.save();ctx.beginPath();ctx.rect(rect.x-cell*.15,rect.y-height*.25,rect.width+cell*.3,rect.height+height*.5);ctx.clip();
    function sprite(key,column,dy=0,alpha=1,scale=1){
      const img=images[key]||images[order[column]],cx=rect.x+cell*(column+.5),cy=rect.y+rect.height/2+dy;
      ctx.save();ctx.globalAlpha=alpha;
      if(img.complete&&img.naturalWidth){
        const h=height*scale,w=Math.min(cell*.96,height*img.naturalWidth/img.naturalHeight)*scale;
        if(key==='seven'&&(jackpotSpin||reveal)){ctx.shadowColor='#44cbff';ctx.shadowBlur=8+(scale-1)*40;}
        ctx.drawImage(img,cx-w/2,cy-h/2,w,h);
        if(key==='seven'&&(jackpotSpin||reveal)){
          const p=((time*1.25+column*.23)%1),sy=cy-h/2+p*h;
          ctx.globalCompositeOperation='source-atop';const g=ctx.createLinearGradient(0,sy-9,0,sy+9);g.addColorStop(0,'#a9eaff00');g.addColorStop(.5,'#e9fbffb0');g.addColorStop(1,'#a9eaff00');ctx.fillStyle=g;ctx.fillRect(cx-w/2,sy-9,w,18);
        }
      }else{
        ctx.fillStyle='#60bde7';ctx.font='32px serif';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText({drop:'♧',flower:'✿',feather:'❧',seven:'7',lifeWings:'✦'}[key]||'◇',cx,cy);
      }
      ctx.restore();
    }
    for(let i=0;i<3;i++){
      // Reduced motion must not reveal the sealed result before its deadline.
      if(state?.current&&reducedMotion){sprite(order[i],i);continue;}
      const stop=(root.GlassPachiRuntime?.reelStopTimes(duration,jackpotSpin)||[.72,.86,1].map(r=>duration*r))[i],settleStart=stop-Math.min(jackpotSpin?.48:.19,duration*.1);
      if(elapsed!==null&&!reducedMotion&&elapsed<settleStart){
        // Accelerate, cruise, then slow before a staggered stop. Three sprites fill each reel.
        const travel=(elapsed/.15<1?elapsed*elapsed*12: .27+(elapsed-.15)*3.6)*(1+i*.11);
        const row=Math.floor(travel),fraction=travel-row;
        for(let n=-1;n<=1;n++)sprite(order[((i+n-row)%order.length+order.length)%order.length],i,(fraction+n)*rect.height,.9);
      }else{
        const p=elapsed===null||reducedMotion?1:Math.min(1,Math.max(0,(elapsed-settleStart)/(stop-settleStart)));
        const dy=(1-p)*(1-p)*-rect.height*.68+Math.sin(p*Math.PI*2)*(1-p)*rect.height*.065;
        const pulse=animating(state,reducedMotion)?Math.sin(Math.min(1,(time-state.lastSettleAt)/glowDuration(state))*Math.PI):0;
        const sinceStop=elapsed===null?99:Math.max(0,elapsed-stop),stopPop=jackpotSpin&&elapsed>=stop?Math.sin(Math.min(1,sinceStop/.42)*Math.PI)*.2:0;
        const confirmPop=reveal&&!reducedMotion ? .1+.24*Math.exp(-revealTime*3)*Math.sin(Math.min(1,revealTime/.35)*Math.PI) : 0;
        sprite(faces[i],i,dy,1,1+pulse*.055+stopPop+confirmPop);
      }
    }
    if(reveal&&!reducedMotion){
      const p=Math.min(1,revealTime/.85);ctx.globalAlpha=(1-p)*.85;ctx.strokeStyle='#94e9ff';ctx.lineWidth=2;ctx.shadowColor='#3ebdff';ctx.shadowBlur=12;
      for(let i=0;i<3;i++){const cx=rect.x+cell*(i+.5),cy=rect.y+rect.height*.5,r=cell*(.34+p*.5);ctx.beginPath();for(let n=0;n<6;n++){const a=n*Math.PI/3-Math.PI/2,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;(n?ctx.lineTo(x,y):ctx.moveTo(x,y));}ctx.closePath();ctx.stroke();}
    }
    if(animating(state,reducedMotion)&&!reveal){
      const p=(time-state.lastSettleAt)/glowDuration(state),alpha=Math.sin(p*Math.PI)*.7;
      ctx.globalAlpha=alpha;ctx.strokeStyle='#6edfff';ctx.lineWidth=1.4;
      ctx.shadowColor='#4bbdff';ctx.shadowBlur=7;
      ctx.beginPath();ctx.moveTo(rect.x+cell*.5,rect.y+rect.height*.6);
      ctx.quadraticCurveTo(rect.x+rect.width*.5,rect.y+rect.height*(.2+.1*Math.sin(p*6)),rect.x+rect.width-cell*.5,rect.y+rect.height*.6);ctx.stroke();
      const x=rect.x+rect.width*p;
      const glow=ctx.createRadialGradient(x,rect.y+rect.height/2,0,x,rect.y+rect.height/2,rect.height*.5);
      glow.addColorStop(0,'rgba(118,221,255,.4)');glow.addColorStop(1,'rgba(118,221,255,0)');
      ctx.fillStyle=glow;ctx.fillRect(rect.x,rect.y,rect.width,rect.height);
    }
    ctx.restore();
  }
  root.GlassCrystalSymbols=Object.freeze({draw,animating,snapshot:()=>({loaded:order.filter(k=>images[k].complete&&images[k].naturalWidth),failed:[...failed],files:Object.fromEntries(order.map(k=>[k,images[k].src]))})});
})(window);
