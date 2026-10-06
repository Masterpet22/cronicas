import { fighterPreviewSvg, playerFighterAppearance } from "./character.js?v=0.8.0";
import { EQUIPMENT, JUTSU_LIBRARY, MISSIONS } from "./data.js?v=0.8.0";
import { LOCATION_CAST, NPCS, locationDialogue, npcByName } from "./npcs.js?v=0.8.0";
import { createCharacter, derivedStats, spendAttribute, writeSave, xpForNextLevel } from "./save.js?v=0.8.0";

const ELEMENT_NAMES = { fire: "Fuego", wind: "Viento", lightning: "Rayo" };
const TUTORIAL = [
  ["Maestra Aya", "Bienvenido a la Aldea del Horizonte. Cada edificio de la plaza conduce a una sección distinta."],
  ["Maestra Aya", "En el dojo preparas cuatro jutsus y distribuyes los puntos obtenidos al subir de nivel."],
  ["Mika", "Pasa el cursor sobre un edificio para identificarlo. El tablón está frente a la plaza; desde allí comienzan las misiones."]
];

export const VILLAGE_LOCATIONS = [
  { id: "headquarters", name: "Cuartel General", description: "Mando, rango y estado de la aldea", labelX: 840, labelY: 390, path: "M812 24 L843 30 L844 61 L907 58 L948 83 L948 126 L1008 159 L970 178 L1011 203 L969 220 L982 238 L946 249 L1002 274 L963 291 L1047 327 L1004 348 L1048 365 L1021 380 L1027 444 L966 444 L954 429 L727 429 L718 445 L668 445 L671 373 L642 362 L679 347 L650 329 L738 287 L702 277 L750 251 L714 242 L783 213 L738 203 L766 185 L729 172 L806 137 L815 112 Z" },
  { id: "dojo", name: "Dojo", description: "Entrenamiento, jutsus y equipo", labelX: 505, labelY: 446, path: "M359 383 L389 373 L409 356 L427 348 L453 348 L468 333 L574 335 L596 348 L618 352 L629 369 L657 386 L636 399 L638 493 L662 505 L659 534 L620 534 L613 550 L403 550 L395 536 L354 535 L351 507 L375 493 L376 399 L347 388 Z" },
  { id: "archive", name: "Biblioteca", description: "Crónicas y progreso de campaña", labelX: 167, labelY: 427, path: "M33 282 L47 268 L74 264 L82 256 L101 265 L110 251 L133 267 L223 267 L238 258 L252 267 L259 282 L313 329 L300 344 L303 466 L326 482 L324 514 L279 515 L273 530 L49 530 L42 517 L0 519 L0 340 L31 321 Z" },
  { id: "shop", name: "Tienda de Objetos", description: "Suministros y equipamiento", labelX: 1227, labelY: 455, path: "M1103 366 L1125 353 L1157 351 L1168 339 L1298 341 L1314 351 L1341 355 L1352 369 L1375 386 L1358 399 L1365 489 L1385 503 L1382 535 L1353 536 L1347 554 L1112 554 L1106 540 L1075 539 L1076 510 L1090 493 L1092 399 L1069 385 Z" },
  { id: "tower", name: "Torre de Desafíos", description: "Pruebas especiales por pisos", labelX: 1468, labelY: 343, path: "M1464 19 L1477 19 L1478 59 L1506 78 L1492 90 L1522 108 L1502 122 L1532 141 L1508 155 L1547 180 L1518 195 L1550 217 L1519 232 L1564 264 L1529 280 L1571 314 L1528 331 L1534 378 L1576 407 L1560 427 L1380 427 L1369 409 L1403 379 L1414 332 L1384 316 L1423 280 L1396 265 L1435 233 L1406 218 L1440 196 L1418 182 L1445 155 L1421 141 L1448 122 L1431 108 L1455 89 L1443 78 L1462 60 Z" },
  { id: "arena", name: "Arena de Combate", description: "Combates de práctica y duelos", labelX: 1420, labelY: 760, path: "M1188 616 C1220 597 1243 587 1270 589 L1292 608 L1321 566 L1351 596 C1402 584 1452 584 1484 593 L1518 562 L1543 599 C1582 604 1604 610 1620 622 L1646 588 L1678 602 L1678 856 L1647 867 L1625 888 L1205 888 L1179 866 L1161 824 L1160 704 Z" },
  { id: "inn", name: "Posada", description: "Descanso y encuentros", labelX: 263, labelY: 748, path: "M65 671 L94 653 L139 635 L174 629 L191 612 L263 612 L283 628 L348 637 L370 654 L439 676 L458 697 L494 711 L477 736 L467 844 L409 848 L397 864 L130 864 L117 852 L57 850 L57 731 L41 711 Z" },
  { id: "missions", name: "Tablón de Misiones", description: "Historia, contratos y recompensas", labelX: 744, labelY: 798, path: "M651 735 L671 723 L811 723 L837 736 L833 754 L846 770 L845 858 L821 858 L814 870 L669 870 L662 858 L637 858 L638 769 L650 753 Z" },
  { id: "event", name: "Plaza de Eventos", description: "Actividades temporales", labelX: 875, labelY: 602, path: "M819 501 L912 501 L912 607 L883 607 L882 628 C937 633 973 648 973 664 C973 683 923 697 861 697 C800 697 750 683 750 664 C750 647 791 633 846 628 L846 607 L819 607 Z" }
];

const VILLAGE_SERVICES = {
  headquarters: { eyebrow: "CENTRO DE MANDO", title: "Cuartel General", text: "Aquí se coordinan las defensas, los ascensos y la historia principal de la Aldea del Horizonte.", items: ["Resumen de rango y campaña", "Acceso rápido a misiones", "Informes de la aldea"] },
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

  const persist = (next, shouldRender = true) => {
    save = writeSave(next);
    if (shouldRender) render();
  };

  const renderCreator = () => {
    root.innerHTML = `
      <section class="dojo-card creator-card">
        <p class="eyebrow">PRIMER PASO</p><h2>Crea tu combatiente</h2>
        <p class="lead">Tu afinidad define el estilo inicial, pero podrás aprender técnicas de los tres elementos.</p>
        <form id="character-form" class="creator-form">
          <label>Nombre<input name="name" maxlength="18" value="Akio" required></label>
          <label>Afinidad<select name="affinity"><option value="fire">Fuego · daño persistente</option><option value="wind">Viento · velocidad y precisión</option><option value="lightning">Rayo · control y potencia</option></select></label>
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
          <div class="profile-heading"><span class="avatar-swatch" style="--avatar:${character.appearance}"></span><div><p class="eyebrow">${campaign.rank.toUpperCase()}</p><h2>${escapeHtml(character.name)}</h2></div></div>
          <div class="campaign-summary"><strong>Nivel ${progression.level}</strong><span>${progression.xp}/${xpForNextLevel(progression.level)} PX</span><span>${progression.coins} monedas</span><span>${campaign.completedMissions.length}/10 misiones</span></div>
        </section>
        ${navigation}
        ${content}
      </div>`;
    root.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => { view = button.dataset.view; render(); }));
    root.querySelectorAll("[data-go]").forEach((button) => {
      const openLocation = () => { view = button.dataset.go; render(); };
      button.addEventListener("click", openLocation);
      if (button.classList.contains("village-hotspot")) {
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
    root.querySelectorAll("[data-npc-dialogue]").forEach((button) => button.addEventListener("click", () => {
      const npc = NPCS[button.dataset.npcId];
      const lines = (npc?.[button.dataset.npcDialogue] || []).map((text) => [npc.name, text]);
      if (lines.length) showDialogue(lines, () => {});
    }));
  };

  const showDialogue = (lines, onComplete, finalLabel = "CONTINUAR") => {
    let index = 0;
    const overlay = document.createElement("div");
    overlay.className = "dialogue-overlay";
    const draw = () => {
      const [speaker, dialogue] = lines[index];
      const last = index === lines.length - 1;
      const npc = npcByName(speaker);
      const portrait = npc ? `<div class="dialogue-portrait"><img src="${npc.image}?v=0.8.0" alt="${escapeHtml(npc.name)}"><span>${escapeHtml(npc.title)}</span></div>` : "";
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

  const npcCast = (locationId) => {
    const cast = LOCATION_CAST[locationId] || [];
    if (!cast.length) return "";
    return `<section class="npc-guide-strip" aria-label="Personajes de ${escapeHtml(VILLAGE_LOCATIONS.find((location) => location.id === locationId)?.name || locationId)}"><div class="npc-guide-heading"><p class="eyebrow">PERSONAJES DEL LUGAR</p><strong>${cast.length > 1 ? "Elige con quién hablar" : "Guía disponible"}</strong></div><div class="npc-card-grid ${cast.length > 1 ? "multiple" : ""}">${cast.map((id) => {
      const npc = NPCS[id];
      return `<article class="npc-card"><div class="npc-portrait"><img src="${npc.image}?v=0.8.0" alt="${escapeHtml(npc.name)}"></div><div class="npc-card-copy"><p class="eyebrow">${escapeHtml(npc.title)}</p><h3>${escapeHtml(npc.name)}</h3><div class="npc-actions"><button data-npc-id="${id}" data-npc-dialogue="intro">HABLAR</button><button data-npc-id="${id}" data-npc-dialogue="guide">GUÍA</button></div></div></article>`;
    }).join("")}</div></section>`;
  };

  const introduceLocation = (locationId) => {
    if (introducedViews.has(locationId)) return;
    introducedViews.add(locationId);
    const lines = locationDialogue(locationId, "intro");
    if (lines.length) queueMicrotask(() => { if (view === locationId) showDialogue(lines, () => {}); });
  };

  const renderPlaza = () => {
    const companion = save.campaign.companion
      ? `<div class="notice-card ally"><strong>Mika está disponible</strong><span>Atacará automáticamente cada dos rondas.</span></div>`
      : `<div class="notice-card"><strong>Compañero bloqueado</strong><span>Completa “Ecos entre los juncos”.</span></div>`;
    const hotspots = VILLAGE_LOCATIONS.map((location) => `<g class="village-hotspot hotspot-${location.id}" data-go="${location.id}" role="button" tabindex="0" aria-label="${escapeHtml(location.name)}: ${escapeHtml(location.description)}"><path class="hotspot-shape" d="${location.path}"/></g>`).join("");
    const labels = VILLAGE_LOCATIONS.map((location) => `<span class="map-label" data-map-label="${location.id}" aria-hidden="true" style="--label-x:${(location.labelX / 1678 * 100).toFixed(3)}%;--label-y:${(location.labelY / 937 * 100).toFixed(3)}%"><span class="map-label-box"><strong>${escapeHtml(location.name)}</strong><small>${escapeHtml(location.description)}</small></span></span>`).join("");
    shell(`<section class="village-map-card"><div class="map-heading"><div><p class="eyebrow">ALDEA DEL HORIZONTE</p><h2>Elige un destino</h2></div><p>Pasa el cursor o usa <kbd>Tab</kbd> para descubrir cada edificio.</p></div><figure class="village-map"><img src="assets/village/aldea.png?v=0.8.0" alt="Vista nocturna de la Aldea del Horizonte con sus nueve destinos" draggable="false"><svg class="village-hotspots" viewBox="0 0 1678 937" preserveAspectRatio="none" aria-label="Destinos de la aldea">${hotspots}</svg>${labels}</figure>${companion}</section>`);
    if (!save.campaign.tutorialSeen) showDialogue(TUTORIAL, () => { save.campaign.tutorialSeen = true; persist(save); });
  };

  const renderVillageService = (serviceId) => {
    const service = VILLAGE_SERVICES[serviceId];
    const actions = serviceId === "headquarters" ? `<div class="service-actions"><button class="primary-button" data-go="missions">VER MISIONES</button><button class="secondary-button" data-go="dojo">PREPARAR EQUIPO</button></div>` : `<p class="development-note">Sección preparada para una fase posterior. El acceso desde el mapa ya está operativo.</p>`;
    shell(`<section class="dojo-card village-service"><div class="service-content"><p class="eyebrow">${service.eyebrow}</p><h2>${service.title}</h2><p class="lead">${service.text}</p><div class="service-grid">${service.items.map((item, index) => `<article><span>0${index + 1}</span><strong>${item}</strong></article>`).join("")}</div>${actions}</div>${npcCast(serviceId)}</section>`);
    introduceLocation(serviceId);
  };

  const renderMissions = () => {
    const completed = new Set(save.campaign.completedMissions);
    const cards = MISSIONS.map((mission, index) => {
      const unlocked = index === 0 || completed.has(MISSIONS[index - 1].id);
      const done = completed.has(mission.id);
      const label = done ? "REPETIR" : unlocked ? (mission.exam ? "PRESENTAR EXAMEN" : "ACEPTAR MISIÓN") : "BLOQUEADA";
      return `<article class="mission-card ${done ? "completed" : ""} ${unlocked ? "" : "locked"}"><div class="mission-number">${String(mission.number).padStart(2, "0")}</div><div><p class="eyebrow">${mission.exam ? "EXAMEN DE RANGO" : mission.location}</p><h3>${mission.title}</h3><p>${mission.encounters.length} encuentro${mission.encounters.length === 1 ? "" : "s"} · ${mission.duration} · ${mission.reward.xp} PX · ${mission.reward.coins} monedas</p></div><button data-mission="${mission.id}" ${unlocked ? "" : "disabled"}>${label}</button></article>`;
    }).join("");
    shell(`${npcCast("missions")}<section class="dojo-card mission-board"><div class="section-heading"><div><p class="eyebrow">TABLÓN</p><h2>Misiones de la aldea</h2></div><strong>${completed.size}/10 completadas</strong></div><div class="mission-list">${cards}</div></section>`);
    root.querySelectorAll("[data-mission]").forEach((button) => button.addEventListener("click", () => {
      const mission = MISSIONS.find((entry) => entry.id === button.dataset.mission);
      if (save.loadout.length !== 4) {
        showDialogue([["Maestra Aya", "Debes preparar exactamente cuatro técnicas antes de aceptar una misión."]], () => { view = "dojo"; render(); }, "IR AL DOJO");
        return;
      }
      showDialogue(mission.briefing, () => onStartMission(save, mission), "COMENZAR MISIÓN");
    }));
    introduceLocation("missions");
  };

  const equipmentOptions = (type) => EQUIPMENT[type].map((item) => `<option value="${item.id}" ${save.equipment[type] === item.id ? "selected" : ""}>${item.name} · ${item.description}</option>`).join("");
  const numberedOptions = (count, current, prefix) => Array.from({ length: count }, (_, index) => `<option value="${index + 1}" ${Number(current) === index + 1 ? "selected" : ""}>${prefix} ${index + 1}</option>`).join("");
  const characterPreview = () => `<div class="character-preview">${fighterPreviewSvg(playerFighterAppearance(save))}</div>`;

  const renderDojo = () => {
    const stats = derivedStats(save);
    const { progression, character } = save;
    const techniques = JUTSU_LIBRARY.map((jutsu) => {
      const unlocked = jutsu.unlockLevel <= progression.level;
      const selected = save.loadout.includes(jutsu.id);
      return `<label class="jutsu-card ${unlocked ? "" : "locked"} ${selected ? "selected" : ""}"><input type="checkbox" data-jutsu="${jutsu.id}" ${selected ? "checked" : ""} ${unlocked ? "" : "disabled"}><span class="element-dot ${jutsu.element}"></span><strong>${jutsu.name}</strong><small>${ELEMENT_NAMES[jutsu.element]} · ${jutsu.cost} CH · ${jutsu.damage} daño${unlocked ? "" : ` · Nivel ${jutsu.unlockLevel}`}</small></label>`;
    }).join("");
    shell(`${npcCast("dojo")}<div class="dojo-layout"><section class="dojo-card profile-card"><p class="eyebrow">ENTRENAMIENTO</p><h2>Afinidad de ${ELEMENT_NAMES[character.affinity]}</h2><div class="progress-track"><span style="width:${Math.min(100, progression.xp / xpForNextLevel(progression.level) * 100)}%"></span></div><p class="compact">Nivel ${progression.level} · ${progression.xp}/${xpForNextLevel(progression.level)} PX</p><h3>Atributos <span>${progression.attributePoints} puntos</span></h3><div class="attribute-list"><button data-attribute="power" ${progression.attributePoints ? "" : "disabled"}>Poder ${progression.attributes.power}<small>+1 daño</small></button><button data-attribute="agility" ${progression.attributePoints ? "" : "disabled"}>Agilidad ${progression.attributes.agility}<small>velocidad y evasión</small></button><button data-attribute="focus" ${progression.attributePoints ? "" : "disabled"}>Enfoque ${progression.attributes.focus}<small>chakra y precisión</small></button></div><div class="stat-grid"><span>${stats.maxHp}<small>PV</small></span><span>${stats.maxChakra}<small>CH</small></span><span>${stats.speed}<small>VEL</small></span><span>${stats.evasion}<small>EVA</small></span></div></section><section class="dojo-card loadout-card"><div class="section-heading"><div><p class="eyebrow">PREPARACIÓN</p><h2>Equipo de combate</h2></div><strong>${save.loadout.length}/4 técnicas</strong></div><h3>Apariencia modular</h3><div class="customizer">${characterPreview(character)}<div class="cosmetic-grid"><label>Cuerpo<select data-cosmetic="bodyType"><option value="male" ${character.bodyType === "male" ? "selected" : ""}>Masculino</option><option value="female" ${character.bodyType === "female" ? "selected" : ""}>Femenino</option></select></label><label>Rostro<select data-cosmetic="face">${numberedOptions(3, character.face, "Rostro")}</select></label><label>Cabello<select data-cosmetic="hair">${numberedOptions(5, character.hair, "Peinado")}</select></label><label>Parte superior<select data-cosmetic="top">${numberedOptions(3, character.top, "Prenda")}</select></label><label>Parte inferior<select data-cosmetic="bottom">${numberedOptions(3, character.bottom, "Pantalón")}</select></label><label>Calzado<select data-cosmetic="shoes">${numberedOptions(2, character.shoes, "Calzado")}</select></label></div></div><div class="equipment-grid"><label>Arma<select data-equipment="weapon">${equipmentOptions("weapon")}</select></label><label>Protector<select data-equipment="armor">${equipmentOptions("armor")}</select></label><label>Accesorio<select data-equipment="accessory">${equipmentOptions("accessory")}</select></label></div><div class="jutsu-grid">${techniques}</div><p id="dojo-message" class="dojo-message">Los cambios se guardan automáticamente.</p></section></div>`);
    root.querySelectorAll("[data-attribute]").forEach((button) => button.addEventListener("click", () => persist(spendAttribute(save, button.dataset.attribute))));
    root.querySelectorAll("[data-equipment]").forEach((select) => select.addEventListener("change", () => { save.equipment[select.dataset.equipment] = select.value; persist(save); }));
    root.querySelectorAll("[data-cosmetic]").forEach((select) => select.addEventListener("change", () => { save.character[select.dataset.cosmetic] = select.dataset.cosmetic === "bodyType" ? select.value : Number(select.value); persist(save); }));
    root.querySelectorAll("[data-jutsu]").forEach((input) => input.addEventListener("change", () => {
      const id = input.dataset.jutsu;
      if (input.checked && save.loadout.length >= 4) { input.checked = false; root.querySelector("#dojo-message").textContent = "Solo puedes preparar cuatro técnicas."; return; }
      save.loadout = input.checked ? [...save.loadout, id] : save.loadout.filter((entry) => entry !== id);
      persist(save);
    }));
    introduceLocation("dojo");
  };

  const renderArchive = () => {
    const completed = new Set(save.campaign.completedMissions);
    const records = MISSIONS.map((mission) => `<li class="${completed.has(mission.id) ? "done" : ""}"><span>${completed.has(mission.id) ? "✓" : "·"}</span><div><strong>${mission.title}</strong><small>${completed.has(mission.id) ? "Completada" : "Sin completar"}</small></div></li>`).join("");
    const ending = completed.has("m10") ? `<div class="ending-card"><p class="eyebrow">CRÓNICA COMPLETADA</p><h2>El amanecer regresa</h2><p>El Eclipse fue roto. Tu nombre queda registrado entre los guardianes de la aldea.</p></div>` : "";
    shell(`${npcCast("archive")}<section class="dojo-card archive-card"><p class="eyebrow">ARCHIVO</p><h2>Crónica de ${escapeHtml(save.character.name)}</h2><p class="lead">Rango ${save.campaign.rank} · ${completed.size} misiones · Compañero: ${save.campaign.companion ? "Mika" : "ninguno"}</p><ol>${records}</ol>${ending}</section>`);
    introduceLocation("archive");
  };

  const render = () => {
    if (!save.character) return renderCreator();
    if (view === "missions") return renderMissions();
    if (view === "dojo") return renderDojo();
    if (view === "archive") return renderArchive();
    if (VILLAGE_SERVICES[view]) return renderVillageService(view);
    return renderPlaza();
  };
  render();
  return { refresh(nextSave) { save = nextSave; view = "plaza"; render(); } };
}
