import { fighterPreviewSvg, playerFighterAppearance } from "./character.js?v=0.62.0";
import { ENEMY_ACTIONS, ENEMY_ROSTER, EQUIPMENT, JUTSU_LIBRARY, MISSIONS, SECONDARY_MISSIONS, STORY_SAGAS } from "./data.js?v=0.66.0";
import { getDialogue } from "./dialogues.js?v=0.66.0";
import { missionHasStep, missionState, missionsForBoard, nextAvailableMission } from "./mission-system.js?v=0.66.0";
import { LOCATION_CAST, NPCS, locationDialogue, npcByName, npcName } from "./npcs.js?v=0.66.0";
import { DEBUG_CHECKPOINTS, activeSaveSlot, affinityXpForElement, applyDebugCheckpoint, cancelDoctorMission, chooseDoctorMissionRoute, chooseHideoutEntrance, completeDoctorMission, createCharacter, deleteSaveSlot, deliverBestiaryBook, derivedStats, isTechniqueLearned, listSaveSlots, loadoutSlotsForLevel, markSecondaryMissionCompleted, masterIdForCharacter, normalizeSave, resolveDoctorRiverPassage, selectMaster, selectNextAffinity, selectSaveSlot, spendAttribute, startDoctorMission, writeSave, xpForNextLevel } from "./save.js?v=0.66.0";
import { createViewRuntime } from "./view-runtime.js?v=0.66.0";
import { BASIC_ELEMENT_IDS, ELEMENTS, ELEMENT_RANK_LABELS, basicRequirements, canAccessElement, elementIcon, elementName } from "./elements.js?v=0.20.0";
import { AFFINITY_CONFIG, availableAffinitySlots } from "./affinity-system.js?v=0.58.0";
import { DOCTOR_ROUTE_DEFINITIONS, RIVER_PASSAGES } from "./doctor-mission.js?v=0.60.0";
import { secondaryMissionByType, secondaryMissionCardModel } from "./secondary-missions.js?v=0.66.0";
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
  const introducedViews = new Set();
  const investigatedClues = new Set();

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

  let selectedSagaId = null;

  const renderStoryMissions = () => {
    const completed = new Set(save.campaign.completedMissions);
    const sagaById = new Map(STORY_SAGAS.map((saga) => [saga.id, saga]));
    const activeSaga = selectedSagaId ? sagaById.get(selectedSagaId) : null;

    const missionUnlocked = (mission) => missionState(mission, save).unlocked;
    const visibleSagaMissions = (saga) => saga.missionIds
      .map((id) => MISSIONS.find((mission) => mission.id === id))
      .filter(Boolean);
    const briefingForMission = (mission) => {
      const master = masterForCharacter(save.character);
      const localized = getDialogue(mission.dialogueId, { save, variables: { master: master.name }, placement: { surface: "mission-briefing", owner: mission.id } })
        .map((line) => [line.speaker === "master" ? master.name : npcName(line.speaker), line.text]);
      if (mission.tacticalBriefing) {
        const counterAffinity = { fuego: "agua", viento: "fuego", tierra: "viento", agua: "tierra" };
        const identifiedEnemies = mission.encounters.filter((enemyId) => {
          const entry = save.bestiary.entries[enemyId];
          return entry && (entry.encounters > 0 || entry.documents > 0);
        });
        const knownTechniques = mission.encounters.flatMap((enemyId) => save.bestiary.entries[enemyId]?.techniques || []).map((id) => ENEMY_ACTIONS[id]?.name).filter(Boolean);
        const knownWeaknesses = mission.encounters.flatMap((enemyId) => save.bestiary.entries[enemyId]?.vulnerabilities || []).map(elementName);
        const recommendedAffinities = identifiedEnemies.map((enemyId) => counterAffinity[ENEMY_ROSTER[enemyId]?.affinity]).filter(Boolean).map(elementName);
        const libraryAdvice = knownWeaknesses.length
          ? `El libro señala vulnerabilidad a ${[...new Set(knownWeaknesses)].join(" y ")}. Prepara una técnica compatible.`
          : knownTechniques.length
            ? `El libro ya registró ${[...new Set(knownTechniques)].slice(0, 2).join(" y ")}. Reserva chakra para responder.`
            : recommendedAffinities.length
              ? `Las fichas identificadas recomiendan técnicas de ${[...new Set(recommendedAffinities)].join(" y ")}. Los demás datos siguen incompletos.`
              : "El libro todavía tiene huecos sobre estos enemigos. Observa sus técnicas para completar el registro.";
        return [...localized, ["Sayo Kisaragi", libraryAdvice], [master.name, missionHasStep(mission, "resource", "hideout-supplies") ? "Yo te aconsejaré entre duelos. Descansar ayuda ahora; conservar suministros puede ayudarte después." : "Mi ventaja pasiva seguirá contigo. Lee el ritmo del rival y no gastes chakra sin un propósito."]];
      }
      return localized;
    };

    const sagaUnlocked = (saga, sagaIndex) => {
      if (sagaIndex === 0) return true;
      const previousSaga = STORY_SAGAS[sagaIndex - 1];
      return previousSaga.missionIds.every((id) => completed.has(id));
    };

    if (!activeSaga) {
      const sagaCards = STORY_SAGAS.map((saga, sagaIndex) => {
        const unlocked = sagaUnlocked(saga, sagaIndex);
        const sagaMissions = visibleSagaMissions(saga);
        const completedCount = sagaMissions.filter((mission) => completed.has(mission.id)).length;
        const totalRewards = sagaMissions.reduce((totals, mission) => ({
          xp: totals.xp + mission.reward.xp,
          coins: totals.coins + mission.reward.coins
        }), { xp: 0, coins: 0 });
        return `<button class="saga-card ${unlocked ? "" : "locked"} ${completedCount === sagaMissions.length ? "completed" : ""}" type="button" data-saga="${saga.id}" ${unlocked ? "" : "disabled"}>
          <span class="saga-number">SAGA ${String(saga.number).padStart(2, "0")}</span>
          <strong>${escapeHtml(saga.title)}</strong>
          <small>${escapeHtml(saga.subtitle)}</small>
          <div class="saga-progress"><span>${completedCount}/${sagaMissions.length} misiones</span><span>${totalRewards.xp} PX · ${totalRewards.coins} monedas</span></div>
          <span class="saga-action">${unlocked ? "VER MISIONES →" : "BLOQUEADA"}</span>
        </button>`;
      }).join("");

      const storyMissionIds = STORY_SAGAS.flatMap((saga) => visibleSagaMissions(saga).map((mission) => mission.id));
      const completedStory = storyMissionIds.filter((id) => completed.has(id)).length;
      const content = `<section class="stage-panel mission-board saga-selector" data-comment="La campaña está dividida en sagas. Completa una saga para desbloquear la siguiente."><div class="section-heading"><div><p class="eyebrow">CENTRO DE MANDO</p><h2>Selecciona una saga</h2></div><strong>${completedStory}/${storyMissionIds.length} completadas</strong></div><p class="lead">Cada saga agrupa un arco de la historia principal. Entra en una para ver sus misiones.</p><div class="saga-grid">${sagaCards}</div></section>`;
      shell(locationStage("headquarters", content));

      root.querySelectorAll("[data-saga]").forEach((button) => button.addEventListener("click", () => {
        if (button.disabled) return;
        selectedSagaId = button.dataset.saga;
        renderStoryMissions();
      }));
      bindLocationStage("headquarters");
      return;
    }

    const sagaIndex = STORY_SAGAS.findIndex((saga) => saga.id === activeSaga.id);
    const sagaMissions = visibleSagaMissions(activeSaga);
    const cards = sagaMissions.map((mission) => {
      const unlocked = missionUnlocked(mission);
      const done = completed.has(mission.id);
      const label = mission.comingSoon && unlocked ? "PRÓXIMAMENTE" : done ? "REPETIR" : unlocked ? "INICIAR HISTORIA" : "BLOQUEADA";
      const mechanics = { combat: "combate", investigation: "investigación", route: "rutas", choice: "decisiones", resource: "recursos", consequence: "consecuencias" };
      const activityLabels = [...new Set(mission.flow.filter((step) => step.type !== "dialogue").map((step) => mechanics[step.type] || step.type))].join(" + ");
      const details = mission.comingSoon ? "Objetivo localizado · Contenido en desarrollo" : `${activityLabels} · ${mission.duration} · ${mission.reward.xp} PX · ${mission.reward.coins} monedas`;
      return `<article class="mission-card ${done ? "completed" : ""} ${unlocked ? "" : "locked"} ${mission.comingSoon ? "coming-soon" : ""}"><div class="mission-number">${String(mission.number).padStart(2, "0")}</div><div><p class="eyebrow">MISIÓN CLASE ${mission.rank || "D"} · ${mission.location}</p><h3>${mission.title}</h3><p>${details}</p></div><button data-mission="${mission.id}" ${unlocked && !mission.comingSoon ? "" : "disabled"}>${label}</button></article>`;
    }).join("");

    const completedInSaga = sagaMissions.filter((mission) => completed.has(mission.id)).length;
    const content = `<section class="stage-panel mission-board" data-comment="Estas son las misiones que forman la saga seleccionada."><div class="saga-header"><button class="secondary-button saga-back" type="button" data-back-sagas>← SAGAS</button><div><p class="eyebrow">SAGA ${String(activeSaga.number).padStart(2, "0")}</p><h2>${escapeHtml(activeSaga.title)}</h2><p>${escapeHtml(activeSaga.subtitle)}</p></div><strong>${completedInSaga}/${sagaMissions.length}</strong></div><div class="mission-list">${cards}</div>${sagaIndex < STORY_SAGAS.length - 1 ? `<p class="saga-next-note">Completa esta saga para desbloquear <strong>${escapeHtml(STORY_SAGAS[sagaIndex + 1].title)}</strong>.</p>` : ""}</section>`;

    shell(locationStage("headquarters", content));

    root.querySelector("[data-back-sagas]")?.addEventListener("click", () => {
      selectedSagaId = null;
      renderStoryMissions();
    });

    root.querySelectorAll("[data-mission]").forEach((button) => button.addEventListener("click", () => {
      const mission = MISSIONS.find((entry) => entry.id === button.dataset.mission);
      if (!mission || mission.comingSoon) return;
      const launch = () => onStartMission(save, mission);
      const hasEntryChoice = missionHasStep(mission, "choice", "hideout-entry");
      const afterBriefing = hasEntryChoice ? () => {
        const options = save.campaign.secretEntranceKnown
          ? [
              { id: "secret", label: "Entrada secreta", description: "Evita un guardia y permite saquear el almacén de monedas.", primary: true },
              { id: "main", label: "Entrada principal", description: "Tres duelos consecutivos, sin bonificación de almacén." }
            ]
          : [{ id: "main", label: "Entrada principal", description: "La entrada secreta no fue revelada. Deberás atravesar a los tres guardianes.", primary: true }];
        showMissionDecision({ eyebrow: "PREPARACIÓN DE MISIÓN", title: "Elige una entrada", text: "Esta decisión altera la ruta, pero todos los enfrentamientos siguen siendo uno contra uno.", options }, (choice) => {
          save = writeSave(chooseHideoutEntrance(save, choice));
          launch();
        });
      } : launch;
      showDialogue(briefingForMission(mission), afterBriefing, hasEntryChoice ? "ELEGIR ENTRADA" : "COMENZAR MISIÓN", "story");
    }));
    bindLocationStage("headquarters");
  };

  const renderSecondaryMissions = () => {
    if (!save.campaign.secondaryBoardUnlocked) {
      const content = `<section class="stage-panel mission-board"><div class="section-heading"><div><p class="eyebrow">TABLÓN DE ENCARGOS</p><h2>Misiones secundarias</h2></div><strong>0 disponibles</strong></div><div class="development-note"><strong>Sin encargos publicados.</strong><br>Sayo avisará cuando exista una pista que investigar.</div></section>`;
      shell(locationStage("missions", content));
      bindLocationStage("missions");
      return;
    }
    const boardMissions = missionsForBoard(SECONDARY_MISSIONS, "missions", save);
    const cardModels = boardMissions.map(({ mission }) => secondaryMissionCardModel(mission, save)).filter((model) => model?.visible);
    const choiceBonus = save.campaign.banditPrisonerChoice === "interrogate"
      ? `<div class="notice-card ally"><strong>Información con un coste</strong><span>Entrada secreta y monedas ×2; Akumori recibió refuerzos.</span></div>`
      : save.campaign.banditPrisonerChoice === "eliminate"
        ? `<div class="notice-card"><strong>Ventaja táctica</strong><span>Akumori no recibió refuerzos; se perdieron la entrada secreta y el aliado futuro.</span></div>`
        : "";
    const availableCount = cardModels.filter(({ state }) => state.unlocked && !state.completed).length;
    const cards = cardModels.map(({ mission, state, disabled, detail, actionLabel }) => `<article class="mission-card ${state.completed ? "completed" : ""}"><div class="mission-number">${String(mission.number).padStart(2, "0")}</div><div><p class="eyebrow">ENCARGO DE SAYO · CLASE ${mission.rank}</p><h3>${escapeHtml(mission.title)}</h3><p>${escapeHtml(detail)}</p></div><button type="button" data-secondary-mission="${escapeHtml(mission.id)}" ${disabled ? "disabled" : ""}>${actionLabel}</button></article>`).join("");
    const content = `<section class="stage-panel mission-board" data-comment="Sayo publica aquí investigaciones y búsquedas que abren nuevas rutas de la historia."><div class="section-heading"><div><p class="eyebrow">TABLÓN DE ENCARGOS</p><h2>Misiones secundarias</h2></div><strong>${availableCount} disponible${availableCount === 1 ? "" : "s"}</strong></div><p class="lead">Los encargos opcionales revelan pistas y rutas que pueden abrir nuevas misiones de historia.</p>${choiceBonus}<div class="mission-list">${cards}</div></section>`;
    shell(locationStage("missions", content));
    const launchers = {
      investigation(mission) {
        // Empieza a decodificar la escena durante el briefing y el viaje.
        warmLocationAssets("kagemori");
        const lines = getDialogue(mission.dialogueId, { save, placement: { surface: "mission-briefing", owner: mission.id } }).map((line) => [npcName(line.speaker), line.text]);
        showDialogue(lines, () => onStartMission(save, mission), "VIAJAR A KAGEMORI", "story");
      },
      "route-search"(mission) {
        const launch = () => {
          if (!save.campaign.doctorRoute.active) save = writeSave(startDoctorMission(save, mission));
          onStartMission(save, mission);
        };
        if (save.campaign.doctorRoute.active) launch();
        else {
          const lines = getDialogue(mission.dialogueId, { save, placement: { surface: "mission-briefing", owner: mission.id } }).map((line) => [npcName(line.speaker), line.text]);
          showDialogue(lines, launch, "INICIAR BÚSQUEDA", "story");
        }
      }
    };
    root.querySelectorAll("[data-secondary-mission]").forEach((button) => button.addEventListener("click", () => {
      const mission = boardMissions.find(({ mission: entry }) => entry.id === button.dataset.secondaryMission)?.mission;
      launchers[mission?.type]?.(mission);
    }));
    bindLocationStage("missions");
  };

  const renderKagemori = () => {
    const mission = secondaryMissionByType("investigation", SECONDARY_MISSIONS);
    const clues = [
      { id: "cart", label: "Carreta saqueada", labelX: 18, labelY: 70, path: "M0 330 L76 300 L169 339 L248 385 L346 414 L405 485 L520 538 L590 616 L560 690 L472 731 L337 744 L237 716 L147 674 L29 658 L0 620 Z", text: "Las cajas fueron abiertas con herramientas, no con armas. Los bandidos buscaban provisiones concretas." },
      { id: "hall", label: "Casa comunal", labelX: 48, labelY: 45, path: "M420 273 L492 239 L554 154 L628 128 L784 133 L870 157 L927 194 L1041 220 L1083 268 L1035 302 L1024 438 L944 453 L849 439 L782 390 L721 349 L651 371 L610 329 L529 350 L469 320 Z", text: "Entre las cenizas aparece una cuerda cubierta de polvo gris, propio de una cantera." },
      { id: "well", label: "Pozo y huellas", labelX: 72, labelY: 77, path: "M1158 550 L1236 601 L1194 651 L1128 704 L1080 758 L1123 818 L1060 881 L976 867 L923 811 L928 737 L982 681 L1055 622 Z", text: "Las pisadas cargadas cruzan el barro y salen por la puerta norte hacia las montañas." }
    ];
    const completed = missionState(mission, save).completed;
    const content = completed
      ? `<section class="kagemori-complete"><p class="eyebrow">INVESTIGACIÓN COMPLETADA</p><h2>El rastro continúa</h2><p>Nami ubicó la guarida en el Desfiladero del Cuervo. La nueva misión principal ya figura en el Cuartel General.</p><button class="primary-button" type="button" data-view="plaza">VOLVER A LA ALDEA</button></section>`
      : `<section class="kagemori-investigation"><header><div><p class="eyebrow">ALDEA DE KAGEMORI</p><h2>Reconstruye la ruta de los bandidos</h2></div><strong data-clue-count>${investigatedClues.size}/3 pistas</strong></header><p class="investigation-log" data-investigation-log>Explora la escena y selecciona las áreas sospechosas.</p><svg class="clue-hotspots" viewBox="0 0 1672 941" preserveAspectRatio="none" aria-label="Áreas de investigación">${clues.map((clue) => `<g class="clue-hotspot ${investigatedClues.has(clue.id) ? "found" : ""}" data-clue="${clue.id}" role="button" tabindex="0" aria-label="Investigar ${escapeHtml(clue.label)}"><path class="clue-shape" d="${clue.path}"/></g>`).join("")}</svg>${clues.map((clue) => `<span class="clue-label" data-clue-label="${clue.id}" aria-hidden="true" style="--clue-label-x:${clue.labelX}%;--clue-label-y:${clue.labelY}%"><strong>${investigatedClues.has(clue.id) ? "✓ " : ""}${escapeHtml(clue.label)}</strong></span>`).join("")}</section>`;
    shell(locationStage("kagemori", content));
    bindLocationStage("kagemori");
    if (completed) return;

    let conclusionQueued = false;
    root.querySelectorAll("[data-clue]").forEach((area) => {
      const label = root.querySelector(`[data-clue-label="${area.dataset.clue}"]`);
      const showLabel = () => label?.classList.add("visible");
      const hideLabel = () => label?.classList.remove("visible");
      const collectClue = () => {
      const clue = clues.find((entry) => entry.id === area.dataset.clue);
      if (!clue || investigatedClues.has(clue.id)) return;
      investigatedClues.add(clue.id);
      area.classList.add("found");
      if (label) label.querySelector("strong").textContent = `✓ ${clue.label}`;
      root.querySelector("[data-clue-count]").textContent = `${investigatedClues.size}/3 pistas`;
      root.querySelector("[data-investigation-log]").textContent = clue.text;
      if (investigatedClues.size !== clues.length || conclusionQueued) return;
      conclusionQueued = true;
      window.setTimeout(() => showDialogue([
        ["Iori Kagemori", "Las tres señales coinciden. No vinieron a saquear al azar: reunieron comida, herramientas y mapas para abastecer un campamento."],
        ["Nami Kurose", "Ya sé dónde están. Vi esa misma tierra gris en sus botas: conduce a la vieja cantera del Desfiladero del Cuervo."],
        ["Nami Kurose", "La puerta norte conduce al Desfiladero del Cuervo. Lleva esta información a Sayo; el rastro continúa en la vieja cantera."]
      ], () => {
        save = markSecondaryMissionCompleted(save, mission);
        onFinishSecondaryMission(save, mission, { outcome: "completed", clues: clues.length });
      }, "REGISTRAR HALLAZGO", "story"), 420);
      };
      area.addEventListener("mouseenter", showLabel);
      area.addEventListener("mouseleave", hideLabel);
      area.addEventListener("focus", showLabel);
      area.addEventListener("blur", hideLabel);
      area.addEventListener("click", collectClue);
      area.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        collectClue();
      });
    });
  };

  const renderDoctorRoute = () => {
    const mission = secondaryMissionByType("route-search", SECONDARY_MISSIONS);
    const route = save.campaign.doctorRoute;
    if (!route.active && !missionState(mission, save).completed) save = writeSave(startDoctorMission(save, mission));
    const current = save.campaign.doctorRoute;
    const metrics = `<div class="route-metrics"><span><small>PELIGRO</small><strong>${current.danger}</strong></span><span><small>TIEMPO</small><strong>${current.time}</strong></span><span><small>PISTAS</small><strong>${current.clues}</strong></span><span><small>RECURSOS</small><strong>${current.resources}</strong></span></div>`;
    if (current.phase >= 3) {
      const content = `<section class="doctor-encounter"><div class="doctor-mark" aria-hidden="true">医</div><div><p class="eyebrow">OBJETIVO LOCALIZADO</p><h2>Haru Takamine</h2><p>«Estas marcas pertenecen a una red de caminos anterior a la aldea. El mapa conduce a la guarida de los bandidos.»</p><p>«Lleva este libro a Sayo. Registra criaturas, técnicas y debilidades, pero sus páginas se completarán con tus propios encuentros.»</p>${metrics}<button class="primary-button" type="button" data-complete-doctor>RECIBIR EL LIBRO Y REGRESAR</button></div></section>`;
      shell(`<section class="doctor-route-screen"><header><p class="eyebrow">FASE 3/3 COMPLETADA</p><h2>El médico errante</h2></header>${content}</section>`);
      root.querySelector("[data-complete-doctor]")?.addEventListener("click", () => {
        const routeStats = { ...save.campaign.doctorRoute };
        const completion = completeDoctorMission(save, mission);
        save = writeSave(completion.save);
        onFinishSecondaryMission(save, mission, { outcome: "completed", routeStats, rewards: { xp: completion.xp, affinityXp: completion.affinityXp, coins: completion.coins, supplyBonus: completion.supplyBonus } });
      });
      return;
    }

    const pendingRiver = current.pendingEvent?.type === "river";
    const pendingCombat = current.pendingEvent?.type === "combat";
    const startRouteCombat = () => onStartMission(save, { id: `${mission.id}-route-combat`, parentMissionId: mission.id, parentType: mission.type, number: mission.number, type: "route-combat", title: "Emboscada en el bosque", location: "Bosque cerrado", encounters: ["reed_bandit"], reward: { xp: 0, coins: 0 } });
    const routeDefinitions = Object.values(DOCTOR_ROUTE_DEFINITIONS);
    const routeRows = [2, 1, 0].map((phase) => `<div class="route-map-row" data-map-phase="${phase}">${routeDefinitions.map((definition) => {
      const chosen = current.choices[phase] === definition.id;
      const available = phase === current.phase && !current.pendingEvent;
      const state = chosen ? "chosen" : phase < current.phase ? "passed" : available ? "available" : "locked";
      const icon = definition.id === "elevated" ? "▲" : definition.id === "river" ? "≈" : "♣";
      return `<button class="route-node route-${definition.id} ${state}" type="button" data-route="${definition.id}" ${available ? "" : "disabled"} aria-label="${escapeHtml(definition.title)}: ${escapeHtml(definition.description)}"><i aria-hidden="true">${icon}</i><span>${escapeHtml(definition.title)}</span><small>${escapeHtml(definition.subtitle)}</small></button>`;
    }).join("")}</div>`).join("");
    const routeMap = `<section class="route-map" aria-label="Mapa de rutas hacia Haru"><div class="route-destination"><span>医</span><strong>HARU</strong></div><div class="route-map-links" aria-hidden="true"></div>${routeRows}<div class="route-map-start"><span>◆</span><strong>INICIO</strong></div><p class="route-map-help">Selecciona uno de los tres nodos verdes del tramo ${current.phase + 1}.</p></section>`;
    const riverPanel = pendingRiver ? `<section class="river-investigation"><p class="eyebrow">LEE LA CORRIENTE</p><h3>Encuentra el paso correcto</h3><p>${escapeHtml(current.lastEvent)}</p><div>${RIVER_PASSAGES.map((passage) => `<button type="button" data-passage="${passage.id}">${passage.label}</button>`).join("")}</div></section>` : "";
    const combatPanel = pendingCombat ? `<section class="river-investigation combat-route-prompt"><p class="eyebrow">PELIGRO EN EL SENDERO</p><h3>Un saqueador bloquea el bosque</h3><p>${escapeHtml(current.lastEvent)}</p><div><button type="button" data-resume-route-combat>INICIAR DUELO 1 CONTRA 1</button></div></section>` : "";
    const content = `<section class="doctor-route-screen"><header><div><p class="eyebrow">EL MÉDICO ERRANTE · FASE ${current.phase + 1}/3</p><h2>Traza tu camino hasta Haru</h2><p>Elige un nodo conectado en cada tramo. Cada camino altera peligro, tiempo, pistas y recursos.</p></div>${metrics}</header>${current.lastEvent && !pendingRiver && !pendingCombat ? `<p class="route-log">${escapeHtml(current.lastEvent)}</p>` : ""}${routeMap}${riverPanel}${combatPanel}</section>`;
    shell(content);
    root.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => {
      save = writeSave(chooseDoctorMissionRoute(save, button.dataset.route));
      if (save.campaign.doctorRoute.pendingEvent?.type === "combat") {
        startRouteCombat();
        return;
      }
      renderDoctorRoute();
    }));
    root.querySelectorAll("[data-passage]").forEach((button) => button.addEventListener("click", () => {
      save = writeSave(resolveDoctorRiverPassage(save, button.dataset.passage));
      renderDoctorRoute();
    }));
    root.querySelector("[data-resume-route-combat]")?.addEventListener("click", startRouteCombat);
  };

  const numberedOptions = (count, current, prefix) => Array.from({ length: count }, (_, index) => `<option value="${index + 1}" ${Number(current) === index + 1 ? "selected" : ""}>${prefix} ${index + 1}</option>`).join("");
  const characterPreview = () => `<div class="character-preview">${fighterPreviewSvg(playerFighterAppearance(save))}</div>`;

  const renderDojo = () => {
    const stats = derivedStats(save);
    const { progression, character } = save;
    const elementRank = save.campaign.elementRank;
    const affinities = character.affinities;
    const activeAffinitySlots = availableAffinitySlots(progression.level, elementRank);
    const currentMasterId = masterIdForCharacter(character);
    const masterSelectionUnlocked = save.campaign.masterSelectionUnlocked;
    const masterCards = [
      { id: "mei", npc: NPCS.mei, advantage: "Disciplina defensiva", detail: "Reduce en 2 el daño de cada impacto recibido." },
      { id: "daichi", npc: NPCS.daichi, advantage: "Fuerza de la montaña", detail: "Añade 3 puntos al daño de todos tus ataques." }
    ].map(({ id, npc, advantage, detail }) => `<button class="master-option ${currentMasterId === id ? "selected" : ""}" type="button" data-master="${id}" ${masterSelectionUnlocked ? "" : "disabled"}><img src="${npc.image}?v=${ASSET_VERSION}" alt="" width="1145" height="1374"><span><strong>${npc.name}</strong><small>${advantage}</small><em>${detail}</em></span><b>${currentMasterId === id ? "MAESTRO ACTUAL" : masterSelectionUnlocked ? "ELEGIR" : "BLOQUEADO"}</b></button>`).join("");
    const techniqueCapacity = loadoutSlotsForLevel(progression.level);
    const affinitySlots = Array.from({ length: 3 }, (_, index) => {
      const slotRank = index + 1;
      const id = affinities[index];
      const slotConfig = AFFINITY_CONFIG.slots[index];
      const unlocked = activeAffinitySlots >= slotRank;
      if (!unlocked) return `<div class="affinity-slot locked"><span class="slot-index">${slotRank}</span><span><strong>Ranura bloqueada</strong><small>Nivel ${slotConfig.level} y rango de historia ${slotConfig.storyRank}</small></span><span class="slot-lock" aria-hidden="true">⌾</span></div>`;
      if (!id) {
        const choices = character.knownAffinities.filter((known) => !affinities.includes(known)).map((known) => `<button type="button" data-affinity-choice="${known}"><img src="${elementIcon(known)}" alt="" width="512" height="512">${elementName(known)}</button>`).join("");
        return `<div class="affinity-slot empty"><span class="slot-index">${slotRank}</span><span><strong>Elige afinidad</strong><small>${choices ? "El orden define su peso" : "Aprende otra afinidad durante la historia"}</small>${choices ? `<span class="affinity-slot-choices">${choices}</span>` : ""}</span></div>`;
      }
      return `<div class="affinity-slot selected"><span class="slot-index">${slotRank}</span><img src="${elementIcon(id)}" alt="" width="512" height="512"><span><strong>${elementName(id)}</strong><small>${character.affinityXp[id]} PX de afinidad</small></span><span class="slot-lock" title="Solo puede cambiarse con un objeto especial" aria-hidden="true">⌾</span></div>`;
    }).join("");
    const accessibleBranches = Object.entries(ELEMENTS).filter(([id]) => canAccessElement(id, affinities, elementRank) && JUTSU_LIBRARY.some((jutsu) => jutsu.element === id));
    const skillBranches = accessibleBranches.map(([id, element]) => {
      const requirements = basicRequirements(id).map(elementName).join(" + ");
      const elementXp = affinityXpForElement(character, id);
      const nodes = JUTSU_LIBRARY.filter((jutsu) => jutsu.element === id).sort((a, b) => a.affinityXpRequired - b.affinityXpRequired || a.unlockLevel - b.unlockLevel).map((jutsu, index) => {
        const levelReady = jutsu.unlockLevel <= progression.level;
        const affinityReady = elementXp >= jutsu.affinityXpRequired;
        const unlocked = isTechniqueLearned(save, jutsu);
        const selected = save.loadout.includes(jutsu.id);
        const lockReason = [levelReady ? "" : `Nv. ${jutsu.unlockLevel}`, affinityReady ? "" : `${jutsu.affinityXpRequired} PX afinidad`].filter(Boolean).join(" · ");
        return `<label class="skill-node ${unlocked ? "available" : "locked"} ${selected ? "selected" : ""}"><input type="checkbox" data-jutsu="${jutsu.id}" ${selected ? "checked" : ""} ${unlocked ? "" : "disabled"}><span class="skill-step">${index + 1}</span><span class="skill-copy"><strong>${jutsu.name}</strong><small>${jutsu.cost} CH · ${jutsu.damage} daño</small></span><span class="skill-state">${selected ? "EQUIPADA" : unlocked ? "APRENDIDA" : `🔒 ${lockReason}`}</span></label>`;
      }).join("");
      return `<section class="skill-branch tier-${element.tier}" style="--branch-color:#${element.color.toString(16).padStart(6, "0")}"><header><img src="${element.icon}" alt="" width="512" height="512"><span><strong>${element.name}</strong><small>${element.tier === 1 ? `${elementXp} PX` : `${requirements} · ${elementXp} PX`}</small></span></header><div class="skill-path">${nodes}</div></section>`;
    }).join("");
    const gearIcons = { weapon: "⚔", armor: "◈", accessory: "◇" };
    const gearTitles = { weapon: "Arma", armor: "Protector", accessory: "Accesorio" };
    const gearSlotState = (type) => {
      const id = save.equipment[type];
      const item = EQUIPMENT[type].find((entry) => entry.id === id);
      return { id, item };
    };
    const gearSlotContents = (type) => {
      const { item } = gearSlotState(type);
      return `<span class="gear-icon" aria-hidden="true">${gearIcons[type]}</span><span class="gear-copy"><small>${gearTitles[type]}</small><strong>${item?.name || "Nada equipado"}</strong><em>${item?.description || "Pulsa para equipar"}</em></span><span class="gear-action" aria-hidden="true">+</span>`;
    };
    const equipmentSlot = (type) => {
      const { id, item } = gearSlotState(type);
      return `<button class="gear-slot ${id ? "equipped" : "empty"}" type="button" data-gear-slot="${type}" aria-label="${gearTitles[type]}: ${item?.name || "nada equipado"}">${gearSlotContents(type)}</button>`;
    };
    const techniqueSlotsMarkup = () => Array.from({ length: 4 }, (_, index) => {
      const requiredLevel = index < 2 ? 1 : index === 2 ? 5 : 8;
      const jutsu = JUTSU_LIBRARY.find((entry) => entry.id === save.loadout[index]);
      const unlocked = index < techniqueCapacity;
      return `<div class="technique-slot ${unlocked ? "" : "locked"}"><span>${index + 1}</span><strong>${jutsu?.name || (unlocked ? "Vacía" : `Nivel ${requiredLevel}`)}</strong><small>${jutsu ? elementName(jutsu.element) : unlocked ? "Selecciona abajo" : "Ranura bloqueada"}</small></div>`;
    }).join("");
    const content = `<div class="dojo-layout">
      <section class="stage-panel profile-card">
        <p class="eyebrow">ENTRENAMIENTO</p><h2>${ELEMENT_RANK_LABELS[elementRank]}</h2><p class="compact">${affinities.length}/${activeAffinitySlots} afinidades activas</p>
        <div class="progress-track"><span style="width:${Math.min(100, progression.xp / xpForNextLevel(progression.level) * 100)}%"></span></div><p class="compact">Nivel ${progression.level} · ${progression.xp}/${xpForNextLevel(progression.level)} PX</p>
        <h3 class="attribute-heading">Estadísticas <span>${progression.attributePoints} puntos</span></h3><div class="stat-radar-wrap">${statRadarMarkup(stats, progression.attributes, progression.attributePoints)}</div>
      </section>
      <section class="stage-panel loadout-card">
        <div class="section-heading dojo-heading"><div><p class="eyebrow">PREPARACIÓN</p><h2>Configuración de combate</h2></div><strong>${save.loadout.length}/${techniqueCapacity} técnicas</strong></div>
        <nav class="dojo-tabs" role="tablist" aria-label="Secciones de configuración">
          <button type="button" role="tab" data-dojo-tab="equipment" aria-controls="dojo-panel-equipment">Equipo</button>
          <button type="button" role="tab" data-dojo-tab="techniques" aria-controls="dojo-panel-techniques">Técnicas</button>
          <button type="button" role="tab" data-dojo-tab="appearance" aria-controls="dojo-panel-appearance">Apariencia</button>
        </nav>
        <div id="dojo-panel-equipment" class="dojo-tab-panel" role="tabpanel" data-dojo-panel="equipment">
          <section class="dojo-section"><div class="dojo-section-heading"><div><h3>Afinidades</h3><p>La historia permite conocerlas; nivel y rango abren cada ranura.</p></div><span>Rango ${elementRank}</span></div><div class="affinity-slots">${affinitySlots}</div><p class="affinity-change-note">⌾ El orden define el peso: principal 100 %, secundaria 50 % y tercera 25 %. Por ahora no se puede reordenar.</p></section>
          <section class="dojo-section"><div class="dojo-section-heading"><div><h3>Equipamiento</h3><p>Pulsa una ranura para elegir o desequipar.</p></div></div><div class="equipment-grid">${equipmentSlot("weapon")}${equipmentSlot("armor")}${equipmentSlot("accessory")}</div></section>
        </div>
        <div id="dojo-panel-techniques" class="dojo-tab-panel" role="tabpanel" data-dojo-panel="techniques">
          <section class="skill-tree" aria-label="Árbol de habilidades por afinidad"><div class="skill-tree-heading"><div><h3>Árbol de habilidades</h3><p>Requieren nivel de personaje y experiencia de afinidad.</p></div><span class="tree-legend"><i></i> Aprendida <i></i> Bloqueada</span></div><div class="technique-slots">${techniqueSlotsMarkup()}</div><div class="skill-branches">${skillBranches}</div></section>
        </div>
        <div id="dojo-panel-appearance" class="dojo-tab-panel" role="tabpanel" data-dojo-panel="appearance">
          <section class="appearance-panel"><div class="dojo-section-heading"><div><h3>Personalizar apariencia</h3><p>Los cambios se reflejan también durante el combate. El tipo de cuerpo pertenece a la partida y no puede modificarse aquí.</p></div><span>Opcional</span></div><div class="customizer">${characterPreview(character)}<div class="cosmetic-grid"><label>Rostro<select data-cosmetic="face">${numberedOptions(3, character.face, "Rostro")}</select></label><label>Cabello<select data-cosmetic="hair">${numberedOptions(5, character.hair, "Peinado")}</select></label><label>Parte superior<select data-cosmetic="top">${numberedOptions(3, character.top, "Prenda")}</select></label><label>Parte inferior<select data-cosmetic="bottom">${numberedOptions(3, character.bottom, "Pantalón")}</select></label><label>Calzado<select data-cosmetic="shoes">${numberedOptions(2, character.shoes, "Calzado")}</select></label></div></div></section>
          <section class="master-selection"><div class="dojo-section-heading"><div><h3>Maestro</h3><p>Tu maestro aporta una ventaja pasiva sin entrar al combate. Los duelos de esta saga siguen siendo uno contra uno.</p></div><span>${masterSelectionUnlocked ? "ELECCIÓN DISPONIBLE" : "SE DESBLOQUEA AL COMPLETAR LA SAGA 1"}</span></div><div class="master-options">${masterCards}</div></section>
        </div>
        <p id="dojo-message" class="dojo-message" aria-live="polite">Los cambios se guardan automáticamente.</p>
      </section>
    </div><div class="equipment-modal" role="dialog" aria-modal="true" aria-labelledby="equipment-modal-title" hidden><div class="equipment-modal-card"><div class="equipment-modal-heading"><div><p class="eyebrow">INVENTARIO</p><h2 id="equipment-modal-title">Elegir equipo</h2></div><button type="button" data-close-equipment aria-label="Cerrar">×</button></div><div class="equipment-modal-options"></div></div></div>`;
    shell(locationStage("dojo", content));

    const selectDojoTab = (tabId, moveFocus = false) => {
      activeDojoTab = tabId;
      root.querySelectorAll("[data-dojo-tab]").forEach((button) => {
        const selected = button.dataset.dojoTab === tabId;
        button.setAttribute("aria-selected", String(selected));
        button.tabIndex = selected ? 0 : -1;
        if (selected && moveFocus) button.focus();
      });
      root.querySelectorAll("[data-dojo-panel]").forEach((panel) => { panel.hidden = panel.dataset.dojoPanel !== tabId; });
    };
    root.querySelectorAll("[data-dojo-tab]").forEach((button) => {
      button.addEventListener("click", () => selectDojoTab(button.dataset.dojoTab));
      button.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        const tabs = ["equipment", "techniques", "appearance"];
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const next = (tabs.indexOf(activeDojoTab) + direction + tabs.length) % tabs.length;
        selectDojoTab(tabs[next], true);
      });
    });
    selectDojoTab(activeDojoTab);

    // El Dojo es una interfaz interactiva: guardar un cambio no debe reconstruir
    // toda la vista. Actualizamos solo los nodos afectados para conservar foco,
    // scroll, diálogos y la sensación de respuesta inmediata.
    const syncDojo = () => {
      const nextStats = derivedStats(save);
      const points = save.progression.attributePoints;
      const pointsLabel = root.querySelector(".attribute-heading span");
      if (pointsLabel) pointsLabel.textContent = `${points} puntos`;
      const radar = root.querySelector(".stat-radar-wrap");
      if (radar) radar.innerHTML = statRadarMarkup(nextStats, save.progression.attributes, points);

      const preview = root.querySelector(".character-preview");
      if (preview) preview.innerHTML = fighterPreviewSvg(playerFighterAppearance(save));

      root.querySelectorAll("[data-gear-slot]").forEach((button) => {
        const type = button.dataset.gearSlot;
        const { id, item, unavailable } = gearSlotState(type);
        button.className = `gear-slot ${id ? "equipped" : "empty"} ${unavailable ? "locked" : ""}`;
        button.disabled = unavailable;
        button.setAttribute("aria-label", `${gearTitles[type]}: ${item?.name || "nada equipado"}`);
        button.innerHTML = gearSlotContents(type);
      });

      root.querySelectorAll("[data-cosmetic]").forEach((select) => {
        select.value = String(save.character[select.dataset.cosmetic]);
      });

      root.querySelectorAll("[data-jutsu]").forEach((input) => {
        const selected = save.loadout.includes(input.dataset.jutsu);
        input.checked = selected;
        const node = input.closest(".skill-node");
        node?.classList.toggle("selected", selected);
        const state = node?.querySelector(".skill-state");
        const jutsu = JUTSU_LIBRARY.find((entry) => entry.id === input.dataset.jutsu);
        if (state && jutsu && !input.disabled) state.textContent = selected ? "EQUIPADA" : "APRENDIDA";
      });

      const loadoutCount = root.querySelector(".loadout-card .section-heading > strong");
      if (loadoutCount) loadoutCount.textContent = `${save.loadout.length}/${techniqueCapacity} técnicas`;
      const slots = root.querySelector(".technique-slots");
      if (slots) slots.innerHTML = techniqueSlotsMarkup();
    };

    const persistDojo = (next) => {
      save = writeSave(next);
      syncDojo();
    };

    root.querySelector(".stat-radar-wrap")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-attribute]");
      if (!button) return;
      if (!save.progression.attributePoints) return;
      persistDojo(spendAttribute(save, button.dataset.attribute));
    });

    root.querySelectorAll("[data-affinity-choice]").forEach((button) => button.addEventListener("click", () => {
      persistDojo(selectNextAffinity(save, button.dataset.affinityChoice));
      renderDojo();
    }));

    const equipmentModal = root.querySelector(".equipment-modal");
    const equipmentModalTitle = root.querySelector("#equipment-modal-title");
    const equipmentModalOptions = root.querySelector(".equipment-modal-options");
    const stageOptions = root.querySelector(".stage-options");
    let equipmentReturnScroll = 0;
    let activeGearType = null;
    const closeEquipmentModal = () => {
      equipmentModal.hidden = true;
      root.querySelector(`[data-gear-slot="${activeGearType}"]`)?.focus({ preventScroll: true });
      if (stageOptions) stageOptions.scrollTop = equipmentReturnScroll;
    };
    const openEquipmentModal = (type) => {
      equipmentReturnScroll = stageOptions?.scrollTop || 0;
      activeGearType = type;
      const title = gearTitles[type];
      const items = EQUIPMENT[type];
      const options = [{ id: "", name: "Nada", description: "Dejar esta ranura vacía" }, ...items];
      equipmentModalTitle.textContent = `Equipar ${title.toLowerCase()}`;
      equipmentModalOptions.innerHTML = options.map((item) => `<button type="button" class="equipment-option ${save.equipment[type] === (item.id || null) ? "selected" : ""}" data-equipment-type="${type}" data-equipment-id="${item.id}"><span class="gear-icon" aria-hidden="true">${item.id ? gearIcons[type] : "∅"}</span><span><strong>${item.name}</strong><small>${item.description}</small></span>${save.equipment[type] === (item.id || null) ? "<em>Equipado</em>" : ""}</button>`).join("");
      equipmentModal.hidden = false;
      equipmentModal.querySelector(".equipment-option")?.focus();
    };
    root.querySelectorAll("[data-gear-slot]").forEach((button) => button.addEventListener("click", () => openEquipmentModal(button.dataset.gearSlot)));
    root.querySelector("[data-close-equipment]")?.addEventListener("click", closeEquipmentModal);
    equipmentModal?.addEventListener("click", (event) => {
      const option = event.target.closest("[data-equipment-type]");
      if (option) {
        save.equipment[option.dataset.equipmentType] = option.dataset.equipmentId || null;
        persistDojo(save);
        closeEquipmentModal();
      } else if (event.target === equipmentModal) {
        closeEquipmentModal();
      }
    });

    root.querySelectorAll("[data-cosmetic]").forEach((select) => select.addEventListener("change", () => {
      save.character[select.dataset.cosmetic] = Number(select.value);
      persistDojo(save);
    }));

    root.querySelectorAll("[data-master]").forEach((button) => button.addEventListener("click", () => {
      if (!save.campaign.masterSelectionUnlocked) return;
      save = writeSave(selectMaster(save, button.dataset.master));
      renderDojo();
    }));

    root.querySelectorAll("[data-jutsu]").forEach((input) => input.addEventListener("change", () => {
      const id = input.dataset.jutsu;
      const message = root.querySelector("#dojo-message");
      if (input.checked && save.loadout.length >= techniqueCapacity) {
        input.checked = false;
        if (message) message.textContent = `Tu nivel permite preparar ${techniqueCapacity} técnicas.`;
        return;
      }
      save.loadout = input.checked ? [...save.loadout, id] : save.loadout.filter((entry) => entry !== id);
      persistDojo(save);
      if (message) message.textContent = "Cambios guardados.";
    }));

    bindLocationStage("dojo");
  };

  const renderArchive = () => {
    if (save.campaign.doctorBookDeliveryPending) {
      const secretMarked = save.campaign.banditPrisonerChoice === "interrogate";
      const content = `<section class="stage-panel book-delivery"><p class="eyebrow">ENTREGA PENDIENTE</p><h2>El libro de Haru Takamine</h2><p class="lead">Sayo debe registrar el volumen antes de que sus páginas puedan actualizarse con tus encuentros.</p><div class="entrance-preview"><article><span>ENTRADA PRINCIPAL</span><strong>Defendida por enemigos</strong><p>El mapa de Haru confirma una ruta frontal hacia la guarida.</p></article><article class="${secretMarked ? "secret-known" : "secret-locked"}"><span>ENTRADA SECRETA</span><strong>${secretMarked ? "Almacén de monedas localizado" : "Ruta sin marcar"}</strong><p>${secretMarked ? "La información del teniente permite reconocer el acceso oculto." : "Sin el testimonio del teniente, esta sección del mapa permanece incompleta."}</p></article></div><button class="primary-button" type="button" data-deliver-book>ENTREGAR EL LIBRO A SAYO</button></section>`;
      shell(locationStage("archive", content));
      bindLocationStage("archive");
      root.querySelector("[data-deliver-book]")?.addEventListener("click", () => showDialogue([
        ["Sayo Kisaragi", "Haru tenía razón: este libro no es una enciclopedia terminada. Es un registro de campo que aprenderá de cada enfrentamiento."],
        ["Sayo Kisaragi", "El primer encuentro anotará nombre, apariencia y afiliación. Presenciar una técnica, hallar una debilidad y derrotar al rival completará el resto."],
        ["Sayo Kisaragi", secretMarked ? "El testimonio del teniente confirma dos entradas. La secreta termina junto al almacén de monedas; la principal está protegida." : "El mapa confirma la entrada principal, pero el acceso oculto no puede localizarse sin el testimonio del teniente."]
      ], () => {
        save = writeSave(deliverBestiaryBook(save));
        introducedViews.add("archive");
        renderArchive();
      }, "ACTIVAR REGISTRO", "story"));
      return;
    }
    const completed = new Set(save.campaign.completedMissions);
    const crowBandits = new Set(STORY_SAGAS[0].missionIds.flatMap((missionId) => MISSIONS.find((mission) => mission.id === missionId)?.encounters || []));
    const affiliationFor = (id) => crowBandits.has(id) ? "Bandidos del Cuervo" : "Combatiente hostil";
    const bestiaryEntries = Object.entries(save.bestiary.entries).map(([id, entry]) => {
      const enemy = ENEMY_ROSTER[id];
      const bossDataHidden = enemy.boss && entry.encounters < 2 && entry.documents < 1;
      const techniques = entry.techniques.length ? entry.techniques.map((actionId) => ENEMY_ACTIONS[actionId]?.name).filter(Boolean).join(", ") : "Ninguna observada";
      const weakness = entry.vulnerabilities.length ? entry.vulnerabilities.map(elementName).join(", ") : "Sin descubrir";
      const stats = entry.defeated && !bossDataHidden ? `VID ~${enemy.stats.health} · FUE ~${enemy.stats.strength} · VEL ~${enemy.stats.speed} · CH ~${enemy.stats.chakra} · SUE ~${enemy.stats.luck}` : bossDataHidden && entry.defeated ? "Datos sellados: requiere otro encuentro o un documento" : "Derrota al rival para estimarlas";
      const recordLabel = entry.defeated ? "REGISTRO DE DERROTA" : entry.encounters ? "PRIMER ENCUENTRO" : "INFORMACIÓN RECUPERADA";
      return `<article class="bestiary-entry ${enemy.boss ? "boss" : ""}" style="--enemy-cloth:#${enemy.colors.cloth.toString(16).padStart(6, "0")};--enemy-accent:#${enemy.colors.accent.toString(16).padStart(6, "0")}"><header><div class="bestiary-identity"><span class="bestiary-appearance" aria-label="Modelo provisional de ${escapeHtml(enemy.name)}"><img src="assets/modular/man_sprites/runtime/cabeza.png?v=0.62.0" alt="" loading="lazy"></span><div><span>${recordLabel}</span><h3>${escapeHtml(enemy.name)}</h3></div></div><strong>×${entry.encounters}</strong></header><p>${affiliationFor(id)} · Afinidad ${elementName(enemy.affinity)}</p><dl><div><dt>Técnicas</dt><dd>${escapeHtml(techniques)}</dd></div><div><dt>Debilidad observada</dt><dd>${escapeHtml(weakness)}</dd></div><div><dt>Estadísticas aproximadas</dt><dd>${escapeHtml(stats)}</dd></div><div><dt>Posibles recompensas</dt><dd>${entry.defeated && !bossDataHidden ? "PX, afinidad y monedas" : "Información incompleta"}</dd></div></dl></article>`;
    }).join("") || `<div class="bestiary-empty"><strong>Las páginas aún están vacías.</strong><p>Enfréntate a un rival para crear el primer registro.</p></div>`;
    const sagaMissions = STORY_SAGAS.flatMap((saga) => saga.missionIds.map((id) => MISSIONS.find((mission) => mission.id === id)).filter(Boolean));
    const records = sagaMissions.map((mission) => `<li class="${completed.has(mission.id) ? "done" : ""}"><span>${completed.has(mission.id) ? "✓" : "·"}</span><div><strong>${mission.title}</strong><small>${completed.has(mission.id) ? "Completada" : "Sin completar"}</small></div></li>`).join("");
    const sagaCompleted = sagaMissions.length > 0 && sagaMissions.every((mission) => completed.has(mission.id));
    const ending = sagaCompleted ? `<div class="ending-card"><p class="eyebrow">CRÓNICA COMPLETADA</p><h2>Futuro prometedor</h2><p>Raizen fue derrotado. Tu primera gran victoria queda registrada en la aldea.</p></div>` : "";
    const routeIntel = save.campaign.hideoutLocationRevealed ? `<section class="hideout-intel"><p class="eyebrow">MAPA DESCIFRADO</p><h3>Guarida de los bandidos</h3><p>Entrada principal: protegida por enemigos.</p><p class="${save.campaign.secretEntranceKnown ? "known" : "locked"}">Entrada secreta: ${save.campaign.secretEntranceKnown ? "marcada junto al almacén de monedas" : "ubicación desconocida"}.</p></section>` : "";
    const content = `<section class="stage-panel archive-card" data-comment="El libro se completa al observar y derrotar enemigos."><p class="eyebrow">BIBLIOTECA</p><h2>Libro de criaturas y combatientes</h2><p class="lead">Cada encuentro añade información. Algunos jefes requieren varios duelos o documentos.</p>${routeIntel}<div class="bestiary-grid">${bestiaryEntries}</div><details class="chronicle-details"><summary>Crónica de ${escapeHtml(save.character.name)} · ${completed.size} misiones</summary><ol>${records}</ol>${ending}</details></section>`;
    shell(locationStage("archive", content));
    bindLocationStage("archive");
  };

  const renderDebugTools = () => {
    // RELEASE-BLOCKER 1.0: esta herramienta modifica el progreso y no debe incluirse en producción.
    const campaign = save.campaign;
    const checkpointCards = DEBUG_CHECKPOINTS.map((checkpoint) => `<button class="debug-checkpoint" type="button" data-debug-checkpoint="${checkpoint.id}"><strong>${escapeHtml(checkpoint.label)}</strong><small>${escapeHtml(checkpoint.description)}</small></button>`).join("");
    const debugMissions = STORY_SAGAS.flatMap((saga) => saga.missionIds.map((id) => MISSIONS.find((mission) => mission.id === id)).filter(Boolean));
    const missionCards = debugMissions.map((mission) => {
      const completed = campaign.completedMissions.includes(mission.id);
      return `<article class="debug-mission ${completed ? "completed" : ""}"><span>${String(mission.number).padStart(2, "0")}</span><div><strong>${escapeHtml(mission.title)}</strong><small>${escapeHtml(mission.location)} · ${mission.encounters.length} encuentro${mission.encounters.length === 1 ? "" : "s"}</small></div><button type="button" data-debug-mission="${mission.id}" ${mission.comingSoon ? "disabled" : ""}>${mission.comingSoon ? "NO DISPONIBLE" : "INICIAR DIRECTO"}</button></article>`;
    }).join("");
    const debugFlags = [
      ["Tablón", campaign.secondaryBoardUnlocked],
      ["Kagemori", campaign.kagemoriInvestigated],
      ["Misión 2", campaign.banditBossMissionUnlocked],
      ["Doctor", campaign.doctorMissionUnlocked],
      ["Biblioteca", campaign.archiveUnlocked],
      ["Elegir maestro", campaign.masterSelectionUnlocked]
    ].map(([label, enabled]) => `<span class="debug-flag ${enabled ? "enabled" : ""}">${enabled ? "✓" : "·"} ${label}</span>`).join("");
    const content = `<section class="debug-screen">
      <header class="debug-heading"><div><p class="eyebrow">MODO DE DESARROLLO</p><h2>Herramientas de pruebas</h2><p>Estos controles modifican solamente la partida activa. No conceden PX, monedas ni recompensas.</p></div><button class="secondary-button" type="button" data-debug-restore ${debugSnapshot ? "" : "disabled"}>RESTAURAR ESTADO DE ENTRADA</button></header>
      <aside class="debug-release-warning" role="note"><strong>RETIRAR ANTES DE 1.0</strong><span>Esta pantalla y el botón PRUEBAS son herramientas internas; no deben formar parte de la publicación final.</span></aside>
      <div class="debug-status">${debugFlags}<span class="debug-choice">Teniente: ${escapeHtml(campaign.banditPrisonerChoice || "sin decisión")}</span></div>
      <section class="debug-section"><div><p class="eyebrow">PROGRESO RÁPIDO</p><h3>Aplicar punto de control</h3></div><p>Prepara un estado coherente de la saga sin reproducir escenas ni entregar recompensas.</p><div class="debug-checkpoints">${checkpointCards}</div></section>
      <section class="debug-section"><div><p class="eyebrow">ACCESO DIRECTO</p><h3>Saltar a una ubicación</h3></div><div class="debug-location-grid"><button type="button" data-debug-view="plaza">ALDEA</button><button type="button" data-debug-view="headquarters">CUARTEL</button><button type="button" data-debug-view="missions">TABLÓN</button><button type="button" data-debug-view="kagemori">KAGEMORI</button><button type="button" data-debug-view="dojo">DOJO</button><button type="button" data-debug-view="archive">BIBLIOTECA</button></div></section>
      <section class="debug-section"><div><p class="eyebrow">DECISIÓN PERSISTENTE</p><h3>Destino del teniente</h3></div><div class="debug-decision-grid"><button type="button" data-debug-choice="interrogate">INTERROGADO Y PERDONADO</button><button type="button" data-debug-choice="eliminate">ELIMINADO</button><button type="button" data-debug-choice="clear">SIN DECISIÓN</button></div></section>
      <section class="debug-section debug-missions-section"><div><p class="eyebrow">SIN BRIEFING</p><h3>Iniciar una misión directamente</h3></div><p>Ignora requisitos y diálogos del Cuartel, pero conserva las fases internas de la misión.</p><div class="debug-mission-list">${missionCards}</div></section>
    </section>`;
    shell(content);

    root.querySelectorAll("[data-debug-checkpoint]").forEach((button) => button.addEventListener("click", () => {
      save = writeSave(applyDebugCheckpoint(save, button.dataset.debugCheckpoint));
      introducedViews.clear();
      investigatedClues.clear();
      renderDebugTools();
    }));
    root.querySelectorAll("[data-debug-view]").forEach((button) => button.addEventListener("click", () => {
      view = button.dataset.debugView;
      introducedViews.add(view);
      render();
    }));
    root.querySelectorAll("[data-debug-choice]").forEach((button) => button.addEventListener("click", () => {
      const choice = button.dataset.debugChoice;
      save = writeSave(normalizeSave({
        ...save,
        campaign: {
          ...save.campaign,
          banditPrisonerChoice: choice === "clear" ? null : choice,
          nextSideMissionGoldMultiplier: choice === "interrogate" ? 2 : 1
        }
      }));
      renderDebugTools();
    }));
    root.querySelectorAll("[data-debug-mission]").forEach((button) => button.addEventListener("click", () => {
      const mission = MISSIONS.find((entry) => entry.id === button.dataset.debugMission);
      if (mission && !mission.comingSoon) onStartMission(save, mission);
    }));
    root.querySelector("[data-debug-restore]")?.addEventListener("click", () => {
      if (!debugSnapshot) return;
      save = writeSave(normalizeSave(JSON.parse(debugSnapshot)));
      debugSnapshot = null;
      introducedViews.clear();
      investigatedClues.clear();
      view = "plaza";
      render();
    });
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
