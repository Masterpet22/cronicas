import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

assert.match(css, /@media \(min-width: 981px\)/, "El escenario unificado debe limitarse a la versión de escritorio");
assert.match(css, /width: min\(1440px, 100vw, calc\(100dvh \* 1\.7777778\)\)/, "El escenario debe usar 1440 px como ancho lógico máximo");
assert.match(css, /aspect-ratio: 16 \/ 9/, "Todas las vistas deben conservar la proporción 16:9");
assert.match(css, /\.village-shell,[\s\S]*\.location-stage \{[\s\S]*height: 100%/, "Las vistas de aldea deben llenar el escenario común");
assert.match(css, /#game canvas \{[\s\S]*height: 100% !important/, "El combate debe llenar el mismo escenario");

console.log("Pruebas del escenario de escritorio superadas.");
