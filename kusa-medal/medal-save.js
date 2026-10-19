const PROFILE_KEY = 'kusaPachiProfilesV1';
const MEDAL_KEY = 'kusaMedalSaveV1';
const INPUT_KEY = 'kusaMedalInputJournalV1';
const MAX_VALUE = Infinity; // Wallets use exact decimal integers, with no gameplay holding cap.
const LEVEL_CAP = 50;
const SEASON_REWARDS = ['reed-frame', 'brass-title', 'night-title'];
const COMMEMORATIVE_MEDALS = ['all-card-refinement'];
const COMMEMORATIVE_COST = 5000;
const SERIAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function commemorativeDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Tokyo', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(date);
  const part = type => parts.find(p => p.type === type)?.value || '';
  return `${part('year')}.${part('month')}.${part('day')}`;
}

function newCommemorativeSerial(state) {
  if (!globalThis.crypto?.getRandomValues) throw new Error('random');
  const used = new Set(Object.values(state.accounts).flatMap(account => Object.values(account.commemorativeMedals).map(medal => medal.serialNumber)));
  for (let attempt=0; attempt<16; attempt++) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const chars = Array.from(bytes, byte => SERIAL_ALPHABET[byte & 31]).join('');
    const serial = `KCM-${chars.match(/.{4}/g).join('-')}`;
    if (!used.has(serial)) return serial;
  }
  throw new Error('random');
}

const safeInt = (value, fallback = 0, max = MAX_VALUE) => Number.isSafeInteger(value) && value >= 0
  ? Math.min(value, max)
  : fallback;

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function readStorageText(key) {
  try{return localStorage.getItem(key);}catch{return null;}
}

function writeJson(key, value) {
  if (globalThis.KusaBackupSession?.isCurrent() === false) return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function normalizeBoardState(value) {
  if(!value||value.version!==1||!Array.isArray(value.objects))return null;
  const num=(v,min,max,fallback=0)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
  const vec=(v,limit=100)=>({x:num(v?.x,-limit,limit),y:num(v?.y,-limit,limit),z:num(v?.z,-limit,limit)});
  const kinds=['coin','gold','rush','silver','giant','goldBall','jackpot','tower-core',...['bronze','silver','gold','rainbow','special','premium'].map(q=>`capsule-${q}`)];
  const objects=value.objects.filter(o=>o&&kinds.includes(o.kind)&&o.position&&['x','y','z'].every(k=>Number.isFinite(o.position[k]))).map(o=>{
    const q=Object.fromEntries(['x','y','z','w'].map(k=>[k,num(o.rotation?.[k],-1,1,k==='w'?1:0)])),norm=Math.hypot(q.x,q.y,q.z,q.w);
    return {kind:o.kind,motion:o.motion==='surface'?'surface':'dynamic',special:o.special===true,token:typeof o.token==='string'?o.token.slice(0,100):'',position:vec(o.position),rotation:norm?Object.fromEntries(Object.entries(q).map(([k,v])=>[k,v/norm])):{x:0,y:0,z:0,w:1},velocity:vec(o.velocity),angular:vec(o.angular),sleeping:o.sleeping===true,createdAt:num(o.createdAt,0,1e9),previous:vec(o.previous||o.position),payout:{entered:o.payout?.entered===true,confirmed:o.payout?.confirmed===true,eligible:o.payout?.eligible===true,enteredAt:num(o.payout?.enteredAt,0,1e9),confirmedAt:num(o.payout?.confirmedAt,0,1e9)}};
  });
  return {version:1,inputCursor:safeInt(value.inputCursor,0,Number.MAX_SAFE_INTEGER),hybrid:normalizeHybrid(value.hybrid),layoutVersion:safeInt(value.layoutVersion,1,2),revision:safeInt(value.revision,0,Number.MAX_SAFE_INTEGER),savedAt:typeof value.savedAt==='string'?value.savedAt.slice(0,40):'',objects,pushers:Array.isArray(value.pushers)?value.pushers.slice(0,2).map(p=>vec(p)):[],elapsed:num(value.elapsed,0,1e9),phase:num(value.phase,0,1e9),stroke:num(value.stroke,.15,1,.15),playStarted:value.playStarted===true,rushLeft:num(value.rushLeft,0,45),rushSpawnTimer:num(value.rushSpawnTimer,0,1.5),earnedChips:safeInt(value.earnedChips,0,Number.MAX_SAFE_INTEGER),rushProgress:safeInt(value.rushProgress,0,Number.MAX_SAFE_INTEGER),towerActive:value.towerActive===true,jackpotBallActive:value.jackpotBallActive===true};
}

function normalizeHybrid(value) {
  if(value?.version!==1||!Array.isArray(value.cells))return null;
  const cells=[];const used=new Set();
  for(const c of value.cells.slice(0,512)){
    if(!c||!Number.isInteger(c.tier)||c.tier<0||c.tier>2||!Number.isInteger(c.ix)||c.ix<0||c.ix>12||!Number.isInteger(c.iz)||c.iz<0||c.iz>100)continue;
    const key=`${c.tier}:${c.ix}:${c.iz}`;if(used.has(key))continue;used.add(key);
    const kinds=Object.fromEntries(['coin','gold','rush'].map(k=>[k,safeInt(c.kinds?.[k],0,Number.MAX_SAFE_INTEGER)]));
    if(!Number.isSafeInteger(kinds.coin+kinds.gold+kinds.rush))continue;
    cells.push({tier:c.tier,ix:c.ix,iz:c.iz,kinds,pressure:Number.isFinite(c.pressure)?Math.max(0,Math.min(20,c.pressure)):0});
  }
  return {version:1,cells};
}
function applyInputs(state,journal) {
  for(const [id,log] of Object.entries(journal.accounts||{})){
    const account=state.accounts[id];if(!account||!Array.isArray(log.entries))continue;
    let cursor=account.inputWalletCursor||0;
    for(const entry of log.entries){
      if(!Number.isSafeInteger(entry.seq)||!Array.isArray(entry.coins)||entry.seq<=0||entry.coins.length<1||entry.coins.length>20)continue;
      const normalized=normalizeBoardState({version:1,layoutVersion:2,objects:entry.coins});
      if(normalized.objects.length!==entry.coins.length)continue;
      if(entry.seq>cursor){account.medals=KusaAmounts.max(0,KusaAmounts.sub(account.medals,entry.coins.length));account.totalCoinsPlayed=Math.min(Number.MAX_SAFE_INTEGER,account.totalCoinsPlayed+entry.coins.length);account.lastPlayedAt=entry.at;cursor=entry.seq;}
      if(account.boardState&&entry.seq>(account.boardState.inputCursor||0)){
        account.boardState.objects.push(...normalized.objects);account.boardState.inputCursor=entry.seq;
      }
    }
    account.inputWalletCursor=cursor;
  }
}

function legacyPileCount(pile) {
  return Array.isArray(pile) ? pile.slice(0,16).reduce((sum,cell)=>sum+['coin','gold','rush'].reduce((n,type)=>n+safeInt(cell?.[type]),0),0) : 0;
}
function hasLegacyPile(save) {
  return Object.values(save?.accounts || {}).some(account=>legacyPileCount(account?.boardState?.storedPile)>0);
}
function hasLegacyCharms(save) {
  return Object.values(save?.accounts||{}).some(account=>safeInt(account?.comboCharms)>0||Number(account?.comboCharmSeconds)>0);
}

function normalizeCapsules(value={}) {
  const bucket=Object.fromEntries(['bronze','silver','gold','rainbow','special'].map(q=>[q,0]));
  for(const source of Object.values(value))if(source&&typeof source==='object')for(const [q,n] of Object.entries(source)){
    const quality=q==='premium'?'special':q;
    if(Object.hasOwn(bucket,quality))bucket[quality]=KusaAmounts.add(bucket[quality],KusaAmounts.normalize(n));
  }
  return {v2:bucket};
}
function normalizeAccount(value = {}, preserveBoard = false) {
  // Retired consumables retain their purchase value, including credit above cap.
  const charmCount=safeInt(value.comboCharms);
  const charmCredit=charmCount*200;
  const chipBalance=KusaAmounts.normalize(value.chips);
  const charmRefund=charmCredit;
  const retiredComboCharms=value.retiredComboCharms||{};
  // Undo the virtual-pile feature once. Paid medals return to the wallet;
  // any part above its cap is archived, never spawned or silently discarded.
  const pileCount = legacyPileCount(value.boardState?.storedPile);
  const wallet = KusaAmounts.normalize(value.medals);
  const refund = pileCount;
  const previousPile = value.retiredCoinPile;
  const retiredCoinPile = pileCount || previousPile ? {
    refunded: Math.min(Number.MAX_SAFE_INTEGER,safeInt(previousPile?.refunded,0,Number.MAX_SAFE_INTEGER)+refund),
    uncredited: Math.min(Number.MAX_SAFE_INTEGER,safeInt(previousPile?.uncredited,0,Number.MAX_SAFE_INTEGER)+pileCount-refund)
  } : null;
  let boardState = preserveBoard ? value.boardState : normalizeBoardState(value.boardState);
  if(pileCount && boardState && !boardState.objects.length) boardState = null;
  const unlockedThemes = ['grassland'];
  const retiredIds = ['profile-verdant','site-midnight','cabinet-midnight','cabinet-god'];
  const retiredTitles = ['真鍮の収集家','深夜の草むら'];
  const previousArchive = value.retiredRewards || {};
  const list=v=>Array.isArray(v)?v:[];
  const union = (...lists) => [...new Set(lists.flat().filter(x=>typeof x==='string'))].slice(0,100);
  const retiredRewards = {
    skins: union(list(previousArchive.skins),list(value.ownedSkins).filter(id=>retiredIds.includes(id))),
    seasonRewards: union(list(previousArchive.seasonRewards),list(value.unlockedSeasonRewards).filter(id=>SEASON_REWARDS.includes(id))),
    themes: union(list(previousArchive.themes),list(value.unlockedThemes).filter(id=>['midnight','god'].includes(id))),
    titles: union(list(previousArchive.titles),list(value.unlockedTitles).filter(id=>retiredTitles.includes(id))),
    seasonCapsules: Math.max(safeInt(previousArchive.seasonCapsules),safeInt(value.seasonCapsules)),
    seasonPrizes: Math.max(safeInt(previousArchive.seasonPrizes),safeInt(value.specialPrizes?.season)),
  };
  const specialPrizes = value.specialPrizes && typeof value.specialPrizes === 'object' ? value.specialPrizes : {};
  const refinements = value.refinements && typeof value.refinements === 'object' ? value.refinements : {};
  const normalizedRefinements = {};
  Object.entries(refinements).forEach(([cardId, styles]) => {
    if (typeof cardId !== 'string' || !Array.isArray(styles)) return;
    if (styles.some(style => typeof style === 'string' && style.length <= 40)) normalizedRefinements[cardId] = ['真鍮プレート'];
  });
  const processedDates = value.cardProcessedDates && typeof value.cardProcessedDates === 'object' ? value.cardProcessedDates : {};
  const normalizedProcessedDates = {};
  Object.entries(processedDates).forEach(([id, dates]) => {
    if (!normalizedRefinements[id] || !dates || typeof dates !== 'object') return;
    const valid = Object.entries(dates).filter(([style, date]) => typeof style === 'string' && style.length <= 40 && typeof date === 'string' && !Number.isNaN(Date.parse(date)));
    const brassDate = valid.find(([style]) => style === '真鍮プレート')?.[1] || valid[0]?.[1];
    if (brassDate) normalizedProcessedDates[id] = {'真鍮プレート': brassDate};
  });
  const commemorativeMedals = value.commemorativeMedals && typeof value.commemorativeMedals === 'object'
    ? value.commemorativeMedals
    : {};
  const normalizedCommemorativeMedals = {};
  COMMEMORATIVE_MEDALS.forEach(id => {
    const medal = commemorativeMedals[id];
    if (!medal || typeof medal !== 'object' || typeof medal.mintedAt !== 'string' || !medal.mintedAt) return;
    normalizedCommemorativeMedals[id] = {
      mintedAt: medal.mintedAt,
      serialNumber: typeof medal.serialNumber === 'string' && medal.serialNumber.length <= 48 ? medal.serialNumber : '',
      playerNameAtMint: typeof medal.playerNameAtMint === 'string' ? medal.playerNameAtMint.slice(0,80) : '',
      ownerPlayerId: typeof medal.ownerPlayerId === 'string' ? medal.ownerPlayerId.slice(0,80) : '',
      mintedDate: /^\d{4}\.\d{2}\.\d{2}$/.test(medal.mintedDate || '') ? medal.mintedDate : commemorativeDate(medal.mintedAt),
      modelVersion: 'v3',
      engravingVersion: 1,
      migrated: medal.migrated === true,
    };
  });
  return {
    inputWalletCursor:safeInt(value.inputWalletCursor,0,Number.MAX_SAFE_INTEGER),
    retirementVersion: 1,
    retiredRewards,
    boardState,
    retiredCoinPile,
    medals: KusaAmounts.add(wallet,refund),
    chips: KusaAmounts.add(chipBalance,charmRefund),
    fortuneKeys: KusaAmounts.normalize(value.fortuneKeys),
    fortunePurchases: {day:/^\d{4}-\d{2}-\d{2}$/.test(value.fortunePurchases?.day||'')?value.fortunePurchases.day:'',count:safeInt(value.fortunePurchases?.count,0,2)},
    fortuneBoost: {day:/^\d{4}-\d{2}-\d{2}$/.test(value.fortuneBoost?.day||'')?value.fortuneBoost.day:'',levels:safeInt(value.fortuneBoost?.levels,0,2)},
    auroraKeys: KusaAmounts.normalize(value.auroraKeys),
    auroraBoost: {day:/^\d{4}-\d{2}-\d{2}$/.test(value.auroraBoost?.day||'')?value.auroraBoost.day:'',active:value.auroraBoost?.active===true},
    retiredComboCharms: {
      count: Math.min(Number.MAX_SAFE_INTEGER,safeInt(retiredComboCharms.count,0,Number.MAX_SAFE_INTEGER)+charmCount),
      refunded: Math.min(Number.MAX_SAFE_INTEGER,safeInt(retiredComboCharms.refunded,0,Number.MAX_SAFE_INTEGER)+charmRefund),
      uncredited: Math.min(Number.MAX_SAFE_INTEGER,safeInt(retiredComboCharms.uncredited,0,Number.MAX_SAFE_INTEGER)+charmCredit-charmRefund),
      unusedSeconds: Math.min(Number.MAX_SAFE_INTEGER,(Number(retiredComboCharms.unusedSeconds)||0)+Math.max(0,Math.min(180,Number(value.comboCharmSeconds)||0))),
    },
    jackpotMeter: Number.isFinite(value.jackpotMeter)?Math.max(0,Math.min(100,value.jackpotMeter)):0,
    totalDrops: safeInt(value.totalDrops, 0, Number.MAX_SAFE_INTEGER),
    totalCoinsPlayed: safeInt(value.totalCoinsPlayed, 0, Number.MAX_SAFE_INTEGER),
    totalChips: safeInt(value.totalChips, 0, Number.MAX_SAFE_INTEGER),
    bestDrop: safeInt(value.bestDrop, 0, Number.MAX_SAFE_INTEGER),
    bestCombo: safeInt(value.bestCombo, 0, Number.MAX_SAFE_INTEGER),
    jackpots: safeInt(value.jackpots, 0, Number.MAX_SAFE_INTEGER),
    superJackpots: safeInt(value.superJackpots, 0, Number.MAX_SAFE_INTEGER),
    towerBreaks: safeInt(value.towerBreaks, 0, Number.MAX_SAFE_INTEGER),
    cardsUsed: safeInt(value.cardsUsed, 0, Number.MAX_SAFE_INTEGER),
    fishing: {
      character: value.fishing?.character==='girl'?'girl':'boy',
      bait: KusaAmounts.normalize(value.fishing?.bait),
      crystalBlessingUntil: safeInt(value.fishing?.crystalBlessingUntil,0,Number.MAX_SAFE_INTEGER),
      casts: safeInt(value.fishing?.casts,0,Number.MAX_SAFE_INTEGER),
      catches: safeInt(value.fishing?.catches,0,Number.MAX_SAFE_INTEGER),
      cardsUsed: safeInt(value.fishing?.cardsUsed,0,Number.MAX_SAFE_INTEGER),
      location: ['house','map','river','sea'].includes(value.fishing?.location)?value.fishing.location:'house',
      navigation: value.fishing?.navigation ? {map:value.fishing.navigation.map==='outdoor'?'outdoor':'house',x:Number.isFinite(value.fishing.navigation.x)?value.fishing.navigation.x:192,y:Number.isFinite(value.fishing.navigation.y)?value.fishing.navigation.y:183,direction:['up','down','left','right'].includes(value.fishing.navigation.direction)?value.fishing.navigation.direction:'down'}:null,
      pending: value.fishing?.pending && typeof value.fishing.pending.id==='string'
        && ['river','sea'].includes(value.fishing.pending.location)
        ? {id:value.fishing.pending.id.slice(0,100),location:value.fishing.pending.location,
          cardId:typeof value.fishing.pending.cardId==='string'?value.fishing.pending.cardId.slice(0,100):'',
          cards: safeInt(value.fishing.pending.cards,0,3),
          cardEffectVersion: safeInt(value.fishing.pending.cardEffectVersion,0,3),
          readyAt:safeInt(value.fishing.pending.readyAt,0,Number.MAX_SAFE_INTEGER),
          rewards:Object.fromEntries(Object.entries(value.fishing.pending.rewards||{}).filter(([k,v])=>['grass','balls','chips','medals','bronze','silver','gold','rainbow','special','premium'].includes(k)&&Number.isSafeInteger(v)&&v>0))}:null,
    },
    rushes: safeInt(value.rushes, 0, Number.MAX_SAFE_INTEGER),
    level: Math.max(1, Math.min(LEVEL_CAP, safeInt(value.level, 1, LEVEL_CAP))),
    levelXp: safeInt(value.levelXp, 0, Number.MAX_SAFE_INTEGER),
    grassRank: safeInt(value.grassRank, 0, 9999),
    grassifications: safeInt(value.grassifications, 0, 9999),
    totalOfferings: safeInt(value.totalOfferings, 0, Number.MAX_SAFE_INTEGER),
    totalCardsOffered: safeInt(value.totalCardsOffered, 0, Number.MAX_SAFE_INTEGER),
    totalChipsOffered: safeInt(value.totalChipsOffered, 0, Number.MAX_SAFE_INTEGER),
    totalRefinements: safeInt(value.totalRefinements, 0, Number.MAX_SAFE_INTEGER),
    refinements: normalizedRefinements,
    cardMaterials: KusaAmounts.normalize(value.cardMaterials),
    cardByproducts: KusaAmounts.normalize(value.cardByproducts),
    paintFragments: KusaAmounts.normalize(value.paintFragments),
    capsules: normalizeCapsules(value.capsules),
    pendingCapsules: Object.fromEntries(Object.entries(value.pendingCapsules||{}).filter(([token,c])=>token.length<=100&&c&&['bronze','silver','gold','rainbow','special','premium'].includes(c.quality)&&/^v\d+$/.test(c.edition)).slice(0,64)),
    comboCharms: 0,
    comboCharmSeconds: 0,
    dailyShop: {day:/^\d{4}-\d{2}-\d{2}$/.test(value.dailyShop?.day||'')?value.dailyShop.day:'',paint:safeInt(value.dailyShop?.paint,0,5),medals:safeInt(value.dailyShop?.medals,0,5),aurora:safeInt(value.dailyShop?.aurora,0,1)},
    rushPaidMarker:safeInt(value.rushPaidMarker,0,Number.MAX_SAFE_INTEGER),
    ownedSkins: union(['kusa-theme-1'],list(value.ownedSkins).filter(id=>id.length<=80&&!retiredIds.includes(id))),
    equippedSkins: {profile:'',site:typeof value.equippedSkins?.site==='string'&&list(value.ownedSkins).includes(value.equippedSkins.site)&&!retiredIds.includes(value.equippedSkins.site)?value.equippedSkins.site:'kusa-theme-1',cabinet:''},
    cardDisplayModes: value.cardDisplayModes && typeof value.cardDisplayModes === 'object' ? Object.fromEntries(Object.entries(value.cardDisplayModes).filter(([,mode])=>['normal','processed','awakened'].includes(mode))) : {},
    cardDisplayStyles: value.cardDisplayStyles && typeof value.cardDisplayStyles==='object' ? Object.fromEntries(Object.entries(value.cardDisplayStyles).filter(([id])=>normalizedRefinements[id]).map(([id])=>[id,'真鍮プレート'])) : {},
    cardProcessedAt: value.cardProcessedAt && typeof value.cardProcessedAt === 'object' ? Object.fromEntries(Object.entries(value.cardProcessedAt).filter(([,date])=>typeof date==='string'&&!Number.isNaN(Date.parse(date)))) : {},
    cardProcessedDates: normalizedProcessedDates,
    awakenedCards: value.awakenedCards && typeof value.awakenedCards === 'object' ? Object.fromEntries(Object.entries(value.awakenedCards).filter(([id,date]) => typeof date === 'string' && !Number.isNaN(Date.parse(date)))) : {},
    commemorativeMedals: normalizedCommemorativeMedals,
    displayedCommemorativeMedal: COMMEMORATIVE_MEDALS.includes(value.displayedCommemorativeMedal)
      && normalizedCommemorativeMedals[value.displayedCommemorativeMedal]
      ? value.displayedCommemorativeMedal
      : '',
    specialPrizes: {
      silver: safeInt(specialPrizes.silver, 0, Number.MAX_SAFE_INTEGER),
      gold: safeInt(specialPrizes.gold, 0, Number.MAX_SAFE_INTEGER),
      season: 0,
    },
    seasonCapsules: 0,
    unlockedSeasonRewards: [],
    unlockedTitles: Array.isArray(value.unlockedTitles)
      ? [...new Set(value.unlockedTitles.filter(item => typeof item === 'string' && item.length <= 80 && !retiredTitles.includes(item)))].slice(0, 100)
      : [],
    equippedTitle: typeof value.equippedTitle === 'string' && value.equippedTitle.length <= 80 && !retiredTitles.includes(value.equippedTitle) ? value.equippedTitle : '',
    profileTitleSelection: typeof value.profileTitleSelection==='string' && value.profileTitleSelection.length<=120 ? value.profileTitleSelection : '',
    unlockedThemes,
    selectedTheme: unlockedThemes.includes(value.selectedTheme) ? value.selectedTheme : 'grassland',
    unlockedAchievements: Array.isArray(value.unlockedAchievements)
      ? [...new Set(value.unlockedAchievements.filter(item => typeof item === 'string'))].slice(0, 100)
      : [],
    sound: value.sound !== false,
    strongEffects: value.strongEffects !== false,
    cameraMode: safeInt(value.cameraMode, 0, 2),
    lastPlayedAt: typeof value.lastPlayedAt === 'string' ? value.lastPlayedAt : '',
  };
}

function normalizeSave(value = {}) {
  const accounts = {};
  if (value.accounts && typeof value.accounts === 'object') {
    Object.entries(value.accounts).forEach(([key, account]) => {
      if (typeof key === 'string' && key.length <= 80) accounts[key] = normalizeAccount(account);
    });
  }
  return {
    version: 2,
    selectedPlayerId: typeof value.selectedPlayerId === 'string' ? value.selectedPlayerId : '',
    accounts,
  };
}

function profileId(profile, index = 0) {
  if (typeof profile?.rankingId === 'string' && profile.rankingId) return profile.rankingId;
  return `legacy:${String(profile?.name || 'player').slice(0, 30)}:${index}`;
}

export class MedalSave {
  constructor() {
    this.canSave = true;
    const raw=readJson(MEDAL_KEY, {});
    this.state = normalizeSave(raw);
    applyInputs(this.state,readJson(INPUT_KEY,{}));
    this.ensureSelection();
    if(hasLegacyPile(raw)||hasLegacyCharms(raw)||Object.values(raw.accounts||{}).some(a=>a.retirementVersion!==1))this.persist();
  }

  reload() {
    const raw = readJson(MEDAL_KEY, {});
    this.state = normalizeSave(raw);
    applyInputs(this.state,readJson(INPUT_KEY,{}));
    this.cachedSnapshot=readStorageText(MEDAL_KEY);
    this.ensureSelection();
    if(hasLegacyPile(raw)||hasLegacyCharms(raw))this.persist();
    return this.getAccount();
  }

  listPlayers() {
    const sharedPlayers = globalThis.KusaPlayerStore?.listPlayers?.();
    if (Array.isArray(sharedPlayers)) return sharedPlayers;
    const profiles = readJson(PROFILE_KEY, []);
    if (!Array.isArray(profiles)) return [];
    return profiles
      .filter(profile => profile && typeof profile.name === 'string' && profile.name.trim())
      .map((profile, index) => ({
        id: profileId(profile, index),
        name: profile.name.trim(),
        grass: KusaAmounts.normalize(profile.grass),
        balls: KusaAmounts.normalize(profile.balls),
      }));
  }

  ensureSelection() {
    const previousId=this.state.selectedPlayerId;
    let changed=false;
    const players = this.listPlayers();
    const activeId = globalThis.KusaPlayerStore?.getSelectedId?.() || globalThis.KusaPachiWallet?.getActivePlayerId?.();
    if (activeId && players.some(player => player.id === activeId)) this.state.selectedPlayerId = activeId;
    if (!players.some(player => player.id === this.state.selectedPlayerId)) {
      this.state.selectedPlayerId = players[0]?.id || '';
    }
    if (this.state.selectedPlayerId && !this.state.accounts[this.state.selectedPlayerId]) {
      changed=true;
      const selectedPlayer = players.find(player => player.id === this.state.selectedPlayerId);
      const legacyKey = selectedPlayer
        ? Object.keys(this.state.accounts).find(key => key.startsWith(`legacy:${selectedPlayer.name.slice(0, 30)}:`))
        : '';
      if (legacyKey) this.state.accounts[this.state.selectedPlayerId] = normalizeAccount(this.state.accounts[legacyKey]);
      else this.state.accounts[this.state.selectedPlayerId] = normalizeAccount();
    }
    // Freeze missing legacy names once. Keep the original date/serial and all holdings.
    players.forEach(player => {
      const account = this.state.accounts[player.id];
      if (!account) return;
      Object.values(account.commemorativeMedals).forEach(medal => {
        if (!medal.playerNameAtMint) {
          changed=true;
          medal.playerNameAtMint = player.name;
          medal.ownerPlayerId = player.id;
          medal.migrated = true;
        }
      });
    });
    // Read-only profile refreshes must not write stale snapshots back. In two
    // tabs such a redundant write could undo another tab's successful mint.
    if(changed||this.state.selectedPlayerId!==previousId)this.persist();
  }

  selectPlayer(id) {
    if (!this.listPlayers().some(player => player.id === id)) return false;
    this.state.selectedPlayerId = id;
    if (!this.state.accounts[id]) this.state.accounts[id] = normalizeAccount();
    if (!this.persist()) return false;
    globalThis.KusaPlayerStore?.select?.(id);
    window.dispatchEvent(new CustomEvent('kusa-player-changed', {detail: {playerId: id}}));
    return true;
  }

  get selectedPlayerId() {
    return this.state.selectedPlayerId;
  }

  getPlayer() {
    return this.listPlayers().find(player => player.id === this.state.selectedPlayerId) || null;
  }

  getAccount() {
    const id = this.state.selectedPlayerId;
    if (!id) return normalizeAccount();
    if (!this.state.accounts[id]) this.state.accounts[id] = normalizeAccount();
    return normalizeAccount(this.state.accounts[id],true);
  }

  updateAccount(mutator, {playerId='',expectedRevision,inputCursor} = {}) {
    // Do not overwrite another tab's capsule/shop changes with a stale game snapshot.
    this.reload();
    const id = playerId || this.state.selectedPlayerId;
    if (!id || (playerId && !this.state.accounts[id])) return {ok: false, account: normalizeAccount()};
    const current=this.state.accounts[id];
    if(expectedRevision!==undefined&&current.boardState&&(current.boardState.revision!==expectedRevision||(current.boardState.inputCursor||0)>inputCursor))return {ok:false,account:normalizeAccount(current,true)};
    const previous = normalizeAccount(current);
    const draft = normalizeAccount(previous);
    mutator(draft);
    this.state.accounts[id] = normalizeAccount(draft);
    if (!this.persist()) {
      this.state.accounts[id] = previous;
      return {ok: false, account: previous};
    }
    window.dispatchEvent(new CustomEvent('kusa-medal-save-changed', {detail: {playerId: id}}));
    return {ok: true, account: normalizeAccount(this.state.accounts[id],true)};
  }

  recordInput(coins,expectedPlayerId,expectedRevision,expectedCursor=0) {
    if(globalThis.KusaBackupSession?.isCurrent()===false)return {ok:false,reason:'save'};
    // Refresh only when another operation changed the durable snapshot. Avoid
    // normalizing thousands of board objects for each immediate button press.
    const rawText=readStorageText(MEDAL_KEY);
    if(rawText!==this.cachedSnapshot)this.reload();
    const id=this.selectedPlayerId,account=this.getAccount();
    const active=globalThis.KusaPlayerStore?.getSelectedId?.();
    if(id!==expectedPlayerId||(active&&active!==id)||account.boardState?.revision!==expectedRevision||account.inputWalletCursor!==expectedCursor)return {ok:false,reason:'player'};
    if(account.medals<coins.length)return {ok:false,reason:'medals'};
    const journal=readJson(INPUT_KEY,{version:1,accounts:{}});journal.accounts??={};
    const log=journal.accounts[id]||{next:0,entries:[]};
    // A different tab's uncommitted insert invalidates this live board.
    const latest=Math.max(log.next||0,account.inputWalletCursor||0,account.boardState?.inputCursor||0);
    if((log.entries||[]).some(e=>e.seq>(account.inputWalletCursor||0)))return {ok:false,reason:'player'};
    if(latest>=Number.MAX_SAFE_INTEGER)return {ok:false,reason:'save'};
    const seq=latest+1;
    log.next=seq;log.entries??=[];log.entries.push({seq,at:new Date().toISOString(),coins});journal.accounts[id]=log;
    if(!writeJson(INPUT_KEY,journal)){this.canSave=false;return {ok:false,reason:'save'};}
    // Update only the wallet in memory. The live physics already contains the
    // new objects; reloading reconstructs them from the journal after a crash.
    const next=this.state.accounts[id];next.medals=KusaAmounts.sub(next.medals,coins.length);next.totalCoinsPlayed=Math.min(Number.MAX_SAFE_INTEGER,next.totalCoinsPlayed+coins.length);next.inputWalletCursor=seq;next.lastPlayedAt=log.entries.at(-1).at;
    return {ok:true,account:this.getAccount(),seq};
  }

  trimInputJournal() {
    const journal=readJson(INPUT_KEY,{version:1,accounts:{}});let changed=false;
    for(const [id,log] of Object.entries(journal.accounts||{})){
      const cursor=this.state.accounts[id]?.boardState?.inputCursor||0;
      const entries=(log.entries||[]).filter(e=>e.seq>cursor);
      if(entries.length!==(log.entries||[]).length){log.entries=entries;changed=true;}
    }
    if(changed)writeJson(INPUT_KEY,journal);
  }

  spendMedals(amount) {
    amount = safeInt(amount);
    const account = this.getAccount();
    if (!amount || account.medals < amount) return false;
    return this.updateAccount(next => {
      next.medals=KusaAmounts.sub(next.medals,amount);
      next.totalCoinsPlayed = Math.min(Number.MAX_SAFE_INTEGER, next.totalCoinsPlayed + amount);
      next.lastPlayedAt = new Date().toISOString();
    }).ok;
  }

  exchangeGrass(grassCost, medalAmount) {
    if(!KusaAmounts.valid(grassCost)||!KusaAmounts.valid(medalAmount)||KusaAmounts.cmp(grassCost,KusaAmounts.mul(medalAmount,10))!==0)return {ok:false,reason:'invalid'};
    return this.exchangeMedalWallet(grassCost,medalAmount);
  }

  exchangeMedals(medalCost) {
    if(!KusaAmounts.valid(medalCost)||KusaAmounts.cmp(medalCost,1)<0)return {ok:false,reason:'invalid'};
    return this.exchangeMedalWallet(KusaAmounts.mul(medalCost,-10),KusaAmounts.mul(medalCost,-1));
  }

  exchangeMedalWallet(grassCost,medalAmount) {
    if(!KusaAmounts.signed(grassCost)||!KusaAmounts.signed(medalAmount)||KusaAmounts.cmp(medalAmount,0)===0||KusaAmounts.cmp(grassCost,KusaAmounts.mul(medalAmount,10))!==0)return {ok:false,reason:'invalid'};
    this.reload();
    const selected = this.state.selectedPlayerId;
    if (!selected || !grassCost || !medalAmount) return {ok: false, reason: 'invalid'};
    const profiles = readJson(PROFILE_KEY, []);
    if (!Array.isArray(profiles)) return {ok: false, reason: 'profiles'};
    const index = profiles.findIndex((profile, position) => profileId(profile, position) === selected);
    if (index < 0) return {ok: false, reason: 'player'};
    const grass = KusaAmounts.normalize(profiles[index].grass);
    const account = this.getAccount();
    if (KusaAmounts.cmp(grass,grassCost)<0) return {ok: false, reason: 'grass'};
    if(KusaAmounts.cmp(KusaAmounts.add(account.medals,medalAmount),0)<0)return {ok:false,reason:'medals'};

    profiles[index].grass = KusaAmounts.sub(grass,grassCost);
    let previousProfiles;
    try {previousProfiles=localStorage.getItem(PROFILE_KEY);}catch{return {ok:false,reason:'save'};}
    const previousState = JSON.stringify(this.state);
    if (!writeJson(PROFILE_KEY, profiles)) return {ok: false, reason: 'save'};
    this.state.accounts[selected] = {...account, medals: KusaAmounts.add(account.medals,medalAmount)};
    if (!this.persist()) {
      try {
        if (previousProfiles === null) localStorage.removeItem(PROFILE_KEY);
        else localStorage.setItem(PROFILE_KEY, previousProfiles);
        this.state = normalizeSave(JSON.parse(previousState));
      } catch { /* 最善の復元を行った後は画面側で保存失敗を通知する */ }
      return {ok: false, reason: 'save'};
    }
    globalThis.KusaPlayerStore?.syncPachiProfiles?.(profiles);
    window.dispatchEvent(new CustomEvent('kusa-medal-grass-changed', {detail: {playerId: selected}}));
    window.dispatchEvent(new CustomEvent('kusa-medal-save-changed', {detail: {playerId: selected}}));
    return {ok: true, player: this.getPlayer(), account: this.getAccount()};
  }

  grassify({grassCost = 100000, chipCost = 5000} = {}) {
    this.reload();
    grassCost = safeInt(grassCost);
    chipCost = safeInt(chipCost);
    const selected = this.state.selectedPlayerId;
    if (!selected || !grassCost || !chipCost) return {ok: false, reason: 'invalid'};
    const account = this.getAccount();
    if (account.level < LEVEL_CAP) return {ok: false, reason: 'level'};
    if (account.chips < chipCost) return {ok: false, reason: 'chips'};
    const profiles = readJson(PROFILE_KEY, []);
    if (!Array.isArray(profiles)) return {ok: false, reason: 'profiles'};
    const index = profiles.findIndex((profile, position) => profileId(profile, position) === selected);
    if (index < 0) return {ok: false, reason: 'player'};
    const grass = KusaAmounts.normalize(profiles[index].grass);
    if (grass < grassCost) return {ok: false, reason: 'grass'};

    let previousProfiles;
    try { previousProfiles = localStorage.getItem(PROFILE_KEY); } catch { return {ok: false, reason: 'save'}; }
    const previousState = JSON.stringify(this.state);
    profiles[index].grass = KusaAmounts.sub(grass,grassCost);
    if (!writeJson(PROFILE_KEY, profiles)) return {ok: false, reason: 'save'};
    this.state.accounts[selected] = normalizeAccount({...account,
      medals: 0,
      chips: 0,
      jackpotMeter: 0,
      level: 1,
      levelXp: 0,
      boardState: null,
      comboCharmSeconds: 0,
      grassRank: account.grassRank + 1,
      grassifications: account.grassifications + 1,
      unlockedTitles: [...account.unlockedTitles, `草位 ${account.grassRank + 1}`],
      equippedTitle: `草位 ${account.grassRank + 1}`,
      profileTitleSelection: `grass:草位 ${account.grassRank + 1}`,
      lastPlayedAt: new Date().toISOString(),
    });
    if (!this.persist()) {
      try {
        if (previousProfiles === null) localStorage.removeItem(PROFILE_KEY);
        else localStorage.setItem(PROFILE_KEY, previousProfiles);
        this.state = normalizeSave(JSON.parse(previousState));
      } catch { /* 保存失敗時は可能な範囲で復元する */ }
      return {ok: false, reason: 'save'};
    }
    globalThis.KusaPlayerStore?.syncPachiProfiles?.(profiles);
    window.dispatchEvent(new CustomEvent('kusa-medal-grass-changed', {detail: {playerId: selected}}));
    window.dispatchEvent(new CustomEvent('kusa-medal-save-changed', {detail: {playerId: selected}}));
    return {ok: true, player: this.getPlayer(), account: this.getAccount()};
  }

  mintCommemorativeMedal(id, chipCost, {expectedPlayerId = ''} = {}) {
    if (!COMMEMORATIVE_MEDALS.includes(id)) return {ok: false, reason: 'medal'};
    chipCost = safeInt(chipCost);
    if (chipCost !== COMMEMORATIVE_COST) return {ok: false, reason: 'cost'};
    this.reload();
    const player = this.getPlayer();
    if (!player || (expectedPlayerId && player.id !== expectedPlayerId)) return {ok:false, reason:'player'};
    const account = this.getAccount();
    if (account.commemorativeMedals[id]) return {ok: false, reason: 'minted'};
    const ids = [...new Set((globalThis.KusaGachaInventory?.listAllCards?.() || []).map(card => card.id).filter(Boolean))];
    if (!ids.length || !ids.every(cardId => account.refinements[cardId]?.length > 0)) return {ok:false, reason:'condition'};
    if (account.chips < chipCost) return {ok: false, reason: 'chips'};
    const mintedAt = new Date().toISOString();
    let serialNumber;
    try { serialNumber = newCommemorativeSerial(this.state); } catch { return {ok:false, reason:'random'}; }
    const result = this.updateAccount(next => {
      next.chips=KusaAmounts.sub(next.chips,chipCost);
      next.commemorativeMedals[id] = {mintedAt, serialNumber, playerNameAtMint:player.name, ownerPlayerId:player.id,
        mintedDate:commemorativeDate(mintedAt), modelVersion:'v3', engravingVersion:1};
    });
    return result.ok
      ? {ok: true, account: result.account, medal: result.account.commemorativeMedals[id]}
      : {ok: false, reason: 'save'};
  }

  setDisplayedCommemorativeMedal(id = '') {
    if (id !== '' && !COMMEMORATIVE_MEDALS.includes(id)) return {ok: false, reason: 'medal'};
    const account = this.getAccount();
    if (id && !account.commemorativeMedals[id]) return {ok: false, reason: 'minted'};
    return this.updateAccount(next => { next.displayedCommemorativeMedal = id; });
  }

  persist() {
    this.canSave=writeJson(MEDAL_KEY, this.state);
    if(this.canSave){this.cachedSnapshot=readStorageText(MEDAL_KEY);this.trimInputJournal();}
    return this.canSave;
  }
}

export {MEDAL_KEY, PROFILE_KEY, normalizeAccount, LEVEL_CAP, SEASON_REWARDS, COMMEMORATIVE_MEDALS};
