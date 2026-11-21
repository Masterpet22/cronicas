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
  await page.getByRole("tab", { name: "Entrenamiento" }).click();
  await expect(page.locator("[data-start-training]")).toBeVisible();
  await ensurePhaser(page);
  await page.evaluate(() => {
    const Original = Phaser.Game;
    Phaser.Game = class extends Original {
      constructor(config) {
        super({ ...config, type: Phaser.CANVAS });
        window.__trainingGame = this;
      }
    };
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
  test("Revancha vuelve a mostrar a los luchadores y sus marcadores", async ({ page }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await prepare(page, "dojo");
    await page.locator("[data-training-count]").selectOption("3");
    await page.locator("[data-start-training]").click();
    const objectives = page.locator("[data-training-target]");
    await expect(objectives).toHaveCount(3, { timeout: 45000 });

    await page.evaluate(async () => {
      const battle = window.__trainingGame.scene.getScene("battle");
      battle.stopTurnTimeline();
      battle.trainingTargets.forEach(({ state }) => { state.hp = 0; });
      await battle.finishBattle(true);
    });
    const rematch = page.locator("[data-group-rematch]");
    if (tablet) await rematch.tap(); else await rematch.click();
    await expect(objectives).toHaveCount(3, { timeout: 45000 });
    await expect(page.locator("#game > canvas")).toBeVisible();
    expect(await page.evaluate(() => {
      const battle = window.__trainingGame.scene.getScene("battle");
      return battle.scene.isActive() && !battle.finished && battle.hero.body.scene === battle
        && battle.hero.body.visible && battle.trainingTargets.every(({ fighter, state }) =>
          state.hp > 0 && fighter.body.scene === battle && fighter.body.visible)
        && battle.groupMarkers.length === 3 && battle.groupMarkers.every(({ marker }) =>
          marker.scene === battle && marker.visible) && battle.timelineLayer.visible;
    })).toBe(true);
    await trainingReady(page);
    expect(errors).toEqual([]);
  });

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
    expect(await page.evaluate(() => {
      const scene = window.__trainingGame.scene.getScene("battle");
      const observer = new MutationObserver(() => {});
      observer.observe(document.querySelector(".combat-access"), { subtree: true, attributes: true, childList: true, characterData: true });
      for (let i = 0; i < 3; i++) scene.refreshHud();
      const writes = observer.takeRecords().map(({ target, type, attributeName }) => ({
        element: target.nodeName, className: target.getAttribute?.('class'), type, attributeName
      }));
      observer.disconnect();
      return writes;
    })).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("dojo-group-combat.png"), fullPage: true });
    const healthTrail = await page.evaluate(() => {
      const s = window.__trainingGame.scene.getScene("battle"), bar = s.enemyHpBar;
      const snapshot = () => ({ text: bar.valueText.text, fill: Math.round(bar.fill.fillWidth * 100 / bar.width),
        trail: Math.round(bar.ghost.fillWidth * 100 / bar.width) });
      s.trainingTargets.forEach(({ state }) => { state.hp = state.maxHp = 100; });
      s.refreshHud();
      s.loseHealth(s.enemy, s.foe, 30, { react: false });
      const afterHit = snapshot();
      s.selectTrainingTarget(1);
      const other = snapshot();
      s.selectTrainingTarget(2);
      const reselected = snapshot();
      s.selectTrainingTarget(1);
      s.selectTrainingTarget(2);
      const reselectedAgain = snapshot();
      s.loseHealth(s.enemy, s.foe, 20, { react: false });
      return { afterHit, other, reselected, reselectedAgain, afterSecondHit: snapshot() };
    });
    expect(healthTrail).toEqual({
      afterHit: { text: "70/100", fill: 70, trail: 100 },
      other: { text: "100/100", fill: 100, trail: 100 },
      reselected: { text: "70/100", fill: 70, trail: 70 },
      reselectedAgain: { text: "70/100", fill: 70, trail: 70 },
      afterSecondHit: { text: "50/100", fill: 50, trail: 70 }
    });
    // Keep a long, deterministic bout to verify repeated real enemy actions.
    await page.evaluate(() => {
      const s = window.__trainingGame.scene.getScene("battle");
      s.rollHit = () => true;
      s.player.hp = s.player.maxHp = 1000;
      s.trainingTargets.forEach(t => { t.state.hp = t.state.maxHp = 1000; t.profile.pattern = ["strike"]; });
      s.refreshHud();
    });
    const technique = await trainingAction(page, "fire_embers");
    const reservation = await technique.evaluate(button => {
      const scene = window.__trainingGame.scene.getScene("battle");
      button.click();
      return { target: scene.groupReservation?.target, canChange: scene.selectTrainingTarget(0) };
    });
    expect(reservation).toEqual({ target: 2, canChange: false });
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
    await page.evaluate(() => {
      const scene = window.__trainingGame.scene.getScene("battle");
      const update = scene.updateTimelineMarkers;
      scene.updateTimelineMarkers = function (...args) {
        update.apply(this, args);
        if (!this.timelineTween || this.busy || this.timelinePaused) return;
        this.updateTimelineMarkers = update;
        document.querySelector(".combat-access-pause").click();
      };
    });
    await (await trainingAction(page, "strike")).click();
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
        await expect.poll(() => page.evaluate(i => {
          const s = window.__trainingGame.scene.getScene("battle"), t = s.trainingTargets[i], m = s.groupMarkers[i];
          return [t.fighter.body, t.fighter.shadow, ...m.parts].filter(part => part.visible).map(part => part.type);
        }, index)).toEqual([]);
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
  const compactViewport = { width: 880, height: 720 };
  await page.setViewportSize(compactViewport);
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
  await page.setViewportSize(compactViewport);
  await expect.poll(layers).toEqual([false, false, false, false]);
});


test("el rival derrotado desaparece dentro de una nube de humo sin dejar objetos", async ({ page }, testInfo) => {
  test.setTimeout(120000);
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await prepare(page, "dojo");
  const baseline = await stored(page);
  await page.locator("[data-training-count]").selectOption("3");
  await page.locator("[data-start-training]").click();
  await expect(page.locator("[data-training-target]")).toHaveCount(3, { timeout: 45000 });
  await trainingReady(page);
  await page.evaluate(() => {
    const s = window.__trainingGame.scene.getScene("battle");
    s.stopTurnTimeline(); s.busy = true; s.timelinePaused = true;
    s.trainingTargets[0].state.hp = 0;
    const body = s.trainingTargets[0].fighter.body, setVisible = body.setVisible.bind(body);
    body.setVisible = value => {
      body.setVisible = setVisible;
      const result = setVisible(value);
      if (!value) { s.tweens.timeScale = 0; window.__smokeCovered = true; }
      return result;
    };
    window.__retirement = s.retireGroupTargets();
    window.__firstSmoke = s.children.getByName("teleport-smoke");
  });
  await expect.poll(() => page.evaluate(() => Boolean(window.__smokeCovered))).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("dojo-defeat-smoke.png"), fullPage: true });
  await page.evaluate(async () => {
    const s = window.__trainingGame.scene.getScene("battle");
    s.tweens.timeScale = 1;
    await window.__retirement; s.refreshHud();
  });
  expect(await page.evaluate(() => {
    const s = window.__trainingGame.scene.getScene("battle"), t = s.trainingTargets[0];
    return { smoke: Boolean(s.children.getByName("teleport-smoke")),
      prop: Boolean(s.children.getByName("teleport-object")), body: t.fighter.body.visible,
      shadow: t.fighter.shadow.visible, nextTarget: s.selectedTargetIndex,
      markersMatchLivingOpponents: s.groupMarkers.every(({ parts }, index) => parts.every(part => part.visible === (index !== 0))) };
  })).toEqual({ smoke: false, prop: false, body: false, shadow: false, nextTarget: 1, markersMatchLivingOpponents: true });
  const finalSmoke = await page.evaluate(() => {
    const s = window.__trainingGame.scene.getScene("battle");
    s.trainingTargets[1].state.hp = 0; s.trainingTargets[2].state.hp = 0;
    s.tweens.timeScale = 0;
    window.__finalSmoke = s.finishBattle(true);
    const clouds = s.children.list.filter(child => child.name === "teleport-smoke");
    return { simultaneous: clouds.length, reused: clouds.includes(window.__firstSmoke) };
  });
  expect(finalSmoke).toEqual({ simultaneous: 2, reused: true });
  await expect(page.getByRole("heading", { name: "Victoria", exact: true })).toHaveCount(0);
  await page.evaluate(async () => {
    window.__trainingGame.scene.getScene("battle").tweens.timeScale = 1;
    await window.__finalSmoke;
  });
  await expect(page.getByRole("heading", { name: "Victoria", exact: true })).toBeVisible();
  await page.locator("[data-group-return]").click();
  await expect(page.locator(".dojo-layout")).toBeVisible();
  expect(await stored(page)).toBe(baseline);
  expect(errors).toEqual([]);
});
