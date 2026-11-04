# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tutorial-polish.spec.mjs >> rendimiento: la subida de nivel deja de dibujar escenas mientras espera
- Location: tests\tutorial-polish.spec.mjs:18:1

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 2
Received:    4
```

# Page snapshot

```yaml
- main [ref=e2]:
  - region "Juego de combate por turnos" [ref=e3]:
    - region "Tu maestro explica la subida de nivel" [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e8]:
          - strong [ref=e9]: Ren Arashiro
          - generic [ref=e10]: Jefe de la Aldea
        - generic [ref=e12]:
          - strong [ref=e13]: Mei Hayate
          - generic [ref=e14]: Tu maestro
      - paragraph [ref=e15]: "Ren Arashiro: Los PX de los duelos y del encargo aumentan tu nivel. Estos beneficios se confirman al regresar con éxito."
      - heading "Qué has ganado" [level=3] [ref=e16]
      - paragraph [ref=e17]: Tus atributos crecen automáticamente según tu afinidad; la tabla muestra cuánto.
      - paragraph [ref=e18]:
        - strong [ref=e19]: "+2 puntos de atributo:"
        - text: distribúyelos con + en Dojo → Estadísticas.
      - paragraph [ref=e20]:
        - strong [ref=e21]: "+2 PR:"
        - text: gástalos en Dojo → Técnicas para aprender o mejorar habilidades.
      - paragraph [ref=e22]: "Tu rango actual es Novicio. Subir de nivel no concede otro rango: las pruebas de afinidad permiten ascender."
    - dialog "Nuevo nivel 13" [active] [ref=e23]: "Subiste del nivel 12 al 13. Afinidad FUEGO. VIDA: 171 a 177, más 6. FUERZA: 35 a 36, más 1. VELOCIDAD: 11 a 12, más 1. CHAKRA: 113 a 116, más 3. SUERTE: 12 a 13, más 1. Ganaste 2 puntos de atributo y 2 PR para el Dojo. Se confirmará al regresar a la aldea. Pulsa Intro para aceptar y volver al combate."
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { bootPerformanceReference } from "./helpers/performance-harness.mjs";
  3  | 
  4  | async function sampleRendering(page) {
  5  |   await page.evaluate(() => {
  6  |     const game = window.__performanceReference.game;
  7  |     // Phaser también emite prerender en headlessStep, con renderer=null.
  8  |     window.__renderSample = { count: 0, callback: renderer => { if (renderer) window.__renderSample.count++; } };
  9  |     game.events.on("prerender", window.__renderSample.callback);
  10 |   });
  11 |   await page.waitForTimeout(950);
  12 |   return page.evaluate(() => {
  13 |     window.__performanceReference.game.events.off("prerender", window.__renderSample.callback);
  14 |     return window.__renderSample.count;
  15 |   });
  16 | }
  17 | 
  18 | test("rendimiento: la subida de nivel deja de dibujar escenas mientras espera", async ({ page }, info) => {
  19 |   await page.emulateMedia({ reducedMotion: "no-preference" });
  20 |   await bootPerformanceReference(page);
  21 |   await page.evaluate(async () => {
  22 |     const state = window.__performanceReference;
  23 |     const { LevelUpScene } = await import("/src/battle/scenes/level-up-scene.js?v=0.95.0");
  24 |     state.game.scene.add("level-up", LevelUpScene);
  25 |     const preview = structuredClone(state.scene.saveData);
  26 |     preview.progression.level++; preview.progression.attributePoints += 2;
  27 |     window.__levelPreview = state.scene.showPendingLevelUp(preview);
  28 |   });
  29 |   await expect(page.locator(".level-up-accessible")).toBeAttached({ timeout: 20000 });
  30 |   await expect.poll(() => page.evaluate(() => {
  31 |     const scene = window.__performanceReference.game.scene.getScene("level-up");
  32 |     return scene.children.getByName("level-up-panel")?.list.some(item => item.name === "level-up-continue" && item.input?.enabled);
  33 |   })).toBe(true);
  34 |   await page.waitForTimeout(2200);
  35 |   const renders = await sampleRendering(page);
  36 |   await info.attach("renderizado-subida", { body: JSON.stringify({ renders, milliseconds: 950 }), contentType: "application/json" });
  37 |   console.log(`Subida de nivel: ${renders} renders / 950 ms`);
> 38 |   if (!process.env.TUTORIAL_BASELINE) expect(renders).toBeLessThanOrEqual(2);
     |                                                       ^ Error: expect(received).toBeLessThanOrEqual(expected)
  39 |   await page.keyboard.press("Enter");
  40 |   await expect.poll(() => page.evaluate(() => window.__performanceReference.scene.scene.isActive())).toBe(true);
  41 |   await page.evaluate(async () => { await window.__levelPreview; window.__performanceReference.game.destroy(true); });
  42 | });
  43 | 
  44 | test("rendimiento: la decisión del teniente conserva un fondo estático e interactivo", async ({ page }, info) => {
  45 |   await bootPerformanceReference(page);
  46 |   await page.evaluate(() => { window.__choice = window.__performanceReference.scene.playPrisonerChoice(); });
  47 |   await page.waitForTimeout(350);
  48 |   const renders = await sampleRendering(page);
  49 |   await info.attach("renderizado-decision", { body: JSON.stringify({ renders, milliseconds: 950 }), contentType: "application/json" });
  50 |   console.log(`Decisión del teniente: ${renders} renders / 950 ms`);
  51 |   if (!process.env.TUTORIAL_BASELINE) expect(renders).toBeLessThanOrEqual(2);
  52 |   const box = await page.locator("#game > canvas").boundingBox();
  53 |   await page.mouse.click(box.x + 330 / 960 * box.width, box.y + 350 / 540 * box.height);
  54 |   await page.evaluate(async () => { await window.__choice; });
  55 |   expect(await page.evaluate(() => window.__performanceReference.scene.saveData.campaign.banditPrisonerChoice)).toBe("interrogate");
  56 |   await page.evaluate(() => window.__performanceReference.game.destroy(true));
  57 | });
  58 | 
```