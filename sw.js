const CACHE_NAME = 'winecellar-v3';
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
  if (url.pathname.startsWith('/api/')) return; // always live, never from cache

  // Network-first: as soon as there's a connection you get the latest version
  // right away. The cache is purely a fallback for opening the app offline.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
