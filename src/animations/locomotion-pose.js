const degrees = radians => radians * 180 / Math.PI;
const radians = angle => angle * Math.PI / 180;
const wrap = angle => ((angle + 180) % 360 + 360) % 360 - 180;
const direction = (from, to) => Math.atan2(to.y - from.y, to.x - from.x);
const rotate = (point, angle) => ({ x: point.x * Math.cos(angle) - point.y * Math.sin(angle),
  y: point.x * Math.sin(angle) + point.y * Math.cos(angle) });
const cache = new WeakMap();

export const TRAVEL_GAIT = Object.freeze({ duration: 680, support: .58, stride: 136, lift: 52, lean: 3, stance: .9 });

// Una fase de apoyo recorre el suelo a velocidad constante; la otra recoge
// el pie con la rodilla flexionada. Las piernas nunca son péndulos simétricos.
export function travelFootstep(phase) {
  const p = ((phase % 1) + 1) % 1;
  const { support, stride, lift } = TRAVEL_GAIT;
  if (p <= support) return { x: stride * (.5 - p / support), lift: 0,
    pitch: p < .1 ? -8 * (1 - p / .1) : p > support - .1 ? 10 * (p - support + .1) / .1 : 0 };
  const swing = (p - support) / (1 - support);
  const progress = swing * swing * (3 - 2 * swing);
  return { x: stride * (progress - .5), lift: lift * Math.sin(Math.PI * swing) ** 2,
    pitch: 10 - 18 * progress };
}

function legPose(rig, side, step, bob, ground) {
  const hip = rig.joints[`hip${side}`], knee = rig.joints[`knee${side}`], ankle = rig.joints[`ankle${side}`];
  const foot = rig.byId[side === "Left" ? "pie_izquierdo" : "pie_derecho"];
  const centerX = (rig.joints.hipLeft.x + rig.joints.hipRight.x) / 2;
  const sole = rotate({ x: foot.x - ankle.x, y: foot.y + foot.height / 2 - ankle.y }, radians(step.pitch));
  const lean = radians(TRAVEL_GAIT.lean);
  // Mantener las dos calles de la vista tres cuartos evita cruzar los muslos
  // para intentar convertir las piezas frontales en una silueta de perfil.
  const trackX = foot.x * TRAVEL_GAIT.stance + centerX * (1 - TRAVEL_GAIT.stance);
  const target = rotate({ x: trackX + step.x - sole.x,
    y: ground - step.lift - sole.y - bob }, -lean);
  const upperLength = Math.hypot(knee.x - hip.x, knee.y - hip.y);
  const lowerLength = Math.hypot(ankle.x - knee.x, ankle.y - knee.y);
  const distance = Math.min(upperLength + lowerLength - .001, Math.hypot(target.x - hip.x, target.y - hip.y));
  const spread = Math.acos(Math.max(-1, Math.min(1,
    (upperLength ** 2 + distance ** 2 - lowerLength ** 2) / (2 * upperLength * distance))));
  // Ambas rodillas flexionan hacia el avance del personaje, también al reflejarlo.
  const upperAngle = direction(hip, target) - spread;
  const posedKnee = { x: hip.x + upperLength * Math.cos(upperAngle), y: hip.y + upperLength * Math.sin(upperAngle) };
  const lowerAngle = direction(posedKnee, target);
  const upperRest = direction(hip, knee), lowerRest = direction(knee, ankle);
  const hipAngle = wrap(degrees(upperAngle - upperRest));
  const kneeAngle = wrap(degrees(lowerAngle - upperAngle - (lowerRest - upperRest)));
  return { [`hip${side}`]: { angle: hipAngle }, [`knee${side}`]: { angle: kneeAngle },
    [`ankle${side}`]: { angle: step.pitch - TRAVEL_GAIT.lean - hipAngle - kneeAngle } };
}

export function runCycleForRig(rig) {
  if (cache.has(rig.joints)) return cache.get(rig.joints);
  const ground = Math.max(...[rig.byId.pie_izquierdo, rig.byId.pie_derecho].map(foot => foot.y + foot.height / 2));
  const keys = {};
  for (let frame = 0; frame <= 40; frame++) {
    const phase = frame / 40, swing = Math.cos(2 * Math.PI * phase);
    const bob = 12 + 4 * Math.cos(4 * Math.PI * phase);
    const pose = {
      ...legPose(rig, "Left", travelFootstep(phase), bob, ground),
      ...legPose(rig, "Right", travelFootstep(phase + .5), bob, ground),
      rig: { angle: TRAVEL_GAIT.lean, y: bob },
      shoulderLeft: { angle: -14 * swing }, shoulderRight: { angle: 14 * swing },
      elbowLeft: { angle: -18 - 6 * swing }, elbowRight: { angle: -18 + 6 * swing },
      wristLeft: { angle: 3 }, wristRight: { angle: 3 },
      neck: { angle: -1.5 }, shadow: { scaleX: -.035 * Math.cos(4 * Math.PI * phase) }
    };
    for (const [target, transform] of Object.entries(pose)) {
      (keys[target] ||= []).push(Object.freeze({ t: frame * TRAVEL_GAIT.duration / 40, ...transform }));
    }
  }
  Object.values(keys).forEach(Object.freeze);
  const clip = Object.freeze({ id: "run-cycle", label: "Marcha de viaje", description: "Apoyo alterno, impulso y recogida del pie con brazos flexionados.",
    category: "locomoción", state: "locomotion", status: "integrated", loop: true,
    duration: TRAVEL_GAIT.duration, requires: Object.freeze(Object.keys(keys)), keys: Object.freeze(keys) });
  cache.set(rig.joints, clip);
  return clip;
}
