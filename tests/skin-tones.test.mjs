import assert from "node:assert/strict";
import { SKIN_TONES, normalizeSkinTone, colorizeSkinPixels, skinPalette } from "../src/skin-tones.js";
import { createCharacter, createDefaultSave, normalizeSave, writeSave, loadSave, selectSaveSlot, derivedStats } from "../src/save.js";
import { fighterPuppetTextureKey } from "../src/fighters.js";
import { playerFighterAppearance } from "../src/character.js";

assert.deepEqual(SKIN_TONES.map(tone => tone.id), ["claro", "moreno"]);
for (const value of [undefined, "", "rojo", "#ff0000", {}]) assert.equal(normalizeSkinTone(value), "claro");
const make = skinTone => createCharacter(createDefaultSave(), { name: "Piel", affinity: "agua", bodyType: "female", skinTone });
const claro = make("claro"), moreno = make("moreno");
assert.equal(moreno.character.skinTone, "moreno");
assert.deepEqual(derivedStats(claro), derivedStats(moreno), "El tono es una elección visual, sin estadísticas");
assert.equal(claro.character.appearance, moreno.character.appearance, "La afinidad no define la piel");
assert.equal(playerFighterAppearance(moreno).skinTone, "moreno");
const legacy = structuredClone(moreno);
legacy.version = 20;
delete legacy.character.skinTone;
assert.equal(normalizeSave(legacy).character.skinTone, "claro");
assert.deepEqual(normalizeSave(legacy).inventory, moreno.inventory, "La migración no debe duplicar ni quitar objetos");
assert.equal(normalizeSave(moreno).character.skinTone, "moreno");
const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
selectSaveSlot(1, storage); writeSave(moreno, storage);
selectSaveSlot(2, storage); writeSave(claro, storage);
assert.equal(loadSave(storage).character.skinTone, "claro");
selectSaveSlot(1, storage);
assert.equal(loadSave(storage).character.skinTone, "moreno", "Cada partida conserva su tono");
for (const tone of SKIN_TONES) {
  const input = new Uint8ClampedArray([0,0,0,255, 100,100,100,128, 220,220,220,255, 19,29,39,0]);
  colorizeSkinPixels(input, tone.id);
  assert.deepEqual([...input.slice(0,4)], [0,0,0,255], "Los contornos negros permanecen negros");
  assert.equal(input[7], 128, "Los bordes mantienen su transparencia");
  assert.deepEqual([...input.slice(12)], [19,29,39,0]);
  assert.ok(input[8] > input[4] && input[9] > input[5] && input[10] > input[6], "Se conservan sombras y luces");
  const palette = skinPalette(tone.id);
  assert.equal(palette.length, 256);
  assert.ok(palette.every(rgb => rgb.every(channel => channel >= 0 && channel <= 255)));
}
assert.notDeepEqual(skinPalette("claro"), skinPalette("moreno"));
for (const bodyType of ["male", "female"]) {
  assert.notEqual(fighterPuppetTextureKey({ bodyType, skinTone: "claro" }, "cabeza"), fighterPuppetTextureKey({ bodyType, skinTone: "moreno" }, "cabeza"), "Los rivales no comparten una textura mutable");
}
console.log("Tonos de piel: paletas naturales, migración, partidas y texturas independientes correctas.");
