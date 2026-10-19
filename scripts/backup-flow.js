(() => {
  'use strict';
  let report = {stage: 'idle', events: []};
  let origin = 0;
  function stage(name, detail = {}) {
    report.stage = name;
    report.events.push({stage: name, ms: Math.round(performance.now() - origin), ...detail});
  }
  function begin(file) {
    origin = performance.now();
    report = {file: file.name, bytes: file.size, startedAt: new Date().toISOString(), stage: 'reading', events: []};
    stage('reading');
  }
  function readJson(file, timeout = 8000) {
    // File.text() has no abort or timeout. FileReader lets a stalled local-file
    // read end with a useful error instead of leaving the UI waiting forever.
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      let settled = false;
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reader.onload = reader.onerror = reader.onabort = null;
        if (error) reject(error); else resolve(value);
      };
      const timer = setTimeout(() => {
        const error = new Error('ファイルの読み取りが時間内に完了しませんでした。');
        error.name = 'TimeoutError';
        finish(error);
        reader.abort();
      }, timeout);
      reader.onload = () => {
        try {
          stage('validating');
          finish(null, JSON.parse(String(reader.result).replace(/^\uFEFF/, '')));
        } catch (error) { finish(error); }
      };
      reader.onerror = () => finish(reader.error || new Error('ファイルを読み取れませんでした。'));
      reader.onabort = () => finish(new Error('ファイルの読み取りが中断されました。'));
      try { reader.readAsText(file, 'UTF-8'); } catch (error) { finish(error); }
    });
  }
  function confirm({file, profiles, selected, cards, tickets}) {
    stage('confirmation');
    const dialog = document.createElement('dialog');
    dialog.id = 'backupImportConfirm';
    dialog.className = 'kusa-action-dialog';
    dialog.setAttribute('aria-labelledby', 'backupImportConfirmTitle');
    const heading = document.createElement('h2');
    heading.id = 'backupImportConfirmTitle'; heading.textContent = '読み込む記録の確認';
    const content = document.createElement('div');
    const format = value => KusaAmounts.format(value || 0);
    for (const text of [file.name, `プレイヤー：${selected?.name || '未登録'}（全${profiles.length}人）`,
      `草 ${format(selected?.grass)} ／ 持ち球 ${format(selected?.balls)}`,
      `取得カード ${cards}種 ／ ガチャ券 ${format(tickets)}枚`,
      '現在の全プレイヤーの記録を、このファイルの内容で置き換えます。']) {
      const p = document.createElement('p'); p.textContent = text; content.append(p);
    }
    const buttons = document.createElement('div'); buttons.className = 'kusa-action-buttons';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'キャンセル';
    const accept = document.createElement('button'); accept.type = 'button'; accept.textContent = 'この内容を読み込む';
    cancel.dataset.backupCancel = ''; accept.dataset.backupConfirm = ''; accept.dataset.actionConfirm = '';
    buttons.append(cancel, accept); dialog.append(heading, content, buttons); document.body.append(dialog);
    return new Promise((resolve, reject) => {
      dialog.addEventListener('close', () => { const accepted = dialog.returnValue === 'yes'; dialog.remove(); resolve(accepted); }, {once: true});
      accept.addEventListener('click', () => dialog.close('yes'));
      cancel.addEventListener('click', () => dialog.close('no'));
      try { dialog.showModal(); cancel.focus(); } catch (error) { dialog.remove(); reject(error); }
    });
  }
  window.KusaBackupFlow = Object.freeze({begin, stage, readJson, confirm,
    fail(error) { stage('failed', {error: error?.name || 'Error', message: error?.message || String(error)}); },
    snapshot: () => JSON.parse(JSON.stringify(report))});
})();
