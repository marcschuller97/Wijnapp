// Bump this on EVERY deploy that changes a file below — otherwise phones keep
// serving the previous version from cache.
const CACHE_NAME = 'winecellar-v7';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './css/styles.css',
  './js/app.js',
  './js/auth.js',
  './js/state.js',
  './js/model.js',
  './js/utils.js',
  './js/wineDraft.js',
  './js/photoRecognize.js',
  './js/winePairing.js',
  './js/wineEnrich.js',
  './js/data/seedWines.js',
  './js/render/card.js',
  './js/render/donut.js',
  './js/render/pieChart.js',
  './js/render/colorSplit.js',
  './js/render/colorFilter.js',
  './js/render/byPrice.js',
  './js/render/voorraad.js',
  './js/render/recentlyAdded.js',
  './js/render/binnenkort.js',
  './js/render/historie.js',
  './js/render/modal.js',
  './js/render/batchModal.js',
  './js/render/wineDetail.js',
  './js/render/pairingModal.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // API responses (the shared inventory, AI calls) always come live from the
  // network, never from cache — otherwise you'd see stale stock after a
  // family member changed something.
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;

  // Network-first: as soon as there's a connection you get the latest version
  // right away. The cache is purely a fallback for opening the app offline.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // Don't let an error page (404/500) replace a good cached copy.
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          const shell = await caches.match('./index.html');
          if (shell) return shell;
        }
        return Response.error();
      })
  );
});
