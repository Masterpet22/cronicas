import { roomDecor, fitRoomDecoration, ROOM_FLOOR } from "./guild.js?v=0.126.0";

// Las coordenadas guardadas siguen siendo las de la sala original desplegada.
// Solo esta proyección conoce la cámara: cambiarla no borra las decoraciones.
export const ROOM_VIEW = Object.freeze({ width: 1000, height: 700 });
const FLOOR_SPAN = ROOM_FLOOR.right - ROOM_FLOOR.left, FLOOR_DEPTH = ROOM_FLOOR.bottom - ROOM_FLOOR.top, WALL_HEIGHT = 237 / 345;
export function projectRoomDecoration(entry) {
  const item = roomDecor(entry.type);
  if (item.category === "wall") {
    const right = entry.x > 500;
    return { x: right ? 500 + (entry.x - 500) * .88 : 60 + entry.x * .88,
      y: (right ? 28 + (entry.x - 500) * .38 : 218 - entry.x * .38) + (entry.y - 40) * WALL_HEIGHT,
      surface: right ? "right" : "left" };
  }
  const u = (entry.x - ROOM_FLOOR.left) / FLOOR_SPAN, v = (entry.y - ROOM_FLOOR.top) / FLOOR_DEPTH;
  return { x: 500 + (u - v) * 440, y: 265 + (u + v) * 190, surface: "floor" };
}
function unproject(point, surface) {
  if (surface === "floor") {
    const u = ((point.x - 500) / 440 + (point.y - 265) / 190) / 2;
    const v = ((point.y - 265) / 190 - (point.x - 500) / 440) / 2;
    return { x: ROOM_FLOOR.left + u * FLOOR_SPAN, y: ROOM_FLOOR.top + v * FLOOR_DEPTH };
  }
  const right = surface === "right", x = right ? 500 + (point.x - 500) / .88 : (point.x - 60) / .88;
  const top = right ? 28 + (x - 500) * .38 : 218 - x * .38;
  return { x, y: 40 + (point.y - top) / WALL_HEIGHT };
}
export function roomPointToPlacement(type, point) {
  const item = roomDecor(type);
  if (!item) return null;
  const surface = item.category === "floor" ? "floor" : point.x > 500 ? "right" : "left";
  const position = unproject(point, surface);
  const inside = surface === "floor"
    ? position.x >= ROOM_FLOOR.left && position.x <= ROOM_FLOOR.right && position.y >= ROOM_FLOOR.top && position.y <= ROOM_FLOOR.bottom
    : position.x >= 0 && position.x <= 1000 && position.y >= 40 && position.y <= 385;
  return inside ? position : null;
}
export function moveRoomDecoration(entry, dx, dy) {
  const point = projectRoomDecoration(entry);
  const position = unproject({ x: point.x + dx, y: point.y + dy }, point.surface);
  return fitRoomDecoration({ ...entry, ...position });
}
export function roomDecorationStyle(entry, index = 0) {
  const item = roomDecor(entry.type), point = projectRoomDecoration(entry);
  const wall = item.category === "wall", factor = wall ? 1 : .84;
  const height = wall ? item.height : item.width * .8;
  const transform = wall ? `translate(-50%,-50%) matrix(.88,${point.surface === "left" ? "-.38" : ".38"},0,${WALL_HEIGHT},0,0)` : `translate(-50%,-${item.floorAnchor * 100}%)`;
  const depth = wall ? 100 + index : 1000 + Math.round(point.y) * 25 + index;
  const order = entry.layer ? (wall ? 500 : 20000) + entry.layer : depth;
  return `left:${point.x / 10}%;top:${point.y / 7}%;width:${item.width * entry.scale * factor / 10}%;height:${height * entry.scale * factor / 7}%;transform:${transform};z-index:${order}`;
}
