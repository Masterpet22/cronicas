import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const output = process.env.COMBAT_HUD_OUTPUT || 'artifacts/combat-hud';

// Keep verification self-contained, including after an interrupted terminal.
let localServer;
try { await fetch('http://127.0.0.1:4173'); } catch {
  localServer = spawn(process.execPath, ['scripts/static-server.mjs'], { stdio: 'ignore', windowsHide: true });
  localServer.unref();
  process.on('exit', () => localServer.kill());
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try { await fetch('http://127.0.0.1:4173'); break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, reducedMotion: 'reduce', hasTouch: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const groupMode = process.argv.includes('--group');
await page.goto('http://127.0.0.1:4173');
await page.evaluate(async groupMode => {
  const { createDefaultSave, createCharacter, writeSave, selectSaveSlot } = await import('/src/save.js?v=0.66.0');
  const save = createCharacter(createDefaultSave(), { name: 'Akio', affinity: 'agua', hair: 1, bodyType: 'male' });
  save.campaign.completedMissions = ['m01'];
  save.campaign.tutorialSeen = true;
  if (groupMode) { save.progression.level = 6; save.campaign.kuroganeCompanion = 'haruto'; }
  selectSaveSlot(1);
  writeSave(save);
  localStorage.setItem('music-enabled', 'off');
  localStorage.setItem('seal-input-mode', 'automatic');
}, groupMode);
await page.reload();
await page.locator('[data-select-slot="1"]').click();
await page.evaluate(async () => {
  const { loadPhaser } = await import('/src/battle/load-phaser.js?v=1.0.0');
  await loadPhaser();
  const { BattleScene } = await import('/src/battle/scenes/battle-scene.js?v=0.176.0');
  const create = BattleScene.prototype.create;
  BattleScene.prototype.create = function (...args) { window.__hudScene = this; return create.apply(this, args); };
});
await page.locator('.debug-tools-trigger').click();
await page.locator(groupMode ? '[data-debug-mission="k03"]' : '[data-debug-mission="m01"]').click();
await page.waitForFunction(() => window.__hudScene?.turnReady, null, { polling: 150, timeout: 60000 }).catch(async error => {
  const state = await page.evaluate(() => ({
    scene: window.__hudScene?.scene.key,
    turnReady: window.__hudScene?.turnReady,
    phase: window.__hudScene?.phaseLabel?.text,
    dialog: document.querySelector('dialog[open]')?.textContent
  }));
  await browser.close();
  throw new Error(`El combate no llegó al turno del jugador: ${JSON.stringify({ state, errors })}`, { cause: error });
});
await page.mouse.move(950, 720);
await mkdir(output, { recursive: true });
await page.screenshot({ path: join(output, 'combat-1600x900.png') });
if (groupMode) {
  const cards = page.locator('.combat-roster-enemies .combat-roster-card');
  assert.equal(await cards.count(), 2);
  assert.equal(await page.locator('.combat-roster-allies .combat-roster-card').count(), 1);
  assert.equal(await page.locator('.combat-mission-objective').count(), 0);
  const selected = await page.evaluate(() => window.__hudScene.selectedTargetIndex);
  await cards.first().click();
  assert.notEqual(await page.evaluate(() => window.__hudScene.selectedTargetIndex), selected);
  assert.ok(await page.evaluate(async () => {
    const s = window.__hudScene;
    const { fighterAtlasKey, fighterFaceTextureKey } = await import('/src/fighters.js?v=0.153.0');
    const { enemyFighterAppearance } = await import('/src/character.js?v=0.119.0');
    const selected = s.selectedTargetIndex;
    const resources = s.trainingTargets.map(target => [target.state.hp, target.state.chakra]);
    let matches = true;
    for (let i=0; i<s.trainingTargets.length; i++) {
      s.selectTrainingTarget(i);
      const target=s.trainingTargets[i], look=enemyFighterAppearance(target.profile);
      const marker=s.groupMarkers[i];
      const hair=look.hair===4?'player-hair-coleta':look.hair===1?'player-hair-corto':null;
      matches &&= s.enemyPortrait.head.texture.key===fighterAtlasKey(look)
        && s.enemyPortrait.face.texture.key===fighterFaceTextureKey(look)
        && s.enemyPortrait.hair.visible===Boolean(hair)
        && (!hair || s.enemyPortrait.hair.texture.key===hair)
        && marker.marker.texture.key===target.fighter.head.texture.key
        && marker.face.texture.key===fighterFaceTextureKey(look)
        && (marker.hair?.texture.key||null)===hair;
    }
    s.selectTrainingTarget(selected);
    return matches && JSON.stringify(resources)===JSON.stringify(s.trainingTargets.map(target=>[target.state.hp,target.state.chakra]));
  }), 'Cuerpo, retrato principal y marcador individual deben conservar la misma identidad al cambiar de objetivo');
  await page.evaluate(() => {
    const s = window.__hudScene;
    s.companion.state.hp -= 17; s.companion.state.chakra -= 9;
    s.trainingTargets[0].state.hp = 43;
    s.objective.hp = 64; s.refreshHud();
  });
  assert.match(await page.locator('.combat-roster-allies').innerText(), /51\/60/);
  await page.locator('.combat-access-objectives').click();
  assert.match(await page.locator('.combat-mission-objective').innerText(), /documentos de transporte/);
  assert.match(await page.locator('.combat-mission-objective').innerText(), /64\/100/);
  await page.locator('[data-objectives-close]').click();
  await page.waitForFunction(() => window.__hudScene.scene.isActive());
  assert.ok(await cards.locator('progress').evaluateAll(meters => meters.every(meter => getComputedStyle(meter).direction === 'rtl')),
    'Las barras secundarias enemigas deben vaciarse desde el mismo extremo que el panel principal');
  assert.ok(await page.evaluate(() => {
    const s = window.__hudScene;
    s.combatIndicators.refresh();
    return s.combatIndicators.active.visible && s.combatIndicators.selection.visible && s.combatIndicators.ground.visible;
  }), 'Turno activo, selección dorada y aro aliado visibles');
  for (const [width, height] of [[1600,900], [1366,768], [1024,768], [960,720], [768,1024]]) {
    await page.setViewportSize({width, height});
    await page.waitForTimeout(250);
    for (const control of await page.locator('.combat-access-actions button, .combat-access-utilities button').all()) {
      const box = await control.boundingBox();
      assert.ok(box && box.width >= 43 && box.height >= 43, `Control táctil ${width}: ${JSON.stringify(box)}`);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.ok(await page.locator('.combat-roster-card:visible').evaluateAll(cards => cards.every(card => {
      const box = card.getBoundingClientRect();
      return [...card.querySelectorAll('.combat-roster-title, label')].every(row => {
        const rect = row.getBoundingClientRect();
        return rect.top >= box.top + 1 && rect.bottom <= box.bottom - 1;
      });
    })), `Nombre y ambas barras deben quedar dentro de las tarjetas a ${width}px`);
    assert.equal(await cards.filter({visible: true}).count(), 2, `Ambos rivales secundarios visibles a ${width}px`);
    assert.ok(await page.evaluate(() => {
      const s = window.__hudScene, canvas = s.game.canvas.getBoundingClientRect();
      const panels = [...document.querySelectorAll('.combat-roster-enemies .combat-roster-card')]
        .filter(el => el.getClientRects().length).map(el => el.getBoundingClientRect());
      return s.trainingTargets.every(({fighter}) => {
        const b = fighter.head.getBounds();
        const head = {left: canvas.left + b.left * canvas.width / 960, right: canvas.left + b.right * canvas.width / 960,
          top: canvas.top + b.top * canvas.height / 540, bottom: canvas.top + b.bottom * canvas.height / 540};
        return panels.every(panel => panel.right <= head.left || panel.left >= head.right || panel.bottom + 6 <= head.top || panel.top >= head.bottom);
      });
    }), `Ninguna tarjeta debe tapar el rostro de los tres rivales a ${width}px`);
    await page.screenshot({path: join(output, `reference-group-${width}x${height}.png`), fullPage: true});
  }
  await page.locator('[data-combat-action="6"]').tap();
  const detail = page.locator('.combat-skill-detail');
  assert.ok(await detail.isVisible());
  assert.match(await detail.innerText(), /Reduce un 50 %/);
  assert.equal(await page.evaluate(() => window.__hudScene.turnReady), true, 'El toque permite consultar antes de ejecutar');
  await detail.screenshot({path: join(output, 'reference-group-tablet-detail.png')});
  const previousTarget = await page.evaluate(() => window.__hudScene.selectedTargetIndex);
  await cards.first().tap();
  assert.equal(await page.locator('.combat-skill-detail').isVisible(), false);
  assert.notEqual(await page.evaluate(() => window.__hudScene.selectedTargetIndex), previousTarget);
  await page.locator(`[data-training-target="${previousTarget}"]`).tap();
  assert.ok(await page.evaluate(() => {
    const s = window.__hudScene;
    const before = [s.timelineProgress.player, s.companion.progress, ...s.trainingTargets.map(target => target.progress)];
    const setProgress = ([player, companion, ...targets]) => {
      s.timelineProgress.player = player;
      s.companion.progress = companion;
      s.trainingTargets.forEach((target, index) => { target.progress = targets[index]; });
      s.updateTimelineMarkers();
    };
    try {
      return [0, .9, 1].every(value => {
        setProgress(before.map(() => value));
        const halos = [s.playerMarkerHalo, s.companionMarker, ...s.groupMarkers.map(entry => entry.halo)];
        return new Set(halos.map(marker => marker.y)).size === 2 &&
          halos.every((a, i) => halos.slice(i + 1).every(b => Math.hypot(a.x - b.x, a.y - b.y) >= 28));
      });
    } finally {
      setProgress(before);
    }
  }), 'Los cinco retratos se separan aunque coincidan sus progresos, incluso en los extremos');
  await page.setViewportSize({width:1600,height:900});
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.__hudScene.enemyPortrait.hair.visible), false,
    'Volver de tablet vertical no debe devolver el cabello del rival anterior a la vigía sin pelo');
  assert.ok(await page.evaluate(async () => {
    const s=window.__hudScene, target=s.trainingTargets[1], origin=[target.fighter.body.x,target.fighter.body.y];
    const {ENEMY_ACTIONS}=await import('/src/data.js?v=1.5.0');
    const start=s.startTurnCharge, roll=s.rollHit;
    s.stopTurnTimeline(); s.startTurnCharge=()=>{}; s.rollHit=()=>true;
    s.timelinePaused=false; s.busy=false;
    try { await s.executeGroupAction('enemy',ENEMY_ACTIONS.strike,1); }
    finally { s.startTurnCharge=start; s.rollHit=roll; s.busy=false; s.turnReady=true; s.refreshHud(); }
    return target.profile.appearance.bodyType==='female' && target.fighter.body.x===origin[0] && target.fighter.body.y===origin[1];
  }), 'La rival femenina debe atacar con el rig real y volver a su posición sin perder el uniforme');
  await page.locator('.combat-access-pause').click();
  assert.equal(await page.evaluate(() => window.__hudScene.combatIndicators.active.visible), false);
  await page.getByRole('button', {name:'REANUDAR',exact:true}).click();
  await page.waitForFunction(() => window.__hudScene.scene.isActive());
  assert.deepEqual(errors, []);
  await writeFile(join(output, 'reference-verification.json'), JSON.stringify({roster:true, targetSelection:true, liveResources:true, objective:true, tabletTouchTargets:true, errors}, null, 2));
  await browser.close();
  console.log('HUD de grupo: tarjetas, selección, recursos, objetivo, pausa y cinco tamaños verificados; sin errores.');
  process.exit(0);
}
const checks = [];
const record = message => { checks.push(message); console.log(message); };
const state = await page.evaluate(() => {
  const s = window.__hudScene;
  return { chakra: s.player.chakra, cost: s.actionCost(s.actions[1]), hp: s.enemy.hp, hero: [s.hero.body.x, s.hero.body.y], foe: [s.foe.body.x, s.foe.body.y] };
});
assert.deepEqual(state.hero, [280, 372]);
assert.deepEqual(state.foe, [662, 372]);
assert.ok(await page.evaluate(() => {
  const s = window.__hudScene;
  return !s.playerTurnMarker.flipX && !s.enemyTurnMarker.flipX;
}), 'Ambos retratos deben mirar en el sentido de avance');
assert.ok(await page.locator('.combat-access-actions').evaluate(el => getComputedStyle(el).transform === 'none'), 'El panel de técnicas debe quedar frontal y legible');
record('Retratos orientados hacia el avance y panel frontal sin deformación');
assert.ok(await page.locator('.combat-skill-art canvas').evaluateAll(canvases => canvases.length > 0 && canvases.every(canvas => {
  const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  return pixels.some((value, index) => index % 4 === 3 && value > 0);
})), 'Los iconos deben conservar sus píxeles originales visibles');
assert.ok(await page.locator('.combat-skill-art canvas').evaluateAll(canvases => canvases.every(canvas => {
  const box = canvas.getBoundingClientRect(), frame = canvas.parentElement.getBoundingClientRect();
  return box.left >= frame.left && box.right <= frame.right && box.top >= frame.top && box.bottom <= frame.bottom;
})), 'Los iconos deben quedar dentro de sus marcos circulares');
assert.ok(await page.locator('.combat-skill-cost').evaluateAll(costs => costs.every(cost => {
  return cost.getBoundingClientRect().right <= cost.closest('button').getBoundingClientRect().right;
})), 'Las placas de coste deben caber en sus filas');
record('Iconos encuadrados en sus aros y placas de coste sin desbordamiento');
if (process.argv.includes('--pause-only') || process.argv.includes('--transitions-only')) {
  await page.locator('.combat-access-pause').click();
  await page.waitForSelector('.combat-pause-access');
  assert.equal(await page.locator('.combat-access').evaluate(el => el.inert), true);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'ABANDONAR');
  await page.keyboard.press('Tab');
  assert.match(await page.evaluate(() => document.activeElement.textContent), /Sellos manuales/);
  assert.doesNotMatch(await page.locator('.combat-pause-access').innerText(), /MARCO|LUNAR|PERGAMINO/i);
  await page.screenshot({ path: join(output, 'pause-without-theme-1600x900.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.locator('#hud-theme').count(), 0);
  assert.doesNotMatch(await page.locator('.combat-pause-access').innerText(), /MARCO|LUNAR|PERGAMINO/i);
  await page.getByRole('button', { name: 'Subir volumen', exact: true }).click();
  assert.match(await page.locator('.combat-pause-preferences').innerText(), /Volumen 80%/);
  await page.screenshot({ path: join(output, 'pause-390x844.png'), fullPage: true });
  await page.getByRole('button', { name: 'REANUDAR', exact: true }).click();
  await page.waitForFunction(() => window.__hudScene.scene.isActive());
  assert.equal(await page.locator('.combat-access').evaluate(el => el.inert), false);
  assert.deepEqual(errors, []);
  await writeFile(join(output, 'pause-accessibility.json'), JSON.stringify({ focusLoop: true, backgroundInert: true, volume: true, themeSelectorRemoved: true, resume: true, errors }));
  if (process.argv.includes('--pause-only')) {
    await browser.close();
    console.log('Pausa: selector retirado, volumen y reanudación correctos, sin errores');
    process.exit(0);
  }
}
if (process.argv.includes('--transitions-only')) {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.evaluate(() => {
    const s = window.__hudScene;
    s.busy = true;
    s.turnReady = false;
    s.stopTurnTimeline();
    s.setButtonsEnabled(false);
    s.loseHealth(s.enemy, s.foe, s.enemy.hp, { react: false });
    window.__advanceDone = false;
    window.__advancePromise = s.resolveEnemyOutcome().then(() => { window.__advanceDone = true; });
  });
  await page.waitForFunction(() => window.__hudScene.children.list.some(child => child.depth === 70 && child.texture?.key === 'forest-road' && child.alpha > .95));
  await page.evaluate(() => { window.__hudScene.tweens.timeScale = 0; window.__hudScene.refreshHud(); });
  assert.equal(await page.locator('.combat-access-actions').isVisible(), false);
  assert.equal(await page.locator('.combat-access').evaluate(el => el.inert), true);
  await page.screenshot({ path: join(output, 'encounter-transition-no-skills-1600x900.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.combat-access-actions').isVisible(), false);
  assert.ok((await page.locator('#game').boundingBox()).height > 0);
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.evaluate(() => { window.__hudScene.tweens.timeScale = 1; });
  await page.waitForFunction(() => window.__advanceDone);
  assert.equal(await page.locator('.combat-access-actions').isVisible(), true);
  assert.equal(await page.evaluate(() => window.__hudScene.enemyIndex), 1);
  await page.evaluate(() => {
    window.__investigationDone = false;
    window.__hudScene.playInvestigationPhase().then(() => { window.__investigationDone = true; });
  });
  await page.locator('.mission-investigation-overlay').waitFor();
  assert.equal(await page.locator('.combat-access-actions').isVisible(), false);
  for (const clue of ['cart', 'house', 'tracks']) {
    await page.locator(`[data-investigation-region="${clue}"]`).press('Enter');
  }
  await page.locator('[data-mission-investigation-continue]').click();
  await page.waitForFunction(() => window.__investigationDone);
  assert.equal(await page.locator('.combat-access-actions').isVisible(), true);
  await page.evaluate(() => { window.__hudScene.finishBattle(false); });
  await page.waitForFunction(() => !window.__hudScene.scene.isActive());
  assert.equal(await page.locator('.combat-access').count(), 0);
  await page.screenshot({ path: join(output, 'mission-exit-no-skills-1600x900.png') });
  assert.deepEqual(errors, []);
  await writeFile(join(output, 'transition-regression.json'), JSON.stringify({ themeOptionRemoved: true, volumeAndResume: true, encounterTransition: true, resizeDuringTransition: true, combatRestored: true, investigation: true, missionExit: true, errors }, null, 2));
  await browser.close();
  console.log('Pausa sin selector; habilidades ocultas en transición, investigación y salida; restauración y resize correctos; sin errores');
  process.exit(0);
}
for (const [width, height] of [[1920, 1080], [1366, 768], [1024, 768], [960, 720], [768, 1024]]) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.combat-access').count(), 1);
  for (const button of await page.locator('.combat-access button:visible').all()) {
    const box = await button.boundingBox();
    assert.ok(box && box.width >= 43 && box.height >= 43, `Objetivo táctil ${width}: ${JSON.stringify(box)}`);
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow ${width}`);
  await page.screenshot({ path: join(output, `combat-${width}x${height}.png`), fullPage: width <= 980 });
}
record('Ordenadores y tablets: seis controles accesibles, sin overflow');
await page.setViewportSize({ width: 1600, height: 900 });
await page.waitForTimeout(400);
await page.locator('[data-combat-action="1"]').focus();
await page.keyboard.press('Tab');
assert.equal(await page.locator('[data-combat-action="2"]').evaluate(button => document.activeElement === button), true);
assert.match(await page.locator('.combat-skill-detail').innerText(), /de daño/);
await page.locator('[data-combat-action="4"]').click({ force: true });
await page.keyboard.press('4');
assert.equal(await page.evaluate(() => window.__hudScene.player.chakra), state.chakra);
assert.equal(await page.evaluate(() => window.__hudScene.turnReady), true);
record('Detalle con foco de teclado y ranura bloqueada con ratón y atajo');

// Controlled UI fixtures exercise max/partial/zero/recovery without rewriting
// the engine or persisting these fixture values to the user save.
for (const ratio of [0.37, 0, 1]) {
  const values = await page.evaluate(ratio => {
    const s = window.__hudScene;
    s.player.hp = Math.round(s.player.maxHp * ratio);
    s.enemy.hp = Math.round(s.enemy.maxHp * ratio);
    s.refreshHud();
    return [s.playerHpBar.fill.fillWidth / s.playerHpBar.width, s.enemyHpBar.fill.fillWidth / s.enemyHpBar.width,
      s.player.hp / s.player.maxHp, s.enemy.hp / s.enemy.maxHp,
      s.playerHpBar.lustre?.scaleX ?? s.playerHpBar.fill.fillWidth / s.playerHpBar.width, s.enemyHpBar.lustre?.scaleX ?? s.enemyHpBar.fill.fillWidth / s.enemyHpBar.width];
  }, ratio);
  assert.equal(values[0], values[2]);
  assert.equal(values[1], values[3]);
  assert.ok(Math.abs(values[4] - values[2]) < .000001);
  assert.ok(Math.abs(values[5] - values[3]) < .000001);
}
record('Vida máxima, parcial, cero y recuperación en ambos paneles');
await page.evaluate(() => {
  const s = window.__hudScene;
  s.player.chakra = 0;
  s.refreshHud();
});
assert.equal(await page.locator('[data-combat-action="2"]').getAttribute('aria-disabled'), 'true');
await page.locator('[data-combat-action="2"]').click({ force: true });
await page.keyboard.press('2');
assert.equal(await page.locator('[data-combat-action="2"]').getAttribute('data-resource-state'), 'insufficient');
assert.match(await page.locator('[data-combat-action="2"] .combat-skill-cost').innerText(), new RegExp(`Faltan ${state.cost} CH`));
assert.equal(await page.evaluate(() => window.__hudScene.player.chakra), 0);
await page.evaluate(() => { const s = window.__hudScene; s.player.chakra = s.player.maxChakra; s.refreshHud(); });
record('Chakra insuficiente: ni clic ni atajo ejecutan la técnica');
await page.evaluate(() => {
  const s = window.__hudScene;
  s.enemy.statuses.push({ type: 'seal', label: 'SELLADO', duration: 2, power: 0 });
  s.refreshHud();
});
assert.equal(await page.evaluate(() => window.__hudScene.enemyStatusSlots[0].status), 'SELLADO · 2 turno(s)');
await page.evaluate(() => { const s = window.__hudScene; s.enemy.statuses = []; s.refreshHud(); });
assert.equal(await page.evaluate(() => window.__hudScene.enemyStatusSlots[0].status), null);
record('Estado con duración y desaparición en su fila, separado de las estadísticas');

await page.locator('[data-combat-action="2"]').focus();
await page.keyboard.press('Enter');
assert.equal(await page.evaluate(() => window.__hudScene.player.chakra), state.chakra - state.cost);
assert.ok(await page.evaluate(() => window.__hudScene.pendingActions.player));
assert.ok(await page.evaluate(() => {
  const s = window.__hudScene;
  return s.busy ? s.phaseLabel.text === 'EN COMBATE' : s.phaseLabel.text.startsWith('PREPARA');
}));
await page.locator('.combat-access-pause').click();
await page.waitForFunction(() => window.__hudScene.scene.isPaused());
const pausedX = await page.evaluate(() => window.__hudScene.playerTurnMarker.x);
await page.waitForTimeout(450);
assert.equal(await page.evaluate(() => window.__hudScene.playerTurnMarker.x), pausedX);
await page.keyboard.press('Escape');
await page.waitForFunction(() => window.__hudScene.scene.isActive());
await page.waitForFunction(() => window.__hudScene.turnReady, null, { timeout: 30000 });
record('Técnica por teclado: consumo real, preparación, pausa con progreso detenido y reanudación');
assert.ok(await page.evaluate(() => window.__hudScene.cooldowns[window.__hudScene.actions[1].id] > 0));
assert.match(await page.locator('[data-combat-action="2"]').getAttribute('aria-label'), /CD/);
record('Enfriamiento visible y sincronizado después de ejecutar');
await page.evaluate(() => {
  const s = window.__hudScene;
  s.loseHealth(s.player, s.hero, 7, { react: false });
});
const receivedDamage = await page.evaluate(() => window.__hudScene.player.hp < window.__hudScene.player.maxHp);
assert.ok(receivedDamage);
record('Daño a través de loseHealth actualiza vida, número e indicador del protagonista');
await page.setViewportSize({ width: 768, height: 1024 });
await page.locator('[data-combat-action="6"]').tap();
assert.equal(await page.evaluate(() => window.__hudScene.turnReady), true);
await page.getByRole('button', { name: 'Usar técnica', exact: true }).tap();
await page.waitForFunction(() => window.__hudScene.player.guarding || window.__hudScene.turnReady, null, { timeout: 20000 });
record('Guardia conserva la sexta posición y se puede consultar y confirmar por toque en tablet');
await page.setViewportSize({ width: 1600, height: 900 });
await page.waitForFunction(() => window.__hudScene.turnReady, null, { timeout: 30000 });
await page.evaluate(() => {
  const s = window.__hudScene;
  s.updateTimelineMarkers({ player: 0, enemy: 0 });
});
assert.ok(await page.evaluate(() => window.__hudScene.playerTurnMarker.y < window.__hudScene.enemyTurnMarker.y));
await page.evaluate(() => window.__hudScene.updateTimelineMarkers());
record('Marcadores con nombres y separación cuando coinciden');
await page.mouse.move(950, 720);
await page.locator('[data-combat-action="6"]').blur();
await page.screenshot({ path: join(output, 'combat-functional.png') });
await page.setViewportSize({ width: 768, height: 1024 });
await page.locator('.combat-access-pause').click();
await page.waitForSelector('.combat-pause-access');
await page.screenshot({ path: join(output, 'pause-768x1024.png'), fullPage: true });
await page.getByRole('button', { name: 'REANUDAR', exact: true }).click();
await page.waitForFunction(() => window.__hudScene.scene.isActive());
record('Menú de pausa compacto con ajustes existentes y reanudación táctil');
await page.evaluate(async () => {
  const s = window.__hudScene;
  await s.resetTurnTimeline();
  const expectedHairX = s.playerMarkerHalo.x + (s.playerTimelinePortraitLayout.hair?.x ?? 0);
  if (s.playerMarkerHalo.x !== s.enemyMarkerHalo.x || s.playerMarkerHair.visible && Math.abs(s.playerMarkerHair.x - expectedHairX) > 0.01) {
    throw new Error('El retrato y sus accesorios se separaron al reiniciar');
  }
  if (s.timelinePortraitMasks?.some((mask, index) => Math.abs(mask.x - [s.playerTurnMarker, s.enemyTurnMarker][index].x) > .01)) {
    throw new Error('El recorte circular se separó del retrato de iniciativa');
  }
  s.startTurnCharge();
});
record('Reinicio de iniciativa mantiene retratos, pelo y etiquetas sincronizados');
await writeFile(join(output, 'verification.json'), JSON.stringify({ checks, receivedDamage, errors }, null, 2));

console.log(JSON.stringify({ errors, state: await page.evaluate(() => {
  const s = window.__hudScene;
  return { active: s.scene.isActive(), hp: s.playerHpBar.valueText.text, enemyChakra: s.enemyChakraBar.valueText.text, actions: s.actions.map(a => a?.name), phase: s.phaseLabel.text };
}) }));
await writeFile(join(output, 'browser-errors.json'), JSON.stringify(errors, null, 2));
await browser.close();
if (errors.length) process.exitCode = 1;

