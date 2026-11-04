// Comparte una suspensión por juego: menús anidados no dejan callbacks congelados.
const suspensions = new WeakMap();

export function suspendPauseRendering(scene) {
  const game = scene.game;
  let state = suspensions.get(game);
  if (!state) {
    state = { originalStep: game.loop.callback, owners: new Set(), dirty: true };
    state.step = (time, delta) => {
      if (state.dirty || game.pendingDestroy) { state.dirty = false; state.originalStep(time, delta); }
      else game.headlessStep(time, delta);
    };
    suspensions.set(game, state);
    game.loop.callback = state.step;
  }
  const token = {}, controller = new AbortController();
  state.owners.add(token); state.dirty = true;
  let disposed = false;
  const invalidate = () => { state.dirty = true; };
  const onOption = event => {
    if (["light-mode", "camera-effects", "flash-effects"].includes(event.target.id)) invalidate();
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    state.owners.delete(token);
    if (!state.owners.size) {
      if (game.loop.callback === state.step) game.loop.callback = state.originalStep;
      suspensions.delete(game);
    } else invalidate();
    game.scale.off("resize", invalidate);
    game.renderer.off("restorewebgl", invalidate);
    scene.events.off("shutdown", dispose);
    scene.events.off("destroy", dispose);
    controller.abort();
  };
  game.scale.on("resize", invalidate);
  game.renderer.on("restorewebgl", invalidate);
  document.addEventListener("render-quality-updated", invalidate, { signal: controller.signal });
  document.addEventListener("change", onOption, { signal: controller.signal });
  scene.events.once("shutdown", dispose);
  scene.events.once("destroy", dispose);
  return { invalidate, dispose };
}
