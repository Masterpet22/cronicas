export function createLayeredFighter(scene, x, y, appearance, flipped = false) {
  const shadow = scene.add.ellipse(x, y + 110, 142, 24, 0x000000, 0.4).setDepth(4);
  const body = scene.add.container(x, y).setDepth(6).setScale(flipped ? -0.31 : 0.31, 0.31);
  const textureKeys = [
    `hair_${appearance.hair}_rear`,
    `body_${appearance.bodyType}`,
    `bottom_${appearance.bottom}`,
    `shoes_${appearance.shoes}`,
    `top_${appearance.top}`,
    `hair_${appearance.hair}_front`,
    `face_${appearance.face}`,
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
