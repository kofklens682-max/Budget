'use strict';
/* 17 Nov (Fable, after the user's feedback on the draft). Loaded last.
   - History: ONE "Filter" button that opens an iPhone-style menu with ticks (the row of chips is gone)
   - Settings: the short menu of sections (settings2.js) - taps handled here
   - one automatic copy before the update; a message when saved data was damaged */

/* ---------- History filter menu ----------
   The menu is its OWN element on top of the page (not part of the page that is redrawn). So: it opens and CLOSES with an animation,
   and choosing something low in the list (a group) only changes the ticks - the list stays where you scrolled it (user, 16 Nov). */
const F17 = { cur: [], el: null };
function f17FilterMenu(curItems) { F17.cur = curItems; return ''; } // called while History is drawn: only remembers the money choices
function f17MenuHtml() {
  const it = (k, v, label, on, dot) => `<button class="fm-i${on ? ' on' : ''}" data-fm="${k}" data-v="${v}">${dot ? `<i style="background:${dot}"></i>` : ''}<span>${label}</span><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></button>`;
  const none = UI.hType !== 'transfer' && UI.hCur === 'all' && UI.hAcc === 'all' && UI.hGroup === 'all';
  return `${it('clear', '1', 'Everything', none)}${it('transfer', '1', 'Transfers only', UI.hType === 'transfer')}
    <em>Money</em>${F17.cur.map(([v, l]) => it('cur', v, l, UI.hCur === v)).join('')}
    <em>Account</em>${S.accounts.map((a) => it('acc', a.id, esc(a.name), UI.hAcc === a.id)).join('')}
    ${S.groups.some((g) => !g.gone) ? '<em>Group</em>' + S.groups.filter((g) => !g.gone).map((g) => it('group', g.id, esc(g.name), UI.hGroup === g.id, g.color)).join('') : ''}`;
}
function f17MenuOpen() {
  f17MenuClose(true);
  const btn = document.querySelector('.hfbtn'); if (!btn) return;
  const r = btn.getBoundingClientRect(), m = document.createElement('div'); m.className = 'fm-menu'; m.setAttribute('role', 'menu');
  m.style.top = Math.round(r.bottom + 8) + 'px'; m.style.right = Math.max(12, Math.round(window.innerWidth - r.right)) + 'px';
  m.style.maxHeight = Math.max(200, Math.round(window.innerHeight - r.bottom - 120)) + 'px';
  m.innerHTML = f17MenuHtml(); document.body.appendChild(m); F17.el = m; UI.hFilter = true; btn.classList.add('on');
  m.addEventListener('click', (e) => {
    const b = e.target.closest('.fm-i'); if (!b) return; const k = b.dataset.fm, v = b.dataset.v;
    if (k === 'clear') { if (UI.hType === 'transfer') UI.hType = 'all'; UI.hCur = 'all'; UI.hAcc = 'all'; UI.hGroup = 'all'; }
    else if (k === 'transfer') UI.hType = UI.hType === 'transfer' ? 'all' : 'transfer';
    else if (k === 'cur') UI.hCur = UI.hCur === v ? 'all' : v;
    else if (k === 'acc') UI.hAcc = UI.hAcc === v ? 'all' : v;
    else if (k === 'group') UI.hGroup = UI.hGroup === v ? 'all' : v;
    UI.hLimit = HIST_PAGE;
    F17.t = Date.now(); const top = m.scrollTop; m.innerHTML = f17MenuHtml(); m.scrollTop = top; // only the ticks change; the list stays where it is
    if (k === 'clear') UI.hFilter = false;
    render();
    if (k === 'clear') f17MenuClose(); else { const nb = document.querySelector('.hfbtn'); if (nb) nb.classList.add('on'); }
  });
}
function f17MenuClose(now) {
  const m = F17.el; if (!m) return; F17.el = null; UI.hFilter = false;
  const btn = document.querySelector('.hfbtn'); if (btn) btn.classList.remove('on');
  if (now) { m.remove(); return; }
  m.classList.add('out'); m.style.pointerEvents = 'none'; setTimeout(() => m.remove(), 240);
}
ACTIONS.hfilter = () => { if (F17.el) f17MenuClose(); else f17MenuOpen(); };
// a tap outside the menu, a scroll of the page, or leaving History closes it (smoothly)
document.addEventListener('pointerdown', (e) => { if (!F17.el || (e.target.closest && e.target.closest('.fm-menu,.hfbtn'))) return; f17MenuClose(); }, true);
document.addEventListener('scroll', (e) => { if (F17.el && Date.now() - (F17.t || 0) > 500 && !(e.target.closest && e.target.closest('.fm-menu'))) f17MenuClose(); }, true);
window.addEventListener('popstate', () => f17MenuClose(true));

/* ---------- Settings: menu of sections ----------
   A section opens as its own step of the Settings sheet (core.js keeps sheet steps by their title), so the phone's back gesture and
   the "< Settings" button both go back exactly one step: section -> Settings list -> the page. ---------- */
document.addEventListener('click', (e) => {
  const t = e.target.closest && e.target.closest('[data-stsec],[data-stback],[data-act="settings"]'); if (!t) return;
  if (t.dataset.act === 'settings') { if (!t.closest('.sheet')) window.ST_OPEN = null; return; }
  e.preventDefault(); e.stopPropagation();
  if (t.dataset.stsec) { window.ST_OPEN = t.dataset.stsec; openSettings(); return; }
  if (history.state && history.state.step > 0) history.back(); else { window.ST_OPEN = null; openSettings(); }
}, true);
window.addEventListener('popstate', () => { const h = document.querySelector('.sheet h3'); if (!h || h.textContent.trim() === 'Settings') window.ST_OPEN = null; });

/* ---------- start-up: copy before the update, and the damaged-data message ---------- */
setTimeout(() => { try {
  const V = 'budget-v73';
  if (localStorage.getItem('app-ver-seen-budget') !== V) { if (typeof keepCopy === 'function') keepCopy('before', 'Before the update'); localStorage.setItem('app-ver-seen-budget', V); }
  if (window.quickBad && typeof ask === 'function') {
    const ok = S.tx.length > 0 || S.goals.length > 0;
    ask({ title: 'Saved data', msg: ok ? 'Some saved data was damaged. I used your latest good copy. Your other copies are in Settings, Backup.' : 'The saved data on this phone is damaged and I could not read it. Nothing was deleted. Open Settings, Backup to bring it back from a backup file or an automatic copy.', ok: 'OK' });
  }
} catch (e) { /* the daily copy still exists */ } }, 2500);
