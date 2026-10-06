export const SEALS = {
  pajaro:    { frame: 0, label: "PÁJARO", key: "Q" },
  jabali:    { frame: 1, label: "JABALÍ", key: "W" },
  perro:     { frame: 2, label: "PERRO", key: "E" },
  dragon:    { frame: 3, label: "DRAGÓN", key: "R" },
  liebre:    { frame: 4, label: "LIEBRE", key: "A" },
  caballo:   { frame: 5, label: "CABALLO", key: "S" },
  mono:      { frame: 6, label: "MONO", key: "D" },
  buey:      { frame: 7, label: "BUEY", key: "F" },
  carnero:   { frame: 8, label: "CARNERO", key: "Z" },
  rata:      { frame: 9, label: "RATA", key: "X" },
  serpiente: { frame: 10, label: "SERPIENTE", key: "C" },
  tigre:     { frame: 11, label: "TIGRE", key: "V" }
};

export const BASE_ACTIONS = [
  { id: "strike", element: "physical", name: "Golpe veloz", subtitle: "0CH · V16 · P93", cost: 0, damage: 9, speedMod: 4, accuracyMod: 3, cooldown: 0, seals: [], color: 0xd7dce5 },
  { id: "guard", element: "none", type: "guard", name: "Guardia", subtitle: "-50% · +12CH · V20", cost: 0, damage: 0, speedMod: 8, accuracyMod: 0, cooldown: 0, seals: [], color: 0xf5c96b }
];

export const JUTSU_LIBRARY = [
  { id: "fire_embers", unlockLevel: 1, element: "fire", name: "Ascuas veloces", subtitle: "10CH · V15 · P94 · CD1", cost: 10, damage: 14, speedMod: 3, accuracyMod: 4, cooldown: 1, seals: ["serpiente", "tigre"], color: 0xff8d52, status: { type: "burn", label: "QUEMADURA", duration: 2, power: 2 } },
  { id: "fire_breath", unlockLevel: 1, element: "fire", name: "Aliento de brasa", subtitle: "18CH · V10 · P90 · CD2", cost: 18, damage: 23, speedMod: -2, accuracyMod: 0, cooldown: 2, seals: ["serpiente", "carnero", "tigre"], color: 0xff783d, status: { type: "burn", label: "QUEMADURA", duration: 2, power: 4 } },
  { id: "fire_ring", unlockLevel: 2, element: "fire", name: "Anillo de ceniza", subtitle: "22CH · V12 · P88 · CD2", cost: 22, damage: 27, speedMod: 0, accuracyMod: -2, cooldown: 2, seals: ["caballo", "serpiente", "dragon"], color: 0xf25f3a, status: { type: "burn", label: "QUEMADURA", duration: 3, power: 3 } },
  { id: "fire_phoenix", unlockLevel: 3, element: "fire", name: "Fénix escarlata", subtitle: "34CH · V6 · P80 · CD4", cost: 34, damage: 42, speedMod: -6, accuracyMod: -10, cooldown: 4, seals: ["caballo", "tigre", "serpiente", "dragon"], color: 0xff4935, cinematic: true, status: { type: "burn", label: "QUEMADURA", duration: 3, power: 5 } },

  { id: "wind_palm", unlockLevel: 1, element: "wind", name: "Palma de vacío", subtitle: "9CH · V17 · P96", cost: 9, damage: 13, speedMod: 5, accuracyMod: 6, cooldown: 0, seals: ["pajaro", "liebre"], color: 0x84e8cb },
  { id: "wind_blade", unlockLevel: 1, element: "wind", name: "Filo de vendaval", subtitle: "15CH · V14 · P95 · CD1", cost: 15, damage: 19, speedMod: 2, accuracyMod: 5, cooldown: 1, seals: ["pajaro", "liebre", "perro"], color: 0x67e8c3, status: { type: "bleed", label: "HERIDA", duration: 3, power: 2 } },
  { id: "wind_needles", unlockLevel: 2, element: "wind", name: "Agujas del norte", subtitle: "20CH · V16 · P90 · CD2", cost: 20, damage: 24, speedMod: 4, accuracyMod: 0, cooldown: 2, seals: ["pajaro", "perro", "buey"], color: 0x47cdb5, status: { type: "bleed", label: "HERIDA", duration: 3, power: 3 } },
  { id: "wind_cyclone", unlockLevel: 3, element: "wind", name: "Ciclón cortante", subtitle: "32CH · V9 · P84 · CD3", cost: 32, damage: 38, speedMod: -3, accuracyMod: -6, cooldown: 3, seals: ["pajaro", "liebre", "perro", "dragon"], color: 0x36bda4, cinematic: true, status: { type: "bleed", label: "HERIDA", duration: 3, power: 4 } },

  { id: "lightning_spark", unlockLevel: 1, element: "lightning", name: "Aguja de chispa", subtitle: "11CH · V17 · P93 · CD1", cost: 11, damage: 15, speedMod: 5, accuracyMod: 3, cooldown: 1, seals: ["rata", "buey"], color: 0x8bbcff },
  { id: "lightning_prison", unlockLevel: 1, element: "lightning", name: "Prisión del relámpago", subtitle: "28CH · V7 · P82 · CD3", cost: 28, damage: 34, speedMod: -5, accuracyMod: -8, cooldown: 3, seals: ["jabali", "buey", "dragon", "tigre"], color: 0x68a8ff, cinematic: true, status: { type: "stun", label: "ATURDIDO", duration: 1, power: 0 } },
  { id: "lightning_chain", unlockLevel: 2, element: "lightning", name: "Cadena estática", subtitle: "22CH · V12 · P87 · CD2", cost: 22, damage: 26, speedMod: 0, accuracyMod: -3, cooldown: 2, seals: ["rata", "buey", "dragon"], color: 0x508ff0, status: { type: "seal", label: "SELLADO", duration: 3, power: 0 } },
  { id: "lightning_heaven", unlockLevel: 3, element: "lightning", name: "Juicio del cielo", subtitle: "36CH · V5 · P78 · CD4", cost: 36, damage: 44, speedMod: -7, accuracyMod: -12, cooldown: 4, seals: ["rata", "buey", "dragon", "tigre"], color: 0x3f78df, cinematic: true, status: { type: "stun", label: "ATURDIDO", duration: 1, power: 0 } }
];

export const EQUIPMENT = {
  weapon: [
    { id: "kunai", name: "Kunai equilibrado", description: "+2 daño", bonuses: { damageBonus: 2 } },
    { id: "tanto", name: "Tanto veloz", description: "+2 velocidad", bonuses: { speed: 2 } },
    { id: "staff", name: "Bastón de chakra", description: "-2 coste de chakra", bonuses: { costReduction: 2 } }
  ],
  armor: [
    { id: "light_vest", name: "Chaleco ligero", description: "+4 evasión", bonuses: { evasion: 4 } },
    { id: "iron_vest", name: "Protector reforzado", description: "+15 PV, -1 velocidad", bonuses: { maxHp: 15, speed: -1 } },
    { id: "focus_wrap", name: "Vendas de enfoque", description: "+4 precisión", bonuses: { accuracy: 4 } }
  ],
  accessory: [
    { id: "chakra_charm", name: "Amuleto de chakra", description: "+20 chakra", bonuses: { maxChakra: 20 } },
    { id: "hawk_eye", name: "Visor de halcón", description: "+3 precisión", bonuses: { accuracy: 3 } },
    { id: "scholar_mark", name: "Marca del erudito", description: "+15 % experiencia", bonuses: { xpBonus: 0.15 } }
  ]
};

export const ENEMY_ACTIONS = {
  quick: { id: "quick", name: "Golpe rápido", damage: [9, 13], speedMod: 2, accuracyMod: 5, color: 0xff6b55 },
  heavy: { id: "heavy", name: "Golpe pesado", damage: [15, 19], speedMod: -4, accuracyMod: -10, color: 0xff935c },
  toxin: { id: "toxin", name: "Aguja tóxica", damage: [7, 10], speedMod: 5, accuracyMod: 0, color: 0xb58cff, status: { type: "poison", label: "VENENO", duration: 3, power: 3 } },
  ember: { id: "ember", name: "Ascua errante", damage: [8, 12], speedMod: 0, accuracyMod: 2, color: 0xff783d, status: { type: "burn", label: "QUEMADURA", duration: 2, power: 3 } }
};

export const ENEMIES = [
  {
    name: "GUARDIÁN DEL PASO", hp: 68, speed: 10, accuracy: 90, evasion: 5,
    weakness: "wind", resistance: "physical", pattern: ["quick", "heavy", "quick"],
    colors: { cloth: 0xe0a45a, accent: 0x3d2021 }
  },
  {
    name: "ADEPTA DE CENIZA", hp: 76, speed: 9, accuracy: 92, evasion: 4,
    weakness: "lightning", resistance: "fire", pattern: ["ember", "quick", "heavy", "ember"],
    colors: { cloth: 0xd87855, accent: 0x411b24 }
  },
  {
    name: "EXPLORADOR DE NIEBLA", hp: 82, speed: 13, accuracy: 91, evasion: 9,
    weakness: "fire", resistance: "wind", pattern: ["toxin", "quick", "toxin", "heavy"],
    colors: { cloth: 0x86b9c9, accent: 0x20394f }
  },
  {
    name: "MAESTRO DEL ECLIPSE", hp: 118, speed: 11, accuracy: 94, evasion: 7,
    weakness: "wind", resistance: "arcane", pattern: ["quick", "ember", "heavy"],
    phase2Pattern: ["toxin", "heavy", "ember", "quick"], boss: true,
    colors: { cloth: 0x9a7bd1, accent: 0x21183f }
  }
];
