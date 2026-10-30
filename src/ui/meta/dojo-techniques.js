export function createDojoTechniques(deps) {
  let selectedId = null;
  let replacementId = null;
  let feedback = "";
  let host = null;
  let bindings = null;
  const escape = deps.escapeHtml;
  const technique = id => deps.jutsus.find(entry => entry.id === id);
  const elementArt = id => `<span class="element-composition" role="img" aria-label="${escape(deps.elementName(id))}: ${deps.basicRequirements(id).map(deps.elementName).join(" + ")}">${deps.elementIconParts(id).map(part => `<img src="${part.icon}" alt="" width="512" height="512" style="left:${part.x / 5.12}%;top:${part.y / 5.12}%;width:${part.size / 5.12}%;height:${part.size / 5.12}%">`).join("")}</span>`;
  const slotLevels = Array.from({ length: 4 }, (_, index) =>
    Array.from({ length: 100 }, (_, level) => level + 1).find(level => deps.loadoutSlotsForLevel(level) > index));

  const branchesFor = save => Object.entries(deps.elements).filter(([id]) =>
    deps.canAccessElement(id, save.character.affinities, save.campaign.elementRank) && deps.jutsus.some(jutsu => jutsu.element === id));
  const lockReason = (save, jutsu) => [
    jutsu.unlockLevel > save.progression.level ? `Nivel ${jutsu.unlockLevel}` : "",
    deps.affinityXpForElement(save.character, jutsu.element) < jutsu.affinityXpRequired ? `${jutsu.affinityXpRequired} PX de afinidad` : ""
  ].filter(Boolean).join(" · ");

  function loadoutMarkup(save) {
    const capacity = deps.loadoutSlotsForLevel(save.progression.level);
    const full = save.loadout.length >= capacity;
    const pending = technique(replacementId);
    const nextLevel = slotLevels[capacity];
    const instruction = pending
      ? `Elige qué técnica reemplazar por ${pending.name}.`
      : full ? `Tus ${capacity} ranuras están ocupadas. Para probar otra técnica, reemplaza una equipada.`
        : "Elige una técnica aprendida y pulsa Equipar para llevarla al combate.";
    const slots = slotLevels.map((level, index) => {
      if (index >= capacity) return `<div class="technique-loadout-slot is-locked" data-loadout-locked="${index + 1}"><small>RANURA ${index + 1} · BLOQUEADA</small><strong>Se abre al nivel ${level}</strong><span>Podrás llevar una técnica más</span></div>`;
      const jutsu = technique(save.loadout[index]);
      if (!jutsu) return `<div class="technique-loadout-slot is-empty"><small>RANURA ${index + 1} · DISPONIBLE</small><strong>Ranura libre</strong><span>Equipa una técnica aprendida</span></div>`;
      return `<article class="technique-loadout-slot is-equipped ${pending ? "is-replacement" : ""}"><button type="button" ${pending ? `data-replace-slot="${index}" aria-label="Reemplazar ${escape(jutsu.name)} por ${escape(pending.name)}"` : `data-loadout-inspect="${jutsu.id}" aria-label="Consultar ${escape(jutsu.name)}, equipada en ranura ${index + 1}"`}><small>${pending ? "REEMPLAZAR" : `RANURA ${index + 1} · EN COMBATE`}</small><strong>${escape(jutsu.name)}</strong></button>${pending ? "" : `<button class="technique-loadout-remove" type="button" data-loadout-remove="${index}" aria-label="Quitar ${escape(jutsu.name)} del combate" title="Quitar del combate">×</button>`}</article>`;
    }).join("");
    return `<section class="technique-loadout ${pending ? "is-choosing" : ""}" aria-label="Técnicas equipadas para el combate"><header><div><h3>Llevas al combate</h3><span class="technique-loadout-count ${full ? "is-full" : ""}" data-equipped-count>${save.loadout.length}/${capacity} EQUIPADAS</span></div><p>${nextLevel ? `Próxima ranura: nivel ${nextLevel}.` : "Las cuatro ranuras están abiertas."} Golpe veloz y Guardia van aparte.</p></header><div class="technique-loadout-slots">${slots}</div><div class="technique-loadout-instruction"><p role="status" data-technique-feedback>${escape(feedback || instruction)}</p>${pending ? '<button type="button" data-cancel-replace>Cancelar cambio</button>' : ""}</div></section>`;
  }

  function detailMarkup(save, jutsu) {
    if (!jutsu) return '<aside class="technique-detail empty"><h3>Elige una técnica para consultar sus detalles.</h3></aside>';
    const element = deps.elements[jutsu.element];
    const learned = deps.isTechniqueLearned(save, jutsu);
    const equipped = save.loadout.includes(jutsu.id);
    const full = save.loadout.length >= deps.loadoutSlotsForLevel(save.progression.level);
    const description = jutsu.status?.label ? `Aplica ${jutsu.status.label.toLowerCase()}.` : "Daño elemental directo.";
    const label = !learned ? "TÉCNICA BLOQUEADA" : equipped ? "QUITAR DEL COMBATE" : full ? "REEMPLAZAR UNA EQUIPADA" : "EQUIPAR EN RANURA LIBRE";
    const note = !learned ? `Necesitas: ${lockReason(save, jutsu)}.` : equipped ? "La técnica seguirá aprendida." : full ? "Elige cuál cambiar. Ambas seguirán aprendidas." : "Aparecerá en tu barra de acciones al combatir.";
    return `<aside class="technique-detail" style="--technique-color:#${element.color.toString(16).padStart(6, "0")}"><div class="technique-detail-body"><p class="eyebrow">TÉCNICA DE ${escape(element.name.toUpperCase())}</p><h3>${escape(jutsu.name)}</h3><div class="technique-element-art">${elementArt(jutsu.element)}<div><strong>${equipped ? "EN COMBATE" : learned ? "APRENDIDA" : "POR APRENDER"}</strong><span>${learned ? "Aprendida con PX de afinidad" : escape(lockReason(save, jutsu))}</span></div></div><p class="technique-description">${escape(description)}</p><div class="technique-metrics"><div><strong>${jutsu.damage}</strong><small>DAÑO BASE</small></div><div><strong>${jutsu.cost} CH</strong><small>COSTE</small></div><div><strong>${jutsu.cooldown ? `${jutsu.cooldown} turnos` : "Sin recarga"}</strong><small>RECARGA</small></div><div><strong>${jutsu.speedMod > 0 ? "+" : ""}${jutsu.speedMod} ritmo</strong><small>VELOCIDAD</small></div></div><p class="technique-accuracy">${jutsu.accuracyMod > 0 ? "+" : ""}${jutsu.accuracyMod}% precisión · ${jutsu.affinityXpRequired} PX de afinidad para aprender</p></div><footer class="technique-detail-actions"><button class="technique-equip-button" type="button" data-technique-toggle="${jutsu.id}" ${learned ? "" : "disabled"}>${label}</button><p>${escape(note)}</p></footer></aside>`;
  }

  function catalogMarkup(save, branches) {
    const full = save.loadout.length >= deps.loadoutSlotsForLevel(save.progression.level);
    const sections = branches.map(([id, element]) => {
      const nodes = deps.jutsus.filter(jutsu => jutsu.element === id).sort((a, b) => a.affinityXpRequired - b.affinityXpRequired || a.unlockLevel - b.unlockLevel).map(jutsu => {
        const learned = deps.isTechniqueLearned(save, jutsu);
        const slot = save.loadout.indexOf(jutsu.id);
        const equipped = slot !== -1;
        const state = equipped ? `EN COMBATE · RANURA ${slot + 1}` : learned ? "APRENDIDA" : lockReason(save, jutsu);
        return `<button class="skill-node ${learned ? "available" : "locked"} ${equipped ? "equipped" : ""} ${selectedId === jutsu.id ? "focused" : ""}" type="button" data-skill-select="${jutsu.id}" aria-pressed="${selectedId === jutsu.id}" aria-label="${escape(jutsu.name)}. ${escape(state)}. Ver detalles"><span class="skill-step" aria-hidden="true">${equipped ? "✓" : learned ? "◇" : "⌾"}</span><span class="skill-copy"><strong>${escape(jutsu.name)}</strong><small>${jutsu.cost} CH · ${jutsu.damage} daño</small></span><span class="skill-state">${escape(state)}</span><span class="skill-hint">${equipped ? "Consultar técnica equipada" : learned ? full ? "Puedes cambiar una equipada" : "Puedes equiparla" : "Consultar requisitos"}</span></button>`;
      }).join("");
      return `<section class="skill-branch tier-${element.tier}" style="--branch-color:#${element.color.toString(16).padStart(6, "0")}" aria-label="Técnicas de ${escape(element.name)}"><header>${elementArt(id)}<span><strong>${escape(element.name)}</strong><small>${deps.affinityXpForElement(save.character, id)} PX de afinidad</small></span></header><div class="skill-path">${nodes}</div></section>`;
    }).join("");
    return `<section class="skill-tree" aria-label="Colección de técnicas por afinidad"><div class="technique-catalog-heading"><h3>Tu colección de técnicas</h3><p>Aprendes con PX de afinidad. Tu nivel determina cuántas llevas al combate.</p></div><div class="skill-branches">${sections}</div></section>`;
  }

  function render(save) {
    const branches = branchesFor(save);
    const visible = deps.jutsus.filter(jutsu => branches.some(([id]) => jutsu.element === id));
    if (!visible.some(jutsu => jutsu.id === selectedId)) selectedId = save.loadout.find(id => visible.some(jutsu => jutsu.id === id)) || visible[0]?.id || null;
    if (replacementId && (save.loadout.includes(replacementId) || !deps.isTechniqueLearned(save, technique(replacementId)))) replacementId = null;
    return `<div class="dojo-technique-workspace">${loadoutMarkup(save)}<div class="dojo-technique-layout"><section class="technique-detail-wrap" aria-label="Detalle de técnica" data-technique-detail>${detailMarkup(save, technique(selectedId))}</section>${catalogMarkup(save, branches)}</div></div>`;
  }

  function refresh(save, focusSelector = null, resetDetail = false) {
    if (!host?.isConnected) return;
    const treeScroll = host.querySelector(".skill-branches")?.scrollTop || 0;
    const detailScroll = resetDetail ? 0 : host.querySelector(".technique-detail-body")?.scrollTop || 0;
    host.innerHTML = render(save);
    host.querySelector(".skill-branches").scrollTop = treeScroll;
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
      const cancel = () => { replacementId = null; feedback = "Cambio cancelado. Tu equipo se conserva."; refresh(bindings.getSave(), `[data-technique-toggle="${selectedId}"]`); };
      scope.listen(host, "click", event => {
        const button = event.target.closest("button");
        if (!button || button.disabled) return;
        const save = bindings.getSave();
        const inspectId = button.dataset.skillSelect || button.dataset.loadoutInspect;
        if (inspectId) {
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
      scope.listen(host, "keydown", event => {
        if (event.key === "Escape" && replacementId) { event.preventDefault(); event.stopPropagation(); cancel(); }
      });
      scope.onCleanup(() => { host = null; bindings = null; replacementId = null; feedback = ""; });
    },
    dispose() { host = null; bindings = null; replacementId = null; feedback = ""; }
  };
}
