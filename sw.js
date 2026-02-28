const CACHE_NAME = 'apex-free-v2-idb';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './original_script.js',
    './idb_helper.js',
    './manifest.json',
    './icon-512.png',
    './icon-192.png',
    './splash-page.jpg',
    './icon-640.jpg',
    './tailwind.min.js',
    './lucide.min.js',
    './html2canvas.min.js',
    './leaflet.js',
    './leaflet.css'
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
