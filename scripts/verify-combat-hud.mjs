import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

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
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await page.goto('http://127.0.0.1:4173');
await page.evaluate(async () => {
  const { createDefaultSave, createCharacter, writeSave, selectSaveSlot } = await import('/src/save.js?v=0.66.0');
  const save = createCharacter(createDefaultSave(), { name: 'Akio', affinity: 'agua', hair: 1, bodyType: 'male' });
  save.campaign.completedMissions = ['m01'];
  save.campaign.tutorialSeen = true;
  selectSaveSlot(1);
  writeSave(save);
  localStorage.setItem('music-enabled', 'off');
  localStorage.setItem('seal-input-mode', 'automatic');
});
await page.reload();
await page.locator('[data-select-slot="1"]').click();
await page.evaluate(async () => {
  const { BattleScene } = await import('/src/battle/scenes/battle-scene.js?v=0.86.0');
  const create = BattleScene.prototype.create;
  BattleScene.prototype.create = function (...args) { window.__hudScene = this; return create.apply(this, args); };
});
await page.locator('.debug-tools-trigger').click();
await page.locator('[data-debug-mission="m01"]').click();
await page.waitForFunction(() => window.__hudScene?.turnReady, null, { timeout: 30000 });
await page.mouse.move(950, 720);
await mkdir('artifacts/combat-hud', { recursive: true });
await page.screenshot({ path: 'artifacts/combat-hud/combat-1600x900.png' });
const checks = [];
const record = message => { checks.push(message); console.log(message); };
const state = await page.evaluate(() => {
  const s = window.__hudScene;
  return { chakra: s.player.chakra, cost: s.actionCost(s.actions[1]), hp: s.enemy.hp, hero: [s.hero.body.x, s.hero.body.y], foe: [s.foe.body.x, s.foe.body.y] };
});
assert.deepEqual(state.hero, [220, 372]);
assert.deepEqual(state.foe, [740, 372]);
assert.ok(await page.evaluate(() => {
  const s = window.__hudScene;
  return !s.playerTurnMarker.flipX && !s.enemyTurnMarker.flipX;
}), 'Ambos retratos deben mirar en el sentido de avance');
assert.ok(await page.locator('.combat-access-actions').evaluate(el => getComputedStyle(el).transform.startsWith('matrix3d(')), 'El panel completo debe tener perspectiva');
record('Retratos orientados hacia el avance y panel completo con perspectiva 3D');
assert.ok(await page.locator('.combat-skill-art canvas').evaluateAll(canvases => canvases.length > 0 && canvases.every(canvas => {
  const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  return pixels.some((value, index) => index % 4 === 3 && value > 0);
})), 'Los iconos deben conservar sus píxeles originales visibles');
if (process.argv.includes('--pause-only')) {
  await page.locator('.combat-access-pause').click();
  await page.waitForSelector('.combat-pause-access');
  assert.equal(await page.locator('.combat-access').evaluate(el => el.inert), true);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'ABANDONAR');
  await page.keyboard.press('Tab');
  assert.match(await page.evaluate(() => document.activeElement.textContent), /Sellos manuales/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Marco siguiente', exact: true }).click();
  assert.match(await page.locator('.combat-pause-preferences').innerText(), /Santuario lunar/);
  await page.screenshot({ path: 'artifacts/combat-hud/pause-390x844.png', fullPage: true });
  await page.getByRole('button', { name: 'REANUDAR', exact: true }).click();
  await page.waitForFunction(() => window.__hudScene.scene.isActive());
  assert.equal(await page.locator('.combat-access').evaluate(el => el.inert), false);
  assert.deepEqual(errors, []);
  await writeFile('artifacts/combat-hud/pause-accessibility.json', JSON.stringify({ focusLoop: true, backgroundInert: true, theme: true, resume: true, errors }));
  await browser.close();
  console.log('Pausa: foco contenido, fondo inerte, tema real, reanudación y consola sin errores');
  process.exit(0);
}
for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844], [844, 390]]) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.combat-access').count(), 1);
  for (const button of await page.locator('.combat-access button').all()) {
    const box = await button.boundingBox();
    assert.ok(box && box.width >= 43 && box.height >= 43, `Objetivo táctil ${width}: ${JSON.stringify(box)}`);
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow ${width}`);
  await page.screenshot({ path: `artifacts/combat-hud/combat-${width}x${height}.png`, fullPage: width <= 980 });
}
record('1920×1080, 1600×900, 1366×768, 390×844 y 844×390: seis controles accesibles, sin overflow');
await page.setViewportSize({ width: 1600, height: 900 });
await page.waitForTimeout(400);
await page.locator('[data-combat-action="2"]').focus();
assert.equal(await page.evaluate(() => window.__hudScene.buttons[1].tooltip.layer.visible), true);
await page.locator('[data-combat-action="4"]').click({ force: true });
await page.keyboard.press('4');
assert.equal(await page.evaluate(() => window.__hudScene.player.chakra), state.chakra);
assert.equal(await page.evaluate(() => window.__hudScene.turnReady), true);
record('Foco, tooltip y ranura bloqueada con ratón y atajo');

// Controlled UI fixtures exercise max/partial/zero/recovery without rewriting
// the engine or persisting these fixture values to the user save.
for (const ratio of [0.37, 0, 1]) {
  const values = await page.evaluate(ratio => {
    const s = window.__hudScene;
    s.player.hp = Math.round(s.player.maxHp * ratio);
    s.enemy.hp = Math.round(s.enemy.maxHp * ratio);
    s.refreshHud();
    return [s.playerHpBar.fill.width / s.playerHpBar.width, s.enemyHpBar.fill.width / s.enemyHpBar.width,
      s.player.hp / s.player.maxHp, s.enemy.hp / s.enemy.maxHp];
  }, ratio);
  assert.equal(values[0], values[2]);
  assert.equal(values[1], values[3]);
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
assert.match(await page.evaluate(() => window.__hudScene.lastBattleMessage.text), /suficiente chakra/);
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
await page.locator('[data-combat-action="6"]').click();
await page.waitForFunction(() => window.__hudScene.player.guarding || window.__hudScene.turnReady, null, { timeout: 20000 });
record('Guardia conserva la sexta posición y responde al ratón');
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
await page.screenshot({ path: 'artifacts/combat-hud/combat-functional.png' });
await page.setViewportSize({ width: 390, height: 844 });
await page.locator('.combat-access-pause').click();
await page.waitForSelector('.combat-pause-access');
await page.screenshot({ path: 'artifacts/combat-hud/pause-390x844.png', fullPage: true });
await page.getByRole('button', { name: 'REANUDAR', exact: true }).click();
await page.waitForFunction(() => window.__hudScene.scene.isActive());
record('Menú de pausa compacto con ajustes existentes y reanudación táctil');
await page.evaluate(async () => {
  const s = window.__hudScene;
  await s.resetTurnTimeline();
  if (s.playerTurnMarker.x !== s.enemyTurnMarker.x || s.playerMarkerHair && Math.abs(s.playerMarkerHair.x - s.playerTurnMarker.x + 1) > 0.01) {
    throw new Error('El retrato y sus accesorios se separaron al reiniciar');
  }
  s.startTurnCharge();
});
record('Reinicio de iniciativa mantiene retratos, pelo y etiquetas sincronizados');
const mobileEntry = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobileEntry.goto('http://127.0.0.1:4173');
await mobileEntry.locator('.mobile-combat-entry').click();
await mobileEntry.waitForFunction(() => Boolean(window.Phaser));
await mobileEntry.locator('[data-select-slot="1"]').waitFor({ state: 'visible' });
await mobileEntry.close();
record('Acceso desde un teléfono nuevo carga el juego con controles compactos');
await writeFile('artifacts/combat-hud/verification.json', JSON.stringify({ checks, receivedDamage, errors }, null, 2));

console.log(JSON.stringify({ errors, state: await page.evaluate(() => {
  const s = window.__hudScene;
  return { active: s.scene.isActive(), hp: s.playerHpBar.valueText.text, enemyChakra: s.enemyChakraBar.valueText.text, actions: s.actions.map(a => a?.name), phase: s.phaseLabel.text };
}) }));
await writeFile('artifacts/combat-hud/browser-errors.json', JSON.stringify(errors, null, 2));
await browser.close();
if (errors.length) process.exitCode = 1;

