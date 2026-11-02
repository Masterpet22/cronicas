import { characterResonanceSymbol } from "../../skills/character-symbol.js?v=1.0.0";
import { PHYSICAL_COLOR, TAIJUTSU_ACTIONS, TAIJUTSUS_BY_ID, effectText } from "../../skills/definitions.js?v=1.0.0";
import { investResonance, resonancePoints, skillLevel, skillRequirements, skillTreeNodes, upgradedTechnique } from "../../skills/progression.js?v=1.0.0";
import { mountResonanceNavigation, resonanceTreeMarkup } from "./resonance-tree.js?v=1.0.0";

import { equipTaijutsu, learnedTaijutsu, normalizeTaijutsuLoadout, taijutsuAction, unequipTaijutsu } from "../../skills/taijutsu.js?v=1.0.0";

export function createDojoTechniques(deps) {
  let selectedId = null;
  let treeView = null;
  let replacementId = null;
  let feedback = "";
  let host = null;
  let bindings = null;
  const escape = deps.escapeHtml;
  const technique = id => deps.jutsus.find(entry => entry.id === id);
  const elementArt = id => `<span class="element-composition" role="img" aria-label="${escape(deps.elementName(id))}: ${deps.basicRequirements(id).map(deps.elementName).join(" + ")}">${deps.elementIconParts(id).map(part => `<img src="${part.icon}" alt="" width="512" height="512" style="left:${part.x / 5.12}%;top:${part.y / 5.12}%;width:${part.size / 5.12}%;height:${part.size / 5.12}%">`).join("")}</span>`;
  const slotLevels = Array.from({ length: 4 }, (_, index) =>
    Array.from({ length: 100 }, (_, level) => level + 1).find(level => deps.loadoutSlotsForLevel(level) > index));

  const lockReason = (save, jutsu) => [
    jutsu.unlockLevel > save.progression.level ? `Nivel ${jutsu.unlockLevel}` : "",
    deps.affinityXpForElement(save.character, jutsu.element) < jutsu.affinityXpRequired ? `${jutsu.affinityXpRequired} PX de afinidad` : ""
  ].filter(Boolean).join(" · ");

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
    const nextLevel = slotLevels[capacity];
    const instruction = pending
      ? `Elige qué técnica reemplazar por ${pending.name}.`
      : full ? `Tus ${capacity} ranuras están ocupadas. Reemplaza una para cambiar.`
        : "Elige una técnica aprendida y pulsa Equipar para llevarla al combate.";
    const slots = slotLevels.map((level, index) => {
      if (index >= capacity) return `<div class="technique-loadout-slot is-locked" data-loadout-locked="${index + 1}"><small>RANURA ${index + 1} · BLOQUEADA</small><strong>Se abre al nivel ${level}</strong><span>Podrás llevar una técnica más</span></div>`;
      const jutsu = technique(save.loadout[index]);
      if (!jutsu) return `<div class="technique-loadout-slot is-empty"><small>RANURA ${index + 1} · DISPONIBLE</small><strong>Ranura libre</strong><span>Equipa una técnica aprendida</span></div>`;
      return `<article class="technique-loadout-slot is-equipped ${pending ? "is-replacement" : ""}"><button type="button" ${pending ? `data-replace-slot="${index}" aria-label="Reemplazar ${escape(jutsu.name)} por ${escape(pending.name)}"` : `data-loadout-inspect="${jutsu.id}" aria-label="Consultar ${escape(jutsu.name)}, equipada en ranura ${index + 1}"`}><small>${pending ? "REEMPLAZAR" : `RANURA ${index + 1}`}</small><strong>${escape(jutsu.name)}</strong></button>${pending ? "" : `<button class="technique-loadout-remove" type="button" data-loadout-remove="${index}" aria-label="Quitar ${escape(jutsu.name)} del combate" title="Quitar del combate">×</button>`}</article>`;
    }).join("");
    return `<section class="technique-loadout ${pending ? "is-choosing" : ""}" aria-label="Técnicas equipadas para el combate"><header><div><h3>Elementales</h3><span class="technique-loadout-count ${full ? "is-full" : ""}" data-equipped-count>${save.loadout.length}/${capacity} EQUIPADAS</span></div><p>${nextLevel ? `Próxima ranura: nivel ${nextLevel}.` : "Las cuatro ranuras están abiertas."} Golpe veloz y Guardia van aparte.</p></header><div class="technique-loadout-slots">${slots}</div>${taijutsuLoadoutMarkup(save)}<div class="technique-loadout-instruction"><p role="status" data-technique-feedback>${escape(feedback || instruction)}</p>${pending ? '<button type="button" data-cancel-replace>Cancelar cambio</button>' : ""}</div></section>`;
  }

  const nodesFor = skillTreeNodes;

  function detailMarkup(save, node) {
    const identity = characterResonanceSymbol(save.character);
    if (!node) return `<aside class="technique-detail resonance-core-detail"><div class="technique-detail-body"><p class="eyebrow">ORIGEN DE TU PROGRESIÓN</p><h3>Núcleo de Resonancia</h3><div class="resonance-detail-emblem" aria-hidden="true">${escape(identity.symbol)}</div><p>${escape(save.character.name)} · ${escape(identity.label)}</p><p>Cuatro caminos. Un mismo origen.</p><p>Desarrolla tu cuerpo, domina tus afinidades y conecta sus fuerzas mediante sellos híbridos.</p><p>Las técnicas se aprenden con PX de afinidad. Invierte puntos de Resonancia para desbloquear pasivas y taijutsus o mejorar tus técnicas.</p><p><strong>3 puntos iniciales + 2 por nivel.</strong> Tus puntos de atributos son independientes.</p><p>Selecciona un hexágono para ver sus efectos y requisitos. Arrastra el panal o utiliza los controles para explorar.</p></div></aside>`;
    const siblings = nodesFor(save).filter(other => other.cellId === node.cellId);
    const linkedMarkup = siblings.length > 1 ? `<label class="resonance-linked-chooser">Técnicas de esta celda<select data-linked-skill aria-label="Técnicas de esta celda">${siblings.map(other => `<option value="${other.id}" ${other.id === node.id ? "selected" : ""}>${escape(other.name)}</option>`).join("")}</select></label>` : "";
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
    const label = !learned ? "TÉCNICA BLOQUEADA" : equipped ? "QUITAR DEL COMBATE" : full ? "REEMPLAZAR UNA EQUIPADA" : "EQUIPAR EN RANURA LIBRE";
    const category = taijutsu ? "TAIJUTSU · FÍSICO" : node.category === "physical" ? "DISCIPLINA FÍSICA" : node.category === "hybrid" ? "CONFLUENCIA HÍBRIDA" : "TÉCNICA ELEMENTAL";
    const affinity = (node.physicalHybrid ? "Físicas + " : "") + (node.affinityIds.map(deps.elementName).join(" + ") || "Independiente de las afinidades");
    const art = node.element ? elementArt(node.element) : `${node.physicalHybrid || !node.affinityIds.length ? '<span class="resonance-physical-mark" aria-hidden="true">拳</span>' : ""}${node.affinityIds.map(id => elementArt(id)).join("")}`;
    const canInvest = !requirements.length && level < node.maxLevel && resonancePoints(save) >= node.cost;
    const investLabel = level >= node.maxLevel ? "NIVEL MÁXIMO" : `${level ? "MEJORAR" : "DESBLOQUEAR"} · ${node.cost} PR`;
    const metrics = combatMove ? `<div class="technique-metrics"><div><strong>${combatMove.damage}</strong><small>DAÑO BASE</small></div><div><strong>${taijutsu ? `${taijutsu.healthCost} PV` : `${jutsu.cost} CH`}</strong><small>COSTE EN COMBATE</small></div><div><strong>${combatMove.cooldown ? `${combatMove.cooldown} turnos` : "Sin recarga"}</strong><small>RECARGA</small></div><div><strong>${combatMove.speedMod > 0 ? "+" : ""}${combatMove.speedMod}</strong><small>RITMO</small></div></div>` : "";
    const effect = taijutsu ? `${taijutsu.description} Cada nivel adicional añade +2 al daño. Entrenamiento: ${effectText(node.effect)}.` : jutsu ? `Cada mejora añade +2 al daño de esta técnica. ${jutsu.status ? `Aplica ${jutsu.status.label.toLowerCase()} (${jutsu.status.duration} turnos).` : ""}` : node.effect ? effectText(node.effect) : node.description;
    const taijutsuButtons = taijutsu ? `<div class="taijutsu-equip-actions">${physicalSlots.map((id,slot) => `<button type="button" data-taijutsu-equip="${node.id}" data-taijutsu-target="${slot}" aria-label="Equipar ${escape(taijutsu.name)} en taijutsu ${slot+1}" ${!learnedTaijutsu(save,node.id) || id === node.id ? "disabled" : ""}>T${slot+1} · ${id === node.id ? "EQUIPADO" : physicalSlots.includes(node.id) ? "MOVER" : id ? "REEMPLAZAR" : "EQUIPAR"}</button>`).join("")}</div>` : "";
    const prerequisiteNames = node.prerequisites.map(id => nodesFor(save).find(n => n.id === id)?.name || id);
    const note = taijutsu ? "Equipa en T1 o T2. Consume vida y conserva libres tus ranuras elementales." : jutsu ? !learned ? `Necesitas: ${lockReason(save, original)}.` : equipped ? "La técnica seguirá aprendida." : full ? "Elige cuál cambiar. Ambas seguirán aprendidas." : "Aparecerá en tu barra de acciones al combatir." : "La especialización se aplica automáticamente al combatir.";
    return `<aside class="technique-detail" style="--technique-color:${color}"><div class="technique-detail-body"><p class="eyebrow">${category}</p><h3>${escape(node.name)}</h3>${linkedMarkup}<div class="technique-element-art">${art}<div><strong>${escape(affinity)}</strong><span>${equipped ? "EN COMBATE" : level ? "APRENDIDA" : requirements.length ? "BLOQUEADA" : "DISPONIBLE"}</span></div></div><p class="technique-description">${escape(node.description)}</p><div class="resonance-rank"><span>${escape(taijutsu ? "Taijutsu · Físico" : node.type)}</span><strong>NIVEL ${level} / ${node.maxLevel}</strong></div>${metrics}<section class="resonance-effects"><h4>Efectos en combate</h4><p>${escape(effect)}</p></section><section class="resonance-requirements"><h4>Requisitos de progresión</h4><p>${escape(prerequisiteNames.length ? prerequisiteNames.join(" + ") : "Desde el Núcleo de Resonancia")}</p><p class="${requirements.length ? "is-missing" : "is-met"}">${escape(requirements.length ? requirements.join(" · ") : "Requisitos cumplidos")}</p></section><p class="technique-accuracy">${jutsu ? `${jutsu.accuracyMod > 0 ? "+" : ""}${jutsu.accuracyMod}% precisión · ${jutsu.affinityXpRequired} PX de afinidad para aprender` : taijutsu ? "Taijutsu · Sin sellos · 0 CH" : "Pasiva permanente · No ocupa ranura de combate"}</p></div><footer class="technique-detail-actions"><button type="button" class="resonance-invest-button" data-skill-invest="${node.id}" ${canInvest ? "" : "disabled"}>${investLabel}</button>${!requirements.length && level < node.maxLevel && resonancePoints(save) < node.cost ? '<p>Necesitas más puntos de Resonancia. Gana 2 al subir de nivel.</p>' : ""}${taijutsuButtons}${jutsu ? `<button class="technique-equip-button" type="button" data-technique-toggle="${jutsu.id}" ${learned ? "" : "disabled"}>${label}</button>` : ""}<p>${escape(note)}</p></footer></aside>`;
  }

  function render(save) {
    const nodes = nodesFor(save);
    const visibleNodes = nodes;
    if (selectedId !== "core" && !visibleNodes.some(node => node.id === selectedId)) selectedId = save.loadout.find(id => visibleNodes.some(node => node.id === id)) || "core";
    if (replacementId && (save.loadout.includes(replacementId) || !deps.isTechniqueLearned(save, technique(replacementId)))) replacementId = null;
    return `<div class="dojo-technique-workspace">${loadoutMarkup(save)}<div class="dojo-technique-layout">${resonanceTreeMarkup(save,deps,selectedId,treeView)}<section class="technique-detail-wrap" aria-label="Detalle de habilidad" data-technique-detail>${detailMarkup(save,nodes.find(n => n.id === selectedId))}</section></div></div>`;
  }

  function inspect(id, preview = false) {
    if (!host?.isConnected) return;
    const save = bindings.getSave();
    if (!preview) {
      selectedId = id;
      replacementId = null;
      const selected = nodesFor(save).find(node => node.id === id);
      const prerequisites = selected?.prerequisites || [];
      host.querySelectorAll("[data-skill-select]").forEach(node => {
        const isSelected = node.dataset.cellId === selected?.cellId;
        node.classList.toggle("is-selected",isSelected);
        node.classList.toggle("is-prerequisite",prerequisites.includes(node.dataset.skillSelect));
        node.setAttribute("aria-pressed",String(isSelected));
      });
      host.querySelector("[data-tree-core]")?.classList.toggle("is-selected", id === "core");
    }
    host.querySelector("[data-technique-detail]").innerHTML = detailMarkup(save,nodesFor(save).find(n => n.id === id));
  }

  function refresh(save, focusSelector = null, resetDetail = false) {
    if (!host?.isConnected) return;
    const detailScroll = resetDetail ? 0 : host.querySelector(".technique-detail-body")?.scrollTop || 0;
    host.innerHTML = render(save);
    const body = host.querySelector(".technique-detail-body");
    if (body) body.scrollTop = detailScroll;
    if (focusSelector) host.querySelector(focusSelector)?.focus({ preventScroll: true });
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
    mount(panel, scope, callbacks) {
      host = panel;
      bindings = callbacks;
      replacementId = null;
      feedback = "";
      refresh(bindings.getSave());
      mountResonanceNavigation(host,scope,{
        getSave: bindings.getSave, getView: () => treeView, setView: view => { treeView = view; },
        onInspect: id => { if (replacementId) { replacementId = null; refresh(bindings.getSave()); } inspect(id); },
        onHover: id => { if (!replacementId) inspect(id || selectedId,true); },
        onCore: () => inspect("core")
      });
      const cancel = () => { replacementId = null; feedback = "Cambio cancelado. Tu equipo se conserva."; refresh(bindings.getSave(), `[data-technique-toggle="${selectedId}"]`); };
      scope.listen(host, "click", event => {
        const button = event.target.closest("button");
        if (!button || button.disabled) return;
        const save = bindings.getSave();
        const inspectId = button.dataset.skillSelect || button.dataset.loadoutInspect;
        if (button.hasAttribute("data-taijutsu-choose")) {
          const index = Number(button.dataset.taijutsuChoose);
          selectedId = normalizeTaijutsuLoadout(save)[index] || TAIJUTSU_ACTIONS.find(action => learnedTaijutsu(save,action.id) && !normalizeTaijutsuLoadout(save).includes(action.id))?.id || TAIJUTSU_ACTIONS[0].id;
          replacementId = null; feedback = "Elige T1 o T2 en la ficha para equipar el taijutsu.";
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
          refresh(save, button.dataset.skillSelect ? `[data-skill-select="${inspectId}"]` : `[data-loadout-inspect="${inspectId}"]`, true);
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
            feedback = `Tus ranuras están ocupadas. Elige qué técnica reemplazar por ${jutsu.name}.`;
            refresh(save, '[data-replace-slot="0"]');
          }
        }
      });
      scope.listen(host,"change",event => {
        if (!event.target.matches("[data-linked-skill]")) return;
        selectedId = event.target.value;
        refresh(bindings.getSave(),"[data-linked-skill]",true);
      });
      scope.listen(host, "keydown", event => {
        if (event.key === "Escape" && replacementId) { event.preventDefault(); event.stopPropagation(); cancel(); }
      });
      scope.onCleanup(() => { host = null; bindings = null; replacementId = null; feedback = ""; });
    },
    dispose() { host = null; bindings = null; replacementId = null; feedback = ""; }
  };
}
