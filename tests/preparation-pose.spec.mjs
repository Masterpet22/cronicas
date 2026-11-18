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
      const api = await import("/src/fighters.js?v=0.152.0");
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
            const feet = fighter.joints.ankleRight.getWorldTransformMatrix().transformPoint(0, 0, {});
            const armDepth = fighter.rig.getIndex(fighter.joints.shoulderLeft);
            api.startPlayerPreparing(this, fighter);
            fighters.push({ fighter, neutral, feet, armDepth });
            this.add.text(70 + index * 360, 120, `${bodyType} · ${flipped ? "reflejado" : "normal"}`, { fontSize: 20 });
          }
          window.__preparationTest = { scene: this, fighters, api };
        }
      }
      new Phaser.Game({ type: renderer === "Canvas" ? Phaser.CANVAS : Phaser.WEBGL, parent: host, width: 1440, height: 720, backgroundColor: "#18293b", scene: [PoseScene], audio: { noAudio: true }, render: { antialias: true, antialiasGL: true, pixelArt: false, roundPixels: false } });
    }, renderer);
    await page.waitForFunction(() => window.__preparationTest);
    await page.waitForTimeout(450);
    const centered = () => page.evaluate(() => window.__preparationTest.fighters.map(({ fighter, feet }) => {
      const palms = ["mano_izquierda", "mano_derecha"].map(name => fighter.layers.find(layer => layer.name === name).getWorldTransformMatrix().transformPoint(0, 0, {}));
      const center = fighter.sprite.getWorldTransformMatrix().transformPoint(0, 0, {});
      const width = fighter.sprite.displayWidth * Math.abs(fighter.rig.scaleX * fighter.body.scaleX);
      const distance = Math.abs(palms[0].x - palms[1].x);
      const ankle = fighter.joints.ankleRight.getWorldTransformMatrix().transformPoint(0, 0, {});
      return distance > width * .22 && distance < width * .35 && palms.every(palm => Math.abs(palm.x - center.x) < width * .32 && palm.y < center.y)
        && Math.abs(ankle.x - feet.x) < .01 && Math.abs(ankle.y - feet.y) < .01;
    }));
    await expect.poll(centered).toEqual([true, true, true, true]);
    const continues = await page.evaluate(() => {
      const { scene, fighters, api } = window.__preparationTest;
      return fighters.every(({ fighter }) => {
        const tweens = fighter.animations.tweens;
        api.startPlayerPreparing(scene, fighter);
        return fighter.animations.tweens === tweens;
      });
    });
    expect(continues).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("preparacion-corregida.png") });
    await page.evaluate(async () => {
      const { scene, fighters, api } = window.__preparationTest;
      await Promise.all(fighters.map(({ fighter }) => api.playFighterDamageReaction(scene, fighter, { heavy: true })));
    });
    await expect.poll(centered).toEqual([true, true, true, true]);
    const beginsExitFromPose = await page.evaluate(() => {
      const { scene, fighters, api } = window.__preparationTest;
      return fighters.every(({ fighter }) => {
        const angle = fighter.joints.elbowRight.angle;
        api.stopPlayerPreparing(scene, fighter);
        return Math.abs(angle) > 1 && fighter.joints.elbowRight.angle === angle;
      });
    });
    expect(beginsExitFromPose).toBe(true);
    await expect.poll(() => page.evaluate(() => window.__preparationTest.fighters.every(({ fighter }) => fighter.animations.state === "idle"))).toBe(true);
    const restored = await page.evaluate(() => {
      const { fighters, api } = window.__preparationTest;
      return fighters.map(({ fighter, neutral, armDepth }) => {
        api.stopPlayerBreathing(fighter);
        return fighter.rig.getIndex(fighter.joints.shoulderLeft) === armDepth
          && Object.entries(neutral).every(([key, base]) => ["x", "y", "angle"].every(property => Math.abs(fighter.joints[key][property] - base[property]) < .001));
      });
    });
    expect(restored).toEqual([true, true, true, true]);
    expect(errors).toEqual([]);
  });
}
