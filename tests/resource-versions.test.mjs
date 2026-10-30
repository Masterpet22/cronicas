import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { META_ASSET_VERSION, SHARED_BATTLE_ASSETS } from "../src/asset-urls.js";

const root = new URL("../", import.meta.url);
const index = await readFile(new URL("../index.html", import.meta.url), "utf8");

assert.doesNotMatch(index, /<link[^>]+rel="preload"[^>]+as="image"/, "La entrada no debe anticipar imágenes que aún no se muestran");
assert.equal((index.match(/<link[^>]+rel="preload"[^>]+as="font"/g) || []).length, 2, "Solo las dos fuentes críticas deben conservar preload");
assert.equal(META_ASSET_VERSION, "0.108.0", "El metajuego debe compartir una única versión de recursos");
assert.deepEqual(SHARED_BATTLE_ASSETS, {
  villageOutskirts: "assets/locations/village-outskirts.webp?v=0.74.1",
  forestRoad: "assets/locations/forest-road.webp?v=0.75.1",
  villageOutskirtsBranches: "assets/locations/village-outskirts-branches.webp?v=0.74.1",
  preparationMote: "assets/vfx/feedback/preparation-mote.png?v=0.91.0",
  kagemori: "assets/locations/kagemori.webp?v=0.63.1"
});

async function javascriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const url = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) return javascriptFiles(url);
    return entry.name.endsWith(".js") ? [url] : [];
  }));
  return nested.flat();
}

const sources = [new URL("../index.html", import.meta.url), ...await javascriptFiles(new URL("../src/", import.meta.url))];
const versionsByAsset = new Map();
for (const source of sources) {
  const contents = await readFile(source, "utf8");
  for (const match of contents.matchAll(/assets\/[\w./-]+\?v=([\d.]+)/g)) {
    const path = match[0].replace(/\?v=.*$/, "");
    const versions = versionsByAsset.get(path) || new Set();
    versions.add(match[1]);
    versionsByAsset.set(path, versions);
  }
}

const divergent = [...versionsByAsset]
  .filter(([, versions]) => versions.size > 1)
  .map(([path, versions]) => `${path}: ${[...versions].join(", ")}`);
assert.deepEqual(divergent, [], "Un mismo recurso estático no debe declarar versiones distintas");

console.log("Versiones y precargas de recursos verificadas.");
