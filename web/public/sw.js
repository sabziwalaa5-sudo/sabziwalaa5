// Cache version — bump this string on every release to force all clients to update
const CACHE_VERSION = 'sabjiwala-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// Only pre-cache truly static offline-required assets (NOT the HTML page itself)
const PRECACHE_ASSETS = [
  '/manifest.json'
];

// ─── Install: precache offline assets & skip waiting immediately ──────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Take control immediately without waiting for old SW to finish
  self.skipWaiting();
});

// ─── Activate: delete ALL old versioned caches ────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Claim all open clients so they get the new SW without a reload
      return self.clients.claim();
    })
  );
});

// ─── Fetch: Network-first for HTML pages, Cache-first for static assets ───────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin && !url.hostname.includes('unpkg.com')) return;

  // Always fetch HTML navigation requests fresh from network (never serve stale HTML)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // For Next.js hashed static assets: cache-first (they are content-addressed)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // For all other requests: network first, fall back to cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
