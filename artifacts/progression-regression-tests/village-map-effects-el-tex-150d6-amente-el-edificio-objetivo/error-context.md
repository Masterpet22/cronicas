# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: village-map-effects.spec.mjs >> el texto de la misión actual abre directamente el edificio objetivo
- Location: tests\village-map-effects.spec.mjs:79:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.story-mission-current')
Timeout: 8000ms
- Expected substring  - 1
+ Received string     + 5

- IR A: CUARTEL GENERAL
+
+         Tras las huellas del gato
+         
+         IR A: Cuartel General
+       

Call log:
  - Expect "toContainText" locator('.story-mission-current') with timeout 8000ms
  - waiting for locator('.story-mission-current')
    19 × locator resolved to <button type="button" data-view="headquarters" class="story-mission-current" title="Bosque del Este · 8–10 min" aria-label="Ir a Cuartel General: Tras las huellas del gato">…</button>
       - unexpected value "
        Tras las huellas del gato
        
        IR A: Cuartel General
      "

```

```yaml
- 'button "Ir a Cuartel General: Tras las huellas del gato"':
  - strong: Tras las huellas del gato
  - text: "IR A: Cuartel General"
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | async function seed(page) {
  4   |   await page.goto("/");
  5   |   await page.evaluate(async () => {
  6   |     const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.131.0");
  7   |     const save = createCharacter(createDefaultSave(), { name: "Akio", affinity: "fuego" });
  8   |     save.campaign.tutorialSeen = true; writeSave(save);
  9   |     sessionStorage.setItem("cronicas-save-slot-selected", "1"); localStorage.setItem("music-enabled", "off");
  10  |   });
  11  |   await page.reload(); await page.locator(".village-map > img").evaluate(image => image.decode());
  12  | }
  13  | const ids = ["headquarters", "dojo", "archive", "shop", "tower", "arena", "inn", "missions", "event"];
  14  | 
  15  | for (const width of [1280, 1600]) test(`iluminación y etiqueta compacta siguen los nueve edificios a ${width}`, async ({ page }, testInfo) => {
  16  |   const errors = []; page.on("pageerror", error => errors.push(error.message));
  17  |   await page.emulateMedia({ reducedMotion: "no-preference" });
  18  |   await page.setViewportSize({ width, height: width === 1280 ? 720 : 900 }); await seed(page);
  19  |   await expect(page.locator(".map-label.visible")).toHaveCount(0);
  20  |   const missionLight = page.locator('[data-mission-light="headquarters"]');
  21  |   await expect(missionLight).toHaveCount(1);
  22  |   await expect(page.locator('.village-hotspot[data-go="headquarters"]')).toHaveAttribute("data-mission-target", "");
  23  |   await expect(missionLight).toHaveCSS("animation-name", "village-mission-pulse");
  24  |   await expect(page.locator('.village-hotspot[data-go="headquarters"] .hotspot-contour')).toHaveCSS("animation-name", "village-mission-contour-pulse");
  25  |   await expect(page.locator('.village-hotspot[data-go="headquarters"] .hotspot-lighting')).toHaveCSS("animation-name", "village-mission-lighting-pulse");
  26  |   const pulseDuration = Number.parseFloat(await missionLight.evaluate(element => getComputedStyle(element).animationDuration)) * 1000;
  27  |   expect(pulseDuration).toBeGreaterThanOrEqual(2400);
  28  |   expect(pulseDuration).toBeLessThanOrEqual(2800);
  29  |   for (const id of ids) {
  30  |     const hotspot = page.locator(`.village-hotspot[data-go="${id}"]`);
  31  |     await hotspot.focus();
  32  |     await expect(hotspot).toHaveClass(/is-highlighted/);
  33  |     await expect(hotspot.locator(".hotspot-contour")).toHaveCSS("opacity", "1");
  34  |     await expect(hotspot.locator(".hotspot-lighting")).toHaveCSS("opacity", "1");
  35  |     await expect(page.locator(".village-hotspot.is-highlighted")).toHaveCount(1);
  36  |     await expect(page.locator("[data-building-light]")).toHaveAttribute("clip-path", `url(#village-clip-${id})`);
  37  |     await expect(page.locator(`[data-map-label="${id}"]`)).toHaveCSS("opacity", "1");
  38  |     await expect(page.locator(".map-label.visible")).toHaveCount(1);
  39  |     await expect(page.locator(".map-label small")).toHaveCount(7);
  40  |     await page.screenshot({ path: testInfo.outputPath(`${id}-seleccionado.png`) });
  41  |   }
  42  |   // La misma iluminación se activa con el ratón y vuelve al foco al salir.
  43  |   await page.locator('.village-hotspot[data-go="archive"]').hover();
  44  |   await expect(page.locator('.village-hotspot[data-go="archive"]')).toHaveClass(/is-highlighted/);
  45  |   await page.mouse.move(1, 1);
  46  |   await expect(page.locator('.village-hotspot[data-go="event"]')).toHaveClass(/is-highlighted/);
  47  |   expect(await page.locator(".village-map").evaluate(map => map.scrollWidth <= map.clientWidth && map.getBoundingClientRect().right <= innerWidth)).toBe(true);
  48  |   expect(errors).toEqual([]);
  49  | });
  50  | 
  51  | test("los bordes visibles excluyen el paisaje que rodea los edificios", async ({ page }) => {
  52  |   await seed(page);
  53  |   const probes = {
  54  |     dojo: { inside: [510, 460], outside: [[600, 350], [350, 475]] },
  55  |     inn: { inside: [330, 800], outside: [[65, 680], [490, 715], [260, 610]] },
  56  |     archive: { inside: [165, 380], outside: [[305, 440]] },
  57  |     shop: { inside: [1240, 480], outside: [[1315, 365], [1045, 552]] },
  58  |     tower: { inside: [1465, 340], outside: [[1535, 235]] },
  59  |     headquarters: { inside: [860, 385], outside: [[980, 214]] },
  60  |     arena: { inside: [1420, 720], outside: [[1264, 590], [1260, 870]] },
  61  |     missions: { inside: [744, 800], outside: [[860, 820]] },
  62  |     event: { inside: [875, 675], outside: [[820, 500], [945, 605]] }
  63  |   };
  64  |   const geometry = await page.evaluate(probes => Object.entries(probes).map(([id, { inside, outside }]) => {
  65  |     const clip = document.querySelector(`#village-clip-${id} path`);
  66  |     const contour = document.querySelector(`.hotspot-${id} .hotspot-contour`);
  67  |     const hit = document.querySelector(`.hotspot-${id} .hotspot-shape`);
  68  |     return { id, inside: clip.isPointInFill(new DOMPoint(...inside)), outside: outside.map(point => clip.isPointInFill(new DOMPoint(...point))),
  69  |       independent: contour.getAttribute("d") !== hit.getAttribute("d"), sameClip: clip.getAttribute("d") === contour.getAttribute("d") };
  70  |   }), probes);
  71  |   for (const result of geometry) {
  72  |     expect(result.inside, result.id).toBe(true);
  73  |     expect(result.outside, result.id).toEqual(result.outside.map(() => false));
  74  |     expect(result.independent, result.id).toBe(true);
  75  |     expect(result.sameClip, result.id).toBe(true);
  76  |   }
  77  | });
  78  | 
  79  | test("el texto de la misión actual abre directamente el edificio objetivo", async ({ page }) => {
  80  |   await seed(page);
  81  |   const mission = page.locator(".story-mission-current");
  82  |   await expect(mission).toHaveAttribute("data-view", "headquarters");
> 83  |   await expect(mission).toContainText("IR A: CUARTEL GENERAL");
      |                         ^ Error: expect(locator).toContainText(expected) failed
  84  |   await mission.click();
  85  |   await expect(page.locator('[data-location-stage="headquarters"]')).toBeVisible();
  86  | });
  87  | 
  88  | test("el destello respeta la elección, evita entradas dobles y se puede cancelar", async ({ page }) => {
  89  |   await page.emulateMedia({ reducedMotion: "no-preference" }); await seed(page);
  90  |   const dojo = page.locator('.village-hotspot[data-go="dojo"]'), map = page.locator(".village-map");
  91  |   await dojo.focus(); await dojo.press("Enter");
  92  |   await expect(map).toHaveClass(/is-entering/);
  93  |   await expect(dojo).toHaveClass(/is-entering/);
  94  |   await expect(map).toHaveAttribute("aria-busy", "true");
  95  |   await dojo.press("Escape");
  96  |   await expect(map).not.toHaveClass(/is-entering/);
  97  |   await page.waitForTimeout(450); await expect(map).toBeVisible();
  98  |   await dojo.press("Space");
  99  |   await page.locator('.village-hotspot[data-go="shop"]').dispatchEvent("click");
  100 |   await expect(page.locator('[data-location-stage="dojo"]')).toBeVisible();
  101 |   await expect(page.locator('[data-location-stage="shop"]')).toHaveCount(0);
  102 |   await expect(page.locator(".village-map")).toHaveCount(0);
  103 | });
  104 | 
  105 | test("con movimiento reducido todos los destinos abren sin esperar al destello", async ({ page }) => {
  106 |   await seed(page);
  107 |   await expect(page.locator('[data-mission-light="headquarters"]')).toHaveCSS("animation-name", "none");
  108 |   for (const id of ids) {
  109 |     const hotspot = page.locator(`.village-hotspot[data-go="${id}"]`);
  110 |     await hotspot.focus();
  111 |     if (id === "headquarters") expect(await hotspot.evaluate(button => {
  112 |       button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  113 |       return Boolean(document.querySelector('[data-location-stage="headquarters"]'));
  114 |     })).toBe(true);
  115 |     else if (await hotspot.getAttribute("aria-disabled") === "true") { await hotspot.press("Enter"); await expect(page.locator(".village-map")).toBeVisible(); continue; }
  116 |     else await hotspot.press("Enter");
  117 |     await expect(page.locator(`[data-location-stage="${id}"]`)).toBeVisible();
  118 |     await page.locator('[data-view="plaza"]').first().click();
  119 |     await expect(page.locator(".village-map")).toBeVisible();
  120 |     await expect(page.locator(".village-map")).not.toHaveAttribute("aria-busy");
  121 |   }
  122 | });
  123 | 
```