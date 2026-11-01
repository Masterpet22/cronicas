import { test, expect } from "@playwright/test";
import { bootPerformanceReference } from "./helpers/performance-harness.mjs";

async function boot(page) {
  await bootPerformanceReference(page);
  await page.evaluate(() => {
    const scene = window.__performanceReference.scene;
    scene.busy = false; scene.turnReady = true; scene.player.hp = 10;
    scene.saveData.inventory.items.health_potion = 2;
    scene.refreshHud();
  });
}
const bag = page => page.getByRole("button", { name: "Abrir objetos de misión" });
const dialog = page => page.getByRole("dialog", { name: "Objetos de misión" });

test("el cursor sigue la ventana modal activa y vuelve al documento al cerrarla", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".game-cursor")).toHaveCount(1);
  await page.evaluate(() => {
    for (const id of ["first", "second"]) {
      const modal = document.createElement("dialog"); modal.id = id;
      modal.innerHTML = '<button type="button">Cerrar</button>';
      document.querySelector("main").append(modal);
    }
    document.getElementById("first").showModal();
  });
  await expect(page.locator("#first > .game-cursor")).toHaveCount(1);
  await page.evaluate(() => document.getElementById("second").showModal());
  await expect(page.locator("#second > .game-cursor")).toHaveCount(1);
  await page.evaluate(() => document.getElementById("second").close());
  await expect(page.locator("#first > .game-cursor")).toHaveCount(1);
  await page.evaluate(() => document.getElementById("first").close());
  await expect(page.locator("body > .game-cursor")).toHaveCount(1);
  await page.evaluate(() => document.getElementById("first").showModal());
  await expect(page.locator("#first > .game-cursor")).toHaveCount(1);
  await page.evaluate(() => document.getElementById("first").remove());
  await expect(page.locator("body > .game-cursor")).toHaveCount(1);
});

for (const width of [1280, 1600]) test(`Objetos conserva el cursor y permite cerrar y continuar a ${width}`, async ({ page }, testInfo) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width, height: width === 1280 ? 720 : 900 });
  await boot(page);
  await page.getByRole("button", { name: "Cambiar a habilidades físicas", exact: true }).click();
  await bag(page).click();
  await expect(dialog(page)).toBeVisible();
  expect(await page.evaluate(() => window.__performanceReference.scene.scene.isPaused())).toBe(true);
  await expect(page.locator("dialog:modal > .game-cursor")).toHaveCount(1);
  const close = page.getByRole("button", { name: "Cerrar objetos" });
  await close.hover();
  const bounds = await close.boundingBox();
  const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
  await expect.poll(() => page.locator(".game-cursor").evaluate(el => {
    const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y) };
  })).toEqual({ x: Math.round(x - 1), y: Math.round(y - 1) });
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("button")?.hasAttribute("data-bag-close"), { x, y })).toBe(true);
  await expect(page.locator(".game-cursor")).toHaveCSS("pointer-events", "none");
  await expect(page.locator(".game-cursor")).toHaveCSS("opacity", "1");
  await page.screenshot({ path: testInfo.outputPath("objetos-cursor.png") });
  await close.click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(bag(page)).toBeFocused();
  await expect(page.locator("body > .game-cursor")).toHaveCount(1);
  expect(await page.evaluate(() => window.__performanceReference.scene.scene.isActive())).toBe(true);
  await expect(page.locator(".combat-access")).toHaveAttribute("data-skill-table", "physical");
  await bag(page).click(); await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  await expect(bag(page)).toBeFocused();
  // Fuerza la apertura y el cierre antes de que Phaser procese la pausa.
  await page.evaluate(() => {
    document.querySelector(".combat-access-inventory").click();
    document.querySelector("[data-bag-close]").click();
  });
  await expect(bag(page)).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.__performanceReference.scene.scene.isActive())).toBe(true);
  await page.getByRole("button", { name: "Cambiar a habilidades elementales", exact: true }).click();
  await expect(page.locator(".combat-access")).toHaveAttribute("data-skill-table", "elemental");
  expect(errors).toEqual([]);
});

test("Objetos permite usar una poción y recupera la interacción al cerrar por código o salir", async ({ page }) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await boot(page);
  await bag(page).click();
  await page.evaluate(() => document.querySelector("dialog:modal").close());
  await expect(dialog(page)).toHaveCount(0);
  await expect(bag(page)).toBeFocused();
  await bag(page).click();
  await page.locator('[data-use-item="health_potion"]').click();
  await expect(dialog(page)).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__performanceReference.scene.round)).toBe(2);
  const result = await page.evaluate(() => {
    const s = window.__performanceReference.scene; s.stopTurnTimeline();
    return { hp: s.player.hp, expected: 10 + Math.round(s.player.maxHp * .35), count: s.saveData.inventory.items.health_potion, active: s.scene.isActive() };
  });
  expect(result).toEqual({ hp: result.expected, expected: result.expected, count: 1, active: true });
  await expect(page.locator("body > .game-cursor")).toHaveCount(1);
  await bag(page).click();
  await expect(dialog(page)).toBeVisible();
  await expect(page.locator('[data-use-item="health_potion"]')).toBeDisabled();
  await page.evaluate(() => window.__performanceReference.game.scene.stop("battle"));
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.locator("body > .game-cursor")).toHaveCount(1);
  expect(errors).toEqual([]);
});
