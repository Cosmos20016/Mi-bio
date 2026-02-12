// Service Worker for kevinborja.com
// Optimized caching strategy for fast navigation

const CACHE_NAME = 'kevinborja-v5';
const STATIC_CACHE = 'kevinborja-static-v5';
const OFFLINE_URL = '/offline.html';

// Routes to pre-cache for instant navigation
const PRECACHE_ROUTES = [
  '/',
  '/archive/',
  '/about/',
  '/herramientas/',
  OFFLINE_URL
];

// Install event - pre-cache critical routes and offline page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Pre-cache offline page first (critical)
        return cache.add(OFFLINE_URL).then(() => {
          // Pre-cache routes individually to prevent installation failure
          const precachePromises = PRECACHE_ROUTES
            .filter((url) => url !== OFFLINE_URL)
            .map((url) =>
              fetch(url, { credentials: 'same-origin' })
                .then((response) => {
                  if (response.ok) {
                    return cache.put(url, response);
                  }
                })
                .catch(() => {
                  // Silent fail - don't prevent installation if a route is unavailable
                })
            );
          return Promise.all(precachePromises);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Helper: check if request is for a static asset
function isStaticAsset(url) {
  return /\.(css|js|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|avif|ico)(\?.*)?$/i.test(url.pathname) ||
         url.pathname.startsWith('/_astro/');
}

// Fetch event - smart caching strategies
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // Static assets: cache-first (they have hashed filenames from Astro)
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

  // Navigation requests: network-first with cache fallback
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
        .catch(() => {
          return caches.match(event.request)
            .then((cached) => cached || caches.match(OFFLINE_URL));
        })
    );
    return;
  }

  // Other requests: network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || new Response('Service Unavailable', { status: 503, statusText: 'Service Unavailable' })))
  );
});
