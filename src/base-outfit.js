// Each slot owns all the articulated parts needed to change the garment.
export const CLOTHING_PARTS = Object.freeze({
  top: ["torso"],
  bottom: ["muslo_izquierdo", "muslo_derecho", "pierna_izquierda", "pierna_derecha"],
  shoes: ["pie_izquierdo", "pie_derecho"]
});
export const BASE_OUTFIT_PARTS = Object.freeze(Object.values(CLOTHING_PARTS).flat());
export const isBaseOutfitPart = id => BASE_OUTFIT_PARTS.includes(id);

const individualStyles = {
  top: { 2: "traveler", 3: "shadow" },
  bottom: { 2: "traveler", 3: "shadow" },
  shoes: { 2: "sandals" }
};
const outfitStyles = new Map([
  ["traveler_outfit", "traveler"],
  ["shadow_outfit", "shadow"],
  ["channeler_outfit", "channeler"]
]);
const armorStyles = new Map([
  ["lamellar_armor", "lamellar"],
  ["steel_armor", "steel"]
]);
const ARMOR_ARM_PARTS = ["brazo_izquierdo", "antebrazo_izquierdo", "brazo_derecho", "antebrazo_derecho"];
export const isFullArmor = outfit => armorStyles.has(outfit);
const outfitBody = bodyType => bodyType === "female" ? "female" : "male";
const assetVersion = "1.2.0";

export function selectedClothing(appearance) {
  const outfit = outfitStyles.get(appearance?.outfit) || "training";
  const armor = armorStyles.get(appearance?.outfit);
  if (armor) return Object.fromEntries([...BASE_OUTFIT_PARTS, ...ARMOR_ARM_PARTS].map(id => [id, armor]));
  return Object.fromEntries(Object.entries(CLOTHING_PARTS).flatMap(([slot, parts]) => {
    const style = individualStyles[slot][Number(appearance?.[slot])] || outfit;
    return parts.map(id => [id, style]);
  }));
}

export const clothingAsset = (bodyType, id, style) =>
  `assets/modular/outfits/${style}/${outfitBody(bodyType)}/${id}.png?v=${assetVersion}`;
export const baseOutfitAsset = (bodyType, id) => clothingAsset(bodyType, id, "training");
export const clothingTextureKey = (bodyType, id, style) =>
  `fighter-cloth-${outfitBody(bodyType)}-${style}-${id}`;

export function clothingThumbnail(item, bodyType) {
  const style = individualStyles[item?.cosmeticSlot]?.[Number(item.value)] ?? outfitStyles.get(item?.value) ?? armorStyles.get(item?.value);
  return style ? `assets/modular/outfits/${style}/${outfitBody(bodyType)}/${item.cosmeticSlot}.webp?v=${assetVersion}` : null;
}
