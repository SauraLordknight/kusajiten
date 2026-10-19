/* Independent CC0 sample bank. No lottery, physics, profile or prize writes. */
(()=>{
 'use strict';const bank=window.GlassSoundBank,machine=document.getElementById('pachiDebugMachine');if(!bank||!machine)return;
 let context=null,master=null,output=null,loading=null,ready=false,enabled=true,sequence=0,played=0,dropped=0,error='';const buffers={},voices=new Set(),last=new Map(),counts={};
 document.addEventListener('glass-volume-change',()=>{if(output)output.gain.value=window.GlassVolume?.sfx??1;});
 try{enabled=localStorage.getItem('glassGirlGameSoundV1')!=='off';}catch{}
 const visible=()=>document.getElementById('pachiMachine').dataset.activeMachine==='debug'&&!document.hidden&&!document.getElementById('pachiPanel').hidden&&!document.getElementById('pachiGame').hidden;
 function load(){if(loading)return loading;try{context||=new(window.AudioContext||window.webkitAudioContext)();loading=Promise.all(Object.entries(bank).map(async([key,item])=>{const bytes=Uint8Array.from(atob(item.data),c=>c.charCodeAt(0));buffers[key]=await context.decodeAudioData(bytes.buffer);})).then(()=>{ready=true;}).catch(e=>{error=e.message;});}catch(e){error=e.message;loading=Promise.resolve();}return loading;}
 function unlock(){if(!enabled||!visible())return;load();context?.resume().catch(e=>{error=e.name;});}
 function stop(){for(const voice of voices)try{voice.source.stop();}catch{}voices.clear();}
 const volumes={launch:.1,pegA:.07,pegB:.07,mechanism:.08,queue:.02,queueFull:.08,spinStart:.28,spinLoop:.2,reelStop:.32,miss:.025,drain:.025,repair:.06,rotor:.15,start:.3,side:.16,win:.38,premium:.42,repairComplete:.32,payout:.1,jackpotFinish:.3,warpIn:.24,warpOut:.24,magicDeep:.4,magicClear:.4,magicBarrier:.4};
 const gaps={launch:.14,peg:.09,mechanism:.12,spinLoop:.4,repair:.24,rotor:.18,payout:.25,queueFull:.5,drain:.2};
 function play(name,{impact=120,x=220,preview=false,award}={}){
  if(!enabled||!visible()||(!preview&&machine.classList.contains('glass-transition-active')))return false;
  const group=name==='peg'?'peg':name,now=performance.now()/1000,gap=preview?0:(gaps[group]||.075);
  if(now-(last.get(group)??-1e9)<gap){dropped++;return false;}
  if(name==='peg')name=['pegA','pegB','pegC'][sequence++%3];if(!bank[name])return false;
  if(!ready){const requestAt=performance.now();load().then(()=>{if(ready&&performance.now()-requestAt<180)play(name,{impact,x,preview,award});});return false;}
  context.resume().catch(()=>{});
  const low=['pegA','pegB','pegC','mechanism','launch','drain','repair','queue'].includes(name),slot=['spinStart','spinLoop','reelStop'].includes(name);
  // Let samples finish naturally; overlapping reel/win sounds never steal voices.
  if(voices.size>=64){dropped++;return false;}
  last.set(group,now);const source=context.createBufferSource(),gain=context.createGain(),pan=context.createStereoPanner();source.buffer=buffers[name];
  const physical=['pegA','pegB','pegC','mechanism'].includes(name);
  if(physical)source.playbackRate.value=1.02+(sequence%7)*.13/7;else if(name==='launch')source.playbackRate.value=1.05;
  gain.gain.value=physical?(preview?.08:Math.min(.12,.03+impact/2600)):name==='launch'?.19:(volumes[name]||.2)*(preview?1:low?Math.max(.25,Math.min(1.2,impact/220)):1)*(name==='win'&&award?Math.min(1.15,.85+award/1200):1);
  if(name==='win')gain.gain.value=1;else gain.gain.value*=2;
  if(['pegA','pegB','pegC'].includes(name))gain.gain.value*=.85;
  if(!master){master=context.createDynamicsCompressor();master.threshold.value=-12;master.knee.value=12;master.ratio.value=4;master.attack.value=.003;master.release.value=.2;output=context.createGain();output.gain.value=window.GlassVolume?.sfx??1;master.connect(output).connect(context.destination);}
  pan.pan.value=preview?0:Math.max(-.65,Math.min(.65,(x-220)/340));source.connect(gain).connect(pan).connect(master);
  const voice={source,name};voices.add(voice);source.onended=()=>{voices.delete(voice);source.disconnect();gain.disconnect();pan.disconnect();};source.start();played++;counts[name]=(counts[name]||0)+1;return true;
 }
 const section=document.querySelector('.glass-experiment-settings'),toggle=document.createElement('button'),audition=document.createElement('button');toggle.type=audition.type='button';toggle.id='glassGameSoundToggle';audition.id='glassGameSoundAudition';audition.textContent='効果音を試聴';
 function labels(){toggle.textContent=enabled?'遊技効果音 ON':'遊技効果音 OFF';toggle.setAttribute('aria-pressed',String(enabled));}
 toggle.onclick=()=>{enabled=!enabled;try{localStorage.setItem('glassGirlGameSoundV1',enabled?'on':'off');}catch{}if(!enabled)stop();else unlock();labels();};section?.append(toggle,audition);labels();
 const dialog=document.createElement('dialog');dialog.className='glass-sfx-dialog';dialog.innerHTML='<h3>ガラスの少女：効果音の試聴</h3><p>音だけを再生します。抽選・持ち球は変わりません。遊技効果音をONにして確認してください。</p><div class="glass-sfx-list"></div><button type="button" class="glass-sfx-close">閉じる</button>';
 for(const [key,item]of Object.entries(bank)){const button=document.createElement('button');button.type='button';button.textContent=item.label;button.dataset.sound=key;button.onclick=()=>{stop();unlock();load().then(()=>play(key,{preview:true}));};dialog.querySelector('.glass-sfx-list').append(button);}
 dialog.querySelector('.glass-sfx-close').onclick=()=>dialog.close();dialog.addEventListener('close',stop);document.body.append(dialog);audition.onclick=()=>{unlock();dialog.showModal();};
 document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock);
 function pauseIfHidden(){if(!visible()){stop();context?.suspend().catch(()=>{});}}
 document.addEventListener('visibilitychange',pauseIfHidden);new MutationObserver(pauseIfHidden).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden','data-active-machine']});
 let transitionActive=false;new MutationObserver(()=>{const active=machine.classList.contains('glass-transition-active');if(active&&!transitionActive)stop();transitionActive=active;}).observe(machine,{attributes:true,attributeFilter:['class']});
window.GlassGameAudio=Object.freeze({handle:event=>{if(window.GlassRewardAudio&&(['start','side','win','premium','payout'].includes(event.type)||event.type==='reelStop'&&event.jackpot))return;return play(event.type,event);},play,load,stop,setEnabled:value=>{enabled=!!value;if(!enabled)stop();labels();},snapshot:()=>({enabled,ready,available:Object.keys(bank).length,played,dropped,active:voices.size,counts:{...counts},error})});
})();
