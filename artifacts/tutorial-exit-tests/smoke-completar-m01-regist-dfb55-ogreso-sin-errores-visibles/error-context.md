# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.mjs >> completar m01 registra el progreso sin errores visibles
- Location: tests\smoke.spec.mjs:340:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false

Call Log:
- Test timeout of 90000ms exceeded
```

# Page snapshot

```yaml
- main [ref=f1e2]:
  - region "Juego de combate por turnos" [ref=f1e3]:
    - region "Interfaz de combate":
      - generic:
        - generic:
          - strong: SMOKE M01
          - generic:
            - text: PV
            - progressbar "Vida"
            - text: 584/584
          - generic:
            - text: CH
            - progressbar "Chakra"
            - text: 362/362
        - generic:
          - strong: BANDIDO
          - generic:
            - text: PV
            - progressbar "Vida"
            - text: 65/65
          - generic:
            - text: CH
            - progressbar "Chakra"
            - text: 21/21
        - status:
          - strong: TURNO DE SMOKE M01
          - button "Pausar combate (Escape)" [ref=f1e5] [cursor=pointer]: Ⅱ
      - generic:
        - button "1. Golpe veloz, 0 CH" [active] [pressed] [ref=f1e7] [cursor=pointer]:
          - generic [aria-hidden] [ref=f1e8]: "1"
          - generic [ref=f1e11]:
            - generic [ref=f1e12]: Golpe veloz
            - generic [ref=f1e13]: 0 CH
        - button "2. Fénix escarlata, 34 CH" [ref=f1e15] [cursor=pointer]:
          - generic [aria-hidden] [ref=f1e16]: "2"
          - generic [ref=f1e19]: 鳳
          - generic [ref=f1e20]:
            - generic [ref=f1e21]: Fénix escarlata
            - generic [ref=f1e22]: 34 CH
        - button "3. Marca ardiente, 16 CH" [ref=f1e24] [cursor=pointer]:
          - generic [aria-hidden] [ref=f1e25]: "3"
          - generic [ref=f1e28]:
            - generic [ref=f1e29]: Marca ardiente
            - generic [ref=f1e30]: 16 CH
        - button "4. Arco de llama, 12 CH" [ref=f1e32] [cursor=pointer]:
          - generic [aria-hidden] [ref=f1e33]: "4"
          - generic [ref=f1e36]:
            - generic [ref=f1e37]: Arco de llama
            - generic [ref=f1e38]: 12 CH
        - button "5. Aliento de brasa, 18 CH" [ref=f1e40] [cursor=pointer]:
          - generic [aria-hidden] [ref=f1e41]: "5"
          - generic [ref=f1e44]: 炎
          - generic [ref=f1e45]:
            - generic [ref=f1e46]: Aliento de brasa
            - generic [ref=f1e47]: 18 CH
        - button "6. Guardia, 0 CH" [ref=f1e49] [cursor=pointer]:
          - generic [aria-hidden] [ref=f1e50]: "6"
          - generic [ref=f1e53]:
            - generic [ref=f1e54]: Guardia
            - generic [ref=f1e55]: 0 CH
      - generic:
        - strong: ORDEN DE TURNO · preparación 80–100 %
        - generic:
          - text: Smoke m01
          - progressbar "Smoke m01"
        - generic:
          - text: BANDIDO
          - progressbar "BANDIDO"
      - status: Tu iniciativa está lista. Elige una acción.
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | 
  3   | async function advanceDialogue(page) {
  4   |   const overlay = page.locator(".dialogue-overlay");
  5   |   await expect(overlay).toBeVisible();
  6   |   for (let guard = 0; guard < 12 && await overlay.isVisible(); guard += 1) {
  7   |     await overlay.locator("button").click();
  8   |   }
  9   |   await expect(overlay).toHaveCount(0);
  10  | }
  11  | 
  12  | async function clickCanvasPoint(page, box, xRatio, yRatio) {
  13  |   await page.mouse.click(box.x + box.width * xRatio, box.y + box.height * yRatio);
  14  | }
  15  | 
  16  | async function createFreshCharacter(page, name = "Smoke", bodyType = "male") {
  17  |   await page.goto("/");
  18  |   await page.locator('[data-select-slot="1"]').click();
  19  |   await page.locator('input[name="name"]').fill(name);
  20  |   await page.locator('select[name="bodyType"]').selectOption(bodyType);
  21  |   await page.locator("#character-form").getByRole("button", { name: "CREAR PERSONAJE" }).click();
  22  |   await advanceDialogue(page);
  23  | }
  24  | 
  25  | async function powerUpActiveCharacter(page) {
  26  |   await page.evaluate(() => {
  27  |     const slot = localStorage.getItem("cronicas-del-sello-save-active-slot") || "1";
  28  |     const key = `cronicas-del-sello-save-slot-${slot}`;
  29  |     const save = JSON.parse(localStorage.getItem(key));
  30  |     save.progression.level = 30;
  31  |     save.progression.attributes = { health: 250, strength: 250, speed: 250, chakra: 250, luck: 250 };
  32  |     save.character.affinityXp = { ...save.character.affinityXp, fuego: 10_000 };
  33  |     save.loadout = ["fire_phoenix", "fire_brand", "fire_arc", "fire_breath"];
  34  |     localStorage.setItem("seal-input-mode", "automatic");
  35  |     localStorage.setItem(key, JSON.stringify(save));
  36  |   });
  37  |   await page.reload();
  38  |   await expect(page.locator(".debug-tools-trigger")).toBeVisible();
  39  | }
  40  | 
  41  | async function completedMissionIds(page) {
  42  |   return page.evaluate(() => {
  43  |     const slot = localStorage.getItem("cronicas-del-sello-save-active-slot") || "1";
  44  |     const raw = localStorage.getItem(`cronicas-del-sello-save-slot-${slot}`);
  45  |     return raw ? JSON.parse(raw).campaign.completedMissions : [];
  46  |   });
  47  | }
  48  | 
  49  | async function completeDebugMission(page, { checkpoint, missionId }) {
  50  |   await page.locator(".debug-tools-trigger").click();
  51  |   await page.locator(`[data-debug-checkpoint="${checkpoint}"]`).click();
  52  |   await page.locator(".debug-tools-trigger").click();
  53  |   await page.locator(`[data-debug-mission="${missionId}"]`).click();
  54  |   const canvas = page.locator("#game canvas");
  55  |   await expect(canvas).toHaveCount(1);
  56  | 
  57  |   await expect.poll(async () => {
  58  |     const tutorialSkip = page.locator("[data-tutorial-skip]");
  59  |     if (await tutorialSkip.isVisible().catch(() => false)) await tutorialSkip.click();
  60  |     if (await page.locator(".level-up-accessible").isVisible().catch(() => false)) await page.keyboard.press("Enter");
  61  |     const investigation = page.locator(".mission-investigation-overlay");
  62  |     if (await investigation.isVisible().catch(() => false)) {
  63  |       for (const region of ["cart", "house", "tracks"]) {
  64  |         await investigation.locator(`[data-investigation-region="${region}"]`).click({ force: true });
  65  |       }
  66  |       await investigation.locator("[data-mission-investigation-continue]").click();
  67  |     }
  68  | 
  69  |     const box = await canvas.boundingBox().catch(() => null);
  70  |     if (box) {
  71  |       await clickCanvasPoint(page, box, 480 / 960, 340 / 540);
  72  |       await clickCanvasPoint(page, box, 355 / 960, 340 / 540);
  73  |       await clickCanvasPoint(page, box, 608 / 960, 478 / 540);
  74  |       await clickCanvasPoint(page, box, 846 / 960, 238 / 540);
  75  |       const action = page.locator('.combat-access-actions button[aria-disabled="false"]').first();
  76  |       if (await action.isVisible().catch(() => false)) await action.click({ force: true, timeout: 1_000 }).catch(() => {});
  77  |       else await page.keyboard.press("1");
> 78  |     }
      |                                                       ^ Error: expect(received).toBe(expected) // Object.is equality
  79  |     return (await completedMissionIds(page)).includes(missionId);
  80  |   }, { timeout: 85_000, intervals: [250, 350, 500] }).toBe(true);
  81  | }
  82  | 
  83  | test("el perfil femenino carga la marioneta femenina", async ({ page }) => {
  84  |   await page.addInitScript(() => {
  85  |     localStorage.clear();
  86  |     sessionStorage.clear();
  87  |     localStorage.setItem("music-enabled", "off");
  88  |   });
  89  |   await createFreshCharacter(page, "Kira", "female");
  90  |   await page.locator(".debug-tools-trigger").click();
  91  |   await page.locator('[data-debug-view="dojo"]').click();
  92  |   await page.locator('[data-dojo-tab="statistics"]').click();
  93  |   await expect(page.locator("#dojo-panel-statistics .puppet-preview-layer").first()).toHaveAttribute("src", /woman_sprites\/runtime/);
  94  | 
  95  |   await page.locator(".debug-tools-trigger").click();
  96  |   await page.locator('[data-debug-view="headquarters"]').click();
  97  |   const femaleTorso = page.waitForResponse((response) => response.url().includes("woman_sprites/runtime/torso.png"));
  98  |   await page.locator('[data-saga="saga-1"]').click();
  99  |   await page.locator('[data-mission="m01"]').click();
  100 |   await advanceDialogue(page);
  101 |   await femaleTorso;
  102 |   await expect(page.locator("#game canvas")).toHaveCount(1);
  103 |   await expect.poll(() => page.evaluate(() => window.Phaser?.VERSION)).toBe("4.2.1");
  104 | });
  105 | 
  106 | test("crear partida, lanzar m01 y volver a la aldea libera Phaser", async ({ page }) => {
  107 |   const browserErrors = [];
  108 |   page.on("console", (message) => {
  109 |     if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  110 |   });
  111 |   page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
  112 |   await page.addInitScript(() => {
  113 |     localStorage.clear();
  114 |     sessionStorage.clear();
  115 |     localStorage.setItem("music-enabled", "off");
  116 |     const nativeSetItem = Storage.prototype.setItem;
  117 |     window.__smokeSaveWrites = 0;
  118 |     Storage.prototype.setItem = function setItem(key, value) {
  119 |       if (String(key).startsWith("cronicas-del-sello-save-slot-")) window.__smokeSaveWrites += 1;
  120 |       return nativeSetItem.call(this, key, value);
  121 |     };
  122 |   });
  123 | 
  124 |   await page.goto("/");
  125 |   await page.locator('[data-select-slot="1"]').click();
  126 |   await page.locator('input[name="name"]').fill("Smoke");
  127 |   await page.locator("#character-form").getByRole("button", { name: "CREAR PERSONAJE" }).click();
  128 |   await advanceDialogue(page);
  129 | 
  130 |   await page.locator('[data-saga="saga-1"]').click();
  131 |   await page.locator('[data-mission="m01"]').click();
  132 |   const saveWritesBeforeLaunch = await page.evaluate(() => window.__smokeSaveWrites);
  133 |   await advanceDialogue(page);
  134 | 
  135 |   const canvas = page.locator("#game canvas");
  136 |   await expect(canvas).toHaveCount(1);
  137 |   await expect(page.locator("#game")).toBeVisible();
  138 |   await expect(page.locator("#meta")).toBeHidden();
  139 |   const canvasBox = await canvas.boundingBox();
  140 |   expect(canvasBox, "El canvas debe tener dimensiones visibles").not.toBeNull();
  141 | 
  142 |   await expect.poll(() => page.evaluate(() => window.__smokeSaveWrites), { timeout: 40_000 }).toBeGreaterThan(saveWritesBeforeLaunch + 1);
  143 |   await page.waitForTimeout(500);
  144 |   await page.locator("[data-tutorial-skip]").click();
  145 |   await page.waitForTimeout(500);
  146 |   await page.keyboard.press("Escape");
  147 |   await page.waitForTimeout(250);
  148 |   await clickCanvasPoint(page, canvasBox, 560 / 960, 454 / 540);
  149 |   await expect(page.locator("#game [role='alertdialog']")).toBeVisible();
  150 |   await clickCanvasPoint(page, canvasBox, 600 / 960, 354 / 540);
  151 |   await page.waitForTimeout(2_700);
  152 |   await clickCanvasPoint(page, canvasBox, 625 / 960, 485 / 540);
  153 | 
  154 |   await expect(page.locator("#meta")).toBeVisible({ timeout: 20_000 });
  155 |   await expect(page.locator("#game")).toBeHidden();
  156 |   await expect(canvas).toHaveCount(0);
  157 |   expect(browserErrors, "No debe haber errores de consola ni excepciones de página").toEqual([]);
  158 | });
  159 | 
  160 | test("recorrer todas las vistas meta no deja errores de navegador", async ({ page }) => {
  161 |   const browserErrors = [];
  162 |   page.on("console", (message) => {
  163 |     if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  164 |   });
  165 |   page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
  166 |   await page.addInitScript(() => {
  167 |     localStorage.clear();
  168 |     sessionStorage.clear();
  169 |     localStorage.setItem("music-enabled", "off");
  170 |   });
  171 |   await page.goto("/");
  172 |   await page.locator('[data-select-slot="1"]').click();
  173 |   await page.locator("#character-form").getByRole("button", { name: "CREAR PERSONAJE" }).click();
  174 |   await advanceDialogue(page);
  175 | 
  176 |   const visitFromDebug = async (view, assertion) => {
  177 |     await page.locator(".debug-tools-trigger").click();
  178 |     await page.locator(`[data-debug-view="${view}"]`).click();
```