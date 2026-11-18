import { test, expect } from "@playwright/test";
import { ensurePhaser } from "./helpers/phaser-loader.mjs";
import { trainingAction, trainingReady } from "./helpers/training-actions.mjs";

const stored = page => page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"));
async function prepare(page, origin) {
  await page.goto("/");
  await page.evaluate(async () => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.131.0");
    let save = createCharacter(createDefaultSave(), { name: "Akio", affinity: "fuego", bodyType: "male" });
    save.progression.level = 20;
    save.character.affinityXp.fuego = 10000;
    save.progression.resonance.investments = { physical_0: 1, physical_1: 1, physical_2: 1 };
    const { learnSkillForTest } = await import("/tests/helpers/skill-fixtures.mjs");
    save=learnSkillForTest(save,"fire_arc");
    save.loadout = []; save.taijutsuLoadout = [null, null];
    save.campaign.tutorialSeen = true;
    writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
    localStorage.setItem("music-enabled", "off");
    localStorage.setItem("seal-input-mode", "automatic");
  });
  await page.reload();
  await page.locator(`[data-go="${origin}"]`).click();
  const next = page.locator('[data-stage-speech]:not(.leaving) [data-stage-next]');
  for (let i = 0; i < 5 && await next.isVisible(); i++) await next.click();
  await expect(page.locator("[data-start-training]")).toBeVisible();
  await ensurePhaser(page);
  await page.evaluate(() => {
    const Original = Phaser.Game;
    Phaser.Game = class extends Original { constructor(config) { super(config); window.__trainingGame = this; } };
  });
}

for (const { origin, viewport } of [
  { origin: "dojo", viewport: { width: 1440, height: 900 } },
  { origin: "dojo", viewport: { width: 1280, height: 720 } },
  { origin: "dojo", viewport: { width: 1024, height: 768 } }
]) test(`entrenamiento desde ${origin} a ${viewport.width}: movimientos sin equipar, repetición y regreso sin progreso`, async ({ page }, testInfo) => {
  test.setTimeout(300000);
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize(viewport.width < 650 ? { width: 1440, height: 900 } : viewport);
  await prepare(page, origin);
  const baseline = await stored(page);
  await page.locator("[data-start-training]").click();
  await expect(page.locator(".combat-access")).toBeVisible({ timeout: 45000 });
  await expect(page.locator(".training-controls, [data-training-move], [data-training-use]")).toHaveCount(0);
  if (viewport.width < 650) await page.setViewportSize(viewport);
  expect(await page.locator(".combat-access").evaluate(root => root.scrollWidth <= root.clientWidth)).toBe(true);
  await page.evaluate(() => {
    const scene = window.__trainingGame.scene.getScene("battle");
    window.__enemyExecutions = 0;
    scene.executeEnemyAction = async () => { window.__enemyExecutions += 1; };
  });
  expect(await page.evaluate(() => {
    const scene = window.__trainingGame.scene.getScene("battle");
    return { affinity: scene.enemy.primaryAffinity, affinities: scene.enemy.affinities,
      portrait: scene.enemyPortrait.affinity, health: scene.enemy.maxHp, strength: scene.enemy.strength,
      chakra: scene.enemy.maxChakra, speed: scene.enemy.speed };
  })).toEqual({ affinity: "normal", affinities: ["normal"], portrait: "normal", health: 10000, strength: 0, chakra: 0, speed: 1 });
  for (const move of ["fire_embers", "fire_embers", "fire_arc", "physical_1", "guard", "guard"]) {
    await (await trainingAction(page, move)).click();
    await trainingReady(page);
    await expect(page.locator(".combat-access-message")).toContainText(move === "guard" ? "50 %" : "de daño");
    if (move === "fire_embers") await expect(page.locator(".combat-access-message")).toContainText("QUEMADURA (2 turnos)");
    const state = await page.evaluate(() => {
      const scene = window.__trainingGame.scene.getScene("battle");
      return { full: scene.player.hp === scene.player.maxHp && scene.player.chakra === scene.player.maxChakra,
        dummy: scene.enemy.hp === scene.enemy.maxHp, alive: !scene.finished, enemyTurns: window.__enemyExecutions,
        saved: scene.saveData.loadout, taijutsu: scene.saveData.taijutsuLoadout };
    });
    expect(state).toMatchObject({ full: true, dummy: true, alive: true, enemyTurns: 0, saved: [], taijutsu: [null, null] });
    expect(await stored(page)).toBe(baseline);
  }
  await page.screenshot({ path: testInfo.outputPath(`training-${origin}.png`), fullPage: true });
  await page.getByRole("button", { name: "Pausar combate (Escape)" }).click();
  await expect(page.getByRole("heading", { name: "ENTRENAMIENTO EN PAUSA" })).toBeVisible();
  await expect(page.locator(".combat-access")).toBeHidden();
  await page.getByRole("button", { name: "REANUDAR" }).click();
  await expect(page.locator(".combat-access")).toBeVisible();
  if (viewport.width < 650) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: testInfo.outputPath("training-desktop.png") });
    expect(await page.evaluate(() => window.__trainingGame.scene.getScene("battle").timelineLayer.visible)).toBe(false);
  }
  await page.getByRole("button", { name: "Pausar combate (Escape)" }).click();
  await page.getByRole("button", { name: "VOLVER AL DOJO", exact: true }).click();
  await expect(page.locator(origin === "arena" ? ".arena-panel" : ".dojo-layout")).toBeVisible();
  await expect(page.locator(".training-controls")).toHaveCount(0);
  expect(await stored(page)).toBe(baseline);
  expect(errors).toEqual([]);
});

for (const tablet of [false, true]) test.describe(`objetivos simultáneos: ${tablet ? "tablet táctil" : "ordenador"}`, () => {
  test.use({ viewport: tablet ? { width: 960, height: 720 } : { width: 1440, height: 900 }, hasTouch: tablet });
  test("selección, daño aislado, bloqueo durante ataque, derrota, restauración y salida", async ({ page }, testInfo) => {
    test.setTimeout(300000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await prepare(page, "dojo");
    const baseline = await stored(page);
    await page.locator("[data-training-count]").selectOption("3");
    await page.locator("[data-start-training]").click();
    const panel = page.locator(".training-target-panel");
    await expect(panel).toBeVisible({ timeout: 45000 });
    await expect(panel.locator("[data-training-target]")).toHaveCount(3);
    const snapshot = () => page.evaluate(() => {
      const s = window.__trainingGame.scene.getScene("battle");
      return { selected: s.enemyIndex, targets: s.trainingTargets.map(t => ({ hp: t.state.hp,
        maxHp: t.state.maxHp, statuses: t.state.statuses.map(v => v.type), alpha: t.fighter.body.alpha })),
        full: s.player.hp === s.player.maxHp && s.player.chakra === s.player.maxChakra };
    });
    const activateTarget = async index => {
      const button = page.locator(`[data-training-target="${index}"]`);
      if (tablet) await button.tap(); else await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
    };
    const strike = await trainingAction(page, "strike");
    await strike.click();
    await trainingReady(page);
    const first = await snapshot();
    expect(first.targets[0].hp).toBeLessThan(first.targets[0].maxHp);
    expect(first.targets[1].hp).toBe(first.targets[1].maxHp);
    expect(first.targets[2].hp).toBe(first.targets[2].maxHp);
    await activateTarget(1);
    await (await trainingAction(page, "fire_embers")).click();
    await expect.poll(() => page.evaluate(() => window.__trainingGame.scene.getScene("battle").busy)).toBe(true);
    await expect(page.locator('[data-training-target="2"]')).toBeDisabled();
    expect(await page.evaluate(() => window.__trainingGame.scene.getScene("battle").selectTrainingTarget(2))).toBe(false);
    await trainingReady(page);
    const second = await snapshot();
    expect(second.targets[0].hp).toBe(first.targets[0].hp);
    expect(second.targets[1].hp).toBeLessThan(second.targets[1].maxHp);
    expect(second.targets[1].statuses).toContain("burn");
    expect(second.targets[2].hp).toBe(second.targets[2].maxHp);
    expect(second.full).toBe(true);
    // Selecting the body uses the same target contract as the native buttons.
    const canvas = page.locator("#game > canvas");
    const bounds = await canvas.boundingBox();
    const position = { x: bounds.x + bounds.width * 860 / 960, y: bounds.y + bounds.height * 310 / 540 };
    if (tablet) await page.touchscreen.tap(position.x, position.y); else await page.mouse.click(position.x, position.y);
    await expect(page.locator('[data-training-target="2"]')).toHaveAttribute("aria-pressed", "true");
    const panelBounds = await panel.boundingBox();
    const viewport = page.viewportSize();
    expect(panelBounds.x).toBeGreaterThanOrEqual(0);
    expect(panelBounds.x + panelBounds.width).toBeLessThanOrEqual(viewport.width + 1);
    if (!tablet) {
      const panelTop = (panelBounds.y - bounds.y) * 540 / bounds.height;
      const feet = await page.evaluate(() => window.__trainingGame.scene.getScene("battle").trainingTargets.map(t => t.fighter.shadow.y));
      expect(feet.every(y => y + 12 < panelTop)).toBe(true);
    }
    await page.screenshot({ path: testInfo.outputPath("training-multiple.png"), fullPage: true });
    await page.getByRole("button", { name: "Pausar combate (Escape)" }).click();
    await expect(panel).toBeHidden();
    await page.getByRole("button", { name: "REANUDAR", exact: true }).click();
    await expect(panel).toBeVisible();
    expect((await snapshot()).targets.map(t => t.hp)).toEqual(second.targets.map(t => t.hp));
    await page.locator("[data-reset-training-targets]").click();
    expect((await snapshot()).targets.every(t => t.hp === t.maxHp && t.statuses.length === 0)).toBe(true);
    // Low remaining HP exercises actual knockout and all-targets-down handling.
    for (let index = 0; index < 3; index++) {
      await activateTarget(index);
      await page.evaluate(i => { window.__trainingGame.scene.getScene("battle").trainingTargets[i].state.hp = 1; }, index);
      await (await trainingAction(page, "strike")).click();
      await expect(page.locator(`[data-training-target="${index}"]`)).toContainText("Derribada", { timeout: 25000 });
      await expect.poll(() => page.evaluate(() => window.__trainingGame.scene.getScene("battle").busy)).toBe(false);
      await expect(page.locator(`[data-training-target="${index}"]`)).toBeDisabled();
    }
    expect((await snapshot()).targets.every(t => t.hp === 0)).toBe(true);
    await page.locator("[data-reset-training-targets]").click();
    await trainingReady(page);
    await expect(page.locator('[data-training-target="0"]')).toHaveAttribute("aria-pressed", "true");
    expect((await snapshot()).targets.every(t => t.hp === t.maxHp)).toBe(true);
    expect(await stored(page)).toBe(baseline);
    await page.getByRole("button", { name: "Pausar combate (Escape)" }).click();
    await page.getByRole("button", { name: "VOLVER AL DOJO", exact: true }).click();
    await expect(page.locator(".dojo-layout")).toBeVisible();
    await expect(panel).toHaveCount(0);
    await page.locator("[data-training-count]").selectOption("2");
    await page.locator("[data-start-training]").click();
    await expect(page.locator("[data-training-target]")).toHaveCount(2);
    await page.getByRole("button", { name: "Pausar combate (Escape)" }).click();
    await page.getByRole("button", { name: "VOLVER AL DOJO", exact: true }).click();
    expect(await stored(page)).toBe(baseline);
    expect(errors).toEqual([]);
  });
});
