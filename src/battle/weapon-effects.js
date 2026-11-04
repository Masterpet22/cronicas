import { WEAPON_ASSETS } from "../weapon-assets.js?v=1.0.0";
import { applyFillTint } from "./phaser-compat.js?v=1.0.0";

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
  const end = { x: target.body.x + (missed ? 100 : 0) * direction, y: target.body.y - (missed ? 100 : 22) };
  const distance = Math.hypot(end.x - hand.x, end.y - hand.y) || 1;
  const vx = (end.x - hand.x) / distance, vy = (end.y - hand.y) / distance;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const simple = scene.lightMode || reducedMotion;
  const trail = scene.add.graphics().setDepth(13);
  trail.name = "shuriken-trail";
  // Una silueta algo mayor deja un borde metálico legible sobre fondos oscuros.
  const rim = scene.add.image(hand.x, hand.y, "equipment-shuriken")
    .setDisplaySize(58, 60).setAlpha(.9).setDepth(14);
  applyFillTint(rim, 0xe7edf3);
  rim.name = "shuriken-rim";
  const projectile = scene.add.image(hand.x, hand.y, "equipment-shuriken").setDisplaySize(52, 54).setDepth(15);
  projectile.name = "thrown-shuriken";
  const drawTrail = () => {
    rim.setPosition(projectile.x, projectile.y).setAngle(projectile.angle);
    trail.clear();
    const length = Math.min(simple ? 54 : 104, Math.hypot(projectile.x - hand.x, projectile.y - hand.y));
    for (let i = 0; i < 6; i++) {
      const near = length * i / 6, far = length * (i + 1) / 6;
      const width = (1 - i / 6) * (simple ? 3 : 5);
      const alpha = (1 - i / 6) * .75;
      const line = () => trail.lineBetween(projectile.x - vx * near, projectile.y - vy * near, projectile.x - vx * far, projectile.y - vy * far);
      trail.lineStyle(width + 3, 0x0a111b, alpha); line();
      trail.lineStyle(width, 0xe7edf3, alpha); line();
    }
  };
  let flight, cancel;
  try {
    const arrived = await new Promise(resolve => {
      cancel = () => { flight?.stop(); resolve(false); };
      scene.events.once("shutdown", cancel);
      flight = scene.tweens.add({ targets: projectile, x: end.x, y: end.y, angle: 1080 * direction,
        duration: 440, ease: "Linear", onUpdate: drawTrail, onComplete: () => resolve(true) });
    });
    if (arrived && !missed && !scene.finished && scene.flashEffects !== false && !simple) {
      const sparks = scene.add.graphics({ x: end.x, y: end.y }).setDepth(17);
      sparks.name = "shuriken-impact";
      // Chispas de metal, sin color ni comportamiento de afinidad elemental.
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        sparks.lineStyle(i % 2 ? 2 : 3, i % 2 ? 0xe7edf3 : 0xffd890, .95)
          .lineBetween(Math.cos(angle) * 8, Math.sin(angle) * 8, Math.cos(angle) * 29, Math.sin(angle) * 29);
      }
      scene.tweens.add({ targets: sparks, scale: 1.6, alpha: 0, duration: 180, ease: "Cubic.out", onComplete: () => sparks.destroy() });
    }
  } finally {
    scene.events.off("shutdown", cancel);
    projectile.destroy(); rim.destroy(); trail.destroy();
  }
}
