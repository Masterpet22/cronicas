const CACHE_NAME = "cronicas-assets-v0.44.8";

// La instalación no descarga imágenes. Precargar todos los escenarios, marcos y
// piezas del personaje competía con Phaser y podía dejar el combate esperando.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("cronicas-assets-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || request.mode === "navigate") return;
  if (!/\.(?:css|js|svg|png|webp|woff2|jpg|jpeg)$/.test(url.pathname)) return;

  const responsePromise = caches.open(CACHE_NAME).then(async (cache) => {
    const cached = await cache.match(request);
    if (cached) return { response: cached, cacheWrite: Promise.resolve() };

    const response = await fetch(request);
    const cacheWrite = response.ok
      ? cache.put(request, response.clone())
      : Promise.resolve();
    return { response, cacheWrite };
  });

  // Una URL versionada ya almacenada no vuelve a tocar la red. En la primera
  // visita, la copia se guarda en segundo plano sin retrasar la respuesta.
  event.respondWith(responsePromise.then(({ response }) => response));
  event.waitUntil(responsePromise.then(({ cacheWrite }) => cacheWrite).catch(() => undefined));
});
