export const Phaser = window.Phaser;

export const WIDTH = 960;
export const HEIGHT = 540;
const MAX_RENDER_RESOLUTION = 4;

export const battleRuntime = {
  activeSave: null,
  activeMission: null,
  pendingSecondaryResults: null,
  renderResolution: 1,
  textTextureResolution: 2,
  releaseGameToMeta: () => {}
};

export function configureRenderResolution(element) {
  const bounds = element.getBoundingClientRect();
  const cssScale = Math.min(bounds.width / WIDTH, bounds.height / HEIGHT);
  const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
  battleRuntime.renderResolution = Math.min(MAX_RENDER_RESOLUTION, Math.max(1, cssScale * pixelRatio));
  battleRuntime.textTextureResolution = Math.min(4, Math.max(2, Math.ceil(battleRuntime.renderResolution)));
  return {
    width: Math.round(WIDTH * battleRuntime.renderResolution),
    height: Math.round(HEIGHT * battleRuntime.renderResolution)
  };
}

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

export const TIMELINE_START = 310;
export const TIMELINE_END = 914;
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
  Object.freeze({ texture: "travel-forest", file: "assets/locations/battle-dusk-pass.jpg?v=0.20.0" }),
  Object.freeze({ texture: "bg-marsh", file: "assets/locations/battle-mist-marsh-water.png?v=0.63.0" }),
  Object.freeze({ texture: "bg-moon", file: "assets/locations/battle-moon-shrine.jpg?v=0.20.0" })
]);
export const TECHNIQUE_VFX = Object.freeze({
  fire_embers: Object.freeze({ file: "fire-embers-spritesheet.png", frameWidth: 550.4, frameHeight: 280, sourceY: 620, width: 210, height: 112, frameRate: 10, frames: 5, projectile: true }),
  fire_breath: Object.freeze({ file: "fire-breath-spritesheet.png", frameWidth: 313, frameHeight: 717, width: 170, height: 390, frameRate: 11 }),
  water_bullet: Object.freeze({ file: "water-bullet-spritesheet.png", frameWidth: 310, frameHeight: 725, width: 180, height: 270, frameRate: 13 }),
  water_whip: Object.freeze({ file: "water-whip-spritesheet.png", frameWidth: 310, frameHeight: 725, width: 220, height: 390, frameRate: 10 }),
  earth_fist: Object.freeze({ file: "earth-fist-spritesheet.png", frameWidth: 310, frameHeight: 724, width: 175, height: 330, frameRate: 12 }),
  earth_wall: Object.freeze({ file: "earth-wall-spritesheet.png", frameWidth: 310, frameHeight: 725, width: 240, height: 410, frameRate: 10 }),
  wind_palm: Object.freeze({ file: "wind-palm-spritesheet.png", frameWidth: 310, frameHeight: 724, width: 180, height: 285, frameRate: 13 }),
  wind_blade: Object.freeze({ file: "wind-blade-spritesheet.png", frameWidth: 310, frameHeight: 724, width: 220, height: 390, frameRate: 10 })
});
export const TECHNIQUE_VFX_FRAMES = 7;

