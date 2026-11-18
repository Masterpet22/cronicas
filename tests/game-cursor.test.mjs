import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { hasVisibleBusyState } from "../src/game-cursor.js";

function pngSize(buffer) {
  assert.equal(buffer.toString("ascii", 1, 4), "PNG", "El recurso debe ser PNG");
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

const assets = new Map([
  ["kunai.png", [80, 69]],
  ["shuriken.png", [50, 52]],
  ["click-burst.png", [88, 96]]
]);
for (const [name, expected] of assets) {
  const contents = await readFile(new URL(`../assets/ui/cursor/${name}`, import.meta.url));
  assert.deepEqual(pngSize(contents), expected, `${name} debe conservar su tamaño optimizado`);
}

const visible = { hidden: false, getClientRects: () => [{}] };
const hidden = { hidden: true, getClientRects: () => [{}] };
assert.equal(hasVisibleBusyState({ querySelectorAll: () => [visible] }), true, "Un estado ocupado visible debe activar el shuriken");
assert.equal(hasVisibleBusyState({ querySelectorAll: () => [hidden] }), false, "Un estado ocupado oculto no debe cambiar el cursor");
assert.equal(hasVisibleBusyState(null), false, "Sin superficie no debe existir un estado de carga");

const cursorStyles = await readFile(new URL("../cursor.css", import.meta.url), "utf8");
assert.match(cursorStyles, /kunai\.png[^)]+\) 1 1, auto/, "El cursor del navegador debe apuntar con la punta del kunai");
assert.match(cursorStyles, /shuriken\.png[^)]+\) 25 26, progress/, "El shuriken debe usar su centro");

console.log("Cursor kunai, shuriken de carga y destello de clic verificados.");
