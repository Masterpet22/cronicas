import { battleRuntime } from "./runtime.js?v=0.91.0";

export function returnToVillage(scene, completed) {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const duration = reducedMotion ? 140 : 420;
  scene.cameras.main.fadeOut(duration, 18, 11, 7);
  if (!reducedMotion) scene.cameras.main.zoomTo(battleRuntime.renderResolution * 1.04, duration);
  scene.time.delayedCall(duration, () => battleRuntime.releaseGameToMeta("plaza", { commitVictory: completed }));
}
