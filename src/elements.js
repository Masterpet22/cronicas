export const BASIC_ELEMENT_IDS = ["fuego", "agua", "tierra", "viento"];

export const ELEMENTS = {
  fuego: { name: "Fuego", tier: 1, parents: [], icon: "assets/elements/tier-1/fuego.webp", color: 0xff783d },
  agua: { name: "Agua", tier: 1, parents: [], icon: "assets/elements/tier-1/agua.webp", color: 0x55bfff },
  tierra: { name: "Tierra", tier: 1, parents: [], icon: "assets/elements/tier-1/tierra.webp", color: 0xb78a55 },
  viento: { name: "Viento", tier: 1, parents: [], icon: "assets/elements/tier-1/viento.webp", color: 0x84e8cb },
  vapor: { name: "Vapor", tier: 2, parents: ["agua", "fuego"], icon: "assets/elements/tier-2/vapor.webp", color: 0xb7d8e8 },
  magma: { name: "Magma", tier: 2, parents: ["tierra", "fuego"], icon: "assets/elements/tier-2/magma.webp", color: 0xe65c32 },
  rayo: { name: "Rayo", tier: 2, parents: ["viento", "fuego"], icon: "assets/elements/tier-2/rayo.webp", color: 0x68a8ff },
  planta: { name: "Planta", tier: 2, parents: ["agua", "tierra"], icon: "assets/elements/tier-2/planta.webp", color: 0x48bd72 },
  hielo: { name: "Hielo", tier: 2, parents: ["agua", "viento"], icon: "assets/elements/tier-2/hielo.webp", color: 0x9ddfff },
  arena: { name: "Arena", tier: 2, parents: ["tierra", "viento"], icon: "assets/elements/tier-2/arena.webp", color: 0xd6aa5e },
  veneno: { name: "Veneno", tier: 3, parents: ["planta", "fuego"], icon: "assets/elements/tier-3/veneno.webp", color: 0x6fbd55 },
  metal: { name: "Metal", tier: 3, parents: ["magma", "viento"], icon: "assets/elements/tier-3/metal.webp", color: 0x9ca6b2 },
  escarcha: { name: "Escarcha", tier: 3, parents: ["hielo", "tierra"], icon: "assets/elements/tier-3/escarcha.webp", color: 0xc6efff },
  vidrio: { name: "Vidrio", tier: 3, parents: ["arena", "fuego"], icon: "assets/elements/tier-3/vidrio.webp", color: 0xe8b868 },
  tormenta: { name: "Tormenta", tier: 3, parents: ["rayo", "agua"], icon: "assets/elements/tier-3/tormenta.webp", color: 0x738cff },
  cristal: { name: "Cristal", tier: 3, parents: ["hielo", "tierra"], icon: "assets/elements/tier-3/cristal.webp", color: 0x8ec9e8 },
  ceniza: { name: "Ceniza", tier: 3, parents: ["planta", "fuego"], icon: "assets/elements/tier-3/ceniza.webp", color: 0x9b8179 },
  raiz: { name: "Raíz", tier: 3, parents: ["planta", "viento"], icon: "assets/elements/tier-3/raiz.webp", color: 0x7f9a58 },
  plasma: { name: "Plasma", tier: 4, parents: ["vapor", "rayo"], icon: "assets/elements/tier-4/plasma.webp", color: 0x9b8cff },
  obsidiana: { name: "Obsidiana", tier: 4, parents: ["magma", "hielo"], icon: "assets/elements/tier-4/obsidiana.webp", color: 0x6e5668 },
  niebla: { name: "Niebla", tier: 4, parents: ["vapor", "hielo"], icon: "assets/elements/tier-4/niebla.webp", color: 0xb9d6e6 },
  espora: { name: "Espora", tier: 4, parents: ["vapor", "planta"], icon: "assets/elements/tier-4/espora.webp", color: 0x76ae76 }
};

export const ELEMENT_RANK_LABELS = { 1: "Rango elemental 1", 2: "Rango elemental 2", 3: "Rango elemental 3" };

export function basicRequirements(elementId) {
  const element = ELEMENTS[elementId];
  if (!element) return [];
  if (element.tier === 1) return [elementId];
  return [...new Set(element.parents.flatMap(basicRequirements))];
}

export function canAccessElement(elementId, affinities = [], rank = 1) {
  const element = ELEMENTS[elementId];
  if (!element || element.tier === 4 || element.tier > rank) return false;
  return basicRequirements(elementId).every((id) => affinities.includes(id));
}

export function accessibleElements(affinities = [], rank = 1) {
  return Object.keys(ELEMENTS).filter((id) => canAccessElement(id, affinities, rank));
}

export function elementName(id) { return ELEMENTS[id]?.name || id; }
export function elementIcon(id) { return ELEMENTS[id]?.icon || ""; }
