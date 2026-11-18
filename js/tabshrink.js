'use strict';
/* NEXT (16 Nov, user): the tab bar gets smaller while you scroll down and bigger again going up. Now a choice in Settings:
   "Shrink the tab bar while scrolling" (on by default). Off = the bar always stays full size. Same file in Teacher and Budget.
   Both apps shrink the bar with the class g2-down on <html> (liquid.js); when the choice is off, that class is taken away at once. */
(() => {
  const K = 'tab-shrink', root = document.documentElement;
  const on = () => { try { return localStorage.getItem(K) !== 'off'; } catch (e) { return true; } };
  new MutationObserver(() => { if (!on() && root.classList.contains('g2-down')) root.classList.remove('g2-down'); }).observe(root, { attributes: true, attributeFilter: ['class'] });
  window.tabShrinkOn = on;
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-tabshrink]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const v = !on(); try { localStorage.setItem(K, v ? 'on' : 'off'); } catch (err) { /* private mode */ }
    if (!v) { root.classList.remove('g2-down'); document.querySelectorAll('.g2d').forEach((x) => x.classList.remove('g2d')); }
    b.setAttribute('aria-checked', String(v)); b.querySelectorAll('.ts-sw').forEach((s) => s.classList.toggle('on', v));
  }, true);
  const st = document.createElement('style');
  st.textContent = `.ts-sw{width:51px;height:31px;border-radius:99px;background:rgba(120,120,128,.18);position:relative;flex:none;transition:background .25s;margin-left:auto}
.ts-sw::after{content:"";position:absolute;top:2px;left:2px;width:27px;height:27px;border-radius:50%;background:#fff;box-shadow:0 3px 8px rgba(0,0,0,.15),0 1px 1px rgba(0,0,0,.16);transition:transform .3s cubic-bezier(.3,1.3,.5,1)}
.ts-sw.on{background:#34C759}.ts-sw.on::after{transform:translateX(20px)}`;
  document.head.appendChild(st);
})();
