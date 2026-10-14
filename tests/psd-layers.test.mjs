import assert from "node:assert/strict";
import { collectPsdLayers, normalizeLayerId, uniquePartId } from "../src/studio/psd-layers.js";

const canvas = (width, height) => ({ width, height });
const layers = collectPsdLayers([
  {
    name: "Grupo oculto",
    hidden: true,
    children: [
      { name: "Cabeza Ágil", left: 10, top: 20, canvas: canvas(30, 40) },
      { name: "Vacía", canvas: canvas(0, 0) }
    ]
  },
  { name: "Brazo izquierdo", left: 50, top: 60, canvas: canvas(20, 25) }
]);

assert.equal(layers.length, 2, "Solo deben importarse capas con una imagen utilizable");
assert.deepEqual(
  layers.map(({ name, path, width, height, left, top, hidden }) => ({ name, path, width, height, left, top, hidden })),
  [
    { name: "Cabeza Ágil", path: "Grupo oculto / Cabeza Ágil", width: 30, height: 40, left: 10, top: 20, hidden: true },
    { name: "Brazo izquierdo", path: "Brazo izquierdo", width: 20, height: 25, left: 50, top: 60, hidden: false }
  ],
  "La importación debe conservar nombres, rutas, posiciones y visibilidad heredada"
);
assert.equal(normalizeLayerId("  Cabeza Ágil  "), "cabeza_agil", "Los nombres deben convertirse en IDs estables");
const reserved = new Set(["cabeza_agil"]);
assert.equal(uniquePartId("Cabeza Ágil", reserved), "cabeza_agil_2", "Los nombres repetidos no deben reemplazar capas anteriores");

console.log("Pruebas de importación PSD por capas superadas.");
