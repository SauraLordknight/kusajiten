// A restored backup replaces the whole save. Tabs opened before it must never
// write their cached game/player state over the replacement.
(() => {
  'use strict';
  const key = 'kusaBackupRevisionV1', commitKey = 'kusaBackupCommitV1';
  const read = name => { try { return localStorage.getItem(name) || ''; } catch { return ''; } };
  let revision = read(key);
  const isCurrent = () => read(key) === revision && read(commitKey) === revision;
  window.KusaBackupSession = Object.freeze({key, commitKey, isCurrent,
    adopt: value => { revision = value || ''; }
  });
  window.addEventListener('storage', event => {
    // The revision is written first (blocks old writers), and the commit last
    // (other tabs may now reload a complete, consistent backup).
    if (event.key === commitKey && event.newValue === read(key)) window.location.reload();
  });
})();
