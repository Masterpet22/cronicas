import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_MISSIONS } from "../src/data.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(projectRoot, "src", "data.js");

function javascriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".js") ? [entryPath] : [];
  });
}

const protectedFiles = [path.join(projectRoot, "game.js"), ...javascriptFiles(path.join(projectRoot, "src"))]
  .filter((file) => file !== dataPath);
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

assert.deepEqual(violations, [], `Los IDs de misión y paso solo pueden decidir comportamiento en data.js:\n${violations.join("\n")}`);

const directStepQueries = protectedFiles.flatMap((file) => {
  const relativeFile = path.relative(projectRoot, file).replaceAll("\\", "/");
  return readFileSync(file, "utf8").split(/\r?\n/).flatMap((line, index) => (
    /(?:missionHasStep|missionStep)\([^\n]*,[^,\n]*,\s*["'][^"']+["']/.test(line)
      ? [`${relativeFile}:${index + 1}`]
      : []
  ));
});
assert.deepEqual(directStepQueries, [], `No se permiten consultas de pasos mediante un ID literal:\n${directStepQueries.join("\n")}`);

console.log("Pruebas de arquitectura superadas.");
