import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const battle = readFileSync(new URL("../game.js", import.meta.url), "utf8");
const ui = readFileSync(new URL("../src/ui.js", import.meta.url), "utf8");

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

console.log("Pruebas de interfaz de combate superadas.");
