// Mantiene el último frame del canvas y sigue procesando teclado, escenas y menú.
// Pausar una escena de Phaser detiene su actualización, pero no su renderizado.
export function suspendPauseRendering(scene) {
  const game = scene.game;
  const originalStep = game.loop.callback;
  const controller = new AbortController();
  let dirty = false;
  let disposed = false;
  const step = (time, delta) => {
    if (dirty || game.pendingDestroy) {
      dirty = false;
      originalStep(time, delta);
    } else game.headlessStep(time, delta);
  };
  const activate = () => {
    if (!disposed) game.loop.callback = step;
  };
  const invalidate = () => { dirty = true; };
  const onOption = event => {
    if (["light-mode", "camera-effects", "flash-effects"].includes(event.target.id)) invalidate();
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    // No despertar el bucle: la salida a la aldea puede estar aparcándolo.
    if (game.loop.callback === step) game.loop.callback = originalStep;
    game.events.off("postrender", activate);
    game.scale.off("resize", invalidate);
    game.renderer.off("restorewebgl", invalidate);
    scene.events.off("shutdown", dispose);
    scene.events.off("destroy", dispose);
    controller.abort();
  };
  // El menú y la capa oscura deben aparecer en un frame real antes de congelarlo.
  game.events.once("postrender", activate);
  game.scale.on("resize", invalidate);
  game.renderer.on("restorewebgl", invalidate);
  document.addEventListener("render-quality-updated", invalidate, { signal: controller.signal });
  document.addEventListener("change", onOption, { signal: controller.signal });
  scene.events.once("shutdown", dispose);
  scene.events.once("destroy", dispose);
  return { invalidate, dispose };
}
