'use strict';
/* Money split by currency (user, 5 Nov 2026): "in Cash I have some so'm and some dollars. Home shows the total in so'm, but
   when I open Cash it should show how much is in so'm and how much in dollars, and let me change them."
   On an account's page: one card with a row per currency (so'm, dollars), the total in the main currency, and "Exchange".
   10 Nov 2026 (user): "when I write the dollars I have to take them out of the so'm myself". Now the sheet has a switch
   "Take it out of my so'm" (on by default): the app counts the other side itself at today's rate and saves it as an exchange
   inside the account, so the total stays the same. Switch off = the old way: one entry for the difference ("Balance changed
   by hand"). The whole row is the button (no small "Change" button), so a long amount never pushes the name away.
   Loaded after safety.js. */
let splitEdit = null; // { aid, cur, value, from }
const spOther = (cur) => (cur === 'USD' ? 'UZS' : 'USD');
const spName = (cur) => (cur === 'UZS' ? "so'm" : 'dollars');
function splitCard(a) {
  const u = accBalance(a.id, 'UZS'), d = accBalance(a.id, 'USD'), main = UI.cur, total = accBalanceIn(a.id, main);
  const row = (cur, v, g, c, name) => `<button class="row sp-row" data-act="split-change" data-id="${a.id}" data-v="${cur}" aria-label="${name}: change"><span class="ic sm" style="--c:${c}"><b class="sp-sym">${g}</b></span>
      <div class="row-main" style="flex:0 0 auto"><div class="row-title">${name}</div><div class="row-sub">${cur === main || !v ? 'Tap to change' : `≈ <span class="num">${fmt(conv(v, cur, main), main)}</span>`}</div></div>
      <b class="num sp-amt" style="min-width:0;overflow:hidden;text-overflow:ellipsis;text-align:right;flex:1 1 auto">${fmt(v, cur)}</b><span aria-hidden="true" style="margin-left:8px;color:#C7C7CC;font-size:20px;line-height:1">›</span></button>`;
  return `<div class="form-label">In this account</div>
    <div class="group sp-card">${row('UZS', u, "so'm", '#34C759', "So'm")}${row('USD', d, '$', '#007AFF', 'Dollars')}
      <div class="row sp-tot"><div class="row-main"><div class="row-title">Total</div><div class="row-sub">${main === 'UZS' ? "in so'm" : 'in dollars'}${u && d ? ' · at today’s rate' : ''}</div></div><b class="num">${fmt(total, main)}</b></div></div>
    <button class="btn grey sp-ex" data-act="split-exchange" data-id="${a.id}">⇄ Exchange dollars and so'm</button>`;
}
// what Save will do: { diff, other, otherNow, otherAfter, short } (short = not enough of the other money)
function spPlan() {
  const s = splitEdit, now = accBalance(s.aid, s.cur), diff = s.value == null ? 0 : roundCur(s.value - now, s.cur), other = spOther(s.cur), otherNow = accBalance(s.aid, other);
  const move = s.from && somRate() > 0 ? roundCur(conv(Math.abs(diff), s.cur, other), other) : 0, otherAfter = roundCur(otherNow - Math.sign(diff) * move, other);
  return { now, diff, other, otherNow, move, otherAfter, short: s.from && diff > 0 && otherAfter < 0 };
}
function spNote() {
  const s = splitEdit, p = spPlan();
  if (!p.diff) return 'Nothing changes.';
  if (!s.from) return `Budget adds one entry: <b class="num">${p.diff > 0 ? '+' : '−'}${fmt(Math.abs(p.diff), s.cur)}</b> “Balance changed by hand”. The total changes.`;
  if (p.short) return `<b style="color:#FF3B30">Not enough ${spName(p.other)}:</b> this needs <b class="num">${fmt(p.move, p.other)}</b>, the account has <b class="num">${fmt(p.otherNow, p.other)}</b>. Type less, or switch this off.`;
  const line = (cur, a, b) => `${cur === 'UZS' ? "So'm" : 'Dollars'}: <b class="num">${fmt(a, cur)}</b> → <b class="num">${fmt(b, cur)}</b>`;
  return `${line(s.cur, p.now, s.value)}<br>${line(p.other, p.otherNow, p.otherAfter)}<br>The total stays the same. Saved as an exchange at today's rate.`;
}
function splitChangeHtml() {
  const s = splitEdit, a = acc(s.aid), cur = s.cur, now = accBalance(a.id, cur), v = s.value, rate = somRate() > 0;
  return sheetHead(`${esc(a.name)} · ${spName(cur)}`, `<button data-act="account" data-id="${a.id}">Cancel</button>`, '<button data-act="split-save">Save</button>') + `<div class="sheet-body">
    <p class="hint" style="margin-top:0">Budget says <b class="num">${fmt(now, cur)}</b>. How many ${spName(cur)} are really there now?</p>
    <div class="group plain"><label class="row field"><span>${cur === 'UZS' ? "so'm" : '$'}</span><input id="sp-val" inputmode="decimal" placeholder="${shownAmount(now, cur)}" value="${v == null ? '' : shownAmount(v, cur)}" autocomplete="off" enterkeyhint="done"></label>
      <div class="row field"><span style="flex:1">Take it out of my ${spName(spOther(cur))}</span><label class="switch"><input type="checkbox" id="sp-from" ${s.from && rate ? 'checked' : ''} ${rate ? '' : 'disabled'} aria-label="Take it out of my ${spName(spOther(cur))}"><i></i></label></div></div>
    ${rate ? '' : '<p class="hint">Set the dollar rate in Settings to use this switch.</p>'}
    <div id="sp-note" class="hint">${spNote()}</div>
    <button class="btn" style="margin-top:14px" data-act="split-save">Save</button></div>`;
}
function mountSplit(sh) {
  const el = $('#sp-val', sh), sw = $('#sp-from', sh); if (!el) return;
  const paint = () => { $('#sp-note', sh).innerHTML = spNote(); };
  el.addEventListener('input', () => { const r = typedAmount(el.value, splitEdit.cur); el.value = r.shown; splitEdit.value = el.value === '' ? null : r.value; paint(); });
  if (sw) sw.addEventListener('change', () => { splitEdit.from = sw.checked; paint(); });
  blurOnEnter(sh); setTimeout(() => el.focus({ preventScroll: true }), 500);
}
Object.assign(ACTIONS, {
  'split-change': (a, v, id) => { splitEdit = { aid: id, cur: v, value: null, from: somRate() > 0 }; openSheet(splitChangeHtml(), mountSplit); },
  'split-save': () => {
    const s = splitEdit; if (!s) return; const p = spPlan();
    if (s.value == null || p.diff === 0) { openAccount(s.aid); return; }
    if (p.short) { toast(`Not enough ${spName(p.other)} in this account`); return; }
    let t;
    if (s.from && p.move > 0) { // an exchange inside the account: the other money goes down (or up), the total stays
      const up = p.diff > 0;
      t = { id: uid(), type: 'transfer', amount: up ? p.move : Math.abs(p.diff), currency: up ? p.other : s.cur, account: s.aid, toAccount: s.aid, toCurrency: up ? s.cur : p.other, toAmount: up ? p.diff : p.move,
        date: todayIso(), note: 'Counted by hand', person: '', createdAt: Date.now() };
      S.tx.push(t);
    } else {
      t = addUnnamed({ type: p.diff > 0 ? 'in' : 'out', amount: Math.abs(p.diff), currency: s.cur, account: s.aid, note: 'Balance changed by hand', check: true });
      t.unnamed = false;
    }
    UI.flashId = t.id; save(); buzz(); render(); openAccount(s.aid); toast(`${acc(s.aid).name}: now ${fmt(s.value, s.cur)}`);
  },
  'split-exchange': (a, v, id) => { const usd = accBalance(id, 'USD'); openTx(null, { type: 'transfer', account: id, toAccount: id, currency: usd > 0 ? 'USD' : 'UZS', toCurrency: usd > 0 ? 'UZS' : 'USD', back: () => openAccount(id) }); },
});
