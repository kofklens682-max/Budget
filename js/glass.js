'use strict';
/* NEXT (16 Nov): Budget gets the same Liquid Glass as Teacher (user: "the glass is perfect now").
   The lens stays on while you scroll, less blur in the middle, a bright rim, and the bar swells like a drop when you press it. */
(function () {
  const root = document.documentElement, bar = () => document.querySelector('.tabs');
  const watch = () => { const b = bar(); if (!b) return setTimeout(watch, 300); new MutationObserver(() => { if (b.classList.contains('mv')) b.classList.remove('mv'); }).observe(b, { attributes: true, attributeFilter: ['class'] }); };
  watch();
  let raf = 0;
  function wobble(peak) {
    const maps = document.querySelectorAll('#g2lens-tabs feDisplacementMap'); if (!maps.length) return; cancelAnimationFrame(raf);
    maps.forEach((m) => { if (m._base == null) m._base = +m.getAttribute('scale') || 0; });
    const t0 = performance.now(), D = 900;
    const step = (now) => { const t = Math.min(1, (now - t0) / D), k = Math.exp(-5 * t) * Math.cos(9 * t); maps.forEach((m) => m.setAttribute('scale', m._base + peak * k)); if (t < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  }
  document.addEventListener('pointerdown', (e) => { if (root.classList.contains('glass') && e.target.closest && e.target.closest('.tabs, .fab')) wobble(34); }, true);
})();

/* 16 Nov (user: "why don't I have the same new glass in Budget?"): Budget had an old "Look: Normal / Glass" switch and the draft
   was on Normal, so the new glass never showed. Now Budget is always glass, like Teacher, and the switch is gone from Settings. */
try { localStorage.setItem('budget-look', 'glass'); } catch (e) { /* private mode */ }
document.documentElement.classList.add('glass');
lookGet = () => 'glass';
{ const _s = settingsHtml; settingsHtml = function () { return _s.apply(this, arguments).replace(/<div class="form-label">Look<\/div>\s*<div class="seg full">[\s\S]*?<\/div>/, ''); }; }
