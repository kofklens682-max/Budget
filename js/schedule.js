'use strict';
/* Weekly schedule. Each day is an ordered list of blocks (an activity + a length) from the day's
   start time; "Free" is a block like any other. Two views: Day — one day as a list, with what's on
   now — and Week — every day as a short list, with the free time between sessions. One sheet adds
   or changes a block: what, which days, when it starts and how long it takes, for one day or
   several at once. */

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
// New blocks go into the first free gap that fits, otherwise at the end of the day.
function freeSlotFor(di, dur) {
  let t = S.schedule.days[di].start;
  for (const b of S.schedule.days[di].blocks) {
    if (b.act === 'free' && b.dur >= dur) return { id: b.id, from: t };
    t += b.dur;
  }
  return { id: null, from: t };
}
const clock = (min) => `${Math.floor(min / 60) % 24}:${pad2(min % 60)}`; // 9:00 rather than 09:00
const weekDate = (i) => addDays(new Date(), i - todayIdx()); // this week's date of weekday i (0 = Monday)
const lessonsIn = (plan) => plan.filter((b) => b.a.kind === 'lesson');
const minutesIn = (list) => list.reduce((a, b) => a + b.dur, 0);
const freeIn = (plan) => minutesIn(plan.filter((b) => b.a.kind === 'free'));
function blockSub(b) {
  const m = b.a.group ? groupMonth(b.a.group, ymNow()) : null;
  return m && m.n ? `${m.paidCount} of ${m.n} paid` : b.a.kind === 'lesson' ? 'Lesson' : '';
}

// ================= Page =================
function renderSchedule() {
  const now = new Date();
  return `<header class="lt"><div><div class="eyebrow">${DOW_LONG[now.getDay()]} · ${hhmm(nowMin())}</div><h1>Schedule</h1></div>
    <div class="lt-right"><div class="seg sm sched-seg">${segButtons('sched-view', [['day', 'Day'], ['week', 'Week']], UI.sView)}</div></div></header>`
    + (!hasSchedule() ? scheduleEmpty() : UI.sView === 'week' ? weekHtml() : dayHtml());
}
function scheduleEmpty() {
  return `<section class="card empty">
    <div class="big">${ic('calendar', '#007AFF', 'xl')}</div>
    <h3>Plan your week</h3>
    <p>Add lessons, travel, university and free time — each with its own colour. If Claude sent you a schedule link, open it once on this phone and it fills in by itself.</p>
    <button class="btn" data-act="sched-add">Add the first block</button>
  </section>`;
}

// ================= Day: one day as a list =================
// This week's dates in one slim row; the dots are that day's lessons. The blue circle is a piece of
// its own (.ws-ind), so it can glide from day to day, follow a finger sliding along the row, and
// move along with a swipe of the day below.
let wsLast = null, wsFrom = null; // the day it showed last time; where the next glide starts (may be between two days)
function weekStrip(di) {
  const today = todayIdx();
  const from = wsFrom != null ? wsFrom : wsLast != null ? wsLast : di;
  wsFrom = null;
  wsLast = di;
  return `<div class="wstrip${from !== di ? ' glide' : ''}" id="wstrip"><i class="ws-ind" style="--i:${di};--from:${from}"></i>${WK.map((n, i) => `<button class="${i === di ? 'sel' : ''} ${i === today ? 'today' : ''}" data-act="sched-day" data-v="${i}" aria-label="${WEEK[i]}"><small>${n}</small><b class="num">${weekDate(i).getDate()}</b><span class="wdots">${lessonsIn(dayPlan(i)).slice(0, 4).map((b) => `<i style="--c:${b.a.color}"></i>`).join('')}</span></button>`).join('')}</div>`;
}
// Puts the circle at `pos` — a day, or somewhere between two while it moves. The number it covers
// turns white; `lift` makes it look picked up (under the finger).
function wsPaint(strip, pos, lift) {
  const ind = $('.ws-ind', strip);
  if (!ind) return;
  ind.style.animation = 'none';
  ind.style.transform = `translateX(${(pos * ind.offsetWidth).toFixed(1)}px)${lift ? ' scale(1.12)' : ''}`;
  const n = Math.round(pos), lit = Math.abs(pos - n) < 0.3 ? n : -1;
  strip.classList.add('moving');
  $$(':scope > button', strip).forEach((b, i) => b.classList.toggle('lit', i === lit));
}
// Back to the chosen day (it glides there).
function wsRest(strip) {
  const ind = $('.ws-ind', strip);
  if (ind) { ind.style.transform = ''; ind.style.transition = ''; }
  strip.classList.remove('moving');
  $$(':scope > button', strip).forEach((b) => b.classList.remove('lit'));
}
// Today only: what's on now (or free time), how long is left, and what's next.
function nowCard(plan) {
  const now = nowMin();
  const cur = plan.find((b) => now >= b.from && now < b.to);
  const next = plan.find((b) => b.from >= (cur ? cur.to : now) && b.a.kind !== 'free');
  if (cur) {
    const free = cur.a.kind === 'free';
    return `<section class="card nowc ${free ? 'free' : ''}" style="--c:${free ? 'var(--in)' : cur.a.color}">
      <div class="nc-top"><span class="nc-badge">${free ? 'FREE' : 'NOW'}</span><span class="num">${clock(cur.from)} – ${clock(cur.to)}</span><span class="r num">${durText(cur.to - now)} left</span></div>
      <div class="nc-name">${free ? 'Free time' : esc(cur.a.name)}</div>
      <div class="nc-prog"><i style="width:${Math.round(((now - cur.from) / cur.dur) * 100)}%"></i></div>
      <div class="nc-next">${next ? `Next · <b>${esc(next.a.name)}</b> at ${clock(next.from)}` : 'Nothing else today'}</div>
    </section>`;
  }
  if (next) {
    return `<section class="card nowc soon" style="--c:${next.a.color}">
      <div class="nc-top"><span class="nc-badge">NEXT</span><span class="num">${clock(next.from)} – ${clock(next.to)}</span><span class="r num">in ${durText(next.from - now)}</span></div>
      <div class="nc-name">${esc(next.a.name)}</div>
    </section>`;
  }
  return '';
}
function dayHtml() {
  const di = UI.sDay;
  const dir = UI.sDir ? (UI.sDir > 0 ? ' from-r' : ' from-l') : '';
  return weekStrip(di) + `<div class="dday${dir}" id="dday">${dayBody(di)}</div>`;
}
// One day under the week row. A swipe draws the days next to it with this too.
function dayBody(di) {
  const plan = dayPlan(di), isToday = di === todayIdx(), now = nowMin();
  if (!plan.length) {
    return `<section class="card empty"><div class="big">${ic('sun', DAY_COLORS[di], 'xl')}</div><h3>Nothing planned</h3><p>${WEEK[di]} is free.</p><button class="btn" data-act="sched-add">Add a block</button></section>`;
  }
  let h = isToday ? nowCard(plan) : '';
  const L = lessonsIn(plan), free = freeIn(plan);
  h += `<p class="dsum"><b class="num">${clock(plan[0].from)}–${clock(plan[plan.length - 1].to)}</b> · ${plural(L.length, 'lesson')}${L.length ? ` · ${durText(minutesIn(L))} teaching` : ''}${free ? ` · ${durText(free)} free` : ''}</p>`;
  const rows = plan.map((b) => {
    const cur = isToday && now >= b.from && now < b.to;
    if (b.a.kind === 'free') {
      return `<button class="drow free ${cur ? 'now' : ''}" data-act="sched-block" data-id="${b.id}" data-day="${di}"><span class="dt num"><b>${clock(b.from)}</b></span><i class="dbar"></i><span class="dmain">Free · ${durText(b.dur)}</span><span class="dadd" aria-label="Add something here">${glyph('plus')}</span></button>`;
    }
    const sub = blockSub(b);
    return `<button class="drow ${cur ? 'now' : ''}" style="--c:${b.a.color}" data-act="sched-block" data-id="${b.id}" data-day="${di}"><span class="dt num"><b>${clock(b.from)}</b><span>${clock(b.to)}</span></span><i class="dbar"></i><span class="dmain"><b>${esc(b.a.name)}${cur ? '<em>NOW</em>' : ''}</b>${sub ? `<span>${sub}</span>` : ''}</span><span class="dd num">${durText(b.dur)}</span></button>`;
  }).join('');
  return h + `<section class="card dlist">${rows}</section>
    <div class="dfoot"><button class="link" data-act="sched-copy">Copy ${WEEK[di]} to other days</button></div>`;
}

// ================= Week: every day as a short list =================
// Free time between sessions gets its own line ("Free 11:30–12:30"), so gaps are easy to spot.
function weekHtml() {
  const today = todayIdx();
  return WK.map((_, di) => {
    const p = dayPlan(di), L = lessonsIn(p), free = freeIn(p);
    const rows = p.map((b) => (b.a.kind === 'free'
      ? `<button class="wli free" data-act="sched-block" data-id="${b.id}" data-day="${di}"><span class="t"></span><i></i><span class="n num">Free ${clock(b.from)} – ${clock(b.to)}</span><span class="d num">${durText(b.dur)}</span></button>`
      : `<button class="wli ${b.a.kind}" style="--c:${b.a.color}" data-act="sched-block" data-id="${b.id}" data-day="${di}"><span class="t num">${clock(b.from)}</span><i></i><span class="n">${esc(b.a.name)}</span><span class="d num">${durText(b.dur)}</span></button>`)).join('');
    return `<section class="card wday ${di === today ? 'today' : ''}">
      <button class="wdh" data-act="sched-open-day" data-v="${di}"><b>${WEEK[di]}</b>${di === today ? '<span class="chip info">Today</span>' : ''}${p.length ? `<span class="r num">${clock(p[0].from)}–${clock(p[p.length - 1].to)}</span>` : ''}${I.chev}</button>
      ${p.length ? `${rows}<div class="wdf">${L.length ? `${plural(L.length, 'lesson')} · ` : ''}${free ? `<b>${durText(free)} free</b>` : 'no free time'}</div>` : '<div class="woff">Nothing planned — a free day</div>'}
    </section>`;
  }).join('');
}

function afterSchedule() {
  if (UI.sView === 'day') { fillDay(); bindDayPager($('#dday')); }
  UI.sDir = 0;
}
// The whole space under the week row takes a swipe, even below a short day.
function fillDay() {
  const dd = $('#dday');
  if (!dd) return;
  dd.style.minHeight = '';
  const pb = parseFloat(getComputedStyle($('#view')).paddingBottom) || 0;
  dd.style.minHeight = Math.max(0, Math.floor(window.innerHeight - pb - (dd.getBoundingClientRect().top + window.scrollY))) + 'px';
}
// Swipe the day sideways and it follows the finger: the next (or previous) day comes in from the
// side and the circle in the week row glides along. Let go past about a third of the way, or
// flick, and that day stays; otherwise it springs back. Monday and Sunday only give a little —
// they are the ends of the week.
const PAGE_GAP = 32; // space between two days while they move
function bindDayPager(el) {
  if (!el) return;
  const strip = $('#wstrip');
  let st = null, movedAt = 0;
  const side = (j, s) => {
    if (j < 0 || j > 6) return null;
    const p = document.createElement('div');
    p.className = 'dpage';
    p.inert = true;
    p.setAttribute('aria-hidden', 'true');
    p.style.transform = `translateX(${s * st.W}px)`;
    p.innerHTML = dayBody(j);
    el.appendChild(p);
    return p;
  };
  const follow = (dx) => {
    const end = (dx > 0 && !st.prev) || (dx < 0 && !st.next);
    st.x = end ? dx / 3 : clamp(dx, -st.W, st.W);
    el.style.transform = `translate3d(${st.x.toFixed(1)}px,0,0)`;
    if (strip) wsPaint(strip, clamp(UI.sDay - st.x / st.W, 0, 6));
  };
  el.addEventListener('pointerdown', (e) => {
    if ((st && (st.on || st.done)) || e.button > 0) return; // one finger at a time
    st = { id: e.pointerId, x0: e.clientX, y0: e.clientY, on: false, x: 0, pts: [] };
  });
  el.addEventListener('pointermove', (e) => {
    if (!st || e.pointerId !== st.id || st.done) return;
    const dx = e.clientX - st.x0, dy = e.clientY - st.y0;
    if (!st.on) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.2) { st = null; return; } // scrolling up or down
      st.on = true;
      el.classList.remove('from-r', 'from-l');
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      st.W = el.offsetWidth + PAGE_GAP;
      st.prev = side(UI.sDay - 1, -1);
      st.next = side(UI.sDay + 1, 1);
      el.classList.add('paging');
    }
    st.pts.push([e.timeStamp, e.clientX]);
    if (st.pts.length > 8) st.pts.shift();
    follow(dx);
  });
  const release = (e) => {
    if (!st || e.pointerId !== st.id || st.done) return;
    const s = st;
    if (!s.on) { st = null; return; }
    s.done = true; // a new swipe waits until this one has settled
    movedAt = Date.now();
    // How fast the finger was moving at the end (px per ms): a flick turns the page too.
    const last = s.pts[s.pts.length - 1], recent = s.pts.filter((p) => last[0] - p[0] <= 100);
    const v = recent.length > 1 ? (last[1] - recent[0][1]) / Math.max(1, last[0] - recent[0][0]) : 0;
    let dir = 0;
    if (e.type === 'pointerup') {
      if (s.next && s.x < -16 && (s.x < -s.W * 0.3 || v < -0.25)) dir = 1;
      else if (s.prev && s.x > 16 && (s.x > s.W * 0.3 || v > 0.25)) dir = -1;
    }
    const to = -dir * s.W;
    const ms = reduceMotion() ? 0 : Math.round(clamp(Math.abs(to - s.x) / Math.max(Math.abs(v), 1.2), 150, 330));
    const ease = `transform ${ms}ms cubic-bezier(.2, .75, .25, 1)`;
    el.classList.add('settling');
    el.style.transition = ease;
    el.style.transform = `translate3d(${to}px,0,0)`;
    if (strip) { $('.ws-ind', strip).style.transition = ease; wsPaint(strip, UI.sDay + dir); }
    setTimeout(() => {
      st = null;
      if (!el.isConnected) return; // the page was drawn again meanwhile
      if (dir) { const y = window.scrollY; UI.sDay += dir; wsFrom = UI.sDay; buzz(); render(); settleScroll(y); return; }
      [s.prev, s.next].forEach((p) => p && p.remove());
      el.classList.remove('paging', 'settling');
      el.style.transition = '';
      el.style.transform = '';
      if (strip) wsRest(strip);
    }, ms + 30);
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  // the end of a swipe must not also count as a tap on a row
  el.addEventListener('click', (e) => { if (Date.now() - movedAt < 400) { e.stopPropagation(); e.preventDefault(); } }, true);
}
// from: where the circle starts gliding (the finger's place after sliding along the row)
function showDay(i, dir, from) {
  if (i === UI.sDay) return;
  const y = window.scrollY;
  UI.sDir = dir || (i > UI.sDay ? 1 : -1);
  if (from != null) wsFrom = from;
  UI.sDay = i;
  buzz();
  render();
  settleScroll(y);
}
// A shorter day can't stay scrolled as far down as the day before: the page glides up to it
// instead of jumping (the extra room below goes at the next redraw).
function settleScroll(y) {
  const max = document.documentElement.scrollHeight - window.innerHeight, dd = $('#dday');
  if (!dd || y <= max + 1) return;
  dd.style.minHeight = `${dd.offsetHeight + Math.ceil(y - max)}px`;
  window.scrollTo(0, y);
  window.scrollTo({ top: max, behavior: reduceMotion() ? 'auto' : 'smooth' });
}
// Press on the week row and slide along it: the circle follows the finger and the day under it
// opens when you let go — like the tab bar. A tap still opens a day at once.
function bindWeekSlide() {
  let st = null, slidAt = 0;
  document.addEventListener('pointerdown', (e) => {
    const strip = e.button > 0 ? null : e.target.closest('.wstrip');
    st = strip ? { strip, id: e.pointerId, x0: e.clientX, y0: e.clientY, on: false, over: -1, pos: 0 } : null;
  });
  document.addEventListener('pointermove', (e) => {
    if (!st || e.pointerId !== st.id) return;
    if (!st.on) {
      const dx = Math.abs(e.clientX - st.x0), dy = Math.abs(e.clientY - st.y0);
      if (dy > 10 && dy > dx) { st = null; return; }
      if (dx < 8) return;
      st.on = true;
      try { st.strip.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    const r = st.strip.getBoundingClientRect(), w = (r.width - 8) / 7;
    st.pos = clamp((e.clientX - r.left - 4) / w - 0.5, 0, 6);
    wsPaint(st.strip, st.pos, true);
    const over = Math.round(st.pos);
    if (over !== st.over) { if (st.over >= 0) tick(); st.over = over; }
  });
  const end = (e) => {
    if (!st || e.pointerId !== st.id) return;
    const s = st;
    st = null;
    if (!s.on) return;
    slidAt = Date.now();
    if (e.type === 'pointerup' && s.over !== UI.sDay && s.strip.isConnected) showDay(s.over, 0, s.pos);
    else wsRest(s.strip);
  };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
  document.addEventListener('click', (e) => { if (e.isTrusted && Date.now() - slidAt < 350 && e.target.closest('.wstrip')) { e.stopPropagation(); e.preventDefault(); } }, true);
}
PAGES.schedule = { title: 'Schedule', render: renderSchedule, after: afterSchedule, resize: fillDay };

// ================= Block sheet =================
// What, which days, when it starts and how long it takes. The block is "painted" onto every ticked
// day: free time it covers is used up, anything else it overlaps is shortened or replaced (the
// sheet says which before saving). Untick a block's own day to move it; tick more days to add or
// change it there too. The same lesson at the same time on other days is offered with one tap.
let bdraft = null;
const sameTime = (b, p) => b.act === p.act && b.from === p.from && b.to === p.to;
function defaultAct() {
  const ok = (id) => id && id !== 'free' && S.schedule.acts.some((a) => a.id === id);
  if (ok(UI.lastAct)) return UI.lastAct;
  const a = S.schedule.acts.find((x) => x.kind === 'lesson') || S.schedule.acts.find((x) => x.id !== 'free');
  return a ? a.id : 'free';
}
function openBlock(di, id) {
  const p = id ? dayPlan(di).find((x) => x.id === id) : null;
  if (p && p.act !== 'free') {
    const sibs = {};
    WEEK.forEach((_, j) => { const s = j !== di && dayPlan(j).find((b) => sameTime(b, p)); if (s) sibs[j] = s.id; });
    bdraft = { day: di, id: p.id, act: p.act, oact: p.act, ofrom: p.from, from: p.from, len: p.dur, days: new Set([di]), sibs };
  } else {
    // New — or filling a free gap that was tapped.
    const from = p ? p.from : freeSlotFor(di, 60).from;
    const len = Math.min(p ? Math.min(p.dur, 90) : 60, 1440 - from);
    bdraft = { day: null, id: null, act: defaultAct(), from, len: Math.max(5, len), days: new Set([di]), sibs: {} };
  }
  openSheet(blockHtml(), mountBlock);
}
const idOn = (j) => (j === bdraft.day ? bdraft.id : bdraft.sibs[j] || null);
const dayList = (days) => [...days].sort((a, b) => a - b);
const dayNames = (days, long) => { const n = dayList(days).map((j) => (long ? WEEK[j] : WK[j])); return n.length > 1 ? `${n.slice(0, -1).join(', ')} & ${n[n.length - 1]}` : n.join(''); };
function blockConflicts() {
  const d = bdraft, to = d.from + d.len, out = [];
  for (const j of dayList(d.days)) {
    const own = idOn(j);
    dayPlan(j).forEach((b) => { if (b.id !== own && b.a.kind !== 'free' && b.from < to && b.to > d.from) out.push({ j, b, whole: b.from >= d.from && b.to <= to }); });
  }
  return out;
}
function blockPreview() {
  const d = bdraft, a = actView(d.act);
  return `<div class="bp-time num">${clock(d.from)} – ${clock(d.from + d.len)} · ${durText(d.len)}</div><div class="bp-title">${esc(a.name)}</div><div class="bp-sub">${d.days.size ? dayNames(d.days, d.days.size < 3) : 'Tick a day below'}</div>`;
}
function daysHint() {
  const d = bdraft;
  if (!d.days.size) return 'Tick at least one day.';
  const out = [];
  if (d.id && !d.days.has(d.day)) out.push(`It moves away from ${WEEK[d.day]} — that time becomes free.`);
  const left = Object.keys(d.sibs).map(Number).filter((j) => !d.days.has(j));
  if (left.length) out.push(`${esc(actView(d.oact).name)} is also at ${clock(d.ofrom)} on ${dayNames(left, true)} — tick ${left.length > 1 ? 'them' : 'it'} to change ${left.length > 1 ? 'all' : 'both'} at once.`);
  else if (d.days.size > 1) out.push(`${d.id ? 'Changes apply' : 'It is added'} to ${dayNames(d.days, true)}.`);
  if (!out.length) out.push(d.id ? 'Tick other days to add it there too, or untick this day to move it.' : 'Tick every day it happens — it is added to all of them.');
  return out.join(' ');
}
const removeDays = () => { const t = dayList(bdraft.days).filter((j) => idOn(j)); return t.length ? t : [bdraft.day]; };
function blockHtml() {
  const d = bdraft, a = actView(d.act), editing = !!d.id, g = a.group;
  let gq = '';
  if (g) {
    const m = groupMonth(g, ymNow());
    gq = `<div class="card gq">${grpBadge(g, 'sm')}<div class="row-main"><b>${esc(g.name)}</b><span>${m.n ? `${m.paidCount} of ${m.n} paid for ${MONTHS[new Date().getMonth()]}` : 'No students yet'}</span></div><button class="pill-btn" data-act="group" data-id="${g.id}">Open</button></div>`;
  }
  const step = (what, v, label) => `<button class="tbtn" data-step="${what}" data-v="${v}" aria-label="${label}">${glyph(v < 0 ? 'minus' : 'plus')}</button>`;
  return sheetHead(editing ? 'Change block' : 'New block', '<button data-act="close-sheet">Cancel</button>', `<button data-act="blk-save">${editing ? 'Save' : 'Add'}</button>`) + `
  <div class="sheet-body">
    <div class="blk-preview ${a.kind}" id="blk-preview" style="--c:${a.color}">${blockPreview()}</div>
    ${gq}
    <div class="form-label">What</div>
    <div class="act-pick">${S.schedule.acts.filter((x) => x.id !== 'free').map((x) => { const v = actView(x.id); return `<button class="${d.act === x.id ? 'on' : ''} ${v.kind}" style="--c:${v.color}" data-act="blk-act" data-v="${x.id}"><i></i>${esc(v.name)}</button>`; }).join('')}<button class="add" data-act="act-new">${glyph('plus')}New</button></div>
    <div class="form-label">Days</div>
    <div class="blk-days">${WK.map((n, i) => `<button class="${d.days.has(i) ? 'on' : ''} ${d.sibs[i] ? 'sib' : ''}" style="--dc:${DAY_COLORS[i]}" data-act="blk-day" data-v="${i}">${n}</button>`).join('')}</div>
    <p class="hint" id="blk-days-hint">${daysHint()}</p>
    <div class="form-label">Time</div>
    <div class="group plain">
      <div class="row field trow"><span>Starts</span>${step('from', -15, '15 minutes earlier')}<label class="tval"><b class="num" id="blk-from-t">${clock(d.from)}</b><input type="time" id="blk-from" step="300" value="${hhmm(d.from)}" aria-label="Start time"></label>${step('from', 15, '15 minutes later')}</div>
      <div class="row field trow"><span>Length</span>${step('len', -15, '15 minutes shorter')}<span class="tval"><b class="num" id="blk-len-t">${durText(d.len)}</b></span>${step('len', 15, '15 minutes longer')}</div>
    </div>
    <div class="dur-pick" id="blk-durs" style="margin-top:10px">${[45, 60, 90, 120, 180].map((m) => `<button class="${d.len === m ? 'on' : ''}" data-act="blk-dur" data-v="${m}">${durText(m)}</button>`).join('')}</div>
    <p class="hint">Tap the time to type it, or hold − / + to move in 15-minute steps.</p>
    <div id="blk-conflict"></div>
    <div class="actions">
      <button class="btn" data-act="blk-save">${editing ? 'Save' : 'Add'}</button>
      ${editing ? `<button class="btn danger" data-act="blk-del" id="blk-del">Remove from ${dayNames(removeDays(), true)}</button>` : ''}
      ${editing ? `<button class="btn grey" data-act="act-edit" data-id="${a.id}">${glyph('pencil')} Change “${esc(a.name)}” — name, colour</button>` : ''}
    </div>
  </div>`;
}
const parseTime = (v) => { const [h, m] = String(v).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
// −/+ move to the next quarter hour, so odd times like 14:20 line up again.
const snap15 = (x, v) => (v > 0 ? Math.floor(x / 15) * 15 + 15 : Math.ceil(x / 15) * 15 - 15);
function stepBlock(what, v) {
  const d = bdraft;
  if (what === 'from') d.from = clamp(snap15(d.from, v), 0, 1440 - d.len);
  else d.len = clamp(snap15(d.len, v), 15, 1440 - d.from);
}
function mountBlock(sh) {
  const f = $('#blk-from', sh);
  const onFrom = () => { if (!f.value) return; bdraft.from = clamp(parseTime(f.value), 0, 1440 - 5); bdraft.len = Math.min(bdraft.len, 1440 - bdraft.from); syncBlock(sh); };
  f.addEventListener('change', onFrom);
  f.addEventListener('input', onFrom);
  f.addEventListener('click', () => { try { f.showPicker(); } catch (e) { /* the phone opens its own picker */ } });
  // Hold − / + to keep stepping, faster after a moment.
  $$('.tbtn', sh).forEach((b) => {
    let t = 0, n = 0;
    const go = () => { stepBlock(b.dataset.step, Number(b.dataset.v)); syncBlock(sh); };
    const stop = () => { clearTimeout(t); t = 0; };
    b.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      go(); tick(); n = 0;
      const rep = () => { go(); n++; t = setTimeout(rep, n > 5 ? 70 : 140); };
      t = setTimeout(rep, 420);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, stop));
    b.addEventListener('click', (e) => { if (e.detail === 0) go(); }); // keyboard
  });
  syncBlock(sh);
}
function syncBlock(sh) {
  const d = bdraft;
  $('#blk-preview', sh).innerHTML = blockPreview();
  $('#blk-from-t', sh).textContent = clock(d.from);
  $('#blk-from', sh).value = hhmm(d.from);
  $('#blk-len-t', sh).textContent = durText(d.len);
  $('#blk-days-hint', sh).innerHTML = daysHint();
  $$('#blk-durs button', sh).forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === d.len));
  const del = $('#blk-del', sh);
  if (del) del.textContent = `Remove from ${dayNames(removeDays(), true)}`;
  const c = blockConflicts();
  $('#blk-conflict', sh).innerHTML = c.length
    ? `<div class="blk-warn">${glyph('clock')}<div><b>Overlaps ${[...new Set(c.map((x) => esc(x.b.a.name)))].join(' and ')}</b><span>${c.map((x) => `${WK[x.j]}: ${esc(x.b.a.name)} ${clock(x.b.from)}–${clock(x.b.to)} will be ${x.whole ? 'replaced' : 'shortened'}`).join(' · ')}</span></div></div>`
    : '';
  $$('[data-act="blk-save"]', sh).forEach((b) => { b.disabled = !d.days.size; });
}
// Days in the block sheet: tap one, or press on a day and slide across the others to tick (or
// untick) them all in one go.
function bindDaysSlide() {
  let st = null, slidAt = 0;
  const setDay = (j) => {
    if (bdraft.days.has(j) === st.to) return;
    if (st.to) bdraft.days.add(j); else bdraft.days.delete(j);
    const b = $(`:scope > [data-v="${j}"]`, st.row);
    if (b) b.classList.toggle('on', st.to);
    tick();
    if (sheet) syncBlock(sheet.sh);
  };
  document.addEventListener('pointerdown', (e) => {
    const b = e.button > 0 || !bdraft ? null : e.target.closest('.blk-days > button');
    st = b ? { row: b.parentElement, id: e.pointerId, x0: e.clientX, y0: e.clientY, on: false, to: !bdraft.days.has(Number(b.dataset.v)), last: Number(b.dataset.v) } : null;
  });
  document.addEventListener('pointermove', (e) => {
    if (!st || e.pointerId !== st.id) return;
    if (!st.on) {
      const dx = Math.abs(e.clientX - st.x0), dy = Math.abs(e.clientY - st.y0);
      if (dy > 10 && dy > dx) { st = null; return; }
      if (dx < 8) return;
      st.on = true;
      try { st.row.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      setDay(st.last);
    }
    const r = st.row.getBoundingClientRect();
    const i = clamp(Math.floor(((e.clientX - r.left) / r.width) * 7), 0, 6);
    // every day between the last one and this one: a quick slide can skip over some
    for (let j = Math.min(i, st.last); j <= Math.max(i, st.last); j++) setDay(j);
    st.last = i;
  });
  const end = (e) => {
    if (!st || e.pointerId !== st.id) return;
    if (st.on) slidAt = Date.now();
    st = null;
  };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
  document.addEventListener('click', (e) => { if (e.isTrusted && Date.now() - slidAt < 350 && e.target.closest('.blk-days')) { e.stopPropagation(); e.preventDefault(); } }, true);
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
  trimDay(di);
}
// A day runs from its first to its last activity: free time at either end is dropped.
function trimDay(di) {
  const d = S.schedule.days[di];
  while (d.blocks.length && d.blocks[0].act === 'free') d.start += d.blocks.shift().dur;
  while (d.blocks.length && d.blocks[d.blocks.length - 1].act === 'free') d.blocks.pop();
}
// A block's time becomes free time.
function freeUp(di, id) {
  const blocks = S.schedule.days[di].blocks;
  const i = blocks.findIndex((b) => b.id === id);
  if (i < 0) return;
  blocks[i] = { id: uid(), act: 'free', dur: blocks[i].dur };
  mergeFree(di);
  trimDay(di);
}
function saveBlock() {
  const d = bdraft, to = d.from + d.len;
  if (!d.days.size || d.len < 5) return;
  const snapshot = JSON.parse(JSON.stringify(S.schedule.days));
  if (d.id && !d.days.has(d.day)) freeUp(d.day, d.id); // moved to other days
  for (const j of dayList(d.days)) paintBlock(j, d.from, to, d.act, idOn(j));
  UI.lastAct = d.act;
  save(); buzz(); closeSheet(); render();
  undoToast(`${actView(d.act).name} · ${dayNames(d.days)} ${clock(d.from)}–${clock(to)}`, () => { S.schedule.days = snapshot; });
}
function removeBlocks() {
  const days = removeDays(), name = actView(bdraft.oact || bdraft.act).name;
  const snapshot = JSON.parse(JSON.stringify(S.schedule.days));
  days.forEach((j) => freeUp(j, idOn(j)));
  save(); closeSheet(); render();
  undoToast(`${name} removed from ${dayNames(days)} — that time is free now`, () => { S.schedule.days = snapshot; });
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
  UI.sDay = todayIdx();
  if (sheet) closeSheet();
  if (UI.tab === 'schedule') render(true); else goTab('schedule');
  toast('Your schedule is in ✓');
}

// ================= Actions =================
Object.assign(ACTIONS, {
  'sched-view': (a, v) => { const d = segDir(a); UI.sView = v; S.settings.schedView = v; save(); renderSub(a, d); },
  'sched-day': (a, v) => showDay(Number(v)),
  // A day's name in the Week view opens that day (the title and the Day | Week switch stay put).
  'sched-open-day': (a, v) => { UI.sDay = Number(v); UI.sView = 'day'; S.settings.schedView = 'day'; save(); window.scrollTo(0, 0); render(true, -1, 1); },
  'sched-add': () => openBlock(UI.sDay, null),
  'sched-block': (a, v, id) => openBlock(a.dataset.day != null ? Number(a.dataset.day) : UI.sDay, id),
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
  'blk-dur': (a, v) => { bdraft.len = Math.min(Number(v), 1440 - bdraft.from); syncBlock(sheet.sh); },
  'blk-day': (a, v) => {
    const i = Number(v);
    if (bdraft.days.has(i)) bdraft.days.delete(i); else bdraft.days.add(i);
    a.classList.toggle('on', bdraft.days.has(i));
    syncBlock(sheet.sh);
  },
  'blk-save': () => saveBlock(),
  'blk-del': () => removeBlocks(),
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
