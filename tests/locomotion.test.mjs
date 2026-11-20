import assert from "node:assert/strict";
import { CHARACTER_RIGS } from "../src/character-rigs.js";
import { runCycleForRig, travelFootstep, TRAVEL_GAIT } from "../src/animations/locomotion-pose.js";
import { sampleAnimationPose } from "../src/animations/runtime.js";
import { validateAnimationCatalog } from "../src/animations/schema.js";
import { ANIMATION_PRIORITIES } from "../src/animations/clips.js";

const rotate = ({ x, y }, angle) => {
  const r = angle * Math.PI / 180;
  return { x: x * Math.cos(r) - y * Math.sin(r), y: x * Math.sin(r) + y * Math.cos(r) };
};
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const subtract = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });

for (const [body, rig] of Object.entries(CHARACTER_RIGS)) {
  const clip = runCycleForRig(rig);
  assert.deepEqual(validateAnimationCatalog({ "run-cycle": clip }, ANIMATION_PRIORITIES), []);
  assert.equal(runCycleForRig(rig), clip, "Cada cuerpo reutiliza sus fotogramas sin recalcular por luchador");
  assert.deepEqual(sampleAnimationPose(clip, 0), sampleAnimationPose(clip, clip.duration), "El bucle no debe saltar");
  const ground = Math.max(rig.byId.pie_izquierdo.y + rig.byId.pie_izquierdo.height / 2, rig.byId.pie_derecho.y + rig.byId.pie_derecho.height / 2);
  for (let time = 0; time < clip.duration; time += 3) {
    const pose = sampleAnimationPose(clip, time), phase = time / clip.duration;
    const steps = [travelFootstep(phase), travelFootstep(phase + .5)];
    assert.ok(steps.some(step => step.lift === 0), "Siempre hay un pie de apoyo");
    for (const [index, side] of ["Left", "Right"].entries()) {
      const hip = rig.joints[`hip${side}`], knee = rig.joints[`knee${side}`], ankle = rig.joints[`ankle${side}`];
      const foot = rig.byId[side === "Left" ? "pie_izquierdo" : "pie_derecho"];
      const hipAngle = pose[`hip${side}`].angle, kneeAngle = hipAngle + pose[`knee${side}`].angle;
      const footAngle = kneeAngle + pose[`ankle${side}`].angle;
      const posedKnee = add(hip, rotate(subtract(knee, hip), hipAngle));
      const posedAnkle = add(posedKnee, rotate(subtract(ankle, knee), kneeAngle));
      const sole = add(posedAnkle, rotate({ x: foot.x - ankle.x, y: foot.y + foot.height / 2 - ankle.y }, footAngle));
      const worldSole = add(rotate(sole, pose.rig.angle), { x: 0, y: pose.rig.y });
      const expectedX = foot.x * TRAVEL_GAIT.stance + (rig.joints.hipLeft.x + rig.joints.hipRight.x) / 2 * (1 - TRAVEL_GAIT.stance) + steps[index].x;
      assert.ok(Math.abs(worldSole.x - expectedX) < 2, `${body}/${side}: el apoyo sigue el avance a ${time} ms`);
      assert.ok(Math.abs(worldSole.y - (ground - steps[index].lift)) < 2, `${body}/${side}: la suela no atraviesa el suelo a ${time} ms`);
      assert.ok(Math.abs(pose[`knee${side}`].angle) < 95, "La rodilla evita una flexión extrema");
      assert.ok(Math.abs(pose[`hip${side}`].angle) < 50, "La zancada no abre las piernas como tijeras");
    }
  }
}
console.log("Marcha: apoyo alterno, suelas sobre el suelo, flexión y continuidad de ambos cuerpos verificados.");
