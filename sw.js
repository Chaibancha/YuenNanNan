const CACHE_NAME = 'yuennannan-3d-v5';
const BUILD_ASSETS = [];
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  ...BUILD_ASSETS
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

function offlineFallbackResponse(request, cached) {
  if (cached) return cached;
  if (request.mode === 'navigate') {
    return caches.match('./index.html').then(
      html => html || new Response('Offline', { status: 503, statusText: 'Offline' })
    );
  }
  return new Response('', { status: 504, statusText: 'Offline' });
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!['http:', 'https:'].includes(url.protocol)) return;

  // Do not intercept live interactive BioDigital 3D external widget traffic
  if (url.hostname.includes('biodigital.com')) return;

  const isStaticMediaOrFont =
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isStaticMediaOrFont) {
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
          .catch(() => offlineFallbackResponse(request, cached));
      })
    );
    return;
  }

  // Same-origin bundled Vite assets & HTML navigation: Stale-While-Revalidate + Offline Fallback
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
        .catch(() => offlineFallbackResponse(request, cached));

      return cached || networkFetch;
    })
  );
});
