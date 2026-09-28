'use strict';
/* The dollar rate, kept up to date by itself: the official rate of the Central Bank of Uzbekistan
   (cbu.uz), checked when the app opens, when you come back to it, and every hour while it's open
   — the bank sets a new rate once a day. If the bank's site can't be reached, a second source
   (open.er-api.com) is asked. Nothing of yours is sent: it's a plain "what's the rate" request.
   A rate that looks wrong (not a number, far outside what's possible, or a sudden big jump that the
   second source doesn't confirm) is never used. Offline, the last rate is kept.
   S.settings.rate is the rate in use; with rateAuto on it's the bank's rate, otherwise the one
   typed in Settings (kept in S.settings.rateManual). S.settings.rateInfo = { rate, date, source, checked }. */

const RATE_SOURCES = [
  {
    id: 'cbu', name: 'Central Bank of Uzbekistan',
    url: 'https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/',
    read: (j) => {
      const r = Array.isArray(j) ? j.find((x) => x && x.Ccy === 'USD') : null;
      if (!r) return null;
      const [d, m, y] = String(r.Date || '').split('.');
      return { rate: Number(r.Rate) / (Number(r.Nominal) || 1), date: y && m && d ? `${y}-${m}-${d}` : todayIso() };
    },
  },
  {
    id: 'er', name: 'open.er-api.com',
    url: 'https://open.er-api.com/v6/latest/USD',
    read: (j) => (j && j.result === 'success' && j.rates ? { rate: Number(j.rates.UZS), date: iso(new Date((j.time_last_update_unix || Date.now() / 1000) * 1000)) } : null),
  },
];
const RATE_MIN = 1000, RATE_MAX = 100000; // so'm for a dollar: anything outside this is a broken answer
const RATE_EVERY = 60 * 60e3;              // look again after an hour
const RATE_JUMP = 0.15;                    // a bigger change than this needs the other source to agree

async function fetchRate(src) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 9000);
  try {
    const res = await fetch(`${src.url}?t=${Date.now()}`, { cache: 'no-store', signal: ctl.signal });
    if (!res.ok) return null;
    const r = src.read(await res.json());
    if (!r || !Number.isFinite(r.rate) || r.rate < RATE_MIN || r.rate > RATE_MAX) return null;
    return { rate: Math.round(r.rate * 100) / 100, date: r.date, source: src.id };
  } catch (err) {
    return null;
  } finally {
    clearTimeout(t);
  }
}
let rateBusy = null;
// Ask for today's rate. Returns 'new' (the rate changed), 'same', or 'failed'.
function refreshRate(force) {
  if (rateBusy) return rateBusy;
  const s = S.settings;
  if (!s.rateAuto) return Promise.resolve('same');
  if (!force && s.rateInfo && Date.now() - s.rateInfo.checked < RATE_EVERY) return Promise.resolve('same');
  if (!navigator.onLine) return Promise.resolve('failed');
  rateBusy = (async () => {
    let got = null;
    for (const src of RATE_SOURCES) { got = await fetchRate(src); if (got) break; }
    if (!got) return 'failed';
    const before = s.rateInfo && s.rateInfo.rate;
    if (before && Math.abs(got.rate - before) / before > RATE_JUMP) {
      // A sudden big change: believe it only if a second source says the same (within 3%).
      const other = await fetchRate(RATE_SOURCES.find((x) => x.id !== got.source));
      if (!other || Math.abs(other.rate - got.rate) / got.rate > 0.03) return 'failed';
    }
    if (!S.settings.rateAuto) return 'same'; // switched off while we were asking
    const changed = got.rate !== s.rate;
    s.rateInfo = { ...got, checked: Date.now() };
    s.rate = got.rate;
    save();
    if (changed) { if (!sheet) render(); else if (sheet.sh.querySelector('#rate-box')) paintRateBox(); }
    return changed ? 'new' : 'same';
  })().finally(() => { rateBusy = null; });
  return rateBusy;
}
// Turn the automatic rate on (the first time, and for anyone who never typed a rate) and keep it fresh.
function startRate() {
  const s = S.settings;
  const ok = (i) => i && Number.isFinite(i.rate) && i.rate >= RATE_MIN && i.rate <= RATE_MAX && /^\d{4}-\d{2}-\d{2}$/.test(i.date) && Number.isFinite(i.checked);
  if (s.rateInfo && !ok(s.rateInfo)) delete s.rateInfo; // (from an old or damaged backup)
  if (s.rateAuto === undefined) {
    s.rateAuto = true;
    if (s.rate) s.rateManual = s.rate; // a rate typed before is kept, in case automatic is switched off
    save();
  }
  refreshRate();
  setInterval(() => { if (!document.hidden) refreshRate(); }, 5 * 60e3); // (does nothing until an hour has passed)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshRate(); });
  window.addEventListener('online', () => refreshRate(true));
}

// ---------- Settings ----------
const rateSource = (id) => (RATE_SOURCES.find((x) => x.id === id) || RATE_SOURCES[0]).name;
function ratesAgo(ms) {
  const m = Math.round((Date.now() - ms) / 60e3);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
}
function rateBoxHtml() {
  const s = S.settings, info = s.rateInfo;
  const auto = `<div class="row field"><span style="flex:1">Automatic<small class="rate-sub">Central Bank of Uzbekistan</small></span><label class="switch"><input type="checkbox" id="rate-auto" ${s.rateAuto ? 'checked' : ''} aria-label="Automatic exchange rate"><i></i></label></div>`;
  if (!s.rateAuto) {
    return `${auto}<label class="row field"><span>1 $ =</span><input id="rate" inputmode="decimal" placeholder="e.g. 12 000" value="${s.rate ? shownAmount(s.rate, 'UZS') : ''}" autocomplete="off" enterkeyhint="done"><span class="muted" style="min-width:0">so'm</span></label>`;
  }
  const val = info ? `${groupDigits(info.rate.toFixed(2), NBSP)} so'm` : '…';
  const when = info ? `${info.source === 'cbu' ? 'Official rate' : `Rate from ${rateSource(info.source)}`} for ${medDate(info.date)} · checked ${ratesAgo(info.checked)}` : 'Checking…';
  return `${auto}<div class="row field rate-now"><span>1 $ =</span><b class="num">${val}</b></div>
    <button class="row field" data-act="rate-check"><span style="flex:1;color:var(--accent)">Check now</span><small class="muted rate-when">${esc(when)}</small></button>`;
}
function paintRateBox() {
  const box = sheet && $('#rate-box', sheet.sh);
  if (!box) return;
  box.innerHTML = rateBoxHtml();
  bindRateBox(sheet.sh);
}
function bindRateBox(sh) {
  const auto = $('#rate-auto', sh);
  if (auto) {
    auto.addEventListener('change', () => {
      const s = S.settings;
      s.rateAuto = auto.checked;
      if (s.rateAuto) { s.rateManual = s.rate || s.rateManual || null; if (s.rateInfo) s.rate = s.rateInfo.rate; }
      else s.rate = s.rateManual || (s.rateInfo && s.rateInfo.rate) || null;
      save();
      render();
      setTimeout(paintRateBox, 260); // let the switch slide first
      if (s.rateAuto) refreshRate(true).then((r) => { paintRateBox(); if (r === 'failed' && !s.rateInfo) toast("Couldn't reach the bank — check the internet"); });
    });
  }
  const rate = $('#rate', sh);
  if (rate) {
    rate.addEventListener('input', () => {
      const r = typedAmount(rate.value, 'UZS');
      rate.value = r.shown;
      S.settings.rate = r.value || null;
      S.settings.rateManual = S.settings.rate;
      save();
      render();
    });
  }
}
ACTIONS['rate-check'] = async (a) => {
  const w = $('.rate-when', a);
  if (w) w.textContent = 'Checking…';
  const r = await refreshRate(true);
  paintRateBox();
  toast(r === 'new' ? 'Dollar rate updated' : r === 'same' ? 'The rate is up to date' : "Couldn't reach the bank — using the last rate");
};
