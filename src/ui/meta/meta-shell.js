import { mountMissionPause } from "./mission-pause.js?v=0.114.0";

export function createMetaShell(deps) {
  return {
    id: "meta-shell",
    render({ save, view }, content) {
      const { character, progression, campaign } = save;
      const currentLocation = deps.locations.find((location) => location.id === view)
        || (view === "kagemori" ? { name: "Aldea de Kagemori" } : view === "doctor-route" ? { name: "Caminos del Norte" } : view === "debug" ? { name: "Herramientas de pruebas" } : null);
      const isSecondaryField = view === "kagemori" || view === "doctor-route";
      const navigation = isSecondaryField
        ? `<button type="button" class="mission-pause-trigger secondary-button" data-mission-pause aria-label="Pausar misión" aria-haspopup="dialog" aria-expanded="false"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4v12M14 4v12"/></svg><span>Pausa</span></button>`
        : view === "plaza" ? "" : `<nav class="village-nav village-return" aria-label="Navegación de la aldea"><button data-view="plaza">← Volver al mapa</button><span>${deps.escapeHtml(currentLocation?.name || "Aldea del Horizonte")}</span></nav>`;
      return `
        <div class="village-shell${isSecondaryField ? " mission-field-shell" : ""}">
          ${isSecondaryField ? "" : `<section class="village-topbar">
            <div class="profile-heading">
              <span class="avatar-swatch" style="--avatar:${character.appearance}"></span>
              <div class="profile-copy"><p class="eyebrow">${campaign.rank.toUpperCase()}</p><h2>${deps.escapeHtml(character.name)}</h2></div>
              <span class="level-chip" aria-label="Nivel ${progression.level}"><small>NIVEL</small><strong>${progression.level}</strong></span>
            </div>
            <div class="campaign-summary" aria-label="Progreso de la partida">
              <span class="summary-item" aria-label="${progression.xp} de ${deps.xpForNextLevel(progression.level)} puntos de experiencia"><img class="hud-stat-icon" src="assets/ui/hud-icons/progress-emblem.webp?v=0.83.0" alt="" aria-hidden="true"><strong>${progression.xp}/${deps.xpForNextLevel(progression.level)}</strong><small>PX</small></span>
              <span class="summary-item" aria-label="${progression.coins} monedas"><img class="hud-stat-icon" src="assets/ui/hud-icons/coins.webp?v=0.83.0" alt="" aria-hidden="true"><strong>${progression.coins}</strong><small>monedas</small></span>
            </div>
            <div class="topbar-actions" aria-label="Acciones de la partida">
              <button class="player-settings-trigger" type="button" aria-label="Abrir ajustes" aria-expanded="false">
                <img src="assets/ui/hud-icons/settings-shuriken.webp?v=0.83.0" alt="" aria-hidden="true">
              </button>
            </div>
          </section>`}
          <!-- RELEASE-BLOCKER 1.0: eliminar este acceso y todo renderDebugTools antes de publicar la versión final. -->
          <button class="debug-tools-trigger" type="button" aria-label="Abrir herramientas de pruebas"><span>DEV</span> PRUEBAS</button>
          ${navigation}
          ${content}
        </div>`;
    },
    mount(root, scope, { save, view }) {
      mountMissionPause(root, scope, (onCancel) => deps.onAbandonSecondary(view, save, onCancel));
      const closeGlobalSettings = () => document.querySelector(".game-settings")?.removeAttribute("open");
      const settingsDetails = document.querySelector(".game-settings");
      const settingsTrigger = root.querySelector(".player-settings-trigger");
      if (settingsTrigger && settingsDetails) {
        let closeSettingsTimer = 0;
        const openSettings = () => {
          window.clearTimeout(closeSettingsTimer);
          settingsDetails.classList.remove("is-closing");
          settingsDetails.open = true;
          settingsTrigger.setAttribute("aria-expanded", "true");
        };
        const closeSettings = () => {
          if (!settingsDetails.open) return;
          settingsDetails.classList.add("is-closing");
          settingsTrigger.setAttribute("aria-expanded", "false");
          closeSettingsTimer = window.setTimeout(() => {
            settingsDetails.open = false;
            settingsDetails.classList.remove("is-closing");
          }, 280);
        };
        settingsTrigger.setAttribute("aria-expanded", settingsDetails.open ? "true" : "false");
        scope.listen(settingsTrigger, "click", () => {
          if (settingsDetails.open && !settingsDetails.classList.contains("is-closing")) closeSettings();
          else openSettings();
        });
        scope.listen(settingsDetails, "toggle", () => {
          if (settingsTrigger.isConnected) settingsTrigger.setAttribute("aria-expanded", settingsDetails.open ? "true" : "false");
        });
        scope.onCleanup(() => window.clearTimeout(closeSettingsTimer));
      }

      root.querySelectorAll("[data-view]").forEach((button) => scope.listen(button, "click", () => {
        closeGlobalSettings();
        deps.onNavigate(button.dataset.view);
      }));
      scope.listen(document.querySelector(".settings-save-slots"), "click", () => {
        closeGlobalSettings();
        deps.onSaveSlots();
      });
      scope.listen(root.querySelector(".debug-tools-trigger"), "click", () => {
        closeGlobalSettings();
        deps.onDebug(save);
      });
      root.querySelectorAll("[data-go]").forEach((button) => {
        const openLocation = () => deps.onNavigate(button.dataset.go);
        scope.listen(button, "click", openLocation);
        if (!button.classList.contains("village-hotspot")) return;
        scope.listen(button, "mouseenter", () => deps.warmLocationAssets(button.dataset.go), { once: true });
        scope.listen(button, "focus", () => deps.warmLocationAssets(button.dataset.go), { once: true });
        const label = root.querySelector(`[data-map-label="${button.dataset.go}"]`);
        const showLabel = () => label?.classList.add("visible");
        const hideLabel = () => label?.classList.remove("visible");
        scope.listen(button, "mouseenter", showLabel);
        scope.listen(button, "mouseleave", hideLabel);
        scope.listen(button, "focus", showLabel);
        scope.listen(button, "blur", hideLabel);
        scope.listen(button, "keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          openLocation();
        });
      });
    },
    dispose() {}
  };
}

