import assert from "node:assert/strict";
import { ACTIONS, ENEMIES } from "../src/data.js";
import { applyStatus, affinityMultiplier, hitChance } from "../src/rules.js";

const fire = ACTIONS.find((action) => action.id === "fire");
const actor = { accuracy: 95, statuses: [] };
const target = { evasion: 5, weakness: "fire", resistance: "wind", statuses: [] };

assert.equal(affinityMultiplier(fire, target), 1.15, "La debilidad debe otorgar 15 % de ventaja");
assert.equal(hitChance(actor, target, fire), 90, "La precisión debe descontar la evasión");

applyStatus(actor, { type: "seal", label: "SELLADO", duration: 2, power: 0 });
assert.equal(hitChance(actor, target, fire), 75, "El sello debe reducir 15 puntos de precisión");

applyStatus(actor, { type: "seal", label: "SELLADO", duration: 3, power: 0 });
assert.equal(actor.statuses.length, 1, "Reaplicar un estado no debe duplicarlo");
assert.equal(actor.statuses[0].duration, 3, "Reaplicar un estado debe refrescar su duración");

assert.equal(ENEMIES.length, 4, "La vertical slice debe contener tres enemigos y un jefe");
assert.equal(ENEMIES.at(-1).boss, true, "El último encuentro debe ser el jefe");
assert.ok(ENEMIES.at(-1).phase2Pattern.length > 0, "El jefe debe tener un patrón para su segunda fase");

console.log("Pruebas de reglas superadas.");
