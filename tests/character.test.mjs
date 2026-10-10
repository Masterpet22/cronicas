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

import { MAN_SPRITE_LAYERS, fighterTextureKey, preparePlayerPunch, queueFighterTexture, queuePlayerFighterTextures, recoverPlayerPunch, releasePlayerPunch, startPlayerBreathing, stopPlayerBreathing } from "../src/fighters.js";
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

const rigCalls = [];
const breathingRig = {
  setPosition: (...args) => { rigCalls.push(["position", ...args]); return breathingRig; },
  setScale: (...args) => { rigCalls.push(["scale", ...args]); return breathingRig; }
};
const breathingTween = { stopCalled: false, stop() { this.stopCalled = true; } };
const breathingScene = { tweens: { add: (config) => { breathingScene.config = config; return breathingTween; } } };
const breathingFighter = { rig: breathingRig, breathingTween: null };
startPlayerBreathing(breathingScene, breathingFighter);
assert.equal(breathingScene.config.repeat, -1, "La respiración debe repetirse mientras el personaje está en reposo");
assert.equal(breathingScene.config.yoyo, true, "La respiración debe regresar suavemente a la pose inicial");
stopPlayerBreathing(breathingFighter);
assert.equal(breathingTween.stopCalled, true, "La respiración debe poder detenerse durante un ataque");
assert.deepEqual(rigCalls.at(-1), ["scale", 0.13], "Al detenerse, la respiración debe restaurar la escala original");
assert.equal(typeof preparePlayerPunch, "function");
assert.equal(typeof releasePlayerPunch, "function");
assert.equal(typeof recoverPlayerPunch, "function");

console.log("Pruebas del personaje geométrico superadas.");
