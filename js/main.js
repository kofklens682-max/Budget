'use strict';
/* Start-up: the two copies of the data, theme, lock screen, first render, home-screen shortcuts,
   schedule links, press-and-slide, and offline support with instant updates. Loaded last. */

if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; // each tab opens at its top
window.addEventListener('scroll', () => { $('#topbar').classList.toggle('show', window.scrollY > 44); }, { passive: true });
let resizeT;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => { const p = PAGES[UI.tab]; if (p.resize) p.resize(); }, 150);
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

let swReg = null;
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); keepNow(); return; }
  if (S.settings.pin && hiddenAt && Date.now() - hiddenAt > 60000) lockNow();
  if (swReg) swReg.update().catch(() => {});
  keepCopy('day');
  if (runRepeats() && !sheet) render();
  else if (UI.tab === 'schedule' && !sheet) render();
});
window.addEventListener('pagehide', () => { keepNow(); });
// Keep the schedule's clock, "Now" line and badges fresh.
setInterval(() => { if (UI.tab === 'schedule' && !sheet && !UI.sEdit && !document.hidden) render(); }, 60000);

// Runs now, or right after the passcode is entered.
const whenOpen = (f) => { if (locked) onUnlock.push(f); else f(); };
function takeScheduleLink() {
  if (!location.hash.startsWith('#schedule=')) return;
  const code = location.hash.slice('#schedule='.length);
  history.replaceState(history.state, '', location.pathname + location.search);
  whenOpen(() => importScheduleCode(code));
}
window.addEventListener('hashchange', takeScheduleLink);

const params = new URLSearchParams(location.search);
const addParam = params.get('add');
const tabParam = params.get('tab');
const hasLink = location.hash.startsWith('#schedule=');
history.replaceState({ tab: 'home' }, '', location.search && !hasLink ? location.pathname : undefined);

function start() {
  applyTheme();
  if (S.settings.pin) lockNow();
  runRepeats();
  render(true);
  if (addParam === 'in' || addParam === 'out') whenOpen(() => openTx(null, { type: addParam }));
  if (TAB_ORDER.includes(tabParam) && tabParam !== 'home') goTab(tabParam);
  takeScheduleLink();
  if (hadQuick) save(); // stores data from older versions in the new format
}
// Open at once from the quick copy, then compare it with the second copy. With no quick copy
// (first start, or it was lost), open from the second copy.
const checked = keepStart(S.rev, hadQuick);
if (hadQuick) {
  start();
  checked.then((took) => {
    if (took) { applyTheme(); UI.cur = S.settings.currency; if (!sheet) render(); }
    keepCopy('day');
  });
} else {
  checked.then(() => { UI.cur = S.settings.currency; start(); keepCopy('day'); });
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
bindTabSlide($('#tabs'), (t) => goTab(t));
bindSegSlide();

// Offline support + instant updates: when a new version is installed, reload into it
// (or wait until the open form is closed so nothing typed is lost).
const isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
if ('serviceWorker' in navigator && location.protocol === 'https:' && !isLocal) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    if (sheet) pendingReload = true; else keepNow().finally(() => location.reload());
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((r) => { swReg = r; }).catch(() => {});
  });
}
