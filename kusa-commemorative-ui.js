import {confirmAction} from './kusa-action-ui.js';

const MEDAL_ID='all-card-refinement', COST=5000;
const $=id=>document.getElementById(id);
const asset=name=>new URL(`kusa-medal/models/commemorative-display/${name}`,document.baseURI).href;
const format=n=>Number(n||0).toLocaleString('ja-JP');
let libraryPromise;
function library() {
  if(globalThis.KusaCommemorativeRenderer)return Promise.resolve(globalThis.KusaCommemorativeRenderer);
  if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=new URL('kusa-medal/commemorative-renderer.bundle.js?v=20261009profilefix',document.baseURI).href;
    const timer=setTimeout(()=>fail(),45000);
    function fail(){clearTimeout(timer);script.remove();libraryPromise=null;reject(new Error('3D表示を読み込めません。通信を確認して再試行してください。'));}
    script.onerror=fail;
    script.onload=()=>{clearTimeout(timer);script.remove();if(globalThis.KusaCommemorativeRenderer)resolve(globalThis.KusaCommemorativeRenderer);else fail();};
    document.head.append(script);
  });
  return libraryPromise;
}

// Serialize minting across tabs, including HTTP/file previews without Web Locks.
function mintLock(action) {
  if(navigator.locks?.request)return navigator.locks.request('kusa-commemorative-mint',action);
  return new Promise((resolve,reject)=>{
    let abandoned=false;
    const request=indexedDB.open('kusaCommemorativeLocksV1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('locks');
    request.onerror=()=>reject(new Error('保存の安全確認ができません。別のタブを閉じて再試行してください。'));
    request.onblocked=()=>{abandoned=true;reject(new Error('ほかのタブを閉じて再試行してください。'));};
    request.onsuccess=()=>{
      if(abandoned){request.result.close();return;}
      const db=request.result, tx=db.transaction('locks','readwrite');let result;
      const store=tx.objectStore('locks');
      store.get('mint').onsuccess=()=>{try{result=action();store.put(Date.now(),'mint');}catch(error){tx.abort();reject(error);}};
      tx.oncomplete=()=>{db.close();resolve(result);};
      tx.onabort=()=>{db.close();if(result?.ok)resolve(result);else reject(new Error('保存の安全確認に失敗しました。'));};
    };
  });
}

export function createCommemorativeUI(save,{refresh}) {
  const open=$('commemorativeMedalOpen'),preview=$('profileDisplayedMedal'),modal=$('commemorativeMedalModal');
  const close=$('commemorativeMedalClose'),summary=$('commemorativeMedalSummary'),list=$('commemorativeMedalList');
  const notice=document.createElement('p');notice.className='commemorative-notice';notice.setAttribute('role','status');list.after(notice);
  const viewer=document.createElement('dialog');viewer.id='commemorativeViewer';viewer.className='commemorative-viewer';
  viewer.setAttribute('aria-labelledby','commemorativeViewerTitle');
  viewer.innerHTML='<header><div><small>KUSA COMMEMORATIVE MEDAL</small><h2 id="commemorativeViewerTitle">全カード加工記念</h2></div><button type="button" data-viewer-close aria-label="鑑賞を閉じる">×</button></header><div class="commemorative-viewer-stage"><div class="commemorative-viewer-viewport"></div><div class="commemorative-viewer-loading" role="status"><p></p><button type="button" data-viewer-retry hidden>再試行</button></div></div><div class="commemorative-viewer-controls"><button type="button" data-viewer-reset>カメラをリセット</button><button type="button" data-viewer-auto aria-pressed="false">自動回転 OFF</button></div><p class="commemorative-viewer-help">ドラッグ：360°回転 ／ ホイール：拡大・縮小 ／ 右ドラッグ：位置移動<br>スマホ：1本指で回転、2本指で拡大・縮小・位置移動</p><dl class="commemorative-viewer-metadata"><div><dt>作成時のプレイヤー名</dt><dd data-medal-name></dd></div><div><dt>取得日（日本時間）</dt><dd data-medal-date></dd></div><div><dt>シリアル番号</dt><dd data-medal-serial></dd></div></dl><p class="commemorative-viewer-note">刻印は作成時の記録です。後から名前を変えても刻印は変わりません。</p>';
  document.body.append(viewer);
  const viewport=viewer.querySelector('.commemorative-viewer-viewport'),loading=viewer.querySelector('.commemorative-viewer-loading');
  const retry=viewer.querySelector('[data-viewer-retry]'),auto=viewer.querySelector('[data-viewer-auto]');
  let renderer=null, rendererPromise=null, busy=false, activePlayer='', activeRecord=null, listSignature='', profileSignature='', task=0, returnFocus=null;
  function message(text){notice.textContent=text;}
  async function ensureRenderer() {
    if(renderer?.lost||renderer?.canvas.hidden)discardRenderer();
    if(renderer)return renderer;
    if(!rendererPromise)rendererPromise=library().then(api=>{
      renderer=new api.CommemorativeRenderer();
      const instance=renderer;
      instance.onError=error=>{if(renderer!==instance)return;if(viewer.open){loading.hidden=false;loading.querySelector('p').textContent=error.message;retry.hidden=false;}else{preview.title=error.message;const img=preview.querySelector('img');if(img)img.hidden=false;instance.canvas.hidden=true;instance.setAuto(false);}};
      return renderer;
    }).finally(()=>{rendererPromise=null;});
    return rendererPromise;
  }
  function discardRenderer(){renderer?.dispose();renderer=null;profileSignature='';}
  function poster(host){const img=document.createElement('img');img.src=asset('medal-front.png?v=20261008b');img.alt='全カード加工記念メダル・正面';img.className='commemorative-poster';host.append(img);}
  function syncProfile(account,force=false) {
    if(viewer.open)return;
    const record=account.commemorativeMedals?.[account.displayedCommemorativeMedal];
    const owned=account.commemorativeMedals?.[MEDAL_ID];
    const sig=JSON.stringify([activePlayer,record||null,owned||null]);
    if(!force&&sig===profileSignature)return;
    profileSignature=sig;const current=++task;
    renderer?.detach();if(renderer)renderer.generation++;
    preview.replaceChildren();preview.classList.toggle('is-displayed',Boolean(record));
    open.title=record?'表示中の記念メダルとコレクションを開く':'記念メダルの条件・コレクションを開く';
    if(!record){preview.textContent='?';return;}
    poster(preview);
    ensureRenderer().then(async r=>{
      if(current!==task||viewer.open)return;
      await r.setRecord(record,'profile');
      if(current!==task||viewer.open)return;
      // Displaying a medal explicitly opts into its slow profile rotation.
      r.setAuto(true,{allowReducedMotion:true});r.attach(preview,'profile');
      const img=preview.querySelector('img');if(img)img.hidden=true;
    }).catch(error=>{if(current===task)preview.title=error.message;});
  }
  function render(account) {
    const playerId=save.selectedPlayerId;
    if(activePlayer!==playerId){activePlayer=playerId;++task;if(renderer){renderer.generation++;renderer.detach();}if(viewer.open)viewer.close();activeRecord=null;profileSignature='';notice.textContent='';}
    const ids=[...new Set((globalThis.KusaGachaInventory?.listAllCards?.()||[]).map(card=>card.id).filter(Boolean))];
    const current=ids.filter(id=>account.refinements?.[id]?.length>0).length,achieved=ids.length>0&&current===ids.length;
    const record=account.commemorativeMedals?.[MEDAL_ID];
    summary.textContent=`鋳造済み：${record?1:0} / 1`;
    const sig=JSON.stringify([playerId,current,ids.length,Boolean(account.chips>=COST),record,account.displayedCommemorativeMedal,busy]);
    if(sig!==listSignature){
      listSignature=sig;list.replaceChildren();
      const card=document.createElement('article');card.className=`commemorative-medal-card${record?' is-minted':''}`;
      const token=document.createElement('div');token.className=`commemorative-medal-token ${record?'is-real':'is-locked'}`;
      if(record)poster(token);else{token.textContent='?';token.setAttribute('aria-label','未取得。デザインはメダル作成後に公開されます。');}
      const body=document.createElement('div'),title=document.createElement('h3'),description=document.createElement('p');
      title.textContent='全カード加工記念';description.textContent=`現在の図鑑にある全${format(ids.length)}種類のカードを、一度以上加工する。`;
      const progress=document.createElement('div');progress.className='commemorative-medal-progress';
      const label=document.createElement('span');label.textContent='加工済みカード';
      const value=document.createElement('strong');value.textContent=`${format(current)} / ${format(ids.length)}`;
      const meter=document.createElement('progress');meter.max=Math.max(1,ids.length);meter.value=current;progress.append(label,value,meter);
      const status=document.createElement('p');status.className='commemorative-medal-status';
      const actions=document.createElement('div');actions.className='commemorative-medal-actions';
      function button(label,key){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset[key]=MEDAL_ID;actions.append(b);return b;}
      if(record){
        status.textContent=`鋳造済み　${record.playerNameAtMint} ／ ${record.mintedDate} ／ ${record.serialNumber}`;
        button(account.displayedCommemorativeMedal===MEDAL_ID?'プロフィール表示を外す':'プロフィールに表示','commemorativeDisplay');
        button('3Dで鑑賞する','commemorativeView');
      }else{
        status.textContent=achieved?`条件達成！ ${format(COST)} KUSAチップで作成できます。`:'未達成：全カードを加工すると、作成ボタンが表示されます。';
        if(achieved){const b=button(busy?'作成を準備中…':`メダルを作成する（${format(COST)}チップ）`,'commemorativeMint');b.disabled=busy||!playerId||account.chips<COST;}
      }
      body.append(title,description,progress,status,actions);card.append(token,body);list.append(card);
    }
    syncProfile(account);
  }
  function closeMenu(){modal.hidden=true;open.focus();}
  open.addEventListener('click',()=>{message('');render(save.reload());modal.hidden=false;close.focus();});
  close.addEventListener('click',closeMenu);
  modal.addEventListener('click',e=>{if(e.target===modal)closeMenu();});
  // Collection is a legacy section dialog; trap focus and restore its entry point.
  window.addEventListener('keydown',e=>{
    if(modal.hidden||viewer.open||document.querySelector('.kusa-action-dialog[open]'))return;
    if(e.key==='Escape'){e.preventDefault();closeMenu();}
    if(e.key==='Tab'){const buttons=[...modal.querySelectorAll('button:not(:disabled)')];const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  });
  async function showRecord(record,origin) {
    activeRecord={...record};returnFocus=origin||document.activeElement;
    if(!viewer.open)viewer.showModal();
    viewer.querySelector('[data-medal-name]').textContent=record.playerNameAtMint;
    viewer.querySelector('[data-medal-date]').textContent=record.mintedDate;
    viewer.querySelector('[data-medal-serial]').textContent=record.serialNumber;
    viewer.querySelector('[data-viewer-close]').focus();
    await loadDetail();
  }
  async function loadDetail() {
    if(!viewer.open||!activeRecord)return;
    const current=++task,record=activeRecord;
    renderer?.detach();if(renderer)renderer.generation++;
    const posterImage=preview.querySelector('img');if(posterImage)posterImage.hidden=false;
    loading.hidden=false;retry.hidden=true;loading.querySelector('p').textContent='高精細メダルを読み込んでいます…';
    try{
      const r=await ensureRenderer();if(current!==task||!viewer.open)return;
      await r.setRecord(record,'detail');if(current!==task||!viewer.open)return;
      r.setAuto(false);auto.setAttribute('aria-pressed','false');auto.textContent='自動回転 OFF';
      r.attach(viewport,'detail');loading.hidden=true;
    }catch(error){if(current===task){loading.querySelector('p').textContent=error.message||'3D表示を読み込めません。';retry.hidden=false;}}
  }
  viewer.querySelector('[data-viewer-close]').addEventListener('click',()=>viewer.close());
  viewer.addEventListener('click',e=>{if(e.target===viewer){const box=viewer.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)viewer.close();}});
  viewer.addEventListener('close',()=>{++task;if(renderer){renderer.generation++;renderer.detach();}activeRecord=null;syncProfile(save.getAccount(),true);if(returnFocus?.isConnected)returnFocus.focus();else if(!modal.hidden)close.focus();else open.focus();});
  viewer.querySelector('[data-viewer-reset]').addEventListener('click',()=>{renderer?.reset();});
  auto.addEventListener('click',()=>{if(!renderer?.coin)return;renderer.setAuto(!renderer.autoRotate);auto.setAttribute('aria-pressed',String(renderer.autoRotate));auto.textContent=`自動回転 ${renderer.autoRotate?'ON':'OFF'}`;});
  retry.addEventListener('click',()=>{discardRenderer();loadDetail();});
  list.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.commemorativeView){const record=save.reload().commemorativeMedals[MEDAL_ID];if(record)await showRecord(record,b);return;}
    if(b.dataset.commemorativeDisplay){const account=save.reload();const result=save.setDisplayedCommemorativeMedal(account.displayedCommemorativeMedal===MEDAL_ID?'':MEDAL_ID);message(result.ok?'プロフィールの表示を変更しました。':'表示設定を保存できませんでした。');refresh();return;}
    if(!b.dataset.commemorativeMint||busy)return;
    busy=true;const playerId=save.selectedPlayerId;message('3D表示と保存の準備を確認しています…');render(save.getAccount());
    try{
      await ensureRenderer();await (await library()).prepare();
      if(save.selectedPlayerId!==playerId)return;
      message('');
      const agreed=await confirmAction({title:'記念メダルを作成',expectedPlayerId:playerId,lines:['全カード加工記念','消費：5,000 KUSAチップ',`刻印する名前：${save.getPlayer()?.name||''}`,'取得日（日本時間）とランダムなシリアル番号を裏面に刻印します。作成後の刻印は変更できません。'],action:'メダルを作成する'});
      if(!agreed)return;
      const result=await mintLock(()=>save.mintCommemorativeMedal(MEDAL_ID,COST,{expectedPlayerId:playerId}));
      if(!result.ok){const errors={player:'プレイヤーが変更されたため中止しました。',condition:'全カード加工の条件を満たしていません。',chips:'KUSAチップが足りません。',minted:'すでに作成済みです。追加のチップは消費していません。',random:'安全な乱数を生成できません。別のブラウザでお試しください。',save:'保存できないため、チップを消費していません。'};message(errors[result.reason]||'メダルを作成できませんでした。');return;}
      message('記念メダルを作成しました。');refresh();
      if(save.selectedPlayerId===playerId)await showRecord(result.medal,close);
    }catch(error){message(error.message||'作成を中止しました。通信・保存設定を確認してください。');}
    finally{busy=false;refresh();}
  });
  globalThis.KusaCommemorativeUI={render};
  return {render};
}
