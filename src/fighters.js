import { resolveFighterAppearance } from "./character.js?v=0.6.0";

function colorNumber(hex) {
  return Number.parseInt(hex.slice(1), 16);
}

function outlined(shape, ink, width = 4) {
  return shape.setStrokeStyle(width, ink, 1);
}

function makeRearHair(scene, style, color, ink) {
  const pieces = [];
  if (style === 2) {
    pieces.push(outlined(scene.add.ellipse(-38, -74, 29, 118, color), ink, 4));
    pieces.push(outlined(scene.add.ellipse(38, -74, 29, 118, color), ink, 4));
  }
  if (style === 4) {
    pieces.push(outlined(scene.add.circle(47, -109, 23, color), ink, 4));
    pieces.push(outlined(scene.add.ellipse(56, -65, 22, 92, color), ink, 4));
  }
  return pieces;
}

function makeFrontHair(scene, style, color, ink) {
  const pieces = [outlined(scene.add.ellipse(0, -111, style === 3 ? 94 : 86, style === 3 ? 57 : 50, color), ink, 5)];
  const spikes = style === 3 ? 5 : 4;
  for (let index = 0; index < spikes; index += 1) {
    const x = -36 + index * (72 / (spikes - 1));
    const height = style === 3 ? 31 + (index % 2) * 9 : 25 + (index % 2) * 6;
    pieces.push(scene.add.triangle(x, -91, -13, -9, 0, height, 13, -9, color));
  }
  if (style === 5) {
    pieces.push(outlined(scene.add.rectangle(0, -104, 84, 14, 0x75849a), ink, 3));
    pieces.push(outlined(scene.add.triangle(50, -99, -8, -8, 23, 3, -2, 16, 0x75849a), ink, 3));
  }
  return pieces;
}

function makeWeapon(scene, weapon, ink) {
  const group = scene.add.container(58, 6).setAngle(weapon === "staff" ? 17 : 27);
  const pieces = [];
  if (weapon === "staff") {
    pieces.push(outlined(scene.add.rectangle(0, 0, 9, 190, 0x8b613c), ink, 4));
  } else if (weapon === "sword") {
    pieces.push(outlined(scene.add.rectangle(0, 22, 12, 105, 0xd8e2ec), ink, 3));
    pieces.push(outlined(scene.add.triangle(0, 82, -6, -4, 6, -4, 0, 18, 0xd8e2ec), ink, 3));
    pieces.push(outlined(scene.add.rectangle(0, -36, 34, 8, 0xd6a64b), ink, 3));
    pieces.push(outlined(scene.add.rectangle(0, -58, 14, 38, 0x68442f), ink, 3));
  } else {
    const length = weapon === "dagger" ? 62 : 48;
    pieces.push(outlined(scene.add.triangle(0, 5, -9, -length / 2, 9, -length / 2, 0, length / 2, 0xb9c7d6), ink, 3));
    pieces.push(outlined(scene.add.circle(0, 40, 8, 0x263142), ink, 3));
  }
  group.add(pieces);
  return { group, pieces };
}

export function createGeometricFighter(scene, x, y, appearance, flipped = false) {
  const style = resolveFighterAppearance(appearance);
  const ink = colorNumber(style.ink);
  const skin = colorNumber(style.skin);
  const cloth = colorNumber(style.cloth);
  const accent = colorNumber(style.accent);
  const hairColor = colorNumber(style.hairColor);
  const torsoWidth = style.bodyType === "female" ? 66 : 76;
  const legWidth = style.bottom === 2 ? 28 : style.bottom === 3 ? 23 : 20;

  const shadow = scene.add.ellipse(x, y + 105, 142, 22, 0x000000, 0.38).setDepth(4);
  const body = scene.add.container(x, y).setDepth(6);
  if (flipped) body.setScale(-1, 1);
  const layers = [];

  if (style.hair === 2 || style.hair === 4) {
    const rearHair = makeRearHair(scene, style.hair, hairColor, ink);
    body.add(rearHair); layers.push(...rearHair);
  }

  const leftLeg = outlined(scene.add.rectangle(-legWidth, 64, legWidth + 12, 76, accent), ink, 5);
  const rightLeg = outlined(scene.add.rectangle(legWidth, 64, legWidth + 12, 76, accent), ink, 5);
  const leftShoe = outlined(scene.add.ellipse(-legWidth - 5, 105, legWidth + 32, style.shoes === 2 ? 27 : 20, 0x293242), ink, 5);
  const rightShoe = outlined(scene.add.ellipse(legWidth + 5, 105, legWidth + 32, style.shoes === 2 ? 27 : 20, 0x293242), ink, 5);
  body.add([leftLeg, rightLeg, leftShoe, rightShoe]); layers.push(leftLeg, rightLeg, leftShoe, rightShoe);

  const top = outlined(scene.add.rectangle(0, 0, torsoWidth, 88, cloth), ink, 5);
  const sash = outlined(scene.add.rectangle(0, 32, torsoWidth + 12, 15, accent), ink, 4);
  body.add([top, sash]); layers.push(top, sash);
  if (style.top === 2) {
    const shoulderL = outlined(scene.add.triangle(-torsoWidth / 2, -27, -18, -9, 5, 0, -8, 17, accent), ink, 3);
    const shoulderR = outlined(scene.add.triangle(torsoWidth / 2, -27, 18, -9, -5, 0, 8, 17, accent), ink, 3);
    body.add([shoulderL, shoulderR]); layers.push(shoulderL, shoulderR);
  }
  if (style.top === 3) {
    const collar = outlined(scene.add.triangle(0, -27, -22, -17, 0, 12, 22, -17, accent), ink, 4);
    body.add(collar); layers.push(collar);
  }
  const wrapL = scene.add.rectangle(-12, -2, 4, 70, 0xffffff, 0.18).setAngle(-24);
  const wrapR = scene.add.rectangle(12, -2, 4, 70, 0xffffff, 0.12).setAngle(24);
  body.add([wrapL, wrapR]); layers.push(wrapL, wrapR);

  const leftArm = scene.add.container(-46, -4).setAngle(10);
  const leftSleeve = outlined(scene.add.rectangle(0, 3, 23, 66, cloth), ink, 5);
  const leftHand = outlined(scene.add.circle(0, 40, 11, skin), ink, 4);
  leftArm.add([leftSleeve, leftHand]);
  const rightArm = scene.add.container(46, -4).setAngle(-10);
  const rightSleeve = outlined(scene.add.rectangle(0, 3, 23, 66, cloth), ink, 5);
  const rightHand = outlined(scene.add.circle(0, 40, 11, skin), ink, 4);
  rightArm.add([rightSleeve, rightHand]);
  body.add([leftArm, rightArm]); layers.push(leftSleeve, leftHand, rightSleeve, rightHand);

  const neck = outlined(scene.add.rectangle(0, -48, 19, 24, skin), ink, 4);
  const head = outlined(scene.add.ellipse(0, -84, 86, 98, skin), ink, 5);
  body.add([neck, head]); layers.push(neck, head);

  const eyeY = style.face === 2 ? -82 : -79;
  const leftEye = outlined(scene.add.ellipse(-15, eyeY, style.face === 2 ? 16 : 13, style.face === 2 ? 5 : 10, 0xf7f7f3), ink, 3);
  const rightEye = outlined(scene.add.ellipse(15, eyeY, style.face === 2 ? 16 : 13, style.face === 2 ? 5 : 10, 0xf7f7f3), ink, 3);
  const pupilL = scene.add.circle(-15, eyeY, 3, ink);
  const pupilR = scene.add.circle(15, eyeY, 3, ink);
  const mouth = style.face === 3
    ? scene.add.arc(0, -61, 8, 10, 170, false, 0x7d3c3e).setStrokeStyle(3, 0x7d3c3e)
    : scene.add.rectangle(0, -60, style.face === 2 ? 15 : 10, 2, 0x7d3c3e);
  body.add([leftEye, rightEye, pupilL, pupilR, mouth]); layers.push(leftEye, rightEye, pupilL, pupilR, mouth);

  const frontHair = makeFrontHair(scene, style.hair, hairColor, ink);
  body.add(frontHair); layers.push(...frontHair);

  const weapon = makeWeapon(scene, style.weapon, ink);
  body.add(weapon.group); layers.push(...weapon.pieces);

  return {
    shadow,
    body,
    head: body,
    targets: [body],
    layers,
    vector: true,
    parts: { top, bottom: leftLeg, rightLeg, sash, weapon: weapon.group, leftArm, rightArm, head }
  };
}

export function destroyFighter(fighter) {
  if (!fighter) return;
  fighter.shadow.destroy();
  [...new Set(fighter.targets || [fighter.body, fighter.head])].forEach((target) => target?.destroy(true));
}
