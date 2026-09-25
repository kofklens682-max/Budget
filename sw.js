// Offline support. Bump VERSION whenever the app files change so phones pick up the update:
// the new worker installs, takes over, and the open app reloads into the new version.
const VERSION = 'budget-v11';
const SHELL = [
  './',
  './index.html',
  './style.css',
  './icons.js',
  './js/keep.js',
  './js/core.js',
  './js/money.js',
  './js/groups.js',
  './js/schedule.js',
  './js/main.js',
  './manifest.webmanifest',
  './icons/icon-96.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './fonts/inter-latin.woff2',
  './fonts/inter-latin-ext.woff2',
  './fonts/inter-cyrillic.woff2',
  './fonts/inter-cyrillic-ext.woff2',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' skips the browser's HTTP cache so a new version never installs stale files
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

// The Notes app lives on the same site and has its own caches ("notes-…"): only clear ours.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('budget-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// The app opens straight from the phone's copy: no waiting for the network and no re-downloading
// every file at each start. New versions arrive through a new service worker (see VERSION).
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const key = req.mode === 'navigate' ? './index.html' : req;
      const hit = await cache.match(key, { ignoreSearch: true });
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(key, res.clone());
        return res;
      } catch (err) {
        return (req.mode === 'navigate' && (await cache.match('./index.html'))) || Response.error();
      }
    })
  );
});
