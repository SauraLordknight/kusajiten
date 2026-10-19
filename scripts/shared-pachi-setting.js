/* One public base setting per JST day, plus the selected player's Fortune Key
   boost. Both cabinets share the same personal 1–6 tier until midnight JST. */
(() => {
  'use strict';
  function baseSettingForJstDay(timestamp = Date.now()) {
    const day = new Date(timestamp + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (day === '2026-10-01') return 3;
    let hash = 0x811c9dc5;
    for (let index = 0; index < day.length; index += 1) hash = Math.imul(hash ^ day.charCodeAt(index), 0x01000193);
    hash = Math.imul(hash ^ (hash >>> 16), 0x21f0aaad);
    hash = Math.imul(hash ^ (hash >>> 15), 0x735a2d97);
    hash ^= hash >>> 15;
    return (hash >>> 0) % 6 + 1;
  }
  function settingForJstDay(timestamp = Date.now(), playerId) {
    const base=baseSettingForJstDay(timestamp);
    try {
      const day=new Date(timestamp+9*3600000).toISOString().slice(0,10);
      const state=JSON.parse(localStorage.getItem('kusaMedalSaveV1')||'{}');
      if(playerId===undefined) {
        const common=JSON.parse(localStorage.getItem('kusaPlayerStoreV1')||'{}');
        playerId=globalThis.KusaPlayerStore?.getSelectedId?.()||common.selectedPlayerId||state.selectedPlayerId;
      }
      const boost=state.accounts?.[playerId]?.fortuneBoost;
      const levels=boost?.day===day&&Number.isSafeInteger(boost.levels)?Math.max(0,Math.min(2,boost.levels)):0;
      return Math.min(6,base+levels);
    } catch {return base;}
  }
  window.KusaSharedPachiSetting = Object.freeze({baseSettingForJstDay,settingForJstDay});
})();
