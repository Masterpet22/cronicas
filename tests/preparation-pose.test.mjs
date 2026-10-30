import assert from "node:assert/strict";
import { CHARACTER_RIGS } from "../src/character-rigs.js";
import { PUPPET_ANIMATION_CLIPS, ANIMATION_PRIORITIES } from "../src/animations/clips.js";
import { sampleAnimationPose } from "../src/animations/runtime.js";
import { preparationClipForRig } from "../src/animations/preparation-pose.js";
import { validateAnimationCatalog } from "../src/animations/schema.js";

const rotate = (point, angle) => {
  const r = angle * Math.PI / 180;
  return { x: point.x * Math.cos(r) - point.y * Math.sin(r), y: point.x * Math.sin(r) + point.y * Math.cos(r) };
};
function posedHand(rig, pose, side) {
  const shoulder = rig.joints[`shoulder${side}`], elbow = rig.joints[`elbow${side}`], wrist = rig.joints[`wrist${side}`];
  const hand = rig.byId[side === "Left" ? "mano_izquierda" : "mano_derecha"];
  const upperAngle = pose[`shoulder${side}`].angle;
  const lowerAngle = upperAngle + pose[`elbow${side}`].angle;
  const handAngle = lowerAngle + pose[`wrist${side}`].angle;
  const upper = rotate({ x: elbow.x - shoulder.x, y: elbow.y - shoulder.y }, upperAngle);
  const lower = rotate({ x: wrist.x - elbow.x, y: wrist.y - elbow.y }, lowerAngle);
  const palm = rotate({ x: hand.x - wrist.x, y: hand.y - wrist.y }, handAngle);
  return { x: shoulder.x + upper.x + lower.x + palm.x, y: shoulder.y + upper.y + lower.y + palm.y, angle: handAngle };
}

const base = PUPPET_ANIMATION_CLIPS["prepare-technique"], original = structuredClone(base);
for (const [bodyType, rig] of Object.entries(CHARACTER_RIGS)) {
  const clip = preparationClipForRig(base, rig);
  assert.deepEqual(validateAnimationCatalog({ [clip.id]: clip }, ANIMATION_PRIORITIES), []);
  const centerX = (rig.joints.shoulderLeft.x + rig.joints.shoulderRight.x) / 2;
  for (let time = clip.enterDuration; time <= 3 * 1240; time += 31) {
    const pose = sampleAnimationPose(clip, time);
    const left = posedHand(rig, pose, "Left"), right = posedHand(rig, pose, "Right");
    assert.ok(left.x > right.x, `${bodyType}: las manos no deben cruzarse hacia los lados opuestos`);
    assert.ok(left.x - right.x < rig.byId.torso.width * .2, `${bodyType}: las manos deben permanecer juntas`);
    for (const hand of [left, right]) {
      assert.ok(Math.abs(hand.x - centerX) < rig.byId.torso.width * .12, `${bodyType}: gesto centrado`);
      assert.ok(hand.y < rig.byId.torso.y && hand.y > rig.joints.neck.y, `${bodyType}: gesto a la altura del pecho`);
      assert.ok(Math.abs(Math.abs(hand.angle) - 180) < .001, `${bodyType}: los dedos deben apuntar hacia arriba`);
    }
  }
}
assert.deepEqual(base, original, "Adaptar un cuerpo no debe modificar el catálogo compartido ni la pose del otro cuerpo");
console.log("Preparación: manos juntas, muñecas orientadas y gesto estable durante todo el ciclo de ambos rigs.");
