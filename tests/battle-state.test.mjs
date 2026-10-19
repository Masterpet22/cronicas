import assert from "node:assert/strict";
import { bindBattleState, createBattleState, serializeBattleState } from "../src/battle/battle-state.js";

const scene = {};
const state = bindBattleState(scene, createBattleState());
scene.mission = { id: "example" };
scene.player = { hp: 20 };
scene.enemy = { hp: 10 };
scene.round = 2;

assert.equal(scene.battleState, state);
assert.equal(state.session.mission.id, "example");
assert.equal(state.session.round, 2);
assert.equal(state.combatants.player.hp, 20);
assert.equal(state.combatants.enemy.hp, 10);
assert.deepEqual(serializeBattleState(state), {
  session: { ...state.session },
  combatants: { player: { hp: 20 }, enemy: { hp: 10 } }
});

console.log("Pruebas de BattleState superadas.");

