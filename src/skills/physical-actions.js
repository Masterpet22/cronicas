// Definiciones compartidas por el catálogo de combate y los nodos del Dojo.
export const TAIJUTSU_ACTIONS = [
  { id: "physical_1", name: "Puño de hierro", description: "Un impacto físico potente. Iniciativa -1: recuperas el ritmo más despacio para la próxima acción.", damage: 22, healthCost: 8, initiative: -1, speedMod: -1, accuracyMod: 2, cooldown: 1 },
  { id: "physical_2", name: "Paso fugaz", description: "Un golpe rápido. Iniciativa +1: la barra de tu próxima acción avanza más rápido.", damage: 15, healthCost: 5, initiative: 1, speedMod: 6, accuracyMod: 5, cooldown: 1 }
].map(action => ({ ...action, type: "taijutsu", element: "physical", cost: 0, seals: [], color: 0x657fff, iconTexture: null }));
