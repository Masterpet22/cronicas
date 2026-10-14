import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, css, editor, psdBundle, psdLicense] = await Promise.all([
  readFile(new URL("../cronicas-studio.html", import.meta.url), "utf8"),
  readFile(new URL("../cronicas-studio.css", import.meta.url), "utf8"),
  readFile(new URL("../src/studio/editor.js", import.meta.url), "utf8"),
  readFile(new URL("../src/vendor/ag-psd.bundle.js", import.meta.url), "utf8"),
  readFile(new URL("../src/vendor/ag-psd.LICENSE", import.meta.url), "utf8")
]);

for (const mode of ["animador", "calibrador", "sprites", "exportar", "proyecto"]) {
  assert.match(html, new RegExp(`data-mode=["']${mode}["']`), `Debe existir el modo ${mode}`);
}
for (const id of ["canvas", "preview-canvas", "tree", "inspector-panel", "timeline-scroll", "tracks", "undo", "redo", "history-undo", "history-redo", "change-history"]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `Debe existir el control ${id}`);
}
for (const id of ["import-sprite", "reset-sprite", "sprite-file", "sprite-import-preview"]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `Debe existir el control de sprites ${id}`);
}
assert.match(html, /accept=["'][^"']*\.png[^"']*\.psd/i, "El selector debe aceptar PNG y PSD");
assert.match(html, /ag-psd\.bundle\.js\?v=31\.0\.3/, "El lector PSD debe cargarse de forma local y versionada");
assert.match(editor, /window\.agPsd\.readPsd|window\.agPsd\?\.readPsd/, "El Studio debe decodificar archivos PSD");
assert.match(editor, /collectPsdLayers/, "El Studio debe recorrer las capas y grupos del PSD");
assert.match(editor, /layer\.canvas\.toDataURL\(["']image\/png["']\)/, "Cada capa PSD debe persistirse como PNG independiente");
assert.match(editor, /displayName\s*=\s*layer\.name/, "Cada sprite debe conservar el nombre de su capa PSD");
assert.match(editor, /normalizeLayerId/, "Los nombres de capa deben poder asociarse con piezas existentes");
assert.match(editor, /totalMemoryLimit:\s*MAX_PSD_MEMORY/, "La lectura multicapa debe limitar el uso de memoria");
assert.match(psdBundle, /agPsd/, "El bundle local debe exponer el lector PSD");
assert.match(psdLicense, /MIT License/, "El lector PSD debe conservar su licencia");
assert.doesNotMatch(html, /<iframe\b/i, "El Studio unificado no debe depender de vistas embebidas");
assert.match(html, /src=["']\.\/src\/studio\/editor\.js\?v=0\.47\.3["']/);
assert.match(html, /id=["']undo["'][^>]*aria-label=["']Deshacer["'][^>]*>↶<\/button>/, "Deshacer debe mostrarse solo como flecha");
assert.match(html, /id=["']redo["'][^>]*aria-label=["']Rehacer["'][^>]*>↷<\/button>/, "Rehacer debe mostrarse solo como flecha");
assert.match(css, /@media \(max-width: 1280px\)[\s\S]*\.project-title \{ display: none; \}/, "La cabecera debe liberar espacio en ventanas medianas");
assert.match(css, /@media \(max-width: 820px\)[\s\S]*\.studio-header[\s\S]*flex-wrap: wrap/, "La cabecera debe reorganizarse en ventanas estrechas");
assert.match(html, /id=["']toolbar-scroll["']/, "La barra de herramientas debe tener una zona desplazable");
assert.match(html, /id=["']toolbar-more["'][^>]*aria-controls=["']toolbar-more-panel["']/, "La barra debe exponer un botón Más accesible");
assert.match(css, /\.toolbar-scroll[^}]*overflow-x:\s*auto/, "La barra debe permitir desplazamiento horizontal");
assert.match(css, /@container workspace \(max-width: 1020px\)/, "El menú Más debe responder al ancho real del área de trabajo");
assert.match(editor, /function setToolbarMore\(/, "El menú Más debe poder abrirse y cerrarse");
assert.match(html, /cronicas-studio\.css\?v=0\.47\.3/, "La hoja de estilos debe invalidar la caché al actualizar la lista de sprites");
assert.match(css, /\*::\-webkit-scrollbar-thumb:hover/, "Los scrollbars deben tener un estado hover personalizado");
assert.match(css, /scrollbar-color:\s*var\(--scroll-thumb\)\s+var\(--scroll-track\)/, "Firefox debe usar la paleta del Studio en los scrollbars");
assert.match(css, /\*::\-webkit-scrollbar-corner/, "La esquina de scroll debe integrarse con el fondo del Studio");
assert.match(html, /navigator\.serviceWorker\.getRegistrations\(\)/, "El Studio debe retirar cachés heredadas antes de iniciar");
assert.doesNotMatch(html, /window\.stop\(\)/, "La limpieza del Studio no debe abortar la navegación actual");
assert.match(html, /id=["']timeline-zoom["']/, "El timeline debe tener zoom temporal independiente");
assert.match(css, /grid-template-columns:\s*270px\s+minmax\(480px,\s*1fr\)\s+310px/);
assert.match(css, /\.timeline\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s);
assert.match(editor, /sampleStudioAnimation/);
assert.match(editor, /studio-format\.js\?v=0\.45\.3/, "Los módulos internos deben invalidar la caché junto con el editor");
assert.match(editor, /validateStudioProject/);
assert.match(editor, /mode:\s*["']game["']/);
assert.match(editor, /function restoreHistory/);
assert.match(editor, /function renderChangeHistory/, "El Studio debe mostrar el historial de cambios");
assert.match(editor, /undoHistory\.push\(\{ snapshot: current, label: changeLabel \}\)/, "Cada estado debe conservar una descripción visible");
assert.match(editor, /Deshecho:|Rehecho:/, "Deshacer y rehacer deben explicar qué cambio aplicaron");
assert.match(editor, /function duplicatePart\(/, "Cada sprite debe poder duplicarse desde la lista");
assert.match(editor, /function deletePart\(/, "Cada sprite debe poder eliminarse desde la lista");
assert.match(editor, /aria-selected/, "La lista debe exponer cuál sprite está seleccionado");
assert.match(editor, /className = ["']tree-action duplicate["']/, "Cada fila debe mostrar la acción de duplicar");
assert.match(editor, /className = ["']tree-action delete["']/, "Cada fila debe mostrar la acción de eliminar");
assert.match(css, /\.tree-action\.delete:hover/, "La eliminación debe distinguirse visualmente");
assert.match(editor, /let selectedParts = new Set/, "La lista debe conservar una selección múltiple de sprites");
assert.match(editor, /event\.ctrlKey \|\| event\.metaKey/, "Ctrl+clic debe alternar sprites individuales");
assert.match(editor, /function selectPartRange\(/, "La selección por rango debe conservar un ancla");
assert.match(editor, /event\.key === "ArrowUp" \|\| event\.key === "ArrowDown"/, "Shift con flechas verticales debe ampliar o reducir la selección");
assert.match(html, /id=["']tree["'][^>]*role=["']listbox["']/, "La lista de sprites debe exponer su semántica accesible");
assert.match(css, /\.tree-row\.active\.focused/, "La fila principal debe distinguirse dentro de la selección múltiple");
for (const id of ["multi-selection-toolbar", "multi-visibility", "multi-lock", "multi-duplicate", "multi-delete"]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `Debe existir la acción múltiple ${id}`);
}
assert.match(editor, /function renderMultiSelectionToolbar\(/, "La barra contextual debe depender de la selección múltiple");
assert.match(editor, /items\.length > 1/, "La barra contextual debe ocultarse con menos de dos sprites");
assert.match(css, /\.multi-selection-toolbar[\s\S]*position:\s*sticky/, "La barra de selección múltiple debe permanecer visible al desplazarse");
assert.match(editor, /function toggleSelectedVisibility\(/, "La selección múltiple debe poder mostrarse u ocultarse");
assert.match(editor, /function toggleSelectedLocks\(/, "La selección múltiple debe poder bloquearse o desbloquearse");
assert.match(editor, /window\.history\.replaceState/, "El historial del editor no debe ocultar el historial del navegador");
assert.doesNotMatch(editor, /let history\s*=/, "El historial serializable debe tener un nombre propio");
assert.match(editor, /lockedTargets/);
assert.match(editor, /timelineZoom/);
assert.match(editor, /TRANSFORM_FIELDS/);
assert.match(editor, /spriteEvents/);
assert.match(editor, /if \(rightTab === ["']curves["']\) drawCurve\(\)/, "El inspector no debe dibujar una curva en una pestaña oculta");
assert.match(editor, /if \(width <= 0 \|\| height <= 0\) return;/, "El lienzo de curvas debe ignorar dimensiones nulas");
assert.doesNotMatch(editor, /x \+= width \/ 6|y \+= height \/ 4/, "La cuadrícula de curvas no debe usar incrementos que puedan valer cero");
assert.match(html, /data-tool=["']select["'][^>]*title=["']Seleccionar y mover objetivo \(V\)["']/, "La herramienta principal debe anunciar el desplazamiento de objetivos");
assert.match(editor, /interaction = \{\s*type: ["']translate["']/, "El Animador debe iniciar el arrastre de posición");
assert.match(editor, /function localDelta\(/, "El arrastre debe convertir el movimiento al espacio local del hueso");
assert.match(editor, /\$\(id\)\.oninput = previewKeyFromInspector/, "Los campos de transformación deben previsualizar sus cambios");
assert.match(editor, /\$\(id\)\.onchange = commitKeyFromInspector/, "Los campos de transformación deben guardar sus cambios");

console.log("Pruebas de interfaz de Crónicas Studio superadas.");
