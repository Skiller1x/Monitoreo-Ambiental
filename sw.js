// ================================================================
//  SERVICE WORKER — CHPT-W3Y
//  Fase 1: cache básico para que la app sea instalable.
//  Fase 2 (futuro): push notifications.
// ================================================================

const CACHE_NAME = 'chpt-w3y-v1';

const ARCHIVOS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Instalar: guardar archivos en caché
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ARCHIVOS))
  );
  self.skipWaiting();
});

// Activar: limpiar cachés viejos
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first (siempre intenta datos frescos, caché como respaldo)
self.addEventListener('fetch', (e) => {
  // Solo interceptar peticiones al mismo origen
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Guardar respuesta fresca en caché
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request)) // Sin red → usar caché
  );
});
