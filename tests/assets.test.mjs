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

for (const asset of ["hair_corto.png", "hair_coleta.png"]) {
  const png = await readFile(new URL(`../assets/modular/hair/${asset}`, import.meta.url));
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG", `${asset} debe ser un PNG válido`);
  assert.ok(png.readUInt32BE(16) >= 700, `${asset} debe conservar resolución suficiente para combate y vista previa`);
  assert.ok(png.readUInt32BE(20) >= 600, `${asset} debe conservar resolución suficiente para combate y vista previa`);
  assert.equal(png[25], 6, `${asset} debe conservar transparencia alfa real`);
}

const shortHair = await readFile(new URL("../assets/modular/hair/hair_corto.png", import.meta.url));
assert.deepEqual([shortHair.readUInt32BE(16), shortHair.readUInt32BE(20)], [1500, 1163], "El cabello corto debe conservar la resolución exacta del recurso aprobado");

const ponytailHair = await readFile(new URL("../assets/modular/hair/hair_coleta.png", import.meta.url));
assert.deepEqual([ponytailHair.readUInt32BE(16), ponytailHair.readUInt32BE(20)], [1000, 800], "La coleta debe conservar la resolución exacta del recurso aprobado");

const coinSheet = await readFile(new URL("../assets/vfx/coin-spin-spritesheet.png", import.meta.url));
assert.deepEqual([coinSheet.readUInt32BE(16), coinSheet.readUInt32BE(20)], [1280, 512], "Las diez monedas deben formar una cuadrícula normalizada de 5 × 2");
assert.equal(coinSheet[25], 6, "El spritesheet de monedas debe conservar transparencia alfa");

const experienceSheet = await readFile(new URL("../assets/vfx/experience-spin-spritesheet.png", import.meta.url));
assert.deepEqual([experienceSheet.readUInt32BE(16), experienceSheet.readUInt32BE(20)], [1280, 512], "Los diez emblemas de experiencia deben formar una cuadrícula normalizada de 5 × 2");
assert.equal(experienceSheet[25], 6, "El spritesheet de experiencia debe conservar transparencia alfa");

const constellationSeals = await readFile(new URL("../assets/sellos-constelaciones.png", import.meta.url));
assert.deepEqual([constellationSeals.readUInt32BE(16), constellationSeals.readUInt32BE(20)], [1536, 2048], "Los doce sellos deben formar una cuadrícula de 3 × 4");
assert.equal(constellationSeals[25], 6, "Los sellos de constelaciones deben conservar transparencia alfa");

const shortHairPortrait = await readFile(new URL("../assets/modular/hair/head_corto.png", import.meta.url));
assert.deepEqual([shortHairPortrait.readUInt32BE(16), shortHairPortrait.readUInt32BE(20)], [260, 400], "El retrato de cabello corto debe conservar la composición aprobada de cabeza y cabello");
assert.equal(shortHairPortrait[25], 6, "El retrato de cabello corto debe conservar transparencia alfa real");

const puppetRuntimeLayers = [
  "antebrazo_derecho", "antebrazo_izquierdo", "brazo_derecho", "brazo_izquierdo", "cabeza", "mano_derecha", "mano_izquierda",
  "muslo_derecho", "muslo_izquierdo", "pie_derecho", "pie_izquierdo", "pierna_derecha", "pierna_izquierda", "torso"
];
for (const body of ["man", "woman"]) {
  await Promise.all(puppetRuntimeLayers.map(async (id) => {
    const png = await readFile(new URL(`../assets/modular/${body}_sprites/runtime/${id}.png`, import.meta.url));
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    assert.ok(width > 0 && width < 600, `${body}/${id} debe estar recortado para ejecución`);
    assert.ok(height > 0 && height < 700, `${body}/${id} debe estar recortado para ejecución`);
    assert.equal(png[25], 6, `${body}/${id} debe conservar transparencia`);
  }));
}

for (const asset of ["basic-strike.webp", "guard.webp"]) {
  const image = webpDimensions(await readFile(new URL(`../assets/actions/${asset}`, import.meta.url)), asset);
  assert.equal(image.width, 512, `${asset} debe medir 512 px de ancho`);
  assert.equal(image.height, 512, `${asset} debe medir 512 px de alto`);
  assert.equal(image.alpha, true, `${asset} debe conservar un canal alfa`);
}

for (const [asset, width, height] of [["teleport-dog.webp", 460, 520], ["teleport-puppet.webp", 800, 220]]) {
  const file = await readFile(new URL(`../assets/vfx/${asset}`, import.meta.url));
  const image = webpDimensions(file, asset);
  assert.deepEqual([image.width, image.height], [width, height], `${asset} debe conservar las proporciones usadas por la transportación`);
  assert.equal(image.alpha, true, `${asset} debe tener fondo transparente`);
  assert.ok(file.length < 150_000, `${asset} debe estar optimizado para el navegador`);
}

const substitutionLog = await readFile(new URL("../assets/vfx/substitution-log-runtime.png", import.meta.url));
assert.equal(substitutionLog.subarray(1, 4).toString("ascii"), "PNG", "El tronco de Sustitución debe ser un PNG válido");
assert.ok(substitutionLog.readUInt32BE(16) >= 768, "El tronco de Sustitución debe conservar resolución suficiente para la animación");
assert.ok([3, 4, 6].includes(substitutionLog[25]), "El tronco de Sustitución debe conservar transparencia alfa");

const earthWall = await readFile(new URL("../assets/vfx/earth-wall-spritesheet.png", import.meta.url));
assert.deepEqual([earthWall.readUInt32BE(16), earthWall.readUInt32BE(20)], [2400, 1340], "Muralla pétrea debe conservar su cuadrícula de 2 × 4 fotogramas");
assert.equal(earthWall[25], 6, "Muralla pétrea debe conservar transparencia alfa real");

for (const asset of ["earth-fist-creation-spritesheet.png", "earth-fist-destruction-spritesheet.png"]) {
  const sheet = await readFile(new URL(`../assets/vfx/${asset}`, import.meta.url));
  assert.deepEqual([sheet.readUInt32BE(16), sheet.readUInt32BE(20)], [2400, 1340], `${asset} debe conservar su cuadrícula de 4 × 2 fotogramas`);
  assert.equal(sheet[25], 6, `${asset} debe conservar transparencia alfa real`);
}

const aquaShurikenCreation = await readFile(new URL("../assets/vfx/aqua-shuriken-creation-spritesheet.png", import.meta.url));
assert.deepEqual([aquaShurikenCreation.readUInt32BE(16), aquaShurikenCreation.readUInt32BE(20)], [2400, 1340], "Aqua Shuriken debe conservar su cuadrícula de creación de 4 × 2 fotogramas");
assert.equal(aquaShurikenCreation[25], 6, "La creación de Aqua Shuriken debe conservar transparencia alfa real");

const aquaShuriken = await readFile(new URL("../assets/vfx/aqua-shuriken.png", import.meta.url));
assert.deepEqual([aquaShuriken.readUInt32BE(16), aquaShuriken.readUInt32BE(20)], [472, 479], "El proyectil de Aqua Shuriken debe conservar su resolución original");
assert.equal(aquaShuriken[25], 6, "El proyectil de Aqua Shuriken debe conservar transparencia alfa real");

const aquaWhip = await readFile(new URL("../assets/vfx/aqua-whip-spritesheet.png", import.meta.url));
assert.deepEqual([aquaWhip.readUInt32BE(16), aquaWhip.readUInt32BE(20)], [2400, 1340], "Látigo de corriente debe conservar su cuadrícula de 4 × 2 fotogramas");
assert.equal(aquaWhip[25], 6, "Látigo de corriente debe conservar transparencia alfa real");

const windPalm = await readFile(new URL("../assets/vfx/wind-palm-spritesheet.png", import.meta.url));
assert.deepEqual([windPalm.readUInt32BE(16), windPalm.readUInt32BE(20)], [2400, 1340], "Palma de vacío debe conservar su cuadrícula de 4 × 2 fotogramas");
assert.equal(windPalm[25], 6, "Palma de vacío debe conservar transparencia alfa real");

const windBlade = await readFile(new URL("../assets/vfx/wind-blade-spritesheet.png", import.meta.url));
assert.deepEqual([windBlade.readUInt32BE(16), windBlade.readUInt32BE(20)], [2400, 1340], "Filo de vendaval debe conservar su cuadrícula de 4 × 2 fotogramas");
assert.equal(windBlade[25], 6, "Filo de vendaval debe conservar transparencia alfa real");

const village = webpDimensions(await readFile(new URL("../assets/village/aldea.webp", import.meta.url)), "aldea.webp");
assert.equal(village.width, 1678, "El mapa debe conservar su ancho original");
assert.equal(village.height, 937, "El mapa debe conservar su alto original");
const locationIds = ["headquarters", "dojo", "archive", "shop", "tower", "arena", "inn", "missions", "event"];
await Promise.all(locationIds.map(async (id) => {
  const image = webpDimensions(await readFile(new URL(`../assets/locations/${id}.webp`, import.meta.url)), `${id}.webp`);
  assert.deepEqual([image.width, image.height], [1376, 768], `${id} debe conservar la resolución nativa de la imagen reemplazada`);
}));
for (const asset of ["battle-dusk-pass.webp", "battle-mist-marsh-water.webp"]) {
  const file = await readFile(new URL(`../assets/locations/${asset}`, import.meta.url));
  const image = webpDimensions(file, asset);
  assert.deepEqual([image.width, image.height], [1376, 768], `${asset} debe conservar el encuadre nativo del fondo nuevo`);
  assert.ok(file.length < 250_000, `${asset} debe estar optimizado para la carga de misiones`);
}
const kagemori = webpDimensions(await readFile(new URL("../assets/locations/kagemori.webp", import.meta.url)), "kagemori.webp");
assert.deepEqual([kagemori.width, kagemori.height], [1376, 768], "Kagemori debe conservar la resolución nativa de la imagen reemplazada");
const villageOutskirts = webpDimensions(await readFile(new URL("../assets/locations/village-outskirts.webp", import.meta.url)), "village-outskirts.webp");
assert.deepEqual([villageOutskirts.width, villageOutskirts.height], [1376, 768], "El camino de salida debe conservar la resolución nativa del fondo nuevo");
const forestRoad = webpDimensions(await readFile(new URL("../assets/locations/forest-road.webp", import.meta.url)), "forest-road.webp");
assert.deepEqual([forestRoad.width, forestRoad.height], [1376, 768], "El camino del bosque debe conservar la resolución nativa del fondo nuevo");
const travelBranches = webpDimensions(await readFile(new URL("../assets/locations/village-outskirts-branches.webp", import.meta.url)), "village-outskirts-branches.webp");
assert.deepEqual([travelBranches.width, travelBranches.height], [1376, 768], "Las ramas de parallax deben conservar el encuadre panorámico de la imagen nueva");
assert.equal(travelBranches.alpha, true, "Las ramas de parallax deben conservar transparencia real");
const hudThemeDimensions = { ancestral: [2172, 724], lunar: [866, 288] };
for (const theme of ["ancestral", "lunar"]) {
  const png = await readFile(new URL(`../assets/ui/hud-themes/${theme}.png`, import.meta.url));
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG", `El tema ${theme} debe ser un PNG válido`);
  const runtimeImage = webpDimensions(await readFile(new URL(`../assets/ui/hud-themes/${theme}.webp`, import.meta.url)), `${theme}.webp`);
  assert.deepEqual([runtimeImage.width, runtimeImage.height], hudThemeDimensions[theme], `El tema optimizado ${theme} no debe recortarse`);
  assert.equal(runtimeImage.alpha, true, `El tema optimizado ${theme} debe conservar transparencia`);
}

const battleInterfaceAssets = {
  "ancestral-action-slot.png": [1254, 1254],
  "ancestral-speed-sword.png": [2172, 724],
  "lunar-action-slot.png": [1254, 1254],
  "lunar-speed-sword.png": [2172, 724]
};
await Promise.all(Object.entries(battleInterfaceAssets).map(async ([asset, expected]) => {
  const png = await readFile(new URL(`../assets/ui/hud-themes/${asset}`, import.meta.url));
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG", `${asset} debe ser un PNG válido`);
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], expected, `${asset} debe conservar su composición original`);
  assert.equal(png[25], 6, `${asset} debe conservar transparencia alfa real`);
}));

const feedbackAssets = {
  "timeline-crest.png": [160, 156],
  "timeline-player-shuriken.png": [1254, 1254],
  "timeline-enemy-shuriken.png": [1310, 1201],
  "timeline-ready-brush.png": [480, 192],
  "preparation-ribbons.png": [432, 259],
  "preparation-mote.png": [96, 96]
};
await Promise.all(Object.entries(feedbackAssets).map(async ([asset, expected]) => {
  const png = await readFile(new URL(`../assets/vfx/feedback/${asset}`, import.meta.url));
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG", `${asset} debe ser un PNG válido`);
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], expected, `${asset} debe conservar sus dimensiones de ejecución`);
  assert.equal(png[25], 6, `${asset} debe conservar transparencia alfa real`);
}));

const resultsAssets = {
  "results-parchment.png": [1440, 810],
  "result-stamp-frame.png": [640, 320]
};
await Promise.all(Object.entries(resultsAssets).map(async ([asset, expected]) => {
  const png = await readFile(new URL(`../assets/ui/results/${asset}`, import.meta.url));
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG", `${asset} debe ser un PNG válido`);
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], expected, `${asset} debe conservar sus dimensiones de ejecución`);
  assert.equal(png[25], 6, `${asset} debe conservar transparencia alfa real`);
}));
console.log("Pruebas de recursos modulares superadas.");
