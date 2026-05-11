/* TRC-FREE-VERSION - v4.9-STABLE */
const CACHE_NAME = 'trc-free-v4.9';
const ASSETS = [
    './',
    './index.html?v=4.9',
    './style.css?v=1.5',
    './original_script.js?v=4.9',
    './manifest.json',
    './icon-512.png',
    './icon-192.png',
    './splash-page.jpg',
    './Screenshot_13-2-2026_35249_.jpeg',
    './tailwind-prod.css',
    './lucide.min.js?v=1.5',
    './html2canvas.min.js?v=1.5',
    './idb_helper.js?v=1.5',
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;600;800&display=swap'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Caching New Version:', CACHE_NAME);
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => {
                    console.log('[SW] Deleting Old Cache:', key);
                    return caches.delete(key);
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});