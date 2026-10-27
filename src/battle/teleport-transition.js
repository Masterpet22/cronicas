import { teleportObject, TELEPORT_OBJECTS } from "../teleport-objects.js";
import { HEIGHT, WIDTH } from "./runtime.js?v=0.91.0";

export function queueTeleportObjects(scene) {
  TELEPORT_OBJECTS.forEach(object => {
    if (!scene.textures.exists(object.texture)) scene.load.image(object.texture, object.file);
  });
}

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
const stage = (scene, name, object) => scene.events.emit("teleport-stage", { stage: name, object: object?.id });
const destroy = item => { if (item?.scene) item.destroy(); };

// Combat evasion and level-up share the same quick substitution cadence.
export const SUBSTITUTION_TIMING = Object.freeze({
  smokeIn: 40, smokeOut: 190, objectHold: 260, objectOut: 170,
  arrivalIn: 40, arrivalOut: 90, screenFade: 90
});

// Interrupted scenes release their promises instead of continuing on destroyed objects.
function animate(scene, config) {
  return new Promise(resolve => {
    let animation;
    const cancel = () => { animation?.stop(); resolve(false); };
    scene.events.once("shutdown", cancel);
    animation = scene.tweens.add({ ...config, onComplete: () => {
      scene.events.off("shutdown", cancel);
      resolve(true);
    } });
  });
}

function wait(scene, duration) {
  return new Promise(resolve => {
    const cancel = () => { timer.remove(false); resolve(false); };
    const timer = scene.time.delayedCall(duration, () => { scene.events.off("shutdown", cancel); resolve(true); });
    scene.events.once("shutdown", cancel);
  });
}

export async function teleportSmoke(scene, x, y, onCovered = () => {}, { pace = "travel", arrival = false } = {}) {
  const reduced = reducedMotion();
  const quick = pace === "substitution";
  const durationIn = quick ? (arrival ? SUBSTITUTION_TIMING.arrivalIn : SUBSTITUTION_TIMING.smokeIn) : reduced ? 90 : 170;
  const durationOut = quick ? (arrival ? SUBSTITUTION_TIMING.arrivalOut : SUBSTITUTION_TIMING.smokeOut) : reduced ? 150 : 340;
  const cloud = scene.add.container(x, y).setDepth(92).setAlpha(0).setScale(.4).setName("teleport-smoke");
  const count = reduced ? 7 : 13;
  for (let index = 0; index < count; index += 1) {
    const angle = index * Math.PI * 2 / count;
    cloud.add(scene.add.circle(Math.cos(angle) * 57, Math.sin(angle) * 59, 34 + index % 3 * 6,
      [0xe8edef, 0xc4cfd5, 0xa4b1b9][index % 3], .94));
  }
  cloud.add(scene.add.circle(0, 0, 67, 0xd9e1e5, .98));
  try {
    if (!await animate(scene, { targets: cloud, alpha: 1, scale: 1, duration: durationIn, ease: "Cubic.out" })) return false;
    onCovered();
    return await animate(scene, { targets: cloud, alpha: 0, scale: reduced ? 1.08 : 1.4, y: y - 22,
      duration: durationOut, ease: "Sine.out" });
  } finally { destroy(cloud); }
}

export async function teleportDeparture(scene, fighter, objectId = "log", { pace = "travel", leaveObject = true } = {}) {
  const object = leaveObject ? teleportObject(objectId) : null;
  const quick = pace === "substitution";
  const x = fighter.body.x;
  const groundY = fighter.shadow.y + 8;
  let prop;
  let grow;
  stage(scene, "departure-smoke", object);
  try {
    const smoked = await teleportSmoke(scene, x, fighter.body.y - 48, () => {
      fighter.body.setAlpha(0);
      fighter.shadow.setAlpha(0);
      if (!leaveObject) return;
      prop = scene.add.image(x, groundY, object.texture).setOrigin(.5, 1)
        .setDisplaySize(object.width, object.height).setDepth(85).setName("teleport-object");
      if (quick) {
        const scaleX = prop.scaleX;
        const scaleY = prop.scaleY;
        prop.setScale(scaleX * .04, scaleY * .04);
        grow = animate(scene, { targets: prop, scaleX, scaleY, duration: SUBSTITUTION_TIMING.smokeOut, ease: "Back.out" });
      }
      stage(scene, "object-left", object);
    }, { pace });
    if (!smoked || !leaveObject) return smoked;
    if (grow && !await grow) return false;
    if (!await wait(scene, quick ? SUBSTITUTION_TIMING.objectHold : reducedMotion() ? 180 : 420)) return false;
    if (!await animate(scene, { targets: prop, alpha: 0, scaleX: prop.scaleX * .72, scaleY: prop.scaleY * .72,
      duration: quick ? SUBSTITUTION_TIMING.objectOut : reducedMotion() ? 110 : 200, ease: "Sine.in" })) return false;
    destroy(prop);
    stage(scene, "object-disappears", object);
    return true;
  } finally { destroy(prop); }
}

export async function teleportArrival(scene, fighter, { bodyAlpha = 1, shadowAlpha = .16, pace = "travel" } = {}) {
  fighter.body.setAlpha(0);
  fighter.shadow.setAlpha(0);
  stage(scene, "arrival-smoke");
  return teleportSmoke(scene, fighter.body.x, fighter.body.y - 48, () => {
    fighter.body.setAlpha(bodyAlpha);
    fighter.shadow.setAlpha(shadowAlpha);
    stage(scene, "character-arrives");
  }, { pace, arrival: true });
}

export const teleportVanish = (scene, fighter) => teleportDeparture(scene, fighter, undefined, { pace: "substitution", leaveObject: false });

export async function playCombatSubstitution(scene, fighter, objectId) {
  const appearance = { bodyAlpha: fighter.body.alpha, shadowAlpha: fighter.shadow.alpha, pace: "substitution" };
  if (!await teleportDeparture(scene, fighter, objectId, { pace: "substitution" })) return false;
  return teleportArrival(scene, fighter, appearance);
}

export async function teleportFadeOut(scene, { pace = "travel" } = {}) {
  const cover = scene.add.rectangle(0, 0, WIDTH, HEIGHT, 0x02070e, 1).setOrigin(0).setDepth(110).setAlpha(0).setName("teleport-screen-cover");
  stage(scene, "screen-transition");
  if (await animate(scene, { targets: cover, alpha: 1, duration: pace === "substitution" ? SUBSTITUTION_TIMING.screenFade : reducedMotion() ? 120 : 260 })) return cover;
  destroy(cover);
  return null;
}

export async function teleportScreenChange(scene, changeScreen) {
  const cover = await teleportFadeOut(scene);
  if (!cover) return false;
  try {
    await changeScreen();
    return await animate(scene, { targets: cover, alpha: 0, duration: reducedMotion() ? 120 : 260 });
  } finally { destroy(cover); }
}

export async function playTeleportTransition(scene, { fighter, objectId = "log", changeScreen = () => {} }) {
  const appearance = { bodyAlpha: fighter.body.alpha, shadowAlpha: fighter.shadow.alpha };
  if (!await teleportDeparture(scene, fighter, objectId)) return false;
  if (!await teleportScreenChange(scene, changeScreen)) return false;
  return teleportArrival(scene, fighter, appearance);
}
