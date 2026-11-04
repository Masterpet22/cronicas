import assert from "node:assert/strict";
import { ABILITY_CATALOG, ENEMY_ROSTER } from "../src/data.js?v=1.5.0";
import { AFFINITY_IDS, COMBAT_AFFINITY_IDS, affinityCycleModifier, applyAffinityStatModifiers } from "../src/affinity-system.js";
import { MISSIONS } from "../src/content/index.js";
import { createEnemyState, resolveEnemyProfileForBattle } from "../src/battle/enemy-state.js";
import { enemyAffinityOrder, enemyCanUseElement } from "../src/battle/enemy-affinities.js";
import { chooseEnemyAbility, reserveEnemyAbility } from "../src/battle/enemy-abilities.js";
import { createArchiveView } from "../src/ui/meta/views/archive.js";
import { elementName } from "../src/elements.js";

const neutral = { flow: [] };
for (const profile of Object.values(ENEMY_ROSTER)) {
  const state = createEnemyState(profile, neutral);
  assert.ok(COMBAT_AFFINITY_IDS.includes(state.primaryAffinity));
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
assert.throws(() => createEnemyState({ ...base, affinity: null }, neutral), /afinidad dominante/, "Una afinidad ausente sigue siendo un error; Normal debe declararse");
assert.throws(() => enemyAffinityOrder({ ...base, affinity: "normal", affinities: ["normal", "fuego"] }), /afinidad dominante/);
assert.throws(() => enemyAffinityOrder({ ...base, affinity: "fuego", affinities: ["fuego", "normal"] }), /afinidad dominante/);
const normalProfile = { ...base, affinity: "normal", pattern: ["strike", "physical_1"] };
const normal = createEnemyState(normalProfile, neutral);
assert.deepEqual(normal.affinities, ["normal"]);
assert.equal(normal.maxHp, base.stats.health);
assert.equal(normal.strength, base.stats.strength);
assert.equal(normal.speed, base.stats.speed);
assert.equal(normal.maxChakra, base.stats.chakra);
for (const affinity of COMBAT_AFFINITY_IDS) {
  assert.equal(affinityCycleModifier(affinity, "normal"), 0);
  assert.equal(affinityCycleModifier("normal", affinity), 0);
}
for (const action of Object.values(ABILITY_CATALOG)) {
  if (["physical", "none"].includes(action.element)) assert.equal(enemyCanUseElement(normal, action), true);
  else if (action.seals?.length) assert.equal(enemyCanUseElement(normal, action), false, `Normal no habilita ${action.id}`);
}
const normalResources = { hp: normal.hp, chakra: normal.chakra };
assert.equal(reserveEnemyAbility(normal, ABILITY_CATALOG.fire_embers), null);
assert.deepEqual({ hp: normal.hp, chakra: normal.chakra }, normalResources);
assert.equal(resolveEnemyProfileForBattle({ ...normalProfile, boss: true }, MISSIONS[0], "fuego").affinity, "normal", "El tutorial conserva los blancos normales");
const archive = createArchiveView({ missions: [], enemyRoster: { normal: normalProfile }, enemyActions: {}, elementName, escapeHtml: String });
const normalRecord = archive.render({ save: { character: { name: "Prueba", affinity: "fuego" }, campaign: { archiveUnlocked: true, completedMissions: [] },
  bestiary: { entries: { normal: { encounters: 1, defeated: 1, techniques: [], vulnerabilities: ["agua"], documents: 0 } } } } });
assert.match(normalRecord, /Afinidad Normal/);
assert.match(normalRecord, /Sin debilidad elemental/, "Un registro antiguo no atribuye debilidades elementales a un enemigo Normal");
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
