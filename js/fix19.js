'use strict';
/* fix19 (the "last changes" round, Fable). Loaded last.
   1) "Bend while scrolling": Budget scrolls the whole window (Teacher scrolls a box inside), so the phone moved the picture under the
      bar without asking the lens to bend it again until the page stopped. Now, while that switch is on, every scroll step asks for it.
   2) The diary: an open copybook of TWO pages (top + bottom, rings between). Only the two pages you look at are drawn
      (before: every page of every entry was built at once and stacked on top of each other: that was the lag).
      Each line: time, who, the account, the amount on the right; a day starts with its own line; All / Added / Changed / Deleted. */

(function () {
  const root = document.documentElement; let raf = 0, flip = 0;
  window.addEventListener('scroll', () => {
    if (raf || !root.classList.contains('g2-live')) return;
    raf = requestAnimationFrame(() => { raf = 0; const m = document.querySelector('#g2lens-tabs feDisplacementMap'); if (!m) return;
      if (m._base == null) m._base = +m.getAttribute('scale') || 0; flip ^= 1; m.setAttribute('scale', (m._base + (flip ? 0.02 : 0)).toFixed(2)); });
  }, { passive: true });
})();

{
  const LINES = 6, KIND = { add: '', edit: 'Changed', del: 'Deleted' };
  let D = { f: 'all', at: 0, pages: [], n: 0 };
  const parse = (w) => { const s = String(w || ''); let m = /^(.*), ([^,·]+?)( in)? · ([^·]*)$/.exec(s); if (m) return { who: m[1], amt: m[2], inn: !!m[3], acc: m[4] };
    m = /^(.*), ([^,]+)$/.exec(s); return m ? { who: m[1], amt: m[2], inn: false, acc: '' } : { who: s, amt: '', inn: false, acc: '' }; };
  function build() {
    const items = diaryItems().filter((x) => D.f === 'all' || x.k === D.f), per = new Map(); items.forEach((x) => per.set(x.day, (per.get(x.day) || 0) + 1));
    const pages = []; let cur = [], day = '';
    items.forEach((x) => { const need = x.day !== day ? 2 : 1; if (cur.length + need > LINES) { pages.push(cur); cur = []; day = ''; }
      if (x.day !== day) { cur.push({ h: x.day, n: per.get(x.day) }); day = x.day; } cur.push(x); });
    if (cur.length) pages.push(cur);
    D.pages = pages; D.n = items.length; D.at = Math.max(0, Math.min(D.at, Math.ceil(pages.length / 2) - 1));
  }
  const line = (x) => {
    if (x.h) return `<div class="cb-l h"><b>${esc(dayLabel(x.h))}${x.h.slice(0, 4) !== todayIso().slice(0, 4) ? ', ' + esc(x.h.slice(0, 4)) : ''}</b><span>${x.n} ${x.n === 1 ? 'entry' : 'entries'}</span></div>`;
    const p = parse(x.w), sub = [KIND[x.k], p.acc].filter(Boolean).join(' · ');
    return `<div class="cb-l ${x.k}"><span class="tm">${x.time || ''}</span><span class="tx"><b>${esc(p.who)}</b>${sub ? `<small>${esc(sub)}${x.k === 'edit' && x.old && x.old !== x.w ? ' · was ' + esc(parse(x.old).amt || x.old) : ''}</small>` : ''}</span><em class="${x.k === 'del' ? 'del' : p.inn ? 'in' : 'out'}">${p.inn && x.k !== 'del' ? '+' : ''}${esc(p.amt)}</em></div>`;
  };
  const page = (i, cls) => { const pg = D.pages[i] || []; return `<div class="cb-page ${cls}">${pg.map(line).join('')}${'<div class="cb-l e"></div>'.repeat(Math.max(0, LINES - pg.length))}<span class="cb-n">${i < D.pages.length ? i + 1 : ''}</span></div>`; };
  const spread = () => `${page(D.at * 2, 'top')}<div class="cb-rings">${'<i></i>'.repeat(9)}</div>${page(D.at * 2 + 1, 'bot')}`;
  const label = () => { const a = D.at * 2 + 1, b = Math.min(D.pages.length, a + 1); return D.pages.length ? `Page${b > a ? 's' : ''} ${a}${b > a ? '–' + b : ''} of ${D.pages.length}` : ''; };
  const chips = () => [['all', 'All'], ['add', 'Added'], ['edit', 'Changed'], ['del', 'Deleted']].map(([k, t]) => `<button class="${D.f === k ? 'on' : ''}" data-act="cb-f" data-v="${k}">${t}</button>`).join('');
  const body = () => (D.pages.length
    ? `<div class="np cb" id="cb">${spread()}</div><div class="np-nav"><button class="icon-btn" data-act="nx-np" data-v="-1" aria-label="Previous pages">‹</button><span id="np-pg">${label()}</span><button class="icon-btn" data-act="nx-np" data-v="1" aria-label="Next pages">›</button></div>`
    : '<p class="hint">Nothing written here yet.</p>');
  diaryHtml = function () { // eslint-disable-line no-global-assign
    D.at = 0; D.f = 'all'; build();
    return sheetHead('Diary', '', '<button data-act="close-sheet">Done</button>') + `<div class="sheet-body nx-dsheet"><div class="cb-chips" id="cb-chips">${chips()}</div><div id="cb-body">${body()}</div></div>`;
  };
  npGo = function (d) { // eslint-disable-line no-global-assign
    const el = document.getElementById('cb'), max = Math.ceil(D.pages.length / 2) - 1, to = Math.max(0, Math.min(max, D.at + d)); if (!el || to === D.at) return;
    D.at = to; el.innerHTML = spread(); el.classList.remove('turn-f', 'turn-b'); void el.offsetWidth; el.classList.add(d > 0 ? 'turn-f' : 'turn-b');
    const l = document.getElementById('np-pg'); if (l) l.textContent = label();
  };
  ACTIONS['cb-f'] = (a, v) => { D.f = v; D.at = 0; build(); const c = document.getElementById('cb-chips'), b = document.getElementById('cb-body'); if (c) c.innerHTML = chips(); if (b) b.innerHTML = body(); };
}
