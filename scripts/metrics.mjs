import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createDefaultSave, SAVE_VERSION } from "../src/save.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const measuredFiles = ["game.js", "src/meta-ui.js", "src/save.js"];

function lineCount(source) {
  if (!source) return 0;
  return source.split(/\r?\n/).length - (source.endsWith("\n") ? 1 : 0);
}

const sources = Object.fromEntries(await Promise.all(measuredFiles.map(async (path) => [
  path,
  await readFile(resolve(projectRoot, path), "utf8")
])));

const literalStepCalls = measuredFiles.reduce((total, path) => total + (
  sources[path].match(/\bmission(?:HasStep|Step)\s*\(\s*[^,\n]+,\s*["'][^"']+["']\s*,\s*["'][^"']+["']/g) || []
).length, 0);

const fixedSecondaryDispatches = measuredFiles.reduce((total, path) => total + sources[path]
  .split(/\r?\n/)
  .filter((line) => /(?:missionId|\.id)\s*===\s*["']s0[12]["']/.test(line)).length, 0);

const rows = [
  ["Líneas `game.js`", lineCount(sources["game.js"])],
  ["Líneas `src/meta-ui.js`", lineCount(sources["src/meta-ui.js"])],
  ["Líneas `src/save.js`", lineCount(sources["src/save.js"])],
  ["Llamadas `missionHasStep`/`missionStep` con ID literal", literalStepCalls],
  ["Despachos fijos a `s01`/`s02` fuera de `data.js`", fixedSecondaryDispatches],
  ["Campos en `campaign` (`createDefaultSave`)", Object.keys(createDefaultSave().campaign).length],
  ["`SAVE_VERSION`", SAVE_VERSION]
];

process.stdout.write("| Métrica | Valor actual |\n| --- | ---: |\n");
for (const [label, value] of rows) process.stdout.write(`| ${label} | ${value} |\n`);
