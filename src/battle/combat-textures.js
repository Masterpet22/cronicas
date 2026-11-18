const caches = new WeakMap();

export function rememberCombatTexture(scene, key, animation = null) {
  const textures = scene.textures;
  let cache = caches.get(textures);
  if (!cache) {
    cache = { entries: new Map(), used: new Set() };
    caches.set(textures, cache);
  }
  cache.entries.set(key, animation);
  cache.used.add(key);
}

// El juego conserva los recursos del último recorrido para una entrada en caliente.
// Solo se ejecuta con las escenas detenidas, incluidas las que comparten animaciones.
export function trimParkedCombatTextures(game) {
  const cache = caches.get(game.textures);
  if (!cache?.used.size) return;
  for (const [key, animation] of cache.entries) {
    if (cache.used.has(key)) continue;
    if (animation && game.anims.exists(animation)) game.anims.remove(animation);
    if (game.textures.exists(key)) game.textures.remove(key);
    cache.entries.delete(key);
  }
  cache.used.clear();
}
