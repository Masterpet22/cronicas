import { test, expect } from "@playwright/test";
import { bootPerformanceReference, disposePerformanceReference } from "./helpers/performance-harness.mjs";

for (const renderer of ["Canvas", "WebGL"]) {
  test(`${renderer}: los aros muestran la afinidad dominante y cambian al entrar otro rival`, async ({ page }) => {
    if (renderer === "WebGL") test.skip(!await page.evaluate(() => Boolean(document.createElement("canvas").getContext("webgl2"))), "WebGL2 no disponible");
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await bootPerformanceReference(page, { renderer });
    const readRings = () => page.evaluate(() => new Promise(resolve => {
      const state = window.__performanceReference;
      state.game.events.once("postrender", () => {
        const canvas = document.createElement("canvas");
        canvas.width = state.game.canvas.width; canvas.height = state.game.canvas.height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(state.game.canvas, 0, 0);
        const scale = canvas.width / 960;
        const sample = x => [...context.getImageData(Math.round(x * scale), Math.round(16 * scale), 1, 1).data].slice(0, 3);
        resolve({ player: sample(61), enemy: sample(900), playerAffinity: state.scene.playerPortrait.affinity, enemyAffinity: state.scene.enemyPortrait.affinity });
      });
    }));
    const near = (actual, expected) => actual.forEach((value, index) => expect(Math.abs(value - expected[index])).toBeLessThanOrEqual(5));
    const initial = await readRings();
    expect(initial.playerAffinity).toBe("fuego"); expect(initial.enemyAffinity).toBe("viento");
    near(initial.player, [255, 120, 61]); near(initial.enemy, [132, 232, 203]);
    await page.evaluate(async () => {
      const { derivedStats } = await import("/src/save.js?v=0.131.0");
      const scene = window.__performanceReference.scene;
      scene.saveData.progression.level = 30;
      scene.saveData.campaign.completedSecondaryMissions = ["affinity_trial_2", "affinity_trial_3"];
      scene.saveData.campaign.elementRank = 2;
      scene.saveData.character.affinities = ["agua", "fuego"];
      Object.assign(scene.player, derivedStats(scene.saveData));
      scene.enemyIndex = 1;
      scene.enemy = scene.createEnemyState(scene.encounters[1]);
      scene.refreshHud();
    });
    const changed = await readRings();
    expect(changed.playerAffinity).toBe("agua"); expect(changed.enemyAffinity).toBe("tierra");
    near(changed.player, [85, 191, 255]); near(changed.enemy, [183, 138, 85]);
    await page.screenshot({ path: `test-results/affinity-rings-${renderer}.png` });
    await disposePerformanceReference(page);
    expect(errors).toEqual([]);
  });
}

test("el combate rechaza una técnica de fuego forzada sobre un enemigo de viento", async ({ page }) => {
  await bootPerformanceReference(page, { renderer: "Canvas", loadout: [] });
  const result = await page.evaluate(async () => {
    const { ABILITY_CATALOG } = await import("/src/data.js?v=1.5.0");
    const scene = window.__performanceReference.scene;
    const before = { hp: scene.player.hp, chakra: scene.enemy.chakra };
    scene.playSeals = async () => { throw new Error("Un elemento incompatible no debe iniciar sellos"); };
    scene.enemyTurn = async () => { throw new Error("Un elemento incompatible no debe atacar"); };
    scene.startTurnCharge = () => {};
    await scene.executeTimelineAction("enemy", ABILITY_CATALOG.fire_embers);
    return { before, after: { hp: scene.player.hp, chakra: scene.enemy.chakra }, affinity: scene.enemy.primaryAffinity };
  });
  expect(result.affinity).toBe("viento");
  expect(result.after).toEqual(result.before);
  await disposePerformanceReference(page);
});

test("el jefe tutorial precarga la técnica correspondiente a su afinidad adaptada", async ({ page }) => {
  await bootPerformanceReference(page, { renderer: "Canvas", arenaIndex: 0, loadout: [] });
  const result = await page.evaluate(() => {
    const scene = window.__performanceReference.scene;
    const index = scene.encounters.findIndex(profile => profile.boss);
    const profile = scene.encounters[index];
    scene.enemyIndex = index;
    scene.enemy = scene.createEnemyState(profile);
    scene.enemy.phase = 2;
    scene.enemy.patternIndex = profile.phase2Pattern.length - 1;
    const action = scene.chooseEnemyAction();
    return { affinity: scene.enemy.primaryAffinity, affinities: scene.enemy.affinities, action: action.id,
      texture: scene.textures.exists("technique-vfx-wind_palm"), animation: scene.anims.exists("technique-vfx-wind_palm-animation"),
      visualAbilities: scene.battleVisualAbilities };
  });
  expect(result).toMatchObject({ affinity: "viento", affinities: ["viento"], action: "wind_palm", texture: true, animation: true });
  expect(result.visualAbilities).toContain("wind_palm");
  await disposePerformanceReference(page);
});
