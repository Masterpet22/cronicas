export function emptyBattleRewards() {
  return { xp: 0, affinityXp: 0, coins: 0 };
}

export function addBattleReward(total, reward) {
  return {
    xp: total.xp + (reward.xp || 0),
    affinityXp: total.affinityXp + (reward.affinityXp || 0),
    coins: total.coins + (reward.coins || 0)
  };
}

export function missionGrade(outcome, playerHp, maxHp) {
  if (outcome !== "completed") return "F";
  const hpRatio = Math.max(0, Number(playerHp) || 0) / Math.max(1, Number(maxHp) || 1);
  if (hpRatio >= 0.9) return "S";
  if (hpRatio >= 0.7) return "A";
  if (hpRatio >= 0.5) return "B";
  if (hpRatio >= 0.25) return "C";
  return "D";
}

export function createBattleResult({ outcome, mission, player, defeatedEncounters, encounterCount, battleRewards, combatFeatures, campaign }) {
  return {
    outcome,
    missionTitle: mission.title,
    playerHp: Math.max(0, player.hp),
    maxHp: player.maxHp,
    defeated: defeatedEncounters,
    totalEncounters: encounterCount,
    missionId: mission.parentMissionId || mission.id,
    missionType: mission.parentType || mission.type,
    rewards: outcome === "completed" ? { ...battleRewards } : { xp: 0, affinityXp: 0, coins: 0 },
    item: outcome === "completed" && combatFeatures.relicDecision ? mission.relic : null,
    decision: outcome === "completed" && combatFeatures.relicDecision ? campaign.banditPrisonerChoice : null
  };
}

export function bestiaryObservation(encounterIds, enemyIndex, observation) {
  return { enemyId: encounterIds[enemyIndex], observation: { ...observation } };
}

