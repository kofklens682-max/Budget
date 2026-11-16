'use strict';
/* NEXT — 15 Nov 2026 redesign of Budget (DRAFT in Apps/next, not the live app). Loaded last.
   - History: the filter buttons are always there (All / In / Out, groups, accounts); tap an entry = a clean detail page, Edit is a page of its own.
   - The diary: a notepad with every entry and every change, written by hand, pages you turn.
   - Transfers: a bank fee in % (decimals: 0.7 %, 1.1 %), counted by itself as "Bank fees"; each account remembers its usual fee.
   - Overview: no Goals block (Goals has its own tab). Settings: no Groups row, no demo data; Erase asks three times. */

/* ---------- the diary: what happened, with the time ---------- */
const NXD = 'budget-diary';
const dLog = () => { try { const l = JSON.parse(localStorage.getItem(NXD) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
const dPush = (e) => { const l = dLog(); l.push({ at: Date.now(), ...e }); try { localStorage.setItem(NXD, JSON.stringify(l.slice(-2000))); } catch (err) { /* full */ } };
const txWords = (t) => {
  if (!t) return '';
  if (t.type === 'transfer') return `${acc(t.account).name} → ${acc(t.toAccount).name}, ${fmt(t.amount, t.currency)}`;
  const g = grp(t.groupId), who = t.person || (g ? g.name : cat(t.type, t.category).name);
  return `${who}, ${fmt(t.amount, t.currency)}${t.type === 'in' ? ' in' : ''} · ${acc(t.account).name}`;
};
function diffLog(before) { // compare the entries before and after one action
  const now = new Map(S.tx.map((t) => [t.id, t]));
  now.forEach((t, id) => { const b = before.get(id); if (!b) dPush({ k: 'add', w: txWords(t), d: t.date }); else if (JSON.stringify(b) !== JSON.stringify(t)) dPush({ k: 'edit', w: txWords(t), old: txWords(b), d: t.date }); });
  before.forEach((b, id) => { if (!now.has(id)) dPush({ k: 'del', w: txWords(b), d: b.date }); });
}
const snap = () => new Map(S.tx.map((t) => [t.id, JSON.parse(JSON.stringify(t))]));

/* ---------- bank fee on transfers ---------- */
const feeOf = (accId) => ((S.settings.nxFee || {})[accId] || 0);
function feeCat() {
  let c = S.cats.out.find((x) => x.name === 'Bank fees');
  if (!c) { c = { id: uid(), name: 'Bank fees', g: (S.cats.out.find((x) => /fee|bank|other/i.test(x.name)) || S.cats.out[S.cats.out.length - 1]).g, c: '#8E8E93' }; S.cats.out.push(c); }
  return c.id;
}
{
  const _h = txHtml;
  txHtml = function () {
    let h = _h();
    if (draft && draft.type === 'transfer' && !draft.id) {
      if (draft.nxFee == null) draft.nxFee = feeOf(draft.account);
      const fee = Math.round((+draft.amount || 0) * draft.nxFee) / 100;
      const row = `<div class="form-label">Bank fee</div><div class="group plain"><label class="row field"><span>Fee</span><input id="nx-fee" inputmode="decimal" placeholder="0" value="${draft.nxFee || ''}" autocomplete="off" style="text-align:right"><span class="muted" style="min-width:0">%</span></label></div>
        <p class="hint" id="nx-fee-hint">${draft.nxFee ? `Fee ${fmt(fee, draft.currency)} is taken from ${esc(acc(draft.account).name)} and saved as “Bank fees”. Type 0 for no fee.` : 'No fee. Type it in % (for example 0.7 or 1.1).'}</p>`;
      h = h.replace('<div class="form-label">Details</div>', row + '<div class="form-label">Details</div>');
    }
    return h;
  };
  const _s = saveTx;
  saveTx = function () {
    const d = draft ? { ...draft } : null, before = snap();
    const r = _s.apply(this, arguments);
    try {
      if (d && d.type === 'transfer' && !d.id && d.nxFee > 0 && d.amount > 0) {
        const amount = roundCur((d.amount * d.nxFee) / 100, d.currency), tr = S.tx.find((t) => !before.has(t.id) && t.type === 'transfer');
        if (amount > 0) {
          const f = { id: uid(), type: 'out', amount, currency: d.currency, account: d.account, date: d.date && d.date <= todayIso() ? d.date : todayIso(), note: `${d.nxFee}% fee on a transfer`, person: 'Bank fee', category: feeCat(), nxFeeOf: tr ? tr.id : '' };
          S.tx.push(f); S.settings.nxFee = { ...(S.settings.nxFee || {}), [d.account]: d.nxFee }; save(); render();
          toast(`Bank fee ${fmt(amount, d.currency)} saved`);
        }
      }
    } catch (e) { console.error(e); }
    diffLog(before);
    return r;
  };
  document.addEventListener('input', (e) => {
    if (e.target.id === 'nx-fee' && draft) { draft.nxFee = Math.max(0, Math.min(20, parseFloat(String(e.target.value).replace(',', '.')) || 0)); const hint = document.getElementById('nx-fee-hint'), fee = Math.round((+draft.amount || 0) * draft.nxFee) / 100;
      if (hint) hint.textContent = draft.nxFee ? `Fee ${fmt(fee, draft.currency)} is taken from ${acc(draft.account).name} and saved as “Bank fees”. Type 0 for no fee.` : 'No fee. Type it in % (for example 0.7 or 1.1).'; }
  }, true);
}

/* ---------- an entry: a clean detail page first, Edit is a page of its own ---------- */
function detailHtml(id) {
  const t = S.tx.find((x) => x.id === id); if (!t) return sheetHead('Entry', '', '<button data-act="close-sheet">Done</button>') + '<div class="sheet-body"><p class="hint">This entry was deleted.</p></div>';
  const tr = t.type === 'transfer', c = tr ? null : cat(t.type, t.category), g = grp(t.groupId);
  const tile = tr ? ic('transfer', TRANSFER_C, 'xl') : ic(c.g, c.c, 'xl'), title = tr ? `${acc(t.account).name} → ${acc(t.toAccount).name}` : t.person || (g ? g.name : c.name);
  const amt = tr ? fmt(t.amount, t.currency) : (t.type === 'in' ? '+' : '−') + fmt(t.amount, t.currency);
  const fee = S.tx.find((x) => x.nxFeeOf === t.id), feeFor = t.nxFeeOf && S.tx.find((x) => x.id === t.nxFeeOf);
  const row = (a, b) => `<div class="row field"><span style="flex:1">${a}</span><span class="muted nx-dv">${b}</span></div>`;
  return sheetHead('Entry', '<button data-act="close-sheet">Close</button>', `<button data-act="nx-edit" data-id="${t.id}">Edit</button>`) + `<div class="sheet-body">
    <div class="nx-detail">${tile}<div class="nx-damt num ${t.type === 'in' ? 'in' : ''}">${amt}</div><div class="nx-dtitle">${esc(title)}</div></div>
    <div class="group plain">${row('Date', esc(dayLabel(t.date)))}${row(tr ? 'From' : 'Account', esc(acc(t.account).name))}${tr ? row('To', esc(acc(t.toAccount).name)) : row('Category', esc(c.name))}
      ${g ? row('Group', esc(g.name)) : ''}${t.forMonth ? row('For', esc(ymLabel(t.forMonth, true))) : ''}${t.tpid ? row('From Teacher', 'Yes') : ''}
      ${fee ? row('Bank fee', esc(fmt(fee.amount, fee.currency))) : ''}${feeFor ? row('Fee for', 'a transfer of ' + esc(fmt(feeFor.amount, feeFor.currency))) : ''}${t.note ? row('Note', esc(t.note)) : ''}</div>
  </div>`;
}
{
  const _e = ACTIONS['edit-tx'];
  ACTIONS['edit-tx'] = function (a, v, id) { if (a.closest('[data-back]')) return _e.apply(this, arguments); openSheet(detailHtml(id)); };
  ACTIONS['nx-edit'] = (a, v, id) => openTx(id);
  const _d = ACTIONS['del-tx'];
  ACTIONS['del-tx'] = async function () { const before = snap(); const r = await _d.apply(this, arguments); diffLog(before); return r; };
  const _er = ACTIONS.erase;
  ACTIONS.erase = async function () { if (!(await ask({ title: 'Are you sure?', msg: 'Nothing is deleted yet. Next you will see exactly what would be lost.', ok: 'Yes, continue', danger: true }))) return; return _er.apply(this, arguments); };
}

/* ---------- the notepad ---------- */
function diaryItems() {
  const L = dLog(), logged = new Set();
  const items = L.map((e) => { const dt = new Date(e.at); return { day: iso(dt), t: dt.getHours() * 60 + dt.getMinutes(), time: `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`, k: e.k, w: e.w, old: e.old }; });
  L.forEach((e) => { if (e.k === 'add') logged.add(e.w); });
  S.tx.forEach((t) => { const w = txWords(t); if (!logged.has(w)) items.push({ day: t.date, t: -1, time: '', k: 'add', w }); }); // older entries: the day only
  items.sort((a, b) => (b.day + String(b.t + 10000).padStart(6, '0')).localeCompare(a.day + String(a.t + 10000).padStart(6, '0')));
  return items;
}
function diaryPages() {
  const items = diaryItems(), LINES = 13, pages = []; let cur = [], day = '';
  items.forEach((x) => { const need = x.day !== day ? 2 : 1; if (cur.length + need > LINES) { pages.push(cur); cur = []; day = ''; } if (x.day !== day) { cur.push({ h: x.day }); day = x.day; } cur.push(x); });
  if (cur.length) pages.push(cur);
  return pages;
}
const KW = { add: '', edit: 'Changed: ', del: 'Deleted: ' };
function diaryHtml(p = 0) {
  const pages = diaryPages(); if (!pages.length) return sheetHead('Diary', '', '<button data-act="close-sheet">Done</button>') + '<div class="sheet-body"><p class="hint">Nothing written yet.</p></div>';
  const page = (pg, i) => `<div class="np-page ${i < p ? 'flip' : ''}" style="z-index:${200 - i}"><div class="np-holes">${'<i></i>'.repeat(11)}</div>
    ${pg.map((x) => (x.h ? `<h4>${esc(dayLabel(x.h))}${x.h.slice(0, 4) !== todayIso().slice(0, 4) ? ', ' + esc(x.h.slice(0, 4)) : ''}</h4>` : `<p>${x.time ? `<span class="tm">${x.time}</span> — ` : '— '}${KW[x.k]}${x.k === 'edit' && x.old && x.old !== x.w ? `<s>${esc(x.old)}</s> → ` : ''}${esc(x.w)}</p>`)).join('')}<span class="np-n">${i + 1}</span></div>`;
  return sheetHead('Diary', '', '<button data-act="close-sheet">Done</button>') + `<div class="sheet-body nx-dsheet"><div class="np"><div class="np-spiral">${'<i></i>'.repeat(11)}</div>${pages.map(page).join('')}</div>
    <div class="np-nav"><button class="icon-btn" data-act="nx-np" data-v="-1" aria-label="Previous page">‹</button><span id="np-pg">Page ${p + 1} of ${pages.length}</span><button class="icon-btn" data-act="nx-np" data-v="1" aria-label="Next page">›</button></div></div>`;
}
let npAt = 0;
function npGo(d) { const ps = document.querySelectorAll('.np-page'); if (!ps.length) return; npAt = Math.max(0, Math.min(ps.length - 1, npAt + d)); ps.forEach((x, i) => x.classList.toggle('flip', i < npAt)); const l = document.getElementById('np-pg'); if (l) l.textContent = `Page ${npAt + 1} of ${ps.length}`; }
ACTIONS['nx-diary'] = () => { npAt = 0; openSheet(diaryHtml(0)); };
ACTIONS['nx-np'] = (a, v) => npGo(+v);
{ let y0 = null; document.addEventListener('touchstart', (e) => { if (e.target.closest && e.target.closest('.np')) y0 = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', (e) => { if (y0 === null) return; const dx = e.changedTouches[0].clientX - y0; y0 = null; if (Math.abs(dx) > 40) npGo(dx < 0 ? 1 : -1); }); }

/* ---------- pages ---------- */
{ // History: the diary button; the filter buttons always shown
  const _r = PAGES.history.render;
  PAGES.history.render = function () {
    return _r.apply(this, arguments).replace('<header class="lt"><h1>History</h1></header>', `<header class="lt"><h1>History</h1><div class="lt-right"><button class="icon-btn nx-dbtn" data-act="nx-diary" aria-label="Diary"><svg viewBox="0 0 24 24"><path d="M6.5 3h11A1.5 1.5 0 0 1 19 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3z"/><path d="M8.5 8h7M8.5 11.5h7M8.5 15h4.5"/><path d="M5 6.5H3.5M5 10H3.5M5 13.5H3.5M5 17H3.5"/></svg></button></div></header>`).replace('<div class="fchips" hidden>', '<div class="fchips">');
  };
  const _h = PAGES.home.render; // Overview: no Goals block
  PAGES.home.render = function () { const h = _h.apply(this, arguments), a = h.indexOf('<div class="sec-head"><h2>Goals</h2>'), b = h.indexOf('<div class="sec-head"><h2>Recent</h2>'); return a >= 0 ? h.slice(0, a) + (b > a ? h.slice(b) : '') : h; };
}
{ // Settings: no Groups row, no demo data; each account shows its usual bank fee
  const _s = settingsHtml;
  settingsHtml = function () {
    let h = _s.apply(this, arguments);
    h = h.replace(/\s*<button class="row" data-act="groups-view"[\s\S]*?<\/button>/, '').replace(/<button class="row field" data-act="(load|clear)-demo"[\s\S]*?<\/button>/, '');
    h = h.replace('<div class="form-label">Organise</div>', `<div class="form-label">Bank fees</div><div class="group plain">${S.accounts.filter((a) => !a.closed).map((a) => `<label class="row field"><span style="flex:1">${esc(a.name)}</span><input data-nxfeeacc="${a.id}" inputmode="decimal" placeholder="0" value="${feeOf(a.id) || ''}" style="text-align:right;max-width:70px"><span class="muted" style="min-width:0">%</span></label>`).join('')}</div>
      <p class="hint">The usual fee of each account. A new transfer starts with it; you can change it on the transfer.</p><div class="form-label">Organise</div>`);
    return h;
  };
  document.addEventListener('input', (e) => { const id = e.target.dataset && e.target.dataset.nxfeeacc; if (!id) return; const v = Math.max(0, Math.min(20, parseFloat(String(e.target.value).replace(',', '.')) || 0)); S.settings.nxFee = { ...(S.settings.nxFee || {}), [id]: v }; save(); }, true);
}
setTimeout(() => { try { render(); } catch (e) { /* first draw is fine */ } }, 50);

/* ---------- payments from Teacher: the pop-up opens by itself when you open Budget (user, 15 Nov) ---------- */
{
  const tbL = () => { try { const l = JSON.parse(localStorage.getItem('teacher-to-budget') || '[]'); return Array.isArray(l) ? l.filter((x) => x && x.op && +x.amount > 0) : []; } catch (e) { return []; } };
  const pickAcc = (l) => { const by = (l.find((x) => x.op === 'add' && x.by) || {}).by; if (!by) return null; const accs = openAccs(); const re = by === 'cash' ? /cash|naqd/i : /card|karta|uzcard|humo|visa/i; return (accs.find((a) => re.test(a.name)) || {}).id || null; };
  let shownAt = 0;
  const autoOpen = () => {
    if (typeof sheet !== 'undefined' && sheet) return; if (typeof locked !== 'undefined' && locked) return;
    const l = tbL(); if (!l.length || Date.now() - shownAt < 4000) return; shownAt = Date.now();
    ACTIONS['tb-open'](); const a = pickAcc(l); if (a) ACTIONS['tb-acc'](null, a);
    const sh = document.querySelector('.sheet'); if (sh) sh.classList.add('nx-tb');
  };
  setTimeout(autoOpen, 900);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(autoOpen, 700); });
  window.addEventListener('storage', (e) => { if (e.key === 'teacher-to-budget') setTimeout(autoOpen, 300); });
}

/* the "From Teacher" pop-up: short button words, iPhone style (16 Nov) */
{
  const WORDS = { 'Add to my balance': 'Add', 'Already counted': 'Counted', 'Take it out of my balance': 'Take out', 'Keep it': 'Keep', 'All already counted': 'All counted' };
  const fix = (el) => el.querySelectorAll('.br-two button').forEach((b) => { const w = WORDS[b.textContent.trim()]; if (w) { b.setAttribute('aria-label', b.textContent.trim()); b.textContent = w; } });
  // one line for the name, the amount goes to the small line under it: "350 000 so'm · 1B · Nov" (it was cut off before)
  const tidy = (el) => el.querySelectorAll('.br-line .br-lh').forEach((h) => { if (h._t) return; h._t = 1; const b = h.querySelector('b'), sm = h.querySelector('small'); if (!b || !sm) return;
    const m = b.textContent.match(/^(?:Removed in Teacher: )?(.*?) · (.+ so.m)$/); if (!m) return; const parts = sm.textContent.split(' · ');
    b.textContent = (b.textContent.startsWith('Removed') ? 'Removed: ' : '') + m[1]; sm.textContent = [m[2], parts[0], (parts[1] || '').replace(/ \d{4}$/, '').slice(0, 3)].filter(Boolean).join(' · '); });
  new MutationObserver(() => { const s = document.querySelector('.sheet'); if (s && s.querySelector('.br-line')) { fix(s); tidy(s); } }).observe(document.getElementById('sheet-root') || document.body, { childList: true, subtree: true });
}
