// Line icons drawn on a 24×24 grid, stroked in white on a coloured tile.
// Class "f" marks a part that is filled instead of stroked.
window.GLYPHS = {
  // ---- money in ----
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"/><path d="M3 12.5h18"/><path d="M10.5 12.5v1.5h3v-1.5"/>',
  family: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c0-3.1 2.5-5.5 5.5-5.5s5.5 2.4 5.5 5.5"/><circle cx="16.8" cy="9.2" r="2.5"/><path d="M16.3 14.1c2.5-.2 4.4 1.7 4.4 4.4"/>',
  gift: '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/><path d="M12 8.5v12"/><path d="M12 8.5S10.9 4 8.5 4.2C7 4.3 6.8 6.3 8.2 7.3c1.3.9 3.8 1.2 3.8 1.2zM12 8.5S13.1 4 15.5 4.2c1.5.1 1.7 2.1.3 3.1-1.3.9-3.8 1.2-3.8 1.2z"/>',
  laptop: '<rect x="4.5" y="5" width="15" height="10.5" rx="1.5"/><path d="M2.5 19h19"/><path d="M4.5 15.5 3 19M19.5 15.5 21 19"/>',
  store: '<path d="M4.5 4.5h15L21 9.5H3z"/><path d="M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12.3V20h14v-7.7"/><path d="M10 20v-4.5h4V20"/>',
  refund: '<path d="M9 14 4.5 9.5 9 5"/><path d="M4.5 9.5h9.5a5.5 5.5 0 0 1 0 11H11"/>',
  usercheck: '<circle cx="10" cy="8" r="3.4"/><path d="M3.5 20c0-3.4 2.9-6 6.5-6 1.3 0 2.5.3 3.5.9"/><path d="m15 17.8 2.2 2.2 4.3-4.6"/>',
  coins: '<path d="M15 9A6 6 0 1 0 9 15"/><circle cx="15" cy="15" r="6"/><path d="M15 12.4v5.2"/><path d="M7 6.8h2v4.4"/>',

  // ---- money out ----
  cart: '<path d="M2.8 4h2.4l2.3 10.3a1.6 1.6 0 0 0 1.6 1.2h8.2a1.6 1.6 0 0 0 1.5-1.2L20.8 8H6.1"/><circle cx="9.8" cy="19.6" r="1.4" class="f"/><circle cx="17" cy="19.6" r="1.4" class="f"/>',
  utensils: '<path d="M6.5 3.5v5.5a2.5 2.5 0 0 0 2.5 2.5v0a2.5 2.5 0 0 0 2.5-2.5V3.5"/><path d="M9 3.5v17"/><path d="M17.5 20.5v-17c-2.3 1.1-3.5 3.7-3.5 6.7v4.3h3.5"/>',
  car: '<path d="M4.5 16.5v-4l2-4.9A2 2 0 0 1 8.4 6.3h7.2a2 2 0 0 1 1.9 1.3l2 4.9v4"/><rect x="3.5" y="12" width="17" height="5.5" rx="1.8"/><path d="M6.5 17.5v2M17.5 17.5v2"/><circle cx="7.6" cy="14.8" r="1" class="f"/><circle cx="16.4" cy="14.8" r="1" class="f"/>',
  house: '<path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.3V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.3"/><path d="M10 20v-5h4v5"/>',
  bolt: '<path d="M13.2 2.8 5.5 13.5h6.2l-1 7.7 7.8-10.8h-6.3z"/>',
  phone: '<rect x="6.8" y="2.8" width="10.4" height="18.4" rx="2.4"/><path d="M10.8 18h2.4"/>',
  shirt: '<path d="M8.6 4 3.8 6.6l1.7 4.1L8 9.7V20h8V9.7l2.5 1 1.7-4.1L15.4 4c-.5 1.4-1.9 2.3-3.4 2.3S9.1 5.4 8.6 4z"/>',
  pill: '<path d="M10.5 20.5a4.95 4.95 0 0 1-7-7l6-6a4.95 4.95 0 0 1 7 7z"/><path d="m6.5 10.5 7 7"/>',
  gradcap: '<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 11.6v4.6c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-4.6"/><path d="M21.5 9.5v5"/>',
  sparkles: '<path d="M11 3.5 12.9 8.6 18 10.5 12.9 12.4 11 17.5 9.1 12.4 4 10.5 9.1 8.6z"/><path d="M18.5 15.5 19.3 17.7 21.5 18.5 19.3 19.3 18.5 21.5 17.7 19.3 15.5 18.5 17.7 17.7z" class="f"/>',
  box: '<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5"/><path d="M12 12v9"/>',

  // ---- accounts ----
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2.2"/><circle cx="12" cy="12" r="2.7"/><path d="M6 9.5h.01M18 14.5h.01"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2.4"/><path d="M2.5 10h19"/><path d="M6.5 15h4"/>',
  bank: '<path d="M3.5 9.5 12 4.5l8.5 5z"/><path d="M5.8 10.5v6.8M9.9 10.5v6.8M14.1 10.5v6.8M18.2 10.5v6.8"/><path d="M3.5 20h17"/>',
  wallet: '<path d="M18 7.5V6.2A1.7 1.7 0 0 0 16.3 4.5H6A2.5 2.5 0 0 0 3.5 7v10.5a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V9.5a2 2 0 0 0-2-2H6"/><circle cx="16.5" cy="13.5" r="1.3" class="f"/>',
  safe: '<rect x="3.5" y="4" width="17" height="15" rx="2.2"/><circle cx="12" cy="11.5" r="3.6"/><path d="M12 11.5 14 9.8"/><path d="M6.5 19v1.5M17.5 19v1.5"/>',
  transfer: '<path d="M4 8h15"/><path d="M15.5 4.5 19 8l-3.5 3.5"/><path d="M20 16H5"/><path d="M8.5 12.5 5 16l3.5 3.5"/>',

  // ---- goals ----
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.5" class="f"/>',
  plane: '<path d="M21 15.5v-2l-8-5V4a1.5 1.5 0 0 0-3 0v4.5l-8 5v2l8-2.5V18l-2.2 1.6V21l3.7-1.1 3.7 1.1v-1.4L13 18v-5z"/>',
  gem: '<path d="M6.5 4h11L21 9l-9 11L3 9z"/><path d="M3 9h18"/><path d="M9.8 4 8.2 9 12 20l3.8-11-1.6-5"/>',
  shield: '<path d="M12 3 19.5 6v5.6c0 4.4-3.1 8.1-7.5 9.4-4.4-1.3-7.5-5-7.5-9.4V6z"/><path d="m9 12 2.2 2.2 4-4.4"/>',
  gamepad: '<path d="M7.2 7.5h9.6a4.5 4.5 0 0 1 4.4 5.6l-.9 3.6a2.3 2.3 0 0 1-3.9 1L14.2 15h-4.4l-2.2 2.7a2.3 2.3 0 0 1-3.9-1l-.9-3.6a4.5 4.5 0 0 1 4.4-5.6z"/><path d="M8 10.2v3.6M6.2 12h3.6"/><circle cx="15.6" cy="11" r="1" class="f"/><circle cx="17.4" cy="13.2" r="1" class="f"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
  book: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',

  // ---- extra category choices ----
  board: '<rect x="3" y="3.8" width="18" height="12.2" rx="2"/><path d="m8 20.2 4-4.2 4 4.2"/><path d="M7 8.3h6M7 11.5h9"/>',
  users: '<circle cx="9" cy="8.5" r="3.1"/><path d="M3.5 19.5c0-3.1 2.5-5.5 5.5-5.5s5.5 2.4 5.5 5.5"/><path d="M15.2 5.6a3.1 3.1 0 0 1 0 5.8"/><path d="M17.3 14.2c1.9.7 3.2 2.6 3.2 4.8"/>',
  bus: '<rect x="4" y="3.5" width="16" height="14" rx="3"/><path d="M4 11h16M8 6.5h8"/><path d="M7 17.5V20M17 17.5V20"/><circle cx="8" cy="14.3" r="1" class="f"/><circle cx="16" cy="14.3" r="1" class="f"/>',
  fuel: '<path d="M5 20V5.5A1.5 1.5 0 0 1 6.5 4h6A1.5 1.5 0 0 1 14 5.5V20"/><path d="M3.5 20h12M5 10h9"/><path d="M14 8.5h2a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 0 3 0V8.2L18 5.5"/>',
  coffee: '<path d="M4.5 9h12v5.5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M16.5 10.5h1.2a2.3 2.3 0 0 1 0 4.6h-1.5"/><path d="M8 3.5V6M11.5 3.5V6"/>',
  baby: '<circle cx="12" cy="12.5" r="8"/><path d="M9.3 15a3.5 3.5 0 0 0 5.4 0"/><circle cx="9.2" cy="11.3" r="1" class="f"/><circle cx="14.8" cy="11.3" r="1" class="f"/><path d="M12 4.5c-1.4 1.3-.9 3.1.8 2.9"/>',
  paw: '<ellipse cx="12" cy="15.8" rx="4.2" ry="3.7"/><circle cx="5.8" cy="10.6" r="1.9"/><circle cx="9.4" cy="6.7" r="1.9"/><circle cx="14.6" cy="6.7" r="1.9"/><circle cx="18.2" cy="10.6" r="1.9"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  music: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  film: '<rect x="3.5" y="4" width="17" height="16" rx="2.2"/><path d="M8 4v16M16 4v16M3.5 9H8M3.5 15H8M16 9h4.5M16 15h4.5"/>',
  scissors: '<circle cx="6.5" cy="7" r="2.6"/><circle cx="6.5" cy="17" r="2.6"/><path d="M8.7 8.5 19.5 18M8.7 15.5 19.5 6"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.1-3.1a6 6 0 0 1-7.9 7.9l-6.4 6.4a2.1 2.1 0 0 1-3-3l6.4-6.4a6 6 0 0 1 7.9-7.9z"/>',
  handheart: '<path d="M12 11.5S8 9.3 8 6.6a2 2 0 0 1 4-.9 2 2 0 0 1 4 .9c0 2.7-4 4.9-4 4.9z"/><path d="M3.5 13.5v7"/><path d="M3.5 14.5h3.2l2.8 1.5h3.8a1.4 1.4 0 0 1 0 2.8H9.5"/><path d="M13.1 18.8h2.6l4.2-3.3a1.4 1.4 0 0 0-1.7-2.2l-2.7 2"/>',
  tag: '<path d="M3.5 12.2V5A1.5 1.5 0 0 1 5 3.5h7.2l8.3 8.3a1.6 1.6 0 0 1 0 2.3l-6.4 6.4a1.6 1.6 0 0 1-2.3 0z"/><circle cx="8" cy="8" r="1.4" class="f"/>',
  receipt: '<path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3z"/><path d="M9 8h6M9 11.5h6M9 15h3.5"/>',
  cake: '<path d="M4 20.5h16"/><path d="M5.5 20.5V14a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6.5"/><path d="M5.5 15.5c1.2 1 2.3 1 3.3 0s2.3-1 3.3 0 2.3 1 3.3 0 2.1-1 3.1 0"/><path d="M12 12V8.5"/><path d="M12 6.2c-.9-.7-.9-1.8 0-2.7.9.9.9 2 0 2.7z"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5S9.7 5.9 12 3.5z"/>',
  umbrella: '<path d="M3 12a9 9 0 0 1 18 0z"/><path d="M12 12v6.5a2 2 0 0 1-4 0"/><path d="M12 3v.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',

  // ---- interface ----
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.2"/><path d="M15.5 8.5V5.7a2.2 2.2 0 0 0-2.2-2.2H5.7a2.2 2.2 0 0 0-2.2 2.2v7.6a2.2 2.2 0 0 0 2.2 2.2h2.8"/>',
  share: '<path d="M12 3.5v11.5"/><path d="m7.5 8 4.5-4.5L16.5 8"/><path d="M5 12.5v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  report: '<path d="M6.5 3.5h7l4 4v11a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z"/><path d="M13.5 3.5v4h4"/><path d="M9 17v-3M12 17v-5M15 17v-2"/>',
  grip: '<circle cx="9" cy="6" r="1.5" class="f"/><circle cx="15" cy="6" r="1.5" class="f"/><circle cx="9" cy="12" r="1.5" class="f"/><circle cx="15" cy="12" r="1.5" class="f"/><circle cx="9" cy="18" r="1.5" class="f"/><circle cx="15" cy="18" r="1.5" class="f"/>',
  pencil: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  minus: '<path d="M6 12h12"/>',
  plus: '<path d="M12 6v12M6 12h12"/>',

  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
  chart: '<path d="M5.5 20v-6.5M12 20V5M18.5 20v-10"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  download: '<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4.5 19.5h15"/>',
  wave: '<path d="M7.5 12.5V6.8a1.4 1.4 0 0 1 2.8 0v4.7"/><path d="M10.3 11V5.4a1.4 1.4 0 0 1 2.8 0V11"/><path d="M13.1 11V6.4a1.4 1.4 0 0 1 2.8 0v6.1"/><path d="M15.9 9.4a1.4 1.4 0 0 1 2.8 0V14a7 7 0 0 1-7 7h-.6a6.5 6.5 0 0 1-5.3-2.7L3.4 15a1.5 1.5 0 0 1 2.3-1.9l1.8 1.7"/>',
  flask: '<path d="M9.5 3.5h5M10.5 3.5V9L5 18.4A1.7 1.7 0 0 0 6.5 21h11a1.7 1.7 0 0 0 1.5-2.6L13.5 9V3.5"/><path d="M7.4 15h9.2"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
};
