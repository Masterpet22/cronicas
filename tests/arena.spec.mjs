import { test, expect } from "@playwright/test";
import { ensurePhaser } from "./helpers/phaser-loader.mjs";

const stored = page => page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"));
async function enterArena(page) {
  await page.locator('[data-go="arena"]').click();
  const next = page.locator('.location-arena [data-stage-speech]:not(.leaving) [data-stage-next]');
  for (let i = 0; i < 5 && await next.isVisible(); i++) await next.click();
  await expect(page.locator(".arena-panel")).toBeVisible();
}
async function prepareArena(page) {
  await page.goto("/");
  await page.evaluate(async () => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.119.0");
    const save = createCharacter(createDefaultSave(), { name: "Akio", affinity: "fuego", bodyType: "male", skinTone: "moreno" });
    save.progression.coins = 75;
    save.inventory.items.health_potion = 2; save.inventory.items.retry_scroll = 1;
    save.guild.room.wall = "plum"; save.campaign.tutorialSeen = true;
    writeSave(save);
    localStorage.setItem("music-enabled", "off");
    localStorage.setItem("seal-input-mode", "automatic");
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
  });
  await page.reload(); await enterArena(page);
}
async function instrumentGame(page) {
  await ensurePhaser(page);
  await page.evaluate(() => {
    const Original = Phaser.Game;
    Phaser.Game = class extends Original { constructor(config) { super(config); window.__arenaGame = this; } };
  });
}
async function waitForExhibition(page) {
  await page.waitForFunction(() => window.__arenaGame?.scene.isActive("battle") && window.__arenaGame.scene.getScene("battle").mission?.exhibition && window.__arenaGame.scene.getScene("battle").accessibleHud, null, { timeout: 40000 });
}

for (const viewport of [{ width: 1600, height: 900 }, { width: 1280, height: 720 }]) test(`Arena: preparación local, Goro y opciones multijugador a ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
  await page.setViewportSize(viewport); await prepareArena(page);
  expect(await page.evaluate(() => Boolean(window.Phaser))).toBe(false);
  await expect(page.getByRole("button", { name: "Hablar con Goro Tetsugan" })).toBeVisible();
  const baseline = await stored(page);
  await page.locator('[data-arena-rival="water"]').click();
  await page.locator('[data-arena-difficulty="challenge"]').click();
  await expect(page.locator('[data-arena-rival="water"]')).toHaveAttribute("aria-checked", "true");
  const layout = await page.locator(".arena-panel").evaluate(panel => {
    const bounds = panel.getBoundingClientRect(), person = document.querySelector('[data-stage-npc="goro"]').getBoundingClientRect();
    return { separate: person.right < bounds.left, fits: bounds.bottom <= innerHeight && bounds.right <= innerWidth, overflow: panel.scrollWidth - panel.clientWidth };
  });
  expect(layout).toEqual({ separate: true, fits: true, overflow: 0 });
  await expect(page.locator("[data-start-exhibition]")).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("arena-local.png") });
  await page.getByRole("tab", { name: /Multijugador/ }).click();
  await expect(page.getByRole("button", { name: "Buscar duelo amistoso" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Buscar combate clasificatorio" })).toBeDisabled();
  await expect(page.locator(".arena-rankings")).toContainText("Disponible con el modo online");
  await page.screenshot({ path: testInfo.outputPath("arena-online-pendiente.png") });
  expect(await stored(page)).toBe(baseline);
});

test("una exhibición permite victoria, revancha y derrota sin tocar el guardado; reutiliza el motor para la campaña", async ({ page }, testInfo) => {
  test.setTimeout(120000);
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await prepareArena(page); const baseline = await stored(page);
  await page.locator('[data-arena-difficulty="casual"]').click();
  await instrumentGame(page);
  await page.locator("[data-start-exhibition]").click(); await waitForExhibition(page);
  await expect(page.locator("#game > canvas")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Abrir objetos de misión" })).toBeDisabled();
  const state = await page.evaluate(() => {
    const scene = window.__arenaGame.scene.getScene("battle");
    scene.stopTurnTimeline();
    window.__arenaCanvas = document.querySelector("#game > canvas");
    return { difficulty: scene.mission.arenaSettings.difficulty, full: scene.player.hp === scene.player.maxHp && scene.player.chakra === scene.player.maxChakra, title: scene.encounters[0].name, background: scene.textures.exists("exhibition-arena") };
  });
  expect(state).toMatchObject({ difficulty: "casual", full: true, title: "DUELISTA DE FUEGO", background: true });
  await page.screenshot({ path: testInfo.outputPath("exhibicion-combate.png") });
  expect(await stored(page)).toBe(baseline);
  const round = await page.evaluate(async () => {
    const scene = window.__arenaGame.scene.getScene("battle");
    scene.busy = false; scene.turnReady = true;
    await scene.useJutsu(scene.actions[0]); scene.stopTurnTimeline();
    return scene.round;
  });
  expect(round).toBeGreaterThan(1);
  expect(await stored(page)).toBe(baseline);
  await page.evaluate(async () => { const scene = window.__arenaGame.scene.getScene("battle"); scene.enemy.hp = 0; await scene.resolveEnemyOutcome(); });
  await expect(page.getByRole("heading", { name: "Victoria", exact: true })).toBeVisible();
  expect(await stored(page)).toBe(baseline);
  await page.screenshot({ path: testInfo.outputPath("exhibicion-victoria.png") });
  await page.getByRole("button", { name: "Revancha", exact: true }).click(); await waitForExhibition(page);
  await page.waitForFunction(() => !window.__arenaGame.scene.getScene("battle").finished);
  await page.evaluate(async () => { const scene = window.__arenaGame.scene.getScene("battle"); scene.stopTurnTimeline(); scene.player.hp = 0; await scene.finishBattle(false); });
  await expect(page.getByRole("heading", { name: "Derrota", exact: true })).toBeVisible();
  await expect(page.locator("[data-retry-choice]")).toHaveCount(0);
  expect(await stored(page)).toBe(baseline);
  await page.getByRole("button", { name: "Volver a la Arena", exact: true }).click();
  await expect(page.locator("#meta")).toBeVisible(); await expect(page.locator(".arena-panel")).toBeVisible();
  expect(await stored(page)).toBe(baseline);
  await page.locator("[data-start-exhibition]").click(); await waitForExhibition(page);
  expect(await page.evaluate(() => window.__arenaCanvas === document.querySelector("#game > canvas"))).toBe(true);
  await page.getByRole("button", { name: "Pausar combate (Escape)" }).click();
  await expect(page.getByRole("heading", { name: "EXHIBICIÓN EN PAUSA" })).toBeVisible();
  await page.getByRole("button", { name: "VOLVER A LA ARENA", exact: true }).click();
  await expect(page.locator(".arena-panel")).toBeVisible(); expect(await stored(page)).toBe(baseline);
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-mission="m02"]').click();
  await page.waitForFunction(() => window.__arenaGame.scene.isActive("battle") && window.__arenaGame.scene.getScene("battle").mission?.id === "m02", null, { timeout: 40000 });
  expect(await page.evaluate(() => window.__arenaGame.scene.getScene("battle").mission.exhibition)).toBeUndefined();
  expect(await page.evaluate(() => window.__arenaGame.scene.getScene("battle").encounters[0].name)).toBe("RASTREADOR BANDIDO");
  expect(await page.evaluate(() => window.__arenaCanvas === document.querySelector("#game > canvas"))).toBe(true);
  expect(errors).toEqual([]);
});
