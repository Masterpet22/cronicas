import { mountRenderQualityControl } from "../render-settings.js?v=0.114.0";

const SETTINGS = [
  ["manual-seals", "Sellos manuales", "Completa las secuencias con el teclado."],
  ["camera-effects", "Sacudida de cámara", "Movimiento de cámara al recibir impactos."],
  ["flash-effects", "Destellos de pantalla", "Resaltan los golpes y las técnicas."],
  ["light-mode", "Modo ligero", "Reduce partículas y efectos visuales."],
  ["music-enabled", "Música", "Acompaña el combate con música ambiental."]
];

export function mountPauseMenu(scene) {
  const host = scene.game.canvas.parentElement;
  const battleHud = host.querySelector(".combat-access");
  if (battleHud) battleHud.inert = true;
  const root = document.createElement("section");
  root.className = "combat-pause-access";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "combat-pause-title");
  root.innerHTML = `<div class="combat-pause-panel">
    <header class="pause-heading"><span class="pause-crest" aria-hidden="true">Ⅱ</span><p class="pause-kicker">CRÓNICAS DEL SELLO</p><h2 id="combat-pause-title">MISIÓN EN PAUSA</h2><p>El combate continuará donde lo dejaste.</p></header>
    <div class="pause-settings-grid">
      <section class="pause-settings-section"><h3><span aria-hidden="true">一</span> COMBATE</h3><div data-pause-combat></div></section>
      <section class="pause-settings-section"><h3><span aria-hidden="true">二</span> IMAGEN Y SONIDO</h3><div data-pause-quality></div><div data-pause-effects></div><label class="pause-volume"><span>Volumen <output></output></span><input type="range" min="0" max="100" aria-label="Volumen"></label></section>
    </div>
    <footer class="pause-actions"><button type="button" class="pause-resume" data-pause-resume>REANUDAR <kbd aria-hidden="true">Esc</kbd></button><button type="button" class="pause-leave" data-pause-leave>${scene.battle.mission.tutorialReplay ? "SALIR" : "ABANDONAR"}</button></footer>
  </div>`;
  ["pointerdown", "pointerup", "mousedown", "mouseup", "touchstart", "touchend"].forEach(type => {
    root.addEventListener(type, event => event.stopPropagation());
  });
  const controller = new AbortController();
  const sync = () => {
    root.querySelectorAll("[data-pause-setting]").forEach(button => {
      const enabled = document.getElementById(button.dataset.pauseSetting).checked;
      button.setAttribute("aria-checked", String(enabled));
      button.querySelector(".pause-switch-state").textContent = enabled ? "Sí" : "No";
    });
    const volume = document.getElementById("game-volume");
    root.querySelector('input[type="range"]').value = volume.value;
    root.querySelector("output").value = `${volume.value}%`;
  };
  SETTINGS.forEach(([id, label, note], index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pause-setting";
    button.dataset.pauseSetting = id;
    button.setAttribute("role", "switch");
    button.setAttribute("aria-label", label);
    button.innerHTML = `<span><strong>${label}</strong><small>${note}</small></span><span class="pause-switch" aria-hidden="true"><span class="pause-switch-state"></span><i></i></span>`;
    button.addEventListener("click", () => {
      const input = document.getElementById(id);
      input.checked = !input.checked;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    document.getElementById(id).addEventListener("change", sync, { signal: controller.signal });
    root.querySelector(index < 3 ? "[data-pause-combat]" : "[data-pause-effects]").append(button);
  });
  const volume = root.querySelector('input[type="range"]');
  volume.addEventListener("input", () => {
    const original = document.getElementById("game-volume");
    original.value = volume.value;
    original.dispatchEvent(new Event("input", { bubbles: true }));
  });
  document.getElementById("game-volume").addEventListener("input", sync, { signal: controller.signal });
  root.querySelector("[data-pause-resume]").addEventListener("click", () => scene.resumeMission());
  root.querySelector("[data-pause-leave]").addEventListener("click", () => {
    if (scene.battle.mission.tutorialReplay) scene.battle.exitTutorialReplay();
    else scene.showAbandonWarning();
  });
  const removeQuality = mountRenderQualityControl(root.querySelector("[data-pause-quality]"));
  root.addEventListener("keydown", event => {
    if (event.key !== "Tab") return;
    const controls = [...root.querySelectorAll('button:not([tabindex="-1"]), input')];
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  host.append(root);
  sync();
  root.querySelector("[data-pause-resume]").focus({ preventScroll: true });
  scene.events.once("shutdown", () => {
    controller.abort();
    removeQuality();
    root.remove();
    if (battleHud) battleHud.inert = false;
    scene.battle.accessibleHud?.refresh();
    if (!battleHud?.hidden) host.querySelector(".combat-access-pause")?.focus({ preventScroll: true });
  });
  return { root };
}
