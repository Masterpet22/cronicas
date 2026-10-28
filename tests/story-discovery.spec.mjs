import { expect, test } from "@playwright/test";

async function seed(page, checkpoint = "saga-start") {
  await page.goto("/");
  await page.evaluate(async (checkpoint) => {
    const s = await import("/src/save.js?v=0.106.0");
    s.writeSave(s.applyDebugCheckpoint(s.createCharacter(s.createDefaultSave(), { name: "Historia", affinity: "fuego" }), checkpoint));
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
    localStorage.setItem("music-enabled", "off");
  }, checkpoint);
  await page.reload();
}

async function openHeadquarters(page) {
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-view="headquarters"]').click();
  await page.locator('[data-saga="saga-1"]').click();
}

async function dialogue(page) {
  const overlay = page.locator(".dialogue-overlay");
  await expect(overlay).toBeVisible();
  for (let i = 0; i < 12 && await overlay.isVisible(); i++) await overlay.locator("button").click();
}

test("el Cuartel muestra solo la primera misión al comenzar", async ({ page }, testInfo) => {
  await seed(page);
  await openHeadquarters(page);
  await expect(page.locator(".mission-card")).toHaveCount(1);
  await expect(page.locator(".mission-board")).toContainText("Tras las huellas del gato");
  await expect(page.locator(".mission-board")).not.toContainText(/Kagemori|Desfiladero|Haru|Raizen|BLOQUEADA/);
  await expect(page.locator('[data-mission="s01"]')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("cuartel-actualizado.png") });
});

test("Kagemori se inicia y completa como principal desde el Cuartel", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seed(page, "kagemori-ready");
  await openHeadquarters(page);
  await expect(page.locator(".mission-card")).toHaveCount(2);
  await expect(page.locator('[data-mission="m02"]')).toHaveCount(0);
  await page.locator('[data-mission="s01"]').click();
  await dialogue(page);
  await expect(page.locator(".kagemori-investigation")).toBeAttached({ timeout: 30000 });
  expect(errors).toEqual([]);
  const next = page.locator("[data-stage-speech]:not(.leaving) [data-stage-next]");
  for (let i = 0; i < 10 && await next.isVisible(); i++) await next.click();
  await expect(page.locator(".village-topbar")).toHaveCount(0);
  await expect(page.locator(".village-return")).toHaveCount(0);
  await page.getByRole("button", { name: "Pausar misión" }).click();
  const pause = page.getByRole("dialog", { name: "Misión en pausa" });
  await expect(pause).toBeVisible();
  await pause.locator("summary").click();
  await pause.locator('[data-mission-setting="music-enabled"]').check();
  await expect(page.locator("#music-enabled")).toBeChecked();
  await pause.locator('[data-mission-setting="music-enabled"]').uncheck();
  await page.keyboard.press("Escape");
  await expect(pause).toBeHidden();
  await expect(page.getByRole("button", { name: "Pausar misión" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(pause).toBeVisible();
  await pause.getByRole("button", { name: "REANUDAR", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("kagemori-actualizada.png") });
  for (const [index, id] of ["cart", "hall", "well"].entries()) {
    await page.locator(`[data-clue="${id}"]`).click();
    await expect(page.locator("[data-clue-count]")).toHaveText(`${index + 1}/3 pistas`);
  }
  await page.getByRole("button", { name: "Pausar misión" }).click();
  await expect(pause).toBeVisible();
  await page.waitForTimeout(600);
  await expect(page.locator(".dialogue-overlay")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("kagemori-pausa.png") });
  await pause.getByRole("button", { name: "REANUDAR", exact: true }).click();
  await dialogue(page);
  await expect.poll(async () => {
    const completed = await page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")).campaign.completedMissions.includes("s01"));
    if (completed) return true;
    const box = await page.locator("#game canvas").boundingBox();
    if (box) await page.mouse.click(box.x + box.width * 608 / 960, box.y + box.height * 478 / 540);
    return false;
  }, { timeout: 20000, intervals: [500] }).toBe(true);
  await page.reload();
  await openHeadquarters(page);
  await expect(page.locator(".mission-card")).toHaveCount(3);
  await expect(page.locator('[data-mission="s01"]')).toHaveText("COMPLETADA");
  await expect(page.locator('[data-mission="m02"]')).toBeEnabled();
  await expect(page.locator('[data-mission="s02"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
