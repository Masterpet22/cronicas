const degrees = radians => radians * 180 / Math.PI;
const radians = angle => angle * Math.PI / 180;
const wrap = angle => ((angle + 180) % 360 + 360) % 360 - 180;
const direction = (from, to) => Math.atan2(to.y - from.y, to.x - from.x);

// Resuelve el gesto sobre la longitud real de cada brazo. Los ángulos fijos
// del rig anterior cruzaban las muñecas al cambiar las proporciones del cuerpo.
function armPose(rig, side, handCenter) {
  const shoulder = rig.joints[`shoulder${side}`], elbow = rig.joints[`elbow${side}`], wrist = rig.joints[`wrist${side}`];
  const hand = rig.byId[side === "Left" ? "mano_izquierda" : "mano_derecha"];
  const handAngle = 180 - (hand.restRotation || 0);
  const rotation = radians(handAngle);
  const handOffset = { x: hand.x - wrist.x, y: hand.y - wrist.y };
  const target = {
    x: handCenter.x - (handOffset.x * Math.cos(rotation) - handOffset.y * Math.sin(rotation)),
    y: handCenter.y - (handOffset.x * Math.sin(rotation) + handOffset.y * Math.cos(rotation))
  };
  const upperLength = Math.hypot(elbow.x - shoulder.x, elbow.y - shoulder.y);
  const lowerLength = Math.hypot(wrist.x - elbow.x, wrist.y - elbow.y);
  const distance = Math.max(Math.abs(upperLength - lowerLength) + .001,
    Math.min(upperLength + lowerLength - .001, Math.hypot(target.x - shoulder.x, target.y - shoulder.y)));
  const spread = Math.acos(Math.max(-1, Math.min(1,
    (upperLength ** 2 + distance ** 2 - lowerLength ** 2) / (2 * upperLength * distance))));
  const upperAngle = direction(shoulder, target) + (side === "Left" ? -spread : spread);
  const posedElbow = { x: shoulder.x + upperLength * Math.cos(upperAngle), y: shoulder.y + upperLength * Math.sin(upperAngle) };
  const lowerAngle = direction(posedElbow, target);
  const shoulderOffset = wrap(degrees(upperAngle - direction(shoulder, elbow)));
  const elbowOffset = wrap(degrees(lowerAngle - upperAngle - (direction(elbow, wrist) - direction(shoulder, elbow))));
  return {
    [`shoulder${side}`]: shoulderOffset,
    [`elbow${side}`]: elbowOffset,
    [`wrist${side}`]: wrap(handAngle - shoulderOffset - elbowOffset)
  };
}

export function preparationClipForRig(clip, rig) {
  const torso = rig.byId.torso;
  const centerX = (rig.joints.shoulderLeft.x + rig.joints.shoulderRight.x) / 2;
  const centerY = torso.y - torso.height * .16;
  const halfGap = torso.width * .07;
  const pose = rise => ({
    ...armPose(rig, "Left", { x: centerX + halfGap, y: centerY + rise }),
    ...armPose(rig, "Right", { x: centerX - halfGap, y: centerY + rise })
  });
  const from = pose(0), to = pose(-2);
  return Object.freeze({ ...clip, tracks: Object.freeze(clip.tracks.map(track => track.target in from
    ? Object.freeze({ ...track, from: { ...track.from, angle: from[track.target] }, to: { ...track.to, angle: to[track.target] } })
    : track)) });
}
