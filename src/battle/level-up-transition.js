import { HEIGHT, WIDTH } from "./runtime.js?v=0.91.0";

const tween = (scene, config) => new Promise((resolve) => scene.tweens.add({ ...config, onComplete: (...args) => {
  config.onComplete?.(...args);
  resolve();
} }));

export async function playTeleportSmoke(scene, x, y) {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const duration = reducedMotion ? 150 : 490;
  const clouds = Array.from({ length: reducedMotion ? 5 : 15 }, (_, index) => {
    const angle = index * Math.PI * 2 / (reducedMotion ? 5 : 15);
    const radius = 20 + (index % 4) * 8;
    const puff = scene.add.circle(x + Math.cos(angle) * 20, y + Math.sin(angle) * 18, radius, index % 3 === 0 ? 0xffffff : 0xcbd8dc, 0.62)
      .setDepth(91).setName("level-up-smoke");
    return tween(scene, {
      targets: puff,
      x: x + Math.cos(angle) * (100 + index % 3 * 19),
      y: y + Math.sin(angle) * 65 - 38,
      scale: reducedMotion ? 1.2 : 2.15,
      alpha: 0,
      duration,
      ease: "Cubic.out",
      onComplete: () => puff.destroy()
    });
  });
  const veil = scene.add.rectangle(0, 0, WIDTH, HEIGHT, 0xe6f1f5, 0).setOrigin(0).setDepth(90);
  const veilDone = tween(scene, { targets: veil, alpha: reducedMotion ? 0.15 : 0.32, duration: duration / 2, yoyo: true,
    onComplete: () => veil.destroy() });
  await Promise.all([...clouds, veilDone]);
}

export async function playLevelUpFlash(scene, fighter) {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const x = fighter.body.x;
  const y = fighter.body.y - 48;
  const light = scene.add.circle(x, y, 45, 0xffffff, 0).setDepth(84).setName("level-up-white-light");
  const beam = scene.add.rectangle(x, 0, 140, HEIGHT, 0xffffff, 0).setOrigin(0.5, 0).setDepth(83);
  const label = scene.add.text(x, y - 136, "¡HAS SUBIDO DE NIVEL!", {
    fontFamily: '"Cinzel", Georgia, serif', fontSize: "25px", color: "#ffffff", fontStyle: "bold",
    stroke: "#192b3a", strokeThickness: 5
  }).setOrigin(0.5).setDepth(92).setAlpha(0).setName("level-up-battle-text");
  if (!reducedMotion && window.localStorage.getItem("flash-effects") !== "off") {
    fighter.layers.forEach((layer) => layer.setTintFill?.(0xffffff));
    await Promise.all([
      tween(scene, { targets: light, alpha: 0.74, scale: 3.3, duration: 260, yoyo: true, hold: 190 }),
      tween(scene, { targets: beam, alpha: 0.27, duration: 190, yoyo: true, hold: 180 }),
      tween(scene, { targets: label, alpha: 1, y: y - 155, duration: 260 })
    ]);
    fighter.layers.forEach((layer) => layer.clearTint?.());
  } else {
    await tween(scene, { targets: label, alpha: 1, duration: 120 });
  }
  await new Promise((resolve) => scene.time.delayedCall(reducedMotion ? 130 : 420, resolve));
  await Promise.all([
    tween(scene, { targets: label, alpha: 0, duration: 180 }),
    playTeleportSmoke(scene, x, y)
  ]);
  light.destroy();
  beam.destroy();
  label.destroy();
}
