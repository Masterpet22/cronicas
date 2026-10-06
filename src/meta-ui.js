import { EQUIPMENT, JUTSU_LIBRARY, MISSIONS } from "./data.js?v=0.5.1";
import { createCharacter, derivedStats, spendAttribute, writeSave, xpForNextLevel } from "./save.js?v=0.5.1";

const ELEMENT_NAMES = { fire: "Fuego", wind: "Viento", lightning: "Rayo" };
const TUTORIAL = [
  ["Maestra Aya", "Bienvenido a la Aldea del Horizonte. Desde la plaza puedes visitar el dojo, el tablón de misiones y el archivo."],
  ["Maestra Aya", "En el dojo preparas cuatro jutsus y distribuyes los puntos obtenidos al subir de nivel."],
  ["Mika", "En combate, la velocidad decide quién actúa primero. Guardia reduce el próximo impacto y recupera chakra. Nos vemos en el tablón."]
];

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
    root.innerHTML = `
      <div class="village-shell">
        <section class="village-topbar dojo-card">
          <div class="profile-heading"><span class="avatar-swatch" style="--avatar:${character.appearance}"></span><div><p class="eyebrow">${campaign.rank.toUpperCase()}</p><h2>${escapeHtml(character.name)}</h2></div></div>
          <div class="campaign-summary"><strong>Nivel ${progression.level}</strong><span>${progression.xp}/${xpForNextLevel(progression.level)} PX</span><span>${progression.coins} monedas</span><span>${campaign.completedMissions.length}/10 misiones</span></div>
        </section>
        <nav class="village-nav" aria-label="Lugares de la aldea">
          <button data-view="plaza" class="${view === "plaza" ? "active" : ""}">Plaza</button>
          <button data-view="missions" class="${view === "missions" ? "active" : ""}">Misiones</button>
          <button data-view="dojo" class="${view === "dojo" ? "active" : ""}">Dojo</button>
          <button data-view="archive" class="${view === "archive" ? "active" : ""}">Archivo</button>
        </nav>
        ${content}
      </div>`;
    root.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => { view = button.dataset.view; render(); }));
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
    shell(`<section class="village-scene dojo-card"><div><p class="eyebrow">ALDEA DEL HORIZONTE</p><h2>¿A dónde quieres ir?</h2><p class="lead">La campaña avanza desde el tablón. Puedes volver al dojo entre misiones para ajustar tu estrategia.</p></div><div class="location-grid"><button data-go="missions"><span>⚔</span><strong>Tablón de misiones</strong><small>Historia y recompensas</small></button><button data-go="dojo"><span>◈</span><strong>Dojo</strong><small>Jutsus, atributos y equipo</small></button><button data-go="archive"><span>▤</span><strong>Archivo</strong><small>Progreso de la campaña</small></button></div>${companion}</section>`);
    root.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => { view = button.dataset.go; render(); }));
    if (!save.campaign.tutorialSeen) showDialogue(TUTORIAL, () => { save.campaign.tutorialSeen = true; persist(save); });
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
  const characterPreview = (character) => {
    const weapon = ({ kunai: "kunai", tanto: "sword", staff: "staff" })[save.equipment.weapon] || "kunai";
    const layers = [
      `hair/hair_0${character.hair}_rear.png`, `body/body_${character.bodyType}.png`,
      `bottom/bottom_0${character.bottom}.png`, `shoes/shoes_0${character.shoes}.png`,
      `top/top_0${character.top}.png`, `face/face_0${character.face}.png`,
      `hair/hair_0${character.hair}_front.png`, `weapon/weapon_${weapon}.png`
    ];
    return `<div class="character-preview" aria-label="Vista previa del personaje">${layers.map((path) => `<img src="assets/modular/${path}?v=0.5.1" alt="">`).join("")}</div>`;
  };

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
    return renderPlaza();
  };
  render();
  return { refresh(nextSave) { save = nextSave; view = "plaza"; render(); } };
}
