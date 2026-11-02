import assert from "node:assert/strict";
import { BASE_ACTIONS, ENEMY_ACTIONS, JUTSU_LIBRARY } from "../src/data.js";
import { closeActionState } from "../src/battle/action-resolution.js";
import { actionInitiative, recoverySpeed } from "../src/battle/initiative.js";
import { millisecondsToTimelineThreshold } from "../src/battle/timeline.js";

globalThis.window = { Phaser: { Scene: class {}, Math: { Between: min => min } } };
const { BattleFlowMethods } = await import("../src/battle/scenes/battle-flow.js");
const { BattleActionMethods } = await import("../src/battle/scenes/battle-actions.js");
const { BattleFeedbackMethods } = await import("../src/battle/scenes/battle-feedback.js");
const { BattlePresentationMethods } = await import("../src/battle/scenes/battle-presentation.js");
const noop = () => {};
function battle(count = 1) {
  const unit = () => ({ hp: 100, maxHp: 100, chakra: 20, maxChakra: 80, statuses: [], guarding: false,
    baseSpeed: 10, speedModifier: 0, baseStrength: 0, strengthModifier: 0, damageReduction: 0,
    baseEvasion: 0, accuracy: 100, criticalChance: 0, primaryAffinity: null, soak: null, recoveryInitiative: 0 });
  const fighter = () => ({ body: { x: 0, y: 0 }, shadow: { x: 0 }, targets: [] });
  const s = { player: unit(), enemy: unit(), hero: fighter(), foe: fighter(), mission: {},
    encounters: Array.from({ length: count }, () => ({ name: "Rival" })), enemyIndex: 0,
    pendingActions: { player: null, enemy: null }, timelineProgress: { player: 0, enemy: 0 },
    cooldowns: { other: 3 }, round: 1, turnReady: true, combatFeatures: { announcedActionIds: [] },
    eventsLog: [], ticks: 0, resultCalls: 0, rolls: [false, false], scene: { isActive: () => true },
    clearPreparationFeedback: noop, stopTurnTimeline: noop, setButtonsEnabled: noop,
    setTimelineMarkerState: noop, updateTimelineMarkers: noop, refreshHud: noop, startTurnCharge: noop,
    setMessage: noop, shake: noop, showPreparationFeedback: noop, playTimelineReadyBrush: noop,
    delay: async () => {}, tone: noop, floatLabel: noop, createImpact: noop, recordEnemyObservation: noop,
    floatHealthLoss: noop, flashFighter: noop, healthLossPulse: noop,
    playSeals: async () => ({ multiplier: 1 }), playerAttack: async () => {},
    playSubstitution: async () => {}, applyEarthReprisal: async () => {}, applyWaterPassive: () => null,
    tweens: { add: noop, killTweensOf: noop },
    add: { circle: () => ({ setStrokeStyle() { return this; }, setDepth() { return this; }, destroy: noop }) },
    resolveEnemyOutcome: async function() {
      this.eventsLog.push("outcome"); this.resultCalls++;
      if (this.enemy.hp > 0) return false;
      this.finished = true; this.outcome = this.encounters.length > 1 ? "next" : "won"; return true;
    },
    finishBattle: async function(won) { this.finished = true; this.outcome = won ? "won" : "lost"; }
  };
  s.combatantSpeed = u => (u.baseSpeed * (1 + u.speedModifier));
  s.combatantEvasion = () => 0;
  s.rollHit = () => s.rolls.shift() ?? true;
  for (const name of ["playerGuard", "executeEnemyAction", "enemyTurn", "clearGuard"])
    s[name] = (...args) => BattleActionMethods.prototype[name].call(s, ...args);
  s.loseHealth = (...args) => BattleFeedbackMethods.prototype.loseHealth.call(s, ...args);
  s.actionCost = a => BattleFeedbackMethods.prototype.actionCost.call(s, a);
  s.resolveCombatantStatusTick = async (...args) => {
    s.eventsLog.push("status"); s.ticks++;
    await BattleActionMethods.prototype.resolveCombatantStatusTick.call(s, ...args);
  };
  s.executeTimelineAction = (...args) => BattleFlowMethods.prototype.executeTimelineAction.call(s, ...args);
  return s;
}

assert.equal(recoverySpeed(10, 1), 11);
assert.equal(recoverySpeed(10, -1), 9);
assert.equal(recoverySpeed(10, 0), 10);
assert.equal(actionInitiative({ initiative: 2 }), 0);
const s = battle();
for (const initiative of [1, 1, -1, 0]) {
  closeActionState(s, "player", { initiative });
  assert.equal(s.player.recoveryInitiative, initiative, "Se reemplaza, no se acumula");
}
assert.ok(millisecondsToTimelineThreshold(0, 10, null, 1) < 1200);
assert.ok(millisecondsToTimelineThreshold(0, 10, null, -1) > 1200);
const sealed = { seals: ["a", "b"] };
assert.equal(millisecondsToTimelineThreshold(.8, 10, sealed, -1), millisecondsToTimelineThreshold(.8, 10, sealed, 1));

// La escena consume la iniciativa al llegar al 80 %, y transmite el valor al reloj.
const ready = battle(); ready.busy = false; ready.timelinePaused = false; ready.player.recoveryInitiative = 1;
await BattlePresentationMethods.prototype.handleTimelineArrivals.call(ready, [{ actor: "player", action: null }]);
assert.equal(ready.player.recoveryInitiative, 0);
assert.equal(ready.turnReady, true);
const clock = battle(); clock.busy = false; clock.timelinePaused = false; clock.enemy.baseSpeed = 1;
clock.player.recoveryInitiative = 1; clock.timelineRunToken = 0;
clock.tweens.add = config => { clock.duration = config.duration; return {}; };
BattlePresentationMethods.prototype.runTurnTimeline.call(clock);
assert.ok(Math.abs(clock.duration - 1200 / 1.1) < 1e-9);
clock.timelineTween = null; clock.timelineProgress.player = .8; clock.pendingActions.player = sealed;
BattlePresentationMethods.prototype.runTurnTimeline.call(clock);
assert.equal(clock.duration, 600, "La preparación no recibe iniciativa pendiente");
const reset = battle(); reset.player.recoveryInitiative = 1; reset.enemy.recoveryInitiative = -1;
reset.tweens.add = config => { config.onComplete(); return {}; };
await BattlePresentationMethods.prototype.resetTurnTimeline.call(reset);
assert.equal(reset.player.recoveryInitiative, 0);
assert.equal(reset.enemy.recoveryInitiative, 0);

// Guardia conserva estados previos y dura hasta un impacto; el descanso no se repite.
const guarded = battle();
guarded.player.statuses = [{ type: "poison", label: "VENENO", power: 3, duration: 3 }];
await guarded.executeTimelineAction("player", BASE_ACTIONS[1]);
assert.equal(guarded.player.chakra, 45);
assert.equal(guarded.player.hp, 97);
assert.equal(guarded.player.guarding, true);
assert.equal(guarded.player.statuses[0].duration, 2);
assert.equal(guarded.player.recoveryInitiative, -1);
guarded.turnReady = true;
await BattleFlowMethods.prototype.useJutsu.call(guarded, BASE_ACTIONS[1]);
assert.equal(guarded.player.chakra, 45);
const blockedStatus = battle(); blockedStatus.player.guarding = true; blockedStatus.rolls = [false, true];
blockedStatus.player.statuses = [{ type: "burn", label: "QUEMADURA", power: 2, duration: 2 }];
await blockedStatus.executeTimelineAction("enemy", ENEMY_ACTIONS.toxin);
assert.equal(blockedStatus.player.guarding, false);
assert.deepEqual(blockedStatus.player.statuses, [{ type: "burn", label: "QUEMADURA", power: 2, duration: 2 }], "El impacto protegido no añade veneno y no limpia la quemadura anterior");
assert.equal(guarded.round, 2);
await guarded.executeTimelineAction("enemy", ENEMY_ACTIONS.quick); // falla
assert.equal(guarded.enemy.recoveryInitiative, 1);
assert.equal(guarded.player.guarding, true);
assert.equal(guarded.player.hp, 97);
guarded.enemy.statuses = [{ type: "stun", power: 0, duration: 1 }, { type: "burn", label: "QUEMADURA", power: 2, duration: 2 }];
guarded.enemy.soak = { stacks: 2, turns: 2, boss: false };
await guarded.executeTimelineAction("enemy", ENEMY_ACTIONS.heavy);
assert.equal(guarded.player.guarding, true);
assert.equal(guarded.enemy.hp, 98);
assert.equal(guarded.enemy.soak.turns, 1, "Un aturdimiento cierra Empapado exactamente una vez");
assert.equal(guarded.enemy.recoveryInitiative, 0, "No se ejecutó el golpe fuerte");
assert.equal(guarded.enemy.statuses.length, 1);
guarded.rolls = [false, true];
await guarded.executeTimelineAction("enemy", ENEMY_ACTIONS.heavy);
assert.equal(guarded.player.hp, 89, "Golpe de 15 reducido a 8 por Guardia");
assert.equal(guarded.player.guarding, false);
assert.equal(guarded.player.chakra, 45);
guarded.rolls = [false, true];
await guarded.executeTimelineAction("enemy", ENEMY_ACTIONS.quick);
assert.equal(guarded.player.hp, 80, "El segundo impacto ya no está protegido");

// CD1 bloquea la siguiente elección; otra acción completa lo libera.
const cast = battle(); cast.player.chakra = 60;
const jutsu = JUTSU_LIBRARY.find(j => j.id === "fire_embers");
await BattleFlowMethods.prototype.useJutsu.call(cast, jutsu);
assert.equal(cast.player.chakra, 30);
await cast.executeTimelineAction("player", jutsu);
assert.equal(cast.cooldowns[jutsu.id], 1);
assert.equal(cast.player.chakra, 35);
cast.turnReady = true;
await BattleFlowMethods.prototype.useJutsu.call(cast, jutsu);
assert.equal(cast.player.chakra, 35);
await cast.executeTimelineAction("player", BASE_ACTIONS[0]);
assert.equal(cast.cooldowns[jutsu.id], 0);
assert.equal(cast.round, 3);

// Todos los cierres se aplican incluso al vencer; solo el rival final evita el veneno propio.
for (const count of [1, 2]) {
  const final = battle(count); final.player.hp = 3;
  final.player.statuses = [{ type: "poison", label: "VENENO", power: 3, duration: 1 }];
  final.playerAttack = async () => { final.enemy.hp = 0; };
  await final.executeTimelineAction("player", BASE_ACTIONS[0]);
  assert.equal(final.player.chakra, 25);
  assert.equal(final.cooldowns.other, 2);
  assert.equal(final.round, 2);
  assert.equal(final.player.recoveryInitiative, 1);
  assert.equal(final.pendingActions.player, null);
  assert.equal(final.timelineProgress.player, 0);
  assert.equal(final.outcome, count === 1 ? "won" : "lost");
  assert.equal(final.ticks, count === 1 ? 0 : 1);
  assert.equal(final.resultCalls, count === 1 ? 1 : 0);
}
const next = battle(2); next.player.hp = 10;
next.player.statuses = [{ type: "poison", label: "VENENO", power: 3, duration: 1 }];
next.playerAttack = async () => { next.enemy.hp = 0; };
await next.executeTimelineAction("player", BASE_ACTIONS[0]);
assert.equal(next.player.hp, 7);
assert.deepEqual(next.eventsLog, ["status", "outcome"]);

// Invocaciones simultáneas no duplican daño, regeneración, estados o enfriamientos.
const repeated = battle(); let release; let attacks = 0;
repeated.playerAttack = async () => { attacks++; await new Promise(resolve => { release = resolve; }); };
const first = repeated.executeTimelineAction("player", BASE_ACTIONS[0]);
await repeated.executeTimelineAction("player", BASE_ACTIONS[0]);
release(); await first;
assert.equal(attacks, 1);
assert.equal(repeated.round, 2);
assert.equal(repeated.player.chakra, 25);
assert.equal(repeated.cooldowns.other, 2);
assert.equal(repeated.ticks, 1);

console.log("Acciones: iniciativa temporal, preparación independiente, Guardia por impacto, CD1 y cierres únicos/terminales verificados.");
