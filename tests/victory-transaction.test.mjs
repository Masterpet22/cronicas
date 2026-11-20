import assert from "node:assert/strict";
import { commitVictory, discardVictory, stageMissionGrade, stageVictory } from "../src/battle/victory-transaction.js";
import { bestMissionGrade } from "../src/mission-grades.js";
import { awardEncounter, completeMission, createCharacter, createDefaultSave, normalizeSave } from "../src/save.js";
import { MISSIONS } from "../src/content/index.js";

const original = createCharacter(createDefaultSave(), { name: "Kira", affinity: "fuego", bodyType: "female" });
let provisional = original;
for (const enemyId of MISSIONS[0].encounters) provisional = awardEncounter(provisional, enemyId, { mission:MISSIONS[0] }).save;
provisional = completeMission(provisional, "m01").save;
assert.ok(provisional.progression.level > original.progression.level, "La experiencia de la misión debe poder mostrar un nivel provisional");

let persisted = original;
const runtime = { activeSave: original, pendingVictorySave: null };
stageVictory(runtime, provisional);
assert.equal(bestMissionGrade(provisional, "m01"), null, "Las partidas previas no reciben una nota inventada");
stageMissionGrade(runtime, "m01", "B");
assert.equal(bestMissionGrade(runtime.activeSave, "m01"), "B");
assert.equal(bestMissionGrade(provisional, "m01"), null, "La nota pendiente no modifica la partida original");
assert.equal(runtime.activeSave.progression.level, 2, "Las escenas deben poder mostrar el nuevo nivel");
assert.equal(persisted.progression.level, 1, "Mostrarlo no debe guardar la recompensa");
discardVictory(runtime);
assert.equal(runtime.pendingVictorySave, null, "Abandonar debe descartar la victoria pendiente");
assert.equal(persisted.progression.level, 1, "Abandonar no debe modificar el guardado");

stageVictory(runtime, provisional);
stageMissionGrade(runtime, "m01", "B");
let writes = 0;
const persist = save => { writes += 1; persisted = normalizeSave(save); return persisted; };
commitVictory(runtime, persist);
assert.equal(writes, 1, "La salida del informe debe escribir una sola vez");
assert.equal(persisted.progression.level, 2);
assert.equal(runtime.pendingVictorySave, null);
assert.equal(bestMissionGrade(persisted, "m01"), "B");
commitVictory(runtime, persist);
assert.equal(writes, 1, "Continuar dos veces no debe duplicar el guardado");

stageVictory(runtime, completeMission(persisted, "m01").save);
stageMissionGrade(runtime, "m01", "C");
stageMissionGrade(runtime, "m01", "F");
assert.equal(bestMissionGrade(runtime.pendingVictorySave, "m01"), "B");
stageMissionGrade(runtime, "m01", "S");
commitVictory(runtime, persist);
assert.equal(bestMissionGrade(normalizeSave(JSON.parse(JSON.stringify(persisted))), "m01"), "S");
assert.equal(bestMissionGrade(persisted, "m02"), null);

console.log("Pruebas de confirmación diferida de victoria superadas.");
