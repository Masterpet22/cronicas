export function createModularFighter(scene, x, y, clothColor, accentColor, flipped = false) {
  const shadow = scene.add.ellipse(x, y + 60, 130, 24, 0x000000, 0.42);
  const body = scene.add.container(x, y);
  const cape = scene.add.triangle(0, 30, -48, 42, 0, -65, 48, 42, accentColor, 1);
  const torso = scene.add.rectangle(0, 0, 60, 92, clothColor, 1).setStrokeStyle(5, 0x10131a);
  const belt = scene.add.rectangle(0, 18, 68, 13, accentColor, 1);
  const arm1 = scene.add.rectangle(flipped ? 38 : -38, -2, 22, 74, clothColor, 1).setAngle(flipped ? -22 : 22).setStrokeStyle(4, 0x10131a);
  const arm2 = scene.add.rectangle(flipped ? -38 : 38, -2, 22, 74, clothColor, 1).setAngle(flipped ? 22 : -22).setStrokeStyle(4, 0x10131a);
  const leg1 = scene.add.rectangle(-18, 61, 24, 65, 0x171d29, 1).setStrokeStyle(4, 0x090b0f);
  const leg2 = scene.add.rectangle(18, 61, 24, 65, 0x171d29, 1).setStrokeStyle(4, 0x090b0f);
  const weapon = scene.add.rectangle(flipped ? -50 : 50, 4, 8, 86, 0xb7c1ce, 1).setAngle(flipped ? 28 : -28).setStrokeStyle(3, 0x10131a);
  body.add([cape, weapon, leg1, leg2, torso, belt, arm1, arm2]);

  const head = scene.add.container(x, y - 78);
  const face = scene.add.circle(0, 0, 31, 0xe8bc91, 1).setStrokeStyle(5, 0x10131a);
  const hood = scene.add.arc(0, -4, 35, 198, 342, false, accentColor, 1).setStrokeStyle(4, 0x10131a);
  const band = scene.add.rectangle(0, -10, 62, 13, 0x9da7b5, 1).setStrokeStyle(3, 0x10131a);
  const eye1 = scene.add.circle(flipped ? 10 : -10, 2, 3, 0x10131a);
  const eye2 = scene.add.circle(flipped ? -10 : 10, 2, 3, 0x10131a);
  head.add([face, hood, band, eye1, eye2]);
  if (flipped) body.setScale(-1, 1);
  return { shadow, body, head, targets: [body, head], parts: { cape, weapon, torso, belt, arm1, arm2, leg1, leg2, face, hood, band } };
}

export function createLayeredFighter(scene, x, y, appearance, flipped = false) {
  const shadow = scene.add.ellipse(x, y + 98, 142, 24, 0x000000, 0.4).setDepth(4);
  const body = scene.add.container(x, y).setDepth(6).setScale(flipped ? -0.48 : 0.48, 0.48);
  const textureKeys = [
    `hair_${appearance.hair}_rear`,
    `body_${appearance.bodyType}`,
    `bottom_${appearance.bottom}`,
    `shoes_${appearance.shoes}`,
    `top_${appearance.top}`,
    `face_${appearance.face}`,
    `hair_${appearance.hair}_front`,
    `weapon_${appearance.weapon}`
  ];
  const layers = textureKeys.map((key) => scene.add.image(0, 0, key).setOrigin(0.5));
  body.add(layers);
  layers[2].setTint(appearance.accentColor);
  layers[4].setTint(appearance.clothColor);
  return { shadow, body, head: body, targets: [body], layers, layered: true, parts: { bottom: layers[2], top: layers[4], weapon: layers[7] } };
}

export function destroyFighter(fighter) {
  if (!fighter) return;
  fighter.shadow.destroy();
  [...new Set(fighter.targets || [fighter.body, fighter.head])].forEach((target) => target?.destroy(true));
}
