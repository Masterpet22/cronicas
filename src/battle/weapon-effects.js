import { WEAPON_ASSETS } from "../weapon-assets.js?v=1.0.0";

export function queueWeaponTextures(scene) {
  for (const [id, file] of Object.entries(WEAPON_ASSETS)) {
    if (!scene.textures.exists(`equipment-${id}`)) scene.load.image(`equipment-${id}`, file);
  }
}

export function holdKunai(scene, actor = "player") {
  const fighter = actor === "player" ? scene.hero : scene.foe;
  const image = scene.add.image(0, 0, "equipment-kunai").setOrigin(.86, .85).setDisplaySize(64, 55).setDepth(14);
  image.name = "held-kunai";
  const follow = () => {
    const hand = scene.playerHandPosition(actor);
    const matrix = fighter.joints?.wristRight?.getWorldTransformMatrix();
    // The artwork points up-left. Align its blade with the forearm's down axis;
    // the punch rotates both the hand and blade forward at impact.
    image.setPosition(hand.x, hand.y).setRotation((matrix?.decomposeMatrix().rotation || 0) + 3.97);
  };
  const remove = () => {
    scene.events.off("postupdate", follow); scene.events.off("shutdown", remove);
    image.destroy();
  };
  scene.events.on("postupdate", follow); scene.events.once("shutdown", remove); follow();
  return remove;
}

export async function throwShuriken(scene, missed = false, actor = "player") {
  const target = actor === "player" ? scene.foe : scene.hero;
  const direction = actor === "player" ? 1 : -1;
  const hand = scene.playerProjectileOrigin(actor);
  const projectile = scene.add.image(hand.x, hand.y, "equipment-shuriken").setDisplaySize(46, 48).setDepth(14);
  projectile.name = "thrown-shuriken";
  try {
    await scene.tween({ targets: projectile, x: target.body.x + (missed ? 100 : 0) * direction,
      y: target.body.y - (missed ? 100 : 22), angle: 1080 * direction, duration: 440, ease: "Linear" });
  } finally { projectile.destroy(); }
}
