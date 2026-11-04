# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: combat-tutorial.spec.mjs >> iniciativa temporal y Guardia sobreviven a fallos y aturdimiento hasta el impacto
- Location: tests\combat-tutorial.spec.mjs:166:1

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 10
Received:    11
```

# Page snapshot

```yaml
- main [ref=f1e2]:
  - region "Juego de combate por turnos" [ref=f1e3]:
    - region "Interfaz de combate":
      - generic:
        - generic:
          - strong: APRENDIZ
          - generic:
            - text: PV
            - progressbar "Vida"
            - text: 86/105
          - generic:
            - text: CH
            - progressbar "Chakra"
            - text: 35/80
          - text: VENENO (2)
        - generic:
          - strong: BANDIDO
          - generic:
            - text: PV
            - progressbar "Vida"
            - text: 992/1000
          - generic:
            - text: CH
            - progressbar "Chakra"
            - text: 24/24
          - text: Iniciativa -1
        - status:
          - strong: TURNO DE APRENDIZ
          - button "Pausar combate (Escape)" [ref=f1e5]: Ⅱ
          - button "Abrir objetos de misión" [ref=f1e6]:
            - generic [ref=f1e9]: Objetos
      - generic:
        - generic [aria-hidden]: ELEMENTALES
        - button "Cambiar a habilidades físicas" [ref=f1e10]
        - status
      - generic:
        - button "1. Golpe veloz, 0 CH" [ref=f1e14]:
          - generic [aria-hidden] [ref=f1e15]: "1"
          - generic [ref=f1e18]:
            - generic [ref=f1e19]: Golpe veloz
            - generic [ref=f1e20]: 0 CH
        - button "2. Ascuas veloces, 30 CH" [ref=f1e22]:
          - generic [aria-hidden] [ref=f1e23]: "2"
          - generic [ref=f1e26]: 火
          - generic [ref=f1e27]:
            - generic [ref=f1e28]: Ascuas veloces
            - generic [ref=f1e29]: 30 CH
        - button "3. Aliento de brasa, 42 CH · Sin chakra" [disabled] [ref=f1e31]:
          - generic [aria-hidden] [ref=f1e32]: "3"
          - generic [aria-hidden] [ref=f1e33]:
            - generic [ref=f1e35]: 炎
            - generic [ref=f1e36]: SIN CH
          - generic [ref=f1e37]:
            - generic [ref=f1e38]: Aliento de brasa
            - generic [ref=f1e39]: 42 CH
        - button "4. Ranura sellada, NV 5" [disabled] [ref=f1e41]:
          - generic [aria-hidden] [ref=f1e42]: "4"
          - generic [ref=f1e44]: 封
          - generic [ref=f1e45]:
            - generic [ref=f1e46]: Ranura sellada
            - generic [ref=f1e47]: NV 5
        - button "5. Ranura sellada, NV 8" [disabled] [ref=f1e49]:
          - generic [aria-hidden] [ref=f1e50]: "5"
          - generic [ref=f1e52]: 封
          - generic [ref=f1e53]:
            - generic [ref=f1e54]: Ranura sellada
            - generic [ref=f1e55]: NV 8
        - button "6. Guardia, 0 CH" [active] [pressed] [ref=f1e57]:
          - generic [aria-hidden] [ref=f1e58]: "6"
          - generic [ref=f1e61]:
            - generic [ref=f1e62]: Guardia
            - generic [ref=f1e63]: 0 CH
      - generic:
        - strong: ORDEN DE TURNO · preparación 80–100 %
        - generic:
          - text: Aprendiz
          - progressbar "Aprendiz"
        - generic:
          - text: BANDIDO
          - progressbar "BANDIDO"
      - status: Tu iniciativa está lista. Elige una acción.
```

# Test source

```ts
  122 |     await page.locator('[data-combat-action="6"]').click();
  123 |     await expect.poll(() => page.evaluate(() => window.__tutorialGame.scene.getScene("battle").round)).toBe(round + 2);
  124 |     expect(await page.evaluate(() => window.__tutorialGame.scene.getScene("battle").player.chakra)).toBe(40);
  125 |     await expect(page.locator('[data-combat-action="1"]')).toHaveAttribute("aria-disabled", "false", { timeout: 20000 });
  126 |     const blocked = await page.evaluate(async () => {
  127 |       const s = window.__tutorialGame.scene.getScene("battle");
  128 |       s.player.chakra = 29; s.refreshHud();
  129 |       await s.useJutsu(s.actions[1]);
  130 |       return { chakra: s.player.chakra, pending: Boolean(s.pendingActions.player), round: s.round };
  131 |     });
  132 |     expect(blocked).toEqual({ chakra: 29, pending: false, round: round + 2 });
  133 |     expect(errors).toEqual([]);
  134 |   });
  135 | }
  136 | 
  137 | test("maestría tres: combate usa el coste reducido y prepara un solo sello", async ({ page }) => {
  138 |   const errors = []; page.on("pageerror", error => errors.push(error.message));
  139 |   await prepare(page, { mastered: true });
  140 |   await launch(page);
  141 |   const mastery = await page.evaluate(async () => {
  142 |     const scene = window.__tutorialGame.scene.getScene("battle");
  143 |     const action = scene.actions[1];
  144 |     const { millisecondsToTimelineThreshold } = await import("/src/battle/timeline.js?v=0.69.0");
  145 |     const speed = scene.combatantSpeed(scene.player);
  146 |     return { level: action.techniqueLevel, damage: action.damage, cost: scene.actionCost(action), seals: action.seals.length,
  147 |       preparation: millisecondsToTimelineThreshold(.8, speed, action),
  148 |       novicePreparation: millisecondsToTimelineThreshold(.8, speed, { ...action, seals: action.baseSeals }) };
  149 |   });
  150 |   expect(mastery).toMatchObject({ level: 3, damage: 18, cost: 27, seals: 1 });
  151 |   expect(mastery.preparation).toBeCloseTo(mastery.novicePreparation / 2, 8);
  152 |   await expect(page.locator('[data-combat-action="6"]')).toHaveAttribute("aria-disabled", "false", { timeout: 20000 });
  153 |   const round = await page.evaluate(async () => {
  154 |     const scene = window.__tutorialGame.scene.getScene("battle");
  155 |     scene.player.chakra = 40;
  156 |     scene.enemy.hp = scene.enemy.maxHp = 1000;
  157 |     const round = scene.round;
  158 |     await scene.useJutsu(scene.actions[1]);
  159 |     return round;
  160 |   });
  161 |   await expect.poll(() => page.evaluate(() => window.__tutorialGame.scene.getScene("battle").round), { timeout: 20000 }).toBe(round + 1);
  162 |   expect(await page.evaluate(() => window.__tutorialGame.scene.getScene("battle").player.chakra)).toBe(18);
  163 |   expect(errors).toEqual([]);
  164 | });
  165 | 
  166 | test("iniciativa temporal y Guardia sobreviven a fallos y aturdimiento hasta el impacto", async ({ page }) => {
  167 |   test.setTimeout(120000);
  168 |   const errors = []; page.on("pageerror", error => errors.push(error.message));
  169 |   await prepare(page); await launch(page);
  170 |   await page.evaluate(() => {
  171 |     const s = window.__tutorialGame.scene.getScene("battle");
  172 |     s.rollHit = () => false;
  173 |     s.enemy.baseSpeed = 2; s.enemy.hp = s.enemy.maxHp = 1000;
  174 |     window.__recoveries = [];
  175 |     const charge = s.startTurnCharge;
  176 |     s.startTurnCharge = function() { window.__recoveries.push({ round: this.round, initiative: this.player.recoveryInitiative }); return charge.call(this); };
  177 |   });
  178 |   for (let n = 0; n < 2; n++) {
  179 |     await expect(page.locator('[data-combat-action="1"]')).toHaveAttribute("aria-disabled", "false", { timeout: 20000 });
  180 |     expect(await page.evaluate(() => window.__tutorialGame.scene.getScene("battle").player.recoveryInitiative)).toBe(0);
  181 |     const round = await page.evaluate(() => window.__tutorialGame.scene.getScene("battle").round);
  182 |     await page.locator('[data-combat-action="1"]').click();
  183 |     await expect.poll(() => page.evaluate(() => window.__tutorialGame.scene.getScene("battle").round)).toBe(round + 1);
  184 |     await expect.poll(() => page.evaluate(round => window.__recoveries.some(r => r.round === round && r.initiative === 1), round + 1)).toBe(true);
  185 |   }
  186 |   await expect(page.locator('[data-combat-action="6"]')).toHaveAttribute("aria-disabled", "false", { timeout: 20000 });
  187 |   const round = await page.evaluate(() => {
  188 |     const s = window.__tutorialGame.scene.getScene("battle");
  189 |     s.player.chakra = 10; s.player.hp = 100;
  190 |     s.player.statuses = [{ type: "poison", label: "VENENO", power: 3, duration: 3 }];
  191 |     s.refreshHud(); return s.round;
  192 |   });
  193 |   await page.locator('[data-combat-action="6"]').click();
  194 |   await expect.poll(() => page.evaluate(() => window.__tutorialGame.scene.getScene("battle").round)).toBe(round + 1);
  195 |   await expect(page.locator('[data-combat-action="1"]')).toHaveAttribute("aria-disabled", "false", { timeout: 20000 });
  196 |   await expect(page.locator('[data-combat-action="6"]')).toHaveAttribute("aria-disabled", "true");
  197 |   const result = await page.evaluate(async () => {
  198 |     const s = window.__tutorialGame.scene.getScene("battle");
  199 |     const { ENEMY_ACTIONS } = await import("/src/data.js?v=1.5.0");
  200 |     const before = { chakra: s.player.chakra, hp: s.player.hp, guarding: s.player.guarding };
  201 |     await s.useJutsu(s.actions[5]);
  202 |     const afterRepeatedGuard = s.player.chakra;
  203 |     s.enemy.statuses = [{ type: "stun", duration: 1, power: 0 }];
  204 |     s.enemy.soak = { stacks: 1, turns: 2, boss: false };
  205 |     await s.executeTimelineAction("enemy", ENEMY_ACTIONS.heavy);
  206 |     const afterStun = { guarding: s.player.guarding, soakTurns: s.enemy.soak.turns };
  207 |     await s.executeTimelineAction("enemy", ENEMY_ACTIONS.quick);
  208 |     const afterMiss = s.player.guarding;
  209 |     s.rollHit = chance => chance > 25;
  210 |     s.player.damageReduction = 0; s.player.primaryAffinity = null;
  211 |     s.enemy.baseStrength = 0; s.enemy.strengthModifier = 0; s.enemy.primaryAffinity = null;
  212 |     await s.executeTimelineAction("enemy", ENEMY_ACTIONS.heavy);
  213 |     return { before, afterRepeatedGuard, afterStun, afterMiss, guarding: s.player.guarding,
  214 |       damage: before.hp - s.player.hp, chakra: s.player.chakra, statuses: s.player.statuses,
  215 |       initiatives: window.__recoveries.map(r => r.initiative) };
  216 |   });
  217 |   expect(result.before).toEqual({ chakra: 35, hp: 97, guarding: true });
  218 |   expect(result.afterRepeatedGuard).toBe(35);
  219 |   expect(result.afterStun).toEqual({ guarding: true, soakTurns: 1 });
  220 |   expect(result.afterMiss).toBe(true);
  221 |   expect(result.guarding).toBe(false);
> 222 |   expect(result.damage).toBeGreaterThanOrEqual(8); expect(result.damage).toBeLessThanOrEqual(10);
      |                                                                          ^ Error: expect(received).toBeLessThanOrEqual(expected)
  223 |   expect(result.chakra).toBe(35);
  224 |   expect(result.statuses).toEqual([{ type: "poison", label: "VENENO", power: 3, duration: 2 }]);
  225 |   expect(result.initiatives).toContain(-1);
  226 |   expect(result.initiatives.every(i => [-1, 0, 1].includes(i))).toBe(true);
  227 |   expect(errors).toEqual([]);
  228 | });
  229 | 
  230 | test("el golpe final cierra recargas y chakra y gana antes del veneno propio", async ({ page }) => {
  231 |   test.setTimeout(120000);
  232 |   const errors = []; page.on("pageerror", error => errors.push(error.message));
  233 |   await prepare(page); await launch(page);
  234 |   await expect(page.locator('[data-combat-action="1"]')).toHaveAttribute("aria-disabled", "false", { timeout: 20000 });
  235 |   const snapshot = await page.evaluate(async () => {
  236 |     const s = window.__tutorialGame.scene.getScene("battle");
  237 |     s.enemyIndex = s.encounters.length - 1;
  238 |     s.enemy = s.createEnemyState(s.encounters[s.enemyIndex]);
  239 |     s.defeatedEncounters = s.enemyIndex;
  240 |     s.player.hp = 3; s.player.chakra = 10;
  241 |     s.player.statuses = [{ type: "poison", label: "VENENO", power: 3, duration: 1 }];
  242 |     s.cooldowns.closure_probe = 2;
  243 |     s.playerAttack = async () => { s.enemy.hp = 0; };
  244 |     const finish = s.finishBattle;
  245 |     let result;
  246 |     s.finishBattle = async function(won) {
  247 |       result = { won, hp: this.player.hp, chakra: this.player.chakra, cooldown: this.cooldowns.closure_probe,
  248 |         pending: this.pendingActions.player, progress: this.timelineProgress.player };
  249 |       return finish.call(this, won);
  250 |     };
  251 |     await s.useJutsu(s.actions[0]);
  252 |     const { battleRuntime } = await import("/src/battle/runtime.js?v=0.91.0");
  253 |     return { ...result, completed: battleRuntime.pendingVictorySave?.campaign.completedMissions.includes("m01") };
  254 |   });
  255 |   expect(snapshot).toEqual({ won: true, hp: 3, chakra: 15, cooldown: 1, pending: null, progress: 0, completed: true });
  256 |   expect(errors).toEqual([]);
  257 | });
  258 | 
  259 | test("la primera misión exige prácticas reales y conserva las lecciones al pausar", async ({ page }, info) => {
  260 |   test.setTimeout(150000);
  261 |   const errors = []; page.on("pageerror", error => errors.push(error.message));
  262 |   await prepare(page, { trained: false }); await launch(page);
  263 |   await expect(page.locator("[data-tutorial-skip]")).toHaveCount(0);
  264 |   const baseline = await page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")));
  265 |   await page.waitForTimeout(400);
  266 |   expect(await page.evaluate(() => window.__tutorialGame.scene.getScene("battle").round)).toBe(1);
  267 |   await page.locator("#game").screenshot({ path: info.outputPath("tutorial-actual.png") });
  268 |   await practical(page);
  269 |   await expect(page.locator(".combat-tutorial")).toBeHidden();
  270 |   const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")));
  271 |   for (const id of ["strike", "guard", "weapon", "throwable", "technique", "pause"]) expect(saved.campaign.sagaTutorial.completed).toContain(id);
  272 |   expect(saved.progression).toEqual(baseline.progression);
  273 |   expect(saved.campaign.completedMissions).toEqual([]);
  274 |   await page.keyboard.press("Escape");
  275 |   await expect(page.locator(".combat-pause-access")).toBeVisible();
  276 |   expect(errors).toEqual([]);
  277 | });
  278 | 
  279 | for (const manual of [false, true]) test(`repaso completo actualizado, sellos ${manual ? "manuales" : "automáticos"}, sin cambiar equipo ni progreso`, async ({ page }) => {
  280 |   test.setTimeout(150000);
  281 |   const errors = []; page.on("pageerror", error => errors.push(error.message));
  282 |   await prepare(page, { manual, emptyLoadout: true, completed: true });
  283 |   const saved = await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"));
  284 |   await launch(page, true); await practical(page, manual);
  285 |   await expect(page.locator("[data-replay-tutorial]")).toBeVisible();
  286 |   expect(await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"))).toBe(afterArchiveIntroduction(saved));
  287 |   expect(errors).toEqual([]);
  288 | });
  289 | 
  290 | test("salir del repaso con Escape conserva el guardado", async ({ page }) => {
  291 |   await prepare(page); await launch(page, true);
  292 |   const saved = await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"));
  293 |   await page.keyboard.press("Escape");
  294 |   await expect(page.locator("[data-replay-tutorial]")).toBeVisible();
  295 |   expect(await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"))).toBe(saved);
  296 | });
  297 | 
  298 | 
```