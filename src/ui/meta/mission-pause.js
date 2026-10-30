import { mountRenderQualityControl } from "../../render-settings.js?v=0.119.0";

const SETTINGS = [
  ["manual-seals", "Sellos manuales"], ["camera-effects", "Sacudida de cámara"],
  ["flash-effects", "Destellos de pantalla"], ["music-enabled", "Música"], ["light-mode", "Modo ligero"]
];

export function mountMissionPause(root, scope, onAbandon) {
  const trigger = root.querySelector("[data-mission-pause]");
  if (!trigger) return;
  const dialog = document.createElement("dialog");
  dialog.className = "mission-pause-dialog";
  dialog.setAttribute("aria-labelledby", "mission-pause-title");
  dialog.innerHTML = `<p class="eyebrow">PAUSA</p><h2 id="mission-pause-title">Misión en pausa</h2><p class="mission-pause-note">La misión continuará donde la dejaste.</p>
    <button type="button" class="primary-button" data-mission-resume autofocus>REANUDAR</button>
    <details class="mission-pause-settings"><summary>Ajustes</summary><div>${SETTINGS.map(([id, label]) => `<label><span>${label}</span><input type="checkbox" data-mission-setting="${id}"></label>`).join("")}<label><span>Volumen</span><input type="range" min="0" max="100" data-mission-setting="game-volume"></label></div></details>
    <button type="button" class="secondary-button" data-mission-abandon>ABANDONAR MISIÓN</button>
    <p class="mission-pause-shortcut">Esc · Reanudar</p>`;
  root.append(dialog);
  const removeQualityControl = mountRenderQualityControl(dialog.querySelector(".mission-pause-settings > div"));
  const animations = new Set();
  const content = root.querySelector(".village-shell");
  let confirming = false;
  let previousFocus = null;
  const resume = (restoreFocus = true) => {
    if (!scope.isPaused()) return;
    if (dialog.open) dialog.close();
    scope.setPaused(false);
    confirming = false;
    content.inert = false;
    root.classList.remove("mission-paused");
    trigger.setAttribute("aria-expanded", "false");
    animations.forEach((animation) => { if (animation.playState === "paused") animation.play(); });
    animations.clear();
    if (restoreFocus && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  };
  const pause = () => {
    if (dialog.open || root.hidden || !scope.isCurrent() || root.querySelector(".dialogue-overlay, .mission-decision-overlay")) return;
    previousFocus = document.activeElement;
    document.querySelector(".game-settings")?.removeAttribute("open");
    scope.setPaused(true);
    for (const animation of root.getAnimations({ subtree: true })) {
      if (animation.playState === "running") { animations.add(animation); animation.pause(); }
    }
    root.classList.add("mission-paused");
    dialog.querySelectorAll("[data-mission-setting]").forEach((control) => {
      const input = document.getElementById(control.dataset.missionSetting);
      if (!input) return;
      if (control.type === "checkbox") control.checked = input.checked;
      else control.value = input.value;
    });
    trigger.setAttribute("aria-expanded", "true");
    dialog.showModal();
  };
  scope.listen(trigger, "click", pause);
  scope.listen(dialog.querySelector("[data-mission-resume]"), "click", () => resume());
  scope.listen(dialog, "cancel", (event) => { event.preventDefault(); resume(); });
  scope.listen(document, "keydown", (event) => {
    if (confirming && !root.hidden) {
      const buttons = [...root.querySelectorAll(".mission-decision-overlay button")];
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        root.querySelector('[data-decision="continue"]')?.click();
      } else if (event.key === "Tab" && buttons.length) {
        event.preventDefault();
        const index = buttons.indexOf(document.activeElement);
        buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
      }
      return;
    }
    if (event.key !== "Escape" || event.repeat || event.defaultPrevented || dialog.open || root.hidden
      || document.querySelector("dialog[open]") || root.querySelector(".dialogue-overlay, .mission-decision-overlay")) return;
    event.preventDefault();
    event.stopPropagation();
    pause();
  }, { capture: true });
  scope.listen(dialog.querySelector("[data-mission-abandon]"), "click", () => {
    confirming = true;
    dialog.close();
    content.inert = true;
    onAbandon(() => resume());
    const confirmation = root.querySelector(".mission-decision-overlay");
    confirmation?.setAttribute("role", "alertdialog");
    confirmation?.setAttribute("aria-modal", "true");
    confirmation?.setAttribute("aria-label", "Confirmar retirada de la misión");
    confirmation?.querySelector("button")?.focus({ preventScroll: true });
  });
  dialog.querySelectorAll("[data-mission-setting]").forEach((control) => {
    const type = control.type === "range" ? "input" : "change";
    scope.listen(control, type, () => {
      const input = document.getElementById(control.dataset.missionSetting);
      if (!input) return;
      if (control.type === "checkbox") input.checked = control.checked;
      else input.value = control.value;
      input.dispatchEvent(new Event(type, { bubbles: true }));
    });
  });
  scope.onCleanup(() => { resume(false); removeQualityControl(); dialog.remove(); });
}
