import assert from "node:assert/strict";
import { JUTSU_LIBRARY, ENEMIES, MISSIONS, SECONDARY_MISSIONS, SEALS } from "../src/data.js";
import { applyStatus, hitChance } from "../src/rules.js";

const fire = JUTSU_LIBRARY.find((action) => action.id === "fire_embers");
const actor = { accuracy: 95, statuses: [] };
const target = { evasion: 5, statuses: [] };
assert.equal(hitChance(actor, target, fire), 94, "La precisión debe sumar el modificador y descontar la evasión");

applyStatus(actor, { type: "seal", label: "SELLADO", duration: 2, power: 0 });
assert.equal(hitChance(actor, target, fire), 79, "El sello debe reducir 15 puntos de precisión");

applyStatus(actor, { type: "seal", label: "SELLADO", duration: 3, power: 0 });
assert.equal(actor.statuses.length, 1, "Reaplicar un estado no debe duplicarlo");
assert.equal(actor.statuses[0].duration, 3, "Reaplicar un estado debe refrescar su duración");

assert.equal(ENEMIES.filter((enemy) => !enemy.boss).length, 9, "El catálogo debe contener únicamente los rivales normales usados por el contenido vigente");
assert.equal(ENEMIES.filter((enemy) => enemy.boss).length, 3, "La campaña vigente debe tener a Varek, Akumori y Raizen como jefes");
assert.ok(ENEMIES.filter((enemy) => enemy.boss).every((enemy) => enemy.phase2Pattern.length > 0), "Cada jefe debe tener una segunda fase");
assert.ok(ENEMIES.every((enemy) => ["health", "strength", "speed", "chakra", "luck"].every((stat) => Number.isFinite(enemy.stats?.[stat]))), "Cada enemigo debe usar las cinco estadísticas de balance");
assert.ok(ENEMIES.every((enemy) => ["fuego", "agua", "tierra", "viento"].includes(enemy.affinity)), "Cada enemigo debe tener una afinidad principal para el ciclo de combate");
assert.equal(ENEMIES.find((enemy) => enemy.name.includes("RAIZEN KUROGANE"))?.boss, true, "Raizen debe ser el jefe final jugable de la saga");
assert.equal(MISSIONS.length, 5, "La campaña debe contener solamente las cinco misiones principales vigentes");
assert.deepEqual(MISSIONS[0].encounters, ["tutorial_bandit", "tutorial_bandit_second", "boss_varek"], "La primera misión debe encadenar dos bandidos y un minijefe");
assert.deepEqual(MISSIONS.find((mission) => mission.id === "m02").encounters, ["bandit_pathfinder", "bandit_lieutenant", "boss_akumori"], "La segunda misión de la saga debe cerrar con Akumori");
assert.equal(MISSIONS.find((mission) => mission.id === "m02").relic, "Mapa cifrado", "Akumori debe dejar el mapa que activa la búsqueda del doctor");
assert.deepEqual(MISSIONS.find((mission) => mission.id === "m03").encounters, ["gate_guard", "bandit_pathfinder", "stone_hunter"], "La entrada principal debe conservar tres duelos individuales");
assert.equal(MISSIONS.find((mission) => mission.id === "m03").flow.find((step) => step.type === "choice")?.completionBonus?.coins, 90, "La entrada secreta debe conceder oro adicional");
assert.deepEqual(MISSIONS.find((mission) => mission.id === "m04").encounters, ["bandit_pathfinder", "venom_medic", "ash_adept"], "El corazón de la guarida debe reutilizar una ficha conocida y enseñar estados en duelos consecutivos");
assert.deepEqual(MISSIONS.find((mission) => mission.id === "m05").encounters, ["boss_raizen"], "El duelo final debe ser un único combate contra Raizen");
const doctorMission = SECONDARY_MISSIONS.find((mission) => mission.id === "s02");
assert.equal(doctorMission.routeMode, "convergent", "Las elecciones deben converger en Haru sin multiplicar la historia");
assert.deepEqual(doctorMission.routeEvents.map((event) => event.type), ["dialogue", "investigation", "combat"], "La búsqueda debe ofrecer consejo, investigación y combate individual");
assert.equal(MISSIONS.filter((mission) => mission.exam).length, 0, "El catálogo vigente no debe inventar un examen fuera de la saga implementada");
assert.equal(Object.keys(SEALS).length, 12, "La hoja visual debe exponer doce sellos");
assert.equal(new Set(Object.values(SEALS).map((seal) => seal.label)).size, 12, "Cada sello debe tener un nombre propio y único");
assert.equal(JUTSU_LIBRARY.length, 37, "La biblioteca debe cubrir técnicas básicas, secundarias y terciarias");
for (const element of ["fuego", "agua", "tierra", "viento"]) {
  assert.ok(JUTSU_LIBRARY.filter((jutsu) => jutsu.element === element && jutsu.unlockLevel === 1).length >= 4, `Debe haber cuatro técnicas iniciales de ${element}`);
  const requirements = JUTSU_LIBRARY.filter((jutsu) => jutsu.element === element).map((jutsu) => jutsu.affinityXpRequired);
  assert.equal(new Set(requirements).size, requirements.length, `Cada técnica de ${element} debe exigir una cantidad distinta de PX de afinidad`);
}

console.log("Pruebas de reglas superadas.");
