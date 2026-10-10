import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { webpDimensions } from "./webp.mjs";

const manifest = JSON.parse((await readFile(new URL("../assets/modular/manifest.json", import.meta.url), "utf8")).replace(/^\uFEFF/, ""));
assert.deepEqual(manifest.canvas, [768, 768], "Todas las piezas deben compartir un lienzo de 768×768");
assert.deepEqual(manifest.body, ["male", "female"], "Deben existir ambos cuerpos base");
assert.equal(manifest.hair.length, 5, "Deben existir cinco peinados");
assert.equal(manifest.faces.length, 3, "Deben existir tres rostros");

const assets = [
  ...manifest.body.map((id) => `body/body_${id}.png`),
  ...manifest.faces.map((id) => `face/face_0${id}.png`),
  ...manifest.hair.flatMap((id) => [`hair/hair_0${id}_rear.png`, `hair/hair_0${id}_front.png`]),
  ...manifest.tops.map((id) => `top/top_0${id}.png`),
  ...manifest.bottoms.map((id) => `bottom/bottom_0${id}.png`),
  ...manifest.shoes.map((id) => `shoes/shoes_0${id}.png`),
  ...manifest.weapons.map((id) => `weapon/weapon_${id}.png`)
];

await Promise.all(assets.map(async (asset) => {
  const png = await readFile(new URL(`../assets/modular/${asset}`, import.meta.url));
  assert.equal(png.readUInt32BE(16), 768, `${asset} debe medir 768 px de ancho`);
  assert.equal(png.readUInt32BE(20), 768, `${asset} debe medir 768 px de alto`);
  assert.equal(png[25], 6, `${asset} debe conservar un canal alfa`);
}));
assert.equal(assets.length, 27, "El conjunto modular debe contener 27 capas intercambiables");

const manRuntimeLayers = [
  "antebrazo_derecho", "antebrazo_izquierdo", "brazo_derecho", "brazo_izquierdo", "cabeza", "mano_derecha", "mano_izquierda",
  "muslo_derecho", "muslo_izquierdo", "pie_derecho", "pie_izquierdo", "pierna_derecha", "pierna_izquierda", "torso"
];
await Promise.all(manRuntimeLayers.map(async (id) => {
  const png = await readFile(new URL(`../assets/modular/man_sprites/runtime/${id}.png`, import.meta.url));
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assert.ok(width > 0 && width < 600, `${id} debe estar recortado para ejecución`);
  assert.ok(height > 0 && height < 700, `${id} debe estar recortado para ejecución`);
  assert.equal(png[25], 6, `${id} debe conservar transparencia`);
}));

for (const asset of ["basic-strike.webp", "guard.webp"]) {
  const image = webpDimensions(await readFile(new URL(`../assets/actions/${asset}`, import.meta.url)), asset);
  assert.equal(image.width, 512, `${asset} debe medir 512 px de ancho`);
  assert.equal(image.height, 512, `${asset} debe medir 512 px de alto`);
  assert.equal(image.alpha, true, `${asset} debe conservar un canal alfa`);
}

const village = webpDimensions(await readFile(new URL("../assets/village/aldea.webp", import.meta.url)), "aldea.webp");
assert.equal(village.width, 1678, "El mapa debe conservar su ancho original");
assert.equal(village.height, 937, "El mapa debe conservar su alto original");
const locationIds = ["headquarters", "dojo", "archive", "shop", "tower", "arena", "inn", "missions", "event"];
await Promise.all(locationIds.map(async (id) => {
  const image = webpDimensions(await readFile(new URL(`../assets/locations/${id}.webp`, import.meta.url)), `${id}.webp`);
  assert.ok(image.width >= 1500, `${id} necesita resolución panorámica suficiente`);
  assert.ok(image.height >= 900, `${id} necesita altura suficiente`);
}));
console.log("Pruebas de recursos modulares superadas.");
