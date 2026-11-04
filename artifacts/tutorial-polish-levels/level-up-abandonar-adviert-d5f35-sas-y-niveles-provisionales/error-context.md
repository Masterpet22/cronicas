# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: level-up.spec.mjs >> abandonar advierte que se pierden recompensas y niveles provisionales
- Location: tests\level-up.spec.mjs:194:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#abandon-test-stage [role=\'alertdialog\']')
Expected substring: "perderás 1 nivel"
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" locator('#abandon-test-stage [role=\'alertdialog\']') with timeout 8000ms
  - waiting for locator('#abandon-test-stage [role=\'alertdialog\']')

```

```yaml
- main:
  - paragraph: RPG 2D POR TURNOS
  - heading "Crónicas del Sello" [level=1]
  - group: Ajustes
  - region "Dojo y progreso del personaje":
    - paragraph: CRÓNICAS DEL SELLO
    - heading "Elige una partida" [level=2]
    - paragraph: Puedes mantener hasta tres historias independientes. El cuerpo y el maestro se fijan al crear cada combatiente.
    - article:
      - text: PARTIDA 1
      - heading "Nueva partida" [level=3]
      - paragraph: Crea un combatiente y comienza una historia independiente.
      - button "CREAR PARTIDA"
    - article:
      - text: PARTIDA 2
      - heading "Nueva partida" [level=3]
      - paragraph: Crea un combatiente y comienza una historia independiente.
      - button "CREAR PARTIDA"
    - article:
      - text: PARTIDA 3
      - heading "Nueva partida" [level=3]
      - paragraph: Crea un combatiente y comienza una historia independiente.
      - button "CREAR PARTIDA"
- dialog "MISIÓN EN PAUSA":
  - text: ◆
  - banner:
    - paragraph: CRÓNICAS DEL SELLO
    - heading "MISIÓN EN PAUSA" [level=2]
    - paragraph: El combate continuará donde lo dejaste.
  - heading "COMBATE" [level=3]
  - switch "Sellos manuales" [checked]:
    - strong: Sellos manuales
    - text: Completa las secuencias con el teclado.
  - switch "Sacudida de cámara":
    - strong: Sacudida de cámara
    - text: Movimiento de cámara al recibir impactos.
  - switch "Destellos de pantalla":
    - strong: Destellos de pantalla
    - text: Resaltan los golpes y las técnicas.
  - heading "IMAGEN Y SONIDO" [level=3]
  - text: Resolución de combate
  - radiogroup "Resolución de combate":
    - radio "Automática según el equipo" [checked]: Auto
    - radio "Económica · 960 * 540": 960 * 540
    - radio "Baja · 1200 * 675": 1200 * 675
    - radio "Media · 1440 * 810": 1440 * 810
    - radio "Alta · 1920 * 1080": 1920 * 1080
  - status: Se aplicará al entrar en una misión.
  - switch "Modo ligero":
    - strong: Modo ligero
    - text: Reduce partículas y efectos visuales.
  - switch "Música" [checked]:
    - strong: Música
    - text: Acompaña el combate con música ambiental.
  - text: Volumen
  - status "Volumen": 70%
  - slider "Volumen": "70"
  - button "MEDIR RENDIMIENTO · FPS"
  - contentinfo:
    - button "REANUDAR"
    - button "ABANDONAR"
  - text: ◆
```

# Test source

```ts
  130 |     return panel?.alpha === 1 && panel.list.some(child => child.name === "level-up-continue" && child.input?.enabled);
  131 |   })).toBe(true);
  132 |   await page.locator("#level-up-battle-stage canvas").click({ position: { x: 636, y: 469 } });
  133 |   await expect.poll(() => page.evaluate(() => window.__levelUpBattleTest.resumed)).toBe(true);
  134 |   const result = await page.evaluate(async () => {
  135 |     const { loadSave } = await import("/src/save.js?v=0.94.0");
  136 |     const state = window.__levelUpBattleTest;
  137 |     const outcome = { grewInCombat: state.newHp > state.oldHp, persistedLevel: loadSave().progression.level,
  138 |       battleActive: state.game.scene.isActive("battle"), battleStages: state.battleStages, modalStages: state.modalStages,
  139 |       modalHadObject: state.modalHadObject };
  140 |     state.game.destroy(true);
  141 |     state.stage.remove();
  142 |     delete window.__levelUpBattleTest;
  143 |     return outcome;
  144 |   });
  145 |   expect(result).toMatchObject({ grewInCombat: true, persistedLevel: 1, battleActive: true, modalHadObject: false });
  146 |   expect(result.battleStages.map(event => event.stage)).toEqual(["departure-smoke", "object-left", "object-disappears", "screen-transition", "arrival-smoke", "character-arrives"]);
  147 |   expect(result.battleStages.filter(event => event.stage === "object-left")).toEqual([{ stage: "object-left", object: "dog" }]);
  148 |   expect(result.modalStages).toEqual(["arrival-smoke", "character-arrives", "departure-smoke", "screen-transition"]);
  149 |   expect(browserErrors).toEqual([]);
  150 | });
  151 | 
  152 | test("cerrar el combate durante el destello cancela la subida sin dejar promesas pendientes", async ({ page }) => {
  153 |   const browserErrors = [];
  154 |   page.on("pageerror", (error) => browserErrors.push(error.message));
  155 |   await page.goto("/");
  156 |   await ensurePhaser(page);
  157 |   await page.evaluate(async () => {
  158 |     const { BattleFlowMethods } = await import("/src/battle/scenes/battle-flow.js?v=1.5.0");
  159 |     const { createPlayerFighter, queuePlayerFighterTextures } = await import("/src/fighters.js?v=0.81.0");
  160 |     const { playerFighterAppearance } = await import("/src/character.js?v=0.76.0");
  161 |     const { createCharacter, createDefaultSave } = await import("/src/save.js?v=0.106.0");
  162 |     const base = createCharacter(createDefaultSave(), { name: "Kira", affinity: "fuego", bodyType: "female" });
  163 |     const preview = { ...base, progression: { ...base.progression, level: 2, attributePoints: 2 } };
  164 |     const host = document.createElement("div");
  165 |     host.id = "interrupted-level-up-stage";
  166 |     document.body.append(host);
  167 |     const state = { host, game: null, resolved: false };
  168 |     window.__interruptedLevelUp = state;
  169 |     class InterruptedBattleScene extends window.Phaser.Scene {
  170 |       constructor() { super("battle"); }
  171 |       preload() { queuePlayerFighterTextures(this, playerFighterAppearance(base)); }
  172 |       create() {
  173 |         this.saveData = base;
  174 |         this.hero = createPlayerFighter(this, 220, 390, playerFighterAppearance(base));
  175 |         this.lastShownLevel = 1;
  176 |         this.stopTurnTimeline = () => {};
  177 |         this.accessibleHud = { suspend: () => () => {} };
  178 |         void BattleFlowMethods.prototype.showPendingLevelUp.call(this, preview).then(() => { state.resolved = true; });
  179 |         window.setTimeout(() => this.scene.stop(), 60);
  180 |       }
  181 |     }
  182 |     state.game = new window.Phaser.Game({ type: window.Phaser.CANVAS, parent: host, width: 960, height: 540, scene: [InterruptedBattleScene] });
  183 |   });
  184 |   await expect.poll(() => page.evaluate(() => window.__interruptedLevelUp.resolved), { timeout: 5_000 }).toBe(true);
  185 |   expect(await page.evaluate(() => window.__interruptedLevelUp.game.scene.isActive("battle"))).toBe(false);
  186 |   expect(browserErrors).toEqual([]);
  187 |   await page.evaluate(() => {
  188 |     window.__interruptedLevelUp.game.destroy(true);
  189 |     window.__interruptedLevelUp.host.remove();
  190 |     delete window.__interruptedLevelUp;
  191 |   });
  192 | });
  193 | 
  194 | test("abandonar advierte que se pierden recompensas y niveles provisionales", async ({ page }) => {
  195 |   await page.goto("/");
  196 |   await ensurePhaser(page);
  197 |   await expect(page.locator('[data-select-slot="1"]')).toBeVisible();
  198 |   await page.evaluate(async () => {
  199 |     const { PauseScene } = await import("/src/battle/scenes/pause-scene.js?v=0.95.0");
  200 |     const { battleRuntime } = await import("/src/battle/runtime.js?v=0.91.0");
  201 |     battleRuntime.renderResolution = 1;
  202 |     const stage = document.createElement("div");
  203 |     stage.id = "abandon-test-stage";
  204 |     stage.style.cssText = "width:960px;height:540px";
  205 |     document.body.append(stage);
  206 |     const state = { stage, game: null, abandoned: false, result: null };
  207 |     window.__abandonTest = state;
  208 |     class FakeBattleScene extends window.Phaser.Scene {
  209 |       constructor() { super("battle"); }
  210 |       create() {
  211 |         this.rewardPreviewSave = { progression: { level: 2 } };
  212 |         this.missionStartSave = { progression: { level: 1 } };
  213 |         this.mission = { type: "main" };
  214 |         this.accessibleHud = { refresh() {} };
  215 |         this.abandonPayload = () => { state.abandoned = true; return { outcome: "abandoned" }; };
  216 |         this.scene.launch("pause");
  217 |         this.scene.pause();
  218 |       }
  219 |     }
  220 |     class FakeTravelScene extends window.Phaser.Scene {
  221 |       constructor() { super("travel"); }
  222 |       create(data) { state.result = data.result; }
  223 |     }
  224 |     state.game = new window.Phaser.Game({ type: window.Phaser.CANVAS, parent: stage, width: 960, height: 540,
  225 |       scene: [FakeBattleScene, PauseScene, FakeTravelScene] });
  226 |   });
  227 |   const canvas = page.locator("#abandon-test-stage canvas");
  228 |   await expect(page.locator("#abandon-test-stage .combat-pause-access")).toBeVisible();
  229 |   await canvas.click({ position: { x: 560, y: 454 } });
> 230 |   await expect(page.locator("#abandon-test-stage [role='alertdialog']")).toContainText("perderás 1 nivel");
      |                                                                          ^ Error: expect(locator).toContainText(expected) failed
  231 |   await canvas.click({ position: { x: 360, y: 354 } });
  232 |   await expect(page.locator("#abandon-test-stage [role='alertdialog']")).toHaveCount(0);
  233 |   expect(await page.evaluate(() => window.__abandonTest.abandoned)).toBe(false);
  234 |   await canvas.click({ position: { x: 560, y: 454 } });
  235 |   await canvas.click({ position: { x: 600, y: 354 } });
  236 |   await expect.poll(() => page.evaluate(() => window.__abandonTest.result?.outcome)).toBe("abandoned");
  237 |   const abandoned = await page.evaluate(() => {
  238 |     const state = window.__abandonTest;
  239 |     const value = state.abandoned;
  240 |     state.game.destroy(true);
  241 |     state.stage.remove();
  242 |     delete window.__abandonTest;
  243 |     return value;
  244 |   });
  245 |   expect(abandoned).toBe(true);
  246 | });
  247 | 
```