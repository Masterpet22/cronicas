import { expect, test } from "@playwright/test";
import { ensurePhaser } from "./helpers/phaser-loader.mjs";

test.setTimeout(45_000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "deviceMemory", { get: () => 2 });
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 2 });
  });
});

test("la calidad manual se guarda sin activar Phaser ni el modo ligero", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.106.0");
    const save = createCharacter(createDefaultSave(), { name: "Calidad", affinity: "fuego", bodyType: "male" });
    save.campaign.tutorialSeen = true;
    writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
  });
  await page.reload();
  await page.getByRole("button", { name: "Abrir ajustes", exact: true }).click();
  await page.locator('.game-settings [data-render-quality="high"]').click();
  await page.locator('.game-settings [data-render-quality="high"]').press("Home");
  await expect(page.locator("#render-quality")).toHaveValue("auto");
  await page.locator('.game-settings [data-render-quality="auto"]').press("End");
  await expect(page.locator("#light-mode")).not.toBeChecked();
  expect(await page.evaluate(() => Boolean(window.Phaser))).toBe(false);
  await page.reload();
  await expect(page.locator("#render-quality")).toHaveValue("high");
  await expect(page.locator("#light-mode")).not.toBeChecked();
});

test("la pausa cambia la resolución real sin reiniciar la batalla ni imponer el modo ligero", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.106.0");
    const save = createCharacter(createDefaultSave(), { name: "Calidad", affinity: "fuego", bodyType: "male" });
    save.campaign.tutorialSeen = true;
    writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
    localStorage.setItem("music-enabled", "off");
    localStorage.setItem("light-mode", "on");
  });
  // La recarga restablece Phaser; se instrumenta de nuevo antes de iniciar la misión.
  await page.reload();
  await ensurePhaser(page);
  await page.evaluate(() => {
    const OriginalGame = window.Phaser.Game;
    window.Phaser.Game = class extends OriginalGame {
      constructor(config) { super(config); window.__qualityGame = this; }
    };
  });
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-mission="m02"]').click();
  await page.waitForFunction(() => window.__qualityGame?.scene.isActive("battle"), null, { timeout: 40_000 });
  await page.waitForFunction(() => window.__qualityGame.scene.getScene("battle").accessibleHud);
  await expect.poll(() => page.locator("#game > canvas").evaluate(canvas => canvas.width)).toBe(960);
  await page.locator(".combat-access-pause").click();
  await expect(page.locator(".combat-pause-access")).toBeVisible();
  await page.evaluate(() => {
    const scene = window.__qualityGame.scene.getScene("battle");
    window.__qualitySnapshot = { scene, player: JSON.stringify(scene.player), enemy: JSON.stringify(scene.enemy) };
  });
  await page.locator('.combat-pause-access [data-render-quality="high"]').click();
  await expect.poll(() => page.locator("#game > canvas").evaluate(canvas => [canvas.width, canvas.height])).toEqual([1920, 1080]);
  await expect(page.locator(".combat-pause-access [data-render-quality-status]")).toContainText("1920 × 1080");
  await page.evaluate(() => {
    window.__lightChanges = [];
    document.getElementById("light-mode").addEventListener("change", event => window.__lightChanges.push(event.target.checked));
  });
  await page.getByRole("switch", { name: "Modo ligero" }).click();
  expect(await page.evaluate(() => window.__lightChanges)).toEqual([false]);
  await expect(page.locator("#light-mode")).not.toBeChecked();
  await page.getByRole("slider", { name: "Volumen" }).focus();
  await page.getByRole("slider", { name: "Volumen" }).press("Home");
  await page.getByRole("slider", { name: "Volumen" }).press("ArrowRight");
  await expect(page.locator("#game-volume")).toHaveValue("1");
  await expect(page.locator(".pause-volume output")).toHaveText("1%");
  expect(await page.evaluate(() => {
    const game = window.__qualityGame, scene = game.scene.getScene("battle"), before = window.__qualitySnapshot;
    return { same: scene === before.scene, player: JSON.stringify(scene.player) === before.player,
      enemy: JSON.stringify(scene.enemy) === before.enemy, paused: game.scene.isPaused("battle"),
      light: scene.lightMode, zoom: scene.cameras.main.zoom };
  })).toEqual({ same: true, player: true, enemy: true, paused: true, light: false, zoom: 2 });
  await page.screenshot({ path: "test-results/render-settings/pausa-alta.png" });
  await page.setViewportSize({ width: 1280, height: 720 });
  const layout = await page.locator(".combat-pause-panel").evaluate(panel => {
    const bounds = panel.getBoundingClientRect(), footer = panel.querySelector("footer").getBoundingClientRect();
    return { fits: bounds.top >= 0 && bounds.bottom <= innerHeight, actions: footer.bottom <= bounds.bottom,
      overflow: panel.scrollHeight - panel.clientHeight };
  });
  expect(layout).toEqual({ fits: true, actions: true, overflow: 0 });
  await page.screenshot({ path: "test-results/render-settings/pausa-1280.png" });
  await page.locator('.combat-pause-access [data-render-quality="auto"]').click();
  await expect.poll(() => page.locator("#game > canvas").evaluate(canvas => canvas.width)).toBe(960);
  await page.getByRole("button", { name: "ABANDONAR", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await page.getByRole("button", { name: "REANUDAR", exact: true }).click();
  await expect(page.locator(".combat-pause-access")).toHaveCount(0);
  expect(await page.evaluate(() => window.__qualityGame.scene.isActive("battle"))).toBe(true);
  expect(errors).toEqual([]);
});

test("la pausa de investigación guarda la calidad y vuelve al tablero", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { createCharacter, createDefaultSave, applyDebugCheckpoint, startDoctorMission, chooseDoctorMissionRoute, writeSave } = await import("/src/save.js?v=0.106.0");
    let save = startDoctorMission(applyDebugCheckpoint(createCharacter(createDefaultSave(), { name: "Calidad", affinity: "fuego", bodyType: "male" }), "doctor-ready"));
    for (let index = 0; index < 3; index++) save = chooseDoctorMissionRoute(save, "elevated");
    writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
  });
  await page.reload();
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-view="headquarters"]').click();
  await page.locator('[data-saga="saga-1"]').click();
  await page.locator('[data-mission="s02"]').click();
  const dialogue = page.locator(".dialogue-overlay");
  await expect(dialogue).toBeVisible();
  for (let index = 0; index < 3; index++) await dialogue.locator("button").click();
  await expect(page.locator(".cipher-screen")).toBeVisible();
  await page.locator("[data-mission-pause]").click();
  const dialog = page.locator(".mission-pause-dialog");
  await dialog.locator("summary").click();
  await dialog.locator('[data-render-quality="high"]').click();
  await expect(page.locator("#render-quality")).toHaveValue("high");
  expect(await page.evaluate(() => localStorage.getItem("render-quality"))).toBe("high");
  await expect(page.locator("#game")).toBeHidden();
  await dialog.locator("[data-mission-resume]").click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".cipher-screen")).toBeVisible();
});
