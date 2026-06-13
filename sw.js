/* BalloonClock service worker.
   - same-origin (app shell): NETWORK-FIRST so updates always show; cache is the
     offline fallback only. (cache-first here is what made old builds stick.)
   - cross-origin (Three.js CDN): cache-first, so it works offline after run 1.
   - weather API: always network, never cached. */
const CACHE = 'balloonclock-v10';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // live weather → straight to network, never cached
  if (url.hostname.includes('open-meteo.com')) return;

  // app shell (same origin) → network-first, fall back to cache when offline
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  // third-party (Three.js CDN) → cache-first, fill on first fetch
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((resp) => {
      const copy = resp.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return resp;
    }).catch(() => hit))
  );
});
