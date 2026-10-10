import { FIGHTER_VIEWBOX, fighterPreviewSvg } from "./character.js?v=0.20.0";

// Resolución a la que se rasteriza el SVG (2x para que se vea nítido).
const TEXTURE_SCALE = 2;
const MAN_SPRITE_SCALE = 0.13;
const MAN_SPRITE_Y_OFFSET = -39;
const MAN_SPRITE_ROOT = "assets/modular/man_sprites/runtime";

// Centros calibrados sobre un lienzo de 2048 x 2048 con origen en el centro.
// El orden z proviene del montaje visual aprobado en puppet-calibrator.html.
export const MAN_SPRITE_LAYERS = [
  { id: "pie_derecho", x: -165, y: 675, z: 0 },
  { id: "brazo_derecho", x: 136, y: -160, z: 1 },
  { id: "mano_derecha", x: -285, y: 195, z: 2 },
  { id: "muslo_izquierdo", x: 115, y: 225, z: 3 },
  { id: "torso", x: -41, y: -72.5, z: 4 },
  { id: "muslo_derecho", x: -90, y: 230, z: 5 },
  { id: "pie_izquierdo", x: 150, y: 660, z: 6 },
  { id: "pierna_derecha", x: -130, y: 480, z: 7 },
  { id: "pierna_izquierda", x: 145, y: 473, z: 8 },
  { id: "brazo_izquierdo", x: -218, y: -150, z: 9 },
  { id: "antebrazo_derecho", x: -295, y: 20, z: 10 },
  { id: "antebrazo_izquierdo", x: 260, y: -17, z: 11 },
  { id: "mano_izquierda", x: 335, y: 160, z: 12 },
  { id: "cabeza", x: 0, y: -440, z: 13 }
];

const MAN_SPRITE_BY_ID = Object.fromEntries(MAN_SPRITE_LAYERS.map((part) => [part.id, part]));

// Los nombres de algunos brazos exportados están cruzados. Estas cadenas se
// agrupan por el lado visual para que cada codo arrastre el antebrazo correcto.
const MAN_SPRITE_JOINTS = {
  neck: { x: 0, y: -292 },
  shoulderLeft: { x: -182, y: -295 },
  elbowLeft: { x: -280, y: -24 },
  wristLeft: { x: -294, y: 130 },
  shoulderRight: { x: 114, y: -295 },
  elbowRight: { x: 207, y: -43 },
  wristRight: { x: 299, y: 94 },
  hipLeft: { x: -92, y: 132 },
  kneeLeft: { x: -118, y: 380 },
  ankleLeft: { x: -143, y: 625 },
  hipRight: { x: 110, y: 132 },
  kneeRight: { x: 136, y: 374 },
  ankleRight: { x: 148, y: 618 }
};

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
    if (!scene.textures.exists(key)) scene.load.image(key, `${MAN_SPRITE_ROOT}/${id}.png?v=0.34.0`);
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
  return { shadow, body, head: body, targets: [body], layers: [sprite], sprite, joints: {} };
}

function createJoint(scene, parent, name, point, parentPoint = { x: 0, y: 0 }) {
  const joint = scene.add.container(point.x - parentPoint.x, point.y - parentPoint.y);
  joint.name = name;
  parent.add(joint);
  return joint;
}

function addPart(scene, parent, id, parentPoint = { x: 0, y: 0 }) {
  const part = MAN_SPRITE_BY_ID[id];
  const image = scene.add.image(part.x - parentPoint.x, part.y - parentPoint.y, manSpriteKey(id));
  image.name = id;
  parent.add(image);
  return image;
}

export function createPlayerFighter(scene, x, y, appearance) {
  if (appearance?.bodyType !== "male") return createGeometricFighter(scene, x, y, appearance, false);

  const shadow = scene.add.ellipse(x, y + 105, 158, 22, 0x000000, 0.4).setDepth(4);
  const body = scene.add.container(x, y).setDepth(6);
  const rig = scene.add.container(0, MAN_SPRITE_Y_OFFSET).setScale(MAN_SPRITE_SCALE);
  body.add(rig);
  const nearest = globalThis.Phaser?.Textures?.FilterMode?.NEAREST ?? 1;
  MAN_SPRITE_LAYERS.forEach(({ id }) => scene.textures.get(manSpriteKey(id)).setFilter(nearest));

  const joints = {};
  const layers = [];

  // Brazo del lado derecho de la pantalla: se dibuja detrás del torso.
  joints.shoulderRight = createJoint(scene, rig, "shoulderRight", MAN_SPRITE_JOINTS.shoulderRight);
  layers.push(addPart(scene, joints.shoulderRight, "brazo_derecho", MAN_SPRITE_JOINTS.shoulderRight));
  joints.elbowRight = createJoint(scene, joints.shoulderRight, "elbowRight", MAN_SPRITE_JOINTS.elbowRight, MAN_SPRITE_JOINTS.shoulderRight);
  layers.push(addPart(scene, joints.elbowRight, "antebrazo_izquierdo", MAN_SPRITE_JOINTS.elbowRight));
  joints.wristRight = createJoint(scene, joints.elbowRight, "wristRight", MAN_SPRITE_JOINTS.wristRight, MAN_SPRITE_JOINTS.elbowRight);
  layers.push(addPart(scene, joints.wristRight, "mano_izquierda", MAN_SPRITE_JOINTS.wristRight));

  // Pierna del lado derecho de la pantalla: queda detrás del torso.
  joints.hipRight = createJoint(scene, rig, "hipRight", MAN_SPRITE_JOINTS.hipRight);
  layers.push(addPart(scene, joints.hipRight, "muslo_izquierdo", MAN_SPRITE_JOINTS.hipRight));
  joints.kneeRight = createJoint(scene, joints.hipRight, "kneeRight", MAN_SPRITE_JOINTS.kneeRight, MAN_SPRITE_JOINTS.hipRight);
  layers.push(addPart(scene, joints.kneeRight, "pierna_izquierda", MAN_SPRITE_JOINTS.kneeRight));
  joints.ankleRight = createJoint(scene, joints.kneeRight, "ankleRight", MAN_SPRITE_JOINTS.ankleRight, MAN_SPRITE_JOINTS.kneeRight);
  layers.push(addPart(scene, joints.ankleRight, "pie_izquierdo", MAN_SPRITE_JOINTS.ankleRight));

  const torso = addPart(scene, rig, "torso");
  layers.push(torso);

  // Pierna del lado izquierdo de la pantalla: queda delante del torso.
  joints.hipLeft = createJoint(scene, rig, "hipLeft", MAN_SPRITE_JOINTS.hipLeft);
  layers.push(addPart(scene, joints.hipLeft, "muslo_derecho", MAN_SPRITE_JOINTS.hipLeft));
  joints.kneeLeft = createJoint(scene, joints.hipLeft, "kneeLeft", MAN_SPRITE_JOINTS.kneeLeft, MAN_SPRITE_JOINTS.hipLeft);
  layers.push(addPart(scene, joints.kneeLeft, "pierna_derecha", MAN_SPRITE_JOINTS.kneeLeft));
  joints.ankleLeft = createJoint(scene, joints.kneeLeft, "ankleLeft", MAN_SPRITE_JOINTS.ankleLeft, MAN_SPRITE_JOINTS.kneeLeft);
  layers.push(addPart(scene, joints.ankleLeft, "pie_derecho", MAN_SPRITE_JOINTS.ankleLeft));

  // Brazo del lado izquierdo de la pantalla: queda delante del torso.
  joints.shoulderLeft = createJoint(scene, rig, "shoulderLeft", MAN_SPRITE_JOINTS.shoulderLeft);
  layers.push(addPart(scene, joints.shoulderLeft, "brazo_izquierdo", MAN_SPRITE_JOINTS.shoulderLeft));
  joints.elbowLeft = createJoint(scene, joints.shoulderLeft, "elbowLeft", MAN_SPRITE_JOINTS.elbowLeft, MAN_SPRITE_JOINTS.shoulderLeft);
  layers.push(addPart(scene, joints.elbowLeft, "antebrazo_derecho", MAN_SPRITE_JOINTS.elbowLeft));
  joints.wristLeft = createJoint(scene, joints.elbowLeft, "wristLeft", MAN_SPRITE_JOINTS.wristLeft, MAN_SPRITE_JOINTS.elbowLeft);
  layers.push(addPart(scene, joints.wristLeft, "mano_derecha", MAN_SPRITE_JOINTS.wristLeft));

  joints.neck = createJoint(scene, rig, "neck", MAN_SPRITE_JOINTS.neck);
  const head = addPart(scene, joints.neck, "cabeza", MAN_SPRITE_JOINTS.neck);
  layers.push(head);

  return { shadow, body, head, rig, joints, targets: [body], layers, sprite: torso };
}

export function destroyFighter(fighter) {
  if (!fighter) return;
  fighter.shadow.destroy();
  [...new Set(fighter.targets || [fighter.body, fighter.head])].forEach((target) => target?.destroy(true));
}
