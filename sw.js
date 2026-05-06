// ── Al-Noor Service Worker ─────────────────────────────────────────────────
const CACHE_VERSION = 'al-noor-v1.2.0';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const API_CACHE     = `${CACHE_VERSION}-api`;
const FONT_CACHE    = `${CACHE_VERSION}-fonts`;

const STATIC_ASSETS = [
  './',
  'index.html',
  'quran.css',
  'quran.js',
  'pwa.js',
  'manifest.json',
  'offline.html',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

const API_PATTERNS = [
  'api.alquran.cloud',
  'cdn.jsdelivr.net/gh/fawazahmed0/hadith-api',
  'api.aladhan.com'
];

const FONT_PATTERNS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

// ── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        return Promise.allSettled(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(err => console.warn('[SW] Failed to cache:', url, err))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('al-noor-') && !key.startsWith(CACHE_VERSION))
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // Font requests: Cache-First
  if (FONT_PATTERNS.some(p => url.hostname.includes(p))) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  // API requests: Network-First
  if (API_PATTERNS.some(p => request.url.includes(p))) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // App Shell / Local Assets: Stale-While-Revalidate
  // This is better than Cache-First for preventing "stuck in offline" issues
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // Everything else: Network-First
  event.respondWith(networkFirst(request, STATIC_CACHE));
});

// ── Strategies ──────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
        const offline = await caches.match('offline.html');
        return offline;
    }
    return new Response(JSON.stringify({ error: 'Offline' }), { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || await networkPromise || caches.match('offline.html');
}

// ── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'Time for prayer 🕌',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-96.png',
    vibrate: [200, 100, 200]
  };
  event.waitUntil(self.registration.showNotification(data.title || 'Al-Noor', options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('./'));
});
