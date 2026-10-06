import { FIGHTER_VIEWBOX, fighterPreviewSvg } from "./character.js?v=0.7.0";

// Resolución a la que se rasteriza el SVG (2x para que se vea nítido).
const TEXTURE_SCALE = 2;

function hashString(text) {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) + hash + text.charCodeAt(index)) >>> 0;
  return hash.toString(36);
}

function fighterSvg(appearance) {
  return fighterPreviewSvg(appearance, { shadow: false, scale: TEXTURE_SCALE });
}

export function fighterTextureKey(appearance) {
  return `fighter-${hashString(fighterSvg(appearance))}`;
}

// Encola en el loader de Phaser la textura del combatiente, generada con el
// mismo SVG que la vista previa del Dojo, para que ambos sean idénticos.
export function queueFighterTexture(scene, appearance) {
  const key = fighterTextureKey(appearance);
  if (scene.textures.exists(key)) return key;
  const svg = fighterSvg(appearance);
  const toBase64 = typeof btoa === "function" ? btoa : (text) => Buffer.from(text, "binary").toString("base64");
  const base64 = toBase64(unescape(encodeURIComponent(svg)));
  scene.load.image(key, `data:image/svg+xml;base64,${base64}`);
  return key;
}

export function createGeometricFighter(scene, x, y, appearance, flipped = false) {
  const key = fighterTextureKey(appearance);
  const shadow = scene.add.ellipse(x, y + 105, 142, 22, 0x000000, 0.38).setDepth(4);
  const body = scene.add.container(x, y).setDepth(6);
  if (flipped) body.setScale(-1, 1);
  // El origen coincide con el (0, 0) del SVG (centro del torso).
  const sprite = scene.add.image(0, 0, key)
    .setOrigin(-FIGHTER_VIEWBOX.x / FIGHTER_VIEWBOX.width, -FIGHTER_VIEWBOX.y / FIGHTER_VIEWBOX.height)
    .setScale(1 / TEXTURE_SCALE);
  body.add(sprite);
  return { shadow, body, head: body, targets: [body], layers: [sprite], sprite };
}

export function destroyFighter(fighter) {
  if (!fighter) return;
  fighter.shadow.destroy();
  [...new Set(fighter.targets || [fighter.body, fighter.head])].forEach((target) => target?.destroy(true));
}
