import { expect, test } from "@playwright/test";
import { ensurePhaser } from "./helpers/phaser-loader.mjs";
import { bootPerformanceReference } from "./helpers/performance-harness.mjs";

test("la misión 3 continúa al teniente sin fase de investigación", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await bootPerformanceReference(page, { arenaIndex: 1 });
  const state = await page.evaluate(async () => {
    const battle = window.__performanceReference.scene;
    battle.enemy.hp = 0;
    await battle.resolveEnemyOutcome();
    battle.stopTurnTimeline();
    return { index: battle.enemyIndex, defeated: battle.defeatedEncounters,
      pending: battle.pendingEncounterRewards, finished: battle.finished };
  });
  expect(state).toEqual({ index: 1, defeated: 1, pending: [0], finished: false });
  await expect(page.locator(".mission-investigation-overlay")).toHaveCount(0);
  await expect(page.locator(".combat-access")).toBeVisible();
  expect(errors).toEqual([]);
  await page.evaluate(() => window.__performanceReference.game.destroy(true));
});

async function advanceDialogue(page) {
  const overlay = page.locator(".dialogue-overlay");
  await expect(overlay).toBeVisible();
  for (let guard = 0; guard < 12 && await overlay.isVisible(); guard += 1) await overlay.locator("button").click();
  await expect(overlay).toHaveCount(0);
}

async function openFirstMission(page) {
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-view="headquarters"]').click();
  await page.locator('[data-saga="saga-1"]').click();
  return page.locator('[data-mission="m01"]');
}

test("una misión fallida puede reintentarse después de recargar", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("music-enabled", "off");
  });
  await page.reload();
  await page.locator('[data-select-slot="1"]').click();
  await page.locator('input[name="name"]').fill("Retry");
  await page.locator("#character-form").getByRole("button", { name: "CREAR PERSONAJE" }).click();
  await advanceDialogue(page);

  await page.evaluate(() => {
    const slot = localStorage.getItem("cronicas-del-sello-save-active-slot") || "1";
    const key = `cronicas-del-sello-save-slot-${slot}`;
    const save = JSON.parse(localStorage.getItem(key));
    save.campaign.missionProgress.m01 = {
      status: "failed",
      currentStepId: "bandit-ambush",
      completedSteps: [],
      context: {},
      appliedEffects: [],
      attempts: 1
    };
    localStorage.setItem(key, JSON.stringify(save));
  });
  await page.reload();

  let retryButton = await openFirstMission(page);
  await expect(retryButton).toHaveText("REINTENTAR");
  await page.reload();
  retryButton = await openFirstMission(page);
  await expect(retryButton).toHaveText("REINTENTAR");

  await retryButton.click();
  await expect(page.locator(".dialogue-overlay")).toBeVisible();
  await advanceDialogue(page);
  await expect(page.locator("#game canvas")).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const slot = localStorage.getItem("cronicas-del-sello-save-active-slot") || "1";
    const save = JSON.parse(localStorage.getItem(`cronicas-del-sello-save-slot-${slot}`));
    return save.campaign.missionProgress.m01;
  })).toMatchObject({ status: "in-progress", attempts: 2 });
});

test("repite solo el duelo perdido, agota dos reintentos y permite retirarse", async ({ page }, testInfo) => {
  await page.goto("/");
  await ensurePhaser(page);
  await page.evaluate(async () => {
    const { BattleScene } = await import("/src/battle/scenes/battle-scene.js?v=1.4.0");
    const { battleRuntime } = await import("/src/battle/runtime.js?v=0.91.0");
    const { MISSIONS } = await import("/src/content/index.js");
    const saves = await import("/src/save.js?v=0.106.0");
    let save = saves.createCharacter(saves.createDefaultSave(), { name: "Duelos", affinity: "fuego" });
    save = saves.applyDebugCheckpoint(save, "mission-2-ready");
    battleRuntime.activeSave = saves.startMissionProgress(save, "m02");
    battleRuntime.activeMission = MISSIONS.find((mission) => mission.id === "m02");
    battleRuntime.renderResolution = 1;
    const stage = document.createElement("div");
    stage.style.cssText = "position:fixed;inset:0;width:960px;height:540px;z-index:999";
    document.body.append(stage);
    class Travel extends window.Phaser.Scene {
      constructor() { super("travel"); }
      create(data) { window.__retryResult = data.result; }
    }
    window.__retryGame = new window.Phaser.Game({ type: window.Phaser.CANVAS, parent: stage,
      width: 960, height: 540, scene: [BattleScene, Travel], audio: { noAudio: true } });
  });
  await expect.poll(() => page.evaluate(() => Boolean(window.__retryGame.scene.getScene("battle")?.accessibleHud)), { timeout: 60000 }).toBe(true);
  // Start from the second opponent with provisional rewards already earned.
  await page.evaluate(() => {
    const battle = window.__retryGame.scene.getScene("battle");
    battle.stopTurnTimeline();
    battle.enemyIndex = 1;
    battle.defeatedEncounters = 1;
    battle.pendingEncounterRewards = [0];
    battle.battleRewards = { xp: 50, affinityXp: 10, coins: 30 };
    battle.player.hp = 0;
    battle.enemy.hp = 3;
    battle.cooldowns = { strike: 4 };
    window.__retryPromise = battle.finishBattle(false);
  });
  const dialog = page.getByRole("dialog", { name: "Duelo perdido" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button")).toHaveCount(2);
  await expect(dialog).not.toContainText(/tienda|comprar/i);
  await page.screenshot({ path: testInfo.outputPath("mission-retry-dialog.png") });
  for (const remaining of [2, 1]) {
    await dialog.getByRole("button", { name: `REINTENTAR (${remaining})`, exact: true }).click();
    await page.evaluate(async () => {
      await window.__retryPromise;
      window.__retryGame.scene.getScene("battle").stopTurnTimeline();
    });
    const state = await page.evaluate(() => {
      const b = window.__retryGame.scene.getScene("battle");
      return { hp: b.player.hp, maxHp: b.player.maxHp, enemyHp: b.enemy.hp, enemyMax: b.enemy.maxHp,
        enemyIndex: b.enemyIndex, defeated: b.defeatedEncounters, pending: b.pendingEncounterRewards,
        rewards: b.battleRewards, cooldown: b.cooldowns.strike, free: b.freeRetries, finished: b.finished };
    });
    expect(state.hp).toBe(state.maxHp);
    expect(state.enemyHp).toBe(state.enemyMax);
    expect(state).toMatchObject({ enemyIndex: 1, defeated: 1, pending: [0], rewards: { xp: 50, coins: 30 }, cooldown: 0, free: remaining - 1, finished: false });
    await page.evaluate(() => {
      const b = window.__retryGame.scene.getScene("battle");
      b.player.hp = 0;
      window.__retryPromise = b.finishBattle(false);
    });
  }
  await expect(dialog.getByRole("button", { name: "REINTENTAR (0)", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "RETIRADA", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__retryResult?.outcome)).toBe("abandoned");
  expect(await page.evaluate(() => {
    const slot = localStorage.getItem("cronicas-del-sello-save-active-slot") || "1";
    return JSON.parse(localStorage.getItem(`cronicas-del-sello-save-slot-${slot}`)).campaign.missionProgress.m02.status;
  })).toBe("abandoned");
  await page.evaluate(() => window.__retryGame.destroy(true));
});

test("una misión abandonada no ofrece Continuar y el mapa permite visitar la tienda", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const s = await import("/src/save.js?v=0.106.0");
    let save = s.createCharacter(s.createDefaultSave(), { name: "Retirada", affinity: "fuego" });
    save.campaign.tutorialSeen = true;
    s.writeSave(s.abandonMissionProgress(s.startMissionProgress(save, "m01"), "m01"));
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
  });
  await page.reload();
  await expect(await openFirstMission(page)).toHaveText("INICIAR HISTORIA");
  await page.locator('.village-return [data-view="plaza"]').click();
  await expect(page.locator('[data-coming-soon]')).toHaveCount(0);
  await expect(page.locator('[data-go="shop"]')).toHaveCount(1);
  await expect(page.locator("[data-buy-retry]")).toHaveCount(0);
});

test("abandonar y volver a iniciar en la misma sesión empieza desde el primer duelo", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const s = await import("/src/save.js?v=0.106.0");
    const save = s.applyDebugCheckpoint(s.createCharacter(s.createDefaultSave(), { name: "Reinicio", affinity: "fuego" }), "mission-2-ready");
    s.writeSave(save);
    localStorage.setItem("music-enabled", "off");
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
  });
  await page.reload();
  await ensurePhaser(page);
  await page.evaluate(() => {
    const OriginalGame = window.Phaser.Game;
    window.Phaser.Game = class extends OriginalGame {
      constructor(config) { super({ ...config, type: window.Phaser.CANVAS }); window.__appGame = this; }
    };
  });
  async function launchMission() {
    await page.locator(".debug-tools-trigger").click();
    await page.locator('[data-debug-mission="m02"]').click();
  }
  async function waitForBattle() {
    await expect.poll(() => page.evaluate(() => {
      const scene = window.__appGame?.scene.getScene("battle");
      return Boolean(scene?.scene.isActive() && scene.accessibleHud && !scene.finished);
    }), { timeout: 30000 }).toBe(true);
  }
  await launchMission();
  await waitForBattle();
  await page.evaluate(() => {
    const b = window.__appGame.scene.getScene("battle");
    b.stopTurnTimeline();
    b.enemyIndex = 1;
    b.defeatedEncounters = 1;
    b.player.hp = 1;
    b.scene.launch("pause");
    b.scene.pause();
  });
  await expect.poll(() => page.evaluate(() => window.__appGame.scene.isActive("pause"))).toBe(true);
  await page.evaluate(() => window.__appGame.scene.getScene("pause").showAbandonWarning());
  await page.getByRole("button", { name: "Abandonar misión y perder recompensas", exact: true }).evaluate((button) => button.click());
  await expect.poll(() => page.evaluate(() => window.__appGame.scene.isActive("results")), { timeout: 15000 }).toBe(true);
  await page.evaluate(async () => {
    const { returnToVillage } = await import("/src/battle/return-to-village.js?v=0.96.0");
    returnToVillage(window.__appGame.scene.getScene("results"), false);
  });
  await expect(page.locator("#meta")).toBeVisible();
  await launchMission();
  await waitForBattle();
  expect(await page.evaluate(() => {
    const b = window.__appGame.scene.getScene("battle");
    b.stopTurnTimeline();
    return { enemyIndex: b.enemyIndex, defeated: b.defeatedEncounters, hp: b.player.hp,
      maxHp: b.player.maxHp, freeRetries: b.freeRetries, results: window.__appGame.scene.isActive("results") };
  })).toMatchObject({ enemyIndex: 0, defeated: 0, freeRetries: 2, results: false });
});
