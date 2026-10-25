(() => {
  'use strict';

  const KEY = 'kusaPlayerStoreV1';
  const PROFILE_KEY = 'kusaPachiProfilesV1';
  const GACHA_KEY = 'kusa-jiten-gacha-v1';
  const REWARDS_KEY = 'kusaPachiRewardsV1';
  const ID_PATTERN = /^[a-f0-9]{32}$/;


  const numberValue = (value, fallback = 0, max = Number.MAX_SAFE_INTEGER) =>
    Number.isSafeInteger(value) && value >= 0 ? Math.min(value, max) : fallback;

  function newId() {
    const bytes = new Uint8Array(16);
    if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  }

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    if (window.KusaBackupSession?.isCurrent() === false) return false;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function blankGacha() {
    return {lastDrawAt: 0, obtainedCards: [], cardCounts: {}, favoriteCards: [], grassPoint: 0};
  }

  function normalizeGacha(value = {}) {
    const obtainedCards = Array.isArray(value.obtainedCards)
      ? [...new Set(value.obtainedCards.filter(item => typeof item === 'string' && item.length <= 100))].slice(0, 10000)
      : [];
    const obtained = new Set(obtainedCards);
    const cardCounts = {};
    if (value.cardCounts && typeof value.cardCounts === 'object') {
      Object.entries(value.cardCounts).forEach(([id, count]) => {
        // Duplicate counts only exist after the first copy has been discovered.
        // Old mixed saves can contain counts without ownership; do not expose
        // those orphaned counts in the book, workshop, fishing, or exports.
        if (typeof id === 'string' && id.length <= 100 && obtained.has(id) && globalThis.KusaCardCounts.compare(count, 0) > 0) cardCounts[id] = globalThis.KusaCardCounts.normalize(count);
      });
    }
    obtainedCards.forEach(id => { if (globalThis.KusaCardCounts.compare(cardCounts[id], 1) < 0) cardCounts[id] = '1'; });
    return {
      lastDrawAt: Number.isFinite(value.lastDrawAt) && value.lastDrawAt >= 0 ? value.lastDrawAt : 0,
      obtainedCards,
      cardCounts,
      favoriteCards: Array.isArray(value.favoriteCards)
        ? [...new Set(value.favoriteCards.filter(item => typeof item === 'string' && item.length <= 100 && obtained.has(item)))].slice(0, 500)
        : [],
      grassPoint: KusaAmounts.normalize(value.grassPoint)
    };
  }

  function normalizeRewards(value = {}) {
    return {tickets: KusaAmounts.normalize(value.tickets)};
  }

  function normalizePlayer(value = {}, id) {
    return {
      id,
      welcomeBonus: {eligible:value.welcomeBonus?.eligible===true, claimed:value.welcomeBonus?.claimed===true},
      claimedAnnouncements: Array.isArray(value.claimedAnnouncements) ? [...new Set(value.claimedAnnouncements.filter(id => typeof id === 'string' && id.length < 100))] : [],
      name: typeof value.name === 'string' ? value.name.trim().slice(0, 20) : 'プレイヤー',
      grass: KusaAmounts.normalize(value.grass),
      balls: KusaAmounts.normalize(value.balls),
      // Keep this migration marker: dropping it rewrites updatedAt on every
      // refresh and makes two tabs bounce storage events back and forth.
      medalCompatibility: value.medalCompatibility === true,
      createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
      gacha: value.gacha && typeof value.gacha === 'object' ? normalizeGacha(value.gacha) : null,
      rewards: value.rewards && typeof value.rewards === 'object' ? normalizeRewards(value.rewards) : null
    };
  }

  function normalizeStore(value = {}) {
    const players = {};
    if (value.players && typeof value.players === 'object') {
      Object.entries(value.players).forEach(([id, player]) => {
        if (ID_PATTERN.test(id)) players[id] = normalizePlayer(player, id);
      });
    }
    return {
      version: 1,
      legacyDataMigrated: value.legacyDataMigrated === true,
      selectedPlayerId: typeof value.selectedPlayerId === 'string' ? value.selectedPlayerId : '',
      players,
      themePreferences: normalizeThemePreferences(value.themePreferences)
    };
  }

  function normalizeThemePreferences(value = {}) {
    value = value && typeof value === 'object' ? value : {};
    return {paper: value.paper === 'plain' ? 'plain' : 'grass',
      siteFrame: value.siteFrame === 'simple' ? 'simple' : 'grass',
      profile: value.profile === 'plain' ? 'plain' : 'meadow',
      frame: value.frame === 'simple' ? 'simple' : 'basic',
      night: value.night === true,
      bgmTrack: ['theme','silent-snowfield'].includes(value.bgmTrack) ? value.bgmTrack : 'theme',
      bgmVolume: Number.isFinite(value.bgmVolume) && (value.bgmVolumeUserSet === true || value.bgmVolume !== .12) ? Math.max(0, Math.min(1, value.bgmVolume)) : .5,
      bgmVolumeUserSet: value.bgmVolumeUserSet === true || (Number.isFinite(value.bgmVolume) && value.bgmVolume !== .12 && value.bgmVolume !== .5)};
  }

  function readRawStore() {
    return normalizeStore(readJson(KEY, {}));
  }

  function emit(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(name, {detail}));
  }

  function readProfiles() {
    const profiles = readJson(PROFILE_KEY, []);
    return Array.isArray(profiles) ? profiles.filter(profile => profile && typeof profile.name === 'string' && profile.name.trim()) : [];
  }

  function migrate() {
    const state = readRawStore();
    const profiles = readProfiles();
    const used = new Set();
    let profilesChanged = false;
    const legacyIds = [];
    profiles.forEach((profile, index) => {
      let id = ID_PATTERN.test(profile.rankingId) && !used.has(profile.rankingId) ? profile.rankingId : newId();
      used.add(id);
      if (profile.rankingId !== id) {
        profile.rankingId = id;
        profilesChanged = true;
      }
      legacyIds.push(`legacy:${String(profile.name).slice(0, 30)}:${index}`);
      const previous = state.players[id] || {};
      state.players[id] = normalizePlayer({
        ...previous,
        name: profile.name,
        grass: profile.grass,
        balls: profile.balls,
        createdAt: previous.createdAt || profile.firstPlayedAt
      }, id);
    });

    const medal = readJson('kusaMedalSaveV1', {});
    const accounts = medal?.accounts && typeof medal.accounts === 'object' ? medal.accounts : {};
    profiles.forEach((profile, index) => {
      const id = profile.rankingId;
      const legacyId = legacyIds[index];
      const existing = accounts[id] || accounts[legacyId];
      if (existing && !state.players[id].medalCompatibility) {
        // MedalSave remains the owner of the detailed medal account; this marker
        // lets future migrations know that the stable ID was already connected.
        state.players[id].medalCompatibility = true;
        state.players[id].updatedAt = new Date().toISOString();
      }
    });

    const playerIds = Object.keys(state.players);
    if (!playerIds.includes(state.selectedPlayerId)) {
      const oldSelected = typeof medal.selectedPlayerId === 'string' ? medal.selectedPlayerId : '';
      const oldIndex = legacyIds.indexOf(oldSelected);
      state.selectedPlayerId = playerIds.includes(oldSelected)
        ? oldSelected
        : playerIds[oldIndex >= 0 ? oldIndex : 0] || '';
    }

    if (!state.legacyDataMigrated) {
      // Legacy globals belong to the original data slot, never to whichever
      // new player happens to be selected during a later profile refresh.
      const original = state.players[playerIds[0]];
      if (original && !Object.values(state.players).some(player => player.gacha)) original.gacha = normalizeGacha(readJson(GACHA_KEY, {}));
      if (original && !Object.values(state.players).some(player => player.rewards)) original.rewards = normalizeRewards(readJson(REWARDS_KEY, {}));
      state.legacyDataMigrated = true;
    }
    Object.values(state.players).forEach(player => { player.gacha ||= blankGacha(); player.rewards ||= normalizeRewards(); });

    if (profilesChanged) writeJson(PROFILE_KEY, profiles);
    writeJson(KEY, state);
    return state;
  }

  let state = migrate();

  function persist(next = state) {
    const normalized = normalizeStore(next);
    if (!writeJson(KEY, normalized)) return false;
    state = normalized;
    return true;
  }

  function selected() {
    return state.selectedPlayerId ? state.players[state.selectedPlayerId] || null : null;
  }

  function getBallBalances(id = state.selectedPlayerId) {
    const profile = readProfiles().find(profile => profile.rankingId === id);
    const kusa = KusaAmounts.normalize(profile?.balls ?? state.players[id]?.balls);
    const glass = KusaAmounts.normalize(readJson('glassGirlMachineV1:' + encodeURIComponent(id), {})?.balls);
    return {kusa, glass, total: KusaAmounts.add(kusa, glass)};
  }

  function listPlayers() {
    state = readRawStore();
    // Pull current grass/balls/names from the compatibility profile array so a
    // save made by an older game build is immediately visible everywhere.
    const profiles = readProfiles();
    const byId = new Map(profiles.filter(profile => ID_PATTERN.test(profile.rankingId)).map(profile => [profile.rankingId, profile]));
    let changed = false;
    Object.values(state.players).forEach(player => {
      const profile = byId.get(player.id);
      if (!profile) return;
      if (player.name !== profile.name || player.grass !== KusaAmounts.normalize(profile.grass) || player.balls !== KusaAmounts.normalize(profile.balls)) {
        player.name = profile.name;
        player.grass = KusaAmounts.normalize(profile.grass);
        player.balls = KusaAmounts.normalize(profile.balls);
        player.updatedAt = new Date().toISOString();
        changed = true;
      }
    });
    if (changed) persist();
    return Object.values(state.players).map(player => ({id: player.id, name: player.name, grass: player.grass, balls: player.balls, totalBalls: getBallBalances(player.id).total}));
  }

  function syncPachiProfiles(profiles, createdPlayerId = '') {
    if (!Array.isArray(profiles)) return false;
    state = readRawStore();
    let changed = false;
    profiles.forEach(profile => {
      if (!profile || !ID_PATTERN.test(profile.rankingId)) return;
      const previous = state.players[profile.rankingId];
      const next = normalizePlayer({
        ...previous,
        welcomeBonus: previous?.welcomeBonus || {eligible:profile.rankingId===createdPlayerId,claimed:false},
        name: profile.name,
        grass: profile.grass,
        balls: profile.balls,
        createdAt: previous?.createdAt || profile.firstPlayedAt,
        gacha: previous?.gacha || blankGacha(), rewards: previous?.rewards || normalizeRewards()
      }, profile.rankingId);
      if (JSON.stringify(previous) !== JSON.stringify(next)) changed = true;
      state.players[profile.rankingId] = next;
    });
    if (!state.selectedPlayerId && profiles[0]?.rankingId) {
      state.selectedPlayerId = profiles[0].rankingId;
      changed = true;
    }
    if (changed) persist();
    return changed;
  }

  function select(id) {
    state = readRawStore();
    if (!ID_PATTERN.test(id) || !state.players[id]) return false;
    if (state.selectedPlayerId === id) return true;
    if (!persist({...state, selectedPlayerId: id})) return false;
    emit('kusa-player-changed', {playerId: id, player: {...state.players[id]}});
    emit('kusa-player-selected', {playerId: id});
    return true;
  }

  function removePlayer(id) {
    state = readRawStore();
    if (!ID_PATTERN.test(id) || !state.players[id]) return false;
    const next = normalizeStore(state), profiles = readProfiles().filter(profile => profile.rankingId !== id);
    delete next.players[id];
    if (next.selectedPlayerId === id) next.selectedPlayerId = Object.keys(next.players)[0] || '';
    const medal = readJson('kusaMedalSaveV1', {});
    if (medal.accounts) {
      delete medal.accounts[id];
      const prefix = `legacy:${state.players[id].name.slice(0, 30)}:`;
      for (const key of Object.keys(medal.accounts)) if (key.startsWith(prefix)) delete medal.accounts[key];
    }
    medal.selectedPlayerId = next.selectedPlayerId;
    const inputs = readJson('kusaMedalInputJournalV1', {});
    if (inputs.accounts) delete inputs.accounts[id];
    const entries = [[PROFILE_KEY, JSON.stringify(profiles)], ['kusaMedalSaveV1', JSON.stringify(medal)], ['kusaMedalInputJournalV1', JSON.stringify(inputs)], ['glassGirlMachineV1:' + encodeURIComponent(id), null], [KEY, JSON.stringify(next)]];
    if (!commitEntries(entries)) return false;
    state = next;
    emit('kusa-player-changed', {playerId: state.selectedPlayerId, removedPlayerId: id});
    emit('kusa-player-selected', {playerId: state.selectedPlayerId});
    return true;
  }

  function commitEntries(entries) {
    if (window.KusaBackupSession?.isCurrent() === false) return false;
    const before = [];
    try {
      for (const [key, value] of entries) {
        before.push([key, localStorage.getItem(key)]);
        if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
      }
      return true;
    } catch {
      for (const [key, value] of before.reverse()) try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch {}
      return false;
    }
  }

  function createPlayer(name) {
    name = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
    if (!name || name.length > 20) return {ok:false, message:'名前を1〜20文字で入力してください。'};
    state = migrate();
    if (Object.values(state.players).some(player => player.name === name)) return {ok:false, message:'同じ名前のデータが既にあります。別の名前にしてください。'};
    const id = newId(), now = new Date().toISOString();
    const player = normalizePlayer({name, grass:0, balls:5000, createdAt:now, welcomeBonus:{eligible:true,claimed:false}, gacha:blankGacha(), rewards:normalizeRewards()}, id);
    const next = normalizeStore({...state, selectedPlayerId:id, players:{...state.players, [id]:player}});
    const profiles = readProfiles();
    profiles.push({name, rankingId:id, grass:0, balls:5000, firstPlayedAt:now, lastPlayedAt:now});
    if (!commitEntries([[PROFILE_KEY, JSON.stringify(profiles)], [KEY, JSON.stringify(next)]])) return {ok:false, message:'データを保存できませんでした。'};
    state = next;
    emit('kusa-player-changed', {playerId:id, createdPlayerId:id});
    emit('kusa-player-selected', {playerId:id});
    return {ok:true, player:{...player}};
  }

  function getGachaState() {
    return normalizeGacha(selected()?.gacha || {});
  }

  function saveGacha(value) {
    state = readRawStore();
    const next = normalizeStore(state), player = next.players[state.selectedPlayerId];
    if (!player) return false;
    player.gacha = normalizeGacha(value);
    player.updatedAt = new Date().toISOString();
    const ok = persist(next);
    if (ok) emit('kusa-player-changed', {playerId: player.id, area: 'gacha'});
    return ok;
  }

  function getRewards() {
    return normalizeRewards(selected()?.rewards || {});
  }

  function saveRewards(value) {
    state = readRawStore();
    const next = normalizeStore(state), player = next.players[state.selectedPlayerId];
    if (!player) return false;
    player.rewards = normalizeRewards(value);
    player.updatedAt = new Date().toISOString();
    const ok = persist(next);
    if (ok) emit('kusa-player-changed', {playerId: player.id, area: 'rewards'});
    return ok;
  }

  // Read both balances and commit them under one exchange lock. Never route a
  // shared-grass debit through a cabinet save that may reload its old balance.
  async function exchangeGrassForTicket(expectedPlayerId) {
    const transact=()=>{
      try {
        const fresh=normalizeStore(JSON.parse(localStorage.getItem(KEY)||'null'));
        const target=fresh.players[expectedPlayerId];
        if(!target||fresh.selectedPlayerId!==expectedPlayerId)return {ok:false,reason:'player'};
        const profiles=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null');
        const profile=Array.isArray(profiles)&&profiles.find(p=>p.rankingId===expectedPlayerId);
        if(!profile||!KusaAmounts.valid(profile.grass))return {ok:false,reason:'save'};
        const cost=15000;
        if(KusaAmounts.cmp(profile.grass,cost)<0)return {ok:false,reason:'balance'};
        profile.grass=KusaAmounts.sub(profile.grass,cost);
        target.grass=profile.grass;
        target.rewards=normalizeRewards(target.rewards);
        target.rewards.tickets=KusaAmounts.add(target.rewards.tickets,1);
        target.updatedAt=new Date().toISOString();
        if(!commitEntries([[PROFILE_KEY,JSON.stringify(profiles)],[KEY,JSON.stringify(fresh)]]))return {ok:false,reason:'save'};
        state=fresh;
        emit('kusa-pachi-profile-changed',{playerId:expectedPlayerId});
        emit('kusa-player-changed',{playerId:expectedPlayerId,area:'rewards'});
        emit('kusa-rewards-changed');
        return {ok:true,grass:target.grass,tickets:target.rewards.tickets};
      }catch{return {ok:false,reason:'save'};}
    };
    try {
      if(navigator.locks?.request)return await navigator.locks.request('kusa-grass-ticket-exchange',transact);
      // IndexedDB read/write transactions serialize other tabs when Web Locks
      // are unavailable (including local previews).
      return await new Promise(resolve=>{
        let cancelled=false;
        const request=indexedDB.open('kusaGrassTicketLocksV1',1);
        request.onupgradeneeded=()=>request.result.createObjectStore('locks');
        request.onerror=()=>resolve({ok:false,reason:'save'});
        request.onblocked=()=>{cancelled=true;resolve({ok:false,reason:'busy'});};
        request.onsuccess=()=>{
          const db=request.result;if(cancelled){db.close();return;}
          let result;
          const tx=db.transaction('locks','readwrite'),store=tx.objectStore('locks');
          store.get('exchange').onsuccess=()=>{result=transact();store.put(Date.now(),'exchange');};
          tx.oncomplete=()=>{db.close();resolve(result||{ok:false,reason:'save'});};
          tx.onabort=()=>{db.close();resolve(result||{ok:false,reason:'save'});};
        };
      });
    }catch{return {ok:false,reason:'save'};}
  }

  function exportData() {
    return JSON.parse(JSON.stringify(state));
  }

  function importData(value) {
    const next = normalizeStore(value);
    if (!Object.keys(next.players).length && Object.keys(state.players).length) return false;
    if (!persist(next)) return false;
    emit('kusa-player-changed', {playerId: state.selectedPlayerId, imported: true});
    return true;
  }

  window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === null) {
      state = migrate();
      emit('kusa-player-changed', {playerId:state.selectedPlayerId, external:true});
    } else if (event.key === PROFILE_KEY) {
      state = migrate();
      emit('kusa-pachi-profile-changed', {playerId:state.selectedPlayerId, external:true});
    } else if (event.key === 'glassGirlMachineV1:' + encodeURIComponent(state.selectedPlayerId)) {
      emit('kusa-pachi-profile-changed', {playerId:state.selectedPlayerId, external:true});
    }
  });

  function claimLaunchGift(id = state.selectedPlayerId) {return patchTransaction(id,(p,a)=>{
    const giftId='20261020-launch';
    if(p.claimedAnnouncements.includes(giftId))return 'このデータでは受け取り済みです。';
    p.grass=KusaAmounts.add(p.grass,10000);a.chips=KusaAmounts.add(KusaAmounts.normalize(a.chips),1000);p.claimedAnnouncements.push(giftId);
  });}

  // Every reward and shop mutation shares the same cross-tab economy lock.
  function patchTransaction(expectedId, mutate) {
    const run=()=>{
      if(window.KusaBackupSession?.isCurrent()===false)return {ok:false,message:'保存データが更新されました。再読み込みしてください。'};
      const next=readRawStore(),target=next.players[expectedId];
      if(!target||next.selectedPlayerId!==expectedId)return {ok:false,message:'データが切り替わりました。操作し直してください。'};
      const profiles=readProfiles(),profile=profiles.find(p=>p.rankingId===expectedId);
      if(!profile)return {ok:false,message:'データを読み込めませんでした。'};
      const medal=readJson('kusaMedalSaveV1',{});medal.accounts ||= {};
      const account=medal.accounts[expectedId] ||= {};
      target.grass=KusaAmounts.normalize(profile.grass);
      const error=mutate(target,account);
      if(error)return {ok:false,message:error};
      profile.grass=target.grass;target.updatedAt=new Date().toISOString();
      if(!commitEntries([[PROFILE_KEY,JSON.stringify(profiles)],['kusaMedalSaveV1',JSON.stringify(medal)],[KEY,JSON.stringify(next)]]))return {ok:false,message:'保存できませんでした。所持品は変更していません。'};
      state=next;
      emit('kusa-player-changed',{playerId:expectedId});emit('kusa-pachi-profile-changed',{playerId:expectedId});emit('kusa-medal-save-changed',{playerId:expectedId});
      return {ok:true};
    };
    if(window.KusaEconomyLock)return window.KusaEconomyLock(run);
    if(navigator.locks?.request)return navigator.locks.request('kusa-economy',run);
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open('kusaEconomyLocksV1',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('locks');
      request.onerror=()=>reject(new Error('保存の安全確認ができません。'));
      request.onblocked=()=>reject(new Error('ほかのタブを閉じて再試行してください。'));
      request.onsuccess=()=>{const db=request.result,tx=db.transaction('locks','readwrite');let result;
        tx.objectStore('locks').get('economy').onsuccess=()=>{try{result=run();tx.objectStore('locks').put(Date.now(),'economy');}catch{tx.abort();}};
        tx.oncomplete=()=>{db.close();resolve(result||{ok:false,message:'保存できませんでした。'});};
        tx.onabort=()=>{db.close();resolve(result||{ok:false,message:'保存できませんでした。'});};
      };
    });
  }
  const patchDay=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
  function spoilerStatus(id=state.selectedPlayerId) {
    const a=readJson('kusaMedalSaveV1',{}).accounts?.[id]||{},day=patchDay();
    const active=a.settingReveal?.day===day;
    return {inventory:KusaAmounts.normalize(a.spoilerItems),purchased:a.settingRevealPurchaseDay===day,active,
      setting:active?window.KusaSharedPachiSetting.settingForJstDay(Date.now(),id):null};
  }
  function purchaseSpoiler(id) {return patchTransaction(id,(p,a)=>{
    if(a.settingRevealPurchaseDay===patchDay())return 'ネタバレで草は日本時間で1日1個まで購入できます。';
    if(KusaAmounts.cmp(p.grass,10000)<0)return '草が足りません。';
    p.grass=KusaAmounts.sub(p.grass,10000);a.spoilerItems=KusaAmounts.add(KusaAmounts.normalize(a.spoilerItems),1);a.settingRevealPurchaseDay=patchDay();
  });}
  function useSpoiler(id) {return patchTransaction(id,(_p,a)=>{
    if(a.settingReveal?.day===patchDay())return '本日の設定はすでに確認できます。アイテムは消費しません。';
    if(KusaAmounts.cmp(KusaAmounts.normalize(a.spoilerItems),1)<0)return 'ネタバレで草を持っていません。';
    a.spoilerItems=KusaAmounts.sub(a.spoilerItems,1);a.settingReveal={day:patchDay()};
  });}
  function claimPatchGift(id) {return patchTransaction(id,(p,a)=>{
    const giftId='20261025-economy-patch';
    if(p.claimedAnnouncements.includes(giftId))return 'このデータでは受け取り済みです。';
    a.chips=KusaAmounts.add(KusaAmounts.normalize(a.chips),3000);p.claimedAnnouncements.push(giftId);
  });}
  function claimWelcomeBonus(id) {return patchTransaction(id,(p,a)=>{
    if(!p.welcomeBonus.eligible||p.welcomeBonus.claimed)return '初回ボーナスの対象ではないか、すでに受け取り済みです。';
    p.grass=KusaAmounts.add(p.grass,1000);a.chips=KusaAmounts.add(KusaAmounts.normalize(a.chips),500);p.welcomeBonus.claimed=true;
  });}

  window.KusaPlayerStore = Object.freeze({
    spoilerStatus,purchaseSpoiler,useSpoiler,claimPatchGift,claimWelcomeBonus,
    claimLaunchGift,
    exchangeGrassForTicket,
    key: KEY,
    read: () => exportData(),
    listPlayers,
    getSelectedId: () => state.selectedPlayerId,
    getSelected: () => selected() ? {...selected(), totalBalls:getBallBalances().total} : null,
    getBallBalances,
    createPlayer,
    select,
    removePlayer,
    syncPachiProfiles,
    getGachaState,
    saveGachaState: saveGacha,
    getRewards,
    saveRewards,
    exportData,
    getThemePreferences: () => ({...state.themePreferences}),
    saveThemePreferences(value) {
      const ok = persist({...state, themePreferences: normalizeThemePreferences(value)});
      if (ok) emit('kusa-theme-changed', {preferences: {...state.themePreferences}});
      return ok;
    },
    importData,
    refresh: () => { state = migrate(); return exportData(); }
  });
})();
