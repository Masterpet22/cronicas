import { fighterPreviewSvg, playerFighterAppearance } from "./character.js?v=0.7.0";
import { EQUIPMENT, JUTSU_LIBRARY, MISSIONS } from "./data.js?v=0.7.0";
import { createCharacter, derivedStats, spendAttribute, writeSave, xpForNextLevel } from "./save.js?v=0.7.0";

const ELEMENT_NAMES = { fire: "Fuego", wind: "Viento", lightning: "Rayo" };
const TUTORIAL = [
  ["Maestra Aya", "Bienvenido a la Aldea del Horizonte. Cada edificio de la plaza conduce a una sección distinta."],
  ["Maestra Aya", "En el dojo preparas cuatro jutsus y distribuyes los puntos obtenidos al subir de nivel."],
  ["Mika", "Pasa el cursor sobre un edificio para identificarlo. El tablón está frente a la plaza; desde allí comienzan las misiones."]
];

export const VILLAGE_LOCATIONS = [
  { id: "headquarters", name: "Cuartel General", description: "Mando, rango y estado de la aldea", x: 38.5, y: 5, w: 25, h: 50, shape: "polygon(35% 0, 66% 0, 74% 15%, 86% 25%, 88% 100%, 8% 100%, 12% 29%, 27% 19%)" },
  { id: "dojo", name: "Dojo", description: "Entrenamiento, jutsus y equipo", x: 20, y: 33, w: 22, h: 27, shape: "polygon(18% 5%, 80% 5%, 100% 38%, 91% 100%, 5% 100%, 0 38%)" },
  { id: "archive", name: "Biblioteca", description: "Crónicas y progreso de campaña", x: 0, y: 26, w: 20, h: 32, shape: "polygon(12% 0, 83% 0, 100% 26%, 94% 100%, 0 100%, 0 27%)" },
  { id: "shop", name: "Tienda de Objetos", description: "Suministros y equipamiento", x: 65, y: 34, w: 20, h: 27, shape: "polygon(13% 7%, 83% 5%, 100% 34%, 94% 100%, 3% 100%, 0 36%)" },
  { id: "tower", name: "Torre de Desafíos", description: "Pruebas especiales por pisos", x: 83, y: 3, w: 15, h: 45, shape: "polygon(43% 0, 58% 0, 75% 11%, 76% 83%, 100% 100%, 0 100%, 25% 82%, 26% 12%)" },
  { id: "arena", name: "Arena de Combate", description: "Combates de práctica y duelos", x: 69, y: 59, w: 30, h: 39, shape: "ellipse(50% 50% at 50% 50%)" },
  { id: "inn", name: "Posada", description: "Descanso y encuentros", x: 3, y: 65, w: 29, h: 31, shape: "polygon(6% 25%, 35% 0, 75% 5%, 100% 31%, 93% 100%, 3% 100%)" },
  { id: "missions", name: "Tablón de Misiones", description: "Historia, contratos y recompensas", x: 38, y: 72, w: 16, h: 22, shape: "polygon(9% 8%, 91% 8%, 100% 100%, 0 100%)" },
  { id: "event", name: "Plaza de Eventos", description: "Actividades temporales", x: 46, y: 52, w: 13, h: 21, shape: "ellipse(46% 50% at 50% 50%)" }
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
    root.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => { view = button.dataset.go; render(); }));
  };

  const showDialogue = (lines, onComplete, finalLabel = "CONTINUAR") => {
    let index = 0;
    const overlay = document.createElement("div");
    overlay.className = "dialogue-overlay";
    const draw = () => {
      const [speaker, dialogue] = lines[index];
      const last = index === lines.length - 1;
      overlay.innerHTML = `<section class="dialogue-box"><p class="eyebrow">${escapeHtml(speaker)}</p><p>${escapeHtml(dialogue)}</p><button class="primary-button">${last ? finalLabel : "SIGUIENTE"}</button><small>${index + 1}/${lines.length}</small></section>`;
      overlay.querySelector("button").addEventListener("click", () => {
        if (!last) { index += 1; draw(); return; }
        overlay.remove();
        onComplete();
      });
    };
    draw();
    root.append(overlay);
  };

  const renderPlaza = () => {
    const companion = save.campaign.companion
      ? `<div class="notice-card ally"><strong>Mika está disponible</strong><span>Atacará automáticamente cada dos rondas.</span></div>`
      : `<div class="notice-card"><strong>Compañero bloqueado</strong><span>Completa “Ecos entre los juncos”.</span></div>`;
    const hotspots = VILLAGE_LOCATIONS.map((location, index) => `<button class="village-hotspot hotspot-${location.id}" data-go="${location.id}" aria-label="${escapeHtml(location.name)}: ${escapeHtml(location.description)}" style="--x:${location.x}%;--y:${location.y}%;--w:${location.w}%;--h:${location.h}%;--shape:${location.shape};--order:${index}"><span class="map-label"><strong>${escapeHtml(location.name)}</strong><small>${escapeHtml(location.description)}</small></span></button>`).join("");
    shell(`<section class="village-map-card"><div class="map-heading"><div><p class="eyebrow">ALDEA DEL HORIZONTE</p><h2>Elige un destino</h2></div><p>Pasa el cursor o usa <kbd>Tab</kbd> para descubrir cada edificio.</p></div><figure class="village-map"><img src="assets/village/aldea.png?v=0.7.0" alt="Vista nocturna de la Aldea del Horizonte con sus nueve destinos" draggable="false">${hotspots}</figure>${companion}</section>`);
    if (!save.campaign.tutorialSeen) showDialogue(TUTORIAL, () => { save.campaign.tutorialSeen = true; persist(save); });
  };

  const renderVillageService = (serviceId) => {
    const service = VILLAGE_SERVICES[serviceId];
    const actions = serviceId === "headquarters" ? `<div class="service-actions"><button class="primary-button" data-go="missions">VER MISIONES</button><button class="secondary-button" data-go="dojo">PREPARAR EQUIPO</button></div>` : `<p class="development-note">Sección preparada para una fase posterior. El acceso desde el mapa ya está operativo.</p>`;
    shell(`<section class="dojo-card village-service"><p class="eyebrow">${service.eyebrow}</p><h2>${service.title}</h2><p class="lead">${service.text}</p><div class="service-grid">${service.items.map((item, index) => `<article><span>0${index + 1}</span><strong>${item}</strong></article>`).join("")}</div>${actions}</section>`);
  };

  const renderMissions = () => {
    const completed = new Set(save.campaign.completedMissions);
    const cards = MISSIONS.map((mission, index) => {
      const unlocked = index === 0 || completed.has(MISSIONS[index - 1].id);
      const done = completed.has(mission.id);
      const label = done ? "REPETIR" : unlocked ? (mission.exam ? "PRESENTAR EXAMEN" : "ACEPTAR MISIÓN") : "BLOQUEADA";
      return `<article class="mission-card ${done ? "completed" : ""} ${unlocked ? "" : "locked"}"><div class="mission-number">${String(mission.number).padStart(2, "0")}</div><div><p class="eyebrow">${mission.exam ? "EXAMEN DE RANGO" : mission.location}</p><h3>${mission.title}</h3><p>${mission.encounters.length} encuentro${mission.encounters.length === 1 ? "" : "s"} · ${mission.duration} · ${mission.reward.xp} PX · ${mission.reward.coins} monedas</p></div><button data-mission="${mission.id}" ${unlocked ? "" : "disabled"}>${label}</button></article>`;
    }).join("");
    shell(`<section class="dojo-card mission-board"><div class="section-heading"><div><p class="eyebrow">TABLÓN</p><h2>Misiones de la aldea</h2></div><strong>${completed.size}/10 completadas</strong></div><div class="mission-list">${cards}</div></section>`);
    root.querySelectorAll("[data-mission]").forEach((button) => button.addEventListener("click", () => {
      const mission = MISSIONS.find((entry) => entry.id === button.dataset.mission);
      if (save.loadout.length !== 4) {
        showDialogue([["Maestra Aya", "Debes preparar exactamente cuatro técnicas antes de aceptar una misión."]], () => { view = "dojo"; render(); }, "IR AL DOJO");
        return;
      }
      showDialogue(mission.briefing, () => onStartMission(save, mission), "COMENZAR MISIÓN");
    }));
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
    shell(`<div class="dojo-layout"><section class="dojo-card profile-card"><p class="eyebrow">ENTRENAMIENTO</p><h2>Afinidad de ${ELEMENT_NAMES[character.affinity]}</h2><div class="progress-track"><span style="width:${Math.min(100, progression.xp / xpForNextLevel(progression.level) * 100)}%"></span></div><p class="compact">Nivel ${progression.level} · ${progression.xp}/${xpForNextLevel(progression.level)} PX</p><h3>Atributos <span>${progression.attributePoints} puntos</span></h3><div class="attribute-list"><button data-attribute="power" ${progression.attributePoints ? "" : "disabled"}>Poder ${progression.attributes.power}<small>+1 daño</small></button><button data-attribute="agility" ${progression.attributePoints ? "" : "disabled"}>Agilidad ${progression.attributes.agility}<small>velocidad y evasión</small></button><button data-attribute="focus" ${progression.attributePoints ? "" : "disabled"}>Enfoque ${progression.attributes.focus}<small>chakra y precisión</small></button></div><div class="stat-grid"><span>${stats.maxHp}<small>PV</small></span><span>${stats.maxChakra}<small>CH</small></span><span>${stats.speed}<small>VEL</small></span><span>${stats.evasion}<small>EVA</small></span></div></section><section class="dojo-card loadout-card"><div class="section-heading"><div><p class="eyebrow">PREPARACIÓN</p><h2>Equipo de combate</h2></div><strong>${save.loadout.length}/4 técnicas</strong></div><h3>Apariencia modular</h3><div class="customizer">${characterPreview(character)}<div class="cosmetic-grid"><label>Cuerpo<select data-cosmetic="bodyType"><option value="male" ${character.bodyType === "male" ? "selected" : ""}>Masculino</option><option value="female" ${character.bodyType === "female" ? "selected" : ""}>Femenino</option></select></label><label>Rostro<select data-cosmetic="face">${numberedOptions(3, character.face, "Rostro")}</select></label><label>Cabello<select data-cosmetic="hair">${numberedOptions(5, character.hair, "Peinado")}</select></label><label>Parte superior<select data-cosmetic="top">${numberedOptions(3, character.top, "Prenda")}</select></label><label>Parte inferior<select data-cosmetic="bottom">${numberedOptions(3, character.bottom, "Pantalón")}</select></label><label>Calzado<select data-cosmetic="shoes">${numberedOptions(2, character.shoes, "Calzado")}</select></label></div></div><div class="equipment-grid"><label>Arma<select data-equipment="weapon">${equipmentOptions("weapon")}</select></label><label>Protector<select data-equipment="armor">${equipmentOptions("armor")}</select></label><label>Accesorio<select data-equipment="accessory">${equipmentOptions("accessory")}</select></label></div><div class="jutsu-grid">${techniques}</div><p id="dojo-message" class="dojo-message">Los cambios se guardan automáticamente.</p></section></div>`);
    root.querySelectorAll("[data-attribute]").forEach((button) => button.addEventListener("click", () => persist(spendAttribute(save, button.dataset.attribute))));
    root.querySelectorAll("[data-equipment]").forEach((select) => select.addEventListener("change", () => { save.equipment[select.dataset.equipment] = select.value; persist(save); }));
    root.querySelectorAll("[data-cosmetic]").forEach((select) => select.addEventListener("change", () => { save.character[select.dataset.cosmetic] = select.dataset.cosmetic === "bodyType" ? select.value : Number(select.value); persist(save); }));
    root.querySelectorAll("[data-jutsu]").forEach((input) => input.addEventListener("change", () => {
      const id = input.dataset.jutsu;
      if (input.checked && save.loadout.length >= 4) { input.checked = false; root.querySelector("#dojo-message").textContent = "Solo puedes preparar cuatro técnicas."; return; }
      save.loadout = input.checked ? [...save.loadout, id] : save.loadout.filter((entry) => entry !== id);
      persist(save);
    }));
  };

  const renderArchive = () => {
    const completed = new Set(save.campaign.completedMissions);
    const records = MISSIONS.map((mission) => `<li class="${completed.has(mission.id) ? "done" : ""}"><span>${completed.has(mission.id) ? "✓" : "·"}</span><div><strong>${mission.title}</strong><small>${completed.has(mission.id) ? "Completada" : "Sin completar"}</small></div></li>`).join("");
    const ending = completed.has("m10") ? `<div class="ending-card"><p class="eyebrow">CRÓNICA COMPLETADA</p><h2>El amanecer regresa</h2><p>El Eclipse fue roto. Tu nombre queda registrado entre los guardianes de la aldea.</p></div>` : "";
    shell(`<section class="dojo-card archive-card"><p class="eyebrow">ARCHIVO</p><h2>Crónica de ${escapeHtml(save.character.name)}</h2><p class="lead">Rango ${save.campaign.rank} · ${completed.size} misiones · Compañero: ${save.campaign.companion ? "Mika" : "ninguno"}</p><ol>${records}</ol>${ending}</section>`);
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
