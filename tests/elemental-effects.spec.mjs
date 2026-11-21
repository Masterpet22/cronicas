import { expect, test } from "@playwright/test";
import { ensurePhaser } from "./helpers/phaser-loader.mjs";
import { bootPerformanceReference } from "./helpers/performance-harness.mjs";

test("el combate reproduce las técnicas restantes y admite animaciones por afinidad", async ({ page }) => {
  await bootPerformanceReference(page);
  const result = await page.evaluate(async () => {
    const { JUTSU_LIBRARY, ENEMY_EXCLUSIVE_ABILITIES } = await import("/src/data.js?v=1.5.0");
    const { SKILLS_BY_ID } = await import("/src/skills/definitions.js?v=1.4.0");
    const { ELEMENTS } = await import("/src/elements.js?v=0.20.0");
    const { TECHNIQUE_VFX } = await import("/src/battle/runtime.js?v=0.91.0");
    const { ELEMENT_SEQUENCE_IDS, hasTechniqueSequence } = await import("/src/battle/technique-sequences.js?v=1.1.0");
    const actions = [...JUTSU_LIBRARY, ...ENEMY_EXCLUSIVE_ABILITIES];
    const missingActions = actions.filter(action => !TECHNIQUE_VFX[action.id] && !hasTechniqueSequence(action.id, action.element));
    const missingElements = Object.keys(ELEMENTS).filter(element => element !== "normal" &&
      !actions.some(action => action.element === element) && !hasTechniqueSequence("reference", element));
    const remaining = actions.filter(action => !SKILLS_BY_ID.has(action.id));
    const samples = ELEMENT_SEQUENCE_IDS.map(element => ({ id: `reference-${element}`, element }));
    const scene = window.__performanceReference.scene;
    const created = [];
    const direction = [];
    const original = scene.add.graphics.bind(scene.add);
    scene.add.graphics = (...args) => {
      const graphic = original(...args);
      const stroke = graphic.strokePath;
      const fill = graphic.fillPath;
      const track = (draw) => function (...path) {
        if (this.name && !created.includes(this.name)) {
          created.push(this.name);
          direction.push(this.scaleX);
        }
        return draw.apply(this, path);
      };
      graphic.strokePath = track(stroke);
      graphic.fillPath = track(fill);
      return graphic;
    };
    for (const action of [...remaining, ...samples]) {
      await scene.playAttackAnimation(action, "enemy", scene.attackVisuals(action, scene.foe));
    }
    return {
      missingActions: missingActions.map(action => action.id), missingElements,
      ids: [...remaining, ...samples].map(action => action.id), created, direction
    };
  });
  expect(result.missingActions).toEqual([]);
  expect(result.missingElements).toEqual([]);
  expect(result.created).toEqual(result.ids);
  expect(result.direction).toEqual(Array(result.ids.length).fill(-1));
});

for (const renderer of ["Canvas", "WebGL"]) {
  test(`los iconos compuestos funcionan en combate ${renderer} sin imágenes de tiers superiores`, async ({ page }) => {
    const failures = [], errors = [];
    page.on("response", response => { if (response.status() >= 400 && response.url().includes("/assets/")) failures.push(response.url()); });
    page.on("pageerror", error => errors.push(error.message));
    await bootPerformanceReference(page, { renderer, loadout: ["lightning_heaven", "fire_embers"] });
    const result = await page.evaluate(async () => {
      const scene = window.__performanceReference.scene;
      const texture = scene.textures.get("element-rayo");
      const pixels = texture.context.getImageData(0, 0, 512, 512).data;
      const before = texture;
      const { composeElementIcons } = await import("/src/battle/element-icons.js?v=1.0.0");
      composeElementIcons(scene, ["rayo"]);
      return {
        action: scene.actions.find(action => action?.id === "lightning_heaven")?.iconTexture,
        basic: ["viento", "fuego"].every(id => scene.textures.exists(`element-${id}`)),
        visible: pixels.some((value, index) => index % 4 === 3 && value > 0),
        cached: before === scene.textures.get("element-rayo"),
        advancedRequests: performance.getEntriesByType("resource").filter(entry => /assets\/elements\/tier-[234]\//.test(entry.name)).length
      };
    });
    expect(result).toEqual({ action: "element-rayo", basic: true, visible: true, cached: true, advancedRequests: 0 });
    expect(failures).toEqual([]);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/element-icons/combat-${renderer}.png` });
  });
}

test("los cinco impactos elementales funcionan en Canvas, WebGL y modo ligero", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await ensurePhaser(page);
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  const results = await page.evaluate(async () => {
    const { elementalImpactProfile, showElementalImpact } = await import("/src/battle/elemental-effects.js?v=0.93.0");
    const { JUTSU_LIBRARY } = await import("/src/data.js?v=1.5.0");
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
              const originalEffects = new Set(this.children.list);
              this.time.delayedCall(600, () => {
                const remaining = this.children.list.length;
                showElementalImpact(this, { element: "agua" }, 120, 90);
                const reused = this.children.list.length > 0 && this.children.list.every(effect => originalEffects.has(effect));
                const reusedEmitter = this.children.list.find(object => object.type === "ParticleEmitter");
                const reusedParticles = reusedEmitter?.getAliveParticleCount() || 0;
                this.time.delayedCall(600, () => finish({ filters, emitters, particles, renderer, remaining,
                  reused, reusedParticles, remainingAfterReuse: this.children.list.length }));
              });
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
  for (const result of [results.canvas, results.light, results.webgl].filter(Boolean)) {
    expect(result).toMatchObject({ reused: true, reusedParticles: result.emitters ? 8 : 0, remainingAfterReuse: 0 });
  }
  expect(browserErrors).toEqual([]);
});
