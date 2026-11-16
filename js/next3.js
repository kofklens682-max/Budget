'use strict';
/* NEXT part 3 (15 Nov): Budget opens with the phone's fingerprint or face too (the passcode stays as the backup). */
const BBIO = BIO.make('budget');
{
  const _l = lockNow;
  lockNow = function () {
    const was = locked; _l.apply(this, arguments); if (was || !locked || !BBIO.on()) return;
    const lk = document.querySelector('.lock'); if (!lk) return;
    const open = () => { locked = false; lk.classList.add('out'); setTimeout(() => { if (lk.parentElement) lk.parentElement.innerHTML = ''; }, 260); onUnlock.splice(0).forEach((f) => f()); };
    const btn = document.createElement('button'); btn.className = 'link lock-foot nx-bio'; btn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/></svg> Use fingerprint or face';
    btn.addEventListener('click', async () => { if (await BBIO.check()) open(); });
    lk.appendChild(btn);
    setTimeout(async () => { if (locked && await BBIO.check()) open(); }, 350);
  };
  const _s = settingsHtml;
  settingsHtml = function () {
    const h = _s.apply(this, arguments); if (!S.settings.pin) return h;
    return h.replace(/(<div class="row field"><span style="flex:1">Passcode lock<\/span>[\s\S]*?<\/label><\/div>)/, `$1<div class="row field"><span style="flex:1">Fingerprint or face</span><label class="switch"><input type="checkbox" id="nx-bio" ${BBIO.on() ? 'checked' : ''} aria-label="Fingerprint or face"><i></i></label></div>`);
  };
  document.addEventListener('change', async (e) => {
    if (e.target.id !== 'nx-bio') return;
    if (e.target.checked) { try { await BBIO.setup(); toast('Fingerprint or face is on'); } catch (err) { e.target.checked = false; toast('This phone could not set it up'); } }
    else { BBIO.off(); toast('Fingerprint or face is off'); }
  }, true);
  // the first lock (main.js) came before this file: show it again with the fingerprint button
  if (locked && BBIO.on()) { const lk = document.querySelector('.lock'); if (lk && lk.parentElement) lk.parentElement.innerHTML = ''; locked = false; lockNow(); }
}
