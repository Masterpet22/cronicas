export function createArchiveView(deps) {
  let currentState = null;

  return {
    id: "archive",

    render(state) {
      currentState = state;
      const { save } = state;
      const tutorial = `<section class="archive-tutorial"><p class="eyebrow">MANUAL DEL COMBATIENTE</p><h3>Tutorial de combate</h3><p>Repite la guía de la misión 1 sobre el campo de batalla: vida, chakra, velocidad, ataques, guardia, técnicas y sellos.</p><p>Práctica sin recompensas ni cambios en tu progreso. Puedes salir en cualquier momento.</p><button class="primary-button" type="button" data-replay-tutorial>REPETIR TUTORIAL GUIADO</button></section>`;
      if (save.campaign.doctorBookDeliveryPending) {
        const secretMarked = save.campaign.banditPrisonerChoice === "interrogate";
        return `<section class="stage-panel book-delivery">${tutorial}<p class="eyebrow">ENTREGA PENDIENTE</p><h2>El libro de Haru Takamine</h2><p class="lead">Sayo debe registrar el volumen antes de que sus páginas puedan actualizarse con tus encuentros.</p><div class="entrance-preview"><article><span>ENTRADA PRINCIPAL</span><strong>Defendida por enemigos</strong><p>El mapa de Haru confirma una ruta frontal hacia la guarida.</p></article><article class="${secretMarked ? "secret-known" : "secret-locked"}"><span>ENTRADA SECRETA</span><strong>${secretMarked ? "Almacén de monedas localizado" : "Ruta sin marcar"}</strong><p>${secretMarked ? "La información del teniente permite reconocer el acceso oculto." : "Sin el testimonio del teniente, esta sección del mapa permanece incompleta."}</p></article></div><button class="primary-button" type="button" data-deliver-book>ENTREGAR EL LIBRO A SAYO</button></section>`;
      }

      if (!save.campaign.archiveUnlocked) return `<section class="stage-panel archive-card"><p class="eyebrow">BIBLIOTECA</p><h2>Aprende a combatir</h2>${tutorial}<p>El bestiario se abrirá cuando entregues a Sayo el libro de Haru. El tutorial está siempre disponible.</p></section>`;

      const completed = new Set(save.campaign.completedMissions);
      const crowBandits = new Set(deps.missions.flatMap((mission) => mission.encounters || []));
      const affiliationFor = (id) => crowBandits.has(id) ? "Bandidos del Cuervo" : "Combatiente hostil";
      const bestiaryEntries = Object.entries(save.bestiary.entries).map(([id, entry]) => {
        const enemy = deps.enemyRoster[id];
        const bossDataHidden = enemy.boss && entry.encounters < 2 && entry.documents < 1;
        const techniques = entry.techniques.length ? entry.techniques.map((actionId) => deps.enemyActions[actionId]?.name).filter(Boolean).join(", ") : "Ninguna observada";
        const weakness = entry.vulnerabilities.length ? entry.vulnerabilities.map(deps.elementName).join(", ") : "Sin descubrir";
        const stats = entry.defeated && !bossDataHidden ? `VID ~${enemy.stats.health} · FUE ~${enemy.stats.strength} · VEL ~${enemy.stats.speed} · CH ~${enemy.stats.chakra} · SUE ~${enemy.stats.luck}` : bossDataHidden && entry.defeated ? "Datos sellados: requiere otro encuentro o un documento" : "Derrota al rival para estimarlas";
        const recordLabel = entry.defeated ? "REGISTRO DE DERROTA" : entry.encounters ? "PRIMER ENCUENTRO" : "INFORMACIÓN RECUPERADA";
        return `<article class="bestiary-entry ${enemy.boss ? "boss" : ""}" style="--enemy-cloth:#${enemy.colors.cloth.toString(16).padStart(6, "0")};--enemy-accent:#${enemy.colors.accent.toString(16).padStart(6, "0")}"><header><div class="bestiary-identity"><span class="bestiary-appearance" aria-label="Modelo provisional de ${deps.escapeHtml(enemy.name)}"><img src="assets/modular/man_sprites/runtime/cabeza.png?v=0.108.0" alt="" loading="lazy"></span><div><span>${recordLabel}</span><h3>${deps.escapeHtml(enemy.name)}</h3></div></div><strong>×${entry.encounters}</strong></header><p>${affiliationFor(id)} · Afinidad ${deps.elementName(enemy.affinity)}</p><dl><div><dt>Técnicas</dt><dd>${deps.escapeHtml(techniques)}</dd></div><div><dt>Debilidad observada</dt><dd>${deps.escapeHtml(weakness)}</dd></div><div><dt>Estadísticas aproximadas</dt><dd>${deps.escapeHtml(stats)}</dd></div><div><dt>Posibles recompensas</dt><dd>${entry.defeated && !bossDataHidden ? "PX, afinidad y monedas" : "Información incompleta"}</dd></div></dl></article>`;
      }).join("") || `<div class="bestiary-empty"><strong>Las páginas aún están vacías.</strong><p>Enfréntate a un rival para crear el primer registro.</p></div>`;
      const records = deps.missions.filter((mission) => deps.missionState(mission, save).unlocked).map((mission) => `<li class="${completed.has(mission.id) ? "done" : ""}"><span>${completed.has(mission.id) ? "✓" : "·"}</span><div><strong>${mission.title}</strong><small>${completed.has(mission.id) ? "Completada" : "Sin completar"}</small></div></li>`).join("");
      const sagaCompleted = deps.missions.length > 0 && deps.missions.every((mission) => completed.has(mission.id));
      const ending = sagaCompleted ? `<div class="ending-card"><p class="eyebrow">CRÓNICA COMPLETADA</p><h2>Futuro prometedor</h2><p>Raizen fue derrotado. Tu primera gran victoria queda registrada en la aldea.</p></div>` : "";
      const hideoutRevealed = campaignFlag(save, "hideoutLocationRevealed");
      const secretEntranceKnown = campaignFlag(save, "secretEntranceKnown");
      const routeIntel = hideoutRevealed ? `<section class="hideout-intel"><p class="eyebrow">MAPA DESCIFRADO</p><h3>Guarida de los bandidos</h3><p>Entrada principal: protegida por enemigos.</p><p class="${secretEntranceKnown ? "known" : "locked"}">Entrada secreta: ${secretEntranceKnown ? "marcada junto al almacén de monedas" : "ubicación desconocida"}.</p></section>` : "";
      return `<section class="stage-panel archive-card" data-comment="El libro se completa al observar y derrotar enemigos."><p class="eyebrow">BIBLIOTECA</p><h2>Libro de criaturas y combatientes</h2><p class="lead">Cada encuentro añade información. Algunos jefes requieren varios duelos o documentos.</p>${tutorial}${routeIntel}<div class="bestiary-grid">${bestiaryEntries}</div><details class="chronicle-details"><summary>Crónica de ${deps.escapeHtml(save.character.name)} · ${completed.size} misiones</summary><ol>${records}</ol>${ending}</details></section>`;
    },

    mount(root, scope) {
      scope.listen(root.querySelector("[data-replay-tutorial]"), "click", () => {
        const mission = deps.missions.find(entry => entry.flow?.some(step => step.type === "combat" && step.tutorial));
        if (mission) deps.onStartMission(currentState.save, { ...mission, tutorialReplay: true });
      });
      if (!currentState?.save.campaign.doctorBookDeliveryPending) return;
      scope.listen(root.querySelector("[data-deliver-book]"), "click", () => {
        const secretMarked = currentState.save.campaign.banditPrisonerChoice === "interrogate";
        deps.showDialogue([
          ["Sayo Kisaragi", "Haru tenía razón: este libro no es una enciclopedia terminada. Es un registro de campo que aprenderá de cada enfrentamiento."],
          ["Sayo Kisaragi", "El primer encuentro anotará nombre, apariencia y afiliación. Presenciar una técnica, hallar una debilidad y derrotar al rival completará el resto."],
          ["Sayo Kisaragi", secretMarked ? "El testimonio del teniente confirma dos entradas. La secreta termina junto al almacén de monedas; la principal está protegida." : "El mapa confirma la entrada principal, pero el acceso oculto no puede localizarse sin el testimonio del teniente."]
        ], deps.onDeliverBook, "ACTIVAR REGISTRO", "story");
      });
    },

    dispose() { currentState = null; }
  };
}
import { campaignFlag } from "../../../mission-system.js?v=0.114.0";

