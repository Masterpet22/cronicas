export const LOGICAL_RENDER_SIZE = Object.freeze({ width: 960, height: 540 });

export const RENDER_PROFILES = Object.freeze({
  economy: Object.freeze({ id: "economy", maxScale: 1, maxPixels: 960 * 540 }),
  low: Object.freeze({ id: "low", maxScale: 1.25, maxPixels: 1200 * 675 }),
  balanced: Object.freeze({ id: "balanced", maxScale: 1.5, maxPixels: 1440 * 810 }),
  high: Object.freeze({ id: "high", maxScale: 2, maxPixels: 1920 * 1080 })
});

const positiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;

export function renderQualityPreference(storage) {
  try {
    const value = (storage ?? globalThis.localStorage)?.getItem("render-quality");
    return Object.hasOwn(RENDER_PROFILES, value) ? value : "auto";
  } catch (_) { return "auto"; }
}

export function selectRenderProfile({ deviceMemory, hardwareConcurrency } = {}) {
  const memory = positiveNumber(deviceMemory);
  const cores = positiveNumber(hardwareConcurrency);
  if ((memory !== null && memory <= 2) || (cores !== null && cores <= 2)) return RENDER_PROFILES.economy;
  if ((memory !== null && memory <= 4) || (cores !== null && cores <= 4)) return RENDER_PROFILES.low;
  if (memory !== null && memory >= 8 && cores !== null && cores >= 8) return RENDER_PROFILES.high;
  return RENDER_PROFILES.balanced;
}

export function calculateRenderResolution({ width, height, devicePixelRatio = 1, profile = RENDER_PROFILES.balanced, fixed = false }) {
  const cssWidth = positiveNumber(width) || LOGICAL_RENDER_SIZE.width;
  const cssHeight = positiveNumber(height) || LOGICAL_RENDER_SIZE.height;
  const cssScale = Math.min(cssWidth / LOGICAL_RENDER_SIZE.width, cssHeight / LOGICAL_RENDER_SIZE.height);
  const pixelRatio = Math.max(1, positiveNumber(devicePixelRatio) || 1);
  const desiredScale = Math.max(1, cssScale * pixelRatio);
  const scale = fixed ? profile.maxScale : Math.floor(Math.min(profile.maxScale, desiredScale) * 100) / 100;
  return {
    width: Math.round(LOGICAL_RENDER_SIZE.width * scale),
    height: Math.round(LOGICAL_RENDER_SIZE.height * scale),
    scale,
    cssScale,
    devicePixelRatio: pixelRatio,
    profile
  };
}

export function configureRenderResolution(element, runtime, environment = {}) {
  const navigatorInfo = environment.navigator || globalThis.navigator || {};
  const preference = environment.preference ?? renderQualityPreference(environment.storage);
  const manualProfile = Object.hasOwn(RENDER_PROFILES, preference) ? RENDER_PROFILES[preference] : null;
  const profile = environment.profile || manualProfile || selectRenderProfile(navigatorInfo);
  const result = calculateRenderResolution({
    ...element.getBoundingClientRect(),
    devicePixelRatio: environment.devicePixelRatio ?? globalThis.devicePixelRatio ?? 1,
    profile,
    fixed: !environment.profile && Boolean(manualProfile)
  });
  runtime.renderResolution = result.scale;
  runtime.textTextureResolution = Math.min(3, Math.max(2, Math.ceil(result.scale)));
  runtime.renderProfile = profile;
  return result;
}
