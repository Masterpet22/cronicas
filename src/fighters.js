import { runCycleForRig } from "./animations/locomotion-pose.js?v=0.156.0";
import { maskAsset, maskTextureKey } from "./character-masks.js?v=0.169.0";
import { queuePreparationHands, prepareHandsTexture, createPreparationHands, syncPreparationHands, restorePreparationForearms } from "./animations/preparation-hands.js?v=0.169.0";
import { clothingAsset, clothingTextureKey, isBaseOutfitPart, selectedClothing } from "./base-outfit.js?v=0.169.0";
import { normalizeSkinTone } from "./skin-tones.js?v=0.135.0";
import { colorizeFighterAtlas } from "./battle/skin-textures.js?v=0.150.0";
import { rememberCombatTexture } from "./battle/combat-textures.js?v=1.0.0";
import { uniformTextureSuffix } from './enemy-appearance.js?v=1.0.0';
import { composeUniformAtlas, queueUniformTextures } from './battle/uniform-textures.js?v=1.0.0';
import { DEFAULT_IDLE_CLIP, PUPPET_ANIMATION_CLIPS } from "./animations/clips.js?v=0.169.0";
import { createPuppetAnimationController } from "./animations/controller.js?v=0.169.0";
import { preparationClipForRig } from "./animations/preparation-pose.js?v=0.159.0";
import {
  CHARACTER_FACES,
  CHARACTER_HAIR,
  CHARACTER_RIGS,
  MAN_SPRITE_JOINTS as UPDATED_MAN_SPRITE_JOINTS,
  MAN_SPRITE_LAYERS as UPDATED_MAN_SPRITE_LAYERS,
  WOMAN_SPRITE_JOINTS as UPDATED_WOMAN_SPRITE_JOINTS,
  WOMAN_SPRITE_LAYERS as UPDATED_WOMAN_SPRITE_LAYERS,
  characterHairConfig,
  hairAsset
} from "./character-rigs.js?v=0.169.0";

const FIGHTER_GROUND_OFFSET = 60;
export const MAN_SPRITE_SHADOW_OFFSET = FIGHTER_GROUND_OFFSET;

function fighterGrounding({ byId, combat }) {
  const boots = [byId.pie_izquierdo, byId.pie_derecho];
  const sole = Math.max(...boots.map(boot => boot.y + boot.height / 2));
  const left = Math.min(...boots.map(boot => boot.x - boot.width / 2));
  const right = Math.max(...boots.map(boot => boot.x + boot.width / 2));
  return { rigY: FIGHTER_GROUND_OFFSET - sole * combat.scale, shadowWidth: (right - left) * combat.scale + 22 };
}

const PUPPET_VARIANTS = Object.freeze({
  male: { bodyType: "male", ...CHARACTER_RIGS.male, ground: fighterGrounding(CHARACTER_RIGS.male) },
  female: { bodyType: "female", ...CHARACTER_RIGS.female, ground: fighterGrounding(CHARACTER_RIGS.female) }
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

function sourceAtlasKey(variant) {
  return `fighter-atlas-${variant.bodyType}`;
}

export function fighterAtlasKey(appearance) {
  const base = `${sourceAtlasKey(puppetVariant(appearance))}-${normalizeSkinTone(appearance?.skinTone)}`;
  return appearance?.uniform ? `${base}-${uniformTextureSuffix(appearance.uniform)}` : base;
}

export function useFighterTextureRendering(image) {
  // Las piezas de un atlas comparten textura. Las capas cosméticas independientes
  // mantienen el nodo individual para evitar los recortes al mezclar texturas.
  if (!image.texture?.key.startsWith("fighter-atlas-")) {
    image.setRenderNodeRole?.("BatchHandler", "BatchHandlerQuadSingle");
  }
  return image;
}

export function hairTextureKey(style) {
  return CHARACTER_HAIR[style] ? `player-hair-${CHARACTER_HAIR[style].id}` : null;
}

function tailTextureKey(style) {
  return CHARACTER_HAIR[style]?.tail ? `player-tail-${CHARACTER_HAIR[style].id}` : null;
}

function baseFaceTextureKey(appearance) {
  const face = CHARACTER_FACES[Number(appearance?.face) || 1] || CHARACTER_FACES[1];
  return `player-face-${normalizeSkinTone(appearance?.skinTone)}-${face.id}`;
}

export function fighterFaceTextureKey(appearance) {
  const faceKey = baseFaceTextureKey(appearance);
  const maskKey = maskTextureKey(appearance?.mask, appearance?.bodyType);
  return maskKey ? `${faceKey}-${maskKey}` : faceKey;
}

function prepareMaskedFace(scene, appearance) {
  const maskKey = maskTextureKey(appearance?.mask, appearance?.bodyType);
  if (!maskKey || typeof document === "undefined") return;
  const faceKey = baseFaceTextureKey(appearance);
  const combinedKey = fighterFaceTextureKey(appearance);
  const textures = scene.textures;
  rememberCombatTexture(scene, combinedKey);
  if (textures.exists(combinedKey) || !textures.exists(faceKey)) return;
  const face = textures.get(faceKey).getSourceImage();
  const canvas = document.createElement("canvas");
  canvas.width = face.width;
  canvas.height = face.height;
  const context = canvas.getContext("2d");
  context.drawImage(face, 0, 0);
  if (textures.exists(maskKey)) {
    context.drawImage(textures.get(maskKey).getSourceImage(), 0, 0, canvas.width, canvas.height);
  }
  textures.addCanvas(combinedKey, canvas);
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

export function fighterCombatPortraitLayout(appearance, flipped = false, radius = 28) {
  const part = puppetVariant(appearance).byId.cabeza;
  const width = part.width * (part.scaleX || 1) / (part.height * (part.scaleY || part.scaleX || 1));
  const head = { x: 0, y: 0, width, height: 1 };
  const hair = fighterHairPortraitLayout(appearance?.hair, width, 1, flipped, appearance?.bodyType);
  const layers = [head, hair].filter(Boolean);
  const left = Math.min(...layers.map(layer => layer.x - layer.width / 2));
  const right = Math.max(...layers.map(layer => layer.x + layer.width / 2));
  const top = Math.min(...layers.map(layer => layer.y - layer.height / 2));
  const bottom = Math.max(...layers.map(layer => layer.y + layer.height / 2));
  // Inscribir la caja de cabeza + cabello evita recortar barbilla o coleta.
  const scale = radius * 2 / Math.hypot(right - left, bottom - top);
  const fit = layer => layer && ({ x: (layer.x - (left + right) / 2) * scale,
    y: (layer.y - (top + bottom) / 2) * scale, width: layer.width * scale, height: layer.height * scale });
  return { head: fit(head), hair: fit(hair) };
}

export function preparePlayerFighterTextures(scene, appearance) {
  prepareMaskedFace(scene, appearance);
  prepareHandsTexture(scene, appearance);
  const variant = puppetVariant(appearance);
  const skinParts = variant.layers.map(({ id }) => id).filter(id => !isBaseOutfitPart(id));
  const skinKey = `${sourceAtlasKey(variant)}-${normalizeSkinTone(appearance?.skinTone)}`;
  colorizeFighterAtlas(scene, sourceAtlasKey(variant), skinKey, skinParts, appearance?.skinTone);
  if (appearance?.uniform) composeUniformAtlas(scene, skinKey, fighterAtlasKey(appearance), appearance);
}

export function queuePlayerFighterTextures(scene, appearance) {
  queuePreparationHands(scene);
  queueUniformTextures(scene, appearance);
  const variant = puppetVariant(appearance);
  const key = sourceAtlasKey(variant);
  if (!scene.textures.exists(key)) {
    const url = `assets/modular/atlases/${variant.bodyType}`;
    scene.load.atlas(key, `${url}.png?v=1.2.0`, `${url}.json?v=1.2.0`);
  }
  if (!appearance?.uniform) {
    for (const [id, style] of Object.entries(selectedClothing(appearance))) {
      if (style === "training") continue;
      const partKey = clothingTextureKey(variant.bodyType, id, style);
      rememberCombatTexture(scene, partKey);
      if (!scene.textures.exists(partKey)) scene.load.image(partKey, clothingAsset(variant.bodyType, id, style));
    }
  }
  const hair = CHARACTER_HAIR[appearance?.hair];
  if (hair && !scene.textures.exists(hairTextureKey(appearance.hair))) {
    scene.load.image(hairTextureKey(appearance.hair), hairAsset(appearance.hair));
  }
  if (hair?.tail && !scene.textures.exists(tailTextureKey(appearance.hair))) {
    scene.load.image(tailTextureKey(appearance.hair), hairAsset(appearance.hair, "tail"));
  }
  const face = CHARACTER_FACES[Number(appearance?.face) || 1] || CHARACTER_FACES[1];
  const faceKey = baseFaceTextureKey(appearance);
  rememberCombatTexture(scene, faceKey);
  if (!scene.textures.exists(faceKey)) scene.load.image(faceKey, `assets/modular/faces/male_${face.id}_${normalizeSkinTone(appearance?.skinTone)}.png?v=0.135.0`);
  const maskKey = maskTextureKey(appearance?.mask, variant.bodyType);
  if (maskKey) {
    rememberCombatTexture(scene, maskKey);
    if (!scene.textures.exists(maskKey)) scene.load.image(maskKey, maskAsset(appearance.mask, variant.bodyType));
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
  const style = variant.clothing?.[id];
  const key = style && style !== "training" ? clothingTextureKey(variant.bodyType, id, style) : null;
  const hasClothing = key && scene.textures.exists?.(key);
  const x = part.x - parentPoint.x, y = part.y - parentPoint.y;
  const image = hasClothing
    ? useFighterTextureRendering(scene.add.image(x, y, key))
    : scene.add.image(x, y, variant.atlasKey, id);
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

function bringPreparationForearmForward(scene, fighter) {
  const { rig, sprite: torso, joints: { shoulderLeft, elbowLeft } } = fighter;
  if (!fighter.preparationForearm) {
    // El hombro conserva su capa detrás del torso. Solo el antebrazo y la
    // mano cruzan por delante mediante un pivote con la misma transformación.
    const pivot = scene.add.container();
    rig.addAt(pivot, rig.getIndex(torso) + 1);
    const sync = () => {
      pivot.setPosition(shoulderLeft.x, shoulderLeft.y)
        .setRotation(shoulderLeft.rotation).setScale(shoulderLeft.scaleX, shoulderLeft.scaleY);
      syncPreparationHands(fighter);
    };
    const detach = () => scene.events.off("postupdate", sync);
    pivot.once("destroy", detach);
    fighter.preparationForearm = { pivot, sync, detach };
  }
  const { pivot, sync } = fighter.preparationForearm;
  if (elbowLeft.parentContainer === pivot) return;
  shoulderLeft.remove(elbowLeft);
  pivot.add(elbowLeft);
  sync();
  scene.events.on("postupdate", sync);
}

function setPreparationHands(fighter, reflected) {
  if (reflected) {
    if (fighter.preparationHands) return;
    fighter.preparationHands = fighter.layers.filter(layer => ["mano_izquierda", "mano_derecha"].includes(layer.name))
      .map(hand => ({ hand, x: hand.x, flipX: hand.flipX, visible: hand.visible }));
    fighter.preparationHands.forEach(({ hand, x, flipX }) => {
      hand.flipX = !flipX;
      hand.x = -x;
    });
  } else {
    fighter.preparationSeal?.setVisible(false);
    restorePreparationForearms(fighter);
    fighter.preparationHands?.forEach(({ hand, x, flipX, visible }) => { hand.x = x; hand.flipX = flipX; hand.visible = visible; });
    fighter.preparationHands = null;
  }
}

function restorePreparationArmDepth(fighter) {
  setPreparationHands(fighter, false);
  const forearm = fighter.preparationForearm;
  if (!forearm) return;
  const { shoulderLeft, elbowLeft } = fighter.joints;
  if (elbowLeft.parentContainer !== forearm.pivot) return;
  forearm.detach();
  forearm.pivot.remove(elbowLeft);
  shoulderLeft.add(elbowLeft);
}

export function stopPlayerBreathing(fighter) {
  if (!fighter?.rig) return;
  if (fighter.animations?.state === "idle") fighter.animations.stop({ reset: true });
  fighter.breathingTweens = [];
}

export function startPlayerPreparing(scene, fighter) {
  const animations = fighter?.animations;
  if (!animations) return false;
  const clipId = animations.supports("prepare-technique") ? "prepare-technique" : "idle-alert";
  if (fighter.preparing && (animations.clipId === clipId || animations.state === "hit")) return true;
  fighter.preparing = true;
  fighter.breathingTweens = [];
  if (clipId === "prepare-technique") {
    setPreparationHands(fighter, true);
    bringPreparationForearmForward(scene, fighter);
  }
  const blendFromCurrent = clipId === "prepare-technique" && (!animations.state || animations.state === "idle");
  return animations.loop(clipId, { force: true, blendFromCurrent });
}

export function stopPlayerPreparing(scene, fighter, { immediate = false } = {}) {
  if (!fighter?.animations) return;
  if (!fighter.preparing && !immediate) return;
  fighter.preparing = false;
  // La vuelta de brazos puede interpolarse, pero el reflejo pertenece solo
  // a la preparación. No debe quedar activo si otro clip interrumpe la salida.
  setPreparationHands(fighter, false);
  const { animations } = fighter;
  if (immediate) {
    animations.stop({ reset: true });
    restorePreparationArmDepth(fighter);
    return;
  }
  const rest = () => {
    restorePreparationArmDepth(fighter);
    if (fighter.body?.active !== false) startPlayerBreathing(scene, fighter);
  };
  if (animations.clipId === "prepare-technique") {
    animations.settle(220, rest);
    return;
  }
  if (animations.clipId === "idle-alert") animations.stop({ reset: true });
  rest();
}

export function startPlayerGuard(scene, fighter) {
  if (!fighter?.animations) return false;
  fighter.preparing = false;
  restorePreparationArmDepth(fighter);
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
  restorePreparationArmDepth(fighter);
  stopPlayerBreathing(fighter);
  const articulatedClip = guarded ? "guard-impact" : heavy ? "hit-heavy" : "hit-light";
  const simpleClip = guarded ? "guard-impact-simple" : heavy ? "hit-heavy-simple" : "hit-light-simple";
  const clipId = fighter.animations.supports(articulatedClip) ? articulatedClip : simpleClip;
  const completed = await fighter.animations.playOnce(clipId, { force: true });
  if (!completed || fighter.body?.active === false) return completed;
  if (guarded) startPlayerGuard(scene, fighter);
  else if (fighter.preparing) startPlayerPreparing(scene, fighter);
  else startPlayerBreathing(scene, fighter);
  return completed;
}

// Compatibilidad con integraciones anteriores. El nombre genérico es el que
// debe usarse en código nuevo porque la reacción sirve para cualquier luchador.
export const playPlayerDamageReaction = playFighterDamageReaction;

export function startPlayerRunning(scene, fighter) {
  if (!fighter?.animations || fighter.animations.state === "locomotion") return;
  fighter.preparing = false;
  restorePreparationArmDepth(fighter);
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
  fighter.preparing = false;
  restorePreparationArmDepth(fighter);
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
  fighter.preparing = false;
  restorePreparationArmDepth(fighter);
  stopPlayerBreathing(fighter);
  const completed = await fighter.animations.playOnce("earth-wall-cast", { force: true });
  startPlayerBreathing(scene, fighter);
  return completed;
}

export function createPlayerFighter(scene, x, y, appearance, flipped = false) {
  preparePlayerFighterTextures(scene, appearance);
  const variant = {
    ...puppetVariant(appearance),
    atlasKey: fighterAtlasKey(appearance),
    clothing: appearance?.uniform ? null : selectedClothing(appearance)
  };
  const spriteJoints = variant.joints;
  const shadow = scene.add.ellipse(x, y + FIGHTER_GROUND_OFFSET, variant.ground.shadowWidth, 14, 0x000000, 0.4).setDepth(4);
  const body = scene.add.container(x, y).setDepth(6);
  if (flipped) body.setScale(-1, 1);
  const rig = scene.add.container(variant.combat.x, variant.ground.rigY).setScale(variant.combat.scale);
  body.add(rig);

  const joints = {};
  const layers = [];
  const hairConfig = fighterHairConfig(appearance);
  let tail = null;

  // La cola larga se inserta primero para permanecer detrás del cuerpo.
  if (hairConfig?.tail) {
    joints.tail = createJoint(scene, rig, "tail", spriteJoints.neck);
    tail = scene.add.image(hairConfig.tail.x, hairConfig.tail.y, tailTextureKey(appearance.hair))
      .setDisplaySize(hairConfig.tail.width, hairConfig.tail.height);
    tail.name = `tail-${hairConfig.id}`;
    useFighterTextureRendering(tail);
    joints.tail.add(tail);
    layers.push(tail);
  }

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
  // La venda se dibuja sobre la caña de la bota, también durante las animaciones.
  joints.kneeLeft.sendToBack(joints.ankleLeft);
  layers.push(addPart(scene, joints.ankleLeft, variant, "pie_izquierdo", spriteJoints.ankleLeft));

  // La pierna derecha también queda detrás del bajo de la ropa del torso.
  joints.hipRight = createJoint(scene, rig, "hipRight", spriteJoints.hipRight);
  layers.push(addPart(scene, joints.hipRight, variant, "muslo_derecho", spriteJoints.hipRight));
  joints.kneeRight = createJoint(scene, joints.hipRight, "kneeRight", spriteJoints.kneeRight, spriteJoints.hipRight);
  layers.push(addPart(scene, joints.kneeRight, variant, "pierna_derecha", spriteJoints.kneeRight));
  joints.ankleRight = createJoint(scene, joints.kneeRight, "ankleRight", spriteJoints.ankleRight, spriteJoints.kneeRight);
  joints.kneeRight.sendToBack(joints.ankleRight);
  layers.push(addPart(scene, joints.ankleRight, variant, "pie_derecho", spriteJoints.ankleRight));

  const torso = addPart(scene, rig, variant, "torso");
  layers.push(torso);

  joints.shoulderRight = createJoint(scene, rig, "shoulderRight", spriteJoints.shoulderRight);
  layers.push(addPart(scene, joints.shoulderRight, variant, "brazo_derecho", spriteJoints.shoulderRight));
  joints.elbowRight = createJoint(scene, joints.shoulderRight, "elbowRight", spriteJoints.elbowRight, spriteJoints.shoulderRight);
  layers.push(addPart(scene, joints.elbowRight, variant, "antebrazo_derecho", spriteJoints.elbowRight));
  joints.wristRight = createJoint(scene, joints.elbowRight, "wristRight", spriteJoints.wristRight, spriteJoints.elbowRight);
  layers.push(addPart(scene, joints.wristRight, variant, "mano_derecha", spriteJoints.wristRight));

  joints.neck = createJoint(scene, rig, "neck", spriteJoints.neck);
  const head = addPart(scene, joints.neck, variant, "cabeza", spriteJoints.neck);
  layers.push(head);
  const headPart = variant.byId.cabeza;
  const face = scene.add.image(head.x, head.y, fighterFaceTextureKey(appearance));
  face.setDisplaySize(headPart.width * (headPart.scaleX || 1), headPart.height * (headPart.scaleY || headPart.scaleX || 1));
  face.name = "rostro";
  useFighterTextureRendering(face);
  joints.neck.add(face);
  layers.push(face);
  let hair = null;
  if (hairConfig) {
    const key = hairTextureKey(appearance.hair);
    hair = scene.add.image(hairConfig.x, hairConfig.y, key).setDisplaySize(hairConfig.width, hairConfig.height);
    hair.name = `hair-${hairConfig.id}`;
    useFighterTextureRendering(hair);
    joints.neck.add(hair);
    layers.push(hair);
  }

  const animationClips = { ...PUPPET_ANIMATION_CLIPS,
    "run-cycle": runCycleForRig(variant),
    "prepare-technique": preparationClipForRig(PUPPET_ANIMATION_CLIPS["prepare-technique"], variant) };
  const fighter = { shadow, body, head, face, hair, tail, rig, joints, animationClips, targets: [body], layers, sprite: torso, breathingTweens: [], runningTweens: [] };
  createPreparationHands(scene, fighter, appearance, variant);
  fighter.animations = createPuppetAnimationController(scene, fighter);
  startPlayerBreathing(scene, fighter);
  return fighter;
}

export function destroyFighter(fighter) {
  if (!fighter) return;
  fighter.animations?.stop({ reset: true });
  fighter.shadow.destroy();
  [...new Set(fighter.targets || [fighter.body, fighter.head])].forEach((target) => target?.destroy(true));
}
