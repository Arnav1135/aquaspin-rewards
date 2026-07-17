const CACHE_NAME = 'candy-crunch-v1';
const ASSETS = [
  './index.html',
  './src/styles/main.css',
  './src/main.js',
  './src/data/levels.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
