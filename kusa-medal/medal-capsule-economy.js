import {SITE_THEMES} from './site-theme-catalog.js';
// Five capsule qualities share one reward table throughout the site.
export const CAPSULES = Object.freeze({
  bronze:{name:'銅',color:'#bd7848',chips:[30,45],materials:[2,3],byproducts:0,paint:69},
  silver:{name:'銀',color:'#a9dce9',chips:[90,150],materials:[5,8],byproducts:0,paint:104},
  gold:{name:'金',color:'#ffbf24',chips:[240,360],materials:[12,18],byproducts:2,paint:173},
  rainbow:{name:'虹',color:'#ac79ee',chips:[600,900],materials:[30,45],byproducts:5,paint:345},
  special:{name:'特別',color:'#e86097',chips:[1500,2100],materials:[60,90],byproducts:12,paint:1035}
});
export const CAPSULE_EDITIONS=Object.freeze({v2:CAPSULES});
export const CAPSULE_EDITION='v2';
export const SHOP_ITEMS = Object.freeze([
  {id:'medals',name:'メダル補給',description:'所持メダルに30枚追加します。日本時間で1日5回まで。',chips:500,dailyLimit:5},
  {id:'paint',name:'草彩片パック',description:'草彩片100個。日本時間で1日5回まで。',chips:500},
  {id:'aurora-key',name:'オーロラキー',description:'使用中は草ガチャの抽選がUR・GODR・Ωレアの3種類だけになります。次の午前0時（日本時間）まで有効。日本時間で1日1個まで。',chips:5000,dailyLimit:1}
]);
// Permanent site themes only. Cabinet sales remain retired.
export const SHOP_SKINS = SITE_THEMES;
export function cardCapsuleReward(card,account={}) {
  const tiers=['bronze','silver','gold','rainbow','special'];
  const base={N:0,R:0,SR:1,SSR:2,UR:3,GODR:4,'Ω':4}[card?.rarity]??0;
  const processed=!!account.refinements?.[card?.id]?.length;
  const awakened=processed&&!!account.awakenedCards?.[card?.id];
  const quality=tiers[Math.min(4,base+(processed?1:0))],count=awakened?2:1;
  return {quality,count,edition:CAPSULE_EDITION,label:`${CAPSULES[quality].name}カプセル ×${count}個を獲得`};
}
export function capsuleTotal(account) {return Object.values(account.capsules||{}).reduce((n,b)=>KusaAmounts.add(n,Object.values(b).reduce((s,v)=>KusaAmounts.add(s,v),0)),0);}
export function japanDay(now=Date.now()) {return new Date(now+9*3600000).toISOString().slice(0,10);}

// Web Locks on HTTPS/localhost; IndexedDB serializes fallback tabs on LAN HTTP/file.
export function economyLock(action) {
  const run=()=>{recoverCardUseJournal();return action();};
  if(globalThis.navigator?.locks?.request)return navigator.locks.request('kusa-economy',run);
  return new Promise((resolve,reject)=>{
    const r=indexedDB.open('kusaEconomyLocksV1',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('locks');
    r.onerror=()=>reject(new Error('保存の安全確認ができません。'));
    r.onblocked=()=>reject(new Error('ほかのタブを閉じて再試行してください。'));
    r.onsuccess=()=>{
      const db=r.result,tx=db.transaction('locks','readwrite');let result,error;
      tx.objectStore('locks').get('economy').onsuccess=()=>{try{result=run();tx.objectStore('locks').put(Date.now(),'economy');}catch(e){error=e;tx.abort();}};
      tx.oncomplete=()=>{db.close();resolve(result);};
      tx.onabort=()=>{db.close();if(result?.ok)resolve(result);else reject(error||new Error('保存の安全確認に失敗しました。'));};
    };
  });
}
export function recoverCardUseJournal(){
  const raw=localStorage.getItem('kusaCardUseJournalV1');if(!raw)return;
  const j=JSON.parse(raw);
  if(!j.committed){for(const key of ['kusaMedalSaveV1','kusaPlayerStoreV1','kusa-jiten-gacha-v1']){
    const value=j.before?.[key];if(value===null)localStorage.removeItem(key);else if(typeof value==='string')localStorage.setItem(key,value);
  }}
  if(!j.committed&&Object.hasOwn(j.before||{},'kusaPachiProfilesV1')){
    const value=j.before.kusaPachiProfilesV1;
    if(value===null)localStorage.removeItem('kusaPachiProfilesV1');else if(typeof value==='string')localStorage.setItem('kusaPachiProfilesV1',value);
  }
  localStorage.removeItem('kusaCardUseJournalV1');globalThis.KusaPlayerStore?.refresh?.();
  globalThis.window?.dispatchEvent(new Event('kusa-medal-save-changed'));
}
function transaction(save,expectedPlayerId,mutate) {
  save.reload();
  if(!save.selectedPlayerId||save.selectedPlayerId!==expectedPlayerId)return {ok:false,message:'プレイヤーが変わりました。操作し直してください。'};
  let message='';
  const account=save.getAccount();
  try {mutate(account);}catch(e){return {ok:false,message:e.message};}
  const result=save.updateAccount(next=>Object.assign(next,account));
  if(!result.ok)message='保存できませんでした。所持品は変更していません。';
  return {...result,message};
}
export function openCapsules(save,quality,count,expectedPlayerId,edition=CAPSULE_EDITION,random=Math.random) {
  const rule=CAPSULE_EDITIONS[edition]?.[quality];
  if(!rule||!Number.isSafeInteger(count)||count<1)return {ok:false,message:'開封個数を確認してください。'};
  const rewards={chips:0,cardMaterials:0,cardByproducts:rule.byproducts*count,paintFragments:rule.paint*count};
  const result=transaction(save,expectedPlayerId,a=>{
    if((a.capsules[edition]?.[quality]||0)<count)throw new Error('カプセルが足りません。');
    // Every capsule has its own draw; bounded batches keep low-end phones responsive.
    function sumUniform(range,n){
      const width=range[1]-range[0]+1;
      if(n<=10000){let s=0;for(let i=0;i<n;i++)s+=range[0]+Math.floor(Math.min(.999999,Math.max(0,random()))*width);return s;}
      // Chunk the synchronous work by limiting one operation, not the inventory.
      throw new Error('一度に開封できるのは10,000個までです。分けて開封してください。');
    }
    rewards.chips=sumUniform(rule.chips,count);rewards.cardMaterials=sumUniform(rule.materials,count);
    a.capsules[edition][quality]=KusaAmounts.sub(a.capsules[edition][quality],count);
    for(const [key,gain] of Object.entries(rewards))a[key]=KusaAmounts.add(a[key],gain);
    a.totalChips+=rewards.chips;
  });
  return {...result,rewards,quality,count};
}
export function purchaseSupply(save,id,expectedPlayerId,now=Date.now()) {
  const item=SHOP_ITEMS.find(x=>x.id===id);
  if(!item)return {ok:false,message:'商品が見つかりません。'};
  return transaction(save,expectedPlayerId,a=>{
    if(a.chips<item.chips)throw new Error('チップが足りません。');
    const day=japanDay(now);
    if(id==='paint'&&a.dailyShop.day===day&&a.dailyShop.paint>=5)throw new Error('草彩片パックは日本時間で1日5回までです。');
    if(id==='medals'&&a.dailyShop.day===day&&a.dailyShop.medals>=5)throw new Error('メダル補給は1日5回までです。草からの交換も利用できます。');
    if(id==='aurora-key'&&a.dailyShop.day===day&&a.dailyShop.aurora>=1)throw new Error('オーロラキーは日本時間で1日1個まで購入できます。');
    const key=id==='medals'?'medals':id==='aurora-key'?'auroraKeys':'paintFragments',gain=id==='medals'?30:id==='aurora-key'?1:100;
    a.chips=KusaAmounts.sub(a.chips,item.chips);a[key]=KusaAmounts.add(a[key],gain);
    if(['paint','medals','aurora-key'].includes(id)){if(a.dailyShop.day!==day)a.dailyShop={day,paint:0,medals:0,aurora:0};a.dailyShop[id==='paint'?'paint':id==='medals'?'medals':'aurora']++;}
  });
}
export function skinOwned(account,skin) {return skin.starter===true||account.ownedSkins.includes(skin.id)||(skin.theme&&account.unlockedThemes.includes(skin.theme));}
export function craftSkin(save,id,expectedPlayerId) {
  const skin=SHOP_SKINS.find(x=>x.id===id);
  if(!skin)return {ok:false,message:'商品が見つかりません。'};
  return transaction(save,expectedPlayerId,a=>{
    if(skinOwned(a,skin))throw new Error('すでに所持しています。');
    if(a.chips<skin.chips)throw new Error('チップが足りません。');
    if(a.paintFragments<skin.paint)throw new Error('草彩片が足りません。');
    a.chips=KusaAmounts.sub(a.chips,skin.chips);a.paintFragments=KusaAmounts.sub(a.paintFragments,skin.paint);a.ownedSkins.push(id);
    if(skin.theme&&!a.unlockedThemes.includes(skin.theme))a.unlockedThemes.push(skin.theme);
  });
}
export function equipSkin(save,id,category,expectedPlayerId) {
  const skin=SHOP_SKINS.find(x=>x.id===id);
  if(id!=='default'&&(!skin||skin.category!==category))return {ok:false,message:'デザインが見つかりません。'};
  if(!['profile','site'].includes(category))return {ok:false,message:'筐体の交換・着せ替えはありません。'};
  return transaction(save,expectedPlayerId,a=>{
    if(skin&&!skinOwned(a,skin))throw new Error('先に購入してください。');
    a.equippedSkins[category]=id==='default'?(category==='site'?'kusa-theme-1':''):id;
    if(category==='cabinet')a.selectedTheme=skin?.theme||'grassland';
  });
}
