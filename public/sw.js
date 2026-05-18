const CACHE_NAME = 'pst-v31'; // Final UI refinements and dynamic currency symbols

const ASSETS_TO_PRECACHE = [
  '/',
  '/index.html', // Crucial for SPA entry point
  '/manifest.json', // Manifest for PWA
  '/logo.png' // Your updated logo
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching essential assets...');
      return cache.addAll(ASSETS_TO_PRECACHE);
    }).catch(error => {
      console.error('[Service Worker] Pre-caching failed:', error);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim(); // Take control of pages immediately
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Strategy: Cache-First for static assets, Network-First for API/dynamic content
  // and Navigation fallback for SPA routes

  const requestUrl = new URL(event.request.url);

  // Skip caching for Supabase API calls or other external APIs
  // Adjust this condition if your Supabase URL or other API endpoints differ
  if (requestUrl.hostname.includes('supabase.co') || requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request)); // Network-only for API calls
    return;
  }

  // For navigation requests (e.g., direct URL entry, refresh on a sub-route)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/', { ignoreSearch: true });
      })
    );
    return;
  }

  // For all other GET requests (static assets: JS, CSS, images, etc.) 
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Serve from cache if available
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          if (event.request.destination === 'document' || event.request.mode === 'navigate') {
            return caches.match('/', { ignoreSearch: true });
          }
          return new Response('Offline content not available', { status: 503 });
        });
    })
  );
});