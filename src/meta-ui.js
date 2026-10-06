import { EQUIPMENT, JUTSU_LIBRARY } from "./data.js";
import { createCharacter, derivedStats, spendAttribute, writeSave, xpForNextLevel } from "./save.js";

const ELEMENT_NAMES = { fire: "Fuego", wind: "Viento", lightning: "Rayo" };

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

export function mountMetaUI(root, initialSave, onStartBattle) {
  let save = initialSave;

  const persist = (next) => {
    save = writeSave(next);
    render();
  };

  const renderCreator = () => {
    root.innerHTML = `
      <section class="dojo-card creator-card">
        <p class="eyebrow">PRIMER PASO</p>
        <h2>Crea tu combatiente</h2>
        <p class="lead">Tu afinidad define el estilo inicial, pero podrás aprender técnicas de los tres elementos.</p>
        <form id="character-form" class="creator-form">
          <label>Nombre<input name="name" maxlength="18" value="Akio" required></label>
          <label>Afinidad<select name="affinity">
            <option value="fire">Fuego · daño persistente</option>
            <option value="wind">Viento · velocidad y precisión</option>
            <option value="lightning">Rayo · control y potencia</option>
          </select></label>
          <label>Color del atuendo<input name="appearance" type="color" value="#e8edf5"></label>
          <button class="primary-button" type="submit">CREAR PERSONAJE</button>
        </form>
      </section>`;
    root.querySelector("#character-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      persist(createCharacter(save, Object.fromEntries(form)));
    });
  };

  const options = (type) => EQUIPMENT[type].map((item) =>
    `<option value="${item.id}" ${save.equipment[type] === item.id ? "selected" : ""}>${item.name} · ${item.description}</option>`
  ).join("");

  const renderDojo = () => {
    const stats = derivedStats(save);
    const { progression, character } = save;
    const techniques = JUTSU_LIBRARY.map((jutsu) => {
      const unlocked = jutsu.unlockLevel <= progression.level;
      const selected = save.loadout.includes(jutsu.id);
      return `<label class="jutsu-card ${unlocked ? "" : "locked"} ${selected ? "selected" : ""}">
        <input type="checkbox" data-jutsu="${jutsu.id}" ${selected ? "checked" : ""} ${unlocked ? "" : "disabled"}>
        <span class="element-dot ${jutsu.element}"></span>
        <strong>${jutsu.name}</strong>
        <small>${ELEMENT_NAMES[jutsu.element]} · ${jutsu.cost} CH · ${jutsu.damage} daño${unlocked ? "" : ` · Nivel ${jutsu.unlockLevel}`}</small>
      </label>`;
    }).join("");

    root.innerHTML = `
      <div class="dojo-layout">
        <section class="dojo-card profile-card">
          <div class="profile-heading"><span class="avatar-swatch" style="--avatar:${character.appearance}"></span><div><p class="eyebrow">DOJO</p><h2>${escapeHtml(character.name)}</h2></div></div>
          <p class="affinity-label">Afinidad de ${ELEMENT_NAMES[character.affinity]}</p>
          <div class="progress-track"><span style="width:${Math.min(100, progression.xp / xpForNextLevel(progression.level) * 100)}%"></span></div>
          <p class="compact">Nivel ${progression.level} · ${progression.xp}/${xpForNextLevel(progression.level)} PX · ${progression.coins} monedas</p>
          <h3>Atributos <span>${progression.attributePoints} puntos</span></h3>
          <div class="attribute-list">
            <button data-attribute="power" ${progression.attributePoints ? "" : "disabled"}>Poder ${progression.attributes.power}<small>+1 daño</small></button>
            <button data-attribute="agility" ${progression.attributePoints ? "" : "disabled"}>Agilidad ${progression.attributes.agility}<small>velocidad y evasión</small></button>
            <button data-attribute="focus" ${progression.attributePoints ? "" : "disabled"}>Enfoque ${progression.attributes.focus}<small>chakra y precisión</small></button>
          </div>
          <div class="stat-grid"><span>${stats.maxHp}<small>PV</small></span><span>${stats.maxChakra}<small>CH</small></span><span>${stats.speed}<small>VEL</small></span><span>${stats.evasion}<small>EVA</small></span></div>
        </section>
        <section class="dojo-card loadout-card">
          <div class="section-heading"><div><p class="eyebrow">PREPARACIÓN</p><h2>Equipo de combate</h2></div><strong id="loadout-count">${save.loadout.length}/4 técnicas</strong></div>
          <div class="equipment-grid">
            <label>Arma<select data-equipment="weapon">${options("weapon")}</select></label>
            <label>Protector<select data-equipment="armor">${options("armor")}</select></label>
            <label>Accesorio<select data-equipment="accessory">${options("accessory")}</select></label>
          </div>
          <div class="jutsu-grid">${techniques}</div>
          <p id="dojo-message" class="dojo-message">Prepara exactamente cuatro técnicas antes de combatir.</p>
          <button id="start-battle" class="primary-button" ${save.loadout.length === 4 ? "" : "disabled"}>INICIAR RUTA DE COMBATE</button>
        </section>
      </div>`;

    root.querySelectorAll("[data-attribute]").forEach((button) => button.addEventListener("click", () => persist(spendAttribute(save, button.dataset.attribute))));
    root.querySelectorAll("[data-equipment]").forEach((select) => select.addEventListener("change", () => {
      save.equipment[select.dataset.equipment] = select.value;
      persist(save);
    }));
    root.querySelectorAll("[data-jutsu]").forEach((input) => input.addEventListener("change", () => {
      const id = input.dataset.jutsu;
      if (input.checked && save.loadout.length >= 4) {
        input.checked = false;
        root.querySelector("#dojo-message").textContent = "Solo puedes preparar cuatro técnicas.";
        return;
      }
      save.loadout = input.checked ? [...save.loadout, id] : save.loadout.filter((entry) => entry !== id);
      persist(save);
    }));
    root.querySelector("#start-battle").addEventListener("click", () => onStartBattle(save));
  };

  const render = () => save.character ? renderDojo() : renderCreator();
  render();

  return { refresh(nextSave) { save = nextSave; render(); } };
}
