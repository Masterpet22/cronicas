export const BASIC_ELEMENT_IDS = ["fuego", "agua", "tierra", "viento"];

export const ELEMENTS = {
  fuego: { name: "Fuego", tier: 1, parents: [], icon: "assets/elements/tier-1/fuego.webp", color: 0xff783d },
  agua: { name: "Agua", tier: 1, parents: [], icon: "assets/elements/tier-1/agua.webp", color: 0x55bfff },
  tierra: { name: "Tierra", tier: 1, parents: [], icon: "assets/elements/tier-1/tierra.webp", color: 0xb78a55 },
  viento: { name: "Viento", tier: 1, parents: [], icon: "assets/elements/tier-1/viento.webp", color: 0x84e8cb },
  vapor: { name: "Vapor", tier: 2, parents: ["agua", "fuego"], color: 0xb7d8e8 },
  magma: { name: "Magma", tier: 2, parents: ["tierra", "fuego"], color: 0xe65c32 },
  rayo: { name: "Rayo", tier: 2, parents: ["viento", "fuego"], color: 0x68a8ff },
  planta: { name: "Planta", tier: 2, parents: ["agua", "tierra"], color: 0x48bd72 },
  hielo: { name: "Hielo", tier: 2, parents: ["agua", "viento"], color: 0x9ddfff },
  arena: { name: "Arena", tier: 2, parents: ["tierra", "viento"], color: 0xd6aa5e },
  veneno: { name: "Veneno", tier: 3, parents: ["planta", "fuego"], color: 0x6fbd55 },
  metal: { name: "Metal", tier: 3, parents: ["magma", "viento"], color: 0x9ca6b2 },
  escarcha: { name: "Escarcha", tier: 3, parents: ["hielo", "tierra"], color: 0xc6efff },
  vidrio: { name: "Vidrio", tier: 3, parents: ["arena", "fuego"], color: 0xe8b868 },
  tormenta: { name: "Tormenta", tier: 3, parents: ["rayo", "agua"], color: 0x738cff },
  cristal: { name: "Cristal", tier: 3, parents: ["hielo", "tierra"], color: 0x8ec9e8 },
  ceniza: { name: "Ceniza", tier: 3, parents: ["planta", "fuego"], color: 0x9b8179 },
  raiz: { name: "Raíz", tier: 3, parents: ["planta", "viento"], color: 0x7f9a58 },
  plasma: { name: "Plasma", tier: 4, parents: ["vapor", "rayo"], color: 0x9b8cff },
  obsidiana: { name: "Obsidiana", tier: 4, parents: ["magma", "hielo"], color: 0x6e5668 },
  niebla: { name: "Niebla", tier: 4, parents: ["vapor", "hielo"], color: 0xb9d6e6 },
  espora: { name: "Espora", tier: 4, parents: ["vapor", "planta"], color: 0x76ae76 }
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

// Los elementos compuestos reutilizan las imágenes de sus afinidades básicas.
// El Dojo y Phaser comparten la misma composición sobre un lienzo de 512 px.
export function elementIconParts(id) {
  const ids = basicRequirements(id);
  const layouts = {
    1: [[0, 0, 512]],
    2: [[0, 96, 320], [192, 96, 320]],
    3: [[128, 0, 256], [0, 256, 256], [256, 256, 256]],
    4: [[0, 0, 256], [256, 0, 256], [0, 256, 256], [256, 256, 256]]
  };
  return ids.map((elementId, index) => {
    const [x, y, size] = layouts[ids.length][index];
    return { id: elementId, icon: elementIcon(elementId), x, y, size };
  });
}
