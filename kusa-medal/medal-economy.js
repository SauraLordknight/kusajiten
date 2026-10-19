import {LEVEL_CAP, SEASON_REWARDS} from './medal-save.js';

export const OFFER_XP = Object.freeze({N: 1, R: 4, SR: 15, SSR: 40, UR: 100, GODR: 250, Ω: 500});
export const REFINEMENT_STYLES = Object.freeze([
  '真鍮プレート'
]);
export const SEASON_REWARD_INFO = Object.freeze([]);

export const XP_FOR_LEVEL = level => 8 + Math.max(0, level - 1) * 2;
export const GRASSIFY_COST = Object.freeze({grass: 100000, chips: 5000});

export function rewardGachaDuplicate(save) {
  const result=save.updateAccount(account=>{
    let xp=account.levelXp+10;
    while(account.level<LEVEL_CAP&&xp>=XP_FOR_LEVEL(account.level)){
      xp-=XP_FOR_LEVEL(account.level);account.level++;
    }
    account.levelXp=account.level>=LEVEL_CAP?0:xp;
    account.chips=KusaAmounts.add(account.chips,100);
  });
  return result.ok?{ok:true,xp:10,chips:100}: {ok:false};
}

function inventory() {
  return globalThis.KusaGachaInventory || null;
}

export function offerCard(save, card) {
  if (!card || !OFFER_XP[card.rarity]) return {ok: false, reason: 'card'};
  const cards = inventory();
  if (!cards?.consumeDuplicate?.(card.id)) return {ok: false, reason: 'duplicate'};
  const gainedXp = OFFER_XP[card.rarity];
  const result = save.updateAccount(account => {
    let xp = account.levelXp + gainedXp;
    while (account.level < LEVEL_CAP && xp >= XP_FOR_LEVEL(account.level)) {
      xp -= XP_FOR_LEVEL(account.level);
      account.level++;
    }
    if (account.level >= LEVEL_CAP) xp = 0;
    account.levelXp = xp;
    account.totalOfferings++;
    account.totalCardsOffered++;
  });
  if (!result.ok) return {ok: false, reason: 'save'};
  return {ok: true, account: result.account, xp: gainedXp, capped: result.account.level >= LEVEL_CAP};
}

export function offerChips(save, amount = 500) {
  amount = Number(amount);
  if (!Number.isSafeInteger(amount) || amount < 1) return {ok: false, reason: 'invalid'};
  const account = save.getAccount();
  if (account.chips < amount) return {ok: false, reason: 'chips'};
  const gainedXp = Math.max(1, Math.floor(amount / 500));
  const result = save.updateAccount(next => {
    next.chips=KusaAmounts.sub(next.chips,amount);
    let xp = next.levelXp + gainedXp;
    while (next.level < LEVEL_CAP && xp >= XP_FOR_LEVEL(next.level)) {
      xp -= XP_FOR_LEVEL(next.level);
      next.level++;
    }
    if (next.level >= LEVEL_CAP) xp = 0;
    next.levelXp = xp;
    next.totalOfferings++;
    next.totalChipsOffered += amount;
  });
  return result.ok ? {ok: true, account: result.account, xp: gainedXp} : {ok: false, reason: 'save'};
}

export function refineCard(save, card) {
  if (!card) return {ok: false, reason: 'card'};
  const costs = {N: 80, R: 160, SR: 350, SSR: 700, UR: 1200, GODR: 2200, Ω: 3500};
  const cost = costs[card.rarity] || 120;
  const account = save.getAccount();
  if (account.chips < cost) return {ok: false, reason: 'chips', cost};
  const owned = account.refinements[card.id] || [];
  const pool = REFINEMENT_STYLES.filter(style => !owned.includes(style));
  if (!pool.length) return {ok: false, reason: 'complete', cost};
  const cards = inventory();
  if (!cards?.consumeDuplicate?.(card.id)) return {ok: false, reason: 'duplicate', cost};
  const style = pool[0];
  const result = save.updateAccount(next => {
    next.chips=KusaAmounts.sub(next.chips,cost);
    next.refinements[card.id] = [...(next.refinements[card.id] || []), style];
    const processedAt=new Date().toISOString();
    next.cardProcessedAt[card.id]=processedAt;
    next.cardProcessedDates??={};
    next.cardProcessedDates[card.id]??={};
    next.cardProcessedDates[card.id][style]=processedAt;
    next.totalRefinements++;
  });
  return result.ok ? {ok: true, account: result.account, style, cost} : {ok: false, reason: 'save', cost};
}

export function exchangeSeasonCapsule(save, rewardId) {
  return {ok:false,reason:'retired'};
}

export function toggleFavorite(cardId, favorite) {
  const cards = inventory();
  if (!cards?.setFavorite) return false;
  return cards.setFavorite(cardId, favorite);
}
