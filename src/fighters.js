import { FIGHTER_VIEWBOX, fighterPreviewSvg } from "./character.js?v=0.20.0";
import { DEFAULT_IDLE_CLIP } from "./animations/clips.js?v=0.40.0";
import { createPuppetAnimationController } from "./animations/controller.js?v=0.40.0";

// Resolución a la que se rasteriza el SVG (2x para que se vea nítido).
const TEXTURE_SCALE = 2;
const MAN_SPRITE_SCALE = 0.13;
const MAN_SPRITE_Y_OFFSET = -39;
export const MAN_SPRITE_SHADOW_OFFSET = 60;
const MAN_SPRITE_ROOT = "assets/modular/man_sprites/runtime";

// Centros calibrados sobre un lienzo de 2048 x 2048 con origen en el centro.
// El orden z proviene del montaje visual aprobado en puppet-calibrator.html.
export const MAN_SPRITE_LAYERS = [
  { id: "pie_derecho", x: -175.526, y: 732.316, z: 0 },
  { id: "brazo_izquierdo", assetId: "brazo_derecho", x: 161.481, y: -174.474, z: 1 },
  { id: "mano_derecha", x: -291.203, y: 251.237, z: 2 },
  { id: "muslo_izquierdo", x: 117.315, y: 255.895, z: 3 },
  { id: "torso", x: -41, y: -72.5, z: 4 },
  { id: "muslo_derecho", x: -93.789, y: 261.869, z: 5 },
  { id: "pie_izquierdo", x: 153.763, y: 715.421, z: 6 },
  { id: "pierna_derecha", x: -140.026, y: 527.974, z: 7 },
  { id: "pierna_izquierda", x: 151.263, y: 520.474, z: 8 },
  { id: "brazo_derecho", assetId: "brazo_izquierdo", x: -242.955, y: -164.184, z: 9 },
  { id: "antebrazo_derecho", x: -315.639, y: 62.658, z: 10 },
  { id: "antebrazo_izquierdo", x: 278.403, y: 24.447, z: 11 },
  { id: "mano_izquierda", x: 355.423, y: 215.474, z: 12 },
  { id: "cabeza", x: -10.737, y: -498.684, z: 13 }
];

const MAN_SPRITE_BY_ID = Object.fromEntries(MAN_SPRITE_LAYERS.map((part) => [part.id, part]));

// Los lados se nombran desde la perspectiva anatómica del personaje, no desde
// la pantalla. Su lado derecho queda delante (a la izquierda de la imagen).
export const MAN_SPRITE_JOINTS = {
  neck: { x: 0, y: -315 },
  shoulderRight: { x: -207, y: -310 },
  elbowRight: { x: -305, y: -38 },
  wristRight: { x: -304, y: 169 },
  shoulderLeft: { x: 139, y: -310 },
  elbowLeft: { x: 232, y: -57 },
  wristLeft: { x: 319, y: 134 },
  hipRight: { x: -94, y: 142 },
  kneeRight: { x: -124, y: 407 },
  ankleRight: { x: -153, y: 674 },
  hipLeft: { x: 112, y: 142 },
  kneeLeft: { x: 139, y: 401 },
  ankleLeft: { x: 151, y: 670 }
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
  MAN_SPRITE_LAYERS.forEach(({ id, assetId = id }) => {
    const key = manSpriteKey(id);
    if (!scene.textures.exists(key)) scene.load.image(key, `${MAN_SPRITE_ROOT}/${assetId}.png?v=0.40.0`);
  });
  return "modular";
}

export function createGeometricFighter(scene, x, y, appearance, flipped = false) {
  const key = fighterTextureKey(appearance);
  const shadow = scene.add.ellipse(x, y + 50, 142, 22, 0x000000, 0.38).setDepth(4);
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

function tweenFinished(scene, config) {
  return new Promise((resolve) => {
    scene.tweens.add({ ...config, onComplete: resolve });
  });
}

export function startPlayerBreathing(scene, fighter) {
  if (!fighter?.rig || fighter.animations?.clipId === DEFAULT_IDLE_CLIP) return;
  fighter.animations ||= createPuppetAnimationController(scene, fighter);
  fighter.animations.loop(DEFAULT_IDLE_CLIP);
  // Alias temporal para mantener compatibilidad mientras carrera y ataques
  // terminan de migrarse al nuevo controlador.
  fighter.breathingTweens = [...fighter.animations.tweens];
}

export function stopPlayerBreathing(fighter) {
  if (!fighter?.rig) return;
  if (fighter.animations?.state === "idle") fighter.animations.stop({ reset: true });
  fighter.breathingTweens = [];
}

export function startPlayerGuard(scene, fighter) {
  if (!fighter?.animations) return false;
  stopPlayerBreathing(fighter);
  return fighter.animations.loop("guard-hold", { force: true });
}

export function stopPlayerGuard(scene, fighter) {
  if (!fighter?.animations) return;
  if (["guard-hold", "guard-impact"].includes(fighter.animations.clipId)) fighter.animations.stop({ reset: true });
  startPlayerBreathing(scene, fighter);
}

export async function playPlayerDamageReaction(scene, fighter, { guarded = false, heavy = false } = {}) {
  if (!fighter?.animations) return false;
  stopPlayerBreathing(fighter);
  const clipId = guarded ? "guard-impact" : heavy ? "hit-heavy" : "hit-light";
  const completed = await fighter.animations.playOnce(clipId, { force: true });
  if (guarded) startPlayerGuard(scene, fighter);
  else startPlayerBreathing(scene, fighter);
  return completed;
}

export function startPlayerRunning(scene, fighter) {
  if (!fighter || fighter.runningTweens?.length) return;
  stopPlayerBreathing(fighter);
  if (!fighter.joints?.hipLeft) {
    fighter.runningTweens = [scene.tweens.add({ targets: fighter.body, y: fighter.body.y - 3, duration: 170, yoyo: true, repeat: -1, ease: "Sine.inOut" })];
    return;
  }
  const stride = { duration: 180, yoyo: true, repeat: -1, ease: "Sine.inOut" };
  fighter.joints.hipLeft.setAngle(-24);
  fighter.joints.hipRight.setAngle(24);
  fighter.joints.kneeLeft.setAngle(7);
  fighter.joints.kneeRight.setAngle(30);
  fighter.joints.ankleLeft.setAngle(-7);
  fighter.joints.ankleRight.setAngle(8);
  fighter.joints.shoulderLeft.setAngle(21);
  fighter.joints.shoulderRight.setAngle(-21);
  fighter.joints.elbowLeft.setAngle(-12);
  fighter.joints.elbowRight.setAngle(12);
  fighter.runningTweens = [
    scene.tweens.add({ ...stride, targets: fighter.joints.hipLeft, angle: 24 }),
    scene.tweens.add({ ...stride, targets: fighter.joints.hipRight, angle: -24 }),
    scene.tweens.add({ ...stride, targets: fighter.joints.kneeLeft, angle: 30 }),
    scene.tweens.add({ ...stride, targets: fighter.joints.kneeRight, angle: 7 }),
    scene.tweens.add({ ...stride, targets: fighter.joints.ankleLeft, angle: 8 }),
    scene.tweens.add({ ...stride, targets: fighter.joints.ankleRight, angle: -7 }),
    scene.tweens.add({ ...stride, targets: fighter.joints.shoulderLeft, angle: -21 }),
    scene.tweens.add({ ...stride, targets: fighter.joints.shoulderRight, angle: 21 }),
    scene.tweens.add({ ...stride, targets: fighter.joints.elbowLeft, angle: 12 }),
    scene.tweens.add({ ...stride, targets: fighter.joints.elbowRight, angle: -12 }),
    scene.tweens.add({ ...stride, targets: fighter.rig, y: MAN_SPRITE_Y_OFFSET - 5, duration: 90 }),
    scene.tweens.add({ ...stride, targets: fighter.shadow, scaleX: 1.08, scaleY: 0.84, duration: 90 })
  ];
}

export function stopPlayerRunning(fighter) {
  fighter?.runningTweens?.forEach((tween) => tween.stop());
  if (!fighter) return;
  fighter.runningTweens = [];
  fighter.rig?.setPosition(0, MAN_SPRITE_Y_OFFSET);
  fighter.shadow?.setScale(1);
  Object.values(fighter.joints || {}).forEach((joint) => joint.setAngle(0));
}

export async function preparePlayerPunch(scene, fighter) {
  if (!fighter?.joints?.shoulderRight) return;
  stopPlayerBreathing(fighter);
  await Promise.all([
    tweenFinished(scene, { targets: fighter.joints.shoulderRight, angle: 12, duration: 95, ease: "Sine.out" }),
    tweenFinished(scene, { targets: fighter.joints.elbowRight, angle: 18, duration: 95, ease: "Sine.out" }),
    tweenFinished(scene, { targets: fighter.joints.wristRight, angle: -5, duration: 95, ease: "Sine.out" })
  ]);
}

export function releasePlayerPunch(scene, fighter) {
  if (!fighter?.joints?.shoulderRight) return Promise.resolve();
  return Promise.all([
    tweenFinished(scene, { targets: fighter.joints.shoulderRight, angle: -68, duration: 115, ease: "Cubic.in" }),
    tweenFinished(scene, { targets: fighter.joints.elbowRight, angle: -4, duration: 105, ease: "Quad.in" }),
    tweenFinished(scene, { targets: fighter.joints.wristRight, angle: 4, duration: 105, ease: "Quad.in" })
  ]);
}

export async function recoverPlayerPunch(scene, fighter) {
  if (!fighter?.joints?.shoulderRight) return;
  await Promise.all([
    tweenFinished(scene, { targets: fighter.joints.shoulderRight, angle: 0, duration: 210, ease: "Back.out" }),
    tweenFinished(scene, { targets: fighter.joints.elbowRight, angle: 0, duration: 190, ease: "Sine.out" }),
    tweenFinished(scene, { targets: fighter.joints.wristRight, angle: 0, duration: 180, ease: "Sine.out" })
  ]);
  startPlayerBreathing(scene, fighter);
}

export function createPlayerFighter(scene, x, y, appearance, flipped = false) {
  if (appearance?.bodyType !== "male") return createGeometricFighter(scene, x, y, appearance, flipped);

  const shadow = scene.add.ellipse(x, y + MAN_SPRITE_SHADOW_OFFSET, 158, 22, 0x000000, 0.4).setDepth(4);
  const body = scene.add.container(x, y).setDepth(6);
  if (flipped) body.setScale(-1, 1);
  const rig = scene.add.container(0, MAN_SPRITE_Y_OFFSET).setScale(MAN_SPRITE_SCALE);
  body.add(rig);
  const nearest = globalThis.Phaser?.Textures?.FilterMode?.NEAREST ?? 1;
  MAN_SPRITE_LAYERS.forEach(({ id }) => scene.textures.get(manSpriteKey(id)).setFilter(nearest));

  const joints = {};
  const layers = [];

  // Lado izquierdo anatómico: se ve a la derecha y queda detrás del torso.
  joints.shoulderLeft = createJoint(scene, rig, "shoulderLeft", MAN_SPRITE_JOINTS.shoulderLeft);
  layers.push(addPart(scene, joints.shoulderLeft, "brazo_izquierdo", MAN_SPRITE_JOINTS.shoulderLeft));
  joints.elbowLeft = createJoint(scene, joints.shoulderLeft, "elbowLeft", MAN_SPRITE_JOINTS.elbowLeft, MAN_SPRITE_JOINTS.shoulderLeft);
  layers.push(addPart(scene, joints.elbowLeft, "antebrazo_izquierdo", MAN_SPRITE_JOINTS.elbowLeft));
  joints.wristLeft = createJoint(scene, joints.elbowLeft, "wristLeft", MAN_SPRITE_JOINTS.wristLeft, MAN_SPRITE_JOINTS.elbowLeft);
  layers.push(addPart(scene, joints.wristLeft, "mano_izquierda", MAN_SPRITE_JOINTS.wristLeft));

  joints.hipLeft = createJoint(scene, rig, "hipLeft", MAN_SPRITE_JOINTS.hipLeft);
  layers.push(addPart(scene, joints.hipLeft, "muslo_izquierdo", MAN_SPRITE_JOINTS.hipLeft));
  joints.kneeLeft = createJoint(scene, joints.hipLeft, "kneeLeft", MAN_SPRITE_JOINTS.kneeLeft, MAN_SPRITE_JOINTS.hipLeft);
  layers.push(addPart(scene, joints.kneeLeft, "pierna_izquierda", MAN_SPRITE_JOINTS.kneeLeft));
  joints.ankleLeft = createJoint(scene, joints.kneeLeft, "ankleLeft", MAN_SPRITE_JOINTS.ankleLeft, MAN_SPRITE_JOINTS.kneeLeft);
  layers.push(addPart(scene, joints.ankleLeft, "pie_izquierdo", MAN_SPRITE_JOINTS.ankleLeft));

  const torso = addPart(scene, rig, "torso");
  layers.push(torso);

  // Lado derecho anatómico: se ve a la izquierda y queda delante del torso.
  joints.hipRight = createJoint(scene, rig, "hipRight", MAN_SPRITE_JOINTS.hipRight);
  layers.push(addPart(scene, joints.hipRight, "muslo_derecho", MAN_SPRITE_JOINTS.hipRight));
  joints.kneeRight = createJoint(scene, joints.hipRight, "kneeRight", MAN_SPRITE_JOINTS.kneeRight, MAN_SPRITE_JOINTS.hipRight);
  layers.push(addPart(scene, joints.kneeRight, "pierna_derecha", MAN_SPRITE_JOINTS.kneeRight));
  joints.ankleRight = createJoint(scene, joints.kneeRight, "ankleRight", MAN_SPRITE_JOINTS.ankleRight, MAN_SPRITE_JOINTS.kneeRight);
  layers.push(addPart(scene, joints.ankleRight, "pie_derecho", MAN_SPRITE_JOINTS.ankleRight));

  joints.shoulderRight = createJoint(scene, rig, "shoulderRight", MAN_SPRITE_JOINTS.shoulderRight);
  layers.push(addPart(scene, joints.shoulderRight, "brazo_derecho", MAN_SPRITE_JOINTS.shoulderRight));
  joints.elbowRight = createJoint(scene, joints.shoulderRight, "elbowRight", MAN_SPRITE_JOINTS.elbowRight, MAN_SPRITE_JOINTS.shoulderRight);
  layers.push(addPart(scene, joints.elbowRight, "antebrazo_derecho", MAN_SPRITE_JOINTS.elbowRight));
  joints.wristRight = createJoint(scene, joints.elbowRight, "wristRight", MAN_SPRITE_JOINTS.wristRight, MAN_SPRITE_JOINTS.elbowRight);
  layers.push(addPart(scene, joints.wristRight, "mano_derecha", MAN_SPRITE_JOINTS.wristRight));

  joints.neck = createJoint(scene, rig, "neck", MAN_SPRITE_JOINTS.neck);
  const head = addPart(scene, joints.neck, "cabeza", MAN_SPRITE_JOINTS.neck);
  layers.push(head);

  const fighter = { shadow, body, head, rig, joints, targets: [body], layers, sprite: torso, breathingTweens: [], runningTweens: [] };
  fighter.animations = createPuppetAnimationController(scene, fighter);
  startPlayerBreathing(scene, fighter);
  return fighter;
}

export function destroyFighter(fighter) {
  if (!fighter) return;
  stopPlayerBreathing(fighter);
  stopPlayerRunning(fighter);
  fighter.shadow.destroy();
  [...new Set(fighter.targets || [fighter.body, fighter.head])].forEach((target) => target?.destroy(true));
}
