'use strict';
/* Hide the balance (user, 4 Nov 2026): an eye next to "Total balance". Tap it and the money on Home is blurred; the choice
   is remembered (localStorage "budget-hide-money"), so after closing the app, even a day later, it opens hidden until you
   tap the eye again. The class is set in index.html before anything is drawn, so the numbers never flash. Also: the big
   balance counts up to its value when Home opens. Loaded after main.js. */
(() => {
  const KEY = 'budget-hide-money';
  const EYE = '<svg class="on" viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'
    + '<svg class="off" viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.1 3.9M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.8 0 3.4-.5 4.7-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  const hidden = () => document.documentElement.classList.contains('hide-money');
  function addEye() {
    document.querySelectorAll('.hero-card > .label:first-child:not(.hero-lab)').forEach((lab) => {
      lab.classList.add('hero-lab');
      const b = document.createElement('button'); b.className = 'eye-btn'; b.type = 'button'; b.dataset.hideToggle = '1';
      b.setAttribute('aria-label', hidden() ? 'Show the balance' : 'Hide the balance'); b.innerHTML = EYE; lab.appendChild(b);
    });
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-hide-toggle]'); if (!b) return;
    e.stopPropagation(); e.preventDefault();
    const on = !hidden(); document.documentElement.classList.toggle('hide-money', on);
    if (on) { maskIn(document.body); mo.takeRecords(); } else unmaskAll();
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (err) { /* not kept */ }
    document.querySelectorAll('.eye-btn').forEach((x) => x.setAttribute('aria-label', on ? 'Show the balance' : 'Hide the balance'));
    if (navigator.vibrate) try { navigator.vibrate(8); } catch (err) { /* no buzz */ }
  }, true);
  // 4 Nov 2026 (user): hidden money shows as **** (like Click), no blur. Every amount in the app: Home, accounts, goals,
  // money in / money out, History, the chart labels. A sheet where you type an amount is left alone.
  const STAR = '****', masked = new Map(), shown = new WeakMap(); let busy = false; // masked: text node -> real text; shown: what we put there
  const MONEY = /[−+-]?\s?\$?\d[\d\s.,\u00a0\u202f]*(?:[kKMB](?![a-z]))?/g;
  // 10 Nov 2026 (user): the eye hides ONLY the totals: the total balance on Home (with its so'm + dollars line), each account's total on Home,
  // and the totals on an account's page. Everything else (history, goals, groups, charts, money in / out) stays readable.
  const TOTALS = '.hero-card .hero, .hero-card .hero-meta, .acc-card .acc-bal, .acc-card .acc-sub, .acc-hero-bal, .sp-card';
  const wants = (t) => { const el = t.parentElement; if (!el || !/\d/.test(t.nodeValue)) return false; if (el.closest(TOTALS)) return true;
    const g = el.closest('.gd-amt'); return !!(g && g.parentElement && g.parentElement.querySelector('.acc-hero-bal')); }; // the second currency line under an account's total
  function maskText(t) { const v = t.nodeValue; masked.set(t, v); busy = true; t.nodeValue = v.replace(MONEY, (m) => (/\d/.test(m) ? (m.match(/^\s/) ? ' ' : '') + STAR + (m.match(/\s$/) ? ' ' : '') : m)); shown.set(t, t.nodeValue); busy = false; }
  function maskIn(root) {
    if (!hidden() || !root) return;
    const w = document.createTreeWalker(root.nodeType === 3 ? root.parentNode || root : root, NodeFilter.SHOW_TEXT);
    for (let t = w.currentNode.nodeType === 3 ? w.currentNode : w.nextNode(); t; t = w.nextNode()) if (!masked.has(t) && wants(t)) maskText(t);
  }
  function unmaskAll() { busy = true; masked.forEach((v, t) => { t.nodeValue = v; }); masked.clear(); busy = false; mo.takeRecords(); }
  // the balance counts up when Home is drawn fresh (not when hidden)
  function countHero() {
    const h = document.getElementById('hero'); if (!h || h.dataset.cu === h.dataset.v || hidden()) { if (h) h.dataset.cu = h.dataset.v; return; }
    const v = +h.dataset.v; h.dataset.cu = h.dataset.v; if (!isFinite(v) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const n = [...h.childNodes].find((x) => x.nodeType === 3 && /\d/.test(x.textContent)); if (!n) return;
    const final = n.textContent, digits = final.replace(/\D/g, ''); if (digits.length < 3) return;
    const sep = (final.match(/\d([^\d])\d{3}/) || [])[1] || ' ', fmtN = (x) => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    const to = +digits, t0 = performance.now(), dur = 900;
    const step = (now) => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4); n.textContent = k < 1 ? final.replace(/[\d\s.,  ]+/, fmtN(Math.round(to * e))) : final; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  const mo = new MutationObserver((ms) => {
    if (busy) return; addEye(); countHero();
    if (!hidden()) return;
    if (masked.size > 3000) masked.forEach((v, t) => { if (!t.isConnected) masked.delete(t); }); // forget pages that are gone
    ms.forEach((m) => { if (m.type === 'characterData') { const t = m.target; if (masked.has(t) && t.nodeValue === shown.get(t)) return; /* our own change */ masked.delete(t); if (wants(t)) maskText(t); } else m.addedNodes.forEach((n) => (n.nodeType === 3 ? !masked.has(n) && wants(n) && maskText(n) : maskIn(n))); });
    
  });
  const start = () => { addEye(); maskIn(document.body); mo.observe(document.body, { childList: true, subtree: true, characterData: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
