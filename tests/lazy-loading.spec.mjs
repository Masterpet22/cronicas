import { expect, test } from "@playwright/test";

test("Phaser y las escenas se cargan solamente al iniciar una misión", async ({ page }) => {
  const errors = [];
  const preloadWarnings = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "warning" && message.text().includes("preloaded using link preload")) preloadWarnings.push(message.text());
  });
  await page.goto("/");
  await expect(page.locator('[data-select-slot="1"]')).toBeVisible();
  const initial = await page.evaluate(() => ({
    phaser: Boolean(window.Phaser),
    resources: performance.getEntriesByType("resource").map(({ name }) => name)
  }));
  expect(initial.phaser).toBe(false);
  expect(initial.resources.some((url) => url.includes("phaser-4.2.1.min.js"))).toBe(false);
  expect(initial.resources.some((url) => url.includes("/src/battle/bundle.js") || url.includes("/src/battle/scenes/"))).toBe(false);
  expect(initial.resources.some((url) => /aldea\.webp|village-outskirts|forest-road/.test(url))).toBe(false);

  await page.evaluate(async () => {
    const { createCharacter, createDefaultSave, selectSaveSlot, writeSave } = await import("/src/save.js?v=0.106.0");
    selectSaveSlot(1);
    writeSave(createCharacter(createDefaultSave(), { name: "Carga", affinity: "fuego", bodyType: "male" }));
    localStorage.setItem("music-enabled", "off");
  });
  await page.reload();
  await page.locator('[data-select-slot="1"]').click();
  const dialogue = page.locator(".dialogue-overlay");
  for (let index = 0; index < 8 && await dialogue.isVisible(); index += 1) {
    await dialogue.locator("button").click();
  }
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-mission="m02"]').click();
  await expect(page.locator("#game canvas")).toHaveCount(1, { timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => window.Phaser?.VERSION)).toBe("4.2.1");
  const loaded = await page.evaluate(() => performance.getEntriesByType("resource").map(({ name }) => name));
  expect(loaded.filter((url) => url.includes("phaser-4.2.1.min.js"))).toHaveLength(1);
  expect(loaded.some((url) => url.includes("/src/battle/bundle.js"))).toBe(true);
  expect(loaded.some((url) => url.includes("/src/battle/scenes/battle-scene.js"))).toBe(true);
  expect(loaded.some((url) => url.includes("village-outskirts.webp?v=0.74.1"))).toBe(true);
  expect(loaded.some((url) => url.includes("forest-road.webp?v=0.75.1"))).toBe(true);
  for (const asset of ["village-outskirts.webp", "forest-road.webp", "village-outskirts-branches.webp", "preparation-mote.png"]) {
    expect(loaded.filter((url) => url.includes(asset))).toHaveLength(1);
  }
  expect(preloadWarnings).toEqual([]);
  expect(errors).toEqual([]);
});
