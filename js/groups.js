'use strict';
/* Groups (classes): each has students and an optional monthly fee. A payment is a "money in"
   entry with groupId, studentId and forMonth ("YYYY-MM" — the month it pays for, which can
   differ from the day it was paid). */

// ================= Data =================
function groupPayments(gid, ym) {
  return S.tx.filter((t) => t.type === 'in' && t.groupId === gid && (t.forMonth || t.date.slice(0, 7)) === ym).sort(sortTx);
}
function groupMonth(g, ym) {
  const pays = groupPayments(g.id, ym);
  const cur = g.fee ? g.fee.currency : pays.length ? pays[0].currency : 'UZS';
  const used = new Set();
  const rows = g.students.map((s) => {
    const ps = pays.filter((p) => p.studentId === s.id || (!p.studentId && (p.person || '').trim().toLowerCase() === s.name.toLowerCase()));
    ps.forEach((p) => used.add(p.id));
    const paid = ps.filter((p) => p.currency === cur).reduce((a, p) => a + p.amount, 0);
    const otherCur = ps.some((p) => p.currency !== cur);
    let status = 'none';
    if (ps.length) status = !g.fee || paid >= g.fee.amount || otherCur ? 'paid' : 'part';
    return { s, ps, paid, status };
  });
  const collected = pays.filter((p) => p.currency === cur).reduce((a, p) => a + p.amount, 0);
  const otherCollected = pays.filter((p) => p.currency !== cur).reduce((a, p) => a + p.amount, 0);
  return {
    pays, rows, cur, collected, otherCollected,
    others: pays.filter((p) => !used.has(p.id)),
    expected: g.fee && g.students.length ? g.fee.amount * g.students.length : 0,
    paidCount: rows.filter((r) => r.status === 'paid').length,
    n: g.students.length,
  };
}
// Totals across all groups for one month, in the currency most fees use.
function groupsMonthSummary(ym) {
  const usd = S.groups.filter((g) => g.fee && g.fee.currency === 'USD').length;
  const uzs = S.groups.filter((g) => !g.fee || g.fee.currency === 'UZS').length;
  const cur = usd > uzs ? 'USD' : 'UZS';
  let students = 0, paid = 0, collected = 0, expected = 0;
  for (const g of S.groups) {
    const m = groupMonth(g, ym);
    students += m.n; paid += m.paidCount;
    collected += m.pays.filter((p) => p.currency === cur).reduce((a, p) => a + p.amount, 0);
    if (g.fee && g.fee.currency === cur) expected += m.expected;
  }
  return { cur, students, paid, collected, expected };
}
const lessonActsWithoutGroup = () => S.schedule.acts.filter((a) => a.kind === 'lesson' && !grp(a.groupId));
const lessonCat = () => (S.cats.in.some((c) => c.id === 'lessons') ? 'lessons' : null);

// ================= Overview card =================
function groupsHomeCard() {
  const ym = ymNow(), s = groupsMonthSummary(ym);
  const pct = s.students ? (s.paid / s.students) * 100 : 0;
  return `<div class="sec-head"><h2>Lessons</h2><button class="link" data-act="groups-view">All groups</button></div>
  <button class="card les-card" data-act="groups-view">
    <div class="les-top">
      <div class="row-main">
        <div class="label">${MONTHS[new Date().getMonth()]} · collected</div>
        <div class="les-big num">${fmt(s.collected, s.cur)}</div>
        <div class="card-sub">${s.expected ? `of ${fmt(s.expected, s.cur)} expected` : s.students ? `${s.paid} of ${s.students} students paid` : 'Add students to see who paid'}</div>
      </div>
      ${s.students ? ring(pct, 62, 6, `<span class="les-ring num">${s.paid}/${s.students}</span>`, s.paid === s.students) : ''}
    </div>
    <div class="les-groups">${S.groups.map((g) => {
      const m = groupMonth(g, ym);
      return `<span class="les-chip" style="--c:${g.color}"><i></i>${esc(g.name)}<b class="num">${m.n ? `${m.paidCount}/${m.n}` : compact(m.collected, m.cur)}</b></span>`;
    }).join('')}</div>
  </button>`;
}

// ================= History → Groups =================
function renderGroupsList() {
  const ym = UI.gMonth;
  let h = `<div class="period-nav">
      <button class="icon-btn" data-act="gmonth" data-v="-1" aria-label="Previous month">${I.left}</button>
      <div class="pn-title">${ymLabel(ym)}</div>
      <button class="icon-btn" data-act="gmonth" data-v="1" aria-label="Next month">${I.right}</button>
    </div>`;
  const pending = lessonActsWithoutGroup();
  if (!S.groups.length) {
    return h + `<section class="card empty">
      <div class="big">${ic('users', '#007AFF', 'xl')}</div>
      <h3>Group your lesson income</h3>
      <p>Make a group for each class, add the students and the monthly fee — then see who paid for each month at a glance.</p>
      ${pending.length
        ? `<button class="btn" data-act="groups-from-sched">Create from my schedule</button><p class="hint" style="text-align:center">${pending.map((a) => esc(a.name)).join(' · ')}</p><button class="link" data-act="new-group">or make one yourself</button>`
        : '<button class="btn" data-act="new-group">Create a group</button>'}
    </section>`;
  }
  const s = groupsMonthSummary(ym);
  h += `<section class="card sum-card">
    <div class="label">Collected for ${MONTHS[parseD(ym + '-01').getMonth()]}</div>
    <div class="les-big num">${fmt(s.collected, s.cur)}${s.expected ? `<small> of ${fmt(s.expected, s.cur)}</small>` : ''}</div>
    ${s.students ? `<div class="meter"><i style="width:${((s.paid / s.students) * 100).toFixed(1)}%"></i></div><div class="card-sub">${s.paid} of ${s.students} students paid · ${s.students - s.paid} still to pay</div>` : ''}
  </section>
  <div class="stack" style="margin-top:12px">${S.groups.map((g) => groupCard(g, ym)).join('')}</div>`;
  if (pending.length) h += `<button class="banner" data-act="groups-from-sched" style="margin-top:12px">${ic('calendar', '#FF9500', 'sm')}<div><b>Also in your schedule: ${pending.map((a) => esc(a.name)).join(', ')}</b><span class="s">Tap to make groups for them too.</span></div></button>`;
  h += '<div class="actions"><button class="btn soft" data-act="new-group">＋ New group</button></div>';
  return h;
}
function groupCard(g, ym) {
  const m = groupMonth(g, ym);
  const pct = m.n ? (m.paidCount / m.n) * 100 : m.expected ? (m.collected / m.expected) * 100 : 0;
  return `<button class="card grp-card" data-act="group" data-id="${g.id}">
    <div class="gc-top">${grpBadge(g)}<div class="row-main"><div class="gc-name">${esc(g.name)}</div><div class="gc-date">${m.n ? plural(m.n, 'student') : 'No students yet'}${g.fee ? ` · ${fmt(g.fee.amount, g.fee.currency)} a month` : ''}</div></div>${I.chev}</div>
    ${m.n ? `<div class="meter tint" style="--mc:${g.color}"><i style="width:${pct.toFixed(1)}%"></i></div>` : ''}
    ${m.n || m.pays.length
      ? `<div class="gc-nums"><span><b class="num">${fmt(m.collected, m.cur)}</b>${m.expected ? ` <span class="muted">of ${fmt(m.expected, m.cur)}</span>` : ''}</span><span class="muted">${m.n ? `${m.paidCount} of ${m.n} paid` : plural(m.pays.length, 'payment')}</span></div>`
      : '<div class="gc-nums" style="margin-top:10px"><span class="link" style="font-size:14px">Add students and the monthly fee →</span></div>'}
  </button>`;
}

// ================= Group sheet =================
let gOpen = { id: null, ym: null };
function openGroup(id, ym) { gOpen = { id, ym: ym || UI.gMonth }; openSheet(groupHtml(), null); }
function backToGroup() { const o = { ...gOpen }; return () => openGroup(o.id, o.ym); }
function groupHtml() {
  const g = grp(gOpen.id);
  if (!g) return sheetHead('', '', '<button data-act="close-sheet">Done</button>') + '<div class="sheet-body"></div>';
  const ym = gOpen.ym, m = groupMonth(g, ym);
  const due = g.fee ? g.fee.amount : 0;
  const monthName = MONTHS[parseD(ym + '-01').getMonth()];
  const rows = m.rows.map((r) => {
    const last = r.ps[0];
    let sub, right, act, id;
    if (r.status === 'paid') {
      sub = `${fmt(r.paid || last.amount, r.paid ? m.cur : last.currency)} · ${shortDate(last.date)}${r.ps.length > 1 ? ` · ${r.ps.length} payments` : ''}`;
      right = `<span class="pay-st paid">${glyph('check')}</span>`;
      act = 'edit-tx'; id = last.id;
    } else if (r.status === 'part') {
      sub = `Paid ${fmt(r.paid, m.cur)} · ${fmt(due - r.paid, m.cur)} left`;
      right = `<span class="pay-st part" style="--p:${Math.round((r.paid / due) * 100)}%"></span>`;
      act = 'pay-student'; id = r.s.id;
    } else {
      sub = 'Not paid yet';
      right = '<span class="pay-btn">Record</span>';
      act = 'pay-student'; id = r.s.id;
    }
    return `<button class="row ${r.status}" data-act="${act}" data-id="${id}">${letterTile(r.s.name, g.color)}<div class="row-main"><div class="row-title">${esc(r.s.name)}</div><div class="row-sub">${esc(sub)}</div></div>${right}</button>`;
  }).join('');
  return sheetHead('', '<button data-act="group-edit">Edit</button>', '<button data-act="close-sheet">Done</button>') + `
  <div class="sheet-body" data-back="group">
    <div class="gd-hero">
      ${grpBadge(g, 'xl')}
      <div class="gd-name">${esc(g.name)}</div>
      <div class="gd-amt">${m.n ? plural(m.n, 'student') : 'No students yet'}${g.fee ? ` · ${fmt(g.fee.amount, g.fee.currency)} a month` : ''}</div>
    </div>
    <div class="period-nav" style="margin:16px 0 10px">
      <button class="icon-btn" data-act="gs-month" data-v="-1" aria-label="Previous month">${I.left}</button>
      <div class="pn-title">${ymLabel(ym)}</div>
      <button class="icon-btn" data-act="gs-month" data-v="1" aria-label="Next month">${I.right}</button>
    </div>
    <section class="card sum-card">
      <div class="label">Collected for ${monthName}</div>
      <div class="les-big num">${fmt(m.collected, m.cur)}${m.expected ? `<small> of ${fmt(m.expected, m.cur)}</small>` : ''}</div>
      ${m.otherCollected ? `<div class="card-sub">and ${fmt(m.otherCollected, OTHER[m.cur])}</div>` : ''}
      ${m.n ? `<div class="meter tint" style="--mc:${g.color}"><i style="width:${((m.paidCount / m.n) * 100).toFixed(1)}%"></i></div><div class="card-sub">${m.paidCount} of ${m.n} paid${m.n - m.paidCount ? ` · ${m.n - m.paidCount} still to pay` : ' · everyone paid 🎉'}</div>` : ''}
    </section>
    <div class="btn-row" style="margin-top:12px">
      <button class="btn" data-act="group-pay">＋ Record payment</button>
      <button class="btn grey" data-act="group-edit">Students</button>
    </div>
    ${m.n ? `<div class="form-label">Students</div><div class="group roster">${rows}</div>` : '<p class="hint" style="margin-top:16px">Add your students (tap “Students”) to see who has paid and who hasn\'t.</p>'}
    ${m.others.length ? `<div class="form-label">${m.n ? 'Other payments' : 'Payments'}</div><div class="group">${m.others.map((t) => txRow(t, true)).join('')}</div>` : ''}
    <p class="hint" style="margin-top:14px">A payment counts for the month it's “for”, which you choose when you record it — so paying early or late still lands in the right month.</p>
  </div>`;
}
function payStudent(sid) {
  const g = grp(gOpen.id);
  const s = g && g.students.find((x) => x.id === sid);
  if (!s) return;
  const r = groupMonth(g, gOpen.ym).rows.find((x) => x.s.id === sid);
  const remaining = g.fee ? Math.max(0, g.fee.amount - (r ? r.paid : 0)) : 0;
  openTx(null, {
    type: 'in', groupId: g.id, studentId: s.id, person: s.name, forMonth: gOpen.ym,
    amount: remaining, currency: g.fee ? g.fee.currency : UI.cur, category: lessonCat(), back: backToGroup(),
  });
}

// ================= Group form =================
let grDraft = null;
function openGroupForm(id, back) {
  const g = grp(id);
  grDraft = g
    ? { id: g.id, name: g.name, color: g.color, feeAmount: g.fee ? g.fee.amount : 0, feeCur: g.fee ? g.fee.currency : 'UZS', students: g.students.map((s) => s.name).join('\n'), back }
    : { id: null, name: '', color: PALETTE[3], feeAmount: 0, feeCur: 'UZS', students: '', back };
  openSheet(groupFormHtml(), mountGroupForm);
}
const studentLines = (text) => {
  const seen = new Set();
  return text.split('\n').map((s) => s.trim().replace(/\s+/g, ' ')).filter((s) => {
    const k = s.toLowerCase();
    if (!s || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};
function groupFormHtml() {
  const d = grDraft, editing = !!d.id;
  const n = studentLines(d.students).length;
  return sheetHead(editing ? 'Edit group' : 'New group', '<button data-act="group-cancel">Cancel</button>', '<button data-act="save-group">Save</button>') + `
  <div class="sheet-body">
    <div class="gd-hero" id="grp-preview">${grpBadge({ name: d.name || '?', color: d.color }, 'xl')}</div>
    <div class="form-label">Name</div>
    <div class="group"><label class="field"><input id="gr-name" style="text-align:left" placeholder="e.g. 1B, IELTS, Upper Int." value="${esc(d.name)}" autocomplete="off" enterkeyhint="done" maxlength="30"></label></div>
    <div class="form-label">Colour</div>
    ${swatches('grp-color', d.color)}
    <div class="form-label">Monthly fee per student</div>
    <div class="group plain"><label class="row field"><span>Fee</span><input id="gr-fee" inputmode="decimal" placeholder="Optional" value="${shownAmount(d.feeAmount, d.feeCur)}" autocomplete="off" enterkeyhint="done"><div class="seg sm" style="flex:none">${segButtons('grp-cur', curItems, d.feeCur)}</div></label></div>
    <p class="hint">With a fee the app shows how much is still expected and fills in the amount when you record a payment.</p>
    <div class="form-label">Students <span id="gr-count" class="muted" style="text-transform:none;letter-spacing:0">${n ? '· ' + n : ''}</span></div>
    <div class="group"><textarea id="gr-students" rows="8" placeholder="One name per line&#10;Aziza&#10;Bekzod&#10;Madina">${esc(d.students)}</textarea></div>
    <p class="hint">Write one name per line — you can paste a whole list. Removing a name keeps that student's past payments in History.</p>
    <div class="actions">
      <button class="btn" data-act="save-group">${editing ? 'Save changes' : 'Create group'}</button>
      ${editing ? '<button class="btn danger" data-act="del-group">Delete group</button>' : ''}
    </div>
  </div>`;
}
function mountGroupForm(sh) {
  const name = $('#gr-name', sh), fee = $('#gr-fee', sh), st = $('#gr-students', sh);
  const sync = () => {
    sh.querySelectorAll('[data-act="save-group"]').forEach((b) => { b.disabled = !grDraft.name.trim(); });
    $('#grp-preview', sh).innerHTML = grpBadge({ name: grDraft.name.trim() || '?', color: grDraft.color }, 'xl');
  };
  name.addEventListener('input', () => { grDraft.name = name.value; sync(); });
  fee.addEventListener('input', () => { const r = typedAmount(fee.value, grDraft.feeCur); fee.value = r.shown; grDraft.feeAmount = r.value; });
  st.addEventListener('input', () => {
    grDraft.students = st.value;
    const n = studentLines(st.value).length;
    $('#gr-count', sh).textContent = n ? '· ' + n : '';
  });
  blurOnEnter(sh);
  sync();
  if (!grDraft.id) setTimeout(() => name.focus({ preventScroll: true }), 420);
}
function saveGroup() {
  const d = grDraft;
  if (!d.name.trim()) return;
  const names = studentLines(d.students);
  const old = d.id ? grp(d.id) : null;
  const oldList = old ? old.students : [];
  const used = new Set();
  const renames = [];
  const students = names.map((name, i) => {
    let s = oldList.find((o) => !used.has(o.id) && o.name.toLowerCase() === name.toLowerCase());
    if (!s) {
      // Same line edited (a typo fix) → keep the same student so their payments stay linked.
      const o = oldList[i];
      if (o && !used.has(o.id) && !names.some((n) => n.toLowerCase() === o.name.toLowerCase())) s = o;
    }
    if (s) { used.add(s.id); if (s.name !== name) renames.push([s.id, name]); return { id: s.id, name }; }
    return { id: uid(), name };
  });
  const rec = {
    id: d.id || uid(), name: d.name.trim(), color: d.color,
    fee: d.feeAmount > 0 ? { amount: roundCur(d.feeAmount, d.feeCur), currency: d.feeCur } : null,
    students, createdAt: old ? old.createdAt : Date.now(),
  };
  if (old) Object.assign(old, rec); else S.groups.push(rec);
  for (const [sid, name] of renames) S.tx.forEach((t) => { if (t.studentId === sid) t.person = name; });
  if (!old) {
    const a = S.schedule.acts.find((x) => x.kind === 'lesson' && !grp(x.groupId) && x.name.toLowerCase() === rec.name.toLowerCase());
    if (a) a.groupId = rec.id; // links the lesson in your schedule to this group
  }
  save(); buzz(); render();
  if (d.back) d.back(); else openGroup(rec.id, gOpen.ym || UI.gMonth);
  toast(old ? 'Group updated' : `${rec.name} created`);
}
async function deleteGroup() {
  const g = grp(grDraft.id);
  if (!g) return;
  const n = S.tx.filter((t) => t.groupId === g.id).length;
  const ok = await ask({ title: `Delete “${g.name}”?`, msg: n ? `Its ${n} payment${n === 1 ? '' : 's'} stay in History as normal money in, just without the group.` : 'It has no payments.', ok: 'Delete group', destructive: true });
  if (!ok) return;
  S.groups = S.groups.filter((x) => x.id !== g.id);
  S.tx.forEach((t) => { if (t.groupId === g.id) { delete t.groupId; delete t.studentId; delete t.forMonth; } });
  S.schedule.acts.forEach((a) => { if (a.groupId === g.id) { a.groupId = null; a.name = g.name; a.color = g.color; } });
  if (UI.hGroup === g.id) UI.hGroup = 'all';
  save(); closeSheet(); render();
  toast('Group deleted');
}
function createGroupsFromSchedule() {
  let made = 0;
  for (const a of lessonActsWithoutGroup()) {
    let g = S.groups.find((x) => x.name.toLowerCase() === a.name.toLowerCase());
    if (!g) { g = { id: uid(), name: a.name, color: a.color, fee: null, students: [], createdAt: Date.now() }; S.groups.push(g); made++; }
    a.groupId = g.id;
  }
  save(); render(true);
  toast(made ? `${plural(made, 'group')} created — add students and fees next` : 'Lessons linked to your groups');
}

// ================= Actions =================
Object.assign(ACTIONS, {
  'groups-view': () => {
    UI.hView = 'groups';
    UI.gMonth = ymNow();
    if (sheet) closeSheet();
    if (UI.tab === 'history') render(true); else goTab('history');
  },
  gmonth: (a, v) => { UI.gMonth = ymShift(UI.gMonth, Number(v)); render(); },
  group: (a, v, id) => openGroup(id, UI.tab === 'history' ? UI.gMonth : ymNow()),
  'gs-month': (a, v) => { gOpen.ym = ymShift(gOpen.ym, Number(v)); refreshSheet(groupHtml(), null); },
  'group-edit': () => openGroupForm(gOpen.id, backToGroup()),
  'new-group': () => openGroupForm(null, null),
  'group-cancel': () => { if (grDraft.back) grDraft.back(); else if (grDraft.id) openGroup(grDraft.id); else closeSheet(); },
  'grp-color': (a, v) => { grDraft.color = v; refreshSheet(groupFormHtml(), mountGroupForm); },
  'grp-cur': (a, v) => { grDraft.feeCur = v; grDraft.feeAmount = roundCur(grDraft.feeAmount, v); refreshSheet(groupFormHtml(), mountGroupForm); },
  'save-group': () => saveGroup(),
  'del-group': () => deleteGroup(),
  'pay-student': (a, v, id) => payStudent(id),
  'group-pay': () => {
    const g = grp(gOpen.id);
    if (!g) return;
    openTx(null, { type: 'in', groupId: g.id, forMonth: gOpen.ym, amount: g.fee ? g.fee.amount : 0, currency: g.fee ? g.fee.currency : UI.cur, category: lessonCat(), back: backToGroup() });
  },
  'groups-from-sched': () => createGroupsFromSchedule(),
});
