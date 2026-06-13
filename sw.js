/* BalloonClock service worker — precache app shell, runtime-cache the Three.js CDN
   so the home-screen app keeps working offline after its first online launch. */
const CACHE = 'balloonclock-v1';
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

  // Always hit the network for live weather — never serve it stale.
  if (url.hostname.includes('open-meteo.com')) return;

  // Cache-first for everything else (app shell + Three.js CDN), filling the
  // cache on first fetch so later launches work without a network.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((resp) => {
      const copy = resp.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return resp;
    }).catch(() => hit))
  );
});
