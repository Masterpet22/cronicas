import { expect, test } from "@playwright/test";

async function advanceDialogue(page) {
  const overlay = page.locator(".dialogue-overlay");
  await expect(overlay).toBeVisible();
  for (let guard = 0; guard < 12 && await overlay.isVisible(); guard += 1) {
    await overlay.locator("button").click();
  }
  await expect(overlay).toHaveCount(0);
}

async function clickCanvasPoint(page, box, xRatio, yRatio) {
  await page.mouse.click(box.x + box.width * xRatio, box.y + box.height * yRatio);
}

async function createFreshCharacter(page, name = "Smoke") {
  await page.goto("/");
  await page.locator('[data-select-slot="1"]').click();
  await page.locator('input[name="name"]').fill(name);
  await page.locator("#character-form").getByRole("button", { name: "CREAR PERSONAJE" }).click();
  await advanceDialogue(page);
}

async function powerUpActiveCharacter(page) {
  await page.evaluate(() => {
    const slot = localStorage.getItem("cronicas-del-sello-save-active-slot") || "1";
    const key = `cronicas-del-sello-save-slot-${slot}`;
    const save = JSON.parse(localStorage.getItem(key));
    save.progression.level = 30;
    save.progression.attributes = { health: 250, strength: 250, speed: 250, chakra: 250, luck: 250 };
    save.character.affinityXp = { ...save.character.affinityXp, fuego: 10_000 };
    save.loadout = ["fire_phoenix", "fire_brand", "fire_arc", "fire_breath"];
    localStorage.setItem("seal-input-mode", "automatic");
    localStorage.setItem(key, JSON.stringify(save));
  });
  await page.reload();
  await expect(page.locator(".debug-tools-trigger")).toBeVisible();
}

async function completedMissionIds(page) {
  return page.evaluate(() => {
    const slot = localStorage.getItem("cronicas-del-sello-save-active-slot") || "1";
    const raw = localStorage.getItem(`cronicas-del-sello-save-slot-${slot}`);
    return raw ? JSON.parse(raw).campaign.completedMissions : [];
  });
}

async function completeDebugMission(page, { checkpoint, missionId }) {
  await page.locator(".debug-tools-trigger").click();
  await page.locator(`[data-debug-checkpoint="${checkpoint}"]`).click();
  await page.locator(".debug-tools-trigger").click();
  await page.locator(`[data-debug-mission="${missionId}"]`).click();
  const canvas = page.locator("#game canvas");
  await expect(canvas).toHaveCount(1);

  await expect.poll(async () => {
    const investigation = page.locator(".mission-investigation-overlay");
    if (await investigation.isVisible().catch(() => false)) {
      for (const region of ["cart", "house", "tracks"]) {
        await investigation.locator(`[data-investigation-region="${region}"]`).click({ force: true });
      }
      await investigation.locator("[data-mission-investigation-continue]").click();
    }

    const box = await canvas.boundingBox().catch(() => null);
    if (box) {
      await clickCanvasPoint(page, box, 480 / 960, 340 / 540);
      await clickCanvasPoint(page, box, 355 / 960, 340 / 540);
      await page.keyboard.press("1");
      await page.keyboard.press("2");
      await page.keyboard.press("3");
    }
    return (await completedMissionIds(page)).includes(missionId);
  }, { timeout: 85_000, intervals: [250, 350, 500] }).toBe(true);
}

test("crear partida, lanzar m01 y volver a la aldea libera Phaser", async ({ page }) => {
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("music-enabled", "off");
    const nativeSetItem = Storage.prototype.setItem;
    window.__smokeSaveWrites = 0;
    Storage.prototype.setItem = function setItem(key, value) {
      if (String(key).startsWith("cronicas-del-sello-save-slot-")) window.__smokeSaveWrites += 1;
      return nativeSetItem.call(this, key, value);
    };
  });

  await page.goto("/");
  await page.locator('[data-select-slot="1"]').click();
  await page.locator('input[name="name"]').fill("Smoke");
  await page.locator("#character-form").getByRole("button", { name: "CREAR PERSONAJE" }).click();
  await advanceDialogue(page);

  await page.locator('[data-saga="saga-1"]').click();
  await page.locator('[data-mission="m01"]').click();
  const saveWritesBeforeLaunch = await page.evaluate(() => window.__smokeSaveWrites);
  await advanceDialogue(page);

  const canvas = page.locator("#game canvas");
  await expect(canvas).toHaveCount(1);
  await expect(page.locator("#game")).toBeVisible();
  await expect(page.locator("#meta")).toBeHidden();
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox, "El canvas debe tener dimensiones visibles").not.toBeNull();

  await expect.poll(() => page.evaluate(() => window.__smokeSaveWrites), { timeout: 40_000 }).toBeGreaterThan(saveWritesBeforeLaunch + 1);
  await page.waitForTimeout(500);
  await clickCanvasPoint(page, canvasBox, 480 / 960, 340 / 540);
  await page.waitForTimeout(500);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  await clickCanvasPoint(page, canvasBox, 560 / 960, 454 / 540);
  await page.waitForTimeout(700);
  await clickCanvasPoint(page, canvasBox, 625 / 960, 485 / 540);

  await expect(page.locator("#meta")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#game")).toBeHidden();
  await expect(canvas).toHaveCount(0);
  expect(browserErrors, "No debe haber errores de consola ni excepciones de página").toEqual([]);
});

test("recorrer todas las vistas meta no deja errores de navegador", async ({ page }) => {
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("music-enabled", "off");
  });
  await page.goto("/");
  await page.locator('[data-select-slot="1"]').click();
  await page.locator("#character-form").getByRole("button", { name: "CREAR PERSONAJE" }).click();
  await advanceDialogue(page);

  const visitFromDebug = async (view, assertion) => {
    await page.locator(".debug-tools-trigger").click();
    await page.locator(`[data-debug-view="${view}"]`).click();
    await expect(page.locator(assertion)).toBeVisible();
  };

  await page.locator(".debug-tools-trigger").click();
  await expect(page.locator(".debug-screen")).toBeVisible();
  await page.locator('[data-debug-checkpoint="library-ready"]').click();
  await visitFromDebug("plaza", ".village-map");
  await visitFromDebug("headquarters", ".saga-selector");
  await visitFromDebug("missions", ".mission-board");
  await visitFromDebug("kagemori", ".kagemori-investigation, .kagemori-complete");
  await visitFromDebug("dojo", ".dojo-layout");
  await expect(page.locator("[data-dojo-tab='techniques']")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".technique-art-placeholder")).toBeVisible();
  await expect(page.locator(".attribute-card")).toHaveCount(5);
  await page.locator("[data-skill-select='fire_breath']").click();
  await expect(page.locator(".technique-detail h3")).toHaveText("Aliento de brasa");
  await page.locator("[data-technique-toggle='fire_breath']").click();
  await expect(page.locator("[data-equipped-count]")).toHaveText("1/2 TÉCNICAS");
  await page.locator("[data-technique-toggle='fire_breath']").click();
  await expect(page.locator("[data-equipped-count]")).toHaveText("2/2 TÉCNICAS");
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-view="archive"]').click();
  await expect(page.locator(".archive-card")).toBeVisible();
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-checkpoint="doctor-ready"]').click();
  await page.locator('[data-debug-view="missions"]').click();
  await page.locator("[data-secondary-mission]:not([disabled])").last().click();
  await advanceDialogue(page);
  await expect(page.locator(".doctor-route-screen")).toBeVisible();
  expect(browserErrors, "No debe haber errores al recorrer las vistas meta").toEqual([]);
});

test("la primera visita al dojo muestra la configuración sin quedar bloqueada", async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 748 });
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("music-enabled", "off");
  });

  await createFreshCharacter(page, "Dojo inicial");
  await page.getByRole("button", { name: /Volver al mapa/i }).click();
  await page.locator('[data-go="dojo"]').click();

  await expect(page.locator('[data-location-stage="dojo"] [data-stage-options]')).toBeVisible();
  await expect(page.locator(".dojo-layout")).toBeVisible();
  await expect(page.locator("[data-dojo-tab='techniques']")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("[data-reset-attributes]")).toBeDisabled();

  const undersizedText = await page.locator("#meta").evaluate((root) => [...root.querySelectorAll("*")]
    .filter((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const hasOwnText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      return hasOwnText
        && style.visibility !== "hidden"
        && style.display !== "none"
        && box.width > 1
        && box.height > 1
        && Number.parseFloat(style.fontSize) < 13;
    })
    .map((element) => ({
      element: `${element.tagName.toLowerCase()}.${element.className}`,
      fontSize: getComputedStyle(element).fontSize,
      text: element.textContent.trim().slice(0, 60)
    })));
  expect(undersizedText, "El HUD y el Dojo no deben mostrar texto menor de 13 px").toEqual([]);
});

for (const mission of [
  { checkpoint: "saga-start", missionId: "m01" },
  { checkpoint: "mission-2-ready", missionId: "m02" },
  { checkpoint: "mission-5-ready", missionId: "m05" }
]) {
  test(`completar ${mission.missionId} registra el progreso sin errores visibles`, async ({ page }) => {
    const browserErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
    });
    page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("smoke-mission-initialized")) {
        localStorage.clear();
        sessionStorage.clear();
        sessionStorage.setItem("smoke-mission-initialized", "true");
      }
      localStorage.setItem("music-enabled", "off");
    });

    await createFreshCharacter(page, `Smoke ${mission.missionId}`);
    await powerUpActiveCharacter(page);
    await completeDebugMission(page, mission);

    expect(await completedMissionIds(page)).toContain(mission.missionId);
    expect(browserErrors, `No debe haber errores al completar ${mission.missionId}`).toEqual([]);
  });
}
