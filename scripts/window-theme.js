/* Presentation only: the original dialog IDs, event handlers and card artwork remain intact. */
(() => {
  const surfaces = '.commerce-dialog,.site-theme-dialog,.site-info-dialog,.kusa-action-dialog,.commemorative-viewer,.commemorative-medal-dialog,.pachi-ranking-dialog,.pachi-share-panel,.pachi-result-panel,.news-panel,#detailModal .detail-panel,.screen-workspace,.screen-game-window';
  const heads = '.commerce-dialog header,.site-theme-dialog header,.site-info-head,.kusa-action-dialog>h2,.commemorative-viewer header,.commemorative-medal-dialog-head,.pachi-ranking-head,.pachi-share-head,.pachi-result-head,.news-modal-head,#detailModal .detail-head,.screen-panel-head';
  function decorate(root) {
    if (root.nodeType !== 1) return;
    if (root.matches(surfaces)) root.classList.add('theme-window');
    root.querySelectorAll(surfaces).forEach(n => n.classList.add('theme-window'));
    if (root.matches(heads)) root.classList.add('theme-window-head');
    root.querySelectorAll(heads).forEach(n => n.classList.add('theme-window-head'));
  }
  const card = document.querySelector('#gachaDetailModal .detail-panel');
  if (card) {
    const frame = document.createElement('section'); frame.className = 'theme-window theme-card-window';
    const header = document.createElement('header'); header.className = 'theme-window-head';
    const title = document.createElement('h2'); title.textContent = '図鑑カード';
    const close = document.createElement('button'); close.type = 'button'; close.textContent = '× 閉じる'; close.setAttribute('aria-label', '図鑑カードを閉じる'); close.addEventListener('click', () => card.querySelector('.detail-close').click());
    header.append(title, close); card.before(frame); frame.append(header, card);
  }
  decorate(document.body);
  // Confirmation dialogs are created on demand. Decorate only additions, not every frame.
  new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(decorate))).observe(document.body, {childList:true,subtree:true});
})();
