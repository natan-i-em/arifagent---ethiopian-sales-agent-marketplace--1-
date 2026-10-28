// Azwari Production Service Worker (PWA)
const CACHE_NAME = 'azwari-pwa-v1';
const OFFLINE_URL = '/offline';

const PRECACHE_ASSETS = [
  '/',
  OFFLINE_URL,
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/icon.svg',
];

// 1. Install & Precache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[Azwari SW] Precache partial error:', err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Activate & Clean Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore non-GET and browser-internal requests
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);

  // CRITICAL SECURITY RULE: Never cache backend API calls, payment webhooks, or Supabase Auth
  if (
    url.pathname.startsWith('/api') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('chapa.co') ||
    url.pathname.includes('/auth') ||
    url.pathname.includes('/wallet')
  ) {
    return; // Pass through straight to network
  }

  // A. Navigation / Page Requests (Network First, fallback to Cache, fallback to Offline page)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const offlineFallback = await caches.match(OFFLINE_URL);
          return offlineFallback || new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // B. Static Assets: Fonts, Images, CSS, JS (Stale-While-Revalidate)
  const isStatic =
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff|woff2|ttf|ico)$/) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});

// 4. Push Notification Support (Optional future activation)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const title = payload.title || 'Azwari Notification';
    const options = {
      body: payload.body || 'You have an update in Azwari.',
      icon: '/icon-192x192.png',
      badge: '/favicon-32x32.png',
      data: payload.url || '/',
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.warn('[Azwari SW] Push parsing error:', e);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
