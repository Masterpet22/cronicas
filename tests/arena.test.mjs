import assert from "node:assert/strict";
import { ARENA_RIVALS, ARENA_DIFFICULTIES, normalizeArenaSettings, arenaPreview, arenaRivalProfile, createExhibition } from "../src/arena.js";
import { createCharacter, createDefaultSave, derivedStats } from "../src/save.js";
import { ALL_MISSIONS } from "../src/content/index.js";
import { ENEMY_ROSTER, ENEMY_ACTIONS } from "../src/data.js";
import { consumeBattleItem, itemUseReason } from "../src/battle/battle-inventory.js";

const save = createCharacter(createDefaultSave(), { name: "Exhibición", bodyType: "female", affinity: "agua", skinTone: "moreno" });
save.inventory.items.health_potion = 2;
save.inventory.items.retry_scroll = 1;
const before = structuredClone(save), rosterBefore = structuredClone(ENEMY_ROSTER);
assert.equal(ARENA_RIVALS.length, 4);
assert.equal(ARENA_DIFFICULTIES.length, 3);
assert.deepEqual(normalizeArenaSettings({ rival: "bad", difficulty: "bad" }), { rival: "fire", difficulty: "balanced" });
assert.deepEqual(normalizeArenaSettings(null), { rival: "fire", difficulty: "balanced" });
for (const rival of ARENA_RIVALS) {
  let previousHealth = 0, previousStrength = 0;
  for (const difficulty of ARENA_DIFFICULTIES) {
    const settings = { rival: rival.id, difficulty: difficulty.id }, mission = createExhibition(settings);
    assert.equal(mission.exhibition, true);
    assert.equal(ALL_MISSIONS.some(entry => entry.id === mission.id), false, "La exhibición no es una misión del catálogo");
    assert.equal(mission.encounters.length, 1);
    assert.ok(ENEMY_ROSTER[mission.encounters[0]]);
    const { player, enemy, profile } = arenaPreview(save, settings);
    assert.deepEqual(player, derivedStats(save));
    assert.equal(profile.affinity, rival.affinity);
    assert.equal(profile.level, save.progression.level);
    assert.equal(enemy.hp, enemy.maxHp);
    assert.equal(enemy.chakra, enemy.maxChakra);
    assert.equal(enemy.boss, false);
    assert.ok(enemy.maxHp > previousHealth && enemy.strength >= previousStrength);
    assert.ok(profile.pattern.every(id => ENEMY_ACTIONS[id]));
    previousHealth = enemy.maxHp; previousStrength = enemy.strength;
  }
}
const veteran = structuredClone(save); veteran.progression.level = 15;
assert.ok(arenaRivalProfile(veteran, {}).stats.health > arenaRivalProfile(save, {}).stats.health);
assert.deepEqual(save, before, "Preparar y comparar duelos no cambia al personaje");
assert.deepEqual(ENEMY_ROSTER, rosterBefore, "La adaptación no modifica los rivales de la campaña");
const scene = { mission: createExhibition({}), saveData: save };
let writes = 0;
assert.equal(consumeBattleItem(scene, "health_potion", () => writes++).ok, false);
assert.equal(consumeBattleItem(scene, "retry_scroll", () => writes++).ok, false);
assert.match(itemUseReason(scene, "health_potion"), /desactivados/);
assert.equal(writes, 0);
assert.deepEqual(save, before);
console.log("Arena: rivales adaptados, dificultades, catálogo separado y protección de consumibles verificados.");
