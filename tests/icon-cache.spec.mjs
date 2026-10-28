import { expect, test } from "@playwright/test";

async function dismissDialogue(page) {
  const dialogue = page.locator(".dialogue-overlay");
  for (let index = 0; index < 8 && await dialogue.isVisible(); index += 1) await dialogue.locator("button").click();
}

async function launchMission(page) {
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-mission="m02"]').click();
  await expect(page.locator(".combat-access")).toBeVisible({ timeout: 30_000 });
}

test("los iconos Canvas procesados se reutilizan al volver a entrar en combate", async ({ page }) => {
  const canvasWarnings = [];
  page.on("console", (message) => {
    if (/willReadFrequently|getImageData/.test(message.text())) canvasWarnings.push(message.text());
  });
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.getImageData;
    window.__iconCanvasReadbacks = 0;
    CanvasRenderingContext2D.prototype.getImageData = function (...args) {
      if (this.canvas?.width === 192 && this.canvas?.height === 192) window.__iconCanvasReadbacks += 1;
      return original.apply(this, args);
    };
  });
  await page.goto("/");
  await page.evaluate(async () => {
    const { createCharacter, createDefaultSave, selectSaveSlot, writeSave } = await import("/src/save.js?v=0.106.0");
    selectSaveSlot(1);
    writeSave(createCharacter(createDefaultSave(), { name: "Cache", affinity: "fuego", bodyType: "male" }));
    localStorage.setItem("music-enabled", "off");
  });
  await page.reload();
  await page.locator('[data-select-slot="1"]').click();
  await dismissDialogue(page);
  await launchMission(page);
  const firstReadbacks = await page.evaluate(() => window.__iconCanvasReadbacks);
  expect(firstReadbacks).toBeGreaterThan(0);

  await page.evaluate(async () => {
    const { battleRuntime } = await import("/src/battle/runtime.js?v=0.91.0");
    battleRuntime.releaseGameToMeta("plaza");
  });
  await expect(page.locator("#meta")).toBeVisible();
  await launchMission(page);
  expect(await page.evaluate(() => window.__iconCanvasReadbacks)).toBe(firstReadbacks);
  expect(canvasWarnings).toEqual([]);
});
