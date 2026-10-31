import { test, expect } from "@playwright/test";

const read = page => page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")));
async function dismissIntro(page) {
  const next = page.locator('[data-stage-speech]:not(.leaving) [data-stage-next]');
  for (let i = 0; i < 8 && await next.isVisible(); i++) await next.click();
}
async function enterGuild(page) {
  await page.locator('[data-go="inn"]').click(); await dismissIntro(page);
  await expect(page.locator(".guild-hall")).toBeVisible();
}
async function open(page) {
  await page.goto("/");
  await page.evaluate(async () => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.126.0");
    const save = createCharacter(createDefaultSave(), { name: "Akio", affinity: "fuego" });
    save.progression.coins = 2000; save.campaign.tutorialSeen = true; writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
  });
  await page.reload(); await enterGuild(page);
}
async function shop(page) {
  await page.getByRole("button", { name: "Comprar decoraciones en la Tienda", exact: true }).click();
  await dismissIntro(page); await expect(page.locator(".shop-panel")).toBeVisible();
  await page.locator('[data-shop-mode="buy"]').click();
  await page.locator('[data-shop-category="decorations"]').click();
}
async function backToGuild(page) {
  await page.getByRole("button", { name: "← Volver al mapa" }).click(); await enterGuild(page);
}

for (const viewport of [{ width: 1600, height: 900 }, { width: 1280, height: 720 }]) test(`Colección inicial y controles sin cambios de zoom a ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
  await page.setViewportSize(viewport); await open(page);
  await expect(page.locator("[data-room-object]")).toHaveCount(2);
  await expect(page.locator("[data-room-wall]:enabled")).toHaveCount(2);
  await expect(page.locator("[data-room-floor] option:enabled")).toHaveCount(1);
  const before = await read(page);
  expect(Object.keys(before.inventory.items).filter(id => id.startsWith("guild_decor_")).sort()).toEqual(["guild_decor_novice", "guild_decor_plant"]);
  const canvas = page.locator(".guild-room-canvas"), inspector = page.locator(".guild-room-inspector");
  const base = await canvas.boundingBox(), controls = await inspector.boundingBox();
  const stable = async () => {
    const current = await canvas.boundingBox(), box = await inspector.boundingBox();
    for (const key of ["x", "y", "width", "height"]) {
      expect(Math.abs(current[key] - base[key]), `La sala conserva ${key}`).toBeLessThan(1);
      expect(Math.abs(box[key] - controls[key]), `Los controles conservan ${key}`).toBeLessThan(1);
    }
  };
  await expect(page.locator("[data-room-move]:disabled")).toHaveCount(4);
  await expect(page.locator("[data-room-scale]")).toBeDisabled();
  await expect(page.locator("[data-room-side]")).toBeDisabled();
  await expect(page.locator("[data-room-front]")).toBeDisabled();
  await expect(page.locator("[data-room-remove]")).toBeDisabled();
  await page.locator('[data-room-object="decor-1"]').click();
  await expect(page.locator("[data-room-side]")).toBeEnabled(); await stable();
  await page.locator('[data-room-object="decor-2"]').click();
  await expect(page.locator("[data-room-side]")).toBeDisabled();
  await expect(page.locator("[data-room-scale]")).toBeEnabled(); await stable();
  for (const id of ["decor-2", "decor-1"]) {
    await page.locator(`[data-room-object="${id}"]`).click(); await page.locator("[data-room-remove]").click(); await stable();
  }
  await expect(page.locator("[data-room-object]")).toHaveCount(0);
  await expect(page.locator("[data-room-move]:disabled")).toHaveCount(4);
  await page.locator('[data-place-decor="plant"]').click(); await stable();
  await page.locator("[data-room-place]").click(); await stable();
  await expect(page.locator('[data-place-decor="plant"]')).toBeDisabled();
  expect((await read(page)).inventory).toEqual(before.inventory);
  await page.screenshot({ path: testInfo.outputPath("gremio-controles-estables.png") });
  expect(await page.evaluate(() => Boolean(window.Phaser))).toBe(false);
});

test("Compra acabados y unidades decorativas, colócalas y vende solo las retiradas", async ({ page }, testInfo) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await open(page); await shop(page);
  await expect(page.locator("[data-shop-item]")).toHaveCount(19);
  for (const id of ["guild_wall_jade", "guild_wall_sand", "guild_floor_cedar"]) await expect(page.locator(`[data-shop-item="${id}"] button`)).toBeDisabled();
  for (const id of ["guild_wall_plum", "guild_floor_stone", "guild_decor_landscape"]) await page.locator(`[data-shop-item="${id}"] button`).click();
  await page.locator('[data-shop-item="guild_decor_table"] input').fill("2");
  await page.locator('[data-shop-item="guild_decor_table"] button').click();
  let save = await read(page);
  expect(save.progression.coins).toBe(1425);
  expect(save.inventory.items.guild_decor_table).toBe(2);
  await page.screenshot({ path: testInfo.outputPath("tienda-decoraciones.png") });
  await backToGuild(page);
  await page.locator('[data-room-wall="plum"]').click();
  await page.locator("[data-room-floor]").selectOption("stone");
  for (const type of ["landscape", "table"]) { await page.locator(`[data-place-decor="${type}"]`).click(); await page.locator("[data-room-place]").click(); }
  save = await read(page);
  const table = save.guild.room.decorations.find(entry => entry.type === "table");
  await page.reload(); await enterGuild(page);
  expect((await read(page)).guild).toEqual(save.guild);
  await shop(page); await page.locator('[data-shop-mode="sell"]').click();
  await page.locator('[data-shop-category="decorations"]').click();
  await expect(page.locator('[data-shop-item="guild_wall_plum"] button')).toBeDisabled();
  await expect(page.locator('[data-shop-item="guild_decor_landscape"] button')).toBeDisabled();
  await expect(page.locator('[data-shop-item="guild_decor_table"] input')).toHaveAttribute("max", "1");
  await page.locator('[data-shop-item="guild_decor_table"] button').click();
  await expect(page.locator('[data-shop-item="guild_decor_table"] button')).toBeDisabled();
  expect((await read(page)).progression.coins).toBe(1485);
  await backToGuild(page);
  await page.locator(`[data-room-object="${table.id}"]`).click(); await page.locator("[data-room-remove]").click();
  await page.locator('[data-room-wall="jade"]').click();
  await shop(page); await page.locator('[data-shop-mode="sell"]').click(); await page.locator('[data-shop-category="decorations"]').click();
  await page.locator('[data-shop-item="guild_decor_table"] button').click();
  await page.locator('[data-shop-item="guild_wall_plum"] button').click();
  save = await read(page);
  expect(save.progression.coins).toBe(1590);
  expect(save.inventory.items.guild_decor_table).toBeUndefined();
  expect(save.inventory.items.guild_wall_plum).toBeUndefined();
  await backToGuild(page);
  await expect(page.locator('[data-room-wall="plum"]')).toBeDisabled();
  await expect(page.locator('[data-place-decor="table"]')).toBeDisabled();
  await page.getByRole("button", { name: "← Volver al mapa" }).click();
  await expect(page.locator('[data-go="shop"]')).toHaveAttribute("aria-label", /Tienda(?! de Objetos)/);
  expect(errors).toEqual([]);
});
