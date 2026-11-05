// Budget icons, second set (6 Nov 2026, user: "more icons to choose from, more detailed, more beautiful, then animate them").
// Same recipe as icons-ios.js: F = solid white, S = soft white, K / Kf = details cut out in the tile's own colour.
// Parts that move on their own are wrapped in A('name', ...) -> <g class="a-name"> (see iconfx.css).
// window.ICON_MOTION: which small motion each icon plays (one of the types in iconfx.css).
// window.ICON_SECTIONS: the groups shown in the icon picker.
(function () {
  const F = (d, eo) => `<path class="f"${eo ? ' fill-rule="evenodd"' : ''} d="${d}"/>`;
  const S = (d, o = 0.58) => `<path style="fill:rgba(255,255,255,${o});stroke:none" d="${d}"/>`;
  const K = (d, w = 1.4, o = 1) => `<path style="fill:none;stroke:var(--c);stroke-width:${w};stroke-linecap:round;stroke-linejoin:round;opacity:${o}" d="${d}"/>`;
  const Kf = (d, o = 1) => `<path style="fill:var(--c);stroke:none;opacity:${o}" d="${d}"/>`;
  const W = (d, w = 1.8, o = 1) => `<path style="fill:none;stroke:rgba(255,255,255,${o});stroke-width:${w};stroke-linecap:round;stroke-linejoin:round" d="${d}"/>`;
  const C = (cx, cy, r, how = 'f') => (how === 'f' ? `<circle class="f" cx="${cx}" cy="${cy}" r="${r}"/>` : how === 's' ? `<circle style="fill:rgba(255,255,255,.58);stroke:none" cx="${cx}" cy="${cy}" r="${r}"/>` : `<circle style="fill:var(--c);stroke:none" cx="${cx}" cy="${cy}" r="${r}"/>`);
  const R = (x, y, w, h, r, how = 'f') => `<rect ${how === 'f' ? 'class="f"' : how === 's' ? 'style="fill:rgba(255,255,255,.58);stroke:none"' : 'style="fill:var(--c);stroke:none"'} x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
  const A = (n, s) => `<g class="a-${n}">${s}</g>`;
  const ring = (cx, cy, r, w = 1.8, o = 1) => `<circle style="fill:none;stroke:rgba(255,255,255,${o});stroke-width:${w}" cx="${cx}" cy="${cy}" r="${r}"/>`;

  const N = {
    // ---- money ----
    piggy: S('M10 1.8h4a1.1 1.1 0 0 1 0 2.2h-4a1.1 1.1 0 0 1 0-2.2z', 0.8) + F('M4.4 12.2c0-3.6 3.4-6.4 7.6-6.4 2.4 0 4.6.9 6 2.4l2.8.7v4l-1.8.8c-.4 1.3-1.2 2.4-2.3 3.2V19a1 1 0 0 1-1 1h-1.7a1 1 0 0 1-1-1v-.9h-3.2v.9a1 1 0 0 1-1 1H8.2a1 1 0 0 1-1-1v-2.2C5.5 15.7 4.4 14.1 4.4 12.2z') + W('M4.8 10.2c-1.5-.5-2.5.2-2.6 1.4', 1.4, 0.85) + S('M9.6 6.6 8.8 3.6l3.2 1.6z', 0.85) + Kf('M16.6 10.8a.9.9 0 1 1 0 .01z') + K('M10.2 8.6h3.4', 1.4) + K('M20.6 10.2v1.8', 1.1, 0.6) + A('coin', C(12, 3, 1.4, 's')),
    chartup: R(3.4, 13.2, 3.8, 7.4, 1.1, 's') + R(9.6, 9.4, 3.8, 11.2, 1.1, 's') + R(15.8, 5.6, 3.8, 15, 1.1) + A('arrow', W('M3.6 9.6l5.2-4.4 3.4 2.6 5.2-4.6', 1.9) + F('M15.4 2.6h5.8v5.8z')),
    trophy: W('M7 5H4.4v1.8a3.6 3.6 0 0 0 3.4 3.6M17 5h2.6v1.8a3.6 3.6 0 0 1-3.4 3.6', 1.7, 0.8) + F('M6.8 3.2h10.4v5.6a5.2 5.2 0 0 1-10.4 0z') + S('M10.4 14h3.2v3.4h-3.2z', 0.8) + F('M7.8 17.2h8.4a1.1 1.1 0 0 1 1.1 1.1V20.6H6.7v-2.3a1.1 1.1 0 0 1 1.1-1.1z') + Kf('M12 5.2l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z') + A('shine', S('M8.6 4.6c-.6.2-.9.8-.9 1.8', 0)),
    dollar: C(12, 12, 9.6) + ring(12, 12, 7.5, 0, 0) + `<circle style="fill:none;stroke:var(--c);stroke-width:.9;opacity:.45" cx="12" cy="12" r="7.8"/>` + K('M14.9 9.2c-.6-.9-1.6-1.4-2.9-1.4-1.6 0-2.8.8-2.8 2 0 3 5.8 1.4 5.8 4.4 0 1.2-1.2 2-2.9 2-1.3 0-2.4-.6-3.1-1.6M12 6.2v1.6M12 16.6v1.6', 1.7),
    exchange: W('M3.6 8.4h14', 2.1) + F('M16.6 4.8l4.2 3.6-4.2 3.6z') + W('M20.4 15.6h-14', 2.1, 0.75) + S('M7.4 12l-4.2 3.6 4.2 3.6z', 0.85),
    transfer: W('M3.6 8.4h14', 2.1) + F('M16.6 4.8l4.2 3.6-4.2 3.6z') + W('M20.4 15.6h-14', 2.1, 0.75) + S('M7.4 12l-4.2 3.6 4.2 3.6z', 0.85),
    split: F('M12 3.2a8.8 8.8 0 1 0 8.8 8.8H12z') + S('M14 1.4a8.8 8.8 0 0 1 8.6 8.6H14z', 0.8) + K('M12 12 5.8 18.2', 1.2, 0.4),
    percent: C(12, 12, 9.6) + W('M0 0', 0) + C(8.6, 8.6, 1.9, 'k') + C(15.4, 15.4, 1.9, 'k') + K('M16.2 7.8 7.8 16.2', 2),
    wallet2: '',
    lock: W('M8 10.4V7.6a4 4 0 0 1 8 0v2.8', 2.2) + F('M5.2 10h13.6a2.2 2.2 0 0 1 2.2 2.2v6.6a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 18.8v-6.6A2.2 2.2 0 0 1 5.2 10z') + C(12, 14.4, 1.9, 'k') + R(11.2, 15.2, 1.6, 3.4, 0.8, 'k') + S('M5.2 10h13.6A2.2 2.2 0 0 1 21 12.2v.6H3v-.6A2.2 2.2 0 0 1 5.2 10z', 0.0),
    key: A('head', C(7.2, 12, 4.6) + C(7.2, 12, 1.9, 'k')) + R(10.8, 10.8, 10.8, 2.5, 1.25) + R(15.8, 13, 2, 3.4, 0.8) + R(19, 13, 2, 2.4, 0.8) + S('M4.6 9.6a3.6 3.6 0 0 1 2.6-1.6', 0),
    bell: A('bell', F('M12 2.6c-.8 0-1.4.6-1.4 1.4v.6C7.8 5.4 6.4 7.6 6.4 10.4v3.2c0 1.2-.6 2-1.6 2.8-.4.4-.2 1.2.4 1.2h13.6c.6 0 .8-.8.4-1.2-1-.8-1.6-1.6-1.6-2.8v-3.2c0-2.8-1.4-5-4.2-5.8V4c0-.8-.6-1.4-1.4-1.4z') + K('M8.8 10.4c0-1.3.6-2.3 1.6-3', 1.3, 0.55)) + S('M9.6 19.4h4.8a2.4 2.4 0 0 1-4.8 0z', 0.9),
    mail: R(2.4, 5, 19.2, 14, 3.2) + S('M2.4 8.2a3.2 3.2 0 0 1 3.2-3.2h12.8a3.2 3.2 0 0 1 3.2 3.2l-9.6 6.2z', 0.0) + K('M3.8 7.6 12 13.4l8.2-5.8', 1.7),
    // ---- work and school ----
    pencil: `<g transform="rotate(45 12 12)">` + F('M9.2 3.4a1.2 1.2 0 0 1 1.2-1.2h3.2a1.2 1.2 0 0 1 1.2 1.2V15.2H9.2z') + S('M9.2 3.4a1.2 1.2 0 0 1 1.2-1.2h3.2a1.2 1.2 0 0 1 1.2 1.2V5.4H9.2z', 0.8) + K('M9.2 5.4h5.6', 1.1) + S('M9.2 15.2h5.6L12 21z', 0.8) + Kf('M11 18.8h2L12 21z') + K('M12 7.4v6', 1, 0.45) + `</g>`,
    backpack: W('M10 5V4a2 2 0 0 1 4 0v1', 1.7) + F('M6.4 9.2a5.6 5.6 0 0 1 11.2 0V19a2.4 2.4 0 0 1-2.4 2.4H8.8A2.4 2.4 0 0 1 6.4 19z') + R(8.6, 13.6, 6.8, 5.4, 2, 's') + K('M8.6 10.6h6.8', 1.3) + K('M10.6 15.6h2.8', 1.2) + Kf('M11.2 7.4h1.6v1.6h-1.6z'),
    printer: S('M7.2 2.6h9.6a1 1 0 0 1 1 1V8H6.2V3.6a1 1 0 0 1 1-1z', 0.85) + F('M4.6 8h14.8a2.8 2.8 0 0 1 2.8 2.8v5a2.2 2.2 0 0 1-2.2 2.2H4a2.2 2.2 0 0 1-2.2-2.2v-5A2.8 2.8 0 0 1 4.6 8z') + R(6.6, 13.2, 10.8, 8, 1.4, 's') + K('M8.6 16.2h6.8M8.6 18.4h4.4', 1.1) + C(18.2, 11, 0.9, 'k'),
    chat: F('M12 3.4c5 0 9 3.2 9 7.4s-4 7.4-9 7.4c-1 0-2-.1-2.9-.4L5 20.4c-.4.2-.9-.1-.8-.6l.8-3.2C3.4 15.2 3 13.2 3 10.8c0-4.2 4-7.4 9-7.4z') + A('dots', C(8, 10.8, 1.2, 'k') + C(12, 10.8, 1.2, 'k') + C(16, 10.8, 1.2, 'k')),
    video: R(2.4, 6.4, 13.8, 11.4, 3.2) + S('M17.6 10.6l3.2-2.2a.9.9 0 0 1 1.4.8v5.6a.9.9 0 0 1-1.4.8l-3.2-2.2z', 0.9) + A('rec', C(6.6, 10.2, 1.3, 'k')) + K('M9.8 10.2h3.6', 1.4, 0.5),
    calendar: R(3, 4.6, 18, 16.6, 3.2) + Kf('M6.2 4.6h11.6A3.2 3.2 0 0 1 21 7.8v2H3v-2a3.2 3.2 0 0 1 3.2-3.2z') + R(7.4, 2.4, 2, 4, 1) + R(14.6, 2.4, 2, 4, 1) + C(8, 13.4, 1, 'k') + C(12, 13.4, 1, 'k') + C(16, 13.4, 1, 'k') + C(8, 17.2, 1, 'k') + A('day', C(12, 17.2, 2.2, 'k') + C(12, 17.2, 1.1, 'f')),
    clock: C(12, 12, 9.6) + `<circle style="fill:none;stroke:var(--c);stroke-width:.9;opacity:.4" cx="12" cy="12" r="7.8"/>` + K('M12 4.8v1.2M12 18v1.2M4.8 12H6M18 12h1.2', 1.2, 0.8) + A('minute', K('M12 12V7.2', 1.9)) + A('hour', K('M12 12l3.2 1.9', 1.9)) + C(12, 12, 1.2, 'k'),
    image: R(2.8, 4.6, 18.4, 14.8, 3.2) + Kf('M2.8 16.4l5.2-5.6a1.2 1.2 0 0 1 1.7 0l4 4.3 2-2.1a1.2 1.2 0 0 1 1.7 0l3.8 3.8v.1a3.2 3.2 0 0 1-3.2 3.2H6a3.2 3.2 0 0 1-3.2-3.2z', 0.9) + C(16.4, 9, 1.8, 'k'),
    report: R(4.2, 2.6, 15.6, 18.8, 3) + R(7.6, 12.2, 2.4, 5.2, 0.8, 'k') + R(11.2, 9.4, 2.4, 8, 0.8, 'k') + R(14.8, 6.6, 2.4, 10.8, 0.8, 'k') + K('M7.6 20h8.8', 0, 0),
    flask: S('M9.6 2.6h4.8a.9.9 0 0 1 0 1.8h-.6v4.4l5.2 9a2.6 2.6 0 0 1-2.2 3.9H7.2A2.6 2.6 0 0 1 5 17.8l5.2-9V4.4h-.6a.9.9 0 0 1 0-1.8z', 0.9) + F('M7.4 14.2h9.2l2.6 4.4a2.6 2.6 0 0 1-2.2 3.8H7a2.6 2.6 0 0 1-2.2-3.8z') + C(10.4, 17.8, 1, 'k') + C(14, 16.4, 0.8, 'k') + A('bub', C(13.6, 19.4, 0.7, 'k')),
    sun: A('rays', W('M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6', 2.1)) + C(12, 12, 4.8) + S('M9.2 9.4a3.6 3.6 0 0 1 3.4-1.4', 0),
    // ---- food ----
    bag: W('M8.4 10V6.8a3.6 3.6 0 0 1 7.2 0V10', 1.9) + F('M4.8 8h14.4l1 11.6a2.2 2.2 0 0 1-2.2 2.4H6a2.2 2.2 0 0 1-2.2-2.4z') + S('M4.8 8h14.4l.2 2.6H4.6z', 0.6) + K('M9.4 14.2c1.4 2 3.8 2 5.2 0', 1.5),
    burger: F('M3.4 10.6C3.4 6.2 7.2 3.6 12 3.6s8.6 2.6 8.6 7z') + K('M8 6.6h.01M12 5.6h.01M16 6.6h.01M10 8.4h.01M14 8.4h.01', 1.4) + S('M3 12c1.2 1.4 2.4 1.4 3.6 0s2.4-1.4 3.6 0 2.4 1.4 3.6 0 2.4-1.4 3.6 0 1.8 1 3.2 0v1.2H3z', 0.95) + R(3.4, 14, 17.2, 2.4, 1.2, 's') + F('M3.4 17.4h17.2v.4a2.8 2.8 0 0 1-2.8 2.8H6.2a2.8 2.8 0 0 1-2.8-2.8z'),
    pizza: A('slice', F('M12 21.6 3.4 5.4a19.6 19.6 0 0 1 17.2 0z') + S('M3.1 4.8a19.8 19.8 0 0 1 17.8 0l.4.8a19.6 19.6 0 0 0-18.6 0z', 0.0) + S('M3.5 5.6a19.6 19.6 0 0 1 17 0l-1.2 2.4a16.8 16.8 0 0 0-14.6 0z', 0.7) + C(9.6, 11, 1.4, 'k') + C(14.6, 10.6, 1.3, 'k') + C(12, 15.6, 1.2, 'k')),
    apple: W('M12 7.6c0-1.4.4-2.4 1.2-3.4', 1.5, 0.9) + F('M12 7.6c1.6-1 4-1.2 5.8.2 2.6 2 2.6 6 1.2 9-1 2.2-2.6 4.4-4.4 4.4-.8 0-1.2-.4-2.6-.4s-1.8.4-2.6.4c-1.8 0-3.4-2.2-4.4-4.4-1.4-3-1.4-7 1.2-9 1.8-1.4 4.2-1.2 5.8-.2z') + S('M12.4 6.6c-.4-2.2.8-4 3.2-4.6.4 2.2-.8 4.2-3.2 4.6z', 0.85) + K('M7.8 12.4c.2-1.2.9-2.1 1.9-2.6', 1.3, 0.6),
    bread: F('M5.2 9.6C3.4 8.4 3 5.8 4.8 4.4 6.6 3 9.6 3.4 12 3.4s5.4-.4 7.2 1c1.8 1.4 1.4 4-.4 5.2V18a2.4 2.4 0 0 1-2.4 2.4H7.6A2.4 2.4 0 0 1 5.2 18z') + K('M8.2 10.4l2.2 3.6M12.6 9.8l2.2 3.6M9.6 16l1.4 2.4', 1.4) + S('M5.2 9.6C3.4 8.4 3 5.8 4.8 4.4', 0),
    drink: W('M13 6.6l1.4-4h2.6', 1.8) + S('M5.4 6.2h13.2a1.1 1.1 0 0 1 0 2.2H5.4a1.1 1.1 0 0 1 0-2.2z', 0.85) + F('M6.4 8.4h11.2l-1.2 11.8a1.8 1.8 0 0 1-1.8 1.6H9.4a1.8 1.8 0 0 1-1.8-1.6z') + Kf('M7.1 13h9.8l-.5 5.6a1.1 1.1 0 0 1-1.1 1H8.7a1.1 1.1 0 0 1-1.1-1z', 0.28) + A('ice', R(9.6, 14, 2.6, 2.6, 0.7, 'k') + R(12.8, 15.6, 2.2, 2.2, 0.6, 'k')),
    // ---- transport and home ----
    bike: ring(5.8, 16, 3.8, 2) + ring(18.2, 16, 3.8, 2) + W('M5.8 16 9.8 8.6h5.2l3.2 7.4M9.8 8.6l3.4 7.4h-7.4M8.4 6h3', 1.8) + A('pedal', C(12.8, 16, 1.3)) + F('M13.6 6.4h3.4v1.4h-3.4z'),
    train: F('M7.4 2.8h9.2A3.2 3.2 0 0 1 19.8 6v8.4a3.2 3.2 0 0 1-3.2 3.2H7.4a3.2 3.2 0 0 1-3.2-3.2V6a3.2 3.2 0 0 1 3.2-3.2z') + R(6.4, 5.2, 11.2, 5.4, 1.6, 'k') + S('M6.4 5.2h5.6l-2.6 5.4H6.4z', 0.0) + C(8.4, 13.8, 1.1, 'k') + C(15.6, 13.8, 1.1, 'k') + W('M8.2 17.6 6 21.2M15.8 17.6l2.2 3.6', 1.9) + A('lamp', R(10.6, 13.2, 2.8, 1.2, 0.6, 'k')),
    parking: R(3, 3, 18, 18, 4.6) + K('M9.6 17.4V6.8h3.6a3.4 3.4 0 0 1 0 6.8H9.6', 2.5) + S('M3 8a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v.6H3z', 0),
    sofa: R(5, 5.6, 14, 7.6, 3.2) + F('M2.6 12.2a2 2 0 0 1 2-2h.6v6h13.6v-6h.6a2 2 0 0 1 2 2V17a1.6 1.6 0 0 1-1.6 1.6H4.2A1.6 1.6 0 0 1 2.6 17z') + R(6.4, 8.6, 5.2, 4.6, 1.8, 's') + R(12.4, 8.6, 5.2, 4.6, 1.8, 's') + R(4.4, 18.4, 1.8, 2.2, 0.9) + R(17.8, 18.4, 1.8, 2.2, 0.9),
    bed: R(2.2, 5.4, 2.6, 15, 1.3) + R(2.2, 12.6, 19.6, 5.6, 2) + R(5.8, 8.6, 5.4, 3.6, 1.8, 's') + S('M12.2 10.2h7a2.6 2.6 0 0 1 2.6 2.6v.4h-9.6z', 0.8) + R(19.2, 17.2, 2.6, 3.2, 1.3),
    bulb: W('M2.8 9H4.4M19.6 9h1.6M5 3.8l1.1 1.1M19 3.8l-1.1 1.1', 1.5, 0.75) + F('M12 2.8a6.4 6.4 0 0 1 3.8 11.6V16a1 1 0 0 1-1 1H9.2a1 1 0 0 1-1-1v-1.6A6.4 6.4 0 0 1 12 2.8z') + S('M9.4 18.2h5.2v.8a2 2 0 0 1-2 2h-1.2a2 2 0 0 1-2-2z', 0.85) + A('fil', K('M10.2 12.6l1.8-2.6 1.8 2.6M12 10v5.2', 1.2)),
    drop: F('M12 2.4C9 6.6 5.6 10 5.6 14.2a6.4 6.4 0 0 0 12.8 0C18.4 10 15 6.6 12 2.4z') + K('M8.6 14.6a3.4 3.4 0 0 0 2.6 3', 1.5, 0.7) + S('M13.4 7.6c.8 1 1.4 1.8 1.6 2.6', 0),
    flame: F('M12.4 2c.4 3 3.2 4.6 4.6 7.6 1.6 3.2.8 7.2-2 9.4-1.4 1.2-3.2 1.8-4.8 1.8-3.6 0-6.4-2.8-6.4-6.4 0-2 .9-3.6 2-4.8.4 1.2 1.2 2 2 2.2-.6-3 .6-6.6 4.6-9.8z') + A('core', Kf('M12.2 11.8c1.8 1.6 3.2 2.9 3.2 4.8a3.4 3.4 0 0 1-6.8 0c0-1.6 1.2-2.8 2-3.8.4.6.8 1 1.4 1.2-.2-.8-.2-1.4.2-2.2z', 0.3)),
    // ---- health, fun, life ----
    tooth: F('M7.2 3.6c1.6-.8 3.2 0 4.8 0s3.2-.8 4.8 0c2.2 1 3 3.6 2.4 6.2-.4 1.8-.8 3-1.2 5-.4 2-.8 5.2-2.2 5.2s-1.4-3.4-2-5c-.4-1.2-.8-1.6-1.8-1.6s-1.4.4-1.8 1.6c-.6 1.6-.6 5-2 5s-1.8-3.2-2.2-5.2c-.4-2-.8-3.2-1.2-5-.6-2.6.2-5.2 2.4-6.2z') + K('M8 6.2c-.8.4-1.2 1.4-1 2.6', 1.3, 0.55) + A('tw', S('M19.4 2.6l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z', 0.9)),
    stetho: W('M6.4 3.4v5a3.8 3.8 0 0 0 7.6 0v-5', 1.9) + C(6.4, 3, 1.1) + C(14, 3, 1.1) + W('M10.2 12.4v1.4a4.6 4.6 0 0 0 9.2 0v-1.6', 1.9) + C(19.4, 10.6, 2.5) + C(19.4, 10.6, 1.1, 'k'),
    medkit: W('M8.6 7.4V5.6a1.6 1.6 0 0 1 1.6-1.6h3.6a1.6 1.6 0 0 1 1.6 1.6v1.8', 1.9) + R(2.6, 7, 18.8, 13.4, 3.2) + A('cross', Kf('M10.6 10.2h2.8v2.4h2.4v2.8h-2.4v2.4h-2.8v-2.4H8.2v-2.8h2.4z')),
    leaf: F('M20.8 3.2C11.2 2.2 4.4 7.2 4.4 14.2c0 1.8.6 3.4 1.6 4.6 1.2 1.2 2.8 1.8 4.8 1.8 6.6 0 10.4-6.2 10-17.4z') + K('M5.6 20.4C8.6 14.6 12.4 10.6 17 8', 1.5) + K('M10.4 14.8h3.4M13 11.6h2.6', 1.1, 0.7),
    camera: S('M8.6 3.6h6.8l1.4 2.8H7.2z', 0.85) + R(2.4, 6.4, 19.2, 13.4, 3.4) + C(12, 13.2, 4.6, 'k') + C(12, 13.2, 3.5, 's') + A('lens', C(12, 13.2, 2.2) + C(11.2, 12.4, 0.7, 'k')) + C(18.2, 9.4, 0.9, 'k'),
    headphones: W('M4.6 15.4V12a7.4 7.4 0 0 1 14.8 0v3.4', 2.1) + R(2.8, 13.4, 4.6, 7.4, 2.2) + R(16.6, 13.4, 4.6, 7.4, 2.2) + R(4.1, 15.2, 2, 3.8, 1, 'k') + R(17.9, 15.2, 2, 3.8, 1, 'k'),
    palette: F('M12 2.6c5.4 0 9.6 3.8 9.6 8.4 0 3-2.2 4.4-4.6 4.4h-1.8c-1.2 0-2 1-1.6 2 .4 1.2.8 2-.4 3-.6.4-1.2.6-1.8.6-5 0-8.8-4-8.8-9.2 0-5 4-9.2 9.4-9.2z') + C(7.8, 10.8, 1.5, 'k') + C(10.6, 6.8, 1.5, 'k') + C(15.2, 6.8, 1.5, 'k') + C(18, 10.8, 1.5, 'k'),
    ball: C(12, 12, 9.6) + Kf('M12 8l3.4 2.5-1.3 4h-4.2l-1.3-4z') + K('M12 8V4M15.4 10.5l3.8-1.2M14.1 14.5l2.4 3.2M9.9 14.5l-2.4 3.2M8.6 10.5 4.8 9.3', 1.2),
    ticket: F('M3 7.6a2.2 2.2 0 0 1 2.2-2.2h13.6A2.2 2.2 0 0 1 21 7.6v2.2a2.2 2.2 0 0 0 0 4.4v2.2a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 16.4v-2.2a2.2 2.2 0 0 0 0-4.4z') + K('M15 7.6v1.6M15 11.2v1.6M15 14.8v1.6', 1.4) + A('star', Kf('M8.8 8.4l1.1 2.2 2.4.4-1.7 1.7.4 2.4-2.2-1.1-2.2 1.1.4-2.4-1.7-1.7 2.4-.4z')),
    balloon: W('M12 17.8c-1.2 1.4 1.2 2.6 0 4', 1.4, 0.85) + A('b', F('M12 2.6c3.6 0 6 2.8 6 6.2 0 3.6-2.6 6.4-6 7.2-3.4-.8-6-3.6-6-7.2 0-3.4 2.4-6.2 6-6.2z') + S('M12 16l-1.5 1.7h3z', 0.9) + K('M8.8 6.6c-.9.7-1.3 1.9-1.1 3.2', 1.4, 0.5)),
    crescent: F('M15.4 2.8a9.4 9.4 0 1 0 5.8 15A8.4 8.4 0 0 1 15.4 2.8z') + A('star', S('M18.4 4.2l.8 1.7 1.8.3-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.3z', 0.95)),
    ring: A('gem', F('M9 2.8h6l2.6 2.8L12 11 6.4 5.6z') + K('M6.6 5.7h10.8M9.4 2.9 8.8 5.7 12 10.6l3.2-4.9-.6-2.8', 0.9)) + `<circle style="fill:none;stroke:#fff;stroke-width:2.3" cx="12" cy="16" r="5.2"/>`,
    flower: A('petals', C(12, 5.8, 3.3) + C(17.8, 10.2, 3.3) + C(15.6, 17, 3.3) + C(8.4, 17, 3.3) + C(6.2, 10.2, 3.3)) + C(12, 12.4, 3, 'k') + C(12, 12.4, 1.6, 's'),
    video2: '',
    sparkle: '',
  };
  delete N.wallet2; delete N.video2; delete N.sparkle;
  Object.keys(N).forEach((k) => { if (!N[k]) delete N[k]; });

  // Existing icons get their moving parts. (icons-ios.js is left as it was; these are drawn over it only when the part exists.)
  window.GLYPHS_IOS = Object.assign({}, N, window.GLYPHS_IOS || {}, { transfer: N.transfer, split: N.split, lock: N.lock, calendar: N.calendar, clock: N.clock, image: N.image, report: N.report, flask: N.flask, sun: N.sun });

  // ---- motions: one small move per icon (types are defined in iconfx.css) ----
  const M = {
    hop: 'cart gift box briefcase store bag backpack house sofa bed key safe wallet card cash bank board users family printer mail ticket',
    beat: 'heart handheart piggy medkit tooth baby',
    spin: 'coins dollar globe gem refund exchange transfer split percent clock',
    flick: 'bolt bulb sparkles star flame leaf',
    drive: 'car bus train bike fuel parking',
    fly: 'plane',
    wiggle: 'wrench scissors pill pencil paw dumbbell gamepad phone film gradcap book laptop shirt tag receipt calendar camera headphones music palette ball',
    float: 'coffee drink balloon utensils burger pizza apple bread cake bell umbrella',
    pulse: 'target shield lock flask chart chartup trophy usercheck drop wifi image report',
    twirl: 'sun flower crescent ring',
    nod: 'chat video stetho',
  };
  window.ICON_MOTION = {};
  Object.keys(M).forEach((t) => M[t].split(' ').forEach((g) => { window.ICON_MOTION[g] = t; }));
  window.ICON_MOTION.bell = 'swing'; window.ICON_MOTION.umbrella = 'swing'; window.ICON_MOTION.tag = 'swing'; window.ICON_MOTION.key = 'swing';

  // ---- picker sections ----
  window.ICON_SECTIONS = [
    ['Money', 'briefcase coins cash dollar card wallet bank safe piggy chartup trophy percent exchange refund receipt gem'],
    ['Work and school', 'board laptop pencil backpack gradcap book printer chat video calendar clock mail family users usercheck'],
    ['Food and drink', 'cart bag utensils coffee drink burger pizza apple bread cake'],
    ['Transport', 'car bus train bike plane fuel parking'],
    ['Home and bills', 'house sofa bed key lock bolt bulb drop flame phone wrench'],
    ['Health and care', 'pill stetho medkit tooth shirt scissors baby paw'],
    ['Fun and life', 'gamepad film music headphones camera palette ball dumbbell ticket sparkles star heart handheart gift balloon crescent ring flower leaf globe umbrella sun'],
    ['Other', 'store tag box target shield'],
  ].map(([n, s]) => [n, s.split(' ')]);
})();
