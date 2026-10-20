/* Static new-theme shell: bind windows and responsive navigation without rebuilding the page. */
(() => {
  'use strict';
  const body = document.body, main = document.querySelector('main.wrap');
  const make = (tag, cls, text) => { const n = document.createElement(tag); n.className = cls; if (text) n.textContent = text; return n; };
  const button = (text, action) => { const n = make('button', 'screen-button', text); n.type = 'button'; n.addEventListener('click', action); return n; };
  const profile = document.getElementById('kusaProfile');
  const services = document.querySelector('.site-services');
  const hub = document.querySelector('.kusa-games-hub'), shop = document.getElementById('siteShop');
  const management = document.querySelector('.kusa-profile-management');
  const namedDirectory=document.getElementById('namedDirectory');
  // Management used to be a lower page pane. Keep its existing controls, but
  // host them in an independent modal so long card/title lists remain legible.
  const managementDialog=document.createElement('dialog');managementDialog.id='profileManagementDialog';managementDialog.className='profile-management-dialog';
  const managementHead=document.createElement('header'),managementTitle=document.createElement('div'),managementClose=document.createElement('button');
  const managementKicker=document.createElement('small'),managementH=document.createElement('h2');managementKicker.textContent='PLAYER MANAGEMENT';managementH.textContent='🌱 育成・カード管理';managementTitle.append(managementKicker,managementH);managementClose.type='button';managementClose.textContent='×';managementClose.setAttribute('aria-label','育成・カード管理を閉じる');managementHead.append(managementTitle,managementClose);managementDialog.append(managementHead,management);
  (document.querySelector('.base-theme')||document.body).append(managementDialog);
  let managementFocus=null;
  function openManagement(target=null){managementFocus=document.activeElement;management.open=true;if(!managementDialog.open)managementDialog.showModal();if(target&&target!==management)requestAnimationFrame(()=>target.scrollIntoView({block:'start',behavior:'instant'}));managementClose.focus({preventScroll:true});}
  function closeManagement(){if(managementDialog.open)managementDialog.close();}
  managementClose.addEventListener('click',closeManagement);
  managementDialog.addEventListener('close',()=>{if(managementFocus?.isConnected)managementFocus.focus({preventScroll:true});});
  // Keep the initial-page directory in place. When its dedicated window opens,
  // temporarily host the same live node there, then put it back on close.
  const namedDialog=document.createElement('dialog');namedDialog.id='namedDirectoryDialog';namedDialog.className='named-directory-dialog theme-window';
  const namedHead=document.createElement('header'),namedTitle=document.createElement('h2'),namedClose=document.createElement('button');
  const namedHomeParent=namedDirectory.parentNode,namedHomeNext=namedDirectory.nextSibling;
  namedTitle.textContent='ネームド一覧';namedClose.type='button';namedClose.textContent='×';namedClose.setAttribute('aria-label','ネームド一覧を閉じる');namedHead.append(namedTitle,namedClose);namedDialog.append(namedHead);
  (document.querySelector('.base-theme')||document.body).append(namedDialog);
  let namedFocus=null;
  function restoreNamedDirectory(){if(namedDirectory.parentNode===namedDialog)namedHomeParent.insertBefore(namedDirectory,namedHomeNext);}
  function openNamedDirectory(){namedFocus=document.activeElement;if(!namedDialog.open){namedDialog.append(namedDirectory);namedDialog.showModal();}namedClose.focus({preventScroll:true});}
  namedClose.addEventListener('click',()=>namedDialog.close());
  namedDialog.addEventListener('click',event=>{if(event.target===namedDialog)namedDialog.close();});
  namedDialog.addEventListener('close',()=>{restoreNamedDirectory();if(namedFocus?.isConnected)namedFocus.focus({preventScroll:true});});
  // A CSS overlay cannot appear above a modal dialog's top layer. Give the
  // person detail its own native modal, preserving the existing detail events.
  const personDetail=document.getElementById('detailModal');
  const personHost=document.createElement('dialog');personHost.className='person-detail-host';
  personHost.setAttribute('aria-labelledby','detailTitle');
  personDetail.removeAttribute('role');personDetail.removeAttribute('aria-modal');
  personDetail.before(personHost);personHost.append(personDetail);
  const syncPerson=()=>{
    if(personDetail.classList.contains('is-open')){if(!personHost.open)personHost.showModal();}
    else if(personHost.open)personHost.close();
  };
  new MutationObserver(syncPerson).observe(personDetail,{attributes:true,attributeFilter:['class']});
  personHost.addEventListener('cancel',event=>{event.preventDefault();personDetail.classList.remove('is-open');});
  personHost.addEventListener('close',()=>personDetail.classList.remove('is-open'));
  const stage = document.getElementById('kusaGamesStage');
  const grid = document.querySelector('.directory-layout');
  const information = document.querySelector('.site-information');
  const migration = document.querySelector('.migration-notice'), purpose = document.querySelector('.site-purpose');
  const requestBox=document.getElementById('request-box'),requestFormURL=requestBox.querySelector('.request-button').href;
  const workspace=document.getElementById('screenWorkspace'),panelHead=workspace.querySelector('.screen-panel-head'),panelTitle=document.getElementById('screenPanelTitle');
  const labels={directory:'名鑑',games:'遊技場',shop:'ショップ',manage:'管理',menu:'メニュー'},panes=Object.fromEntries([...workspace.querySelectorAll(':scope>.screen-pane')].map(n=>[n.dataset.pane,n]));
  document.querySelector('.screen-notice-bar button').addEventListener('click',()=>openTarget(migration));
  document.querySelector('.screen-notice-bar button:nth-of-type(2)').addEventListener('click',()=>openTarget(purpose));
  document.querySelector('.screen-management-launch').addEventListener('click',()=>openManagement());panelHead.querySelector('button').addEventListener('click',closeWorkspace);
  const targets=['migrationNoticeTitle','policyBannerTitle','how-to-use','siteThemeOpen'];
  panes.menu.querySelectorAll('.screen-menu-links button').forEach((n,i)=>n.addEventListener('click',()=>targets[i]==='siteThemeOpen'?document.getElementById(targets[i]).click():openTarget(document.getElementById(targets[i]))));
  const infoDialog=document.getElementById('siteInfoDialog'),infoTitle=document.getElementById('siteInfoTitle'),infoClose=infoDialog.querySelector('.site-info-head button'),infoContent=infoDialog.querySelector('.site-info-content');
  infoClose.addEventListener('click',()=>infoDialog.close());
  const infoPages=new Map([...infoContent.children].map(page=>[page,page===migration?'データ保存':page===purpose?'この事典について・掲載方針の要点':page.id==='how-to-play'?'遊び方':page.querySelector('h2,summary')?.textContent.trim()||'サイトの案内']));
  const entries=[...panes.menu.querySelectorAll('.site-info-index button')];[...infoPages.keys()].forEach((page,i)=>entries[i].addEventListener('click',()=>openInfo(page)));
  // Keep one destination per row, grouped by the task visitors want to do.
  const menuIndex=panes.menu.querySelector('.site-info-index');
  const menuGroups=new Map();
  for(const [key,label] of [['quick','よく使う操作'],['support','運営・お問い合わせ'],['info','サイト情報'],['learn','🌱 kusaを知る']]){
    const group=document.createElement(key==='learn'?'details':'section');group.className='site-menu-group';
    const heading=make(key==='learn'?'summary':'h3','',label),links=make('nav','site-menu-rows');links.setAttribute('aria-label',label);group.append(heading,links);menuGroups.set(key,{group,links});
  }
  const learningIds=new Set(['about-kusa','name-types','kusa-history','how-to-use','kusa-glossary','revision-history']);
  const supportIds=new Set(['siteAdmin','profile-offer','correction-request']);
  [...infoPages.keys()].forEach((page,i)=>{
    const row=entries[i];if(page===purpose){row.remove();return;}
    let key=(page===migration||page.id==='how-to-play')?'quick':learningIds.has(page.id)?'learn':supportIds.has(page.id)||page.classList.contains('kusa-publication-policy')||/プロフィール掲載/.test(row.textContent)?'support':'info';
    if(page===migration)row.textContent='💾 データ保存・読み込み';
    if(page.id==='how-to-use')row.textContent='使い方';
    if(page.id==='how-to-play')row.textContent='遊び方';
    if(page.id==='revision-history')row.textContent='更新履歴';
    if(page.classList.contains('kusa-publication-policy'))row.textContent='掲載方針';
    menuGroups.get(key).links.append(row);
  });
  menuGroups.get('quick').links.append(button('🎨 着せ替え',()=>document.getElementById('siteThemeOpen').click()));
  const primaryBgm=document.getElementById('siteBgmToggle');
  const menuBgm=button('',()=>primaryBgm.click());menuBgm.id='siteMenuBgmToggle';
  const syncMenuBgm=()=>{menuBgm.textContent='♪ '+primaryBgm.textContent;menuBgm.setAttribute('aria-pressed',primaryBgm.getAttribute('aria-pressed')||'false');menuBgm.title=primaryBgm.title;};
  new MutationObserver(syncMenuBgm).observe(primaryBgm,{childList:true,attributes:true,attributeFilter:['aria-pressed','title']});syncMenuBgm();menuGroups.get('quick').links.append(menuBgm);
  const requestLink=menuIndex.querySelector('a');if(requestLink)menuGroups.get('support').links.append(requestLink);
  panes.menu.querySelectorAll('.screen-menu-links,.site-information,.note,footer').forEach(n=>n.remove());menuIndex.remove();
  menuGroups.forEach(({group})=>panes.menu.append(group));
  function openInfo(page, target = page) {
    closeMenu();
    infoPages.forEach((_,n) => { n.hidden = n !== page; n.classList.toggle('site-info-active', n === page); });
    infoTitle.textContent = infoPages.get(page); if (page.matches('details')) page.open = true;
    if (!infoDialog.open) infoDialog.showModal();
    infoDialog.scrollTop=0; infoContent.scrollTop = 0; infoClose.focus({preventScroll:true});
    requestAnimationFrame(()=>{if(infoDialog.open){infoDialog.scrollTop=0;infoContent.scrollTop=0;page.scrollTop=0;}});
    if (target !== page && !target.matches('h2,summary')) requestAnimationFrame(() => target.scrollIntoView({block:'start',behavior:'instant'}));
  }
  infoDialog.addEventListener('click', e => {
    if (e.target !== infoDialog) return;
    const r = infoDialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) infoDialog.close();
  });
  const effectsLayer=document.getElementById('screenEffectsLayer');
  // Existing game rewards still drive the animations; only their presentation layer changes.
  const particleSelector = '.commerce-acquired,.workshop-flying-material,.offering-particle,.offering-xp';
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(n => {
    if (n.nodeType === 1 && n.matches(particleSelector)) effectsLayer.append(n);
  }))).observe(body, {childList:true});
  const dock=document.querySelector('.screen-dock');dock.querySelectorAll('[data-screen-view]').forEach(n=>n.addEventListener('click',()=>show(n.dataset.screenView)));
  document.querySelectorAll('[data-named-directory-open]').forEach(n=>n.addEventListener('click',event=>{event.preventDefault();openNamedDirectory();}));
  const menuDialog=document.createElement('dialog');menuDialog.id='siteMenuDrawer';menuDialog.className='site-menu-drawer';menuDialog.setAttribute('aria-labelledby','siteMenuDrawerTitle');
  const menuHeader=make('header','site-menu-drawer-head'),menuHeading=make('h2','','メニュー');menuHeading.id='siteMenuDrawerTitle';
  const menuClose=button('× 閉じる',closeMenu);menuHeader.append(menuHeading,menuClose);menuDialog.append(menuHeader,panes.menu);(document.querySelector('.base-theme')||body).append(menuDialog);
  const menuToggle=document.querySelector('.site-menu-toggle');menuToggle.setAttribute('aria-controls',menuDialog.id);menuToggle.setAttribute('aria-haspopup','dialog');
  function closeMenu(){if(menuDialog.open)menuDialog.close();}
  function openMenu(){panes.menu.hidden=false;if(!menuDialog.open)menuDialog.showModal();menuToggle.setAttribute('aria-expanded','true');menuClose.focus({preventScroll:true});}
  menuDialog.addEventListener('close',()=>{menuToggle.setAttribute('aria-expanded','false');menuToggle.focus({preventScroll:true});});
  menuDialog.addEventListener('click',e=>{if(e.target===menuDialog){const r=menuDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right)closeMenu();}else if(e.target.closest('button,a'))closeMenu();});
  let current = 'directory', returnFocus = null;
  const mobile = matchMedia('(max-width: 799px)');
  function show(view, focus = true) {
    if(view==='menu'){openMenu();return;}
    if (!panes[view]) return;
    if (current === 'directory' && view !== 'directory') returnFocus = document.activeElement;
    current = view; body.dataset.screenView = view;
    if(!mobile.matches && view==='games')panes.games.prepend(hub);
    else if(hub.parentNode!==services)services.append(hub);
    Object.entries(panes).forEach(([key,n]) => { n.hidden = key !== view; });
    panelTitle.textContent = labels[view];
    dock.querySelectorAll('button').forEach(n => n.setAttribute('aria-current', n.dataset.screenView === view ? 'page' : 'false'));
    if(view === 'manage'){ show('directory',false); openManagement(); return; }
    services.inert = !mobile.matches && view !== 'directory';
    body.classList.toggle('screen-game-playing', body.classList.contains('screen-game-active'));
    if (focus && view !== 'directory') { panelTitle.tabIndex = -1; panelTitle.focus({preventScroll:true}); }
    if (focus && view === 'directory' && returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
    requestAnimationFrame(fit);
  }
  function closeWorkspace() {
    closeManagement();
    if (current === 'games') document.querySelectorAll('.game-dialog button[id$="Toggle"][aria-expanded="true"]').forEach(n => n.click());
    show('directory');
  }
  function openTarget(target) {
    if (!target) return;
    if (requestBox.contains(target)) { location.assign(requestFormURL); return; }
    const page = [...infoPages.keys()].find(n => n.contains(target));
    if (page) { openInfo(page, target); return; }
    if (infoDialog.open) infoDialog.close();
    if (target.closest('.kusa-profile-management')) { openManagement(target); return; }
    else if (target.closest('#namedDirectory')) { openNamedDirectory(); return; }
    else if (target.closest('.directory-sidebar')) show('directory', false);
    else if (target.closest('.kusa-games-hub')) show('games');
    else if (target.closest('#siteShop')) { show('shop'); if (!mobile.matches) document.getElementById('kusaShopOpen').click(); }
    else if (target.closest('#kusaProfile')) { show('directory', false); return; }
    else show('menu');
    const details = target.closest('details'); if (details) details.open = true;
    requestAnimationFrame(() => target.scrollIntoView({block:'start',behavior:'instant'}));
  }
  function routeHash() {
    let id; try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (id) openTarget(document.getElementById(id));
  }
  function arrange() {
    services.append(shop, hub);
    body.classList.add('screen-shell'); show(current, false);
  }
  function fit() {
    if(mobile.matches){body.classList.remove('screen-flow');return;}
    // Short screens, enlarged text and unusually long names get an accessible scrolling fallback.
    body.classList.remove('screen-flow');
    const top = `${profile.getBoundingClientRect().bottom - main.getBoundingClientRect().top + 5}px`;
    if (main.style.getPropertyValue('--screen-panel-top') !== top) main.style.setProperty('--screen-panel-top', top);
    const usable = innerHeight >= 620 && workspace.getBoundingClientRect().height >= 150;
    body.classList.toggle('screen-flow', !usable);
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (a && !a.closest('.theme-retired')) {
      const target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
      if (target && (!a.closest('.detail-modal,.commemorative-medal-modal,dialog') || a.closest('#siteInfoDialog'))) { e.preventDefault(); history.replaceState(null, '', a.hash); openTarget(target); }
    }
    if (e.target.closest('#capsuleInventoryBadge')) openTarget(document.getElementById('capsuleInventoryTitle'));
    if (e.target.closest('.site-menu-toggle')) {e.preventDefault();e.stopImmediatePropagation();openMenu();}
  }, true);
  // Individual game windows own game state and scrolling now.
  document.addEventListener('keydown', e => {
    if (e.target.closest('#capsuleInventoryBadge') && ['Enter',' '].includes(e.key)) openTarget(document.getElementById('capsuleInventoryTitle'));
    if (e.key === 'Escape' && !document.querySelector('dialog[open],.detail-modal.is-open,.commemorative-medal-modal:not([hidden])')) closeWorkspace();
  }, true);
  mobile.addEventListener('change', arrange); window.addEventListener('resize',()=>{if(!mobile.matches)scheduleFit();}); window.addEventListener('hashchange', routeHash);
  let fitFrame = 0;
  function scheduleFit() { if (!fitFrame) fitFrame = requestAnimationFrame(() => { fitFrame = 0; fit(); }); }
  new ResizeObserver(()=>{if(!mobile.matches)scheduleFit();}).observe(profile);
  // Reloads return to the directory; deliberate external deep links still work.
  const reload=performance.getEntriesByType('navigation')[0]?.type==='reload';
  if(reload){history.replaceState(null,'',location.pathname+location.search);if('scrollRestoration' in history)history.scrollRestoration='manual';window.scrollTo(0,0);}
  arrange();if(!reload)routeHash();
  window.addEventListener('pageshow',event=>{if(event.persisted){document.querySelectorAll('dialog[open]').forEach(d=>d.close());history.replaceState(null,'',location.pathname+location.search);show('directory',false);window.scrollTo(0,0);}});
})();
