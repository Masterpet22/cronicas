import { test, expect } from "@playwright/test";
import { bootPerformanceReference } from "./helpers/performance-harness.mjs";

async function sampleRendering(page) {
  await page.evaluate(() => {
    const game = window.__performanceReference.game;
    // Phaser también emite prerender en headlessStep, con renderer=null.
    window.__renderSample = { count: 0, callback: renderer => { if (renderer) window.__renderSample.count++; } };
    game.events.on("prerender", window.__renderSample.callback);
  });
  await page.waitForTimeout(950);
  return page.evaluate(() => {
    window.__performanceReference.game.events.off("prerender", window.__renderSample.callback);
    return window.__renderSample.count;
  });
}

test("rendimiento: la subida de nivel deja de dibujar escenas mientras espera", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await bootPerformanceReference(page, { renderer: process.env.TUTORIAL_RENDERER || "Canvas" });
  await page.evaluate(async () => {
    const state = window.__performanceReference;
    const { LevelUpScene } = await import("/src/battle/scenes/level-up-scene.js?v=0.95.0");
    state.game.scene.add("level-up", LevelUpScene);
    const preview = structuredClone(state.scene.saveData);
    preview.progression.level++; preview.progression.attributePoints += 2;
    window.__levelPreview = state.scene.showPendingLevelUp(preview);
  });
  await expect(page.locator(".level-up-notice")).toBeAttached({ timeout: 20000 });
  await expect(page.locator(".level-up-notice").getByRole("button", { name: "Volver al combate" })).toBeFocused();
  if (!process.env.TUTORIAL_BASELINE) await expect.poll(() => page.evaluate(() => window.__performanceReference.game.scene.getScene("level-up").staticConfirmation)).toBe(true);
  else await page.waitForTimeout(2200);
  await page.waitForTimeout(150);
  const renders = await sampleRendering(page);
  await info.attach("renderizado-subida", { body: JSON.stringify({ renders, milliseconds: 950 }), contentType: "application/json" });
  await expect(page.locator(".level-up-explanation img")).toHaveCount(0);
  await expect(page.locator(".level-up-explanation")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("subida-dialogo-maestro.png") });
  console.log(`Subida de nivel: ${renders} renders / 950 ms`);
  if (!process.env.TUTORIAL_BASELINE) expect(renders).toBeLessThanOrEqual(2);
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => window.__performanceReference.scene.scene.isActive())).toBe(true);
  await page.evaluate(async () => { await window.__levelPreview; window.__performanceReference.game.destroy(true); });
});

test("las subidas siguientes no repiten la explicación de atributos y PR", async ({ page }) => {
  await bootPerformanceReference(page);
  await page.evaluate(async () => {
    const state = window.__performanceReference;
    const { LevelUpScene } = await import("/src/battle/scenes/level-up-scene.js?v=0.95.0");
    state.game.scene.add("level-up", LevelUpScene);
    const preview = structuredClone(state.scene.saveData);
    preview.progression.level++; preview.progression.attributePoints += 2;
    window.__levelPreview = state.scene.showPendingLevelUp(preview);
  });
  await expect(page.locator('.level-up-notice')).toBeAttached({ timeout: 20000 });
  await expect(page.locator('.level-up-explanation')).toHaveCount(0);
  await expect(page.locator(".level-up-notice").getByRole("button", { name: "Volver al combate" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => window.__performanceReference.scene.scene.isActive())).toBe(true);
  await page.evaluate(async () => { await window.__levelPreview; window.__performanceReference.game.destroy(true); });
});

test("rendimiento: la decisión del teniente conserva un fondo estático e interactivo", async ({ page }, info) => {
  await bootPerformanceReference(page, { renderer: process.env.TUTORIAL_RENDERER || "Canvas" });
  await page.evaluate(() => { window.__choice = window.__performanceReference.scene.playPrisonerChoice(); });
  await page.waitForTimeout(350);
  const renders = await sampleRendering(page);
  await info.attach("renderizado-decision", { body: JSON.stringify({ renders, milliseconds: 950 }), contentType: "application/json" });
  console.log(`Decisión del teniente: ${renders} renders / 950 ms`);
  if (!process.env.TUTORIAL_BASELINE) expect(renders).toBeLessThanOrEqual(2);
  const dialog = page.getByRole("dialog", { name: "Decisión de misión" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /Interrogar y perdonar/ }).click();
  await page.evaluate(async () => { await window.__choice; });
  expect(await page.evaluate(() => window.__performanceReference.scene.saveData.campaign.banditPrisonerChoice)).toBe("interrogate");
  await page.evaluate(() => window.__performanceReference.game.destroy(true));
});

test("el informe separa el relato de la intervención del compañero", async ({ page }, info) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await bootPerformanceReference(page);
  await page.evaluate(() => {
    const { scene } = window.__performanceReference;
    window.__report = scene.playBattleChoice("Huellas en el camino",
      "Entre los suministros aparece una nota: el siguiente traslado saldrá de un campamento oculto. El equipo informa a Ren antes de continuar.",
      [{ value: "continue", label: "Registrar informe", detail: "Regresar a la aldea y confirmar los resultados.", primary: true }],
      { quote: { speaker: "Haruto Kazehara", text: "¡Intentad seguirnos el ritmo! Algún día dirigiré esta aldea." } });
  });
  const dialog = page.getByRole("dialog", { name: "Huellas en el camino" });
  await expect(dialog.locator("blockquote")).toContainText("Haruto Kazehara");
  const confirm = dialog.getByRole("button", { name: /Registrar informe/ });
  await expect(confirm).toBeFocused();
  await expect(confirm).toBeInViewport();
  await page.screenshot({ path: info.outputPath("informe-de-mision.png") });
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => window.__report)).toBe("continue");
  await expect(dialog).toHaveCount(0);
  await page.evaluate(() => window.__performanceReference.game.destroy(true));
});

test("cerrar una escena con una decisión abierta no cambia la partida", async ({ page }) => {
  await bootPerformanceReference(page);
  await page.evaluate(() => {
    const { scene } = window.__performanceReference;
    scene.fieldSupplies = 2;
    window.__pendingNotice = scene.playResourceChoice();
  });
  const dialog = page.getByRole("dialog", { name: "ADMINISTRACIÓN ENTRE DUELOS" });
  await expect(dialog).toBeVisible();
  const result = await page.evaluate(async () => {
    const { scene } = window.__performanceReference;
    const save = JSON.stringify(scene.saveData);
    scene.scene.stop();
    await window.__pendingNotice;
    return { saveMatches: JSON.stringify(scene.saveData) === save, supplies: scene.fieldSupplies, recovery: scene.nextRecovery };
  });
  expect(result).toMatchObject({ saveMatches: true, supplies: 2 });
  expect(result.recovery).toBeFalsy();
  await expect(dialog).toHaveCount(0);
});

async function seedVillage(page, { trained = false, bodyType = "male" } = {}) {
  await page.goto("/");
  await page.evaluate(async ({ trained, bodyType }) => {
    const { createDefaultSave, createCharacter, writeSave } = await import("/src/save.js?v=0.131.0");
    localStorage.clear(); sessionStorage.clear();
    const save = createCharacter(createDefaultSave(), { name: "Akio", affinity: "fuego", bodyType });
    save.campaign.tutorialSeen = true;
    save.campaign.npcIntroductions = ["headquarters:ren", "dojo:mei", "dojo:daichi", "shop:hana"];
    if (trained) {
      save.campaign.completedMissions = ["m01"];
      save.progression.level = 2; save.progression.attributePoints = 2; save.progression.coins = 100;
    }
    writeSave(save); sessionStorage.setItem("cronicas-save-slot-selected", "1"); localStorage.setItem("music-enabled", "off");
  }, { trained, bodyType });
  await page.reload(); await expect(page.locator(".village-map")).toBeVisible();
}

for (const width of [1280, 1600]) test(`la descripción del shuriken cabe en la tarjeta a ${width}`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: width === 1280 ? 720 : 900 });
  await seedVillage(page); await page.locator('[data-go="dojo"]').click();
  await page.locator('[data-dojo-tab="equipment"]').click();
  await page.locator('[data-gear-slot="throwable"]').click();
  await page.locator('[data-equipment-id="shuriken"]').click();
  const card = page.locator('[data-gear-slot="throwable"]');
  const bounds = await card.evaluate(el => {
    const box = el.getBoundingClientRect(), text = el.querySelector(".gear-copy").getBoundingClientRect();
    return { bottom: text.bottom <= box.bottom - 5, right: text.right <= box.right - 5, scroll: el.scrollHeight <= el.clientHeight + 1 };
  });
  expect(bounds).toEqual({ bottom: true, right: true, scroll: true });
  await card.screenshot({ path: info.outputPath(`shuriken-${width}.png`) });
});

test("Tab cambia la tabla una vez sin gastar turno ni recursos", async ({ page }) => {
  await bootPerformanceReference(page);
  await page.evaluate(() => { const s = window.__performanceReference.scene; s.busy = false; s.turnReady = true; s.refreshHud(); });
  const before = await page.evaluate(() => { const s = window.__performanceReference.scene; return [s.round, s.player.hp, s.player.chakra]; });
  await page.keyboard.press("Tab"); await expect(page.locator(".combat-access")).toHaveAttribute("data-skill-table", "physical");
  await page.keyboard.press("Tab"); await expect(page.locator(".combat-access")).toHaveAttribute("data-skill-table", "elemental");
  expect(await page.evaluate(() => { const s = window.__performanceReference.scene; return [s.round, s.player.hp, s.player.chakra]; })).toEqual(before);
  await page.evaluate(() => { const field = document.createElement("input"); field.id = "shortcut-input"; document.body.append(field); field.focus(); });
  await page.keyboard.press("0"); await expect(page.locator("#shortcut-input")).toHaveValue("0");
  await expect(page.locator(".combat-access")).toHaveAttribute("data-skill-table", "elemental");
  await page.evaluate(() => { document.getElementById("shortcut-input").remove(); window.__performanceReference.game.destroy(true); });
});
