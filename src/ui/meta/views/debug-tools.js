export function createDebugToolsView(deps) {
  let currentState = null;

  return {
    id: "debug",

    render(state) {
      currentState = state;
      const { save, debugSnapshot } = state;
      const campaign = save.campaign;
      const checkpointCards = deps.checkpoints.map((checkpoint) => `<button class="debug-checkpoint" type="button" data-debug-checkpoint="${checkpoint.id}"><strong>${deps.escapeHtml(checkpoint.label)}</strong><small>${deps.escapeHtml(checkpoint.description)}</small></button>`).join("");
      const missionCards = deps.missions.map((mission) => {
        const completed = campaign.completedMissions.includes(mission.id);
        return `<article class="debug-mission ${completed ? "completed" : ""}"><span>${String(mission.number).padStart(2, "0")}</span><div><strong>${deps.escapeHtml(mission.title)}</strong><small>${deps.escapeHtml(mission.location)} · ${mission.encounters.length} encuentro${mission.encounters.length === 1 ? "" : "s"}</small></div><button type="button" data-debug-mission="${mission.id}" ${mission.comingSoon ? "disabled" : ""}>${mission.comingSoon ? "NO DISPONIBLE" : "INICIAR DIRECTO"}</button></article>`;
      }).join("");
      const debugFlags = [
        ["Tablón", campaign.secondaryBoardUnlocked],
        ["Kagemori", campaign.kagemoriInvestigated],
        ["Misión 2", campaign.banditBossMissionUnlocked],
        ["Doctor", campaign.doctorMissionUnlocked],
        ["Biblioteca", campaign.archiveUnlocked],
        ["Elegir maestro", campaign.masterSelectionUnlocked]
      ].map(([label, enabled]) => `<span class="debug-flag ${enabled ? "enabled" : ""}">${enabled ? "✓" : "·"} ${label}</span>`).join("");
      return `<section class="debug-screen">
        <header class="debug-heading"><div><p class="eyebrow">MODO DE DESARROLLO</p><h2>Herramientas de pruebas</h2><p>Estos controles modifican solamente la partida activa. No conceden PX, monedas ni recompensas.</p></div><button class="secondary-button" type="button" data-debug-restore ${debugSnapshot ? "" : "disabled"}>RESTAURAR ESTADO DE ENTRADA</button></header>
        <aside class="debug-release-warning" role="note"><strong>RETIRAR ANTES DE 1.0</strong><span>Esta pantalla y el botón PRUEBAS son herramientas internas; no deben formar parte de la publicación final.</span></aside>
        <div class="debug-status">${debugFlags}<span class="debug-choice">Teniente: ${deps.escapeHtml(campaign.banditPrisonerChoice || "sin decisión")}</span></div>
        <section class="debug-section"><div><p class="eyebrow">PROGRESO RÁPIDO</p><h3>Aplicar punto de control</h3></div><p>Prepara un estado coherente de la saga sin reproducir escenas ni entregar recompensas.</p><div class="debug-checkpoints">${checkpointCards}</div></section>
        <section class="debug-section"><div><p class="eyebrow">ACCESO DIRECTO</p><h3>Saltar a una ubicación</h3></div><div class="debug-location-grid"><button type="button" data-debug-view="plaza">ALDEA</button><button type="button" data-debug-view="headquarters">CUARTEL</button><button type="button" data-debug-view="missions">TABLÓN</button><button type="button" data-debug-view="kagemori">KAGEMORI</button><button type="button" data-debug-view="dojo">DOJO</button><button type="button" data-debug-view="archive">BIBLIOTECA</button></div></section>
        <section class="debug-section"><div><p class="eyebrow">DECISIÓN PERSISTENTE</p><h3>Destino del teniente</h3></div><div class="debug-decision-grid"><button type="button" data-debug-choice="interrogate">INTERROGADO Y PERDONADO</button><button type="button" data-debug-choice="eliminate">ELIMINADO</button><button type="button" data-debug-choice="clear">SIN DECISIÓN</button></div></section>
        <section class="debug-section debug-missions-section"><div><p class="eyebrow">SIN BRIEFING</p><h3>Iniciar una misión directamente</h3></div><p>Ignora requisitos y diálogos del Cuartel, pero conserva las fases internas de la misión.</p><div class="debug-mission-list">${missionCards}</div></section>
      </section>`;
    },

    mount(root, scope) {
      if (!currentState) return;
      root.querySelectorAll("[data-debug-checkpoint]").forEach((button) => scope.listen(button, "click", () => deps.onCheckpoint(button.dataset.debugCheckpoint)));
      root.querySelectorAll("[data-debug-view]").forEach((button) => scope.listen(button, "click", () => deps.onNavigate(button.dataset.debugView)));
      root.querySelectorAll("[data-debug-choice]").forEach((button) => scope.listen(button, "click", () => deps.onChoice(button.dataset.debugChoice)));
      root.querySelectorAll("[data-debug-mission]").forEach((button) => scope.listen(button, "click", () => deps.onMission(button.dataset.debugMission)));
      scope.listen(root.querySelector("[data-debug-restore]"), "click", () => deps.onRestore());
    },

    dispose() { currentState = null; }
  };
}
