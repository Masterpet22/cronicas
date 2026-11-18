import assert from "node:assert/strict";
import { nextGroupTimelineStep } from "../src/battle/group-timeline.js";
import { trainingOpponentProfile, createTraining } from "../src/training.js";
import { createCharacter, createDefaultSave } from "../src/save.js";
import { ENEMY_ROSTER, ABILITY_CATALOG } from "../src/data.js";
import { createEnemyState } from "../src/battle/enemy-state.js";
import { chooseEnemyAbility } from "../src/battle/enemy-abilities.js";
import { closeActionState } from "../src/battle/action-resolution.js";
import { physicalActionAvailable } from "../src/battle/skill-tables.js";

const unit = (id, speed, extra = {}) => ({ id, index: Number(id.slice(-1)) || 0, speed, progress: 0, alive: true, action: null, initiative: 0, ...extra });
const group = [unit("player", 10), unit("enemy-0", 5), unit("enemy-1", 20), unit("enemy-2", 8)];
const original = structuredClone(group);
const first = nextGroupTimelineStep(group);
assert.equal(first.arrival.id, "enemy-1");
assert.equal(first.duration, 600);
assert.ok(Math.abs(first.progress.player - .4) < 1e-9);
assert.ok(Math.abs(first.progress["enemy-0"] - .2) < 1e-9);
assert.ok(Math.abs(first.progress["enemy-2"] - .32) < 1e-9);
assert.deepEqual(group, original, "Consultar el próximo turno no muta ni reinicia los relojes");
assert.equal(nextGroupTimelineStep(group.map(u => ({ ...u, alive: u.id !== "enemy-1" }))).arrival.id, "player");
assert.equal(nextGroupTimelineStep([]), null);
const preparing = [unit("player", 10, { progress: .8, action: { seals: ["a", "b"] } }), unit("enemy-0", 20, { progress: .6 })];
const interrupted = nextGroupTimelineStep(preparing);
assert.equal(interrupted.arrival.id, "enemy-0", "Un rival rápido actúa mientras el jugador prepara sellos");
assert.ok(interrupted.progress.player > .8 && interrupted.progress.player < 1);
assert.equal(nextGroupTimelineStep([unit("player", 10, { progress: 1, action: { seals: ["a"] } }),
  unit("enemy-0", 10, { progress: .8 })]).arrival.id, "player", "La acción preparada tiene prioridad en un empate");
assert.equal(nextGroupTimelineStep([unit("player", 10, { progress: .8 }), unit("enemy-0", 10, { progress: .8 })]).arrival.id, "enemy-0");
const reservation = { seals: ["a", "b", "c"] };
assert.ok(Math.abs(nextGroupTimelineStep([unit("enemy-0", 10, { progress: .8, action: reservation })]).duration - 900) < 1e-9);
assert.equal(nextGroupTimelineStep([unit("enemy-0", 10, { progress: .8, action: reservation })]).arrival.action, reservation);
const simultaneous = [unit("player", 6), unit("enemy-0", 10, { progress: .8, action: { seals: ["a", "b"] } }),
  unit("enemy-1", 10, { progress: .8, action: { seals: ["a", "b", "c"] } })];
const preparingGroup = nextGroupTimelineStep(simultaneous);
assert.equal(preparingGroup.arrival.id, "enemy-0");
assert.equal(preparingGroup.progress["enemy-0"], 1);
assert.ok(preparingGroup.progress["enemy-1"] > .8 && preparingGroup.progress["enemy-1"] < 1,
  "Preparar una técnica no detiene ni completa la preparación de los otros enemigos");

const save = createCharacter(createDefaultSave(), { affinity: "fuego" });
const snapshot = structuredClone(save);
const mission = createTraining({ targetCount: 3 });
const states = mission.encounters.map((id, index) => createEnemyState(trainingOpponentProfile(ENEMY_ROSTER[id], save, index), mission));
assert.ok(states.every(s => s.hp > 0 && s.hp < 10000 && s.maxChakra >= 30 && s.accuracy > 0));
const before = structuredClone(states[1]);
const action = chooseEnemyAbility(trainingOpponentProfile(ENEMY_ROSTER[mission.encounters[0]], save), states[0]);
assert.ok(action);
states[0].statuses.push({ type: "burn", power: 3, duration: 2 });
states[0].cooldowns.fire_embers = 3;
closeActionState({ enemy: states[0], pendingActions: { enemy: action }, timelineProgress: { enemy: 1 } }, "enemy", action);
assert.deepEqual(states[1], before, "Cerrar el turno de un rival no toca el chakra, estados ni recargas de otro");
assert.notEqual(states[0].statuses, states[1].statuses);
assert.notEqual(states[0].cooldowns, states[1].cooldowns);
assert.deepEqual(save, snapshot, "Crear rivales no modifica la partida");
const scene = { mission, busy: false, finished: false, turnReady: true, scene: { isPaused: () => false },
  player: { hp: 1, chakra: 0 }, cooldowns: {}, actionCost: () => 20 };
assert.equal(physicalActionAvailable(scene, ABILITY_CATALOG.fire_embers), false, "El combate real no tiene chakra gratuito");
scene.player.chakra = 100; scene.cooldowns.fire_embers = 1;
assert.equal(physicalActionAvailable(scene, ABILITY_CATALOG.fire_embers), false, "La recarga se respeta en el Dojo activo");
scene.cooldowns.fire_embers = 0;
assert.equal(physicalActionAvailable(scene, ABILITY_CATALOG.fire_embers), true);
console.log("Turnos de grupo: velocidades, empates, preparación, independencia de estados, costes y aislamiento verificados.");
