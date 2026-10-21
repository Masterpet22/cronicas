import assert from "node:assert/strict";
import {
  TIMELINE_COMPLETE,
  TIMELINE_READY,
  actionNeedsPreparation,
  advanceTimelineProgress,
  millisecondsToTimelineThreshold,
  timelineMarkerPosition,
  timelineMilestones,
  timelineRate
} from "../src/battle/timeline.js";

assert.equal(TIMELINE_READY, 0.8);
assert.equal(TIMELINE_COMPLETE, 1);
assert.deepEqual(timelineMilestones(0, 100), [20, 40, 60, 80]);
assert.equal(timelineMarkerPosition(0.8, 310, 914), 793.2);

assert.equal(millisecondsToTimelineThreshold(0, 10), 1200);
assert.equal(millisecondsToTimelineThreshold(0, 20), 600);
assert.ok(Math.abs(advanceTimelineProgress(0, 10, 600) - 0.4) < Number.EPSILON);

const instant = { id: "quick", speedMod: 2, seals: [] };
const prepared = { id: "heavy", speedMod: -4, preparation: true };
assert.equal(actionNeedsPreparation(instant), false);
assert.equal(actionNeedsPreparation(prepared), true);
assert.equal(actionNeedsPreparation({ seals: ["tigre"] }), true);
assert.ok(timelineRate(10, prepared) < timelineRate(10, { preparation: true, speedMod: 4 }));
assert.ok(millisecondsToTimelineThreshold(0.8, 10, prepared) > 0);
assert.equal(advanceTimelineProgress(0.8, 10, 10_000, prepared), 1);

console.log("Pruebas de la línea temporal superadas.");
