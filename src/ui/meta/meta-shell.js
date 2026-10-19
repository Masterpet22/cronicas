export function createMetaShell(deps) {
  return {
    id: "meta-shell",
    render({ save, view }, content) {
      const { character, progression, campaign } = save;
      const visibleStoryMissionIds = deps.sagas.flatMap((saga) => saga.missionIds);
      const currentLocation = deps.locations.find((location) => location.id === view)
        || (view === "kagemori" ? { name: "Aldea de Kagemori" } : view === "doctor-route" ? { name: "Caminos del Norte" } : view === "debug" ? { name: "Herramientas de pruebas" } : null);
      const isSecondaryField = view === "kagemori" || view === "doctor-route";
      const navigation = view === "plaza" ? "" : `<nav class="village-nav village-return" aria-label="Navegación de la aldea"><button ${isSecondaryField ? "data-abandon-secondary" : "data-view=\"plaza\""}>← ${isSecondaryField ? "Abandonar misión" : "Volver al mapa"}</button><span>${deps.escapeHtml(currentLocation?.name || "Aldea del Horizonte")}</span></nav>`;
      return `
        <div class="village-shell">
          <section class="village-topbar">
            <div class="profile-heading">
              <span class="avatar-swatch" style="--avatar:${character.appearance}"></span>
              <div class="profile-copy"><p class="eyebrow">${campaign.rank.toUpperCase()}</p><h2>${deps.escapeHtml(character.name)}</h2></div>
              <strong class="level-chip">Nivel ${progression.level}</strong>
            </div>
            <div class="campaign-summary">
              <span class="summary-item"><b aria-hidden="true">★</b><strong>${progression.xp}/${deps.xpForNextLevel(progression.level)}</strong><small>PX</small></span>
              <span class="summary-item"><b aria-hidden="true">▣</b><strong>${progression.coins}</strong><small>monedas</small></span>
              <span class="summary-item"><b aria-hidden="true">♛</b><strong>${campaign.completedMissions.filter((id) => visibleStoryMissionIds.includes(id)).length}/${visibleStoryMissionIds.length}</strong><small>misiones</small></span>
            </div>
            <button class="player-settings-trigger" type="button" aria-label="Abrir ajustes" aria-expanded="false">
              <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 4 39 24 60 18 44 32 60 46 39 40 32 60 25 40 4 46 20 32 4 18 25 24Z"/><circle cx="32" cy="32" r="6"/></svg>
            </button>
            <button class="save-slots-trigger" type="button" aria-label="Cambiar de partida">PARTIDAS</button>
            <!-- RELEASE-BLOCKER 1.0: eliminar este acceso y todo renderDebugTools antes de publicar la versión final. -->
            <button class="debug-tools-trigger" type="button" aria-label="Abrir herramientas de pruebas">PRUEBAS</button>
          </section>
          ${navigation}
          ${content}
        </div>`;
    },
    mount(root, scope, { save, view }) {
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
      scope.listen(root.querySelector(".save-slots-trigger"), "click", () => {
        closeGlobalSettings();
        deps.onSaveSlots();
      });
      scope.listen(root.querySelector(".debug-tools-trigger"), "click", () => {
        closeGlobalSettings();
        deps.onDebug(save);
      });
      scope.listen(root.querySelector("[data-abandon-secondary]"), "click", () => deps.onAbandonSecondary(view, save));
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

