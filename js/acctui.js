'use strict';
/* Budget's side of the account (account.js does the saving online): what goes online, putting an
   online copy back, and the screens — the Account rows at the top of Settings, create / sign in /
   recovery code / change password. Loaded after money.js. */

// ---------- What Budget saves online ----------
// Everything except the save number and the passcode (a passcode stays on its own phone).
function budgetOnline() {
  const d = JSON.parse(JSON.stringify(S));
  delete d.rev;
  d.settings.pin = null;
  return { v: 1, data: d };
}
// An automatic copy (Settings → Automatic copies) of data that isn't the app's own right now.
async function keepDataCopy(data, note) {
  try {
    await keepGate;
    const key = copyKey('before') + 'o';
    const info = { at: Date.now(), why: 'before', note, rev: data.rev || 0, n: (data.tx || []).length, goals: (data.goals || []).length };
    await keepTx(['copies', 'info'], 'readwrite', ([c, i]) => { c.put(JSON.stringify(data), key); i.put(info, key); return null; });
  } catch (e) { /* no IndexedDB: nothing to keep it in */ }
}
const acctWhen = (ms) => { const d = new Date(ms); return `${dayLabel(iso(d))}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
Acct.use({
  key: 'budget',
  wait: 2500,
  collect: async () => budgetOnline(),
  isEmpty: () => !hasAnything() && !S.goals.length && !S.groups.length,
  summary: (o) => `${plural(((o && o.data && o.data.tx) || []).length, 'entry').replace('entrys', 'entries')}, ${plural(((o && o.data && o.data.goals) || []).length, 'goal')}`,
  localSummary: () => `${plural(S.tx.length, 'entry').replace('entrys', 'entries')}, ${plural(S.goals.length, 'goal')}`,
  async askWhich({ onlineAt, online, phone, obj }) {
    const useOnline = await ask({
      title: 'This phone already has entries',
      msg: `Online (saved ${acctWhen(onlineAt)}): ${online}. This phone: ${phone}. Which should stay? The other is kept in Settings → Automatic copies.`,
      ok: 'Use the online copy', cancel: 'Keep this phone’s',
    });
    if (!useOnline) await keepDataCopy(obj.data, 'Online copy before this phone’s replaced it');
    return useOnline ? 'online' : 'phone';
  },
  async apply(obj, why) {
    const n = normalize(obj.data);
    await keepCopy('before', why === 'newer' ? 'Before the copy from your other phone' : 'Before bringing back the online copy');
    n.settings.pin = S.settings.pin;
    S = n;
    save(); // (quiet: this doesn't count as a change to send back)
    applyTheme();
    UI.cur = S.settings.currency; UI.hAcc = 'all'; UI.hGroup = 'all';
    if (sheet) closeSheet();
    render(true);
    toast(why === 'newer' ? 'Brought in the newer copy from your other phone' : why === 'chosen' ? 'Using the online copy' : 'Everything is back ✓');
  },
  onStatus: () => { const el = sheet && $('#acct-status', sheet.sh); if (el) el.innerHTML = acctStatusText(); },
  onSignedOut: () => { toast('You were signed out of your account'); if (sheet && $('#acct-status', sheet.sh)) refreshSheet(settingsHtml(), mountSettings); },
});

// ---------- Settings: the Account rows ----------
function acctAgo(ms) {
  const m = Math.round((Date.now() - ms) / 60e3);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
}
function acctStatusText() {
  const s = Acct.status();
  if (s.status === 'busy') return 'Saving…';
  if (s.status === 'down') return esc(s.msg || 'Bringing your data back…');
  if (s.status === 'offline') return 'Waiting for internet — it saves by itself';
  if (s.status === 'error') return `<span style="color:var(--danger)">Not saved: ${esc(s.msg)}</span>`;
  if (s.dirty) return 'Saving in a moment…';
  if (s.status === 'ok') return `<span style="color:var(--in-text)">✓ Saved online · ${acctAgo(s.at)}</span>`;
  return 'Checking…';
}
function acctSettingsHtml() {
  if (!Acct.signedIn()) {
    return `<div class="form-label" style="margin-top:6px">Account</div>
      <div class="group"><button class="row" data-act="acct-open" data-v="new">${ic('shield', '#34C759', 'sm')}<div class="row-main"><div class="row-title">Save online</div><div class="row-sub">Budget and Notes stay safe — sign in on a new phone and everything comes back</div></div>${I.chev}</button></div>`;
  }
  const row = (act, label, color = 'var(--accent)', v = '') => `<button class="row field" data-act="${act}" data-v="${v}"><span style="flex:1;color:${color}">${label}</span></button>`;
  return `<div class="form-label" style="margin-top:6px">Account</div>
    <div class="group plain">
      <div class="row">${ic('shield', '#34C759', 'sm')}<div class="row-main"><div class="row-title">${esc(Acct.user())}</div><div class="row-sub" id="acct-status">${acctStatusText()}</div></div></div>
      ${row('acct-now', 'Save now')}
      ${row('acct-open', 'Change password', 'var(--accent)', 'password')}
      ${row('acct-signout', 'Sign out on this phone', 'var(--danger)')}
    </div>
    <p class="hint">Budget and Notes are saved online by themselves a few seconds after every change, locked with your password. On a new phone: install the app from the same address, open Settings → Save online → I have one.</p>`;
}

// ---------- The account sheet: create · sign in · forgot password · recovery code · change password ----------
let AC = null; // { mode, user, busy, err, code }
function openAcct(mode) {
  AC = { mode, user: (AC && AC.user) || Acct.user() || '', busy: false, err: '', code: AC && AC.code };
  openSheet(acctHtml(), mountAcct);
}
const acctField = (id, label, type = 'text', value = '', extra = '') => `<label class="row field"><span>${label}</span><input id="${id}" type="${type}" value="${esc(value)}" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="go" ${extra}></label>`;
function acctHtml() {
  const m = AC.mode, back = '<button data-act="acct-back">Cancel</button>';
  const err = `<p class="hint ac-err" style="color:var(--danger);min-height:18px">${esc(AC.err)}</p>`;
  const go = (label) => `<div class="actions"><button class="btn" data-act="acct-go" ${AC.busy ? 'disabled' : ''}>${AC.busy ? 'Please wait…' : label}</button></div>`;
  if (m === 'code') {
    return sheetHead('Your recovery code', '', '') + `<div class="sheet-body">
      <div class="gd-hero">${ic('lock', '#FF9500', 'xl')}<div class="gd-amt" style="max-width:310px;margin:10px auto 0">If you ever forget your password, this code is the only way back in. Keep it somewhere safe — for example in Telegram “Saved Messages”.</div></div>
      <section class="card" style="margin-top:16px;text-align:center"><div class="num" style="font:700 25px/1.5 ui-monospace, Menlo, Consolas, monospace;letter-spacing:.06em;user-select:all;-webkit-user-select:all">${esc(AC.code).replace(/^(.{14})-/, '$1<br>')}</div></section>
      <div class="actions"><button class="btn" data-act="acct-share">${glyph('share')} Send it to Telegram…</button><button class="btn grey" data-act="acct-done">I've saved it</button></div>
      <p class="hint">Without the password or this code nobody can open your data — so it can't be reset for you.</p></div>`;
  }
  if (m === 'password') {
    return sheetHead('Change password', back, '') + `<div class="sheet-body">
      <div class="group plain" style="margin-top:8px">${acctField('ac-old', 'Current', 'password')}${acctField('ac-pw', 'New', 'password')}${acctField('ac-pw2', 'Again', 'password')}</div>
      ${err}${go('Change password')}</div>`;
  }
  if (m === 'recover') {
    return sheetHead('Forgot password', back, '') + `<div class="sheet-body">
      <p class="hint" style="margin:4px 4px 12px">Type your name and the recovery code you saved when you made the account, then choose a new password.</p>
      <div class="group plain">${acctField('ac-user', 'Name', 'text', AC.user)}${acctField('ac-code', 'Code', 'text', '', 'placeholder="XXXX-XXXX-…"')}${acctField('ac-pw', 'New password', 'password')}${acctField('ac-pw2', 'Again', 'password')}</div>
      ${err}${go('Open my account')}</div>`;
  }
  const isNew = m === 'new';
  return sheetHead(isNew ? 'Save online' : 'Sign in', back, '') + `<div class="sheet-body">
    <div class="gd-hero">${ic('shield', '#34C759', 'xl')}<div class="gd-name">${isNew ? 'One account for both apps' : 'Welcome back'}</div><div class="gd-amt" style="max-width:300px;margin:6px auto 0">${isNew ? 'Everything is saved online by itself. On a new phone, sign in and it all comes back.' : 'Sign in to bring your Budget and Notes back.'}</div></div>
    <div class="seg full" style="margin-top:18px">${segButtons('acct-mode', [['new', 'Create account'], ['signin', 'I have one']], m)}</div>
    <div class="group plain" style="margin-top:14px">${acctField('ac-user', 'Name', 'text', AC.user, 'placeholder="e.g. kofklens"')}${acctField('ac-pw', 'Password', 'password')}${isNew ? acctField('ac-pw2', 'Again', 'password') : ''}</div>
    ${err}
    ${isNew ? '<p class="hint" style="margin-top:0">Your data is locked with this password on the phone before it’s sent, so nobody can read it online — not even the server. At least 8 characters.</p>' : '<button class="link" data-act="acct-open" data-v="recover" style="margin:0 4px">Forgot password? Use the recovery code</button>'}
    ${go(isNew ? 'Create account' : 'Sign in')}</div>`;
}
function mountAcct(sh) {
  const u = $('#ac-user', sh);
  if (u) u.addEventListener('input', () => { AC.user = u.value; });
  $$('input', sh).forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ACTIONS['acct-go'](); } }));
  const first = $('input', sh);
  if (first && !first.value) setTimeout(() => first.focus({ preventScroll: true }), 420);
}
function acctError(msg) {
  AC.busy = false;
  AC.err = msg;
  const e = sheet && $('.ac-err', sheet.sh), b = sheet && $('[data-act="acct-go"]', sheet.sh);
  if (e) { e.textContent = msg; e.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 220 }); }
  if (b) { b.disabled = false; b.textContent = { new: 'Create account', signin: 'Sign in', recover: 'Open my account', password: 'Change password' }[AC.mode]; }
}
Object.assign(ACTIONS, {
  'acct-open': (a, v) => openAcct(v || 'new'),
  'acct-mode': (a, v) => { AC.mode = v; AC.err = ''; refreshSheet(acctHtml(), mountAcct); },
  'acct-back': () => openSettings(),
  'acct-go': async () => {
    if (!AC || AC.busy || !sheet) return;
    const val = (id) => { const i = $('#' + id, sheet.sh); return i ? i.value : ''; };
    const pw = val('ac-pw'), pw2 = val('ac-pw2');
    if ((AC.mode === 'new' || AC.mode === 'recover' || AC.mode === 'password') && pw !== pw2) { acctError('The two passwords are different.'); return; }
    AC.busy = true;
    AC.err = '';
    const b = $('[data-act="acct-go"]', sheet.sh);
    if (b) { b.disabled = true; b.textContent = 'Please wait…'; }
    const e0 = $('.ac-err', sheet.sh);
    if (e0) e0.textContent = '';
    try {
      if (AC.mode === 'new') {
        AC.code = await Acct.signUp(val('ac-user'), pw);
        AC.mode = 'code';
        AC.busy = false;
        refreshSheet(acctHtml(), null);
        Acct.sync();
      } else if (AC.mode === 'signin') {
        await Acct.signIn(val('ac-user'), pw);
        AC = null;
        closeSheet();
        toast('Signed in — bringing your data…');
        Acct.sync();
      } else if (AC.mode === 'recover') {
        await Acct.recover(val('ac-user'), val('ac-code'), pw);
        AC = null;
        closeSheet();
        toast('New password saved — you’re signed in');
        Acct.sync();
      } else if (AC.mode === 'password') {
        await Acct.changePassword(val('ac-old'), pw);
        AC = null;
        openSettings();
        toast('Password changed');
      }
    } catch (err) { acctError(err.message || 'Something went wrong — try again.'); }
  },
  'acct-share': async () => {
    const text = `Budget & Notes — recovery code for “${Acct.user()}”: ${AC && AC.code}`;
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); toast('Copied — paste it into Telegram Saved Messages'); } catch (e) { toast('Write the code down somewhere safe'); }
  },
  'acct-done': () => { AC = null; openSettings(); toast('Your account is ready — saving online ✓'); },
  'acct-now': async () => { await Acct.sync(); const s = Acct.status(); toast(s.status === 'ok' ? 'Saved online ✓' : s.msg || 'Will save when you’re online'); },
  'acct-signout': async () => {
    const ok = await ask({ title: 'Sign out on this phone?', msg: 'Your data stays on this phone — it just stops being saved online (for Budget and Notes).', ok: 'Sign out', destructive: true });
    if (!ok) return;
    await Acct.signOut();
    if (sheet) refreshSheet(settingsHtml(), mountSettings);
    toast('Signed out');
  },
});
