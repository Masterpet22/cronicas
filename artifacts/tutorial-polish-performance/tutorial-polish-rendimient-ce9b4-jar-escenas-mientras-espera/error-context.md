# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tutorial-polish.spec.mjs >> rendimiento: la subida de nivel deja de dibujar escenas mientras espera
- Location: tests\tutorial-polish.spec.mjs:17:1

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 2
Received:    59
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
      - paragraph [ref=e22]: Subir de nivel y subir de rango son avances distintos. Sigues siendo Novicio hasta superar la prueba de la segunda afinidad.
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
  7  |     window.__renderSample = { count: 0, callback: () => window.__renderSample.count++ };
  8  |     game.events.on("prerender", window.__renderSample.callback);
  9  |   });
  10 |   await page.waitForTimeout(950);
  11 |   return page.evaluate(() => {
  12 |     window.__performanceReference.game.events.off("prerender", window.__renderSample.callback);
  13 |     return window.__renderSample.count;
  14 |   });
  15 | }
  16 | 
  17 | test("rendimiento: la subida de nivel deja de dibujar escenas mientras espera", async ({ page }, info) => {
  18 |   await page.emulateMedia({ reducedMotion: "no-preference" });
  19 |   await bootPerformanceReference(page);
  20 |   await page.evaluate(async () => {
  21 |     const state = window.__performanceReference;
  22 |     const { LevelUpScene } = await import("/src/battle/scenes/level-up-scene.js?v=0.95.0");
  23 |     state.game.scene.add("level-up", LevelUpScene);
  24 |     const preview = structuredClone(state.scene.saveData);
  25 |     preview.progression.level++; preview.progression.attributePoints += 2;
  26 |     window.__levelPreview = state.scene.showPendingLevelUp(preview);
  27 |   });
  28 |   await expect(page.locator(".level-up-accessible")).toBeAttached({ timeout: 20000 });
  29 |   await expect.poll(() => page.evaluate(() => {
  30 |     const scene = window.__performanceReference.game.scene.getScene("level-up");
  31 |     return scene.children.getByName("level-up-panel")?.list.some(item => item.name === "level-up-continue" && item.input?.enabled);
  32 |   })).toBe(true);
  33 |   await page.waitForTimeout(2200);
  34 |   const renders = await sampleRendering(page);
  35 |   await info.attach("renderizado-subida", { body: JSON.stringify({ renders, milliseconds: 950 }), contentType: "application/json" });
  36 |   console.log(`Subida de nivel: ${renders} renders / 950 ms`);
> 37 |   if (!process.env.TUTORIAL_BASELINE) expect(renders).toBeLessThanOrEqual(2);
     |                                                       ^ Error: expect(received).toBeLessThanOrEqual(expected)
  38 |   await page.keyboard.press("Enter");
  39 |   await expect.poll(() => page.evaluate(() => window.__performanceReference.scene.scene.isActive())).toBe(true);
  40 |   await page.evaluate(async () => { await window.__levelPreview; window.__performanceReference.game.destroy(true); });
  41 | });
  42 | 
  43 | test("rendimiento: la decisión del teniente conserva un fondo estático e interactivo", async ({ page }, info) => {
  44 |   await bootPerformanceReference(page);
  45 |   await page.evaluate(() => { window.__choice = window.__performanceReference.scene.playPrisonerChoice(); });
  46 |   await page.waitForTimeout(350);
  47 |   const renders = await sampleRendering(page);
  48 |   await info.attach("renderizado-decision", { body: JSON.stringify({ renders, milliseconds: 950 }), contentType: "application/json" });
  49 |   console.log(`Decisión del teniente: ${renders} renders / 950 ms`);
  50 |   if (!process.env.TUTORIAL_BASELINE) expect(renders).toBeLessThanOrEqual(2);
  51 |   const box = await page.locator("#game > canvas").boundingBox();
  52 |   await page.mouse.click(box.x + 330 / 960 * box.width, box.y + 350 / 540 * box.height);
  53 |   await page.evaluate(async () => { await window.__choice; });
  54 |   expect(await page.evaluate(() => window.__performanceReference.scene.saveData.campaign.banditPrisonerChoice)).toBe("interrogate");
  55 |   await page.evaluate(() => window.__performanceReference.game.destroy(true));
  56 | });
  57 | 
```