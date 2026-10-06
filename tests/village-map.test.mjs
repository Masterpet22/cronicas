import assert from "node:assert/strict";
import { VILLAGE_LOCATIONS } from "../src/meta-ui.js";

const expected = ["headquarters", "dojo", "archive", "shop", "tower", "arena", "inn", "missions", "event"];
assert.equal(VILLAGE_LOCATIONS.length, 9, "El mapa debe exponer sus nueve destinos");
assert.deepEqual(VILLAGE_LOCATIONS.map(({ id }) => id), expected);
assert.equal(new Set(VILLAGE_LOCATIONS.map(({ id }) => id)).size, 9, "Cada zona debe tener un identificador único");

VILLAGE_LOCATIONS.forEach((location) => {
  assert.ok(location.name && location.description, `${location.id} necesita nombre y descripción`);
  assert.ok(location.x >= 0 && location.y >= 0 && location.w > 0 && location.h > 0, `${location.id} necesita una zona válida`);
  assert.ok(location.x + location.w <= 101 && location.y + location.h <= 101, `${location.id} debe permanecer dentro del mapa`);
  assert.match(location.shape, /^(polygon|ellipse)\(/, `${location.id} necesita una forma de resaltado`);
});

console.log("Pruebas del mapa de la aldea superadas.");
