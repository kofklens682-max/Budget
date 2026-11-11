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

/* 10 Nov 2026: the Glass look (html.glass), the same as in the Teacher app: the tab bar gets a little smaller while the page goes down,
   and a lens bends the picture at the edge of the tab bar (Chrome; other browsers keep the plain glass). Styles: the end of ios.css. */
(function () {
  var root = document.documentElement, lastY = 0;
  window.addEventListener('scroll', function () {
    var y = window.scrollY || 0; if (Math.abs(y - lastY) < 4) return;
    root.classList.toggle('g2-down', y > lastY && y > 60); lastY = y;
  }, { passive: true });
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.tabs')) root.classList.remove('g2-down'); }, true);
  // 11 Nov: the soft screen edges of the Glass look (styles: the end of ios.css)
  function edges() { if (!document.body || document.querySelector('.g2-edge')) return; ['t', 'b'].forEach(function (k) { var e = document.createElement('div'); e.className = 'g2-edge ' + k; document.body.appendChild(e); }); }
  // 11 Nov (later): the edge strips are not added any more (lag on the phone)
  function lens() {
    return; // 11 Nov 2026: OFF. On the phone this lens (and the blur strips at the screen edges) made every scroll step slow.
    var tabs = document.querySelector('.tabs'); if (!tabs) return;
    var w = Math.round(tabs.offsetWidth), h = Math.round(tabs.offsetHeight), r = Math.min(h / 2, 36), band = 14;
    if (!w || !h) return;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
    for (var py = 0; py < h; py++) for (var px = 0; px < w; px++) {
      var cx = Math.min(Math.max(px + .5, r), w - r), cy = Math.min(Math.max(py + .5, r), h - r);
      var vx = px + .5 - cx, vy = py + .5 - cy, len = Math.sqrt(vx * vx + vy * vy), dist, nx = 0, ny = 0;
      if (len > 0) { dist = r - len; nx = -vx / len; ny = -vy / len; }
      else { var dl = px + .5, dr = w - px - .5, dt = py + .5, db = h - py - .5; dist = Math.min(dl, dr, dt, db); if (dist === dl) nx = 1; else if (dist === dr) nx = -1; else if (dist === dt) ny = 1; else ny = -1; }
      var k = dist < band ? Math.pow(1 - Math.max(dist, 0) / band, 2) : 0, i = (py * w + px) * 4;
      d[i] = 128 + nx * k * 127; d[i + 1] = 128 + ny * k * 127; d[i + 2] = 128; d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    var old = document.getElementById('g2-svg'); if (old) old.remove();
    var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.id = 'g2-svg'; svg.setAttribute('width', 0); svg.setAttribute('height', 0); svg.style.position = 'absolute';
    var ch = function (n, sc, m) { return '<feDisplacementMap in="SourceGraphic" in2="m" scale="' + sc + '" xChannelSelector="R" yChannelSelector="G" result="d' + n + '"/><feColorMatrix in="d' + n + '" type="matrix" values="' + m + '" result="c' + n + '"/>'; };
    svg.innerHTML = '<filter id="g2lens-tabs" x="0" y="0" width="' + w + '" height="' + h + '" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">'
      + '<feImage href="' + c.toDataURL() + '" x="0" y="0" width="' + w + '" height="' + h + '" result="m"/>'
      + ch('r', 42, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0') + ch('g', 38, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0') + ch('b', 34, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0')
      + '<feBlend in="cr" in2="cg" mode="screen" result="rg"/><feBlend in="rg" in2="cb" mode="screen"/></filter>';
    document.body.appendChild(svg);
    var ok = window.CSS && CSS.supports && CSS.supports('backdrop-filter', 'url(#a) blur(2px)') && /Chrome\//.test(navigator.userAgent);
    root.classList.toggle('g2-lens', !!ok);
  }
  setTimeout(lens, 600);
  window.addEventListener('resize', function () { setTimeout(lens, 200); });
})();
