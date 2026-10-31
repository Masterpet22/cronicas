export const ROOM_WALLS = Object.freeze([
  { id: "jade", name: "Jade", color: "#557069" }, { id: "sand", name: "Arena", color: "#ae9272" },
  { id: "ink", name: "Tinta", color: "#35475e" }, { id: "plum", name: "Ciruela", color: "#725267" },
  { id: "ivory", name: "Marfil", color: "#c9bea3" }
]);
export const ROOM_FLOORS = Object.freeze([
  { id: "cedar", name: "Cedro", color: "#8e5f3e" }, { id: "walnut", name: "Nogal", color: "#514138" },
  { id: "tatami", name: "Tatami", color: "#a39363" }, { id: "stone", name: "Piedra", color: "#596371" }
]);
export const CLAN_EMBLEMS = Object.freeze([
  { id: "sun", name: "Sol" }, { id: "mountain", name: "Montaña" }, { id: "lotus", name: "Loto" }, { id: "moon", name: "Luna" }
]);
export const CLAN_COLORS = Object.freeze([
  { id: "wine", name: "Granate", color: "#8b3342" }, { id: "jade", name: "Jade", color: "#39776b" },
  { id: "blue", name: "Azul", color: "#3c6194" }, { id: "gold", name: "Oro", color: "#9d7836" }
]);
// Muebles: footprint es el lado de su base sobre el suelo (0–1); floorAnchor,
// el punto de apoyo vertical dentro del dibujo (0–1), no su borde inferior.
export const ROOM_DECOR = Object.freeze([
  { id: "landscape", name: "Cuadro del horizonte", category: "wall", width: 190, height: 132, detail: "Montañas bajo la luna." },
  { id: "scroll", name: "Pergamino de disciplina", category: "wall", width: 96, height: 178, detail: "Un recordatorio de tu camino." },
  { id: "lantern", name: "Farol de papel", category: "wall", width: 92, height: 150, detail: "Una luz cálida para tu rincón." },
  { id: "plant", name: "Bonsái", category: "floor", width: 142, height: 154, footprint: .064, floorAnchor: .95, detail: "Un pequeño árbol en maceta." },
  { id: "table", name: "Mesa de té", category: "floor", width: 225, height: 120, footprint: .172, floorAnchor: .7375, detail: "Té y descanso entre misiones." },
  { id: "cushion", name: "Cojín granate", category: "floor", width: 126, height: 72, footprint: .124, floorAnchor: .6875, detail: "Un asiento junto a la mesa." },
  { id: "novice", name: "Insignia de novicio", category: "wall", width: 108, height: 116, detail: "Tu primer rango en la aldea." },
  { id: "medal", name: "Medalla de misión", category: "wall", width: 102, height: 126, detail: "Una medalla para recordar tus aventuras.", missions: 1 },
  { id: "trophy", name: "Trofeo del viajero", category: "floor", width: 110, height: 146, footprint: .08, floorAnchor: .93, detail: "Un trofeo para tu rincón de la aldea.", missions: 3 },
  { id: "guardian", name: "Insignia de Guardián", category: "wall", width: 122, height: 140, detail: "El emblema dorado de los guardianes.", guardian: true }
]);
export const MAX_ROOM_DECOR = 24;
export const GUILD_INVENTORY_VERSION = 24;
export const guildItemId = (surface, value) => `guild_${surface}_${value}`;
export const GUILD_STARTER_ITEMS = Object.freeze(["guild_wall_jade", "guild_wall_sand", "guild_floor_cedar", "guild_decor_novice", "guild_decor_plant"]);
const decorPrices = { landscape: 85, scroll: 65, lantern: 55, plant: 80, table: 120, cushion: 40, novice: 50, medal: 95, trophy: 150, guardian: 200 };
export const GUILD_ITEMS = Object.freeze([
  ...ROOM_WALLS.map((wall, index) => ({ id: guildItemId("wall", wall.id), name: `Pared de ladrillo · ${wall.name}`, price: [0, 0, 80, 90, 100][index], guildSurface: "wall", value: wall.id, description: `Acabado ${wall.name.toLowerCase()} para las dos paredes de Mi espacio. Se compra una sola vez.`, stackLimit: 1 })),
  ...ROOM_FLOORS.map((floor, index) => ({ id: guildItemId("floor", floor.id), name: `Suelo de ${floor.name.toLowerCase()}`, price: [0, 110, 140, 160][index], guildSurface: "floor", value: floor.id, description: `Desbloquea el suelo de ${floor.name.toLowerCase()} en Mi espacio. Se compra una sola vez.`, stackLimit: 1 })),
  ...ROOM_DECOR.map(item => ({ id: guildItemId("decor", item.id), name: item.name, price: decorPrices[item.id], guildSurface: "decor", value: item.id, description: `${item.detail} Incluye una unidad para colocar en el Gremio; al retirarla puedes volver a usarla.`, stackLimit: 99 }))
].map(item => Object.freeze({ ...item, category: "decorations", kind: "decoration" })));
export function guildInventoryGrants(save) {
  const grants = Object.fromEntries(GUILD_STARTER_ITEMS.map(id => [id, 1]));
  if (!save?.guild?.room) return grants;
  const room = save.guild.room, seen = new Set(), placed = {};
  for (const entry of (Array.isArray(room.decorations) ? room.decorations : []).slice(0, MAX_ROOM_DECOR)) {
    if (!entry || !/^decor-\d{1,8}$/.test(entry.id) || seen.has(entry.id) || !ROOM_DECOR.some(item => item.id === entry.type)) continue;
    seen.add(entry.id);
    const id = guildItemId("decor", entry.type); placed[id] = (placed[id] || 0) + 1;
  }
  for (const [id, count] of Object.entries(placed)) grants[id] = Math.max(grants[id] || 0, count);
  if (ROOM_WALLS.some(wall => wall.id === room.wall)) grants[guildItemId("wall", room.wall)] = 1;
  if (ROOM_FLOORS.some(floor => floor.id === room.floor)) grants[guildItemId("floor", room.floor)] = 1;
  return grants;
}
