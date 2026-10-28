import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { ensurePhaser } from "./helpers/phaser-loader.mjs";

const ORDER = ["departure-smoke", "object-left", "object-disappears", "screen-transition", "arrival-smoke", "character-arrives"];

test("la evasión usa el objeto elegido y la salida por nivel comparte sus tiempos rápidos", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await ensurePhaser(page);
  await expect(page.locator(".save-selector")).toBeVisible();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const results = await page.evaluate(async () => {
    const { BattleActionMethods } = await import("/src/battle/scenes/battle-actions.js?v=1.1.0");
    const { playLevelUpFlash } = await import("/src/battle/level-up-transition.js?v=1.4.0");
    const { createPlayerFighter, queuePlayerFighterTextures } = await import("/src/fighters.js?v=0.81.0");
    const { queueTeleportObjects } = await import("/src/battle/teleport-transition.js?v=1.1.0");
    return new Promise(resolve => {
      const host = document.createElement("div"); document.body.append(host);
      let game;
      class SubstitutionScene extends window.Phaser.Scene {
        preload() { queuePlayerFighterTextures(this, { bodyType: "male", hair: 1 }); queueTeleportObjects(this); }
        create() {
          this.hero = createPlayerFighter(this, 220, 372, { bodyType: "male", hair: 1 });
          this.foe = createPlayerFighter(this, 740, 372, { bodyType: "male", hair: 1 });
          this.saveData = { character: { teleportObject: "log" } };
          this.tone = () => {};
          this.floatLabel = () => {};
          void (async () => {
            const results = [];
            for (const entry of [{ object: "log" }, { object: "dog" }, { object: "chair" }, { object: undefined }, { object: "dog", enemy: true }, { object: "dog", levelUp: true }]) {
              this.saveData.character.teleportObject = entry.object;
              const target = entry.enemy ? this.foe : this.hero;
              const started = this.time.now;
              const events = [];
              const record = event => events.push({ ...event, time: this.time.now - started,
                alpha: target.body.alpha, texture: this.children.getByName("teleport-object")?.texture.key });
              this.events.on("teleport-stage", record);
              if (entry.levelUp) await playLevelUpFlash(this, target);
              else await BattleActionMethods.prototype.playSubstitution.call(this, target);
              this.events.off("teleport-stage", record);
              results.push({ ...entry, events, elapsed: this.time.now - started, alpha: target.body.alpha,
                clean: !this.children.getByName("teleport-object") && !this.children.getByName("teleport-smoke") });
            }
            game.destroy(true); host.remove(); resolve(results);
          })();
        }
      }
      game = new window.Phaser.Game({ type: window.Phaser.CANVAS, parent: host, width: 960, height: 540, scene: [SubstitutionScene] });
    });
  });
  const evasionOrder = ["departure-smoke", "object-left", "object-disappears", "arrival-smoke", "character-arrives"];
  for (const result of results.slice(0, 5)) {
    const object = result.enemy ? "log" : result.object || "log";
    expect(result.events.map(event => event.stage)).toEqual(evasionOrder);
    expect(result.events.find(event => event.stage === "object-left")).toMatchObject({ object, alpha: 0, texture: `teleport-object-${object}` });
    expect(result).toMatchObject({ clean: true, alpha: 1 });
    expect(result.elapsed).toBeLessThan(1050);
  }
  const departureTime = result => result.events.find(event => event.stage === "object-disappears").time;
  expect(results[5].events.map(event => event.stage)).toEqual(["departure-smoke", "object-left", "object-disappears"]);
  expect(results[5].events[0].time).toBeLessThan(40);
  expect(Math.abs(departureTime(results[5]) - departureTime(results[1]))).toBeLessThan(130);
  expect(results[5].elapsed).toBeLessThan(900);
  expect(results[5].clean).toBe(true);
  expect(errors).toEqual([]);
});

test("los tres objetos cumplen el orden de seis pasos y la interrupción libera la escena", async ({ page }, testInfo) => {
  await page.goto("/");
  await ensurePhaser(page);
  await expect(page.locator(".save-selector")).toBeVisible();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const results = await page.evaluate(async () => {
    const { playTeleportTransition, queueTeleportObjects } = await import("/src/battle/teleport-transition.js?v=1.1.0");
    const { createPlayerFighter, queuePlayerFighterTextures } = await import("/src/fighters.js?v=0.81.0");
    const render = object => new Promise(resolve => {
      const host = document.createElement("div");
      host.style.cssText = "width:960px;height:540px";
      document.body.append(host);
      let game;
      class TeleportScene extends window.Phaser.Scene {
        preload() { queuePlayerFighterTextures(this, { bodyType: "male", hair: 1 }); queueTeleportObjects(this); }
        create() {
          const backdrop = this.add.rectangle(480, 270, 960, 540, 0x102637);
          const fighter = createPlayerFighter(this, 220, 372, { bodyType: "male", hair: 1 });
          const stages = [];
          let image = null;
          this.events.on("teleport-stage", event => {
            const prop = this.children.getByName("teleport-object");
            stages.push({ ...event, alpha: fighter.body.alpha, prop: Boolean(prop), texture: prop?.texture.key });
            if (object === "cancel" && event.stage === "object-left") this.time.delayedCall(30, () => this.scene.stop());
            else if (event.stage === "object-left") this.time.delayedCall(220, () => { image = game.canvas.toDataURL("image/png"); });
          });
          void playTeleportTransition(this, { fighter, objectId: object === "cancel" ? "dog" : object,
            changeScreen: () => { backdrop.setFillStyle(0x274338); }
          }).then(completed => {
            const result = { object, completed, stages, image, cleaned: !this.children.getByName("teleport-object")
              && !this.children.getByName("teleport-smoke") && !this.children.getByName("teleport-screen-cover") };
            game.destroy(true); host.remove(); resolve(result);
          });
        }
      }
      game = new window.Phaser.Game({ type: window.Phaser.CANVAS, parent: host, width: 960, height: 540, scene: [TeleportScene] });
    });
    const results = [];
    for (const object of ["log", "dog", "chair", "cancel"]) results.push(await render(object));
    return results;
  });
  for (const result of results.slice(0, 3)) {
    expect(result.image).toBeTruthy();
    if (result.image) {
      const png = Buffer.from(result.image.split(",")[1], "base64");
      await mkdir("test-results/transport-props", { recursive: true });
      await writeFile(`test-results/transport-props/${result.object}.png`, png);
      await testInfo.attach(`objeto-${result.object}`, { body: png, contentType: "image/png" });
    }
    expect(result.completed).toBe(true);
    expect(result.cleaned).toBe(true);
    expect(result.stages.map(event => event.stage)).toEqual(ORDER);
    expect(result.stages[0]).toMatchObject({ alpha: 1, prop: false });
    expect(result.stages[1]).toMatchObject({ alpha: 0, prop: true, texture: `teleport-object-${result.object}` });
    expect(result.stages[2]).toMatchObject({ alpha: 0, prop: false });
    expect(result.stages[4]).toMatchObject({ alpha: 0, prop: false });
    expect(result.stages[5]).toMatchObject({ alpha: 1, prop: false });
  }
  expect(results[3]).toMatchObject({ completed: false, cleaned: true });
  expect(errors).toEqual([]);
});

for (const direction of ["toMission", "toVillage"]) {
  test(`la misión usa transportación configurada en ${direction} y conserva el resultado`, async ({ page }) => {
    await page.goto("/");
    await ensurePhaser(page);
    await expect(page.locator(".save-selector")).toBeVisible();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.evaluate(async direction => {
      const { MissionTravelScene } = await import("/src/battle/scenes/mission-travel-scene.js?v=1.2.0");
      const { battleRuntime } = await import("/src/battle/runtime.js?v=0.91.0");
      const { createCharacter, createDefaultSave } = await import("/src/save.js?v=0.94.0");
      const { ALL_MISSIONS } = await import("/src/content/index.js");
      battleRuntime.activeSave = createCharacter(createDefaultSave(), { name: "Kira", affinity: "fuego", teleportObject: "dog" });
      battleRuntime.activeMission = { ...ALL_MISSIONS[0], transitions: { departure: "teleport", return: "teleport" } };
      battleRuntime.renderResolution = 1;
      const host = document.createElement("div"); host.style.cssText = "width:960px;height:540px"; host.id = "teleport-mission-stage"; document.body.append(host);
      const state = { host, reached: null, result: null, stages: [], game: null };
      window.__teleportMission = state;
      class Boot extends window.Phaser.Scene {
        constructor() { super("boot"); }
        create() {
          const travel = this.scene.get("travel");
          travel.events.on("teleport-stage", event => state.stages.push(event.stage));
          this.scene.start("travel", { direction, ...(direction === "toVillage" ? { result: { outcome: "completed", levelUpShown: true, rewards: { coins: 77 } } } : {}) });
        }
      }
      class Destination extends window.Phaser.Scene {
        constructor() { super(direction === "toVillage" ? "results" : "battle"); }
        create(data) { state.reached = this.scene.key; state.result = data; }
      }
      state.game = new window.Phaser.Game({ type: window.Phaser.CANVAS, parent: host, width: 960, height: 540, scene: [Boot, MissionTravelScene, Destination] });
    }, direction);
    await expect.poll(() => page.evaluate(() => window.__teleportMission.reached), { timeout: 20_000 }).toBe(direction === "toVillage" ? "results" : "battle");
    const result = await page.evaluate(() => {
      const state = window.__teleportMission;
      const result = { stages: state.stages, result: state.result };
      state.game.destroy(true); state.host.remove(); return result;
    });
    expect(result.stages).toEqual(ORDER);
    if (direction === "toVillage") expect(result.result).toMatchObject({ outcome: "completed", rewards: { coins: 77 } });
    expect(errors).toEqual([]);
  });
}

test("el cambio al segundo encuentro respeta su configuración de transportación", async ({ page }) => {
  await page.goto("/");
  await ensurePhaser(page);
  await expect(page.locator(".save-selector")).toBeVisible();
  const result = await page.evaluate(async () => {
    const { BattleFlowMethods } = await import("/src/battle/scenes/battle-flow.js?v=1.2.0");
    const { createPlayerFighter, queuePlayerFighterTextures } = await import("/src/fighters.js?v=0.81.0");
    const { queueTeleportObjects } = await import("/src/battle/teleport-transition.js?v=1.1.0");
    return new Promise(resolve => {
      const host = document.createElement("div"); document.body.append(host);
      let game;
      class Encounter extends window.Phaser.Scene {
        preload() { queuePlayerFighterTextures(this, { bodyType: "male", hair: 1 }); queueTeleportObjects(this); }
        create() {
          this.mission = { transitions: { betweenEncounters: { 2: "teleport" } } };
          this.saveData = { character: { teleportObject: "chair" } };
          this.enemyIndex = 1;
          this.hero = createPlayerFighter(this, 220, 372, { bodyType: "male", hair: 1 });
          const stages = [];
          this.events.on("teleport-stage", event => stages.push(event.stage));
          void BattleFlowMethods.prototype.playEncounterTransition.call(this, { name: "Bandido" }).then(() => {
            const result = { stages, hero: this.hero.body.alpha, noRoute: !this.children.getByName("encounter-transition-progress") };
            game.destroy(true); host.remove(); resolve(result);
          });
        }
      }
      game = new window.Phaser.Game({ type: window.Phaser.CANVAS, parent: host, width: 960, height: 540, scene: [Encounter] });
    });
  });
  expect(result).toEqual({ stages: ORDER, hero: 1, noRoute: true });
});

test("apariencia permite elegir el objeto y lo conserva al volver a cargar", async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 748 });
  await page.goto("/");
  await ensurePhaser(page);
  await expect(page.locator(".save-selector")).toBeVisible();
  await page.evaluate(async () => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.94.0");
    const save = createCharacter(createDefaultSave(), { name: "Kira", affinity: "fuego" });
    save.campaign.tutorialSeen = true;
    writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
  });
  const openAppearance = async () => {
    await page.reload();
    await page.locator(".debug-tools-trigger").click();
    await page.locator('[data-debug-view="dojo"]').click();
    await page.locator('[data-dojo-tab="appearance"]').click();
  };
  await openAppearance();
  const value = page.locator('[data-cosmetic-value="teleportObject"]');
  await expect(value).toHaveText("Tronco");
  await page.locator('[data-cosmetic-step="teleportObject"][data-direction="1"]').click();
  await expect(value).toHaveText("Perrito");
  await openAppearance();
  await expect(value).toHaveText("Perrito");
  await page.locator('[data-cosmetic-step="teleportObject"][data-direction="1"]').click();
  await expect(value).toHaveText("Silla");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")).character.teleportObject)).toBe("chair");
});
