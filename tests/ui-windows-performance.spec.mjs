import { expect, test } from "@playwright/test";

async function openDojo(page) {
  await page.goto("/");
  await expect(page.locator(".save-selector")).toBeVisible();
  await page.evaluate(async () => {
    const s = await import("/src/save.js?v=0.131.0");
    s.writeSave(s.applyDebugCheckpoint(s.createCharacter(s.createDefaultSave(), { name: "Ventanas", affinity: "fuego" }), "mission-3-ready"));
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
    localStorage.setItem("music-enabled", "off");
  });
  await page.reload();
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-view="dojo"]').click();
  await page.locator('[data-dojo-tab="equipment"]').click();
  await page.locator(".location-dojo img:visible").evaluateAll(images => Promise.all(images.map(image => image.decode().catch(() => {}))));
}

// Mover el cursor en cada frame reproduce el coste de composición sin añadir
// la latencia de los mensajes de automatización al muestreo del navegador.
async function measure(page) {
  return page.evaluate(() => new Promise(resolve => {
    const intervals = [];
    const target = document.querySelector('dialog:modal, .equipment-modal:not([hidden]), .mission-decision-overlay') || document.querySelector("main");
    let start, previous;
    const frame = now => {
      start ??= now;
      if (previous !== undefined) intervals.push(now - previous);
      previous = now;
      target.dispatchEvent(new PointerEvent("pointermove", { clientX: 250 + (now - start) % 700, clientY: 260 + Math.sin(now / 150) * 90, bubbles: true }));
      if (now - start < 1400) { requestAnimationFrame(frame); return; }
      intervals.sort((a, b) => a - b);
      resolve({ frames: intervals.length, fps: intervals.length * 1000 / (now - start),
        mean: (now - start) / intervals.length, p95: intervals[Math.floor(intervals.length * .95)], max: intervals.at(-1) });
    };
    requestAnimationFrame(frame);
  }));
}

async function checkWindow(page, baseline, samples, name) {
  const sample = await measure(page);
  samples[name] = sample;
  // El presupuesto se adapta al equipo y deja margen para variación del runner.
  expect(sample.mean, `${name}: ${JSON.stringify(sample)}`).toBeLessThan(Math.max(50, baseline.mean * 2));
  expect(sample.p95, `${name}: ${JSON.stringify(sample)}`).toBeLessThanOrEqual(Math.max(100, baseline.p95 * 3));
  await expect(page.locator(".game-cursor.is-visible")).toHaveCount(1);
}

async function expectNoBackdropFilters(page) {
  const active = await page.evaluate(() => [...document.querySelectorAll("main, main *")].flatMap(element => {
    if (!element.getClientRects().length) return [];
    return [null, "::before", "::after", ...(element.matches("dialog[open]") ? ["::backdrop"] : [])].flatMap(pseudo => {
      const style = getComputedStyle(element, pseudo);
      return style.backdropFilter !== "none" ? [`${element.className}${pseudo || ""}: ${style.backdropFilter}`] : [];
    });
  }));
  expect(active).toEqual([]);
}

for (const width of [1280, 1600]) {
  test(`las ventanas del Dojo mantienen el ritmo de frames al mover el cursor a ${width}px`, async ({ page }, testInfo) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await openDojo(page);
    const baseline = await measure(page), samples = { baseline };
    for (const trigger of await page.locator("[data-gear-slot]").all()) {
      const type = await trigger.getAttribute("data-gear-slot");
      await trigger.click();
      await expect(page.locator(".equipment-modal:not(.master-modal)")).toBeVisible();
      await expectNoBackdropFilters(page);
      await checkWindow(page, baseline, samples, type);
      await page.locator("[data-close-equipment]").click();
      await expect(trigger).toBeFocused();
    }
    await page.locator("[data-open-master]").click();
    await expect(page.locator(".master-modal")).toBeVisible();
    await expectNoBackdropFilters(page);
    await checkWindow(page, baseline, samples, "masters");
    await page.screenshot({ path: testInfo.outputPath("maestros-sin-desenfoque.png") });
    await page.locator("[data-close-master]").click();
    await expect(page.locator("[data-open-master]")).toBeFocused();
    await testInfo.attach("frames-ventanas.json", { body: JSON.stringify(samples, null, 2), contentType: "application/json" });
    expect(errors).toEqual([]);
  });
}

test("los fondos de diálogos nativos y la preparación de misión evitan la misma caída", async ({ page }, testInfo) => {
  await openDojo(page);
  const baseline = await measure(page), samples = { baseline };
  // Ejercita ::backdrop y el cursor en la capa modal con las clases reales.
  for (const className of ["player-inventory-dialog", "mission-pause-dialog", "arena-result-dialog"]) {
    await page.evaluate(className => {
      const dialog = document.createElement("dialog");
      dialog.className = className;
      dialog.innerHTML = '<h2>Ventana de prueba</h2><button type="button">Cerrar</button>';
      dialog.id = "performance-dialog";
      document.querySelector("main").append(dialog);
      dialog.showModal();
    }, className);
    await expect(page.locator("#performance-dialog > .game-cursor")).toHaveCount(1);
    await expectNoBackdropFilters(page);
    await checkWindow(page, baseline, samples, className);
    await page.evaluate(() => document.getElementById("performance-dialog").remove());
    await expect(page.locator("body > .game-cursor")).toHaveCount(1);
  }
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-view="headquarters"]').click();
  await page.locator('[data-saga="saga-1"]').click();
  await page.locator('[data-mission="m03"]').click();
  const next = page.locator(".dialogue-overlay .primary-button");
  for (let i = 0; i < 20 && await next.textContent() === "SIGUIENTE"; i++) await next.click();
  await next.click();
  await expect(page.locator(".mission-decision-overlay")).toBeVisible();
  await expectNoBackdropFilters(page);
  await checkWindow(page, baseline, samples, "mission-decision");
  await page.getByRole("button", { name: "CANCELAR MISIÓN" }).click();
  await expect(page.locator(".mission-decision-overlay")).toHaveCount(0);
  await testInfo.attach("frames-dialogos.json", { body: JSON.stringify(samples, null, 2), contentType: "application/json" });
});
