import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { basicRequirements, canAccessElement } from "../src/elements.js";
import { webpDimensions } from "./webp.mjs";

const root = new URL("../assets/elements/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("manifest.json", root), "utf8"));

assert.deepEqual(manifest.cellSize, [512, 512], "Todos los iconos deben usar celdas de 512×512");
assert.deepEqual(manifest.tiers.map(({ elements }) => elements.length), [4, 6, 8, 4], "Los cuatro niveles deben contener 4, 6, 8 y 4 elementos");

const ids = new Set();
for (const tier of manifest.tiers) {
  assert.equal(tier.grid[0] * tier.grid[1], tier.elements.length, `La cuadrícula del nivel ${tier.id} debe coincidir con sus elementos`);
  const sheet = await readFile(new URL(tier.sheet, root));
  assert.equal(sheet.readUInt32BE(16), tier.grid[0] * 512, `La hoja del nivel ${tier.id} debe conservar el ancho de sus celdas`);
  assert.equal(sheet.readUInt32BE(20), tier.grid[1] * 512, `La hoja del nivel ${tier.id} debe conservar el alto de sus celdas`);
  assert.equal(sheet[25], 6, `La hoja del nivel ${tier.id} debe conservar transparencia alfa`);

  for (const element of tier.elements) {
    assert.ok(!ids.has(element.id), `${element.id} no puede repetirse`);
    ids.add(element.id);
    if (tier.id === 2) assert.equal(element.parents.length, 2, `${element.id} debe combinar dos básicos`);
    if (tier.id === 3) assert.equal(element.parents.length, 2, `${element.id} debe combinar un secundario y un básico`);
    if (tier.id === 4) assert.equal(element.parents.length, 2, `${element.id} debe combinar dos secundarios`);
    const icon = webpDimensions(await readFile(new URL(element.icon, root)), element.icon);
    assert.equal(icon.width, 512, `${element.id} debe medir 512 px de ancho`);
    assert.equal(icon.height, 512, `${element.id} debe medir 512 px de alto`);
    assert.equal(icon.alpha, true, `${element.id} debe conservar transparencia alfa`);
  }
}

assert.equal(ids.size, 22, "El sistema debe contener exactamente 22 elementos únicos");
assert.equal(canAccessElement("vapor", ["agua", "fuego"], 2), true, "Dos afinidades deben habilitar una combinación secundaria");
assert.equal(canAccessElement("vapor", ["agua", "fuego"], 1), false, "El rango 1 no debe habilitar combinaciones secundarias");
assert.deepEqual(basicRequirements("tormenta").sort(), ["agua", "fuego", "viento"], "Una técnica terciaria debe exigir tres afinidades básicas");
assert.equal(canAccessElement("tormenta", ["agua", "fuego", "viento"], 3), true, "El rango 3 debe habilitar combinaciones terciarias conocidas");
assert.equal(canAccessElement("plasma", ["agua", "fuego", "viento"], 3), false, "Los elementos especiales deben permanecer reservados");
console.log("Pruebas de iconografía elemental superadas.");
