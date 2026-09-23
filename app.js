'use strict';
(function () {
  // ================= Constants =================
  const KEY = 'budget-app-v1';
  const CUR = { UZS: { seg: "so'm" }, USD: { seg: '$' } };
  const OTHER = { UZS: 'USD', USD: 'UZS' };
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MON = MONTHS.map((m) => m.slice(0, 3));
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const TITLES = { home: 'Overview', history: 'History', stats: 'Stats', goals: 'Goals' };
  const NBSP = ' ';

  const CATS = {
    in: [
      { id: 'salary', name: 'Salary', e: '💼', c: '#34C759' },
      { id: 'family', name: 'Family', e: '👪', c: '#FF9500' },
      { id: 'gift', name: 'Gift', e: '🎁', c: '#FF2D55' },
      { id: 'sidework', name: 'Side work', e: '💻', c: '#5856D6' },
      { id: 'business', name: 'Business', e: '🏪', c: '#007AFF' },
      { id: 'refund', name: 'Refund', e: '↩️', c: '#30B0C7' },
      { id: 'debt', name: 'Debt repaid', e: '🤝', c: '#AF52DE' },
      { id: 'other_in', name: 'Other', e: '💰', c: '#8E8E93' },
    ],
    out: [
      { id: 'groceries', name: 'Groceries', e: '🛒', c: '#34C759' },
      { id: 'eating', name: 'Eating out', e: '🍽️', c: '#FF9500' },
      { id: 'transport', name: 'Transport', e: '🚕', c: '#FFCC00' },
      { id: 'home', name: 'Home & rent', e: '🏠', c: '#007AFF' },
      { id: 'bills', name: 'Bills', e: '💡', c: '#FF9F0A' },
      { id: 'phone', name: 'Phone & net', e: '📱', c: '#5AC8FA' },
      { id: 'clothes', name: 'Clothes', e: '👕', c: '#AF52DE' },
      { id: 'health', name: 'Health', e: '💊', c: '#FF3B30' },
      { id: 'education', name: 'Education', e: '📚', c: '#5856D6' },
      { id: 'fun', name: 'Fun', e: '🎉', c: '#FF2D55' },
      { id: 'gifts', name: 'Gifts', e: '🎁', c: '#FF6482' },
      { id: 'other_out', name: 'Other', e: '📦', c: '#8E8E93' },
    ],
  };
  const PEOPLE_COLORS = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#5AC8FA', '#5856D6', '#30B0C7'];
  const GOAL_EMOJI = ['🎯', '📱', '💻', '🚗', '✈️', '🏠', '🎓', '💍', '🎁', '🛡️', '🎮', '⭐'];

  const I = {
    settings: '<svg viewBox="0 0 24 24"><path d="M4 7h9M17.5 7H20M4 17h2.5M11 17h9"/><circle cx="15.2" cy="7" r="2.2"/><circle cx="8.8" cy="17" r="2.2"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="m14.5 6-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="m9.5 6 6 6-6 6"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>',
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
  const buzz = () => { try { navigator.vibrate && navigator.vibrate(12); } catch (e) { /* no haptics */ } };

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
  const ceilTo = (x, step) => Math.ceil(x / step) * step;
  const roundCur = (n, cur) => (cur === 'USD' ? Math.round(n * 100) / 100 : Math.round(n));

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
  const shownAmount = (n, cur) => (n ? typedAmount(cur === 'USD' ? String(Math.round(n * 100) / 100) : String(Math.round(n)), cur).shown : '');

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
  const blank = () => ({ v: 1, tx: [], goals: [], settings: { currency: 'UZS', rate: null, theme: 'system', pin: null, lastBackup: null } });
  const validTx = (t) => t && t.id && (t.type === 'in' || t.type === 'out') && typeof t.amount === 'number' && CUR[t.currency] && /^\d{4}-\d{2}-\d{2}$/.test(t.date);
  function normalize(d) {
    const b = blank();
    if (!d || typeof d !== 'object') return b;
    return {
      v: 1,
      tx: Array.isArray(d.tx) ? d.tx.filter(validTx) : [],
      goals: Array.isArray(d.goals) ? d.goals.filter((g) => g && g.id && g.name && CUR[g.currency]).map((g) => ({ ...g, contribs: Array.isArray(g.contribs) ? g.contribs : [] })) : [],
      settings: Object.assign(b.settings, d.settings || {}),
    };
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
  const signed = (t) => (t.type === 'in' ? t.amount : -t.amount);
  const cat = (type, id) => CATS[type].find((c) => c.id === id) || CATS[type][CATS[type].length - 1];
  const sortTx = (a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0);
  const balance = (cur) => S.tx.reduce((a, t) => (t.currency === cur ? a + signed(t) : a), 0);
  function totals(cur, from, to) {
    let i = 0, o = 0;
    for (const t of S.tx) if (t.currency === cur && t.date >= from && t.date < to) { if (t.type === 'in') i += t.amount; else o += t.amount; }
    return { in: i, out: o };
  }
  const goalSaved = (g) => g.contribs.reduce((a, c) => a + c.amount, 0);
  const savedInGoals = (cur) => S.goals.filter((g) => g.currency === cur).reduce((a, g) => a + goalSaved(g), 0);
  const hasDemo = () => S.tx.some((t) => t.demo) || S.goals.some((g) => g.demo);

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
    const txs = S.tx.filter((t) => t.currency === cur).sort((a, b) => a.date.localeCompare(b.date));
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
    let bal = 0, i = 0;
    const s0 = iso(start);
    while (i < txs.length && txs[i].date < s0) bal += signed(txs[i++]);
    const pts = [];
    for (let k = 0; k <= span; k += step) {
      const di = iso(addDays(start, k));
      while (i < txs.length && txs[i].date <= di) bal += signed(txs[i++]);
      pts.push({ date: di, v: bal });
    }
    const endIso = iso(end);
    if (pts[pts.length - 1].date !== endIso) {
      while (i < txs.length && txs[i].date <= endIso) bal += signed(txs[i++]);
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
      if (type === 'out') { key = c.id; name = c.name; tile = `<span class="tile" style="--c:${c.c}">${c.e}</span>`; }
      else {
        const p = (t.person || '').trim();
        if (p) { key = 'p:' + p.toLowerCase(); name = p; tile = `<span class="tile" style="--c:${personColor(p)};font-size:16px;font-weight:700">${esc([...p][0].toUpperCase())}</span>`; }
        else { key = 'c:' + c.id; name = c.name; tile = `<span class="tile" style="--c:${c.c}">${c.e}</span>`; }
      }
      const e = map.get(key) || { name, tile, v: 0 };
      e.v += t.amount;
      map.set(key, e);
    }
    let arr = [...map.values()].sort((a, b) => b.v - a.v);
    if (arr.length > 7) {
      const rest = arr.slice(6);
      arr = arr.slice(0, 6);
      arr.push({ name: `${rest.length} more`, tile: '<span class="tile" style="--c:#8E8E93;font-size:14px">•••</span>', v: rest.reduce((a, r) => a + r.v, 0) });
    }
    return arr;
  }

  // ================= UI state =================
  const UI = { tab: 'home', cur: S.settings.currency, range: '3M', hType: 'all', hCur: 'all', q: '', hLimit: 150, period: 'month', offset: 0, lastType: 'in' };

  // ================= Small components =================
  function segButtons(act, items, current) {
    return items.map(([v, label]) => `<button data-act="${act}" data-v="${v}" class="${current === v ? 'on' : ''}">${label}</button>`).join('');
  }
  const curItems = [['UZS', "so'm"], ['USD', '$']];
  const curSeg = () => `<div class="seg sm">${segButtons('cur', curItems, UI.cur)}</div>`;

  function ring(pct, size, stroke, inner, done) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - clamp(pct, 0, 100) / 100);
    const col = done ? 'var(--good)' : 'var(--accent)';
    return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${done ? 'color-mix(in srgb, var(--good) 18%, transparent)' : 'var(--accent-soft)'}" stroke-width="${stroke}"/>${pct > 0 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"/>` : ''}</svg><div class="ring-txt">${inner}</div></div>`;
  }

  function txRow(t, showDate) {
    const c = cat(t.type, t.category);
    const title = t.person || c.name;
    const parts = [];
    if (t.person) parts.push(c.name);
    if (t.note) parts.push(t.note);
    if (showDate) parts.push(dayLabel(t.date));
    return `<button class="row" data-act="edit-tx" data-id="${t.id}">
      <span class="tile" style="--c:${c.c}">${c.e}</span>
      <div class="row-main"><div class="row-title">${esc(title)}</div>${parts.length ? `<div class="row-sub">${esc(parts.join(' · '))}</div>` : ''}</div>
      <div class="row-amt num ${t.type}">${fmt(signed(t), t.currency, { sign: true })}</div>
    </button>`;
  }

  function emptyWelcome() {
    return `<section class="card empty">
      <div class="big">👋</div>
      <h3>Welcome to your budget</h3>
      <p>Write down money you receive and money you spend. Totals and charts fill in as you go.</p>
      <button class="btn" data-act="add">Add first entry</button>
      <button class="link" data-act="load-demo">or try it with demo data</button>
    </section>
    <p class="hint" style="text-align:center;margin-top:12px">Tip: start with one “Money in” entry for the cash you have right now.</p>`;
  }

  // ================= Pages =================
  function renderHome() {
    const now = new Date();
    const cur = UI.cur, other = OTHER[cur];
    let h = `<header class="lt"><div><div class="eyebrow">${DOW_LONG[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}</div><h1>Overview</h1></div>
      <div class="lt-right">${S.tx.length ? curSeg() : ''}<button class="icon-btn" data-act="settings" aria-label="Settings">${I.settings}</button></div></header>`;

    if (hasDemo()) {
      h += `<button class="banner demo" data-act="clear-demo"><span class="b-ic">🧪</span><div><b>You're looking at demo data</b><span class="s">Tap here to remove it when you're ready to start.</span></div></button>`;
    } else {
      const real = S.tx.length;
      const lb = S.settings.lastBackup;
      if (real >= 10 && (!lb || Date.now() - lb > 30 * 864e5)) {
        h += `<button class="banner" data-act="settings"><span class="b-ic">💾</span><div><b>Time for a backup</b><span class="s">${lb ? 'Your last backup was over a month ago.' : "You haven't saved a backup yet."} Tap to save one.</span></div></button>`;
      }
    }

    if (!S.tx.length) {
      h += emptyWelcome();
    } else {
      const bal = balance(cur);
      const inGoals = savedInGoals(cur);
      const otherHas = S.tx.some((t) => t.currency === other);
      const meta = [];
      if (inGoals) meta.push(`<span>In goals <b class="num">${fmt(inGoals, cur)}</b></span>`, `<span>Free <b class="num">${fmt(bal - inGoals, cur)}</b></span>`);
      if (otherHas) {
        const ob = balance(other);
        meta.push(`<span>Also <b class="num">${fmt(ob, other)}</b></span>`);
        const rate = S.settings.rate;
        if (rate > 0) meta.push(`<span>≈ <b class="num">${fmt(cur === 'UZS' ? bal + ob * rate : bal + ob / rate, cur, { round: true })}</b> together</span>`);
      }
      const heroNum = cur === 'UZS' ? `${fmt(bal, cur, { bare: true })}<small>so'm</small>` : fmt(bal, cur);
      h += `<section class="card">
        <div class="label">Balance</div>
        <div class="hero">${heroNum}</div>
        ${meta.length ? `<div class="hero-meta">${meta.join('')}</div>` : ''}
        <div class="chart" id="bal-chart"></div>
        <div class="seg full sm ranges">${segButtons('range', [['1M', '1 month'], ['3M', '3 months'], ['1Y', '1 year'], ['All', 'All']], UI.range)}</div>
      </section>`;

      const [mFrom, mTo] = monthRange(now.getFullYear(), now.getMonth());
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const [pFrom, pTo] = monthRange(prev.getFullYear(), prev.getMonth());
      const tm = totals(cur, mFrom, mTo), lm = totals(cur, pFrom, pTo);
      const tile = (type, label, val, prevVal) => `<button class="card tile-stat" data-act="tab" data-tab="stats" style="text-align:left">
          <div class="ts-head"><span class="ts-ic ${type}">${type === 'in' ? I.inArrow : I.outArrow}</span>${label}</div>
          <div class="ts-val num">${cur === 'UZS' ? `<span>${fmt(val, cur, { bare: true })}</span> <small>so'm</small>` : `<span>${fmt(val, cur)}</span>`}</div>
          <div class="ts-sub">${MONTHS[prev.getMonth()]}: ${compactU(prevVal, cur)}</div>
        </button>`;
      h += `<div class="sec-head" style="margin-top:22px"><h2>${MONTHS[now.getMonth()]}</h2></div>
        <div class="tiles">${tile('in', 'Money in', tm.in, lm.in)}${tile('out', 'Money out', tm.out, lm.out)}</div>`;
    }

    // Goals strip
    h += `<div class="sec-head"><h2>Goals</h2>${S.goals.length ? '<button class="link" data-act="tab" data-tab="goals">See all</button>' : ''}</div>`;
    if (S.goals.length) {
      h += `<div class="strip">${[...S.goals].sort(goalSort).map((g) => {
        const st = goalStats(g);
        return `<button class="card goal-mini" data-act="goal" data-id="${g.id}">
          ${ring(st.pct, 46, 5, `<span class="emoji" style="font-size:20px">${g.emoji}</span>`, st.pct >= 100)}
          <div class="gm-name">${esc(g.name)}</div>
          <div class="gm-sub num">${Math.floor(st.pct)}% · ${compact(st.saved, g.currency)} of ${compact(g.target, g.currency)}</div>
        </button>`;
      }).join('')}<button class="card goal-mini add" data-act="new-goal"><span class="icon-btn">${I.plus}</span><div class="gm-name">New goal</div></button></div>`;
    } else {
      h += `<button class="banner" data-act="new-goal" style="margin:0"><span class="b-ic">🎯</span><div><b>Save up for something</b><span class="s">Set an amount and a date — the app works out how much to put aside.</span></div></button>`;
    }

    if (S.tx.length) {
      const recent = [...S.tx].sort(sortTx).slice(0, 5);
      h += `<div class="sec-head"><h2>Recent</h2><button class="link" data-act="tab" data-tab="history">See all</button></div>
        <div class="group">${recent.map((t) => txRow(t, true)).join('')}</div>`;
    }
    return h;
  }

  function renderHistory() {
    return `<header class="lt"><h1>History</h1></header>
      <div class="search">${I.search}<input id="q" type="search" placeholder="Search names, notes, amounts" value="${esc(UI.q)}" autocomplete="off" enterkeyhint="search"></div>
      <div class="filters">
        <div class="seg">${segButtons('htype', [['all', 'All'], ['in', 'In'], ['out', 'Out']], UI.hType)}</div>
        <div class="seg">${segButtons('hcur', [['all', 'All'], ...curItems], UI.hCur)}</div>
      </div>
      <div id="hist-list">${histList()}</div>`;
  }

  function histList() {
    if (!S.tx.length) return emptyWelcome();
    const q = UI.q.trim().toLowerCase().replace(/ /g, ' ');
    const qd = q.replace(/[\s,]/g, '');
    let list = S.tx.filter((t) => (UI.hType === 'all' || t.type === UI.hType) && (UI.hCur === 'all' || t.currency === UI.hCur));
    if (q) {
      list = list.filter((t) => {
        const hay = [t.person, t.note, cat(t.type, t.category).name, dayLabel(t.date)].join(' ').toLowerCase();
        return hay.includes(q) || (qd && /^\d+$/.test(qd) && String(t.amount).includes(qd));
      });
    }
    if (!list.length) return `<div class="card empty"><div class="big">🔍</div><h3>Nothing found</h3><p>Try another word or change the filters.</p></div>`;
    list.sort(sortTx);
    const shown = list.slice(0, UI.hLimit);
    let html = '', i = 0;
    while (i < shown.length) {
      const date = shown[i].date, day = [];
      while (i < shown.length && shown[i].date === date) day.push(shown[i++]);
      const curs = new Set(day.map((t) => t.currency));
      const net = curs.size === 1 ? fmt(day.reduce((a, t) => a + signed(t), 0), day[0].currency, { sign: true }) : '';
      html += `<div class="day-head"><span>${dayLabel(date)}</span><span class="num">${net}</span></div><div class="group">${day.map((t) => txRow(t, false)).join('')}</div>`;
    }
    if (list.length > shown.length) html += `<div class="actions"><button class="btn soft" data-act="more">Show more (${list.length - shown.length})</button></div>`;
    return html;
  }

  function renderStats() {
    let h = `<header class="lt"><h1>Stats</h1><div class="lt-right">${curSeg()}</div></header>`;
    if (!S.tx.length) {
      return h + `<section class="card empty"><div class="big">📊</div><h3>Nothing to show yet</h3><p>Charts appear here after you add a few entries.</p><button class="btn" data-act="add">Add entry</button><button class="link" data-act="load-demo">or try it with demo data</button></section>`;
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
      return h + `<section class="card empty"><div class="big">🎯</div><h3>No goals yet</h3><p>Choose something to save for, the amount and the date. The app tells you how much to put aside each month to get there.</p><button class="btn" data-act="new-goal">Create a goal</button></section>`;
    }
    const sums = ['UZS', 'USD'].map((c) => {
      const gs = S.goals.filter((g) => g.currency === c);
      if (!gs.length) return '';
      return `<b class="num">${fmt(gs.reduce((a, g) => a + goalSaved(g), 0), c)}</b> of ${fmt(gs.reduce((a, g) => a + g.target, 0), c)}`;
    }).filter(Boolean);
    h += `<p class="hint" style="margin:-6px 4px 14px;font-size:14px">Saved so far: ${sums.join(' · ')}</p><div class="stack">`;
    for (const g of [...S.goals].sort(goalSort)) {
      const st = goalStats(g);
      const done = st.pct >= 100;
      h += `<button class="card goal-card" data-act="goal" data-id="${g.id}">
        <div class="gc-top">
          <span class="tile" style="--c:var(--accent)">${g.emoji}</span>
          <div class="row-main"><div class="gc-name">${esc(g.name)}</div><div class="gc-date">by ${medDate(g.deadline)} · ${daysLeftText(st.daysLeft)}</div></div>
          <span class="chip ${st.status[0]}">${st.status[1]}</span>
        </div>
        <div class="meter ${done ? 'done' : ''}"><i style="width:${st.pct.toFixed(1)}%"></i></div>
        <div class="gc-nums"><span><b class="num">${fmt(st.saved, g.currency)}</b> <span class="muted">of ${fmt(g.target, g.currency)}</span></span><span class="muted num">${Math.floor(st.pct)}%</span></div>
        <div class="gc-pace">📅 <span>${st.pace}</span></div>
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
    if (!S.tx.some((t) => t.currency === cur)) {
      el.innerHTML = `<p class="card-sub" style="text-align:center;padding:26px 0">No entries in ${cur === 'UZS' ? "so'm" : 'dollars'} yet.</p>`;
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
    const short = (iso_) => { const d = parseD(iso_); return UI.range === '1M' || UI.range === '3M' ? `${d.getDate()} ${MON[d.getMonth()]}` : `${MON[d.getMonth()]} ’${String(d.getFullYear()).slice(2)}`; };
    const xl = [[0, 'start'], [Math.round(last / 2), 'middle'], [last, 'end']];
    for (const [i, anchor] of xl) s += `<text x="${x(i).toFixed(1)}" y="${H - 5}" text-anchor="${anchor}">${short(pts[i].date)}</text>`;
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
    let s = `<rect class="band-hl" y="${padT - 4}" width="${band.toFixed(1)}" height="${(ph + 4 + 20).toFixed(1)}" rx="8" fill="var(--fill)" style="display:none"/>`;
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
    document.querySelectorAll('.tabbar [data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === UI.tab));
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
  function sheetHead(title, left, right) {
    return `<div class="sheet-grab"><i></i></div><div class="sheet-head"><div class="l">${left || ''}</div><h3>${title}</h3><div class="r">${right || ''}</div></div>`;
  }
  function openSheet(html, mount) {
    if (sheet) { sheet.sh.innerHTML = html; enableDrag(sheet.sh); mount && mount(sheet.sh); return; }
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
    setTimeout(() => { ov.remove(); sh.remove(); }, 450);
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

  // ---------- Add / edit entry ----------
  let draft = null;
  function openTx(id) {
    const t = id ? S.tx.find((x) => x.id === id) : null;
    draft = t ? { ...t } : { id: null, type: UI.lastType, amount: 0, currency: UI.cur, person: '', category: null, date: todayIso(), note: '' };
    openSheet(txHtml(), mountTx);
  }
  function txHtml() {
    const d = draft, isIn = d.type === 'in', editing = !!d.id;
    const people = topPeople(d.type);
    const ok = d.amount > 0;
    return sheetHead(editing ? 'Edit entry' : 'New entry', '<button data-act="close-sheet">Cancel</button>', `<button data-act="save-tx" ${ok ? '' : 'disabled'}>Save</button>`) + `
    <div class="sheet-body">
      <div class="seg full">${segButtons('tx-type', [['in', 'Money in'], ['out', 'Money out']], d.type)}</div>
      <div class="amount-box">
        <input class="amount-input num" id="amt" inputmode="decimal" placeholder="0" value="${shownAmount(d.amount, d.currency)}" autocomplete="off" enterkeyhint="done" aria-label="Amount">
        <div class="cur-pill"><div class="seg sm">${segButtons('tx-cur', curItems, d.currency)}</div></div>
      </div>
      <div class="form-label">${isIn ? 'Who gave it' : 'Paid to'}</div>
      <div class="group"><label class="field"><input id="person" style="text-align:left" placeholder="${isIn ? 'e.g. Mom, Employer' : 'e.g. Supermarket, Taxi (optional)'}" value="${esc(d.person)}" autocomplete="off" enterkeyhint="done"></label></div>
      ${people.length ? `<div class="quick">${people.map((p) => `<button data-act="pick-person" data-v="${esc(p)}" class="${p === d.person ? 'on' : ''}">${esc(p)}</button>`).join('')}</div>` : ''}
      <div class="form-label">Category</div>
      <div class="cats">${CATS[d.type].map((c) => `<button class="cat ${d.category === c.id ? 'on' : ''}" data-act="pick-cat" data-v="${c.id}"><span class="tile" style="--c:${c.c}">${c.e}</span>${c.name}</button>`).join('')}</div>
      <div class="form-label">Details</div>
      <div class="group plain">
        <label class="row field"><span>Date</span><input type="date" id="date" value="${d.date}"></label>
        <label class="row field"><span>Note</span><input id="note" placeholder="Optional" value="${esc(d.note)}" autocomplete="off" enterkeyhint="done"></label>
      </div>
      <div class="actions">
        <button class="btn" data-act="save-tx" ${ok ? '' : 'disabled'}>${editing ? 'Save changes' : isIn ? 'Add money in' : 'Add money out'}</button>
        ${editing ? '<button class="btn danger" data-act="del-tx">Delete entry</button>' : ''}
      </div>
    </div>`;
  }
  function mountTx(sh) {
    const amt = $('#amt', sh);
    const sync = () => sh.querySelectorAll('[data-act="save-tx"]').forEach((b) => { b.disabled = !(draft.amount > 0); });
    amt.addEventListener('input', () => { const r = typedAmount(amt.value, draft.currency); amt.value = r.shown; draft.amount = r.value; sync(); });
    amt.addEventListener('keydown', (e) => { if (e.key === 'Enter') amt.blur(); });
    $('#person', sh).addEventListener('input', (e) => {
      draft.person = e.target.value;
      sh.querySelectorAll('.quick button').forEach((b) => b.classList.toggle('on', b.dataset.v === draft.person));
    });
    $('#date', sh).addEventListener('change', (e) => { draft.date = e.target.value || todayIso(); });
    $('#note', sh).addEventListener('input', (e) => { draft.note = e.target.value; });
    sh.querySelectorAll('input:not(#amt)').forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') i.blur(); }));
    if (!draft.id && !draft.amount) setTimeout(() => amt.focus({ preventScroll: true }), 420);
  }
  function saveTx() {
    const d = draft;
    if (!(d.amount > 0)) return;
    const rec = {
      id: d.id || uid(),
      type: d.type,
      amount: d.currency === 'USD' ? Math.round(d.amount * 100) / 100 : Math.round(d.amount),
      currency: d.currency,
      person: (d.person || '').trim(),
      category: d.category || CATS[d.type][CATS[d.type].length - 1].id,
      date: d.date || todayIso(),
      note: (d.note || '').trim(),
      createdAt: d.createdAt || Date.now(),
    };
    if (d.demo) rec.demo = true;
    const i = S.tx.findIndex((t) => t.id === rec.id);
    if (i >= 0) S.tx[i] = rec; else S.tx.push(rec);
    UI.lastType = rec.type;
    UI.cur = rec.currency;
    save();
    buzz();
    closeSheet();
    render();
    toast(i >= 0 ? 'Changes saved' : `${rec.type === 'in' ? 'Money in' : 'Money out'} · ${fmt(rec.amount, rec.currency)}`);
  }

  // ---------- Goals ----------
  let gdraft = null;
  function openGoalForm(id) {
    const g = id ? S.goals.find((x) => x.id === id) : null;
    const now = new Date();
    gdraft = g
      ? { id: g.id, name: g.name, emoji: g.emoji, target: g.target, currency: g.currency, deadline: g.deadline, initial: 0 }
      : { id: null, name: '', emoji: '🎯', target: 0, currency: UI.cur, deadline: iso(new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())), initial: 0 };
    openSheet(goalFormHtml(), mountGoalForm);
  }
  function goalFormHtml() {
    const d = gdraft, editing = !!d.id;
    return sheetHead(editing ? 'Edit goal' : 'New goal',
      editing ? `<button data-act="goal" data-id="${d.id}">Cancel</button>` : '<button data-act="close-sheet">Cancel</button>',
      '<button data-act="save-goal">Save</button>') + `
    <div class="sheet-body">
      <div class="form-label" style="margin-top:6px">Icon</div>
      <div class="emojis">${GOAL_EMOJI.map((e) => `<button data-act="pick-emoji" data-v="${e}" class="${d.emoji === e ? 'on' : ''}">${e}</button>`).join('')}</div>
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
        p.innerHTML = st.daysLeft > 0 && st.left > 0 ? `📅 ${st.pace} to reach it by ${medDate(d.deadline)}.` : st.left <= 0 ? '🎉 You already have enough for this goal.' : 'Pick a date in the future.';
      } else p.textContent = 'The app works out how much to put aside each month to reach your goal in time.';
    };
    name.addEventListener('input', () => { gdraft.name = name.value; sync(); });
    target.addEventListener('input', () => { const r = typedAmount(target.value, gdraft.currency); target.value = r.shown; gdraft.target = r.value; sync(); });
    date.addEventListener('change', () => { gdraft.deadline = date.value; sync(); });
    if (init) init.addEventListener('input', () => { const r = typedAmount(init.value, gdraft.currency); init.value = r.shown; gdraft.initial = r.value; sync(); });
    sh.querySelectorAll('input').forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') i.blur(); }));
    sync();
  }
  function saveGoal() {
    const d = gdraft;
    if (!(d.name.trim() && d.target > 0 && d.deadline)) return;
    const r = (v) => (d.currency === 'USD' ? Math.round(v * 100) / 100 : Math.round(v));
    if (d.id) {
      const g = S.goals.find((x) => x.id === d.id);
      Object.assign(g, { name: d.name.trim(), emoji: d.emoji, target: r(d.target), currency: d.currency, deadline: d.deadline });
      save(); render();
      openGoal(g.id);
      toast('Goal updated');
    } else {
      const g = { id: uid(), name: d.name.trim(), emoji: d.emoji, target: r(d.target), currency: d.currency, deadline: d.deadline, start: todayIso(), createdAt: Date.now(), contribs: [] };
      if (d.initial > 0) g.contribs.push({ id: uid(), amount: r(d.initial), date: todayIso() });
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
    const st = goalStats(g), cur = g.currency, done = st.pct >= 100;
    const contribs = [...g.contribs].sort((a, b) => b.date.localeCompare(a.date));
    return sheetHead('', `<button data-act="edit-goal" data-id="${g.id}">Edit</button>`, '<button data-act="close-sheet">Done</button>') + `
    <div class="sheet-body">
      <div class="gd-hero">
        ${ring(st.pct, 136, 12, `<div><div style="font-size:36px;line-height:1">${g.emoji}</div><div style="font-size:16px;font-weight:700;margin-top:6px">${Math.floor(st.pct)}%</div></div>`, done)}
        <div class="gd-name">${esc(g.name)}</div>
        <div class="gd-amt"><b class="num">${fmt(st.saved, cur)}</b> of ${fmt(g.target, cur)}</div>
        <div style="margin-top:10px"><span class="chip ${st.status[0]}">${st.status[1]}</span></div>
      </div>
      <div class="group plain" style="margin-top:20px">
        <div class="row"><div class="row-main">Still needed</div><div class="row-amt num">${fmt(st.left, cur)}</div></div>
        <div class="row"><div class="row-main">Deadline</div><div class="row-amt" style="font-weight:500">${medDate(g.deadline)}<small>${daysLeftText(st.daysLeft)}</small></div></div>
        <div class="row"><div class="row-main" style="white-space:normal">📅 ${st.pace}</div></div>
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
    const unit = g.currency === 'UZS' ? "so'm" : '$';
    box.innerHTML = `<div class="inline-add"><input id="g-amt" inputmode="decimal" placeholder="${dir > 0 ? 'Amount to add' : 'Amount to take out'} (${unit})" autocomplete="off" enterkeyhint="done"><button class="btn" data-act="goal-add-save" data-v="${dir}">${dir > 0 ? 'Add' : 'Take out'}</button></div>`;
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
    g.contribs.push({ id: uid(), amount: dir * (g.currency === 'USD' ? Math.round(v * 100) / 100 : Math.round(v)), date: todayIso() });
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
    const action = (act, label, color = 'var(--accent)') => `<button class="row field" data-act="${act}"><span style="flex:1;color:${color}">${label}</span></button>`;
    return sheetHead('Settings', '', '<button data-act="close-sheet">Done</button>') + `
    <div class="sheet-body">
      <div class="form-label" style="margin-top:6px">Main currency</div>
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
      <p class="hint">Asks for a 4-digit code when you open the app. Everything you enter is stored only on this phone — nothing is sent anywhere.</p>

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
      <p class="hint" style="text-align:center;margin-top:28px">${S.tx.length} entries · ${S.goals.length} goals<br>Budget · version 1</p>
    </div>`;
  }
  function mountSettings(sh) {
    const rate = $('#rate', sh);
    rate.addEventListener('input', () => { const r = typedAmount(rate.value, 'UZS'); rate.value = r.shown; S.settings.rate = r.value || null; save(); render(); });
    rate.addEventListener('keydown', (e) => { if (e.key === 'Enter') rate.blur(); });
    $('#pin-toggle', sh).addEventListener('change', (e) => {
      if (e.target.checked) {
        setPinFlow((ok) => { e.target.checked = ok; if (ok) { toast('Passcode is on'); refreshSheet(settingsHtml(), mountSettings); } });
      } else {
        S.settings.pin = null; save(); toast('Passcode is off');
        refreshSheet(settingsHtml(), mountSettings);
      }
    });
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
    return JSON.stringify({ app: 'budget', version: 1, exportedAt: new Date().toISOString(), data });
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
    const ok = await ask({ title: `Restore backup${when}?`, msg: `It has ${n.tx.length} entries and ${n.goals.length} goals. Everything currently in the app will be replaced.`, ok: 'Restore', destructive: true });
    if (!ok) return;
    n.settings.pin = S.settings.pin;
    S = n;
    save(); applyTheme();
    UI.cur = S.settings.currency;
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
    const rnd = (x, step) => Math.round(x / step) * step;
    const add = (type, amount, currency, date, person, category, note = '') => {
      if (date > t0) return;
      tx.push({ id: uid(), type, amount, currency, date, person, category, note, createdAt: Date.now() - tx.length, demo: true });
    };
    for (let k = 4; k >= 0; k--) {
      const y = now.getFullYear(), m = now.getMonth() - k;
      const D = (day) => iso(new Date(y, m, day));
      if (k === 4) add('in', 2000000, 'UZS', D(1), '', 'other_in', 'Cash I already had');
      add('in', 6500000, 'UZS', D(5), 'Employer', 'salary', 'Monthly salary');
      add('in', rnd(900000 + R() * 900000, 50000), 'UZS', D(18), 'Private lessons', 'sidework');
      if (k % 2 === 0) add('in', rnd(300000 + R() * 500000, 100000), 'UZS', D(12), 'Mom', 'family');
      if (k % 2 === 1) add('in', rnd(100 + R() * 150, 10), 'USD', D(22), 'Online client', 'sidework', 'Translation job');
      if (k === 2) add('in', 150, 'USD', D(3), 'Uncle Rustam', 'gift', 'Birthday');
      add('out', 1800000, 'UZS', D(2), 'Landlord', 'home', 'Rent');
      add('out', rnd(380000 + R() * 150000, 1000), 'UZS', D(10), '', 'bills', 'Gas, water, electricity');
      add('out', 99000, 'UZS', D(8), 'Mobile operator', 'phone');
      for (let w = 0; w < 4; w++) add('out', rnd(280000 + R() * 320000, 1000), 'UZS', D(3 + w * 7), 'Supermarket', 'groceries');
      for (let j = 0; j < 6; j++) add('out', rnd(15000 + R() * 45000, 1000), 'UZS', D(2 + Math.floor(R() * 26)), 'Taxi', 'transport');
      for (let j = 0; j < 3; j++) add('out', rnd(90000 + R() * 220000, 1000), 'UZS', D(4 + Math.floor(R() * 24)), 'Café', 'eating');
      if (R() > 0.45) add('out', rnd(250000 + R() * 500000, 10000), 'UZS', D(15 + Math.floor(R() * 10)), '', 'clothes', 'Shoes');
      if (R() > 0.5) add('out', rnd(60000 + R() * 150000, 1000), 'UZS', D(1 + Math.floor(R() * 27)), 'Pharmacy', 'health');
      if (R() > 0.4) add('out', rnd(100000 + R() * 200000, 1000), 'UZS', D(20 + Math.floor(R() * 7)), 'Cinema', 'fun');
      if (k % 2 === 0) add('out', rnd(20 + R() * 40, 1), 'USD', D(25), 'Online course', 'education');
    }
    const goals = [
      { id: uid(), name: 'New phone', emoji: '📱', target: 7000000, currency: 'UZS', deadline: iso(new Date(now.getFullYear(), now.getMonth() + 4, 0)), start: iso(addDays(now, -60)), createdAt: Date.now(), demo: true,
        contribs: [{ id: uid(), amount: 1500000, date: iso(addDays(now, -50)) }, { id: uid(), amount: 1200000, date: iso(addDays(now, -20)) }] },
      { id: uid(), name: 'Summer trip', emoji: '✈️', target: 800, currency: 'USD', deadline: iso(new Date(now.getFullYear() + 1, 5, 1)), start: iso(addDays(now, -30)), createdAt: Date.now(), demo: true,
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
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2000);
  }

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
  function lockNow() {
    if (!S.settings.pin || locked) return;
    locked = true;
    pinPad({
      title: 'Enter passcode',
      onDone: async (code, c) => {
        if ((await hashPin(code, S.settings.pin.salt)) === S.settings.pin.hash) { locked = false; c.close(); }
        else c.reset('Wrong passcode', true);
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
    if (document.hidden) hiddenAt = Date.now();
    else if (S.settings.pin && hiddenAt && Date.now() - hiddenAt > 60000) lockNow();
  });

  // ================= Actions =================
  document.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || a.disabled) return;
    const act = a.dataset.act, v = a.dataset.v, id = a.dataset.id;
    switch (act) {
      case 'tab': goTab(a.dataset.tab); break;
      case 'add': openTx(); break;
      case 'settings': openSettings(); break;
      case 'close-sheet': closeSheet(); break;
      case 'cur': UI.cur = v; render(); break;
      case 'range': UI.range = v; render(); break;
      case 'htype': UI.hType = v; UI.hLimit = 150; render(); break;
      case 'hcur': UI.hCur = v; UI.hLimit = 150; render(); break;
      case 'more': UI.hLimit += 150; $('#hist-list').innerHTML = histList(); break;
      case 'period': UI.period = v; UI.offset = 0; render(); break;
      case 'shift': UI.offset = Math.min(0, UI.offset + Number(v)); render(); break;

      case 'edit-tx': openTx(id); break;
      case 'tx-type':
        if (draft.type !== v) { draft.type = v; draft.category = null; refreshSheet(txHtml(), mountTx); }
        break;
      case 'tx-cur':
        draft.currency = v;
        draft.amount = roundCur(draft.amount, v);
        refreshSheet(txHtml(), mountTx);
        break;
      case 'pick-cat':
        draft.category = v;
        a.parentElement.querySelectorAll('.cat').forEach((b) => b.classList.toggle('on', b === a));
        break;
      case 'pick-person':
        draft.person = v;
        $('#person').value = v;
        a.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === a));
        break;
      case 'save-tx': saveTx(); break;
      case 'del-tx':
        if (await ask({ title: 'Delete this entry?', msg: 'This cannot be undone.', ok: 'Delete', destructive: true })) {
          S.tx = S.tx.filter((t) => t.id !== draft.id);
          save(); closeSheet(); render(); toast('Entry deleted');
        }
        break;

      case 'new-goal': openGoalForm(); break;
      case 'goal': openGoal(id); break;
      case 'edit-goal': openGoalForm(id); break;
      case 'pick-emoji':
        gdraft.emoji = v;
        a.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === a));
        break;
      case 'goal-cur':
        gdraft.currency = v;
        gdraft.target = roundCur(gdraft.target, v);
        gdraft.initial = roundCur(gdraft.initial, v);
        refreshSheet(goalFormHtml(), mountGoalForm);
        break;
      case 'save-goal': saveGoal(); break;
      case 'del-goal':
        if (await ask({ title: 'Delete this goal?', msg: 'The goal and its history will be removed. Your balance is not affected.', ok: 'Delete goal', destructive: true })) {
          S.goals = S.goals.filter((g) => g.id !== id);
          save(); closeSheet(); render(); toast('Goal deleted');
        }
        break;
      case 'goal-add-open': showGoalInline(Number(v)); break;
      case 'goal-add-save': goalAddSave(Number(v)); break;
      case 'del-contrib': {
        const g = S.goals.find((x) => x.id === gid);
        if (g && (await ask({ title: 'Remove this line?', ok: 'Remove', destructive: true }))) {
          g.contribs = g.contribs.filter((c) => c.id !== id);
          save(); render(); refreshSheet(goalDetailHtml(), null);
        }
        break;
      }

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
        if (await ask({ title: 'Erase all data?', msg: 'Every entry, goal and setting on this phone will be deleted. This cannot be undone.', ok: 'Erase everything', destructive: true })) {
          S = blank(); save(); applyTheme(); UI.cur = 'UZS';
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

  history.replaceState({ tab: 'home' }, '');
  applyTheme();
  if (S.settings.pin) lockNow();
  render();

  const isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !isLocal) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
