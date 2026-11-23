// Star Chemical - Service Worker
// Si cambias archivos de la app, sube el número de versión para renovar la caché.
const CACHE = 'starchemical-v5';
const ASSETS = [
  './', './index.html', './script.js', './manifest.json',
  './css/tarjeta.css', './css/layout.css',
  './js/tarjeta.js', './js/layout.js',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png',
  'https://code.jquery.com/jquery-3.7.1.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Open+Sans:wght@400;600&display=swap'
];
const CDN_HOSTS = ['code.jquery.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    // Archivo por archivo: si alguno falta, el service worker igual se instala
    caches.open(CACHE)
      .then((c) => Promise.allSettled(ASSETS.map((f) => c.add(f))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Páginas: primero red (versión nueva); sin internet, la copia guardada
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./').then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Solo se guarda lo propio y las librerías/fuentes; las imágenes externas pasan directo
  if (!(url.origin === self.location.origin || CDN_HOSTS.includes(url.hostname))) return;

  e.respondWith(
    caches.match(req).then((cached) => {
      const red = fetch(req)
        .then((res) => {
          if (res && (res.status === 200 || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || red;
    })
  );
});