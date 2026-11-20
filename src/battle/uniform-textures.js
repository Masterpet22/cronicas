import { colorizeUniformPixels } from '../enemy-appearance.js?v=1.0.0';
import { rememberCombatTexture } from './combat-textures.js?v=1.0.0';

export const uniformAtlasKey = appearance => `enemy-uniform-${appearance.uniform.style}-${appearance.bodyType === 'female' ? 'female' : 'male'}`;

export function queueUniformTextures(scene, appearance) {
  if (!appearance?.uniform) return;
  const key = uniformAtlasKey(appearance);
  if (scene.textures.exists(key)) return;
  const path = `assets/modular/outfits/factions/${appearance.uniform.style}-${appearance.bodyType === 'female' ? 'female' : 'male'}`;
  scene.load.atlas(key, `${path}.png?v=1.0.0`, `${path}.json?v=1.0.0`);
}

export function composeUniformAtlas(scene, sourceKey, key, appearance) {
  const textures = scene.textures;
  if (typeof document === 'undefined' || !textures.exists(sourceKey) || !textures.exists(uniformAtlasKey(appearance))) return;
  rememberCombatTexture(scene, key);
  if (textures.exists(key)) return;
  const source = textures.get(sourceKey), uniform = textures.get(uniformAtlasKey(appearance));
  const base = source.getSourceImage();
  const canvas = document.createElement('canvas'); canvas.width = base.width; canvas.height = base.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(base, 0, 0);
  for (const id of uniform.getFrameNames()) {
    const target = source.get(id), from = uniform.get(id);
    const piece = document.createElement('canvas'); piece.width = target.cutWidth; piece.height = target.cutHeight;
    const p = piece.getContext('2d', { willReadFrequently: true });
    p.drawImage(uniform.getSourceImage(), from.cutX, from.cutY, from.cutWidth, from.cutHeight, 0, 0, piece.width, piece.height);
    const pixels = p.getImageData(0, 0, piece.width, piece.height);
    colorizeUniformPixels(pixels.data, appearance.uniform); p.putImageData(pixels, 0, 0);
    ctx.clearRect(target.cutX - 2, target.cutY - 2, target.cutWidth + 4, target.cutHeight + 4);
    ctx.drawImage(piece, target.cutX, target.cutY);
  }
  const atlas = textures.addCanvas(key, canvas);
  atlas.skinTone = source.skinTone;
  atlas.uniform = appearance.uniform;
  for (const id of source.getFrameNames()) {
    const f = source.get(id); atlas.add(id, 0, f.cutX, f.cutY, f.cutWidth, f.cutHeight);
  }
  atlas.setFilter(globalThis.Phaser?.Textures?.FilterMode?.LINEAR ?? 0);
}
