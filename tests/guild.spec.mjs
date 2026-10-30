import { test, expect } from "@playwright/test";

async function enterGuild(page) {
  await page.locator('[data-go="inn"]').click();
  const next = page.locator('[data-location-stage="inn"] [data-stage-speech]:not(.leaving) [data-stage-next]');
  for (let i = 0; i < 5 && await next.isVisible(); i++) await next.click();
  await expect(page.locator('.guild-hall')).toBeVisible();
}

const read = page => page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")));
async function openGuild(page) {
  await page.goto("/");
  await page.evaluate(async () => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.119.0");
    const save = createCharacter(createDefaultSave(), { name: "Akio", affinity: "fuego", bodyType: "male" });
    save.campaign.tutorialSeen = true;
    writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
  });
  await page.reload();
  await enterGuild(page);
  await expect(page.locator(".guild-hall")).toBeVisible();
  expect(await page.evaluate(() => Boolean(window.Phaser))).toBe(false);
  await expect(page.getByRole("button", { name: "Hablar con Yuna Ametsuki" })).toBeVisible();
  await page.getByRole("button", { name: "Hablar con Yuna Ametsuki" }).click();
  await expect(page.locator(".location-inn [data-stage-ambient]")).toBeVisible();
  await expect(page.locator(".location-inn [data-ambient-speaker]")).toContainText("Yuna Ametsuki");
  await expect(page.locator(".location-inn [data-ambient-text]")).not.toBeEmpty();
  const tip = await page.locator(".location-inn [data-stage-ambient]").boundingBox();
  const editor = await page.locator(".guild-hall").boundingBox();
  expect(tip.height).toBeLessThan(220);
  expect(tip.x + tip.width).toBeLessThan(editor.x);
}

for (const viewport of [{ width: 1600, height: 900 }, { width: 1280, height: 720 }]) test(`Mi espacio: decoración, teclado, arrastre y persistencia a ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
  await page.setViewportSize(viewport);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await openGuild(page);
  await expect(page.getByRole("tab", { name: "Mi espacio" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("[data-room-object]")).toHaveCount(4);
  await page.getByRole("button", { name: "Pared Ciruela", exact: true }).click();
  await page.locator("[data-room-floor]").selectOption("stone");
  await page.locator('[data-place-decor="plant"]').click();
  await page.locator("[data-room-place]").click();
  let saved = await read(page);
  const plant = saved.guild.room.decorations.find(entry => entry.type === "plant"), selector = `[data-room-object="${plant.id}"]`;
  await page.locator(selector).focus();
  await page.locator(selector).press("ArrowRight");
  expect((await read(page)).guild.room.decorations.find(entry => entry.id === plant.id).x).toBe(plant.x + 20);
  await page.locator("[data-room-scale]").selectOption("0.75");
  const bounds = await page.locator(selector).boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 65, bounds.y + bounds.height / 2 + 15, { steps: 8 });
  await page.mouse.up();
  saved = await read(page);
  expect(saved.guild.room.decorations.find(entry => entry.id === plant.id).x).toBeGreaterThan(plant.x + 20);
  expect(saved.guild.room.wall).toBe("plum");
  expect(saved.guild.room.floor).toBe("stone");
  expect(saved.progression.coins).toBe(0);
  await page.locator('[data-place-decor="novice"]').click();
  const canvasBounds = await page.locator(".guild-room-canvas").boundingBox();
  await page.locator(".guild-room-canvas").click({ position: { x: canvasBounds.width * .72, y: canvasBounds.height * .38 } });
  const badge = (await read(page)).guild.room.decorations.find(entry => entry.type === "novice");
  expect(badge.y).toBeLessThan(385);
  await page.locator(`[data-room-object="${badge.id}"]`).focus();
  await page.locator(`[data-room-object="${badge.id}"]`).press("Delete");
  saved = await read(page);
  await expect(page.locator('[data-place-decor="guardian"]')).toBeDisabled();
  await expect(page.locator('[data-place-decor="medal"]')).toBeDisabled();
  const layout = await page.locator(".guild-hall").evaluate(panel => {
    const bounds = panel.getBoundingClientRect();
    const room = panel.querySelector(".guild-room-canvas").getBoundingClientRect();
    const person = document.querySelector('[data-stage-npc="yuna"]').getBoundingClientRect();
    const inspector = panel.querySelector(".guild-room-inspector").getBoundingClientRect();
    const surround = panel.querySelector(".guild-room-surround").getBoundingClientRect();
    return { hostVisible: person.right < bounds.left && bounds.width < innerWidth * .75, fits: bounds.bottom <= innerHeight && bounds.left >= 0 && bounds.right <= innerWidth, roomFits: room.top >= surround.top && room.bottom <= surround.bottom + 1, ratio: room.width / room.height, inspectorVisible: inspector.bottom <= bounds.bottom, overflow: panel.scrollWidth > panel.clientWidth };
  });
  expect(layout).toMatchObject({ hostVisible: true, fits: true, roomFits: true, inspectorVisible: true, overflow: false });
  expect(layout.ratio).toBeCloseTo(25 / 16, 2);
  await page.screenshot({ path: testInfo.outputPath("mi-espacio.png") });
  await page.getByRole("button", { name: "← Volver al mapa" }).click();
  await enterGuild(page);
  expect((await read(page)).guild).toEqual(saved.guild);
  await page.reload();
  await enterGuild(page);
  expect((await read(page)).guild).toEqual(saved.guild);
  await page.locator(selector).focus();
  await page.locator(selector).press("Delete");
  await expect(page.locator(selector)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Clanes permite guardar un diseño local y anuncia las funciones online pendientes", async ({ page }, testInfo) => {
  await openGuild(page);
  await page.getByRole("tab", { name: "Mi espacio" }).press("ArrowRight");
  await expect(page.getByRole("tab", { name: /Clanes/ })).toHaveAttribute("aria-selected", "true");
  const form = page.locator("[data-clan-form]");
  await form.locator('[name="name"]').fill("Cuervos del alba");
  await form.locator('[name="tag"]').fill("alba");
  await form.locator('[name="motto"]').fill("Un mismo camino.");
  await form.locator('[data-clan-emblem="moon"]').click();
  await form.locator('[name="color"]').selectOption("blue");
  await expect(page.locator("[data-clan-preview]")).toContainText("Cuervos del alba");
  await form.getByRole("button", { name: "Guardar borrador" }).click();
  expect((await read(page)).guild.clanDraft).toEqual({ name: "Cuervos del alba", tag: "ALBA", motto: "Un mismo camino.", emblem: "moon", color: "blue" });
  await expect(page.getByRole("button", { name: "Crear clan online" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Buscar y unirse a un clan" })).toBeDisabled();
  await expect(page.locator(".guild-online-panel table")).toHaveCount(2);
  await page.screenshot({ path: testInfo.outputPath("clanes-local.png") });
  await page.reload();
  await enterGuild(page);
  await page.getByRole("tab", { name: /Clanes/ }).click();
  await expect(page.locator('[name="name"]')).toHaveValue("Cuervos del alba");
  await expect(page.locator('[data-clan-emblem="moon"]')).toHaveAttribute("aria-pressed", "true");
  await page.locator('[name="name"]').fill("<img src=x>");
  await expect(page.locator("[data-clan-preview] img")).toHaveCount(0);
  await expect(page.locator("[data-clan-preview]")).toContainText("<img src=x>");
});
