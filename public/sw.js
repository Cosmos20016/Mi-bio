// Service Worker for kevinborja.com
// Provides offline experience with network-first strategy

const CACHE_NAME = 'kevinborja-v4';
const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = [
  '/',
  '/archive/',
  '/about/',
  OFFLINE_URL
];

// Install event - pre-cache offline page and main routes
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches, DO NOT enable navigationPreload
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - network-first with offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // Estrategia Stale-While-Revalidate para assets estáticos
  if (/\.(css|js|woff2?|png|jpe?g|gif|svg|webp|ico)$/i.test(url.pathname) || url.pathname.startsWith('/_astro/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Network-first para navegación
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Network failed - try cache first, then offline page
          return caches.match(event.request)
            .then((cached) => cached || caches.match(OFFLINE_URL));
        })
    );
  } else {
    // Non-navigation requests: network first, cache fallback
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || new Response('', { status: 503 })))
    );
  }
});
