import { expect, test } from "@playwright/test";
import { bootPerformanceReference } from "./helpers/performance-harness.mjs";

for (const renderer of ["Canvas", "WebGL"]) {
  test(`${renderer}: los cuatro recursos conservan los extremos redondos al vaciarse`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await bootPerformanceReference(page, { renderer });
    const full = await page.evaluate(() => {
      const scene = window.__performanceReference.scene;
      return [scene.playerHpBar, scene.chakraBar, scene.enemyHpBar, scene.enemyChakraBar].map(bar => {
        scene.setBarRatio(bar, 1);
        const texture = scene.textures.get(bar.fill.texture.key), canvas = texture.getSourceImage();
        const context = canvas.getContext("2d");
        const alpha = (x, y) => context.getImageData(x, y, 1, 1).data[3];
        return { corners: [[0, 0], [canvas.width - 1, 0], [0, canvas.height - 1], [canvas.width - 1, canvas.height - 1]].map(([x, y]) => alpha(x, y)),
          center: alpha(canvas.width / 2, canvas.height / 2), width: bar.fill.fillWidth, expected: bar.width };
      });
    });
    for (const bar of full) {
      expect(bar.corners).toEqual([0, 0, 0, 0]);
      expect(bar.center).toBe(255);
      expect(bar.width).toBe(bar.expected);
    }
    await page.screenshot({ path: `test-results/hud-resources/full-${renderer}.png` });
    const partial = await page.evaluate(() => {
      const scene = window.__performanceReference.scene;
      return [scene.playerHpBar, scene.chakraBar, scene.enemyHpBar, scene.enemyChakraBar].map(bar => {
        scene.setBarRatio(bar, .5);
        return { x: bar.fill.x, anchor: bar.direction === "rtl" ? bar.x + bar.width / 2 : bar.x, width: bar.fill.fillWidth, cropX: bar.fill.frame.cutX,
          cropped: bar.fill.isCropped,
          expectedX: bar.direction === "rtl" ? bar.width * 3 / 2 : 0 };
      });
    });
    for (const bar of partial) {
      expect(bar.x).toBe(bar.anchor);
      expect(bar.width).toBe(101);
      expect(bar.cropX).toBe(bar.expectedX);
      expect(bar.cropped).toBe(false);
    }
    await page.screenshot({ path: `test-results/hud-resources/half-${renderer}.png` });
    const states = await page.evaluate(async () => {
      const scene = window.__performanceReference.scene, bar = scene.playerHpBar;
      scene.setBarRatio(bar, 0);
      const empty = bar.fill.visible;
      scene.setBarRatio(bar, 1);
      scene.updateHealthBar(bar, 1, 100);
      const danger = { width: bar.fill.fillWidth, visible: bar.fill.visible };
      await new Promise(resolve => scene.time.delayedCall(1100, resolve));
      return { empty, danger, ghost: bar.ghost.fillWidth };
    });
    expect(states.empty).toBe(false);
    expect(states.danger.visible).toBe(true);
    expect(states.danger.width).toBeCloseTo(2.02);
    expect(states.ghost).toBeCloseTo(2.02);
    const repeated = await page.evaluate(async () => {
      const scene = window.__performanceReference.scene, bar = scene.enemyHpBar;
      scene.enemy.maxHp = 100;
      scene.enemy.hp = 100;
      scene.refreshHud();
      scene.loseHealth(scene.enemy, scene.foe, 25, { react: false });
      const beforeRefresh = bar.ghost.fillWidth;
      scene.enemy.statuses.push({ type: "burn", label: "QUEMADURA", duration: 2, power: 2 });
      scene.refreshHud();
      scene.refreshHud();
      const afterRefresh = bar.ghost.fillWidth;
      await new Promise(resolve => scene.time.delayedCall(500, resolve));
      const moving = bar.ghost.fillWidth;
      scene.loseHealth(scene.enemy, scene.foe, 10, { react: false });
      const afterSecondHit = bar.ghost.fillWidth;
      scene.refreshHud();
      await new Promise(resolve => scene.time.delayedCall(1100, resolve));
      return { beforeRefresh, afterRefresh, moving, afterSecondHit, final: bar.ghost.fillWidth, hp: scene.enemy.hp,
        value: bar.valueText.text };
    });
    expect(repeated.beforeRefresh).toBe(202);
    expect(repeated.afterRefresh).toBe(202);
    expect(repeated.moving).toBeGreaterThan(151.5);
    expect(repeated.moving).toBeLessThan(202);
    expect(repeated.afterSecondHit).toBe(repeated.moving);
    expect(repeated.final).toBeCloseTo(131.3);
    expect(repeated.hp).toBe(65);
    expect(repeated.value).toBe("65/100");
    expect(errors).toEqual([]);
  });
}
