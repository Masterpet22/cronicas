import assert from "node:assert/strict";
import { AFFINITY_CONFIG } from "../src/affinity-system.js";
import { ENEMY_ROSTER } from "../src/data.js";
import { MISSIONS } from "../src/content/index.js";
import { resolveDamage } from "../src/battle/damage.js";
import { createEnemyState } from "../src/battle/enemy-state.js";
import { addBattleReward, bestiaryObservation, createBattleResult, emptyBattleRewards } from "../src/battle/rewards.js";
import { advanceCooldowns, combatantEvasion, combatantSpeed, nextEnemyAction, resolveStatusTick, soakAfterTurn, waterSoakAfterAttack } from "../src/battle/turn.js";

assert.deepEqual(resolveDamage({
  baseDamage: 20,
  strengthModifier: 0.1,
  cycleModifier: 0.25,
  furyBonus: 0.1,
  critical: true,
  criticalMultiplier: AFFINITY_CONFIG.damage.criticalMultiplier,
  damageReduction: 3,
  guarding: true
}), { affinityDamage: 30, criticalDamage: 45, damage: 21 });

const enemy = createEnemyState(ENEMY_ROSTER[MISSIONS[0].encounters[0]], MISSIONS[0], {});
assert.ok(enemy.maxHp > 0);
assert.equal(enemy.hp, enemy.maxHp);
assert.equal(enemy.patternIndex, 0);

const waterUser = { primaryAffinity: "agua" };
const target = { hp: 20, boss: false, soak: null };
const soaked = waterSoakAfterAttack(waterUser, target);
assert.equal(soaked.stacks, 1);
assert.equal(soakAfterTurn(soaked), null);
assert.equal(combatantSpeed({ baseSpeed: 10, speedModifier: 0, soak: null }), 10);
assert.ok(combatantEvasion({ primaryAffinity: "viento", chakra: 10, maxChakra: 10, baseEvasion: 4 }) > 4);

const next = nextEnemyAction({ boss: false, pattern: ["a", "b"] }, { phase: 1, patternIndex: 1 });
assert.deepEqual(next, { actionId: "b", patternIndex: 2 });
assert.deepEqual(resolveStatusTick([
  { type: "burn", label: "Quemadura", power: 3, duration: 2 },
  { type: "stun", label: "Aturdido", power: 0, duration: 1 }
]), {
  damage: [{ label: "Quemadura", power: 3 }],
  statuses: [{ type: "burn", label: "Quemadura", power: 3, duration: 1 }, { type: "stun", label: "Aturdido", power: 0, duration: 1 }]
});
assert.deepEqual(advanceCooldowns({ strike: 0, fire: 2 }), { strike: 0, fire: 1 });

const total = addBattleReward(addBattleReward(emptyBattleRewards(), { xp: 10, coins: 2 }), { affinityXp: 4, xp: 5 });
assert.deepEqual(total, { xp: 15, affinityXp: 4, coins: 2 });
assert.deepEqual(bestiaryObservation(["bandit"], 0, { defeated: true }), { enemyId: "bandit", observation: { defeated: true } });
const result = createBattleResult({
  outcome: "completed",
  mission: { id: "test", type: "main", title: "Prueba", relic: null },
  player: { hp: -2, maxHp: 50 },
  defeatedEncounters: 1,
  encounterCount: 1,
  battleRewards: total,
  combatFeatures: { relicDecision: false },
  campaign: {}
});
assert.equal(result.playerHp, 0);
assert.deepEqual(result.rewards, total);

console.log("Pruebas de lógica pura de combate superadas.");

