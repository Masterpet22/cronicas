import { DEFAULT_IDLE_CLIP } from "./animations/clips.js?v=0.80.0";
import { createPuppetAnimationController } from "./animations/controller.js?v=0.80.0";
import { PUPPET_JOINTS } from "./animations/rig.js";

const MAN_SPRITE_SCALE = 0.13;
const MAN_SPRITE_Y_OFFSET = -39;
export const MAN_SPRITE_SHADOW_OFFSET = 60;
const MAN_SPRITE_ROOT = "assets/modular/man_sprites/runtime";
const WOMAN_SPRITE_ROOT = "assets/modular/woman_sprites/runtime";
const HAIR_TEXTURES = Object.freeze({
  1: { id: "corto", width: 295, height: 229, x: -26, y: -273 },
  4: { id: "coleta", width: 392, height: 314, x: -59, y: -246 }
});

// Centros calibrados sobre un lienzo de 2048 x 2048 con origen en el centro.
// El orden z mantiene la superposición anatómica aprobada para el juego.
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

// Rig femenino importado de Kinetra (humanoid_female). Los centros, escalas
// y rotaciones de reposo son propios para que las piezas queden ensambladas.
export const WOMAN_SPRITE_LAYERS = Object.freeze([
  { id: "brazo_izquierdo", assetId: "antebrazo_izquierdo", x: 137.717778, y: -155.855556, scaleX: 0.88, scaleY: 0.88, z: 0 },
  { id: "antebrazo_izquierdo", assetId: "brazo_izquierdo", x: 228.835556, y: 13.19, scaleX: 0.88, scaleY: 0.88, z: 1 },
  { id: "mano_izquierda", x: 304.218889, y: 166.491111, scaleX: 0.88, scaleY: 0.88, z: 2 },
  { id: "muslo_izquierdo", x: 69.366667, y: 227.555556, scaleX: 0.88, scaleY: 0.88, z: 3 },
  { id: "pierna_izquierda", x: 80.96, y: 460.936667, scaleX: 0.88, scaleY: 0.88, z: 4 },
  { id: "pie_izquierdo", x: 130.68, y: 613.31, scaleX: 0.88, scaleY: 0.88, z: 5 },
  { id: "torso", x: -22, y: -56.32, scaleX: 0.88, scaleY: 0.88, z: 6 },
  { id: "muslo_derecho", x: -87.894444, y: 231.515556, scaleX: 0.88, scaleY: 0.88, z: 7 },
  { id: "pierna_derecha", x: -119.325556, y: 466.704444, scaleX: 0.88, scaleY: 0.88, z: 8 },
  { id: "pie_derecho", x: -147.533333, y: 616.533333, scaleX: 0.88, scaleY: 0.88, z: 9 },
  { id: "brazo_derecho", assetId: "antebrazo_derecho", x: -186.5, y: -143.822222, scaleX: 0.88, scaleY: 0.88, restRotation: -12, z: 10 },
  { id: "antebrazo_derecho", assetId: "brazo_derecho", x: -235.77, y: 62.231111, scaleX: 0.88, scaleY: 0.88, restRotation: 6, z: 11 },
  { id: "mano_derecha", x: -234.603333, y: 213.724444, scaleX: 0.88, scaleY: 0.88, restRotation: 4, z: 12 },
  { id: "cabeza", x: -3.96, y: -443.06, scaleX: 0.88, scaleY: 0.88, z: 13 }
]);

export const WOMAN_SPRITE_JOINTS = Object.freeze({
  neck: { x: 0, y: -292.2 },
  shoulderRight: { x: -167.78, y: -271.37 }, elbowRight: { x: -224.11, y: -24.14 }, wristRight: { x: -249.54, y: 145.85 },
  shoulderLeft: { x: 95.36, y: -269.89 }, elbowLeft: { x: 198.12, y: -60.41 }, wristLeft: { x: 284.58, y: 96.99 },
  hipRight: { x: -92.4, y: 140.8 }, kneeRight: { x: -106.54, y: 370.16 }, ankleRight: { x: -136.24, y: 556.99 },
  hipLeft: { x: 88, y: 140.8 }, kneeLeft: { x: 84.57, y: 363.76 }, ankleLeft: { x: 86.01, y: 550.29 }
});

const MAN_SPRITE_BY_ID = Object.fromEntries(MAN_SPRITE_LAYERS.map((part) => [part.id, part]));
const PUPPET_VARIANTS = Object.freeze({
  male: { id: "man", root: MAN_SPRITE_ROOT, layers: MAN_SPRITE_LAYERS, byId: MAN_SPRITE_BY_ID, joints: PUPPET_JOINTS },
  female: {
    id: "woman",
    root: WOMAN_SPRITE_ROOT,
    layers: WOMAN_SPRITE_LAYERS,
    byId: Object.fromEntries(WOMAN_SPRITE_LAYERS.map((part) => [part.id, part])),
    joints: WOMAN_SPRITE_JOINTS
  }
});

// Los lados se nombran desde la perspectiva anatómica del personaje, no desde
// la pantalla. Su lado derecho queda delante (a la izquierda de la imagen).
export const MAN_SPRITE_JOINTS = PUPPET_JOINTS;

function puppetVariant(appearance) {
  return PUPPET_VARIANTS[appearance?.bodyType === "female" ? "female" : "male"];
}

function puppetSpriteKey(variant, id) {
  return `player-${variant.id}-${id}`;
}

export function fighterPuppetTextureKey(appearance, id) {
  return puppetSpriteKey(puppetVariant(appearance), id);
}

function hairTextureKey(style) {
  return HAIR_TEXTURES[style] ? `player-hair-${HAIR_TEXTURES[style].id}` : null;
}

function fighterHairConfig(appearance) {
  const hair = HAIR_TEXTURES[appearance?.hair];
  if (!hair) return null;
  if (appearance?.bodyType !== "female") return hair;
  const maleHead = MAN_SPRITE_BY_ID.cabeza;
  const femaleHead = PUPPET_VARIANTS.female.byId.cabeza;
  const scale = femaleHead.scaleX || 1;
  return {
    ...hair,
    x: femaleHead.x + (MAN_SPRITE_JOINTS.neck.x + hair.x - maleHead.x) * scale - WOMAN_SPRITE_JOINTS.neck.x,
    y: femaleHead.y + (MAN_SPRITE_JOINTS.neck.y + hair.y - maleHead.y) * scale - WOMAN_SPRITE_JOINTS.neck.y,
    width: hair.width * scale,
    height: hair.height * scale
  };
}

export function fighterHairPortraitLayout(style, width, height, flipped = false, bodyType = "male") {
  const variant = puppetVariant({ bodyType });
  const hair = fighterHairConfig({ hair: style, bodyType });
  if (!hair) return null;
  const head = variant.byId.cabeza;
  const neck = variant.joints.neck;
  const headScaleX = head.scaleX || 1;
  const headScaleY = head.scaleY || headScaleX;
  const scaleX = width / (260 * headScaleX);
  const scaleY = height / (392 * headScaleY);
  return {
    x: (neck.x + hair.x - head.x) * scaleX * (flipped ? -1 : 1),
    y: (neck.y + hair.y - head.y) * scaleY,
    width: hair.width * scaleX,
    height: hair.height * scaleY
  };
}

export function queuePlayerFighterTextures(scene, appearance) {
  const variant = puppetVariant(appearance);
  variant.layers.forEach(({ id, assetId = id }) => {
    const key = puppetSpriteKey(variant, id);
    if (!scene.textures.exists(key)) scene.load.image(key, `${variant.root}/${assetId}.png?v=0.81.0`);
  });
  const hair = HAIR_TEXTURES[appearance?.hair];
  if (hair && !scene.textures.exists(hairTextureKey(appearance.hair))) {
    scene.load.image(hairTextureKey(appearance.hair), `assets/modular/hair/hair_${hair.id}.png?v=${appearance?.hair === 1 ? "0.101.0" : "0.79.0"}`);
  }
  return "modular";
}

function createJoint(scene, parent, name, point, parentPoint = { x: 0, y: 0 }) {
  const joint = scene.add.container(point.x - parentPoint.x, point.y - parentPoint.y);
  joint.name = name;
  parent.add(joint);
  return joint;
}

function addPart(scene, parent, variant, id, parentPoint = { x: 0, y: 0 }) {
  const part = variant.byId[id];
  const image = scene.add.image(part.x - parentPoint.x, part.y - parentPoint.y, puppetSpriteKey(variant, id));
  if (part.scaleX || part.scaleY) image.setScale(part.scaleX || 1, part.scaleY || part.scaleX || 1);
  if (part.restRotation) image.setAngle(part.restRotation);
  image.name = id;
  parent.add(image);
  return image;
}

export function startPlayerBreathing(scene, fighter) {
  if (!fighter?.rig) return;
  fighter.animations ||= createPuppetAnimationController(scene, fighter);
  const clipId = fighter.phaseTwoActive && fighter.animations.supports("idle-alert") ? "idle-alert" : DEFAULT_IDLE_CLIP;
  if (fighter.animations.clipId === clipId) return;
  if (fighter.animations.state === "idle") fighter.animations.stop({ reset: true });
  fighter.animations.loop(clipId);
  // Alias temporal para mantener compatibilidad mientras carrera y ataques
  // terminan de migrarse al nuevo controlador.
  fighter.breathingTweens = [...fighter.animations.tweens];
}

function bringPreparationArmForward(fighter) {
  const branch = fighter?.joints?.shoulderLeft;
  const rig = fighter?.rig;
  const torso = fighter?.sprite;
  if (!branch || !torso || typeof rig?.getIndex !== "function" || typeof rig?.moveTo !== "function") return;
  if (!fighter.preparationLayerOrder) {
    fighter.preparationLayerOrder = { branch, index: rig.getIndex(branch) };
  }
  const branchIndex = rig.getIndex(branch);
  const torsoIndex = rig.getIndex(torso);
  if (branchIndex < 0 || torsoIndex < 0 || branchIndex > torsoIndex) return;
  // Al retirar una rama situada antes del torso, este retrocede una posición.
  // Insertarla en el índice que tenía el torso la deja inmediatamente delante.
  rig.moveTo(branch, torsoIndex);
}

function restorePreparationArmDepth(fighter) {
  const saved = fighter?.preparationLayerOrder;
  if (!saved || typeof fighter.rig?.moveTo !== "function") return;
  fighter.rig.moveTo(saved.branch, saved.index);
  fighter.preparationLayerOrder = null;
}

export function stopPlayerBreathing(fighter) {
  if (!fighter?.rig) return;
  if (fighter.animations?.state === "idle") fighter.animations.stop({ reset: true });
  fighter.breathingTweens = [];
}

export function startPlayerPreparing(scene, fighter) {
  if (!fighter?.animations) return false;
  stopPlayerBreathing(fighter);
  fighter.preparing = true;
  bringPreparationArmForward(fighter);
  const clipId = fighter.animations.supports("prepare-technique") ? "prepare-technique" : "idle-alert";
  return fighter.animations.loop(clipId, { force: true });
}

export function stopPlayerPreparing(scene, fighter) {
  if (!fighter?.animations) return;
  fighter.preparing = false;
  restorePreparationArmDepth(fighter);
  if (["prepare-technique", "idle-alert"].includes(fighter.animations.clipId)) fighter.animations.stop({ reset: true });
  startPlayerBreathing(scene, fighter);
}

export function startPlayerGuard(scene, fighter) {
  if (!fighter?.animations) return false;
  stopPlayerBreathing(fighter);
  const clipId = fighter.animations.supports("guard-hold") ? "guard-hold" : "guard-hold-simple";
  return fighter.animations.loop(clipId, { force: true });
}

export function stopPlayerGuard(scene, fighter) {
  if (!fighter?.animations) return;
  if (["guard-hold", "guard-impact", "guard-hold-simple", "guard-impact-simple"].includes(fighter.animations.clipId)) fighter.animations.stop({ reset: true });
  startPlayerBreathing(scene, fighter);
}

export async function playFighterDamageReaction(scene, fighter, { guarded = false, heavy = false } = {}) {
  if (!fighter?.animations) return false;
  const resumePreparation = Boolean(fighter.preparing);
  stopPlayerBreathing(fighter);
  const articulatedClip = guarded ? "guard-impact" : heavy ? "hit-heavy" : "hit-light";
  const simpleClip = guarded ? "guard-impact-simple" : heavy ? "hit-heavy-simple" : "hit-light-simple";
  const clipId = fighter.animations.supports(articulatedClip) ? articulatedClip : simpleClip;
  const completed = await fighter.animations.playOnce(clipId, { force: true });
  if (guarded) startPlayerGuard(scene, fighter);
  else if (resumePreparation) startPlayerPreparing(scene, fighter);
  else startPlayerBreathing(scene, fighter);
  return completed;
}

// Compatibilidad con integraciones anteriores. El nombre genérico es el que
// debe usarse en código nuevo porque la reacción sirve para cualquier luchador.
export const playPlayerDamageReaction = playFighterDamageReaction;

export function startPlayerRunning(scene, fighter) {
  if (!fighter?.animations || fighter.animations.state === "locomotion") return;
  stopPlayerBreathing(fighter);
  const clipId = fighter.animations.supports("run-cycle") ? "run-cycle" : "run-simple";
  fighter.animations.loop(clipId, { force: true });
  fighter.runningTweens = [...fighter.animations.tweens];
}

export function stopPlayerRunning(fighter) {
  if (!fighter) return;
  if (fighter.animations?.state === "locomotion") fighter.animations.stop({ reset: true });
  fighter.runningTweens = [];
}

export async function preparePlayerPunch(scene, fighter) {
  if (!fighter?.animations?.supports("punch-prepare")) return false;
  stopPlayerBreathing(fighter);
  return fighter.animations.playOnce("punch-prepare", { force: true });
}

export function releasePlayerPunch(scene, fighter) {
  if (!fighter?.animations?.supports("punch-release")) return Promise.resolve(false);
  return fighter.animations.playOnce("punch-release", { force: true });
}

export async function recoverPlayerPunch(scene, fighter) {
  if (!fighter?.animations?.supports("punch-recover")) return false;
  await fighter.animations.playOnce("punch-recover", { force: true });
  startPlayerBreathing(scene, fighter);
  return true;
}

export async function playEarthWallCast(scene, fighter) {
  if (!fighter?.animations?.supports("earth-wall-cast")) return false;
  stopPlayerBreathing(fighter);
  const completed = await fighter.animations.playOnce("earth-wall-cast", { force: true });
  startPlayerBreathing(scene, fighter);
  return completed;
}

export function createPlayerFighter(scene, x, y, appearance, flipped = false) {
  const variant = puppetVariant(appearance);
  const spriteJoints = variant.joints;
  const shadow = scene.add.ellipse(x, y + MAN_SPRITE_SHADOW_OFFSET, 158, 22, 0x000000, 0.4).setDepth(4);
  const body = scene.add.container(x, y).setDepth(6);
  if (flipped) body.setScale(-1, 1);
  const rig = scene.add.container(0, MAN_SPRITE_Y_OFFSET).setScale(MAN_SPRITE_SCALE);
  body.add(rig);
  const linear = globalThis.Phaser?.Textures?.FilterMode?.LINEAR ?? 0;
  variant.layers.forEach(({ id }) => scene.textures.get(puppetSpriteKey(variant, id)).setFilter(linear));

  const joints = {};
  const layers = [];

  // Lado izquierdo anatómico: se ve a la derecha y queda detrás del torso.
  joints.shoulderLeft = createJoint(scene, rig, "shoulderLeft", spriteJoints.shoulderLeft);
  layers.push(addPart(scene, joints.shoulderLeft, variant, "brazo_izquierdo", spriteJoints.shoulderLeft));
  joints.elbowLeft = createJoint(scene, joints.shoulderLeft, "elbowLeft", spriteJoints.elbowLeft, spriteJoints.shoulderLeft);
  layers.push(addPart(scene, joints.elbowLeft, variant, "antebrazo_izquierdo", spriteJoints.elbowLeft));
  joints.wristLeft = createJoint(scene, joints.elbowLeft, "wristLeft", spriteJoints.wristLeft, spriteJoints.elbowLeft);
  layers.push(addPart(scene, joints.wristLeft, variant, "mano_izquierda", spriteJoints.wristLeft));

  joints.hipLeft = createJoint(scene, rig, "hipLeft", spriteJoints.hipLeft);
  layers.push(addPart(scene, joints.hipLeft, variant, "muslo_izquierdo", spriteJoints.hipLeft));
  joints.kneeLeft = createJoint(scene, joints.hipLeft, "kneeLeft", spriteJoints.kneeLeft, spriteJoints.hipLeft);
  layers.push(addPart(scene, joints.kneeLeft, variant, "pierna_izquierda", spriteJoints.kneeLeft));
  joints.ankleLeft = createJoint(scene, joints.kneeLeft, "ankleLeft", spriteJoints.ankleLeft, spriteJoints.kneeLeft);
  layers.push(addPart(scene, joints.ankleLeft, variant, "pie_izquierdo", spriteJoints.ankleLeft));

  const torso = addPart(scene, rig, variant, "torso");
  layers.push(torso);

  // Lado derecho anatómico: se ve a la izquierda y queda delante del torso.
  joints.hipRight = createJoint(scene, rig, "hipRight", spriteJoints.hipRight);
  layers.push(addPart(scene, joints.hipRight, variant, "muslo_derecho", spriteJoints.hipRight));
  joints.kneeRight = createJoint(scene, joints.hipRight, "kneeRight", spriteJoints.kneeRight, spriteJoints.hipRight);
  layers.push(addPart(scene, joints.kneeRight, variant, "pierna_derecha", spriteJoints.kneeRight));
  joints.ankleRight = createJoint(scene, joints.kneeRight, "ankleRight", spriteJoints.ankleRight, spriteJoints.kneeRight);
  layers.push(addPart(scene, joints.ankleRight, variant, "pie_derecho", spriteJoints.ankleRight));

  joints.shoulderRight = createJoint(scene, rig, "shoulderRight", spriteJoints.shoulderRight);
  layers.push(addPart(scene, joints.shoulderRight, variant, "brazo_derecho", spriteJoints.shoulderRight));
  joints.elbowRight = createJoint(scene, joints.shoulderRight, "elbowRight", spriteJoints.elbowRight, spriteJoints.shoulderRight);
  layers.push(addPart(scene, joints.elbowRight, variant, "antebrazo_derecho", spriteJoints.elbowRight));
  joints.wristRight = createJoint(scene, joints.elbowRight, "wristRight", spriteJoints.wristRight, spriteJoints.elbowRight);
  layers.push(addPart(scene, joints.wristRight, variant, "mano_derecha", spriteJoints.wristRight));

  joints.neck = createJoint(scene, rig, "neck", spriteJoints.neck);
  const head = addPart(scene, joints.neck, variant, "cabeza", spriteJoints.neck);
  layers.push(head);
  const hairConfig = fighterHairConfig(appearance);
  let hair = null;
  if (hairConfig) {
    const key = hairTextureKey(appearance.hair);
    hair = scene.add.image(hairConfig.x, hairConfig.y, key).setDisplaySize(hairConfig.width, hairConfig.height);
    hair.name = `hair-${hairConfig.id}`;
    joints.neck.add(hair);
    layers.push(hair);
  }

  const fighter = { shadow, body, head, hair, rig, joints, targets: [body], layers, sprite: torso, breathingTweens: [], runningTweens: [] };
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
