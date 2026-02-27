const VERSION = 'v5';
const CACHE_NAME = `kevinborja-${VERSION}`;
const STATIC_CACHE = `kevinborja-static-${VERSION}`;
const OFFLINE_URL = '/offline.html';

const PRECACHE_ROUTES = [
  '/',
  '/archive/',
  '/about/',
  '/herramientas/',
  OFFLINE_URL,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.add(OFFLINE_URL).then(() => {
          const precachePromises = PRECACHE_ROUTES
            .filter((url) => url !== OFFLINE_URL)
            .map((url) =>
              fetch(url, { credentials: 'same-origin' })
                .then((response) => {
                  if (response.ok) return cache.put(url, response);
                })
                .catch(() => {})
            );
          return Promise.all(precachePromises);
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isStaticAsset(url) {
  return /\.(css|js|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|avif|ico)(\?.*)?$/i.test(url.pathname) ||
    url.pathname.startsWith('/_astro/');
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request)
        .then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
            }
            return response;
          });
        })
        .catch(() => new Response('Service Unavailable', { status: 503, statusText: 'Service Unavailable' }))
    );
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request)
            .then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request)
          .then((cached) => cached || new Response('Service Unavailable', { status: 503, statusText: 'Service Unavailable' }))
      )
  );
});
