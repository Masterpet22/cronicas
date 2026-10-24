import { skillFrameSvg } from "./hud-chrome.js?v=0.87.0";
import { emptySkillInfo } from './hud-art.js?v=0.87.0';

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
  // Native CSS perspective transforms artwork, type and hit targets together.
  // Keep tooltips in the untransformed overlay so their text remains readable.
  actions.innerHTML = skillFrameSvg();
  const controls = scene.actionSlots.map((slot, index) => {
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
    const source = action?.iconTexture && scene.textures.get(action.iconTexture)?.getSourceImage();
    if (source) {
      // Phaser revokes loader blob URLs after decoding. Reuse the decoded
      // texture pixels instead of starting a second request to that dead URL.
      const icon = document.createElement('canvas');
      icon.width = icon.height = 192;
      const width = source.naturalWidth || source.width;
      const height = source.naturalHeight || source.height;
      const scale = Math.min(icon.width / width, icon.height / height);
      const context = icon.getContext('2d');
      const offsetX = (192 - width * scale) / 2, offsetY = (192 - height * scale) / 2;
      context.drawImage(source, offsetX, offsetY, width * scale, height * scale);
      // Remove only transparent padding so differently exported icons have the
      // same visual weight. Preserve their proportions and original artwork.
      const alpha = context.getImageData(0, 0, 192, 192).data;
      let left = 192, top = 192, right = -1, bottom = -1;
      for (let row = 0; row < 192; row += 1) {
        for (let col = 0; col < 192; col += 1) {
          if (alpha[(row * 192 + col) * 4 + 3] > 8) {
            left = Math.min(left, col); right = Math.max(right, col);
            top = Math.min(top, row); bottom = Math.max(bottom, row);
          }
        }
      }
      if (right >= left && bottom >= top) {
        const cropWidth = (right - left + 1) / scale, cropHeight = (bottom - top + 1) / scale;
        const fit = Math.min(184 / cropWidth, 184 / cropHeight);
        context.clearRect(0, 0, 192, 192);
        context.drawImage(source, Math.max(0, (left - offsetX) / scale), Math.max(0, (top - offsetY) / scale), cropWidth, cropHeight,
          (192 - cropWidth * fit) / 2, (192 - cropHeight * fit) / 2, cropWidth * fit, cropHeight * fit);
      }
      const tint = action.id === 'strike' ? [0xd1, 0xa2, 0x5b] : action.type === 'guard' ? [0xa6, 0x41, 0x2d] : null;
      if (tint) {
        const pixels = context.getImageData(0, 0, 192, 192);
        for (let pixel = 0; pixel < pixels.data.length; pixel += 4) {
          for (let channel = 0; channel < 3; channel += 1) pixels.data[pixel + channel] *= tint[channel] / 255;
        }
        context.putImageData(pixels, 0, 0);
      }
      art.append(icon);
    } else {
      const seal = document.createElement('span');
      seal.className = 'combat-skill-seal';
      seal.textContent = '封';
      art.append(seal);
    }
    const mark = ({ fire_embers: '火', fire_breath: '炎', fire_ring: '輪', fire_phoenix: '鳳' })[action?.id];
    if (mark) {
      const glyph = document.createElement('span');
      glyph.className = 'combat-skill-mark';
      glyph.textContent = mark;
      art.append(glyph);
    }
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
      if (root.classList.contains('compact')) return;
      slot.tooltip?.layer.setVisible(true);
    };
    const blur = () => {
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
    return { button, name, cost, availability, slot, index };
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
    controls.forEach(({ button, name, cost, availability, slot, index }) => {
      const action = scene.actions[index];
      const empty = action ? null : emptySkillInfo(scene, index);
      const cooldown = action ? scene.cooldowns[action.id] || 0 : 0;
      const affordable = action && scene.player.chakra >= scene.actionCost(action);
      const requirement = action ? `${scene.actionCost(action)} CH${cooldown ? ` · CD ${cooldown}` : !affordable ? ' · Sin chakra' : ''}` : empty.requirement;
      put(name, action?.name || empty.name);
      put(cost, root.classList.contains('compact') ? requirement : action ? `${scene.actionCost(action)} CH` : empty.requirement);
      put(availability, action ? cooldown ? `CD ${cooldown}` : !affordable ? 'SIN CH' : '' : '');
      button.dataset.resourceState = action && !affordable ? 'insufficient' : cooldown ? 'cooldown' : 'normal';
      button.setAttribute('aria-label', `${index + 1}. ${name.textContent}, ${requirement}`);
      button.setAttribute('aria-disabled', String(!slot.available));
      button.setAttribute('aria-pressed', String(Boolean(slot.selected)));
      button.title = action ? `${action.name}: ${requirement}` : `${empty.name}. ${empty.locked ? 'Se abre en ' : 'Configurar en el '}${empty.requirement}`;
    });
    markers.forEach(({ name, actor }) => put(name, actor === 'player' ? scene.saveData.character.name : scene.encounters[scene.enemyIndex].name));
  };
  const query = window.matchMedia('(max-width: 980px)');
  // The existing Phaser actions remain the execution contract; the native layer
  // supplies the projected presentation and pointer geometry at every size.
  scene.actionCanvasLayer = scene.add.container(0, 0, scene.actionCanvasParts).setDepth(30).setVisible(false);
  const originals = new Map([...scene.hudCanvasParts, ...scene.actionCanvasParts].map(part => [part, part.visible]));
  const layout = () => {
    root.classList.toggle('compact', query.matches);
    scene.hudCanvasParts.forEach(part => part.setVisible(!query.matches && originals.get(part)));
    scene.timelineLayer.setVisible(!query.matches);
    scene.pauseButton.bg.setVisible(!query.matches);
    scene.pauseButton.label.setVisible(!query.matches);
    scene.game.canvas.parentElement.classList.toggle('compact-combat', query.matches);
    if (query.matches) scene.buttons.forEach(button => button.tooltip.layer.setVisible(false));
    if (query.matches) [...scene.playerStatusSlots, ...scene.enemyStatusSlots].forEach(slot => slot.detail.setVisible(false));
    refresh();
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
