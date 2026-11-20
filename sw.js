// Service worker: "primero la red".
// Cada archivo se pide siempre al servidor comprobando si ha cambiado (así ves la versión nueva
// en cuanto se publica). Si no hay conexión, se usa la última copia guardada.

const CACHE = 'poker-poco-a-poco';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      // cache: 'no-cache' obliga a preguntar al servidor si el archivo ha cambiado.
      const res = await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  })());
});
