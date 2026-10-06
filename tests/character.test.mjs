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

console.log("Pruebas del personaje geométrico superadas.");
