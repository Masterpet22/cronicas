import { cp, mkdir, readdir } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
if (!process.argv[2]) throw new Error("Indica el directorio de salida del sitio");
const output = resolve(process.argv[2]);
await mkdir(output, { recursive: true });
if ((await readdir(output)).length) throw new Error("El directorio de salida debe estar vacío");

for (const name of await readdir(root)) {
  if (name === "index.html" || name === "game.js" || name === "sw.js" || name.endsWith(".css")) {
    await cp(join(root, name), join(output, name));
  }
}
await cp(join(root, "src"), join(output, "src"), { recursive: true });
const assets = join(root, "assets");
const referenceOnly = new Set([
  "modular/manifest.json", "elements/manifest.json", "sellos-originales.webp", "reference"
]);
await cp(assets, join(output, "assets"), {
  recursive: true,
  filter(source) {
    const parts = relative(assets, source).split(sep);
    return !referenceOnly.has(parts.join("/")) && !(parts[0] === "modular" && parts.includes("source"));
  }
});
