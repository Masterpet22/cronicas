import assert from "node:assert/strict";
import { MISSIONS, SECONDARY_MISSIONS } from "../src/content/index.js";
import { migrateSaveToV17 } from "../src/save/save-migrations.js";

const legacy = {
  version: 16,
  progression: { level: 12, coins: 444 },
  campaign: {
    completedMissions: ["m01", "m02", "m04"],
    completedSecondaryMissions: ["s01"],
    banditPrisonerChoice: "interrogate",
    doctorBookDeliveryPending: true,
    hideoutSupplies: 2,
    doctorMissionUnlocked: true,
    firstSagaCompleted: false
  }
};
const migrated = migrateSaveToV17(legacy, { missions: MISSIONS, secondaryMissions: SECONDARY_MISSIONS });
assert.equal(migrated.version, 17);
assert.deepEqual(migrated.campaign.completedMissions, ["m01", "m02", "m04"]);
assert.deepEqual(migrated.campaign.completedSecondaryMissions, ["s01"]);
assert.equal(migrated.campaign.banditPrisonerChoice, "interrogate");
assert.equal(migrated.campaign.doctorBookDeliveryPending, true);
assert.equal(migrated.campaign.hideoutSupplies, 2);
assert.equal(Object.hasOwn(migrated.campaign, "doctorMissionUnlocked"), false);
assert.equal(Object.hasOwn(migrated.campaign, "firstSagaCompleted"), false);
assert.equal(migrated.campaign.missionProgress.m01.status, "completed");
assert.equal(migrated.campaign.missionProgress.m01.currentStepId, null);

const oldNumbering = migrateSaveToV17({ version: 15, campaign: { completedMissions: ["m01", "m11", "m12", "m13", "m14"] } }, { missions: MISSIONS, secondaryMissions: SECONDARY_MISSIONS });
assert.deepEqual(oldNumbering.campaign.completedMissions, ["m01", "m02", "m03", "m04", "m05"]);

console.log("Pruebas de migración v17 superadas.");
