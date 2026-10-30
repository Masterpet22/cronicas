import { colorizeSkinPixels, normalizeSkinTone } from "../skin-tones.js?v=0.119.0";

// Cada tono tiene su propia textura. Pintar a un actor no modifica al rival
// ni a otra escena que reutilice el mismo cuerpo o las imágenes originales.
export function colorizeFighterTextures(scene, keys, selectedTone) {
  if (typeof document === "undefined" || typeof scene.textures.addCanvas !== "function") return;
  const tone = normalizeSkinTone(selectedTone);
  for (const key of keys) {
    if (!scene.textures.exists(key)) continue;
    const texture = scene.textures.get(key);
    if (texture.skinTone === tone) continue;
    const source = texture.getSourceImage?.();
    if (!source?.width || !source?.height) continue;
    const canvas = document.createElement("canvas");
    canvas.width = source.width; canvas.height = source.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(source, 0, 0);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    colorizeSkinPixels(image.data, tone);
    context.putImageData(image, 0, 0);
    scene.textures.remove(key);
    scene.textures.addCanvas(key, canvas).skinTone = tone;
  }
}
