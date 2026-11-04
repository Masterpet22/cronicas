import { test, expect } from "@playwright/test";
import { ensurePhaser } from "./helpers/phaser-loader.mjs";

async function seed(page, current = 0, prepared = false) {
  await page.goto("/");
  await page.evaluate(async ({ current, prepared }) => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js");
    const { SAGA_TUTORIAL } = await import("/src/content/sagas/futuro-prometedor/tutorial.js");
    const { normalizeSagaTutorial } = await import("/src/tutorial-system.js");
    localStorage.clear(); sessionStorage.clear();
    const save = createCharacter(createDefaultSave(), { name: "Novicio", affinity: "fuego" });
    save.campaign.tutorialSeen = true;
    save.campaign.completedMissions = SAGA_TUTORIAL.slice(0, current).map(c => c.missionId);
    save.campaign.sagaTutorial = normalizeSagaTutorial(null, save.campaign);
    save.campaign.npcIntroductions = ["headquarters:ren", "dojo:mei", "shop:hana", "archive:sayo", "kagemori:iori", "kagemori:nami"];
    save.progression.level = current === 1 ? 2 : Math.max(1, current + 1);
    save.progression.attributePoints = current ? 2 : 0;
    save.progression.coins = current ? 100 : 0;
    if (current >= 2) {
      save.progression.resonance.investments = { physical_0: 1, physical_1: 1 };
      save.taijutsuLoadout = ["physical_1", null];
      save.inventory.items.health_potion = 1;
    }
    if (current >= 4) save.campaign.archiveUnlocked = true;
    if (current >= 5) save.inventory.items.purifying_tonic = 1;
    if (prepared) save.campaign.sagaTutorial.completed.push(...SAGA_TUTORIAL[current].before.map(s => s.id));
    writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
    localStorage.setItem("music-enabled", "off"); localStorage.setItem("seal-input-mode", "automatic");
  }, { current, prepared });
  await page.reload(); await expect(page.locator(".village-map")).toBeVisible();
}
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")));
const coach = page => page.locator(".saga-tutorial-coach");
async function map(page) { await page.locator('[data-view="plaza"]').first().click(); }
async function headquarters(page) { await page.locator('[data-go="headquarters"]').click(); if (await page.locator('[data-saga="saga-1"]').isVisible()) await page.locator('[data-saga="saga-1"]').click(); }
async function debugBattle(page, mission) {
  await ensurePhaser(page);
  await page.evaluate(() => {
    const Game = window.Phaser.Game;
    window.Phaser.Game = class extends Game { constructor(config) { super(config); window.__sagaGame = this; } };
  });
  await page.locator(".debug-tools-trigger").click();
  await page.locator(`[data-debug-mission="${mission}"]`).click();
  await expect(page.locator(".tutorial-dialogue-box")).toBeVisible({ timeout: 30000 });
}
async function step(page, id) { await expect(page.locator(`.combat-tutorial[data-tutorial-step="${id}"] .tutorial-dialogue-box`)).toBeVisible({ timeout: 30000 }); }
const next = page => page.locator("[data-tutorial-next]").click();
async function choose(page, x, y) {
  const bounds = await page.locator("#game > canvas").boundingBox();
  await page.mouse.click(bounds.x + x / 960 * bounds.width, bounds.y + y / 540 * bounds.height);
}

test("el Cuartel exige confirmar equipo y conocer al maestro antes de partir", async ({ page }, info) => {
  await seed(page); await headquarters(page);
  await page.locator('[data-mission="m01"]').click();
  await expect(coach(page)).toContainText("Prepara tu equipo inicial");
  await page.locator('[data-dojo-tab="equipment"]').click();
  await page.locator('[data-gear-slot="weapon"]').click();
  await page.locator('[data-equipment-id="kunai"]').click();
  await expect(coach(page)).toContainText("Equipa el shuriken");
  await page.locator('[data-gear-slot="throwable"]').click();
  await page.locator('[data-equipment-id="shuriken"]').click();
  await page.locator('[data-open-master]').click();
  await expect(coach(page)).toBeHidden();
  await page.locator('[data-close-master]').click();
  const data = await saved(page);
  for (const id of ["command", "equipment", "throwable-equipment", "mentor"]) expect(data.campaign.sagaTutorial.completed).toContain(id);
  expect(data.campaign.sagaTutorial.completed).not.toContain("throwable");
  await page.screenshot({ path: info.outputPath("preparacion-dojo.png") });
});

test("Kagemori enseña atributos, PR, ranuras, compra y venta antes de investigar", async ({ page }) => {
  test.setTimeout(120000);
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await seed(page, 1); await headquarters(page);
  await page.locator('[data-mission="s01"]').click();
  await page.locator('[data-dojo-tab="statistics"]').click();
  await page.locator('[data-attribute="health"]').click();
  await page.locator('[data-dojo-tab="techniques"]').click();
  for (const id of ["physical_0", "physical_1"]) {
    await page.locator(`[data-skill-select="${id}"]`).click();
    await page.locator(`[data-skill-invest="${id}"]`).click();
  }
  await page.locator('[data-taijutsu-equip="physical_1"][data-taijutsu-target="0"]').click();
  const original = (await saved(page)).loadout[0];
  await page.locator('[data-loadout-remove="0"]').click();
  await page.locator(`[data-skill-select="${original}"]`).click();
  await page.locator(`[data-technique-toggle="${original}"]`).click();
  await map(page); await page.locator('[data-go="shop"]').click();
  const potions = page.locator('[data-shop-item="health_potion"]');
  await potions.locator("input").fill("2"); await potions.locator("button").click();
  await page.locator('[data-shop-mode="sell"]').click();
  await potions.locator("button").click();
  expect((await saved(page)).inventory.items.health_potion).toBe(1);
  await potions.locator("button").click();
  expect((await saved(page)).inventory.items.health_potion).toBe(1);
  await expect(coach(page)).toContainText("Conserva una unidad");
  await map(page); await headquarters(page);
  await page.locator('[data-mission="s01"]').click();
  await expect(page.locator(".dialogue-overlay")).toBeVisible();
  expect((await saved(page)).campaign.sagaTutorial.completed).toEqual(expect.arrayContaining(["attribute", "foundation", "learn-punch", "equip-punch", "remove-technique", "equip-technique", "buy-potions", "sell-potion"]));
  expect(errors).toEqual([]);
});

test("la investigación acredita pausa con Escape y conserva las pistas al recargar", async ({ page }) => {
  await seed(page, 1, true);
  await page.locator(".debug-tools-trigger").click(); await page.locator('[data-debug-view="kagemori"]').click();
  for (let i = 0; i < 12 && await page.locator("[data-stage-next]").isVisible(); i++) await page.locator("[data-stage-next]").click();
  await page.keyboard.press("Escape"); await expect(page.locator(".mission-pause-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await saved(page)).campaign.sagaTutorial.completed).toContain("field-pause");
  await page.locator('[data-clue="cart"]').focus(); await page.keyboard.press("Enter");
  await expect(page.locator("[data-clue-count]")).toHaveText("1/3 pistas");
  await page.reload(); await page.locator(".debug-tools-trigger").click(); await page.locator('[data-debug-view="kagemori"]').click();
  await expect(page.locator("[data-clue-count]")).toHaveText("1/3 pistas");
});

test("el Diccionario y el Bestiario requieren consulta y una respuesta elemental correcta", async ({ page }) => {
  await seed(page, 4); await headquarters(page); await page.locator('[data-mission="m03"]').click();
  await page.locator('[data-dictionary-search]').fill("ningunresultadoimposible");
  expect((await saved(page)).campaign.sagaTutorial.completed).not.toContain("dictionary");
  await page.locator('[data-dictionary-search]').fill("Novicio");
  await page.locator('[data-archive-tab="bestiary"]').click();
  await page.locator('[data-coach-answer="agua"]').click();
  await expect(coach(page)).toContainText("vuelve a elegir");
  expect((await saved(page)).campaign.sagaTutorial.completed).not.toContain("affinity-cycle");
  await page.locator('[data-coach-answer="viento"]').click();
  await expect(coach(page)).toBeHidden();
  expect((await saved(page)).campaign.sagaTutorial.completed).toEqual(expect.arrayContaining(["dictionary", "bestiary", "affinity-cycle"]));
});

test("el Desfiladero consume una poción real y acredita el taijutsu", async ({ page }) => {
  test.setTimeout(120000);
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await seed(page, 2, true); await debugBattle(page, "m02");
  await step(page, "resources"); await next(page); await step(page, "potion"); await next(page);
  await page.locator('[data-use-item="health_potion"]').click();
  await step(page, "physical-table"); await next(page); await step(page, "taijutsu"); await next(page);
  await step(page, "complete"); await next(page);
  const data = await saved(page);
  expect(data.inventory.items.health_potion || 0).toBe(0);
  expect(data.campaign.sagaTutorial.completed).toEqual(expect.arrayContaining(["potion", "taijutsu"]));
  expect(data.progression.coins).toBe(100); expect(data.campaign.completedMissions).not.toContain("m02");
  expect(errors).toEqual([]);
});

test("las galerías limpian un estado real y practican descansar y conservar", async ({ page }) => {
  test.setTimeout(120000);
  await seed(page, 5, true); await debugBattle(page, "m04");
  expect(await page.evaluate(() => window.__sagaGame.scene.getScene("battle").player.statuses.some(s => s.type === "burn"))).toBe(true);
  await step(page, "statuses"); await next(page); await step(page, "cleanse"); await next(page);
  await page.locator('[data-use-item="purifying_tonic"]').click();
  await step(page, "complete");
  expect(await page.evaluate(() => window.__sagaGame.scene.getScene("battle").player.statuses)).toEqual([]);
  await next(page);
  await page.evaluate(() => { const s = window.__sagaGame.scene.getScene("battle"); s.stopTurnTimeline(); window.__resource = s.playResourceChoice(); });
  await choose(page, 355, 340);
  await expect.poll(async () => (await saved(page)).campaign.sagaTutorial.completed).toContain("rest");
  await page.evaluate(async () => { await window.__resource; window.__resource = window.__sagaGame.scene.getScene("battle").playResourceChoice(); });
  await choose(page, 480, 340);
  await expect.poll(async () => (await saved(page)).campaign.sagaTutorial.completed).toContain("conserve");
});

test("Raizen exige segunda fase y la victoria abre los servicios de saga 2", async ({ page }) => {
  test.setTimeout(150000);
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await seed(page, 6, true);
  await page.evaluate(async () => {
    const { loadSave, writeSave } = await import("/src/save.js");
    const data = loadSave(); data.progression.level = 60; writeSave(data);
  });
  await page.reload(); await debugBattle(page, "m05");
  await page.evaluate(() => { const s = window.__sagaGame.scene.getScene("battle"); s.player.baseStrength = 1000; s.rollHit = chance => chance > 25; });
  for (const id of ["final", "final-elemental", "preparation", "seals", "final-guard", "complete"]) { await step(page, id); await next(page); }
  await expect.poll(() => page.evaluate(() => window.__sagaGame.scene.getScene("battle").enemy.phase), { timeout: 20000 }).toBe(2);
  await expect(page.locator('[data-combat-action="1"]')).toHaveAttribute("aria-disabled", "false", { timeout: 20000 });
  await page.locator('[data-combat-action="1"]').click();
  await expect.poll(async () => page.evaluate(async () => {
    const { battleRuntime } = await import("/src/battle/runtime.js?v=0.91.0");
    return battleRuntime.pendingVictorySave?.campaign.sagaTutorial.completed;
  }), { timeout: 30000 }).toContain("graduation");
  const access = await page.evaluate(async () => {
    const { battleRuntime } = await import("/src/battle/runtime.js?v=0.91.0");
    const { locationAccess } = await import("/src/village-progression.js");
    const { playerRankLabel } = await import("/src/player-rank.js");
    return { rank: playerRankLabel(battleRuntime.pendingVictorySave), locations: ["inn", "missions", "event"].map(id => locationAccess(id, battleRuntime.pendingVictorySave).unlocked) };
  });
  expect(access).toEqual({ rank: "Novicio", locations: [true, true, true] });
  expect(errors).toEqual([]);
});

test("la preparación permite recuperar PR y financiar materiales si ya se gastaron", async ({ page }) => {
  await seed(page, 1);
  await page.evaluate(async () => {
    const { loadSave, writeSave } = await import("/src/save.js");
    const data = loadSave(); data.progression.attributes.health = 1; data.progression.level = 3;
    data.progression.resonance.investments = { fire_embers: 1, fire_breath: 1, physical_0: 1, physical_2: 1 };
    data.progression.coins = 0; writeSave(data);
  });
  await page.reload(); await headquarters(page); await page.locator('[data-mission="s01"]').click();
  await page.locator('[data-coach-support]').click();
  expect((await saved(page)).progression.resonance.investments).toEqual({});
  for (const id of ["physical_0", "physical_1"]) {
    await page.locator(`[data-skill-select="${id}"]`).click(); await page.locator(`[data-skill-invest="${id}"]`).click();
  }
  await page.locator('[data-taijutsu-equip="physical_1"][data-taijutsu-target="0"]').click();
  const original = (await saved(page)).loadout[0];
  await page.locator('[data-loadout-remove="0"]').click(); await page.locator(`[data-skill-select="${original}"]`).click(); await page.locator(`[data-technique-toggle="${original}"]`).click();
  await map(page); await page.locator('[data-go="shop"]').click(); await page.locator('[data-coach-support]').click();
  expect((await saved(page)).progression.coins).toBe(36);
  expect((await saved(page)).campaign.sagaTutorial.completed).toContain("aid-buy-potions");
  await expect(page.locator('[data-coach-support]')).toHaveCount(0);
});
