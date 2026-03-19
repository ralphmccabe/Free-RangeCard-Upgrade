const CACHE_NAME = 'range-card-v36-restore-environment';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './original_script.js',
    './manifest.json',
    './icon-512.png',
    './icon-192.png',
    './splash-page.jpg',
    './icon-640.jpg',
    './tailwind-prod.css',
    './lucide.min.js',
    './html2canvas.min.js',
    './idb_helper.js',
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;600;800&display=swap'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
