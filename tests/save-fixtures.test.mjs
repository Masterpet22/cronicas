import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MISSIONS } from "../src/content/index.js";
import { missionState } from "../src/mission-system.js";
import { normalizeSave, SAVE_VERSION } from "../src/save.js";

const fixturesDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures");
const expectations = [
  { filename: "save-new.json", main: [], secondary: [] },
  { filename: "save-mid.json", main: ["m01"], secondary: ["s01"] },
  { filename: "save-complete.json", main: ["m01", "m02", "m03", "m04", "m05"], secondary: ["s01", "s02"] }
];

for (const expectation of expectations) {
  const serialized = JSON.parse(await readFile(resolve(fixturesDirectory, expectation.filename), "utf8"));
  const normalized = normalizeSave(serialized);
  assert.equal(serialized.version, 16, `${expectation.filename} debe conservar el formato v16 serializado`);
  assert.equal(normalized.version, SAVE_VERSION, `${expectation.filename} debe normalizarse a la versión vigente`);
  assert.deepEqual(normalized.campaign.completedMissions, expectation.main, `${expectation.filename} debe conservar sus misiones principales`);
  assert.deepEqual(normalized.campaign.completedSecondaryMissions, expectation.secondary, `${expectation.filename} debe conservar sus misiones secundarias`);
  assert.deepEqual(normalized, serialized, `${expectation.filename} debe ser estable al normalizarse`);
}

const midSave = normalizeSave(JSON.parse(await readFile(resolve(fixturesDirectory, "save-mid.json"), "utf8")));
assert.equal(missionState(MISSIONS.find((mission) => mission.id === "m02"), midSave).unlocked, true, "La partida intermedia debe dejar m02 disponible");

const completeSave = normalizeSave(JSON.parse(await readFile(resolve(fixturesDirectory, "save-complete.json"), "utf8")));
assert.equal(completeSave.campaign.firstSagaCompleted, true, "La partida completa debe cerrar la primera saga");

console.log("Pruebas de fixtures de guardado superadas.");
