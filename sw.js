const CACHE_NAME = "cronicas-assets-v0.37.0";
const CORE_ASSETS = [
  "./desktop.css?v=0.23.0",
  "./assets/vendor/phaser-3.90.0.min.js",
  "./assets/fonts/cinzel-latin-700.woff2",
  "./assets/fonts/alegreya-sans-latin-400.woff2",
  "./assets/favicon.png?v=0.20.0",
  "./assets/village/aldea.webp?v=0.20.0",
  "./assets/locations/battle-dusk-pass.jpg?v=0.20.0",
  "./assets/ui/panel-frame.webp?v=0.20.0",
  "./assets/ui/nav-button-frame.webp?v=0.20.0",
  "./assets/ui/card-frame.webp?v=0.20.0",
  "./assets/ui/action-button-frame.webp?v=0.20.0",
  "./assets/ui/equipment-slot-frame.webp?v=0.20.0",
  "./assets/ui/hud-frame.webp?v=0.20.0",
  "./assets/ui/battle-hud-overlay-v1.png?v=0.30.0",
  "./assets/modular/man_sprites/runtime/antebrazo_derecho.png?v=0.32.0",
  "./assets/modular/man_sprites/runtime/antebrazo_izquierdo.png?v=0.32.0",
  "./assets/modular/man_sprites/runtime/brazo_derecho.png?v=0.32.0",
  "./assets/modular/man_sprites/runtime/brazo_izquierdo.png?v=0.32.0",
  "./assets/modular/man_sprites/runtime/cabeza.png?v=0.32.0",
  "./assets/modular/man_sprites/runtime/mano_derecha.png?v=0.32.0",
  "./assets/modular/man_sprites/runtime/mano_izquierda.png?v=0.32.0",
  "./assets/modular/man_sprites/runtime/muslo_derecho.png?v=0.32.0",
  "./assets/modular/man_sprites/runtime/muslo_izquierdo.png?v=0.32.0",
  "./assets/modular/man_sprites/runtime/pie_derecho.png?v=0.32.0",
  "./assets/modular/man_sprites/runtime/pie_izquierdo.png?v=0.32.0",
  "./assets/modular/man_sprites/runtime/pierna_derecha.png?v=0.32.0",
  "./assets/modular/man_sprites/runtime/pierna_izquierda.png?v=0.32.0",
  "./assets/modular/man_sprites/runtime/torso.png?v=0.32.0"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
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
  if (!/\.(?:css|js|png|webp|woff2|jpg|jpeg)$/.test(url.pathname)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
