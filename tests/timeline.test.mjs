import assert from "node:assert/strict";
import { ENEMY_ACTIONS, SEALS } from "../src/data.js";
import { combatantSpeed } from "../src/battle/turn.js";
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
assert.equal(timelineMarkerPosition(0.8, 360, 840), 744);

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

for (const [id, count] of [["ember", 2], ["toxin", 3]]) {
  const action = ENEMY_ACTIONS[id];
  assert.equal(action.seals.length, count);
  assert.ok(action.seals.every(id => SEALS[id]), "Los sellos del enemigo deben tener una imagen válida");
  for (const speed of [5, 10, 20]) {
    const ms = millisecondsToTimelineThreshold(.8, speed, action);
    assert.equal(ms, count * 300 * 10 / speed, `${id}: misma regla de sellos y velocidad que el jugador`);
    assert.equal(ms, millisecondsToTimelineThreshold(.8, speed, { ...action, speedMod: -999 }));
    assert.equal(ms, millisecondsToTimelineThreshold(.8, speed, { ...action, speedMod: 999 }));
  }
  const wetSpeed = combatantSpeed({ baseSpeed: 10, speedModifier: 0, soak: { stacks: 2, turns: 2 } });
  assert.ok(millisecondsToTimelineThreshold(.8, wetSpeed, action) > count * 300,
    "Empapado también ralentiza la preparación enemiga real");
}
assert.deepEqual(ENEMY_ACTIONS.quick.seals, []);
assert.deepEqual(ENEMY_ACTIONS.heavy.seals, [], "Los golpes físicos conservan su preparación sin sellos");

console.log("Pruebas de la línea temporal superadas.");
