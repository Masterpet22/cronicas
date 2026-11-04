# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tutorial-polish.spec.mjs >> el maestro explica los nuevos duelos, la ventaja y la fase II cuando ocurren
- Location: tests\tutorial-polish.spec.mjs:180:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('[data-battle-lesson="enemy-encounters"]').locator('img')
Expected: 0
Received: 2
Timeout:  8000ms

Call log:
  - Expect "toHaveCount" locator('[data-battle-lesson="enemy-encounters"]').locator('img') with timeout 8000ms
  - waiting for locator('[data-battle-lesson="enemy-encounters"]').locator('img')
    20 × locator resolved to 2 elements
       - unexpected value "2"

```

# Page snapshot

```yaml
- main [ref=e2]:
  - region "Juego de combate por turnos" [ref=e3]:
    - dialog [ref=e5]:
      - generic [ref=e6]:
        - strong [ref=e8]: Mei Hayate
        - heading "Un nuevo rival, otro duelo" [level=2] [ref=e9]
        - paragraph [ref=e11]: "«Encuentro 2 de 3: BANDIDO. Los combates siguen siendo uno contra uno. El rival anterior está derrotado. Entre duelos recuperas hasta 38 PV y 20 CH y se limpian las recargas. Aplica ahora tus ataques y tu Guardia. Las recompensas se confirman al regresar con éxito.»"
        - button "Entendido · Continuar" [active] [ref=e13]
```

# Test source

```ts
  93  |       save.campaign.completedMissions = ["m01"];
  94  |       save.progression.level = 2; save.progression.attributePoints = 2; save.progression.coins = 100;
  95  |     }
  96  |     writeSave(save); sessionStorage.setItem("cronicas-save-slot-selected", "1"); localStorage.setItem("music-enabled", "off");
  97  |   }, { trained, bodyType });
  98  |   await page.reload(); await expect(page.locator(".village-map")).toBeVisible();
  99  | }
  100 | 
  101 | for (const [bodyType, master] of [["male", "mei"], ["female", "daichi"]]) test(`Ren y ${master} aparecen en escena con su propio diálogo`, async ({ page }, info) => {
  102 |   await seedVillage(page, { bodyType });
  103 |   await expect(page.locator(".saga-tutorial-coach")).toHaveCount(0);
  104 |   await page.locator('[data-go="headquarters"]').click();
  105 |   const dialogue = page.locator(".saga-tutorial-coach");
  106 |   await expect(dialogue).toBeVisible();
  107 |   await expect(dialogue.locator('[data-tutorial-speaker="ren"]')).toBeVisible();
  108 |   await expect(dialogue.locator('img')).toHaveCount(0);
  109 |   const resident = page.locator('[data-stage-npc="ren"]');
  110 |   await expect(resident).toBeVisible();
  111 |   const floor = await page.locator('[data-location-stage]').boundingBox();
  112 |   const portrait = await resident.boundingBox();
  113 |   expect(Math.abs(portrait.y + portrait.height - floor.y - floor.height)).toBeLessThan(3);
  114 |   const bubble = await dialogue.locator('.tutorial-conversation').boundingBox();
  115 |   expect(bubble.y + bubble.height).toBeLessThan(portrait.y + 10);
  116 |   await expect(dialogue.locator('h3')).toHaveClass(/tutorial-sr-only/);
  117 |   await dialogue.locator("[data-coach-close]").click(); await expect(dialogue).toBeHidden();
  118 |   await page.locator("[data-coach-open]").click(); await expect(dialogue).toBeVisible();
  119 |   await page.screenshot({ path: info.outputPath(`personaje-ren-${master}.png`) });
  120 |   await page.locator('[data-saga="saga-1"]').click(); await page.locator('[data-mission="m01"]').click();
  121 |   await expect(page.locator(`[data-stage-npc="${master}"]`)).toBeVisible();
  122 |   await expect(dialogue.locator('img')).toHaveCount(0);
  123 |   await expect(page.locator(`[data-tutorial-speaker="${master}"]`)).toBeVisible();
  124 |   await page.screenshot({ path: info.outputPath(`personaje-${master}-dojo.png`) });
  125 | });
  126 | 
  127 | test("el Dojo señala la pestaña, el atributo, el hexágono y el botón correcto", async ({ page }, info) => {
  128 |   await seedVillage(page, { trained: true });
  129 |   await page.locator('[data-go="headquarters"]').click(); await page.locator('[data-saga="saga-1"]').click();
  130 |   await page.locator('[data-mission="s01"]').click();
  131 |   const dialogue = page.locator(".saga-tutorial-coach");
  132 |   await expect(page.locator('[data-dojo-tab="statistics"]')).toHaveClass(/saga-tutorial-target/);
  133 |   await dialogue.locator("[data-coach-go]").click();
  134 |   await expect(page.locator('[data-attribute="health"]')).toHaveClass(/saga-tutorial-target/);
  135 |   await expect(dialogue).toContainText("punto de atributo");
  136 |   await page.screenshot({ path: info.outputPath("atributos-paso-exacto.png") });
  137 |   await page.locator('[data-attribute="health"]').click();
  138 |   await dialogue.locator("[data-coach-go]").click();
  139 |   await expect(page.locator('[data-skill-select="physical_0"]')).toHaveClass(/saga-tutorial-target/);
  140 |   await dialogue.locator("[data-coach-go]").click();
  141 |   await expect(page.locator('[data-skill-invest="physical_0"]')).toHaveClass(/saga-tutorial-target/);
  142 |   await page.locator('[data-skill-select]').last().hover();
  143 |   await expect(page.locator(".technique-detail h3")).toHaveText("Disciplina del cuerpo");
  144 |   await page.locator('[data-skill-invest="physical_0"]').click();
  145 |   await expect(page.locator('[data-skill-select="physical_1"]')).toHaveClass(/saga-tutorial-target/);
  146 |   await dialogue.locator("[data-coach-go]").click();
  147 |   await expect(page.locator('[data-skill-invest="physical_1"]')).toHaveClass(/saga-tutorial-target/);
  148 |   await expect(page.locator(".technique-detail h3")).toHaveText("Puño de hierro");
  149 |   await page.screenshot({ path: info.outputPath("pr-habilidad-correcta.png") });
  150 | });
  151 | 
  152 | for (const width of [1280, 1600]) test(`la descripción del shuriken cabe en la tarjeta a ${width}`, async ({ page }, info) => {
  153 |   await page.setViewportSize({ width, height: width === 1280 ? 720 : 900 });
  154 |   await seedVillage(page); await page.locator('[data-go="dojo"]').click();
  155 |   await page.locator('[data-dojo-tab="equipment"]').click();
  156 |   await page.locator('[data-gear-slot="throwable"]').click();
  157 |   await page.locator('[data-equipment-id="shuriken"]').click();
  158 |   const card = page.locator('[data-gear-slot="throwable"]');
  159 |   const bounds = await card.evaluate(el => {
  160 |     const box = el.getBoundingClientRect(), text = el.querySelector(".gear-copy").getBoundingClientRect();
  161 |     return { bottom: text.bottom <= box.bottom - 5, right: text.right <= box.right - 5, scroll: el.scrollHeight <= el.clientHeight + 1 };
  162 |   });
  163 |   expect(bounds).toEqual({ bottom: true, right: true, scroll: true });
  164 |   await card.screenshot({ path: info.outputPath(`shuriken-${width}.png`) });
  165 | });
  166 | 
  167 | test("0 y Numpad0 cambian la tabla una vez sin gastar turno ni recursos", async ({ page }) => {
  168 |   await bootPerformanceReference(page);
  169 |   await page.evaluate(() => { const s = window.__performanceReference.scene; s.busy = false; s.turnReady = true; s.refreshHud(); });
  170 |   const before = await page.evaluate(() => { const s = window.__performanceReference.scene; return [s.round, s.player.hp, s.player.chakra]; });
  171 |   await page.keyboard.press("0"); await expect(page.locator(".combat-access")).toHaveAttribute("data-skill-table", "physical");
  172 |   await page.keyboard.press("Numpad0"); await expect(page.locator(".combat-access")).toHaveAttribute("data-skill-table", "elemental");
  173 |   expect(await page.evaluate(() => { const s = window.__performanceReference.scene; return [s.round, s.player.hp, s.player.chakra]; })).toEqual(before);
  174 |   await page.evaluate(() => { const field = document.createElement("input"); field.id = "shortcut-input"; document.body.append(field); field.focus(); });
  175 |   await page.keyboard.press("0"); await expect(page.locator("#shortcut-input")).toHaveValue("0");
  176 |   await expect(page.locator(".combat-access")).toHaveAttribute("data-skill-table", "elemental");
  177 |   await page.evaluate(() => { document.getElementById("shortcut-input").remove(); window.__performanceReference.game.destroy(true); });
  178 | });
  179 | 
  180 | test("el maestro explica los nuevos duelos, la ventaja y la fase II cuando ocurren", async ({ page }, info) => {
  181 |   await bootPerformanceReference(page, { arenaIndex: 0 });
  182 |   await page.evaluate(() => {
  183 |     const s = window.__performanceReference.scene;
  184 |     s.saveData.campaign.completedMissions = [];
  185 |     s.missionStartSave.campaign.completedMissions = [];
  186 |     s.rewardPreviewSave.campaign.completedMissions = [];
  187 |     s.enemy.hp = 0; window.__eventFlow = s.resolveEnemyOutcome();
  188 |   });
  189 |   const encounters = page.locator('[data-battle-lesson="enemy-encounters"]');
  190 |   await expect(encounters).toBeVisible({ timeout: 20000 });
  191 |   await expect(encounters).toContainText("uno contra uno");
  192 |   await expect(encounters.locator('[data-tutorial-speaker="mei"]')).toBeVisible();
> 193 |   await expect(encounters.locator("img")).toHaveCount(0);
      |                                           ^ Error: expect(locator).toHaveCount(expected) failed
  194 |   await encounters.locator("button").click();
  195 |   await page.evaluate(async () => {
  196 |     await window.__eventFlow;
  197 |     const s = window.__performanceReference.scene; s.stopTurnTimeline(); s.enemy.hp = 0;
  198 |     window.__eventFlow = s.resolveEnemyOutcome();
  199 |   });
  200 |   const affinity = page.locator('[data-battle-lesson="affinity-advantage"]');
  201 |   await expect(affinity).toBeVisible({ timeout: 20000 });
  202 |   await expect(affinity.locator("img")).toHaveCount(0);
  203 |   await expect(affinity).toContainText("20 %"); await expect(affinity).toContainText("Normal");
  204 |   await page.screenshot({ path: info.outputPath("ventaja-en-el-primer-jefe.png") });
  205 |   await affinity.locator("button").click();
  206 |   await page.evaluate(async () => {
  207 |     await window.__eventFlow;
  208 |     const s = window.__performanceReference.scene; s.stopTurnTimeline(); s.enemy.hp = Math.floor(s.enemy.maxHp / 2);
  209 |     window.__eventFlow = s.resolveEnemyOutcome();
  210 |   });
  211 |   const phase = page.locator('[data-battle-lesson="enemy-phase"]');
  212 |   await expect(phase).toBeVisible({ timeout: 20000 });
  213 |   await expect(phase).toContainText("+3 de velocidad"); await expect(phase).toContainText("no comienza otro duelo");
  214 |   await phase.locator("button").click(); await page.evaluate(async () => { await window.__eventFlow; });
  215 |   const lessons = await page.evaluate(() => window.__performanceReference.scene.saveData.campaign.sagaTutorial.completed);
  216 |   expect(lessons).toEqual(expect.arrayContaining(["enemy-encounters", "affinity-advantage", "enemy-phase"]));
  217 |   await page.evaluate(() => window.__performanceReference.game.destroy(true));
  218 | });
  219 | 
```