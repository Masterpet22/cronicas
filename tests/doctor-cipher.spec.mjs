import { expect, test } from "@playwright/test";

async function openDoctor(page, seed = true) {
  if (seed) {
    await page.goto("/");
    await page.evaluate(async () => {
      const { createDefaultSave, createCharacter, applyDebugCheckpoint, startDoctorMission, chooseDoctorMissionRoute, writeSave } = await import("/src/save.js?v=0.94.0");
      let save = startDoctorMission(applyDebugCheckpoint(createCharacter(createDefaultSave(), { name: "Akio", affinity: "fuego", appearance: "#315f87", bodyType: "male" }), "doctor-ready"));
      for (let i = 0; i < 3; i += 1) save = chooseDoctorMissionRoute(save, "elevated");
      writeSave(save);
      sessionStorage.setItem("cronicas-save-slot-selected", "1");
      localStorage.setItem("music-enabled", "off");
    });
  }
  await page.reload();
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-view="headquarters"]').click();
  await page.locator('[data-saga="saga-1"]').click();
  await page.locator('[data-mission="s02"]').click();
}

async function finishLesson(page) {
  await expect(page.locator(".dialogue-overlay")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".dialogue-overlay")).toContainText("Gracias por venir");
  await page.locator(".dialogue-overlay button").click();
  await expect(page.locator(".dialogue-overlay")).toContainText("mismos sellos");
  await page.locator(".dialogue-overlay button").click();
  await expect(page.locator(".dialogue-overlay")).toContainText("cuatro o más");
  await page.locator(".dialogue-overlay button").click();
}

async function storedCipher(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")).campaign.doctorRoute.cipher);
}

async function playHint(page) {
  await page.locator("[data-cipher-hint]").click();
  const cells = await page.locator(".cipher-cell.hinted").evaluateAll((elements) => elements.map((element) => element.dataset.cipherCell));
  expect(cells).toHaveLength(2);
  await page.locator(`[data-cipher-cell="${cells[0]}"]`).click();
  await page.locator(`[data-cipher-cell="${cells[1]}"]`).click();
  await expect(page.locator(".cipher-grid")).toHaveAttribute("aria-busy", "false");
}

test("Haru agradece, explica los sellos y da paso al tablero con una transición", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openDoctor(page);
  await expect(page.locator("[data-complete-doctor]")).toHaveCount(0);
  await finishLesson(page);
  await expect(page.locator(".cipher-entry-transition")).toBeVisible();
  await expect(page.locator(".cipher-screen")).toBeVisible();
  await expect(page.locator(".cipher-cell")).toHaveCount(36);
  await expect(page.locator("[data-cipher-progress]")).toHaveText("0/36");
  const backgrounds = await page.locator(".cipher-glyph").first().evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(backgrounds).toContain("sellos-constelaciones.png");
  await page.screenshot({ path: "artifacts/doctor-cipher/tablero-inicial.png" });
  await playHint(page);
  const cipher = await storedCipher(page);
  expect(cipher.moves).toBe(1);
  expect(cipher.revealed.filter(Boolean).length).toBeGreaterThanOrEqual(3);
  await page.screenshot({ path: "artifacts/doctor-cipher/primeros-fragmentos.png" });
  expect(errors).toEqual([]);
});

test("el cifrado se reanuda, revela el mapa completo y solo entonces entrega el libro", async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 748 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openDoctor(page);
  await finishLesson(page);
  await expect(page.locator(".cipher-screen")).toBeVisible();
  // Una jugada inválida se revierte sin gastar movimiento ni descubrir tinta.
  const invalid = await page.evaluate(async () => {
    const { cipherMoves } = await import("/src/puzzles/seal-cipher.js");
    const state = JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")).campaign.doctorRoute.cipher;
    const valid = cipherMoves(state);
    for (let from = 0; from < 36; from += 1) for (const to of [from + 1, from + 6]) {
      if (to < 36 && (to - from === 6 || Math.floor(from / 6) === Math.floor(to / 6)) && !valid.some((move) => move.from === from && move.to === to)) return { from, to };
    }
  });
  await page.locator(`[data-cipher-cell="${invalid.from}"]`).click();
  await page.locator(`[data-cipher-cell="${invalid.to}"]`).click();
  await expect(page.locator(".cipher-grid")).toHaveAttribute("aria-busy", "false");
  expect((await storedCipher(page)).moves).toBe(0);
  await expect(page.locator("[data-cipher-feedback]")).toContainText("no forman una combinación");
  await playHint(page);
  const beforeReload = await storedCipher(page);
  await openDoctor(page, false);
  await expect(page.locator(".cipher-screen")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".dialogue-overlay")).toHaveCount(0);
  expect(await storedCipher(page)).toEqual(beforeReload);
  await page.screenshot({ path: "artifacts/doctor-cipher/tablero-1360.png" });
  const fits = await page.locator(".cipher-workspace").evaluate((element) => {
    const stage = document.querySelector("main").getBoundingClientRect();
    return [...element.querySelectorAll(".cipher-guidance, .cipher-puzzle")].every((item) => item.getBoundingClientRect().bottom <= stage.bottom - 15);
  });
  expect(fits).toBe(true);
  for (let moves = 0; moves < 100 && !await page.locator(".cipher-solved").count(); moves += 1) await playHint(page);
  await expect(page.locator(".cipher-solved")).toBeVisible();
  await expect(page.locator("[data-cipher-progress]")).toHaveText("36/36");
  await expect(page.locator(".cipher-ink > span.revealed")).toHaveCount(36);
  await expect(page.locator(".cipher-map-image")).not.toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("[data-complete-doctor]")).toBeVisible();
  const completedBeforeReturn = await page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")).campaign.completedMissions.includes("s02"));
  expect(completedBeforeReturn).toBe(false);
  await page.screenshot({ path: "artifacts/doctor-cipher/mapa-revelado.png" });
  await page.locator("[data-complete-doctor]").click();
  await expect(page.locator("#game canvas")).toBeVisible();
  await expect.poll(async () => {
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")));
    if (saved.campaign.completedMissions.includes("s02")) return true;
    const box = await page.locator("#game canvas").boundingBox();
    if (box) await page.mouse.click(box.x + box.width * 608 / 960, box.y + box.height * 478 / 540);
    return false;
  }, { timeout: 20_000, intervals: [500] }).toBe(true);
  await expect(page.locator(".village-map-card")).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")));
  expect(saved.campaign.doctorBookDeliveryPending).toBe(true);
  expect(saved.progression.xp).toBe(45);
  expect(saved.progression.coins).toBe(30);
  expect(errors).toEqual([]);
});
