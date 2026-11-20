import { test, expect } from "@playwright/test";
import { ensurePhaser } from "./helpers/phaser-loader.mjs";
import { receiveGuildGiftsOnPage } from "./helpers/guild-gifts.mjs";

async function prepare(page, { mission = null, companion = "akari" } = {}) {
  await page.goto("/");
  await page.evaluate(async ({ mission, companion }) => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.140.0");
    const { STORY_SAGAS } = await import("/src/content/index.js");
    let save = createCharacter(createDefaultSave(), { name: "Equipo", affinity: "fuego", bodyType: "male" });
    save.campaign.completedMissions = [...STORY_SAGAS[0].missionIds];
    save.campaign.archiveUnlocked = true; save.campaign.tutorialSeen = true;
    const { FIRST_SAGA_CONCLUSION_NOTICE } = await import("/src/kurogane.js");
    save.campaign.seenMissionNotices.push(FIRST_SAGA_CONCLUSION_NOTICE);
    save.progression.level = 9;
    if (mission) {
      const ids = STORY_SAGAS[1].missionIds;
      save.campaign.completedMissions.push(...ids.slice(0, ids.indexOf(mission)));
      save.campaign.kuroganePrologueCompleted = true; save.campaign.kuroganeGiftsGranted = true;
      save.campaign.kuroganeCompanion = companion;
    }
    writeSave(save);
    localStorage.setItem("music-enabled", "off"); localStorage.setItem("seal-input-mode", "automatic");
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
  }, { mission, companion });
  await page.reload();
  await ensurePhaser(page);
  await page.evaluate(() => {
    const Original = Phaser.Game;
    Phaser.Game = class extends Original { constructor(config) { super(config); window.__kuroganeGame = this; } };
  });
}
async function closeSpeech(page) {
  await receiveGuildGiftsOnPage(page);
  const next = page.locator('[data-stage-speech]:not(.leaving) [data-stage-next]');
  for (let i = 0; i < 8 && await next.isVisible(); i++) await next.click();
}
async function launch(page, id) {
  await page.locator('[data-go="headquarters"]').click(); await closeSpeech(page);
  await page.locator('[data-saga="saga-2"]').click();
  await page.locator(`[data-mission="${id}"]`).click();
  // The regular briefing uses the shared dialogue controls.
  for (let i = 0; i < 10 && !await page.locator(".combat-access").isVisible(); i++) {
    const buttons = page.locator('.dialogue-overlay .primary-button');
    if (await buttons.count()) await buttons.last().click();
    else break;
  }
}

test("prólogo obligatorio y habitación conservada en tablet", async ({ page }, info) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await prepare(page);
  await page.locator('[data-go="headquarters"]').click(); await closeSpeech(page);
  await page.locator('[data-saga="saga-2"]').click();
  await expect(page.locator('[data-mission="k01"]')).toHaveCount(0);
  await page.locator('[data-kurogane-prologue]').click(); await closeSpeech(page);
  await expect(page.locator('.guild-prologue, .guild-room-help, [data-finish-kurogane-prologue]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Hablar con Yuna Ametsuki', exact: true }).click();
  await expect(page.locator('[data-stage-ambient]')).toContainText('Llevas 0/2');
  await expect(page.getByRole('button', { name: 'Ir al Cuartel', exact: true })).toHaveCount(0);
  for (const type of ["plant", "novice"]) {
    await page.locator(`[data-place-decor="${type}"]`).click();
    await page.locator('[data-room-place]').click();
    if (type === "plant") {
      await page.reload();
      await ensurePhaser(page);
      await page.evaluate(() => {
        const Original = Phaser.Game;
        Phaser.Game = class extends Original { constructor(config) { super(config); window.__kuroganeGame = this; } };
      });
      await page.locator('[data-go="inn"]').click(); await closeSpeech(page);
      await page.getByRole('button', { name: 'Hablar con Yuna Ametsuki', exact: true }).click();
      await expect(page.locator('[data-stage-ambient]')).toContainText('Llevas 1/2');
      await expect(page.locator('.guild-prologue, .guild-room-help')).toHaveCount(0);
      await page.screenshot({ path: info.outputPath("yuna-guia-progreso.png"), animations: "disabled" });
    }
  }
  await page.screenshot({ path: info.outputPath("prologo-tablet.png") });
  await page.getByRole("button", { name: "Ir al Cuartel", exact: true }).click();
  await expect(page.locator('[data-mission="k01"]')).toBeVisible();
  await page.locator('[data-mission="k01"]').click();
  for (let i = 0; i < 14 && !await page.locator('[data-decision="haruto"]').isVisible(); i++) {
    await page.locator('.dialogue-overlay .primary-button').click();
  }
  await expect(page.locator('[data-decision="akari"]')).toBeVisible();
  await page.screenshot({ path: info.outputPath("seleccion-companero-tablet.png") });
  await page.locator('[data-decision="haruto"]').click();
  await page.locator('.dialogue-overlay .primary-button').click();
  await expect(page.locator(".combat-access")).toBeVisible({ timeout: 45000 });
  expect(await page.evaluate(() => window.__kuroganeGame.scene.getScene("battle").companion.id)).toBe("haruto");
  await page.setViewportSize({ width: 960, height: 720 });
  await expect.poll(() => page.evaluate(() => window.__kuroganeGame.scene.getScene("battle").timelineLayer.visible)).toBe(true);
  await page.screenshot({ path: info.outputPath("haruto-combate-tablet.png") });
});

for (const id of ["k01", "k02", "k03", "k04", "k05"]) test(`combate ${id}: compañero, objetivos y desenlace`, async ({ page }, info) => {
  test.setTimeout(120000);
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await prepare(page, { mission: id });
  await launch(page, id);
  await expect(page.locator(".combat-access")).toBeVisible({ timeout: 45000 });
  const state = await page.evaluate(() => {
    const s = window.__kuroganeGame.scene.getScene("battle");
    s.stopTurnTimeline(); s.timelinePaused = true;
    return { enemies: s.trainingTargets.length, companion: s.companion.id, cargo: s.objective?.hp, units: s.participants().length };
  });
  expect(state.companion).toBe("akari"); expect(state.enemies).toBe(id === "k01" ? 2 : 3);
  expect(state.units).toBe(state.enemies + 2);
  if (id === "k03") expect(state.cargo).toBe(100);
  await page.screenshot({ path: info.outputPath(`${id}-battle.png`) });
  // Exercise real shared attacks, CPU resource use, and the cargo targeting branch.
  const action = await page.evaluate(async () => {
    const s = window.__kuroganeGame.scene.getScene("battle");
    s.startTurnCharge = () => {}; s.timelinePaused = false; s.busy = false;
    s.companion.pending = { type: "barrier", cost: 16, seals: ["cpu"] };
    s.player.hp = Math.floor(s.player.maxHp / 2);
    await s.handleGroupArrival({ id: "companion", action: s.companion.pending });
    return { chakra: s.companion.state.chakra, shield: s.companionShield };
  });
  expect(action).toEqual({ chakra: 49, shield: true });
  const combat = await page.evaluate(async () => {
    const s = window.__kuroganeGame.scene.getScene("battle");
    const { ENEMY_ACTIONS } = await import("/src/data.js?v=1.5.0");
    s.rollHit = () => true;
    const hp = s.trainingTargets[0].state.hp;
    s.companion.pending = { type: "strike", target: 0, cost: 0, seals: [] };
    s.busy = false; s.timelinePaused = false;
    await s.handleGroupArrival({ id: "companion", action: s.companion.pending });
    const allyDamage = hp - s.trainingTargets[0].state.hp;
    s.setGroupContext(0); s.enemyActionsTaken = 1;
    const allyHp = s.companion.state.hp;
    await s.executeEnemyAction(ENEMY_ACTIONS.strike);
    const enemyDamage = allyHp - s.companion.state.hp;
    if (s.objective) {
      s.enemyActionsTaken = 2; s.objectiveGuard = true;
      await s.executeEnemyAction(ENEMY_ACTIONS.strike);
    }
    return { allyDamage, enemyDamage, cargo: s.objective?.hp };
  });
  expect(combat.allyDamage).toBeGreaterThan(0); expect(combat.enemyDamage).toBeGreaterThan(0);
  if (id === "k03") expect(combat.cargo).toBe(94);
  const outcome = await page.evaluate(async () => {
    const s = window.__kuroganeGame.scene.getScene("battle");
    s.playBattleChoice = async () => "continue";

    s.trainingTargets.forEach(t => t.state.hp = 0);
    await s.finishBattle(true);
    if (s.mission.waves) {
      if (s.trainingTargets.length !== 2) throw new Error("Falta la oleada de hermanos");
      s.trainingTargets.forEach(t => t.state.hp = 0);
      await s.finishBattle(true);
    }
    return { completed: s.saveData.campaign.completedMissions.includes(s.mission.id), rank: s.saveData.campaign.elementRank, pending: Boolean(s.game && s.finished) };
  });
  expect(outcome.completed).toBe(true); expect(outcome.rank).toBe(1);
  expect(errors).toEqual([]);
});

test("perder la carga restaura el grupo y conserva los consumibles gastados", async ({ page }) => {
  test.setTimeout(120000);
  await prepare(page, { mission: "k03" }); await launch(page, "k03");
  await expect(page.locator(".combat-access")).toBeVisible({ timeout: 45000 });
  await page.evaluate(async () => {
    const s = window.__kuroganeGame.scene.getScene("battle");
    const { consumeBattleItem } = await import("/src/battle/battle-inventory.js?v=0.151.0");
    s.stopTurnTimeline(); s.timelinePaused = true;
    s.saveData.inventory.items.health_potion = 1;
    consumeBattleItem(s, "health_potion");
    s.objective.hp = 0; s.player.hp = 1; s.companion.state.hp = 0;
    s.trainingTargets[0].state.hp = 0;
    window.__retryFinished = false;
    void s.finishBattle(false).then(() => window.__retryFinished = true);
  });
  await page.getByRole("button", { name: "REINTENTAR (2)", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__retryFinished)).toBe(true);
  expect(await page.evaluate(() => {
    const s = window.__kuroganeGame.scene.getScene("battle");
    s.stopTurnTimeline(); s.timelinePaused = true;
    return { cargo: s.objective.hp, alive: s.trainingTargets.every(t => t.state.hp === t.state.maxHp),
      companion: s.companion.state.hp === s.companion.state.maxHp,
      retries: s.freeRetries, potion: s.saveData.inventory.items.health_potion || 0,
      completed: s.saveData.campaign.completedMissions.includes(s.mission.id) };
  })).toEqual({ cargo: 100, alive: true, companion: true, retries: 1, potion: 0, completed: false });
  await expect(page.locator("[data-training-target]")).toHaveCount(3);
});
