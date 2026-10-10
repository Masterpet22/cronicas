import { FIGHTER_VIEWBOX, fighterPreviewSvg } from "./character.js?v=0.20.0";

// Resolución a la que se rasteriza el SVG (2x para que se vea nítido).
const TEXTURE_SCALE = 2;
const MAN_SPRITE_SCALE = 0.13;
const MAN_SPRITE_Y_OFFSET = -39;
const MAN_SPRITE_ROOT = "assets/modular/man_sprites/runtime";

// Centros recuperados del lienzo original de 2048 x 2048. El orden conserva
// las extremidades lejanas detrás del torso y las cercanas por delante.
export const MAN_SPRITE_LAYERS = [
  { id: "pie_derecho", x: -215, y: 906 },
  { id: "pierna_derecha", x: -179.5, y: 688.5 },
  { id: "muslo_derecho", x: -128, y: 347.5 },
  { id: "brazo_derecho", x: 338, y: -185, dx: -12 },
  { id: "antebrazo_derecho", x: -522, y: 86.5, dx: 12 },
  { id: "mano_derecha", x: -491, y: 306.5, dx: 14 },
  { id: "torso", x: -41, y: -72.5 },
  { id: "muslo_izquierdo", x: 141, y: 348 },
  { id: "pierna_izquierda", x: 146, y: 681 },
  { id: "pie_izquierdo", x: 148.5, y: 897 },
  { id: "brazo_izquierdo", x: -430, y: -190.5, dx: 12 },
  { id: "antebrazo_izquierdo", x: 486.5, y: 45.5, dx: -12 },
  { id: "mano_izquierda", x: 578.5, y: 276, dx: -16 },
  { id: "cabeza", x: -5, y: -574 }
];

function manSpriteKey(id) {
  return `player-man-${id}`;
}

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

export function queuePlayerFighterTextures(scene, appearance) {
  if (appearance?.bodyType !== "male") {
    queueFighterTexture(scene, appearance);
    return "geometric";
  }
  MAN_SPRITE_LAYERS.forEach(({ id }) => {
    const key = manSpriteKey(id);
    if (!scene.textures.exists(key)) scene.load.image(key, `${MAN_SPRITE_ROOT}/${id}.png?v=0.32.0`);
  });
  return "modular";
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

export function createPlayerFighter(scene, x, y, appearance) {
  if (appearance?.bodyType !== "male") return createGeometricFighter(scene, x, y, appearance, false);

  const shadow = scene.add.ellipse(x, y + 105, 158, 22, 0x000000, 0.4).setDepth(4);
  const body = scene.add.container(x, y).setDepth(6);
  const nearest = globalThis.Phaser?.Textures?.FilterMode?.NEAREST ?? 1;
  const layers = MAN_SPRITE_LAYERS.map(({ id, x: sourceX, y: sourceY, dx = 0, dy = 0 }) => {
    const key = manSpriteKey(id);
    scene.textures.get(key).setFilter(nearest);
    const layer = scene.add.image(
      sourceX * MAN_SPRITE_SCALE + dx,
      sourceY * MAN_SPRITE_SCALE + MAN_SPRITE_Y_OFFSET + dy,
      key
    ).setScale(MAN_SPRITE_SCALE);
    body.add(layer);
    return layer;
  });
  return { shadow, body, head: body, targets: [body], layers, sprite: layers.find((layer) => layer.texture.key === manSpriteKey("torso")) };
}

export function destroyFighter(fighter) {
  if (!fighter) return;
  fighter.shadow.destroy();
  [...new Set(fighter.targets || [fighter.body, fighter.head])].forEach((target) => target?.destroy(true));
}
