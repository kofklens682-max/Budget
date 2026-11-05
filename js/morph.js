'use strict';
/* Open from the button (user, 4 Nov 2026): "the Cash widget itself slowly, in a very beautiful way, starts opening, and when
   it closes it does the reverse: it comes back to that thing. Like iPhone."
   The same file is in the Teacher app and in Budget (keep the two copies the same).
   Opening: the card you tapped hides, and in its exact place a copy of it starts to grow. The copy and the pop-up's box grow
   together on a spring (the iPhone curve: fast at first, then settling softly, no bounce), the card's colour turns into the
   pop-up's colour, the card's own face fades away while the box gets big, and the pop-up's content fades in as it settles.
   Closing runs the same path backwards: the content fades, the box shrinks back into the card's place, the card's face
   returns, and the real card is shown again. A pop-up pulled down by hand slides down as before. */
const Morph = (() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const OPEN = 700, CLOSE = 560;
  // an iOS-style spring (response .5 s, damping .9) as a CSS linear() curve; older phones get a close cubic-bezier
  function springCurve(dur, response = 0.5, damping = 0.9) {
    const w0 = (2 * Math.PI) / response, z = Math.min(damping, 0.999), wd = w0 * Math.sqrt(1 - z * z), pts = []; // (just under 1: at exactly 1 the formula divides by zero)
    for (let i = 0; i <= 48; i++) { const t = (i / 48) * (dur / 1000); pts.push(1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t))); }
    if (pts.some((p) => !isFinite(p))) return 'cubic-bezier(.32,.72,0,1)';
    pts[pts.length - 1] = 1; return `linear(${pts.map((p) => p.toFixed(4)).join(', ')})`;
  }
  const okLinear = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timing-function', 'linear(0, 1)');
  // 6 Nov 2026 (user: "the last frames are lagging, like reconstructing"): the open spring had a small bounce (damping .9), so
  // the pop-up grew a hair too big and, when the animation ended, snapped back in one frame. Both springs now have no bounce
  // and are fully settled before the time is up, so the last frame IS the finished pop-up.
  const EASE_OPEN = okLinear ? springCurve(OPEN, 0.48, 1) : 'cubic-bezier(.32,.72,0,1)';
  const EASE_CLOSE = okLinear ? springCurve(CLOSE, 0.4, 1) : 'cubic-bezier(.32,.72,0,1)';
  let last = null, lastT = 0;
  const pick = (e) => { const t = e.target && e.target.closest && e.target.closest('button, a, [data-act], [data-sheet], [role="button"], .card'); if (t) { last = t; lastT = performance.now(); } };
  document.addEventListener('pointerdown', pick, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') pick(e); }, true);
  const src = () => (last && performance.now() - lastT < 1200 && last.isConnected ? last : null);
  const seen = (r) => r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  const radius = (el) => { const v = parseFloat(getComputedStyle(el).borderTopLeftRadius); return isFinite(v) && v > 0 ? Math.min(v, 40) : 14; };
  const solid = (c) => c && c !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(c);

  // 5 Nov 2026 (user: "it stops somewhere at the end and just shows me the result"): the whole pop-up now zooms WITH the
  // box, like iOS: at the start it is shrunk (one scale, nothing stretched) to the card's width and moved onto the card, and
  // cut to the card's height; it then grows to full size, so its content travels and grows with the card all the way.
  function geom(panel, s) {
    const pr = panel.getBoundingClientRect(), sr = s.getBoundingClientRect();
    let k = Math.min(1, Math.max(0.2, sr.width / pr.width)), left = sr.left, top = sr.top, h = sr.height, r = radius(s);
    // 5 Nov 2026 (user: "More" in Who still owes "just disappears" when it closes): a thin, wide button (a list row, "More")
    // has almost the pop-up's width, so the pop-up could only be cut shorter. For such a button it now shrinks evenly into a
    // small rounded shape in the middle of the row, and the row comes back around it.
    if (sr.height / sr.width < 0.35 * (pr.height / pr.width)) {
      k = Math.min(k, Math.max(0.22, Math.sqrt((sr.width * sr.height) / (pr.width * pr.height)) * 1.15));
      left = sr.left + (sr.width - pr.width * k) / 2; r = Math.min(sr.height / 2, 22);
    }
    const hl = Math.min(pr.height, h / k);
    return { pr, sr, k, clip: `inset(0px 0px ${(pr.height - hl).toFixed(1)}px 0px round ${(r / k).toFixed(1)}px)`, from: `translate(${(left - pr.left).toFixed(1)}px, ${(top - pr.top).toFixed(1)}px) scale(${k.toFixed(4)})` };
  }
  // a copy of the card, laid over its place, that grows with the box (one scale for both sides, so nothing is stretched)
  function ghost(s, sr) {
    const g = s.cloneNode(true); g.removeAttribute('id'); g.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
    const cs = getComputedStyle(s);
    Object.assign(g.style, { position: 'fixed', left: sr.left + 'px', top: sr.top + 'px', width: sr.width + 'px', height: sr.height + 'px', margin: '0', zIndex: 2147483000, pointerEvents: 'none', boxSizing: 'border-box', transformOrigin: '0 0', background: cs.background, backgroundColor: cs.backgroundColor, borderRadius: cs.borderRadius, color: cs.color, boxShadow: cs.boxShadow /* the card's own shadow: without it the shadow blinked off on the first frame */, transition: 'none', animation: 'none', visibility: 'visible', overflow: 'hidden' });
    g.classList.add('mo-ghost'); g.setAttribute('aria-hidden', 'true'); document.body.appendChild(g); return g;
  }
  // 6 Nov 2026 (user: "you cannot smoothly transform a line into a bird"). iPhone does not turn every button into the window
  // it opens. Its rule: only something that already LOOKS like a small copy of what opens (a widget, a card, a picture, a
  // file) zooms into it. A plain button, pill or list row ("More", "Discount", "Mark who paid") does not change shape: the
  // pop-up, looking like itself the whole time, grows out of the button's middle and shrinks back into it, and the button
  // stays where it is. So nothing has to turn into something else, and there is no moment where one picture swaps for another.
  const isCard = (s, sr) => sr.width >= 110 && sr.height >= 64 && solid(getComputedStyle(s).backgroundColor);
  function pop(panel, sr, endRadius, closing, done) {
    const pr = panel.getBoundingClientRect(), k = Math.max(0.16, Math.min(0.45, (sr.width * 1.25) / pr.width));
    const dx = sr.left + sr.width / 2 - pr.left - (pr.width * k) / 2, dy = sr.top + sr.height / 2 - pr.top - (pr.height * k) / 2;
    const small = { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${k.toFixed(4)})`, transformOrigin: '0 0', clipPath: `inset(0px round ${(16 / k).toFixed(1)}px)` };
    const big = { transform: 'none', transformOrigin: '0 0', clipPath: `inset(0px round ${endRadius})` };
    const a = panel.animate(closing ? [big, small] : [small, big], { duration: closing ? CLOSE : OPEN, easing: closing ? EASE_CLOSE : EASE_OPEN, fill: closing ? 'forwards' : 'none' });
    panel.animate(closing ? [{ opacity: 1, offset: 0 }, { opacity: 1, offset: 0.45 }, { opacity: 0, offset: 0.9 }, { opacity: 0, offset: 1 }] : [{ opacity: 0 }, { opacity: 1, offset: 0.22 }, { opacity: 1 }], { duration: closing ? CLOSE : OPEN, easing: 'linear', fill: closing ? 'forwards' : 'none' });
    if (closing) { let fin = false; const end = () => { if (fin) return; fin = true; panel.style.visibility = 'hidden'; if (done) done(); }; a.onfinish = end; setTimeout(end, CLOSE + 150); }
    return true;
  }
  const kids = (panel) => [...panel.children].filter((x) => getComputedStyle(x).position !== 'fixed');
  const hideSrc = (s, on) => { if (s && s.style) s.style.visibility = on ? 'hidden' : ''; };

  function open(panel, s, endRadius) {
    if (RM.matches || !s || !panel.animate) return false;
    try { s._sig = sig(s); s._r = s.getBoundingClientRect(); } catch (e) { /* no copy needed */ }
    const G = geom(panel, s); if (!seen(G.sr) || !G.pr.width) return false;
    if (!isCard(s, G.sr)) return pop(panel, G.sr, endRadius, false);
    const end = `inset(0px 0px 0px 0px round ${endRadius})`, pbg = getComputedStyle(panel).backgroundColor, sbg = getComputedStyle(s).backgroundColor;
    const box = [{ clipPath: G.clip, transform: G.from, transformOrigin: '0 0' }, { clipPath: end, transform: 'none', transformOrigin: '0 0' }];
    if (solid(sbg) && solid(pbg)) { box[0].backgroundColor = sbg; box[1].backgroundColor = pbg; }
    panel.animate(box, { duration: OPEN, easing: EASE_OPEN });
    kids(panel).forEach((k, i) => k.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: Math.min(i, 6) * 14, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'backwards' }));
    const g = ghost(s, G.sr), k = Math.min(G.pr.width / G.sr.width, 4);
    g.animate([{ transform: 'none' }, { transform: `translate(${G.pr.left - G.sr.left}px, ${G.pr.top - G.sr.top}px) scale(${k})` }], { duration: OPEN, easing: EASE_OPEN, fill: 'forwards' });
    g.animate([{ opacity: 1, offset: 0 }, { opacity: 0, offset: 0.17 }, { opacity: 0, offset: 1 }], { duration: OPEN, easing: 'linear', fill: 'forwards' }).onfinish = () => g.remove();
    hideSrc(s, true); setTimeout(() => g.remove(), OPEN + 100);
    return true;
  }
  // 6 Nov 2026: the page behind often redraws while a pop-up is open, so the button that opened it is replaced by a new copy.
  // Closing then finds that new copy (same kind of element, same data, same words) and goes back into it.
  const sig = (el) => el.tagName + '|' + [...el.attributes].filter((a) => a.name.startsWith('data-') || a.name === 'class').map((a) => a.name + '=' + a.value.replace(/(mo-in|nin|pressed|active)/g, '').trim()).sort().join('&') + '|' + el.textContent.trim().slice(0, 60);
  function relink(s) {
    if (!s || s.isConnected || !s._sig) return s;
    const c = [...document.getElementsByTagName(s.tagName)].filter((x) => sig(x) === s._sig);
    if (!c.length) return s; const n = c.length === 1 ? c[0] : c.sort((a, b) => Math.hypot(a.getBoundingClientRect().left - s._r.left, a.getBoundingClientRect().top - s._r.top) - Math.hypot(b.getBoundingClientRect().left - s._r.left, b.getBoundingClientRect().top - s._r.top))[0];
    return n;
  }
  function close(panel, s, endRadius, done) {
    s = relink(s);
    if (RM.matches || !s || !s.isConnected || !panel.animate) { hideSrc(s, false); return false; }
    const G = geom(panel, s); if (!seen(G.sr) || !G.pr.width) { hideSrc(s, false); return false; }
    if (!isCard(s, G.sr)) { hideSrc(s, false); return pop(panel, G.sr, endRadius, true, done); }
    const pbg = getComputedStyle(panel).backgroundColor; hideSrc(s, false); const sbg = getComputedStyle(s).backgroundColor; hideSrc(s, true);
    kids(panel).forEach((x) => x.animate([{ opacity: 1, offset: 0 }, { opacity: 1, offset: 0.55 }, { opacity: 0, offset: 0.85 }, { opacity: 0, offset: 1 }], { duration: CLOSE, easing: 'linear', fill: 'forwards' }));
    const box = [{ clipPath: `inset(0px 0px 0px 0px round ${endRadius})`, transform: 'none', transformOrigin: '0 0' }, { clipPath: G.clip, transform: G.from, transformOrigin: '0 0' }];
    if (solid(sbg) && solid(pbg)) { box[0].backgroundColor = pbg; box[1].backgroundColor = sbg; }
    const a = panel.animate(box, { duration: CLOSE, easing: EASE_CLOSE, fill: 'forwards' });
    const g = ghost(s, G.sr), k = Math.min(G.pr.width / G.sr.width, 4), far = `translate(${G.pr.left - G.sr.left}px, ${G.pr.top - G.sr.top}px) scale(${k})`;
    g.style.opacity = '0';
    g.animate([{ transform: far }, { transform: 'none' }], { duration: CLOSE, easing: EASE_CLOSE, fill: 'forwards' });
    g.animate([{ opacity: 0, offset: 0 }, { opacity: 0, offset: 0.6 }, { opacity: 1, offset: 0.88 }, { opacity: 1, offset: 1 }], { duration: CLOSE, easing: 'linear', fill: 'forwards' });
    let fin = false; const end = () => { if (fin) return; fin = true; hideSrc(s, false); panel.style.visibility = 'hidden'; requestAnimationFrame(() => g.remove()); if (done) done(); };
    a.onfinish = end; setTimeout(end, CLOSE + 150);
    return true;
  }
  const show = (s) => { hideSrc(s, false); hideSrc(relink(s), false); }; // the card is shown again (a pop-up closed some other way)
  return { src, open, close, show, OPEN, CLOSE };
})();
