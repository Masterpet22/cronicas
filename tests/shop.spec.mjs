import { expect, test } from "@playwright/test";
import { ensurePhaser } from "./helpers/phaser-loader.mjs";
import { bootPerformanceReference } from "./helpers/performance-harness.mjs";

const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")));
async function seedShop(page) {
  await page.goto("/");
  await page.evaluate(async () => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.111.0");
    const save = createCharacter(createDefaultSave(), { name: "Comprador", affinity: "fuego", bodyType: "male" });
    const { unlockVillageForTest } = await import("/tests/helpers/village-progress.mjs");
    unlockVillageForTest(save, {});
    save.progression.coins = 2000;
    save.progression.level = 15;
    save.campaign.elementRank = 2;
    save.campaign.completedSecondaryMissions = ["affinity_trial_2"];
    save.campaign.rank = "Guardián";
    save.campaign.tutorialSeen = true; save.campaign.npcIntroductions = ["dojo:mei"];
    save.character.affinities = ["fuego", "viento"];
    save.character.knownAffinities = ["fuego", "viento"];
    writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
  });
  await page.reload();
  await page.locator('[data-go="shop"]').click();
  const speech = page.locator("[data-stage-speech]");
  for (let i = 0; i < 10 && await speech.isVisible(); i++) {
    const next = speech.locator("[data-stage-next]");
    const last = (await next.textContent()) === "VER OPCIONES";
    await next.click();
    if (last) break;
  }
  await expect(page.locator(".shop-panel")).toBeVisible();
}

test("compra, apila, equipa y conserva el equipo al recargar", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await seedShop(page);
  await expect(page.getByRole("button", { name: "Abrir inventario" })).toHaveCount(0);
  await expect(page.locator("[data-shop-tab], [data-item-equip]")).toHaveCount(0);
  const potion = page.locator('[data-shop-item="health_potion"]');
  await potion.locator("input").fill("2");
  await potion.getByRole("button", { name: "Comprar", exact: true }).click();
  expect((await stored(page)).inventory.items.health_potion).toBe(2);
  expect((await stored(page)).progression.coins).toBe(1964);
  await page.locator('[data-shop-category="weapons"]').click();
  await page.locator('[data-shop-item="axe"]').getByRole("button", { name: "Comprar" }).click();
  await expect(page.locator('[data-shop-item="axe"] button')).toBeDisabled();
  await page.locator('[data-shop-category="seals"]').click();
  await page.locator('[data-shop-item="seal_shadow"]').getByRole("button", { name: "Comprar" }).click();
  await page.locator('[data-shop-category="scrolls"]').click();
  await expect(page.locator('[data-shop-item="affinity_scroll"]')).toHaveCount(0);
  await page.screenshot({ path: "test-results/shop/tienda.png" });
  await page.getByRole("button", { name: "← Volver al mapa" }).click();
  await page.locator('[data-go="dojo"]').click();
  await page.locator('[data-dojo-tab="equipment"]').click();
  await page.locator('[data-gear-slot="weapon"]').click();
  await page.locator('[data-equipment-id="axe"]').click();
  await page.locator('[data-gear-slot="seal"]').click();
  await page.locator('[data-equipment-id="seal_shadow"]').click();
  await expect(page.locator(".affinity-slots")).toContainText("Nivel 30");
  const save = await stored(page);
  expect(save.equipment).toMatchObject({ weapon: "axe", seal: "seal_shadow" });
  expect(save.character.affinities).toEqual(["fuego", "viento"]);
  expect(save.inventory.extraAffinityUnlocked).toBe(false);
  expect(save.inventory.items.affinity_scroll).toBeUndefined();
  expect(save.progression.coins).toBe(1679);
  await page.reload();
  await page.locator('[data-go="dojo"]').click();
  await page.locator('[data-dojo-tab="equipment"]').click();
  await expect(page.locator('[data-gear-slot="weapon"]')).toContainText("Hacha de combate");
  await expect(page.locator('[data-gear-slot="seal"]')).toContainText("Sello de la sombra");
  await expect(page.locator(".affinity-slots")).toContainText("Viento");
  expect((await stored(page)).inventory.items.health_potion).toBe(2);
  await page.screenshot({ path: "test-results/shop/equipo.png" });
  expect(errors).toEqual([]);
});

async function equipBattleStock(page) {
  await bootPerformanceReference(page, { renderer: "Canvas" });
  await page.evaluate(async () => {
    const { writeSave } = await import("/src/save.js?v=0.111.0");
    const { purchaseItem } = await import("/src/inventory.js?v=1.0.0");
    const scene = window.__performanceReference.scene;
    let save = { ...scene.saveData, progression: { ...scene.saveData.progression, coins: 1000 } };
    save = purchaseItem(save, "health_potion", 2).save;
    save = purchaseItem(save, "retry_scroll").save;
    scene.saveData = writeSave(save);
    scene.missionStartSave = structuredClone(scene.saveData);
    scene.rewardPreviewSave = structuredClone(scene.saveData);
    scene.player.hp = 10;
    scene.busy = false;
    scene.turnReady = true;
    scene.stopTurnTimeline();
    scene.refreshHud();
  });
}

test("vende a mitad de precio y selecciona solo apariencia y sustitución compradas", async ({ page }) => {
  await seedShop(page);
  await page.locator('[data-shop-item="health_potion"] input').fill("3");
  await page.locator('[data-shop-item="health_potion"] button').click();
  await page.locator('[data-shop-category="seals"]').click();
  await page.locator('[data-shop-item="seal_shadow"] button').click();
  await page.locator('[data-shop-mode="sell"]').click();
  await expect(page.locator('[data-shop-item="kunai"] button')).toBeDisabled();
  await page.locator('[data-shop-item="health_potion"] input').fill("2");
  await page.locator('[data-shop-item="health_potion"] button').click();
  await page.locator('[data-shop-item="seal_shadow"] button').click();
  expect((await stored(page)).progression.coins).toBe(1901);
  expect((await stored(page)).inventory.items.health_potion).toBe(1);
  await page.screenshot({ path: "test-results/shop/venta.png" });
  await page.locator('[data-shop-mode="buy"]').click();
  for (const [category, ids] of [["substitution", ["substitution_dog", "substitution_puppet"]], ["appearance", ["hair_ponytail", "face_mask", "top_traveler", "bottom_traveler", "shoes_sandals", "shadow_outfit"]]]) {
    await page.locator(`[data-shop-category="${category}"]`).click();
    for (const id of ids) await page.locator(`[data-shop-item="${id}"] button`).click();
  }
  await page.getByRole("button", { name: "← Volver al mapa" }).click();
  await page.locator('[data-go="dojo"]').click();
  await page.locator('[data-dojo-tab="appearance"]').click();
  for (const slot of ["teleportObject", "face", "top", "bottom", "shoes", "outfit", "hair"]) {
    await page.locator(`[data-cosmetic-step="${slot}"][data-direction="1"]`).click();
  }
  await expect(page.locator('[data-cosmetic-control="teleportObject"]')).toContainText("Sustitución");
  await expect(page.locator('[data-cosmetic-value="teleportObject"]')).toContainText("Perrito");
  expect((await stored(page)).character).toMatchObject({ teleportObject: "dog", hair: 4, face: 3, top: 2, bottom: 2, shoes: 2, outfit: "shadow_outfit" });
  expect((await stored(page)).character.hair).toBe(4);
  await page.screenshot({ path: "test-results/shop/apariencia.png" });
  await page.locator('[data-dojo-tab="equipment"]').click();
  await expect(page.locator("[data-gear-slot]")).toHaveCount(4);
  await expect(page.locator('[data-gear-slot="seal"]')).toContainText("Sello");
  await expect(page.locator('[data-gear-slot="armor"]')).toHaveCount(0);
  await page.reload();
  expect((await stored(page)).character.hair).toBe(4);
  expect((await stored(page)).inventory.items.seal_shadow).toBeUndefined();
});

test("un contrato comprado se juega en el tablón y desbloquea un compañero al cobrar la victoria", async ({ page }) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await seedShop(page);
  await page.locator('[data-shop-category="contracts"]').click();
  await page.locator('[data-shop-item="contract_hound"] button').click();
  await page.getByRole("button", { name: "← Volver al mapa" }).click();
  await page.locator('[data-go="missions"]').click();
  const speech = page.locator("[data-stage-speech]");
  for (let i = 0; i < 12 && await speech.isVisible(); i++) {
    const next = speech.locator("[data-stage-next]");
    const last = (await next.textContent()) === "VER OPCIONES";
    await next.click(); if (last) break;
  }
  await expect(page.locator("[data-secondary-mission]")).toHaveCount(2);
  await ensurePhaser(page);
  await page.evaluate(() => {
    const Base = window.Phaser.Game;
    window.Phaser.Game = class extends Base { constructor(config) { super(config); window.__contractGame = this; } };
  });
  await page.locator('[data-secondary-mission="contract_hound"]').click();
  const dialogue = page.locator(".dialogue-overlay");
  await expect(dialogue).toBeVisible();
  await dialogue.locator(".primary-button").click();
  await expect.poll(() => page.evaluate(() => Boolean(window.__contractGame?.scene.getScene("battle")?.hero)), { timeout: 60000 }).toBe(true);
  const pending = await page.evaluate(async () => {
    const scene = window.__contractGame.scene.getScene("battle");
    scene.stopTurnTimeline();
    scene.playEncounterRewards = async () => {};
    scene.showPendingLevelUp = async () => {};
    scene.delay = async () => {};
    scene.finishBattle = async () => { scene.finished = true; scene.stopTurnTimeline(); };
    while (!scene.finished) { scene.enemy.hp = 0; await scene.resolveEnemyOutcome(); scene.stopTurnTimeline(); }
    return { companion:scene.saveData.inventory.items.companion_hound,rewards:scene.battleRewards };
  });
  expect(pending).toMatchObject({ companion:1,rewards:{ xp:100 } });
  expect((await stored(page)).inventory.items.companion_hound).toBeUndefined();
  await page.evaluate(async () => {
    const { battleRuntime } = await import("/src/battle/session.js?v=1.0.0");
    battleRuntime.releaseGameToMeta("plaza", { commitVictory: true });
  });
  expect((await stored(page)).inventory.items.companion_hound).toBe(1);
  expect((await stored(page)).inventory.items.contract_hound).toBeUndefined();
  await page.locator('[data-go="dojo"]').click();
  await page.locator('[data-dojo-tab="equipment"]').click();
  await page.locator('[data-gear-slot="companion"]').click();
  await page.locator('[data-equipment-id="companion_hound"]').click();
  expect((await stored(page)).equipment.companion).toBe("companion_hound");
  await page.screenshot({ path: "test-results/shop/companero.png" });
  expect(errors).toEqual([]);
});

for (const [slot, level, chosen] of [[2, 15, "viento"], [3, 30, "agua"]]) {
  test(`la afinidad ${slot} exige nivel ${level} y vencer su misión especial`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await seedShop(page);
    await page.evaluate(async ({ slot, level }) => {
      const { loadSave, writeSave } = await import("/src/save.js");
      const save = loadSave(); save.progression.level = level - 1;
      save.character.affinities = slot === 2 ? ["fuego"] : ["fuego", "viento"];
      save.campaign.completedSecondaryMissions = slot === 2 ? [] : ["affinity_trial_2"];
      save.inventory.items.affinity_scroll = 1; save.inventory.extraAffinityUnlocked = true;
      writeSave(save);
    }, { slot, level });
    await page.reload();
    await page.locator('[data-go="dojo"]').click();
    await page.locator('[data-dojo-tab="equipment"]').click();
    await expect(page.locator('[data-affinity-choice]')).toHaveCount(0);
    await page.locator('[data-affinity-trials]').first().click();
    const speech = page.locator("[data-stage-speech]");
    for (let i = 0; i < 12 && await speech.isVisible(); i++) {
      const next = speech.locator("[data-stage-next]");
      const last = (await next.textContent()) === "VER OPCIONES";
      await next.click(); if (last) break;
    }
    await expect(page.locator(`[data-secondary-mission="affinity_trial_${slot}"]`)).toHaveCount(0);
    await page.evaluate(async level => {
      const { loadSave, writeSave } = await import("/src/save.js");
      const save = loadSave(); save.progression.level = level; writeSave(save);
    }, level);
    await page.reload();
    await page.locator('[data-go="dojo"]').click();
    await page.locator('[data-dojo-tab="equipment"]').click();
    await expect(page.locator('[data-affinity-choice]')).toHaveCount(0);
    await page.locator('[data-affinity-trials]').first().click();
    await ensurePhaser(page);
    await page.evaluate(() => {
      const Base = window.Phaser.Game;
      window.Phaser.Game = class extends Base { constructor(config) { super(config); window.__affinityGame = this; } };
    });
    await page.locator(`[data-secondary-mission="affinity_trial_${slot}"]`).click();
    await page.locator(".dialogue-overlay .primary-button").click();
    await expect.poll(() => page.evaluate(() => Boolean(window.__affinityGame?.scene.getScene("battle")?.hero)), { timeout: 60000 }).toBe(true);
    const outcome = await page.evaluate(async () => {
      const scene = window.__affinityGame.scene.getScene("battle");
      scene.stopTurnTimeline();
      scene.delay = async () => {};
      scene.showPendingLevelUp = async () => {};
      scene.finishBattle = async () => { scene.finished = true; scene.stopTurnTimeline(); };
      const hp = scene.enemy.maxHp;
      while (!scene.finished) { scene.enemy.hp = 0; await scene.resolveEnemyOutcome(); scene.stopTurnTimeline(); }
      return { hp, level: scene.saveData.progression.level, rewards: scene.battleRewards };
    });
    expect(outcome.hp).toBeGreaterThan(150);
    expect(outcome.level).toBe(level);
    expect(outcome.rewards).toMatchObject({ xp: 0, coins: 0, affinityXp: 0 });
    expect((await stored(page)).campaign.completedSecondaryMissions).not.toContain(`affinity_trial_${slot}`);
    await page.evaluate(async () => {
      const { battleRuntime } = await import("/src/battle/session.js?v=1.0.0");
      battleRuntime.releaseGameToMeta("plaza", { commitVictory: true });
    });
    await page.locator('[data-go="dojo"]').click();
    await page.locator('[data-dojo-tab="equipment"]').click();
    await page.locator(`[data-affinity-choice="${chosen}"]`).click();
    const save = await stored(page);
    expect(save.character.affinities).toHaveLength(slot);
    expect(save.character.affinities[slot - 1]).toBe(chosen);
    expect(save.campaign.completedSecondaryMissions).toContain(`affinity_trial_${slot}`);
    expect(save.character.affinityXp[chosen]).toBe(0);
    expect(save.inventory.items.affinity_scroll).toBe(1);
    await page.reload();
    expect((await stored(page)).character.affinities).toHaveLength(slot);
    expect(errors).toEqual([]);
  });
}

test("la tienda y el equipo comprado caben en una ventana de 1280 × 720", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await seedShop(page);
  await page.locator('[data-shop-category="weapons"]').click();
  const axe = page.locator('[data-shop-item="axe"]');
  await axe.getByRole("button", { name: "Comprar" }).click();
  await expect(page.locator(".shop-panel")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "← Volver al mapa" }).click();
  await page.locator('[data-go="dojo"]').click();
  await page.locator('[data-dojo-tab="equipment"]').click();
  const armor = page.locator('[data-gear-slot="seal"]');
  await expect(armor).toBeVisible();
  await expect(armor).toBeInViewport();
  await page.locator('[data-gear-slot="weapon"]').click();
  const options = page.locator(".equipment-modal-options");
  await expect(options).toContainText("Hacha de combate");
  await expect(options).not.toContainText("Espada del horizonte");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.screenshot({ path: "test-results/shop/equipo-1280.png" });
});

test("una poción usa el turno y sigue gastada después de retirarse", async ({ page }) => {
  await equipBattleStock(page);
  await page.screenshot({ path: "test-results/shop/combate.png" });
  await page.getByRole("button", { name: "Abrir objetos de misión" }).click();
  await page.screenshot({ path: "test-results/shop/mochila.png" });
  await page.locator('[data-use-item="health_potion"]').click();
  await expect(page.getByRole("dialog", { name: "Objetos de misión" })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__performanceReference.scene.round)).toBe(2);
  const state = await page.evaluate(() => {
    const scene = window.__performanceReference.scene;
    scene.stopTurnTimeline();
    return { hp: scene.player.hp, expected: 10 + Math.round(scene.player.maxHp * .35),
      count: scene.saveData.inventory.items.health_potion, baseline: scene.missionStartSave.inventory.items.health_potion,
      turnReady: scene.turnReady };
  });
  expect(state.hp).toBe(state.expected);
  expect(state.count).toBe(1);
  expect(state.baseline).toBe(1);
  expect(state.turnReady).toBe(false);
  await page.getByRole("button", { name: "Abrir objetos de misión" }).click();
  await expect(page.locator('[data-use-item="health_potion"]')).toBeDisabled();
  await page.getByRole("button", { name: "Cerrar objetos" }).click();
  await page.evaluate(() => window.__performanceReference.scene.abandonPayload());
  expect((await stored(page)).inventory.items.health_potion).toBe(1);
});

test("los reintentos gratuitos se usan antes del pergamino y este no reaparece", async ({ page }) => {
  await equipBattleStock(page);
  await page.evaluate(() => {
    const scene = window.__performanceReference.scene;
    scene.freeRetries = 1;
    scene.player.hp = 0;
    scene.finishBattle(false);
  });
  await page.getByRole("button", { name: "REINTENTAR (1)", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__performanceReference.scene.finished)).toBe(false);
  expect((await stored(page)).inventory.items.retry_scroll).toBe(1);
  await page.evaluate(() => {
    const scene = window.__performanceReference.scene;
    scene.stopTurnTimeline(); scene.player.hp = 0; scene.finishBattle(false);
  });
  await page.getByRole("button", { name: "USAR PERGAMINO Y REINTENTAR (1)", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__performanceReference.scene.finished)).toBe(false);
  expect((await stored(page)).inventory.items.retry_scroll).toBeUndefined();
  const sceneState = await page.evaluate(() => {
    const scene = window.__performanceReference.scene;
    scene.stopTurnTimeline();
    return { hp: scene.player.hp, maxHp: scene.player.maxHp, retry: scene.rewardPreviewSave.inventory.items.retry_scroll };
  });
  expect(sceneState.hp).toBe(sceneState.maxHp);
  expect(sceneState.retry).toBeUndefined();
});
