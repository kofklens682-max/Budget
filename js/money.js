'use strict';
/* Money: Overview, History, Stats and Goals pages, the entry form, accounts, categories,
   the monthly report, settings, backup and demo data. */

// ================= Data helpers =================
function topPeople(type) {
  const m = new Map();
  for (const t of S.tx) {
    const p = (t.person || '').trim();
    if (t.type === type && p) m.set(p, (m.get(p) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map((e) => e[0]);
}

function goalStats(g) {
  const saved = goalSaved(g), cur = g.currency;
  const left = Math.max(0, g.target - saved);
  const pct = g.target > 0 ? clamp((saved / g.target) * 100, 0, 100) : 0;
  const today = todayIso();
  const daysLeft = daysBetween(today, g.deadline);
  const step = cur === 'UZS' ? 1000 : 1;
  let pace, status;
  if (g.paid) return { saved, left: 0, pct: 100, daysLeft, pace: `Paid on ${medDate(g.paid)} 🎉`, status: ['good', '✓ Paid'] };
  if (saved >= g.target) { pace = 'Fully saved 🎉 — tap “I paid for it” when you pay'; status = ['good', '✓ Reached']; }
  else if (daysLeft < 0) { pace = `<b>${fmt(left, cur)}</b> still to go`; status = ['warn', '! Date passed']; }
  else if (daysLeft === 0) { pace = `<b>${fmt(left, cur)}</b> to go today`; status = ['warn', '! Due today']; }
  else {
    if (daysLeft >= 62) pace = `Put aside <b>${fmt(ceilTo(left / (daysLeft / 30.44), step), cur)}</b> a month`;
    else if (daysLeft >= 14) pace = `Put aside <b>${fmt(ceilTo(left / (daysLeft / 7), step), cur)}</b> a week`;
    else pace = `Put aside <b>${fmt(ceilTo(left / daysLeft, step), cur)}</b> a day`;
    const start = g.start || iso(new Date(g.createdAt || Date.now()));
    const total = Math.max(1, daysBetween(start, g.deadline));
    const elapsed = clamp(daysBetween(start, today), 0, total);
    const expected = (g.target * elapsed) / total;
    status = saved >= expected * 0.97 ? ['good', '✓ On track'] : ['warn', '! Behind'];
  }
  return { saved, left, pct, daysLeft, pace, status };
}
const goalSort = (a, b) => {
  const rank = (g) => (g.paid ? 2 : goalSaved(g) >= g.target ? 1 : 0);
  return rank(a) - rank(b) || a.deadline.localeCompare(b.deadline);
};

function balanceSeries(cur, range) {
  const txs = S.tx.filter((t) => delta(t, cur) !== 0).sort((a, b) => a.date.localeCompare(b.date));
  const lastDate = txs.length ? txs[txs.length - 1].date : todayIso();
  const end = parseD(lastDate > todayIso() ? lastDate : todayIso());
  let start;
  if (range === '1M') start = addDays(end, -30);
  else if (range === '3M') start = addDays(end, -91);
  else if (range === '1Y') start = addDays(end, -365);
  else start = txs.length ? parseD(txs[0].date) : addDays(end, -30);
  if (daysBetween(iso(start), iso(end)) < 7) start = addDays(end, -7);
  const span = daysBetween(iso(start), iso(end));
  const step = span > 400 ? 7 : 1;
  let bal = openingTotal(cur), i = 0;
  const s0 = iso(start);
  while (i < txs.length && txs[i].date < s0) bal += delta(txs[i++], cur);
  const pts = [];
  for (let k = 0; k <= span; k += step) {
    const di = iso(addDays(start, k));
    while (i < txs.length && txs[i].date <= di) bal += delta(txs[i++], cur);
    pts.push({ date: di, v: bal });
  }
  const endIso = iso(end);
  if (pts[pts.length - 1].date !== endIso) {
    while (i < txs.length && txs[i].date <= endIso) bal += delta(txs[i++], cur);
    pts.push({ date: endIso, v: bal });
  }
  return pts;
}

function periodInfo(period, offset) {
  const now = new Date();
  const today = todayIso();
  if (period === 'week') {
    const dow = (now.getDay() + 6) % 7;
    const start = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -dow + offset * 7);
    const last = addDays(start, 6);
    const yr = last.getFullYear() !== now.getFullYear() ? ' ' + last.getFullYear() : '';
    const title = start.getMonth() === last.getMonth()
      ? `${start.getDate()} – ${last.getDate()} ${MON[last.getMonth()]}${yr}`
      : `${start.getDate()} ${MON[start.getMonth()]} – ${last.getDate()} ${MON[last.getMonth()]}${yr}`;
    const groups = [];
    for (let k = 0; k < 7; k++) {
      const d = addDays(start, k);
      groups.push({ label: DOW[d.getDay()], from: iso(d), to: iso(addDays(d, 1)), full: longDate(iso(d)), cur: iso(d) === today });
    }
    return { from: iso(start), to: iso(addDays(start, 7)), title, groups, chartTitle: 'Day by day' };
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const groups = [];
    for (let k = 5; k >= 0; k--) {
      const s = new Date(start.getFullYear(), start.getMonth() - k, 1);
      const [from, to] = monthRange(s.getFullYear(), s.getMonth());
      groups.push({ label: MON[s.getMonth()], from, to, full: `${MONTHS[s.getMonth()]} ${s.getFullYear()}`, cur: k === 0 });
    }
    const [from, to] = monthRange(start.getFullYear(), start.getMonth());
    return { from, to, ym: from.slice(0, 7), title: `${MONTHS[start.getMonth()]} ${start.getFullYear()}`, groups, chartTitle: '6 months up to ' + MONTHS[start.getMonth()] };
  }
  const y = now.getFullYear() + offset;
  const groups = [];
  for (let m = 0; m < 12; m++) {
    const [from, to] = monthRange(y, m);
    groups.push({ label: MON[m], from, to, full: `${MONTHS[m]} ${y}`, cur: y === now.getFullYear() && m === now.getMonth() });
  }
  return { from: `${y}-01-01`, to: `${y + 1}-01-01`, title: String(y), groups, chartTitle: 'Month by month', small: true };
}

// Spending by category, or income by person/category. Items carry g/c for the report picture.
function breakdown(type, cur, from, to) {
  const map = new Map();
  for (const t of S.tx) {
    if (t.type !== type || t.currency !== cur || t.date < from || t.date >= to) continue;
    const c = cat(type, t.category);
    let key, e;
    if (type === 'out') { key = c.id; e = { name: c.name, g: c.g, c: c.c }; }
    else if (grp(t.groupId)) { const g = grp(t.groupId); key = 'g:' + g.id; e = { name: g.name, badge: g, c: g.color }; }
    else {
      const p = (t.person || '').trim();
      if (p) { key = 'p:' + p.toLowerCase(); e = { name: p, letter: true, c: personColor(p) }; }
      else { key = 'c:' + c.id; e = { name: c.name, g: c.g, c: c.c }; }
    }
    const cur0 = map.get(key) || { ...e, v: 0 };
    cur0.v += t.amount;
    map.set(key, cur0);
  }
  let arr = [...map.values()].sort((a, b) => b.v - a.v);
  if (arr.length > 7) {
    const rest = arr.slice(6);
    arr = arr.slice(0, 6);
    arr.push({ name: `${rest.length} more`, dots: true, c: '#8E8E93', v: rest.reduce((a, r) => a + r.v, 0) });
  }
  return arr;
}
const brkTile = (r) => (r.dots ? '<span class="ic letter" style="--c:#8E8E93">•••</span>' : r.badge ? grpBadge(r.badge) : r.letter ? letterTile(r.name, r.c) : ic(r.g, r.c));

// ================= Rows =================
function txRow(t, showDate, inAccount) {
  let tile, title, amt;
  const parts = [];
  if (t.type === 'transfer') {
    const a = acc(t.account), b = acc(t.toAccount), exch = t.toCurrency !== t.currency;
    tile = ic('transfer', TRANSFER_C);
    title = a.id === b.id ? `${a.name} · exchange` : `${a.name} → ${b.name}`;
    parts.push(exch ? rateText(t.amount, t.currency, t.toAmount, t.toCurrency) || 'Exchange' : 'Transfer');
    amt = exch
      ? `<div class="row-amt num">${fmt(t.toAmount, t.toCurrency)}<small>for ${fmt(t.amount, t.currency)}</small></div>`
      : `<div class="row-amt num neutral">${fmt(t.amount, t.currency)}</div>`;
  } else {
    const c = cat(t.type, t.category);
    const g = t.type === 'in' ? grp(t.groupId) : null;
    tile = g ? grpBadge(g) : ic(c.g, c.c);
    title = t.person || (g ? g.name : c.name);
    if (g) parts.push(g.name + (t.forMonth && t.forMonth !== t.date.slice(0, 7) ? ` · for ${ymLabel(t.forMonth, true)}` : ''));
    else if (t.person) parts.push(c.name);
    if (S.accounts.length > 1 && !inAccount) parts.push(acc(t.account).name);
    amt = `<div class="row-amt num ${t.type}">${fmt(t.type === 'in' ? t.amount : -t.amount, t.currency, { sign: true })}</div>`;
  }
  if (t.note) parts.push(t.note);
  if (showDate) parts.push(dayLabel(t.date));
  return `<button class="row ${UI.flashId === t.id ? 'flash' : ''}" data-act="edit-tx" data-id="${t.id}">${tile}
    <div class="row-main"><div class="row-title">${esc(title)}</div>${parts.length ? `<div class="row-sub">${esc(parts.join(' · '))}</div>` : ''}</div>${amt}</button>`;
}

function accPicker(act, selected) {
  return `<div class="acc-pick">${S.accounts.map((a) => `<button class="${selected === a.id ? 'on' : ''}" data-act="${act}" data-v="${a.id}">${accIc(a, 'xs')}<span>${esc(a.name)}</span></button>`).join('')}</div>`;
}

function emptyWelcome() {
  return `<section class="card empty">
    <div class="big">${ic('wave', '#FF9500', 'xl')}</div>
    <h3>Welcome to your budget</h3>
    <p>Write down money you receive and money you spend. Totals and charts fill in as you go.</p>
    <button class="btn" data-act="add">Add first entry</button>
    <button class="link" data-act="load-demo">or try it with demo data</button>
  </section>`;
}

// ================= Overview =================
const heroHtml = (v, cur) => (cur === 'UZS' ? `${fmt(v, cur, { bare: true })}<small>so'm</small>` : fmt(v, cur));

function renderHome() {
  const now = new Date();
  const cur = UI.cur, other = OTHER[cur];
  let h = `<header class="lt"><div><div class="eyebrow">${DOW_LONG[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}</div><h1>Overview</h1></div>
    <div class="lt-right">${hasAnything() ? curSeg() : ''}<button class="icon-btn" data-act="settings" aria-label="Settings">${I.settings}</button></div></header>`;

  const prevYm = ymShift(ymNow(), -1);
  const [pf, pt] = ymRange(prevYm);
  if (hasDemo()) {
    h += `<button class="banner demo" data-act="clear-demo">${ic('flask', '#F2B705', 'sm')}<div><b>You're looking at demo data</b><span class="s">Tap here to remove it when you're ready to start.</span></div></button>`;
  } else if (['UZS', 'USD'].some(goalsShort)) {
    h += `<button class="banner warn" data-act="tab" data-tab="goals">${ic('coins', '#FF9500', 'sm')}<div><b>Your goals hold more than you have</b><span class="s">Some goal money was spent. Tap to fix it.</span></div></button>`;
  } else if (now.getDate() <= 7 && S.settings.reportSeen !== prevYm && S.tx.some((t) => t.date >= pf && t.date < pt)) {
    h += `<button class="banner" data-act="report" data-v="${prevYm}">${ic('report', '#5856D6', 'sm')}<div><b>Your ${MONTHS[parseD(pf).getMonth()]} report is ready</b><span class="s">See how the month went and share it as a picture.</span></div></button>`;
  } else {
    const lb = S.settings.lastBackup;
    if (S.tx.length >= 10 && (!lb || Date.now() - lb > 30 * 864e5)) {
      h += `<button class="banner" data-act="settings">${ic('download', '#007AFF', 'sm')}<div><b>Time for a backup</b><span class="s">${lb ? 'Your last backup was over a month ago.' : "You haven't saved a backup yet."} Tap to save one.</span></div></button>`;
    }
  }

  if (!hasAnything()) {
    h += emptyWelcome();
  } else {
    const bal = balance(cur);
    const inGoals = savedInGoals(cur);
    const meta = [];
    if (inGoals) meta.push(`<span>In goals <b class="num">${fmt(inGoals, cur)}</b></span>`, `<span>Free <b class="num">${fmt(bal - inGoals, cur)}</b></span>`);
    if (usesCur(other)) {
      const ob = balance(other);
      meta.push(`<span>Also <b class="num">${fmt(ob, other)}</b></span>`);
      const rate = S.settings.rate;
      if (rate > 0) meta.push(`<span>≈ <b class="num">${fmt(cur === 'UZS' ? bal + ob * rate : bal + ob / rate, cur, { round: true })}</b> together</span>`);
    }
    h += `<section class="card">
      <div class="label">Total balance</div>
      <div class="hero num" id="hero" data-v="${bal}">${heroHtml(bal, cur)}</div>
      ${meta.length ? `<div class="hero-meta">${meta.join('')}</div>` : ''}
      <div class="chart" id="bal-chart"></div>
      <div class="seg full sm ranges">${segButtons('range', [['1M', '1 month'], ['3M', '3 months'], ['1Y', '1 year'], ['All', 'All']], UI.range)}</div>
    </section>`;
  }

  // Accounts
  h += `<div class="sec-head"><h2>Accounts</h2>${S.accounts.length > 1 ? '<button class="link" data-act="new-transfer">Transfer</button>' : ''}</div>
    <div class="strip">${S.accounts.map((a) => {
      const main = accBalance(a.id, cur), sec = accBalance(a.id, other);
      return `<button class="card acc-card" data-act="account" data-id="${a.id}">
        ${accIc(a, 'sm')}
        <div class="acc-name">${esc(a.name)}</div>
        <div class="acc-bal num">${fmt(main, cur)}</div>
        <div class="acc-sub num">${sec ? fmt(sec, other) : '&nbsp;'}</div>
      </button>`;
    }).join('')}<button class="card acc-card add" data-act="new-account"><span class="icon-btn">${I.plus}</span><div class="acc-name">Add account</div><div class="acc-sub">Card, bank, savings…</div></button></div>`;
  if (!hasAnything()) h += '<p class="hint" style="margin-top:8px">Tip: tap Cash or Card to enter how much money is there right now.</p>';

  // Lessons (groups) this month
  if (S.groups.length) h += groupsHomeCard();

  if (S.tx.length) {
    const [mFrom, mTo] = monthRange(now.getFullYear(), now.getMonth());
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const tm = totals(cur, mFrom, mTo), lm = totals(cur, pf, pt);
    const tile = (type, label, val, prevVal) => `<button class="card tile-stat" data-act="tab" data-tab="stats">
        <div class="ts-head"><span class="ts-ic ${type}">${type === 'in' ? I.inArrow : I.outArrow}</span>${label}</div>
        <div class="ts-val num">${cur === 'UZS' ? `<span>${fmt(val, cur, { bare: true })}</span> <small>so'm</small>` : `<span>${fmt(val, cur)}</span>`}</div>
        <div class="ts-sub">${MONTHS[prev.getMonth()]}: ${compactU(prevVal, cur)}</div>
      </button>`;
    h += `<div class="sec-head"><h2>${MONTHS[now.getMonth()]}</h2></div>
      <div class="tiles">${tile('in', 'Money in', tm.in, lm.in)}${tile('out', 'Money out', tm.out, lm.out)}</div>`;
  }

  // Goals
  h += `<div class="sec-head"><h2>Goals</h2>${S.goals.length ? '<button class="link" data-act="tab" data-tab="goals">See all</button>' : ''}</div>`;
  if (S.goals.length) {
    h += `<div class="strip">${[...S.goals].sort(goalSort).map((g) => {
      const st = goalStats(g), gi = goalIcon(g);
      return `<button class="card goal-mini" data-act="goal" data-id="${g.id}">
        ${ring(st.pct, 46, 5, `<span style="color:${gi.c}">${glyph(gi.id)}</span>`, st.pct >= 100)}
        <div class="gm-name">${esc(g.name)}</div>
        <div class="gm-sub num">${Math.floor(st.pct)}% · ${compact(st.saved, g.currency)} of ${compact(g.target, g.currency)}</div>
      </button>`;
    }).join('')}<button class="card goal-mini add" data-act="new-goal"><span class="icon-btn">${I.plus}</span><div class="gm-name">New goal</div></button></div>`;
  } else {
    h += `<button class="banner" data-act="new-goal" style="margin:0">${ic('target', '#FF3B30', 'sm')}<div><b>Save up for something</b><span class="s">Set an amount and a date — the app works out how much to put aside.</span></div></button>`;
  }

  if (S.tx.length) {
    const recent = [...S.tx].sort(sortTx).slice(0, 5);
    h += `<div class="sec-head"><h2>Recent</h2><button class="link" data-act="tab" data-tab="history">See all</button></div>
      <div class="group">${recent.map((t) => txRow(t, true)).join('')}</div>`;
  }
  return h;
}
function afterHome(animate) {
  drawCharts(true);
  const el = $('#hero');
  if (el) {
    const v = Number(el.dataset.v), cur = UI.cur;
    const prev = UI.heroShown[cur];
    UI.heroShown[cur] = v;
    if (prev == null ? animate : prev !== v) countUp(el, prev == null ? 0 : prev, v, (x) => heroHtml(x, cur), prev == null ? 900 : 600);
  }
}
function drawCharts(anim) {
  const b = $('#bal-chart'); if (b) drawBalance(b, anim);
  const c = $('#col-chart'); if (c) drawColumns(c, anim);
}
PAGES.home = { title: 'Overview', render: renderHome, after: afterHome, resize: () => drawCharts(false) };

// ================= History =================
function renderHistory() {
  let h = `<header class="lt"><h1>History</h1></header>
    <div class="seg full seg-lg">${segButtons('hview', [['entries', 'Entries'], ['groups', 'Groups']], UI.hView)}</div>`;
  if (UI.hView === 'groups') return h + renderGroupsList();
  const chip = (act, v, label, on, dot) => `<button class="fchip ${on ? 'on' : ''}" data-act="${act}" data-v="${v}">${dot ? `<i style="--c:${dot}"></i>` : ''}${label}</button>`;
  return h + `
    <div class="search" style="margin-top:12px">${glyph('search')}<input id="q" type="search" placeholder="Search names, notes, amounts" value="${esc(UI.q)}" autocomplete="off" enterkeyhint="search"></div>
    <div class="seg full" style="margin-top:12px">${segButtons('htype', [['all', 'All'], ['in', 'In'], ['out', 'Out'], ['transfer', 'Transfers']], UI.hType)}</div>
    <div class="fchips">${curItems.map(([v, l]) => chip('hcur', v, l, UI.hCur === v)).join('')}<span class="fsep"></span>${S.accounts.map((a) => chip('hacc', a.id, esc(a.name), UI.hAcc === a.id)).join('')}${S.groups.length ? '<span class="fsep"></span>' + S.groups.map((g) => chip('hgroup', g.id, esc(g.name), UI.hGroup === g.id, g.color)).join('') : ''}</div>
    <div id="hist-list">${histList()}</div>`;
}
function histList() {
  if (!S.tx.length) return emptyWelcome();
  const q = UI.q.trim().toLowerCase().replace(/ /g, ' ');
  const qd = q.replace(/[\s,]/g, '');
  let list = S.tx.filter((t) => (UI.hType === 'all' || t.type === UI.hType)
    && (UI.hCur === 'all' || t.currency === UI.hCur || (t.type === 'transfer' && t.toCurrency === UI.hCur))
    && (UI.hAcc === 'all' || t.account === UI.hAcc || (t.type === 'transfer' && t.toAccount === UI.hAcc))
    && (UI.hGroup === 'all' || t.groupId === UI.hGroup));
  if (q) {
    list = list.filter((t) => {
      const g = grp(t.groupId);
      const names = t.type === 'transfer' ? [acc(t.account).name, acc(t.toAccount).name, 'transfer exchange'] : [cat(t.type, t.category).name, acc(t.account).name, g ? g.name : ''];
      const hay = [t.person, t.note, dayLabel(t.date), ...names].join(' ').toLowerCase();
      return hay.includes(q) || (qd && /^\d+$/.test(qd) && (String(t.amount).includes(qd) || String(t.toAmount || '').includes(qd)));
    });
  }
  if (!list.length) return `<div class="card empty"><div class="big">${ic('search', '#8E8E93', 'xl')}</div><h3>Nothing found</h3><p>Try another word or change the filters.</p></div>`;
  list.sort(sortTx);
  const shown = list.slice(0, UI.hLimit);
  let html = '', i = 0;
  while (i < shown.length) {
    const date = shown[i].date, day = [];
    while (i < shown.length && shown[i].date === date) day.push(shown[i++]);
    const curs = new Set(day.flatMap((t) => (t.type === 'transfer' ? [t.currency, t.toCurrency] : [t.currency])));
    let net = '';
    if (curs.size === 1) {
      const c = [...curs][0];
      const v = day.reduce((a, t) => a + delta(t, c), 0);
      if (v) net = fmt(v, c, { sign: true });
    }
    html += `<div class="day-head"><span>${dayLabel(date)}</span><span class="num">${net}</span></div><div class="group">${day.map((t) => txRow(t, false)).join('')}</div>`;
  }
  if (list.length > shown.length) html += `<div class="actions"><button class="btn soft" data-act="more">Show more (${list.length - shown.length})</button></div>`;
  return html;
}
function afterHistory() {
  const q = $('#q');
  if (q) q.addEventListener('input', () => { UI.q = q.value; UI.hLimit = 150; $('#hist-list').innerHTML = histList(); });
}
PAGES.history = { title: 'History', render: renderHistory, after: afterHistory };

// ================= Stats =================
function renderStats() {
  let h = `<header class="lt"><h1>Stats</h1><div class="lt-right">${curSeg()}</div></header>`;
  if (!S.tx.length) {
    return h + `<section class="card empty"><div class="big">${ic('chart', '#AF52DE', 'xl')}</div><h3>Nothing to show yet</h3><p>Charts appear here after you add a few entries.</p><button class="btn" data-act="add">Add entry</button><button class="link" data-act="load-demo">or try it with demo data</button></section>`;
  }
  const cur = UI.cur, info = periodInfo(UI.period, UI.offset);
  const t = totals(cur, info.from, info.to);
  const net = t.in - t.out;
  h += `<div class="seg full">${segButtons('period', [['week', 'Week'], ['month', 'Month'], ['year', 'Year']], UI.period)}</div>
    <div class="period-nav">
      <button class="icon-btn" data-act="shift" data-v="-1" aria-label="Previous">${I.left}</button>
      <div class="pn-title">${info.title}</div>
      <button class="icon-btn" data-act="shift" data-v="1" aria-label="Next" ${UI.offset >= 0 ? 'disabled' : ''}>${I.right}</button>
    </div>
    ${info.ym ? `<button class="card report-cta" data-act="report" data-v="${info.ym}">${ic('report', '#5856D6')}<div class="row-main"><b>${MONTHS[parseD(info.from).getMonth()]} report</b><span>Summary, comparison, share as a picture</span></div>${I.chev}</button>` : ''}
    <section class="card">
      <div class="sl-row"><span class="sl-label"><span class="key in"></span>Money in</span><b class="num">${fmt(t.in, cur)}</b></div>
      <div class="sl-row"><span class="sl-label"><span class="key out"></span>Money out</span><b class="num">${fmt(t.out, cur)}</b></div>
      <div class="sl-row total"><span class="sl-label">Left over</span><b class="num">${fmt(net, cur, { sign: true })}</b></div>
      <div class="rate-line">${t.in > 0
        ? (net >= 0 ? `You kept <b>${Math.round((net / t.in) * 100)}%</b> of the money that came in.` : `You spent <b>${fmt(-net, cur)}</b> more than came in.`)
        : (t.out > 0 ? 'No money came in during this period.' : 'No entries in this period.')}</div>
    </section>
    <section class="card">
      <div class="card-title">Money in and out</div>
      <div class="card-sub">${info.chartTitle}</div>
      <div class="legend"><span><i class="key in"></i>Money in</span><span><i class="key out"></i>Money out</span></div>
      <div class="chart" id="col-chart"></div>
    </section>`;
  const brkCard = (arr, type, title, emptyMsg) => {
    const total = arr.reduce((a, r) => a + r.v, 0);
    let body;
    if (!arr.length) body = `<p class="card-sub" style="margin:10px 0 2px">${emptyMsg}</p>`;
    else {
      const max = arr[0].v;
      body = arr.map((r) => `<div class="brk">${r.tile || brkTile(r)}<div class="brk-main">
          <div class="brk-top"><span class="n">${esc(r.name)}</span><span class="a num">${fmt(r.v, cur)}</span></div>
          <div class="brk-bar"><i class="${type}" style="width:${Math.max(1.5, (r.v / max) * 80).toFixed(1)}%;${r.bar ? `background:${r.bar}` : ''}"></i><span>${Math.round((r.v / total) * 100)}%</span></div>
        </div></div>`).join('');
    }
    return `<section class="card"><div class="card-title">${title}</div>${body}</section>`;
  };
  h += brkCard(breakdown('out', cur, info.from, info.to), 'out', 'Where the money went', 'No spending in this period.');
  h += brkCard(breakdown('in', cur, info.from, info.to), 'in', 'Where the money came from', 'No money came in during this period.');
  return h;
}
PAGES.stats = { title: 'Stats', render: renderStats, after: () => drawCharts(true), resize: () => drawCharts(false) };

// ================= Goals =================
function renderGoals() {
  let h = `<header class="lt"><h1>Goals</h1><div class="lt-right"><button class="icon-btn solid" data-act="new-goal" aria-label="New goal">${I.plus}</button></div></header>`;
  if (!S.goals.length) {
    return h + `<section class="card empty"><div class="big">${ic('target', '#FF3B30', 'xl')}</div><h3>No goals yet</h3><p>Choose something to save for, the amount and the date. The app tells you how much to put aside each month to get there.</p><button class="btn" data-act="new-goal">Create a goal</button></section>`;
  }
  h += ['UZS', 'USD'].filter((c) => S.goals.some((g) => g.currency === c)).map(allocCard).join('');
  h += '<div class="stack" style="margin-top:12px">';
  for (const g of [...S.goals].sort(goalSort)) {
    const st = goalStats(g), gi = goalIcon(g);
    h += `<button class="card goal-card" data-act="goal" data-id="${g.id}">
      <div class="gc-top">
        ${ic(gi.id, gi.c)}
        <div class="row-main"><div class="gc-name">${esc(g.name)}</div><div class="gc-date">by ${medDate(g.deadline)} · ${daysLeftText(st.daysLeft)}</div></div>
        <span class="chip ${st.status[0]}">${st.status[1]}</span>
      </div>
      <div class="meter ${st.pct >= 100 ? 'done' : ''}"><i style="width:${st.pct.toFixed(1)}%"></i></div>
      <div class="gc-nums">${g.paid ? `<span><b>Paid</b> <span class="muted">· goal ${fmt(g.target, g.currency)}</span></span><span class="muted">✓</span>` : `<span><b class="num">${fmt(st.saved, g.currency)}</b> <span class="muted">of ${fmt(g.target, g.currency)}</span></span><span class="muted num">${Math.floor(st.pct)}%</span>`}</div>
      <div class="gc-pace">${glyph('calendar')}<span>${st.pace}</span></div>
    </button>`;
  }
  return h + '</div>';
}
PAGES.goals = { title: 'Goals', render: renderGoals };

// ================= Charts =================
function bindScrub(el, locate) {
  const svg = el.querySelector('svg'), tip = el.querySelector('.tip');
  let hideT;
  const show = (e) => {
    const r = svg.getBoundingClientRect();
    const p = locate(e.clientX - r.left);
    if (!p) return;
    clearTimeout(hideT);
    tip.innerHTML = p.html;
    tip.classList.add('show');
    const tw = tip.offsetWidth;
    tip.style.left = clamp(p.x - tw / 2, 0, r.width - tw) + 'px';
  };
  const hide = (delay) => {
    clearTimeout(hideT);
    hideT = setTimeout(() => { tip.classList.remove('show'); locate(null); }, delay);
  };
  svg.addEventListener('pointerdown', show);
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerup', (e) => hide(e.pointerType === 'mouse' ? 0 : 1600));
  svg.addEventListener('pointercancel', () => hide(0));
  svg.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(0); });
}

function drawBalance(el, anim) {
  const cur = UI.cur;
  if (!usesCur(cur)) {
    el.innerHTML = `<p class="card-sub" style="text-align:center;padding:26px 0">No money in ${cur === 'UZS' ? "so'm" : 'dollars'} yet.</p>`;
    return;
  }
  const pts = balanceSeries(cur, UI.range);
  const W = Math.max(240, el.clientWidth), H = 160, padT = 12, padB = 22, padL = 4, padR = 48;
  const vals = pts.map((p) => p.v);
  const { lo, hi, ticks } = niceScale(Math.min(0, ...vals), Math.max(0, ...vals), 3);
  const pw = W - padL - padR, ph = H - padT - padB, last = pts.length - 1;
  const x = (i) => padL + (last ? (i / last) * pw : pw);
  const y = (v) => padT + ph * (1 - (v - lo) / (hi - lo));
  let s = '';
  for (const t of ticks) {
    const yy = y(t).toFixed(1);
    s += `<line x1="${padL}" x2="${W - padR + 4}" y1="${yy}" y2="${yy}" stroke="var(${t === 0 ? '--axis' : '--grid'})" stroke-width="1"/>`;
    s += `<text x="${W - padR + 9}" y="${yy}" dy=".35em">${t === 0 ? '0' : compact(t, cur)}</text>`;
  }
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  const area = `${line}L${x(last).toFixed(1)},${y(0).toFixed(1)}L${x(0).toFixed(1)},${y(0).toFixed(1)}Z`;
  const short = (d0) => { const d = parseD(d0); return UI.range === '1M' || UI.range === '3M' ? `${d.getDate()} ${MON[d.getMonth()]}` : `${MON[d.getMonth()]} ’${String(d.getFullYear()).slice(2)}`; };
  for (const [i, anchor] of [[0, 'start'], [Math.round(last / 2), 'middle'], [last, 'end']]) s += `<text x="${x(i).toFixed(1)}" y="${H - 5}" text-anchor="${anchor}">${short(pts[i].date)}</text>`;
  const a = anim && !reduceMotion() ? ' anim' : '';
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Balance over time">
    ${s}
    <path class="area${a}" d="${area}" fill="var(--accent)" fill-opacity=".1"/>
    <path class="line${a}" d="${line}" pathLength="1" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle class="end-dot${a}" cx="${x(last).toFixed(1)}" cy="${y(pts[last].v).toFixed(1)}" r="4" fill="var(--accent)" stroke="var(--card)" stroke-width="2"/>
    <g class="hover" style="display:none"><line class="hl" y1="${padT}" y2="${H - padB}" stroke="var(--text-3)" stroke-width="1"/><circle class="hd" r="5" fill="var(--accent)" stroke="var(--card)" stroke-width="2"/></g>
    <rect x="0" y="0" width="${W}" height="${H}" fill="transparent"/>
  </svg><div class="tip"></div>`;
  const g = el.querySelector('.hover'), hl = el.querySelector('.hl'), hd = el.querySelector('.hd');
  bindScrub(el, (px) => {
    if (px === null) { g.style.display = 'none'; return null; }
    const i = clamp(Math.round(((px - padL) / pw) * last), 0, last);
    const cx = x(i), cy = y(pts[i].v);
    g.style.display = '';
    hl.setAttribute('x1', cx); hl.setAttribute('x2', cx);
    hd.setAttribute('cx', cx); hd.setAttribute('cy', cy);
    return { x: cx, html: `<div class="t-date">${longDate(pts[i].date)}</div><div class="t-row"><span class="key line"></span>${fmt(pts[i].v, cur)}</div>` };
  });
}

function colPath(x, w, top, base, fill, i, anim) {
  let h = base - top;
  if (h <= 0) return '';
  if (h < 2) { h = 2; top = base - 2; }
  const r = Math.min(4, w / 2, h);
  return `<path class="bar${anim}" style="--i:${i}" d="M${x.toFixed(1)},${base.toFixed(1)}V${(top + r).toFixed(1)}A${r},${r} 0 0 1 ${(x + r).toFixed(1)},${top.toFixed(1)}H${(x + w - r).toFixed(1)}A${r},${r} 0 0 1 ${(x + w).toFixed(1)},${(top + r).toFixed(1)}V${base.toFixed(1)}Z" fill="${fill}"/>`;
}

function drawColumns(el, anim) {
  const cur = UI.cur, info = periodInfo(UI.period, UI.offset);
  const groups = info.groups.map((g) => ({ ...g, ...totals(cur, g.from, g.to) }));
  const W = Math.max(240, el.clientWidth), H = 190, padT = 12, padB = 24, padL = 2, padR = 44;
  const maxV = Math.max(0, ...groups.flatMap((g) => [g.in, g.out]));
  const { hi, ticks } = niceScale(0, maxV || 1, 3);
  const pw = W - padL - padR, ph = H - padT - padB;
  const band = pw / groups.length;
  const bw = clamp((band * 0.66 - 2) / 2, 3, 18);
  const y = (v) => padT + ph * (1 - v / hi);
  const base = y(0);
  const a = anim && !reduceMotion() ? ' anim' : '';
  let s = `<rect class="band-hl" y="${padT - 4}" width="${band.toFixed(1)}" height="${(ph + 24).toFixed(1)}" rx="8" fill="var(--fill)" style="display:none"/>`;
  for (const t of ticks) {
    const yy = y(t).toFixed(1);
    s += `<line x1="${padL}" x2="${W - padR + 4}" y1="${yy}" y2="${yy}" stroke="var(${t === 0 ? '--axis' : '--grid'})" stroke-width="1"/>`;
    s += `<text x="${W - padR + 9}" y="${yy}" dy=".35em">${maxV ? (t === 0 ? '0' : compact(t, cur)) : ''}</text>`;
  }
  groups.forEach((g, i) => {
    const cx = padL + band * i + band / 2;
    s += colPath(cx - 1 - bw, bw, y(g.in), base, 'var(--in)', i, a);
    s += colPath(cx + 1, bw, y(g.out), base, 'var(--out)', i, a);
    s += `<text x="${cx.toFixed(1)}" y="${H - 6}" text-anchor="middle" class="${g.cur ? 'cur' : ''}" ${info.small ? 'style="font-size:10px"' : ''}>${g.label}</text>`;
  });
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Money in and out">${s}<rect x="0" y="0" width="${W}" height="${H}" fill="transparent"/></svg><div class="tip"></div>`;
  const hlr = el.querySelector('.band-hl');
  bindScrub(el, (px) => {
    if (px === null) { hlr.style.display = 'none'; return null; }
    const i = clamp(Math.floor((px - padL) / band), 0, groups.length - 1);
    const g = groups[i];
    hlr.setAttribute('x', (padL + band * i).toFixed(1));
    hlr.style.display = '';
    return {
      x: padL + band * i + band / 2,
      html: `<div class="t-date">${g.full}</div><div class="t-row"><span class="key in"></span>In ${fmt(g.in, cur)}</div><div class="t-row"><span class="key out"></span>Out ${fmt(g.out, cur)}</div>`,
    };
  });
}

// ================= Entry form =================
let draft = null;
let syncTx = () => {};
function openTx(id, preset = {}) {
  const t = id ? S.tx.find((x) => x.id === id) : null;
  if (t) draft = { ...t };
  else {
    const type = preset.type || UI.lastType;
    const from = preset.account || (type !== 'transfer' && UI.lastAcc[type]) || S.accounts[0].id;
    const to = (S.accounts.find((a) => a.id !== from) || S.accounts[0]).id;
    const cur = preset.currency || UI.cur;
    draft = {
      id: null, type, amount: preset.amount || 0, currency: cur, account: from, toAccount: to, toAmount: 0, toCurrency: cur,
      person: preset.person || '', category: preset.category || null, date: todayIso(), note: preset.note || '',
      goalSpend: preset.goalSpend || null,
      groupId: preset.groupId || null, studentId: preset.studentId || null, forMonth: preset.forMonth || null,
    };
  }
  if (!S.accounts.some((a) => a.id === draft.account)) draft.account = S.accounts[0].id;
  if (!draft.toCurrency) draft.toCurrency = draft.currency;
  if (!draft.toAccount) draft.toAccount = (S.accounts.find((a) => a.id !== draft.account) || S.accounts[0]).id;
  draft.back = preset.back || null;
  openSheet(txHtml(), mountTx);
}
function reopenTx() { openSheet(txHtml(), mountTx); }
function draftOk(d) {
  if (!(d.amount > 0)) return false;
  if (d.type !== 'transfer') return true;
  if (d.toCurrency !== d.currency) return d.toAmount > 0;
  return d.account !== d.toAccount;
}
function monthChoices(d) {
  const base = d.date.slice(0, 7);
  const list = [ymShift(base, -1), base, ymShift(base, 1)];
  if (d.forMonth && !list.includes(d.forMonth)) list[0] = d.forMonth;
  return list.map((m) => [m, ymLabel(m, true)]);
}
function txHtml() {
  const d = draft, editing = !!d.id, isIn = d.type === 'in', isTr = d.type === 'transfer';
  const ok = draftOk(d);
  const exch = d.toCurrency !== d.currency;
  const title = editing ? (isTr ? 'Edit transfer' : 'Edit entry') : isTr ? 'New transfer' : 'New entry';
  let body = '';
  if (!isTr) {
    const g = isIn ? grp(d.groupId) : null;
    let who;
    if (g) {
      who = `<div class="form-label">Student</div>
        <div class="group"><label class="field"><input id="person" style="text-align:left" placeholder="Student's name" value="${esc(d.person)}" autocomplete="off" enterkeyhint="done"></label></div>
        ${g.students.length ? `<div class="quick">${g.students.map((s) => `<button data-act="pick-student" data-id="${s.id}" class="${d.studentId === s.id ? 'on' : ''}">${esc(s.name)}</button>`).join('')}</div>` : '<p class="hint">Add students to this group to pick them with one tap.</p>'}
        <div class="form-label">Pays for</div>
        <div class="seg full">${segButtons('pick-month', monthChoices(d), d.forMonth || d.date.slice(0, 7))}</div>`;
    } else {
      const people = topPeople(d.type);
      who = `<div class="form-label">${isIn ? 'Who gave it' : 'Paid to'}</div>
        <div class="group"><label class="field"><input id="person" style="text-align:left" placeholder="${isIn ? 'e.g. Mom, Employer' : 'e.g. Supermarket, Taxi (optional)'}" value="${esc(d.person)}" autocomplete="off" enterkeyhint="done"></label></div>
        ${people.length ? `<div class="quick">${people.map((p) => `<button data-act="pick-person" data-v="${esc(p)}" class="${p === d.person ? 'on' : ''}">${esc(p)}</button>`).join('')}</div>` : ''}`;
    }
    body = `
    <div class="form-label">${isIn ? 'Money went to' : 'Paid from'}</div>
    ${accPicker('pick-acc', d.account)}
    ${isIn && S.groups.length ? `<div class="form-label">Group</div>
      <div class="grp-pick"><button class="${!d.groupId ? 'on' : ''}" data-act="pick-group" data-v="">No group</button>${S.groups.map((x) => `<button class="${d.groupId === x.id ? 'on' : ''}" data-act="pick-group" data-v="${x.id}" style="--c:${x.color}"><i></i>${esc(x.name)}</button>`).join('')}</div>` : ''}
    ${who}
    <div class="form-label">Category</div>
    <div class="cats">${S.cats[d.type].map((c) => `<button class="cat ${d.category === c.id ? 'on' : ''}" data-act="pick-cat" data-v="${c.id}">${ic(c.g, c.c, 'lg')}<span>${esc(c.name)}</span></button>`).join('')}<button class="cat add" data-act="new-cat-inline"><span class="ic lg" style="--c:var(--fill)">${glyph('plus')}</span><span>New</span></button></div>`;
  } else {
    body = `
    <div class="form-label">From</div>
    ${accPicker('pick-from', d.account)}
    <div class="form-label">To</div>
    ${accPicker('pick-to', d.toAccount)}
    <p class="hint" id="tr-hint"></p>
    <div class="form-label">Currency</div>
    <div class="seg full">${segButtons('tx-exch', [['same', `Stays in ${unit(d.currency)}`], ['other', `Exchanged to ${unit(OTHER[d.currency])}`]], exch ? 'other' : 'same')}</div>
    ${exch ? `<div class="group plain" style="margin-top:10px"><label class="row field"><span>You got</span><input id="to-amt" inputmode="decimal" placeholder="0" value="${shownAmount(d.toAmount, d.toCurrency)}" autocomplete="off" enterkeyhint="done"><span class="muted" style="min-width:0">${unit(d.toCurrency)}</span></label></div><p class="hint" id="rate-hint"></p>` : ''}`;
  }
  return sheetHead(title, '<button data-act="tx-cancel">Cancel</button>', `<button data-act="save-tx" ${ok ? '' : 'disabled'}>Save</button>`) + `
  <div class="sheet-body">
    ${d.goalSpend && goalById(d.goalSpend) && !editing ? `<div class="blk-warn good" style="margin:0 0 12px">${glyph('receipt')}<div><b>Paying for “${esc(goalById(d.goalSpend).name)}”</b><span>The expense is recorded and the goal's money is used for it.</span></div></div>` : ''}
    <div class="seg full">${segButtons('tx-type', [['in', 'Money in'], ['out', 'Money out'], ['transfer', 'Transfer']], d.type)}</div>
    <div class="amount-box">
      <input class="amount-input num" id="amt" inputmode="decimal" placeholder="0" value="${shownAmount(d.amount, d.currency)}" autocomplete="off" enterkeyhint="done" aria-label="Amount">
      <div class="cur-pill"><div class="seg sm">${segButtons('tx-cur', curItems, d.currency)}</div></div>
    </div>
    ${body}
    <div class="form-label">Details</div>
    <div class="group plain">
      <label class="row field"><span>Date</span><input type="date" id="date" value="${d.date}"></label>
      <label class="row field"><span>Note</span><input id="note" placeholder="Optional" value="${esc(d.note)}" autocomplete="off" enterkeyhint="done"></label>
    </div>
    <div class="actions">
      <button class="btn" data-act="save-tx" ${ok ? '' : 'disabled'}>${editing ? 'Save changes' : isTr ? 'Save transfer' : isIn ? 'Add money in' : 'Add money out'}</button>
      ${editing ? `<button class="btn danger" data-act="del-tx">Delete ${isTr ? 'transfer' : 'entry'}</button>` : ''}
    </div>
  </div>`;
}
function mountTx(sh) {
  const amt = $('#amt', sh);
  syncTx = () => {
    const ok = draftOk(draft);
    sh.querySelectorAll('[data-act="save-tx"]').forEach((b) => { b.disabled = !ok; });
    const th = $('#tr-hint', sh);
    if (th) th.textContent = draft.type === 'transfer' && draft.account === draft.toAccount && draft.toCurrency === draft.currency ? 'Pick two different accounts — or choose “Exchanged” to change currency inside one account.' : '';
    const rh = $('#rate-hint', sh);
    if (rh) rh.textContent = rateText(draft.amount, draft.currency, draft.toAmount, draft.toCurrency);
  };
  amt.addEventListener('input', () => { const r = typedAmount(amt.value, draft.currency); amt.value = r.shown; draft.amount = r.value; syncTx(); });
  const person = $('#person', sh);
  if (person) person.addEventListener('input', () => {
    draft.person = person.value;
    const g = draft.type === 'in' ? grp(draft.groupId) : null;
    if (g) {
      const s = g.students.find((x) => x.name.toLowerCase() === person.value.trim().toLowerCase());
      draft.studentId = s ? s.id : null;
      sh.querySelectorAll('.quick button').forEach((b) => b.classList.toggle('on', b.dataset.id === draft.studentId));
    } else sh.querySelectorAll('.quick button').forEach((b) => b.classList.toggle('on', b.dataset.v === draft.person));
  });
  const toAmt = $('#to-amt', sh);
  if (toAmt) toAmt.addEventListener('input', () => { const r = typedAmount(toAmt.value, draft.toCurrency); toAmt.value = r.shown; draft.toAmount = r.value; syncTx(); });
  $('#date', sh).addEventListener('change', (e) => { draft.date = e.target.value || todayIso(); });
  $('#note', sh).addEventListener('input', (e) => { draft.note = e.target.value; });
  blurOnEnter(sh);
  syncTx();
  if (!draft.id && !draft.amount) setTimeout(() => amt.focus({ preventScroll: true }), 420);
}
function txDone() { if (draft && draft.back) draft.back(); else closeSheet(); }
function saveTx() {
  const d = draft;
  if (!draftOk(d)) return;
  const base = { id: d.id || uid(), type: d.type, amount: roundCur(d.amount, d.currency), currency: d.currency, account: d.account, date: d.date || todayIso(), note: (d.note || '').trim(), createdAt: d.createdAt || Date.now() };
  let rec;
  if (d.type === 'transfer') {
    const exch = d.toCurrency !== d.currency;
    rec = { ...base, toAccount: d.toAccount, toCurrency: d.toCurrency, toAmount: exch ? roundCur(d.toAmount, d.toCurrency) : base.amount };
  } else {
    rec = { ...base, person: (d.person || '').trim(), category: d.category || OTHER_CAT[d.type] };
    if (d.type === 'in' && grp(d.groupId)) {
      rec.groupId = d.groupId;
      rec.forMonth = d.forMonth || rec.date.slice(0, 7);
      if (d.studentId && grp(d.groupId).students.some((s) => s.id === d.studentId)) rec.studentId = d.studentId;
    }
    UI.lastType = d.type;
    UI.lastAcc[d.type] = d.account;
  }
  if (d.demo) rec.demo = true;
  const i = S.tx.findIndex((t) => t.id === rec.id);
  if (i >= 0) S.tx[i] = rec; else S.tx.push(rec);
  const spendGoal = i < 0 && rec.type === 'out' && d.goalSpend ? goalById(d.goalSpend) : null;
  if (spendGoal && spendGoal.currency === rec.currency) {
    const t = Math.min(rec.amount, goalSaved(spendGoal));
    if (t > 0) spendGoal.contribs.push({ id: uid(), amount: -t, date: rec.date, note: `Spent — ${rec.person || cat('out', rec.category).name}`, txId: rec.id });
    if (goalSaved(spendGoal) <= 0.004) spendGoal.paid = rec.date;
  }
  const outCur = rec.type === 'out' ? rec.currency : rec.type === 'transfer' && rec.toCurrency !== rec.currency ? rec.currency : null;
  if (rec.type !== 'transfer') UI.cur = rec.currency;
  UI.flashId = rec.id;
  save();
  buzz();
  txDone();
  render();
  if (outCur && goalsShort(outCur)) toast(`Your goals now hold ${fmt(-freeMoney(outCur), outCur)} more than you have`, { label: 'Fix', run: () => fixGoals(outCur) });
  else if (spendGoal) toast(spendGoal.paid ? `${spendGoal.name} — paid ✓` : `Used ${fmt(rec.amount, rec.currency)} from ${spendGoal.name}`);
  else if (i >= 0) toast('Changes saved');
  else if (rec.type === 'transfer' && rec.toCurrency !== rec.currency) toast(`Exchanged ${fmt(rec.amount, rec.currency)} → ${fmt(rec.toAmount, rec.toCurrency)}`);
  else if (rec.type === 'transfer') toast(`Moved ${fmt(rec.amount, rec.currency)} · ${acc(rec.account).name} → ${acc(rec.toAccount).name}`);
  else if (rec.groupId) toast(`${rec.person || 'Payment'} · ${grp(rec.groupId).name} · ${fmt(rec.amount, rec.currency)}`);
  else toast(`${rec.type === 'in' ? 'Money in' : 'Money out'} · ${fmt(rec.amount, rec.currency)}`);
}

// ================= Accounts =================
let accId = null;
function openAccount(id) { accId = id; openSheet(accountHtml(), null); }
function accountHtml() {
  const a = acc(accId);
  const list = S.tx.filter((t) => t.account === a.id || (t.type === 'transfer' && t.toAccount === a.id)).sort(sortTx);
  const bal = (c) => accBalance(a.id, c);
  const lines = ['UZS', 'USD'].filter((c) => bal(c) || c === UI.cur);
  return sheetHead('', `<button data-act="edit-account" data-id="${a.id}">Edit</button>`, '<button data-act="close-sheet">Done</button>') + `
  <div class="sheet-body" data-back="acc">
    <div class="gd-hero">
      ${accIc(a, 'xl')}
      <div class="gd-name">${esc(a.name)}</div>
      ${lines.map((c, i) => `<div class="${i ? 'gd-amt' : 'acc-hero-bal'} num">${fmt(bal(c), c)}</div>`).join('')}
    </div>
    <div class="btn-row" style="margin-top:18px">
      <button class="btn" data-act="add-to-acc" data-id="${a.id}">＋ Add entry</button>
      ${S.accounts.length > 1 ? `<button class="btn grey" data-act="transfer-from" data-id="${a.id}">Transfer</button>` : ''}
    </div>
    <div class="form-label">Latest</div>
    ${list.length ? `<div class="group">${list.slice(0, 25).map((t) => txRow(t, true, true)).join('')}</div>
      ${list.length > 25 ? `<div class="actions"><button class="btn soft" data-act="acc-history" data-id="${a.id}">See all ${list.length} in History</button></div>` : ''}`
      : '<p class="hint">Nothing here yet.</p>'}
  </div>`;
}
let adraft = null;
function openAccountForm(id) {
  const a = id ? acc(id) : null;
  adraft = a ? JSON.parse(JSON.stringify(a)) : { id: null, name: '', kind: 'card', color: '#007AFF', opening: { UZS: 0, USD: 0 } };
  openSheet(accountFormHtml(), mountAccountForm);
}
function accountFormHtml() {
  const d = adraft, editing = !!d.id;
  return sheetHead(editing ? 'Edit account' : 'New account',
    editing ? `<button data-act="account" data-id="${d.id}">Cancel</button>` : '<button data-act="close-sheet">Cancel</button>',
    '<button data-act="save-account">Save</button>') + `
  <div class="sheet-body">
    <div class="gd-hero" id="acc-preview">${accIc(d, 'xl')}</div>
    <div class="form-label">Name</div>
    <div class="group"><label class="field"><input id="a-name" style="text-align:left" placeholder="e.g. Humo card, Uzcard, Visa, Savings" value="${esc(d.name)}" autocomplete="off" enterkeyhint="done" maxlength="40"></label></div>
    <div class="form-label">Type</div>
    <div class="kinds">${ACC_KINDS.map((k) => `<button class="cat ${d.kind === k.id ? 'on' : ''}" data-act="acc-kind" data-v="${k.id}">${ic(k.g, d.color, 'lg')}<span>${k.name}</span></button>`).join('')}</div>
    <div class="form-label">Colour</div>
    ${swatches('acc-color', d.color)}
    <div class="form-label">Money already there</div>
    <div class="group plain">
      <label class="row field"><span>so'm</span><input id="a-uzs" inputmode="decimal" placeholder="0" value="${shownAmount(d.opening.UZS, 'UZS')}" autocomplete="off"></label>
      <label class="row field"><span>$</span><input id="a-usd" inputmode="decimal" placeholder="0" value="${shownAmount(d.opening.USD, 'USD')}" autocomplete="off"></label>
    </div>
    <p class="hint">How much was in this account before your first entry here. It isn't counted as money coming in.</p>
    <div class="actions">
      <button class="btn" data-act="save-account">${editing ? 'Save changes' : 'Create account'}</button>
      ${editing && S.accounts.length > 1 ? `<button class="btn danger" data-act="del-account" data-id="${d.id}">Delete account</button>` : ''}
    </div>
  </div>`;
}
function mountAccountForm(sh) {
  const name = $('#a-name', sh), uzs = $('#a-uzs', sh), usd = $('#a-usd', sh);
  const sync = () => sh.querySelectorAll('[data-act="save-account"]').forEach((b) => { b.disabled = !adraft.name.trim(); });
  name.addEventListener('input', () => { adraft.name = name.value; sync(); });
  uzs.addEventListener('input', () => { const r = typedAmount(uzs.value, 'UZS'); uzs.value = r.shown; adraft.opening.UZS = r.value; });
  usd.addEventListener('input', () => { const r = typedAmount(usd.value, 'USD'); usd.value = r.shown; adraft.opening.USD = r.value; });
  blurOnEnter(sh);
  sync();
  if (!adraft.id) setTimeout(() => name.focus({ preventScroll: true }), 420);
}
function saveAccount() {
  const d = adraft;
  if (!d.name.trim()) return;
  const rec = { id: d.id || uid(), name: d.name.trim(), kind: d.kind, color: d.color, opening: { UZS: roundCur(d.opening.UZS, 'UZS'), USD: roundCur(d.opening.USD, 'USD') } };
  const i = S.accounts.findIndex((a) => a.id === rec.id);
  if (i >= 0) S.accounts[i] = rec; else S.accounts.push(rec);
  save(); buzz(); render();
  if (i >= 0) { openAccount(rec.id); toast('Account updated'); }
  else { closeSheet(); toast(`${rec.name} added`); }
}
async function deleteAccount(id) {
  const a = acc(id);
  const others = S.accounts.filter((x) => x.id !== id);
  if (!others.length) return;
  const target = others[0];
  const n = S.tx.filter((t) => t.account === id || t.toAccount === id).length;
  const ok = await ask({
    title: `Delete “${a.name}”?`,
    msg: n ? `Its ${n} entr${n === 1 ? 'y' : 'ies'} and starting money will be moved to “${target.name}”. Totals stay the same.` : 'This account has no entries.',
    ok: 'Delete account', destructive: true,
  });
  if (!ok) return;
  target.opening.UZS += a.opening.UZS;
  target.opening.USD += a.opening.USD;
  S.tx = S.tx.map((t) => {
    const r = { ...t };
    if (r.account === id) r.account = target.id;
    if (r.toAccount === id) r.toAccount = target.id;
    return r;
  }).filter((t) => !(t.type === 'transfer' && t.account === t.toAccount && t.currency === t.toCurrency));
  S.accounts = others;
  if (UI.hAcc === id) UI.hAcc = 'all';
  save(); closeSheet(); render();
  toast('Account deleted');
}

// ================= Categories =================
let catType = 'out';
function openCats(type) { catType = type || catType; openSheet(catsHtml(), mountCats); }
function catsHtml() {
  const count = (id) => S.tx.filter((t) => t.type === catType && t.category === id).length;
  return sheetHead('Categories', '<button data-act="settings">Settings</button>', '<button data-act="close-sheet">Done</button>') + `
  <div class="sheet-body">
    <div class="seg full">${segButtons('cats-type', [['in', 'Money in'], ['out', 'Money out']], catType)}</div>
    <div class="group sort-list" id="cat-list" style="margin-top:14px">
      ${S.cats[catType].map((c) => `<div class="row sortable" data-sort data-id="${c.id}">
        <button class="row-link" data-act="edit-cat" data-id="${c.id}">${ic(c.g, c.c)}<div class="row-main"><div class="row-title">${esc(c.name)}</div><div class="row-sub">${(count(c.id) === 1 ? '1 entry' : count(c.id) + ' entries')}</div></div></button>
        <span class="drag" aria-label="Drag to reorder">${glyph('grip')}</span>
      </div>`).join('')}
    </div>
    <p class="hint">Drag ⠿ to change the order you see them in. Tap a category to rename it or change its icon and colour.</p>
    <div class="actions"><button class="btn soft" data-act="new-cat">＋ New category</button></div>
  </div>`;
}
function mountCats(sh) {
  makeSortable($('#cat-list', sh), (from, to) => {
    const list = S.cats[catType];
    const [c] = list.splice(from, 1);
    list.splice(to, 0, c);
    save();
    refreshSheet(catsHtml(), mountCats);
  });
}
let cdraft = null;
function openCatForm(type, id, back) {
  const c = id ? S.cats[type].find((x) => x.id === id) : null;
  cdraft = c ? { ...c, type, back } : { id: null, type, name: '', g: 'tag', c: PALETTE[3], back };
  openSheet(catFormHtml(), mountCatForm);
}
function catFormHtml() {
  const d = cdraft, editing = !!d.id, isOther = d.id === OTHER_CAT[d.type];
  return sheetHead(editing ? 'Edit category' : 'New category', '<button data-act="cat-cancel">Cancel</button>', '<button data-act="save-cat">Save</button>') + `
  <div class="sheet-body">
    <div class="gd-hero" id="cat-preview">${ic(d.g, d.c, 'xl')}</div>
    <div class="form-label">Name</div>
    <div class="group"><label class="field"><input id="c-name" style="text-align:left" placeholder="e.g. Tutoring, Sadaqa, To'y gifts" value="${esc(d.name)}" autocomplete="off" enterkeyhint="done" maxlength="30"></label></div>
    <p class="hint">For money ${d.type === 'in' ? 'coming in' : 'going out'}.</p>
    <div class="form-label">Icon</div>
    <div class="glyph-grid" style="--c:${d.c}">${CAT_GLYPHS.map((g) => `<button class="${d.g === g ? 'on' : ''}" data-act="cat-glyph" data-v="${g}" aria-label="${g}">${glyph(g)}</button>`).join('')}</div>
    <div class="form-label">Colour</div>
    ${swatches('cat-color', d.c)}
    <div class="actions">
      <button class="btn" data-act="save-cat">${editing ? 'Save changes' : 'Create category'}</button>
      ${editing && !isOther ? '<button class="btn danger" data-act="del-cat">Delete category</button>' : ''}
    </div>
  </div>`;
}
function mountCatForm(sh) {
  const name = $('#c-name', sh);
  const sync = () => sh.querySelectorAll('[data-act="save-cat"]').forEach((b) => { b.disabled = !cdraft.name.trim(); });
  name.addEventListener('input', () => { cdraft.name = name.value; sync(); });
  blurOnEnter(sh);
  sync();
  if (!cdraft.id) setTimeout(() => name.focus({ preventScroll: true }), 420);
}
function catBack() { const b = cdraft && cdraft.back; if (b) b(); else openCats(cdraft.type); }
function saveCat() {
  const d = cdraft;
  if (!d.name.trim()) return;
  const list = S.cats[d.type];
  const rec = { id: d.id || 'c' + uid(), name: d.name.trim(), g: d.g, c: d.c };
  const i = list.findIndex((x) => x.id === rec.id);
  if (i >= 0) list[i] = rec;
  else {
    const oi = list.findIndex((x) => x.id === OTHER_CAT[d.type]);
    list.splice(oi >= 0 ? oi : list.length, 0, rec); // new categories go before "Other"
  }
  save(); buzz(); render();
  if (d.back && draft && !d.id) draft.category = rec.id;
  catBack();
  toast(i >= 0 ? 'Category updated' : `${rec.name} added`);
}
async function deleteCat() {
  const d = cdraft;
  const n = S.tx.filter((t) => t.type === d.type && t.category === d.id).length;
  const ok = await ask({ title: `Delete “${d.name}”?`, msg: n ? `${n} entr${n === 1 ? 'y uses' : 'ies use'} it. They'll move to “${cat(d.type, OTHER_CAT[d.type]).name}”.` : 'No entries use it.', ok: 'Delete category', destructive: true });
  if (!ok) return;
  S.cats[d.type] = S.cats[d.type].filter((x) => x.id !== d.id);
  S.tx.forEach((t) => { if (t.type === d.type && t.category === d.id) t.category = OTHER_CAT[d.type]; });
  if (draft && draft.category === d.id) draft.category = null;
  save(); render();
  catBack();
  toast('Category deleted');
}

// ================= Goals (forms & detail) =================
let gdraft = null;
function openGoalForm(id) {
  const g = id ? S.goals.find((x) => x.id === id) : null;
  const now = new Date();
  gdraft = g
    ? { id: g.id, name: g.name, icon: g.icon, target: g.target, currency: g.currency, deadline: g.deadline, initial: 0 }
    : { id: null, name: '', icon: 'target', target: 0, currency: UI.cur, deadline: iso(new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())), initial: 0 };
  openSheet(goalFormHtml(), mountGoalForm);
}
function goalFormHtml() {
  const d = gdraft, editing = !!d.id;
  return sheetHead(editing ? 'Edit goal' : 'New goal',
    editing ? `<button data-act="goal" data-id="${d.id}">Cancel</button>` : '<button data-act="close-sheet">Cancel</button>',
    '<button data-act="save-goal">Save</button>') + `
  <div class="sheet-body">
    <div class="form-label" style="margin-top:6px">Icon</div>
    <div class="emojis">${GOAL_ICONS.map((x) => `<button data-act="pick-icon" data-v="${x.id}" class="${d.icon === x.id ? 'on' : ''}">${ic(x.id, x.c)}</button>`).join('')}</div>
    <div class="form-label">What are you saving for?</div>
    <div class="group"><label class="field"><input id="g-name" style="text-align:left" placeholder="e.g. New phone, Trip, Laptop" value="${esc(d.name)}" autocomplete="off" enterkeyhint="done"></label></div>
    <div class="form-label">How much do you need?</div>
    <div class="card amount-box" style="padding:14px 12px 12px">
      <input class="amount-input num" id="g-target" inputmode="decimal" placeholder="0" value="${shownAmount(d.target, d.currency)}" autocomplete="off" style="font-size:38px" aria-label="Target amount">
      <div class="cur-pill"><div class="seg sm">${segButtons('goal-cur', curItems, d.currency)}</div></div>
    </div>
    <div class="form-label">By when?</div>
    <div class="group plain">
      <label class="row field"><span>Date</span><input type="date" id="g-date" value="${d.deadline}"></label>
      ${editing ? '' : `<label class="row field"><span>Put aside now</span><input id="g-init" inputmode="decimal" placeholder="0 (optional)" value="${shownAmount(d.initial, d.currency)}" autocomplete="off"></label>`}
    </div>
    ${editing ? '' : `<div class="quick" id="g-free-chip"></div><p class="hint" id="g-free"></p>`}
    <p class="hint" id="g-preview"></p>
    <div class="actions">
      <button class="btn" data-act="save-goal">${editing ? 'Save changes' : 'Create goal'}</button>
      ${editing ? `<button class="btn danger" data-act="del-goal" data-id="${d.id}">Delete goal</button>` : ''}
    </div>
  </div>`;
}
function mountGoalForm(sh) {
  const name = $('#g-name', sh), target = $('#g-target', sh), date = $('#g-date', sh), init = $('#g-init', sh);
  const sync = () => {
    const d = gdraft;
    const free = Math.max(0, freeMoney(d.currency));
    const tooMuch = !d.id && d.initial > free + 0.004;
    const ok = d.name.trim() && d.target > 0 && d.deadline && !tooMuch;
    sh.querySelectorAll('[data-act="save-goal"]').forEach((b) => { b.disabled = !ok; });
    const fh = $('#g-free', sh), fc = $('#g-free-chip', sh);
    if (fh) {
      fh.innerHTML = tooMuch
        ? `<b style="color:var(--danger)">You only have ${fmt(free, d.currency)} free.</b> Lower the amount — you can move money from other goals after creating this one.`
        : `Free money you can put aside: <b>${fmt(free, d.currency)}</b>`;
      fc.innerHTML = free > 0 ? `<button data-act="g-all-free">Put all my free money here · ${fmt(free, d.currency)}</button>` : '';
    }
    const p = $('#g-preview', sh);
    if (d.target > 0 && d.deadline) {
      const saved = d.id ? goalSaved(S.goals.find((g) => g.id === d.id)) : d.initial;
      const st = goalStats({ ...d, contribs: [{ amount: saved }], start: todayIso() });
      p.innerHTML = st.daysLeft > 0 && st.left > 0 ? `${st.pace} to reach it by ${medDate(d.deadline)}.` : st.left <= 0 ? '🎉 You already have enough for this goal.' : 'Pick a date in the future.';
    } else p.textContent = 'The app works out how much to put aside each month to reach your goal in time.';
  };
  name.addEventListener('input', () => { gdraft.name = name.value; sync(); });
  target.addEventListener('input', () => { const r = typedAmount(target.value, gdraft.currency); target.value = r.shown; gdraft.target = r.value; sync(); });
  date.addEventListener('change', () => { gdraft.deadline = date.value; sync(); });
  if (init) init.addEventListener('input', () => { const r = typedAmount(init.value, gdraft.currency); init.value = r.shown; gdraft.initial = r.value; sync(); });
  blurOnEnter(sh);
  sync();
}
function saveGoal() {
  const d = gdraft;
  if (!(d.name.trim() && d.target > 0 && d.deadline)) return;
  if (d.id) {
    const g = S.goals.find((x) => x.id === d.id);
    Object.assign(g, { name: d.name.trim(), icon: d.icon, target: roundCur(d.target, d.currency), currency: d.currency, deadline: d.deadline });
    save(); render();
    openGoal(g.id);
    toast('Goal updated');
  } else {
    const g = { id: uid(), name: d.name.trim(), icon: d.icon, target: roundCur(d.target, d.currency), currency: d.currency, deadline: d.deadline, start: todayIso(), createdAt: Date.now(), contribs: [] };
    const init = Math.min(roundCur(d.initial, d.currency), Math.max(0, freeMoney(d.currency)));
    if (init > 0) g.contribs.push({ id: uid(), amount: init, date: todayIso(), note: 'Added from free money' });
    S.goals.push(g);
    save(); buzz(); closeSheet(); render();
    toast('Goal created');
  }
}
let gid = null;
function openGoal(id) { gid = id; openSheet(goalDetailHtml(), null); }
function goalDetailHtml() {
  const g = S.goals.find((x) => x.id === gid);
  if (!g) return sheetHead('', '', '<button data-act="close-sheet">Done</button>') + '<div class="sheet-body"></div>';
  const st = goalStats(g), cur = g.currency, done = st.pct >= 100, gi = goalIcon(g);
  const free = freeMoney(cur);
  const contribs = [...g.contribs].sort((a, b) => b.date.localeCompare(a.date) || 0);
  return sheetHead('', `<button data-act="edit-goal" data-id="${g.id}">Edit</button>`, '<button data-act="close-sheet">Done</button>') + `
  <div class="sheet-body">
    <div class="gd-hero">
      ${ring(st.pct, 136, 12, `<div><span style="color:${gi.c}">${glyph(gi.id, 'big')}</span><div style="font-size:16px;font-weight:700;margin-top:4px">${g.paid ? 'Paid' : Math.floor(st.pct) + '%'}</div></div>`, done || !!g.paid)}
      <div class="gd-name">${esc(g.name)}</div>
      <div class="gd-amt"><b class="num">${fmt(st.saved, cur)}</b> of ${fmt(g.target, cur)}</div>
      <div style="margin-top:10px"><span class="chip ${st.status[0]}">${st.status[1]}</span></div>
    </div>
    <div class="group plain" style="margin-top:20px">
      <div class="row"><div class="row-main">Still needed</div><div class="row-amt num">${fmt(st.left, cur)}</div></div>
      <div class="row"><div class="row-main">Free money you can add</div><div class="row-amt num ${free > 0 ? 'in' : ''}">${fmt(Math.max(0, free), cur)}</div></div>
      <div class="row"><div class="row-main">Deadline</div><div class="row-amt" style="font-weight:500">${medDate(g.deadline)}<small>${daysLeftText(st.daysLeft)}</small></div></div>
      <div class="row gc-pace" style="border:0;margin:0;padding-top:10px">${glyph('calendar')}<div class="row-main" style="white-space:normal">${st.pace}</div></div>
    </div>
    <div class="btn-row" style="margin-top:14px">
      <button class="btn" data-act="goal-move" data-v="1">＋ Add money</button>
      <button class="btn grey" data-act="goal-move" data-v="-1" ${st.saved > 0 ? '' : 'disabled'}>Take out</button>
    </div>
    ${st.saved > 0 ? `<button class="btn soft" style="margin-top:10px" data-act="goal-spend">${glyph('receipt')} I paid for it — use ${fmt(st.saved, cur)}</button>` : ''}
    <div class="form-label">History</div>
    ${contribs.length ? `<div class="group plain">${contribs.map((c) => `<button class="row" data-act="del-contrib" data-id="${c.id}"><div class="row-main"><div class="row-title">${esc(c.note || (c.amount >= 0 ? 'Added' : 'Taken out'))}</div><div class="row-sub">${dayLabel(c.date)}</div></div><div class="row-amt num ${c.amount >= 0 ? 'in' : ''}">${fmt(c.amount, cur, { sign: true })}</div></button>`).join('')}</div>
      <p class="hint">Tap a line to undo it.</p>` : '<p class="hint">Nothing added yet. Use “Add money” whenever you put some aside.</p>'}
    <p class="hint" style="margin-top:16px">Goals only hold money you really have: your total balance is split into money in goals and free money. Paying for the thing with “I paid for it” records the expense and uses the goal's money.</p>
  </div>`;
}

// ---------- Moving money into, out of and between goals ----------
let mv = null; // { gid, dir: 1 add | -1 take out, amount, sources: [goal ids], dest: 'free' | goal id }
const goalById = (id) => S.goals.find((x) => x.id === id);
const siblingGoals = (g) => S.goals.filter((x) => x.id !== g.id && x.currency === g.currency);
function paceOf(g) {
  const st = goalStats(g);
  if (st.left <= 0 || st.daysLeft <= 0) return null;
  const step = g.currency === 'UZS' ? 1000 : 1;
  if (st.daysLeft >= 62) return { v: ceilTo(st.left / (st.daysLeft / 30.44), step), u: 'month' };
  if (st.daysLeft >= 14) return { v: ceilTo(st.left / (st.daysLeft / 7), step), u: 'week' };
  return { v: ceilTo(st.left / st.daysLeft, step), u: 'day' };
}
function openMove(dir) {
  const g = goalById(gid);
  if (!g) return;
  mv = { gid: g.id, dir, amount: 0, sources: [], dest: 'free' };
  openSheet(moveHtml(), mountMove);
}
function moveState() {
  const g = goalById(mv.gid), cur = g.currency, free = Math.max(0, freeMoney(cur));
  const amt = roundCur(mv.amount, cur);
  if (mv.dir > 0) {
    const need = Math.max(0, amt - free);
    const donors = siblingGoals(g).filter((x) => goalSaved(x) > 0);
    const picked = mv.sources.reduce((a, id) => a + goalSaved(goalById(id)), 0);
    return { g, cur, free, amt, need, donors, picked, ok: amt > 0 && (need === 0 || picked >= need) };
  }
  const saved = goalSaved(g);
  return { g, cur, free, amt, saved, ok: amt > 0 && amt <= saved && (mv.dest === 'free' || !!goalById(mv.dest)) };
}
function moveHtml() {
  const s = moveState(), g = s.g, cur = s.cur;
  const chip = (v, label) => `<button data-act="mv-set" data-v="${v}">${label}</button>`;
  let chips = '', body = '';
  if (mv.dir > 0) {
    const st = goalStats(g), pace = paceOf(g);
    if (s.free > 0) chips += chip(s.free, `All my free money · ${fmt(s.free, cur)}`);
    if (st.left > 0 && st.left !== s.free) chips += chip(st.left, `What's left · ${fmt(st.left, cur)}`);
    if (pace && pace.v !== st.left) chips += chip(pace.v, `This ${pace.u} · ${fmt(pace.v, cur)}`);
    body = `<div id="mv-extra">${moveExtra()}</div>`;
  } else {
    chips = chip(s.saved, `All of it · ${fmt(s.saved, cur)}`);
    const others = siblingGoals(g);
    body = `<div class="form-label">Where does it go?</div>
      <div class="grp-pick"><button class="${mv.dest === 'free' ? 'on' : ''}" data-act="mv-dest" data-v="free">Back to free money</button>${others.map((x) => `<button class="${mv.dest === x.id ? 'on' : ''}" data-act="mv-dest" data-v="${x.id}" style="--c:${goalIcon(x).c}"><i></i>${esc(x.name)}</button>`).join('')}</div>
      <div id="mv-extra">${moveExtra()}</div>`;
  }
  return sheetHead(mv.dir > 0 ? `Add to ${esc(g.name)}` : `Take out of ${esc(g.name)}`, '<button data-act="goal" data-id="' + g.id + '">Cancel</button>', `<button data-act="mv-save" ${s.ok ? '' : 'disabled'}>Done</button>`) + `
  <div class="sheet-body">
    <div class="amount-box">
      <input class="amount-input num" id="mv-amt" inputmode="decimal" placeholder="0" value="${shownAmount(mv.amount, cur)}" autocomplete="off" enterkeyhint="done" aria-label="Amount">
      <div class="mv-sub">${mv.dir > 0 ? `Free money: <b class="num">${fmt(s.free, cur)}</b>` : `In this goal: <b class="num">${fmt(s.saved, cur)}</b>`}</div>
    </div>
    <div class="quick mv-chips">${chips}</div>
    ${body}
    <div class="actions"><button class="btn" data-act="mv-save" ${s.ok ? '' : 'disabled'}>${mv.dir > 0 ? 'Add to goal' : 'Take out'}</button></div>
  </div>`;
}
// The part of the sheet that depends on the amount (kept separate so typing never loses focus).
function moveExtra() {
  const s = moveState(), cur = s.cur;
  if (mv.dir < 0) {
    if (s.amt > s.saved) return `<div class="blk-warn bad">${glyph('coins')}<div><b>Only ${fmt(s.saved, cur)} is in this goal</b><span>Lower the amount.</span></div></div>`;
    return '';
  }
  if (!s.amt || !s.need) return s.amt ? `<p class="hint">${fmt(s.amt, cur)} of your free money will be set aside for ${esc(s.g.name)}.</p>` : '';
  if (!s.donors.length) {
    return `<div class="blk-warn bad">${glyph('coins')}<div><b>You only have ${fmt(s.free, cur)} free</b><span>Add the money as “Money in” first, or lower the amount. Goals can't hold money you don't have.</span></div></div>`;
  }
  return `<div class="blk-warn">${glyph('coins')}<div><b>${fmt(s.need, cur)} more than your free money</b><span>Take it from another goal — tap the ones to use:</span></div></div>
    <div class="group plain" style="margin-top:8px">${s.donors.map((x) => { const on = mv.sources.includes(x.id); return `<button class="row field" data-act="mv-src" data-v="${x.id}">${ic(goalIcon(x).id, goalIcon(x).c, 'sm')}<span style="flex:1;min-width:0">${esc(x.name)}<small class="muted" style="display:block;font-size:12px">has ${fmt(goalSaved(x), cur)}</small></span><span class="tick ${on ? 'on' : ''}">${glyph('check')}</span></button>`; }).join('')}</div>
    <p class="hint">${s.picked >= s.need ? `${fmt(s.need, cur)} will move from ${mv.sources.map((id) => esc(goalById(id).name)).join(', ')}.` : `Pick goals holding at least ${fmt(s.need, cur)}.`}</p>`;
}
function mountMove(sh) {
  const inp = $('#mv-amt', sh);
  inp.addEventListener('input', () => {
    const cur = goalById(mv.gid).currency;
    const r = typedAmount(inp.value, cur);
    inp.value = r.shown;
    mv.amount = r.value;
    syncMove(sh);
  });
  blurOnEnter(sh);
  setTimeout(() => inp.focus({ preventScroll: true }), 420);
}
function syncMove(sh) {
  const s = moveState();
  $('#mv-extra', sh).innerHTML = moveExtra();
  sh.querySelectorAll('[data-act="mv-save"]').forEach((b) => { b.disabled = !s.ok; });
}
function saveMove() {
  const s = moveState();
  if (!s.ok) return;
  const g = s.g, cur = s.cur, amt = s.amt, today = todayIso();
  const snapshot = JSON.parse(JSON.stringify(S.goals));
  let msg;
  if (mv.dir > 0) {
    let need = s.need;
    const used = [];
    for (const id of mv.sources) {
      if (need <= 0) break;
      const x = goalById(id), t = roundCur(Math.min(goalSaved(x), need), cur);
      if (t <= 0) continue;
      const pair = uid();
      x.contribs.push({ id: uid(), amount: -t, date: today, note: `Moved to ${g.name}`, pair });
      g.contribs.push({ id: uid(), amount: t, date: today, note: `Moved from ${x.name}`, pair });
      used.push(x.name);
      need -= t;
    }
    const fromFree = roundCur(amt - (s.need - Math.max(0, need)), cur);
    if (fromFree > 0) g.contribs.push({ id: uid(), amount: fromFree, date: today, note: 'Added from free money' });
    delete g.paid;
    msg = used.length ? `${fmt(amt, cur)} → ${g.name} (incl. from ${used.join(', ')})` : `${fmt(amt, cur)} added to ${g.name}`;
  } else if (mv.dest === 'free') {
    g.contribs.push({ id: uid(), amount: -amt, date: today, note: 'Back to free money' });
    msg = `${fmt(amt, cur)} is free money again`;
  } else {
    const x = goalById(mv.dest), pair = uid();
    g.contribs.push({ id: uid(), amount: -amt, date: today, note: `Moved to ${x.name}`, pair });
    x.contribs.push({ id: uid(), amount: amt, date: today, note: `Moved from ${g.name}`, pair });
    delete x.paid;
    msg = `${fmt(amt, cur)} moved to ${x.name}`;
  }
  const reached = mv.dir > 0 && goalSaved(g) >= g.target && snapshot.find((x) => x.id === g.id).contribs.reduce((a, c) => a + c.amount, 0) < g.target;
  save(); buzz(); render();
  openGoal(g.id);
  undoToast(reached ? `🎉 ${g.name} is fully saved!` : msg, () => { S.goals = snapshot; if (sheet && gid) refreshSheet(goalDetailHtml(), null); });
}
// When spending leaves goals holding more than you have, take the difference back from the
// goals whose deadlines are furthest away (the least urgent ones).
function fixGoals(cur) {
  let short = roundCur(-freeMoney(cur), cur);
  if (short <= 0) return;
  const snapshot = JSON.parse(JSON.stringify(S.goals));
  const list = S.goals.filter((g) => g.currency === cur && goalSaved(g) > 0).sort((a, b) => b.deadline.localeCompare(a.deadline));
  const touched = [];
  for (const g of list) {
    if (short <= 0) break;
    const t = roundCur(Math.min(goalSaved(g), short), cur);
    g.contribs.push({ id: uid(), amount: -t, date: todayIso(), note: 'Taken back — the money was spent' });
    touched.push(g.name);
    short -= t;
  }
  save(); render();
  if (sheet && gid) refreshSheet(goalDetailHtml(), null);
  undoToast(`Taken back from ${touched.join(', ')}`, () => { S.goals = snapshot; });
}
// After money leaves your balance, warn if goals now hold more than you have.
function goalsShort(cur) { return S.goals.some((g) => g.currency === cur && goalSaved(g) > 0) && freeMoney(cur) < -0.004; }
function allocCard(cur) {
  const total = balance(cur), inGoals = savedInGoals(cur), free = total - inGoals;
  const denom = Math.max(total, inGoals, 1);
  const segs = S.goals.filter((g) => g.currency === cur && goalSaved(g) > 0)
    .map((g) => `<i style="--c:${goalIcon(g).c};width:${((goalSaved(g) / denom) * 100).toFixed(2)}%"></i>`).join('')
    + (free > 0 ? `<i class="free" style="width:${((free / denom) * 100).toFixed(2)}%"></i>` : '');
  return `<section class="card alloc">
    <div class="label">Your money in ${cur === 'UZS' ? "so'm" : 'dollars'}</div>
    <div class="al-total num">${fmt(total, cur)}</div>
    <div class="wk-bar al-bar">${segs || '<i class="free" style="width:100%"></i>'}</div>
    <div class="al-legend"><span><i class="g"></i>In goals <b class="num">${fmt(inGoals, cur)}</b></span><span><i class="f"></i>Free <b class="num">${fmt(Math.max(0, free), cur)}</b></span></div>
    ${free < -0.004 ? `<div class="blk-warn bad" style="margin-top:12px">${glyph('coins')}<div><b>Goals hold ${fmt(-free, cur)} more than you have</b><span>That money was spent. Take it back from the goals with the latest dates?</span><button class="pill-btn" data-act="goals-fix" data-v="${cur}" style="margin-top:8px">Fix it</button></div></div>` : ''}
  </section>`;
}

// ================= Monthly report =================
let rep = { ym: null, cur: 'UZS' };
function reportData(ym, cur) {
  const [from, to] = ymRange(ym);
  const prevYm = ymShift(ym, -1);
  const [pf, pt] = ymRange(prevYm);
  const t = totals(cur, from, to), p = totals(cur, pf, pt);
  const txs = S.tx.filter((x) => x.type !== 'transfer' && x.currency === cur && x.date >= from && x.date < to);
  const outs = txs.filter((x) => x.type === 'out').sort((a, b) => b.amount - a.amount);
  const change = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);
  const goalsMonth = S.goals.map((g) => ({ g, added: g.contribs.filter((c) => c.date >= from && c.date < to).reduce((a, c) => a + c.amount, 0) })).filter((x) => x.added);
  return {
    ym, cur, prevYm, from, to, t, p,
    net: t.in - t.out,
    kept: t.in > 0 ? Math.round(((t.in - t.out) / t.in) * 100) : null,
    inChange: change(t.in, p.in), outChange: change(t.out, p.out),
    spend: breakdown('out', cur, from, to),
    people: breakdown('in', cur, from, to),
    biggest: outs[0] || null,
    count: txs.length,
    goalsMonth,
    lessons: S.groups.length ? groupsMonthSummary(ym) : null,
  };
}
function openReport(ym) {
  rep.ym = ym;
  rep.cur = usesCur(UI.cur) ? UI.cur : 'UZS';
  if (ym === ymShift(ymNow(), -1)) { S.settings.reportSeen = ym; save(); }
  openSheet(reportHtml(), null);
}
function changeLine(pct, word, prevLabel) {
  if (pct === null) return `No ${word === 'spent' ? 'spending' : 'income'} in ${prevLabel} to compare with.`;
  if (pct === 0) return `You ${word} the same as in ${prevLabel}.`;
  return `You ${word} <b>${Math.abs(pct)}% ${pct > 0 ? 'more' : 'less'}</b> than in ${prevLabel}.`;
}
function reportHtml() {
  const r = reportData(rep.ym, rep.cur), cur = r.cur;
  const prevLabel = MONTHS[parseD(r.prevYm + '-01').getMonth()];
  const both = usesCur('UZS') && usesCur('USD');
  const bars = (arr, type) => {
    if (!arr.length) return '<p class="card-sub" style="margin:8px 0 0">Nothing this month.</p>';
    const max = arr[0].v, total = arr.reduce((a, x) => a + x.v, 0);
    return arr.slice(0, 5).map((x) => `<div class="brk">${x.tile || brkTile(x)}<div class="brk-main"><div class="brk-top"><span class="n">${esc(x.name)}</span><span class="a num">${fmt(x.v, cur)}</span></div><div class="brk-bar"><i class="${type}" style="width:${Math.max(1.5, (x.v / max) * 80).toFixed(1)}%;${x.bar ? `background:${x.bar}` : ''}"></i><span>${Math.round((x.v / total) * 100)}%</span></div></div></div>`).join('');
  };
  return sheetHead('', '', '<button data-act="close-sheet">Done</button>') + `
  <div class="sheet-body">
    <div class="rep-hero">
      <div class="rep-eyebrow">Monthly report</div>
      <div class="rep-title">${ymLabel(r.ym)}</div>
      <div class="rep-label">Left over</div>
      <div class="rep-big num">${fmt(r.net, cur, { sign: true })}</div>
      <div class="rep-sub">${r.kept !== null ? (r.kept >= 0 ? `You kept ${r.kept}% of what came in` : 'You spent more than came in') : 'No money came in this month'}</div>
    </div>
    <div class="period-nav" style="margin:14px 0 4px">
      <button class="icon-btn" data-act="rep-month" data-v="-1" aria-label="Previous month">${I.left}</button>
      ${both ? `<div class="seg sm" style="width:130px">${segButtons('rep-cur', curItems, cur)}</div>` : `<div class="pn-title" style="font-size:15px">${ymLabel(r.ym)}</div>`}
      <button class="icon-btn" data-act="rep-month" data-v="1" aria-label="Next month" ${r.ym >= ymNow() ? 'disabled' : ''}>${I.right}</button>
    </div>
    <section class="card" style="margin-top:10px">
      <div class="sl-row"><span class="sl-label"><span class="key in"></span>Money in</span><b class="num">${fmt(r.t.in, cur)}</b></div>
      <div class="sl-row"><span class="sl-label"><span class="key out"></span>Money out</span><b class="num">${fmt(r.t.out, cur)}</b></div>
      <div class="rate-line">${changeLine(r.inChange, 'earned', prevLabel)}<br>${changeLine(r.outChange, 'spent', prevLabel)}</div>
    </section>
    ${r.lessons && r.lessons.students ? `<section class="card" style="margin-top:12px"><div class="card-title">Lessons</div><div class="card-sub">${r.lessons.paid} of ${r.lessons.students} students paid for ${MONTHS[parseD(r.ym + '-01').getMonth()]}${r.lessons.expected ? ` · ${fmt(r.lessons.collected, r.lessons.cur)} of ${fmt(r.lessons.expected, r.lessons.cur)}` : ''}</div><div class="meter"><i style="width:${Math.min(100, (r.lessons.paid / r.lessons.students) * 100).toFixed(1)}%"></i></div></section>` : ''}
    <section class="card" style="margin-top:12px"><div class="card-title">Where the money went</div>${bars(r.spend, 'out')}</section>
    <section class="card" style="margin-top:12px"><div class="card-title">Where the money came from</div>${bars(r.people, 'in')}</section>
    <section class="card" style="margin-top:12px">
      <div class="card-title">Highlights</div>
      <div class="rep-hl">
        <div><span>Entries</span><b class="num">${r.count}</b></div>
        <div><span>Biggest expense</span><b class="num">${r.biggest ? fmt(r.biggest.amount, cur) : '—'}</b>${r.biggest ? `<small>${esc(r.biggest.person || cat('out', r.biggest.category).name)} · ${shortDate(r.biggest.date)}</small>` : ''}</div>
        ${r.goalsMonth.map((x) => `<div><span>Saved for ${esc(x.g.name)}</span><b class="num">${fmt(x.added, x.g.currency, { sign: true })}</b></div>`).join('')}
      </div>
    </section>
    <div class="actions">
      <button class="btn" data-act="rep-share">${glyph('share')} Share as picture</button>
    </div>
  </div>`;
}

// Draws the report as a 1080-wide picture (up to 1080×1342 — good for Telegram or Instagram).
function glyphImage(g, size) {
  return new Promise((resolve) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${(G[g] || '').replace(/class="f"/g, 'fill="#fff" stroke="none"')}</svg>`;
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
function loadImage(src) {
  return new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => resolve(null); i.src = src; });
}
async function drawReportPicture(r) {
  try { await Promise.all(['500 30px Inter', '600 30px Inter', '700 30px Inter', '800 30px Inter'].map((f) => document.fonts.load(f))); } catch (e) { /* system font */ }
  const rowsN = Math.min(4, r.spend.length);
  const W = 1080, H = 808 + 104 + Math.max(1, rowsN) * 80 + 110, F = 'Inter, system-ui, sans-serif';
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const rr = (X, Y, w, h, rad, fill) => { x.beginPath(); x.roundRect(X, Y, w, h, rad); x.fillStyle = fill; x.fill(); };
  const text = (s, X, Y, font, color, align = 'left', maxW) => {
    x.font = font; x.fillStyle = color; x.textAlign = align; x.textBaseline = 'alphabetic';
    if (maxW) { let size = parseInt(font.match(/(\d+)px/)[1], 10); while (x.measureText(s).width > maxW && size > 20) { size -= 2; x.font = font.replace(/\d+px/, size + 'px'); } }
    x.fillText(s, X, Y);
  };
  const plain = (s) => s.replace(/ /g, ' ');
  const cur = r.cur;
  x.fillStyle = '#F2F2F7'; x.fillRect(0, 0, W, H);

  // Hero
  const grad = x.createLinearGradient(48, 48, 1032, 560);
  grad.addColorStop(0, '#2BDDA0'); grad.addColorStop(0.55, '#0FA57C'); grad.addColorStop(1, '#05705D');
  rr(48, 48, 984, 470, 56, grad);
  const glow = x.createRadialGradient(220, 110, 0, 220, 110, 620);
  glow.addColorStop(0, 'rgba(255,255,255,.28)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  rr(48, 48, 984, 470, 56, glow);
  x.save(); x.letterSpacing = '4px'; text('MONTHLY REPORT', 104, 134, `700 28px ${F}`, 'rgba(255,255,255,.85)'); x.restore();
  text(ymLabel(r.ym), 104, 214, `800 74px ${F}`, '#fff', 'left', 760);
  text('Left over', 104, 310, `600 34px ${F}`, 'rgba(255,255,255,.85)');
  text(plain(fmt(r.net, cur, { sign: true })), 104, 415, `800 98px ${F}`, '#fff', 'left', 880);
  text(r.kept !== null ? (r.kept >= 0 ? `You kept ${r.kept}% of what came in` : 'You spent more than came in') : 'No money came in this month', 104, 478, `500 32px ${F}`, 'rgba(255,255,255,.92)', 'left', 880);
  const icon = await loadImage('icons/icon-192.png');
  if (icon) { x.save(); x.beginPath(); x.roundRect(916, 92, 76, 76, 20); x.clip(); x.drawImage(icon, 916, 92, 76, 76); x.restore(); }

  // In / out
  rr(48, 550, 984, 226, 44, '#FFFFFF');
  const col = (X, dot, label, val, pct, word) => {
    x.beginPath(); x.roundRect(X, 598, 16, 16, 4); x.fillStyle = dot; x.fill();
    text(label, X + 28, 614, `600 30px ${F}`, '#6C6C70');
    text(plain(fmt(val, cur)), X, 694, `800 52px ${F}`, '#000', 'left', 400);
    text(pct === null ? '—' : `${pct > 0 ? '▲' : pct < 0 ? '▼' : '='} ${Math.abs(pct)}% vs ${MON[parseD(r.prevYm + '-01').getMonth()]}`, X, 746, `500 28px ${F}`, '#8E8E93');
  };
  col(104, '#1BAF7A', 'Money in', r.t.in, r.inChange);
  col(582, '#EB6834', 'Money out', r.t.out, r.outChange);
  x.fillStyle = '#E5E5EA'; x.fillRect(540, 594, 2, 160);

  // Where the money went
  const rows = r.spend.slice(0, 4);
  const cardH = 104 + Math.max(1, rows.length) * 80;
  rr(48, 808, 984, cardH, 44, '#FFFFFF');
  text('Where the money went', 104, 872, `700 36px ${F}`, '#000');
  if (!rows.length) text('No spending this month 🎉', 104, 946, `500 30px ${F}`, '#6C6C70');
  const max = rows.length ? rows[0].v : 1, total = r.spend.reduce((a, s) => a + s.v, 0) || 1;
  for (let i = 0; i < rows.length; i++) {
    const s = rows[i], Y = 912 + i * 80;
    const tg = x.createLinearGradient(0, Y, 0, Y + 56);
    tg.addColorStop(0, s.c); tg.addColorStop(1, s.c);
    rr(104, Y, 56, 56, 16, tg);
    x.fillStyle = 'rgba(255,255,255,.22)'; x.beginPath(); x.roundRect(104, Y, 56, 28, [16, 16, 0, 0]); x.fill();
    if (s.g) { const gi = await glyphImage(s.g, 34); if (gi) x.drawImage(gi, 115, Y + 11, 34, 34); }
    else text('•••', 132, Y + 38, `700 22px ${F}`, '#fff', 'center');
    text(s.name, 184, Y + 26, `600 30px ${F}`, '#000', 'left', 460);
    text(plain(fmt(s.v, cur)), 976, Y + 26, `700 30px ${F}`, '#000', 'right');
    x.fillStyle = '#F2F2F7'; x.beginPath(); x.roundRect(184, Y + 42, 640, 12, 6); x.fill();
    x.fillStyle = s.c; x.beginPath(); x.roundRect(184, Y + 42, Math.max(12, (s.v / max) * 640), 12, 6); x.fill();
    text(`${Math.round((s.v / total) * 100)}%`, 976, Y + 54, `500 26px ${F}`, '#8E8E93', 'right');
  }
  text('Made with Budget', W / 2, H - 48, `500 26px ${F}`, '#8E8E93', 'center');
  return new Promise((resolve) => cv.toBlob(resolve, 'image/png'));
}
async function shareReport() {
  const r = reportData(rep.ym, rep.cur);
  const blob = await drawReportPicture(r);
  if (!blob) { toast('Could not make the picture'); return; }
  const name = `budget-report-${r.ym}.png`;
  const file = new File([blob], name, { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: `${ymLabel(r.ym)} report` }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  toast('Picture saved to Downloads');
}

// ================= Settings =================
const canShareFiles = (() => {
  try { return !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.txt', { type: 'text/plain' })] })); } catch (e) { return false; }
})();
function openSettings() { openSheet(settingsHtml(), mountSettings); }
function settingsHtml() {
  const s = S.settings;
  const lb = s.lastBackup;
  const ago = lb ? (() => { const d = Math.floor((Date.now() - lb) / 864e5); return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`; })() : 'never';
  const action = (act, label, color = 'var(--accent)', extra = '') => `<button class="row field" data-act="${act}" ${extra}><span style="flex:1;color:${color}">${label}</span></button>`;
  const navRow = (act, v, icon, title, sub) => `<button class="row" data-act="${act}" data-v="${v}">${icon}<div class="row-main"><div class="row-title">${title}</div>${sub ? `<div class="row-sub">${sub}</div>` : ''}</div>${I.chev}</button>`;
  return sheetHead('Settings', '', '<button data-act="close-sheet">Done</button>') + `
  <div class="sheet-body">
    <div class="form-label" style="margin-top:6px">Accounts</div>
    <div class="group">
      ${S.accounts.map((a) => `<button class="row" data-act="edit-account" data-id="${a.id}">${accIc(a, 'sm')}<div class="row-main"><div class="row-title">${esc(a.name)}</div><div class="row-sub num">${fmt(accBalance(a.id, 'UZS'), 'UZS')} · ${fmt(accBalance(a.id, 'USD'), 'USD')}</div></div>${I.chev}</button>`).join('')}
      <button class="row" data-act="new-account"><span class="ic sm" style="--c:var(--accent)">${glyph('plus')}</span><div class="row-main" style="color:var(--accent);font-weight:500">Add account</div></button>
    </div>

    <div class="form-label">Organise</div>
    <div class="group">
      ${navRow('open-cats', 'in', ic('coins', '#34C759', 'sm'), 'Money in categories', `${S.cats.in.length} categories`)}
      ${navRow('open-cats', 'out', ic('cart', '#FF9500', 'sm'), 'Money out categories', `${S.cats.out.length} categories`)}
      ${navRow('groups-view', '', ic('users', '#007AFF', 'sm'), 'Groups', S.groups.length ? plural(S.groups.length, 'group') : 'Your classes and who paid')}
    </div>

    <div class="form-label">Main currency</div>
    <div class="seg full">${segButtons('set-cur', curItems, s.currency)}</div>
    <p class="hint">The app opens in this currency. You can switch at the top of Overview and Stats.</p>

    <div class="form-label">Exchange rate</div>
    <div class="group plain"><label class="row field"><span>1 $ =</span><input id="rate" inputmode="decimal" placeholder="e.g. 12 000" value="${s.rate ? shownAmount(s.rate, 'UZS') : ''}" autocomplete="off" enterkeyhint="done"><span class="muted" style="min-width:0">so'm</span></label></div>
    <p class="hint">Only used to show an approximate combined total on the Overview. Your entries are never converted.</p>

    <div class="form-label">Appearance</div>
    <div class="seg full">${segButtons('set-theme', [['system', 'Automatic'], ['light', 'Light'], ['dark', 'Dark']], s.theme)}</div>

    <div class="form-label">Privacy</div>
    <div class="group plain">
      <div class="row field"><span style="flex:1">Passcode lock</span><label class="switch"><input type="checkbox" id="pin-toggle" ${s.pin ? 'checked' : ''} aria-label="Passcode lock"><i></i></label></div>
      ${s.pin ? action('change-pin', 'Change passcode') : ''}
    </div>
    <p class="hint">Asks for a 4-digit code when you open the app. Everything you enter is stored only on this phone — nothing is sent anywhere. <span id="persist-note"></span></p>

    <div class="form-label">Backup</div>
    <div class="group plain">
      ${action('export', 'Save backup file')}
      ${canShareFiles ? action('share-backup', 'Send backup to… (Telegram, Drive)') : ''}
      ${action('import', 'Restore from a backup file')}
    </div>
    <p class="hint">Last backup: <b>${ago}</b>. If the app or the browser's data gets deleted, a backup file is the only way to get your entries back — keep one somewhere safe.</p>

    <div class="form-label">Data</div>
    <div class="group plain">
      ${hasDemo() ? action('clear-demo', 'Remove demo data') : action('load-demo', 'Load demo data')}
      ${action('erase', 'Erase all data', 'var(--danger)')}
    </div>
    <p class="hint" style="text-align:center;margin-top:28px">${S.tx.length} entries · ${S.accounts.length} accounts · ${S.groups.length} groups · ${S.goals.length} goals<br>Budget · version ${APP_VERSION}</p>
  </div>`;
}
function mountSettings(sh) {
  const rate = $('#rate', sh);
  rate.addEventListener('input', () => { const r = typedAmount(rate.value, 'UZS'); rate.value = r.shown; S.settings.rate = r.value || null; save(); render(); });
  blurOnEnter(sh);
  $('#pin-toggle', sh).addEventListener('change', (e) => {
    if (e.target.checked) {
      setPinFlow((ok) => { e.target.checked = ok; if (ok) { toast('Passcode is on'); refreshSheet(settingsHtml(), mountSettings); } });
    } else {
      S.settings.pin = null; save(); toast('Passcode is off');
      refreshSheet(settingsHtml(), mountSettings);
    }
  });
  if (navigator.storage && navigator.storage.persisted) {
    navigator.storage.persisted().then((p) => {
      const el = $('#persist-note', sh);
      if (el) el.textContent = p ? 'Chrome has marked this data as protected from automatic clean-up ✓' : '';
    }).catch(() => {});
  }
}
function applyTheme() {
  const t = S.settings.theme;
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name="theme-color"]').setAttribute('content', dark ? '#000000' : '#F2F2F7');
}

// ================= Backup =================
function backupText() {
  const data = JSON.parse(JSON.stringify(S));
  data.settings.pin = null;
  return JSON.stringify({ app: 'budget', version: APP_VERSION, exportedAt: new Date().toISOString(), data });
}
function markBackedUp() { S.settings.lastBackup = Date.now(); save(); render(); if (sheet) refreshSheet(settingsHtml(), mountSettings); }
function exportBackup() {
  const url = URL.createObjectURL(new Blob([backupText()], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `budget-backup-${todayIso()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  markBackedUp();
  toast('Backup saved to Downloads');
}
async function shareBackup() {
  const file = new File([backupText()], `budget-backup-${todayIso()}.txt`, { type: 'text/plain' });
  try {
    await navigator.share({ files: [file], title: 'Budget backup' });
    markBackedUp();
    toast('Backup sent');
  } catch (e) {
    if (e && e.name !== 'AbortError') toast('Could not share the file');
  }
}
async function importBackupFile(f) {
  let obj;
  try { obj = JSON.parse(await f.text()); } catch (err) { toast('That file is not a Budget backup'); return; }
  const data = obj && obj.data ? obj.data : obj;
  if (!data || !Array.isArray(data.tx)) { toast('That file is not a Budget backup'); return; }
  const n = normalize(data);
  const when = obj.exportedAt ? ` from ${medDate(iso(new Date(obj.exportedAt)))}` : '';
  const ok = await ask({ title: `Restore backup${when}?`, msg: `It has ${n.tx.length} entries, ${n.accounts.length} accounts, ${n.groups.length} groups and ${n.goals.length} goals. Everything currently in the app will be replaced.`, ok: 'Restore', destructive: true });
  if (!ok) return;
  n.settings.pin = S.settings.pin;
  if (!data.schedule) n.schedule = S.schedule; // older backups have no schedule — keep the current one
  S = n;
  save(); applyTheme();
  UI.cur = S.settings.currency;
  UI.hAcc = 'all'; UI.hGroup = 'all';
  closeSheet(); render();
  toast('Backup restored');
}

// ================= Demo data =================
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeDemo() {
  const R = rng(7), tx = [], now = new Date(), t0 = todayIso();
  const cash = (S.accounts.find((a) => a.kind === 'cash') || S.accounts[0]).id;
  const card = (S.accounts.find((a) => a.kind === 'card' && a.id !== cash) || S.accounts.find((a) => a.id !== cash) || S.accounts[0]).id;
  const catId = (type, id) => (S.cats[type].some((c) => c.id === id) ? id : OTHER_CAT[type]);
  const rnd = (x, step) => Math.round(x / step) * step;
  const add = (type, amount, currency, date, person, category, account, note = '') => {
    if (date > t0) return;
    tx.push({ id: uid(), type, amount, currency, account, date, person, category: catId(type, category), note, createdAt: Date.now() - tx.length, demo: true });
  };
  const move = (amount, currency, from, to, date, toAmount, toCurrency, note = '') => {
    if (date > t0) return;
    tx.push({ id: uid(), type: 'transfer', amount, currency, account: from, toAccount: to, toAmount: toAmount || amount, toCurrency: toCurrency || currency, date, note, createdAt: Date.now() - tx.length, demo: true });
  };
  for (let k = 4; k >= 0; k--) {
    const y = now.getFullYear(), m = now.getMonth() - k;
    const D = (day) => iso(new Date(y, m, day));
    if (k === 4) add('in', 2000000, 'UZS', D(1), '', 'other_in', cash, 'Cash I already had');
    add('in', 6500000, 'UZS', D(5), 'Employer', 'salary', card, 'Monthly salary');
    move(1000000, 'UZS', card, cash, D(6), 0, '', 'ATM');
    add('in', rnd(900000 + R() * 900000, 50000), 'UZS', D(18), 'Private lessons', 'sidework', cash);
    if (k % 2 === 0) add('in', rnd(300000 + R() * 500000, 100000), 'UZS', D(12), 'Mom', 'family', cash);
    if (k % 2 === 1) add('in', rnd(100 + R() * 150, 10), 'USD', D(22), 'Online client', 'sidework', card, 'Translation job');
    if (k === 2) { add('in', 150, 'USD', D(3), 'Uncle Rustam', 'gift', cash, 'Birthday'); move(100, 'USD', cash, cash, D(24), 1270000, 'UZS', 'Exchange office'); }
    add('out', 1800000, 'UZS', D(2), 'Landlord', 'home', card, 'Rent');
    add('out', rnd(380000 + R() * 150000, 1000), 'UZS', D(10), '', 'bills', card, 'Gas, water, electricity');
    add('out', 99000, 'UZS', D(8), 'Mobile operator', 'phone', card);
    for (let w = 0; w < 4; w++) add('out', rnd(280000 + R() * 320000, 1000), 'UZS', D(3 + w * 7), 'Supermarket', 'groceries', w % 2 ? cash : card);
    for (let j = 0; j < 6; j++) add('out', rnd(15000 + R() * 45000, 1000), 'UZS', D(2 + Math.floor(R() * 26)), 'Taxi', 'transport', cash);
    for (let j = 0; j < 3; j++) add('out', rnd(90000 + R() * 220000, 1000), 'UZS', D(4 + Math.floor(R() * 24)), 'Café', 'eating', card);
    if (R() > 0.45) add('out', rnd(250000 + R() * 500000, 10000), 'UZS', D(15 + Math.floor(R() * 10)), '', 'clothes', card, 'Shoes');
    if (R() > 0.5) add('out', rnd(60000 + R() * 150000, 1000), 'UZS', D(1 + Math.floor(R() * 27)), 'Pharmacy', 'health', cash);
    if (R() > 0.4) add('out', rnd(100000 + R() * 200000, 1000), 'UZS', D(20 + Math.floor(R() * 7)), 'Cinema', 'fun', card);
    if (k % 2 === 0) add('out', rnd(20 + R() * 40, 1), 'USD', D(25), 'Online course', 'education', card);
  }
  const goals = [
    { id: uid(), name: 'New phone', icon: 'phone', target: 7000000, currency: 'UZS', deadline: iso(new Date(now.getFullYear(), now.getMonth() + 4, 0)), start: iso(addDays(now, -60)), createdAt: Date.now(), demo: true,
      contribs: [{ id: uid(), amount: 1500000, date: iso(addDays(now, -50)) }, { id: uid(), amount: 1200000, date: iso(addDays(now, -20)) }] },
    { id: uid(), name: 'Summer trip', icon: 'plane', target: 800, currency: 'USD', deadline: iso(new Date(now.getFullYear() + 1, 5, 1)), start: iso(addDays(now, -30)), createdAt: Date.now(), demo: true,
      contribs: [{ id: uid(), amount: 120, date: iso(addDays(now, -25)) }] },
  ];
  return { tx, goals };
}

// ================= Actions =================
Object.assign(ACTIONS, {
  add: () => openTx(),
  settings: () => openSettings(),
  range: (a, v) => { UI.range = v; render(); },
  hview: (a, v) => { UI.hView = v; render(true); },
  htype: (a, v) => { UI.hType = v; UI.hLimit = 150; render(); },
  hcur: (a, v) => { UI.hCur = UI.hCur === v ? 'all' : v; UI.hLimit = 150; render(); },
  hacc: (a, v) => { UI.hAcc = UI.hAcc === v ? 'all' : v; UI.hLimit = 150; render(); },
  hgroup: (a, v) => { UI.hGroup = UI.hGroup === v ? 'all' : v; UI.hLimit = 150; render(); },
  more: () => { UI.hLimit += 150; $('#hist-list').innerHTML = histList(); },
  period: (a, v) => { UI.period = v; UI.offset = 0; render(); },
  shift: (a, v) => { UI.offset = Math.min(0, UI.offset + Number(v)); render(); },

  // entries
  'edit-tx': (a, v, id) => {
    // Opened from inside a group or account sheet? Come back to it after saving.
    const b = a.closest('[data-back]');
    const back = !b ? null : b.dataset.back === 'group' ? backToGroup() : (() => { const x = accId; return () => openAccount(x); })();
    openTx(id, back ? { back } : {});
  },
  'new-transfer': () => openTx(null, { type: 'transfer' }),
  'tx-cancel': () => txDone(),
  'tx-type': (a, v) => {
    if (draft.type === v) return;
    draft.type = v;
    draft.category = null;
    if (v !== 'in') { draft.groupId = null; draft.studentId = null; }
    if (v === 'transfer' && draft.toAccount === draft.account) draft.toAccount = (S.accounts.find((x) => x.id !== draft.account) || S.accounts[0]).id;
    refreshSheet(txHtml(), mountTx);
  },
  'tx-cur': (a, v) => {
    const exch = draft.toCurrency !== draft.currency;
    draft.currency = v;
    draft.amount = roundCur(draft.amount, v);
    draft.toCurrency = exch ? OTHER[v] : v;
    refreshSheet(txHtml(), mountTx);
  },
  'tx-exch': (a, v) => { draft.toCurrency = v === 'other' ? OTHER[draft.currency] : draft.currency; refreshSheet(txHtml(), mountTx); },
  'pick-acc': (a, v) => { draft.account = v; pick(a, '.acc-pick'); },
  'pick-from': (a, v) => { draft.account = v; pick(a, '.acc-pick'); syncTx(); },
  'pick-to': (a, v) => { draft.toAccount = v; pick(a, '.acc-pick'); syncTx(); },
  'pick-cat': (a, v) => { draft.category = v; pick(a, '.cats'); },
  'pick-person': (a, v) => { draft.person = v; $('#person').value = v; pick(a, '.quick'); },
  'pick-group': (a, v) => {
    const g = grp(v);
    draft.groupId = g ? g.id : null;
    if (g) {
      if (!draft.amount && g.fee) { draft.amount = g.fee.amount; draft.currency = g.fee.currency; }
      if (!draft.category && S.cats.in.some((c) => c.id === 'lessons')) draft.category = 'lessons';
      if (!draft.forMonth) draft.forMonth = draft.date.slice(0, 7);
      if (!g.students.some((s) => s.id === draft.studentId)) draft.studentId = null;
    } else draft.studentId = null;
    refreshSheet(txHtml(), mountTx);
  },
  'pick-student': (a, v, id) => {
    const s = grp(draft.groupId) && grp(draft.groupId).students.find((x) => x.id === id);
    if (!s) return;
    draft.studentId = s.id; draft.person = s.name;
    $('#person').value = s.name;
    pick(a, '.quick');
  },
  'pick-month': (a, v) => { draft.forMonth = v; refreshSheet(txHtml(), mountTx); },
  'new-cat-inline': () => openCatForm(draft.type, null, reopenTx),
  'save-tx': () => saveTx(),
  'del-tx': () => {
    const removed = S.tx.find((t) => t.id === draft.id);
    if (!removed) return;
    const goalsBefore = JSON.parse(JSON.stringify(S.goals));
    S.tx = S.tx.filter((t) => t.id !== removed.id);
    // Deleting a "paid for a goal" expense gives the goal its money back.
    S.goals.forEach((g) => { const n = g.contribs.length; g.contribs = g.contribs.filter((c) => c.txId !== removed.id); if (g.contribs.length !== n) delete g.paid; });
    save(); txDone(); render();
    const cur = removed.type === 'in' ? removed.currency : null;
    if (cur && goalsShort(cur)) toast(`Entry deleted — goals now hold ${fmt(-freeMoney(cur), cur)} more than you have`, { label: 'Fix', run: () => fixGoals(cur) });
    else undoToast(removed.type === 'transfer' ? 'Transfer deleted' : 'Entry deleted', () => { S.tx.push(removed); S.goals = goalsBefore; });
  },

  // accounts
  account: (a, v, id) => openAccount(id),
  'new-account': () => openAccountForm(),
  'edit-account': (a, v, id) => openAccountForm(id),
  'acc-kind': (a, v) => { adraft.kind = v; pick(a, '.kinds'); $('#acc-preview').innerHTML = accIc(adraft, 'xl'); },
  'acc-color': (a, v) => { adraft.color = v; refreshSheet(accountFormHtml(), mountAccountForm); },
  'save-account': () => saveAccount(),
  'del-account': (a, v, id) => deleteAccount(id),
  'add-to-acc': (a, v, id) => openTx(null, { account: id, back: () => openAccount(id) }),
  'transfer-from': (a, v, id) => openTx(null, { type: 'transfer', account: id, back: () => openAccount(id) }),
  'acc-history': (a, v, id) => { UI.hView = 'entries'; UI.hAcc = id; UI.hType = 'all'; closeSheet(); goTab('history'); },

  // categories
  'open-cats': (a, v) => openCats(v),
  'cats-type': (a, v) => { catType = v; refreshSheet(catsHtml(), mountCats); },
  'edit-cat': (a, v, id) => openCatForm(catType, id, null),
  'new-cat': () => openCatForm(catType, null, null),
  'cat-cancel': () => catBack(),
  'cat-glyph': (a, v) => { cdraft.g = v; pick(a, '.glyph-grid'); $('#cat-preview').innerHTML = ic(cdraft.g, cdraft.c, 'xl'); },
  'cat-color': (a, v) => { cdraft.c = v; refreshSheet(catFormHtml(), mountCatForm); },
  'save-cat': () => saveCat(),
  'del-cat': () => deleteCat(),

  // goals
  'new-goal': () => openGoalForm(),
  goal: (a, v, id) => openGoal(id),
  'edit-goal': (a, v, id) => openGoalForm(id),
  'pick-icon': (a, v) => { gdraft.icon = v; pick(a, '.emojis'); },
  'goal-cur': (a, v) => {
    gdraft.currency = v;
    gdraft.target = roundCur(gdraft.target, v);
    gdraft.initial = roundCur(gdraft.initial, v);
    refreshSheet(goalFormHtml(), mountGoalForm);
  },
  'save-goal': () => saveGoal(),
  'del-goal': (a, v, id) => {
    const idx = S.goals.findIndex((g) => g.id === id);
    if (idx < 0) return;
    const removed = S.goals[idx];
    S.goals.splice(idx, 1);
    // Money moved from this goal into others stays there; its own money becomes free again.
    save(); closeSheet(); render();
    undoToast(goalSaved(removed) > 0 ? `Goal deleted — ${fmt(goalSaved(removed), removed.currency)} is free money again` : 'Goal deleted', () => S.goals.splice(Math.min(idx, S.goals.length), 0, removed));
  },
  'goal-move': (a, v) => openMove(Number(v)),
  'mv-set': (a, v) => { mv.amount = Number(v); const inp = $('#mv-amt'); if (inp) inp.value = shownAmount(mv.amount, goalById(mv.gid).currency); syncMove(sheet.sh); },
  'mv-src': (a, v) => { mv.sources = mv.sources.includes(v) ? mv.sources.filter((x) => x !== v) : [...mv.sources, v]; syncMove(sheet.sh); },
  'mv-dest': (a, v) => { mv.dest = v; pick(a, '.grp-pick'); syncMove(sheet.sh); },
  'mv-save': () => saveMove(),
  'goal-spend': () => {
    const g = goalById(gid);
    if (!g) return;
    openTx(null, { type: 'out', amount: goalSaved(g), currency: g.currency, note: g.name, goalSpend: g.id, back: () => openGoal(g.id) });
  },
  'goals-fix': (a, v) => fixGoals(v),
  'g-all-free': () => {
    gdraft.initial = Math.max(0, freeMoney(gdraft.currency));
    const inp = $('#g-init');
    if (inp) { inp.value = shownAmount(gdraft.initial, gdraft.currency); inp.dispatchEvent(new Event('input')); }
  },
  'del-contrib': (a, v, id) => {
    const g = S.goals.find((x) => x.id === gid);
    const c = g && g.contribs.find((x) => x.id === id);
    if (!c) return;
    const snapshot = JSON.parse(JSON.stringify(S.goals));
    // A move between goals has two halves — undoing one undoes both.
    S.goals.forEach((x) => { x.contribs = x.contribs.filter((k) => k.id !== id && !(c.pair && k.pair === c.pair)); });
    if (goalSaved(g) > 0 || c.txId) delete g.paid;
    save(); render(); refreshSheet(goalDetailHtml(), null);
    undoToast(c.pair ? 'Move undone in both goals' : 'Line removed', () => { S.goals = snapshot; if (sheet && gid) refreshSheet(goalDetailHtml(), null); });
  },

  // report
  report: (a, v) => openReport(v),
  'rep-month': (a, v) => { rep.ym = ymShift(rep.ym, Number(v)); refreshSheet(reportHtml(), null); },
  'rep-cur': (a, v) => { rep.cur = v; refreshSheet(reportHtml(), null); },
  'rep-share': (a) => { a.disabled = true; shareReport().finally(() => { a.disabled = false; }); },

  // settings
  'set-cur': (a, v) => { S.settings.currency = v; UI.cur = v; save(); render(); refreshSheet(settingsHtml(), mountSettings); },
  'set-theme': (a, v) => { S.settings.theme = v; save(); applyTheme(); refreshSheet(settingsHtml(), mountSettings); drawCharts(false); },
  'change-pin': () => setPinFlow((ok) => { if (ok) toast('Passcode changed'); }),
  export: () => exportBackup(),
  'share-backup': () => shareBackup(),
  import: () => $('#import-file').click(),
  'load-demo': async () => {
    if (S.tx.length && !(await ask({ title: 'Add demo data?', msg: 'Sample entries will be mixed in with yours. You can remove them later in Settings — your own entries stay.', ok: 'Add demo data' }))) return;
    const d = makeDemo();
    S.tx.push(...d.tx);
    S.goals.push(...d.goals);
    UI.cur = 'UZS';
    save(); render(true);
    if (sheet) refreshSheet(settingsHtml(), mountSettings);
    toast('Demo data loaded');
  },
  'clear-demo': async () => {
    if (!(await ask({ title: 'Remove demo data?', msg: 'Only the sample entries and goals are removed. Anything you added yourself stays.', ok: 'Remove demo data', destructive: true }))) return;
    S.tx = S.tx.filter((t) => !t.demo);
    S.goals = S.goals.filter((g) => !g.demo);
    save(); render();
    if (sheet) refreshSheet(settingsHtml(), mountSettings);
    toast('Demo data removed');
  },
  erase: async () => {
    if (!(await ask({ title: 'Erase all data?', msg: 'Every entry, account, group, goal, your schedule and settings on this phone will be deleted. This cannot be undone.', ok: 'Erase everything', destructive: true }))) return;
    S = blank(); save(); applyTheme(); UI.cur = 'UZS'; UI.hAcc = 'all'; UI.hGroup = 'all';
    closeSheet(); render(); toast('All data erased');
  },
});
$('#import-file').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (f) importBackupFile(f);
});
