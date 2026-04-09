// Service Worker for EGOS Inteligência PWA
// Version: 2.0.0

const CACHE_NAME = 'egos-inteligencia-v2';
const STATIC_ASSETS = [
  '/',
  '/chat',
  '/dashboard',
  '/osint',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.error('[SW] Cache failed:', err);
      })
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { pathname } = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip API calls - always go to network
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return;
  }
  
  // Cache strategy: Stale-while-revalidate for static assets
  event.respondWith(
    caches.match(request)
      .then((cached) => {
        if (cached) {
          // Return cached version immediately
          // But also fetch fresh version in background
          fetch(request)
            .then((response) => {
              if (response.ok) {
                caches.open(CACHE_NAME)
                  .then((cache) => cache.put(request, response));
              }
            })
            .catch(() => {}); // Ignore network errors
          
          return cached;
        }
        
        // Not in cache - fetch from network
        return fetch(request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, responseToCache));
            
            return response;
          })
          .catch((err) => {
            console.error('[SW] Fetch failed:', err);
            // Could return offline fallback here
            throw err;
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Sync offline data with server
  // This would be implemented with IndexedDB/RxDB
  console.log('[SW] Syncing data...');
}

// Push notifications (for future implementation)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  const title = 'EGOS Inteligência';
  const options = {
    body: event.data?.text() || 'Nova atualização disponível',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: 'egos-notification',
    requireInteraction: true,
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event);
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/dashboard')
  );
});
