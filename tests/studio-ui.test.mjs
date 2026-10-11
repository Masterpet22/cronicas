import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, css, editor] = await Promise.all([
  readFile(new URL("../cronicas-studio.html", import.meta.url), "utf8"),
  readFile(new URL("../cronicas-studio.css", import.meta.url), "utf8"),
  readFile(new URL("../src/studio/editor.js", import.meta.url), "utf8")
]);

for (const mode of ["animador", "calibrador", "sprites", "exportar", "proyecto"]) {
  assert.match(html, new RegExp(`data-mode=["']${mode}["']`), `Debe existir el modo ${mode}`);
}
for (const id of ["canvas", "preview-canvas", "tree", "inspector-panel", "timeline-scroll", "tracks"]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `Debe existir el control ${id}`);
}
assert.doesNotMatch(html, /<iframe\b/i, "El Studio unificado no debe depender de vistas embebidas");
assert.match(html, /src=["']\.\/src\/studio\/editor\.js\?v=0\.45\.0["']/);
assert.match(html, /navigator\.serviceWorker\.getRegistrations\(\)/, "El Studio debe retirar cachés heredadas antes de iniciar");
assert.match(html, /id=["']timeline-zoom["']/, "El timeline debe tener zoom temporal independiente");
assert.match(css, /grid-template-columns:\s*270px\s+minmax\(480px,\s*1fr\)\s+310px/);
assert.match(css, /\.timeline\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s);
assert.match(editor, /sampleStudioAnimation/);
assert.match(editor, /validateStudioProject/);
assert.match(editor, /mode:\s*["']game["']/);
assert.match(editor, /function restoreHistory/);
assert.match(editor, /window\.history\.replaceState/, "El historial del editor no debe ocultar el historial del navegador");
assert.doesNotMatch(editor, /let history\s*=/, "El historial serializable debe tener un nombre propio");
assert.match(editor, /lockedTargets/);
assert.match(editor, /timelineZoom/);
assert.match(editor, /TRANSFORM_FIELDS/);
assert.match(editor, /spriteEvents/);

console.log("Pruebas de interfaz de Crónicas Studio superadas.");
