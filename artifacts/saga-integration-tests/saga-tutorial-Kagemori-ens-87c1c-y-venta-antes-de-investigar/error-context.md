# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: saga-tutorial.spec.mjs >> Kagemori enseña atributos, PR, ranuras, compra y venta antes de investigar
- Location: tests\saga-tutorial.spec.mjs:73:1

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: locator.click: Test timeout of 120000ms exceeded.
Call log:
  - waiting for locator('[data-saga="saga-1"]')

```

# Page snapshot

```yaml
- main [ref=f1e2]:
  - generic "Controles generales":
    - generic:
      - paragraph: RPG 2D POR TURNOS
      - heading "Crónicas del Sello" [level=1]
    - group:
      - generic "Ajustes":
        - generic [aria-hidden]: ⚙
        - text: Ajustes
  - region "Dojo y progreso del personaje" [ref=f1e3]:
    - generic [ref=f1e4]:
      - generic [ref=f1e5]:
        - generic [ref=f1e6]:
          - generic [ref=f1e8]:
            - paragraph [ref=f1e9]: RANGO 1 · NOVICIO
            - heading "Novicio" [level=2] [ref=f1e10]
          - generic "Nivel 2" [ref=f1e11]:
            - generic [ref=f1e12]: NIVEL
            - strong [ref=f1e13]: "2"
        - generic "Progreso de la partida" [ref=f1e14]:
          - generic "0 de 160 puntos de experiencia" [ref=f1e15]:
            - strong [ref=f1e17]: 0/160
            - generic [ref=f1e18]: PX
          - generic "73 monedas" [ref=f1e19]:
            - strong [ref=f1e21]: "73"
            - generic [ref=f1e22]: monedas
        - generic "Acciones de la partida" [ref=f1e23]:
          - button "Abrir ajustes" [ref=f1e24]
      - button "Abrir herramientas de pruebas" [ref=f1e25]:
        - generic [ref=f1e26]: DEV
        - text: PRUEBAS
      - navigation "Navegación de la aldea" [ref=f1e27]:
        - button "← Volver al mapa" [ref=f1e28]
      - region "Cuartel General" [ref=f1e29]:
        - button "Hablar con Ren Arashiro" [ref=f1e30]:
          - img "Ren Arashiro" [ref=f1e31]
          - generic [ref=f1e32]: Ren Arashiro
        - generic [ref=f1e34]:
          - generic [ref=f1e35]:
            - button "← SAGAS" [ref=f1e36]
            - generic [ref=f1e37]:
              - paragraph [ref=f1e38]: SAGA 01
              - heading "Futuro prometedor" [level=2] [ref=f1e39]
              - paragraph [ref=f1e40]: Formación de Novicio · Tutorial completo de la aldea
            - strong [ref=f1e41]: 1/2
          - generic [ref=f1e42]:
            - article [ref=f1e43]:
              - generic [ref=f1e44]: "01"
              - generic [ref=f1e45]:
                - paragraph [ref=f1e46]: MISIÓN CLASE D · Bosque del Este
                - heading "Tras las huellas del gato" [level=3] [ref=f1e47]
                - paragraph [ref=f1e48]: "Tutorial: Primer combate · combate · 8–10 min · 120 PX totales · 40 monedas"
              - button "REPETIR" [ref=f1e49]
            - article [ref=f1e50]:
              - generic [ref=f1e51]: "02"
              - generic [ref=f1e52]:
                - paragraph [ref=f1e53]: MISIÓN CLASE D · Aldea de Kagemori
                - heading "El silencio de Kagemori" [level=3] [ref=f1e54]
                - paragraph [ref=f1e55]: "Tutorial: Preparación e investigación · investigación · 5–7 min · 40 PX totales · 0 monedas"
              - button "INICIAR HISTORIA" [ref=f1e56]
      - complementary "Guía de formación de la saga 1" [ref=f1e57]:
        - generic [ref=f1e58]:
          - strong [ref=f1e59]: SAGA 1 · FORMACIÓN
          - button "Reducir guía" [ref=f1e60]: −
        - generic [ref=f1e61]:
          - text: Preparación e investigación
          - heading "Práctica en misión" [level=3] [ref=f1e62]
          - paragraph [ref=f1e63]: Preparación completada. Vuelve al Cuartel para iniciar la práctica de esta misión.
          - button "Volver al Cuartel" [ref=f1e64]
          - status [ref=f1e65]: Conserva una unidad para la práctica pendiente.
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import { ensurePhaser } from "./helpers/phaser-loader.mjs";
  3   | 
  4   | async function seed(page, current = 0, prepared = false) {
  5   |   await page.goto("/");
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
> 36  | async function headquarters(page) { await page.locator('[data-go="headquarters"]').click(); await page.locator('[data-saga="saga-1"]').click(); }
      |                                                                                                                                        ^ Error: locator.click: Test timeout of 120000ms exceeded.
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
  106 | test("la investigación acredita pausa con Escape y conserva las pistas al recargar", async ({ page }) => {
  107 |   await seed(page, 1, true);
  108 |   await page.locator(".debug-tools-trigger").click(); await page.locator('[data-debug-view="kagemori"]').click();
  109 |   for (let i = 0; i < 12 && await page.locator("[data-stage-next]").isVisible(); i++) await page.locator("[data-stage-next]").click();
  110 |   await page.keyboard.press("Escape"); await expect(page.locator(".mission-pause-dialog")).toBeVisible();
  111 |   await page.keyboard.press("Escape");
  112 |   await expect.poll(async () => (await saved(page)).campaign.sagaTutorial.completed).toContain("field-pause");
  113 |   await page.locator('[data-clue="cart"]').focus(); await page.keyboard.press("Enter");
  114 |   await expect(page.locator("[data-clue-count]")).toHaveText("1/3 pistas");
  115 |   await page.reload(); await page.locator(".debug-tools-trigger").click(); await page.locator('[data-debug-view="kagemori"]').click();
  116 |   await expect(page.locator("[data-clue-count]")).toHaveText("1/3 pistas");
  117 | });
  118 | 
  119 | test("el Diccionario y el Bestiario requieren consulta y una respuesta elemental correcta", async ({ page }) => {
  120 |   await seed(page, 4); await headquarters(page); await page.locator('[data-mission="m03"]').click();
  121 |   await page.locator('[data-dictionary-search]').fill("ningunresultadoimposible");
  122 |   expect((await saved(page)).campaign.sagaTutorial.completed).not.toContain("dictionary");
  123 |   await page.locator('[data-dictionary-search]').fill("Novicio");
  124 |   await page.locator('[data-archive-tab="bestiary"]').click();
  125 |   await page.locator('[data-coach-answer="agua"]').click();
  126 |   await expect(coach(page)).toContainText("vuelve a elegir");
  127 |   expect((await saved(page)).campaign.sagaTutorial.completed).not.toContain("affinity-cycle");
  128 |   await page.locator('[data-coach-answer="viento"]').click();
  129 |   await expect(coach(page)).toContainText("Preparación completada");
  130 |   expect((await saved(page)).campaign.sagaTutorial.completed).toEqual(expect.arrayContaining(["dictionary", "bestiary", "affinity-cycle"]));
  131 | });
  132 | 
  133 | test("el Desfiladero consume una poción real y acredita el taijutsu", async ({ page }) => {
  134 |   test.setTimeout(120000);
  135 |   const errors = []; page.on("pageerror", error => errors.push(error.message));
  136 |   await seed(page, 2, true); await debugBattle(page, "m02");
```