// AW139 Checklist — Service Worker
// Repositorio: https://github.com/diegosacristan/aw139_CheckList

const CACHE_NAME = 'aw139-qrh-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './favicon-16x16.png',
  './favicon-32x32.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './imagen.jpeg',
  './splash-640x1136.png',
  './splash-750x1334.png',
  './splash-1125x2436.png',
  './splash-1242x2208.png',
  './splash-1536x2048.png',
  './splash-1668x2224.png',
  './splash-1668x2388.png',
  './splash-2048x2732.png',
  './splash-1136x640.png',
  './splash-1334x750.png',
  './splash-2436x1125.png',
  './splash-2208x1242.png',
  './splash-2048x1536.png',
  './splash-2224x1668.png',
  './splash-2388x1668.png',
  './splash-2732x2048.png'
];

// INSTALL — guardar en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
});

// ACTIVATE — limpiar cachés viejas
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

// FETCH — servir desde caché, fallback a red
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(response => {
            // Cachear fuentes de Google dinámicamente
            if (event.request.url.includes('fonts.googleapis') ||
                event.request.url.includes('fonts.gstatic')) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => {
            // Offline fallback
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// Permitir que la app active una nueva versión al instante
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
