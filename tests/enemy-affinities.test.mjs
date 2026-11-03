import assert from "node:assert/strict";
import { ABILITY_CATALOG, ENEMY_ROSTER } from "../src/data.js?v=1.5.0";
import { AFFINITY_IDS, applyAffinityStatModifiers } from "../src/affinity-system.js";
import { MISSIONS } from "../src/content/index.js";
import { createEnemyState, resolveEnemyProfileForBattle } from "../src/battle/enemy-state.js";
import { enemyAffinityOrder, enemyCanUseElement } from "../src/battle/enemy-affinities.js";
import { chooseEnemyAbility, reserveEnemyAbility } from "../src/battle/enemy-abilities.js";

const neutral = { flow: [] };
for (const profile of Object.values(ENEMY_ROSTER)) {
  const state = createEnemyState(profile, neutral);
  assert.ok(AFFINITY_IDS.includes(state.primaryAffinity));
  assert.equal(state.affinities[0], state.primaryAffinity);
  assert.equal(state.affinities.length, 1, "Los enemigos iniciales no tienen afinidades adicionales implícitas");
  for (const id of [...profile.pattern, ...(profile.phase2Pattern || [])]) {
    assert.ok(enemyCanUseElement(state, ABILITY_CATALOG[id]), `${profile.name} no puede usar ${id} con ${state.affinities}`);
  }
}
for (const mission of MISSIONS.filter(m => m.encounters)) for (const playerAffinity of AFFINITY_IDS) {
  for (const id of mission.encounters) {
    const profile = resolveEnemyProfileForBattle(ENEMY_ROSTER[id], mission, playerAffinity);
    const state = createEnemyState(profile, mission, {}, playerAffinity);
    assert.equal(state.affinities.length, 1);
    for (const actionId of [...profile.pattern, ...(profile.phase2Pattern || [])]) {
      assert.ok(enemyCanUseElement(state, ABILITY_CATALOG[actionId]), `${id}: el patrón adaptado al tutorial debe respetar su afinidad`);
    }
  }
}

const base = ENEMY_ROSTER.ash_adept;
assert.throws(() => createEnemyState({ ...base, affinity: undefined }, neutral), /afinidad dominante/);
assert.throws(() => enemyAffinityOrder({ ...base, affinities: ["agua"] }), /afinidad dominante/);
assert.throws(() => enemyAffinityOrder({ ...base, affinities: ["fuego", "fuego"] }), /afinidad dominante/);
assert.throws(() => enemyAffinityOrder({ ...base, affinities: ["fuego", "viento"], completedAffinityTrials: ["affinity_trial_2"] }), /nivel y pruebas/);
assert.throws(() => enemyAffinityOrder({ ...base, level: 15, affinities: ["fuego", "viento"] }), /nivel y pruebas/);
const dualProfile = { ...base, level: 15, affinities: ["fuego", "viento"], completedAffinityTrials: ["affinity_trial_2"] };
const dual = createEnemyState(dualProfile, neutral);
assert.deepEqual(dual.affinities, ["fuego", "viento"]);
assert.equal(dual.strengthModifier, applyAffinityStatModifiers(base.stats, dual.affinities).modifiers.strength);
assert.equal(enemyCanUseElement(dual, ABILITY_CATALOG.fire_embers), true);
assert.equal(enemyCanUseElement(dual, ABILITY_CATALOG.wind_palm), true);
assert.equal(enemyCanUseElement(dual, ABILITY_CATALOG.lightning_spark), true);
assert.equal(enemyCanUseElement(dual, ABILITY_CATALOG.water_bullet), false);
assert.equal(enemyCanUseElement(dual, ABILITY_CATALOG.toxin), false, "La exclusividad no concede afinidades de Veneno");
const triple = createEnemyState({ ...base, level: 30, affinities: ["fuego", "agua", "tierra"],
  completedAffinityTrials: ["affinity_trial_2", "affinity_trial_3"] }, neutral);
assert.equal(enemyCanUseElement(triple, ABILITY_CATALOG.toxin), true);
assert.equal(enemyCanUseElement(triple, { element: "plasma", seals: ["ara"] }), false, "Se conserva el bloqueo de elementos de nivel 4 del jugador");

const fire = createEnemyState(base, neutral);
const before = { hp: fire.hp, chakra: fire.chakra };
assert.equal(reserveEnemyAbility(fire, ABILITY_CATALOG.wind_palm), null);
assert.deepEqual({ hp: fire.hp, chakra: fire.chakra }, before, "Rechazar un elemento no cobra recursos");
assert.deepEqual(fire.cooldowns, {});
fire.reservedAction = ABILITY_CATALOG.wind_palm;
assert.equal(reserveEnemyAbility(fire, ABILITY_CATALOG.wind_palm), null, "No se puede eludir el control con una acción reservada");
fire.reservedAction = null;
assert.equal(chooseEnemyAbility({ pattern: ["wind_palm"] }, fire), ABILITY_CATALOG.strike);
assert.equal(enemyCanUseElement(fire, ABILITY_CATALOG.physical_1), true);
console.log("Afinidades enemigas: obligatorias, reglas comunes de elementos, progresión, patrones y bloqueo antes del coste verificados.");
