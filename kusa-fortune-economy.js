import {economyLock, japanDay} from './kusa-medal/medal-capsule-economy.js';

export const FORTUNE_KEY=Object.freeze({id:'fortune-key',name:'フォーチュンキー',chips:1000,dailyLimit:2});
export const AURORA_KEY=Object.freeze({id:'aurora-key',name:'オーロラキー',chips:10000,dailyLimit:1});

// A plain status read also works before the commerce window has been opened.
export function fortuneStatus(save, playerId, now=Date.now()) {
  let account;
  if(save?.getAccount) {
    playerId=playerId??save.selectedPlayerId;
    account=save.state?.accounts?.[playerId]||(save.selectedPlayerId===playerId?save.getAccount():{});
  } else {
    try {
      const state=JSON.parse(localStorage.getItem('kusaMedalSaveV1')||'{}');
      playerId=playerId??globalThis.KusaPlayerStore?.getSelectedId?.()??state.selectedPlayerId;
      account=state.accounts?.[playerId];
    } catch {}
  }
  account=account||{};
  const day=japanDay(now), valid=n=>Number.isSafeInteger(n)&&n>=0?Math.min(2,n):0;
  const boost=account.fortuneBoost?.day===day?valid(account.fortuneBoost.levels):0;
  const purchased=account.fortunePurchases?.day===day?valid(account.fortunePurchases.count):0;
  const base=globalThis.KusaSharedPachiSetting.baseSettingForJstDay(now), effective=Math.min(6,base+boost);
  const inventory=globalThis.KusaAmounts.normalize(account.fortuneKeys);
  return {playerId,day,base,effective,boost,inventory,purchased,remainingPurchases:2-purchased,remainingUses:Math.min(2-boost,6-effective),active:boost>0,expiresAt:Date.parse(`${day}T00:00:00+09:00`)+86400000};
}

export function auroraStatus(save,playerId,now=Date.now()) {
  let account;
  if(save?.getAccount){playerId=playerId??save.selectedPlayerId;account=save.state?.accounts?.[playerId]||(save.selectedPlayerId===playerId?save.getAccount():{});}
  else {try{const state=JSON.parse(localStorage.getItem('kusaMedalSaveV1')||'{}');playerId=playerId??globalThis.KusaPlayerStore?.getSelectedId?.()??state.selectedPlayerId;account=state.accounts?.[playerId];}catch{}}
  account=account||{};
  const day=japanDay(now),purchased=account.dailyShop?.day===day?Math.min(1,Math.max(0,Number(account.dailyShop.aurora)||0)):0;
  const active=account.auroraBoost?.day===day&&account.auroraBoost.active===true;
  const expiresAt=Date.parse(`${day}T00:00:00+09:00`)+86400000;
  return {playerId,day,inventory:globalThis.KusaAmounts.normalize(account.auroraKeys),purchased,remainingPurchases:1-purchased,active,expiresAt,remainingMs:active?Math.max(0,expiresAt-now):0};
}

function transaction(save,playerId,now,mutate) {
  return economyLock(()=>{
    if(globalThis.KusaBackupSession?.isCurrent()===false)return {ok:false,message:'保存データが更新されました。再読み込みしてください。'};
    globalThis.KusaPlayerStore?.refresh?.();save.reload();
    const selected=globalThis.KusaPlayerStore?.getSelectedId?.();
    if(!playerId||save.selectedPlayerId!==playerId||(selected!==undefined&&selected!==playerId))return {ok:false,message:'プレイヤーが変わりました。もう一度操作してください。'};
    const transactionTime=now??Date.now();
    const status=fortuneStatus(save,playerId,transactionTime);
    let error='';
    const result=save.updateAccount(account=>{error=mutate(account,status)||'';},{playerId});
    if(error)return {ok:false,message:error,status};
    if(!result.ok)return {ok:false,message:'所持品を保存できませんでした。'};
    const next=fortuneStatus(save,playerId,transactionTime);
    globalThis.window?.dispatchEvent(new CustomEvent('kusa-fortune-changed',{detail:{playerId,status:next}}));
    return {...result,status:next};
  });
}

export function purchaseFortuneKey(save,playerId,now) {
  return transaction(save,playerId,now,(account,status)=>{
    if(!status.remainingPurchases)return 'フォーチュンキーは日本時間で1日2個まで購入できます。';
    if(KusaAmounts.cmp(account.chips,FORTUNE_KEY.chips)<0)return 'チップが足りません。';
    account.chips=KusaAmounts.sub(account.chips,FORTUNE_KEY.chips);
    account.fortuneKeys=KusaAmounts.add(account.fortuneKeys||0,1);
    account.fortunePurchases={day:status.day,count:status.purchased+1};
  });
}

export function useFortuneKey(save,playerId,now) {
  return transaction(save,playerId,now,(account,status)=>{
    if(status.effective>=6)return '本日はこれ以上フォーチュンキーを使用できません。キーは消費しません。';
    if(status.boost>=2)return 'フォーチュンキーの使用は日本時間で1日2個までです。';
    if(KusaAmounts.cmp(account.fortuneKeys||0,1)<0)return 'フォーチュンキーを持っていません。';
    account.fortuneKeys=KusaAmounts.sub(account.fortuneKeys,1);
    account.fortuneBoost={day:status.day,levels:status.boost+1};
  });
}

export function useAuroraKey(save,playerId,now) {
  return transaction(save,playerId,now,(account,status)=>{
    const aurora=auroraStatus(save,playerId,now??Date.now());
    if(aurora.active)return 'オーロラキーはすでに発動中です。';
    if(KusaAmounts.cmp(account.auroraKeys||0,1)<0)return 'オーロラキーを持っていません。';
    account.auroraKeys=KusaAmounts.sub(account.auroraKeys,1);
    account.auroraBoost={day:status.day,active:true};
  });
}
