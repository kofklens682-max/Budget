'use strict';
/* A payment you mark in the Teacher app waits here until you add it as income.
   The Teacher app writes it to localStorage "teacher-to-budget" (same website, so both apps can see it);
   Budget shows a card at the top: "Farida paid 400 000 · Kids 3B · October" → Add income opens the
   normal New entry form already filled in (amount, name, Lessons, the month, the group); you pick Cash or Card. */
const TB_KEY = 'teacher-to-budget';
const tbList = () => { try { const l = JSON.parse(localStorage.getItem(TB_KEY) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
const tbSet = (l) => { try { if (l.length) localStorage.setItem(TB_KEY, JSON.stringify(l)); else localStorage.removeItem(TB_KEY); } catch (e) { /* full */ } };
let tbLater = false, tbOpen = null;
const tbCount = (p) => S.tx.filter((t) => t.type === 'in' && t.amount === p.amount && t.person === p.person).length;
(function tbStyle() {
  const s = document.createElement('style');
  s.textContent = `#tb-banner{position:fixed;left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:9999;animation:tb-in .35s cubic-bezier(.2,.8,.25,1) both}
  @keyframes tb-in{from{transform:translateY(-130%);opacity:0}to{transform:none;opacity:1}}
  #tb-banner .tb-card{display:flex;flex-wrap:wrap;align-items:center;gap:10px 12px;max-width:520px;margin:0 auto;padding:12px 12px 12px 14px;border-radius:20px;background:var(--card,#fff);color:var(--text,#000);box-shadow:0 12px 34px rgba(0,0,0,.18),0 0 0 .5px rgba(0,0,0,.06)}
  #tb-banner .tb-ic{width:40px;height:40px;border-radius:12px;flex:none;display:grid;place-items:center;color:#fff;font-weight:800;font-size:22px;background:linear-gradient(135deg,#34C759,#0FA37F)}
  #tb-banner .tb-tx{flex:1;min-width:0}
  #tb-banner .tb-tx b{display:block;font-size:15px}
  #tb-banner .tb-tx span{display:block;font-size:12.5px;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #tb-banner .tb-bt{display:flex;gap:8px;width:100%;justify-content:flex-end}
  #tb-banner button{font:inherit;border:0;cursor:pointer;border-radius:999px;font-weight:700;font-size:13.5px;padding:9px 12px;background:rgba(120,120,128,.14);color:inherit}
  #tb-banner button.add{background:#34C759;color:#fff}`;
  document.head.appendChild(s);
})();
function tbShow() {
  const l = tbList(); let el = document.getElementById('tb-banner');
  if (!l.length || tbLater || (typeof sheet !== 'undefined' && sheet)) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'tb-banner'; document.body.appendChild(el); el.addEventListener('click', tbClick); }
  const p = l[0];
  el.innerHTML = `<div class="tb-card"><div class="tb-ic">+</div><div class="tb-tx"><b>${esc(p.person)} paid ${esc(fmt(p.amount, 'UZS'))}</b><span>From the Teacher app · ${esc(p.group)} · ${esc(ymLabel(p.ym))} fee${l.length > 1 ? ` · ${l.length - 1} more waiting` : ''}</span></div>
    <div class="tb-bt"><button data-tb="skip">Already counted</button><button data-tb="later">Later</button><button class="add" data-tb="add">Add income</button></div></div>`;
}
function tbClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.tb === 'later') { tbLater = true; tbShow(); return; }
  if (b.dataset.tb === 'skip') { const l = tbList(); l.shift(); tbSet(l); tbShow(); toast('Not added: this money is already in Budget'); return; } // an old payment, counted before
  const l = tbList(), p = l.shift(); tbSet(l); if (!p) return tbShow();
  const g = S.groups.find((x) => x.name.trim().toLowerCase() === String(p.group).trim().toLowerCase());
  const st = g && g.students.find((x) => x.name.trim().toLowerCase() === String(p.person).trim().toLowerCase());
  document.getElementById('tb-banner').remove();
  tbOpen = { p, n: tbCount(p) };
  openTx(null, { type: 'in', amount: p.amount, currency: 'UZS', person: p.person, category: lessonCat(), note: `${p.group} · ${ymLabel(p.ym)} fee${p.by ? ' · by ' + String(p.by).toLowerCase() : ''}`, date: p.date, groupId: g ? g.id : null, studentId: st ? st.id : null, forMonth: p.ym });
}
whenOpen(() => setTimeout(tbShow, 600));
document.addEventListener('visibilitychange', () => { if (!document.hidden) { tbLater = false; whenOpen(() => setTimeout(tbShow, 400)); } });
window.addEventListener('storage', (e) => { if (e.key === TB_KEY) tbShow(); });
setInterval(() => { // after the form closes: Cancel puts the payment back in the waiting list, Save takes it off for good
  if (tbOpen && !sheet) {
    const { p, n } = tbOpen; tbOpen = null;
    if (tbCount(p) <= n) tbSet([p, ...tbList()]); // no new entry was saved
  }
  if (!document.hidden && !document.getElementById('tb-banner')) tbShow();
}, 1500);
