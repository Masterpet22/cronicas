import { emptySkillInfo } from './hud-art.js?v=0.86.0';

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
  pause.textContent = 'Ⅱ';
  pause.addEventListener('click', () => scene.openBattlePause());
  phase.append(phaseText, pause);
  summary.append(phase);
  const spacer = document.createElement('div');
  spacer.className = 'combat-access-scene';
  spacer.setAttribute('aria-hidden', 'true');
  const actions = document.createElement('div');
  actions.className = 'combat-access-actions';
  const controls = scene.actionSlots.map((slot, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.combatAction = index + 1;
    button.style.setProperty('--row', index);
    const name = document.createElement('span');
    const cost = document.createElement('b');
    button.append(name, cost);
    const focus = () => {
      if (root.classList.contains('compact')) return;
      slot.hoverRing?.setVisible(true);
      slot.tooltip?.layer.setVisible(true);
    };
    const blur = () => {
      slot.hoverRing?.setVisible(Boolean(slot.selected));
      slot.tooltip?.layer.setVisible(false);
    };
    button.addEventListener('pointerenter', focus);
    button.addEventListener('pointerleave', blur);
    button.addEventListener('focus', focus);
    button.addEventListener('blur', blur);
    button.addEventListener('click', () => {
      if (!scene.scene.isActive() || scene.finished) return;
      if (slot.available) slot.hit.emit('pointerdown');
    });
    actions.append(button);
    return { button, name, cost, slot, index };
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
  scene.game.canvas.parentElement.append(root);
  const put = (el, text) => { if (el.textContent !== String(text)) el.textContent = text; };
  const statusText = unit => [...(unit.guarding ? [{ label: 'Guardia' }] : []), ...(unit.statuses || []), ...(unit.soak?.stacks ? [{ label: `Empapado ×${unit.soak.stacks}`, duration: unit.soak.turns }] : [])]
    .map(s => `${s.label || s.type}${s.duration ? ` (${s.duration})` : ''}`).join(' · ');
  const refresh = () => {
    const paused = scene.scene.isPaused();
    root.hidden = paused;
    for (const [ui, unit, name] of [[player, scene.player, scene.saveData.character.name], [enemy, scene.enemy, scene.encounters[scene.enemyIndex].name]]) {
      put(ui.name, name.toUpperCase());
      [[unit.hp, unit.maxHp], [unit.chakra, unit.maxChakra]].forEach(([value, max], index) => {
        const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
        if (ui.bars[index].meter.value !== ratio) ui.bars[index].meter.value = ratio;
        put(ui.bars[index].value, `${value}/${max}`);
      });
      put(ui.statuses, statusText(unit));
    }
    put(phaseText, scene.phaseLabel.text);
    put(message, scene.lastBattleMessage?.text || '');
    controls.forEach(({ button, name, cost, slot, index }) => {
      const action = scene.actions[index];
      const empty = action ? null : emptySkillInfo(scene, index);
      const cooldown = action ? scene.cooldowns[action.id] || 0 : 0;
      const affordable = action && scene.player.chakra >= scene.actionCost(action);
      const requirement = action ? `${scene.actionCost(action)} CH${cooldown ? ` · CD ${cooldown}` : !affordable ? ' · Sin chakra' : ''}` : empty.requirement;
      put(name, `${index + 1}. ${action?.name || empty.name}`);
      put(cost, requirement);
      button.setAttribute('aria-label', `${name.textContent}, ${requirement}`);
      button.setAttribute('aria-disabled', String(!slot.available));
      button.setAttribute('aria-pressed', String(Boolean(slot.selected)));
      button.title = action ? `${action.name}: ${requirement}` : `${empty.name}. ${empty.locked ? 'Se abre en ' : 'Configurar en el '}${empty.requirement}`;
    });
    markers.forEach(({ name, actor }) => put(name, actor === 'player' ? scene.saveData.character.name : scene.encounters[scene.enemyIndex].name));
  };
  const query = window.matchMedia('(max-width: 980px)');
  const originals = new Map([...scene.hudCanvasParts, ...scene.actionCanvasParts].map(part => [part, part.visible]));
  const layout = () => {
    root.classList.toggle('compact', query.matches);
    scene.hudCanvasParts.forEach(part => part.setVisible(!query.matches && originals.get(part)));
    scene.actionCanvasParts.forEach(part => part.setVisible(!query.matches && originals.get(part)));
    scene.timelineLayer.setVisible(!query.matches);
    scene.pauseButton.bg.setVisible(!query.matches);
    scene.pauseButton.label.setVisible(!query.matches);
    scene.game.canvas.parentElement.classList.toggle('compact-combat', query.matches);
    if (query.matches) scene.buttons.forEach(button => button.tooltip.layer.setVisible(false));
    if (query.matches) [...scene.playerStatusSlots, ...scene.enemyStatusSlots].forEach(slot => slot.detail.setVisible(false));
  };
  query.addEventListener('change', layout);
  const remove = () => {
    query.removeEventListener('change', layout);
    root.remove();
    scene.game.canvas.parentElement?.classList.remove('compact-combat');
  };
  scene.events.once('shutdown', remove);
  layout();
  refresh();
  return { refresh, updateProgress(values) {
    markers.forEach(({ actor, meter }) => { meter.value = Math.max(0, Math.min(1, values[actor])); });
  } };
}

export function mountAccessiblePause(scene) {
  const battleHud = scene.game.canvas.parentElement.querySelector('.combat-access');
  if (battleHud) battleHud.inert = true;
  const root = document.createElement('section');
  root.className = 'combat-pause-access';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Misión en pausa');
  const title = document.createElement('h2');
  title.textContent = 'MISIÓN EN PAUSA';
  const preferences = document.createElement('p');
  preferences.className = 'combat-pause-preferences';
  const updatePreferences = () => {
    const theme = document.getElementById('hud-theme');
    preferences.textContent = `${theme.selectedOptions[0].textContent} · Volumen ${document.getElementById('game-volume').value}%`;
  };
  updatePreferences();
  root.append(title, preferences);
  const controls = scene.children.list.filter(part => part.input?.enabled).map(part => {
    const button = document.createElement('button');
    button.type = 'button';
    button.style.setProperty('--x', `${(part.x - part.width / 2) / 9.6}%`);
    button.style.setProperty('--y', `${(part.y - part.height / 2) / 5.4}%`);
    button.style.setProperty('--w', `${part.width / 9.6}%`);
    button.style.setProperty('--h', `${part.height / 5.4}%`);
    const label = () => {
      const texts = scene.children.list.filter(child => typeof child.text === 'string' && child.y === part.y && Math.abs(child.x - part.x) <= part.width / 2);
      let text = texts.map(child => child.text).join(' · ');
      if (part.y === 347) text = part.x < 480 ? 'Marco anterior' : 'Marco siguiente';
      if (part.y === 392) text = part.x < 480 ? 'Bajar volumen' : 'Subir volumen';
      button.textContent = text;
    };
    label();
    button.addEventListener('click', () => {
      part.emit('pointerup');
      controls.forEach(control => control.label());
      updatePreferences();
    });
    root.append(button);
    return { button, label };
  });
  scene.game.canvas.parentElement.append(root);
  root.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const first = controls[0]?.button;
    const last = controls.at(-1)?.button;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
  });
  controls[0]?.button.focus({ preventScroll: true });
  scene.events.once('shutdown', () => {
    if (battleHud) battleHud.inert = false;
    root.remove();
    scene.game.canvas.parentElement?.querySelector('.combat-access-pause')?.focus({ preventScroll: true });
  });
}
