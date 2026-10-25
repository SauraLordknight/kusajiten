/* Add announcements here with a permanent unique id and an explicit JST date. */
(()=>{'use strict';
 const announcements=[{id:'20261020-launch',date:'2026-10-20T21:00:00+09:00',title:'kusa事典、大規模アップデート！',body:'kusa事典が新しく生まれ変わりました。草ガチャ・草パチ・草釣りをはじめ、遊びやすさやデザインを見直し、新しい楽しみも加えています。\n\n日ごろ遊んでくださっている皆さんへ、作者から感謝を込めて草10,000とチップ1,000をお贈りします。\n\n新しくなったkusa事典を、これからもよろしくお願いします。',gift:true}];
 announcements.unshift({id:'20261025-economy-patch',date:'2026-10-25T12:00:00+09:00',title:'ショップ更新！ 新アイテムと初回ボーナスを追加しました',body:'kusa事典を遊んでいただき、ありがとうございます。\n今回の更新では、ショップをもっと使いやすくする価格調整と、新しいアイテムを追加しました。\n\n・フォーチュンキー：1,000 → 200チップ\n・オーロラキー：10,000 → 5,000チップ\n・新アイテム「ネタバレで草」：草10,000\n使うと、その日の台設定を確認できます。\n・新しく作成したデータへの初回ログインボーナス：草1,000・チップ500\n\n日ごろの感謝として、皆さんにチップ3,000をお贈りします。下のボタンからお受け取りください。\n\nこれからも、kusa事典をよろしくお願いします。',gift:true});
 const storageKey='kusa-site-announcements-read-v1';let read=new Set();
 function load(){try{const ids=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(ids))read=new Set(ids.filter(id=>typeof id==='string'));}catch{}}
 load();
 const host=document.querySelector('.base-theme')||document.body;
 const dialog=document.createElement('dialog');dialog.id='siteAnnouncements';dialog.setAttribute('aria-labelledby','announcementHeading');
 const head=document.createElement('header');head.className='announcement-head';const heading=document.createElement('h2');heading.id='announcementHeading';heading.textContent='📮 お知らせ';
 const close=document.createElement('button');close.type='button';close.textContent='× 閉じる';close.addEventListener('click',()=>dialog.close());head.append(heading,close);
 const tools=document.createElement('div');tools.className='announcement-tools';const back=document.createElement('button');back.type='button';back.textContent='‹ 一覧へ';back.hidden=true;
 const all=document.createElement('button');all.type='button';all.textContent='すべて既読にする';tools.append(back,all);
 const list=document.createElement('div');list.className='announcement-list';list.setAttribute('aria-label','お知らせ一覧');
 const article=document.createElement('article');article.className='announcement-body';article.hidden=true;article.tabIndex=-1;
 dialog.append(head,tools,list,article);host.append(dialog);
 const triggers=[];let returnFocus=null;
 const dateText=value=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));
 function save(){try{localStorage.setItem(storageKey,JSON.stringify([...read]));}catch{}render();}
 function render(){const unread=announcements.filter(a=>!read.has(a.id)).length;
  for(const {button,badge,label} of triggers){badge.textContent=String(unread);badge.hidden=unread===0;button.setAttribute('aria-label',label+(unread?'、未読'+unread+'件':''));}
  const menu=document.querySelector('.site-menu-toggle');let menuBadge=menu.querySelector('.announcement-badge');if(!menuBadge){menuBadge=document.createElement('span');menuBadge.className='announcement-badge';menuBadge.setAttribute('aria-hidden','true');menu.append(menuBadge);}menuBadge.textContent=String(unread);menuBadge.hidden=unread===0;
  menu.setAttribute('aria-label','メニュー'+(unread?'、未読のお知らせ'+unread+'件':''));
  list.replaceChildren();for(const a of [...announcements].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))){const row=document.createElement('button');row.type='button';row.className='announcement-row '+(read.has(a.id)?'is-read':'is-unread');row.dataset.announcementId=a.id;
   const time=document.createElement('time');time.dateTime=a.date;time.textContent=dateText(a.date);const title=document.createElement('strong');title.textContent=a.title;const status=document.createElement('span');status.className='announcement-read-status';status.textContent=read.has(a.id)?'既読':'未読';row.append(time,title,status);row.addEventListener('click',()=>openArticle(a));list.append(row);}
  all.disabled=unread===0;
 }
 let currentArticle=null,giftBusy=false;
 function openArticle(a){currentArticle=a;read.add(a.id);save();list.hidden=true;article.hidden=false;back.hidden=false;all.hidden=true;article.replaceChildren();const title=document.createElement('h3');title.textContent=a.title;const time=document.createElement('time');time.dateTime=a.date;time.textContent=dateText(a.date);const text=document.createElement('p');text.textContent=a.body;article.append(time,title,text);if(a.gift)appendGift(a);article.focus({preventScroll:true});}
 let giftAudio = null;
 function playGiftChime(){
  try {
   const Audio = window.AudioContext || window.webkitAudioContext;
   if(!Audio)return;
   giftAudio ||= new Audio();
   const play=()=>{
    const ac=giftAudio;
    // Identical notes, timing, waveform and volume to the daily pachinko refill.
    [523,659,784].forEach((frequency,i)=>{
     const oscillator=ac.createOscillator(),gain=ac.createGain(),start=ac.currentTime+i*.105;
     oscillator.type='sine';oscillator.frequency.value=frequency;
     gain.gain.setValueAtTime(.0001,start);
     gain.gain.exponentialRampToValueAtTime(.11,start+.015);
     gain.gain.exponentialRampToValueAtTime(.0001,start+.28);
     oscillator.connect(gain).connect(ac.destination);
     oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
     oscillator.start(start);oscillator.stop(start+.29);
    });
   };
   if(giftAudio.state==='running')play();else giftAudio.resume().then(play).catch(()=>{});
  } catch {}
 }
 window.KusaGiftChime=playGiftChime;
 function appendGift(a){
  const button=document.createElement('button');button.type='button';button.className='announcement-gift';
  const status=document.createElement('p');status.setAttribute('role','status');
  const update=()=>{const player=window.KusaPlayerStore?.getSelected();const claimed=player?.claimedAnnouncements?.includes(a.id);button.disabled=giftBusy||!player||!!claimed;button.textContent=claimed?'受け取り済み':'プレゼントを受け取る';status.textContent=player?(claimed?'このデータでは受け取り済みです。':'現在選択中のデータで1回受け取れます。'): '育成・カード管理からデータを選択または作成してください。';};
  button.addEventListener('click',async()=>{if(giftBusy)return;const id=window.KusaPlayerStore?.getSelectedId();giftBusy=true;update();try{const result=a.id==='20261025-economy-patch'?await window.KusaPlayerStore?.claimPatchGift(id):await window.KusaPlayerStore?.claimLaunchGift(id);if(result?.ok)playGiftChime();if(window.KusaPlayerStore?.getSelectedId()===id)status.textContent=result?.ok?(a.id==='20261025-economy-patch'?'チップ3,000を受け取りました！':'草10,000とチップ1,000を受け取りました！'):(result?.message||'受け取れませんでした。');}catch{status.textContent='保存できませんでした。もう一度お試しください。';}finally{giftBusy=false;button.disabled=!!window.KusaPlayerStore?.getSelected()?.claimedAnnouncements?.includes(a.id);if(!button.isConnected&&currentArticle)openArticle(currentArticle);}});
  article.append(button,status);update();
 }
 window.addEventListener('kusa-player-changed',()=>{if(!article.hidden&&currentArticle&&!giftBusy)openArticle(currentArticle);});
 function showList(){article.hidden=true;list.hidden=false;back.hidden=true;all.hidden=false;render();}
 back.addEventListener('click',()=>{showList();list.querySelector('button')?.focus();});all.addEventListener('click',()=>{announcements.forEach(a=>read.add(a.id));save();});
 function open(){returnFocus=document.activeElement;document.getElementById('siteMenuDrawer')?.close();load();showList();if(!dialog.open)dialog.showModal();close.focus({preventScroll:true});}
 function trigger(label){const button=document.createElement('button');button.type='button';button.className='site-utility announcement-open';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',dialog.id);button.textContent=label;const badge=document.createElement('span');badge.className='announcement-badge';badge.setAttribute('aria-hidden','true');button.append(badge);button.addEventListener('click',open);triggers.push({button,badge,label});return button;}
 document.getElementById('siteNavigation').prepend(trigger('📮 お知らせ'));
 const drawer=document.querySelector('#siteMenuDrawer [data-pane="menu"]');drawer.prepend(trigger('📮 お知らせ'));
 dialog.addEventListener('close',()=>{if(returnFocus?.isConnected){if(returnFocus.closest('#siteMenuDrawer'))document.querySelector('.site-menu-toggle').focus({preventScroll:true});else returnFocus.focus({preventScroll:true});}});
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
 window.addEventListener('storage',e=>{if(e.key===storageKey){load();render();}});render();
})();
