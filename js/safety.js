'use strict';
/* Safety (3 Nov 2026, the user's request after a missing $100 and 200 000 so'm): four helpers that keep the balance true.
   1. Cash check: type what is really in each account; the gap is shown and can be saved as "Not remembered".
   2. Maybe missing: payments that came every month (the 20th-23rd...) and have not come this month yet; asked, never guessed.
   3. Spent, name it later: just the amount, 3 seconds; the entry waits (unnamed: true) on Home until named.
   4. Evening question + weekly check: a card at the bottom for 8 seconds when the app is open after the evening time.
   Plain counting on the phone: nothing is sent anywhere. Settings keep S.settings.safety. Loaded after repeat.js. */

const SFD = { eve: true, eveTime: '21:00', weekly: true, weekDay: 0, lastEve: '', shownEve: 0, lastWeek: '', laterWeek: '', shownWeek: 0 };
function SF() {
  const s = S.settings; s.safety = s.safety && typeof s.safety === 'object' ? s.safety : {};
  for (const k in SFD) if (s.safety[k] === undefined) s.safety[k] = SFD[k];
  if (!s.safety.skip || typeof s.safety.skip !== 'object') s.safety.skip = {};
  return s.safety;
}
const sfMin = (t) => { const [h, m] = String(t || '21:00').split(':').map(Number); return h * 60 + (m || 0); };
const sfAgo = (d) => { if (!d) return 'never'; const n = daysBetween(d, todayIso()); return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n + ' days ago'; };
const sfCurs = () => ['UZS', 'USD'].filter((c) => usesCur(c));

/* ---------- entries waiting for a name ---------- */
const unnamedList = () => S.tx.filter((t) => t.unnamed).sort(sortTx);
function addUnnamed(o) {
  const t = { id: uid(), type: o.type, amount: roundCur(o.amount, o.currency), currency: o.currency, account: o.account, date: todayIso(), note: o.note || '', person: '', category: OTHER_CAT[o.type], createdAt: Date.now(), unnamed: true };
  if (o.check) t.fromCheck = true;
  S.tx.push(t); return t;
}

/* ---------- 2. maybe missing ---------- */
const sfMed = (a) => { const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
function maybeMissing() {
  const cur = ymNow(), today = new Date().getDate(), since = iso(new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1)), keys = new Map();
  S.tx.filter((t) => (t.type === 'in' || t.type === 'out') && !t.groupId && !t.tpid && !t.unnamed && t.date >= since).forEach((t) => {
    const name = (t.note || t.person || '').trim().toLowerCase();
    if (!name && (t.category === OTHER_CAT[t.type] || !t.category)) return;
    const k = [t.type, name || t.category, t.currency].join('|'), e = keys.get(k) || { k, t, rows: [] };
    e.rows.push(t); if (cmpDate(t, e.t) > 0) e.t = t; keys.set(k, e);
  });
  const out = [], sk = SF().skip;
  keys.forEach((e) => {
    const past = e.rows.filter((t) => t.date.slice(0, 7) < cur), months = [...new Set(past.map((t) => t.date.slice(0, 7)))];
    if (months.length < 3 || e.rows.some((t) => t.date.slice(0, 7) === cur)) return;
    const prev = [1, 2, 3, 4].map((n) => ymShift(cur, -n)); if (prev.filter((m) => months.includes(m)).length < 3) return; // three of the last four months
    const days = past.filter((t) => prev.includes(t.date.slice(0, 7))).map((t) => +t.date.slice(8)), lo = Math.min(...days), hi = Math.max(...days);
    if (hi - lo > 5 || today <= hi + 1) return; // it must be a habit (days close together), and already a little late
    if (sk[e.k + '|' + cur] || sk[e.k + '|*']) return;
    const amt = sfMed(past.slice(-4).map((t) => t.amount)), last = e.t;
    out.push({ k: e.k, type: last.type, name: (last.note || last.person || cat(last.type, last.category).name).trim(), note: last.note || '', person: last.person || '', category: last.category, amount: roundCur(amt, last.currency), currency: last.currency, account: last.account, lo, hi, n: months.length });
  });
  return out.sort((a, b) => b.amount - a.amount).slice(0, 6);
}
const dayRange = (m) => (m.lo === m.hi ? `the ${ord(m.lo)}` : `the ${ord(m.lo)}–${ord(m.hi)}`);
const ord = (n) => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
function quietDays() { // days in the last 2 weeks with no entry at all (only when most other days have some)
  const days = [], have = new Set(S.tx.map((t) => t.date)); let withAny = 0;
  for (let i = 1; i <= 14; i++) { const d = iso(addDays(new Date(), -i)); if (have.has(d)) withAny++; else days.push(d); }
  return withAny >= 4 ? days : [];
}

/* ---------- the sheets ---------- */
const sfRow = (icon, color, title, sub, act, id, v) => `<button class="row" data-act="${act}"${id ? ` data-id="${id}"` : ''}${v ? ` data-v="${v}"` : ''}>${ic(icon, color, 'sm')}<div class="row-main"><div class="row-title">${title}</div>${sub ? `<div class="row-sub">${sub}</div>` : ''}</div>${I.chev}</button>`;
function missingHtml() {
  const l = maybeMissing();
  return sheetHead('Maybe missing', '', '<button data-act="close-sheet">Done</button>') + `<div class="sheet-body">
    <p class="hint" style="margin-top:0">These came every month on about the same day, and have not come this month yet. Only you know if they did, so Budget asks.</p>
    ${l.length ? l.map((m, i) => `<div class="group plain"><div class="row"><div class="row-main"><div class="row-title">${esc(m.name)} · <span class="num">${m.type === 'in' ? '+' : '−'}${fmt(m.amount, m.currency)}</span></div><div class="row-sub">${plural(m.n, 'month')} in a row, usually ${dayRange(m)}. Not found this month.</div></div></div>
      <div class="row field" style="gap:8px;flex-wrap:wrap"><button class="chip info" data-act="mm-add" data-id="${i}">${m.type === 'in' ? 'It came, add it' : 'I paid, add it'}</button><button class="chip" data-act="mm-skip" data-id="${i}">Not this month</button><button class="chip" data-act="mm-stop" data-id="${i}">Stopped</button></div></div>`).join('') : `<section class="card empty"><div class="big">${ic('check', '#34C759', 'xl')}</div><h3>Nothing looks missing</h3><p>Everything that comes every month is here.</p></section>`}</div>`;
}
function namingHtml() {
  const l = unnamedList();
  return sheetHead('To name', '', '<button data-act="close-sheet">Done</button>') + `<div class="sheet-body">
    <p class="hint" style="margin-top:0">The money is already counted. Only the name is missing: tap one and write what it was.</p>
    ${l.length ? `<div class="group">${l.map((t) => `<button class="row" data-act="edit-tx" data-id="${t.id}">${ic('receipt', '#FF9500', 'sm')}<div class="row-main"><div class="row-title num">${t.type === 'in' ? '+' : '−'}${fmt(t.amount, t.currency)}</div><div class="row-sub">${esc(shortDate(t.date))} · ${esc(acc(t.account).name)}${t.note ? ' · ' + esc(t.note) : ''}</div></div>${I.chev}</button>`).join('')}</div>`
      : `<section class="card empty"><div class="big">${ic('check', '#34C759', 'xl')}</div><h3>All named</h3></section>`}</div>`;
}
let quick = null;
function quickHtml() {
  const q = quick, cs = sfCurs().length ? sfCurs() : [S.settings.currency];
  return sheetHead(q.type === 'in' ? 'Got money, name it later' : 'Spent, name it later', '', '<button data-act="close-sheet">Cancel</button>') + `<div class="sheet-body">
    <div style="padding:22px 0 8px;text-align:center"><input class="amount-input num" id="q-amt" inputmode="decimal" placeholder="0" value="${shownAmount(q.amount, q.currency)}" autocomplete="off" aria-label="Amount"></div>
    ${cs.length > 1 ? `<div class="seg full sm">${segButtons('q-cur', cs.map((c) => [c, c === 'UZS' ? "so'm" : '$']), q.currency)}</div>` : ''}
    <div class="form-label">From</div><div class="seg full sm">${segButtons('q-acc', openAccs().map((a) => [a.id, esc(a.name)]), q.account)}</div>
    <div class="group plain" style="margin-top:14px"><label class="row field"><span>Note (optional)</span><input id="q-note" placeholder="" value="${esc(q.note)}" autocomplete="off"></label></div>
    <button class="btn" data-act="q-save" style="margin-top:18px">Save now, name it later</button>
    <p class="hint">The balance is right at once. A small card on Home reminds you to name it.</p></div>`;
}
function mountQuick(sh) {
  const amt = $('#q-amt', sh); amt.addEventListener('input', () => { const r = typedAmount(amt.value, quick.currency); amt.value = r.shown; quick.amount = r.value; });
  $('#q-note', sh).addEventListener('input', (e) => { quick.note = e.target.value; });
  blurOnEnter(sh); setTimeout(() => amt.focus(), 350);
}
function openQuick(type) { quick = { type: type || 'out', amount: 0, currency: sfCurs()[0] || S.settings.currency, account: UI.lastAcc && UI.lastAcc[type || 'out'] && isOpenAcc(UI.lastAcc[type || 'out']) ? UI.lastAcc[type || 'out'] : openAccs()[0].id, note: '' }; openSheet(quickHtml(), mountQuick); }

/* ---------- 1. cash check ---------- */
let cc = null; // typed amounts: cc['account|cur'] = number or undefined
const ccRows = () => { const out = []; openAccs().forEach((a) => sfCurs().forEach((c) => { const b = accBalance(a.id, c); if (b || a.opening[c] || S.tx.some((t) => t.account === a.id && t.currency === c)) out.push({ a, c, b }); })); return out; };
function ccDiffs() { return ccRows().filter((r) => cc[r.a.id + '|' + r.c] !== undefined).map((r) => ({ ...r, real: cc[r.a.id + '|' + r.c], d: roundCur(cc[r.a.id + '|' + r.c] - r.b, r.c) })); }
function ccResultHtml() {
  const ds = ccDiffs(); if (!ds.length) return '<p class="hint">Type what is really there in at least one box.</p>';
  const bad = ds.filter((x) => x.d !== 0);
  const hints = []; const mm = maybeMissing(), qd = quietDays(), un = unnamedList();
  mm.forEach((m) => hints.push(`${esc(m.name)} (${m.type === 'in' ? '+' : '−'}${fmt(m.amount, m.currency)}) usually comes ${dayRange(m)}: not found this month`));
  if (qd.length >= 2) hints.push(`${qd.length} days with no entries in the last 2 weeks (${qd.slice(0, 4).map(shortDate).join(', ')}${qd.length > 4 ? '…' : ''})`);
  if (un.length) hints.push(`${plural(un.length, 'entry')} still without a name`);
  return `<div class="group plain">${ds.map((x) => `<div class="row field"><span style="flex:1">${esc(x.a.name)} · ${x.c === 'UZS' ? "so'm" : '$'}</span><b class="num" style="color:${x.d === 0 ? 'var(--in-text)' : 'var(--danger)'}">${x.d === 0 ? 'matches ✓' : (x.d > 0 ? '+' : '−') + fmt(Math.abs(x.d), x.c)}</b></div>`).join('')}</div>
    ${bad.length ? `<p class="hint">${bad.map((x) => x.d < 0 ? `${esc(x.a.name)}: Budget thinks you have ${fmt(-x.d, x.c)} more than you do.` : `${esc(x.a.name)}: you have ${fmt(x.d, x.c)} more than Budget says.`).join(' ')}</p>
      ${hints.length ? `<div class="form-label">Where to look</div><div class="group plain">${hints.map((h) => `<div class="row field"><span style="flex:1;font-size:14px">${h}</span></div>`).join('')}</div>${mm.length ? '<button class="btn" style="background:var(--accent-soft);color:var(--accent);margin-top:10px" data-act="open-missing">Open “Maybe missing”</button>' : ''}` : ''}
      <button class="btn" style="margin-top:14px" data-act="cc-save">Save the gap as “Not remembered”</button>
      <p class="hint">This adds one entry per gap, dated today, so the balance is true again. If you remember later, open it from “To name” and write what it was.</p>`
      : `<button class="btn" style="margin-top:14px" data-act="cc-done">${ic('check', '#fff', 'sm')} All correct</button>`}`;
}
function ccHtml() {
  const rows = ccRows(), sf = SF();
  return sheetHead('Count your money', '', '<button data-act="close-sheet">Close</button>') + `<div class="sheet-body">
    <p class="hint" style="margin-top:0">Last checked: <b>${sfAgo(sf.lastWeek)}</b>. Count what is really in your wallet and on your cards, and type it. Leave a box empty to skip it.</p>
    <div class="group plain">${rows.map((r) => `<div class="row field"><div style="flex:1"><div class="row-title">${esc(r.a.name)} · ${r.c === 'UZS' ? "so'm" : '$'}</div><div class="row-sub">Budget says <b class="num">${fmt(r.b, r.c)}</b></div></div><input class="num" data-cc="${r.a.id}|${r.c}" inputmode="decimal" placeholder="real amount" style="width:140px;text-align:right" autocomplete="off"></div>`).join('')}</div>
    <div id="cc-result" style="margin-top:12px">${ccResultHtml()}</div></div>`;
}
function mountCC(sh) {
  sh.querySelectorAll('[data-cc]').forEach((el) => el.addEventListener('input', () => {
    const [aid, c] = el.dataset.cc.split('|'), r = typedAmount(el.value, c); el.value = r.shown;
    if (el.value === '') delete cc[el.dataset.cc]; else cc[el.dataset.cc] = r.value;
    $('#cc-result', sh).innerHTML = ccResultHtml();
  }));
  blurOnEnter(sh);
}
function openCC() { cc = {}; openSheet(ccHtml(), mountCC); }

/* ---------- 4. the evening question and the weekly check ---------- */
let popT = 0;
function popHide() { const p = $('#safe-pop'); if (!p) return; clearTimeout(popT); p.classList.remove('show'); setTimeout(() => p.remove(), 350); }
function popShow(html) {
  popHide(); const p = document.createElement('div'); p.id = 'safe-pop'; p.className = 'safe-pop'; p.innerHTML = html + '<i class="sp-bar"></i>';
  document.body.appendChild(p); requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('show')));
  popT = setTimeout(popHide, 8000);
}
function safetyTick() {
  if (document.hidden || locked || sheet || $('#safe-pop') || !hasAnything()) return;
  const sf = SF(), now = new Date(), min = now.getHours() * 60 + now.getMinutes(), today = todayIso();
  if (min < sfMin(sf.eveTime)) return;
  const sinceWeek = sf.lastWeek ? daysBetween(sf.lastWeek, today) : 99;
  const weekDue = sf.weekly && sf.laterWeek !== today && sf.lastWeek !== today && ((now.getDay() === sf.weekDay && sinceWeek >= 5) || sinceWeek >= 8) && Date.now() - sf.shownWeek > 30 * 60e3;
  if (weekDue) {
    sf.shownWeek = Date.now(); save();
    popShow(`<b>Weekly check</b><span>Count your money and compare it with Budget. It takes 30 seconds. Last time: ${sfAgo(sf.lastWeek)}.</span><div><button data-act="sp-week">Count now</button><button class="n" data-act="sp-later">Later</button></div>`);
  } else if (sf.eve && sf.lastEve !== today && Date.now() - sf.shownEve > 30 * 60e3) {
    sf.shownEve = Date.now(); save();
    popShow(`<b>Did anything else happen today?</b><span>Money you spent or got that is not in Budget yet.</span><div><button data-act="sp-spent">I spent something</button><button data-act="sp-got">I got money</button><button class="n" data-act="sp-no">No, all is here</button></div>`);
  }
}
setInterval(safetyTick, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(safetyTick, 1500); });
setTimeout(safetyTick, 2500);

/* ---------- Home card and Settings ---------- */
function safetyCard() {
  if (!hasAnything()) return '';
  const sf = SF(), un = unnamedList().length, mm = maybeMissing().length, late = sf.lastWeek ? daysBetween(sf.lastWeek, todayIso()) >= 7 : S.tx.length > 7;
  return `<div class="sec-head"><h2>Keep it true</h2></div><div class="group">
    ${sfRow('wallet', '#34C759', 'Count your money', `Last checked ${sfAgo(sf.lastWeek)}${late ? ' · time to check' : ''}`, 'open-cc')}
    ${sfRow('receipt', '#FF9500', 'Spent, name it later', un ? `${plural(un, 'entry')} to name` : 'Save just the amount now', un ? 'open-naming' : 'open-quick')}
    ${mm ? sfRow('search', '#007AFF', 'Maybe missing', `${mm} usual ${mm === 1 ? 'payment has' : 'payments have'} not come this month`, 'open-missing') : ''}</div>`;
}
{
  const _r = renderHome;
  renderHome = function () {
    const h = _r(), c = safetyCard(); if (!c) return h;
    const at = h.indexOf('<div class="sec-head"><h2>Accounts</h2>');
    return at >= 0 ? h.slice(0, at) + c + h.slice(at) : h + c;
  };
  PAGES.home.render = renderHome;
  const _s = settingsHtml;
  settingsHtml = function () {
    const sf = SF(), h = _s(), days = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];
    const sec = `<div class="form-label">Keep it true</div><div class="group plain">
      <div class="row field"><span style="flex:1">Evening question</span><label class="switch"><input type="checkbox" id="sf-eve" ${sf.eve ? 'checked' : ''} aria-label="Evening question"><i></i></label></div>
      <div class="row field"><span style="flex:1">Weekly money check</span><label class="switch"><input type="checkbox" id="sf-week" ${sf.weekly ? 'checked' : ''} aria-label="Weekly money check"><i></i></label></div></div>
    <div class="form-label">Ask me after</div><div class="seg full sm">${segButtons('sf-time', [['19:00', '19:00'], ['20:00', '20:00'], ['21:00', '21:00'], ['22:00', '22:00']], sf.eveTime)}</div>
    <div class="form-label">Weekly check on</div><div class="seg full sm">${segButtons('sf-day', days.map(([n, t]) => [String(n), t]), String(sf.weekDay))}</div>
    <p class="hint">When the app is open after that time, a small card asks for 8 seconds: “Did anything else happen today?”, and once a week “Count your money”. A phone app cannot wake itself up, so open Budget in the evening.</p>`;
    return h.replace('<div class="form-label">Look</div>', sec + '<div class="form-label">Look</div>');
  };
  const _m = mountSettings;
  mountSettings = function (sh) {
    _m(sh);
    const sf = SF();
    $('#sf-eve', sh).addEventListener('change', (e) => { sf.eve = e.target.checked; save(); });
    $('#sf-week', sh).addEventListener('change', (e) => { sf.weekly = e.target.checked; save(); });
  };
}

Object.assign(ACTIONS, {
  'open-cc': () => openCC(),
  'open-quick': () => openQuick('out'),
  'open-naming': () => openSheet(namingHtml()),
  'open-missing': () => openSheet(missingHtml()),
  'q-cur': (a, v) => { quick.currency = v; quick.amount = 0; refreshSheet(quickHtml(), mountQuick); },
  'q-acc': (a, v) => { quick.account = v; refreshSheet(quickHtml(), mountQuick); },
  'q-save': () => {
    if (!(quick.amount > 0)) return toast('Type the amount first');
    const t = addUnnamed(quick); UI.flashId = t.id; save(); buzz(); closeSheetNow(); render(); toast(`${fmt(t.amount, t.currency)} saved. Name it when you remember.`);
  },
  'cc-save': () => {
    const bad = ccDiffs().filter((x) => x.d !== 0); if (!bad.length) return;
    bad.forEach((x) => addUnnamed({ type: x.d < 0 ? 'out' : 'in', amount: Math.abs(x.d), currency: x.c, account: x.a.id, note: 'Not remembered (cash check)', check: true }));
    SF().lastWeek = todayIso(); save(); buzz(); closeSheetNow(); render(); toast('Saved. The balance now matches what you have.');
  },
  'cc-done': () => { SF().lastWeek = todayIso(); save(); closeSheetNow(); render(); toast('Everything matches ✓'); },
  'mm-add': (a, v, id) => { const m = maybeMissing()[+id]; if (!m) return; closeSheetNow(); setTimeout(() => openTx(null, { type: m.type, amount: m.amount, currency: m.currency, account: m.account, category: m.category, note: m.note, person: m.person }), 480); },
  'mm-skip': (a, v, id) => { const m = maybeMissing()[+id]; if (!m) return; SF().skip[m.k + '|' + ymNow()] = true; save(); refreshSheet(missingHtml()); render(); },
  'mm-stop': (a, v, id) => { const m = maybeMissing()[+id]; if (!m) return; SF().skip[m.k + '|*'] = true; save(); refreshSheet(missingHtml()); render(); toast('Budget will not ask about this one again'); },
  'sf-time': (a, v) => { SF().eveTime = v; save(); refreshSheet(settingsHtml(), mountSettings); },
  'sf-day': (a, v) => { SF().weekDay = +v; save(); refreshSheet(settingsHtml(), mountSettings); },
  'sp-spent': () => { SF().lastEve = todayIso(); save(); popHide(); openQuick('out'); },
  'sp-got': () => { SF().lastEve = todayIso(); save(); popHide(); openQuick('in'); },
  'sp-no': () => { SF().lastEve = todayIso(); save(); popHide(); toast('Good. Everything is here ✓'); },
  'sp-week': () => { popHide(); openCC(); },
  'sp-later': () => { SF().laterWeek = todayIso(); save(); popHide(); },
});
