import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { LOCATION_CAST, NPCS, locationDialogue } from "../src/npcs.js";
import { webpDimensions } from "./webp.mjs";

const locations = ["headquarters", "dojo", "archive", "shop", "tower", "arena", "inn", "missions", "event"];
assert.deepEqual(Object.keys(LOCATION_CAST), locations, "Cada destino del mapa debe tener reparto");
assert.equal(Object.keys(NPCS).length, 10, "El reparto debe contener diez personajes");
assert.equal(LOCATION_CAST.dojo.length, 2, "El Dojo debe tener dos instructores");

for (const location of locations) {
  const cast = LOCATION_CAST[location];
  assert.ok(cast.length >= 1, `${location} necesita al menos un personaje`);
  assert.ok(locationDialogue(location, "intro").length >= cast.length * 2, `${location} necesita presentación`);
  assert.ok(locationDialogue(location, "guide").length >= cast.length * 3, `${location} necesita guía jugable`);
}

await Promise.all(Object.entries(NPCS).map(async ([id, npc]) => {
  assert.ok(npc.name && npc.title, `${id} necesita identidad y función`);
  const image = webpDimensions(await readFile(new URL(`../${npc.image}`, import.meta.url)), npc.image);
  assert.equal(image.width, 1145, `${id} debe conservar el lienzo común`);
  assert.ok([1373, 1374].includes(image.height), `${id} debe conservar la altura de retrato`);
  assert.equal(image.alpha, true, `${id} debe conservar transparencia alfa`);
}));

console.log("Pruebas del reparto y sus guías superadas.");
