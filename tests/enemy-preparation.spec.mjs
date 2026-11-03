import { test, expect } from "@playwright/test";
import { bootPerformanceReference, disposePerformanceReference } from "./helpers/performance-harness.mjs";

test("PRUEBAS lista el catálogo completo y filtra las exclusivas sin concederlas al jugador", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.131.0");
    const save = createCharacter(createDefaultSave(), { name: "Catálogo", affinity: "fuego" });
    save.campaign.tutorialSeen = true;
    writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
  });
  await page.reload();
  await page.locator(".debug-tools-trigger").click();
  await page.locator("[data-ability-catalog] summary").click();
  await expect(page.locator("[data-ability-id]")).toHaveCount(44);
  await page.locator("[data-ability-filter]").selectOption("enemy-only");
  await expect(page.locator("[data-ability-id]:visible")).toHaveCount(1);
  await expect(page.locator('[data-ability-id="toxin"]')).toContainText("Exclusiva de enemigos");
  await page.screenshot({ path: "test-results/ability-catalog-exclusive.png" });
  await page.locator("[data-ability-filter]").selectOption("shared");
  await expect(page.locator("[data-ability-id]:visible")).toHaveCount(43);
  await expect(page.locator('[data-ability-id="fire_embers"]')).toContainText("Ascuas veloces");
  expect(await page.evaluate(() => Boolean(window.Phaser))).toBe(false);
});

for (const renderer of ["Canvas", "WebGL"]) for (const ability of [
  { id: "toxin", seals: ["cetus", "bootes", "ara"], labels: ["ARA", "BOOTES", "CETUS"] },
  { id: "wind_palm", seals: ["cygnus", "pegasus"], labels: ["CYGNUS", "PEGASUS"] }
]) {
  test(`${renderer}: ${ability.id} usa su definición común o exclusiva y muestra sellos con equipo vacío`, async ({ page }) => {
    if (renderer === "WebGL") test.skip(!await page.evaluate(() => Boolean(document.createElement("canvas").getContext("webgl2"))), "WebGL2 no disponible");
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await bootPerformanceReference(page, { renderer, loadout: [] });
    const start = await page.evaluate(ability => {
      const state = window.__performanceReference, scene = state.scene;
      scene.manualSeals = true;
      scene.waitForSealInput = async () => { throw new Error("Los sellos del enemigo no deben pedir teclas"); };
      scene.combatTutorial = { seals: async () => { throw new Error("El rival no debe abrir el tutorial de sellos"); }, destroy() {} };
      scene.startTurnCharge = () => {};
      scene.encounters[scene.enemyIndex] = { ...scene.encounters[scene.enemyIndex], pattern: [ability.id],
        ...(ability.id === "toxin" ? { level: 30, affinity: "agua", affinities: ["agua", "tierra", "fuego"],
          completedAffinityTrials: ["affinity_trial_2", "affinity_trial_3"] } : {}) };
      scene.enemy = scene.createEnemyState(scene.encounters[scene.enemyIndex]);
      scene.enemy.patternIndex = 0;
      scene.enemy.baseSpeed = 10;
      scene.enemy.speedModifier = 0;
      scene.player.baseSpeed = 1;
      scene.timelineProgress = { player: 0, enemy: .8 };
      scene.pendingActions = { player: null, enemy: null };
      scene.busy = false;
      scene.timelinePaused = false;
      state.castingComplete = false;
      state.attackStarted = false;
      const delay = scene.delay;
      scene.delay = async function (ms) {
        if (!state.previewReady && state.castOptions?.actor === "enemy"
          && this.sealLayer.list.filter(part => part.type === "Container").length === ability.seals.length) {
          state.previewReady = true;
          await new Promise(resolve => { state.releasePreview = resolve; });
        }
        return delay.call(this, ms);
      };
      const seals = scene.playSeals;
      scene.playSeals = async function (action, options) {
        state.castOptions = options;
        state.castStartedAt = this.time.now;
        const result = await seals.call(this, action, options);
        state.castingComplete = true;
        return result;
      };
      const attack = scene.enemyTurn;
      scene.enemyTurn = async function (action) {
        if (!state.castingComplete) throw new Error("El enemigo atacó antes de completar los sellos");
        state.attackStarted = true;
        return attack.call(this, action);
      };
      state.preparationStartedAt = scene.time.now;
      state.seenBefore = [...scene.seenJutsus];
      state.storageBefore = localStorage.getItem("seen-jutsus");
      void scene.handleTimelineArrivals([{ actor: "enemy", action: null }]);
      return { sheet: scene.textures.exists("sealSheet"), seals: scene.pendingActions.enemy?.seals,
        attacked: state.attackStarted, preparing: scene.foe.preparing };
    }, ability);
    expect(start).toEqual({ sheet: true, seals: ability.seals, attacked: false, preparing: true });
    await expect.poll(() => page.evaluate(() => window.__performanceReference.scene.sealLayer.list.filter(part => part.type === "Container").length), { timeout: 20_000 }).toBe(ability.seals.length);
    const cards = await page.evaluate(() => {
      const state = window.__performanceReference, scene = state.scene;
      return { options: state.castOptions, prompt: scene.sealPrompt.text,
        labels: scene.sealLayer.list.filter(part => part.type === "Container")
          .flatMap(card => card.list.filter(part => part.type === "Text").map(part => part.text)),
        preparationMs: state.castStartedAt - state.preparationStartedAt, attacked: state.attackStarted };
    });
    expect(cards.options).toEqual({ actor: "enemy" });
    expect(cards.prompt).toContain("SELLOS DEL RIVAL");
    expect(cards.labels.sort()).toEqual(ability.labels);
    expect(cards.attacked).toBe(false);
    expect(cards.preparationMs).toBeGreaterThanOrEqual(ability.seals.length * 300);
    await page.screenshot({ path: `test-results/enemy-seals-${renderer}-${ability.id}.png` });
    await page.evaluate(() => window.__performanceReference.releasePreview());
    await expect.poll(() => page.evaluate(() => window.__performanceReference.attackStarted), { timeout: 20_000 }).toBe(true);
    expect(await page.evaluate(() => {
      const state = window.__performanceReference;
      return { seen: JSON.stringify([...state.scene.seenJutsus]) === JSON.stringify(state.seenBefore),
        storage: localStorage.getItem("seen-jutsus") === state.storageBefore };
    })).toEqual({ seen: true, storage: true });
    await disposePerformanceReference(page);
    expect(errors).toEqual([]);
  });
}

test("los sellos del jugador siguen usando entrada manual y guardando las técnicas vistas", async ({ page }) => {
  await bootPerformanceReference(page, { renderer: "Canvas" });
  await page.evaluate(() => {
    const state = window.__performanceReference, scene = state.scene;
    scene.manualSeals = true;
    state.expectedKeys = [];
    const wait = scene.waitForSealInput;
    scene.waitForSealInput = function (key, ...args) {
      state.expectedKeys.push(key);
      return wait.call(this, key, ...args);
    };
    void scene.playSeals(state.technique).then(result => { state.casting = result; });
  });
  const count = await page.evaluate(() => window.__performanceReference.technique.seals.length);
  for (let index = 0; index < count; index++) {
    await expect.poll(() => page.evaluate(() => window.__performanceReference.expectedKeys.length)).toBe(index + 1);
    const key = await page.evaluate(index => window.__performanceReference.expectedKeys[index], index);
    await page.keyboard.press(key);
  }
  await expect.poll(() => page.evaluate(() => window.__performanceReference.casting?.multiplier)).toBe(1.1);
  expect(await page.evaluate(() => {
    const state = window.__performanceReference;
    return state.scene.seenJutsus.has(state.technique.id) && JSON.parse(localStorage.getItem("seen-jutsus")).includes(state.technique.id);
  })).toBe(true);
  await disposePerformanceReference(page);
});

test("las técnicas compartidas conservan daño y animaciones al lanzarse desde el enemigo", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await bootPerformanceReference(page, { renderer: "Canvas", loadout: ["fire_embers", "water_bullet", "earth_fist"] });
  await page.evaluate(() => {
    const scene = window.__performanceReference.scene;
    scene.player.hp = scene.player.maxHp = 1000;
    scene.player.damageReduction = 0;
    scene.player.primaryAffinity = null;
    scene.enemy.hp = scene.enemy.maxHp = 1000;
    scene.enemy.chakra = scene.enemy.maxChakra = 200;
    scene.enemy.primaryAffinity = null;
    scene.enemy.baseStrength = 0;
    scene.enemy.strengthModifier = 0;
    scene.enemy.criticalChance = 0;
    scene.rollHit = chance => chance > 50;
    scene.playSeals = async () => ({ multiplier: 1 });
    scene.startTurnCharge = () => {};
  });
  for (const id of ["fire_embers", "water_bullet", "earth_fist", "wind_palm"]) {
    const before = await page.evaluate(async id => {
      const { ABILITY_CATALOG } = await import("/src/data.js?v=1.5.0");
      const state = window.__performanceReference, scene = state.scene;
      const action = ABILITY_CATALOG[id];
      scene.enemy.primaryAffinity = action.element;
      scene.enemy.affinities = [action.element];
      const before = { hp: scene.player.hp, chakra: scene.enemy.chakra, damage: action.damage, cost: action.cost };
      state.activeAttack = scene.executeTimelineAction("enemy", action);
      return before;
    }, id);
    await expect.poll(() => page.evaluate(id => window.__performanceReference.scene.children.list
      .filter(object => object.texture?.key?.includes(`technique-vfx-${id}`) && object.active)
      .some(object => object.flipX && object.x < window.__performanceReference.scene.foe.body.x), id)).toBe(true);
    await page.evaluate(() => window.__performanceReference.activeAttack);
    expect(await page.evaluate(() => {
      const scene = window.__performanceReference.scene;
      return { hp: scene.player.hp, chakra: scene.enemy.chakra, enemyX: scene.foe.body.x, playerX: scene.hero.body.x };
    })).toEqual({ hp: before.hp - before.damage, chakra: before.chakra - before.cost + 5, enemyX: 740, playerX: 220 });
  }
  await disposePerformanceReference(page);
  expect(errors).toEqual([]);
});
