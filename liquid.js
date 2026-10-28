'use strict';
/* Liquid glass tab bar (draft). One picture only: the real icon stays where it is and simply grows while you press the bar or slide
   along it. The glass bubble sits behind it. This file only switches the class "press" on the bar; the look is all in liquid.css. */
(function () {
  // Every control with a sliding highlight: the tab bars, segmented controls (Entries / Calendar / Groups...) and the week strip.
  const SLIDERS = '.tp-tabs, .tabs, .seg, .tp-seg2.slide, .wstrip';
  let held = [];
  const release = () => { held.forEach((el) => el.classList.remove('press')); held = []; };
  document.addEventListener('pointerdown', (e) => {
    release();
    const el = e.target.closest && e.target.closest(SLIDERS);
    if (el) { el.classList.add('press'); held.push(el); }
  }, { passive: true, capture: true });
  ['pointerup', 'pointercancel'].forEach((t) => window.addEventListener(t, release, { passive: true, capture: true }));
  window.addEventListener('blur', release);
})();
