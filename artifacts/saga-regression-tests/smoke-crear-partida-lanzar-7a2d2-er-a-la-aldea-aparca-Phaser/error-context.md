# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.mjs >> crear partida, lanzar m01 y volver a la aldea aparca Phaser
- Location: tests\smoke.spec.mjs:97:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('#game > canvas')
Expected: 1
Received: 0
Timeout:  8000ms

Call log:
  - Expect "toHaveCount" locator('#game > canvas') with timeout 8000ms
  - waiting for locator('#game > canvas')
    19 × locator resolved to 0 elements
       - unexpected value "0"

```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic "Controles generales":
    - generic:
      - paragraph: RPG 2D POR TURNOS
      - heading "Crónicas del Sello" [level=1]
    - group:
      - generic "Ajustes":
        - generic [aria-hidden]: ⚙
        - text: Ajustes
  - region "Dojo y progreso del personaje" [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e8]:
            - paragraph [ref=e9]: RANGO 1 · NOVICIO
            - heading "Smoke" [level=2] [ref=e10]
          - generic "Nivel 1" [ref=e11]:
            - generic [ref=e12]: NIVEL
            - strong [ref=e13]: "1"
        - generic "Progreso de la partida" [ref=e14]:
          - generic "0 de 120 puntos de experiencia" [ref=e15]:
            - strong [ref=e17]: 0/120
            - generic [ref=e18]: PX
          - generic "0 monedas" [ref=e19]:
            - strong [ref=e21]: "0"
            - generic [ref=e22]: monedas
        - generic "Acciones de la partida" [ref=e23]:
          - button "Abrir ajustes" [ref=e24]
      - button "Abrir herramientas de pruebas" [ref=e25]:
        - generic [ref=e26]: DEV
        - text: PRUEBAS
      - navigation "Navegación de la aldea" [ref=e27]:
        - button "← Volver al mapa" [ref=e28]
      - region "Cuartel General" [ref=e29]:
        - button "Hablar con Ren Arashiro" [ref=e30]:
          - img "Ren Arashiro" [ref=e31]
          - generic [ref=e32]: Ren Arashiro
        - generic [ref=e34]:
          - generic [ref=e35]:
            - button "← SAGAS" [ref=e36]
            - generic [ref=e37]:
              - paragraph [ref=e38]: SAGA 01
              - heading "Futuro prometedor" [level=2] [ref=e39]
              - paragraph [ref=e40]: Formación de Novicio · Tutorial completo de la aldea
            - strong [ref=e41]: 0/1
          - article [ref=e43]:
            - generic [ref=e44]: "01"
            - generic [ref=e45]:
              - paragraph [ref=e46]: MISIÓN CLASE D · Bosque del Este
              - heading "Tras las huellas del gato" [level=3] [ref=e47]
              - paragraph [ref=e48]: "Tutorial: Primer combate · combate · 8–10 min · 120 PX totales · 40 monedas"
            - button "INICIAR HISTORIA" [ref=e49]
      - complementary "Guía de formación de la saga 1" [ref=e50]:
        - generic [ref=e51]:
          - strong [ref=e52]: SAGA 1 · FORMACIÓN
          - button "Reducir guía" [ref=e53]: −
        - generic [ref=e54]:
          - text: Primer combate
          - heading "Práctica en misión" [level=3] [ref=e55]
          - paragraph [ref=e56]: Preparación completada. Vuelve al Cuartel para iniciar la práctica de esta misión.
          - button "Volver al Cuartel" [ref=e57]
          - status
```

# Test source

```ts
  28  |   await page.evaluate(() => {
  29  |     const slot = localStorage.getItem("cronicas-del-sello-save-active-slot") || "1";
  30  |     const key = `cronicas-del-sello-save-slot-${slot}`;
  31  |     const save = JSON.parse(localStorage.getItem(key));
  32  |     save.progression.level = 30;
  33  |     save.progression.attributes = { health: 250, strength: 250, speed: 250, chakra: 250, luck: 250 };
  34  |     save.character.affinityXp = { ...save.character.affinityXp, fuego: 10_000 };
  35  |     save.loadout = ["fire_phoenix", "fire_brand", "fire_arc", "fire_breath"];
  36  |     localStorage.setItem("seal-input-mode", "automatic");
  37  |     localStorage.setItem(key, JSON.stringify(save));
  38  |   });
  39  |   await page.reload();
  40  |   await expect(page.locator(".debug-tools-trigger")).toBeVisible();
  41  | }
  42  | 
  43  | async function completedMissionIds(page) {
  44  |   return page.evaluate(() => {
  45  |     const slot = localStorage.getItem("cronicas-del-sello-save-active-slot") || "1";
  46  |     const raw = localStorage.getItem(`cronicas-del-sello-save-slot-${slot}`);
  47  |     return raw ? JSON.parse(raw).campaign.completedMissions : [];
  48  |   });
  49  | }
  50  | 
  51  | async function completeDebugMission(page, { checkpoint, missionId }) {
  52  |   await page.locator(".debug-tools-trigger").click();
  53  |   await page.locator(`[data-debug-checkpoint="${checkpoint}"]`).click();
  54  |   await useLearnedTutorialSave(page);
  55  |   await page.locator(".debug-tools-trigger").click();
  56  |   await page.locator(`[data-debug-mission="${missionId}"]`).click();
  57  |   const canvas = page.locator("#game > canvas");
  58  |   await expect(canvas).toHaveCount(1);
  59  | 
  60  |   await expect.poll(async () => {
  61  |     if (await page.locator(".level-up-accessible").isVisible().catch(() => false)) await page.keyboard.press("Enter");
  62  |     const box = await canvas.boundingBox().catch(() => null);
  63  |     if (box) {
  64  |       await clickCanvasPoint(page, box, 480 / 960, 340 / 540);
  65  |       await clickCanvasPoint(page, box, 355 / 960, 340 / 540);
  66  |       await clickCanvasPoint(page, box, 608 / 960, 478 / 540);
  67  |       await clickCanvasPoint(page, box, 846 / 960, 238 / 540);
  68  |       await page.keyboard.press("1");
  69  |     }
  70  |     return (await completedMissionIds(page)).includes(missionId);
  71  |   }, { timeout: 85_000, intervals: [250, 350, 500] }).toBe(true);
  72  | }
  73  | 
  74  | test("el perfil femenino carga la marioneta femenina", async ({ page }) => {
  75  |   await page.addInitScript(() => {
  76  |     localStorage.clear();
  77  |     sessionStorage.clear();
  78  |     localStorage.setItem("music-enabled", "off");
  79  |   });
  80  |   await createFreshCharacter(page, "Kira", "female");
  81  |   await page.locator(".debug-tools-trigger").click();
  82  |   await page.locator('[data-debug-view="dojo"]').click();
  83  |   await page.locator('[data-dojo-tab="statistics"]').click();
  84  |   await expect(page.locator("#dojo-panel-statistics .puppet-preview-layer").first()).toHaveAttribute("src", /woman_sprites\/runtime/);
  85  | 
  86  |   await page.locator(".debug-tools-trigger").click();
  87  |   await page.locator('[data-debug-view="headquarters"]').click();
  88  |   const femaleTorso = page.waitForResponse((response) => response.url().includes("woman_sprites/runtime/torso.png"));
  89  |   await page.locator('[data-saga="saga-1"]').click();
  90  |   await page.locator('[data-mission="m01"]').click();
  91  |   await advanceDialogue(page);
  92  |   await femaleTorso;
  93  |   await expect(page.locator("#game > canvas")).toHaveCount(1);
  94  |   await expect.poll(() => page.evaluate(() => window.Phaser?.VERSION)).toBe("4.2.1");
  95  | });
  96  | 
  97  | test("crear partida, lanzar m01 y volver a la aldea aparca Phaser", async ({ page }) => {
  98  |   const browserErrors = [];
  99  |   page.on("console", (message) => {
  100 |     if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  101 |   });
  102 |   page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
  103 |   await page.addInitScript(() => {
  104 |     localStorage.clear();
  105 |     sessionStorage.clear();
  106 |     localStorage.setItem("music-enabled", "off");
  107 |     const nativeSetItem = Storage.prototype.setItem;
  108 |     window.__smokeSaveWrites = 0;
  109 |     Storage.prototype.setItem = function setItem(key, value) {
  110 |       if (String(key).startsWith("cronicas-del-sello-save-slot-")) window.__smokeSaveWrites += 1;
  111 |       return nativeSetItem.call(this, key, value);
  112 |     };
  113 |   });
  114 | 
  115 |   await page.goto("/");
  116 |   await page.locator('[data-select-slot="1"]').click();
  117 |   await page.locator('input[name="name"]').fill("Smoke");
  118 |   await page.locator("#character-form").getByRole("button", { name: "CREAR PERSONAJE" }).click();
  119 |   await advanceDialogue(page);
  120 | 
  121 |   await useLearnedTutorialSave(page);
  122 |   await page.locator('[data-saga="saga-1"]').click();
  123 |   await page.locator('[data-mission="m01"]').click();
  124 |   const saveWritesBeforeLaunch = await page.evaluate(() => window.__smokeSaveWrites);
  125 |   await advanceDialogue(page);
  126 | 
  127 |   const canvas = page.locator("#game > canvas");
> 128 |   await expect(canvas).toHaveCount(1);
      |                        ^ Error: expect(locator).toHaveCount(expected) failed
  129 |   await expect(page.locator("#game")).toBeVisible();
  130 |   await expect(page.locator("#meta")).toBeHidden();
  131 |   const canvasBox = await canvas.boundingBox();
  132 |   expect(canvasBox, "El canvas debe tener dimensiones visibles").not.toBeNull();
  133 | 
  134 |   await expect.poll(() => page.evaluate(() => window.__smokeSaveWrites), { timeout: 40_000 }).toBeGreaterThan(saveWritesBeforeLaunch + 1);
  135 |   await page.waitForTimeout(500);
  136 |   await page.waitForTimeout(500);
  137 |   await page.keyboard.press("Escape");
  138 |   await page.waitForTimeout(250);
  139 |   await page.getByRole("button", { name: "ABANDONAR", exact: true }).click();
  140 |   await expect(page.locator("#game [role='alertdialog']")).toBeVisible();
  141 |   await page.getByRole("button", { name: "Abandonar misión y perder recompensas", exact: true }).click();
  142 |   await page.waitForTimeout(2_700);
  143 |   await clickCanvasPoint(page, canvasBox, 625 / 960, 485 / 540);
  144 | 
  145 |   await expect(page.locator("#meta")).toBeVisible({ timeout: 20_000 });
  146 |   await expect(page.locator("#game")).toBeHidden();
  147 |   await expect(canvas).toHaveCount(1);
  148 |   expect(browserErrors, "No debe haber errores de consola ni excepciones de página").toEqual([]);
  149 | });
  150 | 
  151 | test("recorrer todas las vistas meta no deja errores de navegador", async ({ page }) => {
  152 |   const browserErrors = [];
  153 |   page.on("console", (message) => {
  154 |     if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  155 |   });
  156 |   page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
  157 |   await page.addInitScript(() => {
  158 |     localStorage.clear();
  159 |     sessionStorage.clear();
  160 |     localStorage.setItem("music-enabled", "off");
  161 |   });
  162 |   await page.goto("/");
  163 |   await page.locator('[data-select-slot="1"]').click();
  164 |   await page.locator("#character-form").getByRole("button", { name: "CREAR PERSONAJE" }).click();
  165 |   await advanceDialogue(page);
  166 | 
  167 |   const visitFromDebug = async (view, assertion) => {
  168 |     await page.locator(".debug-tools-trigger").click();
  169 |     await page.locator(`[data-debug-view="${view}"]`).click();
  170 |     await expect(page.locator(assertion)).toBeVisible();
  171 |   };
  172 | 
  173 |   await page.locator(".debug-tools-trigger").click();
  174 |   await expect(page.locator(".debug-screen")).toBeVisible();
  175 |   await page.locator('[data-debug-checkpoint="library-ready"]').click();
  176 |   await visitFromDebug("plaza", ".village-map");
  177 |   await visitFromDebug("headquarters", ".saga-selector");
  178 |   await visitFromDebug("missions", ".stage-panel");
  179 |   await expect(page.locator(".stage-panel")).toContainText("ACCESO BLOQUEADO");
  180 |   await visitFromDebug("kagemori", ".kagemori-investigation, .kagemori-complete");
  181 |   await visitFromDebug("dojo", ".dojo-layout");
  182 |   await expect(page.locator("[data-dojo-tab='techniques']")).toHaveAttribute("aria-selected", "true");
  183 |   await expect(page.locator(".technique-element-art")).toBeVisible();
  184 |   await page.locator("[data-dojo-tab='equipment']").click();
  185 |   await expect(page.locator(".equipment-columns")).toBeVisible();
  186 |   const equipmentPanelHeight = (await page.locator(".dojo-main-panel").boundingBox())?.height;
  187 |   const equipmentMenuHeight = (await page.locator(".location-dojo .stage-options").boundingBox())?.height;
  188 |   await expect(page.locator('[data-gear-slot="companion"]')).toBeEnabled();
  189 |   await page.locator("[data-open-master]").click();
  190 |   await expect(page.locator(".master-modal")).toBeVisible();
  191 |   await expect(page.locator(".master-modal [data-master]")).toHaveCount(2);
  192 |   await page.locator("[data-close-master]").click();
  193 |   await expect(page.locator(".master-summary-card .master-role")).toHaveText(/Instructora|Maestro/);
  194 |   await expect(page.locator(".master-unlock-note")).toHaveCount(0);
  195 |   await page.locator("[data-dojo-tab='statistics']").click();
  196 |   await expect(page.locator(".stat-radar")).toBeVisible();
  197 |   await expect(page.locator("#dojo-panel-statistics .puppet-preview-rig")).toBeVisible();
  198 |   await expect(page.locator(".attribute-card")).toHaveCount(5);
  199 |   expect((await page.locator(".dojo-main-panel").boundingBox())?.height).toBe(equipmentPanelHeight);
  200 |   expect((await page.locator(".location-dojo .stage-options").boundingBox())?.height).toBe(equipmentMenuHeight);
  201 |   await page.locator("[data-dojo-tab='appearance']").click();
  202 |   await expect(page.locator("#dojo-panel-appearance .puppet-preview-rig")).toBeVisible();
  203 |   await expect(page.locator('[data-cosmetic-step="face"]').first()).toBeDisabled();
  204 |   await expect(page.locator('[data-cosmetic-value="hair"]')).toHaveText("Peinado corto");
  205 |   await expect(page.locator('[data-cosmetic-control="outfit"] [data-cosmetic-step]').first()).toBeDisabled();
  206 |   await expect(page.locator('[data-cosmetic-control="outfit"] .cosmetic-label')).toHaveText("Traje completo");
  207 |   await expect(page.locator('[data-cosmetic-control="outfit"]')).toContainText("Sin traje completo");
  208 |   await expect(page.locator("#dojo-panel-appearance .puppet-preview-hair")).toHaveAttribute("src", /hair_corto\.png/);
  209 |   await expect(page.locator("#dojo-panel-appearance .raster-character-floor")).toHaveCount(0);
  210 |   expect((await page.locator(".dojo-main-panel").boundingBox())?.height).toBe(equipmentPanelHeight);
  211 |   expect((await page.locator(".location-dojo .stage-options").boundingBox())?.height).toBe(equipmentMenuHeight);
  212 |   await page.locator('[data-cosmetic-step="hair"][data-direction="1"]').click();
  213 |   await expect(page.locator('[data-cosmetic-value="hair"]')).toHaveText("Sin cabello");
  214 |   await expect(page.locator("#dojo-panel-appearance .puppet-preview-hair")).toHaveCount(0);
  215 |   await page.locator("[data-dojo-tab='techniques']").click();
  216 |   await page.locator("[data-skill-select='fire_breath']").click();
  217 |   await expect(page.locator(".technique-detail h3")).toHaveText("Aliento de brasa");
  218 |   await expect(page.locator("[data-equipped-count]")).toHaveText("2/2 EQUIPADAS");
  219 |   await page.locator("[data-technique-toggle='fire_breath']").click();
  220 |   await expect(page.locator("[data-equipped-count]")).toHaveText("1/2 EQUIPADAS");
  221 |   await expect(page.locator("[data-skill-select='fire_breath'] .skill-state")).toHaveText("APRENDIDA");
  222 |   await page.locator("[data-skill-select='fire_breath']").click();
  223 |   await expect(page.locator("[data-equipped-count]")).toHaveText("1/2 EQUIPADAS");
  224 |   await page.locator("[data-technique-toggle='fire_breath']").click();
  225 |   await expect(page.locator("[data-equipped-count]")).toHaveText("2/2 EQUIPADAS");
  226 |   await expect(page.locator("[data-skill-select='fire_breath'] .skill-state")).toHaveText("EN COMBATE · RANURA 2");
  227 |   await page.locator("[data-technique-toggle='fire_breath']").click();
  228 |   await expect(page.locator("[data-equipped-count]")).toHaveText("1/2 EQUIPADAS");
```