import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyDebugCheckpoint, completeMission, createCharacter, createDefaultSave, normalizeSave } from "../src/save.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixturesDirectory = resolve(projectRoot, "tests", "fixtures");

const character = createCharacter(createDefaultSave(), {
  name: "Akio",
  affinity: "fuego",
  appearance: "#68a8ff",
  bodyType: "male",
  hair: 1
});

const fixtures = new Map([
  ["save-new.json", normalizeSave(character)],
  ["save-mid.json", applyDebugCheckpoint(character, "mission-2-ready")],
  ["save-complete.json", completeMission(applyDebugCheckpoint(character, "mission-5-ready"), "m05").save]
]);

await mkdir(fixturesDirectory, { recursive: true });
await Promise.all([...fixtures].map(([filename, save]) =>
  writeFile(resolve(fixturesDirectory, filename), `${JSON.stringify(save, null, 2)}\n`, "utf8")
));

process.stdout.write(`Fixtures v16 generados: ${[...fixtures.keys()].join(", ")}\n`);
