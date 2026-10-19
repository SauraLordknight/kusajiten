import {MedalSave} from './kusa-medal/medal-save.js?v=20261007a';
import {confirmAction} from './kusa-action-ui.js';
import {cardCapsuleReward} from './kusa-medal/medal-capsule-economy.js';

export const DISMANTLE = {N:[5,0],R:[10,0],SR:[25,1],SSR:[60,2],UR:[150,5],GODR:[400,15],'Ω':[400,15]};
// Same capsule benefit => same crafting fee, including the highest two rarities.
export const PROCESS_CHIPS={N:120,R:120,SR:350,SSR:700,UR:1200,GODR:2200,'Ω':2200};
export const AWAKEN_CHIPS={N:500,R:500,SR:1000,SSR:1500,UR:2000,GODR:2000,'Ω':2000};
export function effectFor(card,account={}) {
  return cardCapsuleReward(card,account).label;
}
export function workshopAction(save, card, action) {
  save.reload();
  const inventory=globalThis.KusaGachaInventory;
  const current=inventory?.getCard(card?.id);
  if (!current || current.favorite) return {ok:false,message:'保護中のカードは使えません。'};
  const account=save.getAccount();
  const processed=(account.refinements[card.id]||[]).length>0;
  const amount=action==='awaken'?3:1;
  if (globalThis.KusaCardCounts.compare(current.usable,amount)<0) return {ok:false,message:`ダブりが${amount}枚必要です。最初の1枚は残ります。`};
  if (action==='process' && processed) return {ok:false,message:'すでに加工済みです。'};
  if (action==='awaken' && (!processed || account.awakenedCards[card.id])) return {ok:false,message:'加工済み・未覚醒カードを選んでください。'};
  const chips=action==='process'?(PROCESS_CHIPS[card.rarity]||120):action==='awaken'?(AWAKEN_CHIPS[card.rarity]||2000):0;
  const material=action==='process'?10:action==='awaken'?100:0;
  const byproduct=action==='awaken'?5:0;
  if(account.chips<chips || account.cardMaterials<material || account.cardByproducts<byproduct) return {ok:false,message:'チップまたは素材が足りません。'};
  const result=save.updateAccount(next=>{
    next.chips=KusaAmounts.sub(next.chips,chips); next.cardMaterials=KusaAmounts.sub(next.cardMaterials,material); next.cardByproducts=KusaAmounts.sub(next.cardByproducts,byproduct);
    if(action==='dismantle') { const gains=DISMANTLE[card.rarity]||[5,0]; next.cardMaterials=KusaAmounts.add(next.cardMaterials,gains[0]);next.cardByproducts=KusaAmounts.add(next.cardByproducts,gains[1]); }
    if(action==='process') {const date=new Date().toISOString();next.refinements[card.id]=['真鍮プレート'];next.cardProcessedAt[card.id]=date;next.cardProcessedDates||={};next.cardProcessedDates[card.id]||={};next.cardProcessedDates[card.id]['真鍮プレート']=date;next.totalRefinements++;}
    if(action==='awaken') next.awakenedCards[card.id]=new Date().toISOString();
    if(globalThis.KusaAnimatedCards?.has(card.id)&&(action==='process'||action==='awaken'))next.cardDisplayModes[card.id]=action==='awaken'?'awakened':'processed';
  });
  if(!result.ok) return {ok:false,message:'保存できませんでした。'};
  if(!inventory.consumeDuplicate(card.id,amount)) {
    save.updateAccount(next=>Object.assign(next,account));
    return {ok:false,message:'カードを消費できなかったため処理を取り消しました。'};
  }
  return {ok:true,message:action==='dismantle'?'草刻片・鋳造片を獲得しました。':action==='process'?(globalThis.KusaAnimatedCards?.has(card.id)?'カードの加工が完成しました。':'真鍮プレート加工が完成しました。'):'覚醒しました。'};
}

const select=globalThis.document?.getElementById('workshopCard');
if(select) {
  const save=new MedalSave();
  let activeDetailId='';
  const displayStyles=new Map();
  let animating=false, animationGeneration=0;
  const materialCount=document.getElementById('workshopMaterialCount'),byproductCount=document.getElementById('workshopByproductCount');
  const detailPanel=document.querySelector('#gachaDetailModal .detail-panel');
  const tabs=document.createElement('div');tabs.className='card-display-tabs';
  const metadata=document.createElement('p');metadata.className='card-process-metadata';
  detailPanel.append(tabs,metadata);
  const workshopModes=document.createElement('div');workshopModes.className='kusa-profile-actions workshop-mode-tabs';workshopModes.setAttribute('role','group');workshopModes.setAttribute('aria-label','カード工房の作業を選ぶ');
  let workshopMode='process';
  for(const [value,label] of [['process','カード加工'],['awaken','カード覚醒'],['dismantle','素材を集める']]){
    const button=document.createElement('button');button.type='button';button.dataset.workshopMode=value;button.textContent=label;
    button.addEventListener('click',()=>{workshopMode=value;render();});workshopModes.append(button);
  }
  select.previousElementSibling.before(workshopModes);
  const workshopHeading=document.createElement('h4');workshopHeading.id='workshopModeTitle';workshopModes.after(workshopHeading);
  const workshopHelp=document.createElement('p');workshopHelp.id='workshopModeHelp';workshopHeading.after(workshopHelp);
  function displayedStyle(id,a){
    const styles=a.refinements[id]||[];
    const selected=displayStyles.get(`${save.selectedPlayerId}:${id}`)||a.cardDisplayStyles?.[id];
    return styles.includes(selected)?selected:styles.includes('真鍮プレート')?'真鍮プレート':styles[styles.length-1]||'';
  }
  function paintCard(node,id,a){
    const processed=!!a.refinements[id]?.length;
    const animated=globalThis.KusaAnimatedCards?.has(id);
    const mode=animated?globalThis.KusaAnimatedCards.mode(id,a):a.cardDisplayModes[id];
    const show=processed&&mode!=='normal';
    node.classList.toggle('is-processed',show);node.classList.toggle('is-awakened',show&&!!a.awakenedCards[id]&&(!animated||mode==='awakened'));
    node.dataset.processed=processed?'true':'false';
    node.dataset.refinementStyle=show?displayedStyle(id,a):'';
    globalThis.KusaAnimatedCards?.paint(node,id,a);
  }
  function renderDetail(a){
    if(!activeDetailId)return;
    const id=activeDetailId,processed=!!a.refinements[id]?.length;
    paintCard(detailPanel,id,a);tabs.replaceChildren();tabs.hidden=!processed;metadata.hidden=!processed||a.cardDisplayModes[id]==='normal';
    if(globalThis.KusaAnimatedCards?.has(id)){
      const mode=globalThis.KusaAnimatedCards.mode(id,a);
      tabs.hidden=false;
      for(const [value,label,unlocked] of [['normal','通常',true],['processed','加工',processed],['awakened','覚醒',processed&&!!a.awakenedCards[id]]]){
        const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=!unlocked;b.dataset.cardDisplayMode=value;
        b.setAttribute('aria-pressed',String(mode===value));
        if(!unlocked)b.title=value==='processed'?'カードを加工すると解放されます':'加工済みカードを覚醒すると解放されます';
        b.addEventListener('click',()=>{save.reload();save.updateAccount(next=>{next.cardDisplayModes[id]=value;});renderSignature='';render();});tabs.append(b);
      }
      metadata.hidden=mode==='normal';
      const date=mode==='awakened'?a.awakenedCards[id]:a.cardProcessedAt[id];
      const valid=date&&!Number.isNaN(new Date(date).getTime());
      metadata.textContent=`${mode==='awakened'?'覚醒日':'加工日'} ${valid?new Date(date).toLocaleDateString('ja-JP'):'記録なし'}`;
      return;
    }
    if(processed){
      const style=displayedStyle(id,a);
      for(const [mode,label] of [['normal','通常'],...a.refinements[id].map(style=>['processed',style])]){
        const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.cardDisplayMode=mode;
        b.setAttribute('aria-pressed',String((a.cardDisplayModes[id]||'processed')===mode&&(mode==='normal'||style===label)));
        b.addEventListener('click',()=>{if(mode==='processed')displayStyles.set(`${save.selectedPlayerId}:${id}`,label);save.reload();save.updateAccount(next=>{next.cardDisplayModes[id]=mode;if(mode==='processed'){next.cardDisplayStyles||={};next.cardDisplayStyles[id]=label;}});renderSignature='';render();});tabs.append(b);
      }
      const dates=a.cardProcessedDates?.[id];
      const date=dates?.[style]||(!dates||!Object.keys(dates).length?a.cardProcessedAt[id]:null);
      const validDate=date&&!Number.isNaN(new Date(date).getTime());
      metadata.textContent=`${style} ｜ 加工日 ${validDate?new Date(date).toLocaleDateString('ja-JP'):'記録なし'}`;
    }
  }
  function animateMaterials(before,after,origin){
    const generation=++animationGeneration;animating=true;
    document.querySelectorAll('.workshop-flying-material').forEach(n=>n.remove());
    const start=origin.getBoundingClientRect();
    for(const [key,countNode,boxId,icon] of [['cardMaterials',materialCount,'workshopMaterialBox','🌿'],['cardByproducts',byproductCount,'workshopByproductBox','⚙️']]){
      const gain=after[key]-before[key];if(gain<=0)continue;
      const box=document.getElementById(boxId),dest=box.getBoundingClientRect();
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      for(let i=0;i<(reduced?0:Math.min(10,Math.max(3,gain)));i++){
        const particle=document.createElement('span');particle.className='workshop-flying-material';particle.textContent=icon;document.body.append(particle);
        const x=start.left+start.width/2,y=start.top+start.height/2;
        const animation=particle.animate([{transform:`translate(${x}px,${y}px) scale(1)`,opacity:1},{transform:`translate(${x+(i-4)*12}px,${y-45}px) scale(1.3)`,opacity:1,offset:.3},{transform:`translate(${dest.left+dest.width/2}px,${dest.top+dest.height/2}px) scale(.4)`,opacity:0}],{duration:800,delay:i*22,easing:'ease-in-out'});
        animation.finished.then(()=>particle.remove()).catch(()=>particle.remove());
      }
      const badge=document.createElement('span');badge.className='workshop-material-gain';badge.textContent=`＋${gain}`;box.append(badge);setTimeout(()=>badge.remove(),1200);
      box.animate([{filter:'brightness(1)'},{filter:'brightness(1.8)'},{filter:'brightness(1)'}],{duration:1000});
      countNode.textContent=before[key].toLocaleString('ja-JP');
    }
    const started=performance.now();
    function tick(now){
      if(generation!==animationGeneration)return;
      const t=Math.min(1,(now-started)/1000);
      const latest=save.reload();
      materialCount.textContent=KusaAmounts.format(KusaAmounts.add(before.cardMaterials,Math.round(Number(KusaAmounts.sub(latest.cardMaterials,before.cardMaterials))*t)));
      byproductCount.textContent=KusaAmounts.format(KusaAmounts.add(before.cardByproducts,Math.round(Number(KusaAmounts.sub(latest.cardByproducts,before.cardByproducts))*t)));
      if(t<1)requestAnimationFrame(tick);else{animating=false;render();}
    }
    requestAnimationFrame(tick);
  }
  const summary=document.getElementById('workshopSummary'), detail=document.getElementById('workshopDetail'), message=document.getElementById('workshopMessage');
  let renderSignature = '';
  let renderedPlayerId = save.selectedPlayerId;
  function render(){
    save.reload();const a=save.getAccount();
    if(renderedPlayerId!==save.selectedPlayerId){
      renderedPlayerId=save.selectedPlayerId;activeDetailId='';animationGeneration++;animating=false;displayStyles.clear();renderSignature='';message.textContent='';select.value='';delete select.dataset.inventorySignature;
      document.querySelectorAll('.workshop-flying-material,.workshop-material-gain').forEach(node=>node.remove());
      tabs.replaceChildren();tabs.hidden=true;metadata.textContent='';metadata.hidden=true;
      if(!document.getElementById('gachaDetailModal').hidden)document.getElementById('gachaDetailClose').click();
    }
    const cards=globalThis.KusaGachaInventory?.listAllCards?.()||[];
    const owned=cards.map(c=>globalThis.KusaGachaInventory.getCard(c.id)).filter(c=>globalThis.KusaCardCounts.compare(c?.count,0)>0);
    const signature=JSON.stringify([save.selectedPlayerId,owned.map(c=>[c.id,c.count,c.usable,c.favorite])]);
    const viewSignature=JSON.stringify([signature,select.value,workshopMode,a.cardMaterials,a.cardByproducts,a.chips,a.refinements,a.awakenedCards,a.cardDisplayModes,a.cardDisplayStyles,a.cardProcessedAt,a.cardProcessedDates,activeDetailId]);
    if(renderSignature===viewSignature)return;
    renderSignature=viewSignature;
    if(select.dataset.inventorySignature!==signature){
      const previous=select.value;select.replaceChildren();
      owned.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=`${c.favorite?'★ 保護中 ':''}[${c.rarity}] ${c.title} ｜ ダブり ${globalThis.KusaCardCounts.format(c.usable)}枚`;select.append(o);});
      if(!owned.length){const o=document.createElement('option');o.value='';o.textContent='所持カードがありません';select.append(o);}
      select.value=owned.some(c=>c.id===previous)?previous:owned[0]?.id||'';
      select.dataset.inventorySignature=signature;
    }
    const processed=cards.filter(c=>(a.refinements[c.id]||[]).length).length;
    summary.textContent=`全カード加工記念：${processed} / ${cards.length}`;
    if(!animating){materialCount.textContent=KusaAmounts.format(a.cardMaterials);byproductCount.textContent=KusaAmounts.format(a.cardByproducts);}
    const c=globalThis.KusaGachaInventory?.getCard(select.value);
    workshopModes.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.workshopMode===workshopMode)));
    workshopHeading.textContent=workshopMode==='process'?'カードを加工する':workshopMode==='awaken'?'加工済みカードを覚醒する':'ダブりカードを素材に分解する';
    workshopHelp.textContent=workshopMode==='process'?'ダブり1枚と草刻片・チップで加工します。所持カードはダブりがなくても一覧で確認できます。':workshopMode==='awaken'?'加工済みカードのダブり3枚と素材・チップで覚醒します。': 'ダブり1枚から草刻片や鋳造片を作ります。図鑑用の最初の1枚は残ります。';
    const requirements=document.getElementById('workshopRequirements');requirements.replaceChildren();requirements.hidden=!c;
    if(c){
      const processed=!!a.refinements[c.id]?.length;
      const awakening=workshopMode==='awaken';
      const notice=c.favorite?'保護中です。育成・奉納でカード保護を解除すると使用できます。':workshopMode==='process'&&processed?'このカードは加工済みです。「カード覚醒」へ進めます。':awakening&&!processed?'先に「カード加工」で加工してください。':awakening&&a.awakenedCards[c.id]?'このカードは覚醒済みです。':'';
      if(notice){const row=document.createElement('p');row.textContent=notice;row.className='is-short';requirements.append(row);}
      if(workshopMode!=='dismantle'){
        const heading=document.createElement('strong');heading.textContent=awakening?'覚醒に必要なもの':globalThis.KusaAnimatedCards?.has(c.id)?'カード加工に必要なもの':'真鍮プレート加工に必要なもの';requirements.append(heading);
        [[`同じカードのダブり`,awakening?3:1,c.usable],['草刻片',awakening?100:10,a.cardMaterials],['鋳造片',awakening?5:0,a.cardByproducts],['KUSAチップ',awakening?AWAKEN_CHIPS[c.rarity]||2000:PROCESS_CHIPS[c.rarity]||120,a.chips]].filter(([,need])=>need>0).forEach(([name,need,owned])=>{const row=document.createElement('p');row.textContent=`${name}：必要 ${need.toLocaleString('ja-JP')} ／ 所持 ${globalThis.KusaCardCounts.format(owned)}${globalThis.KusaCardCounts.compare(owned,need)<0?'（不足）':' ✓'}`;row.className=globalThis.KusaCardCounts.compare(owned,need)<0?'is-short':'';requirements.append(row);});
      }
      if(workshopMode==='dismantle'){const gains=DISMANTLE[c.rarity]||[5,0];const reward=document.createElement('p');reward.textContent=`分解：ダブり1枚 → 草刻片 ${gains[0]}個${gains[1]?` ＋ 鋳造片 ${gains[1]}個`:''}（チップ不要）${globalThis.KusaCardCounts.compare(c.usable,1)<0?'。ダブりが1枚不足しています。':''}`;requirements.append(reward);}
    }
    detail.textContent=c?`${a.awakenedCards[c.id]?'覚醒済み':a.refinements[c.id]?.length?'加工済み':'未加工'} ｜ ダブり ${globalThis.KusaCardCounts.format(c.usable)}枚 ｜ 使用効果：${effectFor(c,a)}`:'所持カードがありません。草ガチャでカードを集めてください。';
    document.querySelectorAll('[data-workshop-action]').forEach(b=>{const action=b.dataset.workshopAction;b.textContent=action==='process'?(globalThis.KusaAnimatedCards?.has(c?.id)?'カードを加工する':'真鍮プレート加工'):action==='awaken'?'覚醒する':'ダブり1枚を分解';b.disabled=!c||c.favorite||(globalThis.KusaCardCounts.compare(c.usable,action==='awaken'?3:1)<0)||(action==='process'&&(!!a.refinements[c?.id]?.length||a.cardMaterials<10||a.chips<(PROCESS_CHIPS[c?.rarity]||120)))||(action==='awaken'&&(!a.refinements[c?.id]?.length||!!a.awakenedCards[c?.id]||a.cardMaterials<100||a.cardByproducts<5||a.chips<(AWAKEN_CHIPS[c?.rarity]||2000)));b.hidden=action!==workshopMode;});
    document.querySelectorAll('[data-card-id]').forEach(node=>paintCard(node,node.dataset.cardId,a));
    renderDetail(a);
  }
  select.addEventListener('change',render);
  document.querySelectorAll('[data-workshop-action]').forEach(b=>b.addEventListener('click',async()=>{
    const c=globalThis.KusaGachaInventory?.getCard(select.value);if(!c)return;
    const action=b.dataset.workshopAction,gains=DISMANTLE[c.rarity]||[5,0];
    const cost=action==='dismantle'?'消費：ダブりカード 1枚':action==='process'?`消費：ダブり1枚・草刻片10個・${PROCESS_CHIPS[c.rarity]||120}チップ`:`消費：ダブり3枚・草刻片100個・鋳造片5個・${(AWAKEN_CHIPS[c.rarity]||2000).toLocaleString('ja-JP')}チップ`;
    const reward=action==='dismantle'?`獲得：草刻片 ${gains[0]}個${gains[1]?`・鋳造片 ${gains[1]}個`:''}`:action==='process'?(globalThis.KusaAnimatedCards?.has(c.id)?'獲得：カード加工':'獲得：真鍮プレート加工'):'獲得：カード覚醒';
    if(!await confirmAction({title:b.textContent,lines:[`${c.emoji} ${c.title}（${c.rarity}）`,cost,reward,'最初の1枚は残ります。実行後は取り消せません。'],action:b.textContent}))return;
    const before=save.reload();const result=workshopAction(save,c,action);message.textContent=result.message;render();if(result.ok&&action==='dismantle')animateMaterials(before,save.reload(),b);
  }));
  window.addEventListener('kusa-card-detail-open',e=>{activeDetailId=e.detail.cardId;renderDetail(save.reload());});
  window.addEventListener('kusa-gacha-book-rendered',()=>{renderSignature='';render();});
  ['kusa-gacha-inventory-changed','kusa-medal-save-changed','kusa-player-changed'].forEach(e=>window.addEventListener(e,render));
  window.addEventListener('storage',event=>{if(['kusaPlayerStoreV1','kusaMedalSaveV1','kusaGachaStateV1'].includes(event.key)){globalThis.KusaPlayerStore?.refresh?.();render();}});
  render();
}
