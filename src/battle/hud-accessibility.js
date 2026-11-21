import { skillFrameSvg } from "./hud-chrome.js?v=0.171.0";
import { initiativeLabel } from "./initiative.js?v=1.0.0";
import { mountBattleInventory } from "./battle-inventory.js?v=0.171.0";
import { emptySkillInfo } from './hud-art.js?v=0.171.0';
import { paintBattleSkillArt } from './skill-icons.js?v=0.164.0';
import { mountSkillTableControl } from './skill-table-control.js?v=0.171.0';
import { actionHealthCost, skillResourceLabel } from './skill-tables.js?v=0.171.0';
import { setHudAttribute, setHudProgress, setHudText } from './hud-dom.js?v=1.0.0';
import { mountHudRoster } from './hud-roster.js?v=0.171.0';
import { mountFighterIndicators } from './fighter-indicators.js?v=1.0.0';
import { actionDescription, actionLines } from '../ui.js?v=0.171.0';

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
  player.name.parentElement.classList.add('combat-status-player');
  enemy.name.parentElement.classList.add('combat-status-target');
  const targetLabel = document.createElement('span');
  targetLabel.className = 'combat-target-label';
  targetLabel.textContent = 'Objetivo';
  enemy.name.before(targetLabel);
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
  actions.innerHTML = skillFrameSvg();
  let tables = null;
  const detail = document.createElement('aside');
  detail.className = 'combat-skill-detail';
  detail.hidden = true;
  const detailTitle = document.createElement('strong');
  const detailEffect = document.createElement('p');
  detailEffect.id = 'combat-skill-effect';
  const detailResource = document.createElement('p');
  const detailUse = document.createElement('button');
  detailUse.type = 'button';
  detailUse.textContent = 'Usar técnica';
  detail.append(detailTitle, detailEffect, detailResource, detailUse);
  let inspected = null;
  let touchInspection = false;
  const hideDetails = () => {
    inspected?.button.removeAttribute('aria-describedby');
    inspected?.button.classList.remove('is-inspected');
    inspected = null;
    touchInspection = false;
    detail.hidden = true;
  };
  const updateDetails = () => {
    if (!inspected) return;
    const { button, inspection } = inspected;
    setHudText(detailTitle, inspection.name);
    setHudText(detailEffect, inspection.effect);
    setHudText(detailResource, inspection.requirement);
    detailUse.hidden = !touchInspection || !inspection.action;
    detailUse.disabled = button.getAttribute('aria-disabled') === 'true';
    detail.hidden = false;
  };
  const inspect = (control, touch = false) => {
    if (root.hidden || root.inert || scene.skillTableSwitching || touchInspection && !touch) return;
    if (inspected !== control) hideDetails();
    inspected = control;
    touchInspection = touch;
    control.button.classList.add('is-inspected');
    control.button.setAttribute('aria-describedby', detailEffect.id);
    updateDetails();
    if (touch && root.classList.contains('compact')) detail.scrollIntoView({ block: 'nearest' });
  };
  detailUse.addEventListener('click', () => {
    if (!inspected || detailUse.disabled) return;
    const { index } = inspected;
    hideDetails();
    tables.activate(index);
  });
  const dismissTouchDetails = event => {
    if (touchInspection && !actions.contains(event.target) && !detail.contains(event.target)) hideDetails();
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
    const action = scene.actions[index];
    paintBattleSkillArt(scene, art, action, { index });
    let artKey = `elemental:${action?.id || "empty"}`;
    art.setAttribute('aria-hidden', 'true');
    shortcut.setAttribute('aria-hidden', 'true');
    const info = document.createElement('span');
    info.className = 'combat-skill-info';
    info.append(name, cost);
    button.classList.toggle('is-empty', !action);
    if (action) button.dataset.actionId = action.id;
    button.append(shortcut, art, info);
    const control = { button, row, name, cost, index,
      get slot() { return tables?.slotAt(index) || slot; },
      paint(action, physical) {
        const key = `${physical ? "physical" : "elemental"}:${action?.id || "empty"}`;
        if (key === artKey || index === 0 || index === 5) return;
        artKey = key; paintBattleSkillArt(scene, art, action, { physical, index });
      }
    };
    row.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') inspect(control); });
    row.addEventListener('pointerleave', () => {
      if (!touchInspection && inspected === control && !button.matches(':focus-visible')) hideDetails();
    });
    button.addEventListener('focus', () => { if (button.matches(':focus-visible')) inspect(control); });
    button.addEventListener('blur', () => { if (!touchInspection && inspected === control) hideDetails(); });
    button.addEventListener('click', event => {
      if (event.pointerType === 'touch' || event.pointerType === 'pen') {
        inspect(control, true);
        return;
      }
      if (button.getAttribute('aria-disabled') === 'true') return;
      hideDetails();
      tables.activate(index);
    });
    row.append(button);
    actions.append(row);
    return control;
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
  root.append(summary, spacer, actions, detail, progress, message);
  // A compact detail can extend the page below the touch target. Close it
  // after the target's click so the viewport cannot move during the tap.
  document.addEventListener('click', dismissTouchDetails);
  const roster = mountHudRoster(scene, root, utilities);
  scene.game.canvas.parentElement.append(root);
  scene.combatIndicators = mountFighterIndicators(scene, root);
  let visibilityLocks = 0;
  let sleeping = false;
  const refreshVisibility = () => {
    const hidden = Boolean(visibilityLocks > 0 || sleeping || scene.scene.isPaused() || scene.finished);
    if (hidden) hideDetails();
    if (root.hidden !== hidden) root.hidden = hidden;
    if (root.inert !== hidden) root.inert = hidden;
    scene.combatIndicators.refresh();
    tables?.refresh();
  };
  const suspend = () => {
    hideDetails();
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
    player.name.parentElement.classList.toggle('is-active', scene.turnReady);
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
      const { button, row, name, cost, slot, index } = control;
      const action = tables ? tables.actionAt(index) : scene.actions[index];
      const physical = Boolean(tables?.physical && index > 0 && index < 5);
      const empty = action ? null : physical || scene.mission.training ? tables.emptyAt(index) : emptySkillInfo(scene, index);
      const cooldown = action ? scene.cooldowns[action.id] || 0 : 0;
      const health = actionHealthCost(action);
      const freePractice = scene.mission.training && !scene.mission.groupTraining;
      const missingChakra = !action || freePractice ? 0 : Math.max(0, scene.actionCost(action) - scene.player.chakra);
      const missingHealth = !health || freePractice ? 0 : Math.max(0, health + 1 - scene.player.hp);
      const shortage = [missingChakra ? `${missingChakra} CH` : '', missingHealth ? `${missingHealth} PV` : ''].filter(Boolean).join(' y ');
      const unavailable = shortage ? `Falta${missingChakra + missingHealth > 1 ? 'n' : ''} ${shortage}`
        : cooldown ? `CD ${cooldown}`
          : action?.type === 'guard' && scene.player.guarding ? 'Guardia activa' : '';
      const resource = action ? skillResourceLabel(scene, action, physical) : empty.requirement;
      const requirement = unavailable ? `${resource} · ${unavailable}` : resource;
      const actionName = action?.name || empty.name;
      const [, damage, timing] = action ? actionLines(action) : [];
      const effect = action ? action.type === 'guard' ? actionDescription(action)
        : [action.description || actionDescription(action), damage, timing].join(' · ')
        : empty.description || (empty.locked ? `Se abre en ${empty.requirement}` : 'Equipa una técnica en el Dojo.');
      control.inspection = { action, name: actionName, effect, requirement };
      control.paint(action, physical);
      button.classList.toggle('is-empty', !action);
      row.classList.toggle('is-empty-row', !action);
      setHudAttribute(button, 'data-action-id', action?.id ?? null);
      setHudText(name, actionName);
      setHudText(cost, requirement);
      setHudAttribute(button, 'data-resource-state', shortage ? 'insufficient' : cooldown ? 'cooldown' : 'normal');
      setHudAttribute(button, 'aria-label', `${index + 1}. ${actionName}${action?.equipmentName ? `, ${action.equipmentName}` : ''}, ${requirement}`);
      setHudAttribute(button, 'aria-disabled', Boolean(!slot.available || scene.skillTableSwitching && index > 0 && index < 5));
      setHudAttribute(button, 'aria-pressed', Boolean(action && action.id === scene.selectedHudActionId));
    });
    updateDetails();
    markers.forEach(({ name, actor }) => setHudText(name, actor === 'player' ? scene.saveData.character.name : scene.encounters[scene.enemyIndex].name));
  };
  tables = mountSkillTableControl(scene, { root, actions, hideDetails, refresh });
  const query = window.matchMedia('(max-width: 899px)');
  const tabletTimeline = window.matchMedia('(min-width: 700px)');
  // The existing Phaser actions remain the execution contract; the native layer
  // supplies the projected presentation and pointer geometry at every size.
  scene.actionCanvasLayer = scene.add.container(0, 0, scene.actionCanvasParts).setDepth(30).setVisible(false);
  const originals = new Map([...scene.hudCanvasParts, ...scene.actionCanvasParts].map(part => [part, part.visible]));
  const syncCanvasBounds = () => {
    if (!root.isConnected || !scene.game?.canvas?.parentElement) return;
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
    if (!root.isConnected || !scene.game?.canvas?.parentElement) return;
    hideDetails();
    root.classList.toggle('compact', query.matches);
    syncCanvasBounds();
    scene.hudCanvasParts.forEach(part => part.setVisible(!query.matches && originals.get(part)));
    // A selected rival may have a different hairstyle from the initial portrait.
    // Reapply its current visibility after restoring the desktop canvas HUD.
    scene.refreshHud();
    const showTimeline = Boolean(scene.mission.groupTraining || scene.mission.groupCombat || tabletTimeline.matches && !scene.mission.training);
    scene.timelineLayer.setVisible(showTimeline);
    root.classList.toggle('has-canvas-timeline', showTimeline);
    scene.game.canvas.parentElement.classList.toggle('compact-combat', query.matches);
    if (query.matches) scene.buttons.forEach(button => button.tooltip.layer.setVisible(false));
    if (query.matches) [...scene.playerStatusSlots, ...scene.enemyStatusSlots].forEach(slot => slot.detail.setVisible(false));
    tables.layout();
    refresh();
  };
  query.addEventListener('change', layout);
  tabletTimeline.addEventListener('change', layout);
  const resizeObserver = new ResizeObserver(() => {
    if (!root.isConnected || !scene.game?.canvas?.parentElement) return;
    syncCanvasBounds();
    tables.layout();
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
    hideDetails();
    document.removeEventListener('click', dismissTouchDetails);
    query.removeEventListener('change', layout);
    tabletTimeline.removeEventListener('change', layout);
    resizeObserver.disconnect();
    scene.events.off('pause', refreshVisibility);
    scene.events.off('resume', refreshVisibility);
    scene.events.off('sleep', onSleep);
    scene.events.off('wake', onWake);
    root.remove();
    scene.game.canvas?.parentElement?.classList.remove('compact-combat');
    scene.game.canvas?.parentElement?.style.removeProperty('--combat-scene-top');
  };
  scene.events.once('shutdown', remove);
  layout();
  return { refresh, suspend, getAction: tables.actionAt, activateAction: tables.activate, toggleSkillTable: tables.toggle, updateProgress(values) {
    if (scene.mission.training) return;
    markers.forEach(({ actor, meter }) => setHudProgress(meter, values[actor]));
  } };
}

export { mountPauseMenu as mountAccessiblePause } from "./pause-menu.js?v=0.155.0";
