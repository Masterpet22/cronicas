import { characterResonanceSymbol } from "../../skills/character-symbol.js?v=1.0.0";
import { PHYSICAL_COLOR, SKILLS_BY_ID, TAIJUTSU_ACTIONS, TAIJUTSUS_BY_ID, effectText } from "../../skills/definitions.js?v=1.4.0";
import { ENEMY_EXCLUSIVE_ABILITIES, SEALS } from "../../data.js?v=1.5.0";
import { SEAL_ATLAS } from "../../seal-atlas.js?v=1.0.0";
import { ELEMENT_SEQUENCE_IDS } from "../../battle/technique-sequences.js?v=1.1.0";
import { techniqueAtLevel } from "../../skills/technique-mastery.js?v=1.0.0";
import { loadPhaser } from "../../battle/load-phaser.js?v=1.0.0";
import { actionChakraCost } from "../../chakra-balance.js?v=1.0.0";
import { initiativeLabel } from "../../battle/initiative.js?v=1.0.0";
import { investResonance, resonancePoints, skillLevel, skillRequirements, skillState, prerequisiteEntries, skillTreeNodes, upgradedTechnique } from "../../skills/progression.js?v=1.0.0";
import { mountResonanceNavigation, resonanceTreeMarkup, resonanceVisibleNodes, treeBounds } from "./resonance-tree.js?v=0.177.0";

import { equipTaijutsu, learnedTaijutsu, normalizeTaijutsuLoadout, taijutsuAction, unequipTaijutsu } from "../../skills/taijutsu.js?v=1.0.0";

export function createDojoTechniques(deps) {
  let selectedId = null;
  let treeView = null;
  let replacementId = null;
  let feedback = "";
  let view = "list";
  let showFuture = false;
  let preview = null;
  let host = null;
  let bindings = null;
  const escape = deps.escapeHtml;
  const technique = id => deps.jutsus.find(entry => entry.id === id);
  const extraTechniques = [
    ...deps.jutsus.filter(action => !SKILLS_BY_ID.has(action.id)),
    ...ENEMY_EXCLUSIVE_ABILITIES
  ];
  const elementalPreviews = ELEMENT_SEQUENCE_IDS.map(element => ({ id: element, element, name: deps.elementName(element) }));
  const extraActions = new Map([...extraTechniques, ...elementalPreviews].map(action => [action.id, action]));
  const elementArt = id => `<span class="element-composition" role="img" aria-label="${escape(deps.elementName(id))}: ${deps.basicRequirements(id).map(deps.elementName).join(" + ")}">${deps.elementIconParts(id).map(part => `<img src="${part.icon}" alt="" width="512" height="512" style="left:${part.x / 5.12}%;top:${part.y / 5.12}%;width:${part.size / 5.12}%;height:${part.size / 5.12}%">`).join("")}</span>`;
  const slotLevels = Array.from({ length: 4 }, (_, index) =>
    Array.from({ length: 100 }, (_, level) => level + 1).find(level => deps.loadoutSlotsForLevel(level) > index));

  function stateLabel(save, node, physicalSlots) {
    const elementalSlot = save.loadout.indexOf(node.id);
    const physicalSlot = physicalSlots.indexOf(node.id);
    if (elementalSlot >= 0) return `Equipada en ranura ${elementalSlot + 1}`;
    if (physicalSlot >= 0) return `Equipada en T${physicalSlot + 1}`;
    return { locked: "Bloqueada", available: "Disponible para aprender", unlocked: "Aprendida", upgraded: "Aprendida" }[skillState(save, node)];
  }

  function taijutsuLoadoutMarkup(save) {
    const slots = normalizeTaijutsuLoadout(save);
    return `<section class="taijutsu-loadout" aria-label="Taijutsus equipados"><header><h4>Taijutsus</h4><span data-taijutsu-count>${slots.filter(Boolean).length}/2 EQUIPADOS</span></header><div class="taijutsu-loadout-slots">${slots.map((id,index) => {
      const action = id && taijutsuAction(save,id);
      return `<article class="taijutsu-loadout-slot ${action ? "is-equipped" : "is-empty"}"><button type="button" data-taijutsu-choose="${index}" aria-label="${action ? `Consultar ${escape(action.name)}` : `Elegir taijutsu para ranura ${index+1}`}" title="${action ? `${escape(action.name)} · ${action.healthCost} PV` : "Desbloquea un taijutsu en la rama física y equípalo aquí"}"><small>TAIJUTSU ${index+1}</small><strong>${action ? escape(action.name) : "Elegir técnica"}</strong></button>${action ? `<button type="button" class="taijutsu-remove" data-taijutsu-remove="${index}" aria-label="Quitar ${escape(action.name)} de taijutsu ${index+1}">×</button>` : ""}</article>`;
    }).join("")}</div></section>`;
  }

  function loadoutMarkup(save) {
    const capacity = deps.loadoutSlotsForLevel(save.progression.level);
    const full = save.loadout.length >= capacity;
    const pending = technique(replacementId);
    const instruction = pending ? `Elige qué técnica reemplazar por ${pending.name}.` : feedback;
    const slots = slotLevels.map((level, index) => {
      if (index >= capacity) return `<div class="technique-loadout-slot is-locked" data-loadout-locked="${index + 1}"><small>RANURA ${index + 1} · BLOQUEADA</small><strong>Se abre al nivel ${level}</strong></div>`;
      const jutsu = technique(save.loadout[index]);
      if (!jutsu) return `<div class="technique-loadout-slot is-empty"><small>RANURA ${index + 1}</small><strong>Ranura libre</strong></div>`;
      return `<article class="technique-loadout-slot is-equipped ${pending ? "is-replacement" : ""}"><button type="button" ${pending ? `data-replace-slot="${index}" aria-label="Reemplazar ${escape(jutsu.name)} por ${escape(pending.name)}"` : `data-loadout-inspect="${jutsu.id}" aria-label="Consultar ${escape(jutsu.name)}, equipada en ranura ${index + 1}"`}><small>${pending ? "REEMPLAZAR" : `RANURA ${index + 1}`}</small><strong>${escape(jutsu.name)}</strong></button>${pending ? "" : `<button class="technique-loadout-remove" type="button" data-loadout-remove="${index}" aria-label="Quitar ${escape(jutsu.name)} del combate" title="Quitar del combate">×</button>`}</article>`;
    }).join("");
    return `<section class="technique-loadout ${pending ? "is-choosing" : ""}" aria-label="Técnicas equipadas para el combate"><header><div><h3>Ranuras elementales</h3><span class="technique-loadout-count ${full ? "is-full" : ""}" data-equipped-count>${save.loadout.length}/${capacity}</span></div></header>${instruction ? `<div class="technique-loadout-instruction"><p role="status" data-technique-feedback>${escape(instruction)}</p>${pending ? '<button type="button" data-cancel-replace>Cancelar cambio</button>' : ""}</div>` : ""}<div class="technique-loadout-slots">${slots}</div>${taijutsuLoadoutMarkup(save)}</section>`;
  }

  const nodesFor = skillTreeNodes;

  function listMarkup(save, nodes) {
    const physicalSlots = normalizeTaijutsuLoadout(save);
    const equippedIds = [...save.loadout, ...physicalSlots.filter(Boolean)];
    const ordered = [...equippedIds.map(id => nodes.find(node => node.id === id)).filter(Boolean),
      ...nodes.filter(node => !equippedIds.includes(node.id))];
    const groups = [
      { name: "Aprendidas", states: ["unlocked", "upgraded"] },
      { name: "Disponibles para aprender", states: ["available"] },
      { name: "Bloqueadas", states: ["locked"] }
    ];
    return `<div class="dojo-technique-list">${groups.map(({ name, states }) => {
      const entries = ordered.filter(node => states.includes(skillState(save, node)));
      if (!entries.length) return "";
      return `<section><h4>${name}</h4><ul>${entries.map(node => `<li><button type="button" data-technique-select="${node.id}" aria-pressed="${node.id === selectedId}"><strong>${escape(node.name)}</strong><small>${escape(stateLabel(save, node, physicalSlots))}${skillLevel(save, node) ? ` · Nivel ${skillLevel(save, node)}` : ""}</small></button></li>`).join("")}</ul></section>`;
    }).join("")}</div>`;
  }

  function techniquePreviewButton(actionId) {
    return `<button class="dojo-technique-play" type="button" data-play-technique="${actionId}">Ver técnica</button>`;
  }

  function techniquePreviewMarkup() {
    return `<figure class="dojo-technique-preview">
      <div class="dojo-technique-stage" data-technique-preview-stage aria-hidden="true"></div>
      <figcaption role="status" data-technique-preview-status></figcaption>
    </figure>`;
  }

  function techniqueSealsMarkup({ seals }) {
    if (!seals.length) return "";
    const { url, columns, rows } = SEAL_ATLAS;
    return `<ol class="dojo-technique-seals" role="list" aria-label="Secuencia de sellos" style="--dojo-seal-atlas:url('${url}');--dojo-seal-size:${columns * 100}% ${rows * 100}%">
      ${seals.map(id => {
        const { frame, key, label } = SEALS[id];
        const x = (frame % columns) * 100 / (columns - 1);
        const y = Math.floor(frame / columns) * 100 / (rows - 1);
        return `<li data-technique-seal="${id}">
          <span class="dojo-technique-seal-glyph" style="background-position:${x}% ${y}%" aria-hidden="true"></span>
          <span class="dojo-technique-seal-label"><kbd>${key}</kbd><span>${label}</span></span>
        </li>`;
      }).join("")}
    </ol>`;
  }

  function combatMetricsMarkup(action, costReduction = 0) {
    const turns = action.cooldown;
    const cost = action.type === "taijutsu" ? `${action.healthCost} PV` : `${actionChakraCost(action, costReduction)} CH`;
    return `<div class="technique-metrics"><div><strong>${action.damage}</strong><small>DAÑO BASE</small></div>
      <div><strong>${cost}</strong><small>COSTE</small></div>
      <div><strong>${turns ? `${turns} ${turns === 1 ? "turno" : "turnos"}` : "Sin recarga"}</strong><small>RECARGA</small></div>
      <div><strong>${action.seals.length}</strong><small>SELLOS</small></div></div>`;
  }

  function combatStatusMarkup({ status }) {
    if (!status) return "";
    const duration = `${status.duration} ${status.duration === 1 ? "turno" : "turnos"}`;
    const label = status.label[0] + status.label.slice(1).toLowerCase();
    return `<p class="dojo-technique-effect" data-technique-combat-status>${escape(label)} · ${status.power > 0 ? `${status.power} PV de daño por turno · ` : ""}${duration}</p>`;
  }

  function extraListMarkup() {
    const groups = [
      ["Técnicas del catálogo", extraTechniques],
      ["Combinaciones elementales", elementalPreviews]
    ];
    return `<div class="dojo-technique-list">${groups.map(([label, entries]) => `<section><h4>${label}</h4><ul>
      ${entries.map(action => `<li><button type="button" data-extra-technique="${action.id}" aria-pressed="${action.id === selectedId}"><strong>${escape(action.name)}</strong><small>${escape(ELEMENT_SEQUENCE_IDS.includes(action.id) ? deps.elements[action.element].parents.map(deps.elementName).join(" + ") : deps.elementName(action.element))}</small></button></li>`).join("")}
    </ul></section>`).join("")}</div>`;
  }

  function extraDetailMarkup(action) {
    const isTechnique = !ELEMENT_SEQUENCE_IDS.includes(action.id);
    const subtitle = isTechnique
      ? `${deps.elementName(action.element)} · ${ENEMY_EXCLUSIVE_ABILITIES.includes(action) ? "Exclusiva de enemigos" : "Sin ranura de Resonancia"}`
      : `${deps.elements[action.element].parents.map(deps.elementName).join(" + ")} · Muestra elemental`;
    return `<aside class="technique-detail"><div class="technique-detail-body">
      <header class="dojo-technique-title">${elementArt(action.element)}<div><h3>${escape(action.name)}</h3><p>${escape(subtitle)}</p></div>
        <div class="dojo-technique-title-actions">${techniquePreviewButton(action.id)}</div>
      </header>
      ${isTechnique ? combatMetricsMarkup(action) : ""}
      ${techniquePreviewMarkup()}
      ${isTechnique ? `${combatStatusMarkup(action)}${techniqueSealsMarkup(action)}` : ""}
    </div></aside>`;
  }

  function stopPreview() {
    if (!preview) return;
    preview.dispose?.();
    const { button, result } = preview;
    button.disabled = false;
    button.textContent = "Ver técnica";
    result.textContent = "";
    preview = null;
  }

  async function playPreview(button, save) {
    const id = button.dataset.playTechnique;
    const action = extraActions.get(id) || technique(id) || TAIJUTSUS_BY_ID.get(id);
    if (!action) return;
    stopPreview();
    const result = host.querySelector("[data-technique-preview-status]");
    const stage = host.querySelector("[data-technique-preview-stage]");
    const request = { button, result, dispose: null };
    preview = request;
    button.disabled = true;
    result.textContent = "Cargando animación…";
    const onError = () => {
      if (preview !== request) return;
      stopPreview();
      result.textContent = "La animación no se pudo cargar. Vuelve a intentarlo.";
    };
    try {
      await loadPhaser();
      const { mountTechniquePreview } = await import("./technique-preview.js?v=1.3.0");
      if (preview !== request || !stage.isConnected) return;
      request.dispose = mountTechniquePreview(stage, save, action, {
        onStart: () => { result.textContent = ""; },
        onError,
        onEnd: () => {
          button.disabled = false;
          button.textContent = "Repetir técnica";
        }
      });
    } catch {
      onError();
    }
  }

  function detailMarkup(save, node) {
    if (!node) {
      const identity = characterResonanceSymbol(save.character);
      return `<aside class="technique-detail resonance-core-detail"><div class="technique-detail-body"><h3>Núcleo de Resonancia</h3><div class="resonance-detail-emblem" aria-hidden="true">${escape(identity.symbol)}</div><p>${escape(save.character.name)} · ${escape(identity.label)}</p><p>${resonancePoints(save)} PR disponibles</p></div></aside>`;
    }
    const original = technique(node.jutsuId);
    const jutsu = original && upgradedTechnique(save, original);
    const taijutsu = taijutsuAction(save,node.id) || TAIJUTSUS_BY_ID.get(node.id);
    const combatMove = jutsu || taijutsu;
    const physicalSlots = normalizeTaijutsuLoadout(save);
    const element = deps.elements[node.element || node.affinityIds[0]];
    const color = element ? `#${element.color.toString(16).padStart(6, "0")}` : PHYSICAL_COLOR;
    const level = skillLevel(save, node);
    const requirements = skillRequirements(save,node);
    const learned = jutsu && deps.isTechniqueLearned(save, original);
    const equipped = save.loadout.includes(node.id) || physicalSlots.includes(node.id);
    const full = save.loadout.length >= deps.loadoutSlotsForLevel(save.progression.level);
    const equipLabel = equipped ? "QUITAR DEL COMBATE" : full ? "REEMPLAZAR UNA EQUIPADA" : "EQUIPAR EN RANURA LIBRE";
    const affinity = (node.affinityIds.map(deps.elementName).join(" + ") || "Independiente de las afinidades");
    const art = node.element ? elementArt(node.element) : `${!node.affinityIds.length ? '<span class="resonance-physical-mark" aria-hidden="true">拳</span>' : ""}${node.affinityIds.map(id => elementArt(id)).join("")}`;
    const canInvest = !requirements.length && level < node.maxLevel && resonancePoints(save) >= node.cost;
    const investLabel = level >= node.maxLevel ? "NIVEL MÁXIMO" : `${level ? "MEJORAR" : "DESBLOQUEAR"} · ${node.cost} PR`;
    const costReduction = jutsu ? deps.derivedStats(save).costReduction : 0;
    const chakraCost = jutsu ? actionChakraCost(jutsu, costReduction) : 0;
    let nextLevel = "";
    if (level && level < node.maxLevel) {
      if (jutsu) {
        const next = techniqueAtLevel(original, level + 1);
        const nextCost = actionChakraCost(next, costReduction);
        nextLevel = [
          `${jutsu.damage} → ${next.damage} de daño base`,
          nextCost !== chakraCost && `${chakraCost} → ${nextCost} CH`,
          next.seals.length !== jutsu.seals.length && `${jutsu.seals.length} → ${next.seals.length} sellos`
        ].filter(Boolean).join(" · ");
      } else {
        const damage = taijutsu && `${taijutsu.damage} → ${taijutsu.damage + 2} de daño base`;
        const passive = node.effect && `${effectText({ ...node.effect, amount: node.effect.amount * (level + 1) })} en total`;
        nextLevel = [damage, passive].filter(Boolean).join(" · ");
      }
    }
    const taijutsuButtons = taijutsu ? `<div class="taijutsu-equip-actions">${physicalSlots.map((id,slot) => `<button type="button" data-taijutsu-equip="${node.id}" data-taijutsu-target="${slot}" aria-label="Equipar ${escape(taijutsu.name)} en taijutsu ${slot+1}" ${!learnedTaijutsu(save,node.id) || id === node.id ? "disabled" : ""}>T${slot+1} · ${id === node.id ? "EQUIPADO" : physicalSlots.includes(node.id) ? "MOVER" : id ? "REEMPLAZAR" : "EQUIPAR"}</button>`).join("")}</div>` : "";
    const prerequisiteNames = prerequisiteEntries(save,node).map(([id,rank]) => `${nodesFor(save).find(n => n.id === id)?.name || id} · nivel de técnica ${rank}`);
    return `<aside class="technique-detail" style="--technique-color:${color}">
      <div class="technique-detail-body">
        <header class="dojo-technique-title">
          ${art}<div><h3>${escape(node.name)}</h3><p>${escape(affinity)} · ${escape(stateLabel(save, node, physicalSlots))}</p></div>
          ${combatMove || level ? `<div class="dojo-technique-title-actions">
            ${combatMove ? techniquePreviewButton(combatMove.id) : ""}
            ${level ? `<span class="dojo-technique-level">Nivel ${level}/${node.maxLevel}</span>` : ""}
          </div>` : ""}
        </header>
        ${combatMove ? combatMetricsMarkup(combatMove, costReduction) : ""}
        ${combatMove ? `${techniquePreviewMarkup()}
          <div class="dojo-technique-combat-notes">${combatStatusMarkup(combatMove)}
            <p class="technique-accuracy">${escape(initiativeLabel(combatMove))}${jutsu ? ` · ${jutsu.accuracyMod > 0 ? "+" : ""}${jutsu.accuracyMod}% de precisión` : ""}</p>
          </div>${techniqueSealsMarkup(combatMove)}` : ""}
        ${combatMove ? "" : `<p class="technique-description">${escape(node.description)}</p>`}
        ${node.effect ? `<p class="dojo-technique-effect">${combatMove ? "Bonificación pasiva" : "Pasiva permanente"} · ${escape(effectText({ ...node.effect, amount: node.effect.amount * Math.max(1, level) }))}</p>` : ""}
        ${requirements.length || prerequisiteNames.length ? `<section class="resonance-requirements"><h4>Requisitos de progresión</h4>
          ${prerequisiteNames.length ? `<p>${escape(prerequisiteNames.join(" + "))}</p>` : ""}
          ${requirements.length ? `<p class="is-missing">${escape(requirements.join(" · "))}</p>` : ""}
        </section>` : ""}
      </div>
      <footer class="technique-detail-actions">
        ${nextLevel ? `<p class="dojo-next-technique-level">Nivel ${level + 1} · ${escape(nextLevel)}</p>` : ""}
        <button type="button" class="resonance-invest-button" data-skill-invest="${node.id}" ${canInvest ? "" : "disabled"}>${investLabel}</button>
        ${!requirements.length && level < node.maxLevel && resonancePoints(save) < node.cost ? `<p>Te faltan ${node.cost - resonancePoints(save)} PR.</p>` : ""}
        ${taijutsuButtons}
        ${jutsu ? `<button class="technique-equip-button" type="button" data-technique-toggle="${jutsu.id}" ${learned ? "" : "disabled"}>${learned ? equipLabel : "APRENDE PARA EQUIPAR"}</button>` : ""}
      </footer>
    </aside>`;
  }

  function render(save) {
    const nodes = nodesFor(save);
    const showTree = view === "tree";
    const showExtras = view === "extra";
    const visibleNodes = resonanceVisibleNodes(save, showTree && showFuture);
    if (showExtras) {
      if (!extraActions.has(selectedId)) selectedId = extraTechniques[0].id;
    } else if ((!showTree || selectedId !== "core") && !visibleNodes.some(node => node.id === selectedId)) {
      selectedId = save.loadout.find(id => visibleNodes.some(node => node.id === id))
        || visibleNodes.find(node => node.jutsuId && skillLevel(save, node))?.id
        || visibleNodes[0]?.id || "core";
    }
    if (replacementId && (save.loadout.includes(replacementId) || !deps.isTechniqueLearned(save, technique(replacementId)))) replacementId = null;
    return `<div class="dojo-technique-workspace">
      <div class="technique-learning${showTree ? " is-tree" : ""}"><header class="dojo-technique-navigation${view === "list" ? " is-list" : ""}">
        <div><h3>${showExtras ? "Más animaciones" : showTree ? "Progresión" : "Técnicas del Dojo"}</h3>
        ${showExtras ? "" : `<p><b data-resonance-points>${resonancePoints(save)}</b> PR disponibles</p>`}</div>
        <div class="dojo-technique-navigation-actions">${view === "list"
          ? '<button type="button" data-technique-view="tree">Árbol de Resonancia</button><button type="button" data-technique-view="extra">Más animaciones</button>'
          : '<button type="button" data-technique-view="list">Lista de técnicas</button>'}</div></header>
        ${showExtras ? extraListMarkup() : showTree ? resonanceTreeMarkup(save,deps,selectedId,treeView,showFuture) : listMarkup(save, visibleNodes)}
        ${showExtras ? "" : loadoutMarkup(save)}
      </div>
      <section class="technique-detail-wrap" aria-label="Detalle de habilidad" data-technique-detail data-selected-skill="${selectedId}">
        ${showExtras ? extraDetailMarkup(extraActions.get(selectedId)) : detailMarkup(save,nodes.find(n => n.id === selectedId))}
      </section>
    </div>`;
  }

  function inspect(id) {
    if (!host?.isConnected) return;
    const save = bindings.getSave();
    const wasReplacing = Boolean(replacementId);
    selectedId = id;
    replacementId = null;
    if (wasReplacing) {
      refresh(save, null, true);
      return;
    }
    stopPreview();
    const selected = nodesFor(save).find(node => node.id === id);
    const prerequisites = selected?.prerequisites || [];
    host.querySelectorAll("[data-skill-select]").forEach(node => {
      const isSelected = node.dataset.cellId === selected?.cellId;
      node.classList.toggle("is-selected",isSelected);
      node.classList.toggle("is-prerequisite",prerequisites.includes(node.dataset.skillSelect));
      node.setAttribute("aria-pressed",String(isSelected));
    });
    host.querySelector("[data-tree-core]")?.classList.toggle("is-selected", id === "core");
    host.querySelector("[data-technique-detail]").innerHTML = detailMarkup(save,nodesFor(save).find(n => n.id === id));
    host.querySelector("[data-technique-detail]").dataset.selectedSkill = id || "core";
  }

  function refresh(save, focusSelector = null, resetDetail = false) {
    if (!host?.isConnected) return;
    stopPreview();
    const detailScroll = resetDetail ? 0 : host.querySelector(".technique-detail-body")?.scrollTop || 0;
    const listScroll = host.querySelector(".dojo-technique-list")?.scrollTop || 0;
    const treeScroll = host.querySelector(".technique-learning.is-tree")?.scrollTop || 0;
    host.innerHTML = render(save);
    const body = host.querySelector(".technique-detail-body");
    if (body) body.scrollTop = detailScroll;
    const list = host.querySelector(".dojo-technique-list");
    if (list) list.scrollTop = listScroll;
    const tree = host.querySelector(".technique-learning.is-tree");
    if (tree) tree.scrollTop = treeScroll;
    if (focusSelector) host.querySelector(focusSelector)?.focus({ preventScroll: !replacementId });
  }

  function persist(loadout, message, focus) {
    feedback = message;
    replacementId = null;
    bindings.onPersist({ ...bindings.getSave(), loadout });
    if (focus) host.querySelector(focus)?.focus({ preventScroll: true });
  }

  return {
    render,
    refresh,
    stopPreview,
    mount(panel, scope, callbacks) {
      host = panel;
      bindings = callbacks;
      replacementId = null;
      feedback = "";
      refresh(bindings.getSave());
      mountResonanceNavigation(host,scope,{
        getSave: bindings.getSave, getBounds: () => treeBounds(resonanceVisibleNodes(bindings.getSave(),showFuture)), getView: () => treeView, setView: view => { treeView = view; },
        onInspect: inspect,
        onCore: () => inspect("core")
      });
      scope.listen(host, "change", event => { if (event.target.matches("[data-tree-future]")) { showFuture = event.target.checked; treeView = null; refresh(bindings.getSave(), "[data-tree-future]"); } });
      const cancel = () => { replacementId = null; feedback = "Cambio cancelado. Tu equipo se conserva."; refresh(bindings.getSave(), `[data-technique-toggle="${selectedId}"]`); };
      scope.listen(host, "click", event => {
        const button = event.target.closest("button");
        if (!button || button.disabled) return;
        const save = bindings.getSave();
        const inspectId = button.dataset.techniqueSelect || button.dataset.loadoutInspect;
        if (button.hasAttribute("data-play-technique")) {
          void playPreview(button, save);
        } else if (button.hasAttribute("data-technique-view")) {
          const previousView = view;
          view = button.dataset.techniqueView;
          replacementId = null;
          refresh(save, `[data-technique-view="${previousView}"]`, true);
          host.querySelector(".dojo-technique-list")?.scrollTo(0, 0);
        } else if (button.dataset.extraTechnique) {
          selectedId = button.dataset.extraTechnique;
          refresh(save, `[data-extra-technique="${selectedId}"]`, true);
        } else if (button.hasAttribute("data-taijutsu-choose")) {
          const index = Number(button.dataset.taijutsuChoose);
          selectedId = normalizeTaijutsuLoadout(save)[index] || TAIJUTSU_ACTIONS.find(action => learnedTaijutsu(save,action.id) && !normalizeTaijutsuLoadout(save).includes(action.id))?.id || TAIJUTSU_ACTIONS[0].id;
          replacementId = null; feedback = "";
          refresh(save,`[data-taijutsu-choose="${index}"]`,true);
        } else if (button.hasAttribute("data-taijutsu-remove")) {
          const updated = unequipTaijutsu(save,Number(button.dataset.taijutsuRemove));
          if (updated !== save) { feedback = "Taijutsu retirado. La técnica sigue aprendida."; bindings.onPersist(updated); }
        } else if (button.dataset.taijutsuEquip) {
          const updated = equipTaijutsu(save,Number(button.dataset.taijutsuTarget),button.dataset.taijutsuEquip);
          if (updated !== save) { selectedId = button.dataset.taijutsuEquip; feedback = `${TAIJUTSUS_BY_ID.get(selectedId).name} equipado en T${Number(button.dataset.taijutsuTarget)+1}.`; bindings.onPersist(updated); }
        } else if (button.dataset.skillInvest) {
          const updated = investResonance(save,button.dataset.skillInvest);
          if (updated === save) return;
          selectedId = button.dataset.skillInvest;
          feedback = `${nodesFor(save).find(n => n.id === selectedId).name}: mejora de Resonancia aplicada.`;
          bindings.onPersist(updated);
          host.querySelector(`[data-skill-invest="${selectedId}"]`)?.focus({ preventScroll:true });
        } else if (inspectId) {
          selectedId = inspectId; replacementId = null; feedback = "";
          refresh(save, button.dataset.techniqueSelect ? `[data-technique-select="${inspectId}"]` : `[data-loadout-inspect="${inspectId}"]`, true);
        } else if (button.hasAttribute("data-cancel-replace")) cancel();
        else if (button.hasAttribute("data-loadout-remove")) {
          const index = Number(button.dataset.loadoutRemove);
          const removed = technique(save.loadout[index]);
          if (removed) persist(save.loadout.filter((_, slot) => slot !== index), `${removed.name} sigue aprendida. Ya tienes una ranura libre.`, `[data-technique-toggle="${selectedId}"]`);
        } else if (button.hasAttribute("data-replace-slot")) {
          const index = Number(button.dataset.replaceSlot);
          const incoming = technique(replacementId);
          if (!incoming || !save.loadout[index] || save.loadout.includes(incoming.id) || !deps.isTechniqueLearned(save, incoming)) return;
          const replaced = technique(save.loadout[index]);
          const loadout = [...save.loadout]; loadout[index] = incoming.id;
          persist(loadout, `${incoming.name} reemplaza a ${replaced.name}. Ambas siguen aprendidas.`, `[data-loadout-inspect="${incoming.id}"]`);
        } else if (button.dataset.techniqueToggle) {
          const jutsu = technique(button.dataset.techniqueToggle);
          if (!deps.isTechniqueLearned(save, jutsu)) return;
          if (save.loadout.includes(jutsu.id)) persist(save.loadout.filter(id => id !== jutsu.id), `${jutsu.name} sigue aprendida. Ya tienes una ranura libre.`, `[data-technique-toggle="${jutsu.id}"]`);
          else if (save.loadout.length < deps.loadoutSlotsForLevel(save.progression.level)) persist([...save.loadout, jutsu.id], `${jutsu.name} equipada para el combate.`, `[data-technique-toggle="${jutsu.id}"]`);
          else {
            replacementId = jutsu.id;
            feedback = "";
            refresh(save, '[data-replace-slot="0"]');
          }
        }
      });
      scope.listen(host, "keydown", event => {
        if (event.key === "Escape" && replacementId) { event.preventDefault(); event.stopPropagation(); cancel(); }
      });
      scope.onCleanup(() => { stopPreview(); host = null; bindings = null; replacementId = null; feedback = ""; });
    },
    dispose() { stopPreview(); host = null; bindings = null; replacementId = null; feedback = ""; }
  };
}
