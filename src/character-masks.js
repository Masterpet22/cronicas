const MASK_STYLES = new Set(["cloth", "metal"]);
const maskBody = bodyType => bodyType === "female" ? "female" : "male";

export function maskAsset(mask, bodyType, extension = "png") {
  if (!MASK_STYLES.has(mask)) return null;
  return `assets/modular/masks/${mask}-${maskBody(bodyType)}.${extension}?v=1.0.0`;
}

export function maskTextureKey(mask, bodyType) {
  return MASK_STYLES.has(mask) ? `player-mask-${mask}-${maskBody(bodyType)}` : null;
}
