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

export function secondaryMissionGrade({ outcome, playerHp, maxHp, clues, routeStats } = {}) {
  if (outcome !== "completed") return "F";
  if (Number(maxHp) > 0) return missionGrade(outcome, playerHp, maxHp);
  if (routeStats) {
    const danger = Math.max(0, Number(routeStats.danger) || 0);
    const time = Math.max(0, Number(routeStats.time) || 0);
    const foundClues = Math.max(0, Number(routeStats.clues) || 0);
    const resources = Math.max(0, Number(routeStats.resources) || 0);
    const score = 70 + foundClues * 5 + resources * 3 - danger * 4 - time * 2;
    if (score >= 90) return "S";
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    return "D";
  }
  if ((Number(clues) || 0) >= 3) return "S";
  if ((Number(clues) || 0) >= 2) return "B";
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

