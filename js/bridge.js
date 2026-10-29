'use strict';
/* THE BRIDGE, Budget side (draft, 29 Oct 2026). Same rule as in the Teacher app: one owner for every fact.
     Teacher owns groups, students, fees  -> Budget READS localStorage "teacher-roster" and mirrors it into S.groups
                                             (groups and students you cannot add here; each one keeps a link "tid" = the Teacher's id).
     Budget owns payments                  -> Budget WRITES localStorage "budget-payments" after every save (the Teacher app reads it).
   A student payment says exactly which months it pays for: rec.alloc = [{m:'2026-09', amount}]. One receipt for two children
   (a mother paying for a brother and a sister) is saved as one entry per child with the same rec.batch.
   Nothing is ever deleted by the sync: a student or group that leaves the Teacher app is only marked gone, so old payments keep their owner. */

const BR = (() => {
  /* 30 Oct 2026 (user): student fees are now marked in the Teacher app. Budget no longer has its own "Student fee" form
     (FORM = false: new income is plain income); each payment marked in Teacher pops up here to add to the balance
     or skip ("teacher-to-budget", see the inbox below). Old records made with the form can still be opened and changed. */
  const FORM = false, TB = 'teacher-to-budget';
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
  // Every student payment, sorted by Teacher student, worked out once and kept until the next save.
  // (The student list used to go through all your entries for every student shown, on every letter typed: that was the lag.)
  let gen = 0, ix = null, ixKey = '';
  function index() {
    const key = gen + '|' + S.tx.length + '|' + (S.records || []).length + '|' + S.groups.length;
    if (ix && ix.tx === S.tx && ix.rec === S.records && key === ixKey) return ix;
    const stu = new Map(), by = new Map(), sid = new Map(), add = (m, k, t) => { if (!m.has(k)) m.set(k, []); m.get(k).push(t); };
    S.groups.forEach((g) => g.students.forEach((s) => stu.set(s.id, { g, s })));
    const all = payTx();
    all.forEach((t) => {
      if (t.studentId) add(sid, t.studentId, t);
      if (t.currency !== 'UZS') return; const f = stu.get(t.studentId); if (!f || !f.s.tid) return; add(by, f.s.tid, t);
    });
    ix = { tx: S.tx, rec: S.records, stu, by, sid, all }; ixKey = key;
    return ix;
  }
  // A payment in a linked group that has no student: Teacher cannot count it until you say whose it is.
  const looseTx = () => { const I = index(); return S.tx.filter((t) => t.type === 'in' && t.groupId && t.currency === 'UZS' && !t.noStudent && !(I.stu.get(t.studentId) || {}).s && (grp(t.groupId) || {}).tid); };
  // The safe part done by itself: the payment already carries the student's exact name, and only one student in that group has it.
  function autoLink() {
    let n = 0; gen++;
    looseTx().forEach((t) => {
      const g = grp(t.groupId), nm = low(t.person || ''); if (!g || !nm) return;
      const hit = g.students.filter((s) => s.tid && !s.gone && low(s.name) === nm);
      if (hit.length === 1) { t.studentId = hit[0].id; n++; }
    });
    return n;
  }

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
    if (autoLink()) ch = true;
    if (ch) save();
    return ch;
  }

  /* ----- Budget -> Teacher: publish the payments ----- */
  function publish() {
    try {
      const pays = [], I = index(); let loose = 0;
      I.all.forEach((t) => {
        if (t.noStudent) return; // you said: not a student's fee
        const f = I.stu.get(t.studentId), g0 = grp(t.groupId);
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
    (index().by.get(tid) || []).forEach((t) => { if (t.id !== except) allocOf(t).forEach((a) => { m[a.m] = (m[a.m] || 0) + a.amount; }); });
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
    if (!FORM && !d.record) { d.lesson = false; return; }
    if (d.type !== 'in' && !d.record || !on()) { d.lesson = false; return; }
    if (d.id) {
      const f = d.studentId && findStu(d.studentId);
      if (f && f.s.tid && f.g.id === d.groupId) { d.lesson = true; d.lines = [{ gid: f.g.id, sid: f.s.id, amount: d.amount, months: allocOf(d).map((a) => a.m), txId: d.id, created: d.createdAt }]; d.currency = 'UZS'; } else d.lesson = false;
      return;
    }
    let sid = preset.lessonStudent && preset.lessonStudent.sid, gid = preset.lessonStudent && preset.lessonStudent.gid;
    if (!sid && preset.studentId) { const f = findStu(preset.studentId); if (f) { sid = f.s.id; gid = f.g.id; } }
    d.lesson = !!sid || !!preset.pickStudent || !!(preset.groupId && grp(preset.groupId) && grp(preset.groupId).tid);
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
    if (!on() || (!FORM && !d.record)) return '';
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
    const cur = 'UZS', used = new Set(), pays = [], I = index();
    const rows = g.students.filter((s) => !s.gone).map((s) => {
      const ps = (I.sid.get(s.id) || []).filter((t) => allocOf(t).some((a) => a.m === ym)).sort(sortTx);
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
      sync();
      if (o.mode === 'fix') { if (looseTx().length) ACTIONS['br-fix'](); return; } // "Needs attention" in the Teacher app
      if (!o.sid) { openTx(null, { type: 'in', category: lessonCat(), currency: 'UZS', pickStudent: true }); return; } // "Record a payment": choose the student here
      const f = findTid(o.sid); if (!f) { toast('That student is not in Budget yet. Open the Teacher app once, then try again.'); return; }
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
  /* ----- payments in a linked group with no student: say whose each one is, once ----- */
  function fixHtml() {
    const list = looseTx().sort(sortTx), gs = activeGroups();
    const opts = (t) => {
      const g = grp(t.groupId), first = low(t.person || '').split(/\s+/)[0];
      const same = first ? stuOf(g).filter((s) => low(s.name).split(/\s+/)[0] === first) : [], guess = same.length === 1 ? same[0].id : '';
      const og = (x) => `<optgroup label="${esc(x.name)}">${stuOf(x).map((s) => `<option value="${s.id}" ${s.id === guess ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</optgroup>`;
      return `<option value="">Decide later</option>${og(g)}${gs.filter((x) => x !== g).map(og).join('')}<option value="none">Not a student's fee</option>`;
    };
    const rows = list.map((t) => { const g = grp(t.groupId);
      return `<div class="br-line"><div class="br-lh">${letterTile(g.name, g.color)}<div class="tx"><b>${money(t.amount)} so'm · ${shortDate(t.date)}</b><small>${esc(g.name)}${t.person ? ' · ' + esc(t.person) : ''}${t.note ? ' · ' + esc(t.note) : ''}</small></div></div>
        <select class="br-sel" data-fx="${t.id}">${opts(t)}</select></div>`; }).join('');
    return sheetHead('Choose the students', '<button data-act="close-sheet">Later</button>', '<button data-act="br-fix-save">Save</button>') + `<div class="sheet-body">
      <p class="hint" style="margin-top:0">These payments are in a group but have no student, so the Teacher app cannot count them. Choose whose each one is. Where the first name matched, the student is already chosen: check it, then Save. The amounts and your balance do not change.</p>${rows || '<p class="hint">Nothing left to choose.</p>'}</div>`;
  }
  ACTIONS['br-fix'] = () => { const b = document.getElementById('br-banner'); if (b) b.remove(); openSheet(fixHtml(), null); };
  ACTIONS['br-fix-save'] = () => {
    const sh = document.querySelector('.sheet') || document; let n = 0;
    sh.querySelectorAll('[data-fx]').forEach((el) => {
      const t = S.tx.find((x) => x.id === el.dataset.fx); if (!t || !el.value) return;
      if (el.value === 'none') { t.noStudent = true; n++; return; }
      const f = findStu(el.value); if (!f) return;
      t.studentId = f.s.id; t.groupId = f.g.id; n++;
    });
    save(); closeSheet(); render(); toast(n ? `${n} payment${n === 1 ? '' : 's'} sorted. The Teacher app shows them now.` : 'Nothing changed');
  };
  /* ----- the inbox: payments marked in the Teacher app, waiting to be added to the balance ----- */
  const tbList = () => { try { const l = JSON.parse(localStorage.getItem(TB) || '[]'); return Array.isArray(l) ? l.filter((x) => x && x.op && x.id && +x.amount > 0) : []; } catch (e) { return []; } };
  const tbSet = (l) => { try { if (l.length) localStorage.setItem(TB, JSON.stringify(l)); else localStorage.removeItem(TB); } catch (e) { /* full */ } };
  let inAcc = null;
  const mName = (m) => ymLabel(m);
  function inboxHtml() {
    const l = tbList(), accs = S.accounts, a = inAcc || UI.lastAcc.in || accs[0].id, adds = l.filter((x) => x.op === 'add');
    const row = (x) => x.op === 'add'
      ? `<div class="br-line"><div class="br-lh">${letterTile(x.person || '?', '#12B76A')}<div class="tx"><b>${esc(x.person)} · ${money(x.amount)} so'm</b><small>${esc(x.group)} · ${esc(mName(x.m))} · marked ${shortDate(x.date)}</small></div></div>
         <div class="br-two"><button class="br-yes" data-act="tb-add" data-v="${esc(x.id)}">Add to my balance</button><button data-act="tb-skip" data-v="${esc(x.id)}">Already counted</button></div></div>`
      : `<div class="br-line del"><div class="br-lh">${letterTile(x.person || '?', '#F04438')}<div class="tx"><b>Removed in Teacher: ${esc(x.person)} · ${money(x.amount)} so'm</b><small>${esc(x.group)} · ${esc(mName(x.m))}</small></div></div>
         <div class="br-two"><button class="br-no" data-act="tb-take" data-v="${esc(x.id)}">Take it out of my balance</button><button data-act="tb-skip" data-v="${esc(x.id)}">Keep it</button></div></div>`;
    return sheetHead('From the Teacher app', '<button data-act="close-sheet">Later</button>', '') + `<div class="sheet-body">
      <p class="hint" style="margin-top:0">You marked these payments in the Teacher app. Add the new money to your balance. If the money is already in Budget, tap Already counted: nothing is added.</p>
      ${adds.length ? `<div class="form-label">Put the money in</div><div class="quick">${accs.map((x) => `<button data-act="tb-acc" data-v="${x.id}" class="${x.id === a ? 'on' : ''}">${esc(x.name)}</button>`).join('')}</div>` : ''}
      ${l.map(row).join('') || '<p class="hint">Nothing is waiting.</p>'}
      ${adds.length > 1 ? `<div class="br-two" style="margin-top:6px"><button class="br-yes" data-act="tb-addall">Add all ${adds.length} · ${money(adds.reduce((q, x) => q + x.amount, 0))}</button><button data-act="tb-skipall">All already counted</button></div>` : ''}</div>`;
  }
  function tbAdd(x) {
    const f = x.sid ? findTid(x.sid) : null, a = inAcc || UI.lastAcc.in || S.accounts[0].id;
    if (S.tx.some((t) => t.tpid === x.id)) return; // never twice
    S.tx.push({ id: uid(), tpid: x.id, type: 'in', amount: Math.round(+x.amount), currency: 'UZS', account: a, date: /^\d{4}-\d\d-\d\d$/.test(x.date || '') ? x.date : todayIso(), note: `${x.group} · ${mName(x.m)} fee`, createdAt: Date.now(),
      person: x.person || '', category: lessonCat() || OTHER_CAT.in, groupId: f ? f.g.id : null, studentId: f ? f.s.id : null, forMonth: x.m, alloc: [{ m: x.m, amount: Math.round(+x.amount) }] });
    UI.lastAcc.in = a;
  }
  function tbDone(ids, msg) {
    tbSet(tbList().filter((x) => !ids.includes(x.id))); save(); render();
    if (tbList().length) refreshSheet(inboxHtml(), null); else { closeSheet(); toast(msg); }
  }
  Object.assign(ACTIONS, {
    'tb-open': () => { const b = document.getElementById('br-banner'); if (b) b.remove(); openSheet(inboxHtml(), null); },
    'tb-acc': (a, v) => { inAcc = v; refreshSheet(inboxHtml(), null); },
    'tb-add': (a, v) => { const x = tbList().find((y) => y.id === v); if (x) tbAdd(x); tbDone([v], 'Added to your balance'); },
    'tb-skip': (a, v) => tbDone([v], 'Nothing added'),
    'tb-take': (a, v) => { S.tx = S.tx.filter((t) => t.tpid !== v); tbDone([v], 'Taken out of your balance'); },
    'tb-addall': () => { const l = tbList().filter((x) => x.op === 'add'); l.forEach(tbAdd); tbDone(l.map((x) => x.id), `${l.length} payments added`); },
    'tb-skipall': () => tbDone(tbList().filter((x) => x.op === 'add').map((x) => x.id), 'Nothing added'),
  });
  // a removal Budget never added (it was "already counted", or never seen) needs no question
  function tbTidy() { const l = tbList(), keep = l.filter((x) => x.op !== 'del' || S.tx.some((t) => t.tpid === x.id)); if (keep.length !== l.length) tbSet(keep); return keep; }
  function banner() {
    let el = document.getElementById('br-banner'); const l = tbTidy();
    if (!l.length || (typeof sheet !== 'undefined' && sheet)) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'br-banner'; document.body.appendChild(el); }
    const adds = l.filter((x) => x.op === 'add'), dels = l.length - adds.length;
    const html = `<button data-act="tb-open"><b>${adds.length ? `${adds.length} payment${adds.length === 1 ? '' : 's'} from the Teacher app · ${money(adds.reduce((q, x) => q + x.amount, 0))} so'm` : `${dels} payment${dels === 1 ? '' : 's'} removed in the Teacher app`}</b><span>${adds.length ? `Tap to add ${adds.length === 1 ? 'it' : 'them'} to your balance, or skip.` : 'Tap to take it out of your balance, or keep it.'}</span></button>`;
    if (el._h !== html) { el._h = html; el.innerHTML = html; }
  }

  /* ----- start ----- */
  { const _save = save; save = function () { gen++; _save(); publish(); }; }
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
