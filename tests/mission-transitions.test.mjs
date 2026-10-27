import assert from "node:assert/strict";
import { missionTransitionMode, validateMissionTransitions } from "../src/mission-transitions.js";
import { createCharacter, createDefaultSave, normalizeSave } from "../src/save.js";

assert.equal(missionTransitionMode({}, "departure"), "route");
const mission = { id: "example", encounters: ["one", "two", "three"], transitions: {
  departure: "teleport", betweenEncounters: { default: "route", 3: "teleport" }, return: "route"
} };
assert.deepEqual(validateMissionTransitions(mission), []);
assert.equal(missionTransitionMode(mission, "departure"), "teleport");
assert.equal(missionTransitionMode(mission, "betweenEncounters", 2), "route");
assert.equal(missionTransitionMode(mission, "betweenEncounters", 3), "teleport");
assert.equal(missionTransitionMode(mission, "return"), "route");
assert.equal(missionTransitionMode({ transitions: { betweenEncounters: "teleport" } }, "betweenEncounters", 2), "teleport");
assert.equal(missionTransitionMode({ transitions: { return: "typo" } }, "return"), "route");
for (const transitions of [{ departure: "typo" }, { unknown: "route" }, { betweenEncounters: { 1: "teleport" } }, { betweenEncounters: { 9: "teleport" } }, { betweenEncounters: ["route"] }]) {
  assert.ok(validateMissionTransitions({ ...mission, transitions }).length, "La configuración inválida debe detectarse antes de jugar");
}
for (const object of ["log", "dog", "chair"]) {
  const save = createCharacter(createDefaultSave(), { name: "Kira", affinity: "fuego", teleportObject: object });
  assert.equal(normalizeSave(save).character.teleportObject, object);
}
const old = createCharacter(createDefaultSave(), { name: "Anterior" });
delete old.character.teleportObject;
assert.equal(normalizeSave(old).character.teleportObject, "log");
assert.equal(normalizeSave({ ...old, character: { ...old.character, teleportObject: "unknown" } }).character.teleportObject, "log");
console.log("Configuración de transiciones y objetos de transportación verificada.");
