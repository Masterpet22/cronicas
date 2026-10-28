import { HEIGHT, Phaser } from "./runtime.js?v=0.91.0";
import { teleportDeparture } from "./teleport-transition.js?v=1.1.0";
import { applyFillTint } from "./phaser-compat.js?v=1.0.0";
import { isSceneActive } from "./scene-lifecycle.js?v=1.0.0";

const tween = (scene, config) => new Promise((resolve) => {
  let settled = false;
  const finish = (completed) => {
    if (settled) return;
    settled = true;
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
    resolve(completed);
  };
  const onShutdown = () => finish(false);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
  scene.tweens.add({
    ...config,
    onComplete: (...args) => { config.onComplete?.(...args); finish(true); }
  });
});

export { teleportSmoke as playTeleportSmoke } from "./teleport-transition.js?v=1.1.0";

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
  const departure = teleportDeparture(scene, fighter, scene.saveData?.character?.teleportObject, { pace: "substitution" });
  const celebration = async () => {
    if (!reducedMotion && window.localStorage.getItem("flash-effects") !== "off") {
      fighter.layers.forEach((layer) => applyFillTint(layer, 0xffffff));
      const completed = await Promise.all([
        tween(scene, { targets: light, alpha: 0.74, scale: 3.3, duration: 80, yoyo: true }),
        tween(scene, { targets: beam, alpha: 0.27, duration: 80, yoyo: true }),
        tween(scene, { targets: label, alpha: 1, y: y - 155, duration: 100 })
      ]);
      fighter.layers.forEach((layer) => layer.clearTint?.());
      if (!completed.every(Boolean) || !isSceneActive(scene.scene)) return false;
    } else {
      if (!await tween(scene, { targets: label, alpha: 1, duration: 100 })) return false;
    }
    return tween(scene, { targets: label, alpha: 0, duration: 120 });
  };
  const [, celebrated] = await Promise.all([departure, celebration()]);
  [light, beam, label].forEach((object) => { if (object?.scene) object.destroy(); });
  return Boolean(celebrated && isSceneActive(scene.scene));
}
