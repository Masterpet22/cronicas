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
  { origin: "dojo", viewport: { width: 390, height: 844 } }
]) test(`entrenamiento desde ${origin} a ${viewport.width}: movimientos sin equipar, repetición y regreso sin progreso`, async ({ page }, testInfo) => {
  test.setTimeout(120000);
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
