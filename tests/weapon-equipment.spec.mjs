import { test, expect } from "@playwright/test";
import { ensurePhaser } from "./helpers/phaser-loader.mjs";
import { trainingAction, trainingReady } from "./helpers/training-actions.mjs";

const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")));
async function visit(page, location) {
  const back = page.getByRole("button", { name: "← Volver al mapa", exact: true });
  if (await back.isVisible()) await back.click();
  await page.locator(`[data-go="${location}"]`).click();
  await expect(page.locator(`[data-location-stage="${location}"]`)).toBeVisible();
  const next = page.locator('[data-stage-speech]:not(.leaving) [data-stage-next]');
  for (let i = 0; i < 6 && await next.isVisible(); i++) await next.click();
  if (location === "dojo") await page.locator('[data-dojo-tab="equipment"]').click();
}

test("shuriken inicial: equipo, venta, recompra y animaciones reales con el kunai del cursor", async ({ page }, testInfo) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(15000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.evaluate(async () => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js");
    const save = createCharacter(createDefaultSave(), { name: "Armero", affinity: "fuego", bodyType: "male" });
    save.equipment.weapon = "kunai"; save.equipment.throwable = "shuriken";
    save.progression.coins = 200; save.campaign.tutorialSeen = true; save.campaign.completedMissions = ["m01"];
    const { normalizeSagaTutorial } = await import("/src/tutorial-system.js");
    save.campaign.sagaTutorial = normalizeSagaTutorial(null, save.campaign);
    writeSave(save); sessionStorage.setItem("cronicas-save-slot-selected", "1");
    localStorage.setItem("music-enabled", "off"); localStorage.setItem("seal-input-mode", "automatic");
  });
  await page.reload(); await visit(page, "dojo");
  await expect(page.locator('[data-gear-slot="throwable"]')).toContainText("Shuriken");
  await page.locator('[data-gear-slot="throwable"]').click();
  await page.locator('[data-equipment-type="throwable"][data-equipment-id=""]').click();
  expect((await stored(page)).equipment.throwable).toBeNull();
  await page.reload(); await visit(page, "dojo");
  await expect(page.locator('[data-gear-slot="throwable"]')).toContainText("Nada equipado");
  await visit(page, "shop");
  await page.locator('[data-shop-category="throwables"]').click();
  await expect(page.locator('[data-shop-item="shuriken"] button')).toHaveText("Ya lo tienes");
  await page.locator('[data-shop-mode="sell"]').click();
  await page.locator('[data-shop-category="throwables"]').click();
  await page.locator('[data-shop-item="shuriken"] button').click();
  expect((await stored(page)).inventory.items.shuriken).toBeUndefined();
  await page.locator('[data-shop-mode="buy"]').click();
  await page.locator('[data-shop-category="throwables"]').click();
  await page.locator('[data-shop-item="shuriken"] button').click();
  expect((await stored(page)).inventory.items.shuriken).toBe(1);
  expect((await stored(page)).progression.coins).toBe(187);
  await visit(page, "dojo");
  await page.locator('[data-gear-slot="throwable"]').click();
  await page.locator('[data-equipment-id="shuriken"]').click();
  await page.screenshot({ path: testInfo.outputPath("dojo-shuriken.png") });
  await ensurePhaser(page);
  await page.evaluate(() => {
    const Original = Phaser.Game;
    Phaser.Game = class extends Original { constructor(config) { super(config); window.__weaponGame = this; } };
  });
  const baseline = await stored(page);
  await page.locator("[data-start-training]").click();
  await expect(page.locator(".combat-access")).toBeVisible({ timeout: 45000 });
  for (const [action, sprite] of [["throwable_strike", "thrown-shuriken"], ["weapon_strike", "held-kunai"]]) {
    const attack = await trainingAction(page, action);
    await page.evaluate(sprite => {
      const scene = window.__weaponGame.scene.getScene("battle");
      window.__weaponVisual = null;
      const inspect = () => {
        const image = scene.children.list.find(child => child.name === sprite);
        if (!image || (sprite === "held-kunai" && !(scene.hero.body.x > 620 && scene.hero.joints.shoulderRight.angle < -60))
          || (sprite === "thrown-shuriken" && image.x < 400)) return;
        const source = image.texture.getSourceImage();
        window.__weaponVisual = { texture: image.texture.key, size: [source.width, source.height],
          trail: scene.children.list.some(child => child.name === "shuriken-trail"),
          rim: scene.children.list.some(child => child.name === "shuriken-rim") };
        scene.events.off("postupdate", inspect);
        scene.scene.pause();
      };
      scene.events.on("postupdate", inspect);
    }, sprite);
    await attack.click();
    await page.waitForFunction(() => window.__weaponVisual, null, { timeout: 25000 });
    const visual = await page.evaluate(() => window.__weaponVisual);
    expect(visual.texture).toBe(action === "throwable_strike" ? "equipment-shuriken" : "equipment-kunai");
    expect(visual.size).toEqual(action === "throwable_strike" ? [50, 52] : [80, 69]);
    if (action === "throwable_strike") expect(visual).toMatchObject({ trail: true, rim: true });
    await page.screenshot({ path: testInfo.outputPath(`${sprite}.png`) });
    await page.evaluate(() => window.__weaponGame.scene.resume("battle"));
    await trainingReady(page);
    await expect(page.locator(".combat-access-message")).toContainText("de daño");
    const result = await page.evaluate(sprite => {
      const s = window.__weaponGame.scene.getScene("battle");
      return { removed: !s.children.list.some(child => child.name === sprite), full: s.player.hp === s.player.maxHp && s.player.chakra === s.player.maxChakra,
        count: s.saveData.inventory.items.shuriken, origin: s.hero.body.x };
    }, sprite);
    expect(result).toEqual({ removed: true, full: true, count: 1, origin: 220 });
    expect(await stored(page)).toEqual(baseline);
  }
  await page.getByRole("button", { name: "Pausar combate (Escape)" }).click();
  await page.getByRole("button", { name: "VOLVER AL DOJO", exact: true }).click();
  await expect(page.locator('[data-gear-slot="throwable"]')).toContainText("Shuriken");
  expect(errors).toEqual([]);
});

test("la estela funciona en Canvas y WebGL y limpia efectos al fallar o interrumpirse", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await ensurePhaser(page);
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  const results = await page.evaluate(async () => {
    const { throwShuriken, queueWeaponTextures } = await import("/src/battle/weapon-effects.js?v=1.4.0");
    const run = (type, options = {}) => new Promise((resolve, reject) => {
      const parent = document.createElement("div"); document.body.append(parent);
      let game;
      game = new Phaser.Game({ type, parent, width: 640, height: 240, banner: false,
        scene: {
          preload() { queueWeaponTextures(this); },
          create() {
            this.hero = { body: { x: 80, y: 180 } }; this.foe = { body: { x: 540, y: 180 } };
            this.playerProjectileOrigin = actor => ({ x: actor === "player" ? 110 : 510, y: 130 });
            this.lightMode = Boolean(options.light); this.flashEffects = !options.noFlash;
            const interruptions = [];
            if (options.cancel) this.time.delayedCall(90, () => { this.finished = true; this.events.emit("shutdown"); });
            const before = this.events.listenerCount("shutdown");
            throwShuriken(this, Boolean(options.missed), options.actor || "player").then(() => {
              const impact = this.children.list.some(child => child.name === "shuriken-impact");
              interruptions.push(Math.max(0, this.events.listenerCount("shutdown") - before));
              window.setTimeout(() => {
                const remaining = this.children.list.filter(child => /shuriken/.test(child.name)).length;
                const result = { impact, remaining, shutdownListeners: interruptions[0] };
                game.destroy(true); parent.remove(); resolve(result);
              }, 230);
            }).catch(error => { game.destroy(true); parent.remove(); reject(error); });
          }
        }
      });
    });
    return {
      canvas: await run(Phaser.CANVAS),
      webgl: await run(Phaser.WEBGL, { actor: "enemy" }),
      miss: await run(Phaser.CANVAS, { missed: true }),
      light: await run(Phaser.CANVAS, { light: true }),
      noFlash: await run(Phaser.CANVAS, { noFlash: true }),
      cancelled: await run(Phaser.CANVAS, { cancel: true })
    };
  });
  expect(results.canvas).toEqual({ impact: true, remaining: 0, shutdownListeners: 0 });
  expect(results.webgl).toEqual(results.canvas);
  for (const mode of ["miss", "light", "noFlash", "cancelled"]) expect(results[mode]).toEqual({ impact: false, remaining: 0, shutdownListeners: 0 });
  expect(errors).toEqual([]);
});
