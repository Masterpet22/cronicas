import assert from "node:assert/strict";
import { ITEMS, SHOP_ITEMS, sellPrice } from "../src/items.js";
import { GUILD_ITEMS, GUILD_STARTER_ITEMS } from "../src/guild-catalog.js";
import { guildOwnedCount, availableRoomDecoration, defaultGuildState, updateGuildRoom } from "../src/guild.js";
import { purchaseItem, sellItem, sellableItemCount, countItem, removeItem } from "../src/inventory.js";
import { createCharacter, createDefaultSave, normalizeSave, writeSave, loadSave, derivedStats } from "../src/save.js";

const fresh = () => createCharacter(createDefaultSave(), { name: "Decorador", affinity: "agua" });
let save = fresh(); save.progression.coins = 5000;
const original = structuredClone(save);
assert.deepEqual(Object.keys(save.inventory.items).filter(id => id.startsWith("guild_")).sort(), [...GUILD_STARTER_ITEMS].sort());
assert.deepEqual(save.guild, defaultGuildState());
assert.equal(guildOwnedCount(save, "wall", "jade"), 1);
assert.equal(guildOwnedCount(save, "wall", "sand"), 1);
assert.equal(guildOwnedCount(save, "floor", "cedar"), 1);
assert.equal(guildOwnedCount(save, "wall", "plum"), 0);
assert.deepEqual(save.guild.room.decorations.map(entry => entry.type).sort(), ["novice", "plant"]);
for (const item of GUILD_ITEMS) {
  assert.deepEqual(ITEMS[item.id], item);
  assert.ok(SHOP_ITEMS.some(entry => entry.id === item.id), `${item.id} aparece en la Tienda`);
}
assert.equal(updateGuildRoom(save, { type: "finish", surface: "wall", value: "plum" }).ok, false);
assert.equal(updateGuildRoom(save, { type: "finish", surface: "floor", value: "stone" }).ok, false);
assert.equal(updateGuildRoom(save, { type: "add", item: "landscape" }).ok, false);
assert.equal(updateGuildRoom(save, { type: "add", item: "plant" }).ok, false, "Una unidad ya colocada no se duplica gratis");
assert.equal(sellItem(save, "guild_decor_plant").ok, false);
assert.equal(removeItem(save, "guild_decor_plant").ok, false, "No se consumen muebles como objetos de misión");

for (const id of ["guild_wall_plum", "guild_floor_stone"]) {
  const purchase = purchaseItem(save, id);
  assert.equal(purchase.ok, true); save = purchase.save;
  assert.equal(purchaseItem(save, id).ok, false, "Los acabados se compran una vez");
}
save = updateGuildRoom(save, { type: "finish", surface: "wall", value: "plum" }).save;
save = updateGuildRoom(save, { type: "finish", surface: "floor", value: "stone" }).save;
assert.equal(sellItem(save, "guild_wall_plum").ok, false, "No se vende un acabado en uso");
assert.equal(sellItem(save, "guild_floor_stone").ok, false);
save = purchaseItem(save, "guild_decor_table", 2).save;
let placement = updateGuildRoom(save, { type: "add", item: "table" });
assert.equal(placement.ok, true); save = placement.save;
const tableId = placement.selected;
assert.equal(availableRoomDecoration(save, "table"), 1);
assert.equal(sellableItemCount(save, "guild_decor_table"), 1);
assert.equal(sellItem(save, "guild_decor_table", 2).ok, false, "Solo se venden las unidades sin colocar");
const coins = save.progression.coins;
save = sellItem(save, "guild_decor_table").save;
assert.equal(save.progression.coins, coins + sellPrice(ITEMS.guild_decor_table));
assert.equal(countItem(save, "guild_decor_table"), 1);
assert.equal(sellItem(save, "guild_decor_table").ok, false);
save = updateGuildRoom(save, { type: "remove", id: tableId }).save;
assert.equal(availableRoomDecoration(save, "table"), 1, "Retirar devuelve la unidad al catálogo");
save = updateGuildRoom(save, { type: "add", item: "table" }).save;
assert.equal(updateGuildRoom(save, { type: "add", item: "table" }).ok, false);
assert.deepEqual(derivedStats(save), derivedStats(original), "La decoración no altera el combate");
assert.deepEqual(save.character, original.character);
assert.deepEqual(save.campaign, original.campaign);

const beforeFailed = structuredClone(save);
assert.equal(purchaseItem(save, "guild_decor_guardian", 100).ok, false);
assert.equal(purchaseItem({ ...save, progression: { ...save.progression, coins: 0 } }, "guild_decor_landscape").ok, false);
assert.deepEqual(save, beforeFailed);
const values = new Map(), storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
writeSave(save, storage);
assert.deepEqual(loadSave(storage).guild, save.guild);
assert.deepEqual(loadSave(storage).inventory, save.inventory);

const legacy = fresh(); legacy.version = 23;
for (const id of GUILD_STARTER_ITEMS) delete legacy.inventory.items[id];
legacy.guild.room = { wall: "ivory", floor: "walnut", nextId: 7, decorations: [
  { id: "decor-1", type: "landscape", x: 200, y: 150, scale: 1 },
  { id: "decor-2", type: "landscape", x: 750, y: 150, scale: 1 },
  { id: "decor-3", type: "table", x: 500, y: 510, scale: 1 }
] };
const migrated = normalizeSave(legacy);
assert.equal(migrated.version, 26);
assert.equal(countItem(migrated, "guild_decor_landscape"), 2);
assert.equal(countItem(migrated, "guild_decor_table"), 1);
assert.equal(countItem(migrated, "guild_wall_ivory"), 1);
assert.equal(countItem(migrated, "guild_floor_walnut"), 1);
assert.equal(countItem(migrated, "guild_decor_guardian"), 0, "La migración no desbloquea todo el catálogo");
assert.equal(migrated.guild.room.decorations.length, 3);
assert.deepEqual(normalizeSave(migrated), migrated, "No se vuelven a conceder unidades después de migrar");
let sold = updateGuildRoom(migrated, { type: "finish", surface: "wall", value: "jade" }).save;
sold = sellItem(sold, "guild_wall_ivory").save;
assert.equal(countItem(normalizeSave(sold), "guild_wall_ivory"), 0, "Vender no regenera el acabado");
assert.equal(normalizeSave(sold).guild.room.wall, "jade");
assert.deepEqual(createCharacter(save, { name: "Otro", affinity: "fuego" }).inventory, fresh().inventory, "Otro personaje recibe solo la colección inicial");
console.log("Decoraciones: colección inicial, compras por unidad, acabados, venta segura y migración v24 verificadas.");
