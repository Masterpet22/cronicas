import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { LOCATION_CAST, NPCS, locationDialogue } from "../src/npcs.js";
import { extname } from "node:path";
import { webpDimensions } from "./webp.mjs";

const locations = ["headquarters", "dojo", "archive", "shop", "tower", "arena", "inn", "missions", "event", "kagemori"];
assert.deepEqual(Object.keys(LOCATION_CAST), locations, "Cada destino del mapa debe tener reparto");
assert.equal(Object.keys(NPCS).length, 12, "El reparto debe incluir a los dos supervivientes de Kagemori");
assert.equal(LOCATION_CAST.dojo.length, 2, "El Dojo debe tener dos instructores");

for (const location of locations) {
  const cast = LOCATION_CAST[location];
  assert.ok(cast.length >= 1, `${location} necesita al menos un personaje`);
  assert.ok(locationDialogue(location, "intro").length >= cast.length * 2, `${location} necesita presentación`);
  assert.ok(locationDialogue(location, "guide").length >= cast.length * 3, `${location} necesita guía jugable`);
}

await Promise.all(Object.entries(NPCS).map(async ([id, npc]) => {
  assert.ok(npc.name && npc.title, `${id} necesita identidad y función`);
  const file = await readFile(new URL(`../${npc.image}`, import.meta.url));
  if (extname(npc.image) === ".png") {
    assert.equal(file.subarray(1, 4).toString("ascii"), "PNG", `${id} debe ser un PNG válido`);
    assert.ok(file.readUInt32BE(16) >= 1000, `${id} necesita ancho de retrato suficiente`);
    assert.ok(file.readUInt32BE(20) >= 1300, `${id} necesita altura de retrato suficiente`);
    assert.equal(file[25], 6, `${id} debe conservar transparencia alfa`);
  } else {
    const image = webpDimensions(file, npc.image);
    const optimizedKagemoriPortrait = id === "iori" || id === "nami";
    assert.equal(image.width, optimizedKagemoriPortrait ? 768 : 1145, `${id} debe conservar el ancho previsto`);
    assert.ok(optimizedKagemoriPortrait ? image.height === 1152 : [1373, 1374].includes(image.height), `${id} debe conservar la altura prevista`);
    assert.equal(image.alpha, true, `${id} debe conservar transparencia alfa`);
  }
}));

console.log("Pruebas del reparto y sus guías superadas.");
