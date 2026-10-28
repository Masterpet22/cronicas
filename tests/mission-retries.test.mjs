import assert from "node:assert/strict";
import { availableRetries, consumeRetry, restoreDuel } from "../src/battle/mission-retries.js";
import { abandonMissionProgress, createDefaultSave, createCharacter, normalizeSave, startMissionProgress } from "../src/save.js";

let save = createCharacter(createDefaultSave(), { name: "Retry", affinity: "fuego" });
save = startMissionProgress(save, "m01");
const abandoned = normalizeSave(abandonMissionProgress(save, "m01"));
assert.equal(abandoned.campaign.missionProgress.m01.status, "abandoned");
assert.equal(startMissionProgress(abandoned, "m01").campaign.missionProgress.m01.status, "in-progress");
let free = 2;
assert.equal(availableRetries(free), 2);
for (let i = 0; i < 2; i++) {
  free = consumeRetry(free);
  assert.equal(availableRetries(free), 1 - i);
}
assert.equal(consumeRetry(free), null);
assert.equal(availableRetries(-9), 0);
const battle = {
  player: { hp: 0, maxHp: 140, chakra: 0, maxChakra: 90, statuses: [{ type: "burn" }], guarding: true, soak: { stacks: 3 } },
  enemy: { hp: 5, phase: 2 }, enemyIndex: 1, encounters: ["first", "second"],
  defeatedEncounters: 1, pendingEncounterRewards: [0], battleRewards: { xp: 50 },
  cooldowns: { flame: 3 }, pendingActions: { enemy: "attack" }, timelineProgress: { player: 50, enemy: 90 }, round: 9,
  createEnemyState(profile) { assert.equal(profile, "second"); return { hp: 80, maxHp: 100, phase: 1, patternIndex: 0, statuses: [] }; }
};
restoreDuel(battle);
assert.equal(battle.player.hp, 140);
assert.equal(battle.player.chakra, 90);
assert.deepEqual(battle.player.statuses, []);
assert.equal(battle.player.soak, null);
assert.equal(battle.enemy.hp, 100);
assert.equal(battle.enemy.phase, 1);
assert.equal(battle.enemyIndex, 1);
assert.deepEqual(battle.pendingEncounterRewards, [0]);
assert.deepEqual(battle.battleRewards, { xp: 50 });
assert.deepEqual(battle.cooldowns, { flame: 0 });
assert.deepEqual(battle.pendingActions, { player: null, enemy: null });
assert.deepEqual(battle.timelineProgress, { player: 0, enemy: 0 });
console.log("Reintentos, retirada y restauración del duelo verificados.");
