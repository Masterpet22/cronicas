const ATTRIBUTE_DEFINITIONS = Object.freeze([
  { key: "health", label: "Vida", short: "VID", hint: "+10 PV", stat: "maxHp", cap: 200 },
  { key: "strength", label: "Fuerza", short: "FUE", hint: "+1 daño", stat: "strength", cap: 25 },
  { key: "speed", label: "Velocidad", short: "VEL", hint: "+1 ritmo de turno", stat: "speed", cap: 25 },
  { key: "chakra", label: "Chakra", short: "CHK", hint: "+5 CH", stat: "maxChakra", cap: 200 },
  { key: "luck", label: "Suerte", short: "SUE", hint: "+evasión y crítico", stat: "luck", cap: 25 }
]);

function attributeDistributionMarkup(stats, attributes, points) {
  const icons = { health: "♥", strength: "⚔", speed: "➤", chakra: "◉", luck: "✣" };
  const cards = ATTRIBUTE_DEFINITIONS.map((definition) => {
    const value = Number(stats[definition.stat]) || 0;
    const trained = Number(attributes[definition.key]) || 0;
    const percent = Math.round((stats.affinityModifiers?.[definition.key] || 0) * 100);
    const modifier = percent ? `${percent > 0 ? "+" : ""}${percent}% afinidad` : "Base sin ajuste";
    const width = Math.max(4, Math.min(100, value / definition.cap * 100));
    const modifierClass = percent > 0 ? "positive" : percent < 0 ? "negative" : "neutral";
    return `<article class="attribute-card ${definition.key} ${modifierClass}" style="--attribute-fill:${width}%"><header><span class="attribute-icon" aria-hidden="true">${icons[definition.key]}</span><span><strong>${definition.label}</strong><small>${modifier}</small></span><b>${value}</b></header><div class="attribute-meter" role="meter" aria-label="${definition.label}" aria-valuemin="0" aria-valuemax="${definition.cap}" aria-valuenow="${Math.min(value, definition.cap)}"><span></span></div><footer><small>${definition.hint} · Entrenado ${trained}</small><button type="button" data-attribute="${definition.key}" aria-label="Añadir punto a ${definition.label}" ${points ? "" : "disabled"}>+</button></footer></article>`;
  }).join("");
  return `<div class="attribute-distribution">${cards}</div>`;
}

const numberedOptions = (count, current, prefix) => Array.from({ length: count }, (_, index) => `<option value="${index + 1}" ${Number(current) === index + 1 ? "selected" : ""}>${prefix} ${index + 1}</option>`).join("");

export function createDojoView(deps) {
  let currentState = null;
  let renderModel = null;
  let selectedTechniqueId = null;

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
      const masterSelectionUnlocked = campaignFlag(save, "masterSelectionUnlocked");
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
      const visibleJutsus = accessibleBranches.flatMap(([id]) => deps.jutsus.filter((jutsu) => jutsu.element === id));
      if (!visibleJutsus.some((jutsu) => jutsu.id === selectedTechniqueId)) {
        selectedTechniqueId = save.loadout.find((id) => visibleJutsus.some((jutsu) => jutsu.id === id)) || visibleJutsus[0]?.id || null;
      }
      const techniqueDetailMarkup = (jutsu, source = save) => {
        if (!jutsu) return `<aside class="technique-detail empty"><p class="eyebrow">SELECCIONA UNA TÉCNICA</p><h3>Árbol de habilidades</h3><p>Aprende una afinidad para explorar sus técnicas.</p></aside>`;
        const element = deps.elements[jutsu.element];
        const color = `#${element.color.toString(16).padStart(6, "0")}`;
        const learned = deps.isTechniqueLearned(source, jutsu);
        const equipped = source.loadout.includes(jutsu.id);
        const status = jutsu.status?.label || "Sin efecto de estado";
        const speed = `${jutsu.speedMod > 0 ? "+" : ""}${jutsu.speedMod} ritmo`;
        const accuracy = `${jutsu.accuracyMod > 0 ? "+" : ""}${jutsu.accuracyMod}% precisión`;
        const cooldown = jutsu.cooldown ? `${jutsu.cooldown} turnos` : "Sin recarga";
        return `<aside class="technique-detail" style="--technique-color:${color}"><p class="eyebrow">TÉCNICA · ${element.name}</p><h3>${jutsu.name}</h3><div class="technique-affinity"><span>${element.name}</span><span>Nivel ${jutsu.unlockLevel}</span></div><div class="technique-art-placeholder" role="img" aria-label="Marcador provisional de ilustración para ${jutsu.name}"><span>${element.name.slice(0, 1)}</span><small>ARTE DE ${element.name.toUpperCase()}</small></div><p class="technique-description">Técnica de ${element.name.toLowerCase()} con efecto <strong>${status.toLowerCase()}</strong>.</p><div class="technique-metrics"><div><strong>${jutsu.damage}</strong><small>DAÑO BASE</small></div><div><strong>${jutsu.cost} CH</strong><small>COSTE</small></div><div><strong>${cooldown}</strong><small>RECARGA</small></div><div><strong>${speed}</strong><small>VELOCIDAD</small></div></div><p class="technique-accuracy">${accuracy} · ${jutsu.affinityXpRequired} PX de afinidad</p><button class="technique-equip-button" type="button" data-technique-toggle="${jutsu.id}" ${learned ? "" : "disabled"}>${learned ? equipped ? "✓ EQUIPADA · DESEQUIPAR" : "＋ EQUIPAR TÉCNICA" : `BLOQUEADA · NIVEL ${jutsu.unlockLevel} / ${jutsu.affinityXpRequired} PX`}</button><button class="technique-upgrade-button" type="button" disabled title="La progresión de mejoras de técnicas aún no está implementada">↑ MEJORAR TÉCNICA <small>Progresión de técnicas próximamente</small></button></aside>`;
      };
      const skillBranches = accessibleBranches.map(([id, element]) => {
        const requirements = deps.basicRequirements(id).map(deps.elementName).join(" + ");
        const elementXp = deps.affinityXpForElement(character, id);
        const branchColor = `#${element.color.toString(16).padStart(6, "0")}`;
        const nodes = deps.jutsus.filter((jutsu) => jutsu.element === id).sort((a, b) => a.affinityXpRequired - b.affinityXpRequired || a.unlockLevel - b.unlockLevel).map((jutsu, index) => {
          const levelReady = jutsu.unlockLevel <= progression.level;
          const affinityReady = elementXp >= jutsu.affinityXpRequired;
          const unlocked = deps.isTechniqueLearned(save, jutsu);
          const selected = save.loadout.includes(jutsu.id);
          const lockReason = [levelReady ? "" : `Nv. ${jutsu.unlockLevel}`, affinityReady ? "" : `${jutsu.affinityXpRequired} PX afinidad`].filter(Boolean).join(" · ");
          return `<button class="skill-node ${unlocked ? "available" : "locked"} ${selectedTechniqueId === jutsu.id ? "focused" : ""} ${selected ? "equipped" : ""}" type="button" data-skill-select="${jutsu.id}" aria-pressed="${selectedTechniqueId === jutsu.id}" style="--branch-color:${branchColor}"><span class="skill-step">${index + 1}</span><span class="skill-copy"><strong>${jutsu.name}</strong><small>${jutsu.cost} CH · ${jutsu.damage} daño</small></span><span class="skill-state">${selected ? "EQUIPADA" : unlocked ? "APRENDIDA" : `🔒 ${lockReason}`}</span></button>`;
        }).join("");
        return `<section class="skill-branch tier-${element.tier}" style="--branch-color:${branchColor}" aria-label="Rama de ${element.name}"><header><img src="${element.icon}" alt="" width="512" height="512"><span><strong>${element.name}</strong><small>${element.tier === 1 ? `${elementXp} PX` : `${requirements} · ${elementXp} PX`}</small></span></header><div class="skill-path">${nodes}</div></section>`;
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
      const attributeMarkup = (source = save) => attributeDistributionMarkup(deps.derivedStats(source), source.progression.attributes, source.progression.attributePoints);
      renderModel = { gearIcons, gearTitles, gearSlotState, gearSlotContents, techniqueCapacity, techniqueDetailMarkup, attributeMarkup };
      const preview = `<div class="character-preview">${deps.fighterPreviewSvg(deps.playerFighterAppearance(save))}</div>`;
      const xpForNext = deps.xpForNextLevel(progression.level);
      const hasInvestedAttributePoints = Object.values(progression.attributes).some(Boolean);
      return `<div class="dojo-layout dojo-rework">
        <header class="dojo-topbar"><div class="dojo-title"><span class="dojo-title-mark" aria-hidden="true">✦</span><div><p class="eyebrow">CONFIGURACIÓN DE COMBATE</p><h2>${deps.elementRankLabels[elementRank]}</h2><small>Personaliza tus técnicas, mejora tus atributos y forja tu estilo de combate.</small></div></div><div class="dojo-level"><strong>NIVEL ${progression.level}</strong><span>${progression.xp}/${xpForNext} PX</span><i><b style="width:${Math.min(100, progression.xp / xpForNext * 100)}%"></b></i></div><nav class="dojo-tabs" role="tablist" aria-label="Secciones de configuración"><button type="button" role="tab" data-dojo-tab="equipment" aria-controls="dojo-panel-equipment">♧ <span>Equipo</span></button><button type="button" role="tab" data-dojo-tab="techniques" aria-controls="dojo-panel-techniques">⚔ <span>Técnicas</span></button><button type="button" role="tab" data-dojo-tab="appearance" aria-controls="dojo-panel-appearance">◈ <span>Apariencia</span></button></nav></header>
        <section class="dojo-main-panel"><div id="dojo-panel-equipment" class="dojo-tab-panel" role="tabpanel" data-dojo-panel="equipment"><section class="dojo-section"><div class="dojo-section-heading"><div><h3>Afinidades</h3><p>La historia permite conocerlas; nivel y rango abren cada ranura.</p></div><span>${affinities.length}/${activeAffinitySlots} activas · Rango ${elementRank}</span></div><div class="affinity-slots">${affinitySlots}</div><p class="affinity-change-note">⌾ El orden define el peso: principal 100 %, secundaria 50 % y tercera 25 %. Por ahora no se puede reordenar.</p></section><section class="dojo-section"><div class="dojo-section-heading"><div><h3>Equipamiento</h3><p>Pulsa una ranura para elegir o desequipar.</p></div></div><div class="equipment-grid">${equipmentSlot("weapon")}${equipmentSlot("armor")}${equipmentSlot("accessory")}</div></section></div>
        <div id="dojo-panel-techniques" class="dojo-tab-panel" role="tabpanel" data-dojo-panel="techniques"><div class="dojo-technique-layout"><section class="technique-detail-wrap" aria-label="Detalle de técnica" data-technique-detail>${techniqueDetailMarkup(deps.jutsus.find((jutsu) => jutsu.id === selectedTechniqueId))}</section><section class="skill-tree" aria-label="Árbol de habilidades por afinidad"><div class="skill-tree-heading"><div><h3>ÁRBOL DE HABILIDADES</h3><p>El dominio y la experiencia desbloquean nuevas técnicas.</p></div><div class="tree-status"><strong class="dojo-equipped-count" data-equipped-count>${save.loadout.length}/${techniqueCapacity} TÉCNICAS</strong><span class="tree-legend"><i></i> Equipada <i></i> Aprendida <i></i> Bloqueada</span></div></div><div class="skill-branches">${skillBranches}</div></section></div></div>
          <div id="dojo-panel-appearance" class="dojo-tab-panel" role="tabpanel" data-dojo-panel="appearance"><section class="appearance-panel"><div class="dojo-section-heading"><div><h3>Personalizar apariencia</h3><p>Los cambios se reflejan también durante el combate. El tipo de cuerpo pertenece a la partida y no puede modificarse aquí.</p></div><span>Opcional</span></div><div class="customizer">${preview}<div class="cosmetic-grid"><label>Rostro<select data-cosmetic="face">${numberedOptions(3, character.face, "Rostro")}</select></label><label>Cabello<select data-cosmetic="hair">${numberedOptions(5, character.hair, "Peinado")}</select></label><label>Parte superior<select data-cosmetic="top">${numberedOptions(3, character.top, "Prenda")}</select></label><label>Parte inferior<select data-cosmetic="bottom">${numberedOptions(3, character.bottom, "Pantalón")}</select></label><label>Calzado<select data-cosmetic="shoes">${numberedOptions(2, character.shoes, "Calzado")}</select></label></div></div></section><section class="master-selection"><div class="dojo-section-heading"><div><h3>Maestro</h3><p>Tu maestro aporta una ventaja pasiva sin entrar al combate. Los duelos de esta saga siguen siendo uno contra uno.</p></div><span>${masterSelectionUnlocked ? "ELECCIÓN DISPONIBLE" : "SE DESBLOQUEA AL COMPLETAR LA SAGA 1"}</span></div><div class="master-options">${masterCards}</div></section></div><p id="dojo-message" class="dojo-message" aria-live="polite">Los cambios se guardan automáticamente.</p>
        </section><section class="dojo-attributes"><header><div><p class="eyebrow">DISTRIBUCIÓN DE PUNTOS DE ESTADÍSTICAS</p><small>Mejora tus atributos para potenciar tu rendimiento en combate.</small></div><div class="dojo-attribute-actions"><strong><b data-attribute-points>${progression.attributePoints}</b> PUNTOS DISPONIBLES</strong><button class="attribute-reset" type="button" data-reset-attributes ${hasInvestedAttributePoints ? "" : "disabled"}>↻ Reiniciar</button></div></header><div class="attribute-distribution-wrap">${attributeMarkup()}</div></section>
      </div><div class="equipment-modal" role="dialog" aria-modal="true" aria-labelledby="equipment-modal-title" hidden><div class="equipment-modal-card"><div class="equipment-modal-heading"><div><p class="eyebrow">INVENTARIO</p><h2 id="equipment-modal-title">Elegir equipo</h2></div><button type="button" data-close-equipment aria-label="Cerrar">×</button></div><div class="equipment-modal-options"></div></div></div>`;
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
        const points = save.progression.attributePoints;
        const pointsLabel = root.querySelector("[data-attribute-points]");
        if (pointsLabel) pointsLabel.textContent = String(points);
        const attributes = root.querySelector(".attribute-distribution-wrap");
        if (attributes) attributes.innerHTML = renderModel.attributeMarkup(save);
        const resetAttributes = root.querySelector("[data-reset-attributes]");
        if (resetAttributes) resetAttributes.disabled = !Object.values(save.progression.attributes).some(Boolean);
        const levelBar = root.querySelector(".dojo-level i b");
        if (levelBar) levelBar.style.width = `${Math.min(100, save.progression.xp / deps.xpForNextLevel(save.progression.level) * 100)}%`;
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
        root.querySelectorAll("[data-skill-select]").forEach((node) => {
          const selected = node.dataset.skillSelect === selectedTechniqueId;
          const equipped = save.loadout.includes(node.dataset.skillSelect);
          node.classList.toggle("focused", selected);
          node.classList.toggle("equipped", equipped);
          node.setAttribute("aria-pressed", String(selected));
          const status = node.querySelector(".skill-state");
          const jutsu = deps.jutsus.find((entry) => entry.id === node.dataset.skillSelect);
          if (status && jutsu && deps.isTechniqueLearned(save, jutsu)) status.textContent = equipped ? "EQUIPADA" : "APRENDIDA";
        });
        const techniqueCount = root.querySelector("[data-equipped-count]");
        if (techniqueCount) techniqueCount.textContent = `${save.loadout.length}/${renderModel.techniqueCapacity} TÉCNICAS`;
        const detail = root.querySelector("[data-technique-detail]");
        if (detail) detail.innerHTML = renderModel.techniqueDetailMarkup(deps.jutsus.find((jutsu) => jutsu.id === selectedTechniqueId), save);
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
      scope.listen(root.querySelector(".dojo-attributes"), "click", (event) => {
        if (event.target.closest("[data-reset-attributes]")) {
          if (!Object.values(getSave().progression.attributes).some(Boolean)) return;
          persistDojo(deps.resetAttributes(getSave()));
          return;
        }
        const button = event.target.closest("[data-attribute]");
        if (button && getSave().progression.attributePoints) persistDojo(deps.spendAttribute(getSave(), button.dataset.attribute));
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
        if (!campaignFlag(getSave(), "masterSelectionUnlocked")) return;
        currentState.save = deps.onPersist(deps.selectMaster(getSave(), button.dataset.master));
        deps.onRerender();
      }));
      scope.listen(root.querySelector(".skill-tree"), "click", (event) => {
        const node = event.target.closest("[data-skill-select]");
        if (!node) return;
        selectedTechniqueId = node.dataset.skillSelect;
        const detail = root.querySelector("[data-technique-detail]");
        if (detail) detail.innerHTML = renderModel.techniqueDetailMarkup(deps.jutsus.find((jutsu) => jutsu.id === selectedTechniqueId), getSave());
        root.querySelectorAll("[data-skill-select]").forEach((entry) => {
          const selected = entry === node;
          entry.classList.toggle("focused", selected);
          entry.setAttribute("aria-pressed", String(selected));
        });
      });
      scope.listen(root.querySelector("[data-technique-detail]"), "click", (event) => {
        const button = event.target.closest("[data-technique-toggle]");
        if (!button || !deps.isTechniqueLearned(getSave(), deps.jutsus.find((jutsu) => jutsu.id === button.dataset.techniqueToggle))) return;
        const save = getSave();
        const id = button.dataset.techniqueToggle;
        const message = root.querySelector("#dojo-message");
        const equipped = save.loadout.includes(id);
        if (!equipped && save.loadout.length >= renderModel.techniqueCapacity) {
          if (message) message.textContent = `Tu nivel permite preparar ${renderModel.techniqueCapacity} técnicas.`;
          return;
        }
        save.loadout = equipped ? save.loadout.filter((entry) => entry !== id) : [...save.loadout, id];
        persistDojo(save);
        if (message) message.textContent = "Cambios guardados.";
      });
    },

    dispose() { currentState = null; renderModel = null; }
  };
}
import { campaignFlag } from "../../../mission-system.js?v=0.67.0";

