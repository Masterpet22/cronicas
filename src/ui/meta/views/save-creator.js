import { rasterCharacterPreviewMarkup } from "../character-preview.js?v=0.105.0";
import { elementParticlesMarkup } from "../element-particles.js?v=0.105.0";

const CREATOR_HAIR_STYLES = Object.freeze([
  { id: 0, label: "Sin cabello" }, { id: 1, label: "Corto" }, { id: 4, label: "Coleta" }
]);

export function createSaveCreatorView(deps) {
  let currentState = null;
  let currentId = "save-slots";

  const welcomeDialogue = (character) => {
    const master = deps.masterForCharacter(character).name;
    return [
      ["Ren Arashiro", `Enhorabuena, ${character.name}. Desde hoy formas parte de los combatientes de la Aldea del Horizonte.`],
      [master, character.bodyType === "female"
        ? "Has dado el primer paso. En el dojo te enseñaré a dominar tu afinidad y a preparar cada técnica."
        : "Has dado el primer paso. En el dojo te enseñaré a convertir tu afinidad en una estrategia."],
      ["Ren Arashiro", "Tu primer encargo ya está listo. Revisa la saga Futuro prometedor y comienza con la misión de clase D."]
    ];
  };

  function renderSaveSlots() {
    const selectedSlot = deps.activeSaveSlot();
    const cards = deps.listSaveSlots().map(({ slot, save }) => {
      if (!save?.character) return `
        <article class="save-slot empty">
          <span class="save-slot-number">PARTIDA ${slot}</span>
          <div class="save-slot-empty" aria-hidden="true">＋</div>
          <h3>Nueva partida</h3>
          <p>Crea un combatiente y comienza una historia independiente.</p>
          <button class="primary-button" type="button" data-select-slot="${slot}">CREAR PARTIDA</button>
        </article>`;
      const completed = save.campaign.completedMissions.length;
      return `
        <article class="save-slot ${slot === selectedSlot ? "active" : ""}">
          <span class="save-slot-number">PARTIDA ${slot}${slot === selectedSlot ? " · ACTIVA" : ""}</span>
          <span class="save-slot-avatar" style="--slot-color:${save.character.appearance}">${deps.escapeHtml(save.character.name.slice(0, 1))}</span>
          <h3>${deps.escapeHtml(save.character.name)}</h3>
          <p>${deps.escapeHtml(save.campaign.rank)} · Nivel ${save.progression.level} · ${completed} ${completed === 1 ? "misión" : "misiones"}</p>
          <div class="save-slot-actions"><button class="primary-button" type="button" data-select-slot="${slot}">CONTINUAR</button><button class="save-slot-delete" type="button" data-delete-slot="${slot}" aria-label="Borrar partida ${slot}">BORRAR</button></div>
        </article>`;
    }).join("");
    return `<section class="save-selector"><p class="eyebrow">CRÓNICAS DEL SELLO</p><h2>Elige una partida</h2><p class="lead">Puedes mantener hasta tres historias independientes. El cuerpo y el maestro se fijan al crear cada combatiente.</p><div class="save-slot-grid">${cards}</div></section>`;
  }

  function renderCreator() {
    const affinityChoices = deps.basicElementIds.map((id, index) => `<label class="affinity-choice creator-affinity-choice" style="--affinity-color:#${deps.elements[id].color.toString(16).padStart(6, "0")}"><input type="radio" name="affinity" value="${id}" ${index === 0 ? "checked" : ""}><img src="${deps.elementIcon(id)}" alt="" width="512" height="512"><span><strong>${deps.elementName(id)}</strong><small>Afinidad básica</small></span><b class="creator-affinity-check" aria-hidden="true">✓</b></label>`).join("");
    const affinity = deps.basicElementIds[0];
    const color = `#${deps.elements[affinity].color.toString(16).padStart(6, "0")}`;
    const preview = rasterCharacterPreviewMarkup({ character: { bodyType: "male", hair: 1 } }, "0.82.9", { backdrop: elementParticlesMarkup(affinity) });
    const hairChoices = CREATOR_HAIR_STYLES.map(({ id, label }) => `<option value="${id}" ${id === 1 ? "selected" : ""}>${label}</option>`).join("");
    return `
      <section class="dojo-card creator-card creator-customizer" style="--creator-affinity:${color}">
        <header class="creator-heading"><div><p class="eyebrow">PRIMER PASO · PARTIDA ${deps.activeSaveSlot()}</p><h2>Crea tu combatiente</h2><p>Elige quién dará el primer paso en la Aldea del Horizonte.</p></div><span class="creator-heading-mark" aria-hidden="true">始</span></header>
        <form id="character-form" class="creator-form creator-layout">
          <div class="creator-preview-column">
            <div class="character-preview creator-preview" data-creator-preview data-body-type="male">${preview}</div>
            <div class="creator-preview-caption"><div><small>TU COMBATIENTE</small><strong data-creator-name>Akio</strong></div><span class="creator-affinity-badge"><img data-creator-affinity-icon src="${deps.elementIcon(affinity)}" alt="" width="48" height="48"><span data-creator-affinity-name>${deps.elementName(affinity)}</span></span></div>
            <div class="creator-appearance-controls" role="group" aria-label="Apariencia inicial">
              <div class="cosmetic-control creator-cosmetic-control creator-hair-control"><label class="cosmetic-label" for="creator-hair">Peinado</label><div class="cosmetic-stepper"><button type="button" data-creator-hair-step="-1" aria-label="Peinado anterior">‹</button><select id="creator-hair" name="hair" aria-describedby="creator-hair-note">${hairChoices}</select><button type="button" data-creator-hair-step="1" aria-label="Peinado siguiente">›</button></div><small id="creator-hair-note">También puedes cambiarlo en el Dojo.</small></div>
              <div class="cosmetic-control creator-cosmetic-control creator-outfit-control unavailable"><label class="cosmetic-label" for="creator-outfit">Traje <span class="creator-coming-soon">PRÓXIMAMENTE</span></label><div class="cosmetic-stepper"><button type="button" disabled aria-label="Traje anterior">‹</button><select id="creator-outfit" name="outfit" disabled aria-describedby="creator-outfit-note"><option value="">Sin traje</option></select><button type="button" disabled aria-label="Traje siguiente">›</button></div><small id="creator-outfit-note">Todavía no hay trajes disponibles.</small></div>
            </div>
          </div>
          <div class="creator-controls">
            <label class="creator-name-control" for="creator-name"><span>NOMBRE</span><input id="creator-name" name="name" maxlength="18" value="Akio" autocomplete="off" spellcheck="false" required><small>Hasta 18 caracteres.</small></label>
            <div class="cosmetic-control creator-gender-control"><label class="cosmetic-label" for="creator-gender">Género</label><div class="cosmetic-stepper"><button type="button" data-creator-gender-step="-1" aria-label="Género anterior">‹</button><select id="creator-gender" name="bodyType" aria-describedby="creator-gender-note"><option value="male">Masculino</option><option value="female">Femenino</option></select><button type="button" data-creator-gender-step="1" aria-label="Género siguiente">›</button></div><small id="creator-gender-note">Esta elección queda fija para esta partida.</small></div>
            <fieldset class="creator-affinity-control"><legend>AFINIDAD INICIAL</legend><div class="creator-affinity-grid">${affinityChoices}</div><p>Comienzas con una afinidad básica. Los rangos 2 y 3 abrirán nuevos espacios y combinaciones.</p></fieldset>
            <input name="appearance" type="hidden" value="${color}">
            <div class="creator-actions"><button class="primary-button" type="submit">CREAR PERSONAJE</button><button class="secondary-button" type="button" data-back-to-slots>VOLVER A PARTIDAS</button></div>
          </div>
        </form>
      </section>`;
  }

  return {
    id: "save-creator",
    render(state) {
      currentState = state;
      currentId = state.mode === "slots" ? "save-slots" : "character-creator";
      return state.mode === "slots" ? renderSaveSlots() : renderCreator();
    },
    getId() { return currentId; },
    mount(root, scope) {
      if (currentState?.mode === "slots") {
        root.querySelectorAll("[data-select-slot]").forEach((button) => scope.listen(button, "click", () => deps.onSelectSlot(button.dataset.selectSlot)));
        root.querySelectorAll("[data-delete-slot]").forEach((button) => scope.listen(button, "click", () => {
          const slot = Number(button.dataset.deleteSlot);
          const slotState = deps.listSaveSlots().find((entry) => entry.slot === slot)?.save;
          if (!slotState?.character || !deps.confirmDelete(slotState.character.name)) return;
          deps.onDeleteSlot(slot);
        }));
        return;
      }
      const form = root.querySelector("#character-form");
      const name = form.elements.namedItem("name");
      const gender = form.elements.namedItem("bodyType");
      const hair = form.elements.namedItem("hair");
      const preview = root.querySelector("[data-creator-preview]");
      const updateGender = () => {
        preview.dataset.bodyType = gender.value;
        const affinity = form.querySelector('input[name="affinity"]:checked').value;
        preview.innerHTML = rasterCharacterPreviewMarkup({ character: { bodyType: gender.value, hair: Number(hair.value) } }, "0.82.9", { backdrop: elementParticlesMarkup(affinity) });
      };
      scope.listen(name, "input", () => { name.setCustomValidity(""); root.querySelector("[data-creator-name]").textContent = name.value.trim() || "Tu combatiente"; });
      scope.listen(gender, "change", updateGender);
      scope.listen(hair, "change", updateGender);
      root.querySelectorAll("[data-creator-hair-step]").forEach((button) => scope.listen(button, "click", () => {
        hair.selectedIndex = (hair.selectedIndex + Number(button.dataset.creatorHairStep) + hair.options.length) % hair.options.length;
        updateGender();
      }));
      root.querySelectorAll("[data-creator-gender-step]").forEach((button) => scope.listen(button, "click", () => {
        const nextIndex = (gender.selectedIndex + Number(button.dataset.creatorGenderStep) + gender.options.length) % gender.options.length;
        gender.selectedIndex = nextIndex;
        updateGender();
      }));
      scope.listen(form, "change", (event) => {
        if (event.target.name !== "affinity") return;
        const affinity = event.target.value;
        const color = `#${deps.elements[affinity].color.toString(16).padStart(6, "0")}`;
        root.querySelector(".creator-customizer").style.setProperty("--creator-affinity", color);
        root.querySelector("[data-creator-affinity-icon]").src = deps.elementIcon(affinity);
        root.querySelector("[data-creator-affinity-name]").textContent = deps.elementName(affinity);
        form.elements.namedItem("appearance").value = color;
        preview.querySelector("[data-affinity-particles]").dataset.element = affinity;
      });
      scope.listen(form, "submit", (event) => {
        event.preventDefault();
        if (!name.value.trim()) { name.setCustomValidity("Escribe un nombre para tu combatiente."); name.reportValidity(); return; }
        const nextSave = deps.onCreateCharacter(Object.fromEntries(new FormData(event.currentTarget)));
        deps.showDialogue(welcomeDialogue(nextSave.character), deps.onTutorialComplete, "VER SAGAS", "story");
      });
      scope.listen(root.querySelector("[data-back-to-slots]"), "click", deps.onBackToSlots);
    },
    dispose() { currentState = null; }
  };
}

