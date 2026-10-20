/* Add announcements here with a permanent unique id and an explicit JST date. */
(()=>{'use strict';
 const announcements=[{id:'20261020-test-1',date:'2026-10-20T10:02:46+09:00',title:'テスト',body:'あいうえを'}];
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
 function openArticle(a){read.add(a.id);save();list.hidden=true;article.hidden=false;back.hidden=false;all.hidden=true;article.replaceChildren();const title=document.createElement('h3');title.textContent=a.title;const time=document.createElement('time');time.dateTime=a.date;time.textContent=dateText(a.date);const text=document.createElement('p');text.textContent=a.body;article.append(time,title,text);article.focus({preventScroll:true});}
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
