import assert from "node:assert/strict";
import { JUTSU_LIBRARY, ENEMIES, MISSIONS, SECONDARY_MISSIONS, SEALS } from "../src/data.js";
import { applyStatus, affinityMultiplier, hitChance } from "../src/rules.js";

const fire = JUTSU_LIBRARY.find((action) => action.id === "fire_embers");
const actor = { accuracy: 95, statuses: [] };
const target = { evasion: 5, weakness: "fire", resistance: "wind", statuses: [] };

assert.equal(affinityMultiplier(fire, target), 1.15, "La debilidad debe otorgar 15 % de ventaja");
assert.equal(hitChance(actor, target, fire), 94, "La precisión debe sumar el modificador y descontar la evasión");

applyStatus(actor, { type: "seal", label: "SELLADO", duration: 2, power: 0 });
assert.equal(hitChance(actor, target, fire), 79, "El sello debe reducir 15 puntos de precisión");

applyStatus(actor, { type: "seal", label: "SELLADO", duration: 3, power: 0 });
assert.equal(actor.statuses.length, 1, "Reaplicar un estado no debe duplicarlo");
assert.equal(actor.statuses[0].duration, 3, "Reaplicar un estado debe refrescar su duración");

assert.equal(ENEMIES.filter((enemy) => !enemy.boss).length, 12, "La campaña debe incluir los bandidos del desfiladero entre sus enemigos normales");
assert.equal(ENEMIES.filter((enemy) => enemy.boss).length, 6, "La campaña debe reservar a Akumori y Raizen entre sus jefes");
assert.ok(ENEMIES.filter((enemy) => enemy.boss).every((enemy) => enemy.phase2Pattern.length > 0), "Cada jefe debe tener una segunda fase");
assert.equal(ENEMIES.find((enemy) => enemy.name.includes("RAIZEN KUROGANE"))?.future, true, "Raizen debe quedar reservado como jefe final provisional de la saga");
assert.equal(MISSIONS.length, 11, "La campaña debe contener las diez misiones base y la nueva misión del desfiladero");
assert.deepEqual(MISSIONS[0].encounters, ["tutorial_bandit", "tutorial_bandit_second", "boss_varek"], "La primera misión debe encadenar dos bandidos y un minijefe");
assert.deepEqual(MISSIONS.find((mission) => mission.id === "m11").encounters, ["bandit_pathfinder", "bandit_lieutenant", "boss_akumori"], "La segunda misión de la saga debe cerrar con Akumori");
assert.equal(MISSIONS.find((mission) => mission.id === "m11").relic, "Mapa cifrado", "Akumori debe dejar el mapa que activa la búsqueda del doctor");
const doctorMission = SECONDARY_MISSIONS.find((mission) => mission.id === "s02");
assert.equal(doctorMission.routeMode, "pending", "La distribución fija o aleatoria de las rutas debe quedar pendiente de decisión");
assert.deepEqual(doctorMission.routeEvents.map((event) => event.type), ["dialogue", "combat", "advance"], "La búsqueda del doctor debe reservar consejo, combate y avance libre");
assert.equal(MISSIONS.filter((mission) => mission.exam).length, 1, "Debe existir un examen de rango");
assert.equal(Object.keys(SEALS).length, 12, "La hoja visual debe exponer doce sellos");
assert.equal(new Set(Object.values(SEALS).map((seal) => seal.label)).size, 12, "Cada sello debe tener un nombre propio y único");
assert.equal(JUTSU_LIBRARY.length, 37, "La biblioteca debe cubrir técnicas básicas, secundarias y terciarias");
for (const element of ["fuego", "agua", "tierra", "viento"]) {
  assert.ok(JUTSU_LIBRARY.filter((jutsu) => jutsu.element === element && jutsu.unlockLevel === 1).length >= 4, `Debe haber cuatro técnicas iniciales de ${element}`);
  const requirements = JUTSU_LIBRARY.filter((jutsu) => jutsu.element === element).map((jutsu) => jutsu.affinityXpRequired);
  assert.equal(new Set(requirements).size, requirements.length, `Cada técnica de ${element} debe exigir una cantidad distinta de PX de afinidad`);
}

console.log("Pruebas de reglas superadas.");
