import {economyLock, recoverCardUseJournal, cardCapsuleReward} from './kusa-medal/medal-capsule-economy.js';

export const FISHING_RULES=Object.freeze({buy:10,sell:5});
const keys=['kusaMedalSaveV1','kusaPlayerStoreV1','kusa-jiten-gacha-v1','kusaPachiProfilesV1'];
const journalKey='kusaCardUseJournalV1';
const qualities=['bronze','silver','gold','rainbow','special'];
export const FISHING_CARD_EFFECTS=Object.freeze({
  N:Object.freeze({chips:200,balls:[20,60]}),
  R:Object.freeze({chips:500,balls:[80,180]}),
  SR:Object.freeze({chips:1200,grass:[500,1500]}),
  SSR:Object.freeze({chips:3000,balls:[300,800],grass:[1000,3000]}),
  UR:Object.freeze({chips:8000,bonusChips:[1000,5000],balls:[500,1500]}),
  GODR:Object.freeze({chips:20000,bonusChips:[5000,15000],balls:[1000,3000],grass:[5000,15000]}),
  'Ω':Object.freeze({chips:50000,bonusChips:[10000,30000],balls:[3000,8000],grass:[20000,50000]})
});
export const CRYSTAL_BLESSING=Object.freeze({cardId:'glass-girl-omega',duration:600000,chance:.35,extraChips:50000,extraCapsules:10});
export const isCrystalCard=card=>card?.id===CRYSTAL_BLESSING.cardId;
export const crystalBlessingRemaining=(account,now=Date.now())=>Math.max(0,(account?.fishing?.crystalBlessingUntil||0)-now);
const rarityLabels={N:'ノーマル',R:'レア',SR:'スーパーレア',SSR:'SSR',UR:'UR',GODR:'GODR','Ω':'Ω'};
const formatAmount=n=>globalThis.KusaAmounts?.format(n)??Number(n).toLocaleString('ja-JP');
export function fishingCardEffectMultiplier(card,account={}){
  if(!card?.id||!(account.refinements?.[card.id]?.length))return 1;
  return account.awakenedCards?.[card.id]?2:1.5;
}
const scaledRange=(range,multiplier)=>range.map(value=>Math.ceil(value*multiplier));
export function fishingCardEffectDescription(card,count=1,account={}){
  const effect=FISHING_CARD_EFFECTS[card?.rarity];if(!effect||!Number.isInteger(count)||count<1)return '';
  const multiplier=fishingCardEffectMultiplier(card,account);
  const parts=[`チップ最低${formatAmount(Math.ceil(effect.chips*multiplier)*count)}枚`];
  for(const [key,label] of [['balls','玉'],['grass','草'],['bonusChips','追加チップ']]){
    const range=effect[key];if(!range)continue;
    const scaled=scaledRange(range,multiplier),low=scaled[0]*count,high=scaled[1]*count;
    parts.push(`${label}${formatAmount(low)}〜${formatAmount(high)}${key==='balls'?'球':key==='grass'?'個':'枚'}`);
  }
  const capsule=cardCapsuleReward(card,account);
  parts.push(capsule.label.replace(/×(\d+)個を獲得/,(_,n)=>`×${Number(n)*count}個を釣果に追加`));
  const finish=multiplier===2?'覚醒済み・2倍':multiplier===1.5?'真鍮プレート加工済み・1.5倍':'';
  if(isCrystalCard(card))parts.push(`結晶の加護：追加チップ${formatAmount(Math.ceil(50000*multiplier)*count)}枚・特別カプセル${Math.ceil(10*multiplier)*count}個／通常釣りのカプセル抽選35%・1〜3個／${count*10}分`);
  return `[${rarityLabels[card.rarity]||card.rarity}${finish?`／${finish}`:''}] ${parts.join(' ＋ ')}`;
}
function applyFishingCardEffect(rewards,card,count,random,account={}){
  const effect=FISHING_CARD_EFFECTS[card?.rarity];if(!effect||count<1)return;
  const multiplier=fishingCardEffectMultiplier(card,account);
  // Normal fishing draws still apply. Guarantee means the chip total cannot
  // fall below the rarity floor; it does not add the floor on top of draws.
  rewards.chips=Math.max(rewards.chips||0,Math.ceil(effect.chips*multiplier)*count);
  const rollRange=range=>{const scaled=scaledRange(range,multiplier);return scaled[0]+Math.max(0,Math.min(scaled[1]-scaled[0],Math.floor(random()*(scaled[1]-scaled[0]+1))));};
  for(const key of ['balls','grass'])if(effect[key])rewards[key]=(rewards[key]||0)+rollRange(effect[key])*count;
  if(effect.bonusChips)rewards.chips+=rollRange(effect.bonusChips)*count;
}
export function fishingPeriod(date=new Date()) {
  // Match the site's explicit night setting; otherwise use the local clock.
  const hour=date.getHours();
  if(document.documentElement.classList.contains('night'))return hour<5?'midnight':'night';
  return hour<5?'midnight':hour<6?'night':hour<16?'day':hour<19?'sunset':'night';
}
export function rollFishingRewards(location,period,cards,card,account,random=Math.random) {
  const rewards={},add=(key,n)=>rewards[key]=(rewards[key]||0)+n;
  // Fishing no longer awards medals. Keep the former draw slot as chips so
  // the overall number and pace of ordinary rewards remain unchanged.
  const pool=location==='river'?['grass','grass','chips','chips','balls','chips']:['balls','balls','chips','chips','grass'];
  const ranges={grass:5,balls:5,chips:10};
  const draws=[1,2,3,5][cards];
  for(let i=0;i<draws;i++){const kind=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];add(kind,1+Math.min(ranges[kind]-1,Math.floor(random()*ranges[kind])));}
  if(cards&&card)applyFishingCardEffect(rewards,card,cards,random,account);
  // Duplicates guarantee the existing capsule entitlement, rather than gambling it away.
  if(cards&&card){const r=cardCapsuleReward(card,account);add(r.quality,r.count*cards);}
  else if(crystalBlessingRemaining(account)>0){
    if(random()<CRYSTAL_BLESSING.chance){const r=random(),quality=r<.35?'bronze':r<.65?'silver':r<.85?'gold':r<.95?'rainbow':'special';add(quality,1+Math.min(2,Math.floor(random()*3)));}
  }else if(random()<(['night','midnight'].includes(period)? .04:.02))add('bronze',1);
  return rewards;
}
export function fishingTransaction(save,playerId,mutate) {
  return economyLock(()=>{
    if(globalThis.KusaBackupSession?.isCurrent()===false)return {ok:false,message:'保存データが更新されました。再読み込みしてください。'};
    globalThis.KusaPlayerStore?.refresh();save.reload();
    if(!playerId||save.selectedPlayerId!==playerId||globalThis.KusaPlayerStore?.getSelectedId()!==playerId)return {ok:false,message:'プレイヤーが変わりました。もう一度操作してください。'};
    const profiles=JSON.parse(localStorage.getItem('kusaPachiProfilesV1')||'[]');
    const player=profiles.find(p=>p.rankingId===playerId),account=save.getAccount();
    if(!player)return {ok:false,message:'先に草パチでプレイヤーを作成してください。'};
    let detail;try{detail=mutate(player,account)||{};}catch(e){return {ok:false,message:e.message};}
    for(const key of ['grass','balls'])if(!KusaAmounts.valid(player[key]))return {ok:false,message:'所持数のデータを確認してください。'};
    const journal={before:Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),committed:false};
    try{
      localStorage.setItem(journalKey,JSON.stringify(journal));
      // Persist both wallets before notifying the other game screens.
      const result=save.updateAccount(a=>Object.assign(a,account),{playerId});
      if(!result.ok)throw new Error('所持品を保存できませんでした。');
      localStorage.setItem('kusaPachiProfilesV1',JSON.stringify(profiles));
      if(detail.consume&&!globalThis.KusaGachaInventory?.consumeDuplicate(detail.consume.id,detail.consume.count))throw new Error('保護中、またはダブりカードが足りません。');
      globalThis.KusaPlayerStore.syncPachiProfiles(profiles);
      const stored=JSON.parse(localStorage.getItem('kusaPlayerStoreV1')||'{}').players?.[playerId];
      if(!stored||stored.grass!==player.grass||stored.balls!==player.balls)throw new Error('共通プロフィールを保存できませんでした。');
      journal.committed=true;localStorage.setItem(journalKey,JSON.stringify(journal));
    }catch(e){
      recoverCardUseJournal();save.reload();
      for(const name of ['kusa-medal-save-changed','kusa-medal-grass-changed','kusa-gacha-inventory-changed'])window.dispatchEvent(new Event(name));
      return {ok:false,message:e.message||'保存できませんでした。再試行してください。'};
    }
    try{localStorage.removeItem(journalKey);}catch{/* Committed journal can be cleaned at the next operation. */}
    for(const name of ['kusa-medal-save-changed','kusa-medal-grass-changed','kusa-pachi-profile-changed'])window.dispatchEvent(new CustomEvent(name,{detail:{playerId,walletChanged:true}}));
    return {ok:true,...detail};
  });
}
export function exchangeBait(save,playerId,direction,count){
  return fishingTransaction(save,playerId,(p,a)=>{
    if(!KusaAmounts.valid(count)||KusaAmounts.cmp(count,1)<0)throw new Error('餌の個数を整数で入力してください。');
    const f=a.fishing;
    if(direction==='buy'){
      if(KusaAmounts.cmp(p.grass,KusaAmounts.mul(count,FISHING_RULES.buy))<0)throw new Error('草が足りません。');
      p.grass=KusaAmounts.sub(p.grass,KusaAmounts.mul(count,FISHING_RULES.buy));f.bait=KusaAmounts.add(f.bait,count);
    }else if(direction==='sell'){
      if(KusaAmounts.cmp(f.bait,count)<0)throw new Error('餌が足りません。');
      p.grass=KusaAmounts.add(p.grass,KusaAmounts.mul(count,FISHING_RULES.sell));f.bait=KusaAmounts.sub(f.bait,count);
    }else throw new Error('交換方法を確認してください。');
    return {message:direction==='buy'?`餌を${KusaAmounts.format(count)}個用意しました。`:`草を${KusaAmounts.format(KusaAmounts.mul(count,FISHING_RULES.sell))}個受け取りました。`};
  });
}
export function startFishing(save,playerId,location,period,cardId='',count=0){
  return fishingTransaction(save,playerId,(p,a)=>{
    if(!['river','sea'].includes(location))throw new Error('川か海で竿を投げましょう。');
    if(a.fishing.pending)throw new Error('先にかかっている釣果を受け取りましょう。');
    if(a.fishing.bait<1)throw new Error('餌を交換所で用意しましょう。');
    if(!Number.isInteger(count)||count<0||count>3)throw new Error('カードの枚数を確認してください。');
    const card=count?globalThis.KusaGachaInventory?.getCard(cardId):null;
    if(count&&(!card||card.favorite||globalThis.KusaCardCounts.compare(card.usable,count)<0))throw new Error('保護中、またはダブりカードが足りません。');
    if(isCrystalCard(card))throw new Error('ガラスの少女は「結晶の加護を使う」で発動してください。');
    const rewards=rollFishingRewards(location,period,count,card,a);
    const pending={id:crypto.randomUUID(),location,cardId:count?cardId:'',cards:count,cardEffectVersion:2,readyAt:Date.now()+1800+Math.floor(Math.random()*2500),rewards};
    // Card is consumed with the reward, so interruptions never lose a selected card.
    a.fishing.bait=KusaAmounts.sub(a.fishing.bait,1);a.fishing.casts++;a.fishing.location=location;a.fishing.pending=pending;
    return {pending};
  });
}
export function catchFishing(save,playerId,castId){
  return fishingTransaction(save,playerId,(p,a)=>{
    const f=a.fishing,pending=f.pending;
    if(!pending||pending.id!==castId)throw new Error('この釣果は受け取り済みです。');
    if(Date.now()<pending.readyAt)throw new Error('もう少し待ちましょう。');
    // Convert a pre-removal pending medal catch using the former 10 grass per
    // medal exchange rate, so an unfinished catch remains redeemable without
    // reintroducing medal currency into the active fishing UI.
    if(pending.rewards?.medals){
      pending.rewards.grass=KusaAmounts.add(pending.rewards.grass||0,KusaAmounts.mul(pending.rewards.medals,10));
      delete pending.rewards.medals;
    }
    if(pending.cards){const card=globalThis.KusaGachaInventory?.getCard(pending.cardId);if(!card||card.favorite||globalThis.KusaCardCounts.compare(card.usable,pending.cards)<0)throw new Error('選択したダブりカードが足りないか保護中です。補充または保護を解除してから受け取ってください。');if(!pending.cardEffectVersion){pending.rewards??={};applyFishingCardEffect(pending.rewards,card,pending.cards,Math.random,save.getAccount());}pending.cardEffectVersion=2;}
    for(const [key,n] of Object.entries(pending.rewards)){
      if(['grass','balls'].includes(key)){p[key]=KusaAmounts.add(p[key],n);}
      else if(key==='chips'){a.chips=KusaAmounts.add(a.chips,n);a.totalChips=Math.min(Number.MAX_SAFE_INTEGER,Number(a.totalChips)+n);}
      else if(qualities.includes(key)){a.capsules.v2??={};a.capsules.v2[key]=KusaAmounts.add(a.capsules.v2[key]||0,n);}
    }
    f.pending=null;f.catches++;f.cardsUsed+=pending.cards;
    return {rewards:pending.rewards,consume:pending.cards?{id:pending.cardId,count:pending.cards}:null};
  });
}

// Consume the card, grant its full reward, and extend the blessing in one journaled transaction.
export function activateCrystalBlessing(save,playerId,count=1){
  return fishingTransaction(save,playerId,(p,a)=>{
    if(a.fishing.pending)throw new Error('先に釣果を受け取ってください。');
    if(!Number.isInteger(count)||count<1||count>3)throw new Error('カードの枚数を確認してください。');
    const card=globalThis.KusaGachaInventory?.getCard(CRYSTAL_BLESSING.cardId);
    if(!card||card.favorite||globalThis.KusaCardCounts.compare(card.usable,count)<0)throw new Error('保護中、またはダブりカードが足りません。');
    const multiplier=fishingCardEffectMultiplier(card,a),rewards=rollFishingRewards('sea','day',count,card,a);
    rewards.chips+=Math.ceil(CRYSTAL_BLESSING.extraChips*multiplier)*count;
    rewards.special=(rewards.special||0)+Math.ceil(CRYSTAL_BLESSING.extraCapsules*multiplier)*count;
    for(const [key,n] of Object.entries(rewards)){
      if(['grass','balls'].includes(key))p[key]=KusaAmounts.add(p[key],n);
      else if(key==='chips'){a.chips=KusaAmounts.add(a.chips,n);a.totalChips=Math.min(Number.MAX_SAFE_INTEGER,Number(a.totalChips||0)+n);}
      else if(qualities.includes(key)){a.capsules.v2??={};a.capsules.v2[key]=KusaAmounts.add(a.capsules.v2[key]||0,n);}
    }
    a.fishing.crystalBlessingUntil=Math.max(Date.now(),a.fishing.crystalBlessingUntil||0)+CRYSTAL_BLESSING.duration*count;
    a.fishing.cardsUsed+=count;
    const mode=multiplier===2?'awakened':multiplier===1.5?'processed':'normal';
    return {rewards,mode,until:a.fishing.crystalBlessingUntil,consume:{id:card.id,count}};
  });
}
