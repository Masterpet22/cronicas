import { Phaser } from "./runtime.js?v=0.91.0";

const ELEMENT_FAMILIES = Object.freeze({
  fuego: "fuego", ceniza: "fuego", magma: "fuego",
  agua: "agua", hielo: "agua", escarcha: "agua", vapor: "agua",
  tierra: "tierra", arena: "tierra", metal: "tierra", cristal: "tierra", vidrio: "tierra", raiz: "tierra", planta: "tierra",
  viento: "viento", veneno: "viento",
  rayo: "rayo", tormenta: "rayo"
});

const IMPACT_PROFILES = Object.freeze({
  fuego: Object.freeze({ color: 0xff823d, highlight: 0xffdc8a, speed: [32, 88], angle: [225, 315], gravityY: -35 }),
  agua: Object.freeze({ color: 0x45bcf4, highlight: 0xb5efff, speed: [45, 105], angle: [190, 350], gravityY: 95 }),
  tierra: Object.freeze({ color: 0xb99560, highlight: 0xf2daaa, speed: [22, 64], angle: [200, 340], gravityY: 180 }),
  viento: Object.freeze({ color: 0x63dec1, highlight: 0xc7fff0, speed: [75, 140], angle: [145, 225], gravityY: -12 }),
  rayo: Object.freeze({ color: 0x8ab8ff, highlight: 0xf0f6ff, speed: [95, 170], angle: [0, 360], gravityY: 0 })
});

export function elementalImpactProfile(element) {
  const family = ELEMENT_FAMILIES[element];
  return family ? { family, ...IMPACT_PROFILES[family] } : null;
}

function drawImpactGlyph(graphics, family, color) {
  graphics.lineStyle(3, color, 0.9);
  if (family === "fuego") {
    graphics.strokeCircle(0, 0, 23);
    [-1, 0, 1].forEach((offset) => graphics.lineBetween(offset * 15, 12, offset * 11 - 6, -29 - Math.abs(offset) * 8));
  } else if (family === "agua") {
    graphics.strokeEllipse(0, 12, 74, 22);
    graphics.strokeEllipse(0, 12, 44, 13);
    graphics.lineBetween(-9, -18, 0, -35);
    graphics.lineBetween(0, -35, 9, -18);
  } else if (family === "tierra") {
    [-2, -1, 0, 1, 2].forEach((index) => {
      graphics.lineBetween(index * 15, 15, index * 18 + 7, -12 - (index % 2) * 10);
      graphics.lineBetween(index * 18 + 7, -12 - (index % 2) * 10, index * 17 + 2, -24);
    });
  } else if (family === "viento") {
    [-1, 0, 1].forEach((index) => {
      graphics.lineBetween(-38, index * 15 - 7, 14, index * 15 - 16);
      graphics.lineBetween(14, index * 15 - 16, 33, index * 15 - 8);
    });
  } else if (family === "rayo") {
    [-1, 0, 1].forEach((index) => {
      graphics.lineBetween(index * 19 - 9, -31, index * 19 + 6, -8);
      graphics.lineBetween(index * 19 + 6, -8, index * 19 - 4, 2);
      graphics.lineBetween(index * 19 - 4, 2, index * 19 + 12, 25);
    });
  }
}

// La animación es decorativa: no espera al combate ni modifica el daño.
export function showElementalImpact(scene, action, x, y, intensity = 1) {
  const profile = elementalImpactProfile(action?.element);
  if (!profile) return;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const lightweight = scene.lightMode || reducedMotion;
  const color = action.color || profile.color;
  const glyph = scene.add.graphics({ x, y }).setDepth(17);
  drawImpactGlyph(glyph, profile.family, color);
  glyph.setScale(0.55 * intensity).setAlpha(0.9);
  scene.tweens.add({
    targets: glyph,
    scale: (lightweight ? 0.85 : 1.45) * intensity,
    alpha: 0,
    duration: lightweight ? 190 : 400,
    ease: "Cubic.out",
    onComplete: () => glyph.destroy()
  });
  if (lightweight || !scene.textures.exists("preparation-mote")) return;

  const emitter = scene.add.particles(0, 0, "preparation-mote", {
    emitting: false,
    frequency: -1,
    lifespan: { min: 240, max: 450 },
    maxParticles: 12,
    speed: { min: profile.speed[0], max: profile.speed[1] },
    angle: { min: profile.angle[0], max: profile.angle[1] },
    gravityY: profile.gravityY,
    scale: { start: 0.28 * intensity, end: 0.02 },
    alpha: { start: 0.95, end: 0 },
    tint: [color, profile.highlight],
    blendMode: "ADD"
  }).setDepth(18);
  emitter.stop();
  emitter.emitParticleAt(x, y, Math.round(8 * intensity));
  scene.time.delayedCall(500, () => { if (emitter.active) emitter.destroy(); });

  if (scene.game.renderer.type !== Phaser.WEBGL) return;
  const glint = scene.add.image(x, y, "preparation-mote")
    .setTint(profile.highlight)
    .setDisplaySize(18 * intensity, 18 * intensity)
    .setAlpha(0.78)
    .setDepth(19);
  glint.enableFilters().filters.internal.addGlow(color, 1.8, 0, 1, false, 4, 6);
  scene.tweens.add({
    targets: glint,
    scale: glint.scaleX * 2,
    alpha: 0,
    duration: 240,
    ease: "Quad.out",
    onComplete: () => glint.destroy()
  });
}
