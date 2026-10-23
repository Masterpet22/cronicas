import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fighterPreviewSvg, resolveFighterAppearance } from "../src/character.js";

const appearance = resolveFighterAppearance({ bodyType: "female", face: 3, hair: 4, top: 2, bottom: 3, shoes: 2, weapon: "staff", clothColor: 0x68a8ff, accentColor: "#25344d" });
assert.equal(appearance.bodyType, "female");
assert.equal(appearance.hair, 4);
assert.equal(appearance.cloth, "#68a8ff", "Los colores de Phaser y del dojo deben normalizarse igual");

const preview = fighterPreviewSvg(appearance);
assert.match(preview, /^<svg/);
assert.match(preview, /Vista previa personalizada/);
assert.match(preview, /#68a8ff/, "La vista previa debe conservar el color normalizado al reutilizar una apariencia resuelta");
assert.match(fighterPreviewSvg({ bodyType: "male", hair: 1 }), /hair_corto\.png/, "Corto debe usar el recurso aprobado en el cuerpo masculino");
assert.match(fighterPreviewSvg({ bodyType: "female", hair: 1 }), /hair_corto\.png/, "Corto debe estar disponible en el cuerpo femenino");
assert.match(fighterPreviewSvg({ bodyType: "male", hair: 4 }), /hair_coleta\.png/, "Coleta debe usar el recurso aprobado en el cuerpo masculino");
assert.match(fighterPreviewSvg({ bodyType: "female", hair: 4 }), /hair_coleta\.png/, "Coleta debe estar disponible en el cuerpo femenino");
assert.equal(resolveFighterAppearance({ hair: 0 }).hair, 0, "TIPO 01 debe conservar la variante sin cabello");
assert.doesNotMatch(fighterPreviewSvg({ hair: 0 }), /hair_(?:corto|coleta)\.png/, "La variante sin cabello no debe dibujar una capa de peinado");
assert.equal(resolveFighterAppearance({ hair: 2 }).hair, 1, "Los peinados experimentales deben migrar a Corto");

const repaired = resolveFighterAppearance({ face: 99, hair: -4, top: 0, bottom: 20, shoes: 8, weapon: "invalid" });
assert.deepEqual(
  { face: repaired.face, hair: repaired.hair, top: repaired.top, bottom: repaired.bottom, shoes: repaired.shoes, weapon: repaired.weapon },
  { face: 3, hair: 1, top: 1, bottom: 3, shoes: 2, weapon: "kunai" }
);

import { DEFAULT_IDLE_CLIP, PUPPET_ANIMATION_CLIPS, animationClipList } from "../src/animations/clips.js";
import { PuppetAnimationController } from "../src/animations/controller.js";
import { validateAnimationCatalog } from "../src/animations/schema.js";
import { animationClipDuration, sampleAnimationPose } from "../src/animations/runtime.js";
import { MAN_SPRITE_JOINTS, MAN_SPRITE_LAYERS, MAN_SPRITE_SHADOW_OFFSET, playEarthWallCast, playFighterDamageReaction, playPlayerDamageReaction, preparePlayerPunch, queuePlayerFighterTextures, recoverPlayerPunch, releasePlayerPunch, startPlayerBreathing, startPlayerGuard, startPlayerPreparing, startPlayerRunning, stopPlayerBreathing, stopPlayerGuard, stopPlayerPreparing, stopPlayerRunning } from "../src/fighters.js";
import { playerFighterAppearance } from "../src/character.js";

const playerSave = {
  character: { name: "Akio", appearance: "#e64c3c", bodyType: "male", face: 2, hair: 1, top: 1, bottom: 2, shoes: 1 },
  equipment: { weapon: "tanto" }
};
const playerApp = playerFighterAppearance(playerSave);
assert.equal(playerApp.weapon, "sword", "El arma 'tanto' del equipo debe mapearse a 'sword' en el combatiente");
assert.equal(playerFighterAppearance({ ...playerSave, equipment: { weapon: null } }).weapon, "none", "Desequipar el arma debe ocultarla en el combatiente");
assert.equal(playerApp.clothColor, "#e64c3c");

const loaded = [];
const mockScene = {
  textures: { exists: (k) => loaded.includes(k) },
  load: { image: (k, url) => loaded.push(k) }
};
assert.equal(queuePlayerFighterTextures(mockScene, playerApp), "modular", "El cuerpo masculino debe usar los sprites modulares");
assert.equal(loaded.length, 15, "Deben cargarse las catorce partes del cuerpo masculino y el peinado compatible");
const shortHairLoaded = [];
queuePlayerFighterTextures({ textures: { exists: (key) => shortHairLoaded.includes(key) }, load: { image: (key) => shortHairLoaded.push(key) } }, { ...playerApp, hair: 1, bodyType: "female" });
assert.ok(shortHairLoaded.includes("player-hair-corto"), "Corto debe cargarse también para el cuerpo femenino");
const ponytailLoaded = [];
queuePlayerFighterTextures({ textures: { exists: (key) => ponytailLoaded.includes(key) }, load: { image: (key) => ponytailLoaded.push(key) } }, { ...playerApp, hair: 4, bodyType: "male" });
assert.ok(ponytailLoaded.includes("player-hair-coleta"), "Coleta debe cargarse también para el cuerpo masculino");
const baldLoaded = [];
queuePlayerFighterTextures({ textures: { exists: (key) => baldLoaded.includes(key) }, load: { image: (key) => baldLoaded.push(key) } }, { ...playerApp, hair: 0 });
assert.equal(baldLoaded.length, 14, "La variante sin cabello solo debe cargar las catorce piezas de la marioneta");
assert.ok(!baldLoaded.some((key) => key.startsWith("player-hair-")), "La variante sin cabello no debe encolar una textura de peinado");
assert.deepEqual(MAN_SPRITE_LAYERS.map(({ id }) => id).sort(), [
  "antebrazo_derecho", "antebrazo_izquierdo", "brazo_derecho", "brazo_izquierdo", "cabeza", "mano_derecha", "mano_izquierda",
  "muslo_derecho", "muslo_izquierdo", "pie_derecho", "pie_izquierdo", "pierna_derecha", "pierna_izquierda", "torso"
].sort(), "La composición debe incluir todas las capas exportadas");
const rightUpperArm = MAN_SPRITE_LAYERS.find(({ id }) => id === "brazo_derecho");
const leftUpperArm = MAN_SPRITE_LAYERS.find(({ id }) => id === "brazo_izquierdo");
assert.ok(rightUpperArm.x < 0 && leftUpperArm.x > 0, "Los brazos deben nombrarse desde la anatomía del personaje, no desde la pantalla");
assert.equal(rightUpperArm.assetId, "brazo_izquierdo", "El alias debe corregir el PNG superior derecho mal exportado");
assert.equal(leftUpperArm.assetId, "brazo_derecho", "El alias debe corregir el PNG superior izquierdo mal exportado");
assert.ok(MAN_SPRITE_JOINTS.shoulderRight.x < 0 && MAN_SPRITE_JOINTS.hipRight.x < 0, "Las articulaciones derechas deben coincidir con brazo, mano y pierna derechos");
assert.ok(MAN_SPRITE_SHADOW_OFFSET > 0 && MAN_SPRITE_SHADOW_OFFSET <= 82, "La sombra debe permanecer cerca de los pies de la marioneta modular");
assert.match(readFileSync(new URL("../src/fighters.js", import.meta.url), "utf8"), /FilterMode\?\.LINEAR/, "Las ilustraciones modulares deben usar filtrado lineal y no pixel art");

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
assert.deepEqual(animationClipList("defensa").map(({ id }) => id), ["guard-hold", "guard-impact", "guard-hold-simple", "guard-impact-simple"]);
assert.deepEqual(animationClipList("reacción").map(({ id }) => id), ["hit-light", "hit-heavy", "hit-light-simple", "hit-heavy-simple"]);
assert.deepEqual(animationClipList("locomoción").map(({ id }) => id), ["run-cycle", "run-simple"]);
assert.deepEqual(animationClipList("ataque").map(({ id }) => id), ["punch-prepare", "punch-release", "punch-recover"]);
assert.deepEqual(animationClipList("acción").map(({ id }) => id), ["prepare-technique", "earth-wall-cast"], "Las técnicas con pose propia deben vivir en el catálogo declarativo");
assert.equal(PUPPET_ANIMATION_CLIPS["earth-wall-cast"].loop, false, "Muro Pétreo debe terminar antes de iniciar su spritesheet");
assert.equal(PUPPET_ANIMATION_CLIPS["earth-wall-cast"].anchor, "ankleRight", "Muro Pétreo debe mantener anclado el pie derecho");
assert.equal(animationClipDuration(PUPPET_ANIMATION_CLIPS["earth-wall-cast"]), 1000, "La animación importada de Kinetra debe durar un segundo");
const earthWallPeakPose = sampleAnimationPose(PUPPET_ANIMATION_CLIPS["earth-wall-cast"], 792);
assert.equal(earthWallPeakPose.rig.angle, -17.898053433406837, "La pose clave de Muro Pétreo debe conservar el giro de Kinetra");
assert.equal(earthWallPeakPose.rig.x, undefined, "Muro Pétreo no debe desplazar al personaje horizontalmente");
assert.equal(earthWallPeakPose.rig.y, undefined, "Muro Pétreo no debe desplazar al personaje verticalmente");
const earthWallEvents = [];
const earthWallFighter = {
  rig: {},
  animations: {
    clipId: null,
    state: null,
    tweens: [],
    supports: (id) => id === "earth-wall-cast" || id === DEFAULT_IDLE_CLIP,
    async playOnce(id) { earthWallEvents.push(`${id}:inicio`); await Promise.resolve(); earthWallEvents.push(`${id}:fin`); return true; },
    loop(id) { earthWallEvents.push(`${id}:inicio`); }
  },
  breathingTweens: []
};
await playEarthWallCast({}, earthWallFighter);
assert.deepEqual(earthWallEvents, ["earth-wall-cast:inicio", "earth-wall-cast:fin", `${DEFAULT_IDLE_CLIP}:inicio`], "La pose de Muro Pétreo debe finalizar antes de regresar al reposo");
assert.equal(PUPPET_ANIMATION_CLIPS["punch-prepare"].restore, false, "La preparación debe conservar su pose hasta la fase de impacto");
assert.equal(PUPPET_ANIMATION_CLIPS["punch-release"].restore, false, "El impacto debe conservar su pose hasta la recuperación");
assert.ok(Object.values(PUPPET_ANIMATION_CLIPS).every(({ status }) => status === "integrated"), "Los clips ofrecidos como listos deben estar integrados");
assert.ok(Object.values(PUPPET_ANIMATION_CLIPS).every(({ requires }) => requires.length), "Cada clip debe declarar los componentes de rig que necesita");
assert.deepEqual(validateAnimationCatalog(PUPPET_ANIMATION_CLIPS, { idle: 1, locomotion: 2, action: 3, hit: 4, defeated: 5 }), [], "El catálogo completo debe superar la validación estructural");
assert.ok(validateAnimationCatalog({ broken: { id: "other", tracks: [] } }, {}).length > 0, "La validación debe rechazar clips incompletos antes de ejecutarlos");
assert.ok(animationClipDuration(PUPPET_ANIMATION_CLIPS["punch-release"]) >= 115, "El runtime compartido debe calcular la duración del clip");
assert.equal(sampleAnimationPose(PUPPET_ANIMATION_CLIPS["punch-release"], 115).shoulderRight.angle, -68, "El muestreador compartido debe alcanzar la pose final");
assert.ok(PUPPET_ANIMATION_CLIPS["guard-hold"].tracks.some(({ target }) => target === "shoulderRight"));
assert.ok(PUPPET_ANIMATION_CLIPS["guard-hold"].tracks.every(({ target }) => !target.endsWith("Left")), "La guardia debe usar solo el brazo delantero derecho");
assert.equal(typeof startPlayerGuard, "function");
assert.equal(typeof stopPlayerGuard, "function");
assert.equal(typeof startPlayerPreparing, "function");
assert.equal(typeof stopPlayerPreparing, "function");
assert.equal(typeof playPlayerDamageReaction, "function");
assert.equal(playPlayerDamageReaction, playFighterDamageReaction, "El alias anterior debe conservar compatibilidad con llamadas existentes");

const rearArmBranch = {};
const rearLegBranch = {};
const preparationTorso = {};
const preparationRig = {
  children: [rearArmBranch, rearLegBranch, preparationTorso],
  getIndex(child) { return this.children.indexOf(child); },
  moveTo(child, index) {
    this.children.splice(this.children.indexOf(child), 1);
    this.children.splice(index, 0, child);
  }
};
const preparationAnimations = {
  state: "idle",
  clipId: DEFAULT_IDLE_CLIP,
  tweens: [],
  supports() { return true; },
  stop() { this.state = null; this.clipId = null; },
  loop(id) { this.clipId = id; this.state = id.startsWith("idle") ? "idle" : "action"; return true; }
};
const preparationFighter = {
  rig: preparationRig,
  sprite: preparationTorso,
  joints: { shoulderLeft: rearArmBranch },
  animations: preparationAnimations,
  breathingTweens: []
};
startPlayerPreparing({}, preparationFighter);
assert.ok(preparationRig.getIndex(rearArmBranch) > preparationRig.getIndex(preparationTorso), "La mano trasera debe pasar al frente mientras cruza el torso");
stopPlayerPreparing({}, preparationFighter);
assert.equal(preparationRig.getIndex(rearArmBranch), 0, "La jerarquía anatómica original debe restaurarse al terminar la preparación");

const controllerTarget = () => ({ x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1, alpha: 1 });
const controllerConfigs = [];
const controllerScene = { tweens: { add(config) {
  controllerConfigs.push(config);
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
const simpleFighter = {
  body: controllerTarget(), sprite: controllerTarget(), shadow: controllerTarget(), joints: {}
};
simpleFighter.animations = new PuppetAnimationController(controllerScene, simpleFighter);
assert.equal(await playFighterDamageReaction(controllerScene, simpleFighter, { heavy: true }), true, "Los combatientes no articulados también deben reaccionar al daño");
assert.equal(controllerConfigs.at(-1).x, -27, "La reacción simplificada debe usar el clip declarativo de cuerpo completo");
assert.equal(typeof preparePlayerPunch, "function");
assert.equal(typeof releasePlayerPunch, "function");
assert.equal(typeof recoverPlayerPunch, "function");
assert.equal(typeof startPlayerRunning, "function");
assert.equal(typeof stopPlayerRunning, "function");

console.log("Pruebas del personaje modular superadas.");
