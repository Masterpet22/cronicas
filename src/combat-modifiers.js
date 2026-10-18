import { AFFINITY_CONFIG, applyAffinityStatModifiers } from "./affinity-system.js?v=0.58.0";
import { missionHasStep, missionStep } from "./mission-system.js?v=0.66.0";

export function resolveEncounterIds(mission, campaign = {}) {
  return missionHasStep(mission, "choice", "hideout-entry") && campaign.hideoutEntryChoice === "secret"
    ? mission.encounters.slice(1)
    : [...mission.encounters];
}

export function fieldSuppliesForBattle(mission, campaign = {}) {
  return missionHasStep(mission, "resource", "hideout-supplies")
    ? Math.max(1, campaign.hideoutSupplies || 1)
    : 0;
}

export function combatFeatures(mission, campaign = {}) {
  const tutorial = Boolean(missionStep(mission, "combat", "forest-bandits")?.tutorial);
  const relicDecision = missionHasStep(mission, "choice", "lieutenant-fate");
  const secretEntry = missionHasStep(mission, "choice", "hideout-entry") && campaign.hideoutEntryChoice === "secret";
  const prisonerConsequence = missionHasStep(mission, "consequence", "prisoner-intelligence");
  return {
    tutorial,
    secretEntry,
    lieutenantIntervention: prisonerConsequence && campaign.banditPrisonerChoice === "interrogate",
    defenseAura: prisonerConsequence && campaign.banditPrisonerChoice !== "interrogate",
    relicDecision,
    postCombatChoice: Boolean(missionStep(mission, "choice", "hideout-discovery")?.afterCombat),
    phaseMessage: missionHasStep(mission, "combat", "raizen-duel") ? "raizen" : "generic",
    announcedActionIds: missionHasStep(mission, "combat", "raizen-duel") ? ["heavy", "toxin"] : []
  };
}

export function interludePlan(mission) {
  return [
    missionStep(mission, "investigation", "canyon-traces"),
    missionStep(mission, "choice", "lieutenant-fate"),
    missionStep(mission, "resource", "hideout-supplies")
  ].filter(Boolean).map(({ type, afterEncounter }) => ({ type, afterEncounter }));
}

export function createEnemyState(profile, mission, campaign = {}) {
  const punishedBoss = missionHasStep(mission, "choice", "lieutenant-fate")
    && profile.boss
    && campaign.banditPrisonerChoice === "interrogate";
  const baseStats = {
    ...profile.stats,
    health: profile.stats.health + (punishedBoss ? 22 : 0),
    strength: profile.stats.strength + (punishedBoss ? 2 : 0),
    speed: profile.stats.speed + (punishedBoss ? 2 : 0),
    luck: profile.stats.luck + (punishedBoss ? 1 : 0)
  };
  const { stats, modifiers } = applyAffinityStatModifiers(baseStats, [profile.affinity]);
  const derived = AFFINITY_CONFIG.derived;
  const weakenedBoss = missionHasStep(mission, "consequence", "prisoner-intelligence")
    && campaign.banditPrisonerChoice === "interrogate";
  const maxHp = stats.health;
  return {
    hp: weakenedBoss ? Math.max(1, Math.round(maxHp * 0.85)) : maxHp,
    maxHp,
    chakra: stats.chakra,
    maxChakra: stats.chakra,
    strength: stats.strength,
    baseStrength: baseStats.strength,
    strengthModifier: modifiers.strength,
    speed: stats.speed,
    baseSpeed: baseStats.speed,
    speedModifier: modifiers.speed,
    luck: stats.luck,
    criticalChance: Math.min(derived.criticalChanceCap, derived.baseCriticalChance + Math.floor(stats.luck * derived.luckCriticalScale)),
    accuracy: profile.accuracy + (punishedBoss ? 4 : 0),
    baseEvasion: derived.baseEvasion + stats.luck,
    evasion: derived.baseEvasion + stats.luck,
    primaryAffinity: profile.affinity,
    boss: Boolean(profile.boss),
    damageReduction: missionHasStep(mission, "consequence", "prisoner-intelligence") && !weakenedBoss ? 3 : 0,
    soak: null,
    statuses: [],
    phase: 1,
    patternIndex: 0
  };
}
