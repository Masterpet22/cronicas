import { DEFAULT_IDLE_CLIP } from "./animations/clips.js?v=0.115.0";
import { createPuppetAnimationController } from "./animations/controller.js?v=0.115.0";
import {
  CHARACTER_HAIR,
  CHARACTER_RIGS,
  MAN_SPRITE_JOINTS as UPDATED_MAN_SPRITE_JOINTS,
  MAN_SPRITE_LAYERS as UPDATED_MAN_SPRITE_LAYERS,
  WOMAN_SPRITE_JOINTS as UPDATED_WOMAN_SPRITE_JOINTS,
  WOMAN_SPRITE_LAYERS as UPDATED_WOMAN_SPRITE_LAYERS,
  characterHairConfig
} from "./character-rigs.js?v=0.115.0";

export const MAN_SPRITE_SHADOW_OFFSET = 60;
const MAN_SPRITE_ROOT = "assets/modular/man_sprites/runtime";
const WOMAN_SPRITE_ROOT = "assets/modular/woman_sprites/runtime";
const PUPPET_VARIANTS = Object.freeze({
  male: { id: "man", root: MAN_SPRITE_ROOT, ...CHARACTER_RIGS.male },
  female: {
    id: "woman",
    root: WOMAN_SPRITE_ROOT,
    ...CHARACTER_RIGS.female
  }
});

// Los lados se nombran desde la perspectiva anatómica del personaje, no desde
// la pantalla. Su lado derecho queda delante (a la izquierda de la imagen).
export {
  UPDATED_MAN_SPRITE_JOINTS as MAN_SPRITE_JOINTS,
  UPDATED_MAN_SPRITE_LAYERS as MAN_SPRITE_LAYERS,
  UPDATED_WOMAN_SPRITE_JOINTS as WOMAN_SPRITE_JOINTS,
  UPDATED_WOMAN_SPRITE_LAYERS as WOMAN_SPRITE_LAYERS
};

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
  return CHARACTER_HAIR[style] ? `player-hair-${CHARACTER_HAIR[style].id}` : null;
}

function fighterHairConfig(appearance) {
  return characterHairConfig(appearance?.bodyType, appearance?.hair);
}

export function fighterHairPortraitLayout(style, width, height, flipped = false, bodyType = "male") {
  const variant = puppetVariant({ bodyType });
  const hair = fighterHairConfig({ hair: style, bodyType });
  if (!hair) return null;
  const head = variant.byId.cabeza;
  const neck = variant.joints.neck;
  const headScaleX = head.scaleX || 1;
  const headScaleY = head.scaleY || headScaleX;
  const scaleX = width / (head.width * headScaleX);
  const scaleY = height / (head.height * headScaleY);
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
    if (!scene.textures.exists(key)) scene.load.image(key, `${variant.root}/${assetId}.png?v=0.108.0`);
  });
  const hair = CHARACTER_HAIR[appearance?.hair];
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
  const rig = scene.add.container(variant.combat.x, variant.combat.y).setScale(variant.combat.scale);
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
