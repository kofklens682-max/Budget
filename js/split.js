'use strict';
/* Money split by currency (user, 5 Nov 2026): "in Cash I have some so'm and some dollars. Home shows the total in so'm, but
   when I open Cash it should show how much is in so'm and how much in dollars, and let me change them."
   On an account's page: one card with a row per currency (so'm, dollars), each with Change, the total in the main currency,
   and "Exchange" (dollars to so'm or back, inside the same account, with the rate).
   Change = type what is really there now; Budget adds one entry for the difference ("Balance changed by hand"), so the
   history stays true and the change can be undone by deleting that entry. Loaded after safety.js. */
let splitEdit = null; // { aid, cur, value }
function splitCard(a) {
  const u = accBalance(a.id, 'UZS'), d = accBalance(a.id, 'USD'), main = UI.cur, total = accBalanceIn(a.id, main);
  const row = (cur, v, g, c, name) => `<div class="row sp-row"><span class="ic sm" style="--c:${c}"><b class="sp-sym">${g}</b></span>
      <div class="row-main"><div class="row-title">${name}</div><div class="row-sub">${cur === main || !v ? '&nbsp;' : `≈ <span class="num">${fmt(conv(v, cur, main), main)}</span>`}</div></div>
      <b class="num sp-amt">${fmt(v, cur)}</b><button class="sp-chg" data-act="split-change" data-id="${a.id}" data-v="${cur}">Change</button></div>`;
  return `<div class="form-label">In this account</div>
    <div class="group sp-card">${row('UZS', u, "so'm", '#34C759', "So'm")}${row('USD', d, '$', '#007AFF', 'Dollars')}
      <div class="row sp-tot"><div class="row-main"><div class="row-title">Total</div><div class="row-sub">${main === 'UZS' ? "in so'm" : 'in dollars'}${u && d ? ' · at today’s rate' : ''}</div></div><b class="num">${fmt(total, main)}</b></div></div>
    <button class="btn grey sp-ex" data-act="split-exchange" data-id="${a.id}">⇄ Exchange dollars and so'm</button>`;
}
function splitChangeHtml() {
  const a = acc(splitEdit.aid), cur = splitEdit.cur, now = accBalance(a.id, cur), v = splitEdit.value, diff = v == null ? 0 : roundCur(v - now, cur);
  return sheetHead(`${esc(a.name)} · ${cur === 'UZS' ? "so'm" : 'dollars'}`, `<button data-act="account" data-id="${a.id}">Cancel</button>`, '<button data-act="split-save">Save</button>') + `<div class="sheet-body">
    <p class="hint" style="margin-top:0">Budget says <b class="num">${fmt(now, cur)}</b>. Type what is really there now.</p>
    <div class="group plain"><label class="row field"><span>${cur === 'UZS' ? "so'm" : '$'}</span><input id="sp-val" inputmode="decimal" placeholder="${shownAmount(now, cur)}" value="${v == null ? '' : shownAmount(v, cur)}" autocomplete="off" enterkeyhint="done"></label></div>
    <div id="sp-note" class="hint">${spNote(diff, cur)}</div>
    <button class="btn" style="margin-top:14px" data-act="split-save">Save</button></div>`;
}
const spNote = (diff, cur) => (!diff ? 'Nothing changes.' : `Budget adds one entry: <b class="num">${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff), cur)}</b> “Balance changed by hand”. You can open it later and write what it was.`);
function mountSplit(sh) {
  const el = $('#sp-val', sh); if (!el) return;
  el.addEventListener('input', () => { const r = typedAmount(el.value, splitEdit.cur); el.value = r.shown; splitEdit.value = el.value === '' ? null : r.value;
    const now = accBalance(splitEdit.aid, splitEdit.cur); $('#sp-note', sh).innerHTML = spNote(splitEdit.value == null ? 0 : roundCur(splitEdit.value - now, splitEdit.cur), splitEdit.cur); });
  blurOnEnter(sh); setTimeout(() => el.focus({ preventScroll: true }), 500);
}
Object.assign(ACTIONS, {
  'split-change': (a, v, id) => { splitEdit = { aid: id, cur: v, value: null }; openSheet(splitChangeHtml(), mountSplit); },
  'split-save': () => {
    const s = splitEdit; if (!s) return; const now = accBalance(s.aid, s.cur);
    if (s.value == null || roundCur(s.value - now, s.cur) === 0) { openAccount(s.aid); return; }
    const diff = roundCur(s.value - now, s.cur), t = addUnnamed({ type: diff > 0 ? 'in' : 'out', amount: Math.abs(diff), currency: s.cur, account: s.aid, note: 'Balance changed by hand', check: true });
    t.unnamed = false; UI.flashId = t.id; save(); buzz(); render(); openAccount(s.aid); toast(`${acc(s.aid).name}: now ${fmt(s.value, s.cur)}`);
  },
  'split-exchange': (a, v, id) => { const usd = accBalance(id, 'USD'); openTx(null, { type: 'transfer', account: id, toAccount: id, currency: usd > 0 ? 'USD' : 'UZS', toCurrency: usd > 0 ? 'UZS' : 'USD', back: () => openAccount(id) }); },
});
