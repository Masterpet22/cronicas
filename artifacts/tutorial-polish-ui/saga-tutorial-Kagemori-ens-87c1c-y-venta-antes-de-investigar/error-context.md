# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: saga-tutorial.spec.mjs >> Kagemori enseña atributos, PR, ranuras, compra y venta antes de investigar
- Location: tests\saga-tutorial.spec.mjs:73:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.saga-tutorial-coach')
Expected substring: "Conserva una unidad"
Received string:    "×Hana KoganeMercader de SuministrosMei HayateTu maestroHana Kogane: Aquí compras por el precio indicado y vendes a la mitad. Elige la cantidad antes de confirmar.Vende una pociónCambia a Vender y vende 1 poción de vida. Recibes la mitad del precio; conserva la otra para practicar su uso en el Desfiladero.Usa el control resaltado.Mostrar el control"
Timeout: 8000ms

Call log:
  - Expect "toContainText" locator('.saga-tutorial-coach') with timeout 8000ms
  - waiting for locator('.saga-tutorial-coach')
    19 × locator resolved to <section hidden="" class="saga-tutorial-coach" aria-label="Explicación del maestro y del guardián">…</section>
       - unexpected value "×Hana KoganeMercader de SuministrosMei HayateTu maestroHana Kogane: Aquí compras por el precio indicado y vendes a la mitad. Elige la cantidad antes de confirmar.Vende una pociónCambia a Vender y vende 1 poción de vida. Recibes la mitad del precio; conserva la otra para practicar su uso en el Desfiladero.Usa el control resaltado.Mostrar el control"

```

```yaml
- main:
  - paragraph: RPG 2D POR TURNOS
  - heading "Crónicas del Sello" [level=1]
  - group: Ajustes
  - region "Dojo y progreso del personaje":
    - paragraph: RANGO 1 · NOVICIO
    - heading "Novicio" [level=2]
    - text: NIVEL
    - strong: "2"
    - strong: 0/160
    - text: PX
    - strong: "73"
    - text: monedas
    - button "Abrir ajustes"
    - button "Abrir herramientas de pruebas": DEV PRUEBAS
    - navigation "Navegación de la aldea":
      - button "← Volver al mapa"
      - button "Volver al Cuartel"
    - region "Tienda":
      - button "Hablar con Hana Kogane":
        - img "Hana Kogane"
        - text: Hana Kogane
      - region "Tienda":
        - heading "Prepara tu próximo viaje" [level=2]
        - paragraph: Gestiona equipo, apariencia y sustitución en el Dojo. Los contratos se juegan en el tablón y las decoraciones se colocan en el Gremio.
        - strong: 73 MONEDAS
        - navigation "Operación de la tienda":
          - button "Comprar"
          - button "Vender" [pressed]
          - text: Vendemos por el precio indicado y compramos a mitad de precio, redondeada hacia abajo.
        - status: Vendiste 1 × Poción de vida por 9 monedas.
        - navigation "Tipos de objetos":
          - button "Todos" [pressed]
          - button "Armas"
          - button "Armas arrojadizas"
          - button "Sellos"
          - button "Accesorios"
          - button "Apariencia"
          - button "Sustitución"
          - button "Consumibles"
          - button "Pergaminos"
          - button "Misiones"
          - button "Decoraciones"
        - text: 15 monedas / unidad
        - heading "Kunai equilibrado" [level=3]
        - paragraph: +2 daño
        - text: "En inventario: 1 Desequípalo en el Dojo antes de venderlo."
        - button "Vender" [disabled]
        - text: 12 monedas / unidad
        - heading "Shuriken" [level=3]
        - paragraph: Arma arrojadiza reutilizable. Habilita su lanzamiento en la tabla física, sin gastar vida ni chakra.
        - text: "En inventario: 1 Desequípalo en el Dojo antes de venderlo."
        - button "Vender" [disabled]
        - text: 17 monedas / unidad
        - heading "Sello del viento" [level=3]
        - paragraph: +4 evasión
        - text: "En inventario: 1 Desequípalo en el Dojo antes de venderlo."
        - button "Vender" [disabled]
        - text: 30 monedas / unidad
        - heading "Amuleto de chakra" [level=3]
        - paragraph: +20 chakra
        - text: "En inventario: 1 Desequípalo en el Dojo antes de venderlo."
        - button "Vender" [disabled]
        - text: 9 monedas / unidad
        - heading "Poción de vida" [level=3]
        - paragraph: Recupera un 35 % de tus PV máximos. Consume tu turno.
        - text: "En inventario: 1 Cantidad"
        - spinbutton "Cantidad de Poción de vida": "1"
        - button "Vender"
        - text: 20 monedas / unidad
        - heading "Peinado corto" [level=3]
        - paragraph: Solo apariencia; sin bonificaciones de combate.
        - text: "En inventario: 1 Desequípalo en el Dojo antes de venderlo."
        - button "Vender" [disabled]
        - text: 40 monedas / unidad
        - heading "Bonsái" [level=3]
        - paragraph: Un pequeño árbol en maceta. Incluye una unidad para colocar en el Gremio; al retirarla puedes volver a usarla.
        - text: "En inventario: 1 · En Mi espacio: 1 Retíralo de Mi espacio antes de venderlo. Cantidad"
        - spinbutton "Cantidad de Bonsái" [disabled]: "1"
        - button "Vender" [disabled]
        - text: 25 monedas / unidad
        - heading "Insignia de novicio" [level=3]
        - paragraph: Tu primer rango en la aldea. Incluye una unidad para colocar en el Gremio; al retirarla puedes volver a usarla.
        - text: "En inventario: 1 · En Mi espacio: 1 Retíralo de Mi espacio antes de venderlo. Cantidad"
        - spinbutton "Cantidad de Insignia de novicio" [disabled]: "1"
        - button "Vender" [disabled]
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
  36  | async function headquarters(page) { await page.locator('[data-go="headquarters"]').click(); if (await page.locator('[data-saga="saga-1"]').isVisible()) await page.locator('[data-saga="saga-1"]').click(); }
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
  50  |   const bounds = await page.locator("#game > canvas").boundingBox();
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
  65  |   await expect(coach(page)).toBeHidden();
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
> 98  |   await expect(coach(page)).toContainText("Conserva una unidad");
      |                             ^ Error: expect(locator).toContainText(expected) failed
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
  129 |   await expect(coach(page)).toBeHidden();
  130 |   expect((await saved(page)).campaign.sagaTutorial.completed).toEqual(expect.arrayContaining(["dictionary", "bestiary", "affinity-cycle"]));
  131 | });
  132 | 
  133 | test("el Desfiladero consume una poción real y acredita el taijutsu", async ({ page }) => {
  134 |   test.setTimeout(120000);
  135 |   const errors = []; page.on("pageerror", error => errors.push(error.message));
  136 |   await seed(page, 2, true); await debugBattle(page, "m02");
  137 |   await step(page, "resources"); await next(page); await step(page, "potion"); await next(page);
  138 |   await page.locator('[data-use-item="health_potion"]').click();
  139 |   await step(page, "physical-table"); await next(page); await step(page, "taijutsu"); await next(page);
  140 |   await step(page, "complete"); await next(page);
  141 |   const data = await saved(page);
  142 |   expect(data.inventory.items.health_potion || 0).toBe(0);
  143 |   expect(data.campaign.sagaTutorial.completed).toEqual(expect.arrayContaining(["potion", "taijutsu"]));
  144 |   expect(data.progression.coins).toBe(100); expect(data.campaign.completedMissions).not.toContain("m02");
  145 |   expect(errors).toEqual([]);
  146 | });
  147 | 
  148 | test("las galerías limpian un estado real y practican descansar y conservar", async ({ page }) => {
  149 |   test.setTimeout(120000);
  150 |   await seed(page, 5, true); await debugBattle(page, "m04");
  151 |   expect(await page.evaluate(() => window.__sagaGame.scene.getScene("battle").player.statuses.some(s => s.type === "burn"))).toBe(true);
  152 |   await step(page, "statuses"); await next(page); await step(page, "cleanse"); await next(page);
  153 |   await page.locator('[data-use-item="purifying_tonic"]').click();
  154 |   await step(page, "complete");
  155 |   expect(await page.evaluate(() => window.__sagaGame.scene.getScene("battle").player.statuses)).toEqual([]);
  156 |   await next(page);
  157 |   await page.evaluate(() => { const s = window.__sagaGame.scene.getScene("battle"); s.stopTurnTimeline(); window.__resource = s.playResourceChoice(); });
  158 |   await choose(page, 355, 340);
  159 |   await expect.poll(async () => (await saved(page)).campaign.sagaTutorial.completed).toContain("rest");
  160 |   await page.evaluate(async () => { await window.__resource; window.__resource = window.__sagaGame.scene.getScene("battle").playResourceChoice(); });
  161 |   await choose(page, 480, 340);
  162 |   await expect.poll(async () => (await saved(page)).campaign.sagaTutorial.completed).toContain("conserve");
  163 | });
  164 | 
  165 | test("Raizen exige segunda fase y la victoria abre los servicios de saga 2", async ({ page }) => {
  166 |   test.setTimeout(150000);
  167 |   const errors = []; page.on("pageerror", error => errors.push(error.message));
  168 |   await seed(page, 6, true);
  169 |   await page.evaluate(async () => {
  170 |     const { loadSave, writeSave } = await import("/src/save.js");
  171 |     const data = loadSave(); data.progression.level = 60; writeSave(data);
  172 |   });
  173 |   await page.reload(); await debugBattle(page, "m05");
  174 |   await page.evaluate(() => { const s = window.__sagaGame.scene.getScene("battle"); s.player.baseStrength = 1000; s.rollHit = chance => chance > 25; });
  175 |   for (const id of ["final", "final-elemental", "preparation", "seals", "final-guard", "complete"]) { await step(page, id); await next(page); }
  176 |   await expect.poll(() => page.evaluate(() => window.__sagaGame.scene.getScene("battle").enemy.phase), { timeout: 20000 }).toBe(2);
  177 |   await expect(page.locator('[data-combat-action="1"]')).toHaveAttribute("aria-disabled", "false", { timeout: 20000 });
  178 |   await page.locator('[data-combat-action="1"]').click();
  179 |   await expect.poll(async () => page.evaluate(async () => {
  180 |     const { battleRuntime } = await import("/src/battle/runtime.js?v=0.91.0");
  181 |     return battleRuntime.pendingVictorySave?.campaign.sagaTutorial.completed;
  182 |   }), { timeout: 30000 }).toContain("graduation");
  183 |   const access = await page.evaluate(async () => {
  184 |     const { battleRuntime } = await import("/src/battle/runtime.js?v=0.91.0");
  185 |     const { locationAccess } = await import("/src/village-progression.js");
  186 |     const { playerRankLabel } = await import("/src/player-rank.js");
  187 |     return { rank: playerRankLabel(battleRuntime.pendingVictorySave), locations: ["inn", "missions", "event"].map(id => locationAccess(id, battleRuntime.pendingVictorySave).unlocked) };
  188 |   });
  189 |   expect(access).toEqual({ rank: "Novicio", locations: [true, true, true] });
  190 |   expect(errors).toEqual([]);
  191 | });
  192 | 
  193 | test("la preparación permite recuperar PR y financiar materiales si ya se gastaron", async ({ page }) => {
  194 |   await seed(page, 1);
  195 |   await page.evaluate(async () => {
  196 |     const { loadSave, writeSave } = await import("/src/save.js");
  197 |     const data = loadSave(); data.progression.attributes.health = 1; data.progression.level = 3;
  198 |     data.progression.resonance.investments = { fire_embers: 1, fire_breath: 1, physical_0: 1, physical_2: 1 };
```