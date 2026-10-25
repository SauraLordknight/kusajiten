/* A once-only welcome gift for data created after this feature was installed. */
(()=>{'use strict';
 const host=document.querySelector('.base-theme')||document.body,dialog=document.createElement('dialog');
 dialog.id='welcomeBonusDialog';dialog.setAttribute('aria-labelledby','welcomeBonusTitle');
 dialog.innerHTML='<header><h2 id="welcomeBonusTitle">ようこそ、kusa事典へ！</h2><button type="button" data-welcome-close>× 閉じる</button></header><p>新しいデータでの最初の一歩に。<br>草1,000とチップ500をプレゼント！</p><p>このデータで1回だけ受け取れます。</p><button type="button" data-welcome-claim>初回ボーナスを受け取る</button><p role="status" data-welcome-message></p>';
 host.append(dialog);
 const launch=document.createElement('button');launch.type='button';launch.textContent='🎁 初回ボーナスを受け取る';launch.id='welcomeBonusOpen';launch.hidden=true;document.getElementById('kusaProfile').append(launch);
 let busy=false,owner='',timer,returnFocus;const shown=new Set();
 const eligible=()=>{const p=window.KusaPlayerStore?.getSelected();return !!(p?.welcomeBonus?.eligible&&!p.welcomeBonus.claimed);};
 function close(){dialog.close();}
 function open(){if(!eligible()||busy)return;owner=window.KusaPlayerStore.getSelectedId();shown.add(owner);returnFocus=document.activeElement;dialog.querySelector('[data-welcome-message]').textContent='';dialog.querySelector('[data-welcome-claim]').disabled=false;if(!dialog.open)dialog.showModal();}
 function refresh(){clearTimeout(timer);launch.hidden=!eligible();if(dialog.open&&(!eligible()||owner!==window.KusaPlayerStore.getSelectedId()))close();if(!launch.hidden&&!shown.has(window.KusaPlayerStore.getSelectedId()))timer=setTimeout(()=>{if(![...document.querySelectorAll('dialog[open],.game-window')].some(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'))open();else refresh();},1200);}
 launch.addEventListener('click',open);dialog.querySelector('[data-welcome-close]').addEventListener('click',close);
 dialog.addEventListener('close',()=>{if(returnFocus?.isConnected&&!returnFocus.hidden)returnFocus.focus({preventScroll:true});});
 dialog.querySelector('[data-welcome-claim]').addEventListener('click',async()=>{if(busy||!eligible())return;busy=true;const id=owner,button=dialog.querySelector('[data-welcome-claim]');button.disabled=true;try{const r=await KusaPlayerStore.claimWelcomeBonus(id);if(r.ok)window.KusaGiftChime?.();if(KusaPlayerStore.getSelectedId()===id){if(r.ok)close();else dialog.querySelector('[data-welcome-message]').textContent=r.message;}}catch{dialog.querySelector('[data-welcome-message]').textContent='保存できませんでした。もう一度お試しください。';}finally{busy=false;button.disabled=false;refresh();}});
 for(const e of ['kusa-player-changed','kusa-player-selected','kusa-pachi-profile-changed'])window.addEventListener(e,refresh);
 document.addEventListener('close',refresh,true);
 refresh();
})();
