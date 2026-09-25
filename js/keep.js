'use strict';
/* Keeping the money data safe for years. Loaded before core.js.
   - localStorage is the quick copy the app opens from.
   - IndexedDB holds a second copy, written a moment after every change (and at once when the app
     goes to the background). If the quick copy is ever lost, damaged or out of room, the app opens
     from the second copy instead. Every save has a number (S.rev), so the newer copy always wins.
   - IndexedDB also holds automatic copies: one a day, and one just before the data is replaced as a
     whole (restoring a backup, erasing). Kept for two weeks, plus the first copy of each month for a
     year. Settings → Automatic copies can bring any of them back. */

const KEEP_DB = 'budget-app';            // the Notes app on the same site uses "notes-app"
const COPY_DAYS = 14, COPY_MONTHS = 12;
let keepDbP = null;
function keepDb() {
  if (keepDbP) return keepDbP;
  keepDbP = new Promise((resolve, reject) => {
    let r;
    try { r = indexedDB.open(KEEP_DB, 1); } catch (e) { reject(e); return; }
    r.onupgradeneeded = () => {
      const db = r.result;
      for (const s of ['data', 'copies', 'info']) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
    };
    r.onsuccess = () => {
      const db = r.result;
      db.onversionchange = () => { db.close(); keepDbP = null; };
      db.onclose = () => { keepDbP = null; };
      resolve(db);
    };
    r.onerror = () => { keepDbP = null; reject(r.error); };
    r.onblocked = () => { keepDbP = null; reject(new Error('Storage is busy')); };
  });
  return keepDbP;
}
// One transaction over one or more stores; fn(stores) may return a request whose result is resolved.
async function keepTx(names, mode, fn) {
  const db = await keepDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(names, mode);
    const req = fn(names.map((n) => tx.objectStore(n)));
    let out;
    if (req) req.onsuccess = () => { out = req.result; };
    tx.oncomplete = () => resolve(out);
    tx.onerror = tx.onabort = () => reject(tx.error || new Error('Storage error'));
  });
}
const keepGet = (store, key) => keepTx([store], 'readonly', ([s]) => s.get(key));
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);

// ---------- The second copy ----------
let keepGate = Promise.resolve(); // the start-up check between the two copies; writes wait for it
let keepNext = null, keepT = 0, quickFailed = false;
function keepSoon(rev, json, now) {
  keepNext = { rev, json };
  clearTimeout(keepT);
  keepT = setTimeout(keepNow, now ? 0 : 400);
}
async function keepNow() {
  clearTimeout(keepT);
  keepT = 0;
  await keepGate.catch(() => {});
  const k = keepNext; // taken after the start-up check, so an older copy never overwrites a newer one
  if (!k) return;
  keepNext = null;
  try {
    await keepTx(['data'], 'readwrite', ([s]) => s.put({ rev: k.rev, at: Date.now(), json: k.json }, 'main'));
    // The quick copy couldn't be written (phone storage full?): remove the old one so the app
    // opens from this up-to-date copy next time.
    if (quickFailed) { try { localStorage.removeItem(KEY); } catch (e) { /* nothing to remove */ } }
  } catch (e) {
    if (quickFailed) toast('⚠️ Could not save on this phone — free up some space');
  }
}

// ---------- Automatic copies ----------
let copyDay = null;
function copyKey(why) {
  const d = new Date(), day = iso(d);
  return why === 'day' ? day : `${day}T${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}
// why: 'day' (once a day) or 'before' (just before everything is replaced; note says by what).
async function keepCopy(why, note = '') {
  if (!hasAnything() && !S.goals.length) return;
  const key = copyKey(why);
  if (why === 'day') {
    if (copyDay === key.slice(0, 10)) return;
    copyDay = key.slice(0, 10);
  }
  try {
    await keepGate;
    const info = { at: Date.now(), why, note, rev: S.rev, n: S.tx.length, goals: S.goals.length };
    const json = JSON.stringify(S);
    await keepTx(['copies', 'info'], 'readwrite', ([c, i]) => {
      if (why === 'day') {
        // Don't replace the day's copy once it exists: it shows the data as it was that morning.
        const r = i.get(key);
        r.onsuccess = () => { if (!r.result) { c.put(json, key); i.put(info, key); } };
        return null;
      }
      c.put(json, key);
      i.put(info, key);
      return null;
    });
    await pruneCopies();
  } catch (e) { /* no IndexedDB here: the quick copy and backup files still work */ }
}
async function pruneCopies() {
  const keys = (await keepTx(['info'], 'readonly', ([s]) => s.getAllKeys())).map(String).sort();
  const recent = iso(addDays(new Date(), -COPY_DAYS)), oldest = ymShift(ymNow(), -COPY_MONTHS);
  const months = new Set(), drop = [];
  for (const k of keys) {
    if (k.slice(0, 10) >= recent) continue;
    const m = k.slice(0, 7);
    if (k.length === 10 && m >= oldest && !months.has(m)) { months.add(m); continue; }
    drop.push(k);
  }
  if (drop.length) await keepTx(['copies', 'info'], 'readwrite', ([c, i]) => { drop.forEach((k) => { c.delete(k); i.delete(k); }); return null; });
}
// The copies, newest first (without their data).
async function copyList() {
  const db = await keepDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('info', 'readonly'), s = tx.objectStore('info');
    let keys = [], vals = [];
    s.getAllKeys().onsuccess = (e) => { keys = e.target.result; };
    s.getAll().onsuccess = (e) => { vals = e.target.result; };
    tx.oncomplete = () => resolve(keys.map((k, i) => ({ key: String(k), ...vals[i] })).sort((a, b) => b.at - a.at));
    tx.onerror = tx.onabort = () => reject(tx.error || new Error('Storage error'));
  });
}
const copyJson = (key) => keepTx(['copies'], 'readonly', ([s]) => s.get(key));
const dropAllCopies = () => keepTx(['copies', 'info'], 'readwrite', ([c, i]) => { c.clear(); i.clear(); return null; }).catch(() => {});

// ---------- Start-up ----------
// Compare the quick copy (already loaded) with the second copy. Resolves true when the second
// copy was newer and has been taken.
function keepStart(bootRev, hadQuick) {
  let adopted = false;
  keepGate = (async () => {
    let main = null;
    try { main = await withTimeout(keepGet('data', 'main'), 4000); } catch (e) { return; }
    if (main && typeof main.json === 'string' && (+main.rev || 0) > bootRev) {
      try {
        const d = normalize(JSON.parse(main.json));
        d.rev = +main.rev;
        S = d;
        topRev = Math.max(topRev, d.rev);
        adopted = true;
      } catch (e) { /* damaged: keep what we have */ }
    } else if (!main && hadQuick) keepNext = keepNext || { rev: S.rev, json: JSON.stringify(S) };
  })();
  return keepGate.then(() => {
    if (adopted) save(); // writes the quick copy again
    else if (keepNext && !keepT) keepT = setTimeout(keepNow, 400);
    return adopted;
  });
}
