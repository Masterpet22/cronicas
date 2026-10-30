import { KAGEMORI_CLUES } from "../../../content/sagas/futuro-prometedor/s01-kagemori/clues.js";
import { campaignFlag } from "../../../mission-system.js?v=0.114.0";
import { renderDoctorRouteMap } from "../doctor-route-map.js";
import { mountDoctorCipher, renderDoctorCipher } from "../doctor-cipher.js?v=0.114.0";

export function createMissionBoardsView(deps) {
  let currentState = null;
  let layout = { locationId: null };
  let boardMissions = [];

  const missionById = (id) => deps.mainMissions.find((mission) => mission.id === id);
  const visibleSagaMissions = (saga) => saga.missionIds.map(missionById).filter((mission) => mission && deps.missionState(mission, currentState.save).unlocked);
  const secondaryByType = (type) => deps.secondaryMissionByType(type, deps.fieldMissions || deps.secondaryMissions);

  function briefingForMission(mission, save) {
    const master = deps.masterForCharacter(save.character);
    const localized = deps.getDialogue(mission.dialogueId, { save, variables: { master: master.name }, placement: { surface: "mission-briefing", owner: mission.id } })
      .map((line) => [line.speaker === "master" ? master.name : deps.npcName(line.speaker), line.text]);
    if (!mission.tacticalBriefing) return localized;
    const counterAffinity = { fuego: "agua", viento: "fuego", tierra: "viento", agua: "tierra" };
    const identifiedEnemies = mission.encounters.filter((enemyId) => {
      const entry = save.bestiary.entries[enemyId];
      return entry && (entry.encounters > 0 || entry.documents > 0);
    });
    const knownTechniques = mission.encounters.flatMap((enemyId) => save.bestiary.entries[enemyId]?.techniques || []).map((id) => deps.enemyActions[id]?.name).filter(Boolean);
    const knownWeaknesses = mission.encounters.flatMap((enemyId) => save.bestiary.entries[enemyId]?.vulnerabilities || []).map(deps.elementName);
    const recommendedAffinities = identifiedEnemies.map((enemyId) => counterAffinity[deps.enemyRoster[enemyId]?.affinity]).filter(Boolean).map(deps.elementName);
    const libraryAdvice = knownWeaknesses.length
      ? `El libro señala vulnerabilidad a ${[...new Set(knownWeaknesses)].join(" y ")}. Prepara una técnica compatible.`
      : knownTechniques.length
        ? `El libro ya registró ${[...new Set(knownTechniques)].slice(0, 2).join(" y ")}. Reserva chakra para responder.`
        : recommendedAffinities.length
          ? `Las fichas identificadas recomiendan técnicas de ${[...new Set(recommendedAffinities)].join(" y ")}. Los demás datos siguen incompletos.`
          : "El libro todavía tiene huecos sobre estos enemigos. Observa sus técnicas para completar el registro.";
    return [...localized, ["Sayo Kisaragi", libraryAdvice], [master.name, deps.missionHasStep(mission, "resource") ? "Yo te aconsejaré entre duelos. Descansar ayuda ahora; conservar suministros puede ayudarte después." : "Mi ventaja pasiva seguirá contigo. Lee el ritmo del rival y no gastes chakra sin un propósito."]];
  }

  function renderStoryBoard(state) {
    const { save, selectedSagaId } = state;
    const completed = new Set(save.campaign.completedMissions);
    const activeSaga = selectedSagaId ? deps.sagas.find((saga) => saga.id === selectedSagaId) : null;
    const sagaUnlocked = (_saga, index) => index === 0 || deps.sagas[index - 1].missionIds.every((id) => completed.has(id));
    if (!activeSaga) {
      const sagaCards = deps.sagas.filter((saga, index) => sagaUnlocked(saga, index)).map((saga, index) => {
        const unlocked = sagaUnlocked(saga, index);
        const missions = visibleSagaMissions(saga);
        const completedCount = missions.filter((mission) => completed.has(mission.id)).length;
        return `<button class="saga-card ${unlocked ? "" : "locked"} ${saga.missionIds.every((id) => completed.has(id)) ? "completed" : ""}" type="button" data-saga="${saga.id}" ${unlocked ? "" : "disabled"}><span class="saga-number">SAGA ${String(saga.number).padStart(2, "0")}</span><strong>${deps.escapeHtml(saga.title)}</strong><small>${deps.escapeHtml(saga.subtitle)}</small><div class="saga-progress"><span>${completedCount}/${missions.length} misiones</span><span>Misiones descubiertas</span></div><span class="saga-action">${unlocked ? "VER MISIONES →" : "BLOQUEADA"}</span></button>`;
      }).join("");
      const missionIds = deps.sagas.flatMap((saga) => visibleSagaMissions(saga).map((mission) => mission.id));
      const completedStory = missionIds.filter((id) => completed.has(id)).length;
      return `<section class="stage-panel mission-board saga-selector" data-comment="La campaña está dividida en sagas. Completa una saga para desbloquear la siguiente."><div class="section-heading"><div><p class="eyebrow">CENTRO DE MANDO</p><h2>Selecciona una saga</h2></div><strong>${completedStory}/${missionIds.length} completadas</strong></div><p class="lead">Cada saga agrupa un arco de la historia principal. Entra en una para ver sus misiones.</p><div class="saga-grid">${sagaCards}</div></section>`;
    }
    if (!sagaUnlocked(activeSaga, deps.sagas.indexOf(activeSaga))) return "";
    const missions = visibleSagaMissions(activeSaga);
    const mechanics = { combat: "combate", investigation: "investigación", route: "rutas", choice: "decisiones", resource: "recursos", consequence: "consecuencias" };
    const cards = missions.map((mission) => {
      const unlocked = deps.missionState(mission, save).unlocked;
      const done = completed.has(mission.id);
      const progressStatus = save.campaign.missionProgress[mission.id]?.status;
      const inProgress = progressStatus === "in-progress";
      const label = mission.comingSoon && unlocked ? "PRÓXIMAMENTE" : done ? mission.type ? "COMPLETADA" : "REPETIR" : progressStatus === "failed" ? "REINTENTAR" : inProgress ? "CONTINUAR" : unlocked ? "INICIAR HISTORIA" : "BLOQUEADA";
      const activityLabels = [...new Set(mission.flow.filter((step) => step.type !== "dialogue").map((step) => mechanics[step.type] || step.type))].join(" + ");
      const details = mission.comingSoon ? "Objetivo localizado · Contenido en desarrollo" : `${activityLabels} · ${mission.duration} · ${mission.reward.xp} PX · ${mission.reward.coins} monedas`;
      return `<article class="mission-card ${done ? "completed" : ""} ${unlocked ? "" : "locked"} ${mission.comingSoon ? "coming-soon" : ""}"><div class="mission-number">${String(mission.number).padStart(2, "0")}</div><div><p class="eyebrow">MISIÓN CLASE ${mission.rank || "D"} · ${mission.location}</p><h3>${mission.title}</h3><p>${details}</p></div><button data-mission="${mission.id}" ${unlocked && !mission.comingSoon && !(done && mission.type) ? "" : "disabled"}>${label}</button></article>`;
    }).join("");
    const completedInSaga = missions.filter((mission) => completed.has(mission.id)).length;
    return `<section class="stage-panel mission-board" data-comment="Estas son las misiones que forman la saga seleccionada."><div class="saga-header"><button class="secondary-button saga-back" type="button" data-back-sagas>← SAGAS</button><div><p class="eyebrow">SAGA ${String(activeSaga.number).padStart(2, "0")}</p><h2>${deps.escapeHtml(activeSaga.title)}</h2><p>${deps.escapeHtml(activeSaga.subtitle)}</p></div><strong>${completedInSaga}/${missions.length}</strong></div><div class="mission-list">${cards}</div></section>`;
  }

  function renderSecondaryBoard(state) {
    const { save } = state;
    if (!deps.secondaryMissions.length) return `<section class="stage-panel mission-board"><div class="section-heading"><div><p class="eyebrow">TABLÓN DE ENCARGOS</p><h2>Misiones secundarias</h2></div><strong>0 disponibles</strong></div><div class="development-note"><strong>Sin encargos publicados.</strong><br>Compra un contrato en la tienda para comenzar un encargo.</div></section>`;
    boardMissions = deps.missionsForBoard(deps.secondaryMissions, "missions", save);
    const cardModels = boardMissions.map(({ mission }) => deps.secondaryMissionCardModel(mission, save)).filter((model) => model?.visible);
    const choiceBonus = save.campaign.banditPrisonerChoice === "interrogate"
      ? `<div class="notice-card ally"><strong>Información con un coste</strong><span>Entrada secreta y monedas ×2; Akumori recibió refuerzos.</span></div>`
      : save.campaign.banditPrisonerChoice === "eliminate" ? `<div class="notice-card"><strong>Ventaja táctica</strong><span>Akumori no recibió refuerzos; se perdieron la entrada secreta y el aliado futuro.</span></div>` : "";
    const availableCount = cardModels.filter(({ state: missionStatus }) => missionStatus.unlocked && !missionStatus.completed).length;
    const cards = cardModels.map(({ mission, state: missionStatus, disabled, detail, actionLabel }) => `<article class="mission-card ${missionStatus.completed ? "completed" : ""}"><div class="mission-number">${String(mission.number).padStart(2, "0")}</div><div><p class="eyebrow">ENCARGO DE SAYO · CLASE ${mission.rank}</p><h3>${deps.escapeHtml(mission.title)}</h3><p>${deps.escapeHtml(detail)}</p></div><button type="button" data-secondary-mission="${deps.escapeHtml(mission.id)}" ${disabled ? "disabled" : ""}>${actionLabel}</button></article>`).join("");
    return `<section class="stage-panel mission-board" data-comment="Sayo publica aquí investigaciones y búsquedas que abren nuevas rutas de la historia."><div class="section-heading"><div><p class="eyebrow">TABLÓN DE ENCARGOS</p><h2>Misiones secundarias</h2></div><strong>${availableCount} disponible${availableCount === 1 ? "" : "s"}</strong></div><p class="lead">Compra contratos en la tienda para conseguir objetos especiales e invocaciones. Sus recompensas se entregan una sola vez.</p>${choiceBonus}<div class="mission-list">${cards}</div></section>`;
  }

  function renderKagemori(state) {
    const mission = secondaryByType("investigation");
    const completed = deps.missionState(mission, state.save).completed;
    if (completed) return `<section class="kagemori-complete"><p class="eyebrow">INVESTIGACIÓN COMPLETADA</p><h2>El rastro continúa</h2><p>Nami ubicó la guarida en el Desfiladero del Cuervo. La siguiente misión ya figura en el Cuartel General.</p><button class="primary-button" type="button" data-view="plaza">VOLVER A LA ALDEA</button></section>`;
    const clues = state.investigatedClues;
    return `<section class="kagemori-investigation"><header><div><p class="eyebrow">ALDEA DE KAGEMORI</p><h2>Reconstruye la ruta de los bandidos</h2></div><strong data-clue-count>${clues.size}/3 pistas</strong></header><p class="investigation-log" data-investigation-log>Explora la escena y selecciona las áreas sospechosas.</p><svg class="clue-hotspots" viewBox="0 0 1672 941" preserveAspectRatio="none" aria-label="Áreas de investigación">${KAGEMORI_CLUES.map((clue) => `<g class="clue-hotspot ${clues.has(clue.id) ? "found" : ""}" data-clue="${clue.id}" role="button" tabindex="0" aria-label="Investigar ${deps.escapeHtml(clue.label)}"><path class="clue-shape" d="${clue.path}"/></g>`).join("")}</svg>${KAGEMORI_CLUES.map((clue) => `<span class="clue-label" data-clue-label="${clue.id}" aria-hidden="true" style="--clue-label-x:${clue.labelX}%;--clue-label-y:${clue.labelY}%"><strong>${clues.has(clue.id) ? "✓ " : ""}${deps.escapeHtml(clue.label)}</strong></span>`).join("")}</section>`;
  }

  function renderDoctorRoute(state) {
    const current = state.save.campaign.doctorRoute;
    const metrics = `<div class="route-metrics"><span><small>PELIGRO</small><strong>${current.danger}</strong></span><span><small>TIEMPO</small><strong>${current.time}</strong></span><span><small>PISTAS</small><strong>${current.clues}</strong></span><span><small>RECURSOS</small><strong>${current.resources}</strong></span></div>`;
    if (current.phase >= 3) return renderDoctorCipher(current, secondaryByType("route-search"), deps, state.save);
    const pendingRiver = current.pendingEvent?.type === "river";
    const pendingCombat = current.pendingEvent?.type === "combat";
    const routeMap = renderDoctorRouteMap(current, deps.doctorRouteDefinitions, deps.escapeHtml);
    const riverPanel = pendingRiver ? `<section class="river-investigation"><p class="eyebrow">LEE LA CORRIENTE</p><h3>Encuentra el paso correcto</h3><p>${deps.escapeHtml(current.lastEvent)}</p><div>${deps.riverPassages.map((passage) => `<button type="button" data-passage="${passage.id}">${passage.label}</button>`).join("")}</div></section>` : "";
    const combatPanel = pendingCombat ? `<section class="river-investigation combat-route-prompt"><p class="eyebrow">PELIGRO EN EL SENDERO</p><h3>Un saqueador bloquea el bosque</h3><p>${deps.escapeHtml(current.lastEvent)}</p><div><button type="button" data-resume-route-combat>INICIAR DUELO 1 CONTRA 1</button></div></section>` : "";
    return `<section class="doctor-route-screen"><header><div><p class="eyebrow">EL MÉDICO ERRANTE · TRAMO ${current.phase + 1}/3</p><h2>Tras el rastro de Haru</h2><p>Sigue los caminos. Cada desvío abre unas rutas y deja otras atrás.</p></div>${metrics}</header><div class="route-workspace ${pendingRiver || pendingCombat ? "has-event" : ""}">${routeMap}${riverPanel}${combatPanel}</div>${current.lastEvent && !pendingRiver && !pendingCombat ? `<p class="route-log" role="status">${deps.escapeHtml(current.lastEvent)}</p>` : ""}</section>`;
  }

  return {
    id: "mission-boards",
    render(state) {
      currentState = state;
      layout = { locationId: ["headquarters", "missions", "kagemori"].includes(state.view) ? state.view : null };
      if (state.view === "headquarters") return renderStoryBoard(state);
      if (state.view === "missions") return renderSecondaryBoard(state);
      if (state.view === "kagemori") return renderKagemori(state);
      return renderDoctorRoute(state);
    },
    getLayout() { return layout; },
    mount(root, scope) {
      if (!currentState) return;
      const state = currentState;
      const getSave = () => state.save;
      const launchFieldMission = (mission) => {
        if (mission.contractItem) {
          const status = deps.missionState(mission, getSave());
          if (!status.unlocked || status.completed) return;
          deps.showDialogue(briefingForMission(mission, getSave()), () => deps.onStartMission(getSave(), mission), "COMENZAR MISIÓN", "story");
          return;
        }
        if (mission.type === "route-search" && getSave().campaign.doctorRoute.active) {
          deps.onStartDoctorRoute(getSave(), mission);
          return;
        }
        if (mission.type === "investigation") deps.warmLocationAssets("kagemori");
        const lines = deps.getDialogue(mission.dialogueId, { save: getSave(), placement: { surface: "mission-briefing", owner: mission.id } }).map((line) => [deps.npcName(line.speaker), line.text]);
        deps.showDialogue(lines, () => {
          if (mission.type === "route-search") {
            state.save = deps.onStartDoctorMission(getSave(), mission);
            deps.onStartDoctorRoute(getSave(), mission);
          } else deps.onStartMission(getSave(), mission);
        }, mission.type === "route-search" ? "INICIAR BÚSQUEDA" : "VIAJAR A KAGEMORI", "story");
      };

      if (state.view === "headquarters") {
        root.querySelectorAll("[data-saga]").forEach((button) => scope.listen(button, "click", () => { if (!button.disabled) deps.onSagaSelected(button.dataset.saga); }));
        scope.listen(root.querySelector("[data-back-sagas]"), "click", () => deps.onSagaSelected(null));
        root.querySelectorAll("[data-mission]").forEach((button) => scope.listen(button, "click", () => {
          const mission = missionById(button.dataset.mission);
          if (!mission || mission.comingSoon || !deps.missionState(mission, getSave()).unlocked) return;
          if (mission.type) { if (!deps.missionState(mission, getSave()).completed) launchFieldMission(mission); return; }
          const inProgress = getSave().campaign.missionProgress[mission.id]?.status === "in-progress";
          if (inProgress) {
            deps.onStartMission(getSave(), mission);
            return;
          }
          const launch = () => deps.onStartMission(getSave(), mission);
          const hasEntryChoice = Boolean(deps.missionStep(mission, "choice")?.beforeCombat);
          const afterBriefing = hasEntryChoice ? () => {
            const options = campaignFlag(getSave(), "secretEntranceKnown")
              ? [{ id: "secret", label: "Entrada secreta", description: "Evita un guardia y permite saquear el almacén de monedas.", primary: true }, { id: "main", label: "Entrada principal", description: "Tres duelos consecutivos, sin bonificación de almacén." }]
              : [{ id: "main", label: "Entrada principal", description: "La entrada secreta no fue revelada. Deberás atravesar a los tres guardianes.", primary: true }];
            deps.showMissionDecision({ eyebrow: "PREPARACIÓN DE MISIÓN", title: "Elige una entrada", text: "Esta decisión altera la ruta, pero todos los enfrentamientos siguen siendo uno contra uno.", options }, (choice) => {
              state.save = deps.onChooseHideoutEntrance(getSave(), choice);
              launch();
            });
          } : launch;
          deps.showDialogue(briefingForMission(mission, getSave()), afterBriefing, hasEntryChoice ? "ELEGIR ENTRADA" : "COMENZAR MISIÓN", "story");
        }));
      }
      if (state.view === "missions") {
        root.querySelectorAll("[data-secondary-mission]").forEach((button) => scope.listen(button, "click", () => {
          const mission = boardMissions.find(({ mission: entry }) => entry.id === button.dataset.secondaryMission)?.mission;
          if (mission) launchFieldMission(mission);
        }));
      }
      if (state.view === "kagemori" && !deps.missionState(secondaryByType("investigation"), getSave()).completed) {
        let conclusionQueued = false;
        root.querySelectorAll("[data-clue]").forEach((area) => {
          const label = root.querySelector(`[data-clue-label="${area.dataset.clue}"]`);
          const showLabel = () => label?.classList.add("visible");
          const hideLabel = () => label?.classList.remove("visible");
          const collectClue = () => {
            const clue = KAGEMORI_CLUES.find((entry) => entry.id === area.dataset.clue);
            if (!clue || state.investigatedClues.has(clue.id)) return;
            state.investigatedClues.add(clue.id);
            area.classList.add("found");
            if (label) label.querySelector("strong").textContent = `✓ ${clue.label}`;
            root.querySelector("[data-clue-count]").textContent = `${state.investigatedClues.size}/3 pistas`;
            root.querySelector("[data-investigation-log]").textContent = clue.text;
            if (state.investigatedClues.size !== KAGEMORI_CLUES.length || conclusionQueued) return;
            conclusionQueued = true;
            void scope.delay(420).then(() => { if (scope.isCurrent()) deps.showDialogue([
              ["Iori Kagemori", "Las tres señales coinciden. No vinieron a saquear al azar: reunieron comida, herramientas y mapas para abastecer un campamento."],
              ["Nami Kurose", "Ya sé dónde están. Vi esa misma tierra gris en sus botas: conduce a la vieja cantera del Desfiladero del Cuervo."],
              ["Nami Kurose", "La puerta norte conduce al Desfiladero del Cuervo. Informa en el Cuartel General; el rastro continúa en la vieja cantera."]
            ], () => deps.onCompleteInvestigation(getSave(), secondaryByType("investigation"), KAGEMORI_CLUES.length), "REGISTRAR HALLAZGO", "story"); });
          };
          scope.listen(area, "mouseenter", showLabel);
          scope.listen(area, "mouseleave", hideLabel);
          scope.listen(area, "focus", showLabel);
          scope.listen(area, "blur", hideLabel);
          scope.listen(area, "click", collectClue);
          scope.listen(area, "keydown", (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); collectClue(); } });
        });
      }
      if (state.view === "doctor-route") {
        const mission = secondaryByType("route-search");
        if (state.save.campaign.doctorRoute.phase >= 3) mountDoctorCipher(root, scope, state, mission, deps);
        const startRouteCombat = () => deps.onStartMission(getSave(), { id: `${mission.id}-route-combat`, parentMissionId: mission.id, parentType: mission.type, transitions: mission.transitions, number: mission.number, arenaNumber: mission.arenaNumber, type: "route-combat", title: "Emboscada en el bosque", location: "Bosque cerrado", encounters: ["reed_bandit"], reward: { xp: 0, coins: 0 } });
        scope.listen(root.querySelector("[data-complete-doctor]"), "click", () => deps.onCompleteDoctor(getSave(), mission));
        root.querySelectorAll("[data-route]").forEach((button) => scope.listen(button, "click", () => {
          state.save = deps.onChooseDoctorRoute(getSave(), button.dataset.route);
          if (getSave().campaign.doctorRoute.pendingEvent?.type === "combat") startRouteCombat();
          else deps.onRerender();
        }));
        root.querySelectorAll("[data-passage]").forEach((button) => scope.listen(button, "click", () => { state.save = deps.onResolveRiverPassage(getSave(), button.dataset.passage); deps.onRerender(); }));
        scope.listen(root.querySelector("[data-resume-route-combat]"), "click", startRouteCombat);
      }
    },
    dispose() { currentState = null; boardMissions = []; }
  };
}
