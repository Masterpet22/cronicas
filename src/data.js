export const SEALS = {
  pajaro:    { frame: 0, label: "ALBA", key: "Q" },
  jabali:    { frame: 1, label: "PULSO", key: "W" },
  perro:     { frame: 2, label: "VÍNCULO", key: "E" },
  dragon:    { frame: 3, label: "UMBRAL", key: "R" },
  liebre:    { frame: 4, label: "FLUJO", key: "A" },
  caballo:   { frame: 5, label: "ESPIRAL", key: "S" },
  mono:      { frame: 6, label: "SENDERO", key: "D" },
  buey:      { frame: 7, label: "NEXO", key: "F" },
  carnero:   { frame: 8, label: "ESTALLIDO", key: "Z" },
  rata:      { frame: 9, label: "ECO", key: "X" },
  serpiente: { frame: 10, label: "RUPTURA", key: "C" },
  tigre:     { frame: 11, label: "HORIZONTE", key: "V" }
};

export const BASE_ACTIONS = [
  { id: "strike", element: "physical", icon: "assets/actions/basic-strike.png", name: "Golpe veloz", subtitle: "0CH · V16 · P93", cost: 0, damage: 9, speedMod: 4, accuracyMod: 3, cooldown: 0, seals: [], color: 0xd7dce5 },
  { id: "guard", element: "none", icon: "assets/actions/guard.png", type: "guard", name: "Guardia", subtitle: "-50% · +12CH · V20", cost: 0, damage: 0, speedMod: 8, accuracyMod: 0, cooldown: 0, seals: [], color: 0xf5c96b }
];

const extraTechnique = (id, element, name, cost, damage, speedMod, seals, color, status) => ({
  id, unlockLevel: 1, element, name,
  subtitle: `${cost}CH · V${12 + speedMod} · P92${cost >= 20 ? " · CD2" : " · CD1"}`,
  cost, damage, speedMod, accuracyMod: 2, cooldown: cost >= 20 ? 2 : 1, seals, color,
  ...(status ? { status } : {})
});

const EXTRA_ELEMENT_TECHNIQUES = [
  extraTechnique("fire_arc", "fuego", "Arco de llama", 12, 16, 2, ["serpiente", "caballo"], 0xff8d52),
  extraTechnique("fire_brand", "fuego", "Marca ardiente", 16, 20, 0, ["tigre", "serpiente"], 0xff6b3d, { type: "burn", label: "QUEMADURA", duration: 2, power: 3 }),
  extraTechnique("wind_step", "viento", "Paso del céfiro", 10, 14, 5, ["pajaro", "liebre"], 0x84e8cb),
  extraTechnique("wind_wave", "viento", "Onda cortante", 16, 20, 2, ["perro", "pajaro"], 0x67e8c3),
  extraTechnique("water_bullet", "agua", "Proyectil de agua", 10, 14, 3, ["dragon", "liebre"], 0x55bfff),
  extraTechnique("water_whip", "agua", "Látigo de corriente", 14, 18, 2, ["dragon", "serpiente"], 0x48aee8),
  extraTechnique("water_wall", "agua", "Muro de marea", 18, 21, -1, ["buey", "dragon"], 0x378fc9),
  extraTechnique("water_lance", "agua", "Lanza abisal", 22, 27, -2, ["dragon", "tigre", "liebre"], 0x287bbd),
  extraTechnique("earth_fist", "tierra", "Puño de roca", 10, 16, 0, ["buey", "perro"], 0xb78a55),
  extraTechnique("earth_wall", "tierra", "Muralla pétrea", 14, 18, -2, ["buey", "jabali"], 0x9d7548),
  extraTechnique("earth_spike", "tierra", "Púa tectónica", 18, 23, -1, ["perro", "buey", "tigre"], 0x8a633e),
  extraTechnique("earth_quake", "tierra", "Pulso sísmico", 22, 28, -3, ["jabali", "buey", "dragon"], 0x765334),
  extraTechnique("vapor_burst", "vapor", "Estallido de vapor", 21, 27, 1, ["dragon", "serpiente", "liebre"], 0xb7d8e8),
  extraTechnique("magma_forge", "magma", "Forja de magma", 24, 31, -2, ["tigre", "buey", "serpiente"], 0xe65c32, { type: "burn", label: "QUEMADURA", duration: 3, power: 3 }),
  extraTechnique("plant_bind", "planta", "Enredo esmeralda", 20, 24, 2, ["perro", "liebre", "buey"], 0x48bd72, { type: "seal", label: "SELLADO", duration: 2, power: 0 }),
  extraTechnique("ice_spear", "hielo", "Lanza glacial", 22, 29, 0, ["pajaro", "dragon", "tigre"], 0x9ddfff),
  extraTechnique("sand_coffin", "arena", "Prisión de arena", 23, 28, -1, ["buey", "perro", "dragon"], 0xd6aa5e, { type: "seal", label: "SELLADO", duration: 2, power: 0 }),
  extraTechnique("venom_bloom", "veneno", "Flor venenosa", 27, 32, 1, ["serpiente", "perro", "dragon"], 0x6fbd55, { type: "poison", label: "VENENO", duration: 3, power: 4 }),
  extraTechnique("metal_bastion", "metal", "Bastión de metal", 29, 36, -3, ["buey", "tigre", "dragon"], 0x9ca6b2),
  extraTechnique("frost_crown", "escarcha", "Corona de escarcha", 26, 33, 1, ["pajaro", "liebre", "dragon"], 0xc6efff),
  extraTechnique("glass_rain", "vidrio", "Lluvia de vidrio", 28, 37, 2, ["serpiente", "pajaro", "tigre"], 0xe8b868, { type: "bleed", label: "HERIDA", duration: 3, power: 4 }),
  extraTechnique("storm_domain", "tormenta", "Dominio de tormenta", 31, 40, 2, ["rata", "dragon", "pajaro", "tigre"], 0x738cff, { type: "stun", label: "ATURDIDO", duration: 1, power: 0 }),
  extraTechnique("crystal_prism", "cristal", "Prisma cristalino", 28, 36, 0, ["dragon", "buey", "liebre"], 0x8ec9e8),
  extraTechnique("ash_funeral", "ceniza", "Réquiem de ceniza", 29, 38, -1, ["serpiente", "tigre", "caballo"], 0x9b8179, { type: "burn", label: "QUEMADURA", duration: 3, power: 4 }),
  extraTechnique("root_colossus", "raiz", "Raíz ancestral", 30, 39, -2, ["perro", "buey", "jabali"], 0x7f9a58, { type: "seal", label: "SELLADO", duration: 3, power: 0 })
];

export const JUTSU_LIBRARY = [
  { id: "fire_embers", unlockLevel: 1, element: "fuego", name: "Ascuas veloces", subtitle: "10CH · V15 · P94 · CD1", cost: 10, damage: 14, speedMod: 3, accuracyMod: 4, cooldown: 1, seals: ["serpiente", "tigre"], color: 0xff8d52, status: { type: "burn", label: "QUEMADURA", duration: 2, power: 2 } },
  { id: "fire_breath", unlockLevel: 1, element: "fuego", name: "Aliento de brasa", subtitle: "18CH · V10 · P90 · CD2", cost: 18, damage: 23, speedMod: -2, accuracyMod: 0, cooldown: 2, seals: ["serpiente", "carnero", "tigre"], color: 0xff783d, status: { type: "burn", label: "QUEMADURA", duration: 2, power: 4 } },
  { id: "fire_ring", unlockLevel: 2, element: "fuego", name: "Anillo de ceniza", subtitle: "22CH · V12 · P88 · CD2", cost: 22, damage: 27, speedMod: 0, accuracyMod: -2, cooldown: 2, seals: ["caballo", "serpiente", "dragon"], color: 0xf25f3a, status: { type: "burn", label: "QUEMADURA", duration: 3, power: 3 } },
  { id: "fire_phoenix", unlockLevel: 3, element: "fuego", name: "Fénix escarlata", subtitle: "34CH · V6 · P80 · CD4", cost: 34, damage: 42, speedMod: -6, accuracyMod: -10, cooldown: 4, seals: ["caballo", "tigre", "serpiente", "dragon"], color: 0xff4935, cinematic: true, status: { type: "burn", label: "QUEMADURA", duration: 3, power: 5 } },

  { id: "wind_palm", unlockLevel: 1, element: "viento", name: "Palma de vacío", subtitle: "9CH · V17 · P96", cost: 9, damage: 13, speedMod: 5, accuracyMod: 6, cooldown: 0, seals: ["pajaro", "liebre"], color: 0x84e8cb },
  { id: "wind_blade", unlockLevel: 1, element: "viento", name: "Filo de vendaval", subtitle: "15CH · V14 · P95 · CD1", cost: 15, damage: 19, speedMod: 2, accuracyMod: 5, cooldown: 1, seals: ["pajaro", "liebre", "perro"], color: 0x67e8c3, status: { type: "bleed", label: "HERIDA", duration: 3, power: 2 } },
  { id: "wind_needles", unlockLevel: 2, element: "viento", name: "Agujas del norte", subtitle: "20CH · V16 · P90 · CD2", cost: 20, damage: 24, speedMod: 4, accuracyMod: 0, cooldown: 2, seals: ["pajaro", "perro", "buey"], color: 0x47cdb5, status: { type: "bleed", label: "HERIDA", duration: 3, power: 3 } },
  { id: "wind_cyclone", unlockLevel: 3, element: "viento", name: "Ciclón cortante", subtitle: "32CH · V9 · P84 · CD3", cost: 32, damage: 38, speedMod: -3, accuracyMod: -6, cooldown: 3, seals: ["pajaro", "liebre", "perro", "dragon"], color: 0x36bda4, cinematic: true, status: { type: "bleed", label: "HERIDA", duration: 3, power: 4 } },

  { id: "lightning_spark", unlockLevel: 1, element: "rayo", name: "Aguja de chispa", subtitle: "11CH · V17 · P93 · CD1", cost: 11, damage: 15, speedMod: 5, accuracyMod: 3, cooldown: 1, seals: ["rata", "buey"], color: 0x8bbcff },
  { id: "lightning_prison", unlockLevel: 1, element: "rayo", name: "Prisión del relámpago", subtitle: "28CH · V7 · P82 · CD3", cost: 28, damage: 34, speedMod: -5, accuracyMod: -8, cooldown: 3, seals: ["jabali", "buey", "dragon", "tigre"], color: 0x68a8ff, cinematic: true, status: { type: "stun", label: "ATURDIDO", duration: 1, power: 0 } },
  { id: "lightning_chain", unlockLevel: 2, element: "rayo", name: "Cadena estática", subtitle: "22CH · V12 · P87 · CD2", cost: 22, damage: 26, speedMod: 0, accuracyMod: -3, cooldown: 2, seals: ["rata", "buey", "dragon"], color: 0x508ff0, status: { type: "seal", label: "SELLADO", duration: 3, power: 0 } },
  { id: "lightning_heaven", unlockLevel: 3, element: "rayo", name: "Juicio del cielo", subtitle: "36CH · V5 · P78 · CD4", cost: 36, damage: 44, speedMod: -7, accuracyMod: -12, cooldown: 4, seals: ["rata", "buey", "dragon", "tigre"], color: 0x3f78df, cinematic: true, status: { type: "stun", label: "ATURDIDO", duration: 1, power: 0 } },
  ...EXTRA_ELEMENT_TECHNIQUES
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

export const ENEMY_ROSTER = {
  gate_guard: {
    name: "GUARDIÁN DEL PASO", hp: 68, speed: 10, accuracy: 90, evasion: 5,
    weakness: "wind", resistance: "physical", pattern: ["quick", "heavy", "quick"],
    colors: { cloth: 0xe0a45a, accent: 0x3d2021 }
  },
  ash_adept: {
    name: "ADEPTA DE CENIZA", hp: 76, speed: 9, accuracy: 92, evasion: 4,
    weakness: "lightning", resistance: "fire", pattern: ["ember", "quick", "heavy", "ember"],
    colors: { cloth: 0xd87855, accent: 0x411b24 }
  },
  mist_scout: {
    name: "EXPLORADOR DE NIEBLA", hp: 82, speed: 13, accuracy: 91, evasion: 9,
    weakness: "fire", resistance: "wind", pattern: ["toxin", "quick", "toxin", "heavy"],
    colors: { cloth: 0x86b9c9, accent: 0x20394f }
  },
  reed_bandit: {
    name: "BANDIDO DEL JUNCO", hp: 70, speed: 12, accuracy: 88, evasion: 7,
    weakness: "fire", resistance: "physical", pattern: ["quick", "quick", "heavy"],
    colors: { cloth: 0x7ea063, accent: 0x253421 }
  },
  stone_hunter: {
    name: "CAZADOR DE PIEDRA", hp: 92, speed: 8, accuracy: 93, evasion: 3,
    weakness: "lightning", resistance: "physical", pattern: ["heavy", "quick", "heavy"],
    colors: { cloth: 0x9b8c7b, accent: 0x332d2a }
  },
  venom_medic: {
    name: "MÉDICA DEL VENENO", hp: 78, speed: 11, accuracy: 94, evasion: 6,
    weakness: "wind", resistance: "fire", pattern: ["toxin", "quick", "toxin", "ember"],
    colors: { cloth: 0x8e75b8, accent: 0x2e2145 }
  },
  dusk_tracker: {
    name: "RASTREADOR DEL OCASO", hp: 88, speed: 14, accuracy: 92, evasion: 10,
    weakness: "fire", resistance: "wind", pattern: ["quick", "toxin", "quick", "heavy"],
    colors: { cloth: 0x52769b, accent: 0x18273b }
  },
  mirror_agent: {
    name: "AGENTE DEL ESPEJO", hp: 96, speed: 12, accuracy: 96, evasion: 11,
    weakness: "wind", resistance: "lightning", pattern: ["ember", "quick", "heavy", "toxin"],
    colors: { cloth: 0xb7c0cb, accent: 0x303947 }
  },
  boss_riven: {
    name: "RIVEN, SEÑOR DEL PUENTE", hp: 126, speed: 11, accuracy: 94, evasion: 7,
    weakness: "lightning", resistance: "physical", pattern: ["heavy", "quick", "ember"],
    phase2Pattern: ["toxin", "heavy", "quick", "ember"], boss: true,
    colors: { cloth: 0xa94d45, accent: 0x35161d }
  },
  boss_nerezza: {
    name: "NEREZZA, JUEZA DEL SELLO", hp: 142, speed: 13, accuracy: 96, evasion: 9,
    weakness: "fire", resistance: "wind", pattern: ["quick", "toxin", "heavy"],
    phase2Pattern: ["ember", "quick", "toxin", "heavy"], boss: true,
    colors: { cloth: 0x5579a8, accent: 0x172840 }
  },
  boss_eclipse: {
    name: "MAESTRO DEL ECLIPSE", hp: 118, speed: 11, accuracy: 94, evasion: 7,
    weakness: "wind", resistance: "arcane", pattern: ["quick", "ember", "heavy"],
    phase2Pattern: ["toxin", "heavy", "ember", "quick"], boss: true,
    colors: { cloth: 0x9a7bd1, accent: 0x21183f }
  }
};

export const ENEMIES = Object.values(ENEMY_ROSTER);

export const STORY_SAGAS = [
  { id: "saga-1", number: 1, title: "Los senderos de la aldea", subtitle: "Primeras amenazas y vínculos", missionIds: ["m01", "m02", "m03"] },
  { id: "saga-2", number: 2, title: "La conspiración del sello", subtitle: "Ladrones, veneno y ascenso", missionIds: ["m04", "m05", "m06", "m07"] },
  { id: "saga-3", number: 3, title: "Crónicas del Eclipse", subtitle: "La amenaza detrás de las sombras", missionIds: ["m08", "m09", "m10"] }
];

export const MISSIONS = [
  {
    id: "m01", number: 1, title: "El paso cerrado", location: "Puerta Norte", duration: "4–6 min", encounters: ["gate_guard"],
    reward: { xp: 35, coins: 25 },
    briefing: [
      ["Maestra Aya", "Antes de salir, observa velocidad, precisión y afinidades. No todas las técnicas sirven contra todos."],
      ["Mika", "Yo vigilaré desde la aldea. Usa Guardia si necesitas recuperar chakra."]
    ]
  },
  {
    id: "m02", number: 2, title: "Ecos entre los juncos", location: "Marisma Este", duration: "6–8 min", encounters: ["reed_bandit", "stone_hunter"],
    reward: { xp: 55, coins: 40 },
    briefing: [["Maestra Aya", "Dos desertores controlan el sendero. Vuelve con información y sin perseguirlos más allá de la marisma."]]
  },
  {
    id: "m03", number: 3, title: "Niebla en el canal", location: "Canal Antiguo", duration: "6–8 min", encounters: ["mist_scout", "venom_medic"],
    reward: { xp: 65, coins: 48 },
    briefing: [["Mika", "Esta vez voy contigo. Atacaré cuando encuentre una apertura; tú decides el ritmo del combate."]]
  },
  {
    id: "m04", number: 4, title: "Ceniza sobre el mercado", location: "Distrito Mercante", duration: "6–8 min", encounters: ["ash_adept", "dusk_tracker"],
    reward: { xp: 72, coins: 55 },
    briefing: [["Mercader Toma", "Robaron sellos del archivo y dejaron brasas violetas. Encuentra al responsable antes del anochecer."]]
  },
  {
    id: "m05", number: 5, title: "El puente quebrado", location: "Puente de Basalto", duration: "7–9 min", encounters: ["mirror_agent", "boss_riven"],
    reward: { xp: 95, coins: 78 },
    briefing: [["Maestra Aya", "Riven dirige a los ladrones. Su segunda postura cambia el ritmo de sus ataques: guarda chakra para ella."]]
  },
  {
    id: "m06", number: 6, title: "Rastro de veneno", location: "Bosque de Piedra", duration: "6–8 min", encounters: ["stone_hunter", "venom_medic", "dusk_tracker"],
    reward: { xp: 88, coins: 70 },
    briefing: [["Mika", "Las huellas regresan hacia la aldea. Alguien está probando nuestras defensas."]]
  },
  {
    id: "m07", number: 7, title: "Examen de ascenso", location: "Arena del Consejo", duration: "8–10 min", encounters: ["gate_guard", "mirror_agent", "boss_nerezza"], exam: true,
    reward: { xp: 120, coins: 100 },
    briefing: [["Nerezza", "No busco una victoria perfecta. Quiero ver si puedes adaptarte, proteger a tu compañero y terminar lo que empiezas."]]
  },
  {
    id: "m08", number: 8, title: "Sombras en el archivo", location: "Archivo Subterráneo", duration: "6–8 min", encounters: ["ash_adept", "mirror_agent", "venom_medic"],
    reward: { xp: 105, coins: 88 },
    briefing: [["Maestra Aya", "Ya eres guardián. Entra al archivo y averigua quién enseñó nuestros sellos al enemigo."]]
  },
  {
    id: "m09", number: 9, title: "La noche sin luna", location: "Muralla Exterior", duration: "7–9 min", encounters: ["reed_bandit", "dusk_tracker", "boss_riven"],
    reward: { xp: 125, coins: 105 },
    briefing: [["Mika", "Riven sobrevivió al puente. Esta vez no está huyendo: está abriendo el camino para su maestro."]]
  },
  {
    id: "m10", number: 10, title: "Crónicas del Eclipse", location: "Santuario del Horizonte", duration: "9–11 min", encounters: ["mist_scout", "boss_nerezza", "boss_eclipse"],
    reward: { xp: 180, coins: 160 }, finale: true,
    briefing: [["Maestra Aya", "Todo lo aprendido te trajo aquí. Rompe el sello del Eclipse y regresa para escribir tu propio capítulo."]]
  }
];
