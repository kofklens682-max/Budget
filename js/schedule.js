'use strict';
/* Weekly schedule. Each day is an ordered list of blocks (an activity + a length) that starts at
   the day's start time, so every time follows from the order — drag to reorder, and changing a
   length lets the free time after it absorb the difference. "Free" is a block like any other. */

const SCHED_PX = 1.2; // day view: pixels per minute (blocks also have a minimum height)
const WEEK_PX = 1.1;  // week view: pixels per minute

// ================= Data =================
function actView(id) {
  const a = S.schedule.acts.find((x) => x.id === id) || S.schedule.acts.find((x) => x.id === 'free');
  const g = grp(a.groupId);
  return { ...a, name: g ? g.name : a.name, color: g ? g.color : a.color, group: g };
}
function dayPlan(di) {
  const d = S.schedule.days[di];
  let t = d.start;
  return d.blocks.map((b) => { const r = { ...b, from: t, to: t + b.dur, a: actView(b.act) }; t += b.dur; return r; });
}
const dayEnd = (di) => S.schedule.days[di].start + S.schedule.days[di].blocks.reduce((a, b) => a + b.dur, 0);
const hasSchedule = () => S.schedule.days.some((d) => d.blocks.length);
function mergeFree(di) {
  const blocks = S.schedule.days[di].blocks;
  for (let i = blocks.length - 1; i > 0; i--) {
    if (blocks[i].act === 'free' && blocks[i - 1].act === 'free') { blocks[i - 1].dur += blocks[i].dur; blocks.splice(i, 1); }
  }
}
// Change a block's length; the free time right after it grows or shrinks so later blocks keep their times.
function setDur(di, id, dur) {
  const blocks = S.schedule.days[di].blocks;
  const i = blocks.findIndex((b) => b.id === id);
  if (i < 0) return;
  dur = clamp(Math.round(dur / 5) * 5, 5, 16 * 60);
  const diff = dur - blocks[i].dur;
  if (!diff) return;
  blocks[i].dur = dur;
  if (blocks[i].act !== 'free') {
    const next = blocks[i + 1];
    if (next && next.act === 'free') {
      const nd = next.dur - diff;
      if (nd > 0) next.dur = nd; else blocks.splice(i + 1, 1);
    } else if (diff < 0) blocks.splice(i + 1, 0, { id: uid(), act: 'free', dur: -diff });
  }
  mergeFree(di);
}
// New blocks go into the first free gap that fits, otherwise at the end of the day.
function freeSlotFor(di, dur) {
  let t = S.schedule.days[di].start;
  for (const b of S.schedule.days[di].blocks) {
    if (b.act === 'free' && b.dur >= dur) return { id: b.id, from: t };
    t += b.dur;
  }
  return { id: null, from: t };
}

// ================= Page =================
function renderSchedule() {
  const now = new Date();
  return `<header class="lt"><div><div class="eyebrow">${DOW_LONG[now.getDay()]} · ${hhmm(nowMin())}</div><h1>Schedule</h1></div>
    <div class="lt-right"><div class="seg sm" style="width:176px">${segButtons('sched-view', [['day', 'Day'], ['week', 'Week'], ['table', 'Table']], UI.sView)}</div></div></header>`
    + (UI.sView === 'week' ? weekHtml() : UI.sView === 'table' ? tableHtml() : dayHtml());
}

// ================= Table: the whole week on one screen =================
// Long single words are shortened in narrow columns ("University" → "Univ."); the full name shows
// when the column is wide enough (phone turned sideways) — see the container query in style.css.
const shortName = (name) => (/\s/.test(name.trim()) || name.length <= 7 ? name : name.slice(0, 4) + '.');
function weekStats(plans) {
  const acts = new Map();
  const days = plans.map((p, di) => {
    let free = 0, busy = 0, lessons = 0, teach = 0;
    for (const b of p) {
      const e = acts.get(b.act) || { a: b.a, min: 0, n: 0, days: new Set() };
      e.min += b.dur; e.n++; e.days.add(di);
      acts.set(b.act, e);
      if (b.a.kind === 'free') free += b.dur; else busy += b.dur;
      if (b.a.kind === 'lesson') { lessons++; teach += b.dur; }
    }
    return { free, busy, lessons, teach, empty: !p.length };
  });
  const list = [...acts.values()].sort((x, y) => y.min - x.min);
  const sum = (k) => days.reduce((a, d) => a + d[k], 0);
  return { days, list, total: list.reduce((a, e) => a + e.min, 0), free: sum('free'), busy: sum('busy'), lessons: sum('lessons'), teach: sum('teach') };
}
function tableHtml() {
  const plans = WEEK.map((_, i) => dayPlan(i));
  if (!plans.some((p) => p.length)) return scheduleEmpty();
  const st = weekStats(plans);
  const starts = plans.map((p, i) => (p.length ? S.schedule.days[i].start : Infinity));
  const ends = plans.map((p, i) => (p.length ? dayEnd(i) : -Infinity));
  const lo = Math.floor(Math.min(...starts) / 60) * 60, hi = Math.ceil(Math.max(...ends) / 60) * 60;
  // Scale so the whole week fits the screen height where possible.
  const PX = clamp(Math.max(340, window.innerHeight - 400) / (hi - lo), 0.75, 1.6);
  const H = Math.round((hi - lo) * PX);
  const today = todayIdx(), now = nowMin(), lit = UI.sHi;
  const litE = lit ? st.list.find((e) => e.a.id === lit) : null;

  const chips = `<div class="fchips tb-chips">${st.list.map((e) => `<button class="fchip ${lit === e.a.id ? 'on' : ''}" data-act="tb-hi" data-v="${e.a.id}"><i class="${e.a.kind}" style="--c:${e.a.color}"></i>${esc(e.a.name)}</button>`).join('')}</div>`;
  const note = litE
    ? `<p class="tb-note"><b>${esc(litE.a.name)}</b> · ${durText(litE.min)} a week · ${plural(litE.n, 'time')} · ${litE.days.size === 7 ? 'every day' : [...litE.days].sort().map((i) => WK[i]).join(', ')}</p>`
    : '<p class="tb-note muted">Tap a name to highlight it across the week. Tap any block to change it.</p>';
  let labels = '';
  for (let m = lo; m <= hi; m += 60) labels += `<span style="top:${((m - lo) * PX).toFixed(1)}px">${hhmm(m)}</span>`;
  const heads = WK.map((n, i) => `<button class="tb-head ${i === today ? 'today' : ''}" style="--dc:${DAY_COLORS[i]}" data-act="sched-open-day" data-v="${i}">${n}</button>`).join('');
  const cols = plans.map((p, i) => `<div class="tb-col ${i === today ? 'today' : ''}" style="--dc:${DAY_COLORS[i]};height:${H}px">${p.map((b) => {
    const h = b.dur * PX;
    const state = lit ? (b.act === lit ? ' lit' : ' dim') : '';
    return `<button class="tb-b ${b.a.kind}${state}" style="--c:${b.a.color};top:${((b.from - lo) * PX + 1).toFixed(1)}px;height:${(h - 2).toFixed(1)}px" data-act="sched-block" data-id="${b.id}" data-day="${i}"><b><span class="s">${esc(shortName(b.a.name))}</span><span class="f">${esc(b.a.name)}</span></b>${h >= 30 ? `<i>${durText(b.dur)}</i>` : ''}${h >= 48 ? `<em class="num">${hhmm(b.from)}–${hhmm(b.to)}</em>` : ''}</button>`;
  }).join('')}${i === today && now >= lo && now <= hi ? `<div class="tb-now" style="top:${((now - lo) * PX).toFixed(1)}px"></div>` : ''}</div>`).join('');
  const freeRow = st.days.map((d) => `<div class="tb-f fr">${d.free ? durText(d.free) : '—'}</div>`).join('');
  const lesRow = st.days.map((d) => `<div class="tb-f">${d.lessons ? `${d.lessons}<small>${durText(d.teach)}</small>` : '—'}</div>`).join('');
  return `${chips}${note}
    <div class="tb-wrap"><div class="tb" style="--px:${PX.toFixed(3)}">
      <div class="tb-corner"></div>${heads}
      <div class="tb-times" style="height:${H}px">${labels}</div>${cols}
      <div class="tb-fl free">Free</div>${freeRow}
      <div class="tb-fl">Les&shy;sons</div>${lesRow}
    </div></div>
    ${weekSummary(st, plans)}`;
}
function weekSummary(st, plans) {
  const pickDay = (key, better) => st.days.reduce((b, d, i) => (!d.empty && (b < 0 || better(d[key], st.days[b][key])) ? i : b), -1);
  const busiest = pickDay('busy', (x, y) => x > y), freest = pickDay('free', (x, y) => x > y);
  const tile = (label, big, small) => `<div class="card tb-stat"><span>${label}</span><b class="num">${big}</b><small>${small}</small></div>`;
  const bar = st.list.map((e) => `<i class="${e.a.kind}" style="--c:${e.a.color};width:${Math.max(1.2, (e.min / st.total) * 100).toFixed(2)}%"></i>`).join('');
  const rows = st.list.map((e) => `<button class="lg-row ${UI.sHi === e.a.id ? 'on' : ''}" data-act="tb-hi" data-v="${e.a.id}"><i class="${e.a.kind}" style="--c:${e.a.color}"></i><span class="n">${esc(e.a.name)}</span><span class="h num">${durText(e.min)}</span><span class="p num">${Math.round((e.min / st.total) * 100)}%</span></button>`).join('');
  // Free gaps of an hour or more — handy for fitting in a new group.
  const gaps = [];
  plans.forEach((p, di) => p.forEach((b) => { if (b.a.kind === 'free' && b.dur >= 60) gaps.push({ di, b }); }));
  return `<div class="tb-stats">
      ${tile('Free time', durText(st.free), 'in the week')}
      ${tile('Teaching', durText(st.teach), plural(st.lessons, 'lesson'))}
      ${tile('Busiest day', busiest >= 0 ? WEEK[busiest] : '—', busiest >= 0 ? `${durText(st.days[busiest].busy)} busy` : '')}
      ${tile('Most free', freest >= 0 && st.days[freest].free ? WEEK[freest] : '—', freest >= 0 && st.days[freest].free ? `${durText(st.days[freest].free)} free` : 'no free time')}
    </div>
    <section class="card" style="margin-top:12px">
      <div class="card-title">Where your week goes</div>
      <div class="card-sub">${durText(st.total)} planned · tap a line to highlight it</div>
      <div class="wk-bar">${bar}</div>
      <div class="lg-list">${rows}</div>
    </section>
    <section class="card" style="margin-top:12px">
      <div class="card-title">Free windows</div>
      <div class="card-sub">An hour or more — tap one to fill it</div>
      ${gaps.length ? `<div class="gap-list">${gaps.map(({ di, b }) => `<button class="gap" style="--dc:${DAY_COLORS[di]}" data-act="sched-block" data-id="${b.id}" data-day="${di}"><b>${WK[di]}</b><span class="num">${hhmm(b.from)}–${hhmm(b.to)}</span><i class="num">${durText(b.dur)}</i></button>`).join('')}</div>` : '<p class="card-sub" style="margin-top:8px">No free hour anywhere this week.</p>'}
    </section>`;
}
function scheduleEmpty() {
  return `<section class="card empty">
    <div class="big">${ic('calendar', '#007AFF', 'xl')}</div>
    <h3>Plan your week</h3>
    <p>Add lessons, travel, university and free time — each with its own colour. If Claude sent you a schedule link, open it once on this phone and it fills in by itself.</p>
    <button class="btn" data-act="sched-add">Add the first block</button>
  </section>`;
}
function dayHtml() {
  const di = UI.sDay, today = todayIdx(), plan = dayPlan(di), d = S.schedule.days[di];
  const pills = WK.map((n, i) => `<button class="day-pill ${i === di ? 'on' : ''} ${i === today ? 'today' : ''}" style="--dc:${DAY_COLORS[i]}" data-act="sched-day" data-v="${i}"><span>${n}</span><i></i></button>`).join('');
  const lessons = plan.filter((b) => b.a.kind === 'lesson');
  const teach = lessons.reduce((a, b) => a + b.dur, 0);
  const free = plan.filter((b) => b.a.kind === 'free').reduce((a, b) => a + b.dur, 0);
  const facts = [plan.length ? `${hhmm(d.start)} – ${hhmm(dayEnd(di))}` : 'Nothing planned', lessons.length ? `${plural(lessons.length, 'lesson')} · ${durText(teach)}` : '', free ? `${durText(free)} free` : ''].filter(Boolean).join(' · ');
  let h = `<div class="day-pills">${pills}</div>`;
  if (!hasSchedule() && !UI.sEdit) return h + scheduleEmpty();
  h += `<div class="day-bar">
      <div class="row-main"><div class="db-title">${WEEK[di]}${di === today ? ' <span class="chip info">Today</span>' : ''}</div><div class="db-sub">${facts}</div></div>
      <button class="pill-btn ${UI.sEdit ? 'on' : ''}" data-act="sched-edit">${UI.sEdit ? glyph('check') + 'Done' : glyph('pencil') + 'Edit'}</button>
    </div>`;
  return h + (UI.sEdit ? editDay(di, plan) : timeline(di, plan));
}
function timeline(di, plan) {
  if (!plan.length) return `<section class="card empty"><div class="big">${ic('sun', DAY_COLORS[di], 'xl')}</div><h3>Nothing planned</h3><p>A free day — or add what you do.</p><button class="btn" data-act="sched-add">Add a block</button></section>`;
  const isToday = di === todayIdx(), now = nowMin();
  const next = isToday ? plan.find((b) => b.from > now && b.a.kind !== 'free') : null;
  let y = 0, nowTop = null;
  const rows = plan.map((b, i) => {
    const hgt = Math.max(b.a.kind === 'free' ? 46 : 62, Math.round(b.dur * SCHED_PX));
    const cur = isToday && now >= b.from && now < b.to;
    if (cur) nowTop = y + ((now - b.from) / b.dur) * hgt;
    y += hgt + 8;
    const badge = cur ? '<span class="tl-badge">Now</span>' : next && next.id === b.id ? '<span class="tl-badge next">Next</span>' : '';
    const sub = [durText(b.dur)];
    if (b.a.group) { const m = groupMonth(b.a.group, ymNow()); if (m.n) sub.push(`${m.paidCount}/${m.n} paid`); }
    return `<button class="tl-row ${b.a.kind} ${cur ? 'now' : ''}" style="--c:${b.a.color};--h:${hgt}px;--i:${Math.min(i, 9)}" data-act="sched-block" data-id="${b.id}">
      <div class="tl-time num"><b>${hhmm(b.from)}</b>${b.a.kind === 'free' ? '' : `<span>${hhmm(b.to)}</span>`}</div>
      <div class="tl-card"><div class="tl-title">${esc(b.a.name)}${badge}</div><div class="tl-sub">${sub.join(' · ')}</div></div>
    </button>`;
  }).join('');
  const dir = UI.sDir ? (UI.sDir > 0 ? ' from-r' : ' from-l') : '';
  return `<div class="tl${dir}" id="tl">${rows}<div class="tl-end num"><b>${hhmm(plan[plan.length - 1].to)}</b><span>End of the day</span></div>${nowTop !== null ? `<div class="now-line" style="top:${nowTop.toFixed(1)}px"><span class="num">${hhmm(now)}</span><i></i></div>` : ''}</div>`;
}
function editDay(di, plan) {
  const d = S.schedule.days[di];
  return `<div class="group plain"><div class="row field"><span style="flex:1">Day starts at</span><div class="stepper"><button data-act="sched-start" data-v="-30" aria-label="Earlier">${glyph('minus')}</button><b class="num">${hhmm(d.start)}</b><button data-act="sched-start" data-v="30" aria-label="Later">${glyph('plus')}</button></div></div></div>
  <div class="ed-list" id="ed-list">${plan.map((b) => `<div class="ed-row ${b.a.kind}" data-sort data-id="${b.id}" style="--c:${b.a.color}">
      <span class="drag" aria-label="Drag to move">${glyph('grip')}</span>
      <button class="ed-main" data-act="sched-block" data-id="${b.id}"><b>${esc(b.a.name)}</b><small class="num">${hhmm(b.from)} – ${hhmm(b.to)}</small></button>
      <div class="stepper sm"><button data-act="sched-dur" data-id="${b.id}" data-v="-15" aria-label="Shorter">${glyph('minus')}</button><b class="num">${durText(b.dur)}</b><button data-act="sched-dur" data-id="${b.id}" data-v="15" aria-label="Longer">${glyph('plus')}</button></div>
      <button class="ed-del" data-act="sched-del" data-id="${b.id}" aria-label="Remove">${glyph('minus')}</button>
    </div>`).join('')}</div>
  <p class="hint">Drag ⠿ to move a block. Make a block shorter or longer and the free time after it adjusts, so the rest of the day stays in place.</p>
  <div class="actions"><button class="btn soft" data-act="sched-add">＋ Add a block</button><button class="btn grey" data-act="sched-copy">${glyph('copy')} Copy ${WEEK[di]} to other days</button></div>`;
}
function weekHtml() {
  const plans = WEEK.map((_, i) => dayPlan(i));
  if (!plans.some((p) => p.length)) return scheduleEmpty();
  const starts = plans.map((p, i) => (p.length ? S.schedule.days[i].start : Infinity));
  const ends = plans.map((p, i) => (p.length ? dayEnd(i) : -Infinity));
  const lo = Math.floor(Math.min(...starts) / 60) * 60, hi = Math.ceil(Math.max(...ends) / 60) * 60;
  const H = (hi - lo) * WEEK_PX;
  const today = todayIdx(), now = nowMin();
  let labels = '';
  for (let m = lo; m <= hi; m += 60) labels += `<span style="top:${((m - lo) * WEEK_PX).toFixed(1)}px">${hhmm(m)}</span>`;
  const cols = plans.map((p, i) => `<div class="wk-col ${i === today ? 'today' : ''}" style="--dc:${DAY_COLORS[i]}">
      <button class="wk-head" data-act="sched-open-day" data-v="${i}">${WK[i]}</button>
      <div class="wk-body" style="height:${H}px">${p.map((b) => `<button class="wk-b ${b.a.kind}" style="--c:${b.a.color};top:${((b.from - lo) * WEEK_PX + 1).toFixed(1)}px;height:${(b.dur * WEEK_PX - 3).toFixed(1)}px" data-act="sched-block" data-id="${b.id}" data-day="${i}"><b>${esc(b.a.name)}</b>${b.dur >= 45 ? `<span class="num">${hhmm(b.from)}–${hhmm(b.to)}</span>` : ''}${b.dur >= 80 ? `<span>${durText(b.dur)}</span>` : ''}</button>`).join('')}${i === today && now >= lo && now <= hi ? `<div class="wk-now" style="top:${((now - lo) * WEEK_PX).toFixed(1)}px"></div>` : ''}</div>
    </div>`).join('');
  return `<div class="wk-scroll" id="wk"><div class="wk"><div class="wk-times"><div class="wk-head sp"></div><div class="wk-body" style="height:${H}px">${labels}</div></div>${cols}</div></div>
    <p class="hint">Tap a day's name to open it, or any block to change it. Swipe sideways to see the whole week.</p>`;
}
function afterSchedule() {
  if (UI.sView === 'week') {
    const wk = $('#wk');
    if (wk) {
      const col = $('.wk-col', wk);
      if (col) wk.scrollLeft = Math.max(0, todayIdx() * (col.offsetWidth + 6) - 40);
    }
  } else if (UI.sEdit) {
    makeSortable($('#ed-list'), (from, to) => {
      const blocks = S.schedule.days[UI.sDay].blocks;
      const [b] = blocks.splice(from, 1);
      blocks.splice(to, 0, b);
      mergeFree(UI.sDay);
      save(); render();
    });
  } else bindDaySwipe($('#tl'));
  UI.sDir = 0;
}
function bindDaySwipe(el) {
  if (!el) return;
  let x0 = null, y0 = 0, t0 = 0;
  el.addEventListener('touchstart', (e) => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - t0 < 700) showDay((UI.sDay + (dx < 0 ? 1 : 6)) % 7, dx < 0 ? 1 : -1);
  }, { passive: true });
}
function showDay(i, dir) {
  if (i === UI.sDay) return;
  UI.sDir = dir || (i > UI.sDay ? 1 : -1);
  UI.sDay = i;
  buzz();
  render();
}
PAGES.schedule = { title: 'Schedule', render: renderSchedule, after: afterSchedule, resize: () => { if (UI.sView === 'table') render(); } };

// ================= Block sheet =================
// A block can be given an exact day, start and end. It is "painted" onto the day: free time it
// covers is used up, and anything else it overlaps is shortened or replaced (the sheet says which
// before saving). Days grow earlier or later automatically if the block sits outside them.
let bdraft = null;
function openBlock(di, id) {
  const p = id ? dayPlan(di).find((x) => x.id === id) : null;
  if (p) bdraft = { id: p.id, day: di, origDay: di, act: p.act, from: p.from, to: p.to, wasFree: p.act === 'free' };
  else {
    const first = S.schedule.acts.find((a) => a.kind === 'lesson') || S.schedule.acts.find((a) => a.id !== 'free') || S.schedule.acts[0];
    const slot = freeSlotFor(di, 60);
    bdraft = { id: null, day: di, origDay: di, act: first.id, from: slot.from, to: Math.min(slot.from + 60, 1440) };
  }
  openSheet(blockHtml(), mountBlock);
}
function blockConflicts(d) {
  return dayPlan(d.day).filter((b) => b.id !== d.id && b.a.kind !== 'free' && b.from < d.to && b.to > d.from)
    .map((b) => ({ b, whole: b.from >= d.from && b.to <= d.to }));
}
function blockPreview() {
  const d = bdraft, a = actView(d.act), dur = d.to - d.from;
  return `<div class="bp-time num">${hhmm(d.from)} – ${hhmm(d.to)}</div><div class="bp-title">${esc(a.name)}</div><div class="bp-sub">${WEEK[d.day]} · ${dur > 0 ? durText(dur) : 'check the times'}</div>`;
}
function blockHtml() {
  const d = bdraft, a = actView(d.act), editing = !!d.id, dur = d.to - d.from;
  const g = a.group;
  let gq = '';
  if (g) {
    const m = groupMonth(g, ymNow());
    gq = `<div class="card gq">${grpBadge(g, 'sm')}<div class="row-main"><b>${esc(g.name)}</b><span>${m.n ? `${m.paidCount} of ${m.n} paid for ${MONTHS[new Date().getMonth()]}` : 'No students yet'}</span></div><button class="pill-btn" data-act="group" data-id="${g.id}">Open</button></div>`;
  }
  const hint = !editing
    ? 'Pick the day and the exact time. If it overlaps something, you will see what changes before saving.'
    : d.wasFree
      ? 'Choose what goes into this free time — a new group, for example. Make it shorter and the rest stays free.'
      : 'Change the day or the times to move it. Anything it would overlap is shown above.';
  return sheetHead(editing ? 'Edit block' : 'New block', '<button data-act="close-sheet">Cancel</button>', `<button data-act="blk-save" ${dur >= 5 ? '' : 'disabled'}>${editing ? 'Save' : 'Add'}</button>`) + `
  <div class="sheet-body">
    <div class="blk-preview ${a.kind}" id="blk-preview" style="--c:${a.color}">${blockPreview()}</div>
    ${gq}
    <div class="form-label">What</div>
    <div class="act-pick">${S.schedule.acts.map((x) => { const v = actView(x.id); return `<button class="${d.act === x.id ? 'on' : ''} ${v.kind}" style="--c:${v.color}" data-act="blk-act" data-v="${x.id}"><i></i>${esc(v.name)}</button>`; }).join('')}<button class="add" data-act="act-new">${glyph('plus')}New</button></div>
    <div class="form-label">When</div>
    <div class="blk-days">${WK.map((n, i) => `<button class="${d.day === i ? 'on' : ''}" style="--dc:${DAY_COLORS[i]}" data-act="blk-day" data-v="${i}">${n}</button>`).join('')}</div>
    <div class="group plain" style="margin-top:10px">
      <label class="row field"><span>Starts</span><input type="time" id="blk-from" step="300" value="${hhmm(d.from)}"></label>
      <label class="row field"><span>Ends</span><input type="time" id="blk-to" step="300" value="${hhmm(d.to)}"></label>
    </div>
    <div class="dur-pick" id="blk-durs" style="margin-top:10px">${[30, 45, 60, 90, 120, 180, 240].map((m) => `<button class="${dur === m ? 'on' : ''}" data-act="blk-dur" data-v="${m}">${durText(m)}</button>`).join('')}</div>
    <div id="blk-conflict"></div>
    <p class="hint">${hint}</p>
    <div class="actions">
      <button class="btn" data-act="blk-save" ${dur >= 5 ? '' : 'disabled'}>${editing ? 'Save' : 'Add block'}</button>
      ${a.id !== 'free' ? `<button class="btn grey" data-act="act-edit" data-id="${a.id}">${glyph('pencil')} Change “${esc(a.name)}” — name, colour</button>` : ''}
      ${editing ? `<button class="btn danger" data-act="blk-del">${d.wasFree ? 'Remove this free time' : `Remove from ${WEEK[d.origDay]}`}</button>` : ''}
    </div>
  </div>`;
}
const parseTime = (v) => { const [h, m] = String(v).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
function mountBlock(sh) {
  const f = $('#blk-from', sh), t = $('#blk-to', sh);
  const onFrom = () => {
    if (!f.value) return;
    const len = Math.max(15, bdraft.to - bdraft.from);
    bdraft.from = parseTime(f.value);
    bdraft.to = Math.min(bdraft.from + len, 1440); // moving the start keeps the length
    t.value = hhmm(bdraft.to);
    syncBlock(sh);
  };
  const onTo = () => { if (!t.value) return; bdraft.to = parseTime(t.value) || 1440; syncBlock(sh); };
  f.addEventListener('change', onFrom);
  f.addEventListener('input', onFrom);
  t.addEventListener('change', onTo);
  t.addEventListener('input', onTo);
  syncBlock(sh);
}
function syncBlock(sh) {
  const d = bdraft, dur = d.to - d.from;
  $('#blk-preview', sh).innerHTML = blockPreview();
  sh.querySelectorAll('#blk-durs button').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === dur));
  const box = $('#blk-conflict', sh);
  if (dur < 5) {
    box.innerHTML = `<div class="blk-warn bad">${glyph('clock')}<div><b>The end is before the start</b><span>Pick an end time after ${hhmm(d.from)}.</span></div></div>`;
  } else {
    const c = blockConflicts(d);
    box.innerHTML = c.length
      ? `<div class="blk-warn">${glyph('clock')}<div><b>Overlaps ${c.map((x) => esc(x.b.a.name)).join(' and ')}</b><span>${c.map((x) => `${esc(x.b.a.name)} ${hhmm(x.b.from)}–${hhmm(x.b.to)} will be ${x.whole ? 'replaced' : 'shortened'}`).join(' · ')}</span></div></div>`
      : '';
  }
  sh.querySelectorAll('[data-act="blk-save"]').forEach((b) => { b.disabled = dur < 5; });
}
// Puts [from, to) on day di for activity act, rebuilding the day around it.
function paintBlock(di, from, to, act, keepId) {
  const d = S.schedule.days[di];
  const segs = [];
  for (const b of dayPlan(di)) {
    if (b.id === keepId || b.act === 'free') continue; // free time is rebuilt from the gaps
    if (b.to <= from || b.from >= to) { segs.push({ id: b.id, act: b.act, from: b.from, to: b.to }); continue; }
    if (b.from < from) segs.push({ id: b.id, act: b.act, from: b.from, to: from });
    if (b.to > to) segs.push({ id: b.from < from ? uid() : b.id, act: b.act, from: to, to: b.to });
  }
  segs.push({ id: keepId || uid(), act, from, to });
  segs.sort((x, y) => x.from - y.from);
  const start = d.blocks.length ? Math.min(d.start, from) : from;
  const end = Math.max(d.blocks.length ? dayEnd(di) : to, to);
  const blocks = [];
  let t = start;
  for (const sg of segs) {
    if (sg.from > t) blocks.push({ id: uid(), act: 'free', dur: sg.from - t });
    blocks.push({ id: sg.id, act: sg.act, dur: sg.to - sg.from });
    t = sg.to;
  }
  if (end > t) blocks.push({ id: uid(), act: 'free', dur: end - t });
  d.start = start;
  d.blocks = blocks;
  mergeFree(di);
}
function saveBlock() {
  const d = bdraft;
  if (d.to - d.from < 5) return;
  const snapshot = JSON.parse(JSON.stringify(S.schedule.days));
  if (d.id && d.origDay !== d.day) {
    // Moving to another day: its old place becomes free time.
    const old = S.schedule.days[d.origDay].blocks;
    const i = old.findIndex((x) => x.id === d.id);
    if (i >= 0) { old[i] = { id: uid(), act: 'free', dur: old[i].dur }; mergeFree(d.origDay); }
    paintBlock(d.day, d.from, d.to, d.act, null);
  } else paintBlock(d.day, d.from, d.to, d.act, d.id);
  UI.sDay = d.day;
  save(); buzz(); closeSheet(); render();
  undoToast(`${actView(d.act).name} · ${WK[d.day]} ${hhmm(d.from)}–${hhmm(d.to)}`, () => { S.schedule.days = snapshot; });
}
function removeBlock(di, id) {
  const blocks = S.schedule.days[di].blocks;
  const i = blocks.findIndex((b) => b.id === id);
  if (i < 0) return;
  const snapshot = JSON.parse(JSON.stringify(blocks));
  const b = blocks[i];
  if (b.act === 'free') blocks.splice(i, 1);
  else blocks[i] = { id: uid(), act: 'free', dur: b.dur };
  mergeFree(di);
  save(); render();
  undoToast(b.act === 'free' ? 'Free time removed' : `${actView(b.act).name} removed — that time is free now`, () => { S.schedule.days[di].blocks = snapshot; });
}

// ================= Activities (things that fill a block) =================
let actDraft = null;
function openActForm(id, back) {
  const a = id ? S.schedule.acts.find((x) => x.id === id) : null;
  if (a) { const v = actView(a.id); actDraft = { id: a.id, name: v.name, color: v.color, kind: a.kind, groupId: a.groupId, back }; }
  else actDraft = { id: null, name: '', color: PALETTE[3], kind: 'lesson', groupId: null, back };
  openSheet(actFormHtml(), mountActForm);
}
function actFormHtml() {
  const d = actDraft, editing = !!d.id;
  const uses = editing ? S.schedule.days.reduce((n, day) => n + day.blocks.filter((b) => b.act === d.id).length, 0) : 0;
  return sheetHead(editing ? `Edit “${esc(d.name)}”` : 'New activity', '<button data-act="act-cancel">Cancel</button>', '<button data-act="act-save">Save</button>') + `
  <div class="sheet-body">
    <div class="blk-preview ${d.kind}" id="act-preview" style="--c:${d.color}"><div class="bp-title">${esc(d.name || 'Name')}</div><div class="bp-sub">${d.kind === 'lesson' ? 'Lesson' : 'Other activity'}</div></div>
    <div class="form-label">Name</div>
    <div class="group"><label class="field"><input id="act-name" style="text-align:left" placeholder="e.g. 5B, IELTS, Gym, University" value="${esc(d.name)}" autocomplete="off" enterkeyhint="done" maxlength="30"></label></div>
    <div class="form-label">Colour</div>
    ${swatches('act-color', d.color)}
    <div class="form-label">Kind</div>
    <div class="seg full">${segButtons('act-kind', [['lesson', 'Lesson'], ['other', 'Something else']], d.kind)}</div>
    ${d.kind === 'lesson' ? (S.groups.length
      ? `<div class="form-label">Group for payments</div><div class="grp-pick"><button class="${!d.groupId ? 'on' : ''}" data-act="act-group" data-v="">None</button>${S.groups.map((g) => `<button class="${d.groupId === g.id ? 'on' : ''}" data-act="act-group" data-v="${g.id}" style="--c:${g.color}"><i></i>${esc(g.name)}</button>`).join('')}</div><p class="hint">Linked lessons show who paid, and the group's name and colour stay in sync.</p>`
      : '<p class="hint">Tip: make a group for this class in History → Groups to see payments right here.</p>') : ''}
    <div class="actions">
      <button class="btn" data-act="act-save">${editing ? 'Save changes' : 'Create'}</button>
      ${editing ? `<button class="btn danger" data-act="act-del">Delete “${esc(d.name)}”${uses ? ` · ${plural(uses, 'block')} become free` : ''}</button>` : ''}
    </div>
  </div>`;
}
function mountActForm(sh) {
  const name = $('#act-name', sh);
  const sync = () => {
    sh.querySelectorAll('[data-act="act-save"]').forEach((b) => { b.disabled = !actDraft.name.trim(); });
    $('.bp-title', $('#act-preview', sh)).textContent = actDraft.name.trim() || 'Name';
  };
  name.addEventListener('input', () => { actDraft.name = name.value; sync(); });
  blurOnEnter(sh);
  sync();
  if (!actDraft.id) setTimeout(() => name.focus({ preventScroll: true }), 420);
}
function saveAct() {
  const d = actDraft;
  if (!d.name.trim()) return;
  let a = d.id ? S.schedule.acts.find((x) => x.id === d.id) : null;
  const groupId = d.kind === 'lesson' && grp(d.groupId) ? d.groupId : null;
  if (a) Object.assign(a, { name: d.name.trim(), color: d.color, kind: d.kind, groupId });
  else { a = { id: 'a' + uid(), name: d.name.trim(), color: d.color, kind: d.kind, groupId }; S.schedule.acts.push(a); }
  const g = grp(groupId);
  if (g) { g.name = a.name; g.color = a.color; }
  save(); buzz(); render();
  if (d.back) d.back(a.id); else closeSheet();
  toast(d.id ? 'Updated everywhere in your week' : `${a.name} created`);
}
async function deleteAct() {
  const d = actDraft;
  const ok = await ask({ title: `Delete “${d.name}”?`, msg: 'Its blocks become free time. Your groups and payments are not touched.', ok: 'Delete', destructive: true });
  if (!ok) return;
  S.schedule.days.forEach((day, i) => { day.blocks.forEach((b) => { if (b.act === d.id) b.act = 'free'; }); mergeFree(i); });
  S.schedule.acts = S.schedule.acts.filter((x) => x.id !== d.id);
  save(); closeSheet(); render();
  toast('Deleted');
}
const backToBlock = () => { const keep = { ...bdraft }; return (newAct) => { bdraft = keep; if (newAct) bdraft.act = newAct; openSheet(blockHtml(), mountBlock); }; };

// ================= Copy a day =================
let copyTargets = new Set();
function copyHtml() {
  const di = UI.sDay;
  return sheetHead(`Copy ${WEEK[di]}`, '<button data-act="close-sheet">Cancel</button>', `<button data-act="copy-do" ${copyTargets.size ? '' : 'disabled'}>Copy</button>`) + `
  <div class="sheet-body">
    <p class="hint" style="margin:4px 4px 14px">${WEEK[di]}'s plan replaces the plan of the days you tick.</p>
    <div class="group plain">${WEEK.map((n, i) => (i === di ? '' : `<button class="row field" data-act="copy-day" data-v="${i}"><span class="day-dot" style="--dc:${DAY_COLORS[i]}"></span><span style="flex:1">${n}</span><span class="tick ${copyTargets.has(i) ? 'on' : ''}">${glyph('check')}</span></button>`)).join('')}</div>
    <div class="actions"><button class="btn" data-act="copy-do" ${copyTargets.size ? '' : 'disabled'}>${copyTargets.size ? `Copy to ${plural(copyTargets.size, 'day')}` : 'Tick the days'}</button></div>
  </div>`;
}

// ================= Schedule links =================
// A schedule can arrive as a link: …/#schedule=<code>. The code is compact base64 JSON:
// { a: [[id, name, colour, kind], …], d: [[startMinute, [[activityId, minutes], …]] × 7] }
function scheduleFromCode(code) {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))));
  if (!json || !Array.isArray(json.a) || !Array.isArray(json.d) || json.d.length !== 7) throw new Error('bad schedule');
  return normSchedule({
    acts: json.a.map(([id, name, color, kind]) => ({ id, name, color, kind })),
    days: json.d.map(([start, blocks]) => ({ start, blocks: (blocks || []).map(([act, dur]) => ({ id: uid(), act, dur })) })),
  });
}
async function importScheduleCode(code) {
  let sch;
  try { sch = scheduleFromCode(code); } catch (e) { toast('That schedule link is damaged'); return; }
  if (hasSchedule() && !(await ask({ title: 'Replace your schedule?', msg: 'This link has a full week. Your current schedule will be replaced.', ok: 'Replace' }))) return;
  // Keep links to groups that already exist with the same lesson names.
  sch.acts.forEach((a) => { const g = S.groups.find((x) => x.name.toLowerCase() === a.name.toLowerCase()); if (g && a.kind === 'lesson') a.groupId = g.id; });
  S.schedule = sch;
  save();
  UI.sDay = todayIdx(); UI.sEdit = false;
  if (sheet) closeSheet();
  if (UI.tab === 'schedule') render(true); else goTab('schedule');
  toast('Your schedule is in ✓');
}

// ================= Actions =================
Object.assign(ACTIONS, {
  'sched-view': (a, v) => { UI.sView = v; UI.sEdit = false; S.settings.schedView = v; save(); render(true); },
  'tb-hi': (a, v) => { UI.sHi = UI.sHi === v ? null : v; buzz(); render(); },
  'sched-day': (a, v) => showDay(Number(v)),
  'sched-open-day': (a, v) => { UI.sView = 'day'; UI.sDay = Number(v); UI.sEdit = false; render(true); },
  'sched-edit': () => { UI.sEdit = !UI.sEdit; buzz(); render(); },
  'sched-add': () => openBlock(UI.sDay, null),
  'sched-block': (a, v, id) => openBlock(a.dataset.day != null ? Number(a.dataset.day) : UI.sDay, id),
  'sched-start': (a, v) => { const d = S.schedule.days[UI.sDay]; d.start = clamp(d.start + Number(v), 0, 23 * 60); save(); render(); },
  'sched-dur': (a, v, id) => { const b = S.schedule.days[UI.sDay].blocks.find((x) => x.id === id); if (!b) return; setDur(UI.sDay, id, b.dur + Number(v)); save(); render(); },
  'sched-del': (a, v, id) => removeBlock(UI.sDay, id),
  'sched-copy': () => { copyTargets = new Set(); openSheet(copyHtml(), null); },
  'copy-day': (a, v) => { const i = Number(v); if (copyTargets.has(i)) copyTargets.delete(i); else copyTargets.add(i); refreshSheet(copyHtml(), null); },
  'copy-do': () => {
    if (!copyTargets.size) return;
    const src = S.schedule.days[UI.sDay];
    const snapshot = JSON.parse(JSON.stringify(S.schedule.days));
    copyTargets.forEach((i) => { S.schedule.days[i] = { start: src.start, blocks: src.blocks.map((b) => ({ ...b, id: uid() })) }; });
    const n = copyTargets.size;
    save(); closeSheet(); render();
    undoToast(`Copied to ${plural(n, 'day')}`, () => { S.schedule.days = snapshot; });
  },
  'blk-act': (a, v) => { bdraft.act = v; refreshSheet(blockHtml(), mountBlock); },
  'blk-dur': (a, v) => { bdraft.to = Math.min(bdraft.from + Number(v), 1440); refreshSheet(blockHtml(), mountBlock); },
  'blk-day': (a, v) => { bdraft.day = Number(v); refreshSheet(blockHtml(), mountBlock); },
  'blk-save': () => saveBlock(),
  'blk-del': () => { const d = bdraft; closeSheet(); removeBlock(d.origDay, d.id); },
  'act-new': () => openActForm(null, backToBlock()),
  'act-edit': (a, v, id) => openActForm(id, backToBlock()),
  'act-cancel': () => { if (actDraft.back) actDraft.back(); else closeSheet(); },
  'act-color': (a, v) => { actDraft.color = v; refreshSheet(actFormHtml(), mountActForm); },
  'act-kind': (a, v) => { actDraft.kind = v; refreshSheet(actFormHtml(), mountActForm); },
  'act-group': (a, v) => {
    actDraft.groupId = v || null;
    const g = grp(v);
    if (g) { actDraft.name = g.name; actDraft.color = g.color; }
    refreshSheet(actFormHtml(), mountActForm);
  },
  'act-save': () => saveAct(),
  'act-del': () => deleteAct(),
});
