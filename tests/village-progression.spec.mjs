import { test, expect } from "@playwright/test";
import { GAME_DICTIONARY } from "../src/content/game-dictionary.js";

async function seed(page, { saga = false, library = false, pending = false, rank = 1, level = 1 } = {}) {
  await page.goto("/");
  await page.evaluate(async options => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js");
    const { STORY_SAGAS } = await import("/src/content/index.js");
    localStorage.clear(); sessionStorage.clear();
    const save = createCharacter(createDefaultSave(), { name: "Cronista", affinity: "agua" });
    save.campaign.tutorialSeen = true;
    save.progression.level = options.level;
    save.campaign.archiveUnlocked = options.library;
    save.campaign.doctorBookDeliveryPending = options.pending;
    if (options.saga) save.campaign.completedMissions = [...STORY_SAGAS[0].missionIds];
    if (options.rank >= 2) save.campaign.completedSecondaryMissions.push("affinity_trial_2");
    if (options.rank >= 3) save.campaign.completedSecondaryMissions.push("affinity_trial_3");
    save.campaign.npcIntroductions = ["archive:sayo", "event:nao", "dojo:mei", "headquarters:ren", "tower:kureha"];
    writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
    localStorage.setItem("music-enabled", "off");
  }, { saga, library, pending, rank, level });
  await page.reload();
  await expect(page.locator(".village-map")).toBeVisible();
}

test("el mapa explica los bloqueos y conserva el prólogo accesible", async ({ page }, testInfo) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await seed(page, { level: 60 });
  await expect(page.locator('[data-go="headquarters"]')).not.toHaveAttribute("aria-disabled");
  await expect(page.locator('[data-go="dojo"]')).not.toHaveAttribute("aria-disabled");
  for (const id of ["shop", "archive", "inn", "missions", "event", "arena", "tower"]) {
    const building = page.locator(`[data-go="${id}"]`);
    await expect(building).toHaveAttribute("aria-disabled", "true");
    await building.focus();
    await building.press("Enter");
    await expect(page.locator(".village-map")).toBeVisible();
    await expect(page.locator(`[data-map-label="${id}"] small`)).toBeVisible();
  }
  await expect(page.locator('.profile-copy .eyebrow')).toHaveText("RANGO 1 · NOVICIO");
  await page.screenshot({ path: testInfo.outputPath("mapa-bloqueos.png") });
  expect(errors).toEqual([]);
});

test("la Biblioteca permite buscar el diccionario antes de activar el bestiario", async ({ page }, testInfo) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await seed(page, { pending: true });
  await page.locator('[data-go="archive"]').click();
  await expect(page.getByRole("tab", { name: "Diccionario", exact: true })).toHaveAttribute("aria-selected", "true");
  const input = page.locator('[data-dictionary-search]');
  await input.fill("rango elemental");
  await expect(page.locator('.dictionary-entry')).toHaveCount(1);
  await expect(page.locator('.dictionary-entry h4')).toHaveText("Rango del jugador");
  await input.fill("novicio");
  await expect(page.locator('.dictionary-entry').filter({ has: page.getByRole('heading', { name: 'Novicio', exact: true }) })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("diccionario-rangos.png") });
  await input.fill("jutsu");
  await expect(page.locator('.dictionary-entry h4')).toHaveText("Técnica");
  await input.fill("zzzzzzz");
  await expect(page.locator('.dictionary-empty')).toBeVisible();
  await input.fill("");
  await expect(page.locator('.dictionary-entry')).toHaveCount(GAME_DICTIONARY.length);
  await page.getByRole("tab", { name: "Tutorial", exact: true }).click();
  await expect(page.locator('[data-replay-tutorial]')).toBeVisible();
  await expect(page.locator('[data-dictionary-search]')).toBeHidden();
  await expect(page.locator('[data-deliver-book]')).toBeVisible();
  await page.getByRole("tab", { name: /Bestiario/ }).click();
  await expect(page.getByRole('heading', { name: 'El bestiario espera su primer registro' })).toBeVisible();
  await page.getByRole("tab", { name: "Diccionario", exact: true }).click();
  expect(await page.locator('[data-dictionary-entries]').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(errors).toEqual([]);
});

for (const width of [1280, 1600]) test(`Biblioteca en pestañas con búsqueda, teclado y desplazamiento independiente a ${width}`, async ({ page }, testInfo) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width, height: width === 1280 ? 720 : 900 });
  await seed(page, { saga: true, library: true });
  await page.locator('[data-go="archive"]').click();
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  const input = page.locator('[data-dictionary-search]');
  await input.fill('rango');
  await page.getByRole('tab', { name: 'Diccionario', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Tutorial', exact: true })).toBeFocused();
  await expect(page.locator('[data-replay-tutorial]')).toBeVisible();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Crónica', exact: true })).toBeFocused();
  await expect(page.locator('.chronicle-details')).toBeVisible();
  await expect(page.locator('.chronicle-details')).toContainText('Tras las huellas del gato');
  await page.keyboard.press('Home');
  await expect(input).toHaveValue('rango');
  await input.fill('');
  const before = await page.locator('.archive-tabs').boundingBox();
  await page.locator('[data-dictionary-entries]').evaluate(el => { el.scrollTop = el.scrollHeight; });
  const after = await page.locator('.archive-tabs').boundingBox();
  expect(after).toEqual(before);
  expect(await page.locator('.location-archive .stage-options').evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  const layout = await page.locator('.archive-workspace').evaluate(el => {
    const box = el.getBoundingClientRect();
    return { horizontal: el.scrollWidth <= el.clientWidth, visible: box.bottom <= innerHeight && box.right <= innerWidth };
  });
  expect(layout).toEqual({ horizontal: true, visible: true });
  await input.fill('rango');
  await page.screenshot({ path: testInfo.outputPath(`biblioteca-pestanas-${width}.png`) });
  await page.getByRole('tab', { name: 'Bestiario', exact: true }).click();
  await expect(page.locator('.bestiary-empty')).toBeVisible();
  await page.getByRole('button', { name: '← Volver al mapa' }).click();
  await page.locator('[data-go="archive"]').click();
  await expect(page.getByRole('tab', { name: 'Bestiario', exact: true })).toHaveAttribute('aria-selected', 'true');
  expect(errors).toEqual([]);
});

test("entregar el libro abre el Bestiario sin perder las pestañas", async ({ page }) => {
  await seed(page, { pending: true });
  await page.locator('[data-go="archive"]').click();
  await page.locator('[data-deliver-book]').click();
  const overlay = page.locator('.dialogue-overlay');
  await expect(overlay).toBeVisible();
  for (let count = 0; count < 6 && await overlay.isVisible(); count++) await overlay.locator('.primary-button').click();
  await expect(page.getByRole('tab', { name: 'Bestiario', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.bestiary-entry')).toHaveCount(3);
  await expect(page.locator('[data-deliver-book]')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Diccionario', exact: true }).click();
  await expect(page.locator('[data-dictionary-search]')).toBeVisible();
});

test("la saga 2 abre tres lugares y el calendario respeta el rango de la Torre", async ({ page }) => {
  await seed(page, { saga: true, level: 15 });
  for (const id of ["inn", "missions", "event"]) await expect(page.locator(`[data-go="${id}"]`)).not.toHaveAttribute("aria-disabled");
  for (const id of ["arena", "tower"]) await expect(page.locator(`[data-go="${id}"]`)).toHaveAttribute("aria-disabled", "true");
  await page.locator('[data-go="event"]').click();
  const day = await page.locator('[data-event-day]').evaluateAll(buttons => buttons.find(button => button.dataset.eventDay.endsWith('-05')).dataset.eventDay);
  await page.locator(`[data-event-day="${day}"]`).click();
  const access = page.locator('[data-stage-action]').filter({ hasText: /Torre/ });
  await expect(access).toBeDisabled();
  await expect(access).toContainText("Requiere rango 2");
  await seed(page, { saga: true, rank: 2, level: 15 });
  await expect(page.locator('[data-go="tower"]')).not.toHaveAttribute("aria-disabled");
  await expect(page.locator('[data-go="arena"]')).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator('.profile-copy .eyebrow')).toHaveText("EXPERTO");
  await page.locator('[data-go="tower"]').click();
  await expect(page.locator('[data-location-stage="tower"]')).toBeVisible();
});
