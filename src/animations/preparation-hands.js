import { colorizeSkinPixels, normalizeSkinTone } from "../skin-tones.js?v=0.135.0";
import { rememberCombatTexture } from "../battle/combat-textures.js?v=1.0.0";
import { preparationHandLayout, PREPARATION_HAND_ART as WRISTS } from "./preparation-layout.js?v=0.159.0";

const SOURCE = "preparation-hands-v2-source";
const keyFor = appearance => `preparation-hands-v2-${normalizeSkinTone(appearance?.skinTone)}`;

export function queuePreparationHands(scene) {
  if (!scene.textures.exists(SOURCE)) scene.load.image(SOURCE, "assets/modular/gestures/preparation-hands-v2.png?v=1.0.0");
}

export function prepareHandsTexture(scene, appearance) {
  if (typeof document === "undefined" || !scene.textures.exists(SOURCE)) return;
  const key = keyFor(appearance);
  rememberCombatTexture(scene, key);
  if (scene.textures.exists(key)) return;
  const source = scene.textures.get(SOURCE).getSourceImage();
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = Math.round(256 * source.height / source.width);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < pixels.data.length; i += 4) if (pixels.data[i] < 20) pixels.data[i] = 0;
  colorizeSkinPixels(pixels.data, appearance?.skinTone);
  context.putImageData(pixels, 0, 0);
  scene.textures.addCanvas(key, canvas);
}

export function createPreparationHands(scene, fighter, appearance, rig) {
  const key = keyFor(appearance);
  if (!scene.textures.exists?.(key)) return;
  const image = scene.add.image(0, 0, key).setOrigin(WRISTS.midpointX, WRISTS.midpointY).setVisible(false);
  image.name = "preparation-seal-hands";
  image.setRenderNodeRole?.("BatchHandler", "BatchHandlerQuadSingle");
  fighter.rig.add(image);
  fighter.preparationSeal = image;
  fighter.preparationWristSpan = preparationHandLayout(rig).span;
  fighter.preparationArmSections = ["antebrazo_derecho", "antebrazo_izquierdo"].map(name => {
    const arm = fighter.layers.find(part => part.name === name), frame = arm.frame;
    const source = arm.texture.getSourceImage();
    const row = Math.floor(frame.cutHeight * .9);
    const sample = document.createElement("canvas");
    sample.width = frame.cutWidth;
    sample.height = 1;
    const context = sample.getContext("2d");
    context.drawImage(source, frame.cutX, frame.cutY + row, frame.cutWidth, 1, 0, 0, frame.cutWidth, 1);
    const pixels = context.getImageData(0, 0, frame.cutWidth, 1).data;
    let first = 0, last = frame.cutWidth - 1;
    while (first < last && pixels[first * 4 + 3] < 64) first++;
    while (last > first && pixels[last * 4 + 3] < 64) last--;
    return { arm, row, width: last - first + 1,
      point: { x: (first + last) / 2 - frame.cutWidth / 2, y: row - frame.cutHeight / 2 - 5 } };
  });
}

export function restorePreparationForearms(fighter) {
  fighter.preparationArmSections?.forEach(({ arm }) => arm.setCrop());
}

export function syncPreparationHands(fighter) {
  const image = fighter.preparationSeal;
  if (!image || !fighter.preparationHands) return;
  const matrix = fighter.rig.getWorldTransformMatrix();
  const wrist = side => {
    const point = fighter.joints[`wrist${side}`].getWorldTransformMatrix().transformPoint(0, 0, {});
    return matrix.applyInverse(point.x, point.y, {});
  };
  const left = wrist("Left"), right = wrist("Right");
  const span = Math.hypot(left.x - right.x, left.y - right.y);
  // Las manos de reposo acompañan la entrada; el sello aparece al cerrarse
  // los brazos, evitando estirar la ilustración a todo el ancho del torso.
  const visible = fighter.preparing && Math.abs(span - fighter.preparationWristSpan) < fighter.preparationWristSpan * .12;
  image.setVisible(visible);
  fighter.preparationHands.forEach(({ hand, visible: original }) => hand.setVisible(visible ? false : original));
  if (!visible) { restorePreparationForearms(fighter); return; }
  // Se retira únicamente el remate cerrado del sprite del antebrazo. El
  // dibujo de la mano entra debajo de ese borde, sin dos contornos superpuestos.
  const ends = fighter.preparationArmSections.map(({ arm, row, point }) => {
    arm.setCrop(0, 0, arm.frame.cutWidth, row);
    const end = arm.getWorldTransformMatrix().transformPoint(point.x, point.y, {});
    return matrix.applyInverse(end.x, end.y, {});
  });
  const [rightEnd, leftEnd] = ends;
  const attachmentSpan = Math.hypot(leftEnd.x - rightEnd.x, leftEnd.y - rightEnd.y);
  const scale = attachmentSpan / (image.width * WRISTS.span);
  fighter.rig.moveTo(image, fighter.rig.getIndex(fighter.sprite) + 1);
  image.setPosition((leftEnd.x + rightEnd.x) / 2, (leftEnd.y + rightEnd.y) / 2)
    .setRotation(Math.atan2(leftEnd.y - rightEnd.y, leftEnd.x - rightEnd.x))
    .setScale(scale, scale * WRISTS.verticalScale);
  fighter.preparationSeamWidths = { forearms: fighter.preparationArmSections.map(section => section.width),
    hand: image.width * scale * WRISTS.wristWidth };
}
