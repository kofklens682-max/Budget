'use strict';
/* Icon motion (6 Nov 2026). The look of the motion is in iconfx.css; this file only says WHEN to play it:
   - an icon is tapped,
   - an icon or category is picked in a pop-up,
   - once when the app opens, and when an entry's pop-up opens or closes (11 Nov 2026: no more replay every few seconds),
   - a new entry's row plays by itself (the .flash class from the app). */
(function () {
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  // the soft white used by every symbol (ios fills are url(#ic-white))
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.setAttribute('width', '0'); defs.setAttribute('height', '0'); defs.setAttribute('aria-hidden', 'true');
  defs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  defs.innerHTML = '<defs><linearGradient id="ic-white" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E4E8F2"/></linearGradient></defs>';
  document.body.prepend(defs);

  function play(ic) {
    if (!ic || still()) return;
    ic.classList.remove('play');
    void ic.offsetWidth; // restart the motion
    ic.classList.add('play');
    clearTimeout(ic._fx);
    ic._fx = setTimeout(() => ic.classList.remove('play'), 1250);
  }
  window.playIcon = play;

  // tap on an icon tile
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest && e.target.closest('.ic');
    if (t) play(t);
  }, { passive: true });

  // choosing in a picker: play the chosen one (the pop-up may redraw it a moment later)
  document.addEventListener('click', (e) => {
    const hit = e.target.closest && e.target.closest('.cat, .emojis button, .icon-grid button, .glyph-grid button, .swatches button');
    if (!hit) return;
    const sheet = hit.closest('.sheet') || document;
    setTimeout(() => {
      sheet.querySelectorAll('.cat.on .ic, .emojis button.on .ic, .icon-grid button.on .ic, #cat-preview .ic, .gd-hero .ic').forEach(play);
    }, 40);
  }, true);

  // 11 Nov 2026 (user): no replay every 5 seconds. The icons on screen play ONCE when the app opens, and the icons of an entry
  // play when its pop-up opens and when it closes (saved or not), so it feels alive only when something happens.
  const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  const playAll = (root, sel) => { if (document.hidden || still()) return; [...root.querySelectorAll(sel)].filter(onScreen).slice(0, 12).forEach((el, i) => setTimeout(() => play(el), i * 60)); };
  setTimeout(() => playAll(document, '#view .ic'), 700);
  const sr = document.getElementById('sheet-root');
  if (sr) new MutationObserver((ms) => ms.forEach((m) => {
    m.addedNodes.forEach((n) => { if (n.nodeType === 1 && n.classList.contains('sheet')) setTimeout(() => playAll(n, '.cat.on .ic, .gd-hero .ic, .ic.xl'), 380); });
    m.removedNodes.forEach((n) => { if (n.nodeType === 1 && n.classList.contains('sheet')) playAll(document, '#view .flash .ic, #view .ic.xl'); });
  })).observe(sr, { childList: true });
})();
