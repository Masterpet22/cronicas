// The neutral training outfit uses the same articulated pieces in preview and battle.
export const BASE_OUTFIT_PARTS = Object.freeze(['torso','muslo_izquierdo','muslo_derecho','pierna_izquierda','pierna_derecha','pie_izquierdo','pie_derecho']);
export const isBaseOutfitPart = id => BASE_OUTFIT_PARTS.includes(id);
export const baseOutfitAsset = (bodyType,id) => `assets/modular/outfits/training/${bodyType === 'female' ? 'female' : 'male'}/${id}.png?v=1.0.0`;
