# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tutorial-polish.spec.mjs >> el Dojo señala la pestaña, el atributo, el hexágono y el botón correcto
- Location: tests\tutorial-polish.spec.mjs:92:1

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('.technique-detail h3')
Expected: "Disciplina del cuerpo"
Received: ""

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
            - heading "Akio" [level=2] [ref=f1e10]
          - generic "Nivel 2" [ref=f1e11]:
            - generic [ref=f1e12]: NIVEL
            - strong [ref=f1e13]: "2"
        - generic "Progreso de la partida" [ref=f1e14]:
          - generic "0 de 160 puntos de experiencia" [ref=f1e15]:
            - strong [ref=f1e17]: 0/160
            - generic [ref=f1e18]: PX
          - generic "100 monedas" [ref=f1e19]:
            - strong [ref=f1e21]: "100"
            - generic [ref=f1e22]: monedas
        - generic "Acciones de la partida" [ref=f1e23]:
          - button "Abrir ajustes" [ref=f1e24]
      - button "Abrir herramientas de pruebas" [ref=f1e25]:
        - generic [ref=f1e26]: DEV
        - text: PRUEBAS
      - navigation "Navegación de la aldea" [ref=f1e27]:
        - button "← Volver al mapa" [ref=f1e28]
        - button "Pedir ayuda al maestro" [ref=f1e29]
      - region "Dojo" [ref=f1e30]:
        - button "Hablar con Mei Hayate" [ref=f1e31]:
          - img "Mei Hayate" [ref=f1e32]
          - generic [ref=f1e33]: Mei Hayate
        - status [ref=f1e34]:
          - region "Explicación del maestro y del guardián" [ref=f1e35]:
            - button "Cerrar explicación" [ref=f1e36]: ×
            - generic [ref=f1e39]:
              - strong [ref=f1e40]: Mei Hayate
              - generic [ref=f1e41]: Tu maestro
            - heading "Mejora Disciplina del cuerpo" [level=3] [ref=f1e42]
            - paragraph [ref=f1e43]: En Técnicas selecciona Disciplina del cuerpo e invierte 1 PR. Los PR se obtienen al subir de nivel y son distintos de los puntos de atributo.
            - status [ref=f1e44]: 3. Pulsa MEJORAR · 1 PR en esta ficha.
            - button "Mostrar el control" [ref=f1e45]
            - status
        - generic [ref=f1e47]:
          - generic [ref=f1e48]:
            - generic [ref=f1e49]:
              - generic [aria-hidden] [ref=f1e50]: ✦
              - generic [ref=f1e51]:
                - paragraph [ref=f1e52]: CONFIGURACIÓN DE COMBATE
                - heading "Rango 1 · Novicio" [level=2] [ref=f1e53]
                - text: Personaliza tus técnicas, mejora tus atributos y forja tu estilo de combate.
            - button "Entrenamiento Practicar movimientos" [ref=f1e54]:
              - text: Entrenamiento
              - generic [ref=f1e55]: Practicar movimientos
            - generic [ref=f1e56]:
              - strong [ref=f1e57]: NIVEL 2
              - generic [ref=f1e58]: 0/160 PX
            - tablist "Secciones de configuración" [ref=f1e60]:
              - tab "♧ Equipo" [ref=f1e61]:
                - text: ♧
                - generic [ref=f1e62]: Equipo
              - tab "⚔ Técnicas" [selected] [ref=f1e63]:
                - text: ⚔
                - generic [ref=f1e64]: Técnicas
              - tab "⌁ Estadísticas" [ref=f1e65]:
                - text: ⌁
                - generic [ref=f1e66]: Estadísticas
              - tab "◈ Apariencia" [ref=f1e67]:
                - text: ◈
                - generic [ref=f1e68]: Apariencia
          - generic [ref=f1e69]:
            - tabpanel [ref=f1e70]:
              - generic [ref=f1e71]:
                - region "Técnicas equipadas para el combate" [ref=f1e72]:
                  - generic [ref=f1e74]:
                    - heading "Elementales" [level=3] [ref=f1e75]
                    - generic [ref=f1e76]: 2/2 EQUIPADAS
                  - generic [ref=f1e77]:
                    - article [ref=f1e78]:
                      - button "Consultar Ascuas veloces, equipada en ranura 1" [ref=f1e79]:
                        - generic [ref=f1e80]: RANURA 1
                        - strong [ref=f1e81]: Ascuas veloces
                      - button "Quitar Ascuas veloces del combate" [ref=f1e82]: ×
                    - article [ref=f1e83]:
                      - button "Consultar Aliento de brasa, equipada en ranura 2" [ref=f1e84]:
                        - generic [ref=f1e85]: RANURA 2
                        - strong [ref=f1e86]: Aliento de brasa
                      - button "Quitar Aliento de brasa del combate" [ref=f1e87]: ×
                    - generic [ref=f1e88]:
                      - generic [ref=f1e89]: RANURA 3 · BLOQUEADA
                      - strong [ref=f1e90]: Se abre al nivel 5
                    - generic [ref=f1e91]:
                      - generic [ref=f1e92]: RANURA 4 · BLOQUEADA
                      - strong [ref=f1e93]: Se abre al nivel 8
                  - region "Taijutsus equipados" [ref=f1e94]:
                    - generic [ref=f1e95]:
                      - heading "Taijutsus" [level=4] [ref=f1e96]
                      - generic [ref=f1e97]: 0/2 EQUIPADOS
                    - generic [ref=f1e98]:
                      - article [ref=f1e99]:
                        - button "Elegir taijutsu para ranura 1" [ref=f1e100]:
                          - generic [ref=f1e101]: TAIJUTSU 1
                          - strong [ref=f1e102]: Elegir técnica
                      - article [ref=f1e103]:
                        - button "Elegir taijutsu para ranura 2" [ref=f1e104]:
                          - generic [ref=f1e105]: TAIJUTSU 2
                          - strong [ref=f1e106]: Elegir técnica
                  - status [ref=f1e108]: Tus 2 ranuras están ocupadas. Reemplaza una para cambiar.
                - generic [ref=f1e109]:
                  - region "Árbol de habilidades de Resonancia" [ref=f1e110]:
                    - generic [ref=f1e111]:
                      - generic [ref=f1e112]:
                        - paragraph [ref=f1e113]: EL CAMINO DEL SHINOBI
                        - heading "Núcleo de Resonancia" [level=3] [ref=f1e114]
                      - generic [ref=f1e115]:
                        - generic [ref=f1e116]: "2"
                        - generic [ref=f1e117]: PRDISPONIBLES
                    - generic [ref=f1e118]:
                      - img "Panal de 39 celdas. Tab recorre, Enter selecciona, flechas desplazan y más o menos amplían." [ref=f1e119]:
                        - button "Disciplina del cuerpo. APRENDIDA. Nivel 1 de 3" [pressed] [ref=f1e185]:
                          - generic: 1/3
                        - button "Puño de hierro. BLOQUEADA. Nivel 0 de 3" [ref=f1e188]
                        - button "Paso fugaz. BLOQUEADA. Nivel 0 de 3" [ref=f1e194]
                        - button "Guardia inquebrantable. BLOQUEADA. Nivel 0 de 3" [ref=f1e200]
                        - button "Pulso certero. BLOQUEADA. Nivel 0 de 3" [ref=f1e206]
                        - button "Instinto de combate. BLOQUEADA. Nivel 0 de 3" [ref=f1e212]
                        - button "Ascuas veloces. EN COMBATE · RANURA 1. Nivel 1 de 3" [ref=f1e218]:
                          - generic: 1/3
                        - button "Aliento de brasa. EN COMBATE · RANURA 2. Nivel 1 de 3" [ref=f1e222]:
                          - generic: 1/3
                        - button "Arco de llama. BLOQUEADA. Nivel 0 de 3" [ref=f1e226]
                        - button "Marca ardiente. BLOQUEADA. Nivel 0 de 3" [ref=f1e232]
                        - button "Anillo de ceniza. BLOQUEADA. Nivel 0 de 3" [ref=f1e238]
                        - button "Fénix escarlata. BLOQUEADA. Nivel 0 de 3" [ref=f1e244]
                        - button "Sello protector · Fuego. BLOQUEADA. Nivel 0 de 3" [ref=f1e250]
                        - button "Flujo interior · Fuego. BLOQUEADA. Nivel 0 de 3" [ref=f1e256]
                        - button "Afinidad 2 por descubrir. BLOQUEADA. Nivel 0 de 3" [ref=f1e262]
                        - button "Afinidad 2 por descubrir. BLOQUEADA. Nivel 0 de 3" [ref=f1e268]
                        - button "Afinidad 2 por descubrir. BLOQUEADA. Nivel 0 de 3" [ref=f1e274]
                        - button "Afinidad 2 por descubrir. BLOQUEADA. Nivel 0 de 3" [ref=f1e280]
                        - button "Afinidad 2 por descubrir. BLOQUEADA. Nivel 0 de 3" [ref=f1e286]
                        - button "Afinidad 2 por descubrir. BLOQUEADA. Nivel 0 de 3" [ref=f1e292]
                        - button "Afinidad 2 por descubrir. BLOQUEADA. Nivel 0 de 3" [ref=f1e298]
                        - button "Afinidad 3 por descubrir. BLOQUEADA. Nivel 0 de 3" [ref=f1e304]
                        - button "Afinidad 3 por descubrir. BLOQUEADA. Nivel 0 de 3" [ref=f1e310]
                        - button "Afinidad 3 por descubrir. BLOQUEADA. Nivel 0 de 3" [ref=f1e316]
                        - button "Afinidad 3 por descubrir. BLOQUEADA. Nivel 0 de 3" [ref=f1e322]
                        - button "Afinidad 3 por descubrir. BLOQUEADA. Nivel 0 de 3" [ref=f1e328]
                        - button "Afinidad 3 por descubrir. BLOQUEADA. Nivel 0 de 3" [ref=f1e334]
                        - button "Afinidad 3 por descubrir. BLOQUEADA. Nivel 0 de 3" [ref=f1e340]
                        - button "Afinidad 3 por descubrir. BLOQUEADA. Nivel 0 de 3" [ref=f1e346]
                        - button "Afinidad 1 + Afinidad 2. BLOQUEADA. Nivel 0 de 3" [ref=f1e352]
                        - button "Afinidad 1 + Afinidad 2. BLOQUEADA. Nivel 0 de 3" [ref=f1e358]
                        - button "Afinidad 1 + Afinidad 2. BLOQUEADA. Nivel 0 de 3" [ref=f1e364]
                        - button "Afinidad 2 + Afinidad 3. BLOQUEADA. Nivel 0 de 3" [ref=f1e370]
                        - button "Afinidad 2 + Afinidad 3. BLOQUEADA. Nivel 0 de 3" [ref=f1e376]
                        - button "Afinidad 2 + Afinidad 3. BLOQUEADA. Nivel 0 de 3" [ref=f1e382]
                        - button "Afinidad 1 + Afinidad 3. BLOQUEADA. Nivel 0 de 3" [ref=f1e388]
                        - button "Afinidad 1 + Afinidad 3. BLOQUEADA. Nivel 0 de 3" [ref=f1e394]
                        - button "Afinidad 1 + Afinidad 3. BLOQUEADA. Nivel 0 de 3" [ref=f1e400]
                        - button "Núcleo de Akio. Yin yang · Sin fecha de nacimiento. Centrar el árbol" [ref=f1e406]:
                          - generic: PERSONAJE
                      - navigation "Navegación del árbol" [ref=f1e415]:
                        - button "Alejar árbol" [ref=f1e416]: −
                        - button "Acercar árbol" [ref=f1e417]: +
                        - button "Mostrar árbol completo" [ref=f1e418]: ⛶
                        - button "Centrar en Resonancia" [ref=f1e419]: ◎
                      - generic: Arrastra para explorar · Rueda para ampliar
                    - generic [ref=f1e420]:
                      - generic [ref=f1e421]:
                        - generic [ref=f1e422]: Físicas
                        - generic [ref=f1e424]: A1 · Fuego
                        - generic [ref=f1e426]: A2
                        - generic [ref=f1e428]: A3
                        - generic [ref=f1e430]: A1 + A2
                        - generic [ref=f1e432]: A2 + A3
                        - generic [ref=f1e434]: A1 + A3
                      - generic [ref=f1e436]:
                        - generic [ref=f1e437]: Bloqueada
                        - generic [ref=f1e439]: Disponible
                        - generic [ref=f1e441]: Aprendida
                        - generic [ref=f1e443]: Mejorada
                        - generic [ref=f1e445]: 3/38 habilidades · Personaje central
                  - region "Detalle de habilidad" [ref=f1e446]:
                    - complementary [ref=f1e447]:
                      - generic [ref=f1e448]:
                        - paragraph [ref=f1e449]: DISCIPLINA FÍSICA
                        - heading "Disciplina del cuerpo" [level=3] [ref=f1e450]
                        - generic [ref=f1e451]:
                          - generic [aria-hidden] [ref=f1e452]: 拳
                          - generic [ref=f1e453]:
                            - strong [ref=f1e454]: Independiente de las afinidades
                            - generic [ref=f1e455]: APRENDIDA
                        - paragraph [ref=f1e456]: Técnica física independiente. +5 vida máxima por nivel.
                        - generic [ref=f1e457]:
                          - generic [ref=f1e458]: Resistencia
                          - strong [ref=f1e459]: NIVEL 1 / 3
                        - generic [ref=f1e460]:
                          - heading "Efectos en combate" [level=4] [ref=f1e461]
                          - paragraph [ref=f1e462]: +5 vida máxima por nivel
                        - generic [ref=f1e463]:
                          - heading "Requisitos de progresión" [level=4] [ref=f1e464]
                          - paragraph [ref=f1e465]: Desde el Núcleo de Resonancia
                          - paragraph [ref=f1e466]: Requisitos cumplidos
                        - paragraph [ref=f1e467]: Pasiva permanente · No ocupa ranura de combate
                      - generic [ref=f1e468]:
                        - button "MEJORAR · 1 PR" [ref=f1e469]
                        - paragraph [ref=f1e470]: La especialización se aplica automáticamente al combatir.
            - paragraph [ref=f1e471]: Los cambios se guardan automáticamente.
```

# Test source

```ts
  8   |     window.__renderSample = { count: 0, callback: renderer => { if (renderer) window.__renderSample.count++; } };
  9   |     game.events.on("prerender", window.__renderSample.callback);
  10  |   });
  11  |   await page.waitForTimeout(950);
  12  |   return page.evaluate(() => {
  13  |     window.__performanceReference.game.events.off("prerender", window.__renderSample.callback);
  14  |     return window.__renderSample.count;
  15  |   });
  16  | }
  17  | 
  18  | test("rendimiento: la subida de nivel deja de dibujar escenas mientras espera", async ({ page }, info) => {
  19  |   await page.emulateMedia({ reducedMotion: "no-preference" });
  20  |   await bootPerformanceReference(page);
  21  |   await page.evaluate(async () => {
  22  |     const state = window.__performanceReference;
  23  |     const { LevelUpScene } = await import("/src/battle/scenes/level-up-scene.js?v=0.95.0");
  24  |     state.game.scene.add("level-up", LevelUpScene);
  25  |     const preview = structuredClone(state.scene.saveData);
  26  |     preview.progression.level++; preview.progression.attributePoints += 2;
  27  |     window.__levelPreview = state.scene.showPendingLevelUp(preview);
  28  |   });
  29  |   await expect(page.locator(".level-up-accessible")).toBeAttached({ timeout: 20000 });
  30  |   await expect.poll(() => page.evaluate(() => {
  31  |     const scene = window.__performanceReference.game.scene.getScene("level-up");
  32  |     return scene.children.getByName("level-up-panel")?.list.some(item => item.name === "level-up-continue" && item.input?.enabled);
  33  |   })).toBe(true);
  34  |   if (!process.env.TUTORIAL_BASELINE) await expect.poll(() => page.evaluate(() => window.__performanceReference.game.scene.getScene("level-up").staticConfirmation)).toBe(true);
  35  |   else await page.waitForTimeout(2200);
  36  |   await page.waitForTimeout(150);
  37  |   const renders = await sampleRendering(page);
  38  |   await info.attach("renderizado-subida", { body: JSON.stringify({ renders, milliseconds: 950 }), contentType: "application/json" });
  39  |   console.log(`Subida de nivel: ${renders} renders / 950 ms`);
  40  |   if (!process.env.TUTORIAL_BASELINE) expect(renders).toBeLessThanOrEqual(2);
  41  |   await page.keyboard.press("Enter");
  42  |   await expect.poll(() => page.evaluate(() => window.__performanceReference.scene.scene.isActive())).toBe(true);
  43  |   await page.evaluate(async () => { await window.__levelPreview; window.__performanceReference.game.destroy(true); });
  44  | });
  45  | 
  46  | test("rendimiento: la decisión del teniente conserva un fondo estático e interactivo", async ({ page }, info) => {
  47  |   await bootPerformanceReference(page);
  48  |   await page.evaluate(() => { window.__choice = window.__performanceReference.scene.playPrisonerChoice(); });
  49  |   await page.waitForTimeout(350);
  50  |   const renders = await sampleRendering(page);
  51  |   await info.attach("renderizado-decision", { body: JSON.stringify({ renders, milliseconds: 950 }), contentType: "application/json" });
  52  |   console.log(`Decisión del teniente: ${renders} renders / 950 ms`);
  53  |   if (!process.env.TUTORIAL_BASELINE) expect(renders).toBeLessThanOrEqual(2);
  54  |   const box = await page.locator("#game > canvas").boundingBox();
  55  |   await page.mouse.click(box.x + 330 / 960 * box.width, box.y + 350 / 540 * box.height);
  56  |   await page.evaluate(async () => { await window.__choice; });
  57  |   expect(await page.evaluate(() => window.__performanceReference.scene.saveData.campaign.banditPrisonerChoice)).toBe("interrogate");
  58  |   await page.evaluate(() => window.__performanceReference.game.destroy(true));
  59  | });
  60  | 
  61  | async function seedVillage(page, { trained = false, bodyType = "male" } = {}) {
  62  |   await page.goto("/");
  63  |   await page.evaluate(async ({ trained, bodyType }) => {
  64  |     const { createDefaultSave, createCharacter, writeSave } = await import("/src/save.js?v=0.131.0");
  65  |     localStorage.clear(); sessionStorage.clear();
  66  |     const save = createCharacter(createDefaultSave(), { name: "Akio", affinity: "fuego", bodyType });
  67  |     save.campaign.tutorialSeen = true;
  68  |     save.campaign.npcIntroductions = ["headquarters:ren", "dojo:mei", "dojo:daichi", "shop:hana"];
  69  |     if (trained) {
  70  |       save.campaign.completedMissions = ["m01"];
  71  |       save.progression.level = 2; save.progression.attributePoints = 2; save.progression.coins = 100;
  72  |     }
  73  |     writeSave(save); sessionStorage.setItem("cronicas-save-slot-selected", "1"); localStorage.setItem("music-enabled", "off");
  74  |   }, { trained, bodyType });
  75  |   await page.reload(); await expect(page.locator(".village-map")).toBeVisible();
  76  | }
  77  | 
  78  | for (const [bodyType, master] of [["male", "mei"], ["female", "daichi"]]) test(`la ayuda de ${master} se integra con Ren y se puede cerrar`, async ({ page }, info) => {
  79  |   await seedVillage(page, { bodyType });
  80  |   await expect(page.locator(".saga-tutorial-coach")).toHaveCount(0);
  81  |   await page.locator('[data-go="headquarters"]').click();
  82  |   const dialogue = page.locator(".stage-ambient .saga-tutorial-coach");
  83  |   await expect(dialogue).toBeVisible();
  84  |   await expect(dialogue.locator(`[data-tutorial-speaker="${master}"]`)).toBeVisible();
  85  |   await expect(dialogue.locator('[data-tutorial-speaker="ren"]')).toBeVisible();
  86  |   expect(await dialogue.evaluate(el => getComputedStyle(el).position)).not.toBe("absolute");
  87  |   await dialogue.locator("[data-coach-close]").click(); await expect(dialogue).toBeHidden();
  88  |   await page.locator("[data-coach-open]").click(); await expect(dialogue).toBeVisible();
  89  |   await page.screenshot({ path: info.outputPath(`dialogo-${master}-ren.png`) });
  90  | });
  91  | 
  92  | test("el Dojo señala la pestaña, el atributo, el hexágono y el botón correcto", async ({ page }, info) => {
  93  |   await seedVillage(page, { trained: true });
  94  |   await page.locator('[data-go="headquarters"]').click(); await page.locator('[data-saga="saga-1"]').click();
  95  |   await page.locator('[data-mission="s01"]').click();
  96  |   const dialogue = page.locator(".saga-tutorial-coach");
  97  |   await expect(page.locator('[data-dojo-tab="statistics"]')).toHaveClass(/saga-tutorial-target/);
  98  |   await dialogue.locator("[data-coach-go]").click();
  99  |   await expect(page.locator('[data-attribute="health"]')).toHaveClass(/saga-tutorial-target/);
  100 |   await expect(dialogue).toContainText("punto de atributo");
  101 |   await page.screenshot({ path: info.outputPath("atributos-paso-exacto.png") });
  102 |   await page.locator('[data-attribute="health"]').click();
  103 |   await dialogue.locator("[data-coach-go]").click();
  104 |   await expect(page.locator('[data-skill-select="physical_0"]')).toHaveClass(/saga-tutorial-target/);
  105 |   await dialogue.locator("[data-coach-go]").click();
  106 |   await expect(page.locator('[data-skill-invest="physical_0"]')).toHaveClass(/saga-tutorial-target/);
  107 |   await page.locator('[data-skill-select]').last().hover();
> 108 |   await expect(page.locator(".technique-detail h3")).toHaveText("Disciplina del cuerpo");
      |                                                      ^ Error: expect(locator).toHaveText(expected) failed
  109 |   await page.locator('[data-skill-invest="physical_0"]').click();
  110 |   await expect(page.locator('[data-skill-select="physical_1"]')).toHaveClass(/saga-tutorial-target/);
  111 |   await dialogue.locator("[data-coach-go]").click();
  112 |   await expect(page.locator('[data-skill-invest="physical_1"]')).toHaveClass(/saga-tutorial-target/);
  113 |   await expect(page.locator(".technique-detail h3")).toHaveText("Puño de hierro");
  114 |   await page.screenshot({ path: info.outputPath("pr-habilidad-correcta.png") });
  115 | });
  116 | 
  117 | for (const width of [1280, 1600]) test(`la descripción del shuriken cabe en la tarjeta a ${width}`, async ({ page }, info) => {
  118 |   await page.setViewportSize({ width, height: width === 1280 ? 720 : 900 });
  119 |   await seedVillage(page); await page.locator('[data-go="dojo"]').click();
  120 |   await page.locator('[data-dojo-tab="equipment"]').click();
  121 |   const card = page.locator('[data-gear-slot="throwable"]');
  122 |   const bounds = await card.evaluate(el => {
  123 |     const box = el.getBoundingClientRect(), text = el.querySelector(".gear-copy").getBoundingClientRect();
  124 |     return { bottom: text.bottom <= box.bottom - 5, right: text.right <= box.right - 5, scroll: el.scrollHeight <= el.clientHeight + 1 };
  125 |   });
  126 |   expect(bounds).toEqual({ bottom: true, right: true, scroll: true });
  127 |   await card.screenshot({ path: info.outputPath(`shuriken-${width}.png`) });
  128 | });
  129 | 
  130 | test("0 y Numpad0 cambian la tabla una vez sin gastar turno ni recursos", async ({ page }) => {
  131 |   await bootPerformanceReference(page);
  132 |   await page.evaluate(() => { const s = window.__performanceReference.scene; s.busy = false; s.turnReady = true; s.refreshHud(); });
  133 |   const before = await page.evaluate(() => { const s = window.__performanceReference.scene; return [s.round, s.player.hp, s.player.chakra]; });
  134 |   await page.keyboard.press("0"); await expect(page.locator(".combat-access")).toHaveAttribute("data-skill-table", "physical");
  135 |   await page.keyboard.press("Numpad0"); await expect(page.locator(".combat-access")).toHaveAttribute("data-skill-table", "elemental");
  136 |   expect(await page.evaluate(() => { const s = window.__performanceReference.scene; return [s.round, s.player.hp, s.player.chakra]; })).toEqual(before);
  137 |   await page.evaluate(() => { const field = document.createElement("input"); field.id = "shortcut-input"; document.body.append(field); field.focus(); });
  138 |   await page.keyboard.press("0"); await expect(page.locator("#shortcut-input")).toHaveValue("0");
  139 |   await expect(page.locator(".combat-access")).toHaveAttribute("data-skill-table", "elemental");
  140 |   await page.evaluate(() => { document.getElementById("shortcut-input").remove(); window.__performanceReference.game.destroy(true); });
  141 | });
  142 | 
```