import { expect, test } from "@playwright/test";

async function startSearch(page) {
  await page.goto("/");
  await page.evaluate(async () => {
    const { createDefaultSave, createCharacter, applyDebugCheckpoint, writeSave } = await import("/src/save.js?v=0.94.0");
    const save = createCharacter(createDefaultSave(), { name: "Akio", affinity: "fuego", appearance: "#315f87", bodyType: "male" });
    writeSave(applyDebugCheckpoint(save, "doctor-ready"));
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
    localStorage.setItem("music-enabled", "off");
  });
  await page.reload();
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-view="missions"]').click();
  await page.locator('[data-secondary-mission="s02"]').click();
  const dialogue = page.locator(".dialogue-overlay");
  await expect(dialogue).toBeVisible();
  for (let i = 0; i < 8 && await dialogue.isVisible(); i += 1) await dialogue.locator("button").click();
  await expect(page.locator(".route-atlas")).toBeVisible({ timeout: 20_000 });
}

for (const viewport of [{ width: 1600, height: 900 }, { width: 1360, height: 748 }]) {
  test(`mapa conectado, investigación y reanudación a ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await startSearch(page);
    await expect(page.locator(".route-node:enabled")).toHaveCount(3);
    await expect(page.locator(".route-map-links path")).toHaveCount(16);
    await page.screenshot({ path: `artifacts/doctor-route/map-${viewport.width}.png` });

    // Visible SVG paths terminate exactly at the centres of interactive icons.
    const maxEndpointError = await page.evaluate(() => {
      const svg = document.querySelector(".route-map-links");
      const transform = svg.getScreenCTM();
      let error = 0;
      for (const path of svg.querySelectorAll("path")) {
        const ids = path.dataset.routeEdge.split(":");
        for (const [index, id] of ids.entries()) {
          const icon = document.querySelector(id === "start" ? ".route-map-start i" : id === "haru" ? ".route-destination i" : `[data-route-node="${id}"] i`);
          const box = icon.getBoundingClientRect();
          const point = path.getPointAtLength(index ? path.getTotalLength() : 0);
          const screen = new DOMPoint(point.x, point.y).matrixTransform(transform);
          error = Math.max(error, Math.hypot(screen.x - box.x - box.width / 2, screen.y - box.y - box.height / 2));
        }
      }
      return error;
    });
    expect(maxEndpointError).toBeLessThan(1);

    await page.locator('[data-route-node="ridge"]').click();
    await expect(page.locator(".route-node:enabled")).toHaveCount(2);
    await expect(page.locator('[data-route-node="ambush"]')).toBeDisabled();
    await expect(page.locator('[data-route-edge="start:ridge"]')).toHaveClass(/travelled/);
    await page.locator('[data-route-node="reeds"]').click();
    await expect(page.locator(".river-investigation")).toBeVisible();
    await expect(page.locator('[data-route-node="reeds"]')).toHaveAttribute("aria-current", "step");
    await expect(page.locator(".route-node:enabled")).toHaveCount(0);
    await page.screenshot({ path: `artifacts/doctor-route/river-${viewport.width}.png` });
    const fits = await page.locator(".route-workspace").evaluate((element) => {
      const workspace = element.getBoundingClientRect();
      const stage = document.querySelector(".village-shell").getBoundingClientRect();
      return workspace.bottom <= stage.bottom && workspace.right <= stage.right;
    });
    expect(fits).toBe(true);

    await page.reload();
    await page.locator(".debug-tools-trigger").click();
    await page.locator('[data-debug-view="missions"]').click();
    await page.locator('[data-secondary-mission="s02"]').click();
    await expect(page.locator(".river-investigation")).toBeVisible({ timeout: 20_000 });
    await page.locator('[data-passage="stones"]').click();
    await expect(page.locator(".river-investigation")).toBeVisible();
    await page.locator('[data-passage="reeds"]').click();
    await expect(page.locator(".route-node:enabled")).toHaveCount(3);
    const logFits = await page.locator(".route-log").evaluate((element) => element.getBoundingClientRect().bottom <= document.querySelector("main").getBoundingClientRect().bottom);
    expect(logFits).toBe(true);
    const labelsFit = await page.locator(".route-atlas").evaluate((element) => {
      const footerTop = element.querySelector("footer").getBoundingClientRect().top;
      return [...element.querySelectorAll(".route-node small")].every((label) => label.getBoundingClientRect().bottom <= footerTop);
    });
    expect(labelsFit).toBe(true);
    await page.screenshot({ path: `artifacts/doctor-route/chosen-${viewport.width}.png` });
    await page.locator('[data-route-node="camp"]').click();
    await expect(page.locator(".doctor-meeting")).toBeVisible();
    await expect(page.locator(".dialogue-overlay")).toContainText("Gracias por venir a buscarme");
    for (let i = 0; i < 3; i += 1) await page.locator(".dialogue-overlay button").click();
    await expect(page.locator(".cipher-screen")).toBeVisible();
    await expect(page.locator(".cipher-cell")).toHaveCount(36);
    await expect(page.locator("[data-complete-doctor]")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("la ruta del bosque inicia el duelo desde el nodo conectado", async ({ page }) => {
  await startSearch(page);
  await page.locator('[data-route-node="clearing"]').click();
  await expect(page.locator(".route-node:enabled")).toHaveCount(1);
  await expect(page.locator('[data-route-node="ambush"]')).toBeEnabled();
  await page.locator('[data-route-node="ambush"]').click();
  await expect(page.locator("#game canvas")).toBeVisible();
  await expect(page.locator(".route-atlas")).toBeHidden();
  const pending = await page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")).campaign.doctorRoute);
  expect(pending).toMatchObject({ phase: 1, choices: ["forest"], pendingEvent: { type: "combat", routeId: "forest" } });
});
