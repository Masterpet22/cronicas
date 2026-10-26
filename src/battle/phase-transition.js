import { HEIGHT, WIDTH, battleRuntime } from "./runtime.js?v=0.91.0";

const tween = (scene, config) => new Promise((resolve) => scene.tweens.add({ ...config, onComplete: resolve }));
const wait = (scene, duration) => new Promise((resolve) => scene.time.delayedCall(duration, resolve));

export async function playBossPhaseTransition(scene, { fighter, name, detail }) {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const lightMode = window.localStorage.getItem("light-mode") === "on";
  const color = 0xc5a1f2;
  const x = fighter.body.x;
  const y = fighter.body.y - 55;
  const veil = scene.add.rectangle(0, 0, WIDTH, HEIGHT, 0x050a1a, 0).setOrigin(0).setDepth(100).setInteractive()
    .setName("boss-phase-veil");
  const ring = scene.add.circle(x, y, 72, color, 0.08).setStrokeStyle(4, color, 0.85)
    .setScale(0.2).setAlpha(0).setDepth(101).setName("boss-phase-ring");
  const phase = scene.add.text(WIDTH / 2, HEIGHT / 2 - 58, "FASE II", {
    fontFamily: '"Cinzel", Georgia, serif', fontSize: "34px", color: "#f5e4ff", fontStyle: "bold",
    stroke: "#182039", strokeThickness: 5
  }).setOrigin(0.5).setDepth(102).setAlpha(0).setName("boss-phase-title");
  const enemy = scene.add.text(WIDTH / 2, HEIGHT / 2 - 13, String(name || "EL RIVAL").toUpperCase(), {
    fontFamily: '"Cinzel", Georgia, serif', fontSize: "18px", color: "#e0c9f4", fontStyle: "bold"
  }).setOrigin(0.5).setDepth(102).setAlpha(0);
  const explanation = scene.add.text(WIDTH / 2, HEIGHT / 2 + 31, detail || "El rival cambia su ritmo de combate.", {
    fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "16px", color: "#e8e8f0",
    align: "center", wordWrap: { width: 620 }
  }).setOrigin(0.5).setDepth(102).setAlpha(0);
  const objects = [veil, ring, phase, enemy, explanation];
  let motes = null;
  if (!reducedMotion && !lightMode && scene.textures.exists("preparation-mote")) {
    motes = scene.add.particles(0, 0, "preparation-mote", {
      emitting: false, frequency: -1, lifespan: { min: 500, max: 900 }, maxParticles: 18,
      speed: { min: 35, max: 90 }, scale: { start: 0.55, end: 0 },
      alpha: { start: 0.8, end: 0 }, tint: color, blendMode: "ADD"
    }).setDepth(101).setName("boss-phase-particles");
    motes.emitParticleAt(x, y, 18);
  }
  const baseZoom = battleRuntime.renderResolution;
  if (!reducedMotion && !lightMode) scene.cameras.main.zoomTo(baseZoom * 1.055, 390);
  await Promise.all([
    tween(scene, { targets: veil, alpha: 0.78, duration: reducedMotion ? 100 : 260 }),
    tween(scene, { targets: ring, alpha: 1, scale: 1.15, duration: reducedMotion ? 100 : 420, ease: "Cubic.out" }),
    tween(scene, { targets: [phase, enemy, explanation], alpha: 1, y: "-=9", duration: reducedMotion ? 100 : 320, ease: "Cubic.out" })
  ]);
  await wait(scene, reducedMotion ? 170 : 460);
  if (!reducedMotion && !lightMode) scene.cameras.main.zoomTo(baseZoom, 240);
  await Promise.all([
    tween(scene, { targets: veil, alpha: 0, duration: reducedMotion ? 100 : 240 }),
    tween(scene, { targets: ring, alpha: 0, scale: 1.8, duration: reducedMotion ? 100 : 240 }),
    tween(scene, { targets: [phase, enemy, explanation], alpha: 0, duration: reducedMotion ? 100 : 180 })
  ]);
  motes?.destroy();
  objects.forEach((object) => object.destroy());
}
