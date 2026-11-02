import { test, expect } from "@playwright/test";
import { ensurePhaser } from "./helpers/phaser-loader.mjs";
import { trainingAction, trainingReady } from "./helpers/training-actions.mjs";

const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")));
async function visit(page, location) {
  const back = page.getByRole("button", { name: "← Volver al mapa", exact: true });
  if (await back.isVisible()) await back.click();
  await page.locator(`[data-go="${location}"]`).click();
  const next = page.locator('[data-stage-speech]:not(.leaving) [data-stage-next]');
  for (let i = 0; i < 6 && await next.isVisible(); i++) await next.click();
  if (location === "dojo") await page.locator('[data-dojo-tab="equipment"]').click();
}

test("shuriken inicial: equipo, venta, recompra y animaciones reales con el kunai del cursor", async ({ page }, testInfo) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(15000);
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.evaluate(async () => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js");
    const save = createCharacter(createDefaultSave(), { name: "Armero", affinity: "fuego", bodyType: "male" });
    save.progression.coins = 200; save.campaign.tutorialSeen = true;
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
        window.__weaponVisual = { texture: image.texture.key, size: [source.width, source.height] };
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
