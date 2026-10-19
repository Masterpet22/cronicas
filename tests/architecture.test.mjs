import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_MISSIONS } from "../src/content/index.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(projectRoot, "src", "data.js");
const metaUiPath = path.join(projectRoot, "src", "meta-ui.js");
const metaViewsPath = path.join(projectRoot, "src", "ui", "meta", "views");
const gameEntryPath = path.join(projectRoot, "game.js");
const battleScenePath = path.join(projectRoot, "src", "battle", "scenes", "battle-scene.js");

function javascriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".js") ? [entryPath] : [];
  });
}

const protectedFiles = [path.join(projectRoot, "game.js"), ...javascriptFiles(path.join(projectRoot, "src"))]
  .filter((file) => file !== dataPath && !file.includes(`${path.sep}content${path.sep}`) && !file.includes(`${path.sep}save${path.sep}migrations${path.sep}`));
const catalogIds = [...new Set(ALL_MISSIONS.flatMap((mission) => [
  mission.id,
  ...(mission.flow || []).map((step) => step.id).filter(Boolean)
]))];

// Cada excepción futura debe señalar una línea exacta y documentar motivo y fecha.
// No se admiten patrones globales ni excepciones por archivo completo.
const ALLOWED_ID_LITERALS = Object.freeze([]);
ALLOWED_ID_LITERALS.forEach((exception) => {
  assert.match(exception.reason, /\S/, "Una excepción arquitectónica necesita un motivo");
  assert.match(exception.addedOn, /^\d{4}-\d{2}-\d{2}$/, "Una excepción arquitectónica necesita fecha ISO");
  assert.match(exception.line, /\S/, "Una excepción arquitectónica debe identificar la línea exacta");
});

const escapedIds = catalogIds.map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const literalPattern = new RegExp(`(["'])(${escapedIds.join("|")})\\1`, "g");
const violations = [];

protectedFiles.forEach((file) => {
  const relativeFile = path.relative(projectRoot, file).replaceAll("\\", "/");
  readFileSync(file, "utf8").split(/\r?\n/).forEach((line, index) => {
    literalPattern.lastIndex = 0;
    for (const match of line.matchAll(literalPattern)) {
      const id = match[2];
      const allowed = ALLOWED_ID_LITERALS.some((exception) => exception.file === relativeFile && exception.id === id && exception.line === line.trim());
      if (!allowed) violations.push(`${relativeFile}:${index + 1} contiene el ID ${id}`);
    }
  });
});

assert.deepEqual(violations, [], `Los IDs literales de misión y paso solo pueden vivir en contenido, migraciones y pruebas:\n${violations.join("\n")}`);

const directStepQueries = protectedFiles.flatMap((file) => {
  const relativeFile = path.relative(projectRoot, file).replaceAll("\\", "/");
  return readFileSync(file, "utf8").split(/\r?\n/).flatMap((line, index) => (
    /(?:missionHasStep|missionStep)\([^\n]*,[^,\n]*,\s*["'][^"']+["']/.test(line)
      ? [`${relativeFile}:${index + 1}`]
      : []
  ));
});
assert.deepEqual(directStepQueries, [], `No se permiten consultas de pasos mediante un ID literal:\n${directStepQueries.join("\n")}`);

const lineCount = (file) => readFileSync(file, "utf8").split(/\r?\n/).length;
assert.ok(lineCount(metaUiPath) <= 300, `meta-ui.js debe ser un orquestador de hasta 300 líneas; tiene ${lineCount(metaUiPath)}`);
assert.ok(lineCount(gameEntryPath) <= 150, `game.js debe ser un entry point de hasta 150 líneas; tiene ${lineCount(gameEntryPath)}`);
assert.ok(lineCount(battleScenePath) <= 800, `BattleScene debe quedar por debajo de 800 líneas; tiene ${lineCount(battleScenePath)}`);
javascriptFiles(metaViewsPath).forEach((file) => {
  const source = readFileSync(file, "utf8");
  assert.ok(lineCount(file) <= 400, `${path.basename(file)} supera el límite de 400 líneas`);
  assert.match(source, /export function create\w+View\(deps\)/, `${path.basename(file)} debe exponer una fábrica de vista con dependencias explícitas`);
  assert.match(source, /\brender\s*\(/, `${path.basename(file)} debe implementar render`);
  assert.match(source, /\bmount\s*\(/, `${path.basename(file)} debe implementar mount`);
  assert.match(source, /\bdispose\s*\(/, `${path.basename(file)} debe implementar dispose`);
});

console.log("Pruebas de arquitectura superadas.");
