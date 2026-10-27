'use strict';
/* DRAFT: "Repeat" - the payments you make again and again (the bus to the university, lunch...).
   Home shows them as cards. Tap one: the New entry form opens already filled in (amount, category, note) with today's date.
   Change anything you like, then Save. Nothing is saved until you press Save. */
const REP_DAYS = 90;
function repeatList() {
  const from = iso(new Date(Date.now() - REP_DAYS * 864e5)), map = new Map();
  S.tx.filter((t) => (t.type === 'out' || t.type === 'in') && !t.groupId && !t.fromRepeat && t.date >= from).forEach((t) => {
    const k = [t.type, t.category, (t.note || '').trim().toLowerCase(), t.amount, t.currency, t.account].join('|'), e = map.get(k) || { t, n: 0, last: t };
    e.n++; if (cmpDate(t, e.last) > 0) e.last = t; map.set(k, e);
  });
  return [...map.values()].filter((e) => e.n >= 3).sort((a, b) => b.n - a.n || cmpDate(b.last, a.last)).slice(0, 8);
}
const repAgo = (d) => { const n = Math.round((new Date(todayIso() + 'T00:00:00') - new Date(d + 'T00:00:00')) / 864e5); return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n + ' days ago'; };
function repeatCard() {
  const l = repeatList(); if (!l.length) return '';
  return `<div class="sec-head"><h2>Repeat a payment</h2></div><p class="hint" style="margin:-4px 0 8px">Tap one to add it again. You can change it before you save.</p>
    <div class="strip">${l.map((e, i) => { const t = e.last, cat = (S.cats[t.type] || []).find((c) => c.id === t.category);
      return `<button class="card acc-card" data-act="repeat-tx" data-id="${i}">${ic(cat ? cat.g : 'coins', cat ? cat.c : '#8E8E93', 'sm')}
        <div class="acc-name">${esc(t.note || (cat ? cat.name : t.type === 'in' ? 'Money in' : 'Money out'))}</div>
        <div class="acc-bal num">${t.type === 'in' ? '+' : ''}${fmt(t.amount, t.currency)}</div>
        <div class="acc-sub">${e.n} times · last ${repAgo(t.date)}</div></button>`; }).join('')}</div>`;
}
const _renderHome = renderHome;
renderHome = function () { // the cards go right under the accounts
  let h = _renderHome(); const at = h.indexOf('<div class="sec-head"><h2>Recent</h2>');
  const c = repeatCard(); if (!c) return h;
  const m = h.indexOf('<div class="sec-head"><h2>' + MONTHS[new Date().getMonth()] + ' so far'), p = m >= 0 ? m : at >= 0 ? at : h.length;
  return h.slice(0, p) + c + h.slice(p);
};
Object.assign(ACTIONS, {
  'repeat-tx': (a, v, id) => { const e = repeatList()[+id]; if (!e) return; const t = e.last;
    openTx(null, { type: t.type, amount: t.amount, currency: t.currency, account: t.account, category: t.category, note: t.note || '' }); },
});
PAGES.home.render = renderHome;
