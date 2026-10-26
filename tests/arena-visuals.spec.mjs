import { test, expect } from "@playwright/test";
import { bootPerformanceReference, disposePerformanceReference } from "./helpers/performance-harness.mjs";

for (const renderer of ["Canvas", "WebGL"]) {
  test(`${renderer}: las tres arenas cambian desde datos, respetan calidad y liberan sus efectos`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    if (renderer === "WebGL") test.skip(!await page.evaluate(() => Boolean(document.createElement("canvas").getContext("webgl2"))), "WebGL2 no disponible");
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await bootPerformanceReference(page, { renderer });
    const variants = await page.evaluate(async () => {
      const { BATTLE_ARENAS } = await import("/src/battle/runtime.js?v=0.91.0");
      const { sceneResourceUsage } = await import("/src/battle/visual-resources.js?v=0.99.0");
      const scene = window.__performanceReference.scene;
      await new Promise((resolve) => {
        scene.load.once("complete", resolve);
        BATTLE_ARENAS.forEach((arena) => { if (!scene.textures.exists(arena.texture)) scene.load.image(arena.texture, arena.file); });
        scene.load.start();
      });
      const output = [];
      scene.cameraEffects = true;
      for (const arena of BATTLE_ARENAS) {
        const previous = scene.children.getByName("arena-background");
        scene.arenaVisuals.update({ arena });
        output.push({ id: scene.arenaVisuals.profile.id, label: scene.arenaLabel,
          texture: scene.children.getByName("arena-background").texture.key,
          owned: scene.arenaVisuals.ownedCount, previousRemoved: !previous.scene,
          textureCount: scene.arenaVisuals.textureKeys.length,
          groundColor: scene.hero.shadow.fillColor,
          camera: scene.arenaVisuals.cameraIntensity, resources: sceneResourceUsage(scene) });
      }
      return output;
    });
    expect(variants.map((variant) => variant.id)).toEqual(["dusk-pass", "mist-marsh", "moon-shrine"]);
    expect(variants.map((variant) => variant.groundColor)).toEqual([0x000000, 0x123e45, 0x000000]);
    expect(new Set(variants.map((variant) => variant.texture)).size).toBe(3);
    for (const variant of variants) {
      expect(variant.previousRemoved).toBe(true);
      expect(variant.textureCount).toBe(renderer === "WebGL" ? 0 : 1);
      expect(variant.owned).toBe(3);
      expect(variant.resources.emitters).toBe(1);
      expect(variant.resources.filters).toBe(renderer === "WebGL" ? 1 : 0);
      expect(variant.camera).toBeGreaterThan(0);
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => page.evaluate(() => window.__performanceReference.scene.arenaVisuals.ownedCount)).toBe(2);
    expect(await page.evaluate(() => window.__performanceReference.scene.arenaVisuals.cameraIntensity)).toBe(0);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect.poll(() => page.evaluate(() => window.__performanceReference.scene.arenaVisuals.ownedCount)).toBe(3);
    const fallback = await page.evaluate(async () => {
      const { sceneResourceUsage } = await import("/src/battle/visual-resources.js?v=0.99.0");
      const scene = window.__performanceReference.scene;
      const toggle = document.getElementById("light-mode");
      toggle.checked = true;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
      const result = { owned: scene.arenaVisuals.ownedCount, camera: scene.arenaVisuals.cameraIntensity, resources: sceneResourceUsage(scene),
        background: Boolean(scene.children.getByName("arena-background")), atmosphere: Boolean(scene.children.getByName("arena-atmosphere")) };
      window.__retiredArenaVisuals = scene.arenaVisuals;
      window.__retiredArenaTextureKeys = scene.arenaVisuals.textureKeys;
      scene.scene.restart();
      return result;
    });
    expect(fallback).toMatchObject({ owned: 2, camera: 0, resources: { filters: 0, emitters: 0, particles: 0 }, background: true, atmosphere: true });
    await expect.poll(() => page.evaluate(() => window.__retiredArenaVisuals.destroyed)).toBe(true);
    expect(await page.evaluate(() => window.__retiredArenaVisuals.ownedCount)).toBe(0);
    expect(await page.evaluate(() => window.__retiredArenaTextureKeys.some((key) => window.__performanceReference.scene.textures.exists(key)))).toBe(false);
    await expect.poll(() => page.evaluate(() => window.__performanceReference.scene.arenaVisuals.ownedCount)).toBe(2);
    await disposePerformanceReference(page);
    expect(errors).toEqual([]);
  });
}
