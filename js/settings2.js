'use strict';
/* NEXT (16 Nov, user: "we also didn't work on the settings of the Budget application"). Settings like the iPhone (and like Teacher):
   - clear sections in a sensible order: Account · Accounts · Bank fees · Organise · Currency · Keep it true · Look · Privacy · Backup · Data · About
   - every row has a coloured icon tile; the long grey texts are one short line each
   - Look: Light / Dark / Automatic + "Shrink the tab bar" (tabshrink.js)
   Nothing changes in how the settings work: the same buttons, switches and fields are only moved and dressed. Loaded last. */
{
  const ORDER = ['Account', 'Accounts', 'Bank fees', 'Organise', 'Currency', 'Keep it true', 'Look', 'Privacy', 'Backup', 'Data', 'About'];
  const SHORT = { // one short line under a section instead of the long texts
    'Bank fees': 'A new transfer starts with this fee. You can change it on the transfer.',
    Currency: 'Totals, charts and goals use this currency. Your entries keep their own.',
    'Keep it true': 'A small card asks once, after this time. The weekly check comes on the day you choose.',
    Privacy: 'Everything stays on this phone.',
    Data: '',
  };
  const ACT_IC = { export: ['box', '#0A84FF'], 'share-backup': ['mail', '#0A84FF'], import: ['refund', '#30D158'], copies: ['clock', '#8E8E93'],
    'clear-demo': ['flask', '#FF9F0A'], 'load-demo': ['flask', '#FF9F0A'], erase: ['flame', '#FF453A'], 'change-pin': ['key', '#8E8E93'], 'acct-now': ['exchange', '#30D158'], 'acct-days': ['calendar', '#0A84FF'], 'acct-signout': ['lock', '#FF453A'], 'acct-open': ['key', '#8E8E93'] };
  const SEC_IC = { Account: ['key', '#30D158'], Accounts: ['safe', '#0A84FF'], 'Bank fees': ['exchange', '#FF9F0A'], Organise: ['box', '#BF5AF2'], Currency: ['exchange', '#30D158'], 'Keep it true': ['bell', '#FF9F0A'], Look: ['phone', '#0A84FF'], Privacy: ['lock', '#8E8E93'], Backup: ['clock', '#0A84FF'], Data: ['flame', '#FF453A'], About: ['report', '#8E8E93'] };
  const SEC_SUB = { Account: 'Online copy, last 7 days', Accounts: 'Cash, card and others', 'Bank fees': 'Usual transfer fee', Organise: 'Categories', Currency: "So'm, dollar, exchange rate", 'Keep it true': 'Evening question, weekly check', Look: 'Light or dark, tab bar, glass', Privacy: 'Passcode', Backup: 'Backup file, automatic copies', Data: 'Demo data, erase' };
  const tile = (g, c) => (typeof ic === 'function' ? ic(g, c, 'sm') : '');
  function tidy(html) {
    const tpl = document.createElement('template'); tpl.innerHTML = html; const used = new Set();
    const body = tpl.content.querySelector('.sheet-body'); if (!body) return html;
    // 1. cut the page into sections (a grey label + what follows it)
    const secs = {}, order = []; let cur = null;
    [...body.children].forEach((el) => {
      if (el.classList.contains('form-label')) { cur = { label: el.textContent.trim(), nodes: [] }; secs[cur.label] = cur; order.push(cur.label); return; }
      if (cur) cur.nodes.push(el); else { secs._top = secs._top || { label: '', nodes: [] }; secs._top.nodes.push(el); }
    });
    const take = (name) => { const s = secs[name]; delete secs[name]; return s ? s.nodes : []; };
    const sub = (t) => { const d = document.createElement('div'); d.className = 'form-label st-sub'; d.textContent = t; return d; };
    // 2. merge the small sections into bigger ones
    const out = {};
    out.Account = take('Account'); out.Accounts = take('Accounts'); out['Bank fees'] = take('Bank fees'); out.Organise = take('Organise');
    out.Currency = [sub('Show amounts in'), ...take('Show amounts in'), sub('Exchange rate'), ...take('Exchange rate')];
    out['Keep it true'] = [...take('Keep it true'), sub('Ask me after'), ...take('Ask me after'), sub('Weekly check on'), ...take('Weekly check on')];
    const shrink = document.createElement('div'); shrink.className = 'group plain';
    const on = typeof tabShrinkOn === 'function' ? tabShrinkOn() : true;
    shrink.innerHTML = `<button class="row field" data-tabshrink role="switch" aria-checked="${on}">${tile('phone', '#0A84FF')}<div class="row-main"><div class="row-title">Shrink the tab bar</div><div class="row-sub">Smaller while you scroll down</div></div><i class="ts-sw${on ? ' on' : ''}"></i></button>`;
    const bend = document.createElement('div'); bend.className = 'group plain'; bend.innerHTML = window.GlassBend ? GlassBend.html() : '';
    out.Look = [sub('Appearance'), ...take('Appearance'), shrink, bend];
    out.Privacy = take('Privacy'); out.Backup = take('Backup'); out.Data = take('Data');
    Object.keys(secs).forEach((k) => { if (k !== '_top') out[k] = secs[k].nodes; }); // anything new keeps its place at the end
    // 3. the version line becomes "About"
    const all = Object.values(out).flat(), ver = all.find((n) => n.matches && n.matches('p.hint') && /version/i.test(n.textContent));
    if (ver) { Object.keys(out).forEach((k) => { out[k] = out[k].filter((n) => n !== ver); }); const a = document.createElement('div'); a.className = 'group plain';
      a.innerHTML = `<div class="row field">${tile('report', '#8E8E93')}<div class="row-main"><div class="row-title">${(ver.innerHTML.split('<br>')[1] || 'Budget').replace(/<[^>]+>/g, '')}</div><div class="row-sub">${ver.innerHTML.split('<br>')[0].replace(/<[^>]+>/g, '')}</div></div></div>`; out.About = [a]; }
    { const u = document.createElement('div'); u.className = 'group plain'; u.innerHTML = '<div class="row field" data-appupdate role="button" style="cursor:pointer">' + tile('report', '#0A84FF') + '<div class="row-main"><div class="row-title">Update the app</div><div class="row-sub">Get the newest version now, without closing the app</div></div></div>'; out.About = [...(out.About || []), u]; }
    const panes = [];
    // 4. rebuild the page: a short menu of sections; a tap opens one section (17 Nov, user: "still crowded")
    body.replaceChildren(...(secs._top ? secs._top.nodes : []));
    [...ORDER, ...Object.keys(out).filter((k) => !ORDER.includes(k))].forEach((k) => {
      const nodes = out[k]; if (!nodes || !nodes.length) return;
      const pane = document.createElement('div'); pane.className = 'st-pane'; pane.dataset.pane = k; pane.hidden = window.ST_OPEN !== k; panes.push([k, pane]);
      pane.innerHTML = `<button class="st-back" data-stback>${I.chev}Settings</button><h4 class="st-h">${k}</h4>`;
      const body0 = body; { const body = pane;
      nodes.forEach((n) => {
        if (n.matches('p.hint')) { // long grey text -> one short line (or none)
          if (n.querySelector('#persist-note')) { n.innerHTML = `${SHORT[k] || ''} <span id="persist-note"></span>`; used.add(k); }
          else if (k in SHORT) { if (!SHORT[k] || used.has(k)) return; n.textContent = SHORT[k]; used.add(k); }
          else if (/^Last backup/.test(n.textContent.trim())) n.innerHTML = n.innerHTML.split('.')[0] + '.';
        }
        body.appendChild(n);
      }); }
      body0.appendChild(pane);
    });
    { const m = document.createElement('div'); m.className = 'group plain st-menu'; m.hidden = !!window.ST_OPEN && panes.some(([k]) => k === window.ST_OPEN);
      if (!m.hidden) window.ST_OPEN = null;
      m.innerHTML = panes.map(([k]) => `<button class="row field" data-stsec="${k}">${tile((SEC_IC[k] || ['box', '#8E8E93'])[0], (SEC_IC[k] || ['box', '#8E8E93'])[1])}<div class="row-main"><div class="row-title">${k}</div>${SEC_SUB[k] ? `<div class="row-sub">${SEC_SUB[k]}</div>` : ''}</div>${I.chev}</button>`).join('');
      body.insertBefore(m, body.querySelector('.st-pane')); }
    // 5. a coloured icon on every plain action row (Backup, Data, passcode)
    body.querySelectorAll('button.row.field[data-act]').forEach((b) => { const m = ACT_IC[b.dataset.act]; if (m && !b.querySelector('.ic')) b.insertAdjacentHTML('afterbegin', tile(m[0], m[1])); });
    body.querySelectorAll('.row.field').forEach((r) => { const t = r.querySelector(':scope > span'); if (/^Passcode lock$/.test(t ? t.textContent.trim() : '') && !r.querySelector('.ic')) r.insertAdjacentHTML('afterbegin', tile('lock', '#8E8E93')); });
    body.querySelectorAll('.row').forEach((r) => { if (r.querySelector('.ic')) return; const t = r.textContent.trim(); const m = /^Evening question/.test(t) ? ['bell', '#FF9F0A'] : /^Weekly money check/.test(t) ? ['safe', '#30D158'] : /^Automatic/.test(t) && r.closest('#rate-box') ? ['exchange', '#0A84FF'] : null; if (m) r.insertAdjacentHTML('afterbegin', tile(m[0], m[1])); });
    body.classList.add('st2');
    return tpl.innerHTML;
  }
  const _s = settingsHtml;
  settingsHtml = function () { const h = _s.apply(this, arguments); try { let t = tidy(h); /* an open section is its own page (its name is the title), so the Android back gesture goes back ONE step, to the Settings list */ if (window.ST_OPEN) t = t.replace(/<h3([^>]*)>[^<]*<\/h3>/,(m, a) => `<h3${a}>${window.ST_OPEN}</h3>`); return t; } catch (e) { console.error(e); return h; } };
}

/* ---------- 16 Nov (user): daily online copies. Settings → Account → "Copies from the last 7 days": one copy per day (account.js),
   tap one to bring Budget back to that day (what is on the phone now is kept in Automatic copies first). ---------- */
{
  const _a = acctSettingsHtml;
  acctSettingsHtml = function () {
    const h = _a.apply(this, arguments); if (!Acct.signedIn()) return h;
    return h.replace(/(<button class="row field" data-act="acct-now"[^>]*>[\s\S]*?<\/button>)/, `$1<button class="row field" data-act="acct-days"><span style="flex:1;color:var(--accent)">Copies from the last 7 days</span>${I.chev}</button>`);
  };
  const dayRows = (list) => list.length ? `<div class="group">${list.map((d) => `<button class="row" data-act="acct-day" data-v="${d.slot}">${ic('calendar', '#0A84FF', 'sm')}<div class="row-main"><div class="row-title">${acctWhen(d.at).split(',')[0]}</div><div class="row-sub">Saved at ${acctWhen(d.at).split(', ')[1] || ''}</div></div>${I.chev}</button>`).join('')}</div>`
    : '<p class="hint" style="text-align:center;margin-top:20px">No daily copies yet. The first one is saved today.</p>';
  const daysHtml = (inner) => sheetHead('Last 7 days', '<button data-act="acct-back">Back</button>', '') + `<div class="sheet-body"><p class="hint" style="margin:4px 4px 12px">One copy is saved online each day. Tap a day to bring Budget back to how it was then.</p>${inner}</div>`;
  Object.assign(ACTIONS, {
    'acct-days': async () => {
      openSheet(daysHtml('<p class="hint" style="text-align:center;margin-top:20px">Loading…</p>'), null);
      let list; try { list = await Acct.days(); } catch (e) { list = null; }
      if (sheet) refreshSheet(daysHtml(list ? dayRows(list) : `<p class="hint" style="text-align:center;margin-top:20px;color:var(--danger)">Could not load them. Check the internet and try again.</p>`), null);
    },
    'acct-day': async (a, v) => {
      let list = []; try { list = await Acct.days(); } catch (e) { toast('No internet — try again when you’re online'); return; }
      const d = list.find((x) => String(x.slot) === String(v)); if (!d) return;
      const yes = await ask({ title: 'Bring back this day?', msg: `Budget goes back to how it was on ${acctWhen(d.at)}. What is on this phone now is kept in Settings → Automatic copies.`, ok: 'Bring it back', cancel: 'Cancel' });
      if (!yes) return;
      try { await Acct.restoreDay(d.slot); } catch (e) { toast(e.message || 'That didn’t work — try again'); }
    },
  });
}
