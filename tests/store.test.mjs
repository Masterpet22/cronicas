import assert from "node:assert/strict";
import { ITEMS, sellPrice } from "../src/items.js";
import { purchaseItem, sellItem, equipItem, equipCosmetic, countItem, unlockAffinityWithScroll } from "../src/inventory.js";
import { createCharacter, createDefaultSave, normalizeSave, derivedStats, completeMission, startMissionProgress, abandonMissionProgress } from "../src/save.js";
import { SECONDARY_MISSIONS } from "../src/content/index.js";
import { missionState } from "../src/mission-system.js";

let save = createCharacter(createDefaultSave(), { name: "Comerciante", affinity: "fuego", hair: 0 });
save.progression.coins = 5000;
const snapshot = structuredClone(save);
assert.equal(sellItem(save, "kunai").ok, false, "No se vende equipo activo");
save = equipItem(save, "weapon", null).save;
let result = sellItem(save, "kunai");
assert.equal(result.ok, true);
assert.equal(result.save.progression.coins, 5015);
save = normalizeSave(result.save);
assert.equal(countItem(save, "kunai"), 0, "Vender el arma inicial no la regenera");
assert.equal(save.equipment.weapon, null);
assert.equal(sellItem(save, "kunai").ok, false);
assert.equal(snapshot.equipment.weapon, "kunai", "Las operaciones son inmutables");
assert.equal(sellPrice(ITEMS.seal_vitality), 47);
save = purchaseItem(save, "health_potion", 3).save;
for (const quantity of [-1, 0, 1.5, Infinity, 4]) assert.equal(sellItem(save, "health_potion", quantity).ok, false);
result = sellItem(save, "health_potion", 2);
assert.equal(result.save.progression.coins, save.progression.coins + 18);
assert.equal(countItem(result.save, "health_potion"), 1);
save = result.save;
assert.equal(sellItem(save, "substitution_log").ok, false);
assert.equal(equipCosmetic(save, "substitution_dog").ok, false);
save = purchaseItem(save, "substitution_dog").save;
save = equipCosmetic(save, "substitution_dog").save;
assert.equal(normalizeSave(save).character.teleportObject, "dog");
assert.equal(sellItem(save, "substitution_dog").ok, false);
save = equipCosmetic(save, "substitution_log").save;
save = sellItem(save, "substitution_dog").save;
assert.equal(countItem(normalizeSave(save), "substitution_dog"), 0);

const before = derivedStats(save);
for (const id of ["top_shadow", "bottom_traveler", "face_mask", "shoes_sandals", "hair_ponytail", "shadow_outfit"]) {
  save = purchaseItem(save, id).save;
  save = equipCosmetic(save, id).save;
}
assert.deepEqual(derivedStats(save), before, "La ropa común no altera el combate");
assert.equal(normalizeSave(save).character.hair, 4);
assert.equal(sellItem(save, "hair_ponytail").ok, false);
save = purchaseItem(save, "channeler_outfit").save;
save = equipCosmetic(save, "channeler_outfit").save;
assert.ok(derivedStats(save).maxChakra > before.maxChakra, "El traje especial declara su efecto");

const old = { ...snapshot, version: 19, equipment: { weapon: "kunai", armor: "shadow_outfit", accessory: "chakra_charm" },
  inventory: { items: { kunai: 1, shadow_outfit: 1, chakra_charm: 1 }, extraAffinityUnlocked: false } };
const migrated = normalizeSave(old);
assert.equal(migrated.equipment.seal, "seal_shadow");
assert.equal(countItem(migrated, "shadow_outfit"), 1);
assert.equal(migrated.equipment.armor, undefined);
assert.deepEqual(normalizeSave(migrated), migrated, "La migración se aplica una sola vez");

save = purchaseItem(save, "affinity_scroll").save;
save.character.affinities = ["fuego", "agua"];
save.character.knownAffinities = ["fuego", "agua"];
save.progression.level = 20;
assert.equal(unlockAffinityWithScroll(save, "viento").ok, false, "Un Novicio no usa el pergamino");
save.campaign.rank = "Guardián"; save.progression.level = 9;
assert.equal(unlockAffinityWithScroll(save, "viento").ok, false);
save.progression.level = 10;
save = unlockAffinityWithScroll(save, "viento").save;
assert.equal(normalizeSave(save).character.affinities.length, 3);
assert.equal(countItem(save, "affinity_scroll"), 0);

for (const mission of SECONDARY_MISSIONS) {
  assert.equal(missionState(mission, save).unlocked, false);
  save = purchaseItem(save, mission.contractItem).save;
  assert.equal(missionState(mission, save).unlocked, true);
  const active = startMissionProgress(save, mission.id);
  assert.equal(sellItem(active, mission.contractItem).ok, false);
  assert.equal(sellItem(abandonMissionProgress(active, mission.id), mission.contractItem).ok, true);
  const completion = completeMission(active, mission.id);
  assert.equal(completion.firstClear, true);
  save = normalizeSave(completion.save);
  assert.ok(save.campaign.completedSecondaryMissions.includes(mission.id));
  assert.equal(countItem(save, mission.contractItem), 0);
  for (const id of Object.keys(mission.reward.items)) assert.equal(countItem(save, id), 1);
  assert.equal(completeMission(save, mission.id).firstClear, false, "No se duplican recompensas");
  assert.equal(purchaseItem(save, mission.contractItem).ok, false);
}
const withoutCompanion = derivedStats(save);
save = equipItem(save, "companion", "companion_hound").save;
assert.equal(normalizeSave(save).equipment.companion, "companion_hound");
assert.equal(derivedStats(save).accuracy, withoutCompanion.accuracy + 3);
assert.equal(derivedStats(save).luck, withoutCompanion.luck + 2);
console.log("Tienda: venta a mitad, propiedad, sustitución, cosméticos, sellos, Guardián nivel 10 y contratos con recompensas únicas verificados.");
