/* Lent and borrowed (11 Nov 2026, user asked for it in the big audit).
   Money you lend is not spending, and money you borrow is not income: it comes back. So an entry can carry a mark:
     money out:  loan = 'lent'      I gave it, they will give it back
                 loan = 'repay'     I am paying back what I borrowed
     money in:   loan = 'borrowed'  I took it, I must give it back
                 loan = 'back'      they are giving back what I lent
   The entry still moves the account (the cash really left or came), but it is NOT counted in "Money in / Money out", the charts
   or the categories. Home shows who owes whom, per person; a tap there opens the entry that settles it, already filled in.
   Nothing else is stored: the list is worked out from the entries, so deleting or editing an entry fixes it by itself. */
const LOAN_KINDS = { out: ['lent', 'repay'], in: ['borrowed', 'back'] };
const LOAN_WORD = { lent: 'Lent', repay: 'Paid back', borrowed: 'Borrowed', back: 'Got back' };
function loanRow(d) {
  const isIn = d.type === 'in', items = isIn ? [['', 'Normal'], ['borrowed', 'I borrowed it'], ['back', 'Got back']] : [['', 'Normal'], ['lent', 'I lent it'], ['repay', 'Paying back']];
  const cur = LOAN_KINDS[d.type].includes(d.loan) ? d.loan : '';
  const hint = { lent: 'Not counted as spending. Write the name above: Home will show that they owe you.', repay: 'Not counted as spending. It makes what you owe that person smaller.', borrowed: 'Not counted as income. Write the name above: Home will show that you owe them.', back: 'Not counted as income. It makes what that person owes you smaller.' }[cur];
  return `<div class="form-label">Lent or borrowed?</div><div class="seg full sm">${segButtons('pick-loan', items, cur)}</div>${hint ? `<p class="hint">${hint}</p>` : ''}`;
}
// who owes whom, from the entries: [{ name, currency, v }]  v > 0 = they owe you, v < 0 = you owe them
function loanList() {
  const m = new Map();
  for (const t of S.tx) {
    if (!t.loan) continue;
    const name = (t.person || '').trim() || 'No name', key = name.toLowerCase() + '|' + t.currency;
    const e = m.get(key) || { name, currency: t.currency, v: 0, last: '' };
    e.v += t.type === 'out' ? t.amount : -t.amount; // money out = they owe more / I owe less; money in = the other way
    if (t.date > e.last) e.last = t.date;
    m.set(key, e);
  }
  return [...m.values()].filter((e) => Math.abs(e.v) > (e.currency === 'USD' ? 0.005 : 0.5)).sort((a, b) => (a.last < b.last ? 1 : -1));
}
function loanCard() {
  const L = loanList(); if (!L.length) return '';
  return `<div class="sec-head"><h2>Lent and borrowed</h2></div><div class="group">${L.map((e) => `<button class="row" data-act="loan-settle" data-v="${esc(e.name)}|${e.currency}">${ic('wallet', e.v > 0 ? '#34C759' : '#FF9500', 'sm')}<div class="row-main"><div class="row-title">${esc(e.name)}</div><div class="row-sub">${e.v > 0 ? 'owes you' : 'you owe'}</div></div><b style="white-space:nowrap;margin-right:6px">${fmt(Math.abs(e.v), e.currency)}</b>${I.chev}</button>`).join('')}</div>`;
}
{
  const _r = renderHome;
  renderHome = function () {
    const h = _r(), c = loanCard(); if (!c) return h;
    const at = h.indexOf('<div class="sec-head"><h2>Accounts</h2>');
    return at >= 0 ? h.slice(0, at) + c + h.slice(at) : h + c;
  };
  PAGES.home.render = renderHome;
  Object.assign(ACTIONS, {
    'pick-loan': (a, v) => { const p = $('#person'); if (p) draft.person = p.value; draft.loan = v || null; refreshSheet(txHtml(), mountTx); },
    'loan-settle': (a, v) => { // the entry that settles it, already filled in: they give back (money in) or I pay back (money out)
      const at = v.lastIndexOf('|'), name = v.slice(0, at), cur = v.slice(at + 1), e = loanList().find((x) => x.name === name && x.currency === cur); if (!e) return;
      openTx(null, { type: e.v > 0 ? 'in' : 'out', amount: Math.abs(e.v), currency: cur, person: name === 'No name' ? '' : name });
      if (draft) { draft.loan = e.v > 0 ? 'back' : 'repay'; refreshSheet(txHtml(), mountTx); }
    },
  });
}
