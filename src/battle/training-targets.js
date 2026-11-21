import { HUD_ART } from "./hud-art.js?v=0.171.0";
import { ELEMENTS } from "../elements.js?v=0.20.0";
import { timelineMarkerPosition } from "./timeline.js?v=0.69.0";
import { paintTimelinePortraits } from "./timeline-hud.js?v=1.0.0";
import { setHudAttribute } from "./hud-dom.js?v=1.0.0";
import { hairTextureKey, fighterAtlasKey, fighterCombatPortraitLayout, fighterFaceTextureKey, useFighterTextureRendering } from '../fighters.js?v=0.171.0';
import { enemyFighterAppearance } from '../character.js?v=0.171.0';

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
    const locked = scene.busy || scene.finished || scene.scene.isPaused() || Boolean(scene.pendingActions.player);
    controls.forEach((button, index) => {
      const { state, profile } = scene.trainingTargets[index];
      const defeated = state.hp <= 0;
      const disabled = locked || defeated;
      if (button.hidden !== defeated) button.hidden = defeated;
      if (button.disabled !== disabled) button.disabled = disabled;
      setHudAttribute(button, "aria-pressed", index === scene.selectedTargetIndex);
      setHudAttribute(button, "aria-label", `Elegir ${profile.name}, ${state.hp}/${state.maxHp} PV${defeated ? ", derrotado" : ""}`);
    });
  };
  const observer = new ResizeObserver(layout);
  observer.observe(root); observer.observe(scene.game.canvas);
  scene.game.scale.on("resize", layout);
  layout(); refresh();
  const destroy = () => {
    scene.events.off("shutdown", destroy);
    observer.disconnect(); scene.game.scale.off("resize", layout);
    controls.forEach(button => button.remove());
  };
  scene.events.once("shutdown", destroy);
  return { refresh, destroy };
}

export function mountGroupTimeline(scene) {
  const { start, trackY } = HUD_ART.timeline;
  scene.enemyMarkerHair?.setVisible(false);
  scene.groupMarkers = scene.trainingTargets.map((target, index) => {
    const look = enemyFighterAppearance(target.profile);
    const layout = fighterCombatPortraitLayout(look, false, 11);
    const marker = index === 0 ? scene.enemyTurnMarker : scene.add.image(start, trackY, scene.enemyTurnMarker.texture.key, scene.enemyTurnMarker.frame.name).setDisplaySize(18, 28);
    const halo = index === 0 ? scene.enemyMarkerHalo : scene.add.circle(start, trackY, 12, 0x07101d, 1);
    marker.setTexture(fighterAtlasKey(look), 'cabeza').setDisplaySize(layout.head.width, layout.head.height);
    const face = index === 0 && scene.enemyMarkerFace?.scene ? scene.enemyMarkerFace : useFighterTextureRendering(scene.add.image(start, trackY,
      fighterFaceTextureKey(enemyFighterAppearance(target.profile))));
    if (index === 0) scene.enemyMarkerFace = face;
    face.setTexture(fighterFaceTextureKey(look)).setDisplaySize(layout.head.width, layout.head.height);
    const hairKey = hairTextureKey(look.hair);
    const hair = hairKey && layout.hair ? useFighterTextureRendering(scene.add.image(start, trackY, hairKey)
      .setDisplaySize(layout.hair.width, layout.hair.height)) : null;
    const parts = [halo, marker, face, ...(hair ? [hair] : [])];
    scene.timelineLayer.add(parts);
    return { marker, face, hair, layout, halo, parts };
  });
  updateGroupTimeline(scene);
}

function positionMarker(marker, x, y) {
  if (marker.x !== x || marker.y !== y) marker.setPosition(x, y);
}

export function setGroupMarkerVisible({ parts }, visible) {
  for (const part of parts) {
    if (part.visible !== visible) part.setVisible(visible);
  }
}

export function updateGroupTimeline(scene) {
  const { start, end } = HUD_ART.timeline;
  const player = scene.timelineProgress.player;
  const entries = [{ id: "player", lane: 0, progress: player, name: scene.saveData.character.name,
    place: (x, y, highlighted) => scene.placeTimelinePortrait("player", x, y, highlighted) }];
  scene.groupMarkers.forEach((parts, index) => {
    const { marker, face, hair, layout, halo } = parts;
    const target = scene.trainingTargets[index], alive = target.state.hp > 0 && !target.retired;
    setGroupMarkerVisible(parts, alive);
    if (!alive) return;
    entries.push({ id: `enemy-${index}`, lane: index % 2 ? 0 : 1, progress: target.progress, name: target.profile.name,
      place(x, y, highlighted) {
        positionMarker(marker, x + layout.head.x, y + layout.head.y);
        positionMarker(face, marker.x, marker.y);
        if (hair) positionMarker(hair, x + layout.hair.x, y + layout.hair.y);
        positionMarker(halo, x, y);
        const width = highlighted ? 2 : 1.2;
        const color = highlighted || index === scene.selectedTargetIndex ? 0xffdf92 : ELEMENTS[target.state.primaryAffinity].color;
        if (halo.lineWidth !== width || halo.strokeColor !== color) halo.setStrokeStyle(width, color, 1);
      } });
  });
  if (scene.companionMarker && scene.companion) {
    const { state, progress, definition } = scene.companion;
    scene.companionMarker.setVisible(state.hp > 0);
    if (state.hp > 0) entries.push({ id: "companion", lane: 0, progress, name: definition.name,
      place(x, y, highlighted) {
        const halo = scene.companionMarker.first;
        halo.setStrokeStyle(highlighted ? 2 : 1.2, highlighted ? 0xffdf92 : 0x91b879);
        positionMarker(scene.companionMarker, x, y);
      } });
  }
  paintTimelinePortraits(scene, entries);
  const glow = scene.timelineThemeParts.progressGlow;
  const width = Math.max(0, timelineMarkerPosition(player, start, end) - start);
  if (glow.width !== width) glow.width = width;
}

export function showGroupTrainingResult(scene, won) {
  const host = scene.game.canvas.parentElement;
  const dialog = document.createElement("dialog");
  dialog.className = "arena-result-dialog";
  dialog.setAttribute("aria-labelledby", "group-result-title");
  dialog.innerHTML = `<h2 id="group-result-title">${won ? "Victoria" : "Derrota"}</h2><p>${won ? "Has derrotado a todos los rivales." : "El grupo ha ganado este combate. Ajusta tu estrategia y vuelve a probar."}</p><div class="arena-result-stats"><span>Rivales derrotados<strong>${scene.trainingTargets.filter(target => target.state.hp <= 0).length}/${scene.trainingTargets.length}</strong></span><span>Vida restante<strong>${scene.player.hp}/${scene.player.maxHp}</strong></span></div><p class="arena-practice-note">Entrenamiento sin recompensas. Conservas tu progreso, tu equipo, tu inventario y tus fichas de Rivales.</p><footer><button type="button" data-group-rematch>Revancha</button><button type="button" data-group-return>Volver al Dojo</button></footer>`;
  const close = () => { scene.events.off("shutdown", close); dialog.close(); dialog.remove(); };
  dialog.querySelector("[data-group-rematch]").addEventListener("click", () => { close(); scene.scene.restart(); });
  dialog.querySelector("[data-group-return]").addEventListener("click", () => { close(); scene.leaveExhibition(); });
  dialog.addEventListener("cancel", event => { event.preventDefault(); close(); scene.leaveExhibition(); });
  scene.events.once("shutdown", close);
  host.append(dialog); dialog.showModal(); dialog.querySelector("[data-group-rematch]").focus();
}
