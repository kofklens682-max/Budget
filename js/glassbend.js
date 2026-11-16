'use strict';
/* 17 Nov (user): "let ME set how much the glass bends". Settings > Look > Glass bending: a slider, 0 = flat glass, 100 = as designed,
   150 = stronger. Saved on the phone (key "glass-bend"). The SAME file in Teacher and Budget. It only changes the "scale" numbers of the
   lens that liquid.js builds (#g2lens-tabs); glass.js reads the same numbers (_base) for the press wobble. */
(function () {
  const KEY = 'glass-bend', BASE = [42, 38, 34];
  const get = () => { const v = +localStorage.getItem(KEY); return localStorage.getItem(KEY) === null || isNaN(v) ? 100 : Math.min(150, Math.max(0, v)); };
  function apply() {
    const k = Math.max(get(), 2) / 100;
    document.querySelectorAll('#g2lens-tabs feDisplacementMap').forEach((m, i) => { m._base = (BASE[i] || 34) * k; m.setAttribute('scale', m._base.toFixed(1)); });
  }
  // the lens is rebuilt when the window size changes: set the numbers again
  new MutationObserver((ms) => { if (ms.some((x) => [...x.addedNodes].some((n) => n.id === 'g2-svg'))) apply(); }).observe(document.body || document.documentElement, { childList: true });
  setTimeout(apply, 700); setTimeout(apply, 1500);
  document.addEventListener('input', (e) => { const t = e.target; if (!t || !t.matches || !t.matches('[data-glassbend]')) return;
    try { localStorage.setItem(KEY, t.value); } catch (x) { /* stays for this visit */ } apply();
    const o = t.closest('.gb-row') && t.closest('.gb-row').querySelector('em'); if (o) o.textContent = label(+t.value); });
  const label = (v) => (v <= 2 ? 'Flat' : v + '%');
  const css = document.createElement('style');
  css.textContent = `.gb-row{display:block;padding:12px 16px 14px}.gb-row .t{display:flex;align-items:baseline;gap:8px;font-size:16px;font-weight:600}.gb-row .t em{margin-left:auto;font-style:normal;font-weight:600;color:#8E8E93;font-size:14px}
.gb-row small{display:block;color:#8E8E93;font-size:13px;margin:2px 0 10px}.gb-row .s{display:flex;align-items:center;gap:10px;color:#8E8E93;font-size:12px;font-weight:600}
.gb-row input[type=range]{flex:1;-webkit-appearance:none;appearance:none;height:28px;background:none;margin:0;touch-action:pan-y}
.gb-row input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:4px;background:rgba(120,120,128,.28)}
.gb-row input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:26px;height:26px;margin-top:-11px;border-radius:50%;background:#fff;box-shadow:0 .5px 4px rgba(0,0,0,.12),0 3px 8px rgba(0,0,0,.18)}`;
  document.head.appendChild(css);
  window.GlassBend = { html: () => { const v = get(); return `<div class="gb-row" data-noswipe><div class="t">Glass bending<em>${label(v)}</em></div><small>How much the tab bar bends the picture behind it</small><div class="s">Flat<input type="range" min="0" max="150" step="5" value="${v}" data-glassbend aria-label="Glass bending">Strong</div></div>`; }, apply };
})();
