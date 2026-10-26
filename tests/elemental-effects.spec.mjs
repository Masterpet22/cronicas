import { expect, test } from "@playwright/test";

test("los cinco impactos elementales funcionan en Canvas, WebGL y modo ligero", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  const results = await page.evaluate(async () => {
    const { elementalImpactProfile, showElementalImpact } = await import("/src/battle/elemental-effects.js?v=0.92.0");
    const { JUTSU_LIBRARY } = await import("/src/data.js?v=0.69.0");
    const unmappedElements = [...new Set(JUTSU_LIBRARY.filter((jutsu) => !elementalImpactProfile(jutsu.element)).map((jutsu) => jutsu.element))];
    const elements = ["fuego", "agua", "tierra", "viento", "rayo"];
    const render = (type, lightMode) => new Promise((resolve, reject) => {
      const parent = document.createElement("div");
      document.body.append(parent);
      let game;
      const finish = (result) => {
        game.destroy(true);
        parent.remove();
        resolve(result);
      };
      game = new window.Phaser.Game({
        type,
        parent,
        width: 320,
        height: 180,
        scene: {
          preload() { this.load.image("preparation-mote", "/assets/vfx/feedback/preparation-mote.png"); },
          create() {
            try {
              this.lightMode = lightMode;
              elements.forEach((element, index) => showElementalImpact(this, { element }, 40 + index * 55, 90));
              const filters = this.children.list.filter((object) => object.filters?.internal?.list?.length).length;
              const activeEmitters = this.children.list.filter((object) => object.type === "ParticleEmitter");
              const emitters = activeEmitters.length;
              const particles = activeEmitters.reduce((count, emitter) => count + emitter.getAliveParticleCount(), 0);
              const renderer = this.game.renderer.type;
              this.time.delayedCall(600, () => finish({ filters, emitters, particles, renderer, remaining: this.children.list.length }));
            } catch (error) {
              game.destroy(true);
              parent.remove();
              reject(error);
            }
          }
        }
      });
    });
    const canvas = await render(window.Phaser.CANVAS, false);
    const light = await render(window.Phaser.CANVAS, true);
    const webglSupported = Boolean(document.createElement("canvas").getContext("webgl2"));
    const webgl = webglSupported ? await render(window.Phaser.WEBGL, false) : null;
    return { canvas, light, webgl, unmappedElements };
  });
  expect(results.unmappedElements).toEqual([]);
  expect(results.canvas).toMatchObject({ filters: 0, emitters: 5, particles: 40, remaining: 0 });
  expect(results.light).toMatchObject({ filters: 0, emitters: 0, particles: 0, remaining: 0 });
  if (results.webgl) expect(results.webgl).toMatchObject({ filters: 5, emitters: 5, particles: 40, remaining: 0 });
  expect(browserErrors).toEqual([]);
});
