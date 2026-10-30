import { test, expect } from "@playwright/test";

const read = page => page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")));
async function enterPlaza(page) {
  await page.locator('[data-go="event"]').click();
  const next = page.locator('.location-event [data-stage-speech]:not(.leaving) [data-stage-next]');
  for (let i = 0; i < 5 && await next.isVisible(); i++) await next.click();
  await expect(page.locator(".events-plaza")).toBeVisible();
}
async function seed(page, time, bodyType = "male") {
  await page.clock.install({ time: new Date(time) });
  await page.goto("/");
  await page.evaluate(async bodyType => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.123.0");
    const save = createCharacter(createDefaultSave(), { name: "Akio", affinity: "fuego", bodyType });
    save.campaign.tutorialSeen = true; save.progression.coins = 75; save.guild.room.wall = "plum"; save.inventory.items.health_potion = 2;
    writeSave(save); sessionStorage.setItem("cronicas-save-slot-selected", "1");
  }, bodyType);
  await page.reload(); await enterPlaza(page);
}

for (const viewport of [{ width: 1600, height: 900 }, { width: 1280, height: 720 }]) test(`calendario mensual completo, fechas marcadas y contador a ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
  await page.setViewportSize(viewport); await seed(page, "2026-11-05T16:00:00Z");
  const baseline = await read(page);
  await expect(page.getByRole("button", { name: "Hablar con Nao Matsuri" })).toBeVisible();
  await expect(page.locator(".events-calendar")).toBeVisible();
  await expect(page.locator("[data-event-day]")).toHaveCount(30);
  await expect(page.locator('[data-event-day="2026-11-06"]')).toContainText("Festival");
  await expect(page.locator('[data-event-day="2026-11-15"]')).toContainText("Visita");
  await expect(page.locator('[data-event-day="2026-11-24"]')).toContainText("Temporal");
  await expect(page.locator('[data-event-day="2026-11-05"]')).toHaveAttribute("aria-current", "date");
  await expect(page.locator("[data-event-countdown]>strong")).toHaveText(/1\s*día/);
  const layout = await page.locator(".events-plaza").evaluate(panel => {
    const bounds = panel.getBoundingClientRect(), person = document.querySelector('[data-stage-npc="nao"]').getBoundingClientRect();
    const calendar = panel.querySelector(".events-calendar").getBoundingClientRect();
    return { separate: person.right < bounds.left, fits: bounds.bottom <= innerHeight && bounds.right <= innerWidth && calendar.bottom <= bounds.bottom, overflow: panel.scrollWidth - panel.clientWidth };
  });
  expect(layout).toEqual({ separate: true, fits: true, overflow: 0 });
  await page.screenshot({ path: testInfo.outputPath("calendario-completo.png") });
  await page.getByRole("button", { name: "Mes siguiente", exact: true }).click();
  await expect(page.locator(".events-month-nav h3")).toContainText("diciembre de 2026");
  await expect(page.locator("[data-event-day]")).toHaveCount(31);
  await page.getByRole("button", { name: "Mes siguiente", exact: true }).click();
  await expect(page.locator(".events-month-nav h3")).toContainText("enero de 2027");
  await page.getByRole("button", { name: "Hoy", exact: true }).click();
  await page.locator('[data-event-day="2026-11-06"]').click();
  await expect(page.locator(".event-detail h3")).toHaveText("Festival de los faroles");
  await expect(page.locator("[data-open-live]")).toHaveCount(0);
  expect(await read(page)).toEqual(baseline);
  expect(await page.evaluate(() => Boolean(window.Phaser))).toBe(false);
});

test("el festival reemplaza automáticamente al calendario y guarda los faroles hasta que termine", async ({ page }, testInfo) => {
  await seed(page, "2026-11-05T16:00:00Z");
  const before = await read(page);
  await page.clock.setSystemTime(new Date("2026-11-06T04:00:00Z"));
  await page.clock.runFor(31000);
  await expect(page.locator('[data-live-event="lantern-festival"]')).toBeVisible();
  await expect(page.locator(".events-calendar")).toHaveCount(0);
  await page.locator('[data-light-lantern="0"]').click(); await page.locator('[data-light-lantern="2"]').click();
  await page.screenshot({ path: testInfo.outputPath("festival-activo.png") });
  await page.reload(); await enterPlaza(page);
  await expect(page.locator('[data-light-lantern="0"]')).toBeDisabled();
  await expect(page.locator('[data-light-lantern="2"]')).toBeDisabled();
  await page.locator('[data-light-lantern="1"]').click();
  await expect(page.locator(".event-completed")).toBeVisible();
  const after = await read(page);
  expect(after.events.participation["lantern-festival@2026-11-06"].steps).toEqual([0, 1, 2]);
  expect({ ...after, events: before.events }).toEqual(before);
  await page.getByRole("button", { name: "Consultar calendario" }).click();
  await expect(page.locator(".events-calendar")).toBeVisible();
  await page.getByRole("button", { name: "Volver al evento en curso" }).click();
  await expect(page.locator('[data-live-event="lantern-festival"]')).toBeVisible();
  await page.clock.setSystemTime(new Date("2026-11-09T04:00:00Z")); await page.clock.runFor(31000);
  await expect(page.locator(".events-calendar")).toBeVisible();
  await expect(page.locator("[data-live-event]")).toHaveCount(0);
  await expect(page.locator("[data-event-countdown]>strong")).toHaveText(/6\s*días/);
});

test("la visita muestra al personaje y conserva al maestro y la campaña", async ({ page }, testInfo) => {
  await seed(page, "2026-11-15T16:00:00Z", "female");
  const before = await read(page);
  await expect(page.locator('[data-live-event="mei-visit"]')).toBeVisible();
  await expect(page.locator(".event-guest img")).toHaveAttribute("alt", "Mei Hayate");
  await page.getByRole("button", { name: "Conversar con Mei Hayate" }).click();
  const dialogue = page.locator(".dialogue-overlay");
  for (let i = 0; i < 5 && await dialogue.isVisible(); i++) await dialogue.locator("button").click();
  await expect(page.locator(".event-completed")).toBeVisible();
  const after = await read(page);
  expect(after.events.participation["mei-visit@2026-11-15"].steps).toEqual([0]);
  expect({ ...after, events: before.events }).toEqual(before);
  expect(after.character.masterId).toBe("daichi");
  await page.screenshot({ path: testInfo.outputPath("visita-mei.png") });
});

test("el evento temporal permite corregir respuestas y cada edición comienza de nuevo", async ({ page }, testInfo) => {
  await seed(page, "2026-11-24T16:00:00Z");
  await expect(page.locator('[data-live-event="elemental-trial"]')).toBeVisible();
  await page.locator('[data-event-answer="fuego"]').click();
  await expect(page.locator(".events-feedback")).toContainText("intentarlo");
  for (const answer of ["agua", "tierra", "viento"]) await page.locator(`[data-event-answer="${answer}"]`).click();
  await expect(page.locator(".event-quiz-complete")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("desafio-temporal.png") });
  await page.clock.setSystemTime(new Date("2026-12-24T16:00:00Z")); await page.clock.runFor(31000);
  await expect(page.locator(".event-quiz>small")).toHaveText("PREGUNTA 1 DE 3");
  expect((await read(page)).events.participation["elemental-trial@2026-11-24"].steps).toEqual([0, 1, 2]);
  expect((await read(page)).events.participation["elemental-trial@2026-12-24"]).toBeUndefined();
});
