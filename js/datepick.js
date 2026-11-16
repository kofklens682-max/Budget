'use strict';
/* NEXT (16 Nov, user: "the date picker and the calendar should use the iPhone style").
   Every date and time field in the app gets an iPhone-style picker instead of the phone's own one:
   - a date: a grey pill ("17 Nov 2026"); tap it -> a month calendar slides up (arrows for the month, today in blue, the chosen day in a blue circle)
   - a birthday: day + month wheels (no year)
   - a time: hours + minutes wheels
   The real input stays hidden in the form, so saving works exactly as before. Same file in Teacher and Budget. */
(() => {
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const p2 = (n) => String(n).padStart(2, '0'), isoD = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  const parse = (v) => { const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(v || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const isBday = (inp) => /bday|birth/i.test(inp.id || '');
  const label = (inp) => {
    const v = inp.value;
    if (inp.type === 'time') return v || 'Choose';
    const d = parse(v); if (!d) return 'Choose';
    return isBday(inp) ? `${d.getDate()} ${MON[d.getMonth()]}` : `${d.getDate()} ${MON[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
  };
  const fire = (inp) => { inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); };
  function enhance(scope) {
    (scope || document).querySelectorAll('input[type="date"]:not([data-dp]),input[type="time"]:not([data-dp])').forEach((inp) => {
      inp.setAttribute('data-dp', '1'); inp.readOnly = true; inp.setAttribute('data-dpro', '1'); // read-only: the phone's own picker never opens
      if (inp.closest('.tval')) return; // Budget's Schedule shows its own time text over the field: keep it, only the picker changes
      inp.classList.add('dp-hide'); inp.tabIndex = -1;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'dp-btn' + (inp.value ? '' : ' empty'); b.textContent = label(inp);
      b._inp = inp; inp._dpb = b; inp.after(b);
    });
  }
  new MutationObserver((ms) => { for (const m of ms) if (m.addedNodes.length) { enhance(); return; } }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => enhance());

  let W = null; // the open picker
  function close() { if (!W) return; const w = W; W = null; w.el.classList.remove('show'); setTimeout(() => w.el.remove(), 380); }
  function commit(v) { const w = W; if (!w) return; w.inp.value = v; if (w.inp._dpb) { w.inp._dpb.textContent = label(w.inp); w.inp._dpb.classList.toggle('empty', !v); } fire(w.inp); }
  function shell(inner) {
    const el = document.createElement('div'); el.className = 'dp-wrap'; el.innerHTML = `<div class="dp-card" role="dialog">${inner}</div>`;
    document.body.appendChild(el); void el.offsetHeight; requestAnimationFrame(() => el.classList.add('show')); return el;
  }
  /* ---------- the month calendar ---------- */
  function calHtml(w) {
    const y = w.y, m = w.m, first = new Date(y, m, 1), pad = (first.getDay() + 6) % 7, today = isoD(new Date()), sel = w.inp.value;
    let cells = WD.map((x) => `<span>${x}</span>`).join('') + '<i></i>'.repeat(pad);
    for (let d = 1; d <= 31; d++) {
      const dt = new Date(y, m, d); if (dt.getMonth() !== m) break; const k = isoD(dt);
      const off = (w.inp.min && k < w.inp.min) || (w.inp.max && k > w.inp.max);
      cells += `<button class="${k === sel ? 'on' : ''}${k === today ? ' today' : ''}" data-dpday="${k}" ${off ? 'disabled' : ''}>${d}</button>`;
    }
    const t = isoD(new Date()), tOff = (w.inp.min && t < w.inp.min) || (w.inp.max && t > w.inp.max);
    return `<div class="dp-h"><b>${MON[m]} ${y}</b><span><button data-dpmon="-1" aria-label="Previous month"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg></button><button data-dpmon="1" aria-label="Next month"><svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></button></span></div>
      <div class="dp-g">${cells}</div>
      <div class="dp-foot"><button data-dpday="${t}" ${tOff ? 'disabled' : ''}>Today</button><button class="strong" data-dpclose>Done</button></div>`;
  }
  function openCal(inp) {
    const d = parse(inp.value) || parse(inp.max && inp.max < isoD(new Date()) ? inp.max : '') || new Date();
    W = { inp, y: d.getFullYear(), m: d.getMonth() }; W.el = shell(calHtml(W)); W.el._kind = 'cal';
  }
  /* ---------- wheels (time, birthday) ---------- */
  const IH = 36; // one row of a wheel
  function wheel(key, items, cur) { return `<div class="dp-wh" data-dpwh="${key}">${items.map(([v, t]) => `<div data-v="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${t}</div>`).join('')}</div>`; }
  function openWheels(inp) {
    let html, read;
    if (inp.type === 'time') {
      const [h, mi] = (inp.value || '15:00').split(':').map(Number), m5 = Math.round(mi / 5) * 5 % 60;
      html = `${wheel('h', Array.from({ length: 24 }, (_, i) => [i, p2(i)]), h)}<b class="dp-colon">:</b>${wheel('m', Array.from({ length: 12 }, (_, i) => [i * 5, p2(i * 5)]), m5)}`;
      read = (v) => `${p2(v.h)}:${p2(v.m)}`;
    } else { // birthday: day and month
      const d = parse(inp.value) || new Date(2000, 0, 1);
      html = `${wheel('d', Array.from({ length: 31 }, (_, i) => [i + 1, i + 1]), d.getDate())}${wheel('mo', MON.map((x, i) => [i + 1, x]), d.getMonth() + 1)}`;
      read = (v) => { const dim = new Date(2000, v.mo, 0).getDate(); return `2000-${p2(v.mo)}-${p2(Math.min(v.d, dim))}`; };
    }
    W = { inp, read, vals: {} };
    W.el = shell(`<div class="dp-title">${inp.type === 'time' ? 'Time' : 'Birthday'}</div><div class="dp-whs">${html}</div><div class="dp-foot">${inp.type === 'time' || !inp.value ? '<span></span>' : '<button data-dpclear>Clear</button>'}<button class="strong" data-dpok>Done</button></div>`);
    W.el.querySelectorAll('.dp-wh').forEach((wh) => {
      const on = wh.querySelector('.on') || wh.firstElementChild, k = wh.dataset.dpwh; W.vals[k] = +on.dataset.v;
      wh.scrollTop = [...wh.children].indexOf(on) * IH;
      let t = 0;
      wh.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => { const i = Math.max(0, Math.min(wh.children.length - 1, Math.round(wh.scrollTop / IH))), it = wh.children[i];
        wh.querySelectorAll('.on').forEach((x) => x.classList.remove('on')); it.classList.add('on'); if (W) W.vals[k] = +it.dataset.v; }, 90); }, { passive: true });
    });
  }
  function open(inp) { if (W) close(); if (inp.disabled || (inp.readOnly && !inp.hasAttribute('data-dpro'))) return; (inp.type === 'time' || isBday(inp) ? openWheels : openCal)(inp); }

  document.addEventListener('click', (e) => {
    const t = e.target;
    const b = t.closest && t.closest('.dp-btn'); if (b && b._inp) { e.preventDefault(); e.stopPropagation(); open(b._inp); return; }
    if (t.matches && t.matches('input[data-dp]')) { e.preventDefault(); e.stopPropagation(); open(t); return; }
    if (!W || !W.el.contains(t)) return;
    e.stopPropagation(); e.preventDefault();
    if (t === W.el) return close(); // a tap outside the card
    const q = (s) => t.closest(s);
    if (q('[data-dpmon]')) { W.m += +q('[data-dpmon]').dataset.dpmon; if (W.m < 0) { W.m = 11; W.y--; } if (W.m > 11) { W.m = 0; W.y++; } W.el.firstElementChild.innerHTML = calHtml(W); return; }
    if (q('[data-dpday]') && !q('[data-dpday]').disabled) { const k = q('[data-dpday]').dataset.dpday; commit(k); const d = parse(k); W.y = d.getFullYear(); W.m = d.getMonth(); W.el.firstElementChild.innerHTML = calHtml(W); setTimeout(close, 180); return; }
    if (q('.dp-wh > div')) { const it = q('.dp-wh > div'), wh = it.parentElement; wh.scrollTo({ top: [...wh.children].indexOf(it) * IH, behavior: 'smooth' }); return; }
    if (q('[data-dpok]')) { W.el.querySelectorAll('.dp-wh').forEach((wh) => { const i = Math.max(0, Math.min(wh.children.length - 1, Math.round(wh.scrollTop / IH))); W.vals[wh.dataset.dpwh] = +wh.children[i].dataset.v; }); commit(W.read(W.vals)); return close(); } // read the wheels as they stand right now
    if (q('[data-dpclear]')) { commit(''); return close(); }
    if (q('[data-dpclose]')) return close();
  }, true);
  // the phone's back button / Escape closes the picker first
  document.addEventListener('keydown', (e) => { if (W && e.key === 'Escape') { e.stopPropagation(); close(); } }, true);
  window.dpEnhance = enhance; window.dpClose = close; window.dpOpen = () => !!W;
})();
