import { ensurePhaser } from "./phaser-loader.mjs";

// La misma receta se usa en las regresiones y en npm run performance:baseline.
export async function bootPerformanceReference(page, { renderer = "Canvas", lightMode = false, arenaIndex = 1 } = {}) {
  await page.addInitScript(() => {
    sessionStorage.setItem("compact-combat-enabled", "1");
    localStorage.setItem("music-enabled", "off");
    localStorage.setItem("dev-performance-enabled", "off");
  });
  await page.goto("/");
  await ensurePhaser(page);
  await page.waitForFunction(() => window.Phaser && document.querySelector('[data-select-slot="1"]'));
  await page.evaluate(async ({ renderer, lightMode, arenaIndex }) => {
    const { BattleScene } = await import("/src/battle/scenes/battle-scene.js?v=1.0.0");
    const { battleRuntime } = await import("/src/battle/runtime.js?v=0.91.0");
    const { configureRenderResolution } = await import("/src/battle/render-resolution.js?v=1.0.0");
    const { createCharacter, createDefaultSave } = await import("/src/save.js?v=0.94.0");
    const { MISSIONS } = await import("/src/content/index.js");
    const { createPerformanceMonitor } = await import("/src/dev/performance-monitor.js?v=0.99.0");
    const { JUTSU_LIBRARY } = await import("/src/data.js?v=0.93.0");
    const { showElementalImpact } = await import("/src/battle/elemental-effects.js?v=0.92.0");
    document.getElementById("light-mode").checked = lightMode;
    document.getElementById("manual-seals").checked = false;
    document.getElementById("music-enabled").checked = false;
    document.getElementById("camera-effects").checked = false;
    document.getElementById("flash-effects").checked = false;
    localStorage.setItem("light-mode", lightMode ? "on" : "off");
    const mission = MISSIONS.filter((mission) => mission.encounters)[arenaIndex];
    const save = createCharacter(createDefaultSave(), { name: "Referencia", affinity: "fuego", bodyType: "male" });
    save.progression.level = 8;
    save.character.affinityXp.fuego = 1000;
    save.loadout = ["fire_embers", "fire_breath", "fire_arc", "fire_brand"];
    save.campaign.completedMissions = [mission.id];
    battleRuntime.activeSave = save;
    battleRuntime.activeMission = mission;
    const root = document.getElementById("game");
    root.hidden = false;
    document.getElementById("meta").hidden = true;
    await document.fonts.ready;
    const renderSize = configureRenderResolution(root, battleRuntime);
    const startedAt = performance.now();
    const state = { game: null, scene: null, monitor: null, ready: false, bootMs: null,
      missionId: mission.id, arena: mission.number, quality: lightMode ? "light" : "normal", showElementalImpact,
      technique: JUTSU_LIBRARY.find(({ id }) => id === "fire_breath") };
    window.__performanceReference = state;
    class ReferenceBattle extends BattleScene {
      create() {
        super.create();
        this.stopTurnTimeline();
        this.timelinePaused = true;
        this.busy = true;
        this.setButtonsEnabled(false);
        state.scene = this;
        state.bootMs = performance.now() - startedAt;
        state.ready = true;
      }
    }
    state.game = new window.Phaser.Game({
      type: renderer === "WebGL" ? window.Phaser.WEBGL : window.Phaser.CANVAS,
      parent: root, width: renderSize.width, height: renderSize.height, scene: [ReferenceBattle], seed: ["cronicas-phase-0"],
      callbacks: { postBoot: (game) => { state.monitor = createPerformanceMonitor(game, { renderScale: battleRuntime.renderResolution, renderProfile: battleRuntime.renderProfile }); } },
      loader: { maxParallelDownloads: 6 },
      render: { antialias: true, antialiasGL: true, pixelArt: false, roundPixels: false },
      scale: { mode: window.Phaser.Scale.FIT, autoCenter: window.Phaser.Scale.CENTER_BOTH }
    });
  }, { renderer, lightMode, arenaIndex });
  await page.waitForFunction(() => window.__performanceReference?.ready, null, { timeout: 30_000 });
}

export async function preparePerformanceScenario(page, scenario, freezePreview = false) {
  await page.evaluate(({ scenario, freezePreview }) => {
    const state = window.__performanceReference;
    const scene = state.scene;
    if (state.previewFrozen) state.game.loop.wake();
    state.previewFrozen = false;
    ["player", "enemy"].forEach((actor) => scene.clearPreparationFeedback(actor));
    scene.pendingActions = { player: null, enemy: null };
    scene.timelineProgress = { player: 0, enemy: 0 };
    scene.turnReady = false;
    scene.updateTimelineMarkers();
    state.monitor.startCapture(scenario);
    if (scenario === "charged-turn") {
      scene.pendingActions = { player: state.technique, enemy: state.technique };
      scene.timelineProgress = { player: 0.9, enemy: 0.92 };
      scene.updateTimelineMarkers();
      ["player", "enemy"].forEach((actor) => scene.showPreparationFeedback(actor, state.technique));
    } else if (scenario === "elemental-technique") {
      void scene.playTechniqueEffect(state.technique.id);
      scene.time.delayedCall(250, () => state.showElementalImpact(scene, state.technique, scene.foe.body.x, scene.foe.body.y - 50));
    }
    scene.refreshBattlePhase();
    if (freezePreview) scene.time.delayedCall(scenario === "elemental-technique" ? 300 : 150, () => {
      // Congelar después del render no activa el menú de pausa ni oculta el HUD.
      state.game.events.once("postrender", () => {
        state.game.loop.sleep();
        state.previewFrozen = true;
      });
    });
  }, { scenario, freezePreview });
}

export async function readPerformanceReference(page) {
  return page.evaluate(() => {
    const state = window.__performanceReference;
    return { ...state.monitor.snapshot(), fixture: { missionId: state.missionId, arenaNumber: state.arena,
      techniqueId: state.technique.id, bootMs: Math.round(state.bootMs), quality: state.quality } };
  });
}

export async function capturePerformancePreview(page, scenario, path) {
  await preparePerformanceScenario(page, scenario, true);
  await page.waitForFunction(() => window.__performanceReference.previewFrozen);
  const compact = await page.locator("#game").evaluate((root) => root.classList.contains("compact-combat"));
  await page.screenshot({ path, fullPage: compact });
  await page.evaluate(() => {
    window.__performanceReference.game.loop.wake();
    window.__performanceReference.previewFrozen = false;
  });
  // Deja terminar el efecto antes de preparar el siguiente escenario.
  await page.waitForTimeout(scenario === "elemental-technique" ? 800 : 0);
}

export async function disposePerformanceReference(page) {
  await page.evaluate(() => {
    const state = window.__performanceReference;
    if (!state) return;
    state.monitor.dispose();
    state.game.destroy(true);
    delete window.__performanceReference;
  });
}
