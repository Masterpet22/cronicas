import { test, expect } from "@playwright/test";
import { projectRoomDecoration } from "../src/guild-room.js";

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
    const { GUILD_ITEMS } = await import("/src/guild-catalog.js?v=0.126.0");
    for (const item of GUILD_ITEMS) if (!["guardian", "medal"].includes(item.value)) save.inventory.items[item.id] = item.stackLimit;
    save.guild.room = { wall: "jade", floor: "cedar", nextId: 5, decorations: [
      { id: "decor-1", type: "landscape", x: 220, y: 210, scale: 1 },
      { id: "decor-2", type: "lantern", x: 845, y: 155, scale: 1 },
      { id: "decor-3", type: "table", x: 520, y: 510, scale: 1 },
      { id: "decor-4", type: "cushion", x: 475, y: 594, scale: 1 }
    ] };
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
  const afterArrow = (await read(page)).guild.room.decorations.find(entry => entry.id === plant.id);
  expect(projectRoomDecoration(afterArrow).x - projectRoomDecoration(plant).x).toBeCloseTo(20, 0);
  expect(Math.abs(projectRoomDecoration(afterArrow).y - projectRoomDecoration(plant).y)).toBeLessThan(1);
  await page.locator("[data-room-scale]").selectOption("0.75");
  const bounds = await page.locator(selector).boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 65, bounds.y + bounds.height / 2 + 15, { steps: 8 });
  await page.mouse.up();
  saved = await read(page);
  expect(projectRoomDecoration(saved.guild.room.decorations.find(entry => entry.id === plant.id)).x).toBeGreaterThan(projectRoomDecoration(afterArrow).x);
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
  expect(layout.ratio).toBeCloseTo(10 / 7, 2);
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

for (const viewport of [{ width: 1600, height: 900 }, { width: 1280, height: 720 }]) test(`La planta aprovecha las cuatro esquinas del suelo a ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
  await page.setViewportSize(viewport);
  await openGuild(page);
  const original = await read(page), canvas = page.locator(".guild-room-canvas");
  await page.locator('[data-place-decor="plant"]').click();
  const initialBox = await canvas.boundingBox();
  await canvas.click({ position: { x: initialBox.width * .5, y: initialBox.height * 280 / 700 } });
  let saved = await read(page);
  const id = saved.guild.room.decorations.find(entry => entry.type === "plant").id;
  const object = page.locator(`[data-room-object="${id}"]`);
  expect(projectRoomDecoration(saved.guild.room.decorations.find(entry => entry.id === id)).y).toBeLessThan(290);
  for (const [name, target] of [["izquierda", { x: 60, y: 455 }], ["derecha", { x: 940, y: 455 }], ["fondo", { x: 500, y: 265 }], ["frente", { x: 500, y: 645 }]]) {
    const entry = saved.guild.room.decorations.find(entry => entry.id === id), point = projectRoomDecoration(entry);
    const box = await object.boundingBox(), room = await canvas.boundingBox();
    const grab = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(grab.x, grab.y); await page.mouse.down();
    await page.mouse.move(grab.x + (target.x - point.x) * room.width / 1000, grab.y + (target.y - point.y) * room.height / 700, { steps: 8 });
    await page.mouse.up();
    saved = await read(page);
    const placed = projectRoomDecoration(saved.guild.room.decorations.find(entry => entry.id === id));
    expect(Math.hypot(placed.x - target.x, placed.y - target.y), `La maceta alcanza la esquina ${name}`).toBeLessThan(35);
    await page.screenshot({ path: testInfo.outputPath(`planta-${name}.png`) });
  }
  expect(saved.progression).toEqual(original.progression);
  expect(saved.inventory).toEqual(original.inventory);
  await page.reload(); await enterGuild(page);
  expect((await read(page)).guild).toEqual(saved.guild);
  await expect(object).toBeVisible();
});

test("La sala respeta las dos paredes, el suelo y el orden manual", async ({ page }, testInfo) => {
  await openGuild(page);
  const original = await read(page);
  const canvas = page.locator(".guild-room-canvas");
  const clickPoint = async (x, y) => {
    const box = await canvas.boundingBox();
    await canvas.click({ position: { x: box.width * x / 1000, y: box.height * y / 700 } });
  };
  await expect(canvas.locator("svg>[data-room-surface]")).toHaveCount(3);
  await page.locator('[data-place-decor="plant"]').click();
  await clickPoint(500, 70);
  expect((await read(page)).guild).toEqual(original.guild);
  await expect(page.locator(".guild-message")).toContainText("suelo");
  await page.locator('[data-place-decor="scroll"]').click();
  await clickPoint(500, 570);
  expect((await read(page)).guild).toEqual(original.guild);
  await expect(page.locator(".guild-message")).toContainText("izquierda o derecha");
  await clickPoint(350, 195);
  let saved = await read(page);
  const scroll = saved.guild.room.decorations.find(entry => entry.type === "scroll");
  const object = page.locator(`[data-room-object="${scroll.id}"]`);
  await expect(object).toHaveAttribute("data-room-surface", "left");
  await page.locator("[data-room-side]").click();
  await expect(object).toHaveAttribute("data-room-surface", "right");
  await page.locator("[data-room-scale]").selectOption("1.25");
  const wallBox = await object.boundingBox();
  await page.mouse.move(wallBox.x + wallBox.width / 2, wallBox.y + wallBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(wallBox.x + wallBox.width / 2 - 30, wallBox.y + wallBox.height / 2 + 30, { steps: 6 });
  await page.mouse.up();
  saved = await read(page);
  const moved = saved.guild.room.decorations.find(entry => entry.id === scroll.id);
  expect(projectRoomDecoration(moved).x).toBeLessThan(projectRoomDecoration({ ...scroll, x: 1000 - scroll.x }).x);
  const table = saved.guild.room.decorations.find(entry => entry.type === "table");
  await page.locator(`[data-room-object="${table.id}"]`).click();
  await page.locator("[data-room-front]").click();
  const layered = await read(page);
  expect(layered.guild.room.decorations.find(entry => entry.id === table.id).layer).toBeGreaterThan(0);
  expect(layered.inventory).toEqual(original.inventory);
  expect(layered.progression).toEqual(original.progression);
  await page.screenshot({ path: testInfo.outputPath("sala-isometrica.png") });
  await page.reload(); await enterGuild(page);
  expect((await read(page)).guild).toEqual(layered.guild);
  await expect(object).toHaveAttribute("data-room-surface", "right");
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
