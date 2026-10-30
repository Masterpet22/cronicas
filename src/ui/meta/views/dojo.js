import { rasterCharacterPreviewMarkup } from "../character-preview.js?v=0.119.0";
import { createDojoTechniques } from "../dojo-techniques.js?v=0.107.0";
import { appearanceControlsMarkup, mountDojoAppearance, refreshDojoAppearance } from "../dojo-appearance.js?v=0.119.0";
import { affinityScrollRequirement, countItem, equipItem } from "../../../inventory.js?v=0.114.0";
import { mountDojoAffinityScroll } from "../dojo-affinity-scroll.js?v=0.114.0";
const ATTRIBUTE_DEFINITIONS = Object.freeze([
  { key: "health", label: "Vida", short: "VID", hint: "+10 PV", stat: "maxHp", cap: 200 },
  { key: "strength", label: "Fuerza", short: "FUE", hint: "+1 daño", stat: "strength", cap: 25 },
  { key: "speed", label: "Velocidad", short: "VEL", hint: "+1 ritmo de turno", stat: "speed", cap: 25 },
  { key: "chakra", label: "Chakra", short: "CHK", hint: "+5 CH", stat: "maxChakra", cap: 200 },
  { key: "luck", label: "Suerte", short: "SUE", hint: "+evasión y crítico", stat: "luck", cap: 25 }
]);

const MASTER_DEFINITIONS = Object.freeze([
  { id: "mei", npcId: "mei", advantage: "Disciplina defensiva", detail: "Reduce en 2 el daño de cada impacto recibido." },
  { id: "daichi", npcId: "daichi", advantage: "Fuerza de la montaña", detail: "Añade 3 puntos al daño de todos tus ataques." }
]);

function attributeDistributionMarkup(stats, attributes, points, trainingLimit) {
  const icons = { health: "♥", strength: "⚔", speed: "➤", chakra: "◉", luck: "✣" };
  const cards = ATTRIBUTE_DEFINITIONS.map((definition) => {
    const value = Number(stats[definition.stat]) || 0;
    const trained = Number(attributes[definition.key]) || 0;
    const percent = Math.round((stats.affinityModifiers?.[definition.key] || 0) * 100);
    const modifier = percent ? `${percent > 0 ? "+" : ""}${percent}% afinidad` : "Base sin ajuste";
    const width = Math.max(4, Math.min(100, value / definition.cap * 100));
    const modifierClass = percent > 0 ? "positive" : percent < 0 ? "negative" : "neutral";
    return `<article class="attribute-card ${definition.key} ${modifierClass}" style="--attribute-fill:${width}%"><header><span class="attribute-icon" aria-hidden="true">${icons[definition.key]}</span><span><strong>${definition.label}</strong><small>${modifier}</small></span><b>${value}</b></header><div class="attribute-meter" role="meter" aria-label="${definition.label}" aria-valuemin="0" aria-valuemax="${definition.cap}" aria-valuenow="${Math.min(value, definition.cap)}"><span></span></div><footer><small>${definition.hint} · Entrenado ${trained}/${trainingLimit}</small><button type="button" data-attribute="${definition.key}" aria-label="Añadir punto a ${definition.label}" ${points && trained < trainingLimit ? "" : "disabled"}>+</button></footer></article>`;
  }).join("");
  return `<div class="attribute-distribution">${cards}</div>`;
}

function radarPoint(index, ratio, radius = 91) {
  const angle = (-90 + index * 72) * Math.PI / 180;
  return `${(160 + Math.cos(angle) * radius * ratio).toFixed(1)},${(145 + Math.sin(angle) * radius * ratio).toFixed(1)}`;
}

function statRadarMarkup(stats) {
  const values = ATTRIBUTE_DEFINITIONS.map((definition) => Number(stats[definition.stat]) || 0);
  const percentages = ATTRIBUTE_DEFINITIONS.map((definition) => Math.round((stats.affinityModifiers?.[definition.key] || 0) * 100));
  const grid = [0.25, 0.5, 0.75, 1].map((ratio) => `<polygon points="${ATTRIBUTE_DEFINITIONS.map((_, index) => radarPoint(index, ratio)).join(" ")}"/>`).join("");
  const axes = ATTRIBUTE_DEFINITIONS.map((_, index) => `<line x1="160" y1="145" x2="${radarPoint(index, 1).replace(",", '" y2="')}"/>`).join("");
  const areaPoints = ATTRIBUTE_DEFINITIONS.map((definition, index) => radarPoint(index, Math.min(1, values[index] / definition.cap)));
  const axisLabels = ATTRIBUTE_DEFINITIONS.map((definition, index) => {
    const [x, y] = radarPoint(index, 1.18).split(",");
    return `<text class="radar-axis-label" x="${x}" y="${Number(y) + 3}" text-anchor="middle">${definition.short}</text>`;
  }).join("");
  const readouts = ATTRIBUTE_DEFINITIONS.map((definition, index) => {
    const percent = percentages[index];
    const modifierClass = percent > 0 ? "positive" : percent < 0 ? "negative" : "neutral";
    const modifierLabel = percent ? `${percent > 0 ? "+" : ""}${percent}% afinidad` : "Base sin ajuste";
    return `<article class="stat-readout ${modifierClass}"><small>${definition.label}</small><strong>${values[index]}</strong><em>${modifierLabel}</em></article>`;
  }).join("");
  return `<div class="stat-radar" role="img" aria-label="Pentagrama de habilidades: ${ATTRIBUTE_DEFINITIONS.map((definition, index) => `${definition.label} ${values[index]}`).join(", ")}"><svg viewBox="45 23 230 244" aria-hidden="true"><g class="radar-grid">${grid}${axes}</g><polygon class="radar-area" points="${areaPoints.join(" ")}"/>${areaPoints.map((point) => `<circle class="radar-dot" cx="${point.split(",")[0]}" cy="${point.split(",")[1]}" r="3.5"/>`).join("")}${axisLabels}</svg></div><div class="stat-readouts">${readouts}</div>`;
}

export function createDojoView(deps) {
  let currentState = null;
  let renderModel = null;
  const techniquePanel = createDojoTechniques(deps);

  return {
    id: "dojo",

    render(state) {
      currentState = state;
      const { save } = state;
      const stats = deps.derivedStats(save);
      const { progression, character } = save;
      const elementRank = save.campaign.elementRank;
      const affinities = character.affinities;
      const activeAffinitySlots = deps.availableAffinitySlots(progression.level, elementRank, save.inventory.extraAffinityUnlocked, save.campaign.rank);
      const currentMasterId = deps.masterIdForCharacter(character);
      const masterSelectionUnlocked = campaignFlag(save, "masterSelectionUnlocked");
      const masters = MASTER_DEFINITIONS.map((definition) => ({ ...definition, npc: deps.npcs[definition.npcId] }));
      const masterCards = masters.map(({ id, npc, advantage, detail }) => `<button class="master-option ${currentMasterId === id ? "selected" : ""}" type="button" data-master="${id}" ${masterSelectionUnlocked ? "" : "disabled"}><img src="${npc.image}?v=${deps.assetVersion}" alt="" width="1145" height="1374"><span><strong>${npc.name}</strong><small>${advantage}</small><em>${detail}</em></span><b>${currentMasterId === id ? "MAESTRO ACTUAL" : masterSelectionUnlocked ? "ELEGIR" : "BLOQUEADO"}</b></button>`).join("");
      const currentMaster = masters.find(({ id }) => id === currentMasterId) || masters[0];
      const masterSummary = `<button class="master-summary-card" type="button" data-open-master aria-haspopup="dialog"><img src="${currentMaster.npc.image}?v=${deps.assetVersion}" alt="" width="1145" height="1374"><span><small>MAESTRO ACTUAL</small><strong>${currentMaster.npc.name}</strong><span class="master-role">${currentMaster.npc.title}</span><em>${currentMaster.advantage}</em><p>${currentMaster.detail}</p></span><b>${masterSelectionUnlocked ? "CAMBIAR" : "VER MAESTROS"} ›</b></button>`;
      const affinitySlots = Array.from({ length: 3 }, (_, index) => {
        const slotRank = index + 1;
        const id = affinities[index];
        const slotConfig = deps.affinityConfig.slots[index];
        const unlocked = activeAffinitySlots >= slotRank;
        if (!unlocked) {
          const scrolls = countItem(save, "affinity_scroll");
          if (slotRank === 3 && scrolls && !affinityScrollRequirement(save)) return `<button class="affinity-slot unlockable" type="button" data-dojo-affinity-scroll aria-haspopup="dialog"><span class="slot-index">3</span><span><strong>Desbloquear tercera afinidad</strong><small>Usar pergamino de afinidad · Tienes ${scrolls}</small></span><span class="slot-lock" aria-hidden="true">+</span></button>`;
          return `<div class="affinity-slot locked"><span class="slot-index">${slotRank}</span><span><strong>Ranura bloqueada</strong><small>${slotRank === 3 ? affinityScrollRequirement(save) || (scrolls ? "Usa tu pergamino de afinidad" : "Consigue un pergamino de afinidad en la tienda") : `Nivel ${slotConfig.level} y rango de historia ${slotConfig.storyRank}`}</small></span><span class="slot-lock" aria-hidden="true">⌾</span></div>`;
        }
        if (!id) {
          const choices = character.knownAffinities.filter((known) => !affinities.includes(known)).map((known) => `<button type="button" data-affinity-choice="${known}"><img src="${deps.elementIcon(known)}" alt="" width="512" height="512">${deps.elementName(known)}</button>`).join("");
          return `<div class="affinity-slot empty"><span class="slot-index">${slotRank}</span><span><strong>Elige afinidad</strong><small>${choices ? "El orden define su peso" : "Aprende otra afinidad durante la historia"}</small>${choices ? `<span class="affinity-slot-choices">${choices}</span>` : ""}</span></div>`;
        }
        return `<div class="affinity-slot selected"><span class="slot-index">${slotRank}</span><img src="${deps.elementIcon(id)}" alt="" width="512" height="512"><span><strong>${deps.elementName(id)}</strong><small>${character.affinityXp[id]} PX de afinidad</small></span><span class="slot-lock" title="Solo puede cambiarse con un objeto especial" aria-hidden="true">⌾</span></div>`;
      }).join("");
      const techniqueMarkup = techniquePanel.render(save);
      const gearIcons = { weapon: "⚔", seal: "◈", accessory: "◇", companion: "♟" };
      const gearTitles = { weapon: "Arma", seal: "Sello", accessory: "Accesorio", companion: "Compañero" };
      const gearSlotState = (type, source = save) => {
        const id = source.equipment[type];
        const item = deps.equipment[type].find((entry) => entry.id === id);
        return { id, item };
      };
      const gearSlotContents = (type, source = save) => {
        const { item } = gearSlotState(type, source);
        return `<span class="gear-icon" aria-hidden="true">${item?.image ? `<img src="${item.image}" alt="" width="36" height="36">` : gearIcons[type]}</span><span class="gear-copy"><small>${gearTitles[type]}</small><strong>${item?.name || "Nada equipado"}</strong><em>${item?.description || (type === "companion" ? "Consigue invocaciones mediante contratos" : "Pulsa para equipar")}</em></span><span class="gear-action" aria-hidden="true">+</span>`;
      };
      const equipmentSlot = (type) => {
        const { id, item } = gearSlotState(type);
        return `<button class="gear-slot ${id ? "equipped" : "empty"}" type="button" data-gear-slot="${type}" aria-label="${gearTitles[type]}: ${item?.name || "nada equipado"}">${gearSlotContents(type)}</button>`;
      };

      const attributeMarkup = (source = save) => attributeDistributionMarkup(deps.derivedStats(source), source.progression.attributes, source.progression.attributePoints, deps.attributeTrainingLimit(source.progression.level));
      const radarMarkup = (source = save) => statRadarMarkup(deps.derivedStats(source));
      const characterPreviewMarkup = (source = save) => rasterCharacterPreviewMarkup(source, deps.assetVersion);
      renderModel = { gearIcons, gearTitles, gearSlotState, gearSlotContents, attributeMarkup, radarMarkup, characterPreviewMarkup };
      const preview = (className = "") => `<div class="character-preview ${className}" data-raster-character-preview>${characterPreviewMarkup()}</div>`;
      const cosmeticControls = appearanceControlsMarkup(save);
      const xpForNext = deps.xpForNextLevel(progression.level);
      return `<div class="dojo-layout dojo-rework">
        <header class="dojo-topbar"><div class="dojo-title"><span class="dojo-title-mark" aria-hidden="true">✦</span><div><p class="eyebrow">CONFIGURACIÓN DE COMBATE</p><h2>${deps.elementRankLabels[elementRank]}</h2><small>Personaliza tus técnicas, mejora tus atributos y forja tu estilo de combate.</small></div></div><div class="dojo-level"><strong>NIVEL ${progression.level}</strong><span>${progression.xp}/${xpForNext} PX</span><i><b style="width:${Math.min(100, progression.xp / xpForNext * 100)}%"></b></i></div><nav class="dojo-tabs" role="tablist" aria-label="Secciones de configuración"><button type="button" role="tab" data-dojo-tab="equipment" aria-controls="dojo-panel-equipment">♧ <span>Equipo</span></button><button type="button" role="tab" data-dojo-tab="techniques" aria-controls="dojo-panel-techniques">⚔ <span>Técnicas</span></button><button type="button" role="tab" data-dojo-tab="statistics" aria-controls="dojo-panel-statistics">⌁ <span>Estadísticas</span></button><button type="button" role="tab" data-dojo-tab="appearance" aria-controls="dojo-panel-appearance">◈ <span>Apariencia</span></button></nav></header>
        <section class="dojo-main-panel"><div id="dojo-panel-equipment" class="dojo-tab-panel" role="tabpanel" data-dojo-panel="equipment"><div class="equipment-columns"><section class="dojo-section equipment-column affinity-column"><div class="dojo-section-heading"><div><h3>Afinidades</h3><p>Dos afinidades por progreso; la tercera con pergamino.</p></div><span>${affinities.length}/${activeAffinitySlots}</span></div><div class="affinity-slots">${affinitySlots}</div><p class="affinity-change-note">⌾ Principal 100 % · Secundaria 50 % · Tercera 25 %.</p></section><section class="dojo-section equipment-column loadout-column"><div class="dojo-section-heading"><div><h3>Equipamiento</h3><p>Configura tus recursos de combate.</p></div></div><div class="equipment-grid">${equipmentSlot("weapon")}${equipmentSlot("seal")}${equipmentSlot("accessory")}${equipmentSlot("companion")}</div></section><section class="dojo-section equipment-column master-column"><div class="dojo-section-heading"><div><h3>Maestro</h3><p>Ventaja pasiva para tu estilo de combate.</p></div></div>${masterSummary}</section></div></div>
        <div id="dojo-panel-techniques" class="dojo-tab-panel" role="tabpanel" data-dojo-panel="techniques">${techniqueMarkup}</div>
        <div id="dojo-panel-statistics" class="dojo-tab-panel" role="tabpanel" data-dojo-panel="statistics"><section class="dojo-attributes"><header><p class="eyebrow">DISTRIBUCIÓN DE PUNTOS DE ESTADÍSTICAS</p><div class="dojo-attribute-actions"><strong><b data-attribute-points>${progression.attributePoints}</b> PUNTOS DISPONIBLES</strong></div></header><div class="statistics-layout">${preview("statistics-character-preview")}<div class="statistics-content"><div class="attribute-distribution-wrap">${attributeMarkup()}</div><section class="statistics-radar-card"><div class="stat-radar-wrap" data-stat-radar>${radarMarkup()}</div></section></div></div></section></div>
          <div id="dojo-panel-appearance" class="dojo-tab-panel" role="tabpanel" data-dojo-panel="appearance"><section class="appearance-panel xenoverse-appearance"><div class="dojo-section-heading"><div><h3>Personalizar apariencia</h3></div></div><div class="appearance-customizer">${preview()}<div class="cosmetic-menu" aria-label="Opciones de apariencia">${cosmeticControls}</div></div></section></div><p id="dojo-message" class="dojo-message" aria-live="polite">Los cambios se guardan automáticamente.</p>
        </section>
      </div><div class="equipment-modal" role="dialog" aria-modal="true" aria-labelledby="equipment-modal-title" hidden><div class="equipment-modal-card"><div class="equipment-modal-heading"><div><p class="eyebrow">INVENTARIO</p><h2 id="equipment-modal-title">Elegir equipo</h2></div><button type="button" data-close-equipment aria-label="Cerrar">×</button></div><div class="equipment-modal-options"></div></div></div><div class="equipment-modal master-modal" role="dialog" aria-modal="true" aria-labelledby="master-modal-title" hidden><div class="equipment-modal-card master-modal-card"><div class="equipment-modal-heading"><div><p class="eyebrow">ENTRENAMIENTO</p><h2 id="master-modal-title">Elegir maestro</h2></div><button type="button" data-close-master aria-label="Cerrar selector de maestros">×</button></div><p class="master-modal-note">${masterSelectionUnlocked ? "Elige el maestro cuya ventaja complemente mejor tu estilo." : "Completa la saga 1 para cambiar de maestro. Puedes consultar sus ventajas desde ahora."}</p><div class="master-modal-options">${masterCards}</div></div></div>`;
    },

    mount(root, scope) {
      if (!currentState || !renderModel) return;
      const getSave = () => currentState.save;
      mountDojoAffinityScroll(root, scope, { getSave, persist: deps.onPersist, rerender: deps.onRerender });
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
        const radar = root.querySelector("[data-stat-radar]");
        if (radar) radar.innerHTML = renderModel.radarMarkup(save);
        const levelBar = root.querySelector(".dojo-level i b");
        if (levelBar) levelBar.style.width = `${Math.min(100, save.progression.xp / deps.xpForNextLevel(save.progression.level) * 100)}%`;
        root.querySelectorAll("[data-raster-character-preview]").forEach((preview) => {
          preview.innerHTML = renderModel.characterPreviewMarkup(save);
        });
        root.querySelectorAll("[data-gear-slot]").forEach((button) => {
          const type = button.dataset.gearSlot;
          const { id, item, unavailable } = renderModel.gearSlotState(type, save);
          button.className = `gear-slot ${id ? "equipped" : "empty"} ${unavailable ? "locked" : ""}`;
          button.disabled = unavailable;
          button.setAttribute("aria-label", `${renderModel.gearTitles[type]}: ${item?.name || "nada equipado"}`);
          button.innerHTML = renderModel.gearSlotContents(type, save);
        });
        refreshDojoAppearance(root, save);
        techniquePanel.refresh(save);
      };
      techniquePanel.mount(root.querySelector("#dojo-panel-techniques"), scope, { getSave, onPersist: persistDojo });
      root.querySelectorAll("[data-dojo-tab]").forEach((button) => {
        scope.listen(button, "click", () => selectDojoTab(button.dataset.dojoTab));
        scope.listen(button, "keydown", (event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          const tabs = ["equipment", "techniques", "statistics", "appearance"];
          const direction = event.key === "ArrowRight" ? 1 : -1;
          const next = (tabs.indexOf(currentState.activeDojoTab) + direction + tabs.length) % tabs.length;
          selectDojoTab(tabs[next], true);
        });
      });
      selectDojoTab(currentState.activeDojoTab);
      scope.listen(root.querySelector(".dojo-attributes"), "click", (event) => {
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
        const options = [{ id: "", name: "Nada", description: "Dejar esta ranura vacía" }, ...deps.equipment[type].filter(item => countItem(save, item.id) > 0)];
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
          const result = equipItem(getSave(), option.dataset.equipmentType, option.dataset.equipmentId || null);
          if (result.ok) persistDojo(result.save);
          closeEquipmentModal();
        } else if (event.target === equipmentModal) closeEquipmentModal();
      });
      const masterModal = root.querySelector(".master-modal");
      const masterTrigger = root.querySelector("[data-open-master]");
      let masterReturnScroll = 0;
      const closeMasterModal = () => {
        masterModal.hidden = true;
        masterTrigger?.focus({ preventScroll: true });
        if (stageOptions) stageOptions.scrollTop = masterReturnScroll;
      };
      const openMasterModal = () => {
        masterReturnScroll = stageOptions?.scrollTop || 0;
        masterModal.hidden = false;
        masterModal.querySelector("[data-master]:not([disabled]), [data-close-master]")?.focus();
      };
      scope.listen(masterTrigger, "click", openMasterModal);
      scope.listen(root.querySelector("[data-close-master]"), "click", closeMasterModal);
      scope.listen(masterModal, "click", (event) => {
        if (event.target === masterModal) closeMasterModal();
      });
      mountDojoAppearance(root, scope, { getSave, persist: persistDojo });
      root.querySelectorAll("[data-master]").forEach((button) => scope.listen(button, "click", () => {
        if (!campaignFlag(getSave(), "masterSelectionUnlocked")) return;
        currentState.save = deps.onPersist(deps.selectMaster(getSave(), button.dataset.master));
        deps.onRerender();
      }));

    },

    dispose() { currentState = null; renderModel = null; techniquePanel.dispose(); }
  };
}
import { campaignFlag } from "../../../mission-system.js?v=0.114.0";

