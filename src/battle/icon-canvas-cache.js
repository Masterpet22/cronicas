const DEFAULT_SIZE = 192;
const DEFAULT_PADDING = 8;
export const PROCESSED_ICON_CACHE_LIMIT = 24;

const caches = new WeakMap();
const sourceIds = new WeakMap();
let nextSourceId = 1;

function sourceId(source) {
  if (!sourceIds.has(source)) sourceIds.set(source, nextSourceId++);
  return sourceIds.get(source);
}

function cacheFor(owner) {
  let cache = caches.get(owner);
  if (cache) return cache;
  cache = new Map();
  caches.set(owner, cache);
  owner?.events?.once?.("destroy", () => clearProcessedIconCache(owner));
  return cache;
}

function cloneCanvas(source) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  canvas.getContext("2d")?.drawImage(source, 0, 0);
  return canvas;
}

function processIcon(source, { size, padding, tint }) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  if (!width || !height) return null;
  const scale = Math.min(size / width, size / height);
  const offsetX = (size - width * scale) / 2;
  const offsetY = (size - height * scale) / 2;
  context.drawImage(source, offsetX, offsetY, width * scale, height * scale);
  const alpha = context.getImageData(0, 0, size, size).data;
  let left = size, top = size, right = -1, bottom = -1;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (alpha[(row * size + col) * 4 + 3] > 8) {
        left = Math.min(left, col); right = Math.max(right, col);
        top = Math.min(top, row); bottom = Math.max(bottom, row);
      }
    }
  }
  if (right >= left && bottom >= top) {
    const cropWidth = (right - left + 1) / scale;
    const cropHeight = (bottom - top + 1) / scale;
    const fit = Math.min((size - padding) / cropWidth, (size - padding) / cropHeight);
    context.clearRect(0, 0, size, size);
    context.drawImage(source, Math.max(0, (left - offsetX) / scale), Math.max(0, (top - offsetY) / scale), cropWidth, cropHeight,
      (size - cropWidth * fit) / 2, (size - cropHeight * fit) / 2, cropWidth * fit, cropHeight * fit);
  }
  if (tint) {
    const pixels = context.getImageData(0, 0, size, size);
    for (let pixel = 0; pixel < pixels.data.length; pixel += 4) {
      for (let channel = 0; channel < 3; channel += 1) pixels.data[pixel + channel] *= tint[channel] / 255;
    }
    context.putImageData(pixels, 0, 0);
  }
  return canvas;
}

export function createCachedIconCanvas(owner, source, {
  textureKey = "unknown", size = DEFAULT_SIZE, padding = DEFAULT_PADDING, tint = null
} = {}) {
  if (!owner || !source) return null;
  const cache = cacheFor(owner);
  const tintKey = tint?.join("-") || "none";
  const key = `${textureKey}|${sourceId(source)}|${size}|${padding}|${tintKey}`;
  let template = cache.get(key);
  if (template) {
    cache.delete(key);
    cache.set(key, template);
    return cloneCanvas(template);
  }
  template = processIcon(source, { size, padding, tint });
  if (!template) return null;
  cache.set(key, template);
  while (cache.size > PROCESSED_ICON_CACHE_LIMIT) cache.delete(cache.keys().next().value);
  return cloneCanvas(template);
}

export function clearProcessedIconCache(owner) {
  const cache = caches.get(owner);
  cache?.clear();
  caches.delete(owner);
}

export function processedIconCacheSize(owner) {
  return caches.get(owner)?.size || 0;
}
