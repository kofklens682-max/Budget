'use strict';
/* 18 Nov 2026 (user): "set the same kind of colors (solid Apple ones), keep the default like I have now, or change some of the colors:
   the bar charts, the pie charts, the lines, anything that I can change".
   Settings > Look > Colors: three colors that the charts and the app are drawn with, each one of Apple's 12 colors in 5 shades
   (Darker, Dark, Actual, Bright, Brighter: Apple's own values, same as Teacher's Widget colors), or "Original color":
   - Money in: the green bars, "Free to spend", the green dots;
   - Money out: the bars and dots of money out;
   - Main color: the balance line, buttons, links, the tab bar.
   The pie chart uses each category's own color (a row opens Categories). Kept on this phone (key "b-colors"). */
(function () {
  if (typeof ACTIONS === 'undefined' || typeof openSheet !== 'function') return;
  const KEY = 'b-colors';
  const SHADE = ['Darker', 'Dark', 'Actual', 'Bright', 'Brighter'];
  const half = (a, b) => '#' + [1, 3, 5].map((i) => Math.round((parseInt(a.substr(i, 2), 16) + parseInt(b.substr(i, 2), 16)) / 2).toString(16).padStart(2, '0')).join('').toUpperCase();
  const FAM = [['Red', '#D70015', '#FF3B30', '#FF453A', '#FF6961'], ['Orange', '#C93400', '#FF9500', '#FF9F0A', '#FFB340'], ['Yellow', '#B25000', '#FFCC00', '#FFD60A', '#FFD426'],
    ['Green', '#248A3D', '#34C759', '#30D158', '#30DB5B'], ['Mint', '#0C817B', '#00C7BE', '#63E6E2', '#66D4CF'], ['Teal', '#008299', '#30B0C7', '#40C8E0', '#5DE6FF'],
    ['Cyan', '#0071A4', '#32ADE6', '#64D2FF', '#70D7FF'], ['Blue', '#0040DD', '#007AFF', '#0A84FF', '#409CFF'], ['Indigo', '#3634A3', '#5856D6', '#5E5CE6', '#7D7AFF'],
    ['Purple', '#8944AB', '#AF52DE', '#BF5AF2', '#DA8FFF'], ['Pink', '#D30F45', '#FF2D55', '#FF375F', '#FF6482'], ['Brown', '#7F6545', '#A2845E', '#AC8E68', '#B59469']]
    .map(([n, d, a, b, bb]) => ({ n, s: [d, half(d, a), a, b, bb] }));
  const ITEMS = [['in', 'Money in', 'Green bars, Free to spend, dots'], ['out', 'Money out', 'Bars and dots of money out'], ['accent', 'Main color', 'Balance line, buttons, links, tab bar']];
  const get = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const put = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* this visit only */ } };
  const findC = (c) => { const u = String(c || '').toUpperCase(); for (let i = 0; i < FAM.length; i++) { const j = FAM[i].s.indexOf(u); if (j >= 0) return { f: i, s: j }; } return null; };
  const nameOf = (c) => { const x = findC(c); return x ? FAM[x.f].n + (x.s !== 2 ? ' · ' + SHADE[x.s] : '') : 'Original color'; };
  const rgba = (h, a) => `rgba(${parseInt(h.substr(1, 2), 16)},${parseInt(h.substr(3, 2), 16)},${parseInt(h.substr(5, 2), 16)},${a})`;
  // the original colors = what the style sheets say, read once before anything is changed
  const orig = {};
  function readOrig() { const r = document.documentElement, was = r.getAttribute('style') || ''; ['in', 'out', 'accent'].forEach((k) => r.style.removeProperty('--' + k)); const cs = getComputedStyle(r);
    ['in', 'out', 'accent'].forEach((k) => { orig[k] = cs.getPropertyValue('--' + k).trim(); }); r.setAttribute('style', was); }
  function apply() {
    const o = get(), r = document.documentElement;
    ['in', 'out', 'accent'].forEach((k) => { if (o[k]) r.style.setProperty('--' + k, o[k]); else r.style.removeProperty('--' + k); });
    if (o.accent) r.style.setProperty('--accent-soft', rgba(o.accent, 0.14)); else r.style.removeProperty('--accent-soft');
  }
  readOrig(); apply();
  if (typeof applyTheme === 'function') { const _t = applyTheme; applyTheme = function () { const x = _t.apply(this, arguments); readOrig(); apply(); return x; }; }

  const cur = (k) => get()[k] || orig[k] || '#8E8E93';
  const dot = (c) => `<span class="bc-dot" style="--k:${c}"></span>`;
  const chev = () => (typeof I !== 'undefined' && I.chev ? I.chev : '');
  const preview = () => `<div class="bc-prev"><svg viewBox="0 0 200 64" aria-hidden="true">${[14, 30, 22, 40, 28].map((h, i) => `<rect x="${12 + i * 38}" y="${60 - h}" width="11" height="${h}" rx="3" fill="${cur('in')}"/><rect x="${25 + i * 38}" y="${60 - h * 0.6}" width="11" height="${h * 0.6}" rx="3" fill="${cur('out')}"/>`).join('')}<path d="M6 40 L50 30 L94 34 L138 18 L194 12" fill="none" stroke="${cur('accent')}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
  /* 18 Nov, his phone test: "there is no flexibility, let me change MORE things". Besides the three app colors, every category (the pie
     chart), every account and every goal can now take any of the 60 Apple shades. These colors are part of your data (saved and synced
     like the rest); the color each one had before is kept on this phone (key "b-colors-orig") for "Original color". A color chosen here
     is kept exactly: Budget's older "seven colors" rule (palette.js) leaves it alone (key "b-colors-picked"). */
  const OK = 'b-colors-orig', PK = 'b-colors-picked';
  const og = () => { try { return JSON.parse(localStorage.getItem(OK) || '{}') || {}; } catch (e) { return {}; } };
  const putO = (o) => { try { localStorage.setItem(OK, JSON.stringify(o)); } catch (e) { /* this visit only */ } };
  const keep = (c) => { if (!c) return; const u = c.toUpperCase(); try { const l = JSON.parse(localStorage.getItem(PK) || '[]'); if (!l.includes(u)) { l.push(u); localStorage.setItem(PK, JSON.stringify(l)); } } catch (e) { /* fine */ } if (typeof LEGACY_C !== 'undefined') delete LEGACY_C[u]; };
  const shown = (c) => (typeof fixC === 'function' ? fixC(c) : c);
  function ref(k) {
    const it = ITEMS.find((x) => x[0] === k);
    if (it) return { name: it[1], sub: it[2], own: !!get()[k], now: cur(k), orig: orig[k] || '#8E8E93', set: (c) => { const o = get(); if (c) o[k] = c; else delete o[k]; put(o); apply(); } };
    const [t, x, y] = k.split(':');
    const data = (o, field, dflt) => { if (!o) return null; const O = og(), own = k in O;
      return { name: o.name, own, now: shown(o[field] || dflt), orig: own ? shown(O[k] || dflt) : shown(o[field] || dflt),
        set: (c) => { const P = og(); if (c) { if (!(k in P)) P[k] = o[field] || ''; o[field] = c; } else if (k in P) { if (P[k]) o[field] = P[k]; else delete o[field]; delete P[k]; } putO(P); save(); } }; };
    if (t === 'c') return data((S.cats[x] || []).find((c) => c.id === y), 'c', '#8E8E93');
    if (t === 'a') return data((S.accounts || []).find((c) => c.id === x), 'color', '#8E8E93');
    if (t === 'g') { const g = (S.goals || []).find((c) => c.id === x); return data(g, 'color', g ? (GOAL_ICONS.find((i) => i.id === g.icon) || GOAL_ICONS[0]).c : '#8E8E93'); }
    return null;
  }
  const row = (k) => { const r = ref(k); if (!r) return ''; return `<button class="row" data-act="bc-pick" data-v="${esc(k)}">${dot(r.now)}<div class="row-main"><div class="row-title">${esc(r.name)}</div><div class="row-sub">${r.own ? nameOf(r.now) : 'Original color'}${r.sub ? ' · ' + r.sub : ''}</div></div>${chev()}</button>`; };
  const sec = (label, keys) => (keys.length ? `<div class="form-label">${label}</div><div class="group plain">${keys.map(row).join('')}</div>` : '');
  function listHtml() {
    return sheetHead('Colors', '<button data-act="settings">Back</button>', '<button data-act="close-sheet">Done</button>') + `<div class="sheet-body bc-page">
      ${preview()}
      ${sec('Charts and app', ITEMS.map((x) => x[0]))}
      ${sec('Pie chart · money out categories', (S.cats.out || []).map((c) => 'c:out:' + c.id))}
      ${sec('Money in categories', (S.cats.in || []).map((c) => 'c:in:' + c.id))}
      ${sec('Accounts', (S.accounts || []).filter((a) => a.kind !== 'free').map((a) => 'a:' + a.id))}
      ${sec('Goals', (S.goals || []).map((g) => 'g:' + g.id))}
      <p class="hint">Only Apple's colors. Each in five shades: darker, dark, actual, bright, brighter.</p></div>`;
  }
  function pickHtml(k) {
    const r = ref(k); if (!r) return listHtml();
    const me = r.own ? findC(r.now) : null, si = me ? me.s : 2;
    const grid = FAM.map((f, fi) => { const c = f.s[si], on = !!me && me.f === fi; return `<button class="bc-sw${on ? ' on' : ''}" data-act="bc-set" data-v="${esc(k)}|${c}" style="--k:${c}"><span class="bc-ball">${on ? '✓' : ''}</span><b>${f.n}</b></button>`; }).join('');
    const shades = me ? `<div class="form-label">Shade of ${FAM[me.f].n.toLowerCase()}</div><div class="bc-shades">${FAM[me.f].s.map((c, j) => `<button class="bc-sh${j === me.s ? ' on' : ''}" data-act="bc-set" data-v="${esc(k)}|${c}" style="--k:${c}"><span class="bc-ball sm">${j === me.s ? '✓' : ''}</span><b>${SHADE[j]}</b></button>`).join('')}</div>`
      : '<p class="hint">Choose a color, then its shade.</p>';
    return sheetHead(esc(r.name), '<button data-act="bc-open">Back</button>', '<button data-act="close-sheet">Done</button>') + `<div class="sheet-body bc-page">
      ${ITEMS.some((x) => x[0] === k) ? preview() : `<div class="bc-prev bc-one">${dot(r.now)}<b>${esc(r.name)}</b></div>`}
      <div class="bc-grid">${grid}</div>
      ${shades}
      <div class="group plain"><button class="row" data-act="bc-set" data-v="${esc(k)}|">${dot(r.orig)}<div class="row-main"><div class="row-title">Original color</div><div class="row-sub">The color it had before</div></div>${r.own ? '' : '<span class="bc-tick">✓</span>'}</button></div></div>`;
  }
  Object.assign(ACTIONS, {
    'bc-open': () => openSheet(listHtml()),
    'bc-pick': (a, v) => openSheet(pickHtml(v)),
    'bc-set': (a, v) => { const i = v.lastIndexOf('|'), k = v.slice(0, i), c = v.slice(i + 1), r = ref(k); if (!r) return; keep(c); r.set(c); openSheet(pickHtml(k)); if (typeof render === 'function') render(); },
  });
  // Settings > Look: the row (after "Appearance")
  if (typeof settingsHtml === 'function') {
    const _s = settingsHtml;
    settingsHtml = function () {
      const h = _s.apply(this, arguments);
      const row = `<div class="group plain"><button class="row" data-act="bc-open">${typeof ic === 'function' ? ic('palette', '#FF2D55', 'sm') || ic('report', '#FF2D55', 'sm') : ''}<div class="row-main"><div class="row-title">Colors</div><div class="row-sub">Charts, pie, accounts, goals, buttons</div></div>${typeof I !== 'undefined' && I.chev ? I.chev : ''}</button></div>`;
      return h.replace(/(<button class="row field" data-tabshrink)/, (m) => row.replace('</div>', '</div>') + m);
    };
  }
})();
