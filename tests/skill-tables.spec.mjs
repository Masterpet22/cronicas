import { test, expect } from "@playwright/test";
import { bootPerformanceReference } from "./helpers/performance-harness.mjs";

const button = (page, index) => page.locator(`[data-combat-action="${index}"]`);
async function boot(page) {
  await bootPerformanceReference(page, { loadout: ["fire_embers", "fire_breath"] });
  await page.evaluate(() => {
    const scene = window.__performanceReference.scene;
    window.__fixedSkills = [document.querySelector('[data-combat-action="1"]'), document.querySelector('[data-combat-action="6"]')];
    scene.cooldowns.fire_embers = 2; scene.refreshHud();
  });
}

test("las mejoras de Resonancia llegan a las acciones y estadísticas del combate", async ({ page }) => {
  await bootPerformanceReference(page,{ loadout:["fire_embers"], investments:{ fire_embers:2,physical_0:1 } });
  const result = await page.evaluate(async () => {
    const scene = window.__performanceReference.scene;
    const { derivedStats } = await import("/src/save.js");
    const base = derivedStats({ ...scene.saveData,progression:{ ...scene.saveData.progression,resonance:{ investments:{} } } });
    return { damage:scene.actions[1].damage,hpGain:scene.player.maxHp-base.maxHp };
  });
  expect(result).toEqual({ damage:18,hpGain:5 });
});

test("los taijutsus equipados ocupan 4 y 5 de la tabla física y se pagan con vida", async ({ page }) => {
  const errors = []; page.on("pageerror",error => errors.push(error.message));
  await bootPerformanceReference(page,{ investments:{ physical_0:1,physical_1:1,physical_2:1 },taijutsuLoadout:["physical_1","physical_2"] });
  await page.evaluate(() => {
    const s = window.__performanceReference.scene;
    s.busy=false; s.turnReady=true; s.player.hp=30; s.player.chakra=0;
    window.__taijutsuUsed=[];
    s.executeTimelineAction = async (actor,action) => window.__taijutsuUsed.push(action.id);
    s.refreshHud();
  });
  await page.getByRole("button",{ name:"Cambiar a habilidades físicas (0)",exact:true }).click();
  await expect(button(page,4)).toContainText("Puño de hierro");
  await expect(button(page,4)).toContainText("8 PV");
  await expect(button(page,5)).toContainText("Paso fugaz");
  await expect(button(page,5)).toContainText("5 PV");
  await button(page,4).click();
  expect(await page.evaluate(() => ({ used:window.__taijutsuUsed,hp:window.__performanceReference.scene.player.hp,chakra:window.__performanceReference.scene.player.chakra }))).toEqual({ used:["physical_1"],hp:22,chakra:0 });
  await page.evaluate(() => { const s=window.__performanceReference.scene; s.busy=false; s.turnReady=true; s.player.hp=5; s.refreshHud(); });
  await expect(button(page,5)).toHaveAttribute("aria-disabled","true");
  await page.evaluate(() => { const s=window.__performanceReference.scene; s.player.hp=20; s.refreshHud(); });
  await button(page,5).click();
  expect(await page.evaluate(() => ({ used:window.__taijutsuUsed,hp:window.__performanceReference.scene.player.hp }))).toEqual({ used:["physical_1","physical_2"],hp:15 });
  expect(errors).toEqual([]);
});

for (const width of [1280, 1600]) test(`las dos tablas conservan 1 y 6 y el equipo elemental a ${width}`, async ({ page }, testInfo) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width, height: width === 1280 ? 720 : 900 }); await boot(page);
  await expect(button(page, 2)).toContainText("Ascuas veloces");
  await expect(button(page, 2)).toContainText("CD 2");
  const initial = await page.evaluate(() => { const s = window.__performanceReference.scene; return { hp: s.player.hp, ch: s.player.chakra, round: s.round, loadout: s.saveData.loadout, pending: s.pendingActions.player, timeline: s.timelineProgress }; });
  await page.locator("[data-skill-table-switch]").click();
  await expect(page.locator(".combat-access")).toHaveAttribute("data-skill-table", "physical");
  await expect(button(page, 2)).toContainText("Golpe de arma");
  await expect(button(page, 2)).toContainText("0 PV");
  await expect(button(page, 2)).toHaveAttribute("aria-label", /Kunai/);
  await expect(button(page, 3)).toContainText("Shuriken");
  await expect(button(page, 3)).toHaveAttribute("aria-disabled", "true"); // The reference scene is still busy.
  for (const index of [4, 5]) { await expect(button(page, index)).toContainText("Sin taijutsu"); await expect(button(page, index)).not.toContainText("NV"); }
  expect(await page.evaluate(() => window.__fixedSkills.every((node, index) => node === document.querySelector(`[data-combat-action="${index ? 6 : 1}"]`)))).toBe(true);
  expect(await page.evaluate(() => { const s = window.__performanceReference.scene; return { hp: s.player.hp, ch: s.player.chakra, round: s.round, loadout: s.saveData.loadout, pending: s.pendingActions.player, timeline: s.timelineProgress }; })).toEqual(initial);
  const fits = await page.locator(".combat-table-switch").evaluate(element => { const b = element.getBoundingClientRect(), p = document.querySelector(".combat-access-actions").getBoundingClientRect(); return b.top > p.top && b.bottom < p.bottom && Math.abs(b.y + b.height / 2 - (p.y + p.height / 2)) < 4 && b.right < innerWidth; });
  expect(fits).toBe(true);
  await page.mouse.move(width - 5, 400);
  await page.screenshot({ path: testInfo.outputPath("tabla-fisica.png") });
  await page.locator("[data-skill-table-switch]").click();
  await expect(button(page, 2)).toContainText("Ascuas veloces"); await expect(button(page, 2)).toContainText("CD 2");
  await page.screenshot({ path: testInfo.outputPath("tabla-elemental.png") });
  expect(errors).toEqual([]);
});

test("teclas 2–5 usan solo la tabla visible y el arma no gasta chakra", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = window.__performanceReference.scene; s.busy = false; s.turnReady = true; s.player.chakra = 0;
    window.__skillCalls = []; s.useJutsu = action => window.__skillCalls.push(action.id); s.refreshHud();
  });
  await page.locator("[data-skill-table-switch]").click();
  await expect(button(page, 2)).toHaveAttribute("aria-disabled", "false");
  for (const key of ["2", "3", "4", "5"]) await page.keyboard.press(key);
  expect(await page.evaluate(() => window.__skillCalls)).toEqual(["weapon_strike", "throwable_strike"]);
  await page.keyboard.press("1"); await page.keyboard.press("6");
  expect(await page.evaluate(() => window.__skillCalls)).toEqual(["weapon_strike", "throwable_strike", "strike", "guard"]);
  await page.locator("[data-skill-table-switch]").click();
  await page.evaluate(() => { const s = window.__performanceReference.scene; s.player.chakra = s.player.maxChakra; s.cooldowns.fire_embers = 0; s.refreshHud(); });
  await page.keyboard.press("2");
  expect(await page.evaluate(() => window.__skillCalls.at(-1))).toBe("fire_embers");
});

test("el flip gira solo 2–5, bloquea dobles cambios y sobrevive a pausa y cierre", async ({ page }) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" }); await boot(page);
  await page.locator("[data-skill-table-switch]").focus();
  const during = await page.evaluate(() => {
    const b = document.querySelector("[data-skill-table-switch]"), s = window.__performanceReference.scene;
    window.__skillCalls = []; s.useJutsu = action => window.__skillCalls.push(action.id);
    b.dispatchEvent(new MouseEvent("click")); b.dispatchEvent(new MouseEvent("click")); s.onActionShortcut({ key: "2" });
    return { middle: getComputedStyle(document.querySelector('[data-skill-row="2"]')).animationName, fixed: getComputedStyle(document.querySelector('[data-skill-row="1"]')).animationName, switching: s.skillTableSwitching };
  });
  expect(during).toEqual({ middle: "combat-table-out", fixed: "none", switching: true });
  await expect(page.locator(".combat-access")).toHaveAttribute("data-skill-table", "physical");
  await expect(page.locator(".combat-access-actions")).not.toHaveClass(/is-turning/);
  await expect(page.locator("[data-skill-table-switch]")).toBeFocused();
  expect(await page.evaluate(() => window.__skillCalls)).toEqual([]);
  await page.evaluate(() => window.__performanceReference.game.scene.pause("battle"));
  await expect(page.locator(".combat-access")).toBeHidden();
  await page.evaluate(() => window.__performanceReference.game.scene.resume("battle"));
  await expect(page.locator("[data-skill-table-switch]")).toBeEnabled();
  await page.locator("[data-skill-table-switch]").click();
  await page.evaluate(() => window.__performanceReference.game.scene.stop("battle"));
  await expect(page.locator(".combat-access")).toHaveCount(0);
  await page.waitForTimeout(400); expect(errors).toEqual([]);
});

test("un coste físico se paga con PV una vez y exige vida suficiente", async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(async () => {
    const s = window.__performanceReference.scene, move = { ...s.actions[0], id: "test_taijutsu", cost: 0, healthCost: 8 };
    s.busy = false; s.turnReady = true; s.player.hp = 8; s.player.chakra = 0;
    let calls = 0; s.executeTimelineAction = async () => { calls += 1; };
    await s.useJutsu(move);
    const denied = { hp: s.player.hp, ready: s.turnReady, calls };
    s.player.hp = 20;
    await s.useJutsu(move); await s.useJutsu(move);
    return { denied, hp: s.player.hp, ch: s.player.chakra, calls };
  });
  expect(result).toEqual({ denied: { hp: 8, ready: true, calls: 0 }, hp: 12, ch: 0, calls: 1 });
});

test("el golpe equipado llega al combate sin gastar PV ni CH", async ({ page }) => {
  await boot(page);
  await page.locator("[data-skill-table-switch]").click();
  const result = await page.evaluate(async () => {
    const s = window.__performanceReference.scene;
    s.busy = false; s.turnReady = true; s.player.hp = 30; s.player.chakra = 0;
    let used = null; s.executeTimelineAction = async (actor, action) => { used = { actor, id: action.id, weapon: action.weaponId }; };
    await s.useJutsu(s.accessibleHud.getAction(1));
    return { used, hp: s.player.hp, ch: s.player.chakra, ready: s.turnReady };
  });
  expect(result).toEqual({ used: { actor: "player", id: "weapon_strike", weapon: "kunai" }, hp: 30, ch: 0, ready: false });
});

test("las tablas también se pueden cambiar en la distribución compacta", async ({ page }, testInfo) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 960, height: 740 }); await boot(page);
  await expect(page.locator(".combat-access")).toHaveClass(/compact/);
  await page.locator("[data-skill-table-switch]").click();
  await expect(button(page, 2)).toContainText("Golpe de arma");
  await expect(button(page, 6)).toContainText("Guardia");
  await expect(button(page, 1)).toContainText("Golpe veloz");
  expect(await page.locator(".combat-access").evaluate(root => root.scrollWidth <= root.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("tabla-fisica-compacta.png"), fullPage: true });
  await page.locator("[data-skill-table-switch]").click();
  await expect(button(page, 2)).toContainText("Ascuas veloces");
  expect(errors).toEqual([]);
});
