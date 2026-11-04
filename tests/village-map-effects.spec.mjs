import { test, expect } from "@playwright/test";

async function seed(page) {
  await page.goto("/");
  await page.evaluate(async () => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.131.0");
    const save = createCharacter(createDefaultSave(), { name: "Akio", affinity: "fuego" });
    save.campaign.tutorialSeen = true; writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1"); localStorage.setItem("music-enabled", "off");
  });
  await page.reload(); await page.locator(".village-map > img").evaluate(image => image.decode());
}
const ids = ["headquarters", "dojo", "archive", "shop", "tower", "arena", "inn", "missions", "event"];

for (const width of [1280, 1600]) test(`iluminación y etiqueta compacta siguen los nueve edificios a ${width}`, async ({ page }, testInfo) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width, height: width === 1280 ? 720 : 900 }); await seed(page);
  await expect(page.locator(".map-label.visible")).toHaveCount(0);
  const missionLight = page.locator('[data-mission-light="headquarters"]');
  await expect(missionLight).toHaveCount(1);
  await expect(page.locator('.village-hotspot[data-go="headquarters"]')).toHaveAttribute("data-mission-target", "");
  await expect(missionLight).toHaveCSS("animation-name", "village-mission-pulse");
  await expect(page.locator('.village-hotspot[data-go="headquarters"] .hotspot-contour')).toHaveCSS("animation-name", "village-mission-contour-pulse");
  await expect(page.locator('.village-hotspot[data-go="headquarters"] .hotspot-lighting')).toHaveCSS("animation-name", "village-mission-lighting-pulse");
  const pulseDuration = Number.parseFloat(await missionLight.evaluate(element => getComputedStyle(element).animationDuration)) * 1000;
  expect(pulseDuration).toBeGreaterThanOrEqual(2400);
  expect(pulseDuration).toBeLessThanOrEqual(2800);
  for (const id of ids) {
    const hotspot = page.locator(`.village-hotspot[data-go="${id}"]`);
    await hotspot.focus();
    await expect(hotspot).toHaveClass(/is-highlighted/);
    await expect(hotspot.locator(".hotspot-contour")).toHaveCSS("opacity", "1");
    await expect(hotspot.locator(".hotspot-lighting")).toHaveCSS("opacity", "1");
    await expect(page.locator(".village-hotspot.is-highlighted")).toHaveCount(1);
    await expect(page.locator("[data-building-light]")).toHaveAttribute("clip-path", `url(#village-clip-${id})`);
    await expect(page.locator(`[data-map-label="${id}"]`)).toHaveCSS("opacity", "1");
    await expect(page.locator(".map-label.visible")).toHaveCount(1);
    await expect(page.locator(".map-label small")).toHaveCount(7);
    await page.screenshot({ path: testInfo.outputPath(`${id}-seleccionado.png`) });
  }
  // La misma iluminación se activa con el ratón y vuelve al foco al salir.
  await page.locator('.village-hotspot[data-go="archive"]').hover();
  await expect(page.locator('.village-hotspot[data-go="archive"]')).toHaveClass(/is-highlighted/);
  await page.mouse.move(1, 1);
  await expect(page.locator('.village-hotspot[data-go="event"]')).toHaveClass(/is-highlighted/);
  expect(await page.locator(".village-map").evaluate(map => map.scrollWidth <= map.clientWidth && map.getBoundingClientRect().right <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("los bordes visibles excluyen el paisaje que rodea los edificios", async ({ page }) => {
  await seed(page);
  const probes = {
    dojo: { inside: [510, 460], outside: [[600, 350], [350, 475]] },
    inn: { inside: [330, 800], outside: [[65, 680], [490, 715], [260, 610]] },
    archive: { inside: [165, 380], outside: [[305, 440]] },
    shop: { inside: [1240, 480], outside: [[1315, 365], [1045, 552]] },
    tower: { inside: [1465, 340], outside: [[1535, 235]] },
    headquarters: { inside: [860, 385], outside: [[980, 214]] },
    arena: { inside: [1420, 720], outside: [[1264, 590], [1260, 870]] },
    missions: { inside: [744, 800], outside: [[860, 820]] },
    event: { inside: [875, 675], outside: [[820, 500], [945, 605]] }
  };
  const geometry = await page.evaluate(probes => Object.entries(probes).map(([id, { inside, outside }]) => {
    const clip = document.querySelector(`#village-clip-${id} path`);
    const contour = document.querySelector(`.hotspot-${id} .hotspot-contour`);
    const hit = document.querySelector(`.hotspot-${id} .hotspot-shape`);
    return { id, inside: clip.isPointInFill(new DOMPoint(...inside)), outside: outside.map(point => clip.isPointInFill(new DOMPoint(...point))),
      independent: contour.getAttribute("d") !== hit.getAttribute("d"), sameClip: clip.getAttribute("d") === contour.getAttribute("d") };
  }), probes);
  for (const result of geometry) {
    expect(result.inside, result.id).toBe(true);
    expect(result.outside, result.id).toEqual(result.outside.map(() => false));
    expect(result.independent, result.id).toBe(true);
    expect(result.sameClip, result.id).toBe(true);
  }
});

test("el texto de la misión actual abre directamente el edificio objetivo", async ({ page }) => {
  await seed(page);
  const mission = page.locator(".story-mission-current");
  await expect(mission).toHaveAttribute("data-view", "headquarters");
  await expect(mission).toContainText("IR A: Cuartel General");
  await mission.click();
  await expect(page.locator('[data-location-stage="headquarters"]')).toBeVisible();
});

test("el destello respeta la elección, evita entradas dobles y se puede cancelar", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" }); await seed(page);
  const dojo = page.locator('.village-hotspot[data-go="dojo"]'), map = page.locator(".village-map");
  await dojo.focus(); await dojo.press("Enter");
  await expect(map).toHaveClass(/is-entering/);
  await expect(dojo).toHaveClass(/is-entering/);
  await expect(map).toHaveAttribute("aria-busy", "true");
  await dojo.press("Escape");
  await expect(map).not.toHaveClass(/is-entering/);
  await page.waitForTimeout(450); await expect(map).toBeVisible();
  await dojo.press("Space");
  await page.locator('.village-hotspot[data-go="shop"]').dispatchEvent("click");
  await expect(page.locator('[data-location-stage="dojo"]')).toBeVisible();
  await expect(page.locator('[data-location-stage="shop"]')).toHaveCount(0);
  await expect(page.locator(".village-map")).toHaveCount(0);
});

test("con movimiento reducido todos los destinos abren sin esperar al destello", async ({ page }) => {
  await seed(page);
  await expect(page.locator('[data-mission-light="headquarters"]')).toHaveCSS("animation-name", "none");
  for (const id of ids) {
    const hotspot = page.locator(`.village-hotspot[data-go="${id}"]`);
    await hotspot.focus();
    if (id === "headquarters") expect(await hotspot.evaluate(button => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      return Boolean(document.querySelector('[data-location-stage="headquarters"]'));
    })).toBe(true);
    else if (await hotspot.getAttribute("aria-disabled") === "true") { await hotspot.press("Enter"); await expect(page.locator(".village-map")).toBeVisible(); continue; }
    else await hotspot.press("Enter");
    await expect(page.locator(`[data-location-stage="${id}"]`)).toBeVisible();
    await page.locator('[data-view="plaza"]').first().click();
    await expect(page.locator(".village-map")).toBeVisible();
    await expect(page.locator(".village-map")).not.toHaveAttribute("aria-busy");
  }
});
