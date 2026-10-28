import assert from "node:assert/strict";
import {
  PROCESSED_ICON_CACHE_LIMIT,
  clearProcessedIconCache,
  createCachedIconCanvas,
  processedIconCacheSize
} from "../src/battle/icon-canvas-cache.js";

let readbacks = 0;
let frequentReadContexts = 0;

class FakeContext {
  constructor(options) {
    if (options?.willReadFrequently) frequentReadContexts += 1;
  }
  drawImage() {}
  clearRect() {}
  getImageData(_x, _y, width, height) {
    readbacks += 1;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let index = 3; index < data.length; index += 4) data[index] = 255;
    return { data };
  }
  putImageData() {}
}

class FakeCanvas {
  getContext(_type, options) {
    if (!this.context) this.context = new FakeContext(options);
    return this.context;
  }
}

const originalDocument = globalThis.document;
globalThis.document = { createElement: (tag) => tag === "canvas" ? new FakeCanvas() : null };

try {
  let destroyCache;
  const owner = { events: { once(event, callback) { assert.equal(event, "destroy"); destroyCache = callback; } } };
  const source = { width: 64, height: 48 };
  const first = createCachedIconCanvas(owner, source, { textureKey: "strike", tint: [209, 162, 91] });
  const second = createCachedIconCanvas(owner, source, { textureKey: "strike", tint: [209, 162, 91] });
  assert.notEqual(first, second, "Cada botón debe recibir su propio nodo canvas");
  assert.equal(readbacks, 2, "Recorte y tinte deben leer píxeles solo durante el primer procesamiento");
  assert.equal(frequentReadContexts, 1, "El contexto que lee píxeles debe declarar willReadFrequently");
  assert.equal(processedIconCacheSize(owner), 1);

  createCachedIconCanvas(owner, source, { textureKey: "strike", tint: [166, 65, 45] });
  assert.equal(readbacks, 4, "Cambiar el tinte debe invalidar la variante procesada");
  createCachedIconCanvas(owner, { width: 64, height: 48 }, { textureKey: "strike", tint: [166, 65, 45] });
  assert.equal(readbacks, 6, "Cambiar la imagen fuente debe invalidar la variante procesada");

  clearProcessedIconCache(owner);
  assert.equal(processedIconCacheSize(owner), 0);

  const limitedOwner = { events: { once(_event, callback) { destroyCache = callback; } } };
  for (let index = 0; index <= PROCESSED_ICON_CACHE_LIMIT; index += 1) {
    createCachedIconCanvas(limitedOwner, { width: 32, height: 32 }, { textureKey: `icon-${index}` });
  }
  assert.equal(processedIconCacheSize(limitedOwner), PROCESSED_ICON_CACHE_LIMIT, "La caché debe expulsar la variante menos reciente");
  destroyCache();
  assert.equal(processedIconCacheSize(limitedOwner), 0, "Destruir la instancia propietaria debe liberar las plantillas procesadas");
} finally {
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
}

console.log("Caché de iconos Canvas verificada.");
