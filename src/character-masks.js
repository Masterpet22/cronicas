export const MASK_COSMETICS = Object.freeze([
  { value: "cloth", name: "Máscara de tela", price: 45 },
  { value: "metal", name: "Máscara de acero", price: 80 },
  { value: "cat", name: "Máscara felina", price: 95 },
  { value: "cat_crimson", name: "Máscara felina · Carmesí", price: 95 },
  { value: "cat_indigo", name: "Máscara felina · Índigo", price: 95 },
  { value: "owl", name: "Máscara de búho", price: 100 },
  { value: "owl_bronze", name: "Máscara de búho · Bronce", price: 100 },
  { value: "owl_jade", name: "Máscara de búho · Jade", price: 100 },
  { value: "hare", name: "Máscara de liebre", price: 105 },
  { value: "hare_rose", name: "Máscara de liebre · Rosa", price: 105 },
  { value: "hare_sky", name: "Máscara de liebre · Celeste", price: 105 },
  { value: "oni", name: "Máscara de oni", price: 120 },
  { value: "oni_vermilion", name: "Máscara de oni · Bermellón", price: 120 },
  { value: "oni_violet", name: "Máscara de oni · Violeta", price: 120 }
].map(mask => Object.freeze({ id: `mask_${mask.value}`, cosmeticSlot: "mask", ...mask })));

const MASK_STYLES = new Set(MASK_COSMETICS.map(mask => mask.value));
const maskBody = bodyType => bodyType === "female" ? "female" : "male";

export function maskAsset(mask, bodyType, extension = "png") {
  if (!MASK_STYLES.has(mask)) return null;
  return `assets/modular/masks/${mask}-${maskBody(bodyType)}.${extension}?v=1.1.0`;
}

export function maskTextureKey(mask, bodyType) {
  return MASK_STYLES.has(mask) ? `player-mask-${mask}-${maskBody(bodyType)}` : null;
}
