'use strict';
/* NEXT (16 Nov, user): Budget uses ONLY the seven colours — green (Budget's own colour), blue, orange, purple, pink, red, yellow — plus grey
   for things that are neutral. Every colour the app draws an icon with goes through fixC() (core.js); here every other colour is pointed
   at the nearest of the seven, so nothing in your data has to change. The colour pickers offer only the seven. */
(function () {
  const P7 = ['#34C759', '#007AFF', '#FF9500', '#AF52DE', '#FF2D55', '#FF3B30', '#FFCC00'], GREY = ['#8E8E93', '#636366', '#C7C7CC'];
  const rgb = (h) => { const x = String(h).replace('#', ''); if (!/^[0-9a-f]{6}$/i.test(x)) return null; return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)); };
  const sat = ([r, g, b]) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
  const near = (h) => { const a = rgb(h); if (!a || sat(a) < 0.12) return null; let best = null, bd = 1e9; // greys stay grey
    P7.forEach((p) => { const b = rgb(p), d = (a[0] - b[0]) ** 2 * 0.3 + (a[1] - b[1]) ** 2 * 0.59 + (a[2] - b[2]) ** 2 * 0.11; if (d < bd) { bd = d; best = p; } }); return best; };
  const map = (c) => { if (!c) return; const k = String(c).toUpperCase(), n = near(LEGACY_C[k] || c); if (n && n.toUpperCase() !== k) LEGACY_C[k] = n; };
  // the colours the app itself uses, and every colour in your data (categories, accounts, goals, groups, schedule)
  ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#FF3B30', '#FFCC00', '#32ADE6', '#5856D6', '#00C7BE', '#30B0C7', '#A2845E', '#32ADE6', '#32ADE6', '#5856D6', '#AF52DE', '#FF2D55', '#FF9500', '#34C759', '#FFCC00', '#30B0C7', '#00C7BE', '#A2845E', '#34C759', '#FF3B30', '#248A3D', '#34C759'].forEach(map);
  Object.keys(LEGACY_C).forEach((k) => map(k));
  const scan = () => { try { ['in', 'out'].forEach((t) => (S.cats[t] || []).forEach((c) => map(c.c))); (S.accounts || []).forEach((a) => map(a.color)); (S.goals || []).forEach((g) => map(g.color)); (S.groups || []).forEach((g) => map(g.color)); ((S.schedule && S.schedule.acts) || []).forEach((a) => map(a.color)); } catch (e) { /* later */ } };
  scan(); setInterval(scan, 4000);
  // the schedule and group colours are written straight into the page (not through fixC): fix them after each draw
  const fixDom = (el) => (el || document).querySelectorAll('[style*="--c:#"]').forEach((x) => { const s = x.getAttribute('style'), t = s.replace(/--c:(#[0-9a-fA-F]{6})/g, (m, c) => { map(c); return '--c:' + (LEGACY_C[c.toUpperCase()] || c); }); if (t !== s) x.setAttribute('style', t); });
  { const _r = render; render = function (...a) { const r = _r.apply(this, a); try { fixDom(); } catch (e) { /* fine */ } return r; }; }
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) fixDom(n); }))).observe(document.getElementById('sheet-root') || document.body, { childList: true, subtree: true });
  [DAY_COLORS, PEOPLE_COLORS].forEach((arr) => arr.splice(0, arr.length, ...P7));
  PALETTE.splice(0, PALETTE.length, ...P7, GREY[0]);
})();
