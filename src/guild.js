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
export const ROOM_DECOR = Object.freeze([
  { id: "landscape", name: "Cuadro del horizonte", category: "wall", width: 190, height: 132, detail: "Montañas bajo la luna." },
  { id: "scroll", name: "Pergamino de disciplina", category: "wall", width: 96, height: 178, detail: "Un recordatorio de tu camino." },
  { id: "lantern", name: "Farol de papel", category: "wall", width: 92, height: 150, detail: "Una luz cálida para tu rincón." },
  { id: "plant", name: "Bonsái", category: "floor", width: 142, height: 154, detail: "Un pequeño árbol en maceta." },
  { id: "table", name: "Mesa de té", category: "floor", width: 225, height: 120, detail: "Té y descanso entre misiones." },
  { id: "cushion", name: "Cojín granate", category: "floor", width: 126, height: 72, detail: "Un asiento junto a la mesa." },
  { id: "novice", name: "Insignia de novicio", category: "wall", width: 108, height: 116, detail: "Tu primer rango en la aldea." },
  { id: "medal", name: "Medalla de misión", category: "wall", width: 102, height: 126, detail: "Completa una misión para exhibirla.", missions: 1 },
  { id: "trophy", name: "Trofeo del viajero", category: "floor", width: 110, height: 146, detail: "Completa tres misiones para exhibirlo.", missions: 3 },
  { id: "guardian", name: "Insignia de Guardián", category: "wall", width: 122, height: 140, detail: "Alcanza el rango Guardián para exhibirla.", guardian: true }
]);
export const MAX_ROOM_DECOR = 24;
const choice = (entries, id) => entries.find(entry => entry.id === id) || entries[0];
const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export const roomDecor = id => ROOM_DECOR.find(entry => entry.id === id);
export function decorationUnlocked(save, item) {
  const completed = new Set([...(save?.campaign?.completedMissions || []), ...(save?.campaign?.completedSecondaryMissions || [])]).size;
  return Boolean(item && (!item.missions || completed >= item.missions) && (!item.guardian || save?.campaign?.rank === "Guardián"));
}
export function fitRoomDecoration(entry) {
  const item = roomDecor(entry.type), scale = Math.max(.75, Math.min(1.25, number(entry.scale, 1)));
  const halfWidth = item.width * scale / 2, halfHeight = item.height * scale / 2;
  const top = item.category === "wall" ? 40 : 400, bottom = item.category === "wall" ? 385 : 630;
  return { id: entry.id, type: item.id, scale,
    x: Math.round(Math.max(35 + halfWidth, Math.min(965 - halfWidth, number(entry.x, 500)))),
    y: Math.round(Math.max(top + halfHeight, Math.min(bottom - halfHeight, number(entry.y, (top + bottom) / 2)))) };
}
export function defaultGuildState() {
  return { room: { wall: "jade", floor: "cedar", nextId: 5, decorations: [
    { id: "decor-1", type: "landscape", x: 220, y: 210, scale: 1 },
    { id: "decor-2", type: "lantern", x: 845, y: 155, scale: 1 },
    { id: "decor-3", type: "table", x: 520, y: 510, scale: 1 },
    { id: "decor-4", type: "cushion", x: 475, y: 594, scale: 1 }
  ] }, clanDraft: { name: "", tag: "", motto: "", emblem: "sun", color: "wine" } };
}
export function normalizeGuildState(candidate, save) {
  const defaults = defaultGuildState(), room = candidate?.room || {}, draft = candidate?.clanDraft || {};
  const seen = new Set();
  const decorations = (Array.isArray(room.decorations) ? room.decorations : defaults.room.decorations).slice(0, MAX_ROOM_DECOR).flatMap(entry => {
    if (!entry || !/^decor-\d{1,8}$/.test(entry.id) || seen.has(entry.id) || !decorationUnlocked(save, roomDecor(entry.type))) return [];
    seen.add(entry.id);
    return [fitRoomDecoration(entry)];
  });
  return { room: { wall: choice(ROOM_WALLS, room.wall).id, floor: choice(ROOM_FLOORS, room.floor).id,
    nextId: Math.max(1, Math.min(99999999, Math.floor(number(room.nextId, 1))), ...decorations.map(entry => Number(entry.id.slice(6)) + 1)), decorations },
    clanDraft: { name: String(draft.name || "").trim().slice(0, 24), tag: String(draft.tag || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4),
      motto: String(draft.motto || "").trim().slice(0, 90), emblem: choice(CLAN_EMBLEMS, draft.emblem).id, color: choice(CLAN_COLORS, draft.color).id } };
}
export function updateGuildRoom(save, action) {
  const guild = normalizeGuildState(save.guild, save), room = guild.room;
  let message = "Decoración guardada.";
  const fail = message => ({ ok: false, save, message });
  if (action.type === "finish") {
    const entries = action.surface === "wall" ? ROOM_WALLS : action.surface === "floor" ? ROOM_FLOORS : [];
    if (!entries.some(entry => entry.id === action.value)) return fail("Acabado no disponible.");
    room[action.surface] = action.value;
  } else if (action.type === "add") {
    const item = roomDecor(action.item);
    if (!decorationUnlocked(save, item)) return fail(item?.detail || "Decoración no disponible.");
    if (room.decorations.length >= MAX_ROOM_DECOR) return fail(`Tu espacio admite hasta ${MAX_ROOM_DECOR} decoraciones. Retira alguna para colocar otra.`);
    const id = `decor-${room.nextId++}`;
    room.decorations.push(fitRoomDecoration({ id, type: item.id, x: action.x, y: action.y, scale: 1 }));
    return { ok: true, save: { ...save, guild }, selected: id, message: `${item.name} colocado. Puedes moverlo o retirarlo.` };
  } else {
    const index = room.decorations.findIndex(entry => entry.id === action.id);
    if (index < 0) return fail("Selecciona una decoración.");
    if (action.type === "remove") { room.decorations.splice(index, 1); message = "Decoración retirada. Sigue disponible en el catálogo."; }
    else if (action.type === "move") room.decorations[index] = fitRoomDecoration({ ...room.decorations[index], x: action.x, y: action.y });
    else if (action.type === "scale") room.decorations[index] = fitRoomDecoration({ ...room.decorations[index], scale: action.value });
    else if (action.type === "front") room.decorations.push(...room.decorations.splice(index, 1));
    else return fail("Acción no disponible.");
  }
  return { ok: true, save: { ...save, guild }, message };
}
export function saveClanDraft(save, draft) {
  return { ...save, guild: normalizeGuildState({ ...normalizeGuildState(save.guild, save), clanDraft: draft }, save) };
}
