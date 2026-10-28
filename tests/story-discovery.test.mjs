import assert from "node:assert/strict";
import { ALL_MISSIONS, MISSIONS, SECONDARY_MISSIONS, STORY_SAGAS } from "../src/content/index.js";
import { missionState } from "../src/mission-system.js";
import { createCharacter, createDefaultSave, normalizeSave } from "../src/save.js";
import { createMissionBoardsView } from "../src/ui/meta/views/mission-boards.js";
import { createArchiveView } from "../src/ui/meta/views/archive.js";

assert.deepEqual(SECONDARY_MISSIONS, []);
assert.deepEqual(MISSIONS.map(({ number }) => number), [1, 2, 3, 4, 5, 6, 7]);
assert.ok(MISSIONS.every(({ category, board }) => category === "main" && board === "headquarters"));
let save = createCharacter(createDefaultSave(), { name: "Historia", affinity: "fuego" });
const boards = createMissionBoardsView({ mainMissions: MISSIONS, sagas: STORY_SAGAS, missionState, escapeHtml: String });
for (let index = 0; index < MISSIONS.length; index++) {
  const html = boards.render({ view: "headquarters", save, selectedSagaId: "saga-1" });
  const discovered = [...html.matchAll(/data-mission="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(discovered, MISSIONS.slice(0, index + 1).map(({ id }) => id));
  for (const future of MISSIONS.slice(index + 1)) {
    assert.ok(!html.includes(future.title), `No se debe revelar ${future.title}`);
    assert.ok(!html.includes(future.location), `No se debe revelar el destino ${future.location}`);
  }
  save.campaign.completedMissions.push(MISSIONS[index].id);
  if (MISSIONS[index].type === "route-search") save.campaign.archiveUnlocked = true;
}
const previous = createCharacter(createDefaultSave(), { name: "Migración", affinity: "agua" });
previous.version = 17;
previous.campaign.completedMissions = ["m01", "m02"];
previous.campaign.completedSecondaryMissions = ["s01"];
previous.campaign.doctorRoute = { ...previous.campaign.doctorRoute, active: true, phase: 1, resources: 2, choices: ["forest"] };
previous.campaign.missionProgress.s02 = { status: "in-progress", currentStepId: "doctor-search", completedSteps: [], context: {}, appliedEffects: [], attempts: 2 };
const original = structuredClone(previous);
const migrated = normalizeSave(previous);
assert.deepEqual(previous, original, "Migrar no debe modificar la partida original");
assert.equal(migrated.version, 18);
assert.deepEqual(migrated.campaign.completedMissions, ["m01", "m02", "s01"]);
assert.deepEqual(migrated.campaign.completedSecondaryMissions, []);
assert.equal(migrated.campaign.doctorRoute.active, true);
assert.equal(migrated.campaign.doctorRoute.phase, 1);
assert.equal(migrated.campaign.missionProgress.s02.attempts, 2);
assert.deepEqual(normalizeSave(migrated), migrated, "La migración debe ser idempotente");
const archiveSave = createCharacter(createDefaultSave(), { name: "Biblioteca", affinity: "fuego" });
archiveSave.campaign.archiveUnlocked = true;
const archive = createArchiveView({ missions: MISSIONS, missionState, escapeHtml: String });
const archiveHtml = archive.render({ save: archiveSave });
for (const future of ALL_MISSIONS.slice(1)) assert.ok(!archiveHtml.includes(future.title), "La crónica tampoco debe adelantar misiones");
const futureMission = { ...MISSIONS[0], id: "future-mission", number: 8, title: "Título futuro secreto", requirements: [{ type: "main-completed", id: "m05" }] };
const futureBoards = createMissionBoardsView({
  mainMissions: [...MISSIONS, futureMission], missionState, escapeHtml: String,
  sagas: [...STORY_SAGAS, { id: "future-saga", title: "Saga futura secreta", missionIds: [futureMission.id] }]
});
const selector = futureBoards.render({ view: "headquarters", save: archiveSave });
assert.ok(!selector.includes("Saga futura secreta"), "Las sagas futuras tampoco deben revelar su identidad");
assert.equal(futureBoards.render({ view: "headquarters", save: archiveSave, selectedSagaId: "future-saga" }), "", "Una saga desconocida no debe poder abrirse directamente");
assert.doesNotThrow(() => normalizeSave({ version: 17, campaign: { completedMissions: {}, completedSecondaryMissions: "invalid" } }));
console.log("Siete principales, descubrimiento progresivo y migración v18 verificados.");
