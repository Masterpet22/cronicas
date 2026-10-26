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

async function createFreshCharacter(page, name = "Smoke", bodyType = "male") {
  await page.goto("/");
  await page.locator('[data-select-slot="1"]').click();
  await page.locator('input[name="name"]').fill(name);
  await page.locator('select[name="bodyType"]').selectOption(bodyType);
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
      const action = page.locator('.combat-access-actions button[aria-disabled="false"]').first();
      if (await action.isVisible().catch(() => false)) await action.click({ force: true, timeout: 1_000 }).catch(() => {});
      else await page.keyboard.press("1");
    }
    return (await completedMissionIds(page)).includes(missionId);
  }, { timeout: 85_000, intervals: [250, 350, 500] }).toBe(true);
}

test("el perfil femenino carga la marioneta femenina", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("music-enabled", "off");
  });
  await createFreshCharacter(page, "Kira", "female");
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-view="dojo"]').click();
  await page.locator('[data-dojo-tab="statistics"]').click();
  await expect(page.locator("#dojo-panel-statistics .puppet-preview-layer").first()).toHaveAttribute("src", /woman_sprites\/runtime/);

  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-view="headquarters"]').click();
  const femaleTorso = page.waitForResponse((response) => response.url().includes("woman_sprites/runtime/torso.png"));
  await page.locator('[data-saga="saga-1"]').click();
  await page.locator('[data-mission="m01"]').click();
  await advanceDialogue(page);
  await femaleTorso;
  await expect(page.locator("#game canvas")).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.Phaser?.VERSION)).toBe("4.2.1");
});

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
  await expect(page.locator("#game [role='alertdialog']")).toBeVisible();
  await clickCanvasPoint(page, canvasBox, 600 / 960, 354 / 540);
  await page.waitForTimeout(2_700);
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
  await page.locator("[data-dojo-tab='equipment']").click();
  await expect(page.locator(".equipment-columns")).toBeVisible();
  const equipmentPanelHeight = (await page.locator(".dojo-main-panel").boundingBox())?.height;
  const equipmentMenuHeight = (await page.locator(".location-dojo .stage-options").boundingBox())?.height;
  await expect(page.locator(".companion-slot")).toBeDisabled();
  await page.locator("[data-open-master]").click();
  await expect(page.locator(".master-modal")).toBeVisible();
  await expect(page.locator(".master-modal [data-master]")).toHaveCount(2);
  await page.locator("[data-close-master]").click();
  await expect(page.locator(".master-summary-card .master-role")).toHaveText(/Instructora|Maestro/);
  await expect(page.locator(".master-unlock-note")).toHaveCount(0);
  await page.locator("[data-dojo-tab='statistics']").click();
  await expect(page.locator(".stat-radar")).toBeVisible();
  await expect(page.locator("#dojo-panel-statistics .puppet-preview-rig")).toBeVisible();
  await expect(page.locator(".attribute-card")).toHaveCount(5);
  expect((await page.locator(".dojo-main-panel").boundingBox())?.height).toBe(equipmentPanelHeight);
  expect((await page.locator(".location-dojo .stage-options").boundingBox())?.height).toBe(equipmentMenuHeight);
  await page.locator("[data-dojo-tab='appearance']").click();
  await expect(page.locator("#dojo-panel-appearance .puppet-preview-rig")).toBeVisible();
  await expect(page.locator('[data-cosmetic-step="face"]').first()).toBeDisabled();
  await expect(page.locator('[data-cosmetic-value="hair"]')).toHaveText("TIPO 02");
  await expect(page.locator('button[data-cosmetic-control="outfit"]')).toBeDisabled();
  await expect(page.locator('button[data-cosmetic-control="outfit"] .cosmetic-label')).toHaveText("Traje");
  await expect(page.locator('button[data-cosmetic-control="outfit"]')).toContainText("BLOQUEADO");
  await expect(page.locator("#dojo-panel-appearance .puppet-preview-hair")).toHaveAttribute("src", /hair_corto\.png/);
  await expect(page.locator("#dojo-panel-appearance .raster-character-floor")).toHaveCount(0);
  expect((await page.locator(".dojo-main-panel").boundingBox())?.height).toBe(equipmentPanelHeight);
  expect((await page.locator(".location-dojo .stage-options").boundingBox())?.height).toBe(equipmentMenuHeight);
  await page.locator('[data-cosmetic-step="hair"][data-direction="1"]').click();
  await expect(page.locator('[data-cosmetic-value="hair"]')).toHaveText("TIPO 03");
  await expect(page.locator("#dojo-panel-appearance .puppet-preview-hair")).toHaveAttribute("src", /hair_coleta\.png/);
  await page.locator("[data-dojo-tab='techniques']").click();
  await page.locator("[data-skill-select='fire_breath']").click();
  await expect(page.locator(".technique-detail h3")).toHaveText("Aliento de brasa");
  await expect(page.locator("[data-equipped-count]")).toHaveText("1/2 TÉCNICAS");
  await expect(page.locator("[data-skill-select='fire_breath'] .skill-state")).toHaveText("＋ EQUIPAR");
  await page.locator("[data-skill-select='fire_breath']").click();
  await expect(page.locator("[data-equipped-count]")).toHaveText("2/2 TÉCNICAS");
  await expect(page.locator("[data-skill-select='fire_breath'] .skill-state")).toHaveText("✓ DESEQUIPAR");
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
  await expect(page.locator(".doctor-route-screen")).toBeVisible({ timeout: 20_000 });
  expect(browserErrors, "No debe haber errores al recorrer las vistas meta").toEqual([]);
});

test("la primera visita al dojo muestra la configuración sin quedar bloqueada", async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 748 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
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
  await expect(page.locator(".dojo-attribute-actions button")).toHaveCount(0);

  const readDojoGeometry = () => page.evaluate(() => {
    const measure = (selector) => {
      const element = document.querySelector(selector);
      const rect = element.getBoundingClientRect();
      return {
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        overflowY: getComputedStyle(element).overflowY
      };
    };
    return {
      window: measure(".location-dojo .stage-options"),
      panel: measure(".location-dojo .dojo-main-panel"),
      preview: measure(".dojo-tab-panel:not([hidden]) .character-preview"),
      rig: measure(".dojo-tab-panel:not([hidden]) .puppet-preview-rig")
    };
  });

  const maximumOverflowWhileSwitchingTo = (tabId) => page.evaluate(async (nextTabId) => {
    const panel = document.querySelector(".location-dojo .dojo-main-panel");
    document.querySelector(`[data-dojo-tab="${nextTabId}"]`).click();
    let maximumOverflow = 0;
    const finishAt = performance.now() + 240;
    while (performance.now() < finishAt) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      maximumOverflow = Math.max(maximumOverflow, panel.scrollHeight - panel.clientHeight);
    }
    return maximumOverflow;
  }, tabId);

  expect(await maximumOverflowWhileSwitchingTo("appearance")).toBeLessThanOrEqual(1);
  expect(await maximumOverflowWhileSwitchingTo("statistics")).toBeLessThanOrEqual(1);

  await page.locator("[data-dojo-tab='appearance']").click();
  const appearanceGeometry = await readDojoGeometry();
  expect(appearanceGeometry.window.overflowY).toBe("hidden");
  expect(appearanceGeometry.panel.scrollHeight).toBeLessThanOrEqual(appearanceGeometry.panel.clientHeight + 1);
  expect(appearanceGeometry.rig.top).toBeGreaterThanOrEqual(appearanceGeometry.preview.top - 1);
  expect(appearanceGeometry.rig.bottom).toBeLessThanOrEqual(appearanceGeometry.preview.bottom + 1);

  await page.locator("[data-dojo-tab='statistics']").click();
  const statisticsGeometry = await readDojoGeometry();
  expect(statisticsGeometry.window.overflowY).toBe("hidden");
  expect(statisticsGeometry.panel.scrollHeight).toBeLessThanOrEqual(statisticsGeometry.panel.clientHeight + 1);
  expect(statisticsGeometry.rig.top).toBeGreaterThanOrEqual(statisticsGeometry.preview.top - 1);
  expect(statisticsGeometry.rig.bottom).toBeLessThanOrEqual(statisticsGeometry.preview.bottom + 1);

  await page.locator("[data-dojo-tab='techniques']").click();

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
