// Service Worker for kevinborja.com
// Provides offline experience with network-first strategy

const CACHE_NAME = 'kevinborja-v2';
const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = [OFFLINE_URL, '/'];
const NETWORK_TIMEOUT_MS = 3000;

// Install event - pre-cache offline page
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching critical resources');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Enable navigation preload if supported
      self.registration.navigationPreload && 
        self.registration.navigationPreload.enable(),
      // Claim clients immediately
      self.clients.claim()
    ])
  );
});

// Fetch event - network-first with offline fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Handle navigation requests (page loads)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      Promise.race([
        fetch(event.request).then((response) => {
          // If network request is successful, cache it and return
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), NETWORK_TIMEOUT_MS)
        )
      ]).catch(() => {
        console.log('[Service Worker] Network request failed or timed out');
        
        // Try to get from cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[Service Worker] Serving from cache:', event.request.url);
              return cachedResponse;
            }
            
            // If not in cache, serve offline page
            console.log('[Service Worker] Serving offline page');
            return caches.match(OFFLINE_URL);
          });
      })
    );
  } else {
    // For non-navigation requests (images, styles, scripts, etc.)
    // Try network first, then cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Try to serve from cache if network fails
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // For other resources (images, styles, scripts), just fail gracefully
              // Browsers will handle missing resources appropriately
              return new Response('', { status: 404, statusText: 'Not Found' });
            });
        })
    );
  }
});

// Handle messages from clients (optional, for future use)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
