import {MedalSave} from './kusa-medal/medal-save.js';
import {confirmAction} from './kusa-action-ui.js';
import {FORTUNE_KEY,AURORA_KEY,purchaseFortuneKey,useFortuneKey,fortuneStatus,auroraStatus,useAuroraKey} from './kusa-fortune-economy.js';
import {CAPSULES,CAPSULE_EDITIONS,SHOP_ITEMS,SHOP_SKINS,capsuleTotal,japanDay,economyLock,openCapsules,purchaseSupply,craftSkin,equipSkin,skinOwned} from './kusa-medal/medal-capsule-economy.js';

globalThis.KusaEconomyLock=economyLock;
const save=new MedalSave(),$=id=>document.getElementById(id),fmt=n=>KusaAmounts.format(n || 0);
const shop=$('kusaShopDialog'),opening=$('capsuleOpenDialog'),list=$('capsuleInventoryList');
let tab='supplies',busy=false,selected=null,playerId=save.selectedPlayerId,lastSummary='';
let inventorySignature='',shopSignature='';
let inventoryFilter='owned';
const fortuneBanner=node('p',undefined,'fortune-status');fortuneBanner.id='fortuneStatus';fortuneBanner.setAttribute('role','status');
$('kusaProfile').append(fortuneBanner);
const cabinetFortune=node('p',undefined,'fortune-status fortune-cabinet-status');$('pachiGame').prepend(cabinetFortune);
const auroraBanner=node('p',undefined,'fortune-status aurora-status');auroraBanner.id='auroraStatus';auroraBanner.setAttribute('role','status');$('kusaProfile').append(auroraBanner);
const revealBanner=node('p',undefined,'fortune-status');revealBanner.id='settingRevealStatus';$('kusaProfile').append(revealBanner);
const cabinetReveal=node('p',undefined,'fortune-status fortune-cabinet-status');$('pachiGame').prepend(cabinetReveal);
const cabinetAurora=node('p',undefined,'fortune-status fortune-cabinet-status aurora-status');$('pachiGame').prepend(cabinetAurora);
let fortuneDayTimer;
const inventoryTools=node('div',undefined,'capsule-inventory-tools');
const inventorySummary=node('span',undefined,'capsule-inventory-summary');
const inventoryFilters=node('div',undefined,'capsule-inventory-filters');
inventoryFilters.setAttribute('role','group');inventoryFilters.setAttribute('aria-label','カプセルの表示');
for(const [value,label] of [['owned','所持品のみ'],['all','すべて']]){
  const b=button(label,()=>{inventoryFilter=value;inventorySignature='';render();});b.dataset.capsuleFilter=value;inventoryFilters.append(b);
}
inventoryTools.append(inventorySummary,inventoryFilters);list.before(inventoryTools);
function node(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function button(text,action){const b=node('button',text);b.type='button';b.addEventListener('click',action);return b;}
function countdown(ms){const seconds=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds%3600/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
function show(dialog){if(!dialog.open)dialog.showModal();}
function capsuleToken(quality){const token=node('span','✦','capsule-token');token.style.setProperty('--capsule-color',CAPSULES[quality].color);token.setAttribute('aria-hidden','true');return token;}
function amount(){const max=Math.min(10000,save.getAccount().capsules[selected?.edition]?.[selected?.quality]||0);return Math.max(1,Math.min(max,Math.floor(Number($('capsuleOpenCount').value)||1)));}
function renderOpening(){
  if(!selected)return;
  const a=save.getAccount(),rule=CAPSULE_EDITIONS[selected.edition]?.[selected.quality]||CAPSULES[selected.quality],owned=a.capsules[selected.edition]?.[selected.quality]||0;
  $('capsuleOpenTitle').textContent=`${rule.name}カプセルを開封`;
  $('capsuleOpenOwned').textContent=`所持 ${fmt(owned)}個`;
  $('capsuleOpenCount').max=Math.min(10000,owned);$('capsuleOpenCount').value=amount();
  $('capsuleOpenRewards').textContent=`1個あたり：${fmt(rule.chips[0])}〜${fmt(rule.chips[1])}チップ ／ 草刻片 ${rule.materials.join('〜')}個 ／ 鋳造片 ${rule.byproducts}個 ／ 草彩片 ${rule.paint}個`;
  $('capsuleOpenConfirm').textContent=`${rule.name}カプセルを${fmt(amount())}個開封する`;
  $('capsuleOpenConfirm').disabled=busy||owned<1||!CAPSULE_EDITIONS[selected.edition]||!save.selectedPlayerId;
  document.querySelector('[data-capsule-count="all"]').textContent=owned>10000?'最大10,000個':'すべて';
}
function render(){
  save.reload();const a=save.getAccount();
  if(playerId!==save.selectedPlayerId){playerId=save.selectedPlayerId;selected=null;lastSummary='';$('shopMessage').textContent='';$('capsuleOpenResult').textContent='';$('capsuleOpenAnimation').classList.remove('is-opening');$('capsuleOpenAnimation').replaceChildren();$('capsuleAnimationSkip').hidden=true;document.querySelectorAll('.commerce-particle,.commerce-acquired').forEach(node=>node.remove());if(opening.open)opening.close();}
  $('profilePaintFragments').textContent=fmt(a.paintFragments);
  const total=capsuleTotal(a);$('profileCapsules').textContent=fmt(total);$('capsuleInventoryCount').textContent=fmt(total);
  $('shopChips').textContent=fmt(a.chips);$('shopPaint').textContent=fmt(a.paintFragments);
  document.body.dataset.kusaSiteSkin='default';
  $('kusaProfile').dataset.skin='default';
  const inventoryKey=JSON.stringify([playerId,a.capsules,busy,inventoryFilter]);
  if(inventorySignature!==inventoryKey){inventorySignature=inventoryKey;list.replaceChildren();
  inventoryFilters.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.capsuleFilter===inventoryFilter)));
  let shown=0,ownedKinds=0;
  const editions=['v2'];
  for(const edition of editions)for(const [quality,rule] of Object.entries(CAPSULES)){
    const count=a.capsules[edition]?.[quality]||0;
    if(count>0)ownedKinds++;
    if(inventoryFilter==='owned'&&!count)continue;
    shown++;
    const row=node('article',undefined,'capsule-inventory-row');
    const label=node('div');label.append(node('strong',`${rule.name}カプセル`),node('small',`${fmt(count)}個`));
    const b=button(count?'開封する':'所持なし',()=>{selected={quality,edition};$('capsuleOpenResult').textContent='';const stage=$('capsuleOpenAnimation');stage.replaceChildren(capsuleToken(quality));stage.classList.remove('is-opening');$('capsuleAnimationSkip').hidden=true;renderOpening();show(opening);});
    b.dataset.openCapsule=quality;b.dataset.capsuleEdition=edition;b.disabled=!count||busy||!CAPSULE_EDITIONS[edition];row.append(capsuleToken(quality),label,b);list.append(row);
  }
  inventorySummary.textContent=`所持 ${fmt(total)}個・${fmt(ownedKinds)}種類`;
  if(!shown)list.append(node('p','未開封カプセルはありません。獲得したカプセルはここに表示されます。','capsule-inventory-empty'));
  }
  const content=$('shopContent');
  const fortune=fortuneStatus(save,playerId);
  const aurora=auroraStatus(save,playerId);
  const spoiler=KusaPlayerStore.spoilerStatus(playerId);
  for(const b of [revealBanner,cabinetReveal]){b.hidden=!playerId||!spoiler.active;b.textContent=spoiler.active?`🔍 ネタバレで草：本日の台設定 ${spoiler.setting}（両台共通・フォーチュンキー反映済み）`:'';}
  const statusText=`🔑 フォーチュンキー発動中：本日の台設定が＋${fortune.boost}｜ 残り ${countdown(fortune.expiresAt-Date.now())}`;
  for(const banner of [fortuneBanner,cabinetFortune]){banner.hidden=!playerId||!fortune.active;banner.textContent=statusText;banner.classList.toggle('is-active',fortune.active);}
  const auroraText=`🌌 オーロラキー発動中：UR・GODR・Ωレアのみ抽選｜残り ${countdown(aurora.expiresAt-Date.now())}`;
  for(const banner of [auroraBanner,cabinetAurora]){banner.hidden=!playerId||!aurora.active;banner.textContent=auroraText;banner.classList.toggle('is-active',aurora.active);}
  const gachaAurora=$('gachaAuroraStatus');if(gachaAurora){gachaAurora.hidden=!aurora.active;gachaAurora.textContent=aurora.active?`🌌 オーロラキー発動中　UR・GODR・Ωレアのみ出現　残り ${countdown(aurora.expiresAt-Date.now())}`:'';}
  clearTimeout(fortuneDayTimer);fortuneDayTimer=setTimeout(()=>{shopSignature='';render();},Math.max(20,Math.min(2147483647,Math.min(fortune.expiresAt,aurora.expiresAt)-Date.now()+30)));
  const shopKey=JSON.stringify([playerId,tab,busy,a.chips,a.paintFragments,a.dailyShop,a.auroraKeys,a.auroraBoost,a.ownedSkins,a.equippedSkins,a.unlockedThemes,a.selectedTheme,japanDay(),fortune,aurora,spoiler,KusaPlayerStore.getSelected()?.grass]);
  if(shopSignature!==shopKey){shopSignature=shopKey;content.replaceChildren();
  document.querySelectorAll('[data-shop-tab]').forEach(b=>{const active=b.dataset.shopTab===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
  content.setAttribute('aria-labelledby',tab==='supplies'?'shopSuppliesTab':'shopSkinsTab');
  if(tab==='supplies'){
    const reveal=node('article',undefined,'shop-product');reveal.dataset.product='spoiler';
    reveal.append(node('h3','🔍 ネタバレで草'),node('p','使うと本日の台設定が分かります。草パチ・ガラスの少女共通。次の午前0時（日本時間）まで確認でき、フォーチュンキーの効果も反映します。'),node('p','草10,000／個','shop-product-cost'),node('small',`所持 ${fmt(spoiler.inventory)}個 ｜ 日本時間で1日1個まで購入${spoiler.active?' ｜ 本日の設定を確認できます':''}`));
    const revealBuy=button('購入する',async()=>{const id=save.selectedPlayerId;if(await confirmAction({title:'ネタバレで草を購入',lines:['草10,000で1個購入します。','購入後に「使う」で本日の設定を確認できます。'],action:'購入する',expectedPlayerId:id}))await run(()=>KusaPlayerStore.purchaseSpoiler(id),'ネタバレで草を1個購入しました。',true);});
    revealBuy.dataset.shopBuy='spoiler';revealBuy.disabled=busy||!playerId||spoiler.purchased||KusaAmounts.cmp(KusaPlayerStore.getSelected()?.grass||0,10000)<0;
    const revealUse=button('使う（設定を見る）',async()=>{const id=save.selectedPlayerId;if(await confirmAction({title:'ネタバレで草を使う',lines:['1個消費して本日の台設定を表示します。','次の午前0時（日本時間）まで確認できます。'],action:'使う',expectedPlayerId:id}))await run(()=>KusaPlayerStore.useSpoiler(id),'本日の設定をプロフィールと台の上部に表示しました。',true);});
    revealUse.dataset.spoilerUse='';revealUse.disabled=busy||!playerId||spoiler.active||KusaAmounts.cmp(spoiler.inventory,1)<0;
    reveal.append(revealBuy,revealUse);content.append(reveal);

    const card=node('article',undefined,'shop-product fortune-product');card.dataset.product=FORTUNE_KEY.id;
    card.append(node('h3','🔑 フォーチュンキー'),node('p','使うと本日の台設定が1段階アップ。草パチとガラスの少女の両方に有効です。効果は次の午前0時（日本時間）まで。'),node('p',`${fmt(FORTUNE_KEY.chips)}チップ／個`,'shop-product-cost'));
    const fortuneNote=node('small',`所持 ${fmt(fortune.inventory)}個 ｜ 本日使用 ${fortune.boost}/2回 ｜ 本日の購入残り ${fortune.remainingPurchases}個`);fortuneNote.dataset.fortuneCountdown='';card.append(fortuneNote);
    const buy=button('購入する',async()=>{const id=save.selectedPlayerId;if(await confirmAction({title:'フォーチュンキーを購入',lines:[`${fmt(FORTUNE_KEY.chips)}チップで1個購入します。`,'購入したキーは「使う」で発動できます。未使用のキーは翌日も残ります。'],action:'購入する',expectedPlayerId:id}))await run(()=>purchaseFortuneKey(save,id),'フォーチュンキーを1個購入しました。',true);});
    buy.dataset.shopBuy=FORTUNE_KEY.id;buy.disabled=busy||!playerId||!fortune.remainingPurchases||KusaAmounts.cmp(a.chips,FORTUNE_KEY.chips)<0;
    const use=button('キーを使う（設定＋1）',async()=>{const id=save.selectedPlayerId;if(await confirmAction({title:'フォーチュンキーを使う',lines:['台設定が1段階上がります。','次の午前0時（日本時間）まで有効。次に始まる抽選から反映します。'],action:'使う',expectedPlayerId:id}))await run(()=>useFortuneKey(save,id),'フォーチュンキー発動！ 本日の台設定が1段階上がりました。',true);});
    use.dataset.fortuneUse='';use.disabled=busy||!playerId||KusaAmounts.cmp(fortune.inventory,1)<0||fortune.remainingUses<=0;
    card.append(buy,use,node('small',fortune.remainingUses<=0?'本日はこれ以上キーを使用できません。':'キーを使うと台設定が＋1されます。'));content.append(card);
    const auroraCard=node('article',undefined,'shop-product fortune-product aurora-product');auroraCard.dataset.product=AURORA_KEY.id;
    auroraCard.append(node('h3','🌌 オーロラキー'),node('p','使用中はUR・GODR・Ωレアだけが抽選され、各レアリティの確率が均等になります。使うと次の午前0時（日本時間）まで有効です。'),node('p',`${fmt(AURORA_KEY.chips)}チップ／個`,'shop-product-cost'));
    const auroraNote=node('small',`所持 ${fmt(aurora.inventory)}個 ｜ 本日購入残り ${aurora.remainingPurchases}個${aurora.active?` ｜ 発動中 残り ${countdown(aurora.expiresAt-Date.now())}`:''}`);auroraNote.dataset.auroraCountdown='';auroraCard.append(auroraNote);
    const auroraBuy=button('購入する',async()=>{const id=save.selectedPlayerId;if(await confirmAction({title:'オーロラキーを購入',lines:[`${fmt(AURORA_KEY.chips)}チップで1個購入します。`,'使用中はUR・GODR・Ωレアが各1/3の確率で抽選されます。','日本時間で1日1個まで購入できます。'],action:'購入する',expectedPlayerId:id}))await run(()=>purchaseSupply(save,AURORA_KEY.id,id), 'オーロラキーを1個購入しました。');});
    auroraBuy.dataset.shopBuy=AURORA_KEY.id;auroraBuy.disabled=busy||!playerId||!aurora.remainingPurchases||KusaAmounts.cmp(a.chips,AURORA_KEY.chips)<0;
    const auroraUse=button('キーを使う',async()=>{const id=save.selectedPlayerId;if(await confirmAction({title:'オーロラキーを使う',lines:['UR・GODR・Ωレアが各1/3の確率で抽選されます。','効果は次の午前0時（日本時間）までです。'],action:'使う',expectedPlayerId:id}))await run(()=>useAuroraKey(save,id),'オーロラキー発動！ UR・GODR・Ωレアが各1/3で抽選されます。',true);});
    auroraUse.dataset.auroraUse='';auroraUse.disabled=busy||!playerId||aurora.active||KusaAmounts.cmp(aurora.inventory,1)<0;
    auroraCard.append(auroraBuy,auroraUse);content.append(auroraCard);
  }
  // Medal supply is a legacy game-only product. Keep the shared economy data
  // for old saves, but do not expose medal currency in the site shop.
  for(const item of tab==='supplies'?SHOP_ITEMS.filter(item=>!['charm','medals','aurora-key'].includes(item.id)):SHOP_SKINS){
    const skin=tab==='skins',owned=skin&&skinOwned(a,item),active=skin&&(item.theme?a.selectedTheme===item.theme:a.equippedSkins[item.category]===item.id);
    const card=node('article',undefined,'shop-product');card.dataset.product=item.id;
    const title=node('h3',item.name),description=node('p',item.description);
    card.append(title,description);
    if(skin){
      const preview=node('div',undefined,`shop-skin-preview ${item.category} ${item.id}`);preview.append(node('span',item.category==='cabinet'?'KUSA MEDAL PUSHER':item.category==='site'?'KUSA 事典':'KUSA PLAYER'),node('small',item.category==='cabinet'?'筐体の配色・LEDスキン':'伸縮する背景・枠・配色'));card.prepend(preview);
    }
    const cost=node('p',skin&&item.starter?'初期所持・無料':skin&&item.paint?`草彩片 ${fmt(item.paint)}個 ／ チップ ${fmt(item.chips)}`:`${fmt(item.chips)}チップ`,'shop-product-cost');
    const shortages=[];
    if(skin&&!owned){if(KusaAmounts.cmp(a.chips,item.chips)<0)shortages.push(`チップ あと${fmt(KusaAmounts.sub(item.chips,a.chips))}`);if(KusaAmounts.cmp(a.paintFragments,item.paint)<0)shortages.push(`草彩片 あと${fmt(KusaAmounts.sub(item.paint,a.paintFragments))}個`);}
    const note=node('small',skin?(owned?'永久所持済み。適用は無料です。':`常設・永久所持 ／ 所持 ${fmt(a.chips)}チップ${item.paint?`・草彩片 ${fmt(a.paintFragments)}個`:''}${shortages.length?` ／ ${shortages.join('・')}`:''}`):item.id==='paint'?`本日残り ${5-(a.dailyShop.day===japanDay()?a.dailyShop.paint:0)}回`:'購入すると所持数へ即追加');
    const label=skin?(active?'適用中':owned?'適用する':item.paint?`草彩片 ${fmt(item.paint)}個 ＋ ${fmt(item.chips)}チップで購入`:`${fmt(item.chips)}チップで購入`):'購入する';
    const b=button(label,()=>actProduct(item,skin,owned));b.dataset.shopBuy=item.id;
    b.disabled=busy||!save.selectedPlayerId||active||(!owned&&(a.chips<item.chips||(skin&&a.paintFragments<item.paint)))||(!skin&&item.id==='paint'&&a.dailyShop.day===japanDay()&&a.dailyShop.paint>=5);
    card.append(cost,note,b);content.append(card);
  }
  if(tab==='skins'&&!SHOP_SKINS.length){
    content.append(node('p','現在、販売中のデザインはありません。草彩片は今後のデザイン用に保管できます。','shop-empty'));
  }else if(tab==='skins'){
    const resets=node('div',undefined,'shop-reset-buttons');
    for(const [category,label] of [['site','kusaテーマ1']])resets.append(button(`${label}に戻す`,()=>{const id=save.selectedPlayerId;return run(()=>equipSkin(save,'default',category,id),'kusaテーマ1に戻しました。');}));
    content.append(resets);
  }
  }
  if(opening.open)renderOpening();
}
async function run(action,success,alreadyLocked=false){
  if(busy)return;const owner=save.selectedPlayerId;busy=true;render();
  try{const result=await (alreadyLocked?action():economyLock(action));if(globalThis.KusaPlayerStore?.getSelectedId()===owner)$('shopMessage').textContent=result.ok?success:result.message||'処理できませんでした。';return result;}
  catch(e){if(globalThis.KusaPlayerStore?.getSelectedId()===owner)$('shopMessage').textContent=e.message;return {ok:false,message:e.message};}
  finally{busy=false;render();}
}
async function actProduct(item,skin,owned){
  const id=save.selectedPlayerId;
  if(skin&&owned){await run(()=>equipSkin(save,item.id,item.category,id),`${item.name}を適用しました。`);return;}
  if(!await confirmAction({title:skin?'テーマを購入':'補給品を購入',lines:[item.name,item.description,`消費：${skin&&item.paint?`草彩片 ${item.paint}個・`:''}${fmt(item.chips)}チップ`,skin?'購入後は永久所持・性能差なし・適用無料です。':'購入後は取り消せません。'],action:'購入する',expectedPlayerId:id}))return;
  await run(()=>skin?craftSkin(save,item.id,id):purchaseSupply(save,item.id,id),skin?`${item.name}を購入しました。「適用する」で着せ替えできます。`:`${item.name}を購入しました。`);
}
$('kusaShopOpen').addEventListener('click',()=>{render();show(shop);});
document.querySelectorAll('[data-commerce-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.commerceClose).close()));
document.querySelectorAll('[data-shop-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.shopTab;render();document.querySelector(`[data-shop-tab="${tab}"]`).focus();}));
document.querySelector('[role="tablist"]').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();tab=e.key==='Home'?'supplies':e.key==='End'?'skins':tab==='skins'?'supplies':'skins';render();document.querySelector(`[data-shop-tab="${tab}"]`).focus();}});
document.querySelectorAll('[data-capsule-count]').forEach(b=>b.addEventListener('click',()=>{
  const owned=save.getAccount().capsules[selected?.edition]?.[selected?.quality]||0;
  $('capsuleOpenCount').value=b.dataset.capsuleCount==='all'?Math.min(10000,owned):Number(b.dataset.capsuleCount);renderOpening();
}));
$('capsuleOpenCount').addEventListener('change',renderOpening);
document.querySelectorAll('[data-capsule-adjust]').forEach(b=>b.addEventListener('click',()=>{$('capsuleOpenCount').value=amount()+Number(b.dataset.capsuleAdjust);renderOpening();}));
$('capsuleOpenCount').addEventListener('input',()=>{if(selected)$('capsuleOpenConfirm').textContent=`${CAPSULES[selected.quality].name}カプセルを${fmt(amount())}個開封する`;});
$('capsuleOpenConfirm').addEventListener('click',async()=>{
  if(busy||!selected)return;const id=save.selectedPlayerId,c={...selected},count=amount();
  const r=await run(()=>openCapsules(save,c.quality,count,id,c.edition),'カプセルを開封しました。');
  if(globalThis.KusaPlayerStore?.getSelectedId()!==id)return;
  const result=$('capsuleOpenResult');
  if(!r?.ok){result.textContent=r?.message||'開封できませんでした。';return;}
  if(save.selectedPlayerId!==id)return;
  lastSummary=`${CAPSULES[c.quality].name} ×${fmt(count)}個を開封！ チップ＋${fmt(r.rewards.chips)} ／ 草刻片＋${fmt(r.rewards.cardMaterials)} ／ 鋳造片＋${fmt(r.rewards.cardByproducts)} ／ 草彩片＋${fmt(r.rewards.paintFragments)}`;
  result.textContent=lastSummary;
  const stage=$('capsuleOpenAnimation');stage.replaceChildren(capsuleToken(c.quality));stage.classList.remove('is-opening');void stage.offsetWidth;stage.classList.add('is-opening');
  $('capsuleAnimationSkip').hidden=false;
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const origin=stage.getBoundingClientRect();
    for(const [icon,target] of [['💠','shopChips'],['🌿','workshopMaterialBox'],['⚙️','workshopByproductBox'],['🎨','profilePaintFragments']]){
      const dest=$(target).getBoundingClientRect();
      for(let i=0;i<3;i++){const p=node('span',icon,'commerce-particle');opening.append(p);const endX=dest.width?dest.left+dest.width/2:origin.left+origin.width/2;const endY=dest.width?Math.max(0,dest.top):origin.top-50;
        p.animate([{transform:`translate(${origin.left+origin.width/2}px,${origin.top+origin.height/2}px) scale(1)`,opacity:1},{transform:`translate(${endX}px,${endY}px) scale(.3)`,opacity:0}],{duration:700,delay:i*70}).finished.then(()=>p.remove()).catch(()=>p.remove());}
    }
  }
});
$('capsuleAnimationSkip').addEventListener('click',()=>{$('capsuleOpenAnimation').classList.remove('is-opening');opening.querySelectorAll('.commerce-particle').forEach(n=>n.remove());$('capsuleAnimationSkip').hidden=true;});
for(const d of [shop,opening])d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
for(const event of ['kusa-medal-save-changed','kusa-player-changed','kusa-pachi-profile-changed','kusa-fortune-changed'])window.addEventListener(event,render);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
window.addEventListener('kusa-capsule-acquired',event=>{
  const badge=$('capsuleInventoryBadge');badge.animate?.([{filter:'brightness(1)'},{filter:'brightness(2)'},{filter:'brightness(1)'}],{duration:800});
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const originNode=$('gachaButton')||$('fishingCanvas')||badge;
  const from=originNode.getBoundingClientRect(),dest=badge.getBoundingClientRect();
  if(!from.width||!dest.width)return;
  const p=capsuleToken(CAPSULES[event.detail?.quality]?event.detail.quality:'gold');p.classList.add('commerce-acquired');document.body.append(p);
  p.animate([{transform:`translate(${from.left+from.width/2}px,${from.top+from.height*.8}px) scale(1)`,opacity:1},{transform:`translate(${dest.left+dest.width/2}px,${Math.max(8,dest.top)}px) scale(.25)`,opacity:0}],{duration:850,easing:'ease-in-out'}).finished.then(()=>p.remove()).catch(()=>p.remove());
});
window.addEventListener('storage',e=>{if(['kusaMedalSaveV1','kusaPlayerStoreV1'].includes(e.key)){globalThis.KusaPlayerStore?.refresh?.();render();}});
globalThis.KusaCommerce=Object.freeze({save,refresh:render,openCapsules:(q,n)=>economyLock(()=>openCapsules(save,q,n,save.selectedPlayerId)),equipSiteTheme(id){save.reload();const player=save.selectedPlayerId;return run(()=>equipSkin(save,id,'site',player),'テーマを適用しました。');}});
globalThis.KusaAuroraKey=Object.freeze({isActive:()=>{save.reload();return auroraStatus(save,save.selectedPlayerId).active;}});
render();economyLock(()=>{save.reload();return {ok:true};}).then(render).catch(e=>{$('shopMessage').textContent=e.message;});
setInterval(()=>{if(!document.hidden){const fortune=fortuneStatus(save,save.selectedPlayerId),aurora=auroraStatus(save,save.selectedPlayerId);for(const banner of [fortuneBanner,cabinetFortune])if(!banner.hidden&&fortune.active)banner.textContent=`🔑 フォーチュンキー発動中：本日の台設定が＋${fortune.boost}｜ 残り ${countdown(fortune.expiresAt-Date.now())}`;for(const banner of [auroraBanner,cabinetAurora])if(!banner.hidden&&aurora.active)banner.textContent=`🌌 オーロラキー発動中：UR・GODR・Ωレアのみ抽選｜残り ${countdown(aurora.expiresAt-Date.now())}`;const gachaAurora=$('gachaAuroraStatus');if(gachaAurora){gachaAurora.hidden=!aurora.active;gachaAurora.textContent=aurora.active?`🌌 オーロラキー発動中　UR・GODR・Ωレアのみ出現　残り ${countdown(aurora.expiresAt-Date.now())}`:'';}const fortuneNote=document.querySelector('[data-fortune-countdown]'),auroraNote=document.querySelector('[data-aurora-countdown]');if(fortuneNote&&fortune.active)fortuneNote.textContent=`所持 ${fmt(fortune.inventory)}個 ｜ 本日使用 ${fortune.boost}/2回 ｜ 残り ${countdown(fortune.expiresAt-Date.now())}`;if(auroraNote)auroraNote.textContent=`所持 ${fmt(aurora.inventory)}個 ｜ 本日購入残り ${aurora.remainingPurchases}個${aurora.active?` ｜ 発動中 残り ${countdown(aurora.expiresAt-Date.now())}`:''}`;}},1000);
setInterval(()=>{if(shop.open&&!document.hidden)render();},60000);
