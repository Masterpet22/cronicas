import assert from "node:assert/strict";
import { ABILITY_CATALOG, BASE_ACTIONS, JUTSU_LIBRARY, TAIJUTSU_ACTIONS, ENEMY_ROSTER, ENEMY_ACTIONS,
  ENEMY_EXCLUSIVE_ABILITIES, SEALS, abilityAccess, canonicalAbilityId } from "../src/data.js?v=1.5.0";
import { chooseEnemyAbility, reserveEnemyAbility } from "../src/battle/enemy-abilities.js";
import { closeActionState } from "../src/battle/action-resolution.js";
import { nextEnemyAction } from "../src/battle/turn.js";
import { SKILLS_BY_ID, TAIJUTSUS_BY_ID } from "../src/skills/definitions.js";
import { abilityCatalogMarkup } from "../src/ui/meta/ability-catalog.js";
import { createCharacter, createDefaultSave, normalizeSave, recordBestiaryObservation } from "../src/save.js";

for (const action of [...BASE_ACTIONS, ...JUTSU_LIBRARY, ...TAIJUTSU_ACTIONS]) {
  assert.equal(ABILITY_CATALOG[action.id], action, "El catálogo conserva la definición original, sin duplicados de enemigo");
  assert.equal(abilityAccess(action.id), "shared");
}
assert.equal(TAIJUTSUS_BY_ID.get("physical_1"), ABILITY_CATALOG.physical_1);
for (const action of ENEMY_EXCLUSIVE_ABILITIES) {
  assert.equal(abilityAccess(action.id), "enemy-only");
  assert.equal(SKILLS_BY_ID.has(action.id), false, "Las exclusivas no se aprenden en el Dojo");
}
assert.equal(canonicalAbilityId("quick"), "strike");
assert.equal(canonicalAbilityId("heavy"), "physical_1");
assert.equal(canonicalAbilityId("ember"), "fire_embers");
assert.equal(ENEMY_ACTIONS.ember, ABILITY_CATALOG.fire_embers);
assert.equal(abilityAccess("missing"), null);
assert.equal(abilityAccess("__proto__"), null);
for (const action of Object.values(ABILITY_CATALOG)) {
  assert.equal(typeof action.damage, "number", `${action.id}: daño único para ambos actores`);
  assert.ok(Array.isArray(action.seals) && action.seals.every(id => Object.hasOwn(SEALS, id)));
  if (!["physical", "none"].includes(action.element)) assert.ok(action.seals.length > 0, `${action.id}: técnica elemental sin sellos`);
}
for (const profile of Object.values(ENEMY_ROSTER)) {
  for (const id of [...profile.pattern, ...(profile.phase2Pattern || [])]) {
    assert.ok(Object.hasOwn(ABILITY_CATALOG, id), `${profile.name}: habilidad no registrada ${id}`);
    assert.equal(canonicalAbilityId(id), id, "Los patrones nuevos no deben usar nombres obsoletos");
  }
}

const unit = () => ({ hp: 100, maxHp: 100, chakra: 80, maxChakra: 80, cooldowns: {}, statuses: [],
  patternIndex: 0, phase: 1, guarding: false, soak: null, recoveryInitiative: 0, reservedAction: null,
  primaryAffinity: "fuego", affinities: ["fuego"] });
const enemy = unit(), profile = { pattern: ["fire_embers"] };
const original = structuredClone(ABILITY_CATALOG);
const selected = chooseEnemyAbility(profile, enemy);
assert.equal(selected, ABILITY_CATALOG.fire_embers);
assert.equal(enemy.chakra, 50, "Se paga el coste común al elegir, antes de preparar");
assert.equal(enemy.cooldowns.fire_embers, 2);
assert.equal(reserveEnemyAbility(enemy, selected), selected);
assert.equal(enemy.chakra, 50, "La ejecución no vuelve a cobrar lo ya preparado");
const battle = { enemy, pendingActions: { enemy: selected }, timelineProgress: { enemy: 1 } };
closeActionState(battle, "enemy", selected);
assert.equal(enemy.chakra, 55);
assert.equal(enemy.cooldowns.fire_embers, 1);
assert.equal(enemy.reservedAction, null);
assert.equal(chooseEnemyAbility(profile, enemy), ABILITY_CATALOG.strike, "Una recarga impide repetir la técnica");
closeActionState(battle, "enemy", ABILITY_CATALOG.strike);
assert.equal(enemy.cooldowns.fire_embers, 0);
assert.equal(chooseEnemyAbility(profile, enemy), selected);
const exhausted = unit(); exhausted.chakra = 0;
assert.equal(chooseEnemyAbility(profile, exhausted), ABILITY_CATALOG.guard);
closeActionState({ ...battle, enemy: exhausted }, "enemy", ABILITY_CATALOG.guard);
assert.equal(exhausted.chakra, 25, "Guardia recupera exactamente lo mismo que al jugador");
const fragile = unit(); fragile.hp = 8;
assert.equal(chooseEnemyAbility({ pattern: ["physical_1"] }, fragile), ABILITY_CATALOG.strike);
assert.equal(fragile.hp, 8, "El coste de vida nunca provoca un suicidio");
const stunned = unit(); stunned.statuses = [{ type: "stun", duration: 1 }];
assert.equal(chooseEnemyAbility(profile, stunned), ABILITY_CATALOG.strike);
assert.equal(stunned.chakra, 80, "El aturdimiento no cobra una técnica que no se eligió");
assert.equal(nextEnemyAction({ boss: true, pattern: ["strike"] }, { phase: 2, patternIndex: 0 }).actionId, "strike");
assert.deepEqual(ABILITY_CATALOG, original, "Elegir y pagar no modifica las definiciones compartidas");

const save = createCharacter(createDefaultSave(), { affinity: "fuego" });
save.campaign.bestiaryBookObtained = true;
save.bestiary.entries.boss_varek = { encounters: 1, defeated: 0, techniques: ["quick", "strike", "ember", "heavy"], documents: 0, vulnerabilities: [] };
assert.deepEqual(normalizeSave(save).bestiary.entries.boss_varek.techniques, ["strike", "fire_embers", "physical_1"]);
const markup = abilityCatalogMarkup(String);
assert.ok(Object.keys(ABILITY_CATALOG).every(id => markup.includes(`data-ability-id="${id}"`)));
assert.match(markup, /Exclusiva de enemigos/);
console.log(`Catálogo común: ${Object.keys(ABILITY_CATALOG).length} habilidades, patrones válidos, costes, recargas y compatibilidad verificados.`);
