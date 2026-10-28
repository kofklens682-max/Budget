'use strict';
/* THE BRIDGE, Budget side (draft, 29 Oct 2026). Same rule as in the Teacher app: one owner for every fact.
     Teacher owns groups, students, fees  -> Budget READS localStorage "teacher-roster" and mirrors it into S.groups
                                             (groups and students you cannot add here; each one keeps a link "tid" = the Teacher's id).
     Budget owns payments                  -> Budget WRITES localStorage "budget-payments" after every save (the Teacher app reads it).
   A student payment says exactly which months it pays for: rec.alloc = [{m:'2026-09', amount}]. One receipt for two children
   (a mother paying for a brother and a sister) is saved as one entry per child with the same rec.batch.
   Nothing is ever deleted by the sync: a student or group that leaves the Teacher app is only marked gone, so old payments keep their owner. */

const BR = (() => {
  const RS = 'teacher-roster', BP = 'budget-payments', OPEN = 'teacher-open-budget';
  let roster = null, rjson = '', pend = null;
  const low = (x) => String(x).trim().toLowerCase();
  const YM = /^\d{4}-\d\d$/;
  function read() {
    try { const j = localStorage.getItem(RS); if (!j) return roster; if (j === rjson) return roster; const d = JSON.parse(j); if (d && Array.isArray(d.groups) && d.charges) { roster = d; rjson = j; } } catch (e) { /* keep the last good copy */ }
    return roster;
  }
  const on = () => !!(read() && S.groups.some((g) => g.tid));
  const allocOf = (t) => {
    const a = Array.isArray(t.alloc) ? t.alloc.filter((x) => x && YM.test(x.m) && +x.amount > 0).map((x) => ({ m: x.m, amount: +x.amount })) : [];
    return a.length && Math.abs(a.reduce((s, x) => s + x.amount, 0) - t.amount) < 1 ? a : [{ m: YM.test(t.forMonth || '') ? t.forMonth : t.date.slice(0, 7), amount: t.amount }];
  };
  const payTx = () => S.tx.filter((t) => t.type === 'in' && t.groupId).concat(S.records || []); // every student payment: real income + records
  const isRec = (id) => (S.records || []).some((r) => r.id === id);
  const activeGroups = () => S.groups.filter((g) => g.tid && !g.gone);
  const stuOf = (g) => g.students.filter((s) => s.tid && !s.gone);
  const findStu = (sid) => { for (const g of S.groups) { const s = g.students.find((x) => x.id === sid); if (s) return { g, s }; } return null; };
  const findTid = (tid) => { for (const g of S.groups) { const s = g.students.find((x) => x.tid === tid); if (s) return { g, s }; } return null; };

  /* ----- Teacher -> Budget: mirror the roster ----- */
  function sync() {
    const r = read(); if (!r || S._rs === rjson) return false;
    let ch = false;
    r.groups.forEach((rg) => {
      let g = S.groups.find((x) => x.tid === rg.id) || S.groups.find((x) => !x.tid && low(x.name) === low(rg.name));
      if (!g) { g = { id: uid(), name: rg.name, color: rg.color, fee: null, students: [], createdAt: Date.now() }; S.groups.push(g); ch = true; }
      const fee = rg.kind === 'group' && rg.fee > 0 ? { amount: rg.fee, currency: 'UZS' } : null;
      if (g.tid !== rg.id || g.name !== rg.name || g.color !== rg.color || JSON.stringify(g.fee || null) !== JSON.stringify(fee) || g.orphan || g.gone) { g.tid = rg.id; g.name = rg.name; g.color = rg.color; g.fee = fee; delete g.orphan; delete g.gone; ch = true; }
      const seen = new Set();
      rg.students.forEach((rs) => {
        let hit = findTid(rs.id), s = hit && hit.s;
        if (!s) s = g.students.find((x) => !x.tid && low(x.name) === low(rs.name));
        if (hit && hit.g !== g) { hit.g.students = hit.g.students.filter((x) => x !== s); g.students.push(s); ch = true; } // moved to another group in the Teacher app
        if (!s) { s = { id: uid(), name: rs.name, tid: rs.id }; g.students.push(s); ch = true; }
        else if (s.tid !== rs.id || s.name !== rs.name || s.gone || s.orphan) { if (s.name !== rs.name) S.tx.forEach((t) => { if (t.studentId === s.id) t.person = rs.name; }); s.tid = rs.id; s.name = rs.name; delete s.gone; delete s.orphan; ch = true; }
        seen.add(s);
      });
      g.students.forEach((s) => { if (seen.has(s)) return; if (s.tid && !s.gone) { s.gone = true; ch = true; } else if (!s.tid && !s.orphan) { s.orphan = true; ch = true; } });
    });
    const rids = new Set(r.groups.map((g) => g.id));
    S.groups.forEach((g) => { if (g.tid && !rids.has(g.tid) && !g.gone) { g.gone = true; ch = true; } else if (!g.tid && !g.orphan) { g.orphan = true; ch = true; } });
    Object.defineProperty(S, '_rs', { value: rjson, writable: true, configurable: true, enumerable: false });
    if (ch) save();
    return ch;
  }

  /* ----- Budget -> Teacher: publish the payments ----- */
  function publish() {
    try {
      const pays = []; let loose = 0;
      payTx().forEach((t) => {
        const f = t.studentId && findStu(t.studentId), g0 = grp(t.groupId);
        if (!f || !f.s.tid || !f.g.tid || t.currency !== 'UZS') { if (g0 && g0.tid) loose++; return; } // a group payment with no student: shown to you, never guessed
        pays.push({ id: t.id, sid: f.s.tid, gid: f.g.tid, date: t.date, amount: t.amount, by: t.by || '', alloc: allocOf(t), batch: t.batch || '', acc: t.account });
      });
      localStorage.setItem(BP, JSON.stringify({ v: 1, at: Date.now(), loose, pays }));
    } catch (e) { /* storage full: Budget itself still has everything */ }
  }

  /* ----- what a student owes, and where a payment goes ----- */
  const charge = (tid, m) => { const c = roster && roster.charges[tid]; return c && c[m] != null ? c[m] : null; };
  function paidMap(tid, except) {
    const m = {};
    payTx().forEach((t) => {
      if (t.id === except || t.currency !== 'UZS') return;
      const f = findStu(t.studentId); if (!f || f.s.tid !== tid) return;
      allocOf(t).forEach((a) => { m[a.m] = (m[a.m] || 0) + a.amount; });
    });
    return m;
  }
  const monthList = () => { const out = []; if (!roster) return out; for (let m = roster.start; m <= ymShift(ymNow(), 24); m = ymShift(m, 1)) out.push(m); return out; };
  function remMap(tid, except) { const p = paidMap(tid, except), o = {}; monthList().forEach((m) => { const c = charge(tid, m); if (c != null) o[m] = Math.max(0, c - (p[m] || 0)); }); return o; }
  function owed(tid, except) { const r = remMap(tid, except), cur = ymNow(), due = Object.keys(r).filter((m) => m <= cur && r[m] > 0); return { total: due.reduce((a, m) => a + r[m], 0), months: due }; }
  // The rule: fill the chosen months (or, with none chosen, the oldest unpaid ones) up to what each one costs; extra stays as credit.
  function plan(line, except) {
    const amount = line.amount; if (!(amount > 0)) return [];
    const f = findStu(line.sid); if (!f || !f.s.tid) return [];
    const r = remMap(f.s.tid, except), has = Object.keys(r).length > 0, cur = ymNow();
    const sel = [...(line.months || [])].sort(), auto = !sel.length, out = []; let left = amount;
    if (!has) return [{ m: sel[0] || cur, amount }];
    const list = auto ? Object.keys(r).filter((m) => r[m] > 0).sort() : sel;
    for (const m of list) { if (left <= 0) break; const cap = r[m] != null ? r[m] : Infinity, take = Math.min(left, cap); if (take > 0) { out.push({ m, amount: take }); left -= take; } }
    if (left > 0) { if (out.length) out[out.length - 1].amount += left; else out.push({ m: sel[sel.length - 1] || cur, amount: left }); }
    return out;
  }

  /* ----- the form ----- */
  const shortM = (m) => ymLabel(m, true) + (m.slice(0, 4) !== ymNow().slice(0, 4) ? ' ' + m.slice(2, 4) : '');
  const money = (n) => fmt(n, 'UZS', { bare: true });
  function norm(d) {
    if (!d.lines) d.lines = [];
    if (d.lines.length === 1) d.lines[0].amount = d.amount || 0;
    else if (d.lines.length > 1) d.amount = d.lines.reduce((a, l) => a + (l.amount || 0), 0);
    d.currency = 'UZS';
  }
  function fromDraft(d, preset) {
    d.by = d.by || preset.by || ''; d.lines = []; d.record = !!(d.id && isRec(d.id)); d.wasRecord = d.record;
    if (d.type !== 'in' && !d.record || !on()) { d.lesson = false; return; }
    if (d.id) {
      const f = d.studentId && findStu(d.studentId);
      if (f && f.s.tid && f.g.id === d.groupId) { d.lesson = true; d.lines = [{ gid: f.g.id, sid: f.s.id, amount: d.amount, months: allocOf(d).map((a) => a.m), txId: d.id, created: d.createdAt }]; d.currency = 'UZS'; } else d.lesson = false;
      return;
    }
    let sid = preset.lessonStudent && preset.lessonStudent.sid, gid = preset.lessonStudent && preset.lessonStudent.gid;
    if (!sid && preset.studentId) { const f = findStu(preset.studentId); if (f) { sid = f.s.id; gid = f.g.id; } }
    d.lesson = !!sid || !!(preset.groupId && grp(preset.groupId) && grp(preset.groupId).tid);
    if (sid) d.lines = [{ gid, sid, amount: preset.amount || 0, months: preset.forMonth && !preset.lessonStudent ? [preset.forMonth] : [] }];
    if (d.lesson) d.currency = 'UZS';
  }
  const addLine = (d, gid, sid) => {
    if (d.lines.some((l) => l.sid === sid)) return;
    const f = findStu(sid), o = f && f.s.tid ? owed(f.s.tid) : { total: 0 };
    d.lines.push({ gid, sid, amount: d.lines.length ? (o.total || (charge(f.s.tid, ymNow()) || 0)) : (d.amount || o.total || 0), months: [] });
    if (d.lines.length === 1 && !d.amount) d.amount = d.lines[0].amount;
    if (d.lines.length === 2) { /* the first child keeps what was typed; the amount box becomes the total */ }
    d.pick = false;
  };
  function listHtml(d) {
    const q = low(d.q || ''), gs = activeGroups().filter((g) => !d.pg || g.id === d.pg);
    const rows = gs.map((g) => stuOf(g).filter((s) => !q || low(s.name).includes(q) || low(g.name).includes(q) && !d.pg).filter((s) => !(d.lines || []).some((l) => l.sid === s.id)).map((s) => {
      const o = owed(s.tid), has = remMap(s.tid);
      const sub = !Object.keys(has).length ? 'No fee set' : o.total ? `Owes ${money(o.total)} · ${o.months.slice(0, 3).map(shortM).join(', ')}` : 'Paid up';
      return `<button class="br-st" data-act="br-add" data-v="${g.id}" data-id="${s.id}">${letterTile(s.name, g.color)}<span class="tx"><b>${esc(s.name)}</b><small>${esc(g.name)} · ${esc(sub)}</small></span><span class="plus">＋</span></button>`;
    }).join('')).join('');
    return rows || '<p class="hint" style="margin:10px 0 0">Nobody found. Students are added in the Teacher app.</p>';
  }
  function pickerHtml(d) {
    const gs = activeGroups();
    return `<div class="br-pick"><div class="group"><label class="field"><input id="br-q" style="text-align:left" placeholder="Search a student" value="${esc(d.q || '')}" autocomplete="off" enterkeyhint="search"></label></div>
      <div class="quick"><button data-act="br-grp" data-v="" class="${!d.pg ? 'on' : ''}">All</button>${gs.map((g) => `<button data-act="br-grp" data-v="${g.id}" class="${d.pg === g.id ? 'on' : ''}"><i class="br-dot" style="background:${g.color}"></i>${esc(g.name)}</button>`).join('')}</div>
      <div class="br-list" id="br-list">${listHtml(d)}</div></div>`;
  }
  function lineHtml(d, l, i) {
    const f = findStu(l.sid); if (!f) return '';
    const g = f.g, s = f.s, multi = d.lines.length > 1, r = remMap(s.tid, l.txId), has = Object.keys(r).length > 0, cur = ymNow(), o = owed(s.tid, l.txId);
    const chips = monthList().map((m) => {
      const c = charge(s.tid, m), rem = r[m], st = c == null || c === 0 ? 'free' : rem === 0 ? 'done' : rem < c ? 'part' : m <= cur ? 'owe' : 'fut';
      return `<button class="br-m ${st}${(l.months || []).includes(m) ? ' on' : ''}${m === cur ? ' cur' : ''}" data-act="br-month" data-i="${i}" data-v="${m}">${shortM(m)}</button>`;
    }).join('');
    return `<div class="br-line"><div class="br-lh">${letterTile(s.name, g.color)}<div class="tx"><b>${esc(s.name)}</b><small>${esc(g.name)} · ${!has ? 'No fee set' : o.total ? `Owes ${money(o.total)}` : 'Paid up'}</small></div>${!d.id && (multi || d.lines.length) ? `<button class="br-x" data-act="br-rm" data-v="${i}" aria-label="Remove ${esc(s.name)}">✕</button>` : ''}</div>
      ${multi ? `<div class="group"><label class="row field"><span>Amount for ${esc(s.name.split(' ')[0])}</span><input class="br-in" data-i="${i}" inputmode="numeric" placeholder="0" value="${l.amount ? shownAmount(l.amount, 'UZS') : ''}" autocomplete="off" enterkeyhint="done"><span class="muted" style="min-width:0">so'm</span></label></div>` : ''}
      <div class="br-ml">Pays for <small>(automatic = oldest unpaid first)</small></div>
      <div class="br-months"><button class="br-m auto${(l.months || []).length ? '' : ' on'}" data-act="br-month" data-i="${i}" data-v="auto">Auto</button>${chips}</div>
      <div class="br-pv" id="br-pv-${i}">${previewHtml(d, l)}</div></div>`;
  }
  function previewHtml(d, l) {
    const al = plan(l, l.txId); if (!al.length) return '<span class="muted">Type the amount to see which months it pays.</span>';
    const f = findStu(l.sid), r = remMap(f.s.tid, l.txId), last = al[al.length - 1], left = r[last.m] != null ? r[last.m] - last.amount : 0;
    const parts = al.map((a) => `<b>${shortM(a.m)}</b> ${money(a.amount)}`).join(' · ');
    const extra = al.some((a) => r[a.m] != null && a.amount > r[a.m]);
    return `<span class="ok">${glyph('check')}</span><span>${parts}${left > 0 ? `<br><em class="warn">Part payment: ${money(left)} still owed for ${shortM(last.m)}</em>` : ''}${extra ? '<br><em class="info">More than the fee: the extra stays as credit</em>' : ''}</span>`;
  }
  function who(d) {
    if (!on()) return '';
    const mode = `<div class="form-label">What is it?</div><div class="seg full">${segButtons('br-mode', [['student', 'Student fee'], ['other', 'Something else']], d.lesson ? 'student' : 'other')}</div>`;
    if (!d.lesson) return mode;
    norm(d);
    const by = ['Student', 'Mother', 'Father', 'Someone else'];
    return `${mode}<div class="form-label">Who is it for</div>
      ${d.lines.map((l, i) => lineHtml(d, l, i)).join('')}
      ${!d.lines.length || d.pick ? pickerHtml(d) : (d.id ? '' : `<button class="br-add" data-act="br-pickopen">＋ ${d.lines.length ? 'Add another student (sister, brother…)' : 'Choose a student'}</button>`)}
      <div class="form-label">Who paid</div><div class="quick">${by.map((b) => `<button data-act="br-by" data-v="${b}" class="${d.by === b ? 'on' : ''}">${b}</button>`).join('')}</div>
      <div class="form-label">Is this new money?</div><div class="seg full">${segButtons('br-rec', [['new', 'Yes, add to my balance'], ['rec', 'No, already counted']], d.record ? 'rec' : 'new')}</div>
      ${d.record ? `<p class="hint">${d.id && !d.wasRecord ? 'Saving this takes the money out of your balance and keeps only the record. ' : ''}It is only a record of who paid for which months. Your balances and totals do not change.</p>` : (d.id && d.wasRecord ? '<p class="hint">Saving this adds the money to your balance.</p>' : '')}`;
  }
  const ok = (d) => { norm(d); return d.lines.length > 0 && d.lines.every((l) => l.amount > 0 && findStu(l.sid)) && d.currency === 'UZS'; };
  function mount(sh) {
    const q = sh.querySelector('#br-q');
    if (q) q.addEventListener('input', () => { draft.q = q.value; const el = sh.querySelector('#br-list'); if (el) el.innerHTML = listHtml(draft); });
    sh.querySelectorAll('.br-in').forEach((inp) => inp.addEventListener('input', () => { const r = typedAmount(inp.value, 'UZS'); inp.value = r.shown; draft.lines[+inp.dataset.i].amount = r.value; refresh(sh); syncTx(); }));
    sh.querySelectorAll('.br-months').forEach((el) => { const c = el.querySelector('.cur'); if (c) el.scrollLeft = Math.max(0, c.offsetLeft - 70); });
  }
  function refresh(sh) { // after typing: only the small texts change, so nothing jumps
    if (!draft.lesson) return; norm(draft);
    draft.lines.forEach((l, i) => { const el = sh.querySelector('#br-pv-' + i); if (el) el.innerHTML = previewHtml(draft, l); });
    const amt = sh.querySelector('#amt'); if (amt && draft.lines.length > 1) amt.value = shownAmount(draft.amount, 'UZS');
  }
  function saveLesson() {
    const d = draft; if (!ok(d)) return;
    const batch = d.lines.length > 1 ? uid() : (d.batch || null), made = [];
    d.lines.forEach((l) => {
      const f = findStu(l.sid), al = plan(l, l.txId); if (!al.length) return;
      const rec = { id: l.txId || uid(), type: 'in', amount: roundCur(l.amount, 'UZS'), currency: 'UZS', account: d.account, date: d.date || todayIso(), note: (d.note || '').trim(), createdAt: l.created || Date.now(),
        person: f.s.name, category: lessonCat() || OTHER_CAT.in, groupId: f.g.id, studentId: f.s.id, forMonth: al[0].m, alloc: al, by: d.by || '' };
      if (batch) rec.batch = batch;
      if (d.noSplit) rec.noSplit = true;
      made.push(rec);
    });
    UI.lastType = 'in'; UI.lastAcc.in = d.account;
    if (!S.records) S.records = [];
    made.forEach((rec) => {
      if (d.record) { // already counted: only the record is kept, no balance changes
        S.tx = S.tx.filter((t) => t.id !== rec.id);
        const j = S.records.findIndex((t) => t.id === rec.id); if (j >= 0) S.records[j] = rec; else S.records.push(rec);
        return;
      }
      S.records = S.records.filter((t) => t.id !== rec.id);
      const plan0 = splitPlan(rec), i = S.tx.findIndex((t) => t.id === rec.id);
      if (i >= 0) S.tx[i] = rec; else S.tx.push(rec);
      applySplit(rec, plan0);
    });
    UI.flashId = made[0] && made[0].id; save(); buzz(); txDone(); render();
    if (d.record) { toast(`Record saved · ${made.map((r) => r.person.split(' ')[0]).join(' + ')} · ${money(made.reduce((a, r) => a + r.amount, 0))} (balance not changed)`); return; }
    toast(made.length > 1 ? `${made.map((r) => r.person.split(' ')[0]).join(' + ')} · ${money(made.reduce((a, r) => a + r.amount, 0))}` : `${made[0].person} · ${shortM(made[0].alloc[0].m)}${made[0].alloc.length > 1 ? '…' : ''} · ${money(made[0].amount)}`);
  }

  /* ----- actions ----- */
  const again = () => refreshSheet(txHtml(), mountTx);
  Object.assign(ACTIONS, {
    'br-mode': (a, v) => { draft.lesson = v === 'student'; if (draft.lesson) { draft.currency = 'UZS'; draft.category = draft.category || lessonCat(); draft.pick = !draft.lines.length; } else { draft.groupId = null; draft.studentId = null; } again(); },
    'br-pickopen': () => { draft.pick = true; draft.q = ''; draft.pg = ''; again(); },
    'br-grp': (a, v) => { draft.pg = v; draft.q = ''; again(); },
    'br-add': (a, v, id) => { addLine(draft, v, id); draft.q = ''; again(); },
    'br-rm': (a, v) => { draft.lines.splice(+v, 1); if (draft.lines.length === 1) draft.amount = draft.lines[0].amount; again(); },
    'br-month': (a) => { const l = draft.lines[+a.dataset.i], v = a.dataset.v; if (v === 'auto') l.months = []; else l.months = (l.months || []).includes(v) ? l.months.filter((x) => x !== v) : [...(l.months || []), v]; again(); },
    'br-by': (a, v) => { draft.by = draft.by === v ? '' : v; again(); },
    'br-rec': (a, v) => { draft.record = v === 'rec'; again(); },
  });
  // groups and students are managed in the Teacher app
  ['group-edit', 'new-group', 'del-group', 'groups-from-sched'].forEach((k) => { const f = ACTIONS[k]; ACTIONS[k] = (...a) => (on() ? toast('Groups and students are added and changed in the Teacher app') : f && f(...a)); });

  /* ----- who paid for a month, from the allocation (replaces groups.js's own guess for linked groups) ----- */
  const _gm = groupMonth;
  groupMonth = function (g, ym) {
    if (!on() || !g.tid) return _gm(g, ym);
    const cur = 'UZS', used = new Set(), pays = [];
    const rows = g.students.filter((s) => !s.gone).map((s) => {
      const ps = payTx().filter((t) => t.studentId === s.id && allocOf(t).some((a) => a.m === ym)).sort(sortTx);
      ps.forEach((t) => { used.add(t.id); pays.push({ ...t, amount: allocOf(t).filter((a) => a.m === ym).reduce((q, a) => q + a.amount, 0) }); });
      const paid = ps.reduce((q, t) => q + allocOf(t).filter((a) => a.m === ym).reduce((x, a) => x + a.amount, 0), 0), due = s.tid ? charge(s.tid, ym) : null;
      const status = ps.length ? (due == null || due === 0 || paid >= due ? 'paid' : 'part') : 'none';
      return { s, ps, paid, due, status };
    });
    const others = S.tx.filter((t) => t.type === 'in' && t.groupId === g.id && !t.studentId && (t.forMonth || t.date.slice(0, 7)) === ym).sort(sortTx);
    others.forEach((t) => pays.push(t));
    const collected = pays.filter((p) => p.currency === cur).reduce((a, p) => a + p.amount, 0);
    return { pays, rows, cur, collected, otherCollected: 0, others, expected: rows.reduce((a, r) => a + (r.due || 0), 0), paidCount: rows.filter((r) => r.status === 'paid').length, n: rows.length };
  };

  /* ----- hand-over from the Teacher app: "Record a payment in Budget" ----- */
  function handoff() {
    try {
      const j = localStorage.getItem(OPEN); if (!j) return;
      const o = JSON.parse(j); localStorage.removeItem(OPEN);
      if (!o || Date.now() - (+o.at || 0) > 6 * 3600e3) return;
      sync(); const f = findTid(o.sid); if (!f) { toast('That student is not in Budget yet. Open the Teacher app once, then try again.'); return; }
      const ow = owed(f.s.tid), amt = ow.total || charge(f.s.tid, o.ym) || 0;
      openTx(null, { type: 'in', category: lessonCat(), currency: 'UZS', amount: amt, lessonStudent: { gid: f.g.id, sid: f.s.id } });
    } catch (e) { /* nothing to hand over */ }
  }

  /* ----- groups and students made in Budget before the bridge: link them once, so no old payment is lost ----- */
  const refs = () => S.tx.concat(S.records || []);
  const paysOf = (fn) => payTx().filter(fn).length;
  function pending() {
    if (!on()) return [];
    return S.groups.map((g) => {
      const gp = g.orphan && !g.orphanOk && paysOf((t) => t.groupId === g.id) > 0;
      const st = g.students.filter((s) => !s.tid && !s.orphanOk && paysOf((t) => t.studentId === s.id) > 0);
      return gp || st.length ? { g, st, gp } : null;
    }).filter(Boolean);
  }
  function linkGroup(g, rid) {
    const dup = S.groups.find((x) => x !== g && x.tid === rid); // the empty copy the sync made
    if (dup) {
      dup.students.forEach((s) => {
        const keep = g.students.find((y) => y.tid && y.tid === s.tid) || g.students.find((y) => !y.tid && low(y.name) === low(s.name));
        if (keep) { refs().forEach((t) => { if (t.studentId === s.id) t.studentId = keep.id; }); if (!keep.tid) keep.tid = s.tid; }
        else g.students.push(s);
      });
      refs().forEach((t) => { if (t.groupId === dup.id) t.groupId = g.id; });
      S.schedule.acts.forEach((a) => { if (a.groupId === dup.id) a.groupId = g.id; });
      S.groups = S.groups.filter((x) => x !== dup);
    }
    g.tid = rid; delete g.orphan; delete g.orphanOk;
  }
  function linkStudent(g, s, tid) {
    const hit = findTid(tid);
    if (hit && hit.s !== s) { refs().forEach((t) => { if (t.studentId === hit.s.id) { t.studentId = s.id; t.groupId = g.id; } }); hit.g.students = hit.g.students.filter((x) => x !== hit.s); }
    s.tid = tid; delete s.orphan; delete s.gone; delete s.orphanOk;
  }
  function linkHtml() {
    const r = read(), list = pending();
    const gopt = (g) => { const guess = r.groups.find((x) => low(x.name) === low(g.name)) || r.groups.find((x) => low(g.name).includes(low(x.name)) || low(x.name).includes(low(g.name)));
      return `<option value="">Keep it separate (not linked)</option>${r.groups.map((x) => `<option value="${esc(x.id)}" ${guess && guess.id === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}`; };
    const sopt = (s) => { let guess = null; r.groups.forEach((x) => x.students.forEach((y) => { if (!guess && low(y.name) === low(s.name)) guess = y; }));
      return `<option value="">Keep separate</option>${r.groups.map((x) => `<optgroup label="${esc(x.name)}">${x.students.map((y) => `<option value="${esc(y.id)}" ${guess && guess.id === y.id ? 'selected' : ''}>${esc(y.name)}</option>`).join('')}</optgroup>`).join('')}`; };
    const body = list.map(({ g, st, gp }) => `<div class="br-line"><div class="br-lh">${letterTile(g.name, g.color)}<div class="tx"><b>${esc(g.name)}</b><small>${paysOf((t) => t.groupId === g.id)} payments saved in Budget</small></div></div>
      ${gp ? `<div class="br-ml">This group in the Teacher app is:</div><select class="br-sel" data-lg="${g.id}">${gopt(g)}</select>` : ''}
      ${st.map((s) => `<div class="br-ml">${esc(s.name)} (${paysOf((t) => t.studentId === s.id)} payments) is:</div><select class="br-sel" data-ls="${s.id}" data-g="${g.id}">${sopt(s)}</select>`).join('')}</div>`).join('');
    return sheetHead('Link old groups', '<button data-act="close-sheet">Later</button>', '<button data-act="br-link-save">Save</button>') + `<div class="sheet-body">
      <p class="hint" style="margin-top:0">These groups and students were made in Budget before it was connected to the Teacher app. Tell Budget which Teacher group and student each one is, and their old payments will show in the Teacher app. Nothing is deleted.</p>${body}</div>`;
  }
  ACTIONS['br-link'] = () => openSheet(linkHtml(), null);
  ACTIONS['br-link-save'] = () => {
    const sh = document.querySelector('.sheet') || document;
    sh.querySelectorAll('[data-lg]').forEach((el) => { const g = grp(el.dataset.lg); if (!g) return; if (el.value) linkGroup(g, el.value); else g.orphanOk = true; });
    sh.querySelectorAll('[data-ls]').forEach((el) => { const f = findStu(el.dataset.ls); if (!f) return; if (el.value) linkStudent(f.g, f.s, el.value); else f.s.orphanOk = true; });
    S._rs = ''; sync(); save(); closeSheet(); render(); toast('Linked. Old payments now show in the Teacher app.');
  };
  function banner() {
    let el = document.getElementById('br-banner'); const n = pending().length;
    if (!n || (typeof sheet !== 'undefined' && sheet)) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'br-banner'; document.body.appendChild(el); }
    el.innerHTML = `<button data-act="br-link"><b>Link ${n} old group${n === 1 ? '' : 's'} to the Teacher app</b><span>Their payments are not shown in the Teacher app yet. Tap to link.</span></button>`;
  }

  /* ----- start ----- */
  { const _save = save; save = function () { _save(); publish(); }; }
  { const _render = render; render = function (...a) { if (typeof sheet === 'undefined' || !sheet) sync(); const r = _render(...a); setTimeout(banner, 0); return r; }; }
  setInterval(banner, 2000);
  window.addEventListener('storage', (e) => { if (e.key === RS) { sync(); render(); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { whenOpen(() => { sync(); publish(); setTimeout(handoff, 300); }); } });
  whenOpen(() => setTimeout(() => { sync(); publish(); handoff(); if (typeof render === 'function') render(); }, 500));
  function delRecord() {
    const r = (S.records || []).find((x) => x.id === draft.id); if (!r) return false;
    S.records = S.records.filter((x) => x.id !== r.id); save(); txDone(); render();
    undoToast('Record deleted', () => { S.records.push(r); });
    return true;
  }
  return { on, who, ok, mount, refresh, save: saveLesson, delRecord, fromDraft, norm, sync, publish, plan, owed, remMap, allocOf, charge, roster: () => read() };
})();
