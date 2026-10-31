import { ROOM_WALLS, ROOM_FLOORS, ROOM_DECOR, MAX_ROOM_DECOR, CLAN_EMBLEMS, CLAN_COLORS, guildItemId } from "./guild-catalog.js?v=0.126.0";
export { ROOM_WALLS, ROOM_FLOORS, ROOM_DECOR, MAX_ROOM_DECOR, CLAN_EMBLEMS, CLAN_COLORS, guildItemId } from "./guild-catalog.js?v=0.126.0";
export const ROOM_FLOOR = Object.freeze({ left: 35, right: 965, top: 400, bottom: 630 });
const choice = (entries, id) => entries.find(entry => entry.id === id) || entries[0];
const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export const roomDecor = id => ROOM_DECOR.find(entry => entry.id === id);
export function floorDecorationBounds(type, scale = 1) {
  // Huella de la base sobre cada eje del suelo (0–1), independiente de la altura del dibujo.
  const inset = roomDecor(type).footprint * scale / 2;
  const dx = (ROOM_FLOOR.right - ROOM_FLOOR.left) * inset, dy = (ROOM_FLOOR.bottom - ROOM_FLOOR.top) * inset;
  return { left: Math.ceil(ROOM_FLOOR.left + dx), right: Math.floor(ROOM_FLOOR.right - dx),
    top: Math.ceil(ROOM_FLOOR.top + dy), bottom: Math.floor(ROOM_FLOOR.bottom - dy) };
}
export function guildOwnedCount(save, surface, value) {
  const count = Number(save?.inventory?.items?.[guildItemId(surface, value)]);
  return Number.isFinite(count) ? Math.max(0, Math.min(surface === "decor" ? 99 : 1, Math.floor(count))) : 0;
}
export const placedDecorationCount = (save, type, room = save?.guild?.room) => (room?.decorations || []).filter(entry => entry.type === type).length;
export const availableRoomDecoration = (save, type, room) => Math.max(0, guildOwnedCount(save, "decor", type) - placedDecorationCount(save, type, room));
export const decorationUnlocked = (save, item) => Boolean(item && guildOwnedCount(save, "decor", item.id));
export function fitRoomDecoration(entry) {
  const item = roomDecor(entry.type), scale = Math.max(.75, Math.min(1.25, number(entry.scale, 1)));
  const halfWidth = item.width * scale / 2, halfHeight = item.height * scale / 2;
  const wall = item.category === "wall", footprint = wall ? null : floorDecorationBounds(item.id, scale);
  const rightWall = number(entry.x, 500) > 500;
  const left = wall ? (rightWall ? 515 : 35) + halfWidth : footprint.left;
  const right = wall ? (!rightWall ? 485 : 965) - halfWidth : footprint.right;
  const top = wall ? 40 + halfHeight : footprint.top, bottom = wall ? 385 - halfHeight : footprint.bottom;
  return { id: entry.id, type: item.id, scale,
    ...(entry.layer ? { layer: Math.max(1, Math.min(MAX_ROOM_DECOR, Math.floor(number(entry.layer, 1)))) } : {}),
    x: Math.round(Math.max(left, Math.min(right, number(entry.x, 500)))),
    y: Math.round(Math.max(top, Math.min(bottom, number(entry.y, (top + bottom) / 2)))) };
}
export function defaultGuildState() {
  return { room: { wall: "jade", floor: "cedar", nextId: 3, decorations: [
    { id: "decor-1", type: "novice", x: 220, y: 190, scale: 1 },
    { id: "decor-2", type: "plant", x: 520, y: 510, scale: 1 }
  ] }, clanDraft: { name: "", tag: "", motto: "", emblem: "sun", color: "wine" } };
}
export function normalizeGuildState(candidate, save) {
  const defaults = defaultGuildState(), room = candidate?.room || {}, draft = candidate?.clanDraft || {};
  const seen = new Set(), used = {};
  const decorations = (Array.isArray(room.decorations) ? room.decorations : defaults.room.decorations).slice(0, MAX_ROOM_DECOR).flatMap(entry => {
    if (!entry || !/^decor-\d{1,8}$/.test(entry.id) || seen.has(entry.id) || !decorationUnlocked(save, roomDecor(entry.type))) return [];
    if ((used[entry.type] || 0) >= guildOwnedCount(save, "decor", entry.type)) return [];
    seen.add(entry.id); used[entry.type] = (used[entry.type] || 0) + 1;
    return [fitRoomDecoration(entry)];
  });
  return { room: { wall: guildOwnedCount(save, "wall", room.wall) ? choice(ROOM_WALLS, room.wall).id : "jade", floor: guildOwnedCount(save, "floor", room.floor) ? choice(ROOM_FLOORS, room.floor).id : "cedar",
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
    if (!entries.some(entry => entry.id === action.value) || !guildOwnedCount(save, action.surface, action.value)) return fail("Compra este acabado en la Tienda antes de usarlo.");
    room[action.surface] = action.value;
  } else if (action.type === "add") {
    const item = roomDecor(action.item);
    if (!item || !availableRoomDecoration(save, item.id, room)) return fail("Compra más unidades en la Tienda o retira una decoración de este tipo para volver a colocarla.");
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
    else if (action.type === "front") {
      const layers = room.decorations.filter(entry => entry.layer && entry.id !== action.id).sort((a, b) => a.layer - b.layer);
      layers.forEach((entry, order) => { entry.layer = order + 1; });
      room.decorations[index].layer = layers.length + 1;
      room.decorations.push(...room.decorations.splice(index, 1));
    }
    else return fail("Acción no disponible.");
  }
  return { ok: true, save: { ...save, guild }, message };
}
export function saveClanDraft(save, draft) {
  return { ...save, guild: normalizeGuildState({ ...normalizeGuildState(save.guild, save), clanDraft: draft }, save) };
}
