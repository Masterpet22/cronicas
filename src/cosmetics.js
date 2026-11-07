// Los valores se comparten con el personaje y con sus capas de apariencia.
export const COSMETICS = Object.freeze([
  { id: "hair_none", name: "Sin cabello", cosmeticSlot: "hair", value: 0, price: 0 },
  { id: "hair_short", name: "Peinado corto", cosmeticSlot: "hair", value: 1, price: 40, image: "assets/modular/hair/hair_corto.png?v=0.137.0" },
  { id: "hair_ponytail", name: "Peinado con coleta", cosmeticSlot: "hair", value: 4, price: 70, image: "assets/modular/hair/hair_coleta.png?v=0.141.0" },
  { id: "face_plain", name: "Rostro neutral", cosmeticSlot: "face", value: 1, price: 0, image: "assets/modular/faces/male_poker.png?v=0.135.0" },
  { id: "face_scar", name: "Rostro enojado", cosmeticSlot: "face", value: 2, price: 50, image: "assets/modular/faces/male_angry.png?v=0.135.0" },
  { id: "face_mask", name: "Rostro feliz", cosmeticSlot: "face", value: 3, price: 75, image: "assets/modular/faces/male_happy.png?v=0.135.0" },
  { id: "top_none", name: "Túnica de entrenamiento", cosmeticSlot: "top", value: 1, price: 0 },
  { id: "top_traveler", name: "Chaqueta de viajero", cosmeticSlot: "top", value: 2, price: 60, pendingArt: true },
  { id: "top_shadow", name: "Túnica de la sombra", cosmeticSlot: "top", value: 3, price: 90, pendingArt: true },
  { id: "bottom_none", name: "Pantalón de entrenamiento", cosmeticSlot: "bottom", value: 1, price: 0 },
  { id: "bottom_traveler", name: "Pantalón de viajero", cosmeticSlot: "bottom", value: 2, price: 45, pendingArt: true },
  { id: "bottom_shadow", name: "Pantalón de la sombra", cosmeticSlot: "bottom", value: 3, price: 65, pendingArt: true },
  { id: "shoes_none", name: "Botas de entrenamiento", cosmeticSlot: "shoes", value: 1, price: 0 },
  { id: "shoes_sandals", name: "Sandalias de combate", cosmeticSlot: "shoes", value: 2, price: 35, pendingArt: true },
  { id: "outfit_none", name: "Atuendo de entrenamiento", cosmeticSlot: "outfit", value: null, price: 0 },
  { id: "traveler_outfit", name: "Traje de viajero", cosmeticSlot: "outfit", value: "traveler_outfit", price: 65, pendingArt: true },
  { id: "shadow_outfit", name: "Traje de la sombra", cosmeticSlot: "outfit", value: "shadow_outfit", price: 125, pendingArt: true },
  { id: "channeler_outfit", name: "Traje ceremonial del canalizador", cosmeticSlot: "outfit", value: "channeler_outfit", price: 145, pendingArt: true, bonuses: { maxChakra: 15 } }
].map(item => Object.freeze({ ...item, category: "appearance", kind: "cosmetic", stackLimit: 1,
  description: `${item.bonuses ? "Traje especial: +15 chakra." : "Solo apariencia; sin bonificaciones de combate."}${item.pendingArt ? " Gráfico del personaje pendiente." : ""}` })));
export const COSMETIC_SLOTS = Object.freeze({ face: "Rostro", hair: "Peinado", teleportObject: "Sustitución", top: "Parte superior", bottom: "Parte inferior", shoes: "Calzado", outfit: "Traje completo" });
export const BASE_COSMETICS = Object.freeze({ face: 1, hair: 0, teleportObject: "log", top: 1, bottom: 1, shoes: 1, outfit: null });
export const LEGACY_SEALS = Object.freeze({ light_vest: "seal_wind", iron_vest: "seal_vitality", focus_wrap: "seal_precision", traveler_outfit: "seal_traveler", shadow_outfit: "seal_shadow", channeler_outfit: "seal_channeler" });
