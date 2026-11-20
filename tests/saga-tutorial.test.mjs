import assert from "node:assert/strict";
import { createCharacter, createDefaultSave, normalizeSave, completeMission } from "../src/save.js";
import { MISSIONS } from "../src/content/index.js";
import { missionState } from "../src/mission-system.js";
import { normalizeSagaTutorial } from "../src/tutorial-system.js";
import { SAGA_TUTORIAL } from "../src/content/sagas/futuro-prometedor/tutorial.js";

// El historial de las guías solo se conserva para cargar partidas antiguas.
let save = createCharacter(createDefaultSave(), { name: "Libre", affinity: "fuego" });
assert.equal(save.equipment.weapon, null);
assert.deepEqual(save.campaign.sagaTutorial.completed, []);
assert.equal(missionState(MISSIONS.find(m => m.id === "m01"), save).unlocked, true);
for (const id of ["m01", "s01", "m02", "s02", "m03", "m04", "m05"]) {
  assert.ok(MISSIONS.some(m => m.id === id), `Se conserva la misión ${id}`);
}
save = completeMission(save, "m01").save;
assert.ok(save.campaign.completedMissions.includes("m01"), "Las recompensas no exigen prácticas del tutorial");
const legacy = createCharacter(createDefaultSave(), { name: "Anterior", affinity: "agua" });
legacy.campaign.completedMissions = ["m01"];
delete legacy.campaign.sagaTutorial;
const migrated = normalizeSave(legacy);
assert.deepEqual(migrated.campaign.completedMissions, ["m01"]);
for (const id of SAGA_TUTORIAL[0].practices) assert.ok(migrated.campaign.sagaTutorial.completed.includes(id));
assert.deepEqual(normalizeSagaTutorial({ completed: ["strike", "strike", "invalid"] }).completed, ["strike"]);
assert.deepEqual(normalizeSave(migrated), migrated, "La migración sigue siendo estable");
console.log("Misiones sin guías: progresión y compatibilidad de partidas verificadas.");
