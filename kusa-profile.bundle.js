(()=>{'use strict';const factories={"kusa-profile.js":function(load){
const {MedalSave}=load("kusa-medal/medal-save.js");
const {confirmAction, animateOffering}=load("kusa-action-ui.js");
const {createCommemorativeUI}=load("kusa-commemorative-ui.js");
const {capsuleTotal}=load("kusa-medal/medal-capsule-economy.js");
const {offerCard, offerChips, toggleFavorite, rewardGachaDuplicate, XP_FOR_LEVEL, GRASSIFY_COST, OFFER_XP}=load("kusa-medal/medal-economy.js");

const $ = id => document.getElementById(id);
const el = {
  name: $('profilePlayerName'), title: $('profileTitle'), level: $('profileLevel'), levelProgress: $('profileLevelProgress'), levelNext: $('profileLevelNext'),
  grass: $('profileGrass'), balls: $('profileBalls'), bait: $('profileBait'), chips: $('profileChips'), collection: $('profileCollection'), capsules: $('profileCapsules'),
  offerCard: $('profileOfferCard'), offerButton: $('profileOfferCardButton'), offerChips: $('profileOfferChips'), favorite: $('profileFavoriteCard'), offerMessage: $('profileOfferingMessage'),
  grassify: $('profileGrassify'), grassifyMessage: $('profileGrassifyMessage'), records: $('profileRecords'), achievements: $('profileAchievements'), titleSelect: $('profileTitleSelect'),
  commemorativeOpen: $('commemorativeMedalOpen'), commemorativePreview: $('profileDisplayedMedal'), commemorativeModal: $('commemorativeMedalModal'), commemorativeClose: $('commemorativeMedalClose'), commemorativeSummary: $('commemorativeMedalSummary'), commemorativeList: $('commemorativeMedalList')
};
const save = new MedalSave();
globalThis.KusaGachaRewards=Object.freeze({awardDuplicate:()=>rewardGachaDuplicate(save)});
const commemorativeUI = createCommemorativeUI(save, {refresh:render});
const rarityOrder = ['N','R','SR','SSR','UR','GODR','Ω'];
const format = value => KusaAmounts.format(value || 0);
const playerManagement = createPlayerManagement();
let renderedPlayerId = save.selectedPlayerId;

function createPlayerManagement() {
  const host = document.querySelector('.kusa-profile-management');
  if (!host) return null;
  const panel = document.createElement('section');
  panel.className = 'profile-data-management';
  panel.setAttribute('aria-labelledby', 'profileDataHeading');
  // All player-provided names are assigned through textContent below.
  panel.innerHTML = '<h3 id="profileDataHeading">データを選ぶ・作成する</h3><p id="profileDataCurrent"></p><div class="profile-data-select-row"><label for="profileDataSelect">保存データ</label><select id="profileDataSelect"></select><button id="profileDataDelete" type="button">このデータを削除</button></div><form class="profile-data-create"><label for="profileDataName">新しいデータ名</label><input id="profileDataName" type="text" maxlength="20" autocomplete="off" placeholder="名前を入力（20文字まで）" required><button type="submit">作成して切り替え</button></form><p class="profile-data-help">草・チップ・図鑑・遊技記録は、データごとに保存されます。</p><p id="profileDataMessage" role="status" aria-live="polite"></p>';
  const grid = host.querySelector('.kusa-profile-grid');
  host.insertBefore(panel, grid);
  const select = panel.querySelector('#profileDataSelect');
  const remove = panel.querySelector('#profileDataDelete');
  const current = panel.querySelector('#profileDataCurrent');
  const name = panel.querySelector('#profileDataName');
  const message = panel.querySelector('#profileDataMessage');
  select.addEventListener('change', () => {
    const store = globalThis.KusaPlayerStore;
    const id = select.value;
    if (!store?.listPlayers().some(player => player.id === id)) return;
    const ok = store.select(id);
    message.textContent = ok ? `「${store.getSelected()?.name || ''}」に切り替えました。` : 'データを切り替えられませんでした。';
    render();
  });
  panel.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const result = globalThis.KusaPlayerStore?.createPlayer?.(name.value);
    message.textContent = result?.ok ? `「${result.player.name}」を作成し、切り替えました。` : result?.message || 'データを作成できませんでした。';
    if (result?.ok) name.value = '';
    render();
  });
  remove.addEventListener('click', async () => {
    const store = globalThis.KusaPlayerStore;
    const player = store?.getSelected();
    if (!player) return;
    const ok = await confirmAction({title:'データを削除',lines:[`削除するデータ：「${player.name}」`,'草・持ち球・チップ・図鑑・遊技記録など、このデータの記録をすべて削除します。','削除したデータは元に戻せません。'],action:'このデータを削除する',expectedPlayerId:player.id});
    if (!ok || store.getSelectedId() !== player.id || !store.listPlayers().some(item => item.id === player.id)) return;
    message.textContent = store.removePlayer(player.id) ? `「${player.name}」を削除しました。` : 'データを削除できませんでした。';
    render();
  });
  const balances = document.createElement('p'); balances.className = 'profile-data-help'; current.after(balances);
  return {select, remove, current, balances};
}

function renderPlayerManagement() {
  if (!playerManagement) return;
  const store = globalThis.KusaPlayerStore;
  const players = store?.listPlayers() || [];
  const selectedId = store?.getSelectedId() || '';
  const signature = JSON.stringify([selectedId, players.map(player => [player.id, player.name])]);
  if (playerManagement.select.dataset.signature !== signature) {
    playerManagement.select.dataset.signature = signature;
    playerManagement.select.replaceChildren();
    if (!players.length) {
      const option = document.createElement('option'); option.value = ''; option.textContent = '保存データはありません'; playerManagement.select.append(option);
    }
    for (const player of players) {
      const option = document.createElement('option'); option.value = player.id; option.textContent = player.name; playerManagement.select.append(option);
    }
    playerManagement.select.value = selectedId;
  }
  playerManagement.select.disabled = !players.length;
  playerManagement.remove.disabled = !selectedId;
  const selectedPlayer = players.find(player => player.id === selectedId);
  playerManagement.current.textContent = selectedPlayer ? `選択中のデータ：${selectedPlayer.name}` : 'データを作成すると、ここから遊び始められます。';
  const balls = selectedPlayer && store.getBallBalances?.(selectedId);
  playerManagement.balances.hidden = !balls;
  playerManagement.balances.textContent = balls ? `持ち球 合計 ${format(balls.total)}球（草パチ ${format(balls.kusa)}球 ／ ガラスの少女 ${format(balls.glass)}球）` : '';
}

function cards() { return globalThis.KusaGachaInventory?.listManagedCards?.() || []; }
function selected(select) { return cards().find(card => card.id === select.value) || null; }

function populate(select, empty) {
  const previous = select.value;
  const items = cards().sort((a,b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity) || a.title.localeCompare(b.title, 'ja'));
  const signature = JSON.stringify(items.map(card => [card.id, card.usable, card.favorite]));
  if (select.dataset.inventorySignature === signature) return selected(select);
  select.dataset.inventorySignature = signature;
  select.replaceChildren();
  if (!items.length) {
    const option = document.createElement('option'); option.value = ''; option.textContent = empty; select.append(option); return null;
  }
  items.forEach(card => {
    const option = document.createElement('option'); option.value = card.id;
    option.textContent = `${card.favorite ? '★ ' : ''}[${card.rarity}] ${card.emoji} ${card.title} ×${globalThis.KusaCardCounts.format(card.usable)}`;
    select.append(option);
  });
  if (items.some(card => card.id === previous)) select.value = previous;
  return selected(select);
}

function collectionText() { return $('gachaBookCount')?.textContent?.trim() || '0 / 0'; }

function renderCommemorativeMedals(account) { commemorativeUI.render(account); }

function renderTitles(account) {
  const pachiTitles=(globalThis.KusaPachiTitles?.listAcquired(save.selectedPlayerId)||[]).map(t=>({id:`pachi:${t.id}`,name:t.name,source:'草パチ'}));
  const glassTitles=(globalThis.GlassPachiTitles?.listAcquired(save.selectedPlayerId)||[]).map(t=>({id:`glass:${t.id}`,name:t.name,source:'ガラスの少女'}));
  const grassTitles=account.unlockedTitles.filter(t=>{
    const match=/^草位 ([1-9]\d*)$/.exec(t);
    return match&&Number.isSafeInteger(Number(match[1]))&&Number(match[1])<=account.grassRank;
  }).map(t=>({id:`grass:${t}`,name:t,source:'草位'}));
  const titles=[{id:'default',name:'草むら見習い',source:'初期称号'},...pachiTitles,...glassTitles,...grassTitles];
  const selected=titles.find(t=>t.id===account.profileTitleSelection)||titles.find(t=>t.name===account.equippedTitle)||titles[0];
  const signature=JSON.stringify([save.selectedPlayerId,titles,selected.id]);
  if(el.titleSelect.dataset.signature!==signature){
    el.titleSelect.dataset.signature=signature;el.titleSelect.replaceChildren();
    for(const t of titles){const option=document.createElement('option');option.value=t.id;option.textContent=t.source==='ガラスの少女'?`ガラスの少女：${t.name}`:t.source==='草パチ'?`草パチ：${t.name}`:t.name;el.titleSelect.append(option);}
    el.titleSelect.value=selected.id;
  }
  el.titleSelect.disabled=!save.selectedPlayerId;
  el.title.textContent=selected.name;
  renderAcquiredTitles(account,pachiTitles,glassTitles,grassTitles);
}

function renderAcquiredTitles(account,pachiTitles,glassTitles,grassTitles){
  const titles=[...pachiTitles,...glassTitles,...grassTitles];
  const signature=JSON.stringify(titles);
  if(el.achievements.dataset.signature===signature)return;
  el.achievements.dataset.signature=signature;el.achievements.replaceChildren();
  if(!titles.length){const empty=document.createElement('div');empty.className='is-empty';empty.textContent='獲得した称号はまだありません。';el.achievements.append(empty);return;}
  for(const title of titles){
    const item=document.createElement('div');item.className=`is-unlocked ${title.source==='ガラスの少女'?'title-source-glass':title.source==='草パチ'?'title-source-pachi':'title-source-grass'}`;
    const name=document.createElement('strong');name.textContent=`🏅 ${title.name}`;
    const source=document.createElement('small');source.textContent=title.source;
    item.append(name,source);el.achievements.append(item);
  }
}

function renderRecords(account, player) {
  const glass=globalThis.GlassPachiTitles?.summary(save.selectedPlayerId)||{};
  const signature = JSON.stringify([account.totalCardsOffered,player?.spins,player?.hits,glass.spins,glass.paidAwards]);
  if (el.records.dataset.signature === signature) return;
  el.records.dataset.signature = signature;
  el.records.replaceChildren();
  [
    ['草パチ総回転', player?.spins || 0], ['草パチ大当たり', player?.hits || 0],
    ['ガラスの少女 総回転',glass.spins||0],['ガラスの少女 払い出し',glass.paidAwards||0],
    ['カード奉納', account.totalCardsOffered],
  ].forEach(([label, value]) => {
    const node = document.createElement('span'); node.textContent = label;
    const strong = document.createElement('strong'); strong.textContent = format(value); node.append(strong); el.records.append(node);
  });
}

function render() {
  // 草パチ側で直近に保存された草・持ち球を、プロフィール描画前に再同期する。
  // 別ゲームを開いていない状態でも、既存の互換保存キーから最新値を拾えるようにする。
  globalThis.KusaPlayerStore?.refresh?.();
  save.reload();
  if (renderedPlayerId !== save.selectedPlayerId) {
    renderedPlayerId = save.selectedPlayerId;
    el.offerMessage.textContent = ''; el.grassifyMessage.textContent = '';
    el.offerCard.value = ''; delete el.offerCard.dataset.inventorySignature;
    document.querySelectorAll('.offering-particle,.offering-xp').forEach(node => node.remove());
  }
  const account = save.getAccount();
  const sharedPlayer = globalThis.KusaPlayerStore?.getSelected?.();
  const player = sharedPlayer
    ? {...sharedPlayer}
    : save.getPlayer();
  renderPlayerManagement();
  const hasPlayer = Boolean(player);
  const next = XP_FOR_LEVEL(account.level);
  const capped = account.level >= 50;
  el.name.textContent = player?.name || '名無しの草民';
  renderTitles(account);
  el.level.textContent = `Lv.${account.level}${account.grassRank ? ` / 草位 ${account.grassRank}` : ''}`;
  el.levelProgress.max = capped ? 1 : next; el.levelProgress.value = capped ? 1 : Math.min(next, account.levelXp);
  el.levelNext.textContent = !hasPlayer ? '育成・カード管理を開いて、データを作成してください。' : capped ? 'Lv.50到達：草化の資格あり' : `経験値 ${format(account.levelXp)} / ${format(next)}`;
  el.grass.textContent = format(player?.grass); el.balls.textContent = format(player?.totalBalls ?? player?.balls); el.bait.textContent = format(account.fishing?.bait); el.chips.textContent = format(account.chips);
  const ballBalances = player && globalThis.KusaPlayerStore?.getBallBalances?.(player.id);
  el.balls.title = ballBalances ? `持ち球の合計｜草パチ：${format(ballBalances.kusa)}球／ガラスの少女：${format(ballBalances.glass)}球` : '';
  el.collection.textContent = collectionText(); el.capsules.textContent = format(capsuleTotal(account));
  const offering = populate(el.offerCard, '奉納できるダブりなし');
  el.favorite.disabled = !hasPlayer || !offering; el.favorite.textContent = offering?.favorite ? '★ 保護を解除' : '☆ お気に入り保護';
  el.offerButton.disabled = !hasPlayer || !offering || offering.favorite || capped;
  el.offerChips.disabled = !hasPlayer || capped || account.chips < 500;
  el.grassify.disabled = !hasPlayer || !capped || account.chips < GRASSIFY_COST.chips || (player?.grass || 0) < GRASSIFY_COST.grass;
  renderRecords(account, player); renderCommemorativeMedals(account);
}

function refresh(messageElement, message) { if (messageElement) messageElement.textContent = message; render(); }

el.offerCard.addEventListener('change', render);
el.favorite.addEventListener('click', () => {
  const card = selected(el.offerCard); if (!card) return;
  const ok = toggleFavorite(card.id, !card.favorite);
  refresh(el.offerMessage, ok ? (card.favorite ? `${card.title}の保護を解除しました。` : `${card.title}をお気に入り保護しました。`) : 'お気に入り保護を保存できませんでした。');
});
el.offerButton.addEventListener('click', async () => {
  const card = selected(el.offerCard); if (!card) return;
  if (!await confirmAction({title:'カードを奉納',lines:[`${card.emoji} ${card.title}（${card.rarity}）`, '消費：ダブりカード 1枚', `獲得：${OFFER_XP[card.rarity]} XP`, '最初の1枚は残ります。保護中のカードは使用できません。'],action:'奉納する'})) return;
  const before = save.reload(); if(before.level>=50)return;
  const result = offerCard(save, card);
  refresh(el.offerMessage, result.ok ? `${card.title}を奉納しました。+${result.xp} XP` : '保護中、またはダブり不足のため奉納できませんでした。');
  if(result.ok)animateOffering(el.offerButton,card.emoji||'🃏',result.xp,before,result.account);
});
el.offerChips.addEventListener('click', async () => {
  if (!await confirmAction({title:'KUSAチップを奉納',lines:['消費：500 KUSAチップ','獲得：1 XP','奉納したチップは戻せません。'],action:'500チップを奉納'})) return;
  const before=save.reload(); if(before.level>=50)return;
  const result = offerChips(save, 500); refresh(el.offerMessage, result.ok ? '500チップを奉納しました。+1 XP' : 'チップが足りないか、保存できませんでした。');
  if(result.ok)animateOffering(el.offerChips,'🪙',result.xp,before,result.account);
});
el.titleSelect.addEventListener('change',()=>{const id=el.titleSelect.value;const name=el.titleSelect.selectedOptions[0]?.textContent.replace(/^(?:草パチ|ガラスの少女)：/,'')||'';const result=save.updateAccount(a=>{a.profileTitleSelection=id;a.equippedTitle=name;});refresh(el.grassifyMessage,result.ok?'プロフィールの称号を変更しました。':'称号を保存できませんでした。');});
el.grassify.addEventListener('click', async () => {
  if (!await confirmAction({title:'草化する',lines:['消費：100,000草・5,000チップ','チップ・ゲージ・レベル・盤面をリセットします。','図鑑、加工、取得済みカプセル、称号は残ります。未獲得カプセルは新しい盤面へ再投入されます。','取り消せません。'],action:'草化する',expectedPlayerId:save.selectedPlayerId})) return;
  const result = save.grassify({grassCost: GRASSIFY_COST.grass, chipCost: GRASSIFY_COST.chips});
  refresh(el.grassifyMessage, result.ok ? `草化成功！ 草位 ${result.account.grassRank} になりました。` : '草化の条件を満たしていないか、保存できませんでした。');
});
let pendingRender = 0;
function scheduleRender() { if (!pendingRender) pendingRender = requestAnimationFrame(() => { pendingRender = 0; render(); }); }
window.addEventListener('kusa-gacha-inventory-changed', scheduleRender);
window.addEventListener('kusa-player-changed', scheduleRender);
window.addEventListener('kusa-medal-save-changed', scheduleRender);
window.addEventListener('kusa-medal-grass-changed', scheduleRender);
window.addEventListener('kusa-pachi-profile-changed', scheduleRender);
window.addEventListener('storage', event => { if (event.key === 'kusaPachiProfilesV1' || event.key === 'kusaMedalSaveV1' || event.key === 'kusaPlayerStoreV1' || event.key?.startsWith('glassGirlMachineV1:')) render(); });
globalThis.KusaProfile = Object.freeze({refresh: render});
render();

return {};
},
"kusa-medal/medal-save.js":function(load){
const PROFILE_KEY = 'kusaPachiProfilesV1';
const MEDAL_KEY = 'kusaMedalSaveV1';
const INPUT_KEY = 'kusaMedalInputJournalV1';
const MAX_VALUE = Infinity; // Wallets use exact decimal integers, with no gameplay holding cap.
const LEVEL_CAP = 50;
const SEASON_REWARDS = ['reed-frame', 'brass-title', 'night-title'];
const COMMEMORATIVE_MEDALS = ['all-card-refinement'];
const COMMEMORATIVE_COST = 5000;
const SERIAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function commemorativeDate(value) {
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

function normalizeBoardState(value) {
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

class MedalSave {
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



return {commemorativeDate,normalizeBoardState,MedalSave,MEDAL_KEY,PROFILE_KEY,normalizeAccount,LEVEL_CAP,SEASON_REWARDS,COMMEMORATIVE_MEDALS};
},
"kusa-action-ui.js":function(load){
let activeConfirmation = null;
function confirmAction({title, lines, action = '実行する', expectedPlayerId = ''}) {
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

function animateOffering(origin, icon, xp, before, after) {
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

return {confirmAction,animateOffering};
},
"kusa-commemorative-ui.js":function(load){
const {confirmAction}=load("kusa-action-ui.js");

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

function createCommemorativeUI(save,{refresh}) {
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

return {createCommemorativeUI};
},
"kusa-medal/medal-capsule-economy.js":function(load){
const {SITE_THEMES}=load("kusa-medal/site-theme-catalog.js");
// Five capsule qualities share one reward table throughout the site.
const CAPSULES = Object.freeze({
  bronze:{name:'銅',color:'#bd7848',chips:[30,45],materials:[2,3],byproducts:0,paint:69},
  silver:{name:'銀',color:'#a9dce9',chips:[90,150],materials:[5,8],byproducts:0,paint:104},
  gold:{name:'金',color:'#ffbf24',chips:[240,360],materials:[12,18],byproducts:2,paint:173},
  rainbow:{name:'虹',color:'#ac79ee',chips:[600,900],materials:[30,45],byproducts:5,paint:345},
  special:{name:'特別',color:'#e86097',chips:[1500,2100],materials:[60,90],byproducts:12,paint:1035}
});
const CAPSULE_EDITIONS=Object.freeze({v2:CAPSULES});
const CAPSULE_EDITION='v2';
const SHOP_ITEMS = Object.freeze([
  {id:'medals',name:'メダル補給',description:'所持メダルに30枚追加します。日本時間で1日5回まで。',chips:500,dailyLimit:5},
  {id:'paint',name:'草彩片パック',description:'草彩片100個。日本時間で1日5回まで。',chips:500},
  {id:'aurora-key',name:'オーロラキー',description:'使用中は草ガチャの抽選がUR・GODR・Ωレアの3種類だけになります。次の午前0時（日本時間）まで有効。日本時間で1日1個まで。',chips:10000,dailyLimit:1}
]);
// Permanent site themes only. Cabinet sales remain retired.
const SHOP_SKINS = SITE_THEMES;
function cardCapsuleReward(card,account={}) {
  const tiers=['bronze','silver','gold','rainbow','special'];
  const base={N:0,R:0,SR:1,SSR:2,UR:3,GODR:4,'Ω':4}[card?.rarity]??0;
  const processed=!!account.refinements?.[card?.id]?.length;
  const awakened=processed&&!!account.awakenedCards?.[card?.id];
  const quality=tiers[Math.min(4,base+(processed?1:0))],count=awakened?2:1;
  return {quality,count,edition:CAPSULE_EDITION,label:`${CAPSULES[quality].name}カプセル ×${count}個を獲得`};
}
function capsuleTotal(account) {return Object.values(account.capsules||{}).reduce((n,b)=>KusaAmounts.add(n,Object.values(b).reduce((s,v)=>KusaAmounts.add(s,v),0)),0);}
function japanDay(now=Date.now()) {return new Date(now+9*3600000).toISOString().slice(0,10);}

// Web Locks on HTTPS/localhost; IndexedDB serializes fallback tabs on LAN HTTP/file.
function economyLock(action) {
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
function recoverCardUseJournal(){
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
function openCapsules(save,quality,count,expectedPlayerId,edition=CAPSULE_EDITION,random=Math.random) {
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
function purchaseSupply(save,id,expectedPlayerId,now=Date.now()) {
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
function skinOwned(account,skin) {return skin.starter===true||account.ownedSkins.includes(skin.id)||(skin.theme&&account.unlockedThemes.includes(skin.theme));}
function craftSkin(save,id,expectedPlayerId) {
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
function equipSkin(save,id,category,expectedPlayerId) {
  const skin=SHOP_SKINS.find(x=>x.id===id);
  if(id!=='default'&&(!skin||skin.category!==category))return {ok:false,message:'デザインが見つかりません。'};
  if(!['profile','site'].includes(category))return {ok:false,message:'筐体の交換・着せ替えはありません。'};
  return transaction(save,expectedPlayerId,a=>{
    if(skin&&!skinOwned(a,skin))throw new Error('先に購入してください。');
    a.equippedSkins[category]=id==='default'?(category==='site'?'kusa-theme-1':''):id;
    if(category==='cabinet')a.selectedTheme=skin?.theme||'grassland';
  });
}

return {CAPSULES,CAPSULE_EDITIONS,CAPSULE_EDITION,SHOP_ITEMS,SHOP_SKINS,cardCapsuleReward,capsuleTotal,japanDay,economyLock,recoverCardUseJournal,openCapsules,purchaseSupply,skinOwned,craftSkin,equipSkin};
},
"kusa-medal/site-theme-catalog.js":function(load){
// Single product registry. Rebuild the early bootstrap after editing this file.
const SITE_THEMES = Object.freeze([
  Object.freeze({id:'kusa-theme-1',name:'kusaテーマ1',description:'kusa事典の初期テーマ',category:'site',chips:0,paint:0,starter:true,permanent:true}),
  Object.freeze({id:'kusa-theme-2',name:'kusaテーマ2',description:'旧kusa事典を思い出させてくれるテーマ。',category:'site',chips:1000,paint:0,starter:false,permanent:true}),
  Object.freeze({id:'mint-soda',name:'ミントソーダ',description:'弾ける泡とミントの透明感。白いガラスパネルで楽しむ、さわやかなテーマ。',category:'site',chips:3000,paint:0,starter:false,permanent:true}),
  Object.freeze({id:'neon-arcade',name:'ネオン・アーケード',description:'シアンとマゼンタが灯るゲームセンター。ネオンの枠とスコアボード風プロフィール。',category:'site',chips:3000,paint:0,starter:false,permanent:true}),
  Object.freeze({id:'glass-cosmos',name:'ガラスの少女',description:'白い世界に浮かぶ黒い硝子。ひびの向こうの星々と、少女が息づく透明なテーマ。',category:'site',chips:200000,paint:100000,starter:false,permanent:true})
]);

return {SITE_THEMES};
},
"kusa-medal/medal-economy.js":function(load){
const {LEVEL_CAP, SEASON_REWARDS}=load("kusa-medal/medal-save.js");

const OFFER_XP = Object.freeze({N: 1, R: 4, SR: 15, SSR: 40, UR: 100, GODR: 250, Ω: 500});
const REFINEMENT_STYLES = Object.freeze([
  '真鍮プレート'
]);
const SEASON_REWARD_INFO = Object.freeze([]);

const XP_FOR_LEVEL = level => 8 + Math.max(0, level - 1) * 2;
const GRASSIFY_COST = Object.freeze({grass: 100000, chips: 5000});

function rewardGachaDuplicate(save) {
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

function offerCard(save, card) {
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

function offerChips(save, amount = 500) {
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

function refineCard(save, card) {
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

function exchangeSeasonCapsule(save, rewardId) {
  return {ok:false,reason:'retired'};
}

function toggleFavorite(cardId, favorite) {
  const cards = inventory();
  if (!cards?.setFavorite) return false;
  return cards.setFavorite(cardId, favorite);
}

return {OFFER_XP,REFINEMENT_STYLES,SEASON_REWARD_INFO,XP_FOR_LEVEL,GRASSIFY_COST,rewardGachaDuplicate,offerCard,offerChips,refineCard,exchangeSeasonCapsule,toggleFavorite};
},
"kusa-card-workshop.js":function(load){
const {MedalSave}=load("kusa-medal/medal-save.js");
const {confirmAction}=load("kusa-action-ui.js");
const {cardCapsuleReward}=load("kusa-medal/medal-capsule-economy.js");

const DISMANTLE = {N:[5,0],R:[10,0],SR:[25,1],SSR:[60,2],UR:[150,5],GODR:[400,15],'Ω':[400,15]};
// Same capsule benefit => same crafting fee, including the highest two rarities.
const PROCESS_CHIPS={N:120,R:120,SR:350,SSR:700,UR:1200,GODR:2200,'Ω':2200};
const AWAKEN_CHIPS={N:500,R:500,SR:1000,SSR:1500,UR:2000,GODR:2000,'Ω':2000};
function effectFor(card,account={}) {
  return cardCapsuleReward(card,account).label;
}
function workshopAction(save, card, action) {
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

return {DISMANTLE,PROCESS_CHIPS,AWAKEN_CHIPS,effectFor,workshopAction};
},
"kusa-commerce-ui.js":function(load){
const {MedalSave}=load("kusa-medal/medal-save.js");
const {confirmAction}=load("kusa-action-ui.js");
const {FORTUNE_KEY,AURORA_KEY,purchaseFortuneKey,useFortuneKey,fortuneStatus,auroraStatus,useAuroraKey}=load("kusa-fortune-economy.js");
const {CAPSULES,CAPSULE_EDITIONS,SHOP_ITEMS,SHOP_SKINS,capsuleTotal,japanDay,economyLock,openCapsules,purchaseSupply,craftSkin,equipSkin,skinOwned}=load("kusa-medal/medal-capsule-economy.js");

const save=new MedalSave(),$=id=>document.getElementById(id),fmt=n=>KusaAmounts.format(n || 0);
const shop=$('kusaShopDialog'),opening=$('capsuleOpenDialog'),list=$('capsuleInventoryList');
let tab='supplies',busy=false,selected=null,playerId=save.selectedPlayerId,lastSummary='';
let inventorySignature='',shopSignature='';
let inventoryFilter='owned';
const fortuneBanner=node('p',undefined,'fortune-status');fortuneBanner.id='fortuneStatus';fortuneBanner.setAttribute('role','status');
$('kusaProfile').append(fortuneBanner);
const cabinetFortune=node('p',undefined,'fortune-status fortune-cabinet-status');$('pachiGame').prepend(cabinetFortune);
const auroraBanner=node('p',undefined,'fortune-status aurora-status');auroraBanner.id='auroraStatus';auroraBanner.setAttribute('role','status');$('kusaProfile').append(auroraBanner);
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
  const statusText=`🔑 フォーチュンキー発動中：本日の台設定が＋${fortune.boost}｜ 残り ${countdown(fortune.expiresAt-Date.now())}`;
  for(const banner of [fortuneBanner,cabinetFortune]){banner.hidden=!playerId||!fortune.active;banner.textContent=statusText;banner.classList.toggle('is-active',fortune.active);}
  const auroraText=`🌌 オーロラキー発動中：UR・GODR・Ωレアのみ抽選｜残り ${countdown(aurora.expiresAt-Date.now())}`;
  for(const banner of [auroraBanner,cabinetAurora]){banner.hidden=!playerId||!aurora.active;banner.textContent=auroraText;banner.classList.toggle('is-active',aurora.active);}
  const gachaAurora=$('gachaAuroraStatus');if(gachaAurora){gachaAurora.hidden=!aurora.active;gachaAurora.textContent=aurora.active?`🌌 オーロラキー発動中　UR・GODR・Ωレアのみ出現　残り ${countdown(aurora.expiresAt-Date.now())}`:'';}
  clearTimeout(fortuneDayTimer);fortuneDayTimer=setTimeout(()=>{shopSignature='';render();},Math.max(20,Math.min(2147483647,Math.min(fortune.expiresAt,aurora.expiresAt)-Date.now()+30)));
  const shopKey=JSON.stringify([playerId,tab,busy,a.chips,a.paintFragments,a.dailyShop,a.auroraKeys,a.auroraBoost,a.ownedSkins,a.equippedSkins,a.unlockedThemes,a.selectedTheme,japanDay(),fortune,aurora]);
  if(shopSignature!==shopKey){shopSignature=shopKey;content.replaceChildren();
  document.querySelectorAll('[data-shop-tab]').forEach(b=>{const active=b.dataset.shopTab===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
  content.setAttribute('aria-labelledby',tab==='supplies'?'shopSuppliesTab':'shopSkinsTab');
  if(tab==='supplies'){
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

return {};
},
"kusa-fortune-economy.js":function(load){
const {economyLock, japanDay}=load("kusa-medal/medal-capsule-economy.js");

const FORTUNE_KEY=Object.freeze({id:'fortune-key',name:'フォーチュンキー',chips:1000,dailyLimit:2});
const AURORA_KEY=Object.freeze({id:'aurora-key',name:'オーロラキー',chips:10000,dailyLimit:1});

// A plain status read also works before the commerce window has been opened.
function fortuneStatus(save, playerId, now=Date.now()) {
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

function auroraStatus(save,playerId,now=Date.now()) {
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

function purchaseFortuneKey(save,playerId,now) {
  return transaction(save,playerId,now,(account,status)=>{
    if(!status.remainingPurchases)return 'フォーチュンキーは日本時間で1日2個まで購入できます。';
    if(KusaAmounts.cmp(account.chips,FORTUNE_KEY.chips)<0)return 'チップが足りません。';
    account.chips=KusaAmounts.sub(account.chips,FORTUNE_KEY.chips);
    account.fortuneKeys=KusaAmounts.add(account.fortuneKeys||0,1);
    account.fortunePurchases={day:status.day,count:status.purchased+1};
  });
}

function useFortuneKey(save,playerId,now) {
  return transaction(save,playerId,now,(account,status)=>{
    if(status.effective>=6)return '本日はこれ以上フォーチュンキーを使用できません。キーは消費しません。';
    if(status.boost>=2)return 'フォーチュンキーの使用は日本時間で1日2個までです。';
    if(KusaAmounts.cmp(account.fortuneKeys||0,1)<0)return 'フォーチュンキーを持っていません。';
    account.fortuneKeys=KusaAmounts.sub(account.fortuneKeys,1);
    account.fortuneBoost={day:status.day,levels:status.boost+1};
  });
}

function useAuroraKey(save,playerId,now) {
  return transaction(save,playerId,now,(account,status)=>{
    const aurora=auroraStatus(save,playerId,now??Date.now());
    if(aurora.active)return 'オーロラキーはすでに発動中です。';
    if(KusaAmounts.cmp(account.auroraKeys||0,1)<0)return 'オーロラキーを持っていません。';
    account.auroraKeys=KusaAmounts.sub(account.auroraKeys,1);
    account.auroraBoost={day:status.day,active:true};
  });
}

return {FORTUNE_KEY,AURORA_KEY,fortuneStatus,auroraStatus,purchaseFortuneKey,useFortuneKey,useAuroraKey};
},
"kusa-fishing.js":function(load){
const {MedalSave}=load("kusa-medal/medal-save.js");
const {confirmAction}=load("kusa-action-ui.js");
const {FishingScene}=load("kusa-fishing-scene.js");
const {FishingSoundscape}=load("kusa-fishing-audio.js");
const {coffeeHit}=load("kusa-fishing-coffee.js");
const {FishingDialogue}=load("kusa-fishing-dialogue.js");
const {FishingCrystalEffect}=load("kusa-fishing-crystal.js");
const {FishingPlantEffect}=load("kusa-fishing-plant.js");
const {fishingPeriod,fishingTransaction,exchangeBait,startFishing,catchFishing,FISHING_RULES,fishingCardEffectDescription,activateCrystalBlessing,isCrystalCard,crystalBlessingRemaining}=load("kusa-fishing-economy.js");
const {capsuleTotal,CAPSULES}=load("kusa-medal/medal-capsule-economy.js");

const save=new MedalSave(),$=id=>document.getElementById(id),fmt=n=>KusaAmounts.format(n || 0);
const periods={day:'昼の水辺',sunset:'夕暮れの水辺',night:'夜の水辺',midnight:'深夜の水辺'};
const names={grass:'草',balls:'持ち球',chips:'チップ',bait:'餌',capsules:'カプセル'};
const icons={grass:'🌿',balls:'🔵',chips:'💠',bait:'🦐',capsules:'🎁'};
for(const quality of Object.keys(CAPSULES)){names[quality]=`${CAPSULES[quality].name}カプセル`;icons[quality]='🎁';}
const dialog=document.createElement('dialog');dialog.id='kusaFishingWindow';dialog.className='fishing-dialog theme-window';dialog.setAttribute('aria-labelledby','fishingTitle');
dialog.innerHTML=`<header class="theme-window-head fishing-head"><div><small>KUSA FISHING</small><h2 id="fishingTitle">草釣り</h2></div><div><button id="fishingExpand" type="button" aria-pressed="false">画面を拡大</button><button id="fishingOptions" type="button" aria-expanded="false" hidden>設定</button><button id="fishingSound" type="button" aria-pressed="true">音 ON</button><button id="fishingClose" type="button">× 閉じる</button></div></header>
<div class="fishing-hud" aria-label="現在の所持品">${['grass','balls','chips','bait','capsules'].map(k=>`<div data-fishing-resource="${k}"><span>${icons[k]} ${names[k]}</span><strong id="fishing-${k}">0</strong></div>`).join('')}</div>
<div class="fishing-info"><span id="fishingPlayer"></span><span id="fishingPeriod"></span></div>
<p id="fishingCrystalStatus" class="fishing-crystal-status" role="timer" aria-live="off" aria-label="結晶の加護の残り時間" hidden></p>
<div class="fishing-layout"><div class="fishing-main"><div class="fishing-stage"><canvas id="fishingCanvas" width="384" height="256" aria-label="木の家、川と海のある草釣りマップ"></canvas><div id="fishingMapLinks" class="fishing-map-links" hidden><button type="button" data-fishing-place="house" class="fishing-map-house">家に入る</button><button type="button" data-fishing-place="river" class="fishing-map-river">川で釣る</button><button type="button" data-fishing-place="sea" class="fishing-map-sea">海で釣る</button></div><div id="fishingParticles" class="fishing-particles" aria-hidden="true"></div></div>
<p id="fishingStatus" role="status" aria-live="polite">木の家で、ゆっくり支度をしましょう。</p><div class="fishing-actions"><button id="fishingAction" type="button">外へ出る</button><button id="fishingBack" type="button" hidden>マップに戻る</button></div></div>
<aside class="fishing-sidebar"><section><h3>釣りの支度</h3><p>餌1個で1回。<strong>！</strong>が出たら「釣る」をタップ。押すまで待っていてくれます。</p><button id="fishingExchangeOpen" type="button" aria-expanded="false">🪱 餌の交換所</button><button id="fishingCapsules" type="button">🎁 カプセルを開封</button></section>
<section id="fishingCharacter"><h3>主人公</h3><div class="fishing-character-options"><button type="button" data-fishing-character="boy" aria-pressed="true">男の子</button><button type="button" data-fishing-character="girl" aria-pressed="false">女の子</button></div><small>家でいつでも変更できます。</small></section>
<section><h3>ダブりカードのおまじない</h3><p>レアリティごとのチップ最低保証と追加報酬に、通常の釣り報酬、既存ルールのカプセルが加わります。</p><label for="fishingCard">使うカード（最後の1枚は残ります）</label><select id="fishingCard"><option value="">カードを使わない</option></select><label for="fishingCardCount">消費するダブり</label><select id="fishingCardCount"><option value="1">1枚：釣果2回分＋カプセル</option><option value="2">2枚：釣果3回分＋カプセル</option><option value="3">3枚：釣果5回分＋カプセル</option></select><button id="fishingCrystalUse" type="button" hidden>✧ 結晶の加護を使う</button><p id="fishingCardNote">カードの消費は釣果を受け取るときです。</p></section>
<section><h3>この釣り場での記録</h3><p id="fishingRecords">釣り上げ 0回</p><p id="fishingResult" aria-live="polite">水の音を聞きながら、のんびりどうぞ。</p></section></aside></div>
<section id="fishingExchange" class="fishing-exchange" hidden><h3>🪱 餌の交換所</h3><p>10草 → 餌1個 ／ 餌1個 → 5草</p><div class="fishing-exchange-columns">${['buy','sell'].map((k,i)=>`<div><h4>${i?'餌を草に戻す':'草で餌を用意する'}</h4><label for="fishingQuantity-${k}">餌の個数</label><input id="fishingQuantity-${k}" type="text" value="1" inputmode="numeric"><div><button type="button" data-fishing-quick="${k}:half">半分</button><button type="button" data-fishing-quick="${k}:all">すべて</button></div><p id="fishingPreview-${k}"></p><button type="button" data-fishing-exchange="${k}">${i?'餌を草に戻す':'草を餌に交換'}</button></div>`).join('')}</div><p id="fishingExchangeStatus" role="status"></p><button id="fishingExchangeClose" type="button">交換所を閉じる</button></section>`;
document.body.append(dialog);
const expandedPhone=()=>dialog.classList.contains('fishing-expanded')&&matchMedia('(max-width:799px),(hover:none) and (pointer:coarse)').matches;
const stageNode=dialog.querySelector('.fishing-stage'),mainNode=dialog.querySelector('.fishing-main');
function fitExpanded(){
  if(!expandedPhone()){stageNode.style.removeProperty('width');stageNode.style.removeProperty('height');return;}
  const landscape=matchMedia('(orientation:landscape)').matches;
  const walk=dialog.querySelector('.fishing-walk-controls'),actions=dialog.querySelector('.fishing-actions');if(!walk)return;
  const availableHeight=mainNode.clientHeight-(landscape?0:walk.offsetHeight+actions.offsetHeight+12);
  const availableWidth=mainNode.clientWidth-(landscape?172:0);
  const width=Math.max(0,Math.min(availableWidth,availableHeight*1.5));stageNode.style.width=width+'px';stageNode.style.height=width/1.5+'px';
}
function setExpanded(on){dialog.classList.toggle('fishing-expanded',on);$('fishingExpand').textContent=on?'元に戻す':'画面を拡大';$('fishingExpand').setAttribute('aria-pressed',String(on));$('fishingOptions').hidden=!on;dialog.classList.remove('fishing-options-open');$('fishingOptions').setAttribute('aria-expanded','false');requestAnimationFrame(fitExpanded);}
$('fishingExpand').onclick=()=>setExpanded(!dialog.classList.contains('fishing-expanded'));
$('fishingOptions').onclick=()=>{const on=dialog.classList.toggle('fishing-options-open');$('fishingOptions').setAttribute('aria-expanded',String(on));};
new ResizeObserver(()=>requestAnimationFrame(fitExpanded)).observe(mainNode);window.addEventListener('resize',fitExpanded);

// Legacy Windows emoji fonts do not contain the newer worm and coin glyphs.
for(const node of dialog.querySelectorAll('button,h3'))node.textContent=node.textContent.replaceAll('🪱','🦐');
new ResizeObserver(entries=>dialog.style.setProperty('--fishing-head-height',`${entries[0].target.getBoundingClientRect().height}px`)).observe(dialog.querySelector('.fishing-head'));
const scene=new FishingScene($('fishingCanvas'));
const soundscape=new FishingSoundscape();
const dialogue=new FishingDialogue(dialog.querySelector('.fishing-stage'),$('fishingStatus'),{changed:()=>{held.clear();scene.input(null);updateControls();},sound:name=>play(name)});
const windowPlant=document.createElement('button');windowPlant.type='button';windowPlant.id='fishingWindowPlant';windowPlant.className='fishing-window-plant';windowPlant.setAttribute('aria-label','窓辺の草を調べる');windowPlant.title='窓辺の草を調べる';dialog.querySelector('.fishing-stage').append(windowPlant);
const plantEffect=new FishingPlantEffect(dialog.querySelector('.fishing-stage'),{sound:(name,rate)=>play(name,rate),ended:()=>{stopPlantAudio();setPhase('idle');status('ハートがふわっと弾けた。');}});
let crystalResult=null;
const crystalEffect=new FishingCrystalEffect(dialog.querySelector('.fishing-stage'),{sound:(name,rate)=>play(name,rate),ended:()=>{if(!dialog.open)return;setPhase('idle');if(crystalResult){const result=crystalResult;crystalResult=null;rewardParticles(result.rewards);const summary=rewardSummary(result.rewards);$('fishingResult').textContent=summary;status(`結晶の加護が発動！ ${summary} 通常釣りでもカプセルが見つかるようになりました。`,{wait:true,sound:true});}}});
const controls=document.createElement('div');controls.className='fishing-walk-controls';controls.innerHTML='<div class="fishing-dpad" role="group" aria-label="移動"><button type="button" data-walk="up" aria-label="上へ歩く">▲</button><button type="button" data-walk="left" aria-label="左へ歩く">◀</button><button type="button" data-walk="down" aria-label="下へ歩く">▼</button><button type="button" data-walk="right" aria-label="右へ歩く">▶</button></div><p>矢印・WASD／方向ボタン長押しで歩く<br>水辺・家具・出口で「決定」。Enter・Spaceも使えます。</p>';dialog.querySelector('.fishing-actions').before(controls);
let playerId='',location='house',phase='idle',phaseAt=0,busy=false,timer=0,interval=0,castId='',sound=true,returnFocus=null;
let context=null,positionDirty=false,positionSaving=false,lastPositionSave=0;
const blocked=()=>dialog.classList.contains('fishing-options-open')||busy||['plant','blessing'].includes(phase)||dialogue.locked||!dialog.open||!$('fishingExchange').hidden||!!document.querySelector('.kusa-action-dialog[open]');
scene.isBlocked=blocked;
scene.onMove=(p,next)=>{positionDirty=true;context=next;dialogue.hideNotice();if(!castId&&!['casting','waiting','bite','reeling','reward'].includes(phase))location=p.map==='house'?'house':next==='river'||next==='sea'?next:'map';soundscape.update({...p});updateControls();};
scene.onStep=surface=>soundscape.step(surface);
scene.onCoffeeSip=()=>soundscape.sip();
scene.onCoffeeEnd=()=>{soundscape.stopSip();setPhase('idle');status('あたたかいコーヒーで、ひと休みしました。');};
async function persistPosition(){if(!positionDirty||!playerId||busy||positionSaving)return;positionSaving=true;const id=playerId,nav=scene.snapshot();positionDirty=false;try{const r=await fishingTransaction(save,id,(p,a)=>{a.fishing.navigation=nav;});if(!r?.ok)positionDirty=true;}catch{positionDirty=true;}finally{positionSaving=false;lastPositionSave=Date.now();}}
const media=new Set();
const rewardSoundTimers=new Set();
function clearRewardEffects(){for(const timeout of rewardSoundTimers)clearTimeout(timeout);rewardSoundTimers.clear();dialog.querySelectorAll('.fishing-token').forEach(node=>node.remove());}
const audioFiles={cast:'cast.ogg',splash:'splash.ogg',bite:'bite-soft-v2.ogg',catch:'catch.ogg',reward:'reward.ogg',confirm:'reward.ogg',message:'bite-soft-v2.ogg',crunch:'plant-crack-v4.mp3',rainbow:'plant-rainbow.ogg',heart:'plant-heart.ogg',crystal:'crystal-blessing.ogg'};
function play(name,rate=1){
  if(!sound||document.hidden||!dialog.open||media.size>=8)return;
  const a=new Audio(new URL(`assets/fishing/audio/${audioFiles[name]}`,document.baseURI).href);a.volume=name==='crystal'?.22:name==='heart'?.13:name==='rainbow'?.23:name==='crunch'?.48:name==='message'?.12:name==='confirm'?.18:name==='bite'?.22:name==='reward'?.24:.3;a.playbackRate=rate;if(['crunch','rainbow','heart'].includes(name))a.dataset.plant='true';media.add(a);const clear=()=>media.delete(a);a.onended=clear;a.onerror=clear;a.play().catch(clear);
}
function stopPlantAudio(){for(const a of media)if(a.dataset.plant){a.pause();media.delete(a);}}
function stopAudio(){for(const a of media)a.pause();media.clear();soundscape.stop();}
function ambience(){
  if(sound&&dialog.open&&!document.hidden)soundscape.start(scene.snapshot());
}
function setPhase(value){phase=value;phaseAt=performance.now();scene.set({phase,phaseAt});updateControls();}
function status(text,options){dialogue.say(text,options);}
function current(){save.reload();return {p:save.getPlayer(),a:save.getAccount()};}
function refresh(){
  if(!dialog.open)return;
  const {p,a}=current(),id=save.selectedPlayerId;
  if(id!==playerId){dialogue.reset();plantEffect.stop();crystalEffect.stop();crystalResult=null;scene.endCoffee(false);clearTimeout(timer);clearRewardEffects();castId='';playerId=id;location='house';phase='idle';phaseAt=performance.now();context=null;held.clear();scene.input(null);stopAudio();scene.restore(a.fishing.navigation);positionDirty=false;
    $('fishingResult').textContent='水の音を聞きながら、のんびりどうぞ。';$('fishingExchangeStatus').textContent='';$('fishingCard').value='';delete $('fishingCard').dataset.signature;$('fishingCardCount').value='1';for(const direction of ['buy','sell'])$(`fishingQuantity-${direction}`).value='1';$('fishingExchange').hidden=true;$('fishingExchangeOpen').setAttribute('aria-expanded','false');
  }
  $('fishingPlayer').textContent=p?`${p.name} の釣り時間`:'育成・カード管理でデータを作成してください';
  const values={grass:p?.grass,balls:globalThis.KusaPlayerStore?.getBallBalances?.(id).total??p?.balls,chips:a.chips,bait:a.fishing.bait,capsules:capsuleTotal(a)};
  for(const [k,v] of Object.entries(values))$(`fishing-${k}`).textContent=fmt(v);
  $('fishingPeriod').textContent=periods[fishingPeriod()];$('fishingRecords').textContent=`釣り上げ ${fmt(a.fishing.catches)}回 ／ カード使用 ${fmt(a.fishing.cardsUsed)}枚`;
  scene.set({location,period:fishingPeriod(),character:a.fishing.character,phase,phaseAt});
  document.querySelectorAll('[data-fishing-character]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.fishingCharacter===a.fishing.character));b.disabled=busy||phase==='resting'||location!=='house'||!!a.fishing.pending;});
  const select=$('fishingCard'),previous=select.value,cards=globalThis.KusaGachaInventory?.listUsableCards()||[];
  const signature=JSON.stringify(cards.map(c=>[c.id,c.usable,c.title]));
  if(select.dataset.signature!==signature){select.dataset.signature=signature;select.replaceChildren(new Option('カードを使わない',''));for(const c of cards)select.append(new Option(`[${c.rarity}] ${c.title}（ダブり ${globalThis.KusaCardCounts.format(c.usable)}枚）`,c.id));select.value=cards.some(c=>c.id===previous)?previous:'';}
  if(a.fishing.pending&&castId!==a.fishing.pending.id){castId=a.fishing.pending.id;location=a.fishing.pending.location;if(scene.p.map!=='outdoor'||context!==location)scene.resume(location);resumePending(a.fishing.pending);}
  const remaining=crystalBlessingRemaining(a),badge=$('fishingCrystalStatus');badge.hidden=remaining<=0;const seconds=Math.ceil(remaining/1000);badge.textContent=`✧ 結晶の加護 発動中 ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} ｜ 通常釣りで35%の確率でカプセル1〜3個`;
  updateExchange();updateControls();ambience();
}
function updateControls(){
  const locked=blocked()||['casting','waiting','bite','reeling','reward','resting','plant','blessing'].includes(phase);scene.state.locked=locked;scene.state.location=location;
  windowPlant.hidden=scene.p.map!=='house'||phase!=='idle'||!playerId||dialogue.locked;windowPlant.disabled=locked;
  if(locked)scene.input(null);for(const b of controls.querySelectorAll('[data-walk]'))b.disabled=locked||!playerId;
  $('fishingMapLinks').hidden=true;$('fishingBack').hidden=true;
  $('fishingAction').hidden=false;$('fishingAction').disabled=busy||!playerId||(!dialogue.locked&&(['casting','waiting','reeling','reward'].includes(phase)||(!context&&!['bite','plant','blessing'].includes(phase))));
  $('fishingAction').textContent=dialogue.choiceOpen?'選択を決定':dialogue.waiting?'次へ':['plant','blessing'].includes(phase)?'演出をスキップ':phase==='resting'?'立ち上がる':phase==='bite'?'！ 釣る':phase==='casting'?'投げています…':phase==='waiting'?'水面を眺めています…':phase==='reeling'?'釣り上げています…':context==='plant'?'窓辺の草を調べる':context==='coffee'?'机と椅子を調べる':context==='exit'?'外へ出る':context==='home'?'家に帰る':context==='river'?'川へ投げる（餌1個）':context==='sea'?'海へ投げる（餌1個）':'歩いて水辺や出口へ';
  $('fishingExchangeOpen').disabled=['resting','plant','blessing'].includes(phase)||dialogue.locked;$('fishingCapsules').disabled=['resting','plant','blessing'].includes(phase)||dialogue.locked;
  for(const b of dialog.querySelectorAll('[data-fishing-character]'))b.disabled=busy||dialogue.locked||['resting','plant','blessing'].includes(phase)||location!=='house'||!!castId;
  $('fishingCard').disabled=busy||dialogue.locked||['resting','plant','blessing'].includes(phase)||!!castId;$('fishingCardCount').disabled=busy||dialogue.locked||['resting','plant','blessing'].includes(phase)||!!castId||!$('fishingCard').value;
  const selectedCard=$('fishingCard').value?globalThis.KusaGachaInventory?.getCard($('fishingCard').value):null;
  const cardCount=selectedCard?Number($('fishingCardCount').value):0;
  const skill=$('fishingCrystalUse');skill.hidden=!isCrystalCard(selectedCard);skill.disabled=locked||!!castId||!playerId;
  const isCrystal=isCrystalCard(selectedCard);
  $('fishingCardNote').textContent=castId?'釣果を受け取るまでカードの選択は固定です。':selectedCard?`${fishingCardEffectDescription(selectedCard,cardCount,save.getAccount())}。${isCrystal?'「結晶の加護を使う」で即時に報酬を受け取り、カードを消費します。効果中の再使用は残り時間に加算します。':'カードは釣果を受け取るときに消費します。'}`:'カードを使うと、レアリティ別チップ保証・追加報酬・既存ルールのカプセルがつきます。カードは釣果受取時に消費します。';
  for(const b of dialog.querySelectorAll('[data-fishing-place]'))b.disabled=busy;
}
function updateExchange(){
  const {p,a}=current();
  for(const direction of ['buy','sell']){
    const n=KusaAmounts.parse($(`fishingQuantity-${direction}`).value),buy=direction==='buy';
    const valid=KusaAmounts.valid(n)&&KusaAmounts.cmp(n,0)>0;
    const grass=valid?KusaAmounts.add(p?.grass||0,KusaAmounts.mul(n,buy?-10:5)):-1,bait=valid?KusaAmounts.add(a.fishing.bait,KusaAmounts.mul(n,buy?1:-1)):-1;
    const ok=valid&&KusaAmounts.valid(grass)&&KusaAmounts.valid(bait);
    $(`fishingPreview-${direction}`).textContent=ok?`交換後：草 ${fmt(grass)} ／ 餌 ${fmt(bait)}`:valid?'所持数が足りません。':'餌の個数を整数で入力してください。';
    dialog.querySelector(`[data-fishing-exchange="${direction}"]`).disabled=busy||!playerId||!ok;
  }
}
async function run(action){if(busy||dialogue.locked||phase==='resting')return null;busy=true;updateControls();updateExchange();try{const r=await action();if(!r?.ok)status(r?.message||'保存できませんでした。');return r;}catch(e){status(e.message||'保存できませんでした。');return null;}finally{busy=false;refresh();}}
function takeCoffee(){if(blocked()||phase!=='idle'||castId||!playerId||context!=='coffee')return;if(!scene.beginCoffee()){status('一服の準備中です。少し待ってから、もう一度どうぞ。');return;}held.clear();setPhase('resting');status('椅子に座って、あたたかいコーヒーをひと口。');}
function offerCoffee(){if(blocked()||phase!=='idle'||context!=='coffee'||!playerId)return;held.clear();scene.input(null);dialogue.offerCoffee(takeCoffee);}
function offerPlant(){if(blocked()||phase!=='idle'||scene.p.map!=='house'||castId||!playerId)return;held.clear();scene.input(null);dialogue.offer({title:'窓辺の草をどうしますか？',label:'キめる'},()=>{if(blocked()||phase!=='idle'||scene.p.map!=='house')return;setPhase('plant');dialogue.hideNotice();plantEffect.start();});}
windowPlant.onclick=offerPlant;
$('fishingCanvas').addEventListener('click',e=>{if(scene.p.map!=='house'||phase!=='idle'||blocked())return;const rect=e.currentTarget.getBoundingClientRect(),x=(e.clientX-rect.left)*384/rect.width,y=(e.clientY-rect.top)*256/rect.height;if(!coffeeHit(x,y)&&Math.hypot(x-scene.p.x,y-scene.p.y)>18)return;if(context==='coffee')offerCoffee();else if(coffeeHit(x,y))status('椅子の真右か真下まで歩いて、机と椅子を調べてみましょう。');});
function changeLocation(next){
  if(busy||dialogue.locked||castId||phase==='resting')return;clearTimeout(timer);stopAudio();location=next;if(next==='house'||next==='map')scene.enter(next==='house'?'house':'outdoor');else scene.resume(next);setPhase('idle');persistPosition();
  const pending=save.getAccount().fishing.pending;
  if(pending&&next===pending.location){castId=pending.id;resumePending(pending);}else castId='';
  status(next==='house'?'おかえりなさい。家の中を歩いて、ゆっくり支度をしましょう。':next==='map'?'方向ボタンで歩けます。右の川の桟橋、左下の海の桟橋へどうぞ。':next==='river'?'川のせせらぎ。餌をつけて、のんびり待ちましょう。':'波の音。海へ竿を投げてみましょう。');
  scene.set({location});ambience();refresh();
  $('fishingCanvas').animate([{opacity:.15},{opacity:1}],{duration:260});
}
function resumePending(pending){
  clearTimeout(timer);scene.set({location});
  if(Date.now()>=pending.readyAt){setPhase('bite');status('！ 何かがかかりました。「釣る」を押してみましょう。');}
  else{setPhase('waiting');status('ウキを眺めながら、ひとやすみ。');timer=setTimeout(()=>{if(!dialog.open||location!==pending.location)return;setPhase('bite');status('！ 何かがかかりました。「釣る」を押してみましょう。');play('bite');},Math.max(0,pending.readyAt-Date.now()));}
}
async function cast(){
  if(blocked()||!['river','sea'].includes(context))return;
  const {a}=current();if(a.fishing.pending){changeLocation(a.fishing.pending.location);return;}
  if(!a.fishing.bait){$('fishingExchange').hidden=false;$('fishingExchangeOpen').setAttribute('aria-expanded','true');updateControls();status('まず交換所で餌を用意しましょう。');$('fishingExchange').scrollIntoView({block:'nearest',behavior:'smooth'});return;}
  if(isCrystalCard(globalThis.KusaGachaInventory?.getCard($('fishingCard').value))){await useCrystal();return;}
  const cardId=$('fishingCard').value,count=cardId?Number($('fishingCardCount').value):0,id=playerId,place=location;
  if(count){const selectedCard=globalThis.KusaGachaInventory?.getCard(cardId);if(!await confirmAction({title:'釣りのおまじない',lines:[`ダブりカードを${count}枚使います。最後の1枚は残ります。`,fishingCardEffectDescription(selectedCard,count,a),'カードは釣果を受け取るとき、餌1個は投げるときに消費します。'],action:'このカードで釣る',expectedPlayerId:id}))return;}
  if(id!==playerId||place!==location||!dialog.open)return;
  scene.p.direction=place==='river'?'right':'down';await persistPosition();
  const r=await run(()=>startFishing(save,id,place,fishingPeriod(),cardId,count));
  if(!r?.ok||!dialog.open||id!==playerId)return;castId=r.pending.id;setPhase('casting');status('そっと、ウキを投げます。');play('cast');
  timer=setTimeout(()=>{if(!dialog.open)return;play('splash');resumePending(r.pending);},650);
}
async function reel(){
  const id=castId,owner=playerId,r=await run(()=>catchFishing(save,owner,id));if(!r?.ok||!dialog.open||owner!==playerId)return;
  castId='';clearTimeout(timer);setPhase('reeling');status('さっと竿を引きます…');play('catch');
  const units={grass:'個',balls:'球',chips:'枚'};
  const caught=Object.entries(r.rewards).map(([k,n])=>`${k==='balls'?'パチンコの玉':names[k]||'アイテム'}を${fmt(n)}${units[k]||'個'}`).join('、');
  const summary=`「${caught}釣り上げた！」`;$('fishingResult').textContent=summary;
  timer=setTimeout(()=>{if(!dialog.open)return;setPhase('reward');status(summary,{wait:true,sound:true});rewardParticles(r.rewards);timer=setTimeout(()=>{if(dialog.open)setPhase('idle');},1300);},500);
}
function rewardSummary(rewards){const units={grass:'個',balls:'球',chips:'枚'};return Object.entries(rewards).map(([k,n])=>`${names[k]||'アイテム'} ${fmt(n)}${units[k]||'個'}`).join('、')+'を獲得！';}
async function useCrystal(){
 if(blocked()||phase!=='idle'||castId||!playerId)return;
 const id=playerId,count=Number($('fishingCardCount').value),{a}=current(),card=globalThis.KusaGachaInventory?.getCard($('fishingCard').value);
 if(!isCrystalCard(card))return;
 if(!await confirmAction({title:'結晶の加護',lines:[`ダブりカードを${count}枚消費します。最後の1枚は残ります。`,fishingCardEffectDescription(card,count,a),`使用直後に報酬を獲得。加護は${count*10}分間、再使用は時間を加算します。餌は消費しません。`],action:'結晶の加護を発動',expectedPlayerId:id}))return;
 if(!dialog.open||id!==playerId)return;
 const r=await run(()=>activateCrystalBlessing(save,id,count));if(!r?.ok||!dialog.open||id!==playerId)return;
 crystalResult=r;$('fishingCard').value='';held.clear();scene.input(null);dialogue.hideNotice();setPhase('blessing');crystalEffect.start(r.mode);dialog.querySelector('.fishing-stage').scrollIntoView({block:'center',behavior:'instant'});
}
$('fishingCrystalUse').onclick=useCrystal;
function rewardParticles(rewards){
  clearRewardEffects();const owner=playerId;
  const host=$('fishingParticles');host.replaceChildren();let index=0;
  const from=$('fishingCanvas').getBoundingClientRect(),root=dialog.getBoundingClientRect(),origin=scene.screenPoint(scene.p.x,scene.p.y-12);
  for(const [k,n] of Object.entries(rewards)){
    const dest=$(`fishing-${icons[k]==='🎁'?'capsules':k}`)?.getBoundingClientRect();if(!dest)continue;
    const count=Math.min(n,Math.min(5,Math.max(0,25-index)));
    for(let j=0;j<count;j++,index++){
      const node=document.createElement('span');node.textContent=icons[k];node.className='fishing-token';dialog.append(node);
      const anim=node.animate([{transform:`translate(${from.left-root.left+from.width*origin.x/384}px,${from.top-root.top+from.height*origin.y/256}px) scale(1)`,opacity:1},{transform:`translate(${dest.left-root.left+dest.width/2}px,${dest.top-root.top}px) scale(.5)`,opacity:0}],{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?100:800,delay:index*75,easing:'ease-in-out'});
      anim.finished.then(()=>node.remove()).catch(()=>node.remove());if(index<5){const delay=index*85;const timeout=setTimeout(()=>{rewardSoundTimers.delete(timeout);if(dialog.open&&playerId===owner&&globalThis.KusaPlayerStore?.getSelectedId()===owner)play('reward',1+delay/3000);},delay);rewardSoundTimers.add(timeout);}
    }
    const target=$(`fishing-${icons[k]==='🎁'?'capsules':k}`);target?.animate([{color:'#467a5d'},{color:'#d59332'},{color:'#467a5d'}],{duration:1200});
  }
}
async function open(){
  if(dialog.open)return;returnFocus=document.activeElement;
  for(const id of ['pachiToggle','gachaToggle'])if($(id)?.getAttribute('aria-expanded')==='true')$(id).click();
  dialog.showModal();playerId='';refresh();
  const pending=save.getAccount().fishing.pending;if(pending){location=pending.location;castId=pending.id;resumePending(pending);}else setPhase('idle');
  if(!pending)status(scene.p.map==='house'?'方向ボタンで歩けます。家の下側の出口から外へどうぞ。':'おかえりなさい。水辺をのんびり歩きましょう。');
  refresh();scene.start();ambience();interval=setInterval(()=>{if(!document.hidden){refresh();if(Date.now()-lastPositionSave>2000)persistPosition();}},1000);$('fishingAction').focus();
  document.querySelectorAll('[data-fishing-open]').forEach(b=>b.setAttribute('aria-pressed','true'));
}
function closed(){setExpanded(false);dialogue.reset();plantEffect.stop();crystalEffect.stop();crystalResult=null;scene.endCoffee(false);if(['resting','plant','blessing'].includes(phase))phase='idle';persistPosition();held.clear();clearTimeout(timer);clearRewardEffects();clearInterval(interval);scene.stop();stopAudio();document.querySelectorAll('[data-fishing-open]').forEach(b=>b.setAttribute('aria-pressed','false'));returnFocus?.focus();}
dialog.addEventListener('close',closed);$('fishingClose').onclick=()=>dialog.close();
$('fishingAction').onclick=()=>{scene.input(null);if(dialogue.locked)dialogue.activate();else if(phase==='plant')plantEffect.stop(true);else if(phase==='blessing')crystalEffect.stop(true);else if(phase==='resting')scene.endCoffee();else if(phase==='bite')reel();else if(context==='plant')offerPlant();else if(context==='coffee')offerCoffee();else if(context==='exit')changeLocation('map');else if(context==='home')changeLocation('house');else if(context==='river'||context==='sea')cast();};
dialog.addEventListener('cancel',e=>{if(dialog.classList.contains('fishing-expanded')){e.preventDefault();setExpanded(false);return;}if(dialogue.locked){e.preventDefault();if(dialogue.choiceOpen)dialogue.choose(1);else dialogue.advance();}});
$('fishingBack').onclick=()=>changeLocation('map');
dialog.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.fishingPlace)changeLocation(b.dataset.fishingPlace);
  if(b.dataset.fishingCharacter&&location==='house'){const id=playerId,value=b.dataset.fishingCharacter;await run(()=>fishingTransaction(save,id,(p,a)=>{a.fishing.character=value;}));}
  if(b.dataset.fishingQuick){const [dir,part]=b.dataset.fishingQuick.split(':'),{p,a}=current();const max=dir==='buy'?KusaAmounts.div(p?.grass||0,10):a.fishing.bait;$(`fishingQuantity-${dir}`).value=part==='half'?KusaAmounts.div(max,2):max;updateExchange();}
  if(b.dataset.fishingExchange){const dir=b.dataset.fishingExchange,n=KusaAmounts.parse($(`fishingQuantity-${dir}`).value),id=playerId;
    if(!await confirmAction({title:'餌の交換',lines:[dir==='buy'?`${fmt(KusaAmounts.mul(n,10))}草を餌${fmt(n)}個に交換します。`:`餌${fmt(n)}個を${fmt(KusaAmounts.mul(n,5))}草に戻します。`,'購入は10草、返却は5草です。'],action:'交換する',expectedPlayerId:id}))return;
    const r=await run(()=>exchangeBait(save,id,dir,n));if(globalThis.KusaPlayerStore?.getSelectedId()===id)$('fishingExchangeStatus').textContent=r?.message||'交換できませんでした。';
  }
});
for(const dir of ['buy','sell'])$(`fishingQuantity-${dir}`).oninput=updateExchange;
$('fishingExchangeOpen').onclick=()=>{const box=$('fishingExchange');box.hidden=!box.hidden;$('fishingExchangeOpen').setAttribute('aria-expanded',String(!box.hidden));updateControls();if(!box.hidden)box.scrollIntoView({block:'nearest',behavior:'smooth'});};
$('fishingExchangeClose').onclick=()=>{$('fishingExchange').hidden=true;$('fishingExchangeOpen').setAttribute('aria-expanded','false');updateControls();$('fishingExchangeOpen').focus();};
$('fishingSound').onclick=()=>{sound=!sound;$('fishingSound').textContent=`音 ${sound?'ON':'OFF'}`;$('fishingSound').setAttribute('aria-pressed',String(sound));if(!sound)stopAudio();else ambience();};
$('fishingCard').onchange=()=>{updateControls();refresh();};$('fishingCardCount').onchange=()=>{updateControls();refresh();};
$('fishingCapsules').onclick=()=>{dialog.close();requestAnimationFrame(()=>$('capsuleInventoryBadge')?.click());};
document.addEventListener('visibilitychange',()=>{if(document.hidden){dialogue.reset();plantEffect.stop();crystalEffect.stop();crystalResult=null;if(['plant','blessing'].includes(phase))setPhase('idle');scene.endCoffee();persistPosition();held.clear();scene.stop();stopAudio();}else if(dialog.open){refresh();scene.start();const p=save.getAccount().fishing.pending;if(p&&p.location===location)resumePending(p);ambience();}});
for(const event of ['kusa-player-changed','kusa-medal-save-changed','kusa-gacha-inventory-changed','kusa-theme-changed'])window.addEventListener(event,()=>{if(!busy)refresh();});
window.addEventListener('storage',()=>{if(dialog.open)refresh();});
const walkKeys={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};const held=new Set();
document.addEventListener('keydown',e=>{if(!dialog.open)return;if(e.target.closest('.fishing-head')&&['Enter','Space'].includes(e.code))return;if(dialogue.key(e))return;if(['plant','blessing'].includes(phase)&&['Enter','Space'].includes(e.code)){e.preventDefault();if(!e.repeat){if(phase==='blessing')crystalEffect.stop(true);else plantEffect.stop(true);}return;}if(blocked()||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(walkKeys[e.code]){e.preventDefault();held.add(e.code);scene.input(walkKeys[e.code]);}else if((e.code==='Space'||e.code==='Enter')&&!e.repeat){e.preventDefault();if(e.target===windowPlant)offerPlant();else $('fishingAction').click();}});
document.addEventListener('keyup',e=>{if(!walkKeys[e.code])return;held.delete(e.code);scene.input(held.size?walkKeys[[...held].at(-1)]:null);});
for(const b of controls.querySelectorAll('[data-walk]')){
  b.onpointerdown=e=>{e.preventDefault();if(b.disabled||blocked())return;b.setPointerCapture(e.pointerId);scene.input(b.dataset.walk);};
  b.onpointermove=e=>{if(!b.hasPointerCapture(e.pointerId))return;const r=b.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)scene.input(null);};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>scene.input(null));
}
window.addEventListener('blur',()=>{held.clear();scene.input(null);persistPosition();});
const hub=document.querySelector('.kusa-games-icons');if(hub){const b=document.createElement('button');b.type='button';b.dataset.fishingOpen='';b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-pressed','false');b.innerHTML='<img src="assets/fishing/icon.png" width="56" height="56" alt=""><strong>草釣り</strong><small>水辺でのんびり、宝もの探し</small>';hub.append(b);}
const switches=document.querySelector('.screen-game-switches');if(switches){const b=document.createElement('button');b.type='button';b.className='screen-button';b.dataset.fishingOpen='';b.textContent='草釣り';switches.append(b);}
document.addEventListener('click',e=>{if(e.target.closest('[data-fishing-open]'))open();});
globalThis.KusaFishing=Object.freeze({open,close:()=>dialog.close(),diagnostics:()=>({playerId,location,phase,busy,castId,position:scene.snapshot(),view:scene.diagnostics(),audio:soundscape.diagnostics(),dialogue:dialogue.diagnostics(),plant:plantEffect.diagnostics(),crystal:crystalEffect.diagnostics(),crystalRemaining:crystalBlessingRemaining(save.getAccount()),bobberScreen:scene.bobberScreen,context,open:dialog.open,particles:dialog.querySelectorAll('.fishing-token').length,activeSounds:media.size})});

return {};
},
"kusa-fishing-scene.js":function(load){
const {FishingWorld}=load("kusa-fishing-world.js");
const {FISHING_SPRITES}=load("kusa-fishing-sprites.js");
const {COFFEE_SPOT,COFFEE_BOUNDS,nearCoffee,coffeePose}=load("kusa-fishing-coffee.js");
const active=phase=>['casting','waiting','bite','reeling','reward'].includes(phase);
class FishingScene {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.images={};this.actors={};this.actorErrors=[];this.camera={x:0,y:0,zoom:1};this.cameraReset=true;this.cameraAt=0;this.frame=0;this.last=0;this.p=FishingWorld.spawn('house');this.direction=null;this.distance=0;this.stepDistance=0;this.state={period:'day',character:'boy',phase:'idle'};this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.makeSprites();}
 set(state){Object.assign(this.state,state);if(this.loaded)this.loadPeriod();this.draw(performance.now());}
 loadPeriod(){const period=this.state.period;if(!['sunset','night','midnight'].includes(period))return;this.periodLoads??={};if(this.periodLoads[period])return;this.periodLoads[period]=true;for(const kind of ['map','house']){const img=new Image();img.onload=()=>{const cache=document.createElement('canvas');cache.width=384;cache.height=256;const c=cache.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(img,0,0,384,256);this.images[`${kind}-${period}`]=cache;this.draw(performance.now());};img.onerror=()=>{this.actorErrors.push(`${kind}-${period}: image load failed`);};img.src=new URL(`assets/fishing/time-maps-v1/${kind}-${period}.png`,document.baseURI).href;}}
 restore(p){this.p=FishingWorld.restore(p);this.direction=null;this.cameraReset=true;this.onMove?.(this.p,FishingWorld.context(this.p));}
 snapshot(){return {...this.p};}
 enter(map){this.restore(FishingWorld.spawn(map));}
 resume(place){this.restore(place==='river'?{map:'outdoor',x:230,y:97,direction:'right'}:{map:'outdoor',x:76,y:162,direction:'down'});}
 input(direction){this.direction=direction;}
 start(){if(!this.loaded){this.loaded=true;for(const [key,file] of Object.entries({map:'coast-map.png',land:'coast-land.png',house:'cottage-fisherman-v2.png',tableEmpty:'cottage-coffee-table-empty.png'})){const img=new Image();img.onload=()=>{const cache=document.createElement('canvas');cache.width=384;cache.height=256;const c=cache.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(img,0,0,384,256);this.images[key]=cache;};img.src=new URL(`assets/fishing/${file}`,document.baseURI).href;}
  const coffee=new Image();coffee.onload=()=>{try{this.prepareCoffee(coffee);}catch(e){this.actorErrors.push(`coffee: ${e.message}`);}};coffee.onerror=()=>this.actorErrors.push('coffee: image load failed');coffee.src=new URL('assets/fishing/hero-coffee-v1.png',document.baseURI).href;
  for(const character of ['boy','girl']){const img=new Image();img.onload=()=>{try{this.prepareActor(character,img);}catch(e){this.actorErrors.push(`${character}: ${e.message}`);}};img.onerror=()=>this.actorErrors.push(`${character}: image load failed`);img.src=new URL(`assets/fishing/hero-${character}-rpg-v2.png`,document.baseURI).href;}
 }this.loadPeriod();if(this.frame)return;this.last=0;const tick=t=>{this.frame=requestAnimationFrame(tick);if(t-this.last<1000/30)return;const dt=this.last?Math.min(.05,(t-this.last)/1000):0;this.last=t;this.updateCoffee(t);this.move(dt);this.draw(t);};this.frame=requestAnimationFrame(tick);}
 stop(){cancelAnimationFrame(this.frame);this.frame=0;this.direction=null;this.last=0;}
 move(dt){
  this.moving=false;
  if(!this.direction||this.rest||this.state.locked||this.isBlocked?.()||active(this.state.phase))return;
  const v={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[this.direction];if(!v)return;
  this.p.direction=this.direction;const length=43*dt,steps=Math.ceil(length);
  for(let i=0;i<steps;i++){
   const x=this.p.x+v[0]*length/steps,y=this.p.y+v[1]*length/steps;
   if([-3,3].every(dx=>[-1,1].every(dy=>FishingWorld.walkable(this.p.map,x+dx,y+dy)))){
    this.p.x=x;this.p.y=y;this.distance+=length/steps;this.stepDistance+=length/steps;this.moving=true;
   }
  }
  if(this.moving){if(this.stepDistance>10){this.stepDistance=0;this.onStep?.(FishingWorld.surface(this.p));}this.onMove?.(this.p,FishingWorld.context(this.p));}
 }
 makeSprites(){
  // Eight deterministic pixel-art frames, cached once as sprite sheets.
  this.water=document.createElement('canvas');this.water.width=256;this.water.height=32;const c=this.water.getContext('2d');this.falls=document.createElement('canvas');this.falls.width=192;this.falls.height=32;const f=this.falls.getContext('2d');
  for(let frame=0;frame<8;frame++){for(let i=0;i<13;i++){const x=(i*13+frame*(i%2?1:-1)+32)%32,y=(i*7+Math.floor(frame/3))%32;c.fillStyle=i%3?'#a4eee050':'#efffffa0';c.fillRect(frame*32+x,y,3+i%4,1);}for(let i=0;i<9;i++){f.fillStyle=['#b4f4f3b0','#f1ffffe0','#61cfe7a0'][i%3];f.fillRect(frame*24+i*3%23,(i*11+frame*4)%32,1+i%2,5+i%5);}f.fillStyle='#e2ffffa0';for(let i=0;i<6;i++)f.fillRect(frame*24+(i*7+frame)%23,27+(i+frame)%5,3,1);}
  this.overlay=document.createElement('canvas');this.overlay.width=384;this.overlay.height=256;
 }
 prepareActor(character,img){
  if(img.width!==1536||img.height!==1024)throw new Error('Unexpected sprite sheet dimensions');
  const sheet=document.createElement('canvas');sheet.width=8*144;sheet.height=4*168;const c=sheet.getContext('2d');c.imageSmoothingEnabled=false;
  // Keep three pixels per world pixel, matching the outdoor zoom without
  // discarding the generated face and clothing details before magnification.
  const bounds=FISHING_SPRITES[character],scale=72/(bounds[0][3]-bounds[0][1]+1);
  for(let row=0;row<4;row++)for(let col=0;col<8;col++){
   // Side animations share a mirrored sequence so the casting direction stays
   // correct even where the generator turned a side pose toward the viewer.
   let sourceRow=row===1?2:row;if(character==='boy'&&(row===1||row===2)&&col===3)sourceRow=1;
   const [left,top,right,bottom,anchor]=bounds[sourceRow*8+col],width=right-left+1,height=bottom-top+1;
   c.save();c.beginPath();c.rect(col*144,row*168,144,168);c.clip();c.translate(col*144+72,row*168+150);if(row===1)c.scale(-1,1);
   c.drawImage(img,col*192+left,sourceRow*256+top,width,height,Math.round((left-anchor)*scale),Math.round((top-bottom)*scale),Math.round(width*scale),Math.round(height*scale));c.restore();
  }
  if(character==='girl'){
   // Only the two downward walking frames: keep the frontal head identical
   // to the idle frame while retaining each frame's animated body and legs.
   const headHeight=118;
   for(const col of [1,2]){
    c.clearRect(col*144,0,144,headHeight);
    c.drawImage(sheet,0,0,144,headHeight,col*144,0,144,headHeight);
   }
  }
  this.actors[character]=sheet;
 }
 prepareCoffee(img){
  // Bake each transparent frame once, with a consistent hip/seat anchor.
  if(img.width!==1536||img.height!==1024)throw new Error('Unexpected coffee sprite dimensions');
  const cache=document.createElement('canvas');cache.width=4*144;cache.height=2*168;const c=cache.getContext('2d');c.imageSmoothingEnabled=false;
  for(let row=0;row<2;row++)for(let col=0;col<4;col++){
   const [left,top,right,bottom]=COFFEE_BOUNDS[row][col],width=right-left,height=bottom-top,scale=78/height;
   c.drawImage(img,col*384+left,row*512+top,width,height,col*144+96-width*scale*.82,row*168+100-78*.71,width*scale,78);
  }
  this.coffeeSprites=cache;
 }
 beginCoffee(){if(this.rest||!nearCoffee(this.p)||!this.coffeeSprites||!this.images.tableEmpty||!this.actors[this.state.character])return false;this.direction=null;this.moving=false;this.rest={at:performance.now(),origin:this.snapshot(),sips:0};return true;}
 endCoffee(notify=true){if(!this.rest)return;this.p={...this.rest.origin};this.rest=null;this.direction=null;this.moving=false;if(notify)this.onCoffeeEnd?.();}
 updateCoffee(t){if(!this.rest)return;const elapsed=t-this.rest.at;
  if(elapsed>=COFFEE_SPOT.duration){this.endCoffee();return;}
  const sips=elapsed>=4650?2:elapsed>=2100?1:0;if(sips>this.rest.sips){this.rest.sips=sips;this.onCoffeeSip?.();}
 }
 coffeeAvatar(c,t){
  const pose=coffeePose(this.rest,t);
  const scale=1.15;
  if(pose.walking){const actor=this.actors[this.state.character],row={down:0,left:1,right:2,up:3}[pose.direction],col=[0,1,0,2][Math.floor((t-this.rest.at)/140)%4],p=pose.point;this.drawActor(c,actor,row,col,p,scale);return;}
  const row=this.state.character==='girl'?1:0,p=pose.seat;c.drawImage(this.coffeeSprites,pose.col*144,row*168,144,168,p.x-32*scale,p.y-100/3*scale,48*scale,56*scale);
  if(pose.col>0){const x=p.x-10*scale,y=p.y-11*scale;c.strokeStyle='#fff4d399';c.lineWidth=.6;for(let i=0;i<2;i++){const drift=this.reduced?0:Math.sin(t*.002+i)*.7;c.beginPath();c.moveTo(x+i*1.5,y);c.quadraticCurveTo(x-1+drift+i*1.5,y-2,x+drift+i*1.5,y-4);c.stroke();}}
 }
 pose(t){
  const phase=this.state.phase,elapsed=t-(this.state.phaseAt||0),row={down:0,left:1,right:2,up:3}[this.p.direction]??0;
  let col=0;
  if(phase==='casting')col=elapsed<260?3:4;
  else if(phase==='waiting'||phase==='bite')col=5;
  else if(phase==='reeling')col=6;
  else if(phase==='reward')col=7;
  else if(this.moving)col=[0,1,0,2][Math.floor(this.distance/5)%4];
  return {row,col,direction:this.p.direction,character:this.state.character};
 }
 updateCamera(t){
  const house=this.p.map==='house',zoom=house?1:2,viewW=384/zoom,viewH=256/zoom,catching=!house&&active(this.state.phase);
  const targetX=Math.max(0,Math.min(384-viewW,this.p.x+(catching?(this.state.location==='river'?10:4):0)-viewW/2));
  const targetY=Math.max(0,Math.min(256-viewH,this.p.y+(catching?-4:-8)-viewH/2));
  const dt=Math.min(.05,Math.max(0,(t-this.cameraAt)/1000));this.cameraAt=t;
  if(this.cameraReset||this.camera.zoom!==zoom){this.camera.x=house?0:targetX;this.camera.y=house?0:targetY;this.cameraReset=false;}
  else {const blend=this.reduced?1:1-Math.exp(-14*dt);this.camera.x+=(targetX-this.camera.x)*blend;this.camera.y+=(targetY-this.camera.y)*blend;}
  this.camera.zoom=zoom;
 }
 screenPoint(x,y){return {x:(x-Math.round(this.camera.x))*this.camera.zoom,y:(y-Math.round(this.camera.y))*this.camera.zoom};}
 diagnostics(){return {camera:{...this.camera},timeMap:{period:this.state.period,key:this.mapKey,ready:!!this.images[this.mapKey],loaded:Object.keys(this.images)},playerScreen:this.screenPoint(this.p.x,this.p.y),sprite:{...this.pose(performance.now()),ready:!!this.actors[this.state.character],scale:this.p.map==='house'?1.15:1},coffee:{ready:!!this.coffeeSprites,active:!!this.rest,...(this.rest?coffeePose(this.rest,performance.now()):{})},loadedActors:Object.keys(this.actors),actorErrors:[...this.actorErrors]};}
 draw(t){const c=this.ctx;c.imageSmoothingEnabled=false;c.clearRect(0,0,384,256);const house=this.p.map==='house',kind=house?'house':'map',period=this.state.period||'day';this.mapKey=period==='day'?kind:`${kind}-${period}`;const bg=this.images[this.mapKey];if(!bg){c.fillStyle={day:'#387e87',sunset:'#553c43',night:'#131e38',midnight:'#0a1024'}[period]||'#131e38';c.fillRect(0,0,384,256);c.fillStyle='#eee2bf';c.font='10px sans-serif';c.textAlign='center';c.fillText('水辺の景色を準備しています…',192,128);c.textAlign='start';return;}this.updateCamera(t);c.save();c.scale(this.camera.zoom,this.camera.zoom);c.translate(-Math.round(this.camera.x),-Math.round(this.camera.y));c.drawImage(bg,0,0);if(!house)this.waterLayer(c,t);if(house&&this.rest&&coffeePose(this.rest,t).col>0&&this.images.tableEmpty)c.drawImage(this.images.tableEmpty,49,64,15,13,49,64,15,13);this.avatar(c,t);this.tackle(c,t);if(house){c.fillStyle='#fff1bc';c.font='9px monospace';c.fillText('▼ 出口',174,228);}c.restore();this.lighting(c,t,house);}
 waterLayer(c,t){const frame=this.reduced?0:Math.floor(t/130)%8,o=this.overlay.getContext('2d'),period=this.state.period;const opacity={day:1,sunset:.65,night:.32,midnight:.2}[period]??1;o.clearRect(0,0,384,256);for(let y=0;y<256;y+=32)for(let x=0;x<384;x+=32){const offset=(frame+(x/32+y/32)%3)%8;o.drawImage(this.water,offset*32,0,32,32,x,y,32,32);}c.save();c.globalAlpha=opacity;if(this.images.land){o.globalCompositeOperation='destination-out';o.drawImage(this.images.land,0,0);o.globalCompositeOperation='source-over';c.drawImage(this.overlay,0,0);}for(const [x,y,w,h] of [[225,32,22,19],[372,3,12,15]])c.drawImage(this.falls,frame*24,0,24,32,x,y,w,h);c.restore();}
 drawActor(c,actor,row,col,p,scale){c.drawImage(actor,col*144,row*168,144,168,Math.round(p.x)-24*scale,Math.round(p.y)-50*scale,48*scale,56*scale);}
 avatar(c,t){if(this.rest){this.coffeeAvatar(c,t);return;}const actor=this.actors[this.state.character],{row,col}=this.pose(t),scale=this.p.map==='house'?1.15:1;if(actor){c.fillStyle='#102e3f44';c.beginPath();c.ellipse(Math.round(this.p.x),Math.round(this.p.y)+1,5*scale,1.5*scale,0,0,Math.PI*2);c.fill();this.drawActor(c,actor,row,col,this.p,scale);return;}
  // Loading-only silhouette; replaced as soon as the generated atlas loads.
  c.fillStyle=this.state.character==='girl'?'#d8799c':'#4c9c79';c.fillRect(Math.round(this.p.x)-5,Math.round(this.p.y)-20,10,20);
 }
 tackle(c,t){
  const {phase,phaseAt=0,location}=this.state;if(!active(phase)||phase==='reward'){this.bobberScreen=null;return;}
  const p=this.p,river=location==='river',elapsed=t-phaseAt,{col}=this.pose(t),reel=phase==='reeling'?Math.min(1,elapsed/500):0;
  const grip=col===3?[-6,-21]:col===4?[10.5,-13.5]:col===6?[6.75,-18]:river?[4.5,-9]:[.75,-9];
  const hand={x:p.x+grip[0],y:p.y+grip[1]},tip={x:hand.x+(col===3?-7:col===6?0:9),y:hand.y-(col===6?15:13)};
  const target=FishingWorld.fishingSpot(p)||{x:p.x+(river?26:9),y:p.y+(river?8:29)},flight=phase==='casting'?Math.max(0,Math.min(1,(elapsed-260)/390)):1;
  const bx=tip.x+(target.x-tip.x)*flight*(1-reel),by=tip.y+(target.y-tip.y)*flight*(1-reel)-(phase==='casting'?Math.sin(flight*Math.PI)*12:0)+(phase==='bite'?3:Math.sin(t*.004));
  this.bobberScreen=this.screenPoint(bx,by);
  c.strokeStyle='#57412d';c.lineWidth=2;c.beginPath();c.moveTo(hand.x,hand.y);c.lineTo(tip.x,tip.y);c.stroke();c.strokeStyle='#efdfad';c.lineWidth=1;c.beginPath();c.moveTo(hand.x,hand.y);c.lineTo(tip.x,tip.y);c.stroke();
  c.strokeStyle='#f8f3dc';c.lineWidth=.6;c.beginPath();c.moveTo(tip.x,tip.y);c.quadraticCurveTo((tip.x+bx)/2,(tip.y+by)/2+(phase==='bite'?0:4),bx,by);c.stroke();c.fillStyle='#fff6d5';c.fillRect(Math.round(bx)-1,Math.round(by)-3,3,5);c.fillStyle='#e7685b';c.fillRect(Math.round(bx)-1,Math.round(by)-3,3,2);
  if(phase==='waiting'||phase==='bite'){c.strokeStyle='#d5fff4a0';c.beginPath();c.ellipse(bx,by+3,5+Math.sin(t*.003),2,0,0,Math.PI*2);c.stroke();}
  if(phase==='bite'){c.fillStyle='#fff6d4';c.fillRect(p.x-5,p.y-38,10,12);c.fillStyle='#b64c36';c.font='bold 12px monospace';c.fillText('!',p.x-3,p.y-28);}
 }
 lighting(c,t,house){if(!house&&['night','midnight'].includes(this.state.period)){for(let i=0;i<10;i++){c.globalAlpha=this.reduced?.4:.25+.4*Math.abs(Math.sin(t*.0009+i));c.fillStyle='#ededa3';c.fillRect(20+i*37,40+i*7%80,1,1);}c.globalAlpha=1;}}
}

return {FishingScene};
},
"kusa-fishing-world.js":function(load){
const {nearCoffee}=load("kusa-fishing-coffee.js");
const {nearWindowPlant}=load("kusa-fishing-plant.js");
const polygon=(x,y,p)=>{let ok=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])ok=!ok;}return ok;};
const ground=[[17,44],[65,43],[77,55],[142,60],[151,12],[166,9],[181,28],[190,61],[199,77],[208,90],[239,90],[239,102],[208,106],[202,119],[184,126],[186,141],[201,140],[206,144],[202,149],[194,154],[181,159],[162,163],[142,166],[124,167],[111,166],[101,165],[95,164],[14,168],[7,185],[3,182],[3,159],[12,157],[20,149],[39,146],[50,141],[52,117],[15,111],[7,102],[16,94],[44,90],[52,81],[72,75],[91,67],[49,64],[15,58]];
// Walkable forecourt and the path between the two trees. Tree trunks block
// feet; their entire canopies must not seal this route in either direction.
const homePath=[[18,42],[73,42],[88,56],[106,62],[108,77],[79,84],[65,97],[49,105],[45,95],[54,80],[60,67],[18,61]];
// Sand-side anchors followed by their safe water-side landing points. These
// avoid the offshore rocks rather than blindly casting a fixed distance south.
const beach=[[106,164,117,180],[130,164,128,184],[150,162,173,179],[170,159,179,179],[190,153,209,172],[203,145,222,161]];
function beachCast(p){let best=null;for(let i=1;i<beach.length;i++){const a=beach[i-1],b=beach[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy))),distance=Math.hypot(p.x-a[0]-dx*t,p.y-a[1]-dy*t);if(distance<=15&&(!best||distance<best.distance))best={distance,x:a[2]+(b[2]-a[2])*t,y:a[3]+(b[3]-a[3])*t};}return best;}
const FishingWorld={
 spawn(map){return map==='house'?{map:'house',x:192,y:183,direction:'down'}:{map:'outdoor',x:53,y:50,direction:'down'};},
 walkable(map,x,y){const boxes=map==='house'?[[22,60,48,44],[69,67,21,35],[314,71,52,77],[336,146,34,40],[23,158,23,42]]:[[40,78,10,12],[101,101,12,14],[129,111,20,20],[166,110,19,18],[10,125,16,23]];return (map==='house'?x>=20&&x<=362&&y>=88&&y<=213:polygon(x,y,ground)||polygon(x,y,homePath))&&!boxes.some(([a,b,w,h])=>x>a-2&&x<a+w+2&&y>b-1&&y<b+h+1);},
 context(p){if(p.map==='house')return p.y>201&&Math.abs(p.x-192)<24?'exit':nearCoffee(p)?'coffee':nearWindowPlant(p)?'plant':null;if(p.x>=18&&p.x<=92&&p.y>=42&&p.y<=82)return 'home';return this.fishingSpot(p)?.location||null;},
 fishingSpot(p){if(p.map!=='outdoor')return null;if(p.x>218&&p.y>89&&p.y<104)return {location:'river',direction:'right',x:p.x+26,y:p.y+8};if(p.y>157&&p.y<179&&p.x<100)return {location:'sea',direction:'down',x:p.x+9,y:p.y+29};const cast=beachCast(p);return cast&&this.walkable(p.map,p.x,p.y)?{location:'sea',direction:'down',x:cast.x,y:cast.y}:null;},
 surface(p){return p.map==='house'||(p.x<101&&p.y>157)||(p.x>208&&p.y<106)?'wood':p.y>142?'sand':'grass';},
 restore(v){const p={map:v?.map==='outdoor'?'outdoor':'house',x:Number(v?.x),y:Number(v?.y),direction:['up','down','left','right'].includes(v?.direction)?v.direction:'down'};return this.walkable(p.map,p.x,p.y)?p:this.spawn(p.map);}
};

return {FishingWorld};
},
"kusa-fishing-coffee.js":function(load){
// Coordinates refer to the adopted 384 x 256 room, not to screen pixels.
const COFFEE_SPOT={seat:{x:79,y:82},approach:{x:98,y:108},duration:8100};
// Precomputed alpha bounds avoid file:// cross-origin canvas readback.
const COFFEE_BOUNDS=[[[93,103,328,498],[84,100,310,497],[82,102,313,497],[86,102,313,497]],[[93,59,335,456],[85,54,321,456],[78,57,318,456],[87,56,320,456]]];
function nearCoffee(p){
 if(p?.map!=='house')return false;
 // Coordinates describe the player's feet beside the chair, or in front of
 // its bottom edge. Keep the old diagonal corner outside both regions.
 const right=p.x>=96&&p.x<=105&&p.y>=88&&p.y<=101;
 const below=p.x>=72&&p.x<=88&&p.y>=108&&p.y<=120;
 return right||below;
}
function coffeeHit(x,y){return x>=22&&x<=95&&y>=47&&y<=108;}
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
function coffeePose(rest,time){
 const elapsed=Math.max(0,time-rest.at),start=rest.origin,front=COFFEE_SPOT.approach,beside={x:98,y:96},feet={x:76,y:93};
 if(elapsed<450)return {stage:'approaching',point:mix(start,front,elapsed/450),direction:start.x>front.x?'left':'right',walking:true};
 if(elapsed<800)return {stage:'approaching',point:mix(front,beside,(elapsed-450)/350),direction:'up',walking:true};
 if(elapsed<1150)return {stage:'sitting',point:mix(beside,feet,(elapsed-800)/350),direction:'left',walking:true};
 if(elapsed<7200){const t=elapsed-1150,col=t<400?0:t<950?1:t<2350?2:t<3050?3:t<3500?1:t<4900?2:t<5650?3:0;return {stage:col===2?'sipping':'seated',col,seat:COFFEE_SPOT.seat};}
 if(elapsed<7550)return {stage:'standing',point:mix(feet,beside,(elapsed-7200)/350),direction:'right',walking:true};
 if(elapsed<7800)return {stage:'standing',point:mix(beside,front,(elapsed-7550)/250),direction:'down',walking:true};
 return {stage:'standing',point:mix(front,start,Math.min(1,(elapsed-7800)/300)),direction:'down',walking:true};
}

return {COFFEE_SPOT,COFFEE_BOUNDS,nearCoffee,coffeeHit,coffeePose};
},
"kusa-fishing-plant.js":function(load){
// Window plant coordinates use the room's 384 × 256 logical pixels.
function nearWindowPlant(p){return p?.map==='house'&&p.x>=130&&p.x<=174&&p.y>=88&&p.y<=108;}
const heart=['0110110','1111111','1111111','0111110','0011100','0001000'];
class FishingPlantEffect {
 constructor(stage,{sound=()=>{},ended=()=>{}}={}){
  this.sound=sound;this.ended=ended;this.active=false;this.frame=0;
  this.canvas=document.createElement('canvas');this.canvas.width=384;this.canvas.height=256;this.canvas.className='fishing-plant-effect';this.canvas.hidden=true;this.canvas.setAttribute('aria-hidden','true');stage.append(this.canvas);this.ctx=this.canvas.getContext('2d');
 }
 start(){
  if(this.active)return false;this.active=true;this.canvas.hidden=false;this.at=performance.now();this.last=0;this.sounded=new Set();this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.hearts=Array.from({length:36},(_,i)=>({at:1300+Math.floor(i/6)*190,x:35+(i*73)%315,y:166+(i*17)%49,size:2+(i%3)*.5,color:['#ff80ac','#ffb7dd','#ffe694','#b7e9ff','#d6b5ff','#ff698a'][i%6]}));
  this.sound('crunch');const tick=t=>{if(!this.active)return;const elapsed=t-this.at;if(elapsed>=5200){this.stop(true);return;}this.frame=requestAnimationFrame(tick);if(t-this.last<1000/30)return;this.last=t;this.draw(elapsed);};this.frame=requestAnimationFrame(tick);return true;
 }
 draw(t){
  const c=this.ctx;c.clearRect(0,0,384,256);c.imageSmoothingEnabled=false;
  const cue=(key,at,name,rate=1)=>{if(t>=at&&!this.sounded.has(key)){this.sounded.add(key);this.sound(name,rate);}};
  cue('swell',300,'rainbow');for(let i=0;i<6;i++)cue(`pop${i}`,1300+i*190,'heart',.9+i*.07);
  const strength=Math.max(0,Math.min(1,(t-300)/850,(4100-t)/1200));
  if(strength>0){
   const gradient=c.createLinearGradient(0,0,384,256);['#ff6b91','#ffb56b','#fff48d','#92efb1','#7de2fa','#b99aff','#ff9ce5'].forEach((color,i)=>gradient.addColorStop(i/6,color));
   c.globalAlpha=strength*(this.reduced?.18:.38);c.fillStyle=gradient;c.fillRect(0,0,384,256);
   if(!this.reduced){c.globalAlpha=strength*.18;for(let i=0;i<7;i++){c.strokeStyle=['#ff9ab8','#ffd595','#fff8b2','#b7ffd2','#9bf1ff','#c7b7ff','#ffc3ed'][i];c.lineWidth=10;c.beginPath();c.ellipse(192,130,35+i*28+(t-300)*.018,20+i*18+(t-300)*.01,-.2,0,Math.PI*2);c.stroke();}}
  }
  for(const h of this.hearts){const age=t-h.at;if(age<0||age>2550)continue;const fade=Math.min(1,age/140,(2550-age)/650);const size=h.size*(this.reduced?1:Math.min(1,age/160));const x=h.x+(this.reduced?0:Math.sin(age/440+h.x)*8),y=h.y-(this.reduced?age*.012:age*.046);
   c.globalAlpha=Math.max(0,fade);for(let row=0;row<heart.length;row++)for(let col=0;col<7;col++)if(heart[row][col]==='1'){c.fillStyle='#6f3764';c.fillRect(Math.round(x+col*size),Math.round(y+row*size+1),Math.ceil(size),Math.ceil(size));c.fillStyle=h.color;c.fillRect(Math.round(x+col*size),Math.round(y+row*size),Math.ceil(size),Math.ceil(size));}
   c.fillStyle='#fff4fc';c.fillRect(Math.round(x+size),Math.round(y+size),Math.ceil(size),Math.ceil(size));
  }c.globalAlpha=1;
 }
 stop(notify=false){if(!this.active)return;this.active=false;cancelAnimationFrame(this.frame);this.frame=0;this.canvas.hidden=true;this.ctx.clearRect(0,0,384,256);this.hearts=[];this.sounded.clear();if(notify)this.ended();}
 diagnostics(){return {active:this.active,hearts:this.hearts?.length||0,elapsed:this.active?Math.round(performance.now()-this.at):0,reduced:!!this.reduced};}
}

return {nearWindowPlant,FishingPlantEffect};
},
"kusa-fishing-sprites.js":function(load){
// Alpha bounds and hip anchors measured from each generated atlas. Runtime does
// not read canvas pixels, keeping file:// previews free of origin restrictions.
const FISHING_SPRITES={
 boy:[[50,45,149,241,100],[47,45,152,245,91],[42,45,143,245,92],[29,48,156,245,89],[43,48,174,244,91],[52,45,147,245,98],[40,48,164,245,100],[28,45,166,246,99],[46,37,156,237,103],[44,35,154,234,109],[36,38,145,234,98],[31,35,148,235,94],[42,39,172,239,90],[43,35,151,236,99],[39,37,164,235,104],[42,37,159,239,107],[43,31,154,230,95],[41,30,152,228,87],[39,30,148,228,83],[45,31,158,230,94],[41,38,174,230,89],[42,31,147,233,88],[31,31,156,231,87],[33,29,152,233,91],[49,13,149,212,99],[45,13,151,216,98],[40,13,143,218,92],[37,9,161,213,88],[47,14,169,213,91],[51,13,146,213,98],[34,10,149,213,97],[22,12,160,218,96]],
 girl:[[62,40,170,252,117],[53,41,164,254,109],[34,40,147,255,85],[15,40,135,251,99],[26,40,153,251,80],[33,40,143,252,89],[23,37,146,253,92],[5,35,147,253,82],[61,26,171,241,111],[48,27,159,241,110],[34,27,144,241,88],[37,26,153,241,81],[14,30,162,241,81],[36,26,146,241,89],[25,24,149,241,78],[19,24,127,241,92],[52,13,167,227,114],[46,14,161,226,101],[34,13,150,227,90],[19,11,137,223,97],[39,15,179,225,88],[31,13,143,226,90],[25,10,151,227,94],[19,11,157,227,92],[56,3,164,213,112],[44,3,157,217,100],[36,3,148,212,88],[25,0,146,213,67],[25,3,146,213,81],[29,3,136,214,82],[20,0,144,217,91],[10,0,157,216,82]]
};

return {FISHING_SPRITES};
},
"kusa-fishing-audio.js":function(load){
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function distanceToPath(p,points){let result=Infinity;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy),0,1);result=Math.min(result,Math.hypot(p.x-a[0]-dx*t,p.y-a[1]-dy*t));}return result;}
const smooth=(distance,radius)=>{const x=clamp(1-distance/radius,0,1);return x*x*(3-2*x);};
function fishingWaterLevels(p){
 if(!p||p.map!=='outdoor')return {sea:0,river:0,waterfall:0};
 return {
  sea:.216*smooth(distanceToPath(p,[[0,180],[100,178],[195,170]]),78),
  river:.20*smooth(distanceToPath(p,[[228,32],[245,98],[213,149]]),70),
  waterfall:.14*smooth(Math.hypot(p.x-235,p.y-44),78)
 };
}
class FishingSoundscape {
 constructor(){this.context=null;this.buffers=new Map();this.loops=new Map();this.voices=new Set();this.enabled=false;this.position=null;this.ready=false;this.loading=null;this.errors=[];this.lastStep=-Infinity;this.stepCount=0;this.lastSurface=null;this.variants={wood:0,grass:0,sand:0};this.suspendTimer=0;this.targets={sea:0,river:0,waterfall:0};}
 async load(){
  if(this.loading)return this.loading;
  this.loading=(async()=>{
   if(!globalThis.KusaFishingRecordings)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('assets/fishing/audio/recordings-data.js?v=20261018-dirt-2',document.baseURI).href;script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error('録音素材を読み込めませんでした'));};document.head.append(script);});
   await Promise.all(Object.entries(globalThis.KusaFishingRecordings).map(async([name,encoded])=>{const raw=atob(encoded),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);const buffer=await this.context.decodeAudioData(bytes.buffer);this.buffers.set(name,buffer);}));
   this.ready=true;this.update(this.position);
  })().catch(error=>{this.errors.push(error.message);this.loading=null;});return this.loading;
 }
 start(position){
  this.position=position;this.enabled=true;clearTimeout(this.suspendTimer);
  try{this.context??=new (window.AudioContext||window.webkitAudioContext)();if(this.context.state!=='running')this.context.resume().catch(()=>{});this.load();this.loadCoffee();this.update(position);}catch(e){this.errors.push(e.message);}
 }
 async loadCoffee(){
  if(this.coffeeLoading)return this.coffeeLoading;
  this.coffeeLoading=(async()=>{
   if(!globalThis.KusaFishingCoffeeRecording)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('assets/fishing/audio/coffee-sip-data.js?v=20261018-sip-only-2',document.baseURI).href;script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error('飲む音を読み込めませんでした'));};document.head.append(script);});
   const raw=atob(globalThis.KusaFishingCoffeeRecording),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));this.coffeeBuffer=await this.context.decodeAudioData(bytes.buffer);
  })().catch(e=>{this.errors.push(e.message);this.coffeeLoading=null;});return this.coffeeLoading;
 }
 sip(){
  if(!this.enabled||!this.coffeeBuffer||this.context?.state!=='running'||document.hidden)return;
  this.stopSip();const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=this.coffeeBuffer;gain.gain.value=.18;source.connect(gain).connect(this.context.destination);this.coffeeVoice=source;this.voices.add(source);this.sips=(this.sips||0)+1;
  source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(source);if(this.coffeeVoice===source)this.coffeeVoice=null;};source.start();
 }
 stopSip(){if(this.coffeeVoice){try{this.coffeeVoice.stop();}catch{}this.voices.delete(this.coffeeVoice);this.coffeeVoice=null;}}
 update(position){
  this.position=position;this.targets=this.enabled?fishingWaterLevels(position):{sea:0,river:0,waterfall:0};
  if(!this.ready||!this.context||!this.enabled)return;
  const now=this.context.currentTime;
  for(const [name,target] of Object.entries(this.targets)){
   let node=this.loops.get(name);
   if(!node&&target>.001){
    const source=this.context.createBufferSource(),gain=this.context.createGain(),pan=this.context.createStereoPanner?.();source.buffer=this.buffers.get(`${name}-real-loop`);source.loop=true;gain.gain.value=0;source.connect(gain);
    if(pan)gain.connect(pan).connect(this.context.destination);else gain.connect(this.context.destination);
    source.start();node={source,gain,pan};this.loops.set(name,node);
   }
   if(node){node.gain.gain.cancelScheduledValues(now);node.gain.gain.setTargetAtTime(target,now,.22);if(node.pan){const emitterX=name==='sea'?position.x:235;node.pan.pan.setTargetAtTime(clamp((emitterX-position.x)/90,-.35,.35),now,.3);}}
  }
  // Indoors all emitters fade out, then release their playback sources.
  if(position?.map==='house')for(const [name,node] of this.loops){node.source.stop(now+.8);node.source.onended=()=>{node.source.disconnect();node.gain.disconnect();node.pan?.disconnect();};this.loops.delete(name);}
 }
 step(surface){
  if(!this.enabled||!this.ready||!this.context||this.context.state!=='running'||document.hidden)return;
  const now=this.context.currentTime;if(now-this.lastStep<.2||this.voices.size>=4)return;this.lastStep=now;
  surface=['wood','grass','sand'].includes(surface)?surface:'grass';
  const variant=this.variants[surface]%3+1;this.variants[surface]++;
  const recording=surface==='grass'?'dirt':surface;
  const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=this.buffers.get(`step-${recording}-real-${variant}`);if(!source.buffer)return;
  source.playbackRate.value=.98+Math.random()*.04;gain.gain.value=surface==='grass'?.20:surface==='wood'?.22:.30;source.connect(gain).connect(this.context.destination);this.voices.add(source);this.stepCount++;this.lastSurface=surface;this.lastRecording=recording;
  source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(source);};source.start();
 }
 stop(){
  this.enabled=false;this.targets={sea:0,river:0,waterfall:0};const now=this.context?.currentTime||0;
  for(const node of this.loops.values()){node.gain.gain.cancelScheduledValues(now);node.gain.gain.setTargetAtTime(0,now,.015);node.source.stop(now+.06);node.source.onended=()=>{node.source.disconnect();node.gain.disconnect();node.pan?.disconnect();};}this.loops.clear();
  this.stopSip();for(const source of this.voices){try{source.stop();}catch{}}this.voices.clear();clearTimeout(this.suspendTimer);this.suspendTimer=setTimeout(()=>{if(!this.enabled)this.context?.suspend().catch(()=>{});},100);
 }
 diagnostics(){return {enabled:this.enabled,ready:this.ready,context:this.context?.state||'uninitialized',buffers:this.buffers.size,loops:this.loops.size,targets:{...this.targets},gains:Object.fromEntries([...this.loops].map(([k,v])=>[k,v.gain.gain.value])),steps:this.stepCount,lastSurface:this.lastSurface,lastRecording:this.lastRecording||null,voices:this.voices.size,coffeeReady:!!this.coffeeBuffer,sips:this.sips||0,errors:[...this.errors]};}
}

return {fishingWaterLevels,FishingSoundscape};
},
"kusa-fishing-dialogue.js":function(load){
// DOM text stays readable at phone sizes while the generated skin is reused
// by both the bottom message window and the center choice window.
class FishingDialogue {
 constructor(stage,text,{changed=()=>{},sound=()=>{}}={}){
  this.changed=changed;this.sound=sound;this.text=text;this.waiting=false;this.choiceOpen=false;this.hideTimer=0;
  this.message=document.createElement('section');this.message.className='fishing-rpg-window fishing-rpg-message';this.message.hidden=true;this.message.setAttribute('aria-label','メッセージ');
  this.next=document.createElement('button');this.next.type='button';this.next.className='fishing-rpg-next';this.next.textContent='▼';this.next.setAttribute('aria-label','メッセージを閉じる');this.next.hidden=true;
  this.message.append(text,this.next);stage.append(this.message);this.message.addEventListener('click',()=>{if(this.waiting)this.advance();});
  this.layer=document.createElement('div');this.layer.className='fishing-choice-layer';this.layer.hidden=true;
  this.layer.innerHTML='<section class="fishing-rpg-window fishing-rpg-choices" role="dialog" aria-modal="true" aria-labelledby="fishingChoiceTitle"><p id="fishingChoiceTitle">ここでひと休みしますか？</p><button type="button" class="fishing-rpg-choice-button" data-coffee-choice="yes">一服する</button><button type="button" class="fishing-rpg-choice-button" data-coffee-choice="no">やめる</button></section>';
  stage.append(this.layer);this.buttons=[...this.layer.querySelectorAll('button')];this.buttons.forEach((b,i)=>{b.onclick=()=>this.choose(i);b.onfocus=()=>this.select(i);});
 }
 get locked(){return this.waiting||this.choiceOpen;}
 say(value,{wait=false,sound=false}={}){
  clearTimeout(this.hideTimer);this.text.textContent=value;this.waiting=wait;this.next.hidden=!wait;
  if(!this.choiceOpen)this.message.hidden=false;
  if(sound)this.sound('message');
  if(!wait)this.hideTimer=setTimeout(()=>{if(!this.locked)this.message.hidden=true;},4500);
  if(wait){this.focusBefore=document.activeElement;this.next.focus({preventScroll:true});}
  this.changed();
 }
 hideNotice(){if(!this.locked){clearTimeout(this.hideTimer);this.message.hidden=true;}}
 offerCoffee(callback){this.offer({title:'ここでひと休みしますか？',label:'一服する'},callback);}
 offer({title,label},callback){
  if(this.locked)return;this.layer.querySelector('#fishingChoiceTitle').textContent=title;this.buttons[0].textContent=label;clearTimeout(this.hideTimer);this.focusBefore=document.activeElement;this.callback=callback;this.choiceOpen=true;this.message.hidden=true;this.layer.hidden=false;this.select(0);this.buttons[0].focus({preventScroll:true});
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)this.layer.firstElementChild.animate([{transform:'translateY(14px) scale(.84)',opacity:0},{transform:'translateY(0) scale(1)',opacity:1}],{duration:190,easing:'cubic-bezier(.2,.8,.2,1)'});
  this.changed();
 }
 select(index){this.index=index;this.buttons.forEach((b,i)=>b.dataset.selected=String(i===index));}
 choose(index){if(!this.choiceOpen)return;const callback=this.callback;this.choiceOpen=false;this.callback=null;this.layer.hidden=true;this.changed();this.restoreFocus();if(index===0){this.sound('confirm');callback?.();}}
 restoreFocus(){if(this.focusBefore?.isConnected)this.focusBefore.focus({preventScroll:true});}
 advance(){if(!this.waiting)return;this.waiting=false;this.message.hidden=true;this.next.hidden=true;this.changed();this.restoreFocus();}
 activate(){if(this.choiceOpen)this.choose(this.index);else this.advance();}
 key(event){
  if(!this.locked)return false;
  if(['ArrowUp','ArrowLeft','ArrowDown','ArrowRight','Tab'].includes(event.code)&&this.choiceOpen){event.preventDefault();const step=event.code==='ArrowUp'||event.code==='ArrowLeft'||event.shiftKey?-1:1;this.select((this.index+step+2)%2);this.buttons[this.index].focus({preventScroll:true});return true;}
  if(['Enter','Space','Escape'].includes(event.code)){event.preventDefault();if(!event.repeat){if(event.code==='Escape'&&this.choiceOpen)this.choose(1);else this.activate();}return true;}
  // Movement must never leak through an open message/choice.
  if(event.code.startsWith('Arrow')||/^Key[WASD]$/.test(event.code)){event.preventDefault();return true;}
  return false;
 }
 reset(){clearTimeout(this.hideTimer);this.waiting=false;this.choiceOpen=false;this.callback=null;this.message.hidden=true;this.layer.hidden=true;this.next.hidden=true;}
 diagnostics(){return {messageVisible:!this.message.hidden,text:this.text.textContent,waiting:this.waiting,choiceOpen:this.choiceOpen,choiceIndex:this.index??0};}
}

return {FishingDialogue};
},
"kusa-fishing-crystal.js":function(load){
// Reuse the finished, locally stored Blender animations; only one plays during activation.
class FishingCrystalEffect {
 constructor(stage,{sound=()=>{},ended=()=>{}}={}){
  this.sound=sound;this.ended=ended;this.active=false;
  this.el=document.createElement('section');this.el.className='fishing-crystal-effect';this.el.hidden=true;this.el.setAttribute('aria-label','結晶の加護の発動演出');
  this.el.innerHTML=`<div class="crystal-ripples" aria-hidden="true"></div><div class="crystal-shards" aria-hidden="true">${Array.from({length:16},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div><div class="crystal-portrait"><video muted playsinline loop preload="none"></video><img class="crystal-frame" src="assets/gacha-cards/glass-girl-omega/portrait-frame-v2.png" alt=""></div><strong>結晶の加護</strong><p>少女の祈りが、水辺を満たしていく。</p><button type="button">演出をスキップ</button>`;
  stage.append(this.el);this.video=this.el.querySelector('video');this.el.querySelector('button').onclick=()=>this.stop(true);
 }
 start(mode='normal'){
  this.stop();this.active=true;const base='assets/glass-girl/live2d-upgrade-v3/',sources={normal:[base+'glass-girl-deluxe.mp4',base+'glass-girl-still.png'],processed:[base+'nameless-girl-deluxe.mp4',base+'nameless-girl-still.png'],awakened:['assets/gacha-cards/glass-girl-omega/eve-loop-v5.mp4','assets/gacha-cards/glass-girl-omega/eve-still-v5.png']};
  const [src,poster]=sources[mode]||sources.normal;this.video.poster=poster;this.video.src=src;this.el.hidden=false;
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)this.video.play().catch(()=>{});
  this.sound('splash',.7);this.cue=setTimeout(()=>{if(this.active)this.sound('crystal',1);},900);this.timer=setTimeout(()=>this.stop(true),5200);
 }
 stop(notify=false){const was=this.active;this.active=false;clearTimeout(this.timer);clearTimeout(this.cue);this.video.pause();this.video.removeAttribute('src');this.video.load();this.el.hidden=true;if(was&&notify)this.ended();}
 diagnostics(){return {active:this.active};}
}

return {FishingCrystalEffect};
},
"kusa-fishing-economy.js":function(load){
const {economyLock, recoverCardUseJournal, cardCapsuleReward}=load("kusa-medal/medal-capsule-economy.js");

const FISHING_RULES=Object.freeze({buy:10,sell:5});
const keys=['kusaMedalSaveV1','kusaPlayerStoreV1','kusa-jiten-gacha-v1','kusaPachiProfilesV1'];
const journalKey='kusaCardUseJournalV1';
const qualities=['bronze','silver','gold','rainbow','special'];
const FISHING_CARD_EFFECTS=Object.freeze({
  N:Object.freeze({chips:200,balls:[20,60]}),
  R:Object.freeze({chips:500,balls:[80,180]}),
  SR:Object.freeze({chips:1200,grass:[500,1500]}),
  SSR:Object.freeze({chips:3000,balls:[300,800],grass:[1000,3000]}),
  UR:Object.freeze({chips:8000,bonusChips:[1000,5000],balls:[500,1500]}),
  GODR:Object.freeze({chips:20000,bonusChips:[5000,15000],balls:[1000,3000],grass:[5000,15000]}),
  'Ω':Object.freeze({chips:50000,bonusChips:[10000,30000],balls:[3000,8000],grass:[20000,50000]})
});
const CRYSTAL_BLESSING=Object.freeze({cardId:'glass-girl-omega',duration:600000,chance:.35,extraChips:50000,extraCapsules:10});
const isCrystalCard=card=>card?.id===CRYSTAL_BLESSING.cardId;
const crystalBlessingRemaining=(account,now=Date.now())=>Math.max(0,(account?.fishing?.crystalBlessingUntil||0)-now);
const rarityLabels={N:'ノーマル',R:'レア',SR:'スーパーレア',SSR:'SSR',UR:'UR',GODR:'GODR','Ω':'Ω'};
const formatAmount=n=>globalThis.KusaAmounts?.format(n)??Number(n).toLocaleString('ja-JP');
function fishingCardEffectMultiplier(card,account={}){
  if(!card?.id||!(account.refinements?.[card.id]?.length))return 1;
  return account.awakenedCards?.[card.id]?2:1.5;
}
const scaledRange=(range,multiplier)=>range.map(value=>Math.ceil(value*multiplier));
function fishingCardEffectDescription(card,count=1,account={}){
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
function fishingPeriod(date=new Date()) {
  // Match the site's explicit night setting; otherwise use the local clock.
  const hour=date.getHours();
  if(document.documentElement.classList.contains('night'))return hour<5?'midnight':'night';
  return hour<5?'midnight':hour<6?'night':hour<16?'day':hour<19?'sunset':'night';
}
function rollFishingRewards(location,period,cards,card,account,random=Math.random) {
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
function fishingTransaction(save,playerId,mutate) {
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
function exchangeBait(save,playerId,direction,count){
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
function startFishing(save,playerId,location,period,cardId='',count=0){
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
function catchFishing(save,playerId,castId){
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
function activateCrystalBlessing(save,playerId,count=1){
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

return {FISHING_RULES,FISHING_CARD_EFFECTS,CRYSTAL_BLESSING,isCrystalCard,crystalBlessingRemaining,fishingCardEffectMultiplier,fishingCardEffectDescription,fishingPeriod,rollFishingRewards,fishingTransaction,exchangeBait,startFishing,catchFishing,activateCrystalBlessing};
}};const cache={};function load(id){return cache[id]||(cache[id]=factories[id](load));}load("kusa-profile.js");load("kusa-card-workshop.js");load("kusa-commerce-ui.js");load("kusa-fishing.js");})();
