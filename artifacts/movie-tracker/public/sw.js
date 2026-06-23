const CACHE_NAME = 'moviesync-v1';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => { if (e.request.url.includes('supabase') || e.request.url.includes('/api/')) { e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); } else { e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request))); } });
