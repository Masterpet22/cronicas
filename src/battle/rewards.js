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

