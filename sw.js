// AW139 Checklist - Service Worker
// Cache version is driven by APP_VERSION via sw.js?v=<app-version>

const swUrl = new URL(self.location.href);
const APP_VERSION = swUrl.searchParams.get('v') || 'dev';
const CACHE_PREFIX = 'aw139-qrh';
const CACHE_NAME = `${CACHE_PREFIX}-v${APP_VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './config.js',
  './changelog.json',
  './styles.css',
  './app.js',
  './manifest.json',
  './favicon.ico',
  './favicon-16x16.png',
  './favicon-32x32.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './imagen.jpeg',
  './instalacion_qr_v2.html',
  // PAC module
  './pac/index.html',
  './pac/app.js',
  './pac/styles.css',
  './pac/aw139_pac_chart_config.js',
  './pac/power_assurance_chart.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(`${CACHE_PREFIX}-`) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) return response;

          if (
            event.request.url.includes('fonts.googleapis') ||
            event.request.url.includes('fonts.gstatic')
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
          return undefined;
        });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});