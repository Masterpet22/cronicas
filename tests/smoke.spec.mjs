import { expect, test } from "@playwright/test";

async function advanceDialogue(page) {
  const overlay = page.locator(".dialogue-overlay");
  await expect(overlay).toBeVisible();
  for (let guard = 0; guard < 12 && await overlay.isVisible(); guard += 1) {
    await overlay.locator("button").click();
  }
  await expect(overlay).toHaveCount(0);
}

async function clickCanvasPoint(page, box, xRatio, yRatio) {
  await page.mouse.click(box.x + box.width * xRatio, box.y + box.height * yRatio);
}

test("crear partida, lanzar m01 y volver a la aldea libera Phaser", async ({ page }) => {
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("music-enabled", "off");
    const nativeSetItem = Storage.prototype.setItem;
    window.__smokeSaveWrites = 0;
    Storage.prototype.setItem = function setItem(key, value) {
      if (String(key).startsWith("cronicas-del-sello-save-slot-")) window.__smokeSaveWrites += 1;
      return nativeSetItem.call(this, key, value);
    };
  });

  await page.goto("/");
  await page.locator('[data-select-slot="1"]').click();
  await page.locator('input[name="name"]').fill("Smoke");
  await page.locator("#character-form").getByRole("button", { name: "CREAR PERSONAJE" }).click();
  await advanceDialogue(page);

  await page.locator('[data-saga="saga-1"]').click();
  await page.locator('[data-mission="m01"]').click();
  const saveWritesBeforeLaunch = await page.evaluate(() => window.__smokeSaveWrites);
  await advanceDialogue(page);

  const canvas = page.locator("#game canvas");
  await expect(canvas).toHaveCount(1);
  await expect(page.locator("#game")).toBeVisible();
  await expect(page.locator("#meta")).toBeHidden();
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox, "El canvas debe tener dimensiones visibles").not.toBeNull();

  await expect.poll(() => page.evaluate(() => window.__smokeSaveWrites), { timeout: 40_000 }).toBeGreaterThan(saveWritesBeforeLaunch + 1);
  await page.waitForTimeout(500);
  await clickCanvasPoint(page, canvasBox, 480 / 960, 340 / 540);
  await page.waitForTimeout(500);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  await clickCanvasPoint(page, canvasBox, 560 / 960, 454 / 540);
  await page.waitForTimeout(700);
  await clickCanvasPoint(page, canvasBox, 625 / 960, 485 / 540);

  await expect(page.locator("#meta")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#game")).toBeHidden();
  await expect(canvas).toHaveCount(0);
  expect(browserErrors, "No debe haber errores de consola ni excepciones de página").toEqual([]);
});
