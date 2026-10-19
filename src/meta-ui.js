import { fighterPreviewSvg, playerFighterAppearance } from "./character.js?v=0.62.0";
import { ENEMY_ACTIONS, ENEMY_ROSTER, EQUIPMENT, JUTSU_LIBRARY, MISSIONS, SECONDARY_MISSIONS, STORY_SAGAS } from "./data.js?v=0.66.0";
import { getDialogue } from "./dialogues.js?v=0.66.0";
import { missionHasStep, missionState, missionStep, missionsForBoard, nextAvailableMission } from "./mission-system.js?v=0.67.0";
import { LOCATION_CAST, NPCS, locationDialogue, npcByName, npcName } from "./npcs.js?v=0.66.0";
import { DEBUG_CHECKPOINTS, activeSaveSlot, affinityXpForElement, applyDebugCheckpoint, cancelDoctorMission, chooseDoctorMissionRoute, chooseHideoutEntrance, completeDoctorMission, createCharacter, deleteSaveSlot, deliverBestiaryBook, derivedStats, isTechniqueLearned, listSaveSlots, loadoutSlotsForLevel, markSecondaryMissionCompleted, masterIdForCharacter, normalizeSave, resolveDoctorRiverPassage, selectMaster, selectNextAffinity, selectSaveSlot, spendAttribute, startDoctorMission, writeSave, xpForNextLevel } from "./save.js?v=0.66.0";
import { createViewRuntime } from "./view-runtime.js?v=0.66.0";
import { BASIC_ELEMENT_IDS, ELEMENTS, ELEMENT_RANK_LABELS, basicRequirements, canAccessElement, elementIcon, elementName } from "./elements.js?v=0.20.0";
import { AFFINITY_CONFIG, availableAffinitySlots } from "./affinity-system.js?v=0.58.0";
import { DOCTOR_ROUTE_DEFINITIONS, RIVER_PASSAGES } from "./doctor-mission.js?v=0.60.0";
import { secondaryMissionByType, secondaryMissionCardModel } from "./secondary-missions.js?v=0.66.0";
import { createDebugToolsView } from "./ui/meta/views/debug-tools.js?v=0.67.0";
import { createArchiveView } from "./ui/meta/views/archive.js?v=0.67.0";
import { createDojoView } from "./ui/meta/views/dojo.js?v=0.67.0";
import { createMissionBoardsView } from "./ui/meta/views/mission-boards.js?v=0.67.0";
const COMING_SOON_LOCATIONS = {
  tower: { npcId: "kureha", message: "La Torre de Desafíos permanece cerrada mientras terminamos sus pruebas y reglas especiales. Próximamente podrás poner a prueba tu equipo piso por piso." },
  shop: { npcId: "hana", message: "La Tienda de Objetos aún está preparando su inventario. Próximamente podrás comprar consumibles, herramientas y mejoras con las monedas que consigas." },
  event: { npcId: "nao", message: "La Plaza de Eventos todavía no ha inaugurado sus actividades. Próximamente habrá festivales, visitantes y desafíos temporales." },
  inn: { npcId: "yuna", message: "La Posada aún está preparando sus servicios. Próximamente podrás descansar, conversar con aliados y descubrir escenas entre misiones." },
  arena: { npcId: "goro", message: "La Arena de Combate todavía está en preparación. Próximamente podrás practicar, probar configuraciones y disputar combates sin afectar la campaña." }
};
const masterForCharacter = (character) => NPCS[masterIdForCharacter(character)];

const welcomeDialogue = (character) => {
  const master = masterForCharacter(character).name;
  return [
    ["Ren Arashiro", `Enhorabuena, ${character.name}. Desde hoy formas parte de los combatientes de la Aldea del Horizonte.`],
    [master, character.bodyType === "female"
      ? "Has dado el primer paso. En el dojo te enseñaré a dominar tu afinidad y a preparar cada técnica."
      : "Has dado el primer paso. En el dojo te enseñaré a convertir tu afinidad en una estrategia."],
    ["Ren Arashiro", "Tu primer encargo ya está listo. Revisa la saga Futuro prometedor y comienza con la misión de clase D."]
  ];
};
const ASSET_VERSION = "0.21.0";
const LOCATION_BACKGROUNDS = { kagemori: "assets/locations/kagemori.webp" };
const warmedImages = new Map();

function warmImage(src) {
  if (warmedImages.has(src)) return warmedImages.get(src);
  const request = new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(true);
    image.onerror = () => {
      warmedImages.delete(src);
      resolve(false);
    };
    image.src = src;
  });
  warmedImages.set(src, request);
  return request;
}

function warmLocationAssets(locationId) {
  const background = LOCATION_BACKGROUNDS[locationId] || `assets/locations/${locationId}.webp`;
  return Promise.all([
    warmImage(`${background}?v=${ASSET_VERSION}`),
    ...(LOCATION_CAST[locationId] || []).map((id) => warmImage(`${NPCS[id].image}?v=${ASSET_VERSION}`))
  ]);
}

export const VILLAGE_LOCATIONS = [
  { id: "headquarters", name: "Cuartel General", description: "Historia principal, rango y mando de la aldea", labelX: 840, labelY: 390, path: "M812 24 L843 30 L844 61 L907 58 L948 83 L948 126 L1008 159 L970 178 L1011 203 L969 220 L982 238 L946 249 L1002 274 L963 291 L1047 327 L1004 348 L1048 365 L1021 380 L1027 444 L966 444 L954 429 L727 429 L718 445 L668 445 L671 373 L642 362 L679 347 L650 329 L738 287 L702 277 L750 251 L714 242 L783 213 L738 203 L766 185 L729 172 L806 137 L815 112 Z" },
  { id: "dojo", name: "Dojo", description: "Entrenamiento, jutsus y equipo", labelX: 505, labelY: 446, path: "M359 383 L389 373 L409 356 L427 348 L453 348 L468 333 L574 335 L596 348 L618 352 L629 369 L657 386 L636 399 L638 493 L662 505 L659 534 L620 534 L613 550 L403 550 L395 536 L354 535 L351 507 L375 493 L376 399 L347 388 Z" },
  { id: "archive", name: "Biblioteca", description: "Crónicas y progreso de campaña", labelX: 167, labelY: 427, path: "M33 282 L47 268 L74 264 L82 256 L101 265 L110 251 L133 267 L223 267 L238 258 L252 267 L259 282 L313 329 L300 344 L303 466 L326 482 L324 514 L279 515 L273 530 L49 530 L42 517 L0 519 L0 340 L31 321 Z" },
  { id: "shop", name: "Tienda de Objetos", description: "Suministros y equipamiento", labelX: 1227, labelY: 455, path: "M1103 366 L1125 353 L1157 351 L1168 339 L1298 341 L1314 351 L1341 355 L1352 369 L1375 386 L1358 399 L1365 489 L1385 503 L1382 535 L1353 536 L1347 554 L1112 554 L1106 540 L1075 539 L1076 510 L1090 493 L1092 399 L1069 385 Z" },
  { id: "tower", name: "Torre de Desafíos", description: "Pruebas especiales por pisos", labelX: 1468, labelY: 343, path: "M1464 19 L1477 19 L1478 59 L1506 78 L1492 90 L1522 108 L1502 122 L1532 141 L1508 155 L1547 180 L1518 195 L1550 217 L1519 232 L1564 264 L1529 280 L1571 314 L1528 331 L1534 378 L1576 407 L1560 427 L1380 427 L1369 409 L1403 379 L1414 332 L1384 316 L1423 280 L1396 265 L1435 233 L1406 218 L1440 196 L1418 182 L1445 155 L1421 141 L1448 122 L1431 108 L1455 89 L1443 78 L1462 60 Z" },
  { id: "arena", name: "Arena de Combate", description: "Combates de práctica y duelos", labelX: 1420, labelY: 760, path: "M1188 616 C1220 597 1243 587 1270 589 L1292 608 L1321 566 L1351 596 C1402 584 1452 584 1484 593 L1518 562 L1543 599 C1582 604 1604 610 1620 622 L1646 588 L1678 602 L1678 856 L1647 867 L1625 888 L1205 888 L1179 866 L1161 824 L1160 704 Z" },
  { id: "inn", name: "Posada", description: "Descanso y encuentros", labelX: 263, labelY: 748, path: "M65 671 L94 653 L139 635 L174 629 L191 612 L263 612 L283 628 L348 637 L370 654 L439 676 L458 697 L494 711 L477 736 L467 844 L409 848 L397 864 L130 864 L117 852 L57 850 L57 731 L41 711 Z" },
  { id: "missions", name: "Tablón de Misiones", description: "Misiones secundarias, contratos y recompensas", labelX: 744, labelY: 798, path: "M651 735 L671 723 L811 723 L837 736 L833 754 L846 770 L845 858 L821 858 L814 870 L669 870 L662 858 L637 858 L638 769 L650 753 Z" },
  { id: "event", name: "Plaza de Eventos", description: "Actividades temporales", labelX: 875, labelY: 602, path: "M819 501 L912 501 L912 607 L883 607 L882 628 C937 633 973 648 973 664 C973 683 923 697 861 697 C800 697 750 683 750 664 C750 647 791 633 846 628 L846 607 L819 607 Z" }
];

const VILLAGE_SERVICES = {
  shop: { eyebrow: "DISTRITO COMERCIAL", title: "Tienda de Objetos", text: "El inventario está preparándose. Este espacio alojará consumibles, armas y mejoras adquiribles con monedas.", items: ["Pociones y restauradores", "Kunais y herramientas", "Pergaminos de mejora"] },
  tower: { eyebrow: "DESAFÍO", title: "Torre de Desafíos", text: "Una futura serie de combates consecutivos con reglas especiales y recompensas por cada piso superado.", items: ["Nueve pisos temáticos", "Dificultad creciente", "Recompensas exclusivas"] },
  arena: { eyebrow: "CAMPO DE PRUEBAS", title: "Arena de Combate", text: "La arena quedará reservada para entrenamientos, pruebas de composiciones y duelos sin alterar la campaña.", items: ["Combate de práctica", "Pruebas de daño", "Duelos futuros"] },
  inn: { eyebrow: "ZONA DE DESCANSO", title: "Posada", text: "Un lugar tranquilo para conversaciones, compañeros y futuros eventos narrativos entre misiones.", items: ["Encuentros con aliados", "Escenas de historia", "Bonificaciones de descanso"] },
  event: { eyebrow: "PLAZA CENTRAL", title: "Escenario de Eventos", text: "Este espacio se activará para festivales, comerciantes y desafíos de duración limitada.", items: ["Festivales de la aldea", "Personajes visitantes", "Eventos temporales"] }
};

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

const ATTRIBUTE_DEFINITIONS = Object.freeze([
  { key: "health", label: "Vida", short: "VID", hint: "+10 PV", stat: "maxHp", cap: 200 },
  { key: "strength", label: "Fuerza", short: "FUE", hint: "+1 daño", stat: "strength", cap: 25 },
  { key: "speed", label: "Velocidad", short: "VEL", hint: "+1 ritmo de turno", stat: "speed", cap: 25 },
  { key: "chakra", label: "Chakra", short: "CHK", hint: "+5 CH", stat: "maxChakra", cap: 200 },
  { key: "luck", label: "Suerte", short: "SUE", hint: "+evasión y crítico", stat: "luck", cap: 25 }
]);

function radarPoint(index, ratio, radius = 91) {
  const angle = (-90 + index * 72) * Math.PI / 180;
  return `${(160 + Math.cos(angle) * radius * ratio).toFixed(1)},${(145 + Math.sin(angle) * radius * ratio).toFixed(1)}`;
}

function statRadarMarkup(stats, attributes, points) {
  const values = ATTRIBUTE_DEFINITIONS.map((definition) => Number(stats[definition.stat]) || 0);
  const percentages = ATTRIBUTE_DEFINITIONS.map((definition) => Math.round((stats.affinityModifiers?.[definition.key] || 0) * 100));
  const grid = [0.25, 0.5, 0.75, 1].map((ratio) => `<polygon points="${ATTRIBUTE_DEFINITIONS.map((_, index) => radarPoint(index, ratio)).join(" ")}"/>`).join("");
  const axes = ATTRIBUTE_DEFINITIONS.map((_, index) => `<line x1="160" y1="145" x2="${radarPoint(index, 1).replace(",", '" y2="')}"/>`).join("");
  const area = ATTRIBUTE_DEFINITIONS.map((definition, index) => radarPoint(index, Math.min(1, values[index] / definition.cap))).join(" ");
  const axisLabels = ATTRIBUTE_DEFINITIONS.map((definition, index) => {
    const point = radarPoint(index, 1.18, 91);
    const [x, y] = point.split(",");
    return `<text class="radar-axis-label" x="${x}" y="${Number(y) + 3}" text-anchor="middle">${definition.short}</text>`;
  }).join("");
  const readouts = ATTRIBUTE_DEFINITIONS.map((definition, index) => {
    const percent = percentages[index];
    const modifierClass = percent > 0 ? "positive" : percent < 0 ? "negative" : "neutral";
    const modifierLabel = percent ? `${percent > 0 ? "+" : ""}${percent}% afinidad` : "Base sin ajuste";
    return `<article class="stat-readout ${modifierClass}"><small>${definition.label}</small><strong>${values[index]}</strong><em>${modifierLabel}</em></article>`;
  }).join("");
  const controls = ATTRIBUTE_DEFINITIONS.map((definition) => `<button type="button" data-attribute="${definition.key}" ${points ? "" : "disabled"}><span><strong>${definition.label}</strong><b aria-hidden="true">+</b></span><small>${definition.hint} · Entrenado ${attributes[definition.key]}</small></button>`).join("");
  return `<div class="stat-radar" aria-label="Gráfico de estadísticas: ${ATTRIBUTE_DEFINITIONS.map((definition, index) => `${definition.label} ${values[index]}`).join(", ")}">
    <svg viewBox="45 23 230 244" role="img" aria-hidden="true"><g class="radar-grid">${grid}${axes}</g><polygon class="radar-area" points="${area}"/>${area.split(" ").map((point) => `<circle class="radar-dot" cx="${point.split(",")[0]}" cy="${point.split(",")[1]}" r="3.5"/>`).join("")}${axisLabels}</svg>
  </div><div class="stat-readouts">${readouts}</div><div class="attribute-list radar-controls">${controls}</div>`;
}
function activeMissionObjectives(save) {
  const campaign = save.campaign;
  const objectives = [];
  const investigationMission = secondaryMissionByType("investigation", SECONDARY_MISSIONS);
  const routeSearchMission = secondaryMissionByType("route-search", SECONDARY_MISSIONS);
  const investigationState = missionState(investigationMission, save);
  const routeSearchState = missionState(routeSearchMission, save);
  if (routeSearchState.unlocked && !routeSearchState.completed) {
    objectives.push({
      id: `secondary:${routeSearchMission.id}`,
      type: "BÚSQUEDA",
      title: routeSearchMission.title,
      detail: "Encuentra al doctor Haru Takamine para descifrar el mapa.",
      destination: "Tablón de Misiones",
      view: "missions"
    });
  }
  if (campaign.doctorBookDeliveryPending) {
    objectives.unshift({
      id: `secondary:${routeSearchMission.id}-delivery`,
      type: "ENTREGA OBLIGATORIA",
      title: "El libro de Haru",
      detail: "Entrega el libro antiguo a Sayo para activar sus registros.",
      destination: "Biblioteca",
      view: "archive"
    });
  }

  if (investigationState.unlocked && !investigationState.completed) {
    objectives.push({
      id: `secondary:${investigationMission.id}`,
      type: "ENCARGO DE SAYO",
      title: investigationMission.title,
      detail: "Investiga las pistas de la Aldea de Kagemori.",
      destination: "Tablón de Misiones",
      view: "missions"
    });
  }

  const storyMission = nextAvailableMission(MISSIONS, "main", save);
  if (storyMission) {
    objectives.push({
      id: `story:${storyMission.id}`,
      type: "MISIÓN PRINCIPAL",
      title: storyMission.title,
      detail: `${storyMission.location} · ${storyMission.duration}`,
      destination: "Cuartel General",
      view: "headquarters"
    });
  }

  return objectives;
}

export function mountMetaUI(root, initialSave, onStartMission, onFinishSecondaryMission) {
  let save = initialSave;
  let view = "plaza";
  const viewRuntime = createViewRuntime(root);
  let viewScope = null;
  let choosingSaveSlot = (() => {
    try { return sessionStorage.getItem("cronicas-save-slot-selected") !== "1"; } catch (_) { return true; }
  })();
  let activeDojoTab = "equipment";
  let debugSnapshot = null;
  let selectedSagaId = null;
  const introducedViews = new Set();
  const investigatedClues = new Set();
  const debugToolsView = createDebugToolsView({
    checkpoints: DEBUG_CHECKPOINTS,
    missions: STORY_SAGAS.flatMap((saga) => saga.missionIds.map((id) => MISSIONS.find((mission) => mission.id === id)).filter(Boolean)),
    escapeHtml,
    onCheckpoint(checkpointId) {
      save = writeSave(applyDebugCheckpoint(save, checkpointId));
      introducedViews.clear();
      investigatedClues.clear();
      renderDebugTools();
    },
    onNavigate(nextView) {
      view = nextView;
      introducedViews.add(view);
      render();
    },
    onChoice(choice) {
      save = writeSave(normalizeSave({
        ...save,
        campaign: {
          ...save.campaign,
          banditPrisonerChoice: choice === "clear" ? null : choice,
          nextSideMissionGoldMultiplier: choice === "interrogate" ? 2 : 1
        }
      }));
      renderDebugTools();
    },
    onMission(missionId) {
      const mission = MISSIONS.find((entry) => entry.id === missionId);
      if (mission && !mission.comingSoon) onStartMission(save, mission);
    },
    onRestore() {
      if (!debugSnapshot) return;
      save = writeSave(normalizeSave(JSON.parse(debugSnapshot)));
      debugSnapshot = null;
      introducedViews.clear();
      investigatedClues.clear();
      view = "plaza";
      render();
    }
  });
  const sagaMissions = STORY_SAGAS.flatMap((saga) => saga.missionIds.map((id) => MISSIONS.find((mission) => mission.id === id)).filter(Boolean));
  const archiveView = createArchiveView({
    missions: sagaMissions,
    enemyRoster: ENEMY_ROSTER,
    enemyActions: ENEMY_ACTIONS,
    elementName,
    escapeHtml,
    showDialogue: (...args) => showDialogue(...args),
    onDeliverBook() {
      save = writeSave(deliverBestiaryBook(save));
      introducedViews.add("archive");
      renderArchive();
    }
  });
  const dojoView = createDojoView({
    assetVersion: ASSET_VERSION,
    affinityConfig: AFFINITY_CONFIG,
    elements: ELEMENTS,
    elementRankLabels: ELEMENT_RANK_LABELS,
    equipment: EQUIPMENT,
    jutsus: JUTSU_LIBRARY,
    npcs: NPCS,
    affinityXpForElement,
    availableAffinitySlots,
    basicRequirements,
    canAccessElement,
    derivedStats,
    elementIcon,
    elementName,
    fighterPreviewSvg,
    isTechniqueLearned,
    loadoutSlotsForLevel,
    masterIdForCharacter,
    playerFighterAppearance,
    selectMaster,
    selectNextAffinity,
    spendAttribute,
    xpForNextLevel,
    onPersist(next) { save = writeSave(next); return save; },
    onTabSelected(tabId) { activeDojoTab = tabId; },
    onRerender: () => renderDojo()
  });
  const missionBoardsView = createMissionBoardsView({
    mainMissions: MISSIONS,
    secondaryMissions: SECONDARY_MISSIONS,
    sagas: STORY_SAGAS,
    enemyActions: ENEMY_ACTIONS,
    enemyRoster: ENEMY_ROSTER,
    doctorRouteDefinitions: DOCTOR_ROUTE_DEFINITIONS,
    riverPassages: RIVER_PASSAGES,
    elementName,
    escapeHtml,
    getDialogue,
    masterForCharacter,
    missionHasStep,
    missionState,
    missionStep,
    missionsForBoard,
    npcName,
    secondaryMissionByType,
    secondaryMissionCardModel,
    warmLocationAssets,
    showDialogue: (...args) => showDialogue(...args),
    showMissionDecision: (...args) => showMissionDecision(...args),
    onSagaSelected(sagaId) { selectedSagaId = sagaId; renderStoryMissions(); },
    onStartMission,
    onChooseHideoutEntrance(currentSave, choice) { save = writeSave(chooseHideoutEntrance(currentSave, choice)); return save; },
    onStartDoctorMission(currentSave, mission) { save = writeSave(startDoctorMission(currentSave, mission)); return save; },
    onCompleteInvestigation(currentSave, mission, clues) {
      save = markSecondaryMissionCompleted(currentSave, mission);
      onFinishSecondaryMission(save, mission, { outcome: "completed", clues });
    },
    onCompleteDoctor(currentSave, mission) {
      const routeStats = { ...currentSave.campaign.doctorRoute };
      const completion = completeDoctorMission(currentSave, mission);
      save = writeSave(completion.save);
      onFinishSecondaryMission(save, mission, { outcome: "completed", routeStats, rewards: { xp: completion.xp, affinityXp: completion.affinityXp, coins: completion.coins, supplyBonus: completion.supplyBonus } });
    },
    onChooseDoctorRoute(currentSave, routeId) { save = writeSave(chooseDoctorMissionRoute(currentSave, routeId)); return save; },
    onResolveRiverPassage(currentSave, passageId) { save = writeSave(resolveDoctorRiverPassage(currentSave, passageId)); return save; },
    onRerender: () => renderDoctorRoute()
  });

  const persist = (next, shouldRender = true) => {
    save = writeSave(next);
    if (shouldRender) render();
  };

  const renderSaveSlots = () => {
    const selectedSlot = activeSaveSlot();
    const cards = listSaveSlots().map(({ slot, save: slotSave }) => {
      if (!slotSave?.character) return `
        <article class="save-slot empty">
          <span class="save-slot-number">PARTIDA ${slot}</span>
          <div class="save-slot-empty" aria-hidden="true">＋</div>
          <h3>Nueva partida</h3>
          <p>Crea un combatiente y comienza una historia independiente.</p>
          <button class="primary-button" type="button" data-select-slot="${slot}">CREAR PARTIDA</button>
        </article>`;
      const completed = slotSave.campaign.completedMissions.length;
      return `
        <article class="save-slot ${slot === selectedSlot ? "active" : ""}">
          <span class="save-slot-number">PARTIDA ${slot}${slot === selectedSlot ? " · ACTIVA" : ""}</span>
          <span class="save-slot-avatar" style="--slot-color:${slotSave.character.appearance}">${escapeHtml(slotSave.character.name.slice(0, 1))}</span>
          <h3>${escapeHtml(slotSave.character.name)}</h3>
          <p>${escapeHtml(slotSave.campaign.rank)} · Nivel ${slotSave.progression.level} · ${completed} ${completed === 1 ? "misión" : "misiones"}</p>
          <div class="save-slot-actions"><button class="primary-button" type="button" data-select-slot="${slot}">CONTINUAR</button><button class="save-slot-delete" type="button" data-delete-slot="${slot}" aria-label="Borrar partida ${slot}">BORRAR</button></div>
        </article>`;
    }).join("");
    viewScope = viewRuntime.replace("save-slots", `<section class="save-selector"><p class="eyebrow">CRÓNICAS DEL SELLO</p><h2>Elige una partida</h2><p class="lead">Puedes mantener hasta tres historias independientes. El cuerpo y el maestro se fijan al crear cada combatiente.</p><div class="save-slot-grid">${cards}</div></section>`);
    root.querySelectorAll("[data-select-slot]").forEach((button) => button.addEventListener("click", () => {
      save = selectSaveSlot(button.dataset.selectSlot);
      choosingSaveSlot = false;
      try { sessionStorage.setItem("cronicas-save-slot-selected", "1"); } catch (_) { /* La selección seguirá activa durante esta vista. */ }
      view = save.character ? "plaza" : "headquarters";
      render();
    }));
    root.querySelectorAll("[data-delete-slot]").forEach((button) => button.addEventListener("click", () => {
      const slot = Number(button.dataset.deleteSlot);
      const slotState = listSaveSlots().find((entry) => entry.slot === slot)?.save;
      if (!slotState?.character || !window.confirm(`¿Borrar definitivamente la partida de ${slotState.character.name}?`)) return;
      deleteSaveSlot(slot);
      if (slot === activeSaveSlot()) save = selectSaveSlot(slot);
      renderSaveSlots();
    }));
  };

  const renderCreator = () => {
    const affinityChoices = BASIC_ELEMENT_IDS.map((id, index) => `<label class="affinity-choice"><input type="radio" name="affinity" value="${id}" ${index === 0 ? "checked" : ""}><img src="${elementIcon(id)}" alt="" width="512" height="512"><span><strong>${elementName(id)}</strong><small>Afinidad básica</small></span></label>`).join("");
    viewScope = viewRuntime.replace("character-creator", `
      <section class="dojo-card creator-card">
        <p class="eyebrow">PRIMER PASO</p><h2>Crea tu combatiente</h2>
        <p class="lead">Comienzas con una afinidad básica. Los rangos 2 y 3 abrirán nuevos espacios y combinaciones.</p>
        <form id="character-form" class="creator-form">
          <label>Nombre<input name="name" maxlength="18" value="Akio" required></label>
          <fieldset class="affinity-picker"><legend>Afinidad inicial</legend>${affinityChoices}</fieldset>
          <label>Tipo de cuerpo<select name="bodyType"><option value="male">Masculino</option><option value="female">Femenino</option></select><small>Esta elección queda fija para esta partida.</small></label>
          <label>Peinado<select name="hair"><option value="1">Corto</option><option value="2">Largo</option><option value="3">Puntiagudo</option><option value="4">Coleta</option><option value="5">Ninja</option></select></label>
          <label>Color principal y aura<input name="appearance" type="color" value="#68a8ff"></label>
          <div class="creator-actions"><button class="primary-button" type="submit">CREAR PERSONAJE</button><button class="secondary-button" type="button" data-back-to-slots>VOLVER A PARTIDAS</button></div>
        </form>
      </section>`);
    root.querySelector("#character-form").addEventListener("submit", (event) => {
      event.preventDefault();
      save = writeSave(createCharacter(save, Object.fromEntries(new FormData(event.currentTarget))));
      view = "headquarters";
      introducedViews.add("headquarters");
      render();
      showDialogue(welcomeDialogue(save.character), () => {
        save.campaign.tutorialSeen = true;
        persist(save);
      }, "VER SAGAS", "story");
    });
    root.querySelector("[data-back-to-slots]")?.addEventListener("click", () => {
      choosingSaveSlot = true;
      render();
    });
  };

  const shell = (content) => {
    const { character, progression, campaign } = save;
    const visibleStoryMissionIds = STORY_SAGAS.flatMap((saga) => saga.missionIds);
    const currentLocation = VILLAGE_LOCATIONS.find((location) => location.id === view)
      || (view === "kagemori" ? { name: "Aldea de Kagemori" } : view === "doctor-route" ? { name: "Caminos del Norte" } : view === "debug" ? { name: "Herramientas de pruebas" } : null);
    const isSecondaryField = view === "kagemori" || view === "doctor-route";
    const navigation = view === "plaza" ? "" : `<nav class="village-nav village-return" aria-label="Navegación de la aldea"><button ${isSecondaryField ? "data-abandon-secondary" : "data-view=\"plaza\""}>← ${isSecondaryField ? "Abandonar misión" : "Volver al mapa"}</button><span>${escapeHtml(currentLocation?.name || "Aldea del Horizonte")}</span></nav>`;
    viewScope = viewRuntime.replace(view, `
      <div class="village-shell">
        <section class="village-topbar">
          <div class="profile-heading">
            <span class="avatar-swatch" style="--avatar:${character.appearance}"></span>
            <div class="profile-copy"><p class="eyebrow">${campaign.rank.toUpperCase()}</p><h2>${escapeHtml(character.name)}</h2></div>
            <strong class="level-chip">Nivel ${progression.level}</strong>
          </div>
          <div class="campaign-summary">
            <span class="summary-item"><b aria-hidden="true">★</b><strong>${progression.xp}/${xpForNextLevel(progression.level)}</strong><small>PX</small></span>
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
      </div>`);
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
      settingsTrigger.addEventListener("click", () => {
        if (settingsDetails.open && !settingsDetails.classList.contains("is-closing")) closeSettings();
        else openSettings();
      });
      settingsDetails.addEventListener("toggle", () => {
        if (settingsTrigger.isConnected) settingsTrigger.setAttribute("aria-expanded", settingsDetails.open ? "true" : "false");
      }, { signal: viewScope.signal });
      viewScope.onCleanup(() => window.clearTimeout(closeSettingsTimer));
    }

    root.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
      document.querySelector(".game-settings")?.removeAttribute("open");
      view = button.dataset.view;
      render();
    }));
    root.querySelector(".save-slots-trigger")?.addEventListener("click", () => {
      document.querySelector(".game-settings")?.removeAttribute("open");
      choosingSaveSlot = true;
      render();
    });
    root.querySelector(".debug-tools-trigger")?.addEventListener("click", () => {
      document.querySelector(".game-settings")?.removeAttribute("open");
      if (!debugSnapshot) debugSnapshot = JSON.stringify(save);
      view = "debug";
      render();
    });
    root.querySelector("[data-abandon-secondary]")?.addEventListener("click", () => {
      const mission = view === "doctor-route" ? SECONDARY_MISSIONS[1] : SECONDARY_MISSIONS[0];
      const routeStats = { ...save.campaign.doctorRoute };
      if (view === "doctor-route") save = writeSave(cancelDoctorMission(save));
      onFinishSecondaryMission(save, mission, { outcome: "abandoned", clues: investigatedClues.size, routeStats });
    });
    root.querySelectorAll("[data-go]").forEach((button) => {
      const openLocation = () => {
        view = button.dataset.go;
        render();
      };
      button.addEventListener("click", openLocation);
      if (button.classList.contains("village-hotspot")) {
        button.addEventListener("mouseenter", () => warmLocationAssets(button.dataset.go), { once: true });
        button.addEventListener("focus", () => warmLocationAssets(button.dataset.go), { once: true });
        const label = root.querySelector(`[data-map-label="${button.dataset.go}"]`);
        const showLabel = () => label?.classList.add("visible");
        const hideLabel = () => label?.classList.remove("visible");
        button.addEventListener("mouseenter", showLabel);
        button.addEventListener("mouseleave", hideLabel);
        button.addEventListener("focus", showLabel);
        button.addEventListener("blur", hideLabel);
        button.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          openLocation();
        });
      }
    });
  };

  const showDialogue = (lines, onComplete, finalLabel = "CONTINUAR", type = "message") => {
    if (!lines.length) { onComplete(); return; }
    let index = 0;
    let previousSpeaker = null;
    let nextSpeakerSide = "left";
    const speakerSides = new Map();
    const location = type === "story" ? root.querySelector("[data-location-stage]") : null;
    const overlay = document.createElement("div");
    overlay.className = `dialogue-overlay dialogue-${type}`;
    const mounted = viewRuntime.mountOverlay(overlay);
    if (location) location.classList.add("story-dialogue-active");
    const draw = () => {
      const [speaker, dialogue] = lines[index];
      const last = index === lines.length - 1;
      const npc = npcByName(speaker);
      if (type === "story") {
        const role = npc?.title || "Historia";
        if (!speakerSides.has(speaker)) {
          speakerSides.set(speaker, nextSpeakerSide);
          nextSpeakerSide = nextSpeakerSide === "left" ? "right" : "left";
        }
        const side = speakerSides.get(speaker);
        const entering = previousSpeaker !== speaker;
        const mirrorClass = side === "right" ? "story-character-mirrored" : "";
        overlay.classList.toggle("story-speaker-left", side === "left");
        overlay.classList.toggle("story-speaker-right", side === "right");
        const character = npc ? `<div class="story-character story-character-${side} ${entering ? "story-entering" : "story-speaking"}"><img class="${mirrorClass}" src="${npc.image}?v=${ASSET_VERSION}" alt="${escapeHtml(npc.name)}" width="1145" height="1374" decoding="async"><span>${escapeHtml(npc.name)}</span></div>` : "";
        overlay.innerHTML = `${character}<section class="story-dialogue-panel"><header>${escapeHtml(speaker)} · ${escapeHtml(role)}</header><p>${escapeHtml(dialogue)}</p><footer><small>${index + 1}/${lines.length}</small><button class="primary-button">${last ? finalLabel : "SIGUIENTE"}</button></footer></section>`;
        previousSpeaker = speaker;
      } else {
        const portrait = npc ? `<div class="dialogue-portrait"><img src="${npc.image}?v=${ASSET_VERSION}" alt="${escapeHtml(npc.name)}" width="1145" height="1374" decoding="async"><span>${escapeHtml(npc.title)}</span></div>` : "";
        overlay.innerHTML = `<section class="dialogue-box ${npc ? "with-portrait" : ""}">${portrait}<div class="dialogue-copy"><p class="eyebrow">${escapeHtml(speaker)}</p><p>${escapeHtml(dialogue)}</p><button class="primary-button">${last ? finalLabel : "SIGUIENTE"}</button><small>${index + 1}/${lines.length}</small></div></section>`;
      }
      overlay.querySelector("button").addEventListener("click", () => {
        if (!mounted.isCurrent()) return;
        if (!last) { index += 1; draw(); return; }
        if (location) location.classList.remove("story-dialogue-active");
        mounted.remove();
        onComplete();
      });
    };
    draw();
  };

  const showMissionDecision = ({ eyebrow, title, text, options }, onChoice) => {
    const overlay = document.createElement("div");
    overlay.className = "mission-decision-overlay";
    const mounted = viewRuntime.mountOverlay(overlay);
    overlay.innerHTML = `<section class="mission-decision-panel"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p><div>${options.map((option) => `<button type="button" data-decision="${option.id}" class="${option.primary ? "primary" : ""}"><strong>${escapeHtml(option.label)}</strong><small>${escapeHtml(option.description)}</small></button>`).join("")}</div></section>`;
    overlay.querySelectorAll("[data-decision]").forEach((button) => button.addEventListener("click", () => {
      if (!mounted.isCurrent()) return;
      const value = button.dataset.decision;
      mounted.remove();
      onChoice(value);
    }));
  };

  const locationStage = (locationId, content) => {
    const cast = LOCATION_CAST[locationId] || [];
    const introduced = introducedViews.has(locationId);
    const locationName = VILLAGE_LOCATIONS.find((location) => location.id === locationId)?.name || (locationId === "kagemori" ? "Aldea de Kagemori" : locationId);
    const background = LOCATION_BACKGROUNDS[locationId] || `assets/locations/${locationId}.webp`;
    const portraits = (locationId === "kagemori" && introduced ? [] : cast).map((id) => {
      const npc = NPCS[id];
      const kagemoriPortrait = locationId === "kagemori";
      return `<button class="stage-character" type="button" data-stage-npc="${id}" aria-label="Hablar con ${escapeHtml(npc.name)}"><img src="${npc.image}?v=${ASSET_VERSION}" alt="${escapeHtml(npc.name)}" width="${kagemoriPortrait ? 768 : 1145}" height="${kagemoriPortrait ? 1152 : 1374}" loading="eager" fetchpriority="high" decoding="async"><span>${escapeHtml(npc.name)}</span></button>`;
    }).join("");
    const investigationReady = locationId === "kagemori" && introduced ? "investigation-ready" : "";
    return `<section class="location-stage location-${locationId} ${cast.length > 1 ? "has-cast" : ""} ${investigationReady}" data-location-stage="${locationId}" style="--location-bg:url('${background}?v=${ASSET_VERSION}')" aria-label="${escapeHtml(locationName)}">
      <div class="stage-characters">${portraits}</div>
      <div class="stage-speech" data-stage-speech aria-live="polite" ${introduced ? "hidden" : ""}><p class="stage-speaker" data-stage-speaker></p><p data-stage-text></p><div><small data-stage-count></small><button class="primary-button" type="button" data-stage-next>SIGUIENTE</button></div></div>
      <div class="stage-ambient" data-stage-ambient role="status" aria-live="polite" hidden><strong data-ambient-speaker></strong><span data-ambient-text></span></div>
      <div class="stage-options ${introduced ? "ready" : ""}" data-stage-options ${introduced ? "" : "hidden"}>${content}</div>
    </section>`;
  };

  const bindLocationStage = (locationId) => {
    const stage = root.querySelector(`[data-location-stage="${locationId}"]`);
    if (!stage) return;
    const cast = LOCATION_CAST[locationId] || [];
    const lines = locationDialogue(locationId, "intro");
    const speech = stage.querySelector("[data-stage-speech]");
    const options = stage.querySelector("[data-stage-options]");
    const ambient = stage.querySelector("[data-stage-ambient]");
    let lineIndex = 0;
    let tipTimer = 0;
    let commentHoverReadyAt = performance.now() + 650;

    const activateSpeaker = (speaker) => {
      const activeIndex = cast.findIndex((id) => NPCS[id]?.name === speaker);
      const speakerOnRight = locationId === "dojo" ? activeIndex === 0 : activeIndex > 0;
      stage.classList.toggle("speaker-left", !speakerOnRight);
      stage.classList.toggle("speaker-right", speakerOnRight);
      stage.querySelectorAll("[data-stage-npc]").forEach((button) => button.classList.toggle("active", NPCS[button.dataset.stageNpc]?.name === speaker));
    };
    const showTip = (text, npcId = cast[0]) => {
      const npc = NPCS[npcId] || NPCS[cast[0]];
      if (!npc || !ambient || !stage.isConnected) return;
      clearTimeout(tipTimer);
      ambient.querySelector("[data-ambient-speaker]").textContent = `${npc.name} · ${npc.title}`;
      ambient.querySelector("[data-ambient-text]").textContent = text;
      ambient.hidden = false;
      ambient.classList.remove("leaving");
      activateSpeaker(npc.name);
      tipTimer = window.setTimeout(() => {
        if (!ambient.isConnected) return;
        ambient.classList.add("leaving");
        window.setTimeout(() => { if (ambient.isConnected) ambient.hidden = true; }, 180);
      }, 5200);
    };
    const revealOptions = () => {
      introducedViews.add(locationId);
      speech.classList.add("leaving");
      if (locationId === "kagemori") stage.classList.add("investigation-ready");
      window.setTimeout(() => {
        if (!stage.isConnected) return;
        speech.hidden = true;
        options.hidden = false;
        commentHoverReadyAt = performance.now() + 650;
        requestAnimationFrame(() => options.classList.add("ready"));
        if (locationId === "kagemori") stage.querySelector(".stage-characters")?.remove();
      }, 180);
    };
    const drawLine = () => {
      const [speaker, text] = lines[lineIndex];
      const npc = npcByName(speaker);
      speech.querySelector("[data-stage-speaker]").textContent = npc ? `${npc.name} · ${npc.title}` : speaker;
      speech.querySelector("[data-stage-text]").textContent = text;
      speech.querySelector("[data-stage-count]").textContent = `${lineIndex + 1}/${lines.length}`;
      speech.querySelector("[data-stage-next]").textContent = lineIndex === lines.length - 1 ? "VER OPCIONES" : "SIGUIENTE";
      activateSpeaker(speaker);
    };
    if (!introducedViews.has(locationId) && lines.length) {
      drawLine();
      speech.querySelector("[data-stage-next]").addEventListener("click", () => {
        if (lineIndex < lines.length - 1) { lineIndex += 1; drawLine(); return; }
        revealOptions();
      });
    } else {
      stage.querySelector("[data-stage-npc]")?.classList.add("active");
    }
    stage.querySelectorAll("[data-stage-npc]").forEach((button) => button.addEventListener("click", () => {
      if (!options.hidden) {
        const guide = NPCS[button.dataset.stageNpc]?.guide || [];
        showTip(guide[Math.floor(Math.random() * guide.length)], button.dataset.stageNpc);
      }
    }));
    stage.querySelectorAll("[data-comment]").forEach((control) => {
      let shown = false;
      const explain = (event) => {
        if (event.type === "mouseenter" && performance.now() < commentHoverReadyAt) return;
        if (shown || options.hidden) return;
        shown = true;
        showTip(control.dataset.comment, control.dataset.commentNpc || cast[0]);
      };
      control.addEventListener("mouseenter", explain);
      control.addEventListener("focusin", explain);
    });
  };

  const renderPlaza = () => {
    const boardReady = save.campaign.secondaryBoardUnlocked;
    const investigationState = missionState(secondaryMissionByType("investigation", SECONDARY_MISSIONS), save);
    const routeSearchState = missionState(secondaryMissionByType("route-search", SECONDARY_MISSIONS), save);
    const nextObjective = save.campaign.doctorBookDeliveryPending
      ? "archive"
      : routeSearchState.unlocked && !routeSearchState.completed
      ? "missions"
      : boardReady && !investigationState.completed
        ? "missions"
        : "headquarters";
    const missionObjectives = activeMissionObjectives(save);
    const storyObjective = missionObjectives.find((objective) => objective.id.startsWith("story:"));
    const secondaryObjectives = missionObjectives.filter((objective) => !objective.id.startsWith("story:"));
    const seenMissionNotices = new Set(save.campaign.seenMissionNotices);
    const unseenSecondaryObjectives = secondaryObjectives.filter((objective) => !seenMissionNotices.has(objective.id));
    const secondaryMissionItems = secondaryObjectives.length
      ? secondaryObjectives.map((objective) => `<button class="secondary-mission-item" type="button" data-view="${objective.view}"><span>${escapeHtml(objective.type)}</span><strong>${escapeHtml(objective.title)}</strong><small class="mission-destination">IR A: ${escapeHtml(objective.destination)}</small><small>${escapeHtml(objective.detail)}</small></button>`).join("")
      : `<p class="secondary-mission-empty">No hay misiones secundarias pendientes.</p>`;
    const missionDock = `<section class="mission-dock" aria-label="Misión actual">
      <div class="story-mission-current" title="${escapeHtml(storyObjective?.detail || "La historia disponible ha sido completada.")}">
        <strong>${escapeHtml(storyObjective?.title || "Sin misión principal activa")}</strong>
        ${storyObjective ? `<span>IR A: ${escapeHtml(storyObjective.destination)}</span>` : ""}
      </div>
      <div class="secondary-mission-menu ${unseenSecondaryObjectives.length ? "has-unseen" : ""}">
        <button class="secondary-mission-trigger" type="button" aria-expanded="false" aria-controls="secondary-mission-panel" aria-label="Misiones secundarias${unseenSecondaryObjectives.length ? `, ${unseenSecondaryObjectives.length} sin revisar` : ""}">
          <span class="mission-target-icon" aria-hidden="true"><svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="5"/><path d="M16 1v6M16 25v6M1 16h6M25 16h6"/><circle cx="16" cy="16" r="1.5"/></svg></span>
        </button>
        <section class="secondary-mission-panel" id="secondary-mission-panel" aria-label="Misiones secundarias" hidden>
          <header><div><small>TABLÓN</small><strong>Misiones secundarias</strong></div><span>${secondaryObjectives.length}</span></header>
          <div class="secondary-mission-list">${secondaryMissionItems}</div>
        </section>
      </div>
    </section>`;
    const hotspots = VILLAGE_LOCATIONS.map((location) => {
      const comingSoon = Boolean(COMING_SOON_LOCATIONS[location.id]) || (location.id === "missions" && !boardReady) || (location.id === "archive" && !save.campaign.archiveUnlocked && !save.campaign.doctorBookDeliveryPending);
      return `<g class="village-hotspot hotspot-${location.id} ${comingSoon ? "coming-soon" : ""}" ${comingSoon ? `data-coming-soon="${location.id}"` : `data-go="${location.id}"`} role="button" tabindex="0" aria-label="${escapeHtml(location.name)}: ${escapeHtml(comingSoon ? "Próximamente" : location.description)}"><path class="hotspot-shape" d="${location.path}"/></g>`;
    }).join("");
    const labels = VILLAGE_LOCATIONS.map((location) => {
      const comingSoon = Boolean(COMING_SOON_LOCATIONS[location.id]) || (location.id === "missions" && !boardReady) || (location.id === "archive" && !save.campaign.archiveUnlocked && !save.campaign.doctorBookDeliveryPending);
      const recommended = location.id === nextObjective;
      return `<span class="map-label ${comingSoon ? "coming-soon" : ""} ${recommended ? "recommended" : ""}" data-map-label="${location.id}" aria-hidden="true" style="--label-x:${(location.labelX / 1678 * 100).toFixed(3)}%;--label-y:${(location.labelY / 937 * 100).toFixed(3)}%"><span class="map-label-box"><strong>${escapeHtml(location.name)}</strong><small>${escapeHtml(recommended ? "OBJETIVO · " + location.description : comingSoon ? "PRÓXIMAMENTE · " + location.description : location.description)}</small></span></span>`;
    }).join("");
    shell(`<section class="village-map-card"><div class="map-heading"><div><p class="eyebrow">ALDEA DEL HORIZONTE</p><h2>Elige un destino</h2></div><p>Pasa el cursor o usa <kbd>Tab</kbd> para descubrir cada edificio.</p></div><figure class="village-map"><img src="assets/village/aldea.webp?v=${ASSET_VERSION}" alt="Vista nocturna de la Aldea del Horizonte con sus nueve destinos" width="1678" height="937" decoding="async" fetchpriority="high" draggable="false"><svg class="village-hotspots" viewBox="0 0 1678 937" preserveAspectRatio="none" aria-label="Destinos de la aldea">${hotspots}</svg>${labels}</figure>${missionDock}</section>`);

    const secondaryMissionMenu = root.querySelector(".secondary-mission-menu");
    const secondaryMissionTrigger = root.querySelector(".secondary-mission-trigger");
    const secondaryMissionPanel = root.querySelector(".secondary-mission-panel");
    if (secondaryMissionMenu && secondaryMissionTrigger && secondaryMissionPanel) {
      const closeSecondaryMissions = () => {
        secondaryMissionPanel.hidden = true;
        secondaryMissionTrigger.setAttribute("aria-expanded", "false");
      };
      secondaryMissionTrigger.addEventListener("click", () => {
        const opening = secondaryMissionPanel.hidden;
        secondaryMissionPanel.hidden = !opening;
        secondaryMissionTrigger.setAttribute("aria-expanded", String(opening));
        if (!opening || !unseenSecondaryObjectives.length) return;
        save = writeSave({
          ...save,
          campaign: {
            ...save.campaign,
            seenMissionNotices: [...new Set([...save.campaign.seenMissionNotices, ...secondaryObjectives.map((objective) => objective.id)])]
          }
        });
        secondaryMissionMenu.classList.remove("has-unseen");
        secondaryMissionTrigger.setAttribute("aria-label", "Misiones secundarias");
      });
      secondaryMissionMenu.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        closeSecondaryMissions();
        secondaryMissionTrigger.focus();
      });
    }

    root.querySelectorAll("[data-coming-soon]").forEach((hotspot) => {
      const locationId = hotspot.getAttribute("data-coming-soon");
      const info = COMING_SOON_LOCATIONS[locationId]
        || (locationId === "missions" ? { npcId: "riku", message: "El Tablón todavía no está recibiendo encargos. Sayo avisará cuando exista una pista que investigar." } : null)
        || (locationId === "archive" ? { npcId: "ren", message: "La Biblioteca permanece reservada para informes clasificados. Completa la segunda misión de la saga para obtener acceso." } : null);
      const label = root.querySelector(`[data-map-label="${locationId}"]`);
      const showLabel = () => label?.classList.add("visible");
      const hideLabel = () => label?.classList.remove("visible");
      const explain = () => {
        if (!info) return;
        const npc = NPCS[info.npcId] || NPCS[LOCATION_CAST[locationId]?.[0]];
        const speaker = npc?.name || "Habitante de la aldea";
        showDialogue([[speaker, info.message]], () => {}, "ENTENDIDO");
      };

      hotspot.addEventListener("mouseenter", () => warmImage(`${NPCS[info.npcId].image}?v=${ASSET_VERSION}`), { once: true });
      hotspot.addEventListener("focus", () => warmImage(`${NPCS[info.npcId].image}?v=${ASSET_VERSION}`), { once: true });

      hotspot.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        explain();
      });
      hotspot.addEventListener("mouseenter", showLabel);
      hotspot.addEventListener("mouseleave", hideLabel);
      hotspot.addEventListener("focus", showLabel);
      hotspot.addEventListener("blur", hideLabel);
      hotspot.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        explain();
      });
    });

    if (!save.campaign.tutorialSeen) {
      showDialogue(welcomeDialogue(save.character), () => {
        save.campaign.tutorialSeen = true;
        view = "headquarters";
        introducedViews.add("headquarters");
        persist(save);
      }, "IR AL CUARTEL", "story");
    }
  };

  const renderVillageService = (serviceId) => {
    const service = VILLAGE_SERVICES[serviceId];
    const actions = serviceId === "headquarters" ? `<div class="service-actions"><button class="primary-button" data-go="missions">VER MISIONES</button><button class="secondary-button" data-go="dojo">PREPARAR EQUIPO</button></div>` : `<p class="development-note">Sección preparada para una fase posterior. El acceso desde el mapa ya está operativo.</p>`;
    const content = `<section class="stage-panel village-service"><div class="service-content"><p class="eyebrow">${service.eyebrow}</p><h2>${service.title}</h2><p class="lead">${service.text}</p><div class="service-grid">${service.items.map((item, index) => `<article data-comment="${escapeHtml(`Esta opción corresponde a ${item.toLowerCase()}. Estará disponible cuando se complete su sistema.`)}"><span>0${index + 1}</span><strong>${item}</strong></article>`).join("")}</div>${actions}</div></section>`;
    shell(locationStage(serviceId, content));
    bindLocationStage(serviceId);
  };

  const renderMissionBoardView = () => {
    if (view === "doctor-route") {
      const mission = secondaryMissionByType("route-search", SECONDARY_MISSIONS);
      if (!save.campaign.doctorRoute.active && !missionState(mission, save).completed) save = writeSave(startDoctorMission(save, mission));
    }
    const content = missionBoardsView.render({ save, view, selectedSagaId, investigatedClues });
    const { locationId } = missionBoardsView.getLayout();
    shell(locationId ? locationStage(locationId, content) : content);
    if (locationId) bindLocationStage(locationId);
    missionBoardsView.mount(root, viewScope);
  };
  const renderStoryMissions = renderMissionBoardView;
  const renderSecondaryMissions = renderMissionBoardView;
  const renderKagemori = renderMissionBoardView;
  const renderDoctorRoute = renderMissionBoardView;

  const renderDojo = () => {
    shell(locationStage("dojo", dojoView.render({ save, activeDojoTab })));
    dojoView.mount(root, viewScope);
    bindLocationStage("dojo");
  };

  const renderArchive = () => {
    shell(locationStage("archive", archiveView.render({ save })));
    bindLocationStage("archive");
    archiveView.mount(root, viewScope);
  };

  const renderDebugTools = () => {
    // RELEASE-BLOCKER 1.0: esta herramienta modifica el progreso y no debe incluirse en producción.
    shell(debugToolsView.render({ save, debugSnapshot }));
    debugToolsView.mount(root, viewScope);
  };

  const render = () => {
    if (choosingSaveSlot) return renderSaveSlots();
    if (!save.character) return renderCreator();
    if (view === "headquarters") return renderStoryMissions();
    if (view === "missions") return renderSecondaryMissions();
    if (view === "kagemori") return renderKagemori();
    if (view === "doctor-route") return renderDoctorRoute();
    if (view === "dojo") return renderDojo();
    if (view === "archive") return renderArchive();
    if (view === "debug") return renderDebugTools();
    if (VILLAGE_SERVICES[view]) return renderVillageService(view);
    return renderPlaza();
  };
  render();
  return {
    refresh(nextSave) { save = nextSave; view = "plaza"; render(); },
    openLocation(nextSave, locationId) { save = nextSave; view = locationId; render(); }
  };
}
