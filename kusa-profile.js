import {MedalSave} from './kusa-medal/medal-save.js?v=20261007a';
import {confirmAction, animateOffering} from './kusa-action-ui.js';
import {createCommemorativeUI} from './kusa-commemorative-ui.js';
import {capsuleTotal} from './kusa-medal/medal-capsule-economy.js';
import {offerCard, offerChips, toggleFavorite, rewardGachaDuplicate, XP_FOR_LEVEL, GRASSIFY_COST, OFFER_XP} from './kusa-medal/medal-economy.js';

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
