import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ELEMENTS, basicRequirements, canAccessElement, elementIconParts } from "../src/elements.js";
import { webpDimensions } from "./webp.mjs";

const root = new URL("../assets/elements/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("manifest.json", root), "utf8"));

assert.deepEqual(manifest.cellSize, [512, 512], "Todos los iconos deben usar celdas de 512×512");
assert.deepEqual(manifest.tiers.map(({ elements }) => elements.length), [4, 6, 8, 4], "Los cuatro niveles deben contener 4, 6, 8 y 4 elementos");

const ids = new Set();
for (const tier of manifest.tiers) {
  assert.equal(tier.sheet, undefined, "No deben distribuirse atlas que el juego no carga");
  for (const element of tier.elements) {
    assert.ok(!ids.has(element.id), `${element.id} no puede repetirse`);
    ids.add(element.id);
    if (tier.id === 2) assert.equal(element.parents.length, 2, `${element.id} debe combinar dos básicos`);
    if (tier.id === 3) assert.equal(element.parents.length, 2, `${element.id} debe combinar un secundario y un básico`);
    if (tier.id === 4) assert.equal(element.parents.length, 2, `${element.id} debe combinar dos secundarios`);
    assert.deepEqual(element.parents, ELEMENTS[element.id].parents);
    const parts = elementIconParts(element.id);
    assert.deepEqual(parts.map(part => part.id), basicRequirements(element.id));
    assert.equal(element.icon, tier.id === 1 ? `tier-1/${element.id}.webp` : undefined);
    for (const part of parts) {
      assert.equal(ELEMENTS[part.id].tier, 1, "Cada combinación debe reutilizar imágenes básicas");
      const icon = webpDimensions(await readFile(new URL(part.icon, new URL("../", import.meta.url))), part.icon);
      assert.deepEqual([icon.width, icon.height, icon.alpha], [512, 512, true]);
      assert.ok(part.x >= 0 && part.y >= 0 && part.x + part.size <= 512 && part.y + part.size <= 512);
    }
  }
}

assert.equal(ids.size, 22, "El sistema debe contener exactamente 22 elementos únicos");
assert.deepEqual(elementIconParts("desconocido"), []);
assert.equal(canAccessElement("vapor", ["agua", "fuego"], 2), true, "Dos afinidades deben habilitar una combinación secundaria");
assert.equal(canAccessElement("vapor", ["agua", "fuego"], 1), false, "El rango 1 no debe habilitar combinaciones secundarias");
assert.deepEqual(basicRequirements("tormenta").sort(), ["agua", "fuego", "viento"], "Una técnica terciaria debe exigir tres afinidades básicas");
assert.equal(canAccessElement("tormenta", ["agua", "fuego", "viento"], 3), true, "El rango 3 debe habilitar combinaciones terciarias conocidas");
assert.equal(canAccessElement("plasma", ["agua", "fuego", "viento"], 3), false, "Los elementos especiales deben permanecer reservados");
console.log("Pruebas de iconografía elemental superadas.");
