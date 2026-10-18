import { AFFINITY_CONFIG, applyAffinityStatModifiers } from "./affinity-system.js?v=0.58.0";
import { missionHasStep, missionStep, requirementMet } from "./mission-system.js?v=0.67.0";

export function missionCombatModifiers(mission, type = null) {
  return (mission?.flow || [])
    .flatMap((step) => step.modifiers || [])
    .filter((modifier) => type === null || modifier.type === type);
}

export function activeCombatModifiers(mission, campaign = {}, type = null) {
  const save = { campaign };
  return missionCombatModifiers(mission, type).filter((modifier) => {
    const matches = !modifier.when || requirementMet(modifier.when, save);
    const excluded = modifier.unless && requirementMet(modifier.unless, save);
    return matches && !excluded;
  });
}

function targetsProfile(modifier, profile) {
  return !modifier.target || modifier.target === "all" || (modifier.target === "boss" && profile.boss);
}

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
  const relicDecision = Boolean(missionStep(mission, "choice")?.relicDecision);
  const secretEntry = missionHasStep(mission, "choice", "hideout-entry") && campaign.hideoutEntryChoice === "secret";
  const opening = activeCombatModifiers(mission, campaign, "enemy-opening")[0];
  const defense = activeCombatModifiers(mission, campaign, "enemy-defense")[0];
  const combatStep = missionStep(mission, "combat");
  return {
    tutorial,
    secretEntry,
    lieutenantIntervention: opening?.openingEvent === "lieutenant-intervention",
    defenseAura: defense?.presentation === "defense-aura",
    relicDecision,
    postCombatChoice: Boolean(missionStep(mission, "choice", "hideout-discovery")?.afterCombat),
    phaseMessage: combatStep?.phaseMessageKey || "generic",
    announcedActionIds: combatStep?.announcedActionIds || []
  };
}

export function bossPhaseMessage(mission) {
  return missionStep(mission, "combat")?.phaseMessage || "El Maestro rompe su sello: comienza la Fase II.";
}

export function interludePlan(mission) {
  return (mission?.flow || [])
    .filter((step) => ["investigation", "choice", "resource"].includes(step.type) && step.afterEncounter !== undefined)
    .map(({ type, afterEncounter }) => ({ type, afterEncounter }));
}

export function createEnemyState(profile, mission, campaign = {}) {
  const statModifiers = activeCombatModifiers(mission, campaign, "enemy-stats").filter((modifier) => targetsProfile(modifier, profile));
  const statBonus = statModifiers.reduce((total, modifier) => {
    Object.entries(modifier.stats || {}).forEach(([stat, value]) => { total[stat] = (total[stat] || 0) + value; });
    return total;
  }, {});
  const baseStats = {
    ...profile.stats,
    ...Object.fromEntries(Object.entries(profile.stats).map(([stat, value]) => [stat, value + (statBonus[stat] || 0)]))
  };
  const { stats, modifiers } = applyAffinityStatModifiers(baseStats, [profile.affinity]);
  const derived = AFFINITY_CONFIG.derived;
  const openingModifier = activeCombatModifiers(mission, campaign, "enemy-opening").find((modifier) => targetsProfile(modifier, profile));
  const defenseModifiers = activeCombatModifiers(mission, campaign, "enemy-defense").filter((modifier) => targetsProfile(modifier, profile));
  const maxHp = stats.health;
  return {
    hp: openingModifier?.hpMultiplier ? Math.max(1, Math.round(maxHp * openingModifier.hpMultiplier)) : maxHp,
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
    accuracy: profile.accuracy + statModifiers.reduce((total, modifier) => total + (Number(modifier.accuracy) || 0), 0),
    baseEvasion: derived.baseEvasion + stats.luck,
    evasion: derived.baseEvasion + stats.luck,
    primaryAffinity: profile.affinity,
    boss: Boolean(profile.boss),
    damageReduction: defenseModifiers.reduce((total, modifier) => total + (Number(modifier.damageReduction) || 0), 0),
    soak: null,
    statuses: [],
    phase: 1,
    patternIndex: 0
  };
}
