/* 草パチと新台は別筐体。共有するのはゲーム状態と物理ロジックだけ。 */
(() => {
 const win=document.getElementById('kusa-pachi-window');if(!win)return;
 // The daily prologue belongs to the independent cabinet window. Keeping it
 // there avoids a modal dialog nested in the selection/game dialog hierarchy.
 const story=document.getElementById('glassStoryDialog');
 if(story)win.append(story);
 const game=document.getElementById('pachiGame');
 const machine=document.getElementById('pachiMachine');
 const debugMachine=document.getElementById('pachiDebugMachine');
 const board=machine.querySelector('.pachi-board-wrap');
 const arena=document.createElement('div');arena.className='pachi-responsive-arena';
 const viewport=document.createElement('div');viewport.className='pachi-cabinet-viewport';
 const debugStage=document.createElement('div');debugStage.className='pachi-debug-stage';debugStage.hidden=true;
 const normalShell=document.createElement('div');normalShell.className='pachi-cabinet-shell pachi-kusa-shell';
 const rail=document.createElement('div');rail.className='pachi-play-rail';
 const readouts=document.createElement('div');readouts.className='pachi-top-readouts';
 // The pachinko dialog owns its own internal scroll viewport. Do not bind the
 // similarly named site-level viewport behind the modal.
 const gameScroll=win.querySelector('.screen-game-scroll');
 normalShell.append(board);
 viewport.append(normalShell);
 debugStage.append(debugMachine);
 const volumeControls=debugMachine.querySelector('.glass-volume-controls');
 if(volumeControls)debugStage.append(volumeControls);
 const rateControls=debugMachine.querySelector('.glass-rate-selector');
 const settings=document.createElement('dialog');settings.className='pachi-settings-dialog theme-window';settings.id='pachiSettingsDialog';
 settings.innerHTML='<header class="theme-window-head"><h2>パチンコ：設定・記録・交換</h2><button type="button" class="screen-button">× 閉じる</button></header><div class="pachi-settings-content"></div>';
 const content=settings.querySelector('.pachi-settings-content');
 // The shared 1/5/10 selector below (`#pachiWager`) already controls both
 // machines, so remove the second machine-specific selector entirely.
 rateControls?.remove();
 for(const selector of ['.pachi-player-row','.pachi-exchange','.pachi-control-sub','#pachiTitleNotice','.pachi-rule']){const node=game.querySelector(selector);if(node)content.append(node);}
 const wager=game.querySelector('#pachiWager');if(wager)content.querySelector('.pachi-player-row').after(wager);
 for(const node of [...game.children])if(node!==machine&&node!==debugMachine&&node.tagName==='DETAILS')content.append(node);
 for(const node of [...document.getElementById('pachiPanel').children])if(node.tagName==='DETAILS')content.append(node);
 const saveMessage=document.getElementById('pachiSaveMessage');if(saveMessage)content.append(saveMessage);
 readouts.append(game.querySelector('.pachi-stats'));
 for(const selector of ['.pachi-display']){const node=game.querySelector(selector);if(node)readouts.append(node);}
 rail.append(game.querySelector('.pachi-controls'));
 const fire=rail.querySelector('#pachiFire');fire.firstChild.textContent='ハンドル ';fire.querySelector('small').textContent='押し続けて発射';
 arena.append(readouts,viewport,rail);machine.append(arena);
 game.insertBefore(debugStage,machine.nextSibling);
 let scrollSettle=0;
 gameScroll?.addEventListener('scroll',()=>{
  if(machine.dataset.activeMachine!=='debug')return;
  if(debugMachine.dataset.scrolling!=='true')debugMachine.dataset.scrolling='true';
  clearTimeout(scrollSettle);
  scrollSettle=setTimeout(()=>{
   debugMachine.dataset.scrolling='false';
   document.getElementById('pachiDebugCanvas')?.dispatchEvent(new Event('pachi-debug-overlay-change'));
  },120);
 },{passive:true});

 const close=win.querySelector('.game-window-head>button:last-child');
 const launcher=document.createElement('button');launcher.type='button';launcher.className='screen-button';launcher.textContent='設定・記録';
 const expand=document.createElement('button');expand.type='button';expand.className='screen-button';expand.textContent='台を拡大';expand.setAttribute('aria-pressed','false');
 win.querySelector('.game-window-head').insertBefore(expand,close);
 win.querySelector('.game-window-head').insertBefore(launcher,close);
 // Move the existing control so its game logic and save checks stay attached.
 const reselect=content.querySelector('#pachiMachineReselect');
 if(reselect){
  reselect.classList.add('screen-button');
  win.querySelector('.game-window-head').insertBefore(reselect,close);
 }
 expand.addEventListener('click',()=>{const enlarged=win.classList.toggle('pachi-expanded');expand.textContent=enlarged?'元に戻す':'台を拡大';expand.setAttribute('aria-pressed',String(enlarged));schedule();});
 document.body.append(settings);
 launcher.addEventListener('click',()=>{settings.showModal();window.dispatchEvent(new Event('pachi-settings-open'));settings.querySelector('button').focus();});
 settings.querySelector('header button').addEventListener('click',()=>settings.close());
 settings.addEventListener('close',()=>launcher.focus({preventScroll:true}));
 settings.addEventListener('click',event=>{if(event.target.closest('#pachiResultOpen,#pachiRankingOpen,#pachiShareOpen,#pachiSwitch,#pachiRename,#pachiMachineReselect'))settings.close();},true);

 win.classList.add('pachi-responsive-window');
 if(!machine.dataset.activeMachine)machine.dataset.activeMachine='kusa';
 function syncActiveMachine(){
  const debug=machine.dataset.activeMachine==='debug';
  win.classList.toggle('pachi-debug-active',debug);
  machine.hidden=debug;
  debugStage.hidden=!debug;
  debugMachine.hidden=!debug;
  debugMachine.dataset.scrolling='false';
  debugMachine.classList.remove('show-dimensions');document.getElementById('pachiDebugHud').hidden=true;
  schedule();
 }
 function fit(){
  const selecting=game.hidden;
  if(reselect)reselect.hidden=selecting;
  expand.hidden=selecting;
  const title=win.querySelector('.game-window-head h2');
  if(selecting&&title)title.textContent=document.getElementById('pachiMachineSelect').hidden?'草パチ：プレイヤー選択':'草パチ：台選択';
  if(!win.open||selecting)return;
  const debug=machine.dataset.activeMachine==='debug';
  if(debug){
   const availableW=Math.max(1,debugStage.clientWidth);
   const maxScale=win.classList.contains('pachi-expanded')?1.18:1;
   // Every debug toolbar participates in flow; never center the cabinet behind
   // newly added preview buttons or a wrapped mobile rate selector.
   const toolbarHeight=[...debugStage.children].filter(node=>node!==debugMachine&&node!==volumeControls&&!node.hidden).reduce((sum,node)=>{const css=getComputedStyle(node);return sum+node.getBoundingClientRect().height+(parseFloat(css.marginTop)||0)+(parseFloat(css.marginBottom)||0);},0);
   if(volumeControls)volumeControls.style.width=`${Math.max(1,Math.min(521,availableW-12))}px`;
   const volumeHeight=volumeControls?.getBoundingClientRect().height||0;
   // Restore the cabinet's original width-based size. Short windows scroll;
   // they must not shrink the cabinet to the selection window's height.
   const scale=Math.max(.05,Math.min(maxScale,(availableW-12)/521));
   if(volumeControls)volumeControls.style.top=`${Math.ceil(toolbarHeight+905*scale+16)}px`;
   const height=Math.ceil(toolbarHeight+905*scale+32+volumeHeight);
   debugMachine.style.marginTop='0px';
   debugMachine.style.top=`${toolbarHeight+96*scale+8}px`;
   debugMachine.style.transform=`translateX(-50%) scale(${scale})`;
   debugMachine.style.transformOrigin='top center';
   debugMachine.style.setProperty('--pdm-scale',String(scale));
   debugStage.style.height=`${height}px`;
   debugStage.style.minHeight=`${height}px`;
   win.classList.add('pachi-layout-scroll');
   return;
  }
  debugStage.style.minHeight='';
  debugStage.style.height='';
  const availableW=Math.max(1,viewport.clientWidth),availableH=Math.max(1,viewport.clientHeight);
  viewport.style.minHeight='';
  const required=readouts.scrollHeight+rail.scrollHeight+242;
  const available=(gameScroll?.clientHeight||win.clientHeight)-28;
  const fallback=available<required;
  machine.style.minHeight=fallback?`${required+16}px`:'0px';
  win.classList.toggle('pachi-layout-scroll',fallback);
  const scale=Math.max(.01,Math.min(win.classList.contains('pachi-expanded')?1.5:1.15,(availableW-8)/454,(availableH-8)/584));
  normalShell.style.setProperty('--cabinet-scale',String(scale));
 }
 let frame=0;function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;fit();});}
 new ResizeObserver(schedule).observe(viewport);new ResizeObserver(schedule).observe(debugStage);new ResizeObserver(schedule).observe(win);
 new ResizeObserver(schedule).observe(win.querySelector('.game-window-head'));
 new ResizeObserver(schedule).observe(document.getElementById('pachiPanel'));
 if(volumeControls)new ResizeObserver(schedule).observe(volumeControls);
 new MutationObserver(syncActiveMachine).observe(machine,{attributes:true,attributeFilter:['data-active-machine']});
 new MutationObserver(schedule).observe(game,{attributes:true,attributeFilter:['hidden']});
 new MutationObserver(schedule).observe(document.getElementById('pachiMachineSelect'),{attributes:true,attributeFilter:['hidden']});
 window.addEventListener('resize',schedule);syncActiveMachine();
})();
