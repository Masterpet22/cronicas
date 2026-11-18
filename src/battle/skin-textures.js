import { colorizeSkinPixels, normalizeSkinTone } from "../skin-tones.js?v=0.135.0";

// Coincide con el borde extruido de scripts/pack-fighter-atlases.py.
const PADDING = 2;

export function colorizeFighterAtlas(scene, sourceKey, key, skinParts, selectedTone) {
  const textures = scene.textures;
  if (typeof document === "undefined" || textures.exists(key) || !textures.exists(sourceKey)) return;
  const original = textures.get(sourceKey);
  const source = original.getSourceImage();
  const tone = normalizeSkinTone(selectedTone);
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(source, 0, 0);
  for (const part of skinParts) {
    const frame = original.get(part);
    const x = frame.cutX - PADDING, y = frame.cutY - PADDING;
    const image = context.getImageData(x, y, frame.cutWidth + 2 * PADDING, frame.cutHeight + 2 * PADDING);
    colorizeSkinPixels(image.data, tone);
    context.putImageData(image, x, y);
  }
  const atlas = textures.addCanvas(key, canvas);
  atlas.skinTone = tone;
  for (const part of original.getFrameNames()) {
    const frame = original.get(part);
    atlas.add(part, 0, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight);
  }
  atlas.setFilter(globalThis.Phaser?.Textures?.FilterMode?.LINEAR ?? 0);
}
