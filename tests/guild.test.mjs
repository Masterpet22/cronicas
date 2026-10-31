import assert from "node:assert/strict";
import { defaultGuildState, normalizeGuildState, updateGuildRoom, saveClanDraft, decorationUnlocked, roomDecor, MAX_ROOM_DECOR, ROOM_DECOR, ROOM_FLOOR, fitRoomDecoration, floorDecorationBounds } from "../src/guild.js";
import { createCharacter, createDefaultSave, normalizeSave, writeSave, loadSave, selectSaveSlot, derivedStats } from "../src/save.js";
import { GUILD_ITEMS } from "../src/guild-catalog.js";
import { purchaseItem } from "../src/inventory.js";
import { projectRoomDecoration, roomPointToPlacement, moveRoomDecoration, roomDecorationStyle } from "../src/guild-room.js";

const make = name => {
  const save = createCharacter(createDefaultSave(), { name, affinity: "agua", bodyType: "female" });
  save.progression.coins = 5000;
  for (const item of GUILD_ITEMS) if (!["medal", "guardian", "trophy"].includes(item.value)) save.inventory.items[item.id] = item.stackLimit;
  return save;
};
let save = make("Hogar");
assert.deepEqual(save.guild, defaultGuildState());
const before = structuredClone(save);
save = updateGuildRoom(save, { type: "finish", surface: "wall", value: "plum" }).save;
save = updateGuildRoom(save, { type: "finish", surface: "floor", value: "stone" }).save;
assert.equal(before.guild.room.wall, "jade", "Las acciones no modifican el estado anterior");
assert.equal(save.guild.room.wall, "plum");
assert.equal(save.guild.room.floor, "stone");
assert.deepEqual(save.progression, before.progression, "Decorar es gratuito");
assert.deepEqual(save.inventory, before.inventory);
assert.deepEqual(derivedStats(save), derivedStats(before));
assert.equal(updateGuildRoom(save, { type: "finish", surface: "floor", value: "url(evil)" }).ok, false);
const add = updateGuildRoom(save, { type: "add", item: "plant", x: -100, y: -500 });
save = add.save;
let plant = save.guild.room.decorations.find(entry => entry.id === add.selected);
assert.ok(plant.y >= ROOM_FLOOR.top && plant.y < 420, "La planta puede llegar al fondo: su altura no reserva suelo vacío");
assert.ok(plant.x > 0);
save = updateGuildRoom(save, { type: "move", id: plant.id, x: 99999, y: 99999 }).save;
plant = save.guild.room.decorations.find(entry => entry.id === plant.id);
assert.ok(plant.x > 920 && plant.x <= ROOM_FLOOR.right && plant.y > 610 && plant.y <= ROOM_FLOOR.bottom, "La maceta también llega a los bordes delanteros");
save = updateGuildRoom(save, { type: "scale", id: plant.id, value: 999 }).save;
assert.equal(save.guild.room.decorations.find(entry => entry.id === plant.id).scale, 1.25);
save = updateGuildRoom(save, { type: "front", id: "decor-1" }).save;
assert.equal(save.guild.room.decorations.at(-1).id, "decor-1");
save = updateGuildRoom(save, { type: "remove", id: plant.id }).save;
assert.ok(!save.guild.room.decorations.some(entry => entry.id === plant.id));
assert.equal(updateGuildRoom(save, { type: "add", item: "guardian" }).ok, false);
assert.equal(updateGuildRoom(save, { type: "add", item: "medal" }).ok, false);
const earned = { ...save, campaign: { ...save.campaign, completedMissions: ["first", "second", "third"], rank: "Guardián" } };
for (const id of ["medal", "trophy", "guardian"]) {
  assert.equal(decorationUnlocked(earned, roomDecor(id)), false, "El rango no sustituye la compra");
  const purchase = purchaseItem(earned, `guild_decor_${id}`);
  assert.equal(purchase.ok, true);
  assert.equal(decorationUnlocked(purchase.save, roomDecor(id)), true);
}
save = saveClanDraft(save, { name: "  Cuervos del alba  ", tag: "a@lbA<", motto: "Un mismo camino.", emblem: "moon", color: "blue" });
assert.deepEqual(save.guild.clanDraft, { name: "Cuervos del alba", tag: "ALBA", motto: "Un mismo camino.", emblem: "moon", color: "blue" });
const legacy = structuredClone(before); legacy.version = 21; delete legacy.guild;
assert.deepEqual(normalizeSave(legacy).guild, defaultGuildState(), "Las partidas anteriores reciben la sala inicial");
assert.deepEqual(normalizeSave(save).guild, save.guild, "El guardado es idempotente");
const damaged = { room: { wall: "bad", floor: "bad", decorations: [null, { id: "x", type: "plant" }, { id: "decor-1", type: "guardian" }, { id: "decor-2", type: "scroll", x: Infinity, y: -999, scale: -1 }, { id: "decor-2", type: "plant" }] }, clanDraft: { emblem: "bad", color: "#bad" } };
const normalized = normalizeGuildState(damaged, before);
assert.equal(normalized.room.decorations.length, 1);
assert.equal(normalized.room.decorations[0].scale, .75);
assert.equal(normalized.room.wall, "jade");
assert.equal(normalized.clanDraft.emblem, "sun");
let full = make("Completo");
while (full.guild.room.decorations.length < MAX_ROOM_DECOR) full = updateGuildRoom(full, { type: "add", item: "scroll" }).save;
assert.equal(updateGuildRoom(full, { type: "add", item: "scroll" }).ok, false);
assert.equal(new Set(full.guild.room.decorations.map(entry => entry.id)).size, MAX_ROOM_DECOR);
const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
selectSaveSlot(1, storage); writeSave(save, storage);
selectSaveSlot(2, storage); writeSave(make("Otra"), storage);
assert.equal(loadSave(storage).guild.room.wall, "jade");
selectSaveSlot(1, storage);
assert.deepEqual(loadSave(storage).guild, save.guild, "La sala y el borrador pertenecen a una partida concreta");
assert.deepEqual(createCharacter(save, { name: "Nuevo", affinity: "fuego" }).guild, defaultGuildState(), "Un personaje nuevo no hereda la sala de otro");
// La cámara y los controles comparten una proyección reversible, sin migrar la sala guardada.
for (const entry of defaultGuildState().room.decorations) {
  const point = projectRoomDecoration(entry), restored = roomPointToPlacement(entry.type, point);
  assert.ok(Math.abs(restored.x - entry.x) < .001 && Math.abs(restored.y - entry.y) < .001);
  const movable = roomDecor(entry.type).category === "floor" ? { ...entry, x: 500, y: 515 } : entry;
  const origin = projectRoomDecoration(movable);
  for (const [dx, dy] of [[15, 0], [-15, 0], [0, 15], [0, -15]]) {
    const moved = projectRoomDecoration(moveRoomDecoration(movable, dx, dy));
    assert.ok(Math.abs(moved.x - origin.x - dx) < 2, "Las flechas siguen la dirección horizontal de la pantalla");
    assert.ok(Math.abs(moved.y - origin.y - dy) < 2, "Las flechas siguen la dirección vertical de la pantalla");
  }
}
assert.equal(roomPointToPlacement("plant", { x: 500, y: 100 }), null, "No se colocan muebles en las paredes");
assert.equal(roomPointToPlacement("landscape", { x: 500, y: 500 }), null, "No se cuelgan cuadros en el suelo");
assert.equal(roomPointToPlacement("plant", { x: 20, y: 20 }), null, "Los clics fuera de la sala no colocan objetos");
for (const x of [35, 490, 510, 965]) {
  const added = updateGuildRoom(before, { type: "add", item: "landscape", x, y: 150 });
  const entry = added.save.guild.room.decorations.find(item => item.id === added.selected);
  const half = roomDecor(entry.type).width * entry.scale / 2;
  assert.ok(entry.x < 500 ? entry.x + half <= 485 : entry.x - half >= 515, "Los cuadros no atraviesan la esquina");
}
const rear = { id: "decor-20", type: "plant", x: 500, y: 480, scale: 1 };
const near = { ...rear, id: "decor-21", y: 550 };
const order = entry => Number(roomDecorationStyle(entry).match(/z-index:(\d+)/)[1]);
assert.ok(order(near) > order(rear), "Los muebles cercanos se dibujan sobre los del fondo");
let layered = { ...before, guild: { ...before.guild, room: { ...before.guild.room, decorations: [rear, near] } } };
for (let i = 0; i < 30; i++) layered = updateGuildRoom(layered, { type: "front", id: i % 2 ? rear.id : near.id }).save;
assert.ok(order(layered.guild.room.decorations.find(entry => entry.id === rear.id)) > order(layered.guild.room.decorations.find(entry => entry.id === near.id)));
assert.deepEqual(normalizeSave(layered).guild, layered.guild, "El orden manual también se conserva al guardar");
const groundContacts = {
  plant: [[65, 153], [139, 153]],
  table: [[26, 116], [38, 122], [153, 122], [165, 116], [93, 143], [107, 149]],
  cushion: [[14, 110], [187, 110], [101, 152], [99, 67]],
  trophy: [[50, 140], [150, 140], [50, 157], [150, 157]]
};
for (const item of ROOM_DECOR.filter(entry => entry.category === "floor")) {
  for (const scale of [.75, 1, 1.25]) for (const x of [-9999, 9999]) for (const y of [-9999, 9999]) {
    const entry = fitRoomDecoration({ id: "decor-50", type: item.id, x, y, scale });
    const u = (entry.x - ROOM_FLOOR.left) / (ROOM_FLOOR.right - ROOM_FLOOR.left);
    const v = (entry.y - ROOM_FLOOR.top) / (ROOM_FLOOR.bottom - ROOM_FLOOR.top);
    const halfBase = item.footprint * scale / 2;
    assert.ok(u - halfBase >= 0 && u + halfBase <= 1 && v - halfBase >= 0 && v + halfBase <= 1, `${item.id}: toda la base permanece dentro del suelo`);
    assert.ok(x < 0 ? u < .11 : u > .89, `${item.id}: no hay márgenes invisibles en los laterales`);
    assert.ok(y < 0 ? v < .11 : v > .89, `${item.id}: no hay márgenes invisibles en la profundidad`);
    const restored = roomPointToPlacement(item.id, projectRoomDecoration(entry));
    assert.ok(Math.abs(restored.x - entry.x) < .001 && Math.abs(restored.y - entry.y) < .001);
    const anchor = projectRoomDecoration(entry), width = item.width * scale * .84, height = width * .8;
    for (const [px, py] of groundContacts[item.id]) {
      const point = { x: anchor.x + (px / 200 - .5) * width, y: anchor.y + (py / 160 - item.floorAnchor) * height };
      assert.ok(roomPointToPlacement(item.id, point), `${item.id}: las patas o la maceta dibujadas no salen del suelo`);
    }
  }
}
assert.ok(floorDecorationBounds("plant").top < floorDecorationBounds("table").top, "El límite depende de la base de cada mueble");
assert.deepEqual(normalizeSave(before).guild, before.guild, "Las posiciones anteriores no cambian con los límites ampliados");
let edgeSave = updateGuildRoom(before, { type: "add", item: "plant", x: 80, y: 410 }).save;
const edgePlant = edgeSave.guild.room.decorations.at(-1);
assert.equal(edgePlant.y, 410);
writeSave(edgeSave, storage);
assert.deepEqual(loadSave(storage).guild, edgeSave.guild, "Las posiciones junto a las paredes se conservan al recargar");
console.log("Gremio: acabados, colocación, límites, insignias, migración y guardado por partida verificados.");
