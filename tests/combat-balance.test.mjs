import assert from "node:assert/strict";
import { AFFINITY_IDS, affinityCycleModifier, applyAffinityStatModifiers } from "../src/affinity-system.js";
import { BASE_ACTIONS, ENEMY_ROSTER, JUTSU_LIBRARY } from "../src/data.js";
import { MISSIONS } from "../src/content/index.js";
import { CHAKRA_BALANCE, actionChakraCost, actionChakraRecovery } from "../src/chakra-balance.js";
import { createEnemyState, resolveEnemyProfileForBattle } from "../src/battle/enemy-state.js";
import { createCharacter, createDefaultSave, derivedStats } from "../src/save.js";
import { createArchiveView } from "../src/ui/meta/views/archive.js";
import { elementName } from "../src/elements.js";

const tutorial = MISSIONS.find(m => m.id === "m01");
const boss = ENEMY_ROSTER.boss_varek;
const baseline = structuredClone(ENEMY_ROSTER);
for (const [affinity, weak] of Object.entries({ fuego: "viento", agua: "fuego", tierra: "agua", viento: "tierra" })) {
  const profile = resolveEnemyProfileForBattle(boss, tutorial, affinity);
  const enemy = createEnemyState(boss, tutorial, {}, affinity);
  assert.equal(profile.affinity, weak);
  assert.equal(enemy.primaryAffinity, weak);
  assert.equal(affinityCycleModifier(affinity, enemy.primaryAffinity), .2);
  assert.equal(affinityCycleModifier(enemy.primaryAffinity, affinity), -.2);
  assert.equal(enemy.maxHp, applyAffinityStatModifiers(boss.stats, [weak]).stats.health);
  assert.deepEqual(createEnemyState(boss, { ...tutorial, tutorialReplay: true }, {}, affinity), enemy);
  assert.equal(resolveEnemyProfileForBattle(ENEMY_ROSTER.tutorial_bandit, tutorial, affinity), ENEMY_ROSTER.tutorial_bandit);
  for (const mission of MISSIONS.filter(m => m.encounters && m.id !== "m01")) {
    for (const id of mission.encounters) {
      assert.equal(resolveEnemyProfileForBattle(ENEMY_ROSTER[id], mission, affinity), ENEMY_ROSTER[id]);
    }
  }
  const save = createCharacter(createDefaultSave(), { affinity });
  assert.equal(derivedStats(save).maxChakra, { fuego: 80, agua: 80, tierra: 70, viento: 96 }[affinity]);
  save.campaign.archiveUnlocked = true;
  save.bestiary.entries.boss_varek = { encounters: 2, defeated: 1, documents: 0, techniques: [], vulnerabilities: [affinity] };
  const view = createArchiveView({ missions: MISSIONS, enemyRoster: ENEMY_ROSTER, enemyActions: {}, elementName, escapeHtml: String, missionState: () => ({ unlocked: false }) });
  assert.match(view.render({ save }), new RegExp(`Afinidad ${elementName(weak)}`));
}
assert.deepEqual(ENEMY_ROSTER, baseline, "Adaptar el tutorial no modifica el catálogo ni otras partidas");
assert.equal(resolveEnemyProfileForBattle(boss, { flow: [] }, "fuego"), boss);

for (const technique of JUTSU_LIBRARY) {
  for (const reduction of [0, 1, 2, 5, 10, 1000]) {
    const cost = actionChakraCost(technique, reduction);
    assert.ok(cost >= Math.ceil(technique.cost / 2));
    assert.ok(cost > actionChakraRecovery(technique), `${technique.id} no debe generar chakra al atacar`);
  }
  assert.ok(technique.subtitle.startsWith(`${technique.cost}CH`));
}
assert.equal(actionChakraCost(BASE_ACTIONS[0], 1000), 0);
assert.equal(actionChakraCost(BASE_ACTIONS[1], 1000), 0);
assert.equal(actionChakraRecovery(BASE_ACTIONS[0]), 5);
assert.equal(actionChakraRecovery(BASE_ACTIONS[1]), 25);
assert.equal(JUTSU_LIBRARY.find(t => t.id === "wind_step").cooldown, 1, "El nuevo coste no altera su recarga");

// Prueba el débito, rechazo y cierre reales con la presentación silenciada.
globalThis.window = { Phaser: { Scene: class {} } };
const { BattleFlowMethods } = await import("../src/battle/scenes/battle-flow.js");
const { BattleActionMethods } = await import("../src/battle/scenes/battle-actions.js");
const { BattleFeedbackMethods } = await import("../src/battle/scenes/battle-feedback.js");
const noop = () => {};
function scene(chakra = 40) {
  const s = { player: { hp: 100, maxHp: 100, chakra, maxChakra: 80, costReduction: 0, statuses: [] },
    enemy: { hp: 100 }, hero: { body: { x: 0, y: 0 } }, pendingActions: {}, timelineProgress: {}, cooldowns: {},
    round: 1, turnReady: true, scene: { isActive: () => true },
    clearPreparationFeedback: noop, stopTurnTimeline: noop, setButtonsEnabled: noop, finishCombatantTurn: noop,
    setTimelineMarkerState: noop, updateTimelineMarkers: noop, refreshHud: noop, startTurnCharge: noop,
    setMessage: noop, shake: noop, showPreparationFeedback: noop, delay: async () => {}, tone: noop,
    playSeals: async () => ({ multiplier: 1 }), playerAttack: async () => {}, resolveEnemyOutcome: async () => false,
    resolveCombatantStatusTick: async () => {}, advanceCooldowns: noop, executeEnemyAction: async () => {},
    tweens: { add: noop }, add: { circle: () => ({ setStrokeStyle() { return this; }, setDepth() { return this; } }) } };
  s.actionCost = action => BattleFeedbackMethods.prototype.actionCost.call(s, action);
  s.playerGuard = () => BattleActionMethods.prototype.playerGuard.call(s);
  s.executeTimelineAction = (actor, action) => BattleFlowMethods.prototype.executeTimelineAction.call(s, actor, action);
  return s;
}
const technique = JUTSU_LIBRARY.find(t => t.id === "fire_embers");
const casting = scene();
await BattleFlowMethods.prototype.useJutsu.call(casting, technique);
assert.equal(casting.player.chakra, 10, "El coste completo se paga al confirmar, antes de preparar");
await casting.executeTimelineAction("player", technique);
assert.equal(casting.player.chakra, 15, "Un ataque, incluido un fallo, solo recupera 5: gasto neto 25");
const empty = scene(29);
await BattleFlowMethods.prototype.useJutsu.call(empty, technique);
assert.equal(empty.player.chakra, 29);
assert.equal(empty.pendingActions.player, undefined, "Sin chakra no se inicia la técnica");
const guard = scene(20);
await guard.executeTimelineAction("player", BASE_ACTIONS[1]);
assert.equal(guard.player.chakra, 45, "Guardia da exactamente 25 totales, sin otros 5 ocultos");
assert.equal(guard.player.guarding, true);
const capped = scene(78);
await capped.executeTimelineAction("player", BASE_ACTIONS[1]);
assert.equal(capped.player.chakra, 80);
const finisher = scene(20);
finisher.resolveEnemyOutcome = async () => true;
await finisher.executeTimelineAction("player", BASE_ACTIONS[0]);
assert.equal(finisher.player.chakra, 25, "El golpe final también recupera 5 una sola vez");
const enemyTurn = scene(20);
await enemyTurn.executeTimelineAction("enemy", {});
assert.equal(enemyTurn.player.chakra, 20, "La acción del enemigo no regenera al jugador");

console.log("Balance: jefe tutorial favorable en las cuatro afinidades, costes reales, límites y descanso de Guardia verificados.");
