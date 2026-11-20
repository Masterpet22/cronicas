import { test, expect } from "@playwright/test";
import { ensurePhaser } from "./helpers/phaser-loader.mjs";

for (const renderer of ["Canvas", "WebGL"]) test(`${renderer}: marcha articulada, apoyos y restauración`, async ({ page }, info) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/");
  await ensurePhaser(page);
  await page.evaluate(async renderer => {
    const api = await import("/src/fighters.js?v=0.156.0");
    const { sampleAnimationPose } = await import("/src/animations/runtime.js");
    document.querySelector("main").hidden = true;
    const host = document.createElement("div"); host.style.cssText = "position:fixed;inset:0;background:#18293b"; document.body.append(host);
    class GaitScene extends Phaser.Scene {
      preload() { for (const bodyType of ["male", "female"]) api.queuePlayerFighterTextures(this, { bodyType, hair: 1 }); }
      create() {
        const entries = [];
        for (const [row, bodyType] of ["male", "female"].entries()) for (let col = 0; col < 4; col++) {
          const fighter = api.createPlayerFighter(this, 195 + col * 400, 280 + row * 460, { bodyType, hair: 1 }, col > 1);
          fighter.body.setScale(col > 1 ? -1.5 : 1.5, 1.5);
          fighter.shadow.setY(fighter.body.y + api.MAN_SPRITE_SHADOW_OFFSET * 1.5).setScale(1.5);
          api.stopPlayerBreathing(fighter);
          const targets = { rig: fighter.rig, shadow: fighter.shadow, ...fighter.joints };
          const neutral = Object.fromEntries(Object.entries(targets).map(([name, node]) => [name, Object.fromEntries(["x", "y", "angle", "scaleX", "scaleY"].map(p => [p, node[p]]))]));
          api.startPlayerRunning(this, fighter);
          entries.push({ fighter, targets, neutral, time: col * 170 });
          this.add.text(65 + col * 400, 400 + row * 460, `${bodyType} · ${col * 25}% · ${col > 1 ? "regreso" : "ida"}`, { fontSize: "20px" });
        }
        window.__gait = { api, scene: this, entries, sampleAnimationPose };
      }
    }
    new Phaser.Game({ type: renderer === "WebGL" ? Phaser.WEBGL : Phaser.CANVAS, parent: host, width: 1600, height: 1000, scene: [GaitScene], audio: { noAudio: true }, render: { antialias: true, antialiasGL: true } });
  }, renderer);
  await page.waitForFunction(() => window.__gait);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__gait.entries.every(({ fighter }) => fighter.animations.clipId === "run-cycle"))).toBe(true);
  const restored = await page.evaluate(() => {
    const { api, entries, sampleAnimationPose } = window.__gait;
    return entries.every(({ fighter, targets, neutral, time }) => {
      api.stopPlayerRunning(fighter);
      const restored = Object.entries(neutral).every(([name, base]) => Object.entries(base).every(([p, value]) => Math.abs(targets[name][p] - value) < .001));
      const pose = sampleAnimationPose(fighter.animationClips["run-cycle"], time);
      for (const [name, offsets] of Object.entries(pose)) for (const [p, value] of Object.entries(offsets)) targets[name][p] = neutral[name][p] + value;
      return restored && fighter.layers.filter(hand => hand.name.startsWith("mano_")).every(hand => !hand.flipX);
    });
  });
  expect(restored).toBe(true);
  await page.screenshot({ path: info.outputPath("ciclo-marcha.png") });
  expect(errors).toEqual([]);
});
