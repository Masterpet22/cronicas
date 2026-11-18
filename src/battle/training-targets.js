import { HUD_ART } from "./hud-art.js?v=0.140.0";
import { ELEMENTS } from "../elements.js?v=0.20.0";
import { timelineMarkerPosition } from "./timeline.js?v=0.69.0";

// Hit areas sit on the actual fighters. The existing portrait shows selection.
export function mountTrainingTargets(scene) {
  const host = scene.game.canvas.parentElement;
  const root = host.querySelector(".combat-access");
  const controls = scene.trainingTargets.map((target, index) => {
    const button = document.createElement("button");
    button.type = "button"; button.className = "training-target-hit";
    button.dataset.trainingTarget = index;
    button.addEventListener("click", () => scene.selectTrainingTarget(index));
    root.append(button);
    return button;
  });
  const layout = () => {
    const canvas = scene.game.canvas.getBoundingClientRect(), base = root.getBoundingClientRect();
    controls.forEach((button, index) => {
      const { x, y } = scene.trainingTargets[index].position;
      Object.assign(button.style, { left: `${canvas.left - base.left + (x - 48) * canvas.width / 960}px`,
        top: `${canvas.top - base.top + (y - 167) * canvas.height / 540}px`,
        width: `${96 * canvas.width / 960}px`, height: `${240 * canvas.height / 540}px` });
    });
  };
  const refresh = () => {
    controls.forEach((button, index) => {
      const { state, profile } = scene.trainingTargets[index];
      button.hidden = state.hp <= 0;
      button.disabled = scene.busy || scene.finished || scene.scene.isPaused() || Boolean(scene.pendingActions.player) || state.hp <= 0;
      button.setAttribute("aria-pressed", String(index === scene.selectedTargetIndex));
      button.setAttribute("aria-label", `Elegir ${profile.name}, ${state.hp}/${state.maxHp} PV${state.hp <= 0 ? ", derrotado" : ""}`);
    });
  };
  const observer = new ResizeObserver(layout);
  observer.observe(root); observer.observe(scene.game.canvas);
  scene.game.scale.on("resize", layout);
  layout(); refresh();
  scene.events.once("shutdown", () => {
    observer.disconnect(); scene.game.scale.off("resize", layout);
    controls.forEach(button => button.remove());
  });
  return { refresh };
}

export function mountGroupTimeline(scene) {
  const { start, trackY } = HUD_ART.timeline;
  scene.enemyTimelineTag.bg.setVisible(false); scene.enemyTimelineTag.text.setVisible(false);
  scene.groupMarkers = scene.trainingTargets.map((target, index) => {
    const marker = index === 0 ? scene.enemyTurnMarker : scene.add.image(start, trackY, scene.enemyTurnMarker.texture.key).setDisplaySize(18, 28);
    const halo = index === 0 ? scene.enemyMarkerHalo : scene.add.circle(start, trackY, 15, 0x07101d, 1);
    marker.setDisplaySize(18, 28);
    const label = scene.add.text(start, trackY + 21, String(index + 1), scene.textStyle(10, "#ffe1a4", "800")).setOrigin(.5);
    scene.timelineLayer.add([halo, marker, label]);
    return { marker, halo, label };
  });
  updateGroupTimeline(scene);
}

export function updateGroupTimeline(scene) {
  const { start, end, trackY } = HUD_ART.timeline;
  const x = timelineMarkerPosition(scene.timelineProgress.player, start, end);
  scene.playerTurnMarker.setPosition(x, trackY - 10);
  scene.playerMarkerHalo.setPosition(x, trackY - 10);
  scene.playerMarkerHair?.setPosition(x + scene.playerMarkerHairLayout.x, trackY - 10 + scene.playerMarkerHairLayout.y);
  scene.playerTimelineTag.bg.setX(x); scene.playerTimelineTag.text.setX(x);
  scene.groupMarkers.forEach(({ marker, halo, label }, index) => {
    const target = scene.trainingTargets[index], alive = target.state.hp > 0;
    const markerX = timelineMarkerPosition(target.progress, start, end);
    const markerY = trackY + (index - 1) * 12;
    marker.setPosition(markerX, markerY).setVisible(alive);
    halo.setPosition(markerX, markerY).setVisible(alive).setStrokeStyle(index === scene.selectedTargetIndex ? 2.5 : 1.5,
      ELEMENTS[target.state.primaryAffinity].color, 1);
    label.setPosition(markerX + 17, markerY).setVisible(alive);
  });
  scene.timelineThemeParts.progressGlow.width = Math.max(0, x - start);
  scene.accessibleHud?.updateProgress({ player: scene.timelineProgress.player, enemy: scene.trainingTargets[scene.selectedTargetIndex].progress });
}

export function showGroupTrainingResult(scene, won) {
  const host = scene.game.canvas.parentElement;
  const dialog = document.createElement("dialog");
  dialog.className = "arena-result-dialog";
  dialog.setAttribute("aria-labelledby", "group-result-title");
  dialog.innerHTML = `<h2 id="group-result-title">${won ? "Victoria" : "Derrota"}</h2><p>${won ? "Has derrotado a todos los rivales." : "El grupo ha ganado este combate. Ajusta tu estrategia y vuelve a probar."}</p><div class="arena-result-stats"><span>Rivales derrotados<strong>${scene.trainingTargets.filter(target => target.state.hp <= 0).length}/${scene.trainingTargets.length}</strong></span><span>Vida restante<strong>${scene.player.hp}/${scene.player.maxHp}</strong></span></div><p class="arena-practice-note">Entrenamiento sin recompensas. Tu partida, equipo, inventario y bestiario se conservan.</p><footer><button type="button" data-group-rematch>Revancha</button><button type="button" data-group-return>Volver al Dojo</button></footer>`;
  const close = () => { scene.events.off("shutdown", close); dialog.close(); dialog.remove(); };
  dialog.querySelector("[data-group-rematch]").addEventListener("click", () => { close(); scene.scene.restart(); });
  dialog.querySelector("[data-group-return]").addEventListener("click", () => { close(); scene.leaveExhibition(); });
  dialog.addEventListener("cancel", event => { event.preventDefault(); close(); scene.leaveExhibition(); });
  scene.events.once("shutdown", close);
  host.append(dialog); dialog.showModal(); dialog.querySelector("[data-group-rematch]").focus();
}
