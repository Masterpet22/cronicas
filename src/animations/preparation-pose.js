const degrees = radians => radians * 180 / Math.PI;
const radians = angle => angle * Math.PI / 180;
const wrap = angle => ((angle + 180) % 360 + 360) % 360 - 180;
const direction = (from, to) => Math.atan2(to.y - from.y, to.x - from.x);

// Resuelve el gesto sobre la longitud real de cada brazo. Los ángulos fijos
// del rig anterior cruzaban las muñecas al cambiar las proporciones del cuerpo.
function armPose(rig, side, handCenter, palmAngle) {
  const shoulderId = `shoulder${side}`;
  const restShoulder = rig.joints[shoulderId], elbow = rig.joints[`elbow${side}`], wrist = rig.joints[`wrist${side}`];
  const partSide = side === "Left" ? "izquierdo" : "derecho";
  const upperArm = rig.byId[`brazo_${partSide}`];
  const hand = rig.byId[side === "Left" ? "mano_izquierda" : "mano_derecha"];
  // Al rotar con el hombro de reposo, el borde del brazo se aleja del
  // torso. Acerca ligeramente la articulación y resuelve desde ese origen.
  const shoulderOffsetX = (side === "Left" ? -1 : 1) * upperArm.width * .16;
  const shoulderOffsetY = upperArm.height * .01;
  const shoulder = { x: restShoulder.x + shoulderOffsetX, y: restShoulder.y + shoulderOffsetY };
  const handAngle = palmAngle - (hand.restRotation || 0);
  const rotation = radians(handAngle);
  // La mano se refleja alrededor de la muñeca solo durante este gesto.
  const handOffset = { x: wrist.x - hand.x, y: hand.y - wrist.y };
  const target = {
    x: handCenter.x - (handOffset.x * Math.cos(rotation) - handOffset.y * Math.sin(rotation)),
    y: handCenter.y - (handOffset.x * Math.sin(rotation) + handOffset.y * Math.cos(rotation))
  };
  const upperLength = Math.hypot(elbow.x - restShoulder.x, elbow.y - restShoulder.y);
  const lowerLength = Math.hypot(wrist.x - elbow.x, wrist.y - elbow.y);
  const distance = Math.max(Math.abs(upperLength - lowerLength) + .001,
    Math.min(upperLength + lowerLength - .001, Math.hypot(target.x - shoulder.x, target.y - shoulder.y)));
  const spread = Math.acos(Math.max(-1, Math.min(1,
    (upperLength ** 2 + distance ** 2 - lowerLength ** 2) / (2 * upperLength * distance))));
  const upperAngle = direction(shoulder, target) + (side === "Left" ? -spread : spread);
  const posedElbow = { x: shoulder.x + upperLength * Math.cos(upperAngle), y: shoulder.y + upperLength * Math.sin(upperAngle) };
  const lowerAngle = direction(posedElbow, target);
  const upperRestAngle = direction(restShoulder, elbow);
  const shoulderOffset = wrap(degrees(upperAngle - upperRestAngle));
  const elbowOffset = wrap(degrees(lowerAngle - upperAngle - (direction(elbow, wrist) - upperRestAngle)));
  return {
    [shoulderId]: { x: shoulderOffsetX, y: shoulderOffsetY, angle: shoulderOffset },
    [`elbow${side}`]: { angle: elbowOffset },
    [`wrist${side}`]: { angle: wrap(handAngle - shoulderOffset - elbowOffset) }
  };
}

export function preparationClipForRig(clip, rig) {
  const torso = rig.byId.torso;
  const centerX = (rig.joints.shoulderLeft.x + rig.joints.shoulderRight.x) / 2;
  const centerY = torso.y - torso.height * .16;
  // Las manos de reposo ya tienen los dedos dibujados. Deja visibles ambas
  // siluetas y acerca los dedos con una inclinación leve de cada muñeca.
  const hand = rig.byId.mano_izquierda;
  const halfGap = hand.width * (hand.scaleX ?? 1) * .42;
  const pose = closing => ({
    ...armPose(rig, "Left", { x: centerX + halfGap - 4 * closing, y: centerY - 12 - 5 * closing }, 168 - 5 * closing),
    ...armPose(rig, "Right", { x: centerX - halfGap + 4 * closing, y: centerY + 6 - 10 * closing }, 192 + 5 * closing)
  });
  const from = pose(0), to = pose(1);
  const tracks = clip.tracks.map(track => {
    const first = from[track.target], last = to[track.target];
    if (!first) return track;
    return Object.freeze({
      ...track,
      from: { ...track.from, ...first },
      to: { ...track.to, ...last, angle: first.angle + wrap(last.angle - first.angle) }
    });
  });
  return Object.freeze({ ...clip, tracks: Object.freeze(tracks) });
}
