import assert from "node:assert/strict";
import { AFFINITY_IDS, affinityCycleModifier, applyAffinityStatModifiers } from "../src/affinity-system.js";
import { attackBaseDamage, resolveDamage } from "../src/battle/damage.js";
import { MISSIONS } from "../src/content/index.js";
import { ENEMY_ROSTER, JUTSU_LIBRARY } from "../src/data.js";
import { AFFINITY_LEVEL_FOCUS, ENCOUNTER_REWARDS, attributeTrainingLimit, encounterRecovery, experienceForNextLevel, levelStatBonus } from "../src/progression-balance.js";
import { applyDebugCheckpoint, awardEncounter, completeMission, createCharacter, createDefaultSave, derivedStats, levelUpReport, normalizeSave, spendAttribute } from "../src/save.js";

assert.deepEqual(Object.keys(ENCOUNTER_REWARDS).sort(), Object.keys(ENEMY_ROSTER).sort(), "Cada enemigo debe tener una recompensa explícita");
assert.ok(ENCOUNTER_REWARDS.boss_raizen.xp > ENCOUNTER_REWARDS.boss_akumori.xp, "El jefe final debe premiar más que el jefe anterior");
assert.equal(experienceForNextLevel(1), 120);
assert.equal(experienceForNextLevel(5), 280);
assert.deepEqual(levelStatBonus(5), { health: 24, strength: 4, speed: 1, chakra: 12, luck: 1 });
assert.deepEqual(levelStatBonus(2, "fuego"), { health: 6, strength: 2, speed: 0, chakra: 3, luck: 0 });
assert.deepEqual(levelStatBonus(2, "agua"), { health: 6, strength: 1, speed: 1, chakra: 3, luck: 0 });
assert.deepEqual(levelStatBonus(2, "tierra"), { health: 9, strength: 1, speed: 0, chakra: 3, luck: 0 });
assert.deepEqual(levelStatBonus(2, "viento"), { health: 6, strength: 1, speed: 0, chakra: 6, luck: 0 });
assert.deepEqual(encounterRecovery(100, 100), { hp: 22, chakra: 18, clearStatuses: true });
assert.deepEqual(encounterRecovery(20, 20), { hp: 12, chakra: 12, clearStatuses: true });
assert.equal(attackBaseDamage(20, 16), 32, "La fuerza debe aportar el 75 % al daño base");
assert.equal(resolveDamage({ baseDamage: 32 }).damage, 32);

const checkpoints = [null, "mission-2-ready", "mission-3-ready", "mission-4-ready", "mission-5-ready"];
for (const affinity of AFFINITY_IDS) {
  let save = createCharacter(createDefaultSave(), { name: "Balance", affinity, bodyType: "male" });
  const leveled = normalizeSave({ ...save, progression: { ...save.progression, level: 2, attributePoints: 2 } });
  const report = levelUpReport(1, leveled);
  assert.equal(report.focus.stat, AFFINITY_LEVEL_FOCUS[affinity].stat, "La ventana debe identificar la especialidad de la afinidad");
  assert.equal(report.pointsGained, 2);
  assert.ok(report.stats.find((stat) => stat.id === report.focus.stat).gain > 0, "El atributo especializado debe crecer de verdad");
  assert.equal(levelUpReport(2, leveled), null, "Un nivel sin cambios no debe abrir una ventana");
  let previousHp = derivedStats(save).maxHp;
  for (const [index, mission] of MISSIONS.filter((mission) => mission.encounters).entries()) {
    if (checkpoints[index]) save = applyDebugCheckpoint(save, checkpoints[index]);
    const statsBefore = derivedStats(save);
    const starterTechnique = JUTSU_LIBRARY.filter((jutsu) => jutsu.element === affinity && jutsu.unlockLevel === 1 && jutsu.damage > 0)
      .sort((left, right) => right.damage - left.damage)[0];
    for (const enemyId of mission.encounters) {
      const enemy = ENEMY_ROSTER[enemyId];
      const enemyHp = applyAffinityStatModifiers(enemy.stats, [enemy.affinity]).stats.health;
      const damage = resolveDamage({
        baseDamage: attackBaseDamage(starterTechnique.damage, statsBefore.baseStrength),
        strengthModifier: statsBefore.strengthModifier,
        cycleModifier: affinityCycleModifier(affinity, enemy.affinity)
      }).damage;
      const rawHits = Math.ceil(enemyHp / damage);
      assert.ok(rawHits >= 2 && rawHits <= (enemyId === "boss_raizen" ? 7 : 5), `${affinity} contra ${enemyId}: ${rawHits} impactos base fuera del objetivo`);
    }
    const levelBefore = save.progression.level;
    const coinsBefore = save.progression.coins;
    const expectedCoins = mission.encounters.reduce((sum, id) => sum + ENCOUNTER_REWARDS[id].coins, mission.reward.coins);
    for (const id of mission.encounters) save = awardEncounter(save, id).save;
    const completion = completeMission(save, mission.id);
    assert.equal(completion.firstClear, true, `${affinity} debe poder completar ${mission.id}`);
    save = completion.save;
    assert.equal(save.progression.level, index + 2, `${affinity}: ${mission.id} debe cerrar en nivel ${index + 2}`);
    assert.equal(save.progression.level - levelBefore, 1, `${affinity}: ${mission.id} debe conceder un nivel`);
    assert.equal(save.progression.attributePoints, (index + 1) * 2, "Cada nivel concede dos puntos sin obligar a distribuirlos");
    assert.equal(save.progression.coins - coinsBefore, expectedCoins, "La recompensa monetaria debe coincidir con enemigos y misión");
    assert.ok(derivedStats(save).maxHp > previousHp, "Cada nivel debe mejorar la supervivencia automáticamente");
    previousHp = derivedStats(save).maxHp;
    const repeated = awardEncounter(save, mission.encounters[0], { firstClear: false });
    assert.equal(repeated.xp, 0);
    assert.equal(repeated.coins, 0);
    assert.equal(repeated.affinityXp, 0);
    assert.deepEqual(repeated.save.progression, save.progression, "Repetir no debe cambiar la progresión");
    assert.equal(completeMission(save, mission.id).firstClear, false, "La misión completada no debe pagarse dos veces");
  }
}

let training = createCharacter(createDefaultSave(), { name: "Dojo", affinity: "fuego", bodyType: "male" });
training.progression.attributePoints = 20;
for (let index = 0; index < 10; index += 1) training = spendAttribute(training, "strength");
assert.equal(training.progression.attributes.strength, attributeTrainingLimit(1), "El Dojo debe imponer un tope de especialización por nivel");
assert.equal(training.progression.attributePoints, 18, "Los intentos bloqueados no deben gastar puntos");
const legacyTraining = normalizeSave({ ...training, progression: { ...training.progression, level: 3, attributePoints: 1, attributes: { health: 0, strength: 8, speed: 0, chakra: 0, luck: 0 } } });
assert.equal(legacyTraining.progression.attributes.strength, 4, "La carga debe limitar un entrenamiento antiguo fuera de escala");
assert.equal(legacyTraining.progression.attributePoints, 5, "Los puntos antiguos excedentes se deben reembolsar");
assert.deepEqual(normalizeSave(legacyTraining).progression, legacyTraining.progression, "Normalizar varias veces no debe duplicar el reembolso");

const starter = createCharacter(createDefaultSave(), { name: "Daño", affinity: "fuego", bodyType: "male" });
const starterDamage = attackBaseDamage(JUTSU_LIBRARY.find((jutsu) => jutsu.id === "fire_embers").damage, derivedStats(starter).baseStrength);
const finalSave = applyDebugCheckpoint(starter, "mission-5-ready");
finalSave.progression.level = 5;
const finalDamage = attackBaseDamage(JUTSU_LIBRARY.find((jutsu) => jutsu.id === "fire_embers").damage, derivedStats(finalSave).baseStrength);
assert.ok(finalDamage > starterDamage && finalDamage < starterDamage * 1.3, "El crecimiento de daño debe sentirse sin desbordarse");

console.log("Pruebas de progresión y balance superadas.");
