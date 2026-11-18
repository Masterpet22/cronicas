import { test, expect } from "@playwright/test";
import { ensurePhaser } from "./helpers/phaser-loader.mjs";
import { trainingAction, trainingReady } from "./helpers/training-actions.mjs";

const stored = page => page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"));
async function prepare(page, origin) {
  await page.goto("/");
  await page.evaluate(async () => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.131.0");
    let save = createCharacter(createDefaultSave(), { name: "Akio", affinity: "fuego", bodyType: "male" });
    save.progression.level = 20;
    save.character.affinityXp.fuego = 10000;
    save.progression.resonance.investments = { physical_0: 1, physical_1: 1, physical_2: 1 };
    const { learnSkillForTest } = await import("/tests/helpers/skill-fixtures.mjs");
    save=learnSkillForTest(save,"fire_arc");
    save.loadout = []; save.taijutsuLoadout = [null, null];
    save.campaign.tutorialSeen = true;
    writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
    localStorage.setItem("music-enabled", "off");
    localStorage.setItem("seal-input-mode", "automatic");
  });
  await page.reload();
  await page.locator(`[data-go="${origin}"]`).click();
  const next = page.locator('[data-stage-speech]:not(.leaving) [data-stage-next]');
  for (let i = 0; i < 5 && await next.isVisible(); i++) await next.click();
  await expect(page.locator("[data-start-training]")).toBeVisible();
  await ensurePhaser(page);
  await page.evaluate(() => {
    const Original = Phaser.Game;
    Phaser.Game = class extends Original { constructor(config) { super(config); window.__trainingGame = this; } };
  });
}

for (const { origin, viewport } of [
  { origin: "dojo", viewport: { width: 1440, height: 900 } },
  { origin: "dojo", viewport: { width: 1280, height: 720 } },
  { origin: "dojo", viewport: { width: 1024, height: 768 } }
]) test(`entrenamiento desde ${origin} a ${viewport.width}: movimientos sin equipar, repetición y regreso sin progreso`, async ({ page }, testInfo) => {
  test.setTimeout(300000);
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize(viewport.width < 650 ? { width: 1440, height: 900 } : viewport);
  await prepare(page, origin);
  const baseline = await stored(page);
  await page.locator("[data-start-training]").click();
  await expect(page.locator(".combat-access")).toBeVisible({ timeout: 45000 });
  await expect(page.locator(".training-controls, [data-training-move], [data-training-use]")).toHaveCount(0);
  if (viewport.width < 650) await page.setViewportSize(viewport);
  expect(await page.locator(".combat-access").evaluate(root => root.scrollWidth <= root.clientWidth)).toBe(true);
  await page.evaluate(() => {
    const scene = window.__trainingGame.scene.getScene("battle");
    window.__enemyExecutions = 0;
    scene.executeEnemyAction = async () => { window.__enemyExecutions += 1; };
  });
  expect(await page.evaluate(() => {
    const scene = window.__trainingGame.scene.getScene("battle");
    return { affinity: scene.enemy.primaryAffinity, affinities: scene.enemy.affinities,
      portrait: scene.enemyPortrait.affinity, health: scene.enemy.maxHp, strength: scene.enemy.strength,
      chakra: scene.enemy.maxChakra, speed: scene.enemy.speed };
  })).toEqual({ affinity: "normal", affinities: ["normal"], portrait: "normal", health: 10000, strength: 0, chakra: 0, speed: 1 });
  for (const move of ["fire_embers", "fire_embers", "fire_arc", "physical_1", "guard", "guard"]) {
    await (await trainingAction(page, move)).click();
    await trainingReady(page);
    await expect(page.locator(".combat-access-message")).toContainText(move === "guard" ? "50 %" : "de daño");
    if (move === "fire_embers") await expect(page.locator(".combat-access-message")).toContainText("QUEMADURA (2 turnos)");
    const state = await page.evaluate(() => {
      const scene = window.__trainingGame.scene.getScene("battle");
      return { full: scene.player.hp === scene.player.maxHp && scene.player.chakra === scene.player.maxChakra,
        dummy: scene.enemy.hp === scene.enemy.maxHp, alive: !scene.finished, enemyTurns: window.__enemyExecutions,
        saved: scene.saveData.loadout, taijutsu: scene.saveData.taijutsuLoadout };
    });
    expect(state).toMatchObject({ full: true, dummy: true, alive: true, enemyTurns: 0, saved: [], taijutsu: [null, null] });
    expect(await stored(page)).toBe(baseline);
  }
  await page.screenshot({ path: testInfo.outputPath(`training-${origin}.png`), fullPage: true });
  await page.getByRole("button", { name: "Pausar combate (Escape)" }).click();
  await expect(page.getByRole("heading", { name: "ENTRENAMIENTO EN PAUSA" })).toBeVisible();
  await expect(page.locator(".combat-access")).toBeHidden();
  await page.getByRole("button", { name: "REANUDAR" }).click();
  await expect(page.locator(".combat-access")).toBeVisible();
  if (viewport.width < 650) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: testInfo.outputPath("training-desktop.png") });
    expect(await page.evaluate(() => window.__trainingGame.scene.getScene("battle").timelineLayer.visible)).toBe(false);
  }
  await page.getByRole("button", { name: "Pausar combate (Escape)" }).click();
  await page.getByRole("button", { name: "VOLVER AL DOJO", exact: true }).click();
  await expect(page.locator(origin === "arena" ? ".arena-panel" : ".dojo-layout")).toBeVisible();
  await expect(page.locator(".training-controls")).toHaveCount(0);
  expect(await stored(page)).toBe(baseline);
  expect(errors).toEqual([]);
});

for (const tablet of [false, true]) test.describe(`combate de grupo: ${tablet ? "tablet táctil" : "ordenador"}`, () => {
  test.use({ viewport: tablet ? { width: 960, height: 720 } : { width: 1440, height: 900 }, hasTouch: tablet });
  test("turnos propios, objetivo fijo, costes, pausa, victoria, derrota y revancha", async ({ page }, testInfo) => {
    test.setTimeout(300000);
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepare(page, "dojo");
    const baseline = await stored(page);
    await page.locator("[data-training-count]").selectOption("3");
    await page.locator("[data-start-training]").click();
    await expect(page.locator("[data-training-target]")).toHaveCount(3, { timeout: 45000 });
    await expect(page.locator(".training-target-panel, [data-reset-training-targets]")).toHaveCount(0);
    await trainingReady(page);
    const targets = () => page.evaluate(() => {
      const s = window.__trainingGame.scene.getScene("battle");
      return { selected: s.selectedTargetIndex, hp: s.trainingTargets.map(t => t.state.hp),
        turns: s.trainingTargets.map(t => t.turns), progress: s.trainingTargets.map(t => t.progress),
        playerHp: s.player.hp, chakra: s.player.chakra, cooldown: s.cooldowns.fire_embers || 0,
        finished: s.finished, pending: Boolean(s.pendingActions.player), name: s.enemyName.text };
    });
    const choose = async index => {
      const target = page.locator(`[data-training-target="${index}"]`);
      if (tablet) await target.tap(); else await target.click();
      await expect(target).toHaveAttribute("aria-pressed", "true");
    };
    const beforeSelection = await targets();
    expect(await page.evaluate(() => {
      const t = window.__trainingGame.scene.getScene("battle").trainingTargets;
      return t[1].position.y < t[0].position.y && t[1].position.y < t[2].position.y
        && t[2].position.x - t[0].position.x < 320;
    })).toBe(true);
    await choose(2);
    const afterSelection = await targets();
    expect(afterSelection.progress).toEqual(beforeSelection.progress);
    expect(afterSelection.turns).toEqual(beforeSelection.turns);
    expect(afterSelection.name).toContain("CAZADOR DE PIEDRA");
    expect(await page.evaluate(() => {
      const s = window.__trainingGame.scene.getScene("battle");
      return { hp: s.enemyHpBar.valueText.text, expected: `${s.trainingTargets[2].state.hp}/${s.trainingTargets[2].state.maxHp}`,
        portrait: s.enemyPortrait.affinity, affinity: s.trainingTargets[2].state.primaryAffinity };
    })).toEqual(expect.objectContaining({ portrait: "tierra", affinity: "tierra", hp: expect.any(String), expected: expect.any(String) }));
    await page.screenshot({ path: testInfo.outputPath("dojo-group-combat.png"), fullPage: true });
    // Keep a long, deterministic bout to verify repeated real enemy actions.
    await page.evaluate(() => {
      const s = window.__trainingGame.scene.getScene("battle");
      s.rollHit = () => true;
      s.player.hp = s.player.maxHp = 1000;
      s.trainingTargets.forEach(t => { t.state.hp = t.state.maxHp = 1000; t.profile.pattern = ["strike"]; });
      s.refreshHud();
    });
    await (await trainingAction(page, "fire_embers")).click();
    await expect.poll(() => page.evaluate(() => Boolean(window.__trainingGame.scene.getScene("battle").groupReservation))).toBe(true);
    expect(await page.evaluate(() => window.__trainingGame.scene.getScene("battle").selectTrainingTarget(0))).toBe(false);
    await trainingReady(page);
    const attacked = await targets();
    expect(attacked.hp[0]).toBe(1000); expect(attacked.hp[1]).toBe(1000); expect(attacked.hp[2]).toBeLessThan(1000);
    expect(attacked.chakra).toBeLessThan(await page.evaluate(() => window.__trainingGame.scene.getScene("battle").player.maxChakra));
    expect(attacked.cooldown).toBeGreaterThan(0);
    await choose(0);
    await (await trainingAction(page, "strike")).click();
    await trainingReady(page);
    expect((await targets()).turns.every(turn => turn > 0)).toBe(true);
    expect((await targets()).playerHp).toBeLessThan(1000);
    // Pause while clocks are actually advancing, rather than at a decision.
    await (await trainingAction(page, "strike")).click();
    await expect.poll(() => page.evaluate(() => !window.__trainingGame.scene.getScene("battle").busy)).toBe(true);
    await page.getByRole("button", { name: "Pausar combate (Escape)" }).click();
    await expect(page.getByRole("heading", { name: "ENTRENAMIENTO EN PAUSA" })).toBeVisible();
    const paused = await targets();
    await page.waitForTimeout(250);
    expect(await targets()).toEqual(paused);
    await page.getByRole("button", { name: "REANUDAR", exact: true }).click();
    await trainingReady(page);
    // Two knockouts must not end the fight; only defeating the entire group wins.
    for (let index = 0; index < 3; index++) {
      await choose(index);
      await page.evaluate(i => {
        const s = window.__trainingGame.scene.getScene("battle");
        s.trainingTargets[i].state.hp = 1; s.trainingTargets[i].state.statuses = []; s.refreshHud();
      }, index);
      await (await trainingAction(page, "strike")).click();
      if (index < 2) {
        await trainingReady(page);
        expect((await targets()).finished).toBe(false);
        await expect(page.locator(`[data-training-target="${index}"]`)).toBeDisabled();
        await expect(page.locator(`[data-training-target="${index}"]`)).toBeHidden();
        expect(await page.evaluate(i => {
          const s = window.__trainingGame.scene.getScene("battle"), t = s.trainingTargets[i], m = s.groupMarkers[i];
          return [t.fighter.body, t.fighter.shadow, t.ring, m.marker, m.halo, m.label].every(part => !part.visible);
        }, index)).toBe(true);
        if (index === 0) await page.screenshot({ path: testInfo.outputPath("dojo-group-after-knockout.png"), fullPage: true });
      }
    }
    await expect(page.getByRole("heading", { name: "Victoria", exact: true })).toBeVisible({ timeout: 25000 });
    expect((await targets()).hp.every(hp => hp === 0)).toBe(true);
    expect(await stored(page)).toBe(baseline);
    await page.locator("[data-group-rematch]").click();
    await trainingReady(page);
    expect((await targets()).hp.every(hp => hp > 0)).toBe(true);
    // A real enemy hit can lose the bout; returning never persists the damage.
    await page.evaluate(() => {
      const s = window.__trainingGame.scene.getScene("battle");
      s.rollHit = () => true; s.player.hp = 1;
      s.player.statuses = []; s.player.guarding = false;
      s.player.baseEvasion = -100;
      s.trainingTargets.forEach(t => { t.profile.pattern = ["strike"]; t.state.statuses = []; });
    });
    await (await trainingAction(page, "strike")).click();
    await expect(page.getByRole("heading", { name: "Derrota", exact: true })).toBeVisible({ timeout: 30000 });
    await page.locator("[data-group-return]").click();
    await expect(page.locator(".dojo-layout")).toBeVisible();
    await expect(page.locator("[data-training-target]")).toHaveCount(0);
    expect(await stored(page)).toBe(baseline);
    await page.locator("[data-training-count]").selectOption("2");
    await page.locator("[data-start-training]").click();
    await expect(page.locator("[data-training-target]")).toHaveCount(2);
    await page.getByRole("button", { name: "Pausar combate (Escape)" }).click();
    await page.getByRole("button", { name: "VOLVER AL DOJO", exact: true }).click();
    expect(await stored(page)).toBe(baseline);
    expect(errors).toEqual([]);
  });
});


test("el HUD de tablet conserva ocultas las barras del canvas al seleccionar y redimensionar", async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 960, height: 720 });
  await prepare(page, "dojo");
  await page.locator("[data-training-count]").selectOption("3");
  await page.locator("[data-start-training]").click();
  await expect(page.locator("[data-training-target]")).toHaveCount(3, { timeout: 45000 });
  await trainingReady(page);
  const layers = () => page.evaluate(() => {
    const s = window.__trainingGame.scene.getScene("battle");
    return [s.playerHpBar, s.chakraBar, s.enemyHpBar, s.enemyChakraBar].map(bar => bar.fill.visible);
  });
  await page.locator('[data-training-target="2"]').click();
  expect(await layers()).toEqual([false, false, false, false]);
  await page.evaluate(() => {
    const s = window.__trainingGame.scene.getScene("battle");
    s.player.hp -= 5; s.player.chakra -= 5; s.enemy.hp -= 5; s.refreshHud();
  });
  expect(await layers()).toEqual([false, false, false, false]);
  await page.screenshot({ path: testInfo.outputPath("dojo-group-tablet-clean.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(layers).toEqual([true, true, true, true]);
  await page.screenshot({ path: testInfo.outputPath("dojo-group-desktop-clean.png"), fullPage: true });
  await page.setViewportSize({ width: 960, height: 720 });
  await expect.poll(layers).toEqual([false, false, false, false]);
});
