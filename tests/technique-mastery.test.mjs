import { learnSkillForTest } from "./helpers/skill-fixtures.mjs";
import assert from "node:assert/strict";
import { JUTSU_LIBRARY } from "../src/data.js";
import { basicRequirements } from "../src/elements.js";
import { SKILLS_BY_ID, SKILL_CATALOG } from "../src/skills/definitions.js";
import { investResonance, skillLevel, upgradedTechnique } from "../src/skills/progression.js";
import { TECHNIQUE_MASTERY, techniqueAtLevel } from "../src/skills/technique-mastery.js";
import { taijutsuAction } from "../src/skills/taijutsu.js";
import { createCharacter, createDefaultSave, normalizeSave } from "../src/save.js";
import { actionChakraCost, actionChakraRecovery } from "../src/chakra-balance.js";
import { advanceTimelineProgress, millisecondsToTimelineThreshold } from "../src/battle/timeline.js";

assert.equal(TECHNIQUE_MASTERY.maxLevel, 3);
assert.ok(SKILL_CATALOG.every(node => node.maxLevel === 3), "Todas las habilidades tienen un máximo de tres niveles");
for (const original of JUTSU_LIBRARY.filter(jutsu => SKILLS_BY_ID.has(jutsu.id))) {
  const before = structuredClone(original);
  let save = createCharacter(createDefaultSave(), { affinity: basicRequirements(original.element)[0] });
  save.progression.level = 60;
  save.inventory.extraAffinityUnlocked = true;
  save.campaign.elementRank = 3;
  save.campaign.completedSecondaryMissions = ["affinity_trial_2", "affinity_trial_3"];
  save.character.affinities = basicRequirements(original.element);
  save.character.affinityXp = { fuego: 10000, agua: 10000, tierra: 10000, viento: 10000 };
  save = learnSkillForTest(normalizeSave(save),original.id);
  const node = SKILLS_BY_ID.get(original.id);
  assert.equal(node.maxLevel, 3);
  let previousCost = Infinity;
  for (let level = 1; level <= 3; level++) {
    if (level > 1) {
      const next = investResonance(save, original.id);
      assert.notEqual(next, save, `${original.id}: mejora ${level} disponible`);
      save = next;
    }
    const action = upgradedTechnique(save, original);
    assert.equal(skillLevel(save, node), level);
    assert.equal(action.damage, original.damage + (level - 1) * 2);
    assert.equal(action.cost, Math.ceil(original.cost * (100 - (level - 1) * 5) / 100));
    assert.ok(action.cost < previousCost, `${original.id}: cada nivel reduce el coste`);
    assert.equal(action.seals.length, original.seals.length - (level === 3 ? 1 : 0));
    assert.equal(action.cooldown, original.cooldown);
    assert.deepEqual(action.status, original.status);
    assert.ok(actionChakraCost(action, 1000) > actionChakraRecovery(action));
    assert.deepEqual(upgradedTechnique(save, action), action, "Reproyectar no aplica dos veces descuento, daño o sellos");
    assert.deepEqual(upgradedTechnique(normalizeSave(JSON.parse(JSON.stringify(save))), original), action, "Recargar conserva cada rango");
    previousCost = action.cost;
  }
  assert.equal(investResonance(save, original.id), save, "No existe nivel 4");
  const novice = techniqueAtLevel(original, 1), master = upgradedTechnique(save, original);
  const noviceMs = millisecondsToTimelineThreshold(.8, 10, novice);
  const masterMs = millisecondsToTimelineThreshold(.8, 10, master);
  assert.ok(masterMs < noviceMs, `${original.id}: quitar un sello acelera la preparación real`);
  assert.ok(Math.abs(masterMs / noviceMs - master.seals.length / novice.seals.length) < 1e-9);
  assert.ok(Math.abs(advanceTimelineProgress(.8, 10, masterMs, master) - 1) < 1e-9);
  assert.deepEqual(original, before, "El catálogo de nivel 1 se conserva");
}

const basic = JUTSU_LIBRARY.find(j => j.id === "fire_embers");
assert.deepEqual([1, 2, 3].map(level => techniqueAtLevel(basic, level).cost), [30, 29, 27]);
for (const count of [1, 2, 3, 4]) {
  const action = { seals: Array(count).fill("sello"), speedMod: 100 };
  assert.equal(millisecondsToTimelineThreshold(.8, 10, action), count * 300);
  assert.equal(millisecondsToTimelineThreshold(.8, 20, action), count * 150);
  assert.equal(millisecondsToTimelineThreshold(.8, 10, { ...action, speedMod: -100 }), count * 300, "El número de sellos determina la preparación del jutsu");
}
let physical = createCharacter(createDefaultSave(), { affinity: "fuego" });
physical.progression.level = 10;
physical = investResonance(physical, "physical_0");
for (let rank = 0; rank < 3; rank++) physical = investResonance(physical, "physical_1");
assert.equal(skillLevel(physical, SKILLS_BY_ID.get("physical_1")), 3);
assert.equal(taijutsuAction(physical, "physical_1").damage, 26);
assert.equal(taijutsuAction(physical, "physical_1").cost, 0);
assert.deepEqual(taijutsuAction(physical, "physical_1").seals, []);
assert.equal(investResonance(physical, "physical_1"), physical);

console.log("Maestría: 28 técnicas, niveles 1–3, ahorro progresivo, sello final, preparación proporcional y guardado verificados.");
