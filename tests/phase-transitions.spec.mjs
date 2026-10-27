import { expect, test } from "@playwright/test";

test("el cambio de fase del jefe se anuncia y devuelve la cámara al combate", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const { playBossPhaseTransition } = await import("/src/battle/phase-transition.js?v=0.97.0");
    const { battleRuntime } = await import("/src/battle/runtime.js?v=0.91.0");
    battleRuntime.renderResolution = 1;
    const stage = document.createElement("div");
    stage.id = "boss-phase-test-stage";
    stage.style.cssText = "width:960px;height:540px";
    document.body.append(stage);
    const state = { stage, game: null, completed: false, peakZoom: 1 };
    window.__bossPhaseTest = state;
    class PhaseScene extends window.Phaser.Scene {
      constructor() { super("phase-test"); }
      preload() { this.load.image("preparation-mote", "assets/vfx/feedback/preparation-mote.png?v=0.91.0"); }
      create() {
        this.add.rectangle(0, 0, 960, 540, 0x122033).setOrigin(0);
        this.events.on(window.Phaser.Scenes.Events.UPDATE, () => { state.peakZoom = Math.max(state.peakZoom, this.cameras.main.zoom); });
        void playBossPhaseTransition(this, { fighter: { body: { x: 740, y: 360 } }, name: "Raizen", detail: "Aumenta su velocidad." })
          .then(() => { state.completed = true; });
      }
    }
    state.game = new window.Phaser.Game({ type: window.Phaser.CANVAS, parent: stage, width: 960, height: 540, scene: [PhaseScene] });
  });
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__bossPhaseTest.game.scene.getScene("phase-test");
    return scene.children.getByName("boss-phase-title")?.text;
  })).toBe("FASE II");
  await expect.poll(() => page.evaluate(() => window.__bossPhaseTest.completed)).toBe(true);
  const result = await page.evaluate(() => {
    const state = window.__bossPhaseTest;
    const scene = state.game.scene.getScene("phase-test");
    const result = { peakZoom: state.peakZoom, finalZoom: scene.cameras.main.zoom,
      overlayRemoved: !scene.children.getByName("boss-phase-title") };
    state.game.destroy(true);
    state.stage.remove();
    delete window.__bossPhaseTest;
    return result;
  });
  expect(result.peakZoom).toBeGreaterThan(1);
  expect(result.finalZoom).toBeCloseTo(1, 2);
  expect(result.overlayRemoved).toBe(true);
  expect(errors).toEqual([]);
});

test("al pasar al siguiente rival se muestra la fase de misión y se limpia la transición", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const { BattleFlowMethods } = await import("/src/battle/scenes/battle-flow.js?v=0.97.0");
    const { createCharacter, createDefaultSave } = await import("/src/save.js?v=0.94.0");
    const { playerFighterAppearance } = await import("/src/character.js?v=0.76.0");
    const { queuePlayerFighterTextures } = await import("/src/fighters.js?v=0.81.0");
    const save = createCharacter(createDefaultSave(), { name: "Kira", affinity: "fuego", bodyType: "male" });
    const appearance = playerFighterAppearance(save);
    const stage = document.createElement("div");
    stage.id = "encounter-transition-test-stage";
    stage.style.cssText = "width:960px;height:540px";
    document.body.append(stage);
    const state = { stage, game: null, phaseLabel: null, progressStarted: false, completed: false, route: null };
    window.__encounterTransitionTest = state;
    class EncounterScene extends window.Phaser.Scene {
      constructor() { super("encounter-test"); }
      preload() {
        this.load.image("forest-road", "assets/locations/forest-road.webp?v=0.75.0");
        this.load.image("village-outskirts-branches", "assets/locations/village-outskirts-branches.webp?v=0.74.0");
        queuePlayerFighterTextures(this, appearance);
      }
      create() {
        this.add.rectangle(0, 0, 960, 540, 0x122033).setOrigin(0);
        this.enemyIndex = 1;
        this.mission = { id: "m01", number: 1, category: "main", location: "Bosque del Este" };
        this.encounters = [{ name: "Bandido" }, { name: "Varek" }, { name: "Raizen" }];
        this.playerAppearance = () => appearance;
        this.textStyle = (size, color) => ({ fontFamily: "Arial", fontSize: `${size}px`, color });
        this.accessibleHud = { suspend: () => () => {} };
        this.tween = (config) => new Promise((resolve) => this.tweens.add({ ...config, onComplete: resolve }));
        this.events.on(window.Phaser.Scenes.Events.UPDATE, () => {
          const progress = this.children.getByName("encounter-transition-progress");
          state.progressStarted ||= (progress?.displayWidth || 0) > 20;
          if (progress?.displayWidth > 40 && progress.displayWidth < 320) {
            state.route = { x: progress.x, y: progress.y, width: progress.width, scaleX: progress.scaleX,
              originX: progress.originX, trackWidth: this.children.getByName("encounter-transition-progress-track").width,
              from: this.children.getByName("encounter-transition-route-left").text,
              to: this.children.getByName("encounter-transition-route-right").text };
          }
        });
        void BattleFlowMethods.prototype.playEncounterTransition.call(this, this.encounters[1])
          .then(() => { state.completed = true; });
        state.phaseLabel = this.children.getByName("encounter-phase-tag")?.text;
      }
    }
    state.game = new window.Phaser.Game({ type: window.Phaser.CANVAS, parent: stage, width: 960, height: 540, scene: [EncounterScene] });
  });
  await expect.poll(() => page.evaluate(() => window.__encounterTransitionTest.phaseLabel)).toBe("FASE DE MISIÓN 2 / 3");
  await expect.poll(() => page.evaluate(() => window.__encounterTransitionTest.route)).not.toBeNull();
  const route = await page.evaluate(() => window.__encounterTransitionTest.route);
  expect(route).toMatchObject({ x: 300, y: 486, width: 360, originX: 0, trackWidth: 360, from: "FASE 01", to: "FASE 02" });
  expect(route.scaleX).toBeGreaterThan(0);
  expect(route.scaleX).toBeLessThan(1);
  await page.locator("#encounter-transition-test-stage canvas").screenshot({ path: "test-results/encounter-transition-preview.png" });
  await expect.poll(() => page.evaluate(() => window.__encounterTransitionTest.completed)).toBe(true);
  const result = await page.evaluate(() => {
    const state = window.__encounterTransitionTest;
    const scene = state.game.scene.getScene("encounter-test");
    const value = { progressStarted: state.progressStarted,
      cleaned: !scene.children.getByName("encounter-phase-tag") && !scene.children.getByName("encounter-transition-progress")
        && !scene.children.getByName("encounter-transition-progress-track") && !scene.children.getByName("encounter-transition-route-left") };
    state.game.destroy(true);
    state.stage.remove();
    delete window.__encounterTransitionTest;
    return value;
  });
  expect(result).toEqual({ progressStarted: true, cleaned: true });
  expect(errors).toEqual([]);
});
