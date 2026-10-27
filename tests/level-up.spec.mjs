import { expect, test } from "@playwright/test";

test("la subida animada aparece antes del informe y detalla el crecimiento", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto("/");
  await expect(page.locator('[data-select-slot="1"]')).toBeVisible();
  const checks = await page.evaluate(async () => {
    const { LevelUpScene, shouldShowLevelUp } = await import("/src/battle/scenes/level-up-scene.js?v=0.95.0");
    const { battleRuntime } = await import("/src/battle/runtime.js?v=0.91.0");
    const { createCharacter, createDefaultSave, levelUpReport } = await import("/src/save.js?v=0.94.0");
    const save = createCharacter(createDefaultSave(), { name: "Kira", affinity: "fuego", bodyType: "female" });
    save.progression.level = 2;
    battleRuntime.activeSave = save;
    battleRuntime.renderResolution = 1;
    const report = levelUpReport(1, save);
    const result = { outcome: "completed", levelUp: report };
    const stage = document.createElement("div");
    stage.id = "level-up-test-stage";
    stage.style.cssText = "width:960px;height:540px";
    document.body.append(stage);
    const state = { arrived: false, result: null, game: null, stage };
    window.__levelUpTest = state;
    class BootScene extends window.Phaser.Scene {
      constructor() { super("boot-level-up-test"); }
      create() { this.scene.start("level-up", { result, nextScene: "results" }); }
    }
    class FakeResultsScene extends window.Phaser.Scene {
      constructor() { super("results"); }
      create(data) { state.arrived = true; state.result = data; }
    }
    state.game = new window.Phaser.Game({
      type: window.Phaser.CANVAS,
      parent: stage,
      width: 960,
      height: 540,
      scene: [BootScene, LevelUpScene, FakeResultsScene]
    });
    return {
      completed: shouldShowLevelUp(result),
      unchanged: shouldShowLevelUp({ outcome: "completed", levelUp: { beforeLevel: 2, afterLevel: 2 } }),
      failed: shouldShowLevelUp({ outcome: "failed", levelUp: report }),
      focus: report.focus.label,
      strengthGain: report.stats.find((stat) => stat.id === "strength").gain
    };
  });
  expect(checks).toMatchObject({ completed: true, unchanged: false, failed: false, focus: "FUERZA" });
  expect(checks.strengthGain).toBeGreaterThan(0);
  await expect(page.locator("#level-up-test-stage [role='dialog']")).toContainText("Subiste del nivel 1 al 2");
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__levelUpTest.game.scene.getScene("level-up");
    const panel = scene.children.getByName("level-up-panel");
    return panel?.alpha === 1 && Boolean(scene.children.getByName("level-up-fighter"))
      && Boolean(scene.children.getByName("level-up-aura"))
      && panel.list.some((child) => child.name === "level-up-continue" && child.input?.enabled);
  })).toBe(true);
  await page.locator("#level-up-test-stage canvas").click({ position: { x: 636, y: 469 } });
  await expect.poll(() => page.evaluate(() => window.__levelUpTest.arrived)).toBe(true);
  const passed = await page.evaluate(() => {
    const state = window.__levelUpTest;
    const passed = { outcome: state.result.outcome, level: state.result.levelUp.afterLevel, dialogRemoved: !state.stage.querySelector("[role='dialog']") };
    state.game.destroy(true);
    state.stage.remove();
    delete window.__levelUpTest;
    return passed;
  });
  expect(passed).toEqual({ outcome: "completed", level: 2, dialogRemoved: true });
  expect(browserErrors).toEqual([]);
});

test("el nivel ganado tras un rival vuelve al mismo combate sin guardarse", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto("/");
  await expect(page.locator('[data-select-slot="1"]')).toBeVisible();
  await page.evaluate(async () => {
    const { BattleFlowMethods } = await import("/src/battle/scenes/battle-flow.js?v=0.95.0");
    const { LevelUpScene } = await import("/src/battle/scenes/level-up-scene.js?v=0.95.0");
    const { battleRuntime } = await import("/src/battle/runtime.js?v=0.91.0");
    const { createPlayerFighter, queuePlayerFighterTextures } = await import("/src/fighters.js?v=0.81.0");
    const { playerFighterAppearance } = await import("/src/character.js?v=0.76.0");
    const { queueTeleportObjects } = await import("/src/battle/teleport-transition.js?v=1.1.0");
    const { createCharacter, createDefaultSave, derivedStats, writeSave } = await import("/src/save.js?v=0.94.0");
    const base = writeSave(createCharacter(createDefaultSave(), { name: "Kira", affinity: "fuego", bodyType: "female", teleportObject: "dog" }));
    const preview = { ...base, progression: { ...base.progression, level: 2, attributePoints: 2 } };
    battleRuntime.activeSave = base;
    battleRuntime.renderResolution = 1;
    const stage = document.createElement("div");
    stage.id = "level-up-battle-stage";
    stage.style.cssText = "width:960px;height:540px";
    document.body.append(stage);
    const state = { stage, game: null, resumed: false, oldHp: derivedStats(base).maxHp, newHp: 0,
      battleStages: [], modalStages: [], modalHadObject: false };
    window.__levelUpBattleTest = state;
    class FakeBattleScene extends window.Phaser.Scene {
      constructor() { super("battle"); }
      preload() { queuePlayerFighterTextures(this, playerFighterAppearance(base)); queueTeleportObjects(this); }
      create() {
        const stats = derivedStats(base);
        this.player = { ...stats, hp: stats.maxHp, chakra: stats.maxChakra };
        this.saveData = base;
        this.hero = createPlayerFighter(this, 220, 390, playerFighterAppearance(base));
        this.events.on("teleport-stage", event => state.battleStages.push(event));
        const levelUp = this.scene.get("level-up");
        levelUp.events.on("teleport-stage", event => state.modalStages.push(event.stage));
        levelUp.events.on("update", () => { state.modalHadObject ||= Boolean(levelUp.children?.getByName("teleport-object")); });
        this.lastShownLevel = 1;
        this.accessibleHud = { suspend: () => () => {} };
        this.refreshHud = () => {};
        this.stopTurnTimeline = () => {};
        void BattleFlowMethods.prototype.showPendingLevelUp.call(this, preview).then(() => {
          state.resumed = true;
          state.newHp = this.player.maxHp;
        });
      }
    }
    state.game = new window.Phaser.Game({ type: window.Phaser.CANVAS, parent: stage, width: 960, height: 540,
      scene: [FakeBattleScene, LevelUpScene] });
  });
  await expect(page.locator("#level-up-battle-stage [role='dialog']")).toContainText("volver al combate");
  await expect.poll(() => page.evaluate(() => {
    const panel = window.__levelUpBattleTest.game.scene.getScene("level-up").children.getByName("level-up-panel");
    return panel?.alpha === 1 && panel.list.some(child => child.name === "level-up-continue" && child.input?.enabled);
  })).toBe(true);
  await page.locator("#level-up-battle-stage canvas").click({ position: { x: 636, y: 469 } });
  await expect.poll(() => page.evaluate(() => window.__levelUpBattleTest.resumed)).toBe(true);
  const result = await page.evaluate(async () => {
    const { loadSave } = await import("/src/save.js?v=0.94.0");
    const state = window.__levelUpBattleTest;
    const outcome = { grewInCombat: state.newHp > state.oldHp, persistedLevel: loadSave().progression.level,
      battleActive: state.game.scene.isActive("battle"), battleStages: state.battleStages, modalStages: state.modalStages,
      modalHadObject: state.modalHadObject };
    state.game.destroy(true);
    state.stage.remove();
    delete window.__levelUpBattleTest;
    return outcome;
  });
  expect(result).toMatchObject({ grewInCombat: true, persistedLevel: 1, battleActive: true, modalHadObject: false });
  expect(result.battleStages.map(event => event.stage)).toEqual(["departure-smoke", "object-left", "object-disappears", "screen-transition", "arrival-smoke", "character-arrives"]);
  expect(result.battleStages.filter(event => event.stage === "object-left")).toEqual([{ stage: "object-left", object: "dog" }]);
  expect(result.modalStages).toEqual(["arrival-smoke", "character-arrives", "departure-smoke", "screen-transition"]);
  expect(browserErrors).toEqual([]);
});

test("abandonar advierte que se pierden recompensas y niveles provisionales", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-select-slot="1"]')).toBeVisible();
  await page.evaluate(async () => {
    const { PauseScene } = await import("/src/battle/scenes/pause-scene.js?v=0.95.0");
    const { battleRuntime } = await import("/src/battle/runtime.js?v=0.91.0");
    battleRuntime.renderResolution = 1;
    const stage = document.createElement("div");
    stage.id = "abandon-test-stage";
    stage.style.cssText = "width:960px;height:540px";
    document.body.append(stage);
    const state = { stage, game: null, abandoned: false, result: null };
    window.__abandonTest = state;
    class FakeBattleScene extends window.Phaser.Scene {
      constructor() { super("battle"); }
      create() {
        this.rewardPreviewSave = { progression: { level: 2 } };
        this.missionStartSave = { progression: { level: 1 } };
        this.mission = { type: "main" };
        this.accessibleHud = { refresh() {} };
        this.abandonPayload = () => { state.abandoned = true; return { outcome: "abandoned" }; };
        this.scene.launch("pause");
        this.scene.pause();
      }
    }
    class FakeTravelScene extends window.Phaser.Scene {
      constructor() { super("travel"); }
      create(data) { state.result = data.result; }
    }
    state.game = new window.Phaser.Game({ type: window.Phaser.CANVAS, parent: stage, width: 960, height: 540,
      scene: [FakeBattleScene, PauseScene, FakeTravelScene] });
  });
  const canvas = page.locator("#abandon-test-stage canvas");
  await expect(page.locator("#abandon-test-stage .combat-pause-access")).toBeVisible();
  await canvas.click({ position: { x: 560, y: 454 } });
  await expect(page.locator("#abandon-test-stage [role='alertdialog']")).toContainText("perderás 1 nivel");
  await canvas.click({ position: { x: 360, y: 354 } });
  await expect(page.locator("#abandon-test-stage [role='alertdialog']")).toHaveCount(0);
  expect(await page.evaluate(() => window.__abandonTest.abandoned)).toBe(false);
  await canvas.click({ position: { x: 560, y: 454 } });
  await canvas.click({ position: { x: 600, y: 354 } });
  await expect.poll(() => page.evaluate(() => window.__abandonTest.result?.outcome)).toBe("abandoned");
  const abandoned = await page.evaluate(() => {
    const state = window.__abandonTest;
    const value = state.abandoned;
    state.game.destroy(true);
    state.stage.remove();
    delete window.__abandonTest;
    return value;
  });
  expect(abandoned).toBe(true);
});
