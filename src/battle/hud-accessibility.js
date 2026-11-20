import { skillFrameSvg } from "./hud-chrome.js?v=0.140.0";
import { initiativeLabel } from "./initiative.js?v=1.0.0";
import { mountBattleInventory } from "./battle-inventory.js?v=0.151.0";
import { emptySkillInfo } from './hud-art.js?v=0.140.0';
import { paintBattleSkillArt } from './skill-icons.js?v=0.135.0';
import { mountSkillTableControl } from './skill-table-control.js?v=0.147.0';
import { actionHealthCost, skillResourceLabel } from './skill-tables.js?v=0.143.0';
import { setHudAttribute, setHudProgress, setHudText } from './hud-dom.js?v=1.0.0';
import { mountHudRoster } from './hud-roster.js?v=1.0.0';
import { mountFighterIndicators } from './fighter-indicators.js?v=1.0.0';

// Accessible controls operate the existing Phaser buttons. On compact screens
// this same layer becomes the visible HUD, with CSS-sized 44 px touch targets.
export function mountAccessibleBattleHud(scene) {
  const root = document.createElement('section');
  root.className = 'combat-access';
  root.setAttribute('aria-label', 'Interfaz de combate');
  const summary = document.createElement('div');
  summary.className = 'combat-access-summary';
  const panel = () => {
    const el = document.createElement('div');
    el.className = 'combat-access-status';
    const name = document.createElement('strong');
    const bars = ['PV', 'CH'].map(label => {
      const row = document.createElement('label');
      const caption = document.createElement('span');
      caption.textContent = label;
      const meter = document.createElement('progress');
      meter.max = 1;
      meter.setAttribute('aria-label', label === 'PV' ? 'Vida' : 'Chakra');
      const value = document.createElement('b');
      row.append(caption, meter, value);
      el.append(row);
      return { meter, value };
    });
    const statuses = document.createElement('small');
    el.prepend(name);
    el.append(statuses);
    summary.append(el);
    return { name, bars, statuses };
  };
  const player = panel();
  const enemy = panel();
  const phase = document.createElement('div');
  phase.className = 'combat-access-phase';
  phase.setAttribute('role', 'status');
  const phaseText = document.createElement('strong');
  const pause = document.createElement('button');
  pause.type = 'button';
  pause.className = 'combat-access-pause';
  pause.setAttribute('aria-label', 'Pausar combate (Escape)');
  pause.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 5v14m6-14v14"/></svg>';
  pause.addEventListener('click', () => scene.openBattlePause());
  const utilities = document.createElement('div');
  utilities.className = 'combat-access-utilities';
  const inventory = mountBattleInventory(scene, utilities);
  utilities.append(pause);
  phase.append(phaseText, utilities);
  summary.append(phase);
  const spacer = document.createElement('div');
  spacer.className = 'combat-access-scene';
  spacer.setAttribute('aria-hidden', 'true');
  const actions = document.createElement('div');
  actions.className = 'combat-access-actions';
  // Native CSS perspective transforms artwork, type and hit targets together.
  // Keep tooltips in the untransformed overlay so their text remains readable.
  actions.innerHTML = skillFrameSvg();
  let tables = null;
  let frontSkill = null;
  let activeTooltip = null;
  let tooltipTimeout = null;
  const hideTooltip = () => {
    window.clearTimeout(tooltipTimeout);
    tooltipTimeout = null;
    activeTooltip?.tooltip?.layer.setVisible(false);
    activeTooltip = null;
  };
  const showTooltip = (slot) => {
    // Focus after hovering must not extend the same detail's deadline.
    if (activeTooltip === slot) return;
    hideTooltip();
    activeTooltip = slot;
    slot.tooltip?.layer.setVisible(true);
    tooltipTimeout = window.setTimeout(() => {
      slot.tooltip?.layer.setVisible(false);
      tooltipTimeout = null;
    }, 3200);
  };
  const restorePerspective = () => {
    if (!frontSkill) return;
    const { row, button, slot } = frontSkill;
    row.classList.remove('is-front');
    button.style.removeProperty('--skill-front-transform');
    hideTooltip();
    slot.tooltip?.layer.setX(0).setVisible(false);
    frontSkill = null;
  };
  const faceSkill = (row, button, slot) => {
    if (root.classList.contains('compact') || root.hidden || root.inert || scene.skillTableSwitching) return;
    if (frontSkill?.button !== button) restorePerspective();
    const style = getComputedStyle(actions);
    const [originX, originY] = style.transformOrigin.split(' ').map(parseFloat);
    const panel = new DOMMatrix().translate(originX, originY)
      .multiply(new DOMMatrix(style.transform)).translate(-originX, -originY);
    const x = row.offsetLeft + button.offsetLeft;
    const y = row.offsetTop + button.offsetTop;
    const center = new DOMPoint(x, y + button.offsetHeight / 2).matrixTransform(panel);
    const left = center.x / center.w;
    const top = center.y / center.w - button.offsetHeight / 2;
    // Cancel the complete ancestor projection, including its perspective and
    // skew. The row's original hit area remains stable in its wrapper.
    const correction = new DOMMatrix().translate(-x, -y).multiply(panel.inverse())
      .translate(left, top);
    button.style.setProperty('--skill-front-transform', correction.toString());
    row.classList.add('is-front');
    frontSkill = { row, button, slot };
    slot.tooltip?.layer.setX(Math.max(0, (actions.offsetLeft + left + button.offsetWidth + 12) * 960 / root.clientWidth - 169));
  };
  const controls = scene.actionSlots.map((slot, index) => {
    const row = document.createElement('div');
    row.className = 'combat-skill-row';
    row.dataset.skillRow = index + 1;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.combatAction = index + 1;
    button.style.setProperty('--row', index);
    const name = document.createElement('span');
    name.className = 'combat-skill-name';
    const cost = document.createElement('b');
    cost.className = 'combat-skill-cost';
    const shortcut = document.createElement('span');
    shortcut.className = 'combat-skill-shortcut';
    shortcut.textContent = index + 1;
    const art = document.createElement('span');
    art.className = 'combat-skill-art';
    const availability = document.createElement('span');
    availability.className = 'combat-skill-availability';
    const action = scene.actions[index];
    paintBattleSkillArt(scene, art, action, { index });
    let artKey = `elemental:${action?.id || "empty"}`;
    art.append(availability);
    art.setAttribute('aria-hidden', 'true');
    shortcut.setAttribute('aria-hidden', 'true');
    const info = document.createElement('span');
    info.className = 'combat-skill-info';
    info.append(name, cost);
    button.classList.toggle('is-empty', !action);
    if (action) button.dataset.actionId = action.id;
    button.append(shortcut, art, info);
    const focus = () => {
      if (root.classList.contains('compact') || scene.skillTableSwitching) return;
      showTooltip(tables?.slotAt(index) || slot);
    };
    const blur = () => {
      if (activeTooltip === (tables?.slotAt(index) || slot)) hideTooltip();
    };
    row.addEventListener('pointerenter', () => { faceSkill(row, button, tables?.slotAt(index) || slot); focus(); });
    row.addEventListener('pointerleave', () => {
      if (frontSkill?.button === button) restorePerspective();
      blur();
    });
    button.addEventListener('focus', focus);
    button.addEventListener('blur', blur);
    button.addEventListener('click', () => {
      tables?.activate(index);
    });
    row.addEventListener('click', event => { if (event.target === row) button.click(); });
    row.append(button);
    actions.append(row);
    return { button, name, cost, art, availability, index,
      get slot() { return tables?.slotAt(index) || slot; },
      paint(action, physical) {
        const key = `${physical ? "physical" : "elemental"}:${action?.id || "empty"}`;
        if (key === artKey || index === 0 || index === 5) return;
        artKey = key; paintBattleSkillArt(scene, art, action, { physical, index }); art.append(availability);
      }
    };
  });
  const progress = document.createElement('div');
  progress.className = 'combat-access-progress';
  const progressTitle = document.createElement('strong');
  progressTitle.textContent = 'ORDEN DE TURNO · preparación 80–100 %';
  progress.append(progressTitle);
  const markers = ['player', 'enemy'].map(actor => {
    const label = document.createElement('label');
    const name = document.createElement('span');
    const meter = document.createElement('progress');
    meter.max = 1;
    label.append(name, meter);
    progress.append(label);
    return { name, meter, actor };
  });
  const message = document.createElement('p');
  message.className = 'combat-access-message';
  message.setAttribute('role', 'status');
  root.append(summary, spacer, actions, progress, message);
  const roster = mountHudRoster(scene, root, utilities);
  scene.game.canvas.parentElement.append(root);
  scene.combatIndicators = mountFighterIndicators(scene, root);
  let visibilityLocks = 0;
  let sleeping = false;
  const refreshVisibility = () => {
    const hidden = Boolean(visibilityLocks > 0 || sleeping || scene.scene.isPaused() || scene.finished);
    if (hidden) restorePerspective();
    if (root.hidden !== hidden) root.hidden = hidden;
    if (root.inert !== hidden) root.inert = hidden;
    scene.combatIndicators.refresh();
    tables?.refresh();
  };
  const suspend = () => {
    hideTooltip();
    visibilityLocks += 1;
    refreshVisibility();
    scene.buttons.forEach(button => button.tooltip.layer.setVisible(false));
    [...scene.playerStatusSlots, ...scene.enemyStatusSlots].forEach(slot => slot.detail.setVisible(false));
    let restored = false;
    return () => {
      if (restored) return;
      restored = true;
      visibilityLocks -= 1;
      refreshVisibility();
    };
  };
  const statusText = unit => [...(unit.guarding ? [{ label: 'Guardia' }] : []), ...(unit.recoveryInitiative ? [{ label: initiativeLabel({ initiative: unit.recoveryInitiative }) }] : []), ...(unit.statuses || []), ...(unit.soak?.stacks ? [{ label: `Empapado ×${unit.soak.stacks}`, duration: unit.soak.turns }] : [])]
    .map(s => `${s.label || s.type}${s.duration ? ` (${s.duration})` : ''}`).join(' · ');
  const refresh = () => {
    roster.refresh();
    inventory.refresh();
    refreshVisibility();
    const compact = root.classList.contains('compact');
    for (const [ui, unit, name] of [[player, scene.player, scene.saveData.character.name], [enemy, scene.enemy, scene.encounters[scene.enemyIndex].name]]) {
      setHudText(ui.name, name.toUpperCase());
      [[unit.hp, unit.maxHp], [unit.chakra, unit.maxChakra]].forEach(([value, max], index) => {
        setHudProgress(ui.bars[index].meter, max > 0 ? value / max : 0);
        setHudText(ui.bars[index].value, `${value}/${max}`);
      });
      setHudText(ui.statuses, statusText(unit));
    }
    setHudText(phaseText, scene.phaseLabel.text);
    setHudText(message, scene.lastBattleMessage?.text || '');
    controls.forEach(control => {
      const { button, name, cost, availability, slot, index } = control;
      const action = tables ? tables.actionAt(index) : scene.actions[index];
      const physical = Boolean(tables?.physical && index > 0 && index < 5);
      const empty = action ? null : physical || scene.mission.training ? tables.emptyAt(index) : emptySkillInfo(scene, index);
      const cooldown = action ? scene.cooldowns[action.id] || 0 : 0;
      const health = actionHealthCost(action);
      const affordable = action && (scene.mission.training && !scene.mission.groupTraining || scene.player.hp > health && scene.player.chakra >= scene.actionCost(action));
      const resource = action ? skillResourceLabel(scene, action, physical) : empty.requirement;
      const requirement = action ? `${resource}${cooldown ? ` · CD ${cooldown}` : !affordable ? health ? ' · Sin vida suficiente' : ' · Sin chakra' : ''}` : empty.requirement;
      const actionName = action?.name || empty.name;
      control.paint(action, physical);
      button.classList.toggle('is-empty', !action);
      setHudAttribute(button, 'data-action-id', action?.id ?? null);
      setHudText(name, actionName);
      setHudText(cost, compact ? requirement : resource);
      setHudText(availability, action ? cooldown ? `CD ${cooldown}` : !affordable ? health ? 'SIN PV' : 'SIN CH' : '' : '');
      setHudAttribute(button, 'data-resource-state', action && !affordable ? 'insufficient' : cooldown ? 'cooldown' : 'normal');
      setHudAttribute(button, 'aria-label', `${index + 1}. ${actionName}${action?.equipmentName ? `, ${action.equipmentName}` : ''}, ${requirement}`);
      setHudAttribute(button, 'aria-disabled', Boolean(!slot.available || scene.skillTableSwitching && index > 0 && index < 5));
      setHudAttribute(button, 'aria-pressed', Boolean(action && action.id === scene.selectedHudActionId));
      setHudAttribute(button, 'title', action ? `${action.name}${action.equipmentName ? ` · ${action.equipmentName}` : ''}: ${requirement} · ${initiativeLabel(action)} para la siguiente acción` : physical || scene.mission.training ? empty.description : `${empty.name}. ${empty.locked ? 'Se abre en ' : 'Configurar en el '}${empty.requirement}`);
    });
    markers.forEach(({ name, actor }) => setHudText(name, actor === 'player' ? scene.saveData.character.name : scene.encounters[scene.enemyIndex].name));
  };
  tables = mountSkillTableControl(scene, { root, actions, restorePerspective, refresh });
  const query = window.matchMedia('(max-width: 899px)');
  // The existing Phaser actions remain the execution contract; the native layer
  // supplies the projected presentation and pointer geometry at every size.
  scene.actionCanvasLayer = scene.add.container(0, 0, scene.actionCanvasParts).setDepth(30).setVisible(false);
  const originals = new Map([...scene.hudCanvasParts, ...scene.actionCanvasParts].map(part => [part, part.visible]));
  const syncCanvasBounds = () => {
    if (root.classList.contains('compact')) {
      for (const key of ['width', 'height', 'left', 'top']) root.style.removeProperty(key);
      scene.game.canvas.parentElement.style.setProperty('--combat-scene-top', `${root.offsetTop + spacer.offsetTop}px`);
      return;
    }
    scene.game.canvas.parentElement.style.removeProperty('--combat-scene-top');
    const canvas = scene.game.canvas.getBoundingClientRect();
    const host = scene.game.canvas.parentElement;
    const bounds = host.getBoundingClientRect();
    Object.assign(root.style, { width: `${canvas.width}px`, height: `${canvas.height}px`,
      left: `${canvas.left - bounds.left - host.clientLeft}px`, top: `${canvas.top - bounds.top - host.clientTop}px` });
  };
  const layout = () => {
    restorePerspective();
    root.classList.toggle('compact', query.matches);
    syncCanvasBounds();
    scene.hudCanvasParts.forEach(part => part.setVisible(!query.matches && originals.get(part)));
    scene.timelineLayer.setVisible(scene.mission.groupTraining || scene.mission.groupCombat || !query.matches && !scene.mission.training);
    scene.game.canvas.parentElement.classList.toggle('compact-combat', query.matches);
    if (query.matches) scene.buttons.forEach(button => button.tooltip.layer.setVisible(false));
    if (query.matches) [...scene.playerStatusSlots, ...scene.enemyStatusSlots].forEach(slot => slot.detail.setVisible(false));
    tables.layout();
    refresh();
  };
  query.addEventListener('change', layout);
  const resizeObserver = new ResizeObserver(() => {
    syncCanvasBounds();
    tables.layout();
    if (frontSkill) faceSkill(frontSkill.row, frontSkill.button, frontSkill.slot);
  });
  resizeObserver.observe(actions);
  resizeObserver.observe(scene.game.canvas);
  resizeObserver.observe(root);
  const onSleep = () => { sleeping = true; refreshVisibility(); };
  const onWake = () => { sleeping = false; refreshVisibility(); };
  scene.events.on('pause', refreshVisibility);
  scene.events.on('resume', refreshVisibility);
  scene.events.on('sleep', onSleep);
  scene.events.on('wake', onWake);
  const remove = () => {
    tables.destroy();
    hideTooltip();
    query.removeEventListener('change', layout);
    resizeObserver.disconnect();
    scene.events.off('pause', refreshVisibility);
    scene.events.off('resume', refreshVisibility);
    scene.events.off('sleep', onSleep);
    scene.events.off('wake', onWake);
    root.remove();
    scene.game.canvas.parentElement?.classList.remove('compact-combat');
    scene.game.canvas.parentElement?.style.removeProperty('--combat-scene-top');
  };
  scene.events.once('shutdown', remove);
  layout();
  return { refresh, suspend, getAction: tables.actionAt, activateAction: tables.activate, toggleSkillTable: tables.toggle, updateProgress(values) {
    if (scene.mission.training) return;
    markers.forEach(({ actor, meter }) => setHudProgress(meter, values[actor]));
  } };
}

export { mountPauseMenu as mountAccessiblePause } from "./pause-menu.js?v=1.3.0";
