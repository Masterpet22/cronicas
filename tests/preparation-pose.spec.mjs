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
      const api = await import("/src/fighters.js?v=0.153.0");
      document.querySelector("main").hidden = true;
      const host = document.createElement("div");
      host.style.cssText = "position:fixed;inset:0;display:grid;place-items:center;background:#18293b";
      document.body.append(host);
      class PoseScene extends Phaser.Scene {
        look(bodyType, armored) {
          return { bodyType, hair: 0, ...(armored && (bodyType === "male"
            ? { mask: "cloth", outfit: "lamellar_armor" } : { mask: "metal", outfit: "steel_armor" })) };
        }
        preload() {
          for (const bodyType of ["male", "female"]) for (const armored of [false, true]) {
            api.queuePlayerFighterTextures(this, this.look(bodyType, armored));
          }
        }
        create() {
          const fighters = [];
          const idleListeners = this.events.listenerCount("postupdate");
          for (const [index, bodyType] of ["male", "male", "female", "female"].entries()) {
            const flipped = index % 2 === 1;
            const fighter = api.createPlayerFighter(this, 180 + index * 360, 490, this.look(bodyType, flipped), flipped);
            if (flipped && (!fighter.face.texture.key.includes("player-mask")
                || fighter.layers.filter(layer => layer.texture.key.startsWith("fighter-cloth")).length !== 11)) {
              throw new Error("La armadura y la máscara deben verse en el combatiente");
            }
            fighter.body.setScale(flipped ? -1.5 : 1.5, 1.5);
            fighter.shadow.setY(fighter.body.y + api.MAN_SPRITE_SHADOW_OFFSET * 1.5).setScale(1.5);
            api.stopPlayerBreathing(fighter);
            const neutral = Object.fromEntries(Object.entries(fighter.joints).map(([key, node]) => [key, { x: node.x, y: node.y, angle: node.angle }]));
            const feet = fighter.joints.ankleRight.getWorldTransformMatrix().transformPoint(0, 0, {});
            const armDepth = fighter.rig.getIndex(fighter.joints.shoulderLeft);
            api.startPlayerPreparing(this, fighter);
            fighters.push({ fighter, neutral, feet, armDepth });
            this.add.text(70 + index * 360, 120, `${bodyType} · ${flipped ? "reflejado" : "normal"}`, { fontSize: 20 });
          }
          window.__preparationTest = { scene: this, fighters, api, idleListeners };
        }
      }
      new Phaser.Game({ type: renderer === "Canvas" ? Phaser.CANVAS : Phaser.WEBGL, parent: host, width: 1440, height: 720, backgroundColor: "#18293b", scene: [PoseScene], audio: { noAudio: true }, render: { antialias: true, antialiasGL: true, pixelArt: false, roundPixels: false } });
    }, renderer);
    await page.waitForFunction(() => window.__preparationTest);
    const bootsBehindWraps = () => page.evaluate(() => window.__preparationTest.fighters.every(({ fighter }) =>
      ["Left", "Right"].every(side => {
        const knee = fighter.joints[`knee${side}`], ankle = fighter.joints[`ankle${side}`];
        const shin = fighter.layers.find(layer => layer.name === (side === "Left" ? "pierna_izquierda" : "pierna_derecha"));
        return ankle.parentContainer === knee && knee.getIndex(ankle) < knee.getIndex(shin);
      })));
    expect(await bootsBehindWraps()).toBe(true);
    await page.waitForTimeout(450);
    const centered = () => page.evaluate(() => window.__preparationTest.fighters.map(({ fighter, feet }) => {
      const palms = ["mano_izquierda", "mano_derecha"].map(name => fighter.layers.find(layer => layer.name === name).getWorldTransformMatrix().transformPoint(0, 0, {}));
      const center = fighter.sprite.getWorldTransformMatrix().transformPoint(0, 0, {});
      const width = fighter.sprite.displayWidth * Math.abs(fighter.rig.scaleX * fighter.body.scaleX);
      const distance = Math.abs(palms[0].x - palms[1].x);
      const ankle = fighter.joints.ankleRight.getWorldTransformMatrix().transformPoint(0, 0, {});
      const bootSoles = fighter.layers.filter(layer => layer.name.startsWith("pie_")).map(boot =>
        boot.getWorldTransformMatrix().transformPoint(0, boot.height / 2, {}).y);
      const { shoulderLeft, elbowLeft } = fighter.joints;
      const palmsReflected = fighter.layers.filter(layer => layer.name.startsWith("mano_")).every(hand => hand.flipX);
      const forearmPivot = elbowLeft.parentContainer;
      const torsoIndex = fighter.rig.getIndex(fighter.sprite);
      const seam = fighter.preparationSeamWidths;
      return palmsReflected && fighter.preparationSeal.visible
        && fighter.layers.filter(layer => layer.name.startsWith("mano_")).every(hand => !hand.visible)
        && seam.forearms.every(w => Math.abs(seam.hand - w) < w * .1)
        && distance > width * .25 && distance < width * .5 && palms.every(palm => Math.abs(palm.x - center.x) < width * .32 && palm.y < center.y)
        && Math.abs(ankle.x - feet.x) < .01 && Math.abs(ankle.y - feet.y) < .01
        && bootSoles.every(y => Math.abs(y - fighter.shadow.y) < 1)
        && fighter.rig.getIndex(shoulderLeft) < torsoIndex && fighter.rig.getIndex(forearmPivot) > torsoIndex
        && fighter.layers.find(layer => layer.name === "brazo_izquierdo").parentContainer === shoulderLeft
        && Math.abs(forearmPivot.rotation - shoulderLeft.rotation) < .001;
    }));
    await testInfo.attach("union-munecas", { contentType: "application/json", body: JSON.stringify(await page.evaluate(() =>
      window.__preparationTest.fighters.map(({ fighter }) => ({ seam: fighter.preparationSeamWidths,
        visible: fighter.preparationSeal.visible,
        gap: Math.abs(fighter.joints.wristLeft.getWorldTransformMatrix().tx - fighter.joints.wristRight.getWorldTransformMatrix().tx),
        width: fighter.sprite.displayWidth * Math.abs(fighter.rig.scaleX * fighter.body.scaleX) })))) });
    await expect.poll(centered).toEqual([true, true, true, true]);
    expect(await bootsBehindWraps()).toBe(true);
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
      const reactions = fighters.map(({ fighter }) => api.playFighterDamageReaction(scene, fighter, { heavy: true }));
      if (fighters.some(({ fighter }) => fighter.preparationSeal.visible)) throw new Error("El sello debe ocultarse durante el daño");
      if (fighters.some(({ fighter }) => fighter.layers.some(hand => hand.name.startsWith("mano_") && hand.flipX))) throw new Error("El daño debe restaurar las manos antes de reaccionar");
      await Promise.all(reactions);
    });
    await expect.poll(centered).toEqual([true, true, true, true]);
    const beginsExitFromPose = await page.evaluate(() => {
      const { scene, fighters, api } = window.__preparationTest;
      return fighters.every(({ fighter }) => {
        const angle = fighter.joints.elbowRight.angle;
        api.stopPlayerPreparing(scene, fighter);
        return Math.abs(angle) > 1 && fighter.joints.elbowRight.angle === angle
          && fighter.layers.filter(hand => hand.name.startsWith("mano_")).every(hand => !hand.flipX);
      });
    });
    expect(beginsExitFromPose).toBe(true);
    await expect.poll(() => page.evaluate(() => window.__preparationTest.fighters.every(({ fighter }) => fighter.animations.state === "idle"))).toBe(true);
    const restored = await page.evaluate(() => {
      const { fighters, api } = window.__preparationTest;
      return fighters.map(({ fighter, neutral, armDepth }) => {
        api.stopPlayerBreathing(fighter);
        return fighter.rig.getIndex(fighter.joints.shoulderLeft) === armDepth
          && !fighter.preparationSeal.visible
          && fighter.preparationArmSections.every(({ arm }) => !arm.isCropped)
          && fighter.layers.filter(hand => hand.name.startsWith("mano_")).every(hand => !hand.flipX)
          && fighter.joints.elbowLeft.parentContainer === fighter.joints.shoulderLeft
          && Object.entries(neutral).every(([key, base]) => ["x", "y", "angle"].every(property => Math.abs(fighter.joints[key][property] - base[property]) < .001));
      });
    });
    expect(restored).toEqual([true, true, true, true]);
    // La carrera mueve piernas y tobillos: la superposición se conserva durante
    // el ciclo y al volver a la pose de combate, para ambos cuerpos y orientaciones.
    await page.evaluate(() => {
      const { scene, fighters, api } = window.__preparationTest;
      fighters.forEach(({ fighter }) => api.startPlayerRunning(scene, fighter));
    });
    await page.waitForTimeout(240);
    expect(await bootsBehindWraps()).toBe(true);
    await page.evaluate(() => {
      const { fighters, api } = window.__preparationTest;
      fighters.forEach(({ fighter }) => api.stopPlayerRunning(fighter));
    });
    expect(await bootsBehindWraps()).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("botas-tras-animacion.png") });
    const listeners = await page.evaluate(() => {
      const { scene, fighters, api, idleListeners } = window.__preparationTest;
      const restored = scene.events.listenerCount("postupdate");
      fighters.forEach(({ fighter }) => api.startPlayerPreparing(scene, fighter));
      const preparing = scene.events.listenerCount("postupdate");
      fighters.forEach(({ fighter }) => api.destroyFighter(fighter));
      return { restored: restored - idleListeners, preparing: preparing - idleListeners,
        destroyed: scene.events.listenerCount("postupdate") - idleListeners };
    });
    expect(listeners).toEqual({ restored: 0, preparing: 4, destroyed: 0 });
    expect(errors).toEqual([]);
  });
}
