// AW139 Checklist - Service Worker
// Repositorio: https://github.com/diegosacristan/aw139-QRH

const CACHE_NAME = 'aw139-qrh-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// INSTALL - guardar en cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE - limpiar caches viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// FETCH - network-first para HTML, cache-first para lo demas
self.addEventListener('fetch', event => {
  const req = event.request;

  // HTML: network-first para reflejar cambios durante desarrollo
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', clone));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req)
      .then(cached => {
        if (cached) return cached;
        return fetch(req)
          .then(response => {
            // Cachear fuentes de Google dinamicamente
            if (req.url.includes('fonts.googleapis') ||
                req.url.includes('fonts.gstatic')) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
            }
            return response;
          })
          .catch(() => undefined);
      })
  );
});
