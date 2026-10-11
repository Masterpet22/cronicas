// Trabajador de retirada: elimina las cachés creadas por versiones anteriores y
// se desregistra. Se conserva temporalmente en esta ruta para actualizar a los
// navegadores que todavía tienen un service worker antiguo activo.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("cronicas-assets-"))
        .map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => Promise.all(clients.map((client) => client.navigate(client.url))))
  );
});
