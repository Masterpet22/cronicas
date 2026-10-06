import assert from "node:assert/strict";
import { VILLAGE_LOCATIONS } from "../src/meta-ui.js";

const expected = ["headquarters", "dojo", "archive", "shop", "tower", "arena", "inn", "missions", "event"];
assert.equal(VILLAGE_LOCATIONS.length, 9, "El mapa debe exponer sus nueve destinos");
assert.deepEqual(VILLAGE_LOCATIONS.map(({ id }) => id), expected);
assert.equal(new Set(VILLAGE_LOCATIONS.map(({ id }) => id)).size, 9, "Cada zona debe tener un identificador único");

VILLAGE_LOCATIONS.forEach((location) => {
  assert.ok(location.name && location.description, `${location.id} necesita nombre y descripción`);
  assert.ok(location.labelX >= 0 && location.labelX <= 1678, `${location.id} necesita una etiqueta dentro del mapa`);
  assert.ok(location.labelY >= 0 && location.labelY <= 937, `${location.id} necesita una etiqueta dentro del mapa`);
  assert.match(location.path, /^M[\d\s.,A-Z-]+Z$/, `${location.id} necesita una silueta SVG cerrada`);
  assert.ok(location.path.split(/[A-Z]/).join(" ").trim().split(/\s+/).length >= 16, `${location.id} necesita un contorno detallado`);
});

console.log("Pruebas del mapa de la aldea superadas.");
