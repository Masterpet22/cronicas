import { expect, test } from "@playwright/test";

const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")));

async function openBoard(page, checkpoint = "saga-start", board = "headquarters") {
  await page.goto("/");
  await expect(page.locator(".save-selector")).toBeVisible();
  await page.evaluate(async checkpoint => {
    const s = await import("/src/save.js?v=0.131.0");
    const save = s.applyDebugCheckpoint(s.createCharacter(s.createDefaultSave(), { name: "Cancelar", affinity: "fuego" }), checkpoint);
    save.inventory.items.contract_relic = 1;
    s.writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
    localStorage.setItem("music-enabled", "off");
  }, checkpoint);
  await page.reload();
  await page.locator(".debug-tools-trigger").click();
  await page.locator(`[data-debug-view="${board}"]`).click();
  if (board === "headquarters") await page.locator('[data-saga="saga-1"]').click();
}

async function lastLine(page) {
  const next = page.locator(".dialogue-overlay .primary-button");
  for (let i = 0; i < 20 && await next.textContent() === "SIGUIENTE"; i++) await next.click();
  await expect(next).not.toHaveText("SIGUIENTE");
  return next;
}

for (const config of [
  { mission: "m01", checkpoint: "saga-start" },
  { mission: "s01", checkpoint: "kagemori-ready" },
  { mission: "s02", checkpoint: "doctor-ready" },
  { mission: "contract_relic", checkpoint: "saga-start", board: "missions" }
]) {
  test(`cancelar ${config.mission} al entrar y antes de confirmar conserva la partida`, async ({ page }, testInfo) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await openBoard(page, config.checkpoint, config.board);
    const trigger = page.locator(`[data-${config.board ? "secondary-mission" : "mission"}="${config.mission}"]`);
    const before = await stored(page);
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "Preparación de misión" })).toBeVisible();
    await page.getByRole("button", { name: "CANCELAR MISIÓN", exact: true }).click();
    await expect(page.locator(".dialogue-overlay")).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await stored(page)).toEqual(before);
    await trigger.click();
    await lastLine(page);
    if (config.mission === "m01") await page.screenshot({ path: testInfo.outputPath("cancelar-antes-de-comenzar.png") });
    await page.keyboard.press("Escape");
    await expect(page.locator(".dialogue-overlay")).toHaveCount(0);
    await expect(page.locator(".story-dialogue-active")).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.locator("#game")).toBeHidden();
    expect(await stored(page)).toEqual(before);
    await trigger.click();
    await expect(page.locator(".dialogue-overlay small")).toContainText("1/");
    expect(errors).toEqual([]);
  });
}

test("la elección de entrada también permite cancelar sin guardar una decisión", async ({ page }) => {
  await openBoard(page, "mission-3-ready");
  const trigger = page.locator('[data-mission="m03"]');
  const before = await stored(page);
  for (const method of ["button", "escape"]) {
    await trigger.click();
    await (await lastLine(page)).click();
    const choice = page.locator(".mission-decision-overlay");
    await expect(choice).toBeVisible();
    if (method === "button") await choice.getByRole("button", { name: "CANCELAR MISIÓN" }).click();
    else await page.keyboard.press("Escape");
    await expect(choice).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await stored(page)).toEqual(before);
    await expect(page.locator("#game")).toBeHidden();
  }
});

test("después de cancelar se puede volver a confirmar el inicio", async ({ page }) => {
  await openBoard(page);
  const trigger = page.locator('[data-mission="m01"]');
  await trigger.click();
  await page.keyboard.press("Escape");
  await trigger.click();
  const confirm = await lastLine(page);
  await expect(confirm).toHaveText("COMENZAR MISIÓN");
  await confirm.click();
  await expect(page.locator("#game")).toBeVisible();
  await expect(page.locator(".dialogue-overlay")).toHaveCount(0);
  expect((await stored(page)).campaign.missionProgress.m01).toMatchObject({ status: "in-progress", attempts: 1 });
});
