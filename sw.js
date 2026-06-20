// ================================================================
//  SERVICE WORKER — CHPT-W3Y
//  Fase 1: cache básico para que la app sea instalable.
//  Fase 2: push notifications.
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

// ================================================================
//  EVENTO PUSH — llega cuando el servidor manda una notificación
// ================================================================
self.addEventListener('push', (e) => {
  // El payload viene como JSON: { titulo, mensaje }
  let titulo  = 'CHPT-W3Y';
  let mensaje = '⚠️HUMO DETECTADO⚠️';

  if (e.data) {
    try {
      const data = e.data.json();
      titulo  = data.titulo  || titulo;
      mensaje = data.mensaje || mensaje;
    } catch { /* Si el JSON falla, usamos los valores por defecto */ }
  }

  e.waitUntil(
    self.registration.showNotification(titulo, {
      body:    mensaje,
      icon:    '/icon-192.png',
      badge:   '/icon-192.png',   // Ícono pequeño en la barra de Android
      vibrate: [200, 100, 200],   // Patrón de vibración en milisegundos
      tag:     'chpt-alerta',     // Si llega otra notif antes de abrir esta,
                                  // la reemplaza en vez de apilarlas
    })
  );
});

// ================================================================
//  EVENTO NOTIFICATIONCLICK — cuando el usuario toca la notificación
// ================================================================
self.addEventListener('notificationclick', (e) => {
  e.notification.close(); // Cierra la notificación

  // Abre la app (o enfoca la pestaña si ya está abierta)
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
      if (lista.length > 0) return lista[0].focus();
      return clients.openWindow('/');
    })
  );
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