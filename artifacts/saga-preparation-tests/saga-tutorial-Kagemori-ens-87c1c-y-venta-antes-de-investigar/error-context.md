# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: saga-tutorial.spec.mjs >> Kagemori enseña atributos, PR, ranuras, compra y venta antes de investigar
- Location: tests\saga-tutorial.spec.mjs:73:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4173/
Call log:
  - navigating to "http://127.0.0.1:4173/", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import { ensurePhaser } from "./helpers/phaser-loader.mjs";
  3   | 
  4   | async function seed(page, current = 0, prepared = false) {
> 5   |   await page.goto("/");
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4173/
  6   |   await page.evaluate(async ({ current, prepared }) => {
  7   |     const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js");
  8   |     const { SAGA_TUTORIAL } = await import("/src/content/sagas/futuro-prometedor/tutorial.js");
  9   |     const { normalizeSagaTutorial } = await import("/src/tutorial-system.js");
  10  |     localStorage.clear(); sessionStorage.clear();
  11  |     const save = createCharacter(createDefaultSave(), { name: "Novicio", affinity: "fuego" });
  12  |     save.campaign.tutorialSeen = true;
  13  |     save.campaign.completedMissions = SAGA_TUTORIAL.slice(0, current).map(c => c.missionId);
  14  |     save.campaign.sagaTutorial = normalizeSagaTutorial(null, save.campaign);
  15  |     save.campaign.npcIntroductions = ["headquarters:ren", "dojo:mei", "shop:hana", "archive:sayo", "kagemori:iori", "kagemori:nami"];
  16  |     save.progression.level = current === 1 ? 2 : Math.max(1, current + 1);
  17  |     save.progression.attributePoints = current ? 2 : 0;
  18  |     save.progression.coins = current ? 100 : 0;
  19  |     if (current >= 2) {
  20  |       save.progression.resonance.investments = { physical_0: 1, physical_1: 1 };
  21  |       save.taijutsuLoadout = ["physical_1", null];
  22  |       save.inventory.items.health_potion = 1;
  23  |     }
  24  |     if (current >= 4) save.campaign.archiveUnlocked = true;
  25  |     if (current >= 5) save.inventory.items.purifying_tonic = 1;
  26  |     if (prepared) save.campaign.sagaTutorial.completed.push(...SAGA_TUTORIAL[current].before.map(s => s.id));
  27  |     writeSave(save);
  28  |     sessionStorage.setItem("cronicas-save-slot-selected", "1");
  29  |     localStorage.setItem("music-enabled", "off"); localStorage.setItem("seal-input-mode", "automatic");
  30  |   }, { current, prepared });
  31  |   await page.reload(); await expect(page.locator(".village-map")).toBeVisible();
  32  | }
  33  | const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")));
  34  | const coach = page => page.locator(".saga-tutorial-coach");
  35  | async function map(page) { await page.locator('[data-view="plaza"]').first().click(); }
  36  | async function headquarters(page) { await page.locator('[data-go="headquarters"]').click(); await page.locator('[data-saga="saga-1"]').click(); }
  37  | async function debugBattle(page, mission) {
  38  |   await ensurePhaser(page);
  39  |   await page.evaluate(() => {
  40  |     const Game = window.Phaser.Game;
  41  |     window.Phaser.Game = class extends Game { constructor(config) { super(config); window.__sagaGame = this; } };
  42  |   });
  43  |   await page.locator(".debug-tools-trigger").click();
  44  |   await page.locator(`[data-debug-mission="${mission}"]`).click();
  45  |   await expect(page.locator(".tutorial-card")).toBeVisible({ timeout: 30000 });
  46  | }
  47  | async function step(page, id) { await expect(page.locator(`.combat-tutorial[data-tutorial-step="${id}"] .tutorial-card`)).toBeVisible({ timeout: 30000 }); }
  48  | const next = page => page.locator("[data-tutorial-next]").click();
  49  | async function choose(page, x, y) {
  50  |   const bounds = await page.locator("#game canvas").boundingBox();
  51  |   await page.mouse.click(bounds.x + x / 960 * bounds.width, bounds.y + y / 540 * bounds.height);
  52  | }
  53  | 
  54  | test("el Cuartel exige confirmar equipo y conocer al maestro antes de partir", async ({ page }, info) => {
  55  |   await seed(page); await headquarters(page);
  56  |   await page.locator('[data-mission="m01"]').click();
  57  |   await expect(coach(page)).toContainText("Prepara tu equipo inicial");
  58  |   await page.locator('[data-dojo-tab="equipment"]').click();
  59  |   await page.locator('[data-gear-slot="weapon"]').click();
  60  |   await page.locator('[data-equipment-id="kunai"]').click();
  61  |   await expect(coach(page)).toContainText("Equipa el shuriken");
  62  |   await page.locator('[data-gear-slot="throwable"]').click();
  63  |   await page.locator('[data-equipment-id="shuriken"]').click();
  64  |   await page.locator('[data-open-master]').click();
  65  |   await expect(coach(page)).toContainText("Preparación completada");
  66  |   await page.locator('[data-close-master]').click();
  67  |   const data = await saved(page);
  68  |   for (const id of ["command", "equipment", "throwable-equipment", "mentor"]) expect(data.campaign.sagaTutorial.completed).toContain(id);
  69  |   expect(data.campaign.sagaTutorial.completed).not.toContain("throwable");
  70  |   await page.screenshot({ path: info.outputPath("preparacion-dojo.png") });
  71  | });
  72  | 
  73  | test("Kagemori enseña atributos, PR, ranuras, compra y venta antes de investigar", async ({ page }) => {
  74  |   test.setTimeout(120000);
  75  |   const errors = []; page.on("pageerror", error => errors.push(error.message));
  76  |   await seed(page, 1); await headquarters(page);
  77  |   await page.locator('[data-mission="s01"]').click();
  78  |   await page.locator('[data-dojo-tab="statistics"]').click();
  79  |   await page.locator('[data-attribute="health"]').click();
  80  |   await page.locator('[data-dojo-tab="techniques"]').click();
  81  |   for (const id of ["physical_0", "physical_1"]) {
  82  |     await page.locator(`[data-skill-select="${id}"]`).click();
  83  |     await page.locator(`[data-skill-invest="${id}"]`).click();
  84  |   }
  85  |   await page.locator('[data-taijutsu-equip="physical_1"][data-taijutsu-target="0"]').click();
  86  |   const original = (await saved(page)).loadout[0];
  87  |   await page.locator('[data-loadout-remove="0"]').click();
  88  |   await page.locator(`[data-skill-select="${original}"]`).click();
  89  |   await page.locator(`[data-technique-toggle="${original}"]`).click();
  90  |   await map(page); await page.locator('[data-go="shop"]').click();
  91  |   const potions = page.locator('[data-shop-item="health_potion"]');
  92  |   await potions.locator("input").fill("2"); await potions.locator("button").click();
  93  |   await page.locator('[data-shop-mode="sell"]').click();
  94  |   await potions.locator("button").click();
  95  |   expect((await saved(page)).inventory.items.health_potion).toBe(1);
  96  |   await potions.locator("button").click();
  97  |   expect((await saved(page)).inventory.items.health_potion).toBe(1);
  98  |   await expect(coach(page)).toContainText("Conserva una unidad");
  99  |   await map(page); await headquarters(page);
  100 |   await page.locator('[data-mission="s01"]').click();
  101 |   await expect(page.locator(".dialogue-overlay")).toBeVisible();
  102 |   expect((await saved(page)).campaign.sagaTutorial.completed).toEqual(expect.arrayContaining(["attribute", "foundation", "learn-punch", "equip-punch", "remove-technique", "equip-technique", "buy-potions", "sell-potion"]));
  103 |   expect(errors).toEqual([]);
  104 | });
  105 | 
```