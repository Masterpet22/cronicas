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
  await expect(page.locator(".level-up-accessible")).toBeAttached({ timeout: 20000 });
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__performanceReference.game.scene.getScene("level-up");
    return scene.children.getByName("level-up-panel")?.list.some(item => item.name === "level-up-continue" && item.input?.enabled);
  })).toBe(true);
  if (!process.env.TUTORIAL_BASELINE) await expect.poll(() => page.evaluate(() => window.__performanceReference.game.scene.getScene("level-up").staticConfirmation)).toBe(true);
  else await page.waitForTimeout(2200);
  await page.waitForTimeout(150);
  const renders = await sampleRendering(page);
  await info.attach("renderizado-subida", { body: JSON.stringify({ renders, milliseconds: 950 }), contentType: "application/json" });
  await expect.poll(() => page.locator(".level-up-explanation .tutorial-character-stage img").evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
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
    const { recordBattleLesson } = await import("/src/battle/tutorial-progress.js");
    recordBattleLesson(state.scene, "level-up");
    state.game.scene.add("level-up", LevelUpScene);
    const preview = structuredClone(state.scene.saveData);
    preview.progression.level++; preview.progression.attributePoints += 2;
    window.__levelPreview = state.scene.showPendingLevelUp(preview);
  });
  await expect(page.locator('.level-up-accessible')).toBeAttached({ timeout: 20000 });
  await expect(page.locator('.level-up-explanation')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__performanceReference.game.scene.getScene("level-up").children.getByName("level-up-panel")?.list.some(item => item.name === "level-up-continue" && item.input?.enabled))).toBe(true);
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
  const box = await page.locator("#game > canvas").boundingBox();
  await page.mouse.click(box.x + 330 / 960 * box.width, box.y + 350 / 540 * box.height);
  await page.evaluate(async () => { await window.__choice; });
  expect(await page.evaluate(() => window.__performanceReference.scene.saveData.campaign.banditPrisonerChoice)).toBe("interrogate");
  await page.evaluate(() => window.__performanceReference.game.destroy(true));
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

for (const [bodyType, master] of [["male", "mei"], ["female", "daichi"]]) test(`Ren y ${master} aparecen en escena con su propio diálogo`, async ({ page }, info) => {
  await seedVillage(page, { bodyType });
  await expect(page.locator(".saga-tutorial-coach")).toHaveCount(0);
  await page.locator('[data-go="headquarters"]').click();
  const dialogue = page.locator(".saga-tutorial-coach");
  await expect(dialogue).toBeVisible();
  await expect(dialogue.locator('[data-tutorial-speaker="ren"]')).toBeVisible();
  const portrait = await dialogue.locator('[data-dialogue-character="ren"] img').boundingBox();
  expect(portrait.width).toBeGreaterThan(200); expect(portrait.height).toBeGreaterThan(300);
  await expect(dialogue.locator(".tutorial-voices")).toHaveCount(0);
  await dialogue.locator("[data-coach-close]").click(); await expect(dialogue).toBeHidden();
  await page.locator("[data-coach-open]").click(); await expect(dialogue).toBeVisible();
  await page.screenshot({ path: info.outputPath(`personaje-ren-${master}.png`) });
  await page.locator('[data-saga="saga-1"]').click(); await page.locator('[data-mission="m01"]').click();
  await expect(page.locator(`[data-dialogue-character="${master}"] img`)).toBeVisible();
  await expect.poll(() => page.locator(`[data-dialogue-character="${master}"] img`).evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.locator(`[data-dialogue-character="${master}"] img`).evaluate(image => image.decode());
  await expect(page.locator(`[data-tutorial-speaker="${master}"]`)).toBeVisible();
  await page.screenshot({ path: info.outputPath(`personaje-${master}-dojo.png`) });
});

test("el Dojo señala la pestaña, el atributo, el hexágono y el botón correcto", async ({ page }, info) => {
  await seedVillage(page, { trained: true });
  await page.locator('[data-go="headquarters"]').click(); await page.locator('[data-saga="saga-1"]').click();
  await page.locator('[data-mission="s01"]').click();
  const dialogue = page.locator(".saga-tutorial-coach");
  await expect(page.locator('[data-dojo-tab="statistics"]')).toHaveClass(/saga-tutorial-target/);
  await dialogue.locator("[data-coach-go]").click();
  await expect(page.locator('[data-attribute="health"]')).toHaveClass(/saga-tutorial-target/);
  await expect(dialogue).toContainText("punto de atributo");
  await page.screenshot({ path: info.outputPath("atributos-paso-exacto.png") });
  await page.locator('[data-attribute="health"]').click();
  await dialogue.locator("[data-coach-go]").click();
  await expect(page.locator('[data-skill-select="physical_0"]')).toHaveClass(/saga-tutorial-target/);
  await dialogue.locator("[data-coach-go]").click();
  await expect(page.locator('[data-skill-invest="physical_0"]')).toHaveClass(/saga-tutorial-target/);
  await page.locator('[data-skill-select]').last().hover();
  await expect(page.locator(".technique-detail h3")).toHaveText("Disciplina del cuerpo");
  await page.locator('[data-skill-invest="physical_0"]').click();
  await expect(page.locator('[data-skill-select="physical_1"]')).toHaveClass(/saga-tutorial-target/);
  await dialogue.locator("[data-coach-go]").click();
  await expect(page.locator('[data-skill-invest="physical_1"]')).toHaveClass(/saga-tutorial-target/);
  await expect(page.locator(".technique-detail h3")).toHaveText("Puño de hierro");
  await page.screenshot({ path: info.outputPath("pr-habilidad-correcta.png") });
});

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

test("0 y Numpad0 cambian la tabla una vez sin gastar turno ni recursos", async ({ page }) => {
  await bootPerformanceReference(page);
  await page.evaluate(() => { const s = window.__performanceReference.scene; s.busy = false; s.turnReady = true; s.refreshHud(); });
  const before = await page.evaluate(() => { const s = window.__performanceReference.scene; return [s.round, s.player.hp, s.player.chakra]; });
  await page.keyboard.press("0"); await expect(page.locator(".combat-access")).toHaveAttribute("data-skill-table", "physical");
  await page.keyboard.press("Numpad0"); await expect(page.locator(".combat-access")).toHaveAttribute("data-skill-table", "elemental");
  expect(await page.evaluate(() => { const s = window.__performanceReference.scene; return [s.round, s.player.hp, s.player.chakra]; })).toEqual(before);
  await page.evaluate(() => { const field = document.createElement("input"); field.id = "shortcut-input"; document.body.append(field); field.focus(); });
  await page.keyboard.press("0"); await expect(page.locator("#shortcut-input")).toHaveValue("0");
  await expect(page.locator(".combat-access")).toHaveAttribute("data-skill-table", "elemental");
  await page.evaluate(() => { document.getElementById("shortcut-input").remove(); window.__performanceReference.game.destroy(true); });
});

test("el maestro explica los nuevos duelos, la ventaja y la fase II cuando ocurren", async ({ page }, info) => {
  await bootPerformanceReference(page, { arenaIndex: 0 });
  await page.evaluate(() => {
    const s = window.__performanceReference.scene;
    s.saveData.campaign.completedMissions = [];
    s.missionStartSave.campaign.completedMissions = [];
    s.rewardPreviewSave.campaign.completedMissions = [];
    s.enemy.hp = 0; window.__eventFlow = s.resolveEnemyOutcome();
  });
  const encounters = page.locator('[data-battle-lesson="enemy-encounters"]');
  await expect(encounters).toBeVisible({ timeout: 20000 });
  await expect(encounters).toContainText("uno contra uno");
  await expect(encounters.locator('[data-tutorial-speaker="mei"]')).toBeVisible();
  await expect(encounters.locator('[data-dialogue-character="mei"] img')).toBeVisible();
  await encounters.locator("button").click();
  await page.evaluate(async () => {
    await window.__eventFlow;
    const s = window.__performanceReference.scene; s.stopTurnTimeline(); s.enemy.hp = 0;
    window.__eventFlow = s.resolveEnemyOutcome();
  });
  const affinity = page.locator('[data-battle-lesson="affinity-advantage"]');
  await expect(affinity).toBeVisible({ timeout: 20000 });
  await expect(affinity.locator('[data-dialogue-character="mei"] img')).toBeVisible();
  await expect(affinity).toContainText("20 %"); await expect(affinity).toContainText("Normal");
  await page.screenshot({ path: info.outputPath("ventaja-en-el-primer-jefe.png") });
  await affinity.locator("button").click();
  await page.evaluate(async () => {
    await window.__eventFlow;
    const s = window.__performanceReference.scene; s.stopTurnTimeline(); s.enemy.hp = Math.floor(s.enemy.maxHp / 2);
    window.__eventFlow = s.resolveEnemyOutcome();
  });
  const phase = page.locator('[data-battle-lesson="enemy-phase"]');
  await expect(phase).toBeVisible({ timeout: 20000 });
  await expect(phase).toContainText("+3 de velocidad"); await expect(phase).toContainText("no comienza otro duelo");
  await phase.locator("button").click(); await page.evaluate(async () => { await window.__eventFlow; });
  const lessons = await page.evaluate(() => window.__performanceReference.scene.saveData.campaign.sagaTutorial.completed);
  expect(lessons).toEqual(expect.arrayContaining(["enemy-encounters", "affinity-advantage", "enemy-phase"]));
  await page.evaluate(() => window.__performanceReference.game.destroy(true));
});
