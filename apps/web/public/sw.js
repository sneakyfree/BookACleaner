// BookACleaner Service Worker
// Implements offline support and caching for PWA

const CACHE_NAME = 'bookacleaner-v1';
const STATIC_CACHE = 'bookacleaner-static-v1';
const DYNAMIC_CACHE = 'bookacleaner-dynamic-v1';

// Assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/login',
    '/register',
    '/offline',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
];

// API routes that should be cached with network-first strategy
const API_CACHE_ROUTES = [
    '/api/v1/cleaners',
    '/api/v1/properties',
    '/api/v1/jobs',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys()
            .then((keys) => {
                return Promise.all(
                    keys
                        .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                        .map((key) => {
                            console.log('[SW] Removing old cache:', key);
                            return caches.delete(key);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip WebSocket connections
    if (url.protocol === 'ws:' || url.protocol === 'wss:') {
        return;
    }

    // API requests - Network first, fallback to cache
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Static assets - Cache first
    if (isStaticAsset(url.pathname)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Pages - Stale while revalidate
    event.respondWith(staleWhileRevalidate(request));
});

// Cache first strategy
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        return caches.match('/offline');
    }
}

// Network first strategy
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        return new Response(
            JSON.stringify({ error: 'Offline', message: 'You are currently offline' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request) {
    const cached = await caches.match(request);

    const fetchPromise = fetch(request)
        .then((response) => {
            if (response.ok) {
                const cache = caches.open(DYNAMIC_CACHE);
                cache.then((c) => c.put(request, response.clone()));
            }
            return response;
        })
        .catch(() => null);

    return cached || fetchPromise || caches.match('/offline');
}

// Check if request is for a static asset
function isStaticAsset(pathname) {
    const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
    return staticExtensions.some((ext) => pathname.endsWith(ext));
}

// Push notification event
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    const data = event.data?.json() || {};
    const title = data.title || 'BookACleaner';
    const options = {
        body: data.body || 'You have a new notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: data.tag || 'default',
        data: data.data || {},
        actions: data.actions || [],
        vibrate: [100, 50, 100],
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');
    event.notification.close();

    const data = event.notification.data;
    let url = '/';

    if (data.type === 'job') {
        url = `/client/bookings/${data.jobId}`;
    } else if (data.type === 'message') {
        url = `/client/messages/${data.conversationId}`;
    } else if (data.type === 'verification') {
        url = '/cleaner/verification';
    }

    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then((windowClients) => {
                // Focus existing window or open new one
                for (const client of windowClients) {
                    if (client.url === url && 'focus' in client) {
                        return client.focus();
                    }
                }
                return clients.openWindow(url);
            })
    );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'sync-messages') {
        event.waitUntil(syncMessages());
    } else if (event.tag === 'sync-bookings') {
        event.waitUntil(syncBookings());
    }
});

async function syncMessages() {
    // Sync pending messages from IndexedDB
    console.log('[SW] Syncing messages...');
    // Implementation would read from IndexedDB and POST to API
}

async function syncBookings() {
    // Sync pending booking actions
    console.log('[SW] Syncing bookings...');
    // Implementation would read from IndexedDB and POST to API
}
