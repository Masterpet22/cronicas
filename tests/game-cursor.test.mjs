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

const cursorSource = await readFile(new URL("../src/game-cursor.js", import.meta.url), "utf8");
assert.match(cursorSource, /class="game-cursor-kunai"[^>]+width="56" height="48"/, "El kunai debe mostrarse al 70 % de su tamaño original");

console.log("Cursor kunai, shuriken de carga y destello de clic verificados.");
