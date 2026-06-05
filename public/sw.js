// BUILD_TIME is replaced with a Unix timestamp by the Vite build plugin.
// In dev mode the literal string is used, which is fine.
const CACHE_NAME  = 'adslife-__BUILD_TIME__';
const API_CACHE   = 'adslife-api-__BUILD_TIME__';
const STATIC_ASSETS = ['/', '/index.html'];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME && k !== API_CACHE).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — Network First for API, Cache First for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Let Vite dev-server internal requests pass through unmodified
  if (url.pathname.startsWith('/@') || url.pathname.startsWith('/node_modules')) return;

  // Only intercept same-origin requests
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/backend/')) {
    // Network first for API calls
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && event.request.method === 'GET') {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((r) => r ?? new Response('', { status: 503 }))
        )
    );
  } else if (event.request.method === 'GET') {
    // Cache first for static GET requests only
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 503 }))
      )
    );
  }
});
