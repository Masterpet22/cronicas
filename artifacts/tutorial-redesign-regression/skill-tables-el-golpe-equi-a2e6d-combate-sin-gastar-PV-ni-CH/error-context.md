# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: skill-tables.spec.mjs >> el golpe equipado llega al combate sin gastar PV ni CH
- Location: tests\skill-tables.spec.mjs:134:1

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: locator.click: Test timeout of 90000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Cambiar a habilidades físicas', exact: true })

```

# Page snapshot

```yaml
- main [ref=e2]:
  - region "Juego de combate por turnos" [ref=e3]:
    - region "Interfaz de combate":
      - generic:
        - generic:
          - strong: REFERENCIA
          - generic:
            - text: PV
            - progressbar "Vida"
            - text: 147/147
          - generic:
            - text: CH
            - progressbar "Chakra"
            - text: 101/101
        - generic:
          - strong: RASTREADOR BANDIDO
          - generic:
            - text: PV
            - progressbar "Vida"
            - text: 63/63
          - generic:
            - text: CH
            - progressbar "Chakra"
            - text: 41/41
        - status:
          - strong: EN COMBATE
          - button "Pausar combate (Escape)" [ref=e5]: Ⅱ
          - button "Abrir objetos de misión" [disabled] [ref=e6]:
            - generic [ref=e9]: Objetos
      - generic:
        - generic [aria-hidden]: ELEMENTALES
        - button "Cambiar a habilidades físicas (0)" [ref=e10]
        - status
      - generic:
        - button "1. Golpe veloz, 0 CH" [disabled] [pressed] [ref=e14]:
          - generic [aria-hidden] [ref=e15]: "1"
          - generic [ref=e18]:
            - generic [ref=e19]: Golpe veloz
            - generic [ref=e20]: 0 CH
        - button "2. Ascuas veloces, 30 CH · CD 2" [disabled] [ref=e22]:
          - generic [aria-hidden] [ref=e23]: "2"
          - generic [aria-hidden] [ref=e24]:
            - generic [ref=e26]: 火
            - generic [ref=e27]: CD 2
          - generic [ref=e28]:
            - generic [ref=e29]: Ascuas veloces
            - generic [ref=e30]: 30 CH
        - button "3. Aliento de brasa, 42 CH" [disabled] [ref=e32]:
          - generic [aria-hidden] [ref=e33]: "3"
          - generic [ref=e36]: 炎
          - generic [ref=e37]:
            - generic [ref=e38]: Aliento de brasa
            - generic [ref=e39]: 42 CH
        - button "4. Sin técnica, DOJO" [disabled] [ref=e41]:
          - generic [aria-hidden] [ref=e42]: "4"
          - generic [ref=e44]: 封
          - generic [ref=e45]:
            - generic [ref=e46]: Sin técnica
            - generic [ref=e47]: DOJO
        - button "5. Sin técnica, DOJO" [disabled] [ref=e49]:
          - generic [aria-hidden] [ref=e50]: "5"
          - generic [ref=e52]: 封
          - generic [ref=e53]:
            - generic [ref=e54]: Sin técnica
            - generic [ref=e55]: DOJO
        - button "6. Guardia, 0 CH" [disabled] [ref=e57]:
          - generic [aria-hidden] [ref=e58]: "6"
          - generic [ref=e61]:
            - generic [ref=e62]: Guardia
            - generic [ref=e63]: 0 CH
      - generic:
        - strong: ORDEN DE TURNO · preparación 80–100 %
        - generic:
          - text: Referencia
          - progressbar "Referencia"
        - generic:
          - text: RASTREADOR BANDIDO
          - progressbar "RASTREADOR BANDIDO"
      - status
```

# Test source

```ts
  36  |   await expect(button(page,4)).toContainText("Puño de hierro");
  37  |   await expect(button(page,4)).toContainText("8 PV");
  38  |   await expect(button(page,5)).toContainText("Paso fugaz");
  39  |   await expect(button(page,5)).toContainText("5 PV");
  40  |   await button(page,4).click();
  41  |   expect(await page.evaluate(() => ({ used:window.__taijutsuUsed,hp:window.__performanceReference.scene.player.hp,chakra:window.__performanceReference.scene.player.chakra }))).toEqual({ used:["physical_1"],hp:22,chakra:0 });
  42  |   await page.evaluate(() => { const s=window.__performanceReference.scene; s.busy=false; s.turnReady=true; s.player.hp=5; s.refreshHud(); });
  43  |   await expect(button(page,5)).toHaveAttribute("aria-disabled","true");
  44  |   await page.evaluate(() => { const s=window.__performanceReference.scene; s.player.hp=20; s.refreshHud(); });
  45  |   await button(page,5).click();
  46  |   expect(await page.evaluate(() => ({ used:window.__taijutsuUsed,hp:window.__performanceReference.scene.player.hp }))).toEqual({ used:["physical_1","physical_2"],hp:15 });
  47  |   expect(errors).toEqual([]);
  48  | });
  49  | 
  50  | for (const width of [1280, 1600]) test(`las dos tablas conservan 1 y 6 y el equipo elemental a ${width}`, async ({ page }, testInfo) => {
  51  |   const errors = []; page.on("pageerror", error => errors.push(error.message));
  52  |   await page.setViewportSize({ width, height: width === 1280 ? 720 : 900 }); await boot(page);
  53  |   await expect(button(page, 2)).toContainText("Ascuas veloces");
  54  |   await expect(button(page, 2)).toContainText("CD 2");
  55  |   const initial = await page.evaluate(() => { const s = window.__performanceReference.scene; return { hp: s.player.hp, ch: s.player.chakra, round: s.round, loadout: s.saveData.loadout, pending: s.pendingActions.player, timeline: s.timelineProgress }; });
  56  |   await page.getByRole("button", { name: "Cambiar a habilidades físicas", exact: true }).click();
  57  |   await expect(page.locator(".combat-access")).toHaveAttribute("data-skill-table", "physical");
  58  |   await expect(button(page, 2)).toContainText("Golpe de arma");
  59  |   await expect(button(page, 2)).toContainText("0 PV");
  60  |   await expect(button(page, 2)).toHaveAttribute("aria-label", /Kunai/);
  61  |   await expect(button(page, 3)).toContainText("Shuriken");
  62  |   await expect(button(page, 3)).toHaveAttribute("aria-disabled", "true"); // The reference scene is still busy.
  63  |   for (const index of [4, 5]) { await expect(button(page, index)).toContainText("Sin taijutsu"); await expect(button(page, index)).not.toContainText("NV"); }
  64  |   expect(await page.evaluate(() => window.__fixedSkills.every((node, index) => node === document.querySelector(`[data-combat-action="${index ? 6 : 1}"]`)))).toBe(true);
  65  |   expect(await page.evaluate(() => { const s = window.__performanceReference.scene; return { hp: s.player.hp, ch: s.player.chakra, round: s.round, loadout: s.saveData.loadout, pending: s.pendingActions.player, timeline: s.timelineProgress }; })).toEqual(initial);
  66  |   const fits = await page.locator(".combat-table-switch").evaluate(element => { const b = element.getBoundingClientRect(), p = document.querySelector(".combat-access-actions").getBoundingClientRect(); return b.top > p.top && b.bottom < p.bottom && Math.abs(b.y + b.height / 2 - (p.y + p.height / 2)) < 4 && b.right < innerWidth; });
  67  |   expect(fits).toBe(true);
  68  |   await page.mouse.move(width - 5, 400);
  69  |   await page.screenshot({ path: testInfo.outputPath("tabla-fisica.png") });
  70  |   await page.getByRole("button", { name: "Cambiar a habilidades elementales", exact: true }).click();
  71  |   await expect(button(page, 2)).toContainText("Ascuas veloces"); await expect(button(page, 2)).toContainText("CD 2");
  72  |   await page.screenshot({ path: testInfo.outputPath("tabla-elemental.png") });
  73  |   expect(errors).toEqual([]);
  74  | });
  75  | 
  76  | test("teclas 2–5 usan solo la tabla visible y el arma no gasta chakra", async ({ page }) => {
  77  |   await boot(page);
  78  |   await page.evaluate(() => {
  79  |     const s = window.__performanceReference.scene; s.busy = false; s.turnReady = true; s.player.chakra = 0;
  80  |     window.__skillCalls = []; s.useJutsu = action => window.__skillCalls.push(action.id); s.refreshHud();
  81  |   });
  82  |   await page.getByRole("button", { name: "Cambiar a habilidades físicas", exact: true }).click();
  83  |   await expect(button(page, 2)).toHaveAttribute("aria-disabled", "false");
  84  |   for (const key of ["2", "3", "4", "5"]) await page.keyboard.press(key);
  85  |   expect(await page.evaluate(() => window.__skillCalls)).toEqual(["weapon_strike", "throwable_strike"]);
  86  |   await page.keyboard.press("1"); await page.keyboard.press("6");
  87  |   expect(await page.evaluate(() => window.__skillCalls)).toEqual(["weapon_strike", "throwable_strike", "strike", "guard"]);
  88  |   await page.getByRole("button", { name: "Cambiar a habilidades elementales", exact: true }).click();
  89  |   await page.evaluate(() => { const s = window.__performanceReference.scene; s.player.chakra = s.player.maxChakra; s.cooldowns.fire_embers = 0; s.refreshHud(); });
  90  |   await page.keyboard.press("2");
  91  |   expect(await page.evaluate(() => window.__skillCalls.at(-1))).toBe("fire_embers");
  92  | });
  93  | 
  94  | test("el flip gira solo 2–5, bloquea dobles cambios y sobrevive a pausa y cierre", async ({ page }) => {
  95  |   const errors = []; page.on("pageerror", error => errors.push(error.message));
  96  |   await page.emulateMedia({ reducedMotion: "no-preference" }); await boot(page);
  97  |   await page.locator("[data-skill-table-switch]").focus();
  98  |   const during = await page.evaluate(() => {
  99  |     const b = document.querySelector("[data-skill-table-switch]"), s = window.__performanceReference.scene;
  100 |     window.__skillCalls = []; s.useJutsu = action => window.__skillCalls.push(action.id);
  101 |     b.dispatchEvent(new MouseEvent("click")); b.dispatchEvent(new MouseEvent("click")); s.onActionShortcut({ key: "2" });
  102 |     return { middle: getComputedStyle(document.querySelector('[data-skill-row="2"]')).animationName, fixed: getComputedStyle(document.querySelector('[data-skill-row="1"]')).animationName, switching: s.skillTableSwitching };
  103 |   });
  104 |   expect(during).toEqual({ middle: "combat-table-out", fixed: "none", switching: true });
  105 |   await expect(page.locator(".combat-access")).toHaveAttribute("data-skill-table", "physical");
  106 |   await expect(page.locator(".combat-access-actions")).not.toHaveClass(/is-turning/);
  107 |   await expect(page.locator("[data-skill-table-switch]")).toBeFocused();
  108 |   expect(await page.evaluate(() => window.__skillCalls)).toEqual([]);
  109 |   await page.evaluate(() => window.__performanceReference.game.scene.pause("battle"));
  110 |   await expect(page.locator(".combat-access")).toBeHidden();
  111 |   await page.evaluate(() => window.__performanceReference.game.scene.resume("battle"));
  112 |   await expect(page.getByRole("button", { name: "Cambiar a habilidades elementales", exact: true })).toBeEnabled();
  113 |   await page.locator("[data-skill-table-switch]").click();
  114 |   await page.evaluate(() => window.__performanceReference.game.scene.stop("battle"));
  115 |   await expect(page.locator(".combat-access")).toHaveCount(0);
  116 |   await page.waitForTimeout(400); expect(errors).toEqual([]);
  117 | });
  118 | 
  119 | test("un coste físico se paga con PV una vez y exige vida suficiente", async ({ page }) => {
  120 |   await boot(page);
  121 |   const result = await page.evaluate(async () => {
  122 |     const s = window.__performanceReference.scene, move = { ...s.actions[0], id: "test_taijutsu", cost: 0, healthCost: 8 };
  123 |     s.busy = false; s.turnReady = true; s.player.hp = 8; s.player.chakra = 0;
  124 |     let calls = 0; s.executeTimelineAction = async () => { calls += 1; };
  125 |     await s.useJutsu(move);
  126 |     const denied = { hp: s.player.hp, ready: s.turnReady, calls };
  127 |     s.player.hp = 20;
  128 |     await s.useJutsu(move); await s.useJutsu(move);
  129 |     return { denied, hp: s.player.hp, ch: s.player.chakra, calls };
  130 |   });
  131 |   expect(result).toEqual({ denied: { hp: 8, ready: true, calls: 0 }, hp: 12, ch: 0, calls: 1 });
  132 | });
  133 | 
  134 | test("el golpe equipado llega al combate sin gastar PV ni CH", async ({ page }) => {
  135 |   await boot(page);
> 136 |   await page.getByRole("button", { name: "Cambiar a habilidades físicas", exact: true }).click();
      |                                                                                          ^ Error: locator.click: Test timeout of 90000ms exceeded.
  137 |   const result = await page.evaluate(async () => {
  138 |     const s = window.__performanceReference.scene;
  139 |     s.busy = false; s.turnReady = true; s.player.hp = 30; s.player.chakra = 0;
  140 |     let used = null; s.executeTimelineAction = async (actor, action) => { used = { actor, id: action.id, weapon: action.weaponId }; };
  141 |     await s.useJutsu(s.accessibleHud.getAction(1));
  142 |     return { used, hp: s.player.hp, ch: s.player.chakra, ready: s.turnReady };
  143 |   });
  144 |   expect(result).toEqual({ used: { actor: "player", id: "weapon_strike", weapon: "kunai" }, hp: 30, ch: 0, ready: false });
  145 | });
  146 | 
  147 | test("las tablas también se pueden cambiar en la distribución compacta", async ({ page }, testInfo) => {
  148 |   const errors = []; page.on("pageerror", error => errors.push(error.message));
  149 |   await page.setViewportSize({ width: 960, height: 740 }); await boot(page);
  150 |   await expect(page.locator(".combat-access")).toHaveClass(/compact/);
  151 |   await page.getByRole("button", { name: "Cambiar a habilidades físicas", exact: true }).click();
  152 |   await expect(button(page, 2)).toContainText("Golpe de arma");
  153 |   await expect(button(page, 6)).toContainText("Guardia");
  154 |   await expect(button(page, 1)).toContainText("Golpe veloz");
  155 |   expect(await page.locator(".combat-access").evaluate(root => root.scrollWidth <= root.clientWidth)).toBe(true);
  156 |   await page.screenshot({ path: testInfo.outputPath("tabla-fisica-compacta.png"), fullPage: true });
  157 |   await page.getByRole("button", { name: "Cambiar a habilidades elementales", exact: true }).click();
  158 |   await expect(button(page, 2)).toContainText("Ascuas veloces");
  159 |   expect(errors).toEqual([]);
  160 | });
  161 | 
```