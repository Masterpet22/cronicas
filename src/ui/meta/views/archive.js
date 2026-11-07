import { resolveEnemyProfileForBattle } from "../../../battle/enemy-state.js?v=1.5.0";
import { campaignFlag } from "../../../mission-system.js?v=0.114.0";
import { dictionaryEntriesMarkup, gameDictionaryMarkup } from "../game-dictionary.js";
import { NORMAL_AFFINITY_ID } from "../../../affinity-system.js?v=0.114.0";
import { SAGA_TUTORIAL } from "../../../content/sagas/futuro-prometedor/tutorial.js";
import { lessonCompleted, tutorialStepSatisfied } from "../../../tutorial-system.js";

const TABS = [["dictionary", "Diccionario"], ["tutorial", "Tutorial"], ["bestiary", "Bestiario"], ["chronicle", "Crónica"]];

export function createArchiveView(deps) {
  let currentState = null, activeTab = "dictionary", dictionaryQuery = "";

  function recordsMarkup(save) {
    const missions = deps.missions || [];
    const completed = new Set(save.campaign.completedMissions);
    const crowBandits = new Set(missions.flatMap((mission) => mission.encounters || []));
    const affiliationFor = (id) => crowBandits.has(id) ? "Bandidos del Cuervo" : "Combatiente hostil";
    const bestiaryEntries = Object.entries(save.bestiary.entries).map(([id, entry]) => {
      const mission = missions.find(mission => mission.encounters?.includes(id));
      const enemy = resolveEnemyProfileForBattle(deps.enemyRoster[id], mission, save.character.affinity);
      const bossDataHidden = enemy.boss && entry.encounters < 2 && entry.documents < 1;
      const techniques = entry.techniques.length ? entry.techniques.map((actionId) => deps.enemyActions[actionId]?.name).filter(Boolean).join(", ") : "Ninguna observada";
      const weakness = enemy.affinity === NORMAL_AFFINITY_ID ? "Sin debilidad elemental" : entry.vulnerabilities.length ? entry.vulnerabilities.map(deps.elementName).join(", ") : "Sin descubrir";
      const stats = entry.defeated && !bossDataHidden ? `VID ~${enemy.stats.health} · FUE ~${enemy.stats.strength} · VEL ~${enemy.stats.speed} · CH ~${enemy.stats.chakra} · SUE ~${enemy.stats.luck}` : bossDataHidden && entry.defeated ? "Datos sellados: requiere otro encuentro o un documento" : "Derrota al rival para estimarlas";
      const recordLabel = entry.defeated ? "REGISTRO DE DERROTA" : entry.encounters ? "PRIMER ENCUENTRO" : "INFORMACIÓN RECUPERADA";
        return `<article class="bestiary-entry ${enemy.boss ? "boss" : ""}" style="--enemy-cloth:#${enemy.colors.cloth.toString(16).padStart(6, "0")};--enemy-accent:#${enemy.colors.accent.toString(16).padStart(6, "0")}"><header><div class="bestiary-identity"><span class="bestiary-appearance" aria-label="Modelo provisional de ${deps.escapeHtml(enemy.name)}"><img src="assets/modular/man_sprites/runtime/cabeza.png?v=0.150.0" alt="" loading="lazy"></span><div><span>${recordLabel}</span><h3>${deps.escapeHtml(enemy.name)}</h3></div></div><strong>×${entry.encounters}</strong></header><p>${affiliationFor(id)} · Afinidad ${deps.elementName(enemy.affinity)}</p><dl><div><dt>Técnicas</dt><dd>${deps.escapeHtml(techniques)}</dd></div><div><dt>Debilidad observada</dt><dd>${deps.escapeHtml(weakness)}</dd></div><div><dt>Estadísticas aproximadas</dt><dd>${deps.escapeHtml(stats)}</dd></div><div><dt>Posibles recompensas</dt><dd>${entry.defeated && !bossDataHidden ? "PX, afinidad y monedas" : "Información incompleta"}</dd></div></dl></article>`;
    }).join("") || `<div class="bestiary-empty"><strong>Las páginas aún están vacías.</strong><p>Enfréntate a un rival para crear el primer registro.</p></div>`;
    const records = missions.filter((mission) => deps.missionState(mission, save).unlocked).map((mission) => `<li class="${completed.has(mission.id) ? "done" : ""}"><span>${completed.has(mission.id) ? "✓" : "·"}</span><div><strong>${mission.title}</strong><small>${completed.has(mission.id) ? "Completada" : "Sin completar"}</small></div></li>`).join("");
    const sagaCompleted = missions.length > 0 && missions.every((mission) => completed.has(mission.id));
    const ending = sagaCompleted ? `<div class="ending-card"><p class="eyebrow">CRÓNICA COMPLETADA</p><h2>Futuro prometedor</h2><p>Raizen fue derrotado. Tu primera gran victoria queda registrada en la aldea.</p></div>` : "";
    const hideoutRevealed = campaignFlag(save, "hideoutLocationRevealed");
    const secretEntranceKnown = campaignFlag(save, "secretEntranceKnown");
    const routeIntel = hideoutRevealed ? `<section class="hideout-intel"><p class="eyebrow">MAPA DESCIFRADO</p><h3>Guarida de los bandidos</h3><p>Entrada principal: protegida por enemigos.</p><p class="${secretEntranceKnown ? "known" : "locked"}">Entrada secreta: ${secretEntranceKnown ? "marcada junto al almacén de monedas" : "ubicación desconocida"}.</p></section>` : "";
    const decisions = [
      save.campaign.banditPrisonerChoice && (save.campaign.banditPrisonerChoice === "interrogate" ? "Teniente interrogado: reveló la entrada secreta y reforzó a Akumori. Su ayuda debilita a Raizen." : "Teniente eliminado: Akumori no recibió refuerzos; se perdieron el acceso secreto y la ayuda futura."),
      save.campaign.hideoutEntryChoice && `Acceso elegido: ${save.campaign.hideoutEntryChoice === "secret" ? "entrada secreta y almacén" : "entrada principal"}.`,
      save.campaign.hideoutDiscoveryChoice && (save.campaign.hideoutDiscoveryChoice === "documents" ? "Documentos recuperados: información parcial sobre Raizen registrada en el Bestiario." : "Prisioneros liberados: sus testimonios confirman una organización mayor.")
    ].filter(Boolean).map(text => `<p>${deps.escapeHtml(text)}</p>`).join("");
    return {
      bestiary: `<header class="archive-section-heading"><h3>Libro de criaturas y combatientes</h3><p>Cada encuentro añade información. Algunos jefes requieren varios duelos o documentos.</p></header><div class="archive-scroll" tabindex="0" aria-label="Fichas del bestiario"><div class="bestiary-grid">${bestiaryEntries}</div></div>`,
      chronicle: `<header class="archive-section-heading"><h3>Crónica de ${deps.escapeHtml(save.character.name)}</h3><p>${completed.size} misiones principales completadas.</p></header><div class="archive-scroll chronicle-details" tabindex="0" aria-label="Historia descubierta">${routeIntel}${decisions}<ol>${records}</ol>${ending}</div>`
    };
  }

  return {
    id: "archive",
    render(state) {
      currentState = state;
      const { save } = state;
      const unlocked = save.campaign.archiveUnlocked;
      const pending = save.campaign.doctorBookDeliveryPending;
      const records = unlocked ? recordsMarkup(save) : null;
      const lockedBestiary = `<div class="archive-empty"><h3>El bestiario espera su primer registro</h3><p>Entrega a Sayo el libro de Haru para activar las fichas de criaturas y combatientes.</p></div>`;
      const lockedChronicle = `<div class="archive-empty"><h3>Tu crónica está por abrirse</h3><p>Sayo registrará tu historia al recibir el libro de Haru.</p></div>`;
      const curriculum = SAGA_TUTORIAL.map((course, index) => {
        const count = course.before.filter(step => lessonCompleted(save, step.id) || tutorialStepSatisfied(step, save)).length + course.practices.filter(id => lessonCompleted(save, id)).length;
        return `<details class="tutorial-course"><summary>${index + 1}. ${deps.escapeHtml(course.title)} <small>${save.campaign.completedMissions.includes(course.missionId) ? "Completado" : `${count}/${course.before.length + course.practices.length} prácticas`}</small></summary><ul>${course.before.map(step => `<li>${deps.escapeHtml(step.title)}</li>`).join("")}<li>Práctica en misión: ${course.practices.length} objetivos comprobados.</li></ul></details>`;
      }).join("");
      const tutorial = `<div class="archive-scroll" tabindex="0" aria-label="Formación de Novicio"><section class="archive-tutorial"><p class="eyebrow">MANUAL DEL COMBATIENTE</p><h3>Saga 1 · Formación de Novicio</h3><p>Las siete misiones enseñan combate, preparación, investigación, rutas, información, estados y decisiones. La guía de cada misión acredita acciones realizadas.</p><p>Repite el primer módulo con vida, chakra, ritmo, golpe, Guardia, arma, shuriken, tablas, técnicas y sellos. El repaso no cambia tu partida y permite salir en cualquier momento.</p><button class="primary-button" type="button" data-replay-tutorial>REPETIR TUTORIAL GUIADO</button>${curriculum}</section></div>`;
      const content = { dictionary: gameDictionaryMarkup(deps.escapeHtml, dictionaryQuery), tutorial, bestiary: records?.bestiary || lockedBestiary, chronicle: records?.chronicle || lockedChronicle };
      return `<section class="stage-panel archive-card archive-workspace" aria-label="Biblioteca"><header class="archive-heading"><div><p class="eyebrow">BIBLIOTECA</p><h2>El conocimiento de la aldea</h2></div><span>Archivo de Sayo</span></header>${pending ? `<aside class="archive-delivery book-delivery" aria-label="Entrega pendiente"><div><strong>El libro de Haru Takamine</strong><p>Entrega el libro a Sayo para activar el bestiario y continuar la historia.</p></div><button class="primary-button" type="button" data-deliver-book>ENTREGAR LIBRO</button></aside>` : ""}<nav class="archive-tabs" role="tablist" aria-label="Secciones de la Biblioteca">${TABS.map(([id, label]) => `<button type="button" id="archive-tab-${id}" data-archive-tab="${id}" role="tab" aria-selected="${activeTab === id}" aria-controls="archive-panel-${id}" tabindex="${activeTab === id ? 0 : -1}">${label}${!unlocked && ["bestiary", "chronicle"].includes(id) ? '<small>Pendiente</small>' : ""}</button>`).join("")}</nav><div class="archive-panels">${TABS.map(([id]) => `<section id="archive-panel-${id}" class="archive-panel" data-archive-panel="${id}" role="tabpanel" aria-labelledby="archive-tab-${id}" ${activeTab === id ? "" : "hidden"}>${content[id]}</section>`).join("")}</div></section>`;
    },

    mount(root, scope) {
      const tabs = [...root.querySelectorAll("[data-archive-tab]")];
      const selectTab = id => {
        activeTab = id;
        tabs.forEach(button => {
          const selected = button.dataset.archiveTab === id;
          button.setAttribute("aria-selected", String(selected)); button.tabIndex = selected ? 0 : -1;
        });
        root.querySelectorAll("[data-archive-panel]").forEach(panel => { panel.hidden = panel.dataset.archivePanel !== id; });
      };
      tabs.forEach((button, index) => {
        scope.listen(button, "click", () => selectTab(button.dataset.archiveTab));
        scope.listen(button, "keydown", event => {
          const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
          if (next === undefined) return;
          event.preventDefault(); selectTab(tabs[next].dataset.archiveTab); tabs[next].focus();
        });
      });
      scope.listen(root.querySelector("[data-dictionary-search]"), "input", event => {
        dictionaryQuery = event.target.value;
        root.querySelector("[data-dictionary-entries]").innerHTML = dictionaryEntriesMarkup(dictionaryQuery, deps.escapeHtml);
        root.querySelector("[data-dictionary-entries]").scrollTop = 0;
      });
      scope.listen(root.querySelector("[data-replay-tutorial]"), "click", () => {
        const mission = deps.missions.find(entry => entry.flow?.some(step => step.type === "combat" && step.tutorial));
        if (mission) deps.onStartMission(currentState.save, { ...mission, tutorialReplay: true });
      });
      scope.listen(root.querySelector("[data-deliver-book]"), "click", () => {
        const secretMarked = currentState.save.campaign.banditPrisonerChoice === "interrogate";
        deps.showDialogue([
          ["Sayo Kisaragi", "Haru tenía razón: este libro no es una enciclopedia terminada. Es un registro de campo que aprenderá de cada enfrentamiento."],
          ["Sayo Kisaragi", "El primer encuentro anotará nombre, apariencia y afiliación. Presenciar una técnica, hallar una debilidad y derrotar al rival completará el resto."],
          ["Sayo Kisaragi", secretMarked ? "El testimonio del teniente confirma dos entradas. La secreta termina junto al almacén de monedas; la principal está protegida." : "El mapa confirma la entrada principal, pero el acceso oculto no puede localizarse sin el testimonio del teniente."]
        ], () => { activeTab = "bestiary"; deps.onDeliverBook(); }, "ACTIVAR REGISTRO", "story");
      });
    },
    dispose() { currentState = null; }
  };
}
