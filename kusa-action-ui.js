let activeConfirmation = null;
export function confirmAction({title, lines, action = '実行する', expectedPlayerId = ''}) {
  if (activeConfirmation) return Promise.resolve(false);
  const origin = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'kusa-action-dialog';
  const heading = document.createElement('h2'); heading.id = 'kusaActionTitle'; heading.textContent = title;
  dialog.setAttribute('aria-labelledby', heading.id);
  const list = document.createElement('div');
  lines.forEach(text => { const p = document.createElement('p'); p.textContent = text; list.append(p); });
  const buttons = document.createElement('div'); buttons.className = 'kusa-action-buttons';
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'キャンセル'; cancel.dataset.actionCancel = '';
  const accept = document.createElement('button'); accept.type = 'button'; accept.textContent = action; accept.dataset.actionConfirm = '';
  buttons.append(cancel, accept); dialog.append(heading, list, buttons); document.body.append(dialog);
  return new Promise(resolve => {
    activeConfirmation = dialog;
    const finish = () => { const ok = dialog.returnValue === 'yes'; dialog.remove(); activeConfirmation = null; window.removeEventListener('kusa-player-changed', changed); origin?.focus(); resolve(ok); };
    const changed = event => {
      // A balance/catalog synchronization is not a player switch. Minting can
      // keep its confirmation open when the same player is refreshed elsewhere.
      if(expectedPlayerId && !event.detail?.imported && globalThis.KusaPlayerStore?.getSelectedId?.()===expectedPlayerId)return;
      dialog.close('no');
    };
    dialog.addEventListener('close', finish, {once:true});
    cancel.addEventListener('click', () => dialog.close('no'));
    accept.addEventListener('click', () => dialog.close('yes'));
    dialog.addEventListener('click', e => { if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close('no');} });
    window.addEventListener('kusa-player-changed', changed);
    dialog.showModal(); cancel.focus();
  });
}

export function animateOffering(origin, icon, xp, before, after) {
  const meter = document.getElementById('profileLevelProgress');
  if (!meter) return;
  const start = origin.getBoundingClientRect();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  meter.scrollIntoView({block:'nearest', behavior:'instant'});
  const dest = meter.getBoundingClientRect();
  if (!reduced) {
    for(let i=0;i<6;i++) {
      const node=document.createElement('span'); node.className='offering-particle'; node.textContent=icon; document.body.append(node);
      const anim=node.animate([{transform:`translate(${start.left+start.width/2}px,${start.top+start.height/2}px) scale(1)`,opacity:1},{transform:`translate(${dest.left+dest.width/2+(i-3)*8}px,${dest.top}px) scale(.5)`,opacity:0}],{duration:850,delay:i*45,easing:'ease-in-out'});
      anim.finished.then(()=>node.remove()).catch(()=>node.remove());
    }
    meter.animate([{filter:'brightness(1)'},{filter:'brightness(2.5)'},{filter:'brightness(1)'}],{duration:1200});
  }
  const badge=document.createElement('span'); badge.className='offering-xp'; badge.textContent=`＋${xp} XP${after.level>before.level?' ｜ LEVEL UP!':''}`;
  badge.style.left=`${Math.max(8,Math.min(dest.left,innerWidth-240))}px`; badge.style.top=`${Math.max(8,dest.top-34)}px`;
  badge.setAttribute('role','status'); document.body.append(badge); setTimeout(()=>badge.remove(),1800);
}
