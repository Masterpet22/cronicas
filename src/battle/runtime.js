import { battleRuntime } from "./session.js?v=1.0.0";

export const Phaser = window.Phaser;
export { battleRuntime };

export const WIDTH = 960;
export const HEIGHT = 540;

export function sharpenTextTree(objects, resolution = battleRuntime.textTextureResolution) {
  objects.forEach((child) => {
    if (child instanceof Phaser.GameObjects.Text && typeof child.setResolution === "function") child.setResolution(resolution);
    if (Array.isArray(child.list)) sharpenTextTree(child.list, resolution);
  });
}

export function drawCubicBezier(graphics, start, controlA, controlB, end, segments = 32) {
  graphics.moveTo(start.x, start.y);
  for (let index = 1; index <= segments; index += 1) {
    const t = index / segments;
    const inverse = 1 - t;
    const x = (inverse ** 3 * start.x) + (3 * inverse ** 2 * t * controlA.x) + (3 * inverse * t ** 2 * controlB.x) + (t ** 3 * end.x);
    const y = (inverse ** 3 * start.y) + (3 * inverse ** 2 * t * controlA.y) + (3 * inverse * t ** 2 * controlB.y) + (t ** 3 * end.y);
    graphics.lineTo(x, y);
  }
}

export const TIMELINE_START = 360;
export const TIMELINE_END = 840;
export const RANK_LEVELS = Object.freeze(["Novicio", "Guardián"]);
export const HUD_THEMES = Object.freeze({
  ancestral: Object.freeze({
    texture: "hud-theme-ancestral",
    file: "assets/ui/hud-themes/ancestral.webp?v=0.45.1",
    health: Object.freeze({ x: 28, y: 127, width: 2119, height: 289, displayWidth: 360 }),
    chakra: Object.freeze({ x: 38, y: 434, width: 2097, height: 199, displayWidth: 340 }),
    barOffset: Object.freeze({ healthY: -4, chakraY: -5 })
  }),
  lunar: Object.freeze({
    texture: "hud-theme-lunar",
    file: "assets/ui/hud-themes/lunar.webp?v=0.45.1",
    health: Object.freeze({ x: 8, y: 43, width: 851, height: 128, displayWidth: 360 }),
    chakra: Object.freeze({ x: 12, y: 182, width: 843, height: 67, displayWidth: 340 }),
    barOffset: Object.freeze({ healthY: 3, chakraY: 2 })
  })
});
export const BATTLE_ARENAS = Object.freeze([
  Object.freeze({ texture: "travel-forest", file: "assets/locations/battle-dusk-pass.webp?v=0.20.1" }),
  Object.freeze({ texture: "bg-marsh", file: "assets/locations/battle-mist-marsh-water.webp?v=0.63.1" }),
  Object.freeze({ texture: "bg-moon", file: "assets/locations/battle-moon-shrine.jpg?v=0.20.0" })
]);
export const TECHNIQUE_VFX = Object.freeze({
  fire_embers: Object.freeze({ file: "fire-embers-spritesheet.png", frameWidth: 550.4, frameHeight: 280, sourceY: 620, width: 210, height: 112, frameRate: 10, frames: 5, projectile: true }),
  fire_breath: Object.freeze({ file: "fire-breath-spritesheet.png", frameWidth: 313, frameHeight: 717, width: 170, height: 390, frameRate: 11 }),
  water_bullet: Object.freeze({ creationFile: "aqua-shuriken-creation-spritesheet.png", projectileFile: "aqua-shuriken.png", frameWidth: 600, frameHeight: 670, creationWidth: 150, creationHeight: 168, width: 94, height: 96, frameRate: 14, frames: 8, projectile: true }),
  water_whip: Object.freeze({ file: "aqua-whip-spritesheet.png", frameWidth: 600, frameHeight: 670, width: 500, height: 558, frameRate: 10, frames: 8, position: "battlefield", y: 360 }),
  earth_fist: Object.freeze({ creationFile: "earth-fist-creation-spritesheet.png", destructionFile: "earth-fist-destruction-spritesheet.png", frameWidth: 600, frameHeight: 670, width: 243, height: 272, frameRate: 12, destructionFrameRate: 20, frames: 8, projectile: true }),
  earth_wall: Object.freeze({ file: "earth-wall-spritesheet.png", frameWidth: 1200, frameHeight: 335, width: 520, height: 220, frameRate: 10, frames: 8 }),
  wind_palm: Object.freeze({ file: "wind-palm-spritesheet.png", version: "0.83.0", frameWidth: 600, frameHeight: 670, width: 260, height: 290, frameRate: 13, frames: 8 }),
  wind_blade: Object.freeze({ file: "wind-blade-spritesheet.png", version: "0.84.0", frameWidth: 600, frameHeight: 670, width: 300, height: 335, frameRate: 10, frames: 8 })
});
export const TECHNIQUE_VFX_FRAMES = 7;

export const COIN_DROP_VFX = Object.freeze({
  file: "coin-spin-spritesheet.png",
  frameWidth: 256,
  frameHeight: 256,
  frames: 10,
  frameRate: 14,
  displaySize: 30
});

export const EXPERIENCE_DROP_VFX = Object.freeze({
  file: "experience-spin-spritesheet.png",
  frameWidth: 256,
  frameHeight: 256,
  frames: 10,
  frameRate: 14,
  displaySize: 30
});

