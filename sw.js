const CACHE_NAME = 'kinetic-medfit-3d-v3';
const CORE_ASSETS = [
  './',
  './Index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!['http:', 'https:'].includes(url.protocol)) return;

  // Do not intercept live interactive BioDigital 3D external widget traffic
  if (url.hostname.includes('biodigital.com')) return;

  const isStaticMediaOrFont =
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('images.unsplash.com');

  if (isStaticMediaOrFont) {
    // Cache-First for fonts & static exercise thumbnails
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request)
          .then(res => {
            if (res && (res.status === 200 || res.type === 'opaque')) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
            }
            return res;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  // Same-origin bundled Vite assets & HTML navigation: Stale-While-Revalidate + Offline Navigation Fallback
  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request)
        .then(res => {
          if (res && (res.status === 200 || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => cached || (request.mode === 'navigate' ? caches.match('./Index.html') : undefined));

      return cached || networkFetch;
    })
  );
});
