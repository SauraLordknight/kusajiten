/* Each game keeps its own DOM, state, scroll position and window. */
(() => {
  'use strict';
  const body=document.body;
  const definitions=[['kusa-gacha','草ガチャ'],['kusa-pachi','草パチ']];
  const windows=[];
  let returnFocus=null;
  for(const [id,title] of definitions){
    const game=document.getElementById(id),toggle=game.querySelector('button[id$="Toggle"]');
    const dialog=document.createElement('dialog');dialog.id=`${id}-window`;
    dialog.className='game-dialog theme-window';dialog.setAttribute('aria-labelledby',`${id}-window-title`);
    const head=document.createElement('header');head.className='theme-window-head game-window-head';
    const label=document.createElement('h2');label.id=`${id}-window-title`;label.textContent=title;
    const close=document.createElement('button');close.type='button';close.className='screen-button';
    close.textContent='× 閉じる';close.setAttribute('aria-label',`${title}を閉じる`);
    const scroll=document.createElement('div');scroll.className='screen-game-scroll';scroll.tabIndex=0;
    scroll.setAttribute('aria-label',`${title}（上下にスクロールできます）`);
    head.append(label,close);dialog.append(head,scroll);scroll.append(game);body.append(dialog);
    const item={id,game,toggle,dialog,scroll,close};windows.push(item);
    if(id==='kusa-pachi'){
      const selection=document.createElement('dialog');selection.id='pachiSelectionWindow';
      selection.className='game-dialog theme-window pachi-selection-window';
      selection.setAttribute('aria-labelledby','pachiSelectionTitle');
      const selectionHead=document.createElement('header');selectionHead.className='theme-window-head game-window-head';
      const selectionTitle=document.createElement('h2');selectionTitle.id='pachiSelectionTitle';
      const selectionClose=document.createElement('button');selectionClose.type='button';selectionClose.className='screen-button';selectionClose.textContent='× 閉じる';
      selectionClose.setAttribute('aria-label','草パチの選択画面を閉じる');
      const selectionContent=document.createElement('div');selectionContent.className='pachi-selection-content';
      selectionContent.append(document.getElementById('pachiEntry'),document.getElementById('pachiMachineSelect'));
      selectionHead.append(selectionTitle,selectionClose);selection.append(selectionHead,selectionContent);body.append(selection);
      item.selection=selection;item.selectionTitle=selectionTitle;
      selectionClose.addEventListener('click',()=>close.click());
      selection.addEventListener('cancel',e=>{e.preventDefault();close.click();});
      selection.addEventListener('close',()=>{
        if(!dialog.open&&!selection.open&&toggle.getAttribute('aria-expanded')==='true')toggle.click();
      });
      new MutationObserver(sync).observe(document.getElementById('pachiGame'),{attributes:true,attributeFilter:['hidden']});
      new MutationObserver(sync).observe(document.getElementById('pachiMachineSelect'),{attributes:true,attributeFilter:['hidden']});
    }
    close.addEventListener('click',()=>{if(toggle.getAttribute('aria-expanded')==='true')toggle.click();sync();});
    dialog.addEventListener('cancel',e=>{e.preventDefault();close.click();});
    dialog.addEventListener('close',()=>{
      if(id==='kusa-pachi'){
        const story=document.getElementById('glassStoryDialog');
        if(story&&!story.hidden)document.dispatchEvent(new Event('glass-story-cabinet-closed'));
      }
      if(!dialog.open&&!item.selection?.open&&toggle.getAttribute('aria-expanded')==='true')toggle.click();sync();
    });
    new MutationObserver(sync).observe(toggle,{attributes:true,attributeFilter:['aria-expanded']});
    new ResizeObserver(()=>{dialog.style.setProperty('--game-content-height',`${scroll.clientHeight}px`);}).observe(scroll);
  }
  function fit(){
    for(const {dialog,scroll} of windows){
      dialog.style.setProperty('--game-content-height',`${scroll.clientHeight}px`);
    }
  }
  function sync(){
    const active=windows.find(w=>w.toggle.getAttribute('aria-expanded')==='true');
    body.classList.toggle('screen-game-active',!!active);body.classList.toggle('screen-game-playing',!!active);
    for(const w of windows){
      if(w===active){
        const selecting=w.selection&&document.getElementById('pachiGame').hidden;
        const target=selecting?w.selection:w.dialog,other=selecting?w.dialog:w.selection;
        if(selecting)w.selectionTitle.textContent=document.getElementById('pachiMachineSelect').hidden?'草パチ：プレイヤー選択':'草パチ：台選択';
        if(!target.open){if(!other?.open)returnFocus=document.activeElement;target.show();fit();target.querySelector('.game-window-head button')?.focus({preventScroll:true});}
        if(other?.open)other.close();
      }
      else{if(w.dialog.open)w.dialog.close();if(w.selection?.open)w.selection.close();}
    }
    if(!active&&returnFocus?.isConnected){returnFocus.focus({preventScroll:true});returnFocus=null;}
    requestAnimationFrame(fit);
  }
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape'||document.querySelector('dialog[open]:not(.game-dialog),.detail-modal.is-open,.commemorative-medal-modal:not([hidden])'))return;
    const active=windows.find(w=>w.dialog.open||w.selection?.open);if(active){e.preventDefault();active.close.click();}
  });
  window.addEventListener('resize',fit);
  sync();
})();
