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
    const [x, y] = radarPoint(index, 1.18, 91).split(",");
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

const numberedOptions = (count, current, prefix) => Array.from({ length: count }, (_, index) => `<option value="${index + 1}" ${Number(current) === index + 1 ? "selected" : ""}>${prefix} ${index + 1}</option>`).join("");

export function createDojoView(deps) {
  let currentState = null;
  let renderModel = null;

  return {
    id: "dojo",

    render(state) {
      currentState = state;
      const { save } = state;
      const stats = deps.derivedStats(save);
      const { progression, character } = save;
      const elementRank = save.campaign.elementRank;
      const affinities = character.affinities;
      const activeAffinitySlots = deps.availableAffinitySlots(progression.level, elementRank);
      const currentMasterId = deps.masterIdForCharacter(character);
      const masterSelectionUnlocked = save.campaign.masterSelectionUnlocked;
      const masterCards = [
        { id: "mei", npc: deps.npcs.mei, advantage: "Disciplina defensiva", detail: "Reduce en 2 el daño de cada impacto recibido." },
        { id: "daichi", npc: deps.npcs.daichi, advantage: "Fuerza de la montaña", detail: "Añade 3 puntos al daño de todos tus ataques." }
      ].map(({ id, npc, advantage, detail }) => `<button class="master-option ${currentMasterId === id ? "selected" : ""}" type="button" data-master="${id}" ${masterSelectionUnlocked ? "" : "disabled"}><img src="${npc.image}?v=${deps.assetVersion}" alt="" width="1145" height="1374"><span><strong>${npc.name}</strong><small>${advantage}</small><em>${detail}</em></span><b>${currentMasterId === id ? "MAESTRO ACTUAL" : masterSelectionUnlocked ? "ELEGIR" : "BLOQUEADO"}</b></button>`).join("");
      const techniqueCapacity = deps.loadoutSlotsForLevel(progression.level);
      const affinitySlots = Array.from({ length: 3 }, (_, index) => {
        const slotRank = index + 1;
        const id = affinities[index];
        const slotConfig = deps.affinityConfig.slots[index];
        const unlocked = activeAffinitySlots >= slotRank;
        if (!unlocked) return `<div class="affinity-slot locked"><span class="slot-index">${slotRank}</span><span><strong>Ranura bloqueada</strong><small>Nivel ${slotConfig.level} y rango de historia ${slotConfig.storyRank}</small></span><span class="slot-lock" aria-hidden="true">⌾</span></div>`;
        if (!id) {
          const choices = character.knownAffinities.filter((known) => !affinities.includes(known)).map((known) => `<button type="button" data-affinity-choice="${known}"><img src="${deps.elementIcon(known)}" alt="" width="512" height="512">${deps.elementName(known)}</button>`).join("");
          return `<div class="affinity-slot empty"><span class="slot-index">${slotRank}</span><span><strong>Elige afinidad</strong><small>${choices ? "El orden define su peso" : "Aprende otra afinidad durante la historia"}</small>${choices ? `<span class="affinity-slot-choices">${choices}</span>` : ""}</span></div>`;
        }
        return `<div class="affinity-slot selected"><span class="slot-index">${slotRank}</span><img src="${deps.elementIcon(id)}" alt="" width="512" height="512"><span><strong>${deps.elementName(id)}</strong><small>${character.affinityXp[id]} PX de afinidad</small></span><span class="slot-lock" title="Solo puede cambiarse con un objeto especial" aria-hidden="true">⌾</span></div>`;
      }).join("");
      const accessibleBranches = Object.entries(deps.elements).filter(([id]) => deps.canAccessElement(id, affinities, elementRank) && deps.jutsus.some((jutsu) => jutsu.element === id));
      const skillBranches = accessibleBranches.map(([id, element]) => {
        const requirements = deps.basicRequirements(id).map(deps.elementName).join(" + ");
        const elementXp = deps.affinityXpForElement(character, id);
        const nodes = deps.jutsus.filter((jutsu) => jutsu.element === id).sort((a, b) => a.affinityXpRequired - b.affinityXpRequired || a.unlockLevel - b.unlockLevel).map((jutsu, index) => {
          const levelReady = jutsu.unlockLevel <= progression.level;
          const affinityReady = elementXp >= jutsu.affinityXpRequired;
          const unlocked = deps.isTechniqueLearned(save, jutsu);
          const selected = save.loadout.includes(jutsu.id);
          const lockReason = [levelReady ? "" : `Nv. ${jutsu.unlockLevel}`, affinityReady ? "" : `${jutsu.affinityXpRequired} PX afinidad`].filter(Boolean).join(" · ");
          return `<label class="skill-node ${unlocked ? "available" : "locked"} ${selected ? "selected" : ""}"><input type="checkbox" data-jutsu="${jutsu.id}" ${selected ? "checked" : ""} ${unlocked ? "" : "disabled"}><span class="skill-step">${index + 1}</span><span class="skill-copy"><strong>${jutsu.name}</strong><small>${jutsu.cost} CH · ${jutsu.damage} daño</small></span><span class="skill-state">${selected ? "EQUIPADA" : unlocked ? "APRENDIDA" : `🔒 ${lockReason}`}</span></label>`;
        }).join("");
        return `<section class="skill-branch tier-${element.tier}" style="--branch-color:#${element.color.toString(16).padStart(6, "0")}"><header><img src="${element.icon}" alt="" width="512" height="512"><span><strong>${element.name}</strong><small>${element.tier === 1 ? `${elementXp} PX` : `${requirements} · ${elementXp} PX`}</small></span></header><div class="skill-path">${nodes}</div></section>`;
      }).join("");
      const gearIcons = { weapon: "⚔", armor: "◈", accessory: "◇" };
      const gearTitles = { weapon: "Arma", armor: "Protector", accessory: "Accesorio" };
      const gearSlotState = (type, source = save) => {
        const id = source.equipment[type];
        const item = deps.equipment[type].find((entry) => entry.id === id);
        return { id, item };
      };
      const gearSlotContents = (type, source = save) => {
        const { item } = gearSlotState(type, source);
        return `<span class="gear-icon" aria-hidden="true">${gearIcons[type]}</span><span class="gear-copy"><small>${gearTitles[type]}</small><strong>${item?.name || "Nada equipado"}</strong><em>${item?.description || "Pulsa para equipar"}</em></span><span class="gear-action" aria-hidden="true">+</span>`;
      };
      const equipmentSlot = (type) => {
        const { id, item } = gearSlotState(type);
        return `<button class="gear-slot ${id ? "equipped" : "empty"}" type="button" data-gear-slot="${type}" aria-label="${gearTitles[type]}: ${item?.name || "nada equipado"}">${gearSlotContents(type)}</button>`;
      };
      const techniqueSlotsMarkup = (source = save) => Array.from({ length: 4 }, (_, index) => {
        const requiredLevel = index < 2 ? 1 : index === 2 ? 5 : 8;
        const jutsu = deps.jutsus.find((entry) => entry.id === source.loadout[index]);
        const unlocked = index < techniqueCapacity;
        return `<div class="technique-slot ${unlocked ? "" : "locked"}"><span>${index + 1}</span><strong>${jutsu?.name || (unlocked ? "Vacía" : `Nivel ${requiredLevel}`)}</strong><small>${jutsu ? deps.elementName(jutsu.element) : unlocked ? "Selecciona abajo" : "Ranura bloqueada"}</small></div>`;
      }).join("");
      renderModel = { gearIcons, gearTitles, gearSlotState, gearSlotContents, techniqueSlotsMarkup, techniqueCapacity };
      const preview = `<div class="character-preview">${deps.fighterPreviewSvg(deps.playerFighterAppearance(save))}</div>`;
      return `<div class="dojo-layout">
        <section class="stage-panel profile-card"><p class="eyebrow">ENTRENAMIENTO</p><h2>${deps.elementRankLabels[elementRank]}</h2><p class="compact">${affinities.length}/${activeAffinitySlots} afinidades activas</p><div class="progress-track"><span style="width:${Math.min(100, progression.xp / deps.xpForNextLevel(progression.level) * 100)}%"></span></div><p class="compact">Nivel ${progression.level} · ${progression.xp}/${deps.xpForNextLevel(progression.level)} PX</p><h3 class="attribute-heading">Estadísticas <span>${progression.attributePoints} puntos</span></h3><div class="stat-radar-wrap">${statRadarMarkup(stats, progression.attributes, progression.attributePoints)}</div></section>
        <section class="stage-panel loadout-card"><div class="section-heading dojo-heading"><div><p class="eyebrow">PREPARACIÓN</p><h2>Configuración de combate</h2></div><strong>${save.loadout.length}/${techniqueCapacity} técnicas</strong></div><nav class="dojo-tabs" role="tablist" aria-label="Secciones de configuración"><button type="button" role="tab" data-dojo-tab="equipment" aria-controls="dojo-panel-equipment">Equipo</button><button type="button" role="tab" data-dojo-tab="techniques" aria-controls="dojo-panel-techniques">Técnicas</button><button type="button" role="tab" data-dojo-tab="appearance" aria-controls="dojo-panel-appearance">Apariencia</button></nav>
          <div id="dojo-panel-equipment" class="dojo-tab-panel" role="tabpanel" data-dojo-panel="equipment"><section class="dojo-section"><div class="dojo-section-heading"><div><h3>Afinidades</h3><p>La historia permite conocerlas; nivel y rango abren cada ranura.</p></div><span>Rango ${elementRank}</span></div><div class="affinity-slots">${affinitySlots}</div><p class="affinity-change-note">⌾ El orden define el peso: principal 100 %, secundaria 50 % y tercera 25 %. Por ahora no se puede reordenar.</p></section><section class="dojo-section"><div class="dojo-section-heading"><div><h3>Equipamiento</h3><p>Pulsa una ranura para elegir o desequipar.</p></div></div><div class="equipment-grid">${equipmentSlot("weapon")}${equipmentSlot("armor")}${equipmentSlot("accessory")}</div></section></div>
          <div id="dojo-panel-techniques" class="dojo-tab-panel" role="tabpanel" data-dojo-panel="techniques"><section class="skill-tree" aria-label="Árbol de habilidades por afinidad"><div class="skill-tree-heading"><div><h3>Árbol de habilidades</h3><p>Requieren nivel de personaje y experiencia de afinidad.</p></div><span class="tree-legend"><i></i> Aprendida <i></i> Bloqueada</span></div><div class="technique-slots">${techniqueSlotsMarkup()}</div><div class="skill-branches">${skillBranches}</div></section></div>
          <div id="dojo-panel-appearance" class="dojo-tab-panel" role="tabpanel" data-dojo-panel="appearance"><section class="appearance-panel"><div class="dojo-section-heading"><div><h3>Personalizar apariencia</h3><p>Los cambios se reflejan también durante el combate. El tipo de cuerpo pertenece a la partida y no puede modificarse aquí.</p></div><span>Opcional</span></div><div class="customizer">${preview}<div class="cosmetic-grid"><label>Rostro<select data-cosmetic="face">${numberedOptions(3, character.face, "Rostro")}</select></label><label>Cabello<select data-cosmetic="hair">${numberedOptions(5, character.hair, "Peinado")}</select></label><label>Parte superior<select data-cosmetic="top">${numberedOptions(3, character.top, "Prenda")}</select></label><label>Parte inferior<select data-cosmetic="bottom">${numberedOptions(3, character.bottom, "Pantalón")}</select></label><label>Calzado<select data-cosmetic="shoes">${numberedOptions(2, character.shoes, "Calzado")}</select></label></div></div></section><section class="master-selection"><div class="dojo-section-heading"><div><h3>Maestro</h3><p>Tu maestro aporta una ventaja pasiva sin entrar al combate. Los duelos de esta saga siguen siendo uno contra uno.</p></div><span>${masterSelectionUnlocked ? "ELECCIÓN DISPONIBLE" : "SE DESBLOQUEA AL COMPLETAR LA SAGA 1"}</span></div><div class="master-options">${masterCards}</div></section></div><p id="dojo-message" class="dojo-message" aria-live="polite">Los cambios se guardan automáticamente.</p>
        </section></div><div class="equipment-modal" role="dialog" aria-modal="true" aria-labelledby="equipment-modal-title" hidden><div class="equipment-modal-card"><div class="equipment-modal-heading"><div><p class="eyebrow">INVENTARIO</p><h2 id="equipment-modal-title">Elegir equipo</h2></div><button type="button" data-close-equipment aria-label="Cerrar">×</button></div><div class="equipment-modal-options"></div></div></div>`;
    },

    mount(root, scope) {
      if (!currentState || !renderModel) return;
      const getSave = () => currentState.save;
      const persistDojo = (next) => { currentState.save = deps.onPersist(next); syncDojo(); };
      const selectDojoTab = (tabId, moveFocus = false) => {
        currentState.activeDojoTab = tabId;
        deps.onTabSelected(tabId);
        root.querySelectorAll("[data-dojo-tab]").forEach((button) => {
          const selected = button.dataset.dojoTab === tabId;
          button.setAttribute("aria-selected", String(selected));
          button.tabIndex = selected ? 0 : -1;
          if (selected && moveFocus) button.focus();
        });
        root.querySelectorAll("[data-dojo-panel]").forEach((panel) => { panel.hidden = panel.dataset.dojoPanel !== tabId; });
      };
      const syncDojo = () => {
        const save = getSave();
        const nextStats = deps.derivedStats(save);
        const points = save.progression.attributePoints;
        const pointsLabel = root.querySelector(".attribute-heading span");
        if (pointsLabel) pointsLabel.textContent = `${points} puntos`;
        const radar = root.querySelector(".stat-radar-wrap");
        if (radar) radar.innerHTML = statRadarMarkup(nextStats, save.progression.attributes, points);
        const preview = root.querySelector(".character-preview");
        if (preview) preview.innerHTML = deps.fighterPreviewSvg(deps.playerFighterAppearance(save));
        root.querySelectorAll("[data-gear-slot]").forEach((button) => {
          const type = button.dataset.gearSlot;
          const { id, item, unavailable } = renderModel.gearSlotState(type, save);
          button.className = `gear-slot ${id ? "equipped" : "empty"} ${unavailable ? "locked" : ""}`;
          button.disabled = unavailable;
          button.setAttribute("aria-label", `${renderModel.gearTitles[type]}: ${item?.name || "nada equipado"}`);
          button.innerHTML = renderModel.gearSlotContents(type, save);
        });
        root.querySelectorAll("[data-cosmetic]").forEach((select) => { select.value = String(save.character[select.dataset.cosmetic]); });
        root.querySelectorAll("[data-jutsu]").forEach((input) => {
          const selected = save.loadout.includes(input.dataset.jutsu);
          input.checked = selected;
          const node = input.closest(".skill-node");
          node?.classList.toggle("selected", selected);
          const state = node?.querySelector(".skill-state");
          const jutsu = deps.jutsus.find((entry) => entry.id === input.dataset.jutsu);
          if (state && jutsu && !input.disabled) state.textContent = selected ? "EQUIPADA" : "APRENDIDA";
        });
        const loadoutCount = root.querySelector(".loadout-card .section-heading > strong");
        if (loadoutCount) loadoutCount.textContent = `${save.loadout.length}/${renderModel.techniqueCapacity} técnicas`;
        const slots = root.querySelector(".technique-slots");
        if (slots) slots.innerHTML = renderModel.techniqueSlotsMarkup(save);
      };
      root.querySelectorAll("[data-dojo-tab]").forEach((button) => {
        scope.listen(button, "click", () => selectDojoTab(button.dataset.dojoTab));
        scope.listen(button, "keydown", (event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          const tabs = ["equipment", "techniques", "appearance"];
          const direction = event.key === "ArrowRight" ? 1 : -1;
          const next = (tabs.indexOf(currentState.activeDojoTab) + direction + tabs.length) % tabs.length;
          selectDojoTab(tabs[next], true);
        });
      });
      selectDojoTab(currentState.activeDojoTab);
      scope.listen(root.querySelector(".stat-radar-wrap"), "click", (event) => {
        const button = event.target.closest("[data-attribute]");
        if (!button || !getSave().progression.attributePoints) return;
        persistDojo(deps.spendAttribute(getSave(), button.dataset.attribute));
      });
      root.querySelectorAll("[data-affinity-choice]").forEach((button) => scope.listen(button, "click", () => {
        currentState.save = deps.onPersist(deps.selectNextAffinity(getSave(), button.dataset.affinityChoice));
        deps.onRerender();
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
        const save = getSave();
        equipmentReturnScroll = stageOptions?.scrollTop || 0;
        activeGearType = type;
        const options = [{ id: "", name: "Nada", description: "Dejar esta ranura vacía" }, ...deps.equipment[type]];
        equipmentModalTitle.textContent = `Equipar ${renderModel.gearTitles[type].toLowerCase()}`;
        equipmentModalOptions.innerHTML = options.map((item) => `<button type="button" class="equipment-option ${save.equipment[type] === (item.id || null) ? "selected" : ""}" data-equipment-type="${type}" data-equipment-id="${item.id}"><span class="gear-icon" aria-hidden="true">${item.id ? renderModel.gearIcons[type] : "∅"}</span><span><strong>${item.name}</strong><small>${item.description}</small></span>${save.equipment[type] === (item.id || null) ? "<em>Equipado</em>" : ""}</button>`).join("");
        equipmentModal.hidden = false;
        equipmentModal.querySelector(".equipment-option")?.focus();
      };
      root.querySelectorAll("[data-gear-slot]").forEach((button) => scope.listen(button, "click", () => openEquipmentModal(button.dataset.gearSlot)));
      scope.listen(root.querySelector("[data-close-equipment]"), "click", closeEquipmentModal);
      scope.listen(equipmentModal, "click", (event) => {
        const option = event.target.closest("[data-equipment-type]");
        if (option) {
          getSave().equipment[option.dataset.equipmentType] = option.dataset.equipmentId || null;
          persistDojo(getSave());
          closeEquipmentModal();
        } else if (event.target === equipmentModal) closeEquipmentModal();
      });
      root.querySelectorAll("[data-cosmetic]").forEach((select) => scope.listen(select, "change", () => {
        getSave().character[select.dataset.cosmetic] = Number(select.value);
        persistDojo(getSave());
      }));
      root.querySelectorAll("[data-master]").forEach((button) => scope.listen(button, "click", () => {
        if (!getSave().campaign.masterSelectionUnlocked) return;
        currentState.save = deps.onPersist(deps.selectMaster(getSave(), button.dataset.master));
        deps.onRerender();
      }));
      root.querySelectorAll("[data-jutsu]").forEach((input) => scope.listen(input, "change", () => {
        const save = getSave();
        const id = input.dataset.jutsu;
        const message = root.querySelector("#dojo-message");
        if (input.checked && save.loadout.length >= renderModel.techniqueCapacity) {
          input.checked = false;
          if (message) message.textContent = `Tu nivel permite preparar ${renderModel.techniqueCapacity} técnicas.`;
          return;
        }
        save.loadout = input.checked ? [...save.loadout, id] : save.loadout.filter((entry) => entry !== id);
        persistDojo(save);
        if (message) message.textContent = "Cambios guardados.";
      }));
    },

    dispose() { currentState = null; renderModel = null; }
  };
}
