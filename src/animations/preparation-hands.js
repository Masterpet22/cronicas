import { colorizeSkinPixels, normalizeSkinTone } from "../skin-tones.js?v=0.135.0";
import { rememberCombatTexture } from "../battle/combat-textures.js?v=1.0.0";

const SOURCE = "preparation-hands-source";
const keyFor = appearance => `preparation-hands-${normalizeSkinTone(appearance?.skinTone)}`;
// Centros de los cortes de muñeca en el dibujo original, 1266 × 1242.
const WRISTS = Object.freeze({ midpointX: 630 / 1266, midpointY: 1150 / 1242, span: 620 / 1266 });

export function queuePreparationHands(scene) {
  if (!scene.textures.exists(SOURCE)) scene.load.image(SOURCE, "assets/modular/gestures/preparation-hands.png?v=1.0.0");
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
  fighter.preparationWristSpan = rig.byId.torso.width * .28;
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
  if (!visible) return;
  image.setPosition((left.x + right.x) / 2, (left.y + right.y) / 2)
    .setRotation(Math.atan2(left.y - right.y, left.x - right.x))
    .setScale(span / (image.width * WRISTS.span));
}
