'use strict';
/* Home: "Coming up" (3 Nov 2026, the user asked for it back): the lessons still to come today and the lessons tomorrow,
   from the schedule (lesson blocks only; a day on a Teacher break shows "no lessons"). Tap a day to open it in Schedule.
   Loaded after safety.js. */
function upLessons(di, date, onlyLater) {
  const now = nowMin(), k = iso(date), bs = teacherBreaks();
  return dayPlan(di).filter((b) => b.a.kind === 'lesson' && (!onlyLater || b.to > now)).map((b) => {
    const p = bs.find((x) => k >= x.from && k <= x.to && (!x.gids || !x.gids.length || x.gids.includes((b.act || '').slice(1))));
    return { b, brk: p ? p.label || 'Break' : '' };
  });
}
function upCard() {
  if (!hasSchedule()) return '';
  const di = todayIdx(), ti = (di + 1) % 7, now = nowMin();
  const today = upLessons(di, new Date(), true).filter((x) => !x.brk), tom = upLessons(ti, addDays(new Date(), 1), false).filter((x) => !x.brk);
  const row = (x, on) => `<div class="row up-row" style="--c:${x.b.a.color}"><span class="up-dot"></span><div class="row-main"><div class="row-title">${esc(x.b.a.name)}${on ? '<em class="up-now">NOW</em>' : ''}</div><div class="row-sub num">${clock(x.b.from)} – ${clock(x.b.to)}</div></div></div>`;
  const block = (title, list, di2, empty, nowIs) => `<button class="up-h" data-act="up-day" data-v="${di2}"><b>${title}</b><span>${list.length ? plural(list.length, 'lesson') : ''}</span>${I.chev}</button>${list.length ? list.map((x) => row(x, nowIs && x.b.from <= now && x.b.to > now)).join('') : `<div class="row field"><span class="up-none">${empty}</span></div>`}`;
  return `<div class="sec-head"><h2>Coming up</h2></div><div class="group up-card">${block('Today', today, di, 'No more lessons today', true)}${block('Tomorrow · ' + WEEK[ti], tom, ti, 'No lessons tomorrow', false)}</div>`;
}
{
  const _r = renderHome;
  renderHome = function () {
    const h = _r(), c = upCard(); if (!c) return h;
    const at = h.indexOf('<div class="sec-head"><h2>Keep it true</h2>'), at2 = h.indexOf('<div class="sec-head"><h2>Accounts</h2>'), p = at >= 0 ? at : at2 >= 0 ? at2 : h.length;
    return h.slice(0, p) + c + h.slice(p);
  };
  PAGES.home.render = renderHome;
}
Object.assign(ACTIONS, { 'up-day': (a, v) => { UI.sDay = Number(v); UI.sView = 'day'; S.settings.schedView = 'day'; save(); goTab('schedule'); } });
setInterval(() => { if (UI.tab === 'home' && !sheet && !document.hidden && Date.now() - (typeof touchedAt === 'number' ? touchedAt : 0) > 2000) render(); }, 60000);
