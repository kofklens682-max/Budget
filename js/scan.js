'use strict';
/* Fill in an entry from a screenshot: a payment receipt, a card or bank app screen (Click, Payme, a
   Humo / Uzcard app), a bank message, or a photo of a shop receipt. The AI helper (the same one the
   Notes app uses) reads it and the form fills itself — nothing is saved until you tap Save. A screen
   with several payments (a history list) opens a list to tick. Shared from another app (Android's
   Share menu) the picture arrives through sw.js and opens here. */

const AI_URL = 'https://notes-ai.kofklens682.workers.dev';
let scanSeq = 0; // a newer screenshot, or a closed form, makes an older answer stale

// ---------- The row at the top of a new entry ----------
const scanButtons = () => `<button data-act="scan-pick">${glyph('image')}<span>From a screenshot</span></button><button data-act="scan-paste">${glyph('clip')}<span>Paste</span></button>`;
function scanRow(d) {
  const s = d.scan;
  if (!s) return `<div class="scan-row">${scanButtons()}</div>`;
  const pic = s.thumb ? `<img src="${s.thumb}" alt="">` : `<span class="scan-ic">${glyph('receipt')}</span>`;
  if (s.state === 'reading') return `<div class="scan-box reading">${pic}<div><b>Reading the ${s.what}…</b><span>A few seconds</span></div></div>`;
  if (s.state === 'fail') return `<div class="scan-box bad">${pic}<div><b>${esc(s.msg)}</b><span>${esc(s.sub)}</span></div></div><div class="scan-row">${scanButtons()}</div>`;
  const dup = s.dup ? `<div class="blk-warn scan-dup">${glyph('copy')}<div><b>${s.dup.same ? 'This receipt is already in Budget' : 'Already in Budget?'}</b><span>${dayLabel(s.dup.t.date)} · ${fmt(s.dup.t.amount, s.dup.t.currency)}${s.dup.t.person ? ` · ${esc(s.dup.t.person)}` : ''}</span></div></div>` : '';
  return `<div class="scan-box good">${pic}<div><b>Filled in from the ${s.what}</b><span>${esc(s.info)}. Check it, then tap Save.</span><button class="link inl" data-act="scan-again">Use another</button></div></div>${dup}`;
}
function showScan(d) {
  if (!sheet || draft !== d) return;
  const box = $('#scan', sheet.sh);
  if (box) box.innerHTML = scanRow(d);
}

// ---------- Reading ----------
// The picture is made smaller (text stays sharp) and sent as JPEG; a small copy shows in the form.
async function scanPicture(blob) {
  const bmp = await createImageBitmap(blob);
  const draw = (k, q) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * k));
    c.height = Math.max(1, Math.round(bmp.height * k));
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; // (a see-through PNG would turn black as JPEG)
    x.fillRect(0, 0, c.width, c.height);
    x.drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  };
  const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height), 1100 / Math.min(bmp.width, bmp.height));
  let img = draw(k, 0.85);
  if (img.length > 2800000) img = draw(k * 0.8, 0.7);
  const thumb = draw(Math.min(1, 120 / bmp.height), 0.8);
  if (bmp.close) bmp.close();
  return { img, thumb };
}
async function scanImage(blob) {
  if (!sheet || !draft || draft.id) return;
  const d = draft, me = ++scanSeq;
  d.scan = { state: 'reading', what: 'screenshot' };
  showScan(d);
  let pic;
  try { pic = await scanPicture(blob); } catch (e) { return scanFail(d, me, "Couldn't open that picture", 'Try another screenshot.'); }
  if (me !== scanSeq) return;
  d.scan.thumb = pic.thumb;
  showScan(d);
  scanRead(d, me, { img: pic.img });
}
function scanText(text) {
  if (!sheet || !draft || draft.id) return;
  const d = draft, me = ++scanSeq;
  if (!/\d/.test(text)) { d.scan = { what: 'message' }; return scanFail(d, me, 'No amount in what you copied', 'Copy the bank message or a screenshot, then tap Paste.'); }
  d.scan = { state: 'reading', what: 'message' };
  showScan(d);
  scanRead(d, me, { text: text.trim().slice(0, 2000) });
}
async function scanRead(d, me, body) {
  if (!navigator.onLine) return scanFail(d, me, 'Reading needs the internet', 'Connect and try again.');
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 45000);
  try {
    const r = await fetch(AI_URL + '/receipt', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
      body: JSON.stringify({ ...body, cats: { in: S.cats.in.map((c) => c.name), out: S.cats.out.map((c) => c.name) }, today: todayIso() }),
    });
    const j = await r.json();
    if (me !== scanSeq) return;
    if (j.error === 'quota') return scanFail(d, me, "The AI's free allowance is used up for now", j.next ? `It should be back by about ${backAt(j.next)}.` : 'It comes back within a day.');
    if (!r.ok || !Array.isArray(j.items)) throw new Error('ai');
    if (!j.items.length) return scanFail(d, me, `No payment found in this ${d.scan.what}`, 'Try the receipt itself, with the amount on it.');
    if (j.items.length === 1) scanFill(d, j.items[0]);
    else scanMany(d, j.items);
  } catch (e) {
    if (me === scanSeq) scanFail(d, me, "Couldn't read it just now", 'Please try again in a moment.');
  } finally { clearTimeout(t); }
}
const backAt = (ms) => { const x = new Date(ms); return `${x.getHours()}:${String(x.getMinutes()).padStart(2, '0')}`; };
function scanFail(d, me, msg, sub) {
  if (me !== scanSeq) return;
  d.scan = { ...d.scan, state: 'fail', msg, sub };
  showScan(d);
}

// ---------- Filling the form ----------
// "AZIZ KARIMOV" → "Aziz Karimov" (names in capitals only; "Yandex Go" stays as it is)
const niceName = (s) => (s && s === s.toUpperCase() && /\p{L}/u.test(s) ? s.toLowerCase().replace(/(^|[\s.\-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()) : s || '');
const catByName = (type, name) => (name ? S.cats[type].find((c) => c.name.toLowerCase() === String(name).toLowerCase()) : null);
// Which account a card is: the one picked for it last time, else an account named after it.
function cardAccount(it) {
  const map = S.settings.cards || {};
  if (it.card && map[it.card] && S.accounts.some((a) => a.id === map[it.card])) return map[it.card];
  const hits = S.accounts.filter((a) => {
    const n = a.name.toLowerCase();
    return (it.card && n.includes(it.card)) || (it.cardType && n.includes(it.cardType.toLowerCase()));
  });
  return hits.length === 1 ? hits[0].id : null;
}
// Money from a student (the sender's name matches one student in your groups — Latin or Cyrillic).
const CYR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h' };
const nameWords = (s) => String(s || '').toLowerCase().replace(/[а-яёўқғҳ]/g, (c) => CYR[c] ?? c).replace(/['ʻʼ`’]/g, '').split(/[^a-z]+/).filter(Boolean);
function studentOf(who) {
  const words = nameWords(who);
  if (!words.length) return null;
  const hits = [];
  for (const g of S.groups) for (const s of g.students) {
    const sw = nameWords(s.name);
    if (sw.length && sw.every((w) => words.some((x) => x === w || (w.length <= 2 && x.startsWith(w))))) hits.push({ g, s });
  }
  return hits.length === 1 ? hits[0] : null;
}
// The same receipt (its number), or the same amount within a day of it, already in Budget.
function scanDup(it) {
  const same = it.ref && S.tx.find((t) => t.ref === it.ref);
  if (same) return { t: same, same: true };
  const t = S.tx.find((x) => x.type === it.kind && x.currency === it.currency && Math.abs(x.amount - it.amount) < 0.005 && (!it.date || Math.abs(daysBetween(x.date, it.date)) <= 1));
  return t ? { t, same: false } : null;
}
function scanInfo(it) {
  const parts = [`${it.kind === 'in' ? '+' : '−'}${fmt(it.amount, it.currency)}${it.who ? ` ${it.kind === 'in' ? 'from' : 'to'} ${niceName(it.who)}` : ''}`];
  if (it.date) parts.push(`${dayLabel(it.date)}${it.time ? ` ${it.time}` : ''}`);
  if (it.card) parts.push(`card •${it.card}`);
  return parts.join(' · ');
}
// One payment → the form fills in (you check it and tap Save).
function scanFill(d, it) {
  const cur = it.currency;
  Object.assign(d, { type: it.kind, amount: roundCur(it.amount, cur), currency: cur, toCurrency: cur, category: null, groupId: null, studentId: null, forMonth: null, from: ['free'], noSplit: false });
  if (it.date && it.date <= todayIso()) d.date = it.date; // (a date in the future is a misread)
  d.person = niceName(it.who);
  const c = catByName(it.kind, it.cat);
  if (c) d.category = c.id;
  const a = cardAccount(it);
  if (a) d.account = a;
  const st = it.kind === 'in' ? studentOf(d.person) : null;
  if (st) Object.assign(d, { groupId: st.g.id, studentId: st.s.id, person: st.s.name, forMonth: d.date.slice(0, 7) });
  d.ref = it.ref || null;
  d.card = it.card || null;
  d.scan = { ...d.scan, state: 'done', info: scanInfo(it), dup: scanDup(it) };
  buzz();
  if (sheet && draft === d) {
    refreshSheet(txHtml(), mountTx);
    const box = $('.amount-box', sheet.sh);
    if (box) box.classList.add('filled');
  }
}

// ---------- Several payments on one screen ----------
const entries = (n) => `${n} ${n === 1 ? 'entry' : 'entries'}`;
let scanList = null; // [{ it, on, dup }]
function scanMany(d, items) {
  if (!sheet || draft !== d) return;
  scanList = items.map((it) => { const dup = scanDup(it); return { it, dup, on: !dup }; });
  buzz();
  openSheet(scanListHtml(), null);
}
function scanListHtml() {
  const n = scanList.filter((x) => x.on).length;
  const row = (x, i) => `<button class="row field scan-item" data-act="scan-tick" data-v="${i}">
      <span class="tick ${x.on ? 'on' : ''}">${glyph('check')}</span>
      <div class="row-main"><div class="row-title">${esc(niceName(x.it.who) || x.it.what || (x.it.kind === 'in' ? 'Money in' : 'Money out'))}</div>
      <div class="row-sub">${x.dup ? '<b class="warn-t">Already in Budget</b>' : `${x.it.date ? dayLabel(x.it.date) : 'No date'}${x.it.time ? ` · ${x.it.time}` : ''}${catByName(x.it.kind, x.it.cat) ? ` · ${esc(catByName(x.it.kind, x.it.cat).name)}` : ''}`}</div></div>
      <div class="row-amt num ${x.it.kind === 'in' ? 'in' : ''}">${x.it.kind === 'in' ? '+' : '−'}${fmt(x.it.amount, x.it.currency)}</div></button>`;
  return sheetHead(`${scanList.length} payments found`, '<button data-act="tx-cancel">Cancel</button>', `<button data-act="scan-add" ${n ? '' : 'disabled'}>Add</button>`) + `
  <div class="sheet-body">
    <p class="hint" style="margin:2px 4px 12px">Tick the ones to add. Ones already in Budget are left unticked.</p>
    <div class="group plain" id="scan-list">${scanList.map(row).join('')}</div>
    <div class="actions"><button class="btn" data-act="scan-add" ${n ? '' : 'disabled'}>${n ? `Add ${entries(n)}` : 'Tick the ones to add'}</button></div>
    <p class="hint">Categories, cards and dates are guessed — you can change any entry later in History.</p>
  </div>`;
}
function scanRecord(it) {
  const kind = it.kind, cur = it.currency;
  const c = catByName(kind, it.cat);
  const rec = { id: uid(), type: kind, amount: roundCur(it.amount, cur), currency: cur, account: cardAccount(it) || UI.lastAcc[kind] || S.accounts[0].id, date: it.date && it.date <= todayIso() ? it.date : todayIso(), note: '', createdAt: Date.now(), person: niceName(it.who), category: c ? c.id : OTHER_CAT[kind] };
  if (!S.accounts.some((a) => a.id === rec.account)) rec.account = S.accounts[0].id;
  if (it.ref) rec.ref = it.ref;
  const st = kind === 'in' ? studentOf(rec.person) : null;
  if (st) Object.assign(rec, { groupId: st.g.id, studentId: st.s.id, person: st.s.name, forMonth: rec.date.slice(0, 7) });
  return rec;
}
function scanAddTicked() {
  const picked = scanList.filter((x) => x.on);
  if (!picked.length) return;
  const txBefore = S.tx.slice(), goalsBefore = JSON.parse(JSON.stringify(S.goals));
  for (const x of picked) {
    const rec = scanRecord(x.it);
    const plan = splitPlan(rec); // (Split money in works as for any money in)
    S.tx.push(rec);
    applySplit(rec, plan);
  }
  scanList = null;
  save(); buzz(); closeSheet(); render();
  const short = ['UZS', 'USD'].find(goalsShort);
  if (short) toast(`Added ${entries(picked.length)} — your goals now hold more than you have`, { label: 'Fix', run: () => openFix(short) });
  else undoToast(`Added ${entries(picked.length)}`, () => { S.tx = txBefore; S.goals = goalsBefore; });
}

// ---------- Paste, and pictures shared from other apps ----------
async function scanPaste() {
  try {
    if (navigator.clipboard && navigator.clipboard.read) {
      const items = await navigator.clipboard.read();
      for (const it of items) { const t = it.types.find((x) => x.startsWith('image/')); if (t) return scanImage(await it.getType(t)); }
      for (const it of items) if (it.types.includes('text/plain')) { const s = await (await it.getType('text/plain')).text(); if (s.trim()) return scanText(s); }
    } else if (navigator.clipboard && navigator.clipboard.readText) {
      const s = await navigator.clipboard.readText();
      if (s.trim()) return scanText(s);
    }
    toast('Nothing to paste — copy a screenshot or a bank message first');
  } catch (e) {
    toast("Couldn't paste — choose the screenshot instead");
  }
}
// Ctrl+V (or a keyboard's paste) while a new entry is open works too.
document.addEventListener('paste', (e) => {
  if (!sheet || !draft || draft.id || !$('#scan', sheet.sh) || !e.clipboardData) return;
  const f = [...e.clipboardData.files].find((x) => x.type.startsWith('image/'));
  if (f) { e.preventDefault(); scanImage(f); }
});
// sw.js keeps what was shared in the 'budget-share' cache and opens ./?share=1
async function takeShared() {
  if (!('caches' in window)) return;
  try {
    const c = await caches.open('budget-share'), r = await c.match('./shared');
    if (!r) return;
    await c.delete('./shared');
    openTx(null, { type: 'out' });
    if (r.headers.get('X-Kind') === 'image') scanImage(await r.blob());
    else scanText(await r.text());
  } catch (e) { /* nothing shared after all */ }
}

Object.assign(ACTIONS, {
  'scan-pick': () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; if (f) scanImage(f); });
    inp.click();
  },
  'scan-paste': () => scanPaste(),
  'scan-again': () => { if (!draft) return; scanSeq++; draft.scan = null; showScan(draft); },
  'scan-tick': (a, v) => {
    const x = scanList && scanList[Number(v)];
    if (!x) return;
    x.on = !x.on;
    $('.tick', a).classList.toggle('on', x.on);
    const n = scanList.filter((y) => y.on).length;
    sheet.sh.querySelectorAll('[data-act="scan-add"]').forEach((b) => { b.disabled = !n; });
    const big = $('.actions [data-act="scan-add"]', sheet.sh);
    if (big) big.textContent = n ? `Add ${entries(n)}` : 'Tick the ones to add';
  },
  'scan-add': () => scanAddTicked(),
});
