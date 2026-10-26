import { battleVisualProfile } from "./visual-profiles.js?v=1.0.0";

let nextControllerId = 0;

export function mountArenaVisuals(scene, initialArena, { width = 960, height = 540 } = {}) {
  // Reemplazar un controlador debe retirar también sus callbacks, no solo sus objetos.
  scene.arenaVisuals?.destroy();
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  let arena = initialArena;
  let profile = battleVisualProfile(arena);
  let owned = [];
  let textureKeys = [];
  const texturePrefix = `arena-visual-${nextControllerId++}`;
  let signature = null;
  let destroyed = false;
  let cameraIntensity = 0;
  const webgl = Boolean(scene.game.renderer.gl);
  const releaseObjects = () => {
    owned.forEach((object) => { if (object.scene) object.destroy(); });
    owned = [];
    textureKeys.forEach((key) => scene.textures.remove(key));
    textureKeys = [];
  };
  const own = (object, name, depth) => {
    owned.push(object.setName(name).setDepth(depth));
    return object;
  };
  const bake = (graphics, role, textureWidth, textureHeight) => {
    const key = `${texturePrefix}-${role}`;
    textureKeys.push(key);
    try { graphics.generateTexture(key, textureWidth, textureHeight); }
    finally { graphics.destroy(); }
    return scene.add.image(0, 0, key).setOrigin(0);
  };
  const update = ({ arena: nextArena = arena } = {}) => {
    if (destroyed) return;
    const nextProfile = battleVisualProfile(nextArena);
    arena = nextArena;
    profile = nextProfile;
    scene.styleFighterGrounding?.(scene.hero);
    scene.styleFighterGrounding?.(scene.foe);
    const simple = Boolean(scene.lightMode || media.matches);
    cameraIntensity = scene.cameraEffects && !simple ? profile.cameraIntensity : 0;
    const nextSignature = `${arena.texture}:${simple}`;
    if (nextSignature === signature) return;
    releaseObjects();
    signature = nextSignature;

    if (scene.textures.exists(arena.texture)) {
      const background = own(scene.add.image(width / 2, height / 2, arena.texture).setDisplaySize(width, height), "arena-background", 0);
      if (webgl) {
        const { color, alpha } = profile.ambient;
        const tint = [16, 8, 0].reduce((value, shift) => value | Math.round(255 + (((color >> shift) & 255) - 255) * alpha) << shift, 0);
        background.setTint(tint);
      }
    } else {
      own(scene.add.rectangle(width / 2, height / 2, width, height, profile.ambient.color), "arena-background", 0);
    }
    const overlay = scene.add.graphics();
    if (!webgl) overlay.fillStyle(profile.ambient.color, profile.ambient.alpha).fillRect(0, 0, width, height);
    const vignette = profile.vignette;
    // Bandas sin filtros: la misma geometría funciona con Canvas y con WebGL.
    for (let index = 0; index < 4; index += 1) {
      const inset = index * vignette.width / 4;
      const size = vignette.width / 4;
      overlay.fillStyle(vignette.color, vignette.alpha * (1 - index / 4));
      overlay.fillRect(inset, 0, size, height).fillRect(width - inset - size, 0, size, height);
      overlay.fillRect(inset, inset, width - inset * 2, size);
    }
    for (let index = 0; index < 4; index += 1) {
      overlay.fillStyle(vignette.color, vignette.bottomAlpha * (index + 1) / 4);
      overlay.fillRect(0, height - 90 + index * 22.5, width, 22.5);
    }
    overlay.fillStyle(profile.fog.color, profile.fog.alpha * (simple ? 0.65 : 1));
    overlay.fillEllipse(width * 0.31, profile.fog.y, width * 0.54, profile.fog.height);
    overlay.fillEllipse(width * 0.76, profile.fog.y - 10, width * 0.52, profile.fog.height * 0.8);
    // Canvas reutiliza una textura; WebGL conserva geometría y evita una textura alfa a pantalla completa.
    own(webgl ? overlay : bake(overlay, "atmosphere", width, height), "arena-atmosphere", 1);
    if (!simple) {
      const particle = profile.particles;
      if (particle.maxParticles && scene.textures.exists("preparation-mote")) {
        own(scene.add.particles(0, 0, "preparation-mote", {
          x: { min: 190, max: width - 35 }, y: { min: 150, max: height - 105 },
          frequency: particle.frequency, lifespan: particle.lifespan, maxParticles: particle.maxParticles,
          speedX: { min: particle.speedX[0], max: particle.speedX[1] },
          speedY: { min: particle.speedY[0], max: particle.speedY[1] },
          alpha: { start: particle.alpha, end: 0 }, scale: { start: particle.scale, end: 0.03 },
          tint: particle.color
        }), "arena-particles", 2);
      }
    }
    scene.arenaLabel = profile.label;
  };
  const onMotionChange = () => update();
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    releaseObjects();
    media.removeEventListener?.("change", onMotionChange);
    scene.events.off("shutdown", destroy);
    scene.events.off("destroy", destroy);
  };
  const controller = {
    update, destroy,
    get profile() { return profile; },
    get cameraIntensity() { return cameraIntensity; },
    get destroyed() { return destroyed; },
    get textureKeys() { return [...textureKeys]; },
    get ownedCount() { return owned.filter((object) => object.scene).length; }
  };
  scene.arenaVisuals = controller;
  scene.events.once("shutdown", destroy);
  scene.events.once("destroy", destroy);
  media.addEventListener?.("change", onMotionChange);
  update();
  return controller;
}
