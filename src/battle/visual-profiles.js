const freeze = (value) => {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};

// La clave es la textura de BATTLE_ARENAS: fondo y perfil no dependen del número de escena.
export const BATTLE_VISUAL_PROFILES = freeze({
  "travel-forest": {
    id: "dusk-pass", label: "PASO DEL CREPÚSCULO",
    ambient: { color: 0x703c27, alpha: 0.07 },
    vignette: { color: 0x180e14, alpha: 0.14, width: 46, bottomAlpha: 0.28 },
    fog: { color: 0xd7ac83, alpha: 0.035, y: 342, height: 30 },
    cameraIntensity: 0.7,
    grounding: { color: 0x000000, alpha: 0.4, strokeColor: 0x000000, strokeAlpha: 0, strokeWidth: 0, scaleX: 1, scaleY: 1 },
    particles: { color: 0xf4b46f, maxParticles: 6, frequency: 650, lifespan: 3600, speedX: [-4, 7], speedY: [-10, -3], alpha: 0.36, scale: 0.19 }
  },
  "bg-marsh": {
    id: "mist-marsh", label: "MARISMA DE LOS JUNCOS",
    ambient: { color: 0x285d54, alpha: 0.075 },
    vignette: { color: 0x071e25, alpha: 0.17, width: 52, bottomAlpha: 0.26 },
    fog: { color: 0xa6d8ce, alpha: 0.065, y: 326, height: 46 },
    cameraIntensity: 0.4,
    grounding: { color: 0x123e45, alpha: 0.22, strokeColor: 0x75d9da, strokeAlpha: 0.38, strokeWidth: 2, scaleX: 1.14, scaleY: 0.58 },
    particles: { color: 0x8de3bd, maxParticles: 8, frequency: 650, lifespan: 4800, speedX: [-3, 5], speedY: [-3, 2], alpha: 0.28, scale: 0.17 }
  },
  "bg-moon": {
    id: "moon-shrine", label: "SANTUARIO DE LA LUNA",
    ambient: { color: 0x54427b, alpha: 0.065 },
    vignette: { color: 0x12122c, alpha: 0.19, width: 48, bottomAlpha: 0.30 },
    fog: { color: 0xb8bfec, alpha: 0.04, y: 340, height: 34 },
    cameraIntensity: 0.5,
    grounding: { color: 0x000000, alpha: 0.4, strokeColor: 0x000000, strokeAlpha: 0, strokeWidth: 0, scaleX: 1, scaleY: 1 },
    particles: { color: 0xd2c6fa, maxParticles: 6, frequency: 700, lifespan: 4200, speedX: [-3, 4], speedY: [-6, -1], alpha: 0.32, scale: 0.18 }
  }
});

export function battleVisualProfile(arena, profiles = BATTLE_VISUAL_PROFILES) {
  const profile = profiles[arena?.texture];
  if (!profile) throw new RangeError(`Falta el perfil visual de arena: ${arena?.texture}`);
  return profile;
}

export function validateBattleVisualProfiles(arenas, profiles = BATTLE_VISUAL_PROFILES) {
  const errors = [];
  const ids = new Set();
  for (const arena of arenas) {
    const profile = profiles[arena.texture];
    if (!profile) { errors.push(`${arena.texture}: perfil ausente`); continue; }
    if (!profile.id || !profile.label || ids.has(profile.id)) errors.push(`${arena.texture}: identidad inválida o duplicada`);
    ids.add(profile.id);
    for (const layer of ["ambient", "vignette", "fog", "particles"]) {
      const item = profile[layer];
      if (!Number.isInteger(item?.color) || item.color < 0 || item.color > 0xffffff) errors.push(`${profile.id}.${layer}: color inválido`);
      if (!Number.isFinite(item?.alpha) || item.alpha < 0 || item.alpha > 1) errors.push(`${profile.id}.${layer}: alpha inválido`);
    }
    if (!Number.isFinite(profile.cameraIntensity) || profile.cameraIntensity < 0 || profile.cameraIntensity > 1) errors.push(`${profile.id}: cámara fuera de rango`);
    const ground = profile.grounding;
    if (!ground || ![ground.color, ground.strokeColor].every((color) => Number.isInteger(color) && color >= 0 && color <= 0xffffff)
      || ![ground.alpha, ground.strokeAlpha].every((alpha) => Number.isFinite(alpha) && alpha >= 0 && alpha <= 1)
      || ![ground.scaleX, ground.scaleY].every((scale) => Number.isFinite(scale) && scale > 0)
      || !Number.isFinite(ground.strokeWidth) || ground.strokeWidth < 0) errors.push(`${profile.id}: contacto con el suelo inválido`);
    if (!Number.isInteger(profile.particles?.maxParticles) || profile.particles.maxParticles < 0 || profile.particles.maxParticles > 12) errors.push(`${profile.id}: máximo ambiental de 12 partículas`);
    for (const key of ["frequency", "lifespan", "scale"]) {
      if (!(profile.particles?.[key] > 0)) errors.push(`${profile.id}.particles.${key}: debe ser positivo`);
    }
    for (const key of ["speedX", "speedY"]) {
      const range = profile.particles?.[key];
      if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite) || range[0] > range[1]) errors.push(`${profile.id}.particles.${key}: rango inválido`);
    }
    if (!(profile.fog?.height > 0) || !Number.isFinite(profile.fog?.y)) errors.push(`${profile.id}: niebla inválida`);
    if (!(profile.vignette?.width > 0) || !(profile.vignette?.bottomAlpha >= 0 && profile.vignette.bottomAlpha <= 1)) errors.push(`${profile.id}: viñeta inválida`);
  }
  for (const texture of Object.keys(profiles)) if (!arenas.some((arena) => arena.texture === texture)) errors.push(`${texture}: perfil sin arena`);
  return errors;
}
