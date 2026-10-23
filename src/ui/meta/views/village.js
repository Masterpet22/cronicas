const COMING_SOON_LOCATIONS = {
  tower: { npcId: "kureha", message: "La Torre de Desafíos permanece cerrada mientras terminamos sus pruebas y reglas especiales. Próximamente podrás poner a prueba tu equipo piso por piso." },
  shop: { npcId: "hana", message: "La Tienda de Objetos aún está preparando su inventario. Próximamente podrás comprar consumibles, herramientas y mejoras con las monedas que consigas." },
  event: { npcId: "nao", message: "La Plaza de Eventos todavía no ha inaugurado sus actividades. Próximamente habrá festivales, visitantes y desafíos temporales." },
  inn: { npcId: "yuna", message: "El Gremio aún está preparando sus servicios. Próximamente podrás descansar, conversar con aliados y descubrir escenas entre misiones." },
  arena: { npcId: "goro", message: "La Arena de Combate todavía está en preparación. Próximamente podrás practicar, probar configuraciones y disputar combates sin afectar la campaña." }
};

export const VILLAGE_LOCATIONS = [
  { id: "headquarters", name: "Cuartel General", description: "Historia principal, rango y mando de la aldea", labelX: 840, labelY: 390, path: "M812 24 L843 30 L844 61 L907 58 L948 83 L948 126 L1008 159 L970 178 L1011 203 L969 220 L982 238 L946 249 L1002 274 L963 291 L1047 327 L1004 348 L1048 365 L1021 380 L1027 444 L966 444 L954 429 L727 429 L718 445 L668 445 L671 373 L642 362 L679 347 L650 329 L738 287 L702 277 L750 251 L714 242 L783 213 L738 203 L766 185 L729 172 L806 137 L815 112 Z" },
  { id: "dojo", name: "Dojo", description: "Entrenamiento, jutsus y equipo", labelX: 505, labelY: 446, path: "M359 383 L389 373 L409 356 L427 348 L453 348 L468 333 L574 335 L596 348 L618 352 L629 369 L657 386 L636 399 L638 493 L662 505 L659 534 L620 534 L613 550 L403 550 L395 536 L354 535 L351 507 L375 493 L376 399 L347 388 Z" },
  { id: "archive", name: "Biblioteca", description: "Crónicas y progreso de campaña", labelX: 167, labelY: 427, path: "M33 282 L47 268 L74 264 L82 256 L101 265 L110 251 L133 267 L223 267 L238 258 L252 267 L259 282 L313 329 L300 344 L303 466 L326 482 L324 514 L279 515 L273 530 L49 530 L42 517 L0 519 L0 340 L31 321 Z" },
  { id: "shop", name: "Tienda de Objetos", description: "Suministros y equipamiento", labelX: 1227, labelY: 455, path: "M1103 366 L1125 353 L1157 351 L1168 339 L1298 341 L1314 351 L1341 355 L1352 369 L1375 386 L1358 399 L1365 489 L1385 503 L1382 535 L1353 536 L1347 554 L1112 554 L1106 540 L1075 539 L1076 510 L1090 493 L1092 399 L1069 385 Z" },
  { id: "tower", name: "Torre de Desafíos", description: "Pruebas especiales por pisos", labelX: 1468, labelY: 343, path: "M1464 19 L1477 19 L1478 59 L1506 78 L1492 90 L1522 108 L1502 122 L1532 141 L1508 155 L1547 180 L1518 195 L1550 217 L1519 232 L1564 264 L1529 280 L1571 314 L1528 331 L1534 378 L1576 407 L1560 427 L1380 427 L1369 409 L1403 379 L1414 332 L1384 316 L1423 280 L1396 265 L1435 233 L1406 218 L1440 196 L1418 182 L1445 155 L1421 141 L1448 122 L1431 108 L1455 89 L1443 78 L1462 60 Z" },
  { id: "arena", name: "Arena de Combate", description: "Combates de práctica y duelos", labelX: 1420, labelY: 760, path: "M1188 616 C1220 597 1243 587 1270 589 L1292 608 L1321 566 L1351 596 C1402 584 1452 584 1484 593 L1518 562 L1543 599 C1582 604 1604 610 1620 622 L1646 588 L1678 602 L1678 856 L1647 867 L1625 888 L1205 888 L1179 866 L1161 824 L1160 704 Z" },
  { id: "inn", name: "Gremio", description: "Descanso y encuentros", labelX: 263, labelY: 748, path: "M65 671 L94 653 L139 635 L174 629 L191 612 L263 612 L283 628 L348 637 L370 654 L439 676 L458 697 L494 711 L477 736 L467 844 L409 848 L397 864 L130 864 L117 852 L57 850 L57 731 L41 711 Z" },
  { id: "missions", name: "Tablón de Misiones", description: "Misiones secundarias, contratos y recompensas", labelX: 744, labelY: 798, path: "M651 735 L671 723 L811 723 L837 736 L833 754 L846 770 L845 858 L821 858 L814 870 L669 870 L662 858 L637 858 L638 769 L650 753 Z" },
  { id: "event", name: "Plaza de Eventos", description: "Actividades temporales", labelX: 875, labelY: 602, path: "M819 501 L912 501 L912 607 L883 607 L882 628 C937 633 973 648 973 664 C973 683 923 697 861 697 C800 697 750 683 750 664 C750 647 791 633 846 628 L846 607 L819 607 Z" }
];

const VILLAGE_SERVICES = {
  shop: { eyebrow: "DISTRITO COMERCIAL", title: "Tienda de Objetos", text: "El inventario está preparándose. Este espacio alojará consumibles, armas y mejoras adquiribles con monedas.", items: ["Pociones y restauradores", "Kunais y herramientas", "Pergaminos de mejora"] },
  tower: { eyebrow: "DESAFÍO", title: "Torre de Desafíos", text: "Una futura serie de combates consecutivos con reglas especiales y recompensas por cada piso superado.", items: ["Nueve pisos temáticos", "Dificultad creciente", "Recompensas exclusivas"] },
  arena: { eyebrow: "CAMPO DE PRUEBAS", title: "Arena de Combate", text: "La arena quedará reservada para entrenamientos, pruebas de composiciones y duelos sin alterar la campaña.", items: ["Combate de práctica", "Pruebas de daño", "Duelos futuros"] },
  inn: { eyebrow: "ZONA DE DESCANSO", title: "Gremio", text: "Un lugar tranquilo para conversaciones, compañeros y futuros eventos narrativos entre misiones.", items: ["Encuentros con aliados", "Escenas de historia", "Bonificaciones de descanso"] },
  event: { eyebrow: "PLAZA CENTRAL", title: "Escenario de Eventos", text: "Este espacio se activará para festivales, comerciantes y desafíos de duración limitada.", items: ["Festivales de la aldea", "Personajes visitantes", "Eventos temporales"] }
};

function activeMissionObjectives(save) {
  const deps = arguments[1];
  const campaign = save.campaign;
  const objectives = [];
  const investigationMission = deps.secondaryMissionByType("investigation", deps.secondaryMissions);
  const routeSearchMission = deps.secondaryMissionByType("route-search", deps.secondaryMissions);
  const investigationState = deps.missionState(investigationMission, save);
  const routeSearchState = deps.missionState(routeSearchMission, save);
  if (routeSearchState.unlocked && !routeSearchState.completed) {
    objectives.push({ id: `secondary:${routeSearchMission.id}`, type: "BÚSQUEDA", title: routeSearchMission.title, detail: "Encuentra al doctor Haru Takamine para descifrar el mapa.", destination: "Tablón de Misiones", view: "missions" });
  }
  if (campaign.doctorBookDeliveryPending) {
    objectives.unshift({ id: `secondary:${routeSearchMission.id}-delivery`, type: "ENTREGA OBLIGATORIA", title: "El libro de Haru", detail: "Entrega el libro antiguo a Sayo para activar sus registros.", destination: "Biblioteca", view: "archive" });
  }
  if (investigationState.unlocked && !investigationState.completed) {
    objectives.push({ id: `secondary:${investigationMission.id}`, type: "ENCARGO DE SAYO", title: investigationMission.title, detail: "Investiga las pistas de la Aldea de Kagemori.", destination: "Tablón de Misiones", view: "missions" });
  }
  const storyMission = deps.nextAvailableMission(deps.mainMissions, "main", save);
  if (storyMission) {
    objectives.push({ id: `story:${storyMission.id}`, type: "MISIÓN PRINCIPAL", title: storyMission.title, detail: `${storyMission.location} · ${storyMission.duration}`, destination: "Cuartel General", view: "headquarters" });
  }
  return objectives;
}

export function createVillageView(deps) {
  let currentState = null;
  let layout = { locationId: null };

  const isComingSoon = (location, save) => Boolean(COMING_SOON_LOCATIONS[location.id])
    || (location.id === "missions" && !save.campaign.secondaryBoardUnlocked)
    || (location.id === "archive" && !save.campaign.archiveUnlocked && !save.campaign.doctorBookDeliveryPending);

  const welcomeDialogue = (character) => {
    const master = deps.masterForCharacter(character).name;
    return [
      ["Ren Arashiro", `Enhorabuena, ${character.name}. Desde hoy formas parte de los combatientes de la Aldea del Horizonte.`],
      [master, character.bodyType === "female" ? "Has dado el primer paso. En el dojo te enseñaré a dominar tu afinidad y a preparar cada técnica." : "Has dado el primer paso. En el dojo te enseñaré a convertir tu afinidad en una estrategia."],
      ["Ren Arashiro", "Tu primer encargo ya está listo. Revisa la saga Futuro prometedor y comienza con la misión de clase D."]
    ];
  };

  function renderPlaza(save) {
    const boardReady = save.campaign.secondaryBoardUnlocked;
    const investigationState = deps.missionState(deps.secondaryMissionByType("investigation", deps.secondaryMissions), save);
    const routeSearchState = deps.missionState(deps.secondaryMissionByType("route-search", deps.secondaryMissions), save);
    const nextObjective = save.campaign.doctorBookDeliveryPending ? "archive"
      : routeSearchState.unlocked && !routeSearchState.completed ? "missions"
      : boardReady && !investigationState.completed ? "missions" : "headquarters";
    const missionObjectives = activeMissionObjectives(save, deps);
    const storyObjective = missionObjectives.find((objective) => objective.id.startsWith("story:"));
    const secondaryObjectives = missionObjectives.filter((objective) => !objective.id.startsWith("story:"));
    const seenMissionNotices = new Set(save.campaign.seenMissionNotices);
    const unseenSecondaryObjectives = secondaryObjectives.filter((objective) => !seenMissionNotices.has(objective.id));
    const secondaryMissionItems = secondaryObjectives.length
      ? secondaryObjectives.map((objective) => `<button class="secondary-mission-item" type="button" data-view="${objective.view}"><span>${deps.escapeHtml(objective.type)}</span><strong>${deps.escapeHtml(objective.title)}</strong><small class="mission-destination">IR A: ${deps.escapeHtml(objective.destination)}</small><small>${deps.escapeHtml(objective.detail)}</small></button>`).join("")
      : `<p class="secondary-mission-empty">No hay misiones secundarias pendientes.</p>`;
    const missionDock = `<section class="mission-dock" aria-label="Misión actual">
      <div class="story-mission-current" title="${deps.escapeHtml(storyObjective?.detail || "La historia disponible ha sido completada.")}">
        <strong>${deps.escapeHtml(storyObjective?.title || "Sin misión principal activa")}</strong>
        ${storyObjective ? `<span>IR A: ${deps.escapeHtml(storyObjective.destination)}</span>` : ""}
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
      const comingSoon = isComingSoon(location, save);
      return `<g class="village-hotspot hotspot-${location.id} ${comingSoon ? "coming-soon" : ""}" ${comingSoon ? `data-coming-soon="${location.id}"` : `data-go="${location.id}"`} role="button" tabindex="0" aria-label="${deps.escapeHtml(location.name)}: ${deps.escapeHtml(comingSoon ? "Próximamente" : location.description)}"><path class="hotspot-shape" d="${location.path}"/></g>`;
    }).join("");
    const labels = VILLAGE_LOCATIONS.map((location) => {
      const comingSoon = isComingSoon(location, save);
      const recommended = location.id === nextObjective;
      return `<span class="map-label ${comingSoon ? "coming-soon" : ""} ${recommended ? "recommended" : ""}" data-map-label="${location.id}" aria-hidden="true" style="--label-x:${(location.labelX / 1678 * 100).toFixed(3)}%;--label-y:${(location.labelY / 937 * 100).toFixed(3)}%"><span class="map-label-box"><strong>${deps.escapeHtml(location.name)}</strong><small>${deps.escapeHtml(recommended ? "OBJETIVO · " + location.description : comingSoon ? "PRÓXIMAMENTE · " + location.description : location.description)}</small></span></span>`;
    }).join("");
    currentState = { ...currentState, secondaryObjectives, unseenSecondaryObjectives };
    return `<section class="village-map-card"><div class="map-heading"><div><p class="eyebrow">ALDEA DEL HORIZONTE</p><h2>Elige un destino</h2></div><p>Pasa el cursor o usa <kbd>Tab</kbd> para descubrir cada edificio.</p></div><figure class="village-map"><img src="assets/village/aldea.webp?v=${deps.assetVersion}" alt="Vista nocturna de la Aldea del Horizonte con sus nueve destinos" width="1678" height="937" decoding="async" fetchpriority="high" draggable="false"><svg class="village-hotspots" viewBox="0 0 1678 937" preserveAspectRatio="none" aria-label="Destinos de la aldea">${hotspots}</svg>${labels}</figure>${missionDock}</section>`;
  }

  function renderService(serviceId) {
    const service = VILLAGE_SERVICES[serviceId];
    const actions = serviceId === "headquarters" ? `<div class="service-actions"><button class="primary-button" data-go="missions">VER MISIONES</button><button class="secondary-button" data-go="dojo">PREPARAR EQUIPO</button></div>` : `<p class="development-note">Sección preparada para una fase posterior. El acceso desde el mapa ya está operativo.</p>`;
    return `<section class="stage-panel village-service"><div class="service-content"><p class="eyebrow">${service.eyebrow}</p><h2>${service.title}</h2><p class="lead">${service.text}</p><div class="service-grid">${service.items.map((item, index) => `<article data-comment="${deps.escapeHtml(`Esta opción corresponde a ${item.toLowerCase()}. Estará disponible cuando se complete su sistema.`)}"><span>0${index + 1}</span><strong>${item}</strong></article>`).join("")}</div>${actions}</div></section>`;
  }

  return {
    id: "village",
    render(state) {
      currentState = state;
      layout = { locationId: state.view === "plaza" ? null : state.view };
      return state.view === "plaza" ? renderPlaza(state.save) : renderService(state.view);
    },
    getLayout() { return layout; },
    mount(root, scope) {
      if (!currentState || currentState.view !== "plaza") return;
      const { save, secondaryObjectives, unseenSecondaryObjectives } = currentState;
      const menu = root.querySelector(".secondary-mission-menu");
      const trigger = root.querySelector(".secondary-mission-trigger");
      const panel = root.querySelector(".secondary-mission-panel");
      if (menu && trigger && panel) {
        const close = () => { panel.hidden = true; trigger.setAttribute("aria-expanded", "false"); };
        scope.listen(trigger, "click", () => {
          const opening = panel.hidden;
          panel.hidden = !opening;
          trigger.setAttribute("aria-expanded", String(opening));
          if (!opening || !unseenSecondaryObjectives.length) return;
          deps.onMissionNoticesSeen(secondaryObjectives.map((objective) => objective.id));
          menu.classList.remove("has-unseen");
          trigger.setAttribute("aria-label", "Misiones secundarias");
        });
        scope.listen(menu, "keydown", (event) => {
          if (event.key !== "Escape") return;
          close();
          trigger.focus();
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
          const npc = deps.npcs[info.npcId] || deps.npcs[deps.locationCast[locationId]?.[0]];
          deps.showDialogue([[npc?.name || "Habitante de la aldea", info.message]], () => {}, "ENTENDIDO");
        };
        scope.listen(hotspot, "mouseenter", () => deps.warmImage(`${deps.npcs[info.npcId].image}?v=${deps.assetVersion}`), { once: true });
        scope.listen(hotspot, "focus", () => deps.warmImage(`${deps.npcs[info.npcId].image}?v=${deps.assetVersion}`), { once: true });
        scope.listen(hotspot, "click", (event) => { event.preventDefault(); event.stopPropagation(); explain(); });
        scope.listen(hotspot, "mouseenter", showLabel);
        scope.listen(hotspot, "mouseleave", hideLabel);
        scope.listen(hotspot, "focus", showLabel);
        scope.listen(hotspot, "blur", hideLabel);
        scope.listen(hotspot, "keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          explain();
        });
      });
      if (!save.campaign.tutorialSeen) deps.showDialogue(welcomeDialogue(save.character), deps.onTutorialComplete, "IR AL CUARTEL", "story");
    },
    dispose() { currentState = null; }
  };
}

