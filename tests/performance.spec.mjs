import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { bootPerformanceReference, preparePerformanceScenario, readPerformanceReference, disposePerformanceReference } from "./helpers/performance-harness.mjs";
import { ensurePhaser } from "./helpers/phaser-loader.mjs";

for (const renderer of ["Canvas", "WebGL"]) {
  test(`${renderer}: métricas reales, presupuestos y filtros al cambiar a modo ligero`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    if (renderer === "WebGL") test.skip(!await page.evaluate(() => Boolean(document.createElement("canvas").getContext("webgl2"))), "WebGL2 no disponible");
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await bootPerformanceReference(page, { renderer });
    await preparePerformanceScenario(page, "charged-turn");
    await expect.poll(async () => (await readPerformanceReference(page)).timing.frames).toBeGreaterThan(5);
    const charged = await readPerformanceReference(page);
    expect(charged.renderer).toBe(renderer);
    expect(charged.resolution.width).toBeGreaterThanOrEqual(960);
    expect(charged.scale.profile).not.toBeNull();
    expect(charged.resolution.width * charged.resolution.height).toBeLessThanOrEqual(charged.scale.profile.maxPixels);
    expect(charged.timing.fpsMean).toBeGreaterThan(0);
    expect(charged.timing.frameMsP95).toBeGreaterThanOrEqual(charged.timing.frameMsMean / 2);
    expect(charged.scenes.find((scene) => scene.key === "battle").violations).toEqual([]);
    if (renderer === "WebGL") expect(charged.scenes[0].peak.filters).toBe(1);
    await preparePerformanceScenario(page, "charged-turn", true);
    await page.waitForFunction(() => window.__performanceReference.previewFrozen);
    expect(await page.evaluate(() => ({
      paused: window.__performanceReference.scene.scene.isPaused(),
      hudVisible: window.__performanceReference.scene.actionCanvasParts.some((part) => part.visible)
    }))).toEqual({ paused: false, hudVisible: true });
    await page.evaluate(() => {
      window.__performanceReference.game.loop.wake();
      window.__performanceReference.previewFrozen = false;
    });
    const switched = await page.evaluate(async () => {
      const { sceneResourceUsage } = await import("/src/battle/visual-resources.js?v=0.99.0");
      const state = window.__performanceReference;
      state.showElementalImpact(state.scene, state.technique, 700, 330);
      const before = sceneResourceUsage(state.scene);
      const toggle = document.getElementById("light-mode");
      toggle.checked = true;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
      return { before, after: sceneResourceUsage(state.scene) };
    });
    expect(switched.before.emitters).toBeGreaterThan(0);
    if (renderer === "WebGL") expect(switched.before.filters).toBe(2);
    expect(switched.after).toMatchObject({ filters: 0, particles: 0, emitters: 0 });
    await preparePerformanceScenario(page, "elemental-technique");
    await page.waitForTimeout(700);
    const light = await readPerformanceReference(page);
    expect(light.lightMode).toBe(true);
    expect(light.scenes.find((scene) => scene.key === "battle").peak).toMatchObject({ particles: 0, emitters: 0, filters: 0 });
    expect(light.scenes.find((scene) => scene.key === "battle").violations).toEqual([]);
    await page.evaluate(() => {
      const toggle = document.getElementById("light-mode");
      toggle.checked = false;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect.poll(async () => (await readPerformanceReference(page)).scenes[0].current.filters).toBe(renderer === "WebGL" ? 1 : 0);
    const cleanup = await page.evaluate(async () => {
      const { performanceTools, installPerformanceTools } = await import("/src/dev/performance-tools.js?v=0.99.0");
      const { game, monitor } = window.__performanceReference;
      monitor.dispose();
      const before = game.events.listenerCount("postrender");
      installPerformanceTools(game, document.getElementById("game"), { renderScale: 1 });
      const disabledCount = game.events.listenerCount("postrender");
      performanceTools.setEnabled(true);
      const mounted = Boolean(document.querySelector(".performance-panel"));
      performanceTools.setEnabled(false);
      return { mounted, disabledCount, before, after: game.events.listenerCount("postrender"), removed: !document.querySelector(".performance-panel") };
    });
    expect(cleanup).toMatchObject({ mounted: true, removed: true });
    expect(cleanup.disabledCount).toBe(cleanup.before);
    expect(cleanup.after).toBe(cleanup.before);
    await disposePerformanceReference(page);
    expect(errors).toEqual([]);
  });
}

test("un equipo limitado conserva el framebuffer dentro del perfil economy", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "deviceMemory", { configurable: true, get: () => 2 });
    Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, get: () => 2 });
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, get: () => 3 });
  });
  await bootPerformanceReference(page, { renderer: "Canvas" });
  const report = await readPerformanceReference(page);
  expect(report.scale.profile).toMatchObject({ id: "economy", maxScale: 1, maxPixels: 960 * 540 });
  expect(report.resolution).toEqual({ width: 960, height: 540 });
  await disposePerformanceReference(page);
});

test("PRUEBAS activa el panel, exporta muestras y libera la medición al volver a la aldea", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator('[data-select-slot="1"]')).toBeVisible();
  await page.evaluate(async () => {
    const { createCharacter, createDefaultSave, writeSave, selectSaveSlot } = await import("/src/save.js?v=0.94.0");
    const save = createCharacter(createDefaultSave(), { name: "Medición", affinity: "fuego", bodyType: "male" });
    save.campaign.tutorialSeen = true;
    selectSaveSlot(1);
    writeSave(save);
    localStorage.setItem("music-enabled", "off");
    localStorage.setItem("dev-performance-enabled", "off");
  });
  await page.reload();
  await page.locator('[data-select-slot="1"]').click();
  await page.locator(".debug-tools-trigger").click();
  await expect(page.locator("[data-perf-enabled]")).not.toBeChecked();
  await page.locator("[data-perf-enabled]").check();
  await ensurePhaser(page);
  await page.evaluate(async () => {
    const { BattleScene } = await import("/src/battle/scenes/battle-scene.js?v=0.123.0");
    const create = BattleScene.prototype.create;
    BattleScene.prototype.create = function (...args) {
      const result = create.apply(this, args);
      window.__liveArenaController = this.arenaVisuals;
      return result;
    };
  });
  await page.locator('[data-debug-mission="m02"]').click();
  await expect(page.locator(".performance-panel")).toHaveCount(1);
  await expect.poll(() => page.evaluate(async () => {
    const { performanceTools } = await import("/src/dev/performance-tools.js?v=0.99.0");
    const report = performanceTools.snapshot();
    return report?.activeScenes.includes("battle") && report.timing.frames > 5;
  }), { timeout: 30_000 }).toBe(true);
  const downloadEvent = page.waitForEvent("download");
  await page.locator(".performance-panel [data-perf-export]").click();
  const download = await downloadEvent;
  const exported = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(exported.captures.length).toBeGreaterThan(0);
  expect(exported.captures.at(-1).timing.frames).toBeGreaterThan(5);
  await page.evaluate(async () => {
    window.__parkedGameCanvas = document.querySelector("#game canvas");
    const { battleRuntime } = await import("/src/battle/runtime.js?v=0.91.0");
    battleRuntime.releaseGameToMeta("plaza");
  });
  await expect(page.locator("#meta")).toBeVisible();
  await expect(page.locator(".performance-panel")).toHaveCount(0);
  expect(await page.evaluate(() => ({ destroyed: window.__liveArenaController.destroyed, owned: window.__liveArenaController.ownedCount })))
    .toEqual({ destroyed: true, owned: 0 });
  const lastCapture = await page.evaluate(async () => {
    const { performanceTools } = await import("/src/dev/performance-tools.js?v=0.99.0");
    const report = performanceTools.snapshot();
    if (report.resolution.width <= 0 || report.displaySize.width <= 0) throw new Error("La muestra final debe conservar la resolución visible");
    return report.capturedAt;
  });
  await page.waitForTimeout(600);
  expect(await page.evaluate(async () => {
    const { performanceTools } = await import("/src/dev/performance-tools.js?v=0.99.0");
    return performanceTools.snapshot().capturedAt;
  })).toBe(lastCapture);
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-mission="m02"]').click();
  await expect(page.locator(".performance-panel")).toHaveCount(1);
  expect(await page.evaluate(() => document.querySelector("#game canvas") === window.__parkedGameCanvas)).toBe(true);
  await expect.poll(() => page.evaluate(async () => {
    const { performanceTools } = await import("/src/dev/performance-tools.js?v=0.99.0");
    return performanceTools.snapshot()?.activeScenes.includes("battle");
  }), { timeout: 30_000 }).toBe(true);
  await page.evaluate(async () => {
    const { battleRuntime } = await import("/src/battle/runtime.js?v=0.91.0");
    battleRuntime.releaseGameToMeta("plaza");
  });
  expect(errors).toEqual([]);
});
