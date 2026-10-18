import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ENEMY_ROSTER, MISSIONS } from "../src/data.js";
import { combatFeatures, createEnemyState, fieldSuppliesForBattle, interludePlan, resolveEncounterIds } from "../src/combat-modifiers.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const snapshotPath = path.join(testDir, "snapshots", "combat-behavior.json");

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function snapshotCase(mission, campaign) {
  const encounterIds = resolveEncounterIds(mission, campaign);
  return {
    encounterIds,
    fieldSupplies: fieldSuppliesForBattle(mission, campaign),
    features: combatFeatures(mission, campaign),
    interludes: interludePlan(mission),
    enemies: encounterIds.map((id) => ({ id, state: createEnemyState(ENEMY_ROSTER[id], mission, campaign) }))
  };
}

const cases = {};
for (const mission of MISSIONS) {
  for (const banditPrisonerChoice of ["interrogate", "eliminate"]) {
    for (const hideoutEntryChoice of ["secret", "main"]) {
      for (const hideoutSupplies of [0, 1, 2]) {
        const key = [mission.id, banditPrisonerChoice, hideoutEntryChoice, hideoutSupplies].join("|");
        cases[key] = digest(snapshotCase(mission, { banditPrisonerChoice, hideoutEntryChoice, hideoutSupplies }));
      }
    }
  }
}

const actual = { schema: 1, cases };
if (process.env.UPDATE_COMBAT_SNAPSHOT === "1") {
  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.writeFileSync(snapshotPath, `${JSON.stringify(actual, null, 2)}\n`);
}

const expected = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
assert.deepEqual(actual, expected, "El comportamiento de combate cambió respecto de la línea base");
assert.equal(Object.keys(cases).length, 60, "La matriz debe cubrir cinco misiones y doce combinaciones de campaña");

console.log("combat snapshot tests passed");
