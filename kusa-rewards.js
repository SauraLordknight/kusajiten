(() => {
  'use strict';

  const key = 'kusaPachiRewardsV1';
  const gachaKey = 'kusa-jiten-gacha-v1';
  const exchangeCost = 15000;
  let memory = {tickets: 0};

  const validCount = value => KusaAmounts.normalize(value);

  function normalize(value) {
    return {tickets: validCount(value?.tickets)};
  }

  function read() {
    try {
      const shared = window.KusaPlayerStore?.getRewards?.();
      if (shared) {
        memory = normalize(shared);
        return normalize(memory);
      }
      const stored = localStorage.getItem(key);
      if (stored) memory = normalize(JSON.parse(stored));
    } catch { /* 保存できない場合も、このページを開いている間は遊べる */ }
    return normalize(memory);
  }

  function save(state) {
    if (window.KusaBackupSession?.isCurrent() === false) return false;
    memory = normalize(state);
    if (window.KusaPlayerStore) {
      if (!window.KusaPlayerStore.getSelectedId()) return false;
      return window.KusaPlayerStore.saveRewards(memory);
    }
    try {
      localStorage.setItem(key, JSON.stringify(memory));
      return true;
    } catch { return false; }
  }

  function notify() {
    window.dispatchEvent(new Event('kusa-rewards-changed'));
  }

  function addTicket() {
    const state = read();
    const previous = normalize(state);
    state.tickets=KusaAmounts.add(state.tickets,1);
    if (!save(state)) { memory = previous; return {ok: false, state: previous, saveFailed: true}; }
    notify();
    return {ok: true, state};
  }

  function spendTicket() {
    const state = read();
    if (state.tickets < 1) return false;
    const previous = normalize(state);
    state.tickets=KusaAmounts.sub(state.tickets,1);
    if (!save(state)) { memory = previous; return false; }
    notify();
    return true;
  }

  window.KusaRewards = Object.freeze({key, gachaKey, exchangeCost, read, save, addTicket, spendTicket, notify, normalize});
})();
