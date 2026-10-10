import assert from "node:assert/strict";
import { fighterPreviewSvg, resolveFighterAppearance } from "../src/character.js";

const appearance = resolveFighterAppearance({ bodyType: "female", face: 3, hair: 4, top: 2, bottom: 3, shoes: 2, weapon: "staff", clothColor: 0x68a8ff, accentColor: "#25344d" });
assert.equal(appearance.bodyType, "female");
assert.equal(appearance.hair, 4);
assert.equal(appearance.cloth, "#68a8ff", "Los colores de Phaser y del dojo deben normalizarse igual");

const preview = fighterPreviewSvg(appearance);
assert.match(preview, /^<svg/);
assert.match(preview, /Combatiente geométrico personalizado/);
assert.match(preview, /#68a8ff/, "La vista previa debe conservar el color normalizado al reutilizar una apariencia resuelta");
assert.doesNotMatch(preview, /<img|assets\/modular/, "La vista previa no debe depender de los atlas experimentales");

const repaired = resolveFighterAppearance({ face: 99, hair: -4, top: 0, bottom: 20, shoes: 8, weapon: "invalid" });
assert.deepEqual(
  { face: repaired.face, hair: repaired.hair, top: repaired.top, bottom: repaired.bottom, shoes: repaired.shoes, weapon: repaired.weapon },
  { face: 3, hair: 1, top: 1, bottom: 3, shoes: 2, weapon: "kunai" }
);

import { DEFAULT_IDLE_CLIP, PUPPET_ANIMATION_CLIPS, animationClipList } from "../src/animations/clips.js";
import { PuppetAnimationController } from "../src/animations/controller.js";
import { MAN_SPRITE_LAYERS, fighterTextureKey, playPlayerDamageReaction, preparePlayerPunch, queueFighterTexture, queuePlayerFighterTextures, recoverPlayerPunch, releasePlayerPunch, startPlayerBreathing, startPlayerGuard, startPlayerRunning, stopPlayerBreathing, stopPlayerGuard, stopPlayerRunning } from "../src/fighters.js";
import { playerFighterAppearance } from "../src/character.js";

const playerSave = {
  character: { name: "Akio", appearance: "#e64c3c", bodyType: "male", face: 2, hair: 3, top: 1, bottom: 2, shoes: 1 },
  equipment: { weapon: "tanto" }
};
const playerApp = playerFighterAppearance(playerSave);
assert.equal(playerApp.weapon, "sword", "El arma 'tanto' del equipo debe mapearse a 'sword' en el combatiente");
assert.equal(playerFighterAppearance({ ...playerSave, equipment: { weapon: null } }).weapon, "none", "Desequipar el arma debe ocultarla en el combatiente");
assert.equal(playerApp.clothColor, "#e64c3c");

const key1 = fighterTextureKey(playerApp);
const key2 = fighterTextureKey(playerApp);
assert.equal(key1, key2, "La clave de textura debe ser determinista para la misma apariencia");

const loaded = [];
const mockScene = {
  textures: { exists: (k) => loaded.includes(k) },
  load: { image: (k, url) => loaded.push(k) }
};
queueFighterTexture(mockScene, playerApp);
assert.equal(loaded[0], key1, "queueFighterTexture debe encolar la textura con la clave correspondiente");

loaded.length = 0;
assert.equal(queuePlayerFighterTextures(mockScene, playerApp), "modular", "El cuerpo masculino debe usar los sprites modulares");
assert.equal(loaded.length, 14, "Deben cargarse las catorce partes del cuerpo masculino");
assert.deepEqual(MAN_SPRITE_LAYERS.map(({ id }) => id).sort(), [
  "antebrazo_derecho", "antebrazo_izquierdo", "brazo_derecho", "brazo_izquierdo", "cabeza", "mano_derecha", "mano_izquierda",
  "muslo_derecho", "muslo_izquierdo", "pie_derecho", "pie_izquierdo", "pierna_derecha", "pierna_izquierda", "torso"
].sort(), "La composición debe incluir todas las capas exportadas");

const makeTransform = () => {
  const target = { calls: [] };
  target.setPosition = (...args) => { target.calls.push(["position", ...args]); return target; };
  target.setScale = (...args) => { target.calls.push(["scale", ...args]); return target; };
  target.setAngle = (...args) => { target.calls.push(["angle", ...args]); return target; };
  return target;
};
const breathingRig = makeTransform();
const breathingSprite = makeTransform();
const breathingJoints = { neck: makeTransform(), shoulderLeft: makeTransform(), shoulderRight: makeTransform() };
const breathingScene = { configs: [], tweens: { add: (config) => {
  breathingScene.configs.push(config);
  return { stopCalled: false, stop() { this.stopCalled = true; } };
} } };
const breathingFighter = { rig: breathingRig, sprite: breathingSprite, joints: breathingJoints, breathingTweens: [] };
startPlayerBreathing(breathingScene, breathingFighter);
assert.equal(breathingFighter.animations.clipId, DEFAULT_IDLE_CLIP, "El reposo del combate debe usar el clip declarativo predeterminado");
assert.equal(breathingScene.configs.length, 5, "La respiración debe mover torso, cuello y hombros mediante pistas declarativas");
assert.ok(breathingScene.configs.every(({ repeat, yoyo }) => repeat === -1 && yoyo), "La respiración debe ser continua y reversible");
assert.ok(breathingScene.configs.every(({ targets }) => targets !== breathingRig), "La respiración no debe desplazar el cuerpo completo ni los pies");
stopPlayerBreathing(breathingFighter);
assert.equal(breathingFighter.breathingTweens.length, 0, "La respiración debe poder detenerse durante un ataque");
assert.equal(breathingFighter.animations.state, null, "Detener el reposo debe liberar el estado de la máquina");
assert.deepEqual(animationClipList("reposo").map(({ id }) => id), ["idle-natural", "idle-alert", "idle-focus"]);
assert.deepEqual(animationClipList("defensa").map(({ id }) => id), ["guard-hold", "guard-impact"]);
assert.deepEqual(animationClipList("reacción").map(({ id }) => id), ["hit-light", "hit-heavy"]);
assert.ok(Object.values(PUPPET_ANIMATION_CLIPS).every(({ status }) => status === "integrated"), "Los clips ofrecidos como listos deben estar integrados");
assert.equal(typeof startPlayerGuard, "function");
assert.equal(typeof stopPlayerGuard, "function");
assert.equal(typeof playPlayerDamageReaction, "function");

const controllerTarget = () => ({ x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1, alpha: 1 });
const controllerScene = { tweens: { add(config) {
  if (config.onComplete) queueMicrotask(config.onComplete);
  return { stop() {} };
} } };
const controllerFighter = {
  rig: controllerTarget(), sprite: controllerTarget(), body: controllerTarget(), shadow: controllerTarget(),
  joints: Object.fromEntries(["neck", "shoulderLeft", "shoulderRight", "elbowLeft", "elbowRight", "wristLeft", "wristRight", "hipLeft", "hipRight", "kneeLeft", "kneeRight"].map(name => [name, controllerTarget()]))
};
const controller = new PuppetAnimationController(controllerScene, controllerFighter);
assert.equal(await controller.playOnce("hit-heavy", { force: true }), true, "Una reacción debe resolverse al terminar todas sus pistas");
assert.equal(controller.state, null, "La reacción debe liberar el estado y restaurar la pose neutral");
controller.loop("guard-hold");
assert.equal(controller.play("idle-natural"), false, "El reposo no debe interrumpir una guardia de mayor prioridad");
controller.stop();
assert.equal(typeof preparePlayerPunch, "function");
assert.equal(typeof releasePlayerPunch, "function");
assert.equal(typeof recoverPlayerPunch, "function");
assert.equal(typeof startPlayerRunning, "function");
assert.equal(typeof stopPlayerRunning, "function");

console.log("Pruebas del personaje geométrico superadas.");
