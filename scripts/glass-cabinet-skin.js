/* One continuous raster frame. Display projection only; physics remains 440×570. */
(()=>{
 const machine=document.getElementById('pachiDebugMachine');if(!machine)return;
 const base='assets/glass-girl/cabinet-v1/';
 const layout=Object.freeze({cabinet:{width:521,height:809},board:{x:102.1,y:128,width:316.8,height:410.4},lcd:Object.freeze({x:80,y:118,width:360,height:430}),handle:{x:449,y:614.4,size:104},push:{x:449,y:521.5,size:68}});
 for(const [name,value] of Object.entries(layout.lcd))machine.style.setProperty('--glass-lcd-'+name,value+'px');
 const backdrop=document.createElement('div');backdrop.className='pdm-cabinet-interior';backdrop.setAttribute('aria-hidden','true');machine.prepend(backdrop);
 const art=document.createElement('div');art.className='pdm-cabinet-art';art.setAttribute('aria-hidden','true');
 const frame=document.createElement('img');frame.className='pdm-art-whole';frame.dataset.part='continuous-frame';frame.src=base+'frame-atlas.png';frame.alt='';art.append(frame);machine.prepend(art);
 const sx=layout.board.width/451,sy=layout.board.height/499;
 machine.style.setProperty('--glass-board-x',(layout.board.x-8-15*sx)+'px');
 machine.style.setProperty('--glass-board-y',(layout.board.y-8-27*sy)+'px');
 machine.style.setProperty('--glass-board-sx',sx);machine.style.setProperty('--glass-board-sy',sy);
 const handle=machine.querySelector('.pdm-handle'),fire=document.getElementById('pdmFire'),push=document.getElementById('pdmPush');
 for(const node of [handle,fire])Object.assign(node.style,{left:(layout.handle.x-layout.handle.size/2-8)+'px',top:(layout.handle.y-layout.handle.size/2-8)+'px',width:layout.handle.size+'px',height:layout.handle.size+'px'});
 Object.assign(push.style,{left:(layout.push.x-layout.push.size/2-8)+'px',top:(layout.push.y-layout.push.size/2-8)+'px'});
 const loads=['frame-atlas.png','handle.png','push.png'].map(file=>new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=reject;img.src=base+file;}));
 Promise.all(loads).then(()=>{machine.classList.add('has-raster-skin','has-continuous-skin');machine.dataset.skin='glass-v2';machine.dispatchEvent(new Event('glass-cabinet-ready'));document.getElementById('pachiDebugCanvas').dispatchEvent(new Event('pachi-debug-overlay-change'));}).catch(()=>{machine.dataset.skin='load-error';});
 const power=document.getElementById('pdmPower');
 const update=()=>machine.style.setProperty('--glass-power-angle',`${(Number(power.value)-65)*.7}deg`);
 power.addEventListener('input',update);update();
 window.GlassCabinetLayout=layout;
})();
