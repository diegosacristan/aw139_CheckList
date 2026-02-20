const CACHE = 'checklist-v1';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['./', './index.html']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
```

4. Clic en **"Commit changes"**

---

## Paso 4 — Activar GitHub Pages

1. En tu repositorio → pestaña **"Settings"**
2. Menú izquierdo → **"Pages"**
3. En "Source" → selecciona **"Deploy from a branch"**
4. Branch: **main** / folder: **/ (root)**
5. Clic en **"Save"**

Espera 2-3 minutos. GitHub te muestra la URL:
```
https://TU-USUARIO.github.io/aw139-checklist/
