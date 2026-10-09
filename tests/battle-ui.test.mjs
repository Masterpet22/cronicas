import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const battle = readFileSync(new URL("../game.js", import.meta.url), "utf8");
const ui = readFileSync(new URL("../src/ui.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(battle, /drawDuskPass\(g\)/, "El combate debe incluir el fondo del paso al atardecer");
assert.match(battle, /drawMistMarsh\(g\)/, "El combate debe incluir el fondo de la marisma");
assert.match(battle, /drawMoonShrine\(g\)/, "El combate debe incluir el fondo del santuario lunar");
assert.match(battle, /createTurnTimeline\(\)/, "El combate debe crear una barra de orden de acción");
assert.match(battle, /this\.turnReady/, "Las acciones deben depender de que el turno esté listo");
assert.match(battle, /resetTurnTimeline\(\)/, "Los marcadores deben regresar al terminar una ronda");
assert.match(battle, /class PauseScene extends Phaser\.Scene/, "Debe existir una escena de pausa independiente");
assert.match(battle, /makePauseAction\([^\n]+"ABANDONAR"/, "La pausa debe permitir abandonar la misión");
assert.match(ui, /index \* 155/, "Las seis acciones deben mostrarse en una sola barra horizontal");
assert.match(ui, /setDisplaySize\(48, 48\)/, "Los iconos de acción deben ser legibles durante el combate");
assert.match(battle, /action-strike/, "El golpe básico debe cargar su propio icono");
assert.match(battle, /action-guard/, "La guardia debe cargar su propio icono");
assert.match(battle, /Number\(event\.key\) - 1/, "Las acciones deben ofrecer atajos de teclado del 1 al 6");
assert.match(ui, /String\(index \+ 1\)/, "Cada acción debe mostrar su atajo numérico");
assert.match(ui, /setDepth\(25\)/, "La zona interactiva de las acciones debe quedar por encima del velo de la arena");
assert.match(ui, /REDUCE DAÑO 50%/, "La guardia debe explicar su efecto sin abreviaturas crípticas");
assert.match(ui, /PREC\./, "Las estadísticas de acción deben tener etiquetas comprensibles");
assert.match(battle, /width: RENDER_WIDTH/, "El lienzo debe renderizar a alta resolución para conservar texto nítido");
assert.match(battle, /setZoom\(RENDER_RESOLUTION\)/, "La cámara debe preservar las coordenadas lógicas al aumentar la resolución");
assert.doesNotMatch(battle, /fontFamily: "Arial/, "El combate debe compartir las tipografías del metajuego");
assert.match(html, /assets\/vendor\/phaser-3\.90\.0\.min\.js/, "Phaser debe servirse localmente para evitar dependencias de terceros");
assert.match(html, /desktop\.css\?v=0\.23\.0/, "El CSS corregido debe invalidar la caché anterior");

console.log("Pruebas de interfaz de combate superadas.");
