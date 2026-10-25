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

const COSMETIC_DEFINITIONS = Object.freeze([
  { key: "face", label: "Rostro", values: [1, 2, 3], disabled: true },
  { key: "hair", label: "Cabello", values: [0, 1, 4], names: ["Sin cabello", "Corto", "Coleta"] },
  { key: "top", label: "Parte superior", values: [1, 2, 3], disabled: true },
  { key: "bottom", label: "Parte inferior", values: [1, 2, 3], disabled: true },
  { key: "shoes", label: "Calzado", values: [1, 2], disabled: true },
  { key: "outfit", label: "Traje", values: [], locked: true, detail: "No hay trajes completos disponibles" }
]);

const variantNumber = (value) => String(Number(value) || 1).padStart(2, "0");
const cosmeticIndex = (definition, current) => Math.max(0, definition.values.indexOf(Number(current)));

function cosmeticControlMarkup(definition, current) {
  if (definition.locked) {
    return `<button class="cosmetic-control cosmetic-outfit-control unavailable" type="button" data-cosmetic-control="${definition.key}" disabled aria-label="${definition.label}: bloqueado. ${definition.detail}"><span class="cosmetic-label">${definition.label}</span><span class="cosmetic-lock-state"><b aria-hidden="true">⌾</b> BLOQUEADO</span><small data-cosmetic-detail="${definition.key}">${definition.detail}</small></button>`;
  }
  const index = cosmeticIndex(definition, current);
  const detail = definition.disabled ? definition.detail || "Gráfico compatible pendiente" : definition.names[index];
  return `<div class="cosmetic-control ${definition.disabled ? "unavailable" : ""}" data-cosmetic-control="${definition.key}"><span class="cosmetic-label">${definition.label}</span><div class="cosmetic-stepper"><button type="button" data-cosmetic-step="${definition.key}" data-direction="-1" aria-label="${definition.label} anterior" ${definition.disabled ? "disabled" : ""}>‹</button><output data-cosmetic-value="${definition.key}">TIPO ${variantNumber(index + 1)}</output><button type="button" data-cosmetic-step="${definition.key}" data-direction="1" aria-label="${definition.label} siguiente" ${definition.disabled ? "disabled" : ""}>›</button></div><small data-cosmetic-detail="${definition.key}">${detail}</small></div>`;
}

const PUPPET_PREVIEW_LAYERS = Object.freeze([
  { id: "pie_derecho", x: -175.526, y: 732.316, width: 146, height: 136 },
  { id: "brazo_izquierdo", asset: "brazo_derecho", x: 161.481, y: -174.474, width: 228, height: 290 },
  { id: "mano_derecha", x: -291.203, y: 251.237, width: 146, height: 187 },
  { id: "muslo_izquierdo", x: 117.315, y: 255.895, width: 264, height: 332 },
  { id: "torso", x: -41, y: -72.5, width: 372, height: 577 },
  { id: "muslo_derecho", x: -93.789, y: 261.869, width: 198, height: 351 },
  { id: "pie_izquierdo", x: 153.763, y: 715.421, width: 219, height: 132 },
  { id: "pierna_derecha", x: -140.026, y: 527.974, width: 157, height: 297 },
  { id: "pierna_izquierda", x: 151.263, y: 520.474, width: 254, height: 336 },
  { id: "brazo_derecho", asset: "brazo_izquierdo", x: -242.955, y: -164.184, width: 228, height: 321 },
  { id: "antebrazo_derecho", x: -315.639, y: 62.658, width: 126, height: 239 },
  { id: "antebrazo_izquierdo", x: 278.403, y: 24.447, width: 197, height: 239 },
  { id: "mano_izquierda", x: 355.423, y: 215.474, width: 115, height: 188 },
  { id: "cabeza", x: -10.737, y: -498.684, width: 260, height: 392 }
]);
const FEMALE_PUPPET_PREVIEW_LAYERS = Object.freeze([
  { id: "brazo_izquierdo", asset: "antebrazo_izquierdo", x: 137.717778, y: -155.855556, width: 184.8, height: 256.96 },
  { id: "antebrazo_izquierdo", asset: "brazo_izquierdo", x: 228.835556, y: 13.19, width: 165.44, height: 203.28 },
  { id: "mano_izquierda", x: 304.218889, y: 166.491111, width: 102.96, height: 165.44 },
  { id: "muslo_izquierdo", x: 69.366667, y: 227.555556, width: 166.32, height: 310.64 },
  { id: "pierna_izquierda", x: 80.96, y: 460.936667, width: 130.24, height: 220 },
  { id: "pie_izquierdo", x: 130.68, y: 613.31, width: 192.72, height: 157.52 },
  { id: "torso", x: -22, y: -56.32, width: 320.32, height: 542.08 },
  { id: "muslo_derecho", x: -87.894444, y: 231.515556, width: 175.12, height: 318.56 },
  { id: "pierna_derecha", x: -119.325556, y: 466.704444, width: 139.04, height: 220.88 },
  { id: "pie_derecho", x: -147.533333, y: 616.533333, width: 130.24, height: 147.84 },
  { id: "brazo_derecho", asset: "antebrazo_derecho", x: -186.5, y: -143.822222, width: 193.6, height: 274.56, restRotation: -12 },
  { id: "antebrazo_derecho", asset: "brazo_derecho", x: -235.77, y: 62.231111, width: 102.96, height: 212.08, restRotation: 6 },
  { id: "mano_derecha", x: -234.603333, y: 213.724444, width: 129.36, height: 167.2, restRotation: 4 },
  { id: "cabeza", x: -3.96, y: -443.06, width: 229.68, height: 345.84 }
]);
function rasterCharacterPreviewMarkup(save, assetVersion) {
  const female = save.character.bodyType === "female";
  const puppetLayers = female ? FEMALE_PUPPET_PREVIEW_LAYERS : PUPPET_PREVIEW_LAYERS;
  const puppetRoot = female ? "woman_sprites" : "man_sprites";
  const hair = Number(save.character.hair) === 4
    ? { asset: "hair_coleta", x: female ? -46.43144 : -59, y: female ? -497.89808 : -561, width: female ? 344.96 : 392, height: female ? 276.32 : 314, version: "0.79.0" }
    : Number(save.character.hair) === 1
      ? { asset: "hair_corto", x: female ? -17.39144 : -26, y: female ? -521.65808 : -588, width: female ? 259.6 : 295, height: female ? 201.52 : 229, version: "0.101.0" }
      : null;
  const layer = ({ id, asset = id, x, y, width, height, restRotation = 0 }, index) => `<img class="puppet-preview-layer" src="assets/modular/${puppetRoot}/runtime/${asset}.png?v=${assetVersion}" alt="" width="${width}" height="${height}" draggable="false" style="--puppet-x:${((550 + x) / 11).toFixed(3)}%;--puppet-y:${((800 + y) / 16).toFixed(3)}%;--puppet-w:${(width / 11).toFixed(3)}%;--puppet-h:${(height / 16).toFixed(3)}%;--puppet-z:${index};--puppet-rotation:${restRotation}deg">`;
  const hairLayer = hair ? `<img class="puppet-preview-layer puppet-preview-hair" src="assets/modular/hair/${hair.asset}.png?v=${hair.version}" alt="" width="${hair.width}" height="${hair.height}" draggable="false" style="--puppet-x:${((550 + hair.x) / 11).toFixed(3)}%;--puppet-y:${((800 + hair.y) / 16).toFixed(3)}%;--puppet-w:${(hair.width / 11).toFixed(3)}%;--puppet-h:${(hair.height / 16).toFixed(3)}%;--puppet-z:${puppetLayers.length}">` : "";
  return `<div class="raster-character-stage" role="img" aria-label="Marioneta del combatiente usada en combate"><div class="raster-character-aura" aria-hidden="true"></div><div class="puppet-preview-rig">${puppetLayers.map(layer).join("")}${hairLayer}</div></div>`;
}

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
      const masters = MASTER_DEFINITIONS.map((definition) => ({ ...definition, npc: deps.npcs[definition.npcId] }));
      const masterCards = masters.map(({ id, npc, advantage, detail }) => `<button class="master-option ${currentMasterId === id ? "selected" : ""}" type="button" data-master="${id}" ${masterSelectionUnlocked ? "" : "disabled"}><img src="${npc.image}?v=${deps.assetVersion}" alt="" width="1145" height="1374"><span><strong>${npc.name}</strong><small>${advantage}</small><em>${detail}</em></span><b>${currentMasterId === id ? "MAESTRO ACTUAL" : masterSelectionUnlocked ? "ELEGIR" : "BLOQUEADO"}</b></button>`).join("");
      const currentMaster = masters.find(({ id }) => id === currentMasterId) || masters[0];
      const masterSummary = `<button class="master-summary-card" type="button" data-open-master aria-haspopup="dialog"><img src="${currentMaster.npc.image}?v=${deps.assetVersion}" alt="" width="1145" height="1374"><span><small>MAESTRO ACTUAL</small><strong>${currentMaster.npc.name}</strong><span class="master-role">${currentMaster.npc.title}</span><em>${currentMaster.advantage}</em><p>${currentMaster.detail}</p></span><b>${masterSelectionUnlocked ? "CAMBIAR" : "VER MAESTROS"} ›</b></button>`;
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
          return `<button class="skill-node ${unlocked ? "available" : "locked"} ${selectedTechniqueId === jutsu.id ? "focused" : ""} ${selected ? "equipped" : ""}" type="button" data-skill-select="${jutsu.id}" aria-pressed="${selected}" style="--branch-color:${branchColor}"><span class="skill-step">${index + 1}</span><span class="skill-copy"><strong>${jutsu.name}</strong><small>${jutsu.cost} CH · ${jutsu.damage} daño</small></span><span class="skill-state">${selected ? "✓ DESEQUIPAR" : unlocked ? "＋ EQUIPAR" : `🔒 ${lockReason}`}</span></button>`;
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
      const companionSlot = `<button class="gear-slot companion-slot locked" type="button" disabled aria-label="Compañero: ranura bloqueada"><span class="gear-icon" aria-hidden="true">♟</span><span class="gear-copy"><small>Compañero</small><strong>Ranura bloqueada</strong><em>Se desbloqueará al avanzar en la historia.</em></span><span class="gear-action" aria-hidden="true">⌾</span></button>`;
      const attributeMarkup = (source = save) => attributeDistributionMarkup(deps.derivedStats(source), source.progression.attributes, source.progression.attributePoints);
      const radarMarkup = (source = save) => statRadarMarkup(deps.derivedStats(source));
      const characterPreviewMarkup = (source = save) => rasterCharacterPreviewMarkup(source, deps.assetVersion);
      renderModel = { gearIcons, gearTitles, gearSlotState, gearSlotContents, techniqueCapacity, techniqueDetailMarkup, attributeMarkup, radarMarkup, characterPreviewMarkup };
      const preview = (className = "") => `<div class="character-preview ${className}" data-raster-character-preview>${characterPreviewMarkup()}</div>`;
      const cosmeticControls = COSMETIC_DEFINITIONS.map((definition) => cosmeticControlMarkup(definition, character[definition.key])).join("");
      const xpForNext = deps.xpForNextLevel(progression.level);
      return `<div class="dojo-layout dojo-rework">
        <header class="dojo-topbar"><div class="dojo-title"><span class="dojo-title-mark" aria-hidden="true">✦</span><div><p class="eyebrow">CONFIGURACIÓN DE COMBATE</p><h2>${deps.elementRankLabels[elementRank]}</h2><small>Personaliza tus técnicas, mejora tus atributos y forja tu estilo de combate.</small></div></div><div class="dojo-level"><strong>NIVEL ${progression.level}</strong><span>${progression.xp}/${xpForNext} PX</span><i><b style="width:${Math.min(100, progression.xp / xpForNext * 100)}%"></b></i></div><nav class="dojo-tabs" role="tablist" aria-label="Secciones de configuración"><button type="button" role="tab" data-dojo-tab="equipment" aria-controls="dojo-panel-equipment">♧ <span>Equipo</span></button><button type="button" role="tab" data-dojo-tab="techniques" aria-controls="dojo-panel-techniques">⚔ <span>Técnicas</span></button><button type="button" role="tab" data-dojo-tab="statistics" aria-controls="dojo-panel-statistics">⌁ <span>Estadísticas</span></button><button type="button" role="tab" data-dojo-tab="appearance" aria-controls="dojo-panel-appearance">◈ <span>Apariencia</span></button></nav></header>
        <section class="dojo-main-panel"><div id="dojo-panel-equipment" class="dojo-tab-panel" role="tabpanel" data-dojo-panel="equipment"><div class="equipment-columns"><section class="dojo-section equipment-column affinity-column"><div class="dojo-section-heading"><div><h3>Afinidades</h3><p>Tres espacios que crecen con tu nivel y rango.</p></div><span>${affinities.length}/${activeAffinitySlots}</span></div><div class="affinity-slots">${affinitySlots}</div><p class="affinity-change-note">⌾ Principal 100 % · Secundaria 50 % · Tercera 25 %.</p></section><section class="dojo-section equipment-column loadout-column"><div class="dojo-section-heading"><div><h3>Equipamiento</h3><p>Configura tus recursos de combate.</p></div></div><div class="equipment-grid">${equipmentSlot("weapon")}${equipmentSlot("accessory")}${companionSlot}</div></section><section class="dojo-section equipment-column master-column"><div class="dojo-section-heading"><div><h3>Maestro</h3><p>Ventaja pasiva para tu estilo de combate.</p></div></div>${masterSummary}</section></div></div>
        <div id="dojo-panel-techniques" class="dojo-tab-panel" role="tabpanel" data-dojo-panel="techniques"><div class="dojo-technique-layout"><section class="technique-detail-wrap" aria-label="Detalle de técnica" data-technique-detail>${techniqueDetailMarkup(deps.jutsus.find((jutsu) => jutsu.id === selectedTechniqueId))}</section><section class="skill-tree" aria-label="Árbol de habilidades por afinidad"><div class="skill-tree-heading"><div><h3>ÁRBOL DE HABILIDADES</h3><p>El dominio y la experiencia desbloquean nuevas técnicas.</p></div><div class="tree-status"><strong class="dojo-equipped-count" data-equipped-count>${save.loadout.length}/${techniqueCapacity} TÉCNICAS</strong><span class="tree-legend"><i></i> Equipada <i></i> Aprendida <i></i> Bloqueada</span></div></div><div class="skill-branches">${skillBranches}</div></section></div></div>
        <div id="dojo-panel-statistics" class="dojo-tab-panel" role="tabpanel" data-dojo-panel="statistics"><section class="dojo-attributes"><header><p class="eyebrow">DISTRIBUCIÓN DE PUNTOS DE ESTADÍSTICAS</p><div class="dojo-attribute-actions"><strong><b data-attribute-points>${progression.attributePoints}</b> PUNTOS DISPONIBLES</strong></div></header><div class="statistics-layout">${preview("statistics-character-preview")}<div class="statistics-content"><div class="attribute-distribution-wrap">${attributeMarkup()}</div><section class="statistics-radar-card"><div class="stat-radar-wrap" data-stat-radar>${radarMarkup()}</div></section></div></div></section></div>
          <div id="dojo-panel-appearance" class="dojo-tab-panel" role="tabpanel" data-dojo-panel="appearance"><section class="appearance-panel xenoverse-appearance"><div class="dojo-section-heading"><div><h3>Personalizar apariencia</h3></div></div><div class="appearance-customizer">${preview()}<div class="cosmetic-menu" aria-label="Opciones de apariencia">${cosmeticControls}</div></div></section></div><p id="dojo-message" class="dojo-message" aria-live="polite">Los cambios se guardan automáticamente.</p>
        </section>
      </div><div class="equipment-modal" role="dialog" aria-modal="true" aria-labelledby="equipment-modal-title" hidden><div class="equipment-modal-card"><div class="equipment-modal-heading"><div><p class="eyebrow">INVENTARIO</p><h2 id="equipment-modal-title">Elegir equipo</h2></div><button type="button" data-close-equipment aria-label="Cerrar">×</button></div><div class="equipment-modal-options"></div></div></div><div class="equipment-modal master-modal" role="dialog" aria-modal="true" aria-labelledby="master-modal-title" hidden><div class="equipment-modal-card master-modal-card"><div class="equipment-modal-heading"><div><p class="eyebrow">ENTRENAMIENTO</p><h2 id="master-modal-title">Elegir maestro</h2></div><button type="button" data-close-master aria-label="Cerrar selector de maestros">×</button></div><p class="master-modal-note">${masterSelectionUnlocked ? "Elige el maestro cuya ventaja complemente mejor tu estilo." : "Completa la saga 1 para cambiar de maestro. Puedes consultar sus ventajas desde ahora."}</p><div class="master-modal-options">${masterCards}</div></div></div>`;
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
        COSMETIC_DEFINITIONS.forEach((definition) => {
          const index = cosmeticIndex(definition, save.character[definition.key]);
          const output = root.querySelector(`[data-cosmetic-value="${definition.key}"]`);
          const detail = root.querySelector(`[data-cosmetic-detail="${definition.key}"]`);
          if (output) output.textContent = `TIPO ${variantNumber(index + 1)}`;
          if (detail) detail.textContent = definition.locked ? definition.detail : definition.disabled ? definition.detail || "Gráfico compatible pendiente" : definition.names[index];
        });
        root.querySelectorAll("[data-skill-select]").forEach((node) => {
          const selected = node.dataset.skillSelect === selectedTechniqueId;
          const equipped = save.loadout.includes(node.dataset.skillSelect);
          node.classList.toggle("focused", selected);
          node.classList.toggle("equipped", equipped);
          node.setAttribute("aria-pressed", String(equipped));
          const status = node.querySelector(".skill-state");
          const jutsu = deps.jutsus.find((entry) => entry.id === node.dataset.skillSelect);
          if (status && jutsu && deps.isTechniqueLearned(save, jutsu)) status.textContent = equipped ? "✓ DESEQUIPAR" : "＋ EQUIPAR";
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
      scope.listen(root.querySelector(".cosmetic-menu"), "click", (event) => {
        const button = event.target.closest("[data-cosmetic-step]");
        if (!button) return;
        const definition = COSMETIC_DEFINITIONS.find(({ key }) => key === button.dataset.cosmeticStep);
        if (!definition || definition.disabled) return;
        const currentIndex = cosmeticIndex(definition, getSave().character[definition.key]);
        const direction = Number(button.dataset.direction) < 0 ? -1 : 1;
        const nextIndex = (currentIndex + direction + definition.values.length) % definition.values.length;
        getSave().character[definition.key] = definition.values[nextIndex];
        persistDojo(getSave());
        const message = root.querySelector("#dojo-message");
        if (message) message.textContent = `${definition.label}: tipo ${variantNumber(nextIndex + 1)}. Cambio guardado.`;
      });
      root.querySelectorAll("[data-master]").forEach((button) => scope.listen(button, "click", () => {
        if (!campaignFlag(getSave(), "masterSelectionUnlocked")) return;
        currentState.save = deps.onPersist(deps.selectMaster(getSave(), button.dataset.master));
        deps.onRerender();
      }));
      const toggleTechnique = (id) => {
        const jutsu = deps.jutsus.find((entry) => entry.id === id);
        if (!jutsu || !deps.isTechniqueLearned(getSave(), jutsu)) return;
        const save = getSave();
        const message = root.querySelector("#dojo-message");
        const equipped = save.loadout.includes(id);
        if (!equipped && save.loadout.length >= renderModel.techniqueCapacity) {
          if (message) message.textContent = `Tu nivel permite preparar ${renderModel.techniqueCapacity} técnicas.`;
          return;
        }
        save.loadout = equipped ? save.loadout.filter((entry) => entry !== id) : [...save.loadout, id];
        persistDojo(save);
        if (message) message.textContent = equipped ? "Técnica desequipada." : "Técnica equipada.";
      };
      scope.listen(root.querySelector(".skill-tree"), "click", (event) => {
        const node = event.target.closest("[data-skill-select]");
        if (!node) return;
        selectedTechniqueId = node.dataset.skillSelect;
        const detail = root.querySelector("[data-technique-detail]");
        if (detail) detail.innerHTML = renderModel.techniqueDetailMarkup(deps.jutsus.find((jutsu) => jutsu.id === selectedTechniqueId), getSave());
        root.querySelectorAll("[data-skill-select]").forEach((entry) => {
          const selected = entry === node;
          entry.classList.toggle("focused", selected);
        });
        toggleTechnique(selectedTechniqueId);
      });
      scope.listen(root.querySelector("[data-technique-detail]"), "click", (event) => {
        const button = event.target.closest("[data-technique-toggle]");
        if (button) toggleTechnique(button.dataset.techniqueToggle);
      });
    },

    dispose() { currentState = null; renderModel = null; }
  };
}
import { campaignFlag } from "../../../mission-system.js?v=0.67.0";

