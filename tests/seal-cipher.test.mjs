import assert from "node:assert/strict";
import { applyCipherAction, cipherComplete, cipherHint, cipherMatches, cipherMoves, createCipherState, normalizeCipherState, shuffleCipher, swapCipher } from "../src/puzzles/seal-cipher.js";

for (let seed = 1; seed <= 30; seed += 1) {
  let state = createCipherState(seed);
  assert.equal(state.board.length, 36);
  assert.equal(cipherMatches(state.board).length, 0, "No debe haber combinaciones automáticas al empezar");
  assert.ok(cipherMoves(state).length, "Todo tablero debe empezar con una jugada");
  assert.deepEqual(createCipherState(seed), state, "La generación debe ser reproducible");
  const original = structuredClone(state);
  assert.equal(swapCipher(state, 5, 6).valid, false, "Dos filas no son vecinas a través del borde");
  assert.equal(swapCipher(state, -1, 0).valid, false);
  assert.equal(swapCipher(state, 0, 35).valid, false);
  assert.deepEqual(state, original, "Las reglas no deben mutar al candidato");
  let turns = 0;
  while (!cipherComplete(state) && turns < 200) {
    const hint = cipherHint(state);
    assert.ok(hint);
    const result = swapCipher(state, hint.from, hint.to);
    assert.equal(result.valid, true);
    assert.equal(result.state.moves, state.moves + 1);
    assert.ok(state.revealed.every((found, index) => !found || result.state.revealed[index]), "Los fragmentos nunca se vuelven a cubrir");
    assert.equal(cipherMatches(result.state.board).length, 0, "Las cascadas deben acabar en un tablero estable");
    assert.deepEqual(normalizeCipherState(JSON.parse(JSON.stringify(result.state))), result.state, "Reanudar conserva piezas, tinta, poderes y azar");
    state = result.state; turns += 1;
  }
  assert.equal(cipherComplete(state), true, `Haru debe poder guiar la solución de la semilla ${seed}`);
  assert.equal(swapCipher(state, 0, 1).valid, false, "No se consumen movimientos después de resolverlo");
}

const base = createCipherState();
const fixture = { ...base, board: Array.from({ length: 36 }, (_, i) => (Math.floor(i / 6) * 2 + i % 6) % 5) };
[fixture.board[0], fixture.board[1], fixture.board[2], fixture.board[3], fixture.board[8]] = [0, 0, 1, 0, 0];
assert.equal(cipherMatches(fixture.board).length, 0);
const four = swapCipher(fixture, 2, 8);
assert.ok(four.steps[0].cleared.every((index) => four.steps[0].after.revealed[index]));
assert.ok(four.steps[0].after.specials.includes("row"), "Cuatro sellos deben crear un poder de fila");

const powered = createCipherState(73);
powered.specials[30] = "row"; powered.specials[32] = "column";
const blast = swapCipher(powered, 30, 31);
for (const index of [30, 31, 32, 33, 34, 35, 2, 8, 14, 20, 26]) assert.ok(blast.steps[0].cleared.includes(index), "Los poderes alcanzados deben encadenarse");

const dead = { ...base, board: Array.from({ length: 36 }, (_, i) => (Math.floor(i / 6) + i % 6) % 5) };
dead.revealed[0] = true; dead.revealed[35] = true;
assert.equal(cipherMoves(dead).length, 0);
const restored = normalizeCipherState(dead);
assert.ok(cipherMoves(restored).length, "Un bloqueo debe reorganizar automáticamente el tablero");
assert.deepEqual(restored.revealed, dead.revealed);
const shuffled = shuffleCipher(powered);
assert.equal(shuffled.specials.filter(Boolean).length, 2, "Reorganizar conserva los poderes");
assert.deepEqual(shuffled.revealed, powered.revealed);
assert.equal(cipherMatches(shuffled.board).length, 0);
const repaired = normalizeCipherState({ board: [99], revealed: [true, "true"], seed: 0, moves: -3 });
assert.equal(repaired.board.length, 36);
assert.equal(repaired.moves, 0);
assert.equal(repaired.revealed[0], true);
assert.equal(repaired.revealed[1], false);
assert.equal(applyCipherAction(null, "swap", { from: 0, to: 1 }).valid, false);
assert.equal(applyCipherAction(base, "unknown").valid, false);
console.log("Cifrado de sellos: 30 soluciones, cascadas, poderes, bloqueos y reanudación verificados.");
