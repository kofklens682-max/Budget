'use strict';
/* Budget — shared state, helpers and UI building blocks.
   Loaded first. money.js, groups.js and schedule.js add pages to PAGES and handlers to ACTIONS;
   main.js starts the app. */

// ================= Constants =================
const KEY = 'budget-app-v1';
const APP_VERSION = 5;
const G = window.GLYPHS || {};
const CUR = { UZS: { seg: "so'm" }, USD: { seg: '$' } };
const OTHER = { UZS: 'USD', USD: 'UZS' };
const unit = (cur) => (cur === 'UZS' ? "so'm" : '$');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON = MONTHS.map((m) => m.slice(0, 3));
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WK = WEEK.map((d) => d.slice(0, 3));
const DAY_COLORS = ['#3B82F6', '#16A34A', '#F59E0B', '#7C3AED', '#F87171', '#14B8A6', '#EC4899'];
const NBSP = ' ';
const HEX = /^#[0-9a-f]{6}$/i;
const PALETTE = ['#34C759', '#00C7BE', '#5AC8FA', '#007AFF', '#5856D6', '#7D6BF2', '#AF52DE', '#FF2D55', '#FF3B30', '#FF9500', '#F2B705', '#A2845E', '#8E8E93', '#636366'];
const CAT_GLYPHS = ['briefcase', 'board', 'family', 'users', 'gift', 'laptop', 'store', 'refund', 'usercheck', 'coins', 'cart', 'utensils', 'coffee', 'car', 'bus', 'fuel', 'house', 'bolt', 'phone', 'shirt', 'pill', 'gradcap', 'book', 'sparkles', 'film', 'music', 'gamepad', 'dumbbell', 'scissors', 'baby', 'paw', 'wrench', 'handheart', 'tag', 'receipt', 'cake', 'plane', 'globe', 'umbrella', 'heart', 'star', 'box'];
const DEFAULT_CATS = {
  in: [
    { id: 'salary', name: 'Salary', g: 'briefcase', c: '#34C759' },
    { id: 'lessons', name: 'Lessons', g: 'board', c: '#007AFF' },
    { id: 'family', name: 'Family', g: 'family', c: '#FF9500' },
    { id: 'gift', name: 'Gift', g: 'gift', c: '#FF2D55' },
    { id: 'sidework', name: 'Side work', g: 'laptop', c: '#5856D6' },
    { id: 'business', name: 'Business', g: 'store', c: '#00C7BE' },
    { id: 'refund', name: 'Refund', g: 'refund', c: '#5AC8FA' },
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
    { id: 'gifts', name: 'Gifts', g: 'gift', c: '#FF2D55' },
    { id: 'other_out', name: 'Other', g: 'box', c: '#8E8E93' },
  ],
};
const OTHER_CAT = { in: 'other_in', out: 'other_out' };
const ACC_KINDS = [
  { id: 'cash', name: 'Cash', g: 'cash' },
  { id: 'card', name: 'Card', g: 'card' },
  { id: 'bank', name: 'Bank', g: 'bank' },
  { id: 'wallet', name: 'Wallet', g: 'wallet' },
  { id: 'savings', name: 'Savings', g: 'safe' },
];
const GOAL_ICONS = [
  { id: 'target', c: '#FF3B30' }, { id: 'phone', c: '#007AFF' }, { id: 'laptop', c: '#5856D6' }, { id: 'car', c: '#00C7BE' },
  { id: 'plane', c: '#5AC8FA' }, { id: 'house', c: '#FF9500' }, { id: 'gradcap', c: '#AF52DE' }, { id: 'gem', c: '#FF2D55' },
  { id: 'gift', c: '#FF2D55' }, { id: 'shield', c: '#34C759' }, { id: 'gamepad', c: '#636366' }, { id: 'star', c: '#F2B705' },
];
const EMOJI_TO_ICON = { '🎯': 'target', '📱': 'phone', '💻': 'laptop', '🚗': 'car', '✈️': 'plane', '🏠': 'house', '🎓': 'gradcap', '💍': 'gem', '🎁': 'gift', '🛡️': 'shield', '🎮': 'gamepad', '⭐': 'star' };
const TRANSFER_C = '#64748B';
const PEOPLE_COLORS = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#5AC8FA', '#5856D6', '#00C7BE'];

// Interface chrome icons (tinted with the accent colour by their container)
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
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
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
const ymNow = () => todayIso().slice(0, 7);
const ymShift = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; };
const ymRange = (ym) => { const [y, m] = ym.split('-').map(Number); return monthRange(y, m - 1); };
const ymLabel = (ym, short) => { const [y, m] = ym.split('-').map(Number); return short ? MON[m - 1] : `${MONTHS[m - 1]} ${y}`; };
const hhmm = (min) => `${pad2(Math.floor(min / 60) % 24)}:${pad2(min % 60)}`;
const durText = (m) => { const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h}h${pad2(r)}` : `${h}h`) : `${r}m`; };
const todayIdx = () => (new Date().getDay() + 6) % 7;
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const groupDigits = (s, sep) => s.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
const ceilTo = (x, step) => Math.ceil(x / step) * step;
const roundCur = (n, cur) => (cur === 'USD' ? Math.round(n * 100) / 100 : Math.round(n));
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
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
const shortDate = (s) => { const d = parseD(s); return `${d.getDate()} ${MON[d.getMonth()]}`; };
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
const FREE_ACT = () => ({ id: 'free', name: 'Free', color: '#8E8E93', kind: 'free', groupId: null });
const emptySchedule = () => ({ acts: [FREE_ACT()], days: Array.from({ length: 7 }, () => ({ start: 660, blocks: [] })) });
const defaultSettings = () => ({ currency: 'UZS', rate: null, theme: 'system', pin: null, lastBackup: null, reportSeen: null, schedView: 'day' });
const blank = () => ({ v: APP_VERSION, rev: 0, accounts: defaultAccounts(), cats: normCats(null), groups: [], schedule: emptySchedule(), tx: [], goals: [], settings: defaultSettings() });

const validTx = (t) => t && t.id && typeof t.amount === 'number' && t.amount > 0 && CUR[t.currency] && /^\d{4}-\d{2}-\d{2}$/.test(t.date)
  && (t.type === 'in' || t.type === 'out' || (t.type === 'transfer' && CUR[t.toCurrency] && typeof t.toAmount === 'number'));
function normAccount(a) {
  const o = a.opening || {};
  return {
    id: String(a.id),
    name: String(a.name || 'Account').slice(0, 40),
    kind: ACC_KINDS.some((k) => k.id === a.kind) ? a.kind : 'wallet',
    color: HEX.test(a.color) ? a.color : '#8E8E93',
    opening: { UZS: Number(o.UZS) || 0, USD: Number(o.USD) || 0 },
  };
}
function normCats(c) {
  const out = {};
  for (const type of ['in', 'out']) {
    const list = c && Array.isArray(c[type])
      ? c[type].filter((x) => x && x.id && x.name).map((x) => ({ id: String(x.id), name: String(x.name).slice(0, 30), g: G[x.g] ? x.g : 'box', c: HEX.test(x.c) ? x.c : '#8E8E93' }))
      : [];
    out[type] = list.length ? list : DEFAULT_CATS[type].map((x) => ({ ...x }));
    if (!out[type].some((x) => x.id === OTHER_CAT[type])) out[type].push({ ...DEFAULT_CATS[type].find((x) => x.id === OTHER_CAT[type]) });
  }
  return out;
}
function normGroups(gs) {
  return (Array.isArray(gs) ? gs : []).filter((g) => g && g.id && g.name).map((g) => ({
    id: String(g.id),
    name: String(g.name).slice(0, 30),
    color: HEX.test(g.color) ? g.color : '#007AFF',
    fee: g.fee && Number(g.fee.amount) > 0 && CUR[g.fee.currency] ? { amount: Number(g.fee.amount), currency: g.fee.currency } : null,
    students: (Array.isArray(g.students) ? g.students : []).filter((s) => s && s.id && s.name).map((s) => ({ id: String(s.id), name: String(s.name).slice(0, 40) })),
    createdAt: g.createdAt || Date.now(),
  }));
}
function normSchedule(s) {
  if (!s || !Array.isArray(s.days) || s.days.length !== 7 || !Array.isArray(s.acts)) return emptySchedule();
  const acts = s.acts.filter((a) => a && a.id && a.name).map((a) => ({
    id: String(a.id),
    name: String(a.name).slice(0, 30),
    color: HEX.test(a.color) ? a.color : '#8E8E93',
    kind: a.id === 'free' ? 'free' : a.kind === 'lesson' ? 'lesson' : 'other',
    groupId: a.groupId ? String(a.groupId) : null,
  }));
  if (!acts.some((a) => a.id === 'free')) acts.unshift(FREE_ACT());
  const ids = new Set(acts.map((a) => a.id));
  const days = s.days.map((d) => ({
    start: clamp(Math.round(Number(d && d.start) || 660), 0, 1435),
    blocks: (d && Array.isArray(d.blocks) ? d.blocks : []).filter((b) => b && b.id && b.dur > 0)
      .map((b) => ({ id: String(b.id), act: ids.has(b.act) ? b.act : 'free', dur: clamp(Math.round(b.dur), 5, 1440) })),
  }));
  return { acts, days };
}
function normalize(d) {
  const b = blank();
  if (!d || typeof d !== 'object') return b;
  let accounts = Array.isArray(d.accounts) ? d.accounts.filter((a) => a && a.id).map(normAccount) : [];
  if (!accounts.length) accounts = defaultAccounts();
  const ids = new Set(accounts.map((a) => a.id));
  const first = accounts[0].id;
  const groups = normGroups(d.groups);
  const gids = new Set(groups.map((g) => g.id));
  const tx = (Array.isArray(d.tx) ? d.tx : []).filter(validTx).map((t) => {
    const r = { ...t };
    if (!ids.has(r.account)) r.account = first;            // entries from version 1 had no account
    if (r.type === 'transfer' && !ids.has(r.toAccount)) r.toAccount = first;
    if (r.type !== 'in' || !gids.has(r.groupId)) { delete r.groupId; delete r.studentId; delete r.forMonth; }
    else if (!/^\d{4}-\d{2}$/.test(r.forMonth || '')) r.forMonth = r.date.slice(0, 7);
    // "Every month" entries: the original keeps repeat/repeatDay/repeatNext; copies point back with fromRepeat.
    if (r.repeat !== 'monthly' || r.type === 'transfer' || r.groupId || !/^\d{4}-\d{2}-\d{2}$/.test(r.repeatNext || '')) { delete r.repeat; delete r.repeatNext; delete r.repeatDay; }
    else r.repeatDay = clamp(Math.round(Number(r.repeatDay)) || Number(r.date.slice(8)), 1, 31);
    if (typeof r.fromRepeat !== 'string') delete r.fromRepeat;
    return r;
  });
  const goals = (Array.isArray(d.goals) ? d.goals : []).filter((g) => g && g.id && g.name && CUR[g.currency]).map((g) => ({
    ...g,
    icon: G[g.icon] ? g.icon : EMOJI_TO_ICON[g.emoji] || 'target',
    contribs: Array.isArray(g.contribs) ? g.contribs : [],
  }));
  const schedule = normSchedule(d.schedule);
  schedule.acts.forEach((a) => { if (a.groupId && !gids.has(a.groupId)) a.groupId = null; });
  return { v: APP_VERSION, rev: Math.max(0, Math.round(Number(d.rev)) || 0), accounts, cats: normCats(d.cats), groups, schedule, tx, goals, settings: Object.assign(defaultSettings(), d.settings || {}) };
}
// Opens from the quick copy (localStorage); main.js then checks the second copy (keep.js).
let hadQuick = false;
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const d = normalize(JSON.parse(raw)); hadQuick = true; return d; }
  } catch (e) { /* damaged: the second copy takes over */ }
  return blank();
}
let S = load();
let topRev = S.rev; // highest save number so far: a fresh start (Erase, a restored backup) still counts as newest
let persistAsked = false;
function save() {
  S.rev = Math.max(S.rev || 0, topRev) + 1;
  topRev = S.rev;
  const json = JSON.stringify(S);
  try { localStorage.setItem(KEY, json); quickFailed = false; } catch (e) { quickFailed = true; }
  keepSoon(S.rev, json, quickFailed);
  if (!persistAsked && navigator.storage && navigator.storage.persist) { persistAsked = true; navigator.storage.persist().catch(() => {}); }
}

// ================= Derived data =================
const cat = (type, id) => S.cats[type].find((c) => c.id === id) || S.cats[type].find((c) => c.id === OTHER_CAT[type]) || DEFAULT_CATS[type][DEFAULT_CATS[type].length - 1];
const acc = (id) => S.accounts.find((a) => a.id === id) || S.accounts[0];
const accKind = (a) => ACC_KINDS.find((k) => k.id === a.kind) || ACC_KINDS[3];
const accIc = (a, cls = '') => ic(accKind(a).g, a.color, cls);
const grp = (id) => (id ? S.groups.find((g) => g.id === id) || null : null);
const goalIcon = (g) => GOAL_ICONS.find((x) => x.id === g.icon) || GOAL_ICONS[0];
// Dates are "YYYY-MM-DD", so plain comparison sorts them (much faster than localeCompare).
const cmpDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
const sortTx = (a, b) => cmpDate(b, a) || (b.createdAt || 0) - (a.createdAt || 0);

function badgeText(name) {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (w.length > 1) return w.slice(0, 3).map((x) => [...x][0]).join('').toUpperCase();
  return name.length <= 5 ? name : name.slice(0, 3);
}
function grpBadge(g, cls = '') {
  const t = badgeText(g.name);
  const fs = t.length <= 2 ? 15 : t.length === 3 ? 13 : 11;
  return `<span class="ic badge ${cls}" style="--c:${g.color};--fs:${fs}px">${esc(t)}</span>`;
}

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
// While a page is being drawn the data can't change, so totals are worked out once per draw
// (render() turns this on): all balances in one pass, entries sorted by date once, and period
// totals read only the entries of that period.
let memo = null;
const memoize = (key, f) => { if (!memo) return f(); if (!(key in memo)) memo[key] = f(); return memo[key]; };
const byDate = () => memoize('byDate', () => S.tx.slice().sort(cmpDate));
function firstOnOrAfter(list, date) {
  let lo = 0, hi = list.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (list[m].date < date) lo = m + 1; else hi = m; }
  return lo;
}
const txBetween = (from, to) => { if (!memo) return S.tx; const l = byDate(); return l.slice(firstOnOrAfter(l, from), firstOnOrAfter(l, to)); };
function sums() {
  return memoize('sums', () => {
    const bal = { UZS: 0, USD: 0 }, accs = {}, used = { UZS: false, USD: false };
    for (const a of S.accounts) {
      accs[a.id] = { UZS: a.opening.UZS || 0, USD: a.opening.USD || 0 };
      for (const c of ['UZS', 'USD']) { bal[c] += accs[a.id][c]; if (a.opening[c]) used[c] = true; }
    }
    for (const t of S.tx) {
      const from = accs[t.account];
      used[t.currency] = true;
      if (t.type === 'in') { bal[t.currency] += t.amount; if (from) from[t.currency] += t.amount; continue; }
      bal[t.currency] -= t.amount;
      if (from) from[t.currency] -= t.amount;
      if (t.type === 'transfer') {
        const to = accs[t.toAccount];
        used[t.toCurrency] = true;
        bal[t.toCurrency] += t.toAmount;
        if (to) to[t.toCurrency] += t.toAmount;
      }
    }
    return { bal, accs, used };
  });
}
const openingTotal = (cur) => S.accounts.reduce((a, x) => a + (x.opening[cur] || 0), 0);
const balance = (cur) => (memo ? sums().bal[cur] : S.tx.reduce((a, t) => a + delta(t, cur), openingTotal(cur)));
const accBalance = (id, cur) => (memo && sums().accs[id] ? sums().accs[id][cur] : S.tx.reduce((a, t) => a + accDelta(t, id, cur), acc(id).opening[cur] || 0));
const usesCur = (cur) => (memo ? sums().used[cur] : S.tx.some((t) => t.currency === cur || (t.type === 'transfer' && t.toCurrency === cur)) || S.accounts.some((a) => a.opening[cur]));
function totals(cur, from, to) {
  let i = 0, o = 0;
  for (const t of txBetween(from, to)) {
    if (t.currency !== cur || t.date < from || t.date >= to) continue;
    if (t.type === 'in') i += t.amount;
    else if (t.type === 'out') o += t.amount;
  }
  return { in: i, out: o };
}
const goalSaved = (g) => g.contribs.reduce((a, c) => a + c.amount, 0);
const savedInGoals = (cur) => S.goals.filter((g) => g.currency === cur).reduce((a, g) => a + goalSaved(g), 0);
const freeMoney = (cur) => balance(cur) - savedInGoals(cur); // not set aside for any goal
const hasDemo = () => S.tx.some((t) => t.demo) || S.goals.some((g) => g.demo);
const hasAnything = () => S.tx.length > 0 || S.accounts.some((a) => a.opening.UZS || a.opening.USD);
function personColor(name) {
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return PEOPLE_COLORS[h % PEOPLE_COLORS.length];
}
const letterTile = (name, color, cls = '') => `<span class="ic letter ${cls}" style="--c:${color}">${esc(([...name.trim()][0] || '?').toUpperCase())}</span>`;

// ================= UI state =================
const HIST_PAGE = 60; // History draws this many entries at a time
const UI = {
  tab: 'home', cur: S.settings.currency, range: '3M',
  hView: 'entries', hType: 'all', hCur: 'all', hAcc: 'all', hGroup: 'all', q: '', hLimit: HIST_PAGE,
  period: 'month', offset: 0, gMonth: ymNow(),
  sView: S.settings.schedView === 'week' ? 'week' : 'day', sDay: todayIdx(), sDir: 0, lastAct: null,
  lastType: 'in', lastAcc: { in: null, out: null },
  flashId: null, heroShown: {},
};

// ================= Small components =================
// Segmented control buttons. The rounded "thumb" slides from the previous choice to the new one.
const segMem = {};
function segButtons(act, items, current) {
  const i = items.findIndex(([v]) => v === current);
  const from = segMem[act] != null && segMem[act] >= 0 ? segMem[act] : i;
  segMem[act] = i;
  const thumb = i >= 0 ? `<i class="seg-thumb" style="--n:${items.length};--i:${i};--from:${from}"></i>` : '';
  return thumb + items.map(([v, label]) => `<button data-act="${act}" data-v="${v}" class="${current === v ? 'on' : ''}">${label}</button>`).join('');
}
const curItems = [['UZS', "so'm"], ['USD', '$']];
const curSeg = () => `<div class="seg sm">${segButtons('cur', curItems, UI.cur)}</div>`;

function ring(pct, size, stroke, inner, done) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - clamp(pct, 0, 100) / 100);
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${done ? 'color-mix(in srgb, var(--good) 18%, transparent)' : 'var(--accent-soft)'}" stroke-width="${stroke}"/>${pct > 0 ? `<circle class="ring-prog" style="--c:${c.toFixed(2)}" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${done ? 'var(--good)' : 'var(--accent)'}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"/>` : ''}</svg><div class="ring-txt">${inner}</div></div>`;
}
const swatches = (act, current) => `<div class="swatches">${PALETTE.map((c) => `<button class="${current === c ? 'on' : ''}" data-act="${act}" data-v="${c}" style="--c:${c}" aria-label="Colour"></button>`).join('')}</div>`;

// Smoothly counts a number up/down inside an element.
function countUp(el, from, to, render, dur = 700) {
  if (!el) return;
  if (from === to || reduceMotion()) { el.innerHTML = render(to); return; }
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.innerHTML = render(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ================= Sheets =================
let sheet = null;
let pendingReload = false;
function sheetHead(title, left, right) {
  return `<div class="sheet-grab"><i></i></div><div class="sheet-head"><div class="l">${left || ''}</div><h3>${title}</h3><div class="r">${right || ''}</div></div>`;
}
function openSheet(html, mount) {
  if (sheet) {
    // Swap the content of the open sheet (keeps one history entry) with a soft cross-fade.
    sheet.sh.innerHTML = html;
    sheet.sh.classList.remove('swap');
    void sheet.sh.offsetWidth;
    sheet.sh.classList.add('swap');
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
  sheet = { ov, sh, hid: uid() };
  requestAnimationFrame(() => requestAnimationFrame(() => { ov.classList.add('show'); sh.classList.add('show'); }));
  history.pushState({ tab: UI.tab, sheet: sheet.hid }, '');
  document.body.style.overflow = 'hidden';
  bindSheetGestures(sh, ov);
  mount && mount(sh);
}
function refreshSheet(html, mount) {
  if (!sheet) return;
  const b = $('.sheet-body', sheet.sh), top = b ? b.scrollTop : 0;
  sheet.sh.innerHTML = html;
  mount && mount(sheet.sh);
  const nb = $('.sheet-body', sheet.sh);
  if (nb) nb.scrollTop = top;
}
function closeSheet() {
  if (!sheet) return;
  if (history.state && history.state.sheet === sheet.hid) history.back();
  else closeSheetNow();
}
function closeSheetNow() {
  if (!sheet) return;
  const { ov, sh } = sheet;
  sheet = null;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  sh.classList.remove('dragging');
  sh.style.transform = '';
  ov.style.opacity = '';
  ov.classList.remove('show');
  sh.classList.remove('show');
  document.body.style.overflow = '';
  setTimeout(() => { ov.remove(); sh.remove(); if (pendingReload) location.reload(); }, 450);
}
// Pull a sheet down to close it — from anywhere inside it, as long as its content is scrolled to
// the top (like iOS). A quick flick closes it too. Mouse users can drag the top bar.
function bindSheetGestures(sh, ov) {
  let x0 = 0, y0 = null, t0 = 0, dy = 0, mode = null;
  const skip = (el) => el.closest('input, textarea, select, .drag, .switch, .tbtn');
  const begin = (x, y, target) => {
    if (skip(target)) return;
    const body = $('.sheet-body', sh);
    const inBody = body && body.contains(target);
    if (inBody && body.scrollTop > 2) return; // content is scrolled: let it scroll back up first
    x0 = x; y0 = y; t0 = performance.now(); dy = 0; mode = null;
  };
  const follow = (x, y, e) => {
    if (y0 === null) return;
    const ddx = x - x0, ddy = y - y0;
    if (!mode) {
      if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return;
      mode = ddy > 0 && Math.abs(ddy) > Math.abs(ddx) * 1.2 ? 'drag' : 'none';
      if (mode === 'drag') sh.classList.add('dragging');
    }
    if (mode !== 'drag') return;
    if (e.cancelable) e.preventDefault();
    dy = Math.max(0, ddy);
    sh.style.transform = `translateY(${dy}px)`;
    ov.style.opacity = String(Math.max(0.15, 1 - dy / (sh.offsetHeight || 600)));
  };
  const release = () => {
    if (y0 === null) return;
    const wasDrag = mode === 'drag';
    const speed = dy / Math.max(1, performance.now() - t0);
    y0 = null; mode = null;
    if (!wasDrag) return;
    sh.classList.remove('dragging');
    if (dy > Math.min(140, sh.offsetHeight * 0.25) || (speed > 0.55 && dy > 30)) closeSheet();
    else { sh.style.transform = ''; ov.style.opacity = ''; }
  };
  sh.addEventListener('touchstart', (e) => begin(e.touches[0].clientX, e.touches[0].clientY, e.target), { passive: true });
  sh.addEventListener('touchmove', (e) => follow(e.touches[0].clientX, e.touches[0].clientY, e), { passive: false });
  sh.addEventListener('touchend', release);
  sh.addEventListener('touchcancel', release);
  sh.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || !e.target.closest('.sheet-grab, .sheet-head') || e.target.closest('button')) return;
    begin(e.clientX, e.clientY, e.target);
    const mv = (ev) => follow(ev.clientX, ev.clientY, ev);
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); release(); };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  });
}
const blurOnEnter = (sh) => sh.querySelectorAll('input').forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter' && i.tagName === 'INPUT') i.blur(); }));

// Drag-to-reorder for a list. Items carry [data-sort]; the handle is .drag.
function makeSortable(list, onDrop) {
  if (!list) return;
  list.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.drag');
    if (!handle || !list.contains(handle)) return;
    e.preventDefault();
    const items = $$(':scope > [data-sort]', list);
    const item = handle.closest('[data-sort]');
    const from = items.indexOf(item);
    if (from < 0) return;
    const rects = items.map((el) => el.getBoundingClientRect());
    const gap = items.length > 1 ? rects[1].top - rects[0].bottom : 0;
    const startY = e.clientY;
    let to = from;
    item.classList.add('lifting');
    list.classList.add('sorting');
    handle.setPointerCapture(e.pointerId);
    buzz();
    const move = (ev) => {
      const dy = ev.clientY - startY;
      item.style.transform = `translateY(${dy}px) scale(1.02)`;
      const mid = rects[from].top + rects[from].height / 2 + dy;
      to = from;
      for (let i = 0; i < items.length; i++) {
        const c = rects[i].top + rects[i].height / 2;
        if (i < from && mid < c) { to = i; break; }
        if (i > from && mid > c) to = i;
      }
      const shift = rects[from].height + gap;
      items.forEach((el, i) => {
        if (i === from) return;
        const s = from < to && i > from && i <= to ? -shift : from > to && i < from && i >= to ? shift : 0;
        el.style.transform = s ? `translateY(${s}px)` : '';
      });
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      list.classList.remove('sorting');
      item.classList.remove('lifting');
      items.forEach((el) => { el.style.transform = ''; });
      if (to !== from) { buzz(); onDrop(from, to); }
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  });
}

// ================= Dialogs & toast =================
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
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), action ? 5000 : 2200);
}
const undoToast = (msg, restore) => toast(msg, { label: 'Undo', run: () => { restore(); save(); render(); toast('Restored'); } });

// ================= Passcode lock =================
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
    close() {
      const l = $('.lock', root);
      document.removeEventListener('keydown', onKey);
      if (!l) return;
      l.classList.add('out');
      setTimeout(() => { root.innerHTML = ''; }, 260);
    },
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
const onUnlock = []; // things to do right after the passcode is entered
function lockNow() {
  if (!S.settings.pin || locked) return;
  locked = true;
  pinPad({
    title: 'Enter passcode',
    onDone: async (code, c) => {
      if ((await hashPin(code, S.settings.pin.salt)) === S.settings.pin.hash) {
        locked = false; c.close();
        onUnlock.splice(0).forEach((f) => f());
      } else c.reset('Wrong passcode', true);
    },
    onForgot: async (c) => {
      const ok = await ask({ title: 'Forgot your passcode?', msg: 'The only way back in is to erase everything on this phone and start again. If you saved a backup file, you can restore it afterwards.', ok: 'Erase everything', destructive: true });
      if (!ok) return;
      // The automatic copies go too — otherwise they'd open the data without the passcode.
      dropAllCopies();
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

// ================= Pages, render & navigation =================
const PAGES = {};   // tab -> { title, render(): html, after(animate), resize() }
const ACTIONS = {}; // data-act -> (el, value, id, event)
const TAB_ORDER = ['home', 'history', 'stats', 'goals', 'schedule'];

// A page that fails to draw shows this instead of a blank screen (the data is never touched).
const pageError = (err) => `<header class="lt"><h1>${esc(PAGES[UI.tab].title)}</h1></header><section class="card empty"><div class="big">${ic('bolt', '#FF9500', 'xl')}</div><h3>This page couldn't be shown</h3><p>Your data is safe. Try another tab, or close the app and open it again.</p><p class="hint">${esc((err && err.message) || err)}</p></section>`;
// animate: the page's blocks rise in one after another (first start).
// dir (1 / -1): the page slides in from the right / left — another tab. With `keep`, only the
// blocks after the first `keep` ones slide (a new choice in a segmented control: the title and
// the control stay where they are).
function render(animate, dir = 0, keep = 0) {
  const v = $('#view');
  const page = PAGES[UI.tab];
  memo = {}; // totals are worked out once for this draw (see sums())
  let html;
  try { html = page.render(); } catch (err) { console.error(err); html = pageError(err); }
  v.innerHTML = html;
  v.classList.remove('enter', 'slide');
  if (animate && !reduceMotion()) {
    if (dir) v.style.setProperty('--dir', dir);
    if (dir && keep) [...v.children].forEach((c, i) => { if (i >= keep) { c.classList.add('sub-in'); c.style.setProperty('--i', Math.min(i - keep, 5)); } });
    else {
      if (!dir) [...v.children].forEach((c, i) => c.style.setProperty('--i', Math.min(i, 9)));
      void v.offsetWidth;
      v.classList.add(dir ? 'slide' : 'enter');
    }
  }
  const idx = TAB_ORDER.indexOf(UI.tab);
  $('#tabs').style.setProperty('--i', idx);
  $$('#tabs [data-tab]').forEach((b) => {
    const on = b.dataset.tab === UI.tab;
    b.classList.toggle('on', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  $('#topbar-title').textContent = page.title;
  if (page.after) { try { page.after(animate); } catch (err) { console.error(err); } }
  memo = null;
  if (UI.flashId) setTimeout(() => { UI.flashId = null; }, 50);
}
// Re-render after a choice in a segmented control (or the ‹ › arrows next to it): what's above
// stays put, what's below slides in from the side of the new choice.
function renderSub(el, dir) {
  const v = $('#view');
  const k = [...v.children].findIndex((c) => c.contains(el));
  if (!dir || k < 0) { render(); return; }
  render(true, dir, k + 1);
}
// +1 when the tapped choice is to the right of the current one, -1 when to the left.
function segDir(a) {
  const bs = $$(':scope > button', a.parentElement);
  return Math.sign(bs.indexOf(a) - bs.findIndex((b) => b.classList.contains('on')));
}

let pushedTab = false;
function goTab(tab) {
  if (tab === UI.tab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if (UI.tab === 'home') { history.pushState({ tab }, ''); pushedTab = true; }
  else if (tab === 'home' && pushedTab) { history.back(); return; }
  else history.replaceState({ tab }, '');
  showTab(tab);
}
// The old page slides out one way while the new one slides in from the other (by tab order).
function showTab(tab) {
  const dir = Math.sign(TAB_ORDER.indexOf(tab) - TAB_ORDER.indexOf(UI.tab)) || 1;
  UI.tab = tab;
  const v = $('#view');
  $$('.view.ghost').forEach((g) => g.remove());
  if (!reduceMotion() && v.firstChild) {
    const g = document.createElement('div');
    g.className = 'view ghost';
    g.setAttribute('aria-hidden', 'true');
    g.inert = true;
    g.style.top = `${-window.scrollY}px`;
    g.style.setProperty('--dir', dir);
    g.append(...v.childNodes);
    g.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    v.after(g);
    setTimeout(() => g.remove(), 450);
  }
  window.scrollTo(0, 0);
  render(true, dir);
}
window.addEventListener('popstate', (e) => {
  const st = e.state || {};
  if (sheet && st.sheet !== sheet.hid) closeSheetNow();
  const tab = st.tab || 'home';
  if (tab === 'home') pushedTab = false;
  if (tab !== UI.tab) showTab(tab);
});

// ================= Press and slide =================
const tick = () => { try { navigator.vibrate && navigator.vibrate(8); } catch (e) { /* no haptics */ } };
// Tab bar: tap a tab, or press anywhere on the bar and slide — the highlight follows the finger
// and the page under it opens when you let go (like the iPhone's tab bar).
function bindTabSlide(tabs, go) {
  const ind = $('.tab-ind', tabs);
  const btns = () => $$('[data-tab]', tabs);
  let st = null, slidAt = 0;
  tabs.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    st = { id: e.pointerId, x0: e.clientX, on: false, over: -1 };
  });
  tabs.addEventListener('pointermove', (e) => {
    if (!st || e.pointerId !== st.id) return;
    if (!st.on) {
      if (Math.abs(e.clientX - st.x0) < 8) return;
      st.on = true;
      try { tabs.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      tabs.classList.add('sliding');
    }
    const bs = btns(), r = tabs.getBoundingClientRect(), w = (r.width - 10) / bs.length;
    const x = clamp(e.clientX - r.left - 5 - w / 2, 0, w * (bs.length - 1));
    ind.style.transform = `translateX(${x.toFixed(1)}px) scale(1.06)`;
    const over = clamp(Math.round(x / w), 0, bs.length - 1);
    if (over !== st.over) {
      if (st.over >= 0) tick();
      st.over = over;
      bs.forEach((b, i) => b.classList.toggle('over', i === over));
    }
  });
  const end = (e) => {
    if (!st || e.pointerId !== st.id) return;
    const s = st;
    st = null;
    if (!s.on) return;
    slidAt = Date.now();
    const b = btns()[s.over];
    tabs.classList.remove('sliding');
    ind.style.transform = '';
    btns().forEach((x) => x.classList.remove('over'));
    if (e.type === 'pointerup' && b && !b.classList.contains('on')) go(b.dataset.tab);
  };
  tabs.addEventListener('pointerup', end);
  tabs.addEventListener('pointercancel', end);
  // the end of a slide must not also count as a tap
  tabs.addEventListener('click', (e) => { if (e.isTrusted && Date.now() - slidAt < 350) { e.stopPropagation(); e.preventDefault(); } }, true);
}
// Segmented controls work the same way: slide the highlight along and let go on a choice.
function bindSegSlide() {
  let st = null, slidAt = 0;
  document.addEventListener('pointerdown', (e) => {
    const seg = e.button > 0 ? null : e.target.closest('.seg');
    const thumb = seg && $(':scope > .seg-thumb', seg);
    st = thumb ? { seg, thumb, id: e.pointerId, x0: e.clientX, y0: e.clientY, on: false, over: -1, x: 0, w: 1 } : null;
  });
  document.addEventListener('pointermove', (e) => {
    if (!st || e.pointerId !== st.id) return;
    if (!st.on) {
      const dx = Math.abs(e.clientX - st.x0), dy = Math.abs(e.clientY - st.y0);
      if (dy > 10 && dy > dx) { st = null; return; }
      if (dx < 8) return;
      st.on = true;
      try { st.seg.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      st.seg.classList.add('sliding');
    }
    const bs = $$(':scope > button', st.seg), r = st.seg.getBoundingClientRect();
    st.w = (r.width - 4) / bs.length;
    st.x = clamp(e.clientX - r.left - 2 - st.w / 2, 0, st.w * (bs.length - 1));
    st.thumb.style.animation = 'none';
    st.thumb.style.transform = `translateX(${st.x.toFixed(1)}px)`;
    const over = clamp(Math.round(st.x / st.w), 0, bs.length - 1);
    if (over !== st.over) {
      if (st.over >= 0) tick();
      st.over = over;
      bs.forEach((b, i) => b.classList.toggle('over', i === over));
    }
  });
  const end = (e) => {
    if (!st || e.pointerId !== st.id) return;
    const s = st;
    st = null;
    if (!s.on) return;
    slidAt = Date.now();
    s.seg.classList.remove('sliding');
    const bs = $$(':scope > button', s.seg), b = bs[s.over];
    bs.forEach((x) => x.classList.remove('over'));
    if (e.type !== 'pointerup' || !b || b.classList.contains('on') || !ACTIONS[b.dataset.act]) { s.thumb.style.transform = ''; return; }
    segMem[b.dataset.act] = s.x / s.w; // the new highlight glides on from where the finger left it
    ACTIONS[b.dataset.act](b, b.dataset.v, b.dataset.id, e);
  };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
  document.addEventListener('click', (e) => { if (e.isTrusted && Date.now() - slidAt < 350 && e.target.closest('.seg')) { e.stopPropagation(); e.preventDefault(); } }, true);
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]');
  if (!a || a.disabled) return;
  const fn = ACTIONS[a.dataset.act];
  if (fn) fn(a, a.dataset.v, a.dataset.id, e);
});
// Marks the chosen button inside a picker without re-rendering it.
const pick = (a, sel) => a.closest(sel).querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === a));

Object.assign(ACTIONS, {
  tab: (a) => goTab(a.dataset.tab),
  'close-sheet': () => closeSheet(),
  cur: (a, v) => { UI.cur = v; render(); },
  fab: () => {
    if (UI.tab === 'goals') openGoalForm();
    else if (UI.tab === 'schedule') openBlock(UI.sDay, null);
    else openTx();
  },
});
