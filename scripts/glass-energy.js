/* Original raster emission layers. Only segment opacity animates; physics is untouched. */
(()=>{
 'use strict';
 const machine=document.getElementById('pachiDebugMachine');if(!machine)return;
 let enabled=true,previewUntil=0,previewTimer=0,visible=false;
 const ns='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(ns,'svg');svg.classList.add('glass-energy');svg.setAttribute('viewBox','0 0 521 809');svg.setAttribute('aria-hidden','true');
 const base='assets/glass-girl/cabinet-v1/';
 const image=`<image href="${base}blue-life-layer-v2.png" width="521" height="809" preserveAspectRatio="none"/>`;
 const segmentCount=matchMedia('(pointer:coarse)').matches?8:24;let clips='',segments='';
 // Fixed wedges never move. The original veins emerge along the frame as opacity rises.
 for(let i=0;i<segmentCount;i++){
  const theta=Math.PI/2+i*Math.PI*2/segmentCount,end=theta+Math.PI*2/segmentCount;
  const p=a=>`${260.5+1200*Math.cos(a)},${365+1200*Math.sin(a)}`;
  clips+=`<clipPath id="glass-led-${i}"><polygon points="260.5,365 ${p(theta)} ${p(end)}"/></clipPath>`;
  segments+=`<g clip-path="url(#glass-led-${i})"><g class="glass-energy-flow" style="--led-phase:${i*.026}">${segmentCount===24?`<g class="glass-energy-halo" filter="url(#glass-soft-halo)">${image}</g>`:''}${image}</g></g>`;
 }
 svg.innerHTML=`<defs><filter id="glass-soft-halo" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.2"/></filter>${clips}</defs>${segments}`;
 const dark=document.createElement('img');dark.className='glass-energy-dark-base';dark.alt='';
 let assetsReady=false;
 const controls=document.createElement('div');controls.className='glass-energy-controls';
 const toggle=document.createElement('button');toggle.id='glassEnergyToggle';toggle.type='button';
 const preview=document.createElement('button');preview.id='glassEnergyPreview';preview.type='button';preview.textContent='大当たり点灯テスト';preview.title='光だけを約4秒確認します。抽選・賞球は変わりません。';
 controls.append(toggle,preview);
 const update=()=>{
  const ready=machine.classList.contains('has-continuous-skin')&&assetsReady;
  // Reuse the same image/compositing surface at every scale; a second full-frame
  // surface causes a lower-resolution raster on mobile during SVG blending.
  const frame=machine.querySelector('.pdm-art-whole'),file=enabled&&ready?'frame-unlit-v2.png':'frame-atlas.png';
  if(frame&&!frame.src.endsWith(file))frame.src=base+file;
  machine.classList.toggle('energy-enabled',enabled&&ready);
  machine.classList.toggle('energy-firing',machine.dataset.energyFiring==='true');
  machine.classList.toggle('energy-jackpot',machine.dataset.energyJackpot==='true'||performance.now()<previewUntil);
  machine.classList.toggle('energy-paused',!enabled||document.hidden||machine.hidden||!visible||machine.dataset.scrolling==='true');
  toggle.textContent=enabled?'青い光 ON':'青い光 OFF';toggle.setAttribute('aria-pressed',String(enabled));preview.disabled=!enabled||!ready;
 };
 toggle.addEventListener('click',()=>{enabled=!enabled;previewUntil=0;clearTimeout(previewTimer);try{localStorage.setItem(key,enabled?'on':'off');}catch{}update();});
 preview.addEventListener('click',()=>{if(!enabled)return;previewUntil=performance.now()+4000;clearTimeout(previewTimer);update();previewTimer=setTimeout(update,4050);});
 const attach=()=>{if(!machine.classList.contains('has-continuous-skin'))return;loadEnergy();const art=machine.querySelector('.pdm-cabinet-art');if(art&&!svg.isConnected)art.append(svg);update();};
 machine.addEventListener('glass-cabinet-ready',attach);
 new MutationObserver(update).observe(machine,{attributes:true,attributeFilter:['data-energy-firing','data-energy-jackpot','data-scrolling','hidden']});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update();}).observe(machine);
 document.addEventListener('visibilitychange',update);attach();
 let energyLoading=false;function loadEnergy(){if(energyLoading)return;energyLoading=true;dark.src=base+'frame-unlit-v2.png';Promise.all([dark.decode(),new Promise((resolve,reject)=>{const im=new Image();im.onload=resolve;im.onerror=reject;im.src=base+'blue-life-layer-v2.png';})]).then(()=>{assetsReady=true;machine.dataset.energyMaterial='original-pixels-v2';update();}).catch(()=>{toggle.title='光の素材を読み込めませんでした。元画像を維持しています。';preview.disabled=true;});}

})();
