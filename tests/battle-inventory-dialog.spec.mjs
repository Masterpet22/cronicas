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

test("el navegador muestra el kunai dentro y fuera de los modales y respeta la carga", async ({ page }) => {
  await page.goto("/");
  const main = page.locator("main");
  const kunai = /kunai\.png/;
  await expect(main).toHaveCSS("cursor", kunai);
  await page.evaluate(() => {
    for (const id of ["first", "second"]) {
      const modal = document.createElement("dialog"); modal.id = id;
      modal.innerHTML = '<button type="button">Cerrar</button>';
      document.querySelector("main").append(modal);
    }
    document.getElementById("first").showModal();
  });
  await expect(page.locator("#first button")).toHaveCSS("cursor", kunai);
  expect(await page.locator("#first").evaluate(dialog => {
    const button = dialog.querySelector("button");
    const fire = x => {
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse", clientX: x }));
      return dialog.querySelector(".game-cursor-click:last-child");
    };
    const first = fire(20);
    const overlapping = fire(40);
    first.dispatchEvent(new Event("animationend"));
    const reused = fire(60);
    return { independent: first !== overlapping, reused: reused === first, position: reused.style.left };
  })).toEqual({ independent: true, reused: true, position: "60px" });
  await page.evaluate(() => document.getElementById("second").showModal());
  await expect(page.locator("#second button")).toHaveCSS("cursor", kunai);
  await page.evaluate(() => document.getElementById("second").close());
  await expect(page.locator("#first button")).toHaveCSS("cursor", kunai);
  await page.evaluate(() => document.getElementById("first").close());
  await expect(main).toHaveCSS("cursor", kunai);
  await main.evaluate(element => {
    const loader = document.createElement("div");
    loader.id = "test-cursor-loader";
    loader.setAttribute("aria-busy", "true");
    element.append(loader);
  });
  await expect(page.locator(".game-cursor-loading.is-visible")).toHaveCSS("animation-name", "game-cursor-spin");
  await expect(main).toHaveCSS("cursor", "none");
  await page.locator("#test-cursor-loader").evaluate(loader => { loader.hidden = true; });
  await expect(main).toHaveCSS("cursor", kunai);
  await expect(page.locator(".game-cursor-loading")).toHaveCount(0);
  await page.locator("#test-cursor-loader").evaluate(loader => { loader.hidden = false; });
  await expect(page.locator(".game-cursor-loading.is-visible")).toHaveCSS("animation-name", "game-cursor-spin");
  await expect(main).toHaveCSS("cursor", "none");
  await page.locator("#test-cursor-loader").evaluate(loader => loader.remove());
  await expect(main).toHaveCSS("cursor", kunai);
  await expect(page.locator(".game-cursor, .game-cursor-loading")).toHaveCount(0);
});

for (const width of [1280, 1600]) test(`Objetos conserva el cursor y permite cerrar y continuar a ${width}`, async ({ page }, testInfo) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width, height: width === 1280 ? 720 : 900 });
  await boot(page);
  await expect(bag(page)).toHaveText("");
  await expect(bag(page).locator("svg")).toBeVisible();
  await expect(bag(page)).toHaveAttribute("title", "Objetos");
  const pauseBounds = await page.getByRole("button", { name: "Pausar combate (Escape)" }).boundingBox();
  const bagBounds = await bag(page).boundingBox();
  const hudBounds = await page.locator(".combat-access").boundingBox();
  expect(pauseBounds.width).toBeCloseTo(bagBounds.width);
  expect(pauseBounds.y).toBeCloseTo(bagBounds.y);
  expect((pauseBounds.x + bagBounds.x + bagBounds.width) / 2).toBeCloseTo(hudBounds.x + hudBounds.width / 2, 0);
  await page.getByRole("button", { name: "Cambiar a habilidades físicas (0)", exact: true }).click();
  await bag(page).click();
  await expect(dialog(page)).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__performanceReference.scene.scene.isPaused())).toBe(true);
  const close = page.getByRole("button", { name: "Cerrar objetos" });
  await expect(close).toHaveCSS("cursor", /kunai\.png/);
  await close.hover();
  const bounds = await close.boundingBox();
  const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("button")?.hasAttribute("data-bag-close"), { x, y })).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("objetos-cursor.png") });
  await close.click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(bag(page)).toBeFocused();
  await expect(bag(page)).toHaveCSS("cursor", /kunai\.png/);
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
  await page.getByRole("button", { name: "Cambiar a habilidades elementales (0)", exact: true }).click();
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
  await bag(page).click();
  await expect(dialog(page)).toBeVisible();
  await expect(page.locator('[data-use-item="health_potion"]')).toBeDisabled();
  await page.evaluate(() => window.__performanceReference.game.scene.stop("battle"));
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.locator("main")).toHaveCSS("cursor", /kunai\.png/);
  expect(errors).toEqual([]);
});
