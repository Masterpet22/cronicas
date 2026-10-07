import { fighterPreviewSvg, playerFighterAppearance } from "./character.js?v=0.17.1";
import { EQUIPMENT, JUTSU_LIBRARY, MISSIONS, STORY_SAGAS } from "./data.js?v=0.17.1";
import { LOCATION_CAST, NPCS, locationDialogue, npcByName } from "./npcs.js?v=0.17.1";
import { affinityXpForElement, createCharacter, derivedStats, isTechniqueLearned, loadoutSlotsForLevel, spendAttribute, writeSave, xpForNextLevel } from "./save.js?v=0.17.1";
import { BASIC_ELEMENT_IDS, ELEMENTS, ELEMENT_RANK_LABELS, basicRequirements, canAccessElement, elementIcon, elementName } from "./elements.js?v=0.15.1";

const COMING_SOON_LOCATIONS = {
  missions: { npcId: "riku", message: "El Tablón todavía no está recibiendo encargos. Próximamente podrás aceptar aquí misiones secundarias, contratos y favores de la aldea." },
  tower: { npcId: "kureha", message: "La Torre de Desafíos permanece cerrada mientras terminamos sus pruebas y reglas especiales. Próximamente podrás poner a prueba tu equipo piso por piso." },
  shop: { npcId: "hana", message: "La Tienda de Objetos aún está preparando su inventario. Próximamente podrás comprar consumibles, herramientas y mejoras con las monedas que consigas." },
  event: { npcId: "nao", message: "La Plaza de Eventos todavía no ha inaugurado sus actividades. Próximamente habrá festivales, visitantes y desafíos temporales." },
  inn: { npcId: "yuna", message: "La Posada aún está preparando sus servicios. Próximamente podrás descansar, conversar con aliados y descubrir escenas entre misiones." },
  arena: { npcId: "goro", message: "La Arena de Combate todavía está en preparación. Próximamente podrás practicar, probar configuraciones y disputar combates sin afectar la campaña." }
};
const TUTORIAL = [
  ["Maestra Aya", "Bienvenido a la Aldea del Horizonte. Cada edificio de la plaza conduce a una sección distinta."],
  ["Maestra Aya", "En el dojo preparas técnicas según tu nivel y desarrollas la experiencia de tus afinidades."],
  ["Mika", "Las misiones de historia se reciben en el Cuartel General. El tablón de la plaza queda reservado para encargos y misiones secundarias."]
];
const warmedImages = new Set();

function warmImage(src) {
  if (warmedImages.has(src)) return;
  warmedImages.add(src);
  const image = new Image();
  image.decoding = "async";
  image.src = src;
}

function warmLocationAssets(locationId) {
  warmImage(`assets/locations/${locationId}.webp?v=0.12.0`);
  (LOCATION_CAST[locationId] || []).forEach((id) => warmImage(`${NPCS[id].image}?v=0.12.0`));
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

export function mountMetaUI(root, initialSave, onStartMission) {
  let save = initialSave;
  let view = "plaza";
  const introducedViews = new Set();
  let ambientTimer = 0;

  const persist = (next, shouldRender = true) => {
    save = writeSave(next);
    if (shouldRender) render();
  };

  const renderCreator = () => {
    const affinityChoices = BASIC_ELEMENT_IDS.map((id, index) => `<label class="affinity-choice"><input type="radio" name="affinity" value="${id}" ${index === 0 ? "checked" : ""}><img src="${elementIcon(id)}" alt="" width="512" height="512"><span><strong>${elementName(id)}</strong><small>Afinidad básica</small></span></label>`).join("");
    root.innerHTML = `
      <section class="dojo-card creator-card">
        <p class="eyebrow">PRIMER PASO</p><h2>Crea tu combatiente</h2>
        <p class="lead">Comienzas con una afinidad básica. Los rangos 2 y 3 abrirán nuevos espacios y combinaciones.</p>
        <form id="character-form" class="creator-form">
          <label>Nombre<input name="name" maxlength="18" value="Akio" required></label>
          <fieldset class="affinity-picker"><legend>Afinidad inicial</legend>${affinityChoices}</fieldset>
          <label>Cuerpo<select name="bodyType"><option value="male">Masculino</option><option value="female">Femenino</option></select></label>
          <label>Peinado<select name="hair"><option value="1">Corto</option><option value="2">Largo</option><option value="3">Puntiagudo</option><option value="4">Coleta</option><option value="5">Ninja</option></select></label>
          <label>Color principal y aura<input name="appearance" type="color" value="#68a8ff"></label>
          <button class="primary-button" type="submit">CREAR PERSONAJE</button>
        </form>
      </section>`;
    root.querySelector("#character-form").addEventListener("submit", (event) => {
      event.preventDefault();
      persist(createCharacter(save, Object.fromEntries(new FormData(event.currentTarget))));
    });
  };

  const shell = (content) => {
    const { character, progression, campaign } = save;
    const currentLocation = VILLAGE_LOCATIONS.find((location) => location.id === view);
    const navigation = view === "plaza" ? "" : `<nav class="village-nav village-return" aria-label="Navegación de la aldea"><button data-view="plaza">← Volver al mapa</button><span>${escapeHtml(currentLocation?.name || "Aldea del Horizonte")}</span></nav>`;
    root.innerHTML = `
      <div class="village-shell">
        <section class="village-topbar dojo-card">
          <div class="profile-heading">
            <span class="avatar-swatch" style="--avatar:${character.appearance}"></span>
            <div class="profile-copy"><p class="eyebrow">${campaign.rank.toUpperCase()}</p><h2>${escapeHtml(character.name)}</h2></div>
            <strong class="level-chip">Nivel ${progression.level}</strong>
          </div>
          <div class="campaign-summary">
            <span class="summary-item"><b aria-hidden="true">★</b><strong>${progression.xp}/${xpForNextLevel(progression.level)}</strong><small>PX</small></span>
            <span class="summary-item"><b aria-hidden="true">▣</b><strong>${progression.coins}</strong><small>monedas</small></span>
            <span class="summary-item"><b aria-hidden="true">♛</b><strong>${campaign.completedMissions.length}/10</strong><small>misiones</small></span>
          </div>
          <button class="player-settings-trigger" type="button" aria-label="Abrir ajustes" aria-expanded="false">
            <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 4 39 24 60 18 44 32 60 46 39 40 32 60 25 40 4 46 20 32 4 18 25 24Z"/><circle cx="32" cy="32" r="6"/></svg>
          </button>
        </section>
        ${navigation}
        ${content}
      </div>`;
    const settingsDetails = document.querySelector(".game-settings");
    const settingsTrigger = root.querySelector(".player-settings-trigger");
    if (settingsTrigger && settingsDetails) {
      settingsTrigger.setAttribute("aria-expanded", settingsDetails.open ? "true" : "false");
      settingsTrigger.addEventListener("click", () => {
        settingsDetails.open = !settingsDetails.open;
        settingsTrigger.setAttribute("aria-expanded", settingsDetails.open ? "true" : "false");
      });
      settingsDetails.addEventListener("toggle", () => {
        if (settingsTrigger.isConnected) settingsTrigger.setAttribute("aria-expanded", settingsDetails.open ? "true" : "false");
      }, { once: true });
    }

    root.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
      document.querySelector(".game-settings")?.removeAttribute("open");
      view = button.dataset.view;
      render();
    }));
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

  const showDialogue = (lines, onComplete, finalLabel = "CONTINUAR") => {
    let index = 0;
    const overlay = document.createElement("div");
    overlay.className = "dialogue-overlay";
    const draw = () => {
      const [speaker, dialogue] = lines[index];
      const last = index === lines.length - 1;
      const npc = npcByName(speaker);
      const portrait = npc ? `<div class="dialogue-portrait"><img src="${npc.image}?v=0.12.0" alt="${escapeHtml(npc.name)}" width="1145" height="1374" decoding="async"><span>${escapeHtml(npc.title)}</span></div>` : "";
      overlay.innerHTML = `<section class="dialogue-box ${npc ? "with-portrait" : ""}">${portrait}<div class="dialogue-copy"><p class="eyebrow">${escapeHtml(speaker)}</p><p>${escapeHtml(dialogue)}</p><button class="primary-button">${last ? finalLabel : "SIGUIENTE"}</button><small>${index + 1}/${lines.length}</small></div></section>`;
      overlay.querySelector("button").addEventListener("click", () => {
        if (!last) { index += 1; draw(); return; }
        overlay.remove();
        onComplete();
      });
    };
    draw();
    root.append(overlay);
  };

  const locationStage = (locationId, content) => {
    const cast = LOCATION_CAST[locationId] || [];
    const introduced = introducedViews.has(locationId);
    const locationName = VILLAGE_LOCATIONS.find((location) => location.id === locationId)?.name || locationId;
    const portraits = cast.map((id) => {
      const npc = NPCS[id];
      return `<button class="stage-character" type="button" data-stage-npc="${id}" aria-label="Hablar con ${escapeHtml(npc.name)}"><img src="${npc.image}?v=0.12.0" alt="${escapeHtml(npc.name)}" width="1145" height="1374" loading="lazy" decoding="async"><span>${escapeHtml(npc.name)}</span></button>`;
    }).join("");
    return `<section class="location-stage location-${locationId} ${cast.length > 1 ? "has-cast" : ""}" data-location-stage="${locationId}" style="--location-bg:url('assets/locations/${locationId}.webp?v=0.12.0')" aria-label="${escapeHtml(locationName)}">
      <div class="stage-characters">${portraits}</div>
      <div class="stage-speech" data-stage-speech aria-live="polite" ${introduced ? "hidden" : ""}><p class="stage-speaker" data-stage-speaker></p><p data-stage-text></p><div><small data-stage-count></small><button class="primary-button" type="button" data-stage-next>SIGUIENTE</button></div></div>
      <div class="stage-ambient" data-stage-ambient role="status" aria-live="polite" hidden><strong data-ambient-speaker></strong><span data-ambient-text></span></div>
      <div class="stage-options ${introduced ? "ready" : ""}" data-stage-options ${introduced ? "" : "hidden"}>${content}</div>
    </section>`;
  };

  const bindLocationStage = (locationId) => {
    clearTimeout(ambientTimer);
    const stage = root.querySelector(`[data-location-stage="${locationId}"]`);
    if (!stage) return;
    const cast = LOCATION_CAST[locationId] || [];
    const lines = locationDialogue(locationId, "intro");
    const speech = stage.querySelector("[data-stage-speech]");
    const options = stage.querySelector("[data-stage-options]");
    const ambient = stage.querySelector("[data-stage-ambient]");
    let lineIndex = 0;
    let tipTimer = 0;

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
    const scheduleAmbientTip = () => {
      ambientTimer = window.setTimeout(() => {
        if (!stage.isConnected || view !== locationId) return;
        const npcId = cast[Math.floor(Math.random() * cast.length)];
        const guide = NPCS[npcId]?.guide || [];
        if (guide.length) showTip(guide[Math.floor(Math.random() * guide.length)], npcId);
        scheduleAmbientTip();
      }, 18000);
    };
    const revealOptions = () => {
      introducedViews.add(locationId);
      speech.classList.add("leaving");
      window.setTimeout(() => {
        if (!stage.isConnected) return;
        speech.hidden = true;
        options.hidden = false;
        requestAnimationFrame(() => options.classList.add("ready"));
        scheduleAmbientTip();
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
      scheduleAmbientTip();
    }
    stage.querySelectorAll("[data-stage-npc]").forEach((button) => button.addEventListener("click", () => {
      if (!options.hidden) {
        const guide = NPCS[button.dataset.stageNpc]?.guide || [];
        showTip(guide[Math.floor(Math.random() * guide.length)], button.dataset.stageNpc);
      }
    }));
    stage.querySelectorAll("[data-comment]").forEach((control) => {
      let shown = false;
      const explain = () => {
        if (shown || options.hidden) return;
        shown = true;
        showTip(control.dataset.comment, control.dataset.commentNpc || cast[0]);
      };
      control.addEventListener("mouseenter", explain);
      control.addEventListener("focusin", explain);
    });
  };

  const renderPlaza = () => {
    const companion = save.campaign.companion
      ? `<div class="notice-card ally"><span class="notice-icon" aria-hidden="true">◆</span><strong>Mika está disponible</strong><span class="notice-detail">Atacará automáticamente cada dos rondas.</span><span class="notice-arrow" aria-hidden="true">›</span></div>`
      : `<div class="notice-card"><span class="notice-icon" aria-hidden="true">▣</span><strong>Compañero bloqueado</strong><span class="notice-detail">Completa “Ecos entre los juncos”.</span><span class="notice-arrow" aria-hidden="true">›</span></div>`;
    const hotspots = VILLAGE_LOCATIONS.map((location) => {
      const comingSoon = Boolean(COMING_SOON_LOCATIONS[location.id]);
      return `<g class="village-hotspot hotspot-${location.id} ${comingSoon ? "coming-soon" : ""}" ${comingSoon ? `data-coming-soon="${location.id}"` : `data-go="${location.id}"`} role="button" tabindex="0" aria-label="${escapeHtml(location.name)}: ${escapeHtml(comingSoon ? "Próximamente" : location.description)}"><path class="hotspot-shape" d="${location.path}"/></g>`;
    }).join("");
    const labels = VILLAGE_LOCATIONS.map((location) => {
      const comingSoon = Boolean(COMING_SOON_LOCATIONS[location.id]);
      return `<span class="map-label ${comingSoon ? "coming-soon" : ""}" data-map-label="${location.id}" aria-hidden="true" style="--label-x:${(location.labelX / 1678 * 100).toFixed(3)}%;--label-y:${(location.labelY / 937 * 100).toFixed(3)}%"><span class="map-label-box"><strong>${escapeHtml(location.name)}</strong><small>${escapeHtml(comingSoon ? "PRÓXIMAMENTE · " + location.description : location.description)}</small></span></span>`;
    }).join("");
    shell(`<section class="village-map-card"><div class="map-heading"><div><p class="eyebrow">ALDEA DEL HORIZONTE</p><h2>Elige un destino</h2></div><p>Pasa el cursor o usa <kbd>Tab</kbd> para descubrir cada edificio.</p></div><figure class="village-map"><img src="assets/village/aldea.webp?v=0.12.0" alt="Vista nocturna de la Aldea del Horizonte con sus nueve destinos" width="1678" height="937" decoding="async" fetchpriority="high" draggable="false"><svg class="village-hotspots" viewBox="0 0 1678 937" preserveAspectRatio="none" aria-label="Destinos de la aldea">${hotspots}</svg>${labels}</figure>${companion}</section>`);

    root.querySelectorAll("[data-coming-soon]").forEach((hotspot) => {
      const locationId = hotspot.getAttribute("data-coming-soon");
      const info = COMING_SOON_LOCATIONS[locationId];
      const label = root.querySelector(`[data-map-label="${locationId}"]`);
      const showLabel = () => label?.classList.add("visible");
      const hideLabel = () => label?.classList.remove("visible");
      const explain = () => {
        if (!info) return;
        const npc = NPCS[info.npcId] || NPCS[LOCATION_CAST[locationId]?.[0]];
        const speaker = npc?.name || "Habitante de la aldea";
        showDialogue([[speaker, info.message]], () => {}, "ENTENDIDO");
      };

      hotspot.addEventListener("mouseenter", () => warmImage(`${NPCS[info.npcId].image}?v=0.12.0`), { once: true });
      hotspot.addEventListener("focus", () => warmImage(`${NPCS[info.npcId].image}?v=0.12.0`), { once: true });

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

    if (!save.campaign.tutorialSeen) showDialogue(TUTORIAL, () => { save.campaign.tutorialSeen = true; persist(save); });
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

    const missionUnlocked = (mission) => {
      const index = MISSIONS.findIndex((entry) => entry.id === mission.id);
      return index === 0 || completed.has(MISSIONS[index - 1].id);
    };

    const sagaUnlocked = (saga, sagaIndex) => {
      if (sagaIndex === 0) return true;
      const previousSaga = STORY_SAGAS[sagaIndex - 1];
      return previousSaga.missionIds.every((id) => completed.has(id));
    };

    if (!activeSaga) {
      const sagaCards = STORY_SAGAS.map((saga, sagaIndex) => {
        const unlocked = sagaUnlocked(saga, sagaIndex);
        const sagaMissions = saga.missionIds.map((id) => MISSIONS.find((mission) => mission.id === id)).filter(Boolean);
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

      const content = `<section class="stage-panel mission-board saga-selector" data-comment="La campaña está dividida en sagas. Completa una saga para desbloquear la siguiente."><div class="section-heading"><div><p class="eyebrow">CENTRO DE MANDO</p><h2>Selecciona una saga</h2></div><strong>${completed.size}/${MISSIONS.length} completadas</strong></div><p class="lead">Cada saga agrupa un arco de la historia principal. Entra en una para ver sus misiones.</p><div class="saga-grid">${sagaCards}</div></section>`;
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
    const sagaMissions = activeSaga.missionIds.map((id) => MISSIONS.find((mission) => mission.id === id)).filter(Boolean);
    const cards = sagaMissions.map((mission) => {
      const unlocked = missionUnlocked(mission);
      const done = completed.has(mission.id);
      const label = done ? "REPETIR" : unlocked ? (mission.exam ? "PRESENTAR EXAMEN" : "INICIAR HISTORIA") : "BLOQUEADA";
      return `<article class="mission-card ${done ? "completed" : ""} ${unlocked ? "" : "locked"}"><div class="mission-number">${String(mission.number).padStart(2, "0")}</div><div><p class="eyebrow">${mission.exam ? "EXAMEN DE RANGO" : "MISIÓN DE HISTORIA · " + mission.location}</p><h3>${mission.title}</h3><p>${mission.encounters.length} encuentro${mission.encounters.length === 1 ? "" : "s"} · ${mission.duration} · ${mission.reward.xp} PX · ${mission.reward.coins} monedas</p></div><button data-mission="${mission.id}" ${unlocked ? "" : "disabled"}>${label}</button></article>`;
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
      showDialogue(mission.briefing, () => onStartMission(save, mission), "COMENZAR MISIÓN");
    }));
    bindLocationStage("headquarters");
  };

  const renderSecondaryMissions = () => {
    const content = `<section class="stage-panel mission-board" data-comment="El tablón reúne trabajos opcionales que no bloquean el avance de la campaña principal."><div class="section-heading"><div><p class="eyebrow">TABLÓN DE ENCARGOS</p><h2>Misiones secundarias</h2></div><strong>0 disponibles</strong></div><p class="lead">Aquí aparecerán contratos, favores, cacerías y encargos opcionales de los habitantes de la aldea.</p><div class="development-note"><strong>Sin encargos publicados por ahora.</strong><br>Las misiones secundarias se añadirán aquí sin alterar el progreso de la historia principal.</div></section>`;
    shell(locationStage("missions", content));
    bindLocationStage("missions");
  };

  const numberedOptions = (count, current, prefix) => Array.from({ length: count }, (_, index) => `<option value="${index + 1}" ${Number(current) === index + 1 ? "selected" : ""}>${prefix} ${index + 1}</option>`).join("");
  const characterPreview = () => `<div class="character-preview">${fighterPreviewSvg(playerFighterAppearance(save))}</div>`;

  const renderDojo = () => {
    const stats = derivedStats(save);
    const { progression, character } = save;
    const elementRank = save.campaign.elementRank;
    const affinities = character.affinities;
    const techniqueCapacity = loadoutSlotsForLevel(progression.level);
    const affinitySlots = Array.from({ length: 3 }, (_, index) => {
      const slotRank = index + 1;
      const id = affinities[index];
      const unlocked = elementRank >= slotRank;
      if (!unlocked) return `<div class="affinity-slot locked"><span class="slot-index">${slotRank}</span><span><strong>Ranura bloqueada</strong><small>Requiere rango elemental ${slotRank}</small></span><span class="slot-lock" aria-hidden="true">⌾</span></div>`;
      if (!id) return `<div class="affinity-slot empty locked"><span class="slot-index">${slotRank}</span><span><strong>Sin afinidad</strong><small>Requiere un Catalizador elemental</small></span><span class="slot-lock" aria-hidden="true">⌾</span></div>`;
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
    const gearIcons = { weapon: "⚔", armor: "◈", accessory: "◇", companion: "♟" };
    const gearTitles = { weapon: "Arma", armor: "Protector", accessory: "Accesorio", companion: "Compañero" };
    const equipmentSlot = (type) => {
      const id = save.equipment[type];
      const item = type === "companion" ? (id === "mika" ? { name: "Mika", description: "Compañera activa" } : null) : EQUIPMENT[type].find((entry) => entry.id === id);
      const unavailable = type === "companion" && !save.campaign.companion;
      return `<button class="gear-slot ${id ? "equipped" : "empty"} ${unavailable ? "locked" : ""}" type="button" data-gear-slot="${type}" ${unavailable ? "disabled" : ""}><span class="gear-icon" aria-hidden="true">${gearIcons[type]}</span><span class="gear-copy"><small>${gearTitles[type]}</small><strong>${item?.name || "Nada equipado"}</strong><em>${unavailable ? "Aún no disponible" : item?.description || "Pulsa para equipar"}</em></span><span class="gear-action" aria-hidden="true">${unavailable ? "⌾" : "+"}</span></button>`;
    };
    const techniqueSlotsMarkup = () => Array.from({ length: 4 }, (_, index) => {
      const requiredLevel = index < 2 ? 1 : index === 2 ? 5 : 8;
      const jutsu = JUTSU_LIBRARY.find((entry) => entry.id === save.loadout[index]);
      const unlocked = index < techniqueCapacity;
      return `<div class="technique-slot ${unlocked ? "" : "locked"}"><span>${index + 1}</span><strong>${jutsu?.name || (unlocked ? "Vacía" : `Nivel ${requiredLevel}`)}</strong><small>${jutsu ? elementName(jutsu.element) : unlocked ? "Selecciona abajo" : "Ranura bloqueada"}</small></div>`;
    }).join("");
    const content = `<div class="dojo-layout">
      <section class="stage-panel profile-card" data-comment="Poder mejora el daño; Agilidad modifica velocidad y evasión; Enfoque aumenta chakra y precisión." data-comment-npc="daichi">
        <p class="eyebrow">ENTRENAMIENTO</p><h2>${ELEMENT_RANK_LABELS[elementRank]}</h2><p class="compact">${affinities.length}/${elementRank} afinidades activas</p>
        <div class="progress-track"><span style="width:${Math.min(100, progression.xp / xpForNextLevel(progression.level) * 100)}%"></span></div><p class="compact">Nivel ${progression.level} · ${progression.xp}/${xpForNextLevel(progression.level)} PX</p>
        <h3>Atributos <span>${progression.attributePoints} puntos</span></h3><div class="attribute-list"><button data-attribute="power" ${progression.attributePoints ? "" : "disabled"}>Poder ${progression.attributes.power}<small>+1 daño</small></button><button data-attribute="agility" ${progression.attributePoints ? "" : "disabled"}>Agilidad ${progression.attributes.agility}<small>velocidad y evasión</small></button><button data-attribute="focus" ${progression.attributePoints ? "" : "disabled"}>Enfoque ${progression.attributes.focus}<small>chakra y precisión</small></button></div>
        <div class="stat-grid"><span>${stats.maxHp}<small>PV</small></span><span>${stats.maxChakra}<small>CH</small></span><span>${stats.speed}<small>VEL</small></span><span>${stats.evasion}<small>EVA</small></span></div>
      </section>
      <section class="stage-panel loadout-card" data-comment="Aquí preparas el equipo y las técnicas que usarás en combate." data-comment-npc="mei">
        <div class="section-heading dojo-heading"><div><p class="eyebrow">PREPARACIÓN</p><h2>Configuración de combate</h2></div><strong>${save.loadout.length}/${techniqueCapacity} técnicas</strong></div>
        <section class="dojo-section"><div class="dojo-section-heading"><div><h3>Afinidades</h3><p>Se eligen al crear el personaje y progresan combatiendo.</p></div><span>Rango ${elementRank}</span></div><div class="affinity-slots">${affinitySlots}</div><p class="affinity-change-note">⌾ Para cambiar o añadir una afinidad necesitarás un Catalizador elemental, disponible próximamente.</p></section>
        <section class="dojo-section"><div class="dojo-section-heading"><div><h3>Equipamiento</h3><p>Pulsa una ranura para elegir o desequipar.</p></div></div><div class="equipment-grid">${equipmentSlot("weapon")}${equipmentSlot("armor")}${equipmentSlot("accessory")}${equipmentSlot("companion")}</div></section>
        <section class="skill-tree" aria-label="Árbol de habilidades por afinidad"><div class="skill-tree-heading"><div><h3>Árbol de habilidades</h3><p>Requieren nivel de personaje y experiencia de afinidad.</p></div><span class="tree-legend"><i></i> Aprendida <i></i> Bloqueada</span></div><div class="technique-slots">${techniqueSlotsMarkup()}</div><div class="skill-branches">${skillBranches}</div></section>
        <details class="appearance-panel"><summary>Personalizar apariencia <span>Opcional</span></summary><div class="customizer">${characterPreview(character)}<div class="cosmetic-grid"><label>Cuerpo<select data-cosmetic="bodyType"><option value="male" ${character.bodyType === "male" ? "selected" : ""}>Masculino</option><option value="female" ${character.bodyType === "female" ? "selected" : ""}>Femenino</option></select></label><label>Rostro<select data-cosmetic="face">${numberedOptions(3, character.face, "Rostro")}</select></label><label>Cabello<select data-cosmetic="hair">${numberedOptions(5, character.hair, "Peinado")}</select></label><label>Parte superior<select data-cosmetic="top">${numberedOptions(3, character.top, "Prenda")}</select></label><label>Parte inferior<select data-cosmetic="bottom">${numberedOptions(3, character.bottom, "Pantalón")}</select></label><label>Calzado<select data-cosmetic="shoes">${numberedOptions(2, character.shoes, "Calzado")}</select></label></div></div></details>
        <p id="dojo-message" class="dojo-message" aria-live="polite">Los cambios se guardan automáticamente.</p>
      </section>
    </div><div class="equipment-modal" role="dialog" aria-modal="true" aria-labelledby="equipment-modal-title" hidden><div class="equipment-modal-card"><div class="equipment-modal-heading"><div><p class="eyebrow">INVENTARIO</p><h2 id="equipment-modal-title">Elegir equipo</h2></div><button type="button" data-close-equipment aria-label="Cerrar">×</button></div><div class="equipment-modal-options"></div></div></div>`;
    shell(locationStage("dojo", content));

    // El Dojo es una interfaz interactiva: guardar un cambio no debe reconstruir
    // toda la vista. Actualizamos solo los nodos afectados para conservar foco,
    // scroll, diálogos y la sensación de respuesta inmediata.
    const syncDojo = () => {
      const nextStats = derivedStats(save);
      const points = save.progression.attributePoints;
      const attributeLabels = { power: "Poder", agility: "Agilidad", focus: "Enfoque" };

      const pointsLabel = root.querySelector(".profile-card h3 span");
      if (pointsLabel) pointsLabel.textContent = `${points} puntos`;

      root.querySelectorAll("[data-attribute]").forEach((button) => {
        const key = button.dataset.attribute;
        button.disabled = points <= 0;
        if (button.firstChild) button.firstChild.nodeValue = `${attributeLabels[key]} ${save.progression.attributes[key]}`;
      });

      const statValues = [nextStats.maxHp, nextStats.maxChakra, nextStats.speed, nextStats.evasion];
      root.querySelectorAll(".stat-grid > span").forEach((item, index) => {
        if (item.firstChild) item.firstChild.nodeValue = String(statValues[index]);
      });

      const preview = root.querySelector(".character-preview");
      if (preview) preview.innerHTML = fighterPreviewSvg(playerFighterAppearance(save));

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

    root.querySelectorAll("[data-attribute]").forEach((button) => button.addEventListener("click", () => {
      if (!save.progression.attributePoints) return;
      persistDojo(spendAttribute(save, button.dataset.attribute));
    }));

    const equipmentModal = root.querySelector(".equipment-modal");
    const equipmentModalTitle = root.querySelector("#equipment-modal-title");
    const equipmentModalOptions = root.querySelector(".equipment-modal-options");
    const openEquipmentModal = (type) => {
      const title = gearTitles[type];
      const items = type === "companion"
        ? (save.campaign.companion === "mika" ? [{ id: "mika", name: "Mika", description: "Compañera de campaña" }] : [])
        : EQUIPMENT[type];
      const options = [{ id: "", name: "Nada", description: "Dejar esta ranura vacía" }, ...items];
      equipmentModalTitle.textContent = `Equipar ${title.toLowerCase()}`;
      equipmentModalOptions.innerHTML = options.map((item) => `<button type="button" class="equipment-option ${save.equipment[type] === (item.id || null) ? "selected" : ""}" data-equipment-type="${type}" data-equipment-id="${item.id}"><span class="gear-icon" aria-hidden="true">${item.id ? gearIcons[type] : "∅"}</span><span><strong>${item.name}</strong><small>${item.description}</small></span>${save.equipment[type] === (item.id || null) ? "<em>Equipado</em>" : ""}</button>`).join("");
      equipmentModal.hidden = false;
      equipmentModal.querySelector(".equipment-option")?.focus();
    };
    root.querySelectorAll("[data-gear-slot]").forEach((button) => button.addEventListener("click", () => openEquipmentModal(button.dataset.gearSlot)));
    root.querySelector("[data-close-equipment]")?.addEventListener("click", () => { equipmentModal.hidden = true; });
    equipmentModal?.addEventListener("click", (event) => {
      const option = event.target.closest("[data-equipment-type]");
      if (option) {
        save.equipment[option.dataset.equipmentType] = option.dataset.equipmentId || null;
        persist(save);
      } else if (event.target === equipmentModal) {
        equipmentModal.hidden = true;
      }
    });

    root.querySelectorAll("[data-cosmetic]").forEach((select) => select.addEventListener("change", () => {
      save.character[select.dataset.cosmetic] = select.dataset.cosmetic === "bodyType" ? select.value : Number(select.value);
      persistDojo(save);
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
    const completed = new Set(save.campaign.completedMissions);
    const records = MISSIONS.map((mission) => `<li class="${completed.has(mission.id) ? "done" : ""}"><span>${completed.has(mission.id) ? "✓" : "·"}</span><div><strong>${mission.title}</strong><small>${completed.has(mission.id) ? "Completada" : "Sin completar"}</small></div></li>`).join("");
    const ending = completed.has("m10") ? `<div class="ending-card"><p class="eyebrow">CRÓNICA COMPLETADA</p><h2>El amanecer regresa</h2><p>El Eclipse fue roto. Tu nombre queda registrado entre los guardianes de la aldea.</p></div>` : "";
    const content = `<section class="stage-panel archive-card" data-comment="Los registros verdes ya están completos. La décima crónica revelará el desenlace de la campaña."><p class="eyebrow">ARCHIVO</p><h2>Crónica de ${escapeHtml(save.character.name)}</h2><p class="lead">Rango ${save.campaign.rank} · ${completed.size} misiones · Compañero: ${save.campaign.companion ? "Mika" : "ninguno"}</p><ol>${records}</ol>${ending}</section>`;
    shell(locationStage("archive", content));
    bindLocationStage("archive");
  };

  const render = () => {
    if (!save.character) return renderCreator();
    if (view === "headquarters") return renderStoryMissions();
    if (view === "missions") return renderSecondaryMissions();
    if (view === "dojo") return renderDojo();
    if (view === "archive") return renderArchive();
    if (VILLAGE_SERVICES[view]) return renderVillageService(view);
    return renderPlaza();
  };
  render();
  return { refresh(nextSave) { save = nextSave; view = "plaza"; render(); } };
}
