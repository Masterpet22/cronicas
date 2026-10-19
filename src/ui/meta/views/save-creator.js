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
    const affinityChoices = deps.basicElementIds.map((id, index) => `<label class="affinity-choice"><input type="radio" name="affinity" value="${id}" ${index === 0 ? "checked" : ""}><img src="${deps.elementIcon(id)}" alt="" width="512" height="512"><span><strong>${deps.elementName(id)}</strong><small>Afinidad básica</small></span></label>`).join("");
    return `
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
      scope.listen(root.querySelector("#character-form"), "submit", (event) => {
        event.preventDefault();
        const nextSave = deps.onCreateCharacter(Object.fromEntries(new FormData(event.currentTarget)));
        deps.showDialogue(welcomeDialogue(nextSave.character), deps.onTutorialComplete, "VER SAGAS", "story");
      });
      scope.listen(root.querySelector("[data-back-to-slots]"), "click", deps.onBackToSlots);
    },
    dispose() { currentState = null; }
  };
}

