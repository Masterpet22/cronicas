import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const desktopCss = await readFile(new URL("../desktop.css", import.meta.url), "utf8");

assert.match(css, /@media \(min-width: 981px\)/, "El escenario unificado debe limitarse a la versión de escritorio");
assert.match(css, /width: min\(1440px, 100vw, calc\(100dvh \* 1\.7777778\)\)/, "El escenario debe usar 1440 px como ancho lógico máximo");
assert.match(css, /aspect-ratio: 16 \/ 9/, "Todas las vistas deben conservar la proporción 16:9");
assert.match(css, /\.village-shell,[\s\S]*\.location-stage \{[\s\S]*height: 100%/, "Las vistas de aldea deben llenar el escenario común");
assert.match(css, /#game canvas \{[\s\S]*height: 100% !important/, "El combate debe llenar el mismo escenario");
assert.match(desktopCss, /@media \(min-width: 651px\)/, "Las correcciones deben quedar limitadas a escritorio y tablet horizontal");
assert.match(desktopCss, /font-family: "Cinzel"/, "Los títulos deben usar la tipografía temática local");
assert.match(desktopCss, /font-family: "Alegreya Sans"/, "El texto debe conservar una tipografía local legible");
assert.match(desktopCss, /\.stage-panel::before,[\s\S]*display: none/, "Los paneles funcionales no deben conservar marcos marrones ilustrados");
assert.match(desktopCss, /\.saga-card\.locked,[\s\S]*opacity: 1/, "Los estados bloqueados no deben perder contraste por opacidad global");
assert.match(desktopCss, /\.dojo-tabs/, "El Dojo debe dividir la configuración mediante pestañas");
assert.match(desktopCss, /font-size: max\(\.75rem, 12px\)/, "La información útil debe conservar un suelo de 12 px");
assert.match(desktopCss, /\.archive-card li \{[\s\S]*background: transparent/, "El archivo debe usar filas y divisores en lugar de cajas marrones");
assert.match(desktopCss, /\.stage-speech,[\s\S]*rgba\(7, 20, 36, \.98\)/, "Los diálogos deben usar una superficie oscura de alto contraste");
assert.match(desktopCss, /\.equipment-modal \{[\s\S]*rgba\(1, 5, 12, \.86\)/, "El modal debe usar un velo azul-negro en lugar de marrón");

console.log("Pruebas del escenario de escritorio superadas.");
