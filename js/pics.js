'use strict';
/* A screenshot kept with an entry (a receipt, a transfer from a card) — proof you can open any time.
   Pictures live on this phone in their own small database (IndexedDB "budget-pics"), never inside the
   money data, so saving stays quick; an entry only holds the picture's id (t.pic). They go into the
   backup file too. Shared from another app (Android's Share menu), a picture arrives through sw.js and
   opens a new entry with it attached. */

const PIC_DB = 'budget-pics';
let picDbP = null;
function picDb() {
  if (!picDbP) {
    picDbP = new Promise((resolve, reject) => {
      const r = indexedDB.open(PIC_DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('pics');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    picDbP.catch(() => { picDbP = null; });
  }
  return picDbP;
}
async function picStore(mode, fn) {
  const db = await picDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pics', mode);
    const out = fn(tx.objectStore('pics'));
    tx.oncomplete = () => resolve(out && 'result' in out ? out.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
const picPut = (id, blob) => picStore('readwrite', (s) => s.put(blob, id));
const picGet = (id) => picStore('readonly', (s) => s.get(id)).catch(() => null);
const picKeys = () => picStore('readonly', (s) => s.getAllKeys()).catch(() => []);
const picDel = (id) => picStore('readwrite', (s) => s.delete(id));
// Object URLs for showing pictures, made once per picture.
const picUrls = new Map();
async function picUrl(id) {
  if (!id) return null;
  if (picUrls.has(id)) return picUrls.get(id);
  const b = await picGet(id);
  const u = b ? URL.createObjectURL(b) : null;
  if (u) picUrls.set(id, u);
  return u;
}

// A screenshot is made smaller (text stays sharp) and kept as JPEG — about 50–100 KB.
async function picFrom(blob) {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height), 640 / Math.min(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * k));
  c.height = Math.max(1, Math.round(bmp.height * k));
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; // (a see-through PNG would turn black as JPEG)
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(bmp, 0, 0, c.width, c.height);
  if (bmp.close) bmp.close();
  const out = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.75));
  if (!out) throw new Error('no picture');
  const id = 'p' + uid();
  await picPut(id, out);
  return id;
}

// ---------- In the entry form (Details) ----------
function picRow(d) {
  const has = !!d.pic;
  return `<div class="row field pic-row" id="pic-row"><span style="flex:1">Screenshot</span>${has
    ? `<button class="pic-thumb" data-act="pic-view" aria-label="Open the screenshot"><img alt="" data-pic="${esc(d.pic)}"></button><button class="pic-x" data-act="pic-remove" aria-label="Remove the screenshot">${glyph('minus')}</button>`
    : `<button class="pill-btn" data-act="pic-paste">Paste</button><button class="pill-btn" data-act="pic-pick">Add</button>`}</div>`;
}
// Fill in the <img data-pic> placeholders (pictures load from the database, so a moment later).
function picFill(root) {
  $$('img[data-pic]', root).forEach(async (img) => {
    const u = await picUrl(img.dataset.pic);
    if (u) img.src = u;
    else img.closest('.pic-thumb')?.classList.add('missing');
  });
}
function picSync(d) {
  if (!sheet || draft !== d) return;
  const row = $('#pic-row', sheet.sh);
  if (!row) return;
  row.outerHTML = picRow(d);
  const nr = $('#pic-row', sheet.sh);
  nr.classList.add('pic-in');
  picFill(nr);
}
async function picAttach(blob) {
  if (!sheet || !draft) return;
  const d = draft;
  try { d.pic = await picFrom(blob); } catch (e) { toast("Couldn't open that picture"); return; }
  buzz();
  picSync(d);
}
async function picPaste() {
  try {
    if (navigator.clipboard && navigator.clipboard.read) {
      for (const it of await navigator.clipboard.read()) {
        const t = it.types.find((x) => x.startsWith('image/'));
        if (t) return picAttach(await it.getType(t));
      }
    }
    toast('Nothing to paste — copy a screenshot first');
  } catch (e) {
    toast("Couldn't paste — tap Add and choose the screenshot");
  }
}
// Ctrl+V (or a keyboard's paste) of a picture while an entry is open works too.
document.addEventListener('paste', (e) => {
  if (!sheet || !draft || !$('#pic-row', sheet.sh) || !e.clipboardData) return;
  const f = [...e.clipboardData.files].find((x) => x.type.startsWith('image/'));
  if (f) { e.preventDefault(); picAttach(f); }
});

// ---------- Looking at it ----------
let picView = null;
async function openPicView(id) {
  const u = await picUrl(id);
  if (!u) { toast('This screenshot is on another phone — it was added there'); return; }
  closePicView(true);
  const v = document.createElement('div');
  v.className = 'pic-view';
  v.innerHTML = `<div class="pic-scroll"><img alt="Screenshot" src="${u}"></div>
    <div class="pic-bar"><button data-pv="share">${glyph('share')}<span>Share</span></button><button data-pv="close">Done</button></div>`;
  v.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pv]');
    if (b && b.dataset.pv === 'share') picShare(id);
    else if (b) closePicView();
  });
  document.body.appendChild(v);
  requestAnimationFrame(() => v.classList.add('show'));
  picView = v;
  history.pushState({ ...(history.state || {}), pic: true }, '');
}
function closePicView(now) {
  const v = picView;
  if (!v) return;
  picView = null;
  if (!now && history.state && history.state.pic) { picView = v; history.back(); return; } // (popstate closes it)
  v.classList.remove('show');
  setTimeout(() => v.remove(), 300);
}
window.addEventListener('popstate', (e) => { if (picView && !(e.state && e.state.pic)) { const v = picView; picView = null; v.classList.remove('show'); setTimeout(() => v.remove(), 300); } });
async function picShare(id) {
  const b = await picGet(id);
  if (!b) return;
  const file = new File([b], `screenshot-${todayIso()}.jpg`, { type: 'image/jpeg' });
  try {
    if (navigator.canShare && !navigator.canShare({ files: [file] })) throw new Error('no share');
    await navigator.share({ files: [file] });
  } catch (e) {
    if (!e || e.name !== 'AbortError') toast("This phone can't share it from here");
  }
}

// ---------- Shared from another app (sw.js keeps it, then opens ./?share=1) ----------
async function takeShared() {
  if (!('caches' in window)) return;
  try {
    const c = await caches.open('budget-share'), r = await c.match('./shared');
    if (!r) return;
    await c.delete('./shared');
    if (r.headers.get('X-Kind') !== 'image') { openTx(null, {}); return; }
    let id = null;
    try { id = await picFrom(await r.blob()); } catch (e) { /* a picture this phone can't open */ }
    openTx(null, id ? { pic: id } : {});
    toast(id ? 'Screenshot attached — fill in the amount and tap Save' : "Couldn't open that picture — try Add in the form");
  } catch (e) { /* nothing shared after all */ }
}

// ---------- Backup file and tidying up ----------
// Every picture an entry uses, as data URLs (for the backup file).
async function picsForBackup(tx) {
  const out = {};
  for (const id of new Set(tx.map((t) => t.pic).filter(Boolean))) {
    const b = await picGet(id);
    if (b) out[id] = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = () => r(null); fr.readAsDataURL(b); });
  }
  return out;
}
async function picsFromBackup(pics) {
  if (!pics || typeof pics !== 'object') return 0;
  let n = 0;
  for (const [id, url] of Object.entries(pics)) {
    if (!/^p[\w]+$/.test(id) || !/^data:image\/(jpeg|png|webp);base64,/.test(String(url))) continue;
    try { await picPut(id, await (await fetch(url)).blob()); picUrls.delete(id); n++; } catch (e) { /* skip a damaged one */ }
  }
  return n;
}
// Once a week: pictures no entry uses any more — not even in the automatic copies (keep.js) — go.
async function picTidy() {
  try {
    if (Date.now() - Number(localStorage.getItem('budget-pic-tidy') || 0) < 7 * 864e5) return;
    const keys = await picKeys();
    if (keys.length) {
      const used = new Set(S.tx.map((t) => t.pic).filter(Boolean));
      for (const c of await copyList()) {
        const json = await copyJson(c.key);
        for (const m of String(json || '').matchAll(/"pic":"(p\w+)"/g)) used.add(m[1]);
      }
      if (draft && draft.pic) used.add(draft.pic);
      for (const id of keys) if (!used.has(id)) await picDel(id);
    }
    localStorage.setItem('budget-pic-tidy', String(Date.now()));
  } catch (e) { /* next time */ }
}
// "Forgot passcode" erases everything on the phone — the pictures too.
function dropAllPics() { picUrls.clear(); try { indexedDB.deleteDatabase(PIC_DB); } catch (e) { /* none */ } picDbP = null; }

Object.assign(ACTIONS, {
  'pic-pick': () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; if (f) picAttach(f); });
    inp.click();
  },
  'pic-paste': () => picPaste(),
  'pic-view': () => { if (draft && draft.pic) openPicView(draft.pic); },
  'pic-remove': () => { if (!draft) return; draft.pic = null; picSync(draft); },
});
