import { test, expect } from "@playwright/test";
import { ensurePhaser } from "./helpers/phaser-loader.mjs";

for (const renderer of ["Canvas", "WebGL"]) {
  test(`${renderer}: la preparación se adapta a los dos cuerpos y restaura la pose tras daño o cancelación`, async ({ page }, testInfo) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/");
    await expect(page.locator(".save-selector")).toBeVisible();
    await ensurePhaser(page);
    await page.evaluate(async renderer => {
      const api = await import("/src/fighters.js?v=0.116.0");
      document.querySelector("main").hidden = true;
      const host = document.createElement("div");
      host.style.cssText = "position:fixed;inset:0;display:grid;place-items:center;background:#18293b";
      document.body.append(host);
      class PoseScene extends Phaser.Scene {
        preload() { for (const bodyType of ["male", "female"]) api.queuePlayerFighterTextures(this, { bodyType, hair: 0 }); }
        create() {
          const fighters = [];
          for (const [index, bodyType] of ["male", "male", "female", "female"].entries()) {
            const flipped = index % 2 === 1;
            const fighter = api.createPlayerFighter(this, 180 + index * 360, 490, { bodyType, hair: 0 }, flipped);
            fighter.body.setScale(flipped ? -1.5 : 1.5, 1.5);
            api.stopPlayerBreathing(fighter);
            const neutral = Object.fromEntries(Object.entries(fighter.joints).map(([key, node]) => [key, { x: node.x, y: node.y, angle: node.angle }]));
            api.startPlayerPreparing(this, fighter);
            fighters.push({ fighter, neutral, bodyType, flipped });
            this.add.text(70 + index * 360, 120, `${bodyType} · ${flipped ? "reflejado" : "normal"}`, { fontSize: 20 });
          }
          window.__preparationTest = { scene: this, fighters, api };
        }
      }
      new Phaser.Game({ type: renderer === "Canvas" ? Phaser.CANVAS : Phaser.WEBGL, parent: host, width: 1440, height: 720, backgroundColor: "#18293b", scene: [PoseScene], audio: { noAudio: true }, render: { antialias: true, antialiasGL: true, pixelArt: false, roundPixels: false } });
    }, renderer);
    await page.waitForFunction(() => window.__preparationTest);
    await page.waitForTimeout(450);
    const centered = () => page.evaluate(() => window.__preparationTest.fighters.map(({ fighter }) => {
      const palms = ["mano_izquierda", "mano_derecha"].map(name => fighter.layers.find(layer => layer.name === name).getWorldTransformMatrix().transformPoint(0, 0, {}));
      const center = fighter.sprite.getWorldTransformMatrix().transformPoint(0, 0, {});
      const width = fighter.sprite.displayWidth * Math.abs(fighter.rig.scaleX * fighter.body.scaleX);
      return Math.abs(palms[0].x - palms[1].x) < width * .2 && palms.every(palm => Math.abs(palm.x - center.x) < width * .2 && palm.y < center.y);
    }));
    await expect.poll(centered).toEqual([true, true, true, true]);
    await page.screenshot({ path: testInfo.outputPath("preparacion-corregida.png") });
    await page.evaluate(async () => {
      const { scene, fighters, api } = window.__preparationTest;
      await Promise.all(fighters.map(({ fighter }) => api.playFighterDamageReaction(scene, fighter, { heavy: true })));
    });
    await expect.poll(centered).toEqual([true, true, true, true]);
    const restored = await page.evaluate(() => {
      const { scene, fighters, api } = window.__preparationTest;
      return fighters.map(({ fighter, neutral }) => {
        api.stopPlayerPreparing(scene, fighter); api.stopPlayerBreathing(fighter);
        return Object.entries(neutral).every(([key, base]) => ["x", "y", "angle"].every(property => Math.abs(fighter.joints[key][property] - base[property]) < .001));
      });
    });
    expect(restored).toEqual([true, true, true, true]);
    expect(errors).toEqual([]);
  });
}
