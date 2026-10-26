import assert from "node:assert/strict";
import { commitVictory, discardVictory, stageVictory } from "../src/battle/victory-transaction.js";
import { awardEncounter, completeMission, createCharacter, createDefaultSave } from "../src/save.js";
import { MISSIONS } from "../src/content/index.js";

const original = createCharacter(createDefaultSave(), { name: "Kira", affinity: "fuego", bodyType: "female" });
let provisional = original;
for (const enemyId of MISSIONS[0].encounters) provisional = awardEncounter(provisional, enemyId).save;
provisional = completeMission(provisional, "m01").save;
assert.ok(provisional.progression.level > original.progression.level, "La experiencia de la misión debe poder mostrar un nivel provisional");

let persisted = original;
const runtime = { activeSave: original, pendingVictorySave: null };
stageVictory(runtime, provisional);
assert.equal(runtime.activeSave.progression.level, 2, "Las escenas deben poder mostrar el nuevo nivel");
assert.equal(persisted.progression.level, 1, "Mostrarlo no debe guardar la recompensa");
discardVictory(runtime);
assert.equal(runtime.pendingVictorySave, null, "Abandonar debe descartar la victoria pendiente");
assert.equal(persisted.progression.level, 1, "Abandonar no debe modificar el guardado");

stageVictory(runtime, provisional);
let writes = 0;
commitVictory(runtime, (save) => { writes += 1; persisted = save; return save; });
assert.equal(writes, 1, "La salida del informe debe escribir una sola vez");
assert.equal(persisted.progression.level, 2);
assert.equal(runtime.pendingVictorySave, null);
commitVictory(runtime, (save) => { writes += 1; persisted = save; return save; });
assert.equal(writes, 1, "Continuar dos veces no debe duplicar el guardado");

console.log("Pruebas de confirmación diferida de victoria superadas.");
