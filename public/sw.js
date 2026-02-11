// Service Worker for kevinborja.com
// Provides offline experience with network-first strategy

const CACHE_NAME = 'kevinborja-v1';
const OFFLINE_URL = '/offline.html';

// Install event - pre-cache offline page
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching offline page');
        return cache.add(OFFLINE_URL);
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
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim();
      })
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
      fetch(event.request)
        .then((response) => {
          // If network request is successful, cache it and return
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch((error) => {
          console.log('[Service Worker] Network request failed, trying cache:', error);
          
          // Try to get from cache
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('[Service Worker] Serving from cache:', event.request.url);
                return cachedResponse;
              }
              
              // If not in cache, serve offline page
              console.log('[Service Worker] Serving offline page');
              
              // Store the intended URL in a header so offline page can use it
              return caches.match(OFFLINE_URL).then((offlineResponse) => {
                // Try to store the intended URL for the offline page to use
                if (offlineResponse) {
                  // Clone the response to add custom logic
                  return offlineResponse;
                }
                // Fallback if offline page is not cached (shouldn't happen)
                return new Response('Offline', { 
                  status: 503, 
                  statusText: 'Service Unavailable' 
                });
              });
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
              // If it's an image request and not cached, return a placeholder
              if (event.request.destination === 'image') {
                // Return a small transparent gif
                return new Response(
                  atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
                  { headers: { 'Content-Type': 'image/gif' } }
                );
              }
              // For other resources, just fail gracefully
              return new Response('', { status: 404 });
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
