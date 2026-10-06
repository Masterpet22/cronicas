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

export const ACTIONS = [
  { id: "strike", element: "physical", name: "Golpe veloz", subtitle: "0CH · V16 · P93", cost: 0, damage: 9, speedMod: 4, accuracyMod: 3, cooldown: 0, seals: [], color: 0xd7dce5 },
  { id: "fire", element: "fire", name: "Aliento de brasa", subtitle: "18CH · V10 · P90 · CD2", cost: 18, damage: 23, speedMod: -2, accuracyMod: 0, cooldown: 2, seals: ["serpiente", "carnero", "tigre"], color: 0xff783d, status: { type: "burn", label: "QUEMADURA", duration: 2, power: 4 } },
  { id: "wind", element: "wind", name: "Filo de vendaval", subtitle: "15CH · V14 · P95 · CD1", cost: 15, damage: 19, speedMod: 2, accuracyMod: 5, cooldown: 1, seals: ["pajaro", "liebre", "perro"], color: 0x67e8c3, status: { type: "bleed", label: "HERIDA", duration: 3, power: 2 } },
  { id: "lightning", element: "lightning", name: "Prisión del relámpago", subtitle: "28CH · V7 · P82 · CD3", cost: 28, damage: 34, speedMod: -5, accuracyMod: -8, cooldown: 3, seals: ["jabali", "buey", "dragon", "tigre"], color: 0x68a8ff, cinematic: true, status: { type: "stun", label: "ATURDIDO", duration: 1, power: 0 } },
  { id: "guard", element: "none", type: "guard", name: "Guardia", subtitle: "-50% · +12CH · V20", cost: 0, damage: 0, speedMod: 8, accuracyMod: 0, cooldown: 0, seals: [], color: 0xf5c96b },
  { id: "seal", element: "arcane", name: "Sello inhibidor", subtitle: "12CH · V11 · P92 · CD2", cost: 12, damage: 8, speedMod: -1, accuracyMod: 2, cooldown: 2, seals: ["rata", "mono", "carnero"], color: 0xd58cff, status: { type: "seal", label: "SELLADO", duration: 3, power: 0 } }
];

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

