'use strict';
(function () {
  // ================= Constants =================
  const KEY = 'budget-app-v1';
  const APP_VERSION = 2;
  const G = window.GLYPHS || {};
  const CUR = { UZS: { seg: "so'm" }, USD: { seg: '$' } };
  const OTHER = { UZS: 'USD', USD: 'UZS' };
  const unit = (cur) => (cur === 'UZS' ? "so'm" : '$');
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MON = MONTHS.map((m) => m.slice(0, 3));
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const TITLES = { home: 'Overview', history: 'History', stats: 'Stats', goals: 'Goals' };
  const NBSP = ' ';

  const CATS = {
    in: [
      { id: 'salary', name: 'Salary', g: 'briefcase', c: '#34C759' },
      { id: 'family', name: 'Family', g: 'family', c: '#FF9500' },
      { id: 'gift', name: 'Gift', g: 'gift', c: '#FF2D55' },
      { id: 'sidework', name: 'Side work', g: 'laptop', c: '#5856D6' },
      { id: 'business', name: 'Business', g: 'store', c: '#007AFF' },
      { id: 'refund', name: 'Refund', g: 'refund', c: '#30B0C7' },
      { id: 'debt', name: 'Debt repaid', g: 'usercheck', c: '#AF52DE' },
      { id: 'other_in', name: 'Other', g: 'coins', c: '#8E8E93' },
    ],
    out: [
      { id: 'groceries', name: 'Groceries', g: 'cart', c: '#34C759' },
      { id: 'eating', name: 'Eating out', g: 'utensils', c: '#FF9500' },
      { id: 'transport', name: 'Transport', g: 'car', c: '#00C7BE' },
      { id: 'home', name: 'Home & rent', g: 'house', c: '#007AFF' },
      { id: 'bills', name: 'Bills', g: 'bolt', c: '#F2B705' },
      { id: 'phone', name: 'Phone & net', g: 'phone', c: '#5AC8FA' },
      { id: 'clothes', name: 'Clothes', g: 'shirt', c: '#AF52DE' },
      { id: 'health', name: 'Health', g: 'pill', c: '#FF3B30' },
      { id: 'education', name: 'Education', g: 'gradcap', c: '#5856D6' },
      { id: 'fun', name: 'Fun', g: 'sparkles', c: '#FF2D55' },
      { id: 'gifts', name: 'Gifts', g: 'gift', c: '#FF6482' },
      { id: 'other_out', name: 'Other', g: 'box', c: '#8E8E93' },
    ],
  };
  const ACC_KINDS = [
    { id: 'cash', name: 'Cash', g: 'cash' },
    { id: 'card', name: 'Card', g: 'card' },
    { id: 'bank', name: 'Bank', g: 'bank' },
    { id: 'wallet', name: 'Wallet', g: 'wallet' },
    { id: 'savings', name: 'Savings', g: 'safe' },
  ];
  const SWATCHES = ['#34C759', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FF9500', '#00C7BE', '#8E8E93'];
  const GOAL_ICONS = [
    { id: 'target', c: '#FF3B30' }, { id: 'phone', c: '#007AFF' }, { id: 'laptop', c: '#5856D6' }, { id: 'car', c: '#00C7BE' },
    { id: 'plane', c: '#5AC8FA' }, { id: 'house', c: '#FF9500' }, { id: 'gradcap', c: '#AF52DE' }, { id: 'gem', c: '#FF2D55' },
    { id: 'gift', c: '#FF6482' }, { id: 'shield', c: '#34C759' }, { id: 'gamepad', c: '#64748B' }, { id: 'star', c: '#F2B705' },
  ];
  const EMOJI_TO_ICON = { '🎯': 'target', '📱': 'phone', '💻': 'laptop', '🚗': 'car', '✈️': 'plane', '🏠': 'house', '🎓': 'gradcap', '💍': 'gem', '🎁': 'gift', '🛡️': 'shield', '🎮': 'gamepad', '⭐': 'star' };
  const TRANSFER_C = '#64748B';
  const PEOPLE_COLORS = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#5AC8FA', '#5856D6', '#30B0C7'];

  // Interface chrome icons (tinted with the accent colour)
  const I = {
    settings: '<svg viewBox="0 0 24 24"><path d="M4 7h9M17.5 7H20M4 17h2.5M11 17h9"/><circle cx="15.2" cy="7" r="2.2"/><circle cx="8.8" cy="17" r="2.2"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="m14.5 6-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="m9.5 6 6 6-6 6"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
    inArrow: '<svg viewBox="0 0 24 24"><path d="M17 7 7 17M7 9v8h8"/></svg>',
    outArrow: '<svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path d="M9 5h11v14H9l-6-7z"/><path d="m12.5 9.5 5 5M17.5 9.5l-5 5"/></svg>',
  };

  // ================= Helpers =================
  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const pad2 = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const parseD = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const todayIso = () => iso(new Date());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / 864e5);
  const monthRange = (y, m) => [iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 1))];
  const groupDigits = (s, sep) => s.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  const ceilTo = (x, step) => Math.ceil(x / step) * step;
  const roundCur = (n, cur) => (cur === 'USD' ? Math.round(n * 100) / 100 : Math.round(n));
  const buzz = () => { try { navigator.vibrate && navigator.vibrate(12); } catch (e) { /* no haptics */ } };

  const ic = (g, c, cls = '') => `<span class="ic ${cls}" style="--c:${c}"><svg viewBox="0 0 24 24" aria-hidden="true">${G[g] || ''}</svg></span>`;
  const glyph = (g, cls = '') => `<svg class="gl ${cls}" viewBox="0 0 24 24" aria-hidden="true">${G[g] || ''}</svg>`;

  function fmt(n, cur, o = {}) {
    const neg = n < 0;
    const sign = o.sign ? (n > 0 ? '+' : neg ? '−' : '') : (neg ? '−' : '');
    const a = Math.abs(n);
    if (cur === 'USD') {
      const cents = Math.round(a * 100);
      let s = '$' + groupDigits(String(Math.floor(cents / 100)), ',');
      if (cents % 100 && !o.round) s += '.' + pad2(cents % 100);
      return sign + s;
    }
    return sign + groupDigits(String(Math.round(a)), NBSP) + (o.bare ? '' : NBSP + "so'm");
  }
  function compact(n, cur) {
    const a = Math.abs(n);
    const r1 = (x) => String(Math.round(x * 10) / 10);
    const s = a >= 1e9 ? r1(a / 1e9) + 'B' : a >= 1e6 ? r1(a / 1e6) + 'M' : a >= 1e3 ? r1(a / 1e3) + 'K' : r1(a);
    return (n < 0 ? '−' : '') + (cur === 'USD' ? '$' : '') + s;
  }
  const compactU = (n, cur) => compact(n, cur) + (cur === 'UZS' ? NBSP + "so'm" : '');

  // Live formatting for amount fields: spaces between thousands, "," or "." as decimal point.
  function typedAmount(raw, cur) {
    let v = String(raw).replace(/,/g, '.').replace(/[^\d.]/g, '');
    if (cur === 'UZS') v = v.replace(/\./g, '');
    else {
      const i = v.indexOf('.');
      if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '').slice(0, 2);
    }
    v = v.replace(/^0+(?=\d)/, '');
    const [w, f] = v.split('.');
    const shown = (w ? groupDigits(w, ' ') : f !== undefined ? '0' : '') + (f !== undefined ? '.' + f : '');
    return { shown, value: v && v !== '.' ? parseFloat(v) || 0 : 0 };
  }
  const shownAmount = (n, cur) => (n ? typedAmount(String(roundCur(n, cur)), cur).shown : '');
  function rateText(amount, cur, toAmount, toCur) {
    if (cur === toCur) return '';
    const usd = cur === 'USD' ? amount : toAmount;
    const uzs = cur === 'UZS' ? amount : toAmount;
    return usd > 0 && uzs > 0 ? `1 $ = ${fmt(uzs / usd, 'UZS')}` : '';
  }

  function dayLabel(s) {
    const t = new Date();
    if (s === iso(t)) return 'Today';
    if (s === iso(addDays(t, -1))) return 'Yesterday';
    const d = parseD(s);
    return `${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}${d.getFullYear() === t.getFullYear() ? '' : ' ' + d.getFullYear()}`;
  }
  const longDate = (s) => { const d = parseD(s); return `${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
  const medDate = (s) => { const d = parseD(s); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
  function daysLeftText(n) {
    if (n < 0) return `${-n} day${n === -1 ? '' : 's'} ago`;
    if (n === 0) return 'today';
    if (n === 1) return '1 day left';
    if (n > 60) return `${Math.round(n / 30.44)} months left`;
    return `${n} days left`;
  }
  function niceScale(lo, hi, n) {
    if (hi - lo < 1e-9) hi = lo + 1;
    const raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
    const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
    const nlo = Math.floor(lo / step + 1e-9) * step, nhi = Math.ceil(hi / step - 1e-9) * step;
    const ticks = [];
    for (let k = 0; nlo + k * step <= nhi + step / 2; k++) ticks.push(nlo + k * step);
    return { lo: nlo, hi: nhi, ticks };
  }

  // ================= Storage =================
  const defaultAccounts = () => [
    { id: 'cash', name: 'Cash', kind: 'cash', color: '#34C759', opening: { UZS: 0, USD: 0 } },
    { id: 'card', name: 'Card', kind: 'card', color: '#007AFF', opening: { UZS: 0, USD: 0 } },
  ];
  const blank = () => ({ v: APP_VERSION, accounts: defaultAccounts(), tx: [], goals: [], settings: { currency: 'UZS', rate: null, theme: 'system', pin: null, lastBackup: null } });
  const validTx = (t) => t && t.id && typeof t.amount === 'number' && t.amount > 0 && CUR[t.currency] && /^\d{4}-\d{2}-\d{2}$/.test(t.date)
    && (t.type === 'in' || t.type === 'out' || (t.type === 'transfer' && CUR[t.toCurrency] && typeof t.toAmount === 'number'));
  function normAccount(a) {
    const o = a.opening || {};
    return {
      id: String(a.id),
      name: String(a.name || 'Account').slice(0, 40),
      kind: ACC_KINDS.some((k) => k.id === a.kind) ? a.kind : 'wallet',
      color: SWATCHES.includes(a.color) ? a.color : '#8E8E93',
      opening: { UZS: Number(o.UZS) || 0, USD: Number(o.USD) || 0 },
    };
  }
  function normalize(d) {
    const b = blank();
    if (!d || typeof d !== 'object') return b;
    let accounts = Array.isArray(d.accounts) ? d.accounts.filter((a) => a && a.id).map(normAccount) : [];
    if (!accounts.length) accounts = defaultAccounts();
    const ids = new Set(accounts.map((a) => a.id));
    const first = accounts[0].id;
    const tx = (Array.isArray(d.tx) ? d.tx : []).filter(validTx).map((t) => {
      const r = { ...t };
      if (!ids.has(r.account)) r.account = first;           // entries from version 1 had no account
      if (r.type === 'transfer' && !ids.has(r.toAccount)) r.toAccount = first;
      return r;
    });
    const goals = (Array.isArray(d.goals) ? d.goals : []).filter((g) => g && g.id && g.name && CUR[g.currency]).map((g) => ({
      ...g,
      icon: G[g.icon] ? g.icon : EMOJI_TO_ICON[g.emoji] || 'target',
      contribs: Array.isArray(g.contribs) ? g.contribs : [],
    }));
    return { v: APP_VERSION, accounts, tx, goals, settings: Object.assign(b.settings, d.settings || {}) };
  }
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) { /* fall through */ }
    return blank();
  }
  let S = load();
  let persistAsked = false;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('⚠️ Could not save on this device'); }
    if (!persistAsked && navigator.storage && navigator.storage.persist) { persistAsked = true; navigator.storage.persist().catch(() => {}); }
  }

  // ================= Derived data =================
  const cat = (type, id) => CATS[type].find((c) => c.id === id) || CATS[type][CATS[type].length - 1];
  const acc = (id) => S.accounts.find((a) => a.id === id) || S.accounts[0];
  const accKind = (a) => ACC_KINDS.find((k) => k.id === a.kind) || ACC_KINDS[3];
  const accIc = (a, cls = '') => ic(accKind(a).g, a.color, cls);
  const goalIcon = (g) => GOAL_ICONS.find((x) => x.id === g.icon) || GOAL_ICONS[0];
  const sortTx = (a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0);

  // How an entry changes the total amount of one currency (transfers only matter when they exchange).
  function delta(t, cur) {
    if (t.type === 'in') return t.currency === cur ? t.amount : 0;
    if (t.type === 'out') return t.currency === cur ? -t.amount : 0;
    return (t.currency === cur ? -t.amount : 0) + (t.toCurrency === cur ? t.toAmount : 0);
  }
  function accDelta(t, id, cur) {
    let v = 0;
    if (t.account === id && t.currency === cur) v += t.type === 'in' ? t.amount : -t.amount;
    if (t.type === 'transfer' && t.toAccount === id && t.toCurrency === cur) v += t.toAmount;
    return v;
  }
  const openingTotal = (cur) => S.accounts.reduce((a, x) => a + (x.opening[cur] || 0), 0);
  const balance = (cur) => S.tx.reduce((a, t) => a + delta(t, cur), openingTotal(cur));
  const accBalance = (id, cur) => S.tx.reduce((a, t) => a + accDelta(t, id, cur), acc(id).opening[cur] || 0);
  const usesCur = (cur) => S.tx.some((t) => t.currency === cur || (t.type === 'transfer' && t.toCurrency === cur)) || S.accounts.some((a) => a.opening[cur]);
  function totals(cur, from, to) {
    let i = 0, o = 0;
    for (const t of S.tx) {
      if (t.currency !== cur || t.date < from || t.date >= to) continue;
      if (t.type === 'in') i += t.amount;
      else if (t.type === 'out') o += t.amount;
    }
    return { in: i, out: o };
  }
  const goalSaved = (g) => g.contribs.reduce((a, c) => a + c.amount, 0);
  const savedInGoals = (cur) => S.goals.filter((g) => g.currency === cur).reduce((a, g) => a + goalSaved(g), 0);
  const hasDemo = () => S.tx.some((t) => t.demo) || S.goals.some((g) => g.demo);
  const hasAnything = () => S.tx.length > 0 || S.accounts.some((a) => a.opening.UZS || a.opening.USD);

  function topPeople(type) {
    const m = new Map();
    for (const t of S.tx) {
      const p = (t.person || '').trim();
      if (t.type === type && p) m.set(p, (m.get(p) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map((e) => e[0]);
  }
  function personColor(name) {
    let h = 0;
    for (const ch of name.toLowerCase()) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return PEOPLE_COLORS[h % PEOPLE_COLORS.length];
  }

  function goalStats(g) {
    const saved = goalSaved(g), cur = g.currency;
    const left = Math.max(0, g.target - saved);
    const pct = g.target > 0 ? clamp((saved / g.target) * 100, 0, 100) : 0;
    const today = todayIso();
    const daysLeft = daysBetween(today, g.deadline);
    const step = cur === 'UZS' ? 1000 : 1;
    let pace, status;
    if (saved >= g.target) { pace = 'You reached this goal 🎉'; status = ['good', '✓ Reached']; }
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
    const da = goalSaved(a) >= a.target, db = goalSaved(b) >= b.target;
    return da - db || a.deadline.localeCompare(b.deadline);
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
      return { from, to, title: `${MONTHS[start.getMonth()]} ${start.getFullYear()}`, groups, chartTitle: '6 months up to ' + MONTHS[start.getMonth()] };
    }
    const y = now.getFullYear() + offset;
    const groups = [];
    for (let m = 0; m < 12; m++) {
      const [from, to] = monthRange(y, m);
      groups.push({ label: MON[m], from, to, full: `${MONTHS[m]} ${y}`, cur: y === now.getFullYear() && m === now.getMonth() });
    }
    return { from: `${y}-01-01`, to: `${y + 1}-01-01`, title: String(y), groups, chartTitle: 'Month by month', small: true };
  }

  function breakdown(type, cur, from, to) {
    const map = new Map();
    for (const t of S.tx) {
      if (t.type !== type || t.currency !== cur || t.date < from || t.date >= to) continue;
      const c = cat(type, t.category);
      let key, name, tile;
      if (type === 'out') { key = c.id; name = c.name; tile = ic(c.g, c.c); }
      else {
        const p = (t.person || '').trim();
        if (p) { key = 'p:' + p.toLowerCase(); name = p; tile = `<span class="ic letter" style="--c:${personColor(p)}">${esc([...p][0].toUpperCase())}</span>`; }
        else { key = 'c:' + c.id; name = c.name; tile = ic(c.g, c.c); }
      }
      const e = map.get(key) || { name, tile, v: 0 };
      e.v += t.amount;
      map.set(key, e);
    }
    let arr = [...map.values()].sort((a, b) => b.v - a.v);
    if (arr.length > 7) {
      const rest = arr.slice(6);
      arr = arr.slice(0, 6);
      arr.push({ name: `${rest.length} more`, tile: '<span class="ic letter" style="--c:#8E8E93">•••</span>', v: rest.reduce((a, r) => a + r.v, 0) });
    }
    return arr;
  }

  // ================= UI state =================
  const UI = {
    tab: 'home', cur: S.settings.currency, range: '3M',
    hType: 'all', hCur: 'all', hAcc: 'all', q: '', hLimit: 150,
    period: 'month', offset: 0,
    lastType: 'in', lastAcc: { in: null, out: null },
  };

  // ================= Small components =================
  function segButtons(act, items, current) {
    return items.map(([v, label]) => `<button data-act="${act}" data-v="${v}" class="${current === v ? 'on' : ''}">${label}</button>`).join('');
  }
  const curItems = [['UZS', "so'm"], ['USD', '$']];
  const curSeg = () => `<div class="seg sm">${segButtons('cur', curItems, UI.cur)}</div>`;

  function ring(pct, size, stroke, inner, done) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - clamp(pct, 0, 100) / 100);
    return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${done ? 'color-mix(in srgb, var(--good) 18%, transparent)' : 'var(--accent-soft)'}" stroke-width="${stroke}"/>${pct > 0 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${done ? 'var(--good)' : 'var(--accent)'}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"/>` : ''}</svg><div class="ring-txt">${inner}</div></div>`;
  }

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
      tile = ic(c.g, c.c);
      title = t.person || c.name;
      if (t.person) parts.push(c.name);
      if (S.accounts.length > 1 && !inAccount) parts.push(acc(t.account).name);
      amt = `<div class="row-amt num ${t.type}">${fmt(t.type === 'in' ? t.amount : -t.amount, t.currency, { sign: true })}</div>`;
    }
    if (t.note) parts.push(t.note);
    if (showDate) parts.push(dayLabel(t.date));
    return `<button class="row" data-act="edit-tx" data-id="${t.id}">${tile}
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

  // ================= Pages =================
  function renderHome() {
    const now = new Date();
    const cur = UI.cur, other = OTHER[cur];
    let h = `<header class="lt"><div><div class="eyebrow">${DOW_LONG[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}</div><h1>Overview</h1></div>
      <div class="lt-right">${hasAnything() ? curSeg() : ''}<button class="icon-btn" data-act="settings" aria-label="Settings">${I.settings}</button></div></header>`;

    if (hasDemo()) {
      h += `<button class="banner demo" data-act="clear-demo">${ic('flask', '#F2B705', 'sm')}<div><b>You're looking at demo data</b><span class="s">Tap here to remove it when you're ready to start.</span></div></button>`;
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
      const heroNum = cur === 'UZS' ? `${fmt(bal, cur, { bare: true })}<small>so'm</small>` : fmt(bal, cur);
      h += `<section class="card">
        <div class="label">Total balance</div>
        <div class="hero">${heroNum}</div>
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

    if (S.tx.length) {
      const [mFrom, mTo] = monthRange(now.getFullYear(), now.getMonth());
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const [pFrom, pTo] = monthRange(prev.getFullYear(), prev.getMonth());
      const tm = totals(cur, mFrom, mTo), lm = totals(cur, pFrom, pTo);
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

  function renderHistory() {
    const chip = (act, v, label, on) => `<button class="fchip ${on ? 'on' : ''}" data-act="${act}" data-v="${v}">${label}</button>`;
    return `<header class="lt"><h1>History</h1></header>
      <div class="search">${glyph('search')}<input id="q" type="search" placeholder="Search names, notes, amounts" value="${esc(UI.q)}" autocomplete="off" enterkeyhint="search"></div>
      <div class="seg full" style="margin-top:12px">${segButtons('htype', [['all', 'All'], ['in', 'In'], ['out', 'Out'], ['transfer', 'Transfers']], UI.hType)}</div>
      <div class="fchips">${curItems.map(([v, l]) => chip('hcur', v, l, UI.hCur === v)).join('')}<span class="fsep"></span>${S.accounts.map((a) => chip('hacc', a.id, esc(a.name), UI.hAcc === a.id)).join('')}</div>
      <div id="hist-list">${histList()}</div>`;
  }

  function histList() {
    if (!S.tx.length) return emptyWelcome();
    const q = UI.q.trim().toLowerCase().replace(/ /g, ' ');
    const qd = q.replace(/[\s,]/g, '');
    let list = S.tx.filter((t) => (UI.hType === 'all' || t.type === UI.hType)
      && (UI.hCur === 'all' || t.currency === UI.hCur || (t.type === 'transfer' && t.toCurrency === UI.hCur))
      && (UI.hAcc === 'all' || t.account === UI.hAcc || (t.type === 'transfer' && t.toAccount === UI.hAcc)));
    if (q) {
      list = list.filter((t) => {
        const names = t.type === 'transfer' ? [acc(t.account).name, acc(t.toAccount).name, 'transfer exchange'] : [cat(t.type, t.category).name, acc(t.account).name];
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

    const brk = (type, title, emptyMsg) => {
      const arr = breakdown(type, cur, info.from, info.to);
      const total = arr.reduce((a, r) => a + r.v, 0);
      let body;
      if (!arr.length) body = `<p class="card-sub" style="margin:10px 0 2px">${emptyMsg}</p>`;
      else {
        const max = arr[0].v;
        body = arr.map((r) => `<div class="brk">${r.tile}<div class="brk-main">
            <div class="brk-top"><span class="n">${esc(r.name)}</span><span class="a num">${fmt(r.v, cur)}</span></div>
            <div class="brk-bar"><i class="${type}" style="width:${Math.max(1.5, (r.v / max) * 80).toFixed(1)}%"></i><span>${Math.round((r.v / total) * 100)}%</span></div>
          </div></div>`).join('');
      }
      return `<section class="card"><div class="card-title">${title}</div>${body}</section>`;
    };
    h += brk('out', 'Where the money went', 'No spending in this period.');
    h += brk('in', 'Where the money came from', 'No money came in during this period.');
    return h;
  }

  function renderGoals() {
    let h = `<header class="lt"><h1>Goals</h1><div class="lt-right"><button class="icon-btn solid" data-act="new-goal" aria-label="New goal">${I.plus}</button></div></header>`;
    if (!S.goals.length) {
      return h + `<section class="card empty"><div class="big">${ic('target', '#FF3B30', 'xl')}</div><h3>No goals yet</h3><p>Choose something to save for, the amount and the date. The app tells you how much to put aside each month to get there.</p><button class="btn" data-act="new-goal">Create a goal</button></section>`;
    }
    const sums = ['UZS', 'USD'].map((c) => {
      const gs = S.goals.filter((g) => g.currency === c);
      if (!gs.length) return '';
      return `<b class="num">${fmt(gs.reduce((a, g) => a + goalSaved(g), 0), c)}</b> of ${fmt(gs.reduce((a, g) => a + g.target, 0), c)}`;
    }).filter(Boolean);
    h += `<p class="hint" style="margin:-6px 4px 14px;font-size:14px">Saved so far: ${sums.join(' · ')}</p><div class="stack">`;
    for (const g of [...S.goals].sort(goalSort)) {
      const st = goalStats(g), gi = goalIcon(g);
      h += `<button class="card goal-card" data-act="goal" data-id="${g.id}">
        <div class="gc-top">
          ${ic(gi.id, gi.c)}
          <div class="row-main"><div class="gc-name">${esc(g.name)}</div><div class="gc-date">by ${medDate(g.deadline)} · ${daysLeftText(st.daysLeft)}</div></div>
          <span class="chip ${st.status[0]}">${st.status[1]}</span>
        </div>
        <div class="meter ${st.pct >= 100 ? 'done' : ''}"><i style="width:${st.pct.toFixed(1)}%"></i></div>
        <div class="gc-nums"><span><b class="num">${fmt(st.saved, g.currency)}</b> <span class="muted">of ${fmt(g.target, g.currency)}</span></span><span class="muted num">${Math.floor(st.pct)}%</span></div>
        <div class="gc-pace">${glyph('calendar')}<span>${st.pace}</span></div>
      </button>`;
    }
    return h + '</div>';
  }

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

  function drawBalance(el) {
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
    el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Balance over time">
      ${s}
      <path d="${area}" fill="var(--accent)" fill-opacity=".1"/>
      <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${x(last).toFixed(1)}" cy="${y(pts[last].v).toFixed(1)}" r="4" fill="var(--accent)" stroke="var(--card)" stroke-width="2"/>
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

  function colPath(x, w, top, base, fill) {
    let h = base - top;
    if (h <= 0) return '';
    if (h < 2) { h = 2; top = base - 2; }
    const r = Math.min(4, w / 2, h);
    return `<path d="M${x.toFixed(1)},${base.toFixed(1)}V${(top + r).toFixed(1)}A${r},${r} 0 0 1 ${(x + r).toFixed(1)},${top.toFixed(1)}H${(x + w - r).toFixed(1)}A${r},${r} 0 0 1 ${(x + w).toFixed(1)},${(top + r).toFixed(1)}V${base.toFixed(1)}Z" fill="${fill}"/>`;
  }

  function drawColumns(el) {
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
    let s = `<rect class="band-hl" y="${padT - 4}" width="${band.toFixed(1)}" height="${(ph + 24).toFixed(1)}" rx="8" fill="var(--fill)" style="display:none"/>`;
    for (const t of ticks) {
      const yy = y(t).toFixed(1);
      s += `<line x1="${padL}" x2="${W - padR + 4}" y1="${yy}" y2="${yy}" stroke="var(${t === 0 ? '--axis' : '--grid'})" stroke-width="1"/>`;
      s += `<text x="${W - padR + 9}" y="${yy}" dy=".35em">${maxV ? (t === 0 ? '0' : compact(t, cur)) : ''}</text>`;
    }
    groups.forEach((g, i) => {
      const cx = padL + band * i + band / 2;
      s += colPath(cx - 1 - bw, bw, y(g.in), base, 'var(--in)');
      s += colPath(cx + 1, bw, y(g.out), base, 'var(--out)');
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

  // ================= Render & navigation =================
  function render(animate) {
    const v = $('#view');
    v.innerHTML = UI.tab === 'home' ? renderHome() : UI.tab === 'history' ? renderHistory() : UI.tab === 'stats' ? renderStats() : renderGoals();
    if (animate) { v.style.animation = 'none'; void v.offsetWidth; v.style.animation = ''; }
    document.querySelectorAll('.tabbar [data-tab]').forEach((b) => {
      const on = b.dataset.tab === UI.tab;
      b.classList.toggle('on', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    $('#topbar-title').textContent = TITLES[UI.tab];
    if (UI.tab === 'history') {
      const q = $('#q');
      q.addEventListener('input', () => { UI.q = q.value; UI.hLimit = 150; $('#hist-list').innerHTML = histList(); });
    }
    drawCharts();
  }
  function drawCharts() {
    const b = $('#bal-chart'); if (b) drawBalance(b);
    const c = $('#col-chart'); if (c) drawColumns(c);
  }

  let pushedTab = false;
  function goTab(tab) {
    if (tab === UI.tab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (UI.tab === 'home') { history.pushState({ tab }, ''); pushedTab = true; }
    else if (tab === 'home' && pushedTab) { history.back(); return; }
    else history.replaceState({ tab }, '');
    UI.tab = tab;
    window.scrollTo(0, 0);
    render(true);
  }
  window.addEventListener('popstate', (e) => {
    const st = e.state || {};
    if (sheet && !st.sheet) closeSheetNow();
    const tab = st.tab || 'home';
    if (tab === 'home') pushedTab = false;
    if (tab !== UI.tab) { UI.tab = tab; window.scrollTo(0, 0); render(true); }
  });

  // ================= Sheets =================
  let sheet = null;
  let pendingReload = false;
  function sheetHead(title, left, right) {
    return `<div class="sheet-grab"><i></i></div><div class="sheet-head"><div class="l">${left || ''}</div><h3>${title}</h3><div class="r">${right || ''}</div></div>`;
  }
  function openSheet(html, mount) {
    if (sheet) {
      sheet.sh.innerHTML = html;
      enableDrag(sheet.sh);
      mount && mount(sheet.sh);
      const b = $('.sheet-body', sheet.sh);
      if (b) b.scrollTop = 0;
      return;
    }
    const root = $('#sheet-root');
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.dataset.act = 'close-sheet';
    const sh = document.createElement('div');
    sh.className = 'sheet';
    sh.setAttribute('role', 'dialog');
    sh.setAttribute('aria-modal', 'true');
    sh.innerHTML = html;
    root.append(ov, sh);
    sheet = { ov, sh };
    requestAnimationFrame(() => requestAnimationFrame(() => { ov.classList.add('show'); sh.classList.add('show'); }));
    history.pushState({ tab: UI.tab, sheet: true }, '');
    document.body.style.overflow = 'hidden';
    enableDrag(sh);
    mount && mount(sh);
  }
  function refreshSheet(html, mount) {
    if (!sheet) return;
    const b = $('.sheet-body', sheet.sh), top = b ? b.scrollTop : 0;
    sheet.sh.innerHTML = html;
    enableDrag(sheet.sh);
    mount && mount(sheet.sh);
    const nb = $('.sheet-body', sheet.sh);
    if (nb) nb.scrollTop = top;
  }
  function closeSheet() {
    if (!sheet) return;
    if (history.state && history.state.sheet) history.back();
    else closeSheetNow();
  }
  function closeSheetNow() {
    if (!sheet) return;
    const { ov, sh } = sheet;
    sheet = null;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    sh.classList.remove('dragging');
    sh.style.transform = '';
    ov.classList.remove('show');
    sh.classList.remove('show');
    document.body.style.overflow = '';
    setTimeout(() => { ov.remove(); sh.remove(); if (pendingReload) location.reload(); }, 450);
  }
  function enableDrag(sh) {
    let startY = null, dy = 0;
    const down = (e) => {
      if (e.target.closest('button, input')) return;
      startY = e.clientY; dy = 0;
      sh.classList.add('dragging');
      e.currentTarget.setPointerCapture(e.pointerId);
    };
    const move = (e) => { if (startY === null) return; dy = Math.max(0, e.clientY - startY); sh.style.transform = `translateY(${dy}px)`; };
    const up = () => {
      if (startY === null) return;
      startY = null;
      sh.classList.remove('dragging');
      if (dy > 110) closeSheet(); else sh.style.transform = '';
    };
    sh.querySelectorAll('.sheet-grab, .sheet-head').forEach((h) => {
      h.addEventListener('pointerdown', down);
      h.addEventListener('pointermove', move);
      h.addEventListener('pointerup', up);
      h.addEventListener('pointercancel', up);
    });
  }
  const blurOnEnter = (sh) => sh.querySelectorAll('input').forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') i.blur(); }));

  // ---------- Add / edit entry ----------
  let draft = null;
  let syncTx = () => {};
  function openTx(id, preset = {}) {
    const t = id ? S.tx.find((x) => x.id === id) : null;
    if (t) draft = { ...t };
    else {
      const type = preset.type || UI.lastType;
      const from = preset.account || (type !== 'transfer' && UI.lastAcc[type]) || S.accounts[0].id;
      const to = (S.accounts.find((a) => a.id !== from) || S.accounts[0]).id;
      draft = { id: null, type, amount: 0, currency: UI.cur, account: from, toAccount: to, toAmount: 0, toCurrency: UI.cur, person: '', category: null, date: todayIso(), note: '' };
    }
    if (!S.accounts.some((a) => a.id === draft.account)) draft.account = S.accounts[0].id;
    if (!draft.toCurrency) draft.toCurrency = draft.currency;
    if (!draft.toAccount) draft.toAccount = (S.accounts.find((a) => a.id !== draft.account) || S.accounts[0]).id;
    openSheet(txHtml(), mountTx);
  }
  function draftOk(d) {
    if (!(d.amount > 0)) return false;
    if (d.type !== 'transfer') return true;
    if (d.toCurrency !== d.currency) return d.toAmount > 0;
    return d.account !== d.toAccount;
  }
  function txHtml() {
    const d = draft, editing = !!d.id, isIn = d.type === 'in', isTr = d.type === 'transfer';
    const ok = draftOk(d);
    const exch = d.toCurrency !== d.currency;
    const title = editing ? (isTr ? 'Edit transfer' : 'Edit entry') : isTr ? 'New transfer' : 'New entry';
    let body = '';
    if (!isTr) {
      const people = topPeople(d.type);
      body = `
      <div class="form-label">${isIn ? 'Money went to' : 'Paid from'}</div>
      ${accPicker('pick-acc', d.account)}
      <div class="form-label">${isIn ? 'Who gave it' : 'Paid to'}</div>
      <div class="group"><label class="field"><input id="person" style="text-align:left" placeholder="${isIn ? 'e.g. Mom, Employer' : 'e.g. Supermarket, Taxi (optional)'}" value="${esc(d.person)}" autocomplete="off" enterkeyhint="done"></label></div>
      ${people.length ? `<div class="quick">${people.map((p) => `<button data-act="pick-person" data-v="${esc(p)}" class="${p === d.person ? 'on' : ''}">${esc(p)}</button>`).join('')}</div>` : ''}
      <div class="form-label">Category</div>
      <div class="cats">${CATS[d.type].map((c) => `<button class="cat ${d.category === c.id ? 'on' : ''}" data-act="pick-cat" data-v="${c.id}">${ic(c.g, c.c, 'lg')}<span>${c.name}</span></button>`).join('')}</div>`;
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
    return sheetHead(title, '<button data-act="close-sheet">Cancel</button>', `<button data-act="save-tx" ${ok ? '' : 'disabled'}>Save</button>`) + `
    <div class="sheet-body">
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
      sh.querySelectorAll('.quick button').forEach((b) => b.classList.toggle('on', b.dataset.v === draft.person));
    });
    const toAmt = $('#to-amt', sh);
    if (toAmt) toAmt.addEventListener('input', () => { const r = typedAmount(toAmt.value, draft.toCurrency); toAmt.value = r.shown; draft.toAmount = r.value; syncTx(); });
    $('#date', sh).addEventListener('change', (e) => { draft.date = e.target.value || todayIso(); });
    $('#note', sh).addEventListener('input', (e) => { draft.note = e.target.value; });
    blurOnEnter(sh);
    syncTx();
    if (!draft.id && !draft.amount) setTimeout(() => amt.focus({ preventScroll: true }), 420);
  }
  function saveTx() {
    const d = draft;
    if (!draftOk(d)) return;
    const base = { id: d.id || uid(), type: d.type, amount: roundCur(d.amount, d.currency), currency: d.currency, account: d.account, date: d.date || todayIso(), note: (d.note || '').trim(), createdAt: d.createdAt || Date.now() };
    let rec;
    if (d.type === 'transfer') {
      const exch = d.toCurrency !== d.currency;
      rec = { ...base, toAccount: d.toAccount, toCurrency: d.toCurrency, toAmount: exch ? roundCur(d.toAmount, d.toCurrency) : base.amount };
    } else {
      rec = { ...base, person: (d.person || '').trim(), category: d.category || CATS[d.type][CATS[d.type].length - 1].id };
      UI.lastType = d.type;
      UI.lastAcc[d.type] = d.account;
    }
    if (d.demo) rec.demo = true;
    const i = S.tx.findIndex((t) => t.id === rec.id);
    if (i >= 0) S.tx[i] = rec; else S.tx.push(rec);
    if (rec.type !== 'transfer') UI.cur = rec.currency;
    save();
    buzz();
    closeSheet();
    render();
    if (i >= 0) toast('Changes saved');
    else if (rec.type === 'transfer' && rec.toCurrency !== rec.currency) toast(`Exchanged ${fmt(rec.amount, rec.currency)} → ${fmt(rec.toAmount, rec.toCurrency)}`);
    else if (rec.type === 'transfer') toast(`Moved ${fmt(rec.amount, rec.currency)} · ${acc(rec.account).name} → ${acc(rec.toAccount).name}`);
    else toast(`${rec.type === 'in' ? 'Money in' : 'Money out'} · ${fmt(rec.amount, rec.currency)}`);
  }

  // ---------- Accounts ----------
  let accId = null;
  function openAccount(id) { accId = id; openSheet(accountHtml(), null); }
  function accountHtml() {
    const a = acc(accId);
    const list = S.tx.filter((t) => t.account === a.id || (t.type === 'transfer' && t.toAccount === a.id)).sort(sortTx);
    const bal = (c) => accBalance(a.id, c);
    const lines = ['UZS', 'USD'].filter((c) => bal(c) || c === UI.cur);
    return sheetHead('', `<button data-act="edit-account" data-id="${a.id}">Edit</button>`, '<button data-act="close-sheet">Done</button>') + `
    <div class="sheet-body">
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
      <div class="swatches">${SWATCHES.map((c) => `<button class="${d.color === c ? 'on' : ''}" data-act="acc-color" data-v="${c}" style="--c:${c}" aria-label="Colour ${c}"></button>`).join('')}</div>
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

  // ---------- Goals ----------
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
        ${editing ? '' : `<label class="row field"><span>Already saved</span><input id="g-init" inputmode="decimal" placeholder="0 (optional)" value="${shownAmount(d.initial, d.currency)}" autocomplete="off"></label>`}
      </div>
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
      const ok = d.name.trim() && d.target > 0 && d.deadline;
      sh.querySelectorAll('[data-act="save-goal"]').forEach((b) => { b.disabled = !ok; });
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
      if (d.initial > 0) g.contribs.push({ id: uid(), amount: roundCur(d.initial, d.currency), date: todayIso() });
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
    const contribs = [...g.contribs].sort((a, b) => b.date.localeCompare(a.date));
    return sheetHead('', `<button data-act="edit-goal" data-id="${g.id}">Edit</button>`, '<button data-act="close-sheet">Done</button>') + `
    <div class="sheet-body">
      <div class="gd-hero">
        ${ring(st.pct, 136, 12, `<div><span style="color:${gi.c}">${glyph(gi.id, 'big')}</span><div style="font-size:16px;font-weight:700;margin-top:4px">${Math.floor(st.pct)}%</div></div>`, done)}
        <div class="gd-name">${esc(g.name)}</div>
        <div class="gd-amt"><b class="num">${fmt(st.saved, cur)}</b> of ${fmt(g.target, cur)}</div>
        <div style="margin-top:10px"><span class="chip ${st.status[0]}">${st.status[1]}</span></div>
      </div>
      <div class="group plain" style="margin-top:20px">
        <div class="row"><div class="row-main">Still needed</div><div class="row-amt num">${fmt(st.left, cur)}</div></div>
        <div class="row"><div class="row-main">Deadline</div><div class="row-amt" style="font-weight:500">${medDate(g.deadline)}<small>${daysLeftText(st.daysLeft)}</small></div></div>
        <div class="row gc-pace" style="border:0;margin:0;padding-top:10px">${glyph('calendar')}<div class="row-main" style="white-space:normal">${st.pace}</div></div>
      </div>
      <div class="btn-row" style="margin-top:14px">
        <button class="btn" data-act="goal-add-open" data-v="1">＋ Add money</button>
        <button class="btn grey" data-act="goal-add-open" data-v="-1" ${st.saved > 0 ? '' : 'disabled'}>Take out</button>
      </div>
      <div id="goal-inline"></div>
      <div class="form-label">History</div>
      ${contribs.length ? `<div class="group plain">${contribs.map((c) => `<button class="row" data-act="del-contrib" data-id="${c.id}"><div class="row-main"><div class="row-title">${c.amount >= 0 ? 'Added' : 'Taken out'}</div><div class="row-sub">${dayLabel(c.date)}</div></div><div class="row-amt num ${c.amount >= 0 ? 'in' : ''}">${fmt(c.amount, cur, { sign: true })}</div></button>`).join('')}</div>
        <p class="hint">Tap a line to remove it.</p>` : '<p class="hint">Nothing added yet. Use “Add money” whenever you put some aside.</p>'}
      <p class="hint" style="margin-top:16px">Money in goals is shown as “In goals” on the Overview and is no longer counted as free to spend. Your balance stays the same.</p>
    </div>`;
  }
  function showGoalInline(dir) {
    const g = S.goals.find((x) => x.id === gid);
    const box = $('#goal-inline');
    if (!g || !box) return;
    box.innerHTML = `<div class="inline-add"><input id="g-amt" inputmode="decimal" placeholder="${dir > 0 ? 'Amount to add' : 'Amount to take out'} (${unit(g.currency)})" autocomplete="off" enterkeyhint="done"><button class="btn" data-act="goal-add-save" data-v="${dir}">${dir > 0 ? 'Add' : 'Take out'}</button></div>`;
    const inp = $('#g-amt', box);
    inp.addEventListener('input', () => { inp.value = typedAmount(inp.value, g.currency).shown; });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') goalAddSave(dir); });
    inp.focus();
  }
  function goalAddSave(dir) {
    const g = S.goals.find((x) => x.id === gid);
    const inp = $('#g-amt');
    if (!g || !inp) return;
    let v = typedAmount(inp.value, g.currency).value;
    if (!(v > 0)) { inp.focus(); return; }
    if (dir < 0) v = Math.min(v, goalSaved(g));
    const before = goalSaved(g) >= g.target;
    g.contribs.push({ id: uid(), amount: dir * roundCur(v, g.currency), date: todayIso() });
    save(); buzz(); render();
    refreshSheet(goalDetailHtml(), null);
    toast(!before && goalSaved(g) >= g.target ? '🎉 Goal reached!' : dir > 0 ? `Added ${fmt(v, g.currency)}` : `Took out ${fmt(v, g.currency)}`);
  }

  // ---------- Settings ----------
  const canShareFiles = (() => {
    try { return !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.txt', { type: 'text/plain' })] })); } catch (e) { return false; }
  })();
  function openSettings() { openSheet(settingsHtml(), mountSettings); }
  function settingsHtml() {
    const s = S.settings;
    const lb = s.lastBackup;
    const ago = lb ? (() => { const d = Math.floor((Date.now() - lb) / 864e5); return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`; })() : 'never';
    const action = (act, label, color = 'var(--accent)', extra = '') => `<button class="row field" data-act="${act}" ${extra}><span style="flex:1;color:${color}">${label}</span></button>`;
    return sheetHead('Settings', '', '<button data-act="close-sheet">Done</button>') + `
    <div class="sheet-body">
      <div class="form-label" style="margin-top:6px">Accounts</div>
      <div class="group">
        ${S.accounts.map((a) => `<button class="row" data-act="edit-account" data-id="${a.id}">${accIc(a, 'sm')}<div class="row-main"><div class="row-title">${esc(a.name)}</div><div class="row-sub num">${fmt(accBalance(a.id, 'UZS'), 'UZS')} · ${fmt(accBalance(a.id, 'USD'), 'USD')}</div></div>${I.chev}</button>`).join('')}
        <button class="row" data-act="new-account"><span class="ic sm" style="--c:var(--accent)"><svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg></span><div class="row-main" style="color:var(--accent);font-weight:500">Add account</div></button>
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
      <p class="hint" style="text-align:center;margin-top:28px">${S.tx.length} entries · ${S.accounts.length} accounts · ${S.goals.length} goals<br>Budget · version ${APP_VERSION}</p>
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

  // ---------- Backup ----------
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
  $('#import-file').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    let obj;
    try { obj = JSON.parse(await f.text()); } catch (err) { toast('That file is not a Budget backup'); return; }
    const data = obj && obj.data ? obj.data : obj;
    if (!data || !Array.isArray(data.tx)) { toast('That file is not a Budget backup'); return; }
    const n = normalize(data);
    const when = obj.exportedAt ? ` from ${medDate(iso(new Date(obj.exportedAt)))}` : '';
    const ok = await ask({ title: `Restore backup${when}?`, msg: `It has ${n.tx.length} entries, ${n.accounts.length} accounts and ${n.goals.length} goals. Everything currently in the app will be replaced.`, ok: 'Restore', destructive: true });
    if (!ok) return;
    n.settings.pin = S.settings.pin;
    S = n;
    save(); applyTheme();
    UI.cur = S.settings.currency;
    UI.hAcc = 'all';
    closeSheet(); render();
    toast('Backup restored');
  });

  // ---------- Demo data ----------
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
    const rnd = (x, step) => Math.round(x / step) * step;
    const add = (type, amount, currency, date, person, category, account, note = '') => {
      if (date > t0) return;
      tx.push({ id: uid(), type, amount, currency, account, date, person, category, note, createdAt: Date.now() - tx.length, demo: true });
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

  // ================= Dialogs, toast, lock =================
  function ask({ title, msg, ok = 'OK', destructive = false, cancel = 'Cancel' }) {
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'dlg-wrap';
      wrap.innerHTML = `<div class="overlay"></div><div class="dlg" role="alertdialog"><div class="dlg-box">${title || msg ? `<div class="dlg-msg">${title ? `<b>${esc(title)}</b>` : ''}${esc(msg || '')}</div>` : ''}<button data-r="1" class="${destructive ? 'destructive' : ''}">${esc(ok)}</button></div><div class="dlg-box dlg-cancel"><button data-r="0">${esc(cancel)}</button></div></div>`;
      $('#dialog-root').appendChild(wrap);
      const ov = $('.overlay', wrap), d = $('.dlg', wrap);
      requestAnimationFrame(() => requestAnimationFrame(() => { ov.classList.add('show'); d.classList.add('show'); }));
      const done = (v) => { ov.classList.remove('show'); d.classList.remove('show'); setTimeout(() => wrap.remove(), 350); resolve(v); };
      wrap.addEventListener('click', (e) => {
        e.stopPropagation();
        const b = e.target.closest('button');
        if (b) done(b.dataset.r === '1');
        else if (e.target === ov) done(false);
      });
    });
  }

  let toastT;
  function toast(msg, action) {
    const t = $('#toast');
    t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button class="toast-btn">${esc(action.label)}</button>` : ''}`;
    if (action) $('.toast-btn', t).addEventListener('click', () => { t.classList.remove('show'); action.run(); });
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), action ? 5000 : 2000);
  }
  const undoToast = (msg, restore) => toast(msg, { label: 'Undo', run: () => { restore(); save(); render(); toast('Restored'); } });

  async function hashPin(pin, salt) {
    const txt = salt + ':' + pin;
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381;
    for (const ch of txt) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
    return 'd' + h.toString(16);
  }
  function pinPad({ title, sub, onDone, onCancel, onForgot }) {
    const root = $('#lock-root');
    let code = '', busy = false;
    root.innerHTML = `<div class="lock" role="dialog" aria-modal="true">
      <div class="lock-ic"><img src="icons/icon-192.png" alt=""></div>
      <div class="lock-title" id="pt">${title}</div>
      <div class="lock-sub" id="ps">${sub || ''}</div>
      <div class="dots" id="pd"><i></i><i></i><i></i><i></i></div>
      <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-k="${n}">${n}</button>`).join('')}
        <button class="ghost" data-k="cancel">${onCancel ? 'Cancel' : ''}</button><button data-k="0">0</button><button class="ghost" data-k="del" aria-label="Delete">${I.del}</button></div>
      ${onForgot ? '<button class="link lock-foot" data-k="forgot">Forgot passcode?</button>' : ''}
    </div>`;
    const dots = $('#pd', root);
    const paint = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < code.length));
    const ctrl = {
      reset(msg, shake) {
        code = ''; busy = false; paint();
        if (msg != null) $('#ps', root).textContent = msg;
        if (shake) { dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake'); try { navigator.vibrate && navigator.vibrate([30, 40, 30]); } catch (e) { /* ignore */ } }
      },
      setTitle(t, s) { $('#pt', root).textContent = t; $('#ps', root).textContent = s || ''; },
      close() { root.innerHTML = ''; document.removeEventListener('keydown', onKey); },
    };
    const press = (k) => {
      if (busy) return;
      if (k === 'del') { code = code.slice(0, -1); paint(); return; }
      if (k === 'cancel') { if (onCancel) { ctrl.close(); onCancel(); } return; }
      if (k === 'forgot') { onForgot && onForgot(ctrl); return; }
      if (code.length >= 4) return;
      code += k; paint();
      if (code.length === 4) { busy = true; setTimeout(() => onDone(code, ctrl), 140); }
    };
    root.querySelector('.lock').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
    const onKey = (e) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); };
    document.addEventListener('keydown', onKey);
    return ctrl;
  }
  let locked = false;
  let pendingAdd = null;
  function lockNow() {
    if (!S.settings.pin || locked) return;
    locked = true;
    pinPad({
      title: 'Enter passcode',
      onDone: async (code, c) => {
        if ((await hashPin(code, S.settings.pin.salt)) === S.settings.pin.hash) {
          locked = false; c.close();
          if (pendingAdd) { openTx(null, { type: pendingAdd }); pendingAdd = null; }
        } else c.reset('Wrong passcode', true);
      },
      onForgot: async (c) => {
        const ok = await ask({ title: 'Forgot your passcode?', msg: 'The only way back in is to erase everything on this phone and start again. If you saved a backup file, you can restore it afterwards.', ok: 'Erase everything', destructive: true });
        if (!ok) return;
        S = blank(); save(); applyTheme(); UI.cur = 'UZS';
        locked = false; c.close(); render();
        toast('All data erased');
      },
    });
  }
  function setPinFlow(onFinish) {
    let first = null;
    pinPad({
      title: 'Create a passcode', sub: 'Enter 4 digits',
      onCancel: () => onFinish(false),
      onDone: async (code, c) => {
        if (!first) { first = code; c.setTitle('Repeat passcode', 'Enter the same 4 digits again'); c.reset(); }
        else if (code === first) {
          const salt = uid();
          S.settings.pin = { salt, hash: await hashPin(code, salt) };
          save(); c.close(); onFinish(true);
        } else { first = null; c.setTitle('Create a passcode', "The codes didn't match — try again"); c.reset(null, true); }
      },
    });
  }
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (S.settings.pin && hiddenAt && Date.now() - hiddenAt > 60000) lockNow();
    if (swReg) swReg.update().catch(() => {});
  });

  // ================= Actions =================
  document.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || a.disabled) return;
    const act = a.dataset.act, v = a.dataset.v, id = a.dataset.id;
    const within = (sel) => a.closest(sel).querySelectorAll('button');
    switch (act) {
      case 'tab': goTab(a.dataset.tab); break;
      case 'add': openTx(); break;
      case 'settings': openSettings(); break;
      case 'close-sheet': closeSheet(); break;
      case 'cur': UI.cur = v; render(); break;
      case 'range': UI.range = v; render(); break;
      case 'htype': UI.hType = v; UI.hLimit = 150; render(); break;
      case 'hcur': UI.hCur = UI.hCur === v ? 'all' : v; UI.hLimit = 150; render(); break;
      case 'hacc': UI.hAcc = UI.hAcc === v ? 'all' : v; UI.hLimit = 150; render(); break;
      case 'more': UI.hLimit += 150; $('#hist-list').innerHTML = histList(); break;
      case 'period': UI.period = v; UI.offset = 0; render(); break;
      case 'shift': UI.offset = Math.min(0, UI.offset + Number(v)); render(); break;

      // entries
      case 'edit-tx': openTx(id); break;
      case 'new-transfer': openTx(null, { type: 'transfer' }); break;
      case 'tx-type':
        if (draft.type !== v) {
          draft.type = v;
          draft.category = null;
          if (v === 'transfer' && draft.toAccount === draft.account) draft.toAccount = (S.accounts.find((x) => x.id !== draft.account) || S.accounts[0]).id;
          refreshSheet(txHtml(), mountTx);
        }
        break;
      case 'tx-cur': {
        const exch = draft.toCurrency !== draft.currency;
        draft.currency = v;
        draft.amount = roundCur(draft.amount, v);
        draft.toCurrency = exch ? OTHER[v] : v;
        refreshSheet(txHtml(), mountTx);
        break;
      }
      case 'tx-exch':
        draft.toCurrency = v === 'other' ? OTHER[draft.currency] : draft.currency;
        refreshSheet(txHtml(), mountTx);
        break;
      case 'pick-acc': draft.account = v; within('.acc-pick').forEach((b) => b.classList.toggle('on', b === a)); break;
      case 'pick-from': draft.account = v; within('.acc-pick').forEach((b) => b.classList.toggle('on', b === a)); syncTx(); break;
      case 'pick-to': draft.toAccount = v; within('.acc-pick').forEach((b) => b.classList.toggle('on', b === a)); syncTx(); break;
      case 'pick-cat': draft.category = v; within('.cats').forEach((b) => b.classList.toggle('on', b === a)); break;
      case 'pick-person':
        draft.person = v;
        $('#person').value = v;
        within('.quick').forEach((b) => b.classList.toggle('on', b === a));
        break;
      case 'save-tx': saveTx(); break;
      case 'del-tx': {
        const removed = S.tx.find((t) => t.id === draft.id);
        if (!removed) break;
        S.tx = S.tx.filter((t) => t.id !== removed.id);
        save(); closeSheet(); render();
        undoToast(removed.type === 'transfer' ? 'Transfer deleted' : 'Entry deleted', () => S.tx.push(removed));
        break;
      }

      // accounts
      case 'account': openAccount(id); break;
      case 'new-account': openAccountForm(); break;
      case 'edit-account': openAccountForm(id); break;
      case 'acc-kind':
        adraft.kind = v;
        within('.kinds').forEach((b) => b.classList.toggle('on', b === a));
        $('#acc-preview').innerHTML = accIc(adraft, 'xl');
        break;
      case 'acc-color':
        adraft.color = v;
        refreshSheet(accountFormHtml(), mountAccountForm);
        break;
      case 'save-account': saveAccount(); break;
      case 'del-account': deleteAccount(id); break;
      case 'add-to-acc': openTx(null, { account: id }); break;
      case 'transfer-from': openTx(null, { type: 'transfer', account: id }); break;
      case 'acc-history': UI.hAcc = id; UI.hType = 'all'; closeSheet(); goTab('history'); break;

      // goals
      case 'new-goal': openGoalForm(); break;
      case 'goal': openGoal(id); break;
      case 'edit-goal': openGoalForm(id); break;
      case 'pick-icon': gdraft.icon = v; within('.emojis').forEach((b) => b.classList.toggle('on', b === a)); break;
      case 'goal-cur':
        gdraft.currency = v;
        gdraft.target = roundCur(gdraft.target, v);
        gdraft.initial = roundCur(gdraft.initial, v);
        refreshSheet(goalFormHtml(), mountGoalForm);
        break;
      case 'save-goal': saveGoal(); break;
      case 'del-goal': {
        const idx = S.goals.findIndex((g) => g.id === id);
        if (idx < 0) break;
        const removed = S.goals[idx];
        S.goals.splice(idx, 1);
        save(); closeSheet(); render();
        undoToast('Goal deleted', () => S.goals.splice(Math.min(idx, S.goals.length), 0, removed));
        break;
      }
      case 'goal-add-open': showGoalInline(Number(v)); break;
      case 'goal-add-save': goalAddSave(Number(v)); break;
      case 'del-contrib': {
        const g = S.goals.find((x) => x.id === gid);
        const c = g && g.contribs.find((x) => x.id === id);
        if (!c) break;
        g.contribs = g.contribs.filter((x) => x.id !== id);
        save(); render(); refreshSheet(goalDetailHtml(), null);
        undoToast('Line removed', () => { g.contribs.push(c); if (sheet && gid === g.id) refreshSheet(goalDetailHtml(), null); });
        break;
      }

      // settings
      case 'set-cur': S.settings.currency = v; UI.cur = v; save(); render(); refreshSheet(settingsHtml(), mountSettings); break;
      case 'set-theme': S.settings.theme = v; save(); applyTheme(); refreshSheet(settingsHtml(), mountSettings); drawCharts(); break;
      case 'change-pin': setPinFlow((ok) => { if (ok) toast('Passcode changed'); }); break;
      case 'export': exportBackup(); break;
      case 'share-backup': shareBackup(); break;
      case 'import': $('#import-file').click(); break;
      case 'load-demo': {
        if (S.tx.length && !(await ask({ title: 'Add demo data?', msg: 'Sample entries will be mixed in with yours. You can remove them later in Settings — your own entries stay.', ok: 'Add demo data' }))) break;
        const d = makeDemo();
        S.tx.push(...d.tx);
        S.goals.push(...d.goals);
        UI.cur = 'UZS';
        save(); render();
        if (sheet) refreshSheet(settingsHtml(), mountSettings);
        toast('Demo data loaded');
        break;
      }
      case 'clear-demo':
        if (await ask({ title: 'Remove demo data?', msg: 'Only the sample entries and goals are removed. Anything you added yourself stays.', ok: 'Remove demo data', destructive: true })) {
          S.tx = S.tx.filter((t) => !t.demo);
          S.goals = S.goals.filter((g) => !g.demo);
          save(); render();
          if (sheet) refreshSheet(settingsHtml(), mountSettings);
          toast('Demo data removed');
        }
        break;
      case 'erase':
        if (await ask({ title: 'Erase all data?', msg: 'Every entry, account, goal and setting on this phone will be deleted. This cannot be undone.', ok: 'Erase everything', destructive: true })) {
          S = blank(); save(); applyTheme(); UI.cur = 'UZS'; UI.hAcc = 'all';
          closeSheet(); render(); toast('All data erased');
        }
        break;
    }
  });

  // ================= Boot =================
  window.addEventListener('scroll', () => { $('#topbar').classList.toggle('show', window.scrollY > 44); }, { passive: true });
  let resizeT;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(drawCharts, 150); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  // Home-screen shortcuts open the app with ?add=in or ?add=out
  const addParam = new URLSearchParams(location.search).get('add');
  history.replaceState({ tab: 'home' }, '', location.search ? location.pathname : undefined);
  applyTheme();
  if (S.settings.pin) lockNow();
  render();
  if (addParam === 'in' || addParam === 'out') {
    if (locked) pendingAdd = addParam; else openTx(null, { type: addParam });
  }
  // Save once so data from version 1 is stored in the new format.
  if (localStorage.getItem(KEY)) save();

  // Offline support + instant updates: when a new version is installed, reload into it
  // (or wait until the open form is closed so nothing typed is lost).
  let swReg = null;
  const isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !isLocal) {
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      reloading = true;
      if (sheet) pendingReload = true; else location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((r) => { swReg = r; }).catch(() => {});
    });
  }
})();
