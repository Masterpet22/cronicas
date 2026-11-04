# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shop.spec.mjs >> vende a mitad de precio y selecciona solo apariencia y sustitución compradas
- Location: tests\shop.spec.mjs:101:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('[data-gear-slot]')
Expected: 4
Received: 5
Timeout:  8000ms

Call log:
  - Expect "toHaveCount" locator('[data-gear-slot]') with timeout 8000ms
  - waiting for locator('[data-gear-slot]')
    20 × locator resolved to 5 elements
       - unexpected value "5"

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
            - paragraph [ref=f1e9]: EXPERTO
            - heading "Comprador" [level=2] [ref=f1e10]
          - generic "Nivel 15" [ref=f1e11]:
            - generic [ref=f1e12]: NIVEL
            - strong [ref=f1e13]: "15"
        - generic "Progreso de la partida" [ref=f1e14]:
          - generic "0 de 680 puntos de experiencia" [ref=f1e15]:
            - strong [ref=f1e17]: 0/680
            - generic [ref=f1e18]: PX
          - generic "1301 monedas" [ref=f1e19]:
            - strong [ref=f1e21]: "1301"
            - generic [ref=f1e22]: monedas
        - generic "Acciones de la partida" [ref=f1e23]:
          - button "Abrir ajustes" [ref=f1e24]
      - button "Abrir herramientas de pruebas" [ref=f1e25]:
        - generic [ref=f1e26]: DEV
        - text: PRUEBAS
      - navigation "Navegación de la aldea" [ref=f1e27]:
        - button "← Volver al mapa" [ref=f1e28]
      - region "Dojo" [ref=f1e29]:
        - button "Hablar con Mei Hayate" [ref=f1e30]:
          - img "Mei Hayate" [ref=f1e31]
          - generic [ref=f1e32]: Mei Hayate
        - generic [ref=f1e34]:
          - generic [ref=f1e35]:
            - generic [ref=f1e36]:
              - generic [aria-hidden] [ref=f1e37]: ✦
              - generic [ref=f1e38]:
                - paragraph [ref=f1e39]: CONFIGURACIÓN DE COMBATE
                - heading "Rango 2 · Experto" [level=2] [ref=f1e40]
                - text: Personaliza tus técnicas, mejora tus atributos y forja tu estilo de combate.
            - button "Entrenamiento Practicar movimientos" [ref=f1e41]:
              - text: Entrenamiento
              - generic [ref=f1e42]: Practicar movimientos
            - generic [ref=f1e43]:
              - strong [ref=f1e44]: NIVEL 15
              - generic [ref=f1e45]: 0/680 PX
            - tablist "Secciones de configuración" [ref=f1e47]:
              - tab "♧ Equipo" [active] [selected] [ref=f1e48]:
                - text: ♧
                - generic [ref=f1e49]: Equipo
              - tab "⚔ Técnicas" [ref=f1e50]:
                - text: ⚔
                - generic [ref=f1e51]: Técnicas
              - tab "⌁ Estadísticas" [ref=f1e52]:
                - text: ⌁
                - generic [ref=f1e53]: Estadísticas
              - tab "◈ Apariencia" [ref=f1e54]:
                - text: ◈
                - generic [ref=f1e55]: Apariencia
          - generic [ref=f1e56]:
            - tabpanel [ref=f1e57]:
              - generic [ref=f1e58]:
                - generic [ref=f1e59]:
                  - generic [ref=f1e60]:
                    - generic [ref=f1e61]:
                      - heading "Afinidades" [level=3] [ref=f1e62]
                      - paragraph [ref=f1e63]: "Tu rango determina las afinidades disponibles. Niveles 15 y 30: supera las pruebas para ascender a Experto y Veterano."
                    - generic [ref=f1e64]: 2/2
                  - generic [ref=f1e65]:
                    - generic [ref=f1e66]:
                      - generic [ref=f1e67]: "1"
                      - generic [ref=f1e68]:
                        - strong [ref=f1e69]: Fuego
                        - generic [ref=f1e70]: 50 PX de afinidad
                      - generic [aria-hidden] [ref=f1e71]: ⌾
                    - generic [ref=f1e72]:
                      - generic [ref=f1e73]: "2"
                      - generic [ref=f1e74]:
                        - strong [ref=f1e75]: Viento
                        - generic [ref=f1e76]: 0 PX de afinidad
                      - generic [aria-hidden] [ref=f1e77]: ⌾
                    - generic [ref=f1e78]:
                      - generic [ref=f1e79]: "3"
                      - generic [ref=f1e80]:
                        - strong [ref=f1e81]: Ranura bloqueada
                        - generic [ref=f1e82]: Nivel 30 y completar «La armonía de las tres afinidades»
                        - button "Ver pruebas en el Tablón" [ref=f1e83]
                      - generic [aria-hidden] [ref=f1e84]: ⌾
                  - paragraph [ref=f1e85]: ⌾ Principal 100 % · Secundaria 50 % · Tercera 25 %.
                - generic [ref=f1e86]:
                  - generic [ref=f1e88]:
                    - heading "Equipamiento" [level=3] [ref=f1e89]
                    - paragraph [ref=f1e90]: Configura tus recursos de combate.
                  - generic [ref=f1e91]:
                    - 'button "Arma: Kunai equilibrado" [ref=f1e92]':
                      - generic [ref=f1e94]:
                        - generic [ref=f1e95]: Arma
                        - strong [ref=f1e96]: Kunai equilibrado
                        - emphasis [ref=f1e97]: +2 daño
                      - generic [aria-hidden] [ref=f1e98]: +
                    - 'button "Arma arrojadiza: Shuriken" [ref=f1e99]':
                      - generic [ref=f1e101]:
                        - generic [ref=f1e102]: Arma arrojadiza
                        - strong [ref=f1e103]: Shuriken
                        - emphasis [ref=f1e104]: Arma arrojadiza reutilizable. Habilita su lanzamiento en la tabla física, sin gastar vida ni chakra.
                      - generic [aria-hidden] [ref=f1e105]: +
                    - 'button "Sello: Sello del viento" [ref=f1e106]':
                      - generic [aria-hidden] [ref=f1e107]: ◈
                      - generic [ref=f1e108]:
                        - generic [ref=f1e109]: Sello
                        - strong [ref=f1e110]: Sello del viento
                        - emphasis [ref=f1e111]: +4 evasión
                      - generic [aria-hidden] [ref=f1e112]: +
                    - 'button "Accesorio: Amuleto de chakra" [ref=f1e113]':
                      - generic [aria-hidden] [ref=f1e114]: ◇
                      - generic [ref=f1e115]:
                        - generic [ref=f1e116]: Accesorio
                        - strong [ref=f1e117]: Amuleto de chakra
                        - emphasis [ref=f1e118]: +20 chakra
                      - generic [aria-hidden] [ref=f1e119]: +
                    - 'button "Compañero: nada equipado" [ref=f1e120]':
                      - generic [aria-hidden] [ref=f1e121]: ♟
                      - generic [ref=f1e122]:
                        - generic [ref=f1e123]: Compañero
                        - strong [ref=f1e124]: Nada equipado
                        - emphasis [ref=f1e125]: Consigue invocaciones mediante contratos
                      - generic [aria-hidden] [ref=f1e126]: +
                - generic [ref=f1e127]:
                  - generic [ref=f1e129]:
                    - heading "Maestro" [level=3] [ref=f1e130]
                    - paragraph [ref=f1e131]: Ventaja pasiva para tu estilo de combate.
                  - button "MAESTRO ACTUAL Mei Hayate Instructora de Técnicas Disciplina defensiva Reduce en 2 el daño de cada impacto recibido. CAMBIAR ›" [ref=f1e132]:
                    - generic [ref=f1e133]:
                      - generic [ref=f1e134]: MAESTRO ACTUAL
                      - strong [ref=f1e135]: Mei Hayate
                      - generic [ref=f1e136]: Instructora de Técnicas
                      - emphasis [ref=f1e137]: Disciplina defensiva
                      - paragraph [ref=f1e138]: Reduce en 2 el daño de cada impacto recibido.
                    - generic [ref=f1e139]: CAMBIAR ›
            - paragraph [ref=f1e140]: Peinado con coleta seleccionado.
```

# Test source

```ts
  32  |     if (last) break;
  33  |   }
  34  |   await expect(page.locator(".shop-panel")).toBeVisible();
  35  | }
  36  | 
  37  | test("compra, apila, equipa y conserva el equipo al recargar", async ({ page }) => {
  38  |   const errors = [];
  39  |   page.on("pageerror", error => errors.push(error.message));
  40  |   await seedShop(page);
  41  |   await expect(page.getByRole("button", { name: "Abrir inventario" })).toHaveCount(0);
  42  |   await expect(page.locator("[data-shop-tab], [data-item-equip]")).toHaveCount(0);
  43  |   const potion = page.locator('[data-shop-item="health_potion"]');
  44  |   await potion.locator("input").fill("2");
  45  |   await potion.getByRole("button", { name: "Comprar", exact: true }).click();
  46  |   expect((await stored(page)).inventory.items.health_potion).toBe(2);
  47  |   expect((await stored(page)).progression.coins).toBe(1964);
  48  |   await page.locator('[data-shop-category="weapons"]').click();
  49  |   await page.locator('[data-shop-item="axe"]').getByRole("button", { name: "Comprar" }).click();
  50  |   await expect(page.locator('[data-shop-item="axe"] button')).toBeDisabled();
  51  |   await page.locator('[data-shop-category="seals"]').click();
  52  |   await page.locator('[data-shop-item="seal_shadow"]').getByRole("button", { name: "Comprar" }).click();
  53  |   await page.locator('[data-shop-category="scrolls"]').click();
  54  |   await expect(page.locator('[data-shop-item="affinity_scroll"]')).toHaveCount(0);
  55  |   await page.screenshot({ path: "test-results/shop/tienda.png" });
  56  |   await page.getByRole("button", { name: "← Volver al mapa" }).click();
  57  |   await page.locator('[data-go="dojo"]').click();
  58  |   await page.locator('[data-dojo-tab="equipment"]').click();
  59  |   await page.locator('[data-gear-slot="weapon"]').click();
  60  |   await page.locator('[data-equipment-id="axe"]').click();
  61  |   await page.locator('[data-gear-slot="seal"]').click();
  62  |   await page.locator('[data-equipment-id="seal_shadow"]').click();
  63  |   await expect(page.locator(".affinity-slots")).toContainText("Nivel 30");
  64  |   const save = await stored(page);
  65  |   expect(save.equipment).toMatchObject({ weapon: "axe", seal: "seal_shadow" });
  66  |   expect(save.character.affinities).toEqual(["fuego", "viento"]);
  67  |   expect(save.inventory.extraAffinityUnlocked).toBe(false);
  68  |   expect(save.inventory.items.affinity_scroll).toBeUndefined();
  69  |   expect(save.progression.coins).toBe(1679);
  70  |   await page.reload();
  71  |   await page.locator('[data-go="dojo"]').click();
  72  |   await page.locator('[data-dojo-tab="equipment"]').click();
  73  |   await expect(page.locator('[data-gear-slot="weapon"]')).toContainText("Hacha de combate");
  74  |   await expect(page.locator('[data-gear-slot="seal"]')).toContainText("Sello de la sombra");
  75  |   await expect(page.locator(".affinity-slots")).toContainText("Viento");
  76  |   expect((await stored(page)).inventory.items.health_potion).toBe(2);
  77  |   await page.screenshot({ path: "test-results/shop/equipo.png" });
  78  |   expect(errors).toEqual([]);
  79  | });
  80  | 
  81  | async function equipBattleStock(page) {
  82  |   await bootPerformanceReference(page, { renderer: "Canvas" });
  83  |   await page.evaluate(async () => {
  84  |     const { writeSave } = await import("/src/save.js?v=0.111.0");
  85  |     const { purchaseItem } = await import("/src/inventory.js?v=1.0.0");
  86  |     const scene = window.__performanceReference.scene;
  87  |     let save = { ...scene.saveData, progression: { ...scene.saveData.progression, coins: 1000 } };
  88  |     save = purchaseItem(save, "health_potion", 2).save;
  89  |     save = purchaseItem(save, "retry_scroll").save;
  90  |     scene.saveData = writeSave(save);
  91  |     scene.missionStartSave = structuredClone(scene.saveData);
  92  |     scene.rewardPreviewSave = structuredClone(scene.saveData);
  93  |     scene.player.hp = 10;
  94  |     scene.busy = false;
  95  |     scene.turnReady = true;
  96  |     scene.stopTurnTimeline();
  97  |     scene.refreshHud();
  98  |   });
  99  | }
  100 | 
  101 | test("vende a mitad de precio y selecciona solo apariencia y sustitución compradas", async ({ page }) => {
  102 |   await seedShop(page);
  103 |   await page.locator('[data-shop-item="health_potion"] input').fill("3");
  104 |   await page.locator('[data-shop-item="health_potion"] button').click();
  105 |   await page.locator('[data-shop-category="seals"]').click();
  106 |   await page.locator('[data-shop-item="seal_shadow"] button').click();
  107 |   await page.locator('[data-shop-mode="sell"]').click();
  108 |   await expect(page.locator('[data-shop-item="kunai"] button')).toBeDisabled();
  109 |   await page.locator('[data-shop-item="health_potion"] input').fill("2");
  110 |   await page.locator('[data-shop-item="health_potion"] button').click();
  111 |   await page.locator('[data-shop-item="seal_shadow"] button').click();
  112 |   expect((await stored(page)).progression.coins).toBe(1901);
  113 |   expect((await stored(page)).inventory.items.health_potion).toBe(1);
  114 |   await page.screenshot({ path: "test-results/shop/venta.png" });
  115 |   await page.locator('[data-shop-mode="buy"]').click();
  116 |   for (const [category, ids] of [["substitution", ["substitution_dog", "substitution_puppet"]], ["appearance", ["hair_ponytail", "face_mask", "top_traveler", "bottom_traveler", "shoes_sandals", "shadow_outfit"]]]) {
  117 |     await page.locator(`[data-shop-category="${category}"]`).click();
  118 |     for (const id of ids) await page.locator(`[data-shop-item="${id}"] button`).click();
  119 |   }
  120 |   await page.getByRole("button", { name: "← Volver al mapa" }).click();
  121 |   await page.locator('[data-go="dojo"]').click();
  122 |   await page.locator('[data-dojo-tab="appearance"]').click();
  123 |   for (const slot of ["teleportObject", "face", "top", "bottom", "shoes", "outfit", "hair"]) {
  124 |     await page.locator(`[data-cosmetic-step="${slot}"][data-direction="1"]`).click();
  125 |   }
  126 |   await expect(page.locator('[data-cosmetic-control="teleportObject"]')).toContainText("Sustitución");
  127 |   await expect(page.locator('[data-cosmetic-value="teleportObject"]')).toContainText("Perrito");
  128 |   expect((await stored(page)).character).toMatchObject({ teleportObject: "dog", hair: 4, face: 3, top: 2, bottom: 2, shoes: 2, outfit: "shadow_outfit" });
  129 |   expect((await stored(page)).character.hair).toBe(4);
  130 |   await page.screenshot({ path: "test-results/shop/apariencia.png" });
  131 |   await page.locator('[data-dojo-tab="equipment"]').click();
> 132 |   await expect(page.locator("[data-gear-slot]")).toHaveCount(4);
      |                                                  ^ Error: expect(locator).toHaveCount(expected) failed
  133 |   await expect(page.locator('[data-gear-slot="seal"]')).toContainText("Sello");
  134 |   await expect(page.locator('[data-gear-slot="armor"]')).toHaveCount(0);
  135 |   await page.reload();
  136 |   expect((await stored(page)).character.hair).toBe(4);
  137 |   expect((await stored(page)).inventory.items.seal_shadow).toBeUndefined();
  138 | });
  139 | 
  140 | test("un contrato comprado se juega en el tablón y desbloquea un compañero al cobrar la victoria", async ({ page }) => {
  141 |   const errors = []; page.on("pageerror", error => errors.push(error.message));
  142 |   await seedShop(page);
  143 |   await page.locator('[data-shop-category="contracts"]').click();
  144 |   await page.locator('[data-shop-item="contract_hound"] button').click();
  145 |   await page.getByRole("button", { name: "← Volver al mapa" }).click();
  146 |   await page.locator('[data-go="missions"]').click();
  147 |   const speech = page.locator("[data-stage-speech]");
  148 |   for (let i = 0; i < 12 && await speech.isVisible(); i++) {
  149 |     const next = speech.locator("[data-stage-next]");
  150 |     const last = (await next.textContent()) === "VER OPCIONES";
  151 |     await next.click(); if (last) break;
  152 |   }
  153 |   await expect(page.locator("[data-secondary-mission]")).toHaveCount(2);
  154 |   await ensurePhaser(page);
  155 |   await page.evaluate(() => {
  156 |     const Base = window.Phaser.Game;
  157 |     window.Phaser.Game = class extends Base { constructor(config) { super(config); window.__contractGame = this; } };
  158 |   });
  159 |   await page.locator('[data-secondary-mission="contract_hound"]').click();
  160 |   const dialogue = page.locator(".dialogue-overlay");
  161 |   await expect(dialogue).toBeVisible();
  162 |   await dialogue.locator(".primary-button").click();
  163 |   await expect.poll(() => page.evaluate(() => Boolean(window.__contractGame?.scene.getScene("battle")?.hero)), { timeout: 60000 }).toBe(true);
  164 |   const pending = await page.evaluate(async () => {
  165 |     const scene = window.__contractGame.scene.getScene("battle");
  166 |     scene.stopTurnTimeline();
  167 |     scene.playEncounterRewards = async () => {};
  168 |     scene.showPendingLevelUp = async () => {};
  169 |     scene.delay = async () => {};
  170 |     scene.finishBattle = async () => { scene.finished = true; scene.stopTurnTimeline(); };
  171 |     while (!scene.finished) { scene.enemy.hp = 0; await scene.resolveEnemyOutcome(); scene.stopTurnTimeline(); }
  172 |     return { companion:scene.saveData.inventory.items.companion_hound,rewards:scene.battleRewards };
  173 |   });
  174 |   expect(pending).toMatchObject({ companion:1,rewards:{ xp:100 } });
  175 |   expect((await stored(page)).inventory.items.companion_hound).toBeUndefined();
  176 |   await page.evaluate(async () => {
  177 |     const { battleRuntime } = await import("/src/battle/session.js?v=1.0.0");
  178 |     battleRuntime.releaseGameToMeta("plaza", { commitVictory: true });
  179 |   });
  180 |   expect((await stored(page)).inventory.items.companion_hound).toBe(1);
  181 |   expect((await stored(page)).inventory.items.contract_hound).toBeUndefined();
  182 |   await page.locator('[data-go="dojo"]').click();
  183 |   await page.locator('[data-dojo-tab="equipment"]').click();
  184 |   await page.locator('[data-gear-slot="companion"]').click();
  185 |   await page.locator('[data-equipment-id="companion_hound"]').click();
  186 |   expect((await stored(page)).equipment.companion).toBe("companion_hound");
  187 |   await page.screenshot({ path: "test-results/shop/companero.png" });
  188 |   expect(errors).toEqual([]);
  189 | });
  190 | 
  191 | for (const [slot, level, chosen] of [[2, 15, "viento"], [3, 30, "agua"]]) {
  192 |   test(`la afinidad ${slot} exige nivel ${level} y vencer su misión especial`, async ({ page }) => {
  193 |     const errors = []; page.on("pageerror", error => errors.push(error.message));
  194 |     await seedShop(page);
  195 |     await page.evaluate(async ({ slot, level }) => {
  196 |       const { loadSave, writeSave } = await import("/src/save.js");
  197 |       const save = loadSave(); save.progression.level = level - 1;
  198 |       save.character.affinities = slot === 2 ? ["fuego"] : ["fuego", "viento"];
  199 |       save.campaign.completedSecondaryMissions = slot === 2 ? [] : ["affinity_trial_2"];
  200 |       save.inventory.items.affinity_scroll = 1; save.inventory.extraAffinityUnlocked = true;
  201 |       writeSave(save);
  202 |     }, { slot, level });
  203 |     await page.reload();
  204 |     await page.locator('[data-go="dojo"]').click();
  205 |     await page.locator('[data-dojo-tab="equipment"]').click();
  206 |     await expect(page.locator('[data-affinity-choice]')).toHaveCount(0);
  207 |     await page.locator('[data-affinity-trials]').first().click();
  208 |     const speech = page.locator("[data-stage-speech]");
  209 |     for (let i = 0; i < 12 && await speech.isVisible(); i++) {
  210 |       const next = speech.locator("[data-stage-next]");
  211 |       const last = (await next.textContent()) === "VER OPCIONES";
  212 |       await next.click(); if (last) break;
  213 |     }
  214 |     await expect(page.locator(`[data-secondary-mission="affinity_trial_${slot}"]`)).toHaveCount(0);
  215 |     await page.evaluate(async level => {
  216 |       const { loadSave, writeSave } = await import("/src/save.js");
  217 |       const save = loadSave(); save.progression.level = level; writeSave(save);
  218 |     }, level);
  219 |     await page.reload();
  220 |     await page.locator('[data-go="dojo"]').click();
  221 |     await page.locator('[data-dojo-tab="equipment"]').click();
  222 |     await expect(page.locator('[data-affinity-choice]')).toHaveCount(0);
  223 |     await page.locator('[data-affinity-trials]').first().click();
  224 |     await ensurePhaser(page);
  225 |     await page.evaluate(() => {
  226 |       const Base = window.Phaser.Game;
  227 |       window.Phaser.Game = class extends Base { constructor(config) { super(config); window.__affinityGame = this; } };
  228 |     });
  229 |     await page.locator(`[data-secondary-mission="affinity_trial_${slot}"]`).click();
  230 |     await page.locator(".dialogue-overlay .primary-button").click();
  231 |     await expect.poll(() => page.evaluate(() => Boolean(window.__affinityGame?.scene.getScene("battle")?.hero)), { timeout: 60000 }).toBe(true);
  232 |     const outcome = await page.evaluate(async () => {
```