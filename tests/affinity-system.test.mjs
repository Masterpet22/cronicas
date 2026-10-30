import assert from "node:assert/strict";
import {
  AFFINITY_CONFIG,
  addSoak,
  applyAffinityStatModifiers,
  affinityCycleModifier,
  affinityStatModifiers,
  availableAffinitySlots,
  cappedEvasion,
  effectiveSpeed,
  finalAffinityDamage,
  furyDamageBonus,
  hurricaneEyeEvasionBonus,
  normalizeAffinityOrder,
  reprisalChance,
  reprisalDamage,
  soakReduction,
  tickSoak,
  validateAffinityOrder
} from "../src/affinity-system.js";

assert.deepEqual(
  AFFINITY_CONFIG.baseStats,
  { health: 100, strength: 10, speed: 10, chakra: 100, luck: 10 },
  "Todos los personajes deben partir de estadísticas base fijas y legibles"
);
assert.deepEqual(
  applyAffinityStatModifiers(AFFINITY_CONFIG.baseStats, ["fuego"]).stats,
  { health: 100, strength: 12, speed: 9, chakra: 100, luck: 10 },
  "Fuego debe modificar fuerza y velocidad sobre la base fija"
);
assert.deepEqual(
  applyAffinityStatModifiers(AFFINITY_CONFIG.baseStats, ["tierra"]).stats,
  { health: 120, strength: 10, speed: 10, chakra: 88, luck: 10 },
  "Tierra debe modificar vida y chakra sobre la base fija"
);

const roundedModifiers = (order) => Object.fromEntries(Object.entries(affinityStatModifiers(order)).map(([key, value]) => [key, Math.round(value * 100)]));
const expected = (health, strength, speed, chakra, luck = 0) => ({ health, strength, speed, chakra, luck });
const approximately = (actual, expectedValue, message) => assert.ok(Math.abs(actual - expectedValue) < 1e-9, `${message}: ${actual}`);

assert.deepEqual(roundedModifiers(["fuego"]), expected(0, 20, -12, 0), "Fuego principal debe potenciar Fuerza y penalizar Velocidad");
assert.deepEqual(roundedModifiers(["fuego", "agua"]), expected(0, 14, -2, 0), "Fuego → Agua debe combinar ambos pesos");
assert.deepEqual(roundedModifiers(["fuego", "tierra"]), expected(10, 20, -12, -6), "Fuego → Tierra debe modificar cuatro estadísticas");
assert.deepEqual(roundedModifiers(["fuego", "agua", "tierra"]), expected(5, 14, -2, -3), "Fuego → Agua → Tierra debe respetar 100/50/25 %");
assert.deepEqual(roundedModifiers(["fuego", "viento", "agua"]), expected(-6, 17, -7, 10), "Fuego → Viento → Agua debe respetar el orden");
assert.deepEqual(roundedModifiers(["fuego", "tierra", "viento"]), expected(7, 20, -12, -1), "Fuego → Tierra → Viento debe acumular por estadística");
assert.deepEqual(roundedModifiers(["agua", "fuego", "tierra"]), expected(5, -2, 14, -3), "Agua → Fuego → Tierra debe producir otro resultado por orden");
const allOrders = ["fuego", "agua", "tierra", "viento"].flatMap((first) => ["fuego", "agua", "tierra", "viento"].filter((id) => id !== first).map((second) => [first, second]));
allOrders.forEach((order) => Object.values(affinityStatModifiers(order)).forEach((modifier) => {
  assert.ok(modifier <= 0.20 && modifier >= -0.12, "Los modificadores deben permanecer entre +20 % y −12 %");
}));
assert.equal(applyAffinityStatModifiers({ health: 100, strength: 3, speed: 10, chakra: 50, luck: 5 }, ["fuego"]).stats.strength, 4, "Un bono positivo menor que uno debe redondearse a +1");

assert.equal(validateAffinityOrder(["fuego", "agua", "tierra"]), true, "Tres afinidades distintas deben ser válidas");
assert.equal(validateAffinityOrder(["fuego", "fuego"]), false, "No deben aceptarse afinidades repetidas");
assert.equal(validateAffinityOrder(["fuego", "agua", "tierra", "viento"]), false, "No deben aceptarse más de tres afinidades");
assert.deepEqual(normalizeAffinityOrder(["fuego", "fuego", "agua", "tierra", "viento"]), ["fuego", "agua", "tierra"], "La normalización debe eliminar repetidas y limitar a tres");
assert.equal(availableAffinitySlots(14, 3), 1, "El nivel debe bloquear la segunda afinidad aunque la historia haya avanzado");
assert.equal(availableAffinitySlots(15, 2), 2, "Nivel e historia deben desbloquear juntos la segunda afinidad");
assert.equal(availableAffinitySlots(35, 3), 2, "El progreso natural solo debe abrir dos afinidades");
assert.equal(availableAffinitySlots(35, 3, true), 3, "El pergamino debe abrir la tercera afinidad");

for (const attacker of ["fuego", "viento", "tierra", "agua"]) assert.equal(affinityCycleModifier(attacker, attacker), 0, "Una afinidad no debe aventajarse a sí misma");
assert.equal(affinityCycleModifier("fuego", "viento"), 0.20, "Fuego debe vencer a Viento");
assert.equal(affinityCycleModifier("fuego", "agua"), -0.20, "Fuego debe perder contra Agua");
assert.equal(affinityCycleModifier("viento", "tierra"), 0.20, "Viento debe vencer a Tierra");
assert.equal(affinityCycleModifier("tierra", "agua"), 0.20, "Tierra debe vencer a Agua");
assert.equal(affinityCycleModifier("agua", "fuego"), 0.20, "Agua debe vencer a Fuego");

assert.equal(furyDamageBonus(100, 100), 0, "Furia debe ser nula con vida llena");
approximately(furyDamageBonus(70, 100), 0.09, "Furia debe dar 9 % con 70 % de vida");
approximately(furyDamageBonus(50, 100), 0.15, "Furia debe dar 15 % con media vida");
approximately(furyDamageBonus(30, 100), 0.21, "Furia debe dar 21 % con 30 % de vida");
assert.equal(furyDamageBonus(17, 100), 0.25, "Furia debe alcanzar su tope con 17 % de vida");

let soak = null;
for (let index = 0; index < 7; index += 1) soak = addSoak(soak, false);
assert.equal(soak.stacks, AFFINITY_CONFIG.passives.soak.maxStacks, "Empapar debe detenerse en cinco cargas");
assert.equal(soakReduction(soak), 0.15, "Empapar normal debe alcanzar 15 %");
assert.equal(soakReduction({ ...soak, boss: true }), 0.075, "Empapar contra jefes debe reducirse a la mitad");
assert.equal(effectiveSpeed(100, -0.12, soak), 74.8, "El peor caso Fuego empapado debe conservar 74,8 % de velocidad");
assert.equal(effectiveSpeed(100, 0, soak, 1), 70, "El piso global debe conservar al menos 70 % de la velocidad base");
approximately(1.20 / effectiveSpeed(100, -0.12, soak) * 100, 1.6042780748663101, "La ventaja de ritmo extrema debe rondar ×1,6");
assert.equal(tickSoak({ stacks: 2, turns: 2, boss: false }).turns, 1, "Empapar debe durar turnos del objetivo");
assert.equal(tickSoak({ stacks: 2, turns: 1, boss: false }), null, "Empapar debe expirar al terminar su duración");

assert.equal(reprisalChance(1, 100), 0.20, "La probabilidad fija de Represalia no debe depender de Suerte ni vida");
assert.equal(reprisalDamage(10, 100), 3, "Represalia debe devolver 30 % del daño recibido");
assert.equal(reprisalDamage(100, 100), 5, "Represalia debe respetar el tope de 5 % de vida máxima");
assert.equal(hurricaneEyeEvasionBonus(70, 70), 8, "Ojo del huracán debe activarse con chakra lleno");
assert.equal(hurricaneEyeEvasionBonus(69, 70), 0, "Ojo del huracán debe apagarse al gastar chakra");
assert.equal(cappedEvasion(72, 8), 75, "La evasión total nunca debe superar 75 %");

assert.equal(finalAffinityDamage({ baseDamage: 1000, strengthModifier: 0.20, cycleModifier: 0.20, furyBonus: 0.25 }), 1800, "El máximo absoluto sin crítico debe ser ×1,80");
assert.equal(finalAffinityDamage({ baseDamage: 1000, strengthModifier: -0.12, cycleModifier: -0.20 }), 704, "El mínimo absoluto debe ser ×0,704");

console.log("Pruebas del sistema de afinidades superadas.");
