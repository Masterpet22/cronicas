import { AFFINITY_CONFIG, AFFINITY_IDS, affinityCycleModifier, applyAffinityStatModifiers } from "../affinity-system.js?v=0.114.0";
import { activeCombatModifiers } from "../combat-modifiers.js?v=0.114.0";
import { missionStep } from "../mission-system.js?v=0.114.0";
import { ABILITY_CATALOG, canonicalAbilityId } from "../data.js?v=1.5.0";
import { ELEMENTS, canAccessElement } from "../elements.js?v=0.20.0";
import { BASIC_AFFINITY_TECHNIQUES, enemyAffinityOrder } from "./enemy-affinities.js?v=1.0.0";

export function resolveEnemyProfileForBattle(profile, mission, playerAffinity) {
  if (!profile.boss || !missionStep(mission, "combat")?.tutorial) return profile;
  const affinity = AFFINITY_IDS.find(id => affinityCycleModifier(playerAffinity, id) > 0);
  if (!affinity) return profile;
  const adapt = pattern => pattern?.map(id => {
    const action = ABILITY_CATALOG[canonicalAbilityId(id)];
    return ELEMENTS[action?.element] && !canAccessElement(action.element, [affinity], 1)
      ? BASIC_AFFINITY_TECHNIQUES[affinity] : canonicalAbilityId(id);
  });
  return { ...profile, affinity, affinities: [affinity], pattern: adapt(profile.pattern), phase2Pattern: adapt(profile.phase2Pattern) };
}

function targetsProfile(modifier, profile) {
  return !modifier.target || modifier.target === "all" || (modifier.target === "boss" && profile.boss);
}

export function createEnemyState(profile, mission, campaign = {}, playerAffinity = null) {
  profile = resolveEnemyProfileForBattle(profile, mission, playerAffinity);
  const affinities = enemyAffinityOrder(profile);
  const statModifiers = activeCombatModifiers(mission, campaign, "enemy-stats").filter((modifier) => targetsProfile(modifier, profile));
  const statBonus = statModifiers.reduce((total, modifier) => {
    Object.entries(modifier.stats || {}).forEach(([stat, value]) => { total[stat] = (total[stat] || 0) + value; });
    return total;
  }, {});
  const baseStats = {
    ...profile.stats,
    ...Object.fromEntries(Object.entries(profile.stats).map(([stat, value]) => [stat, value + (statBonus[stat] || 0)]))
  };
  const { stats, modifiers } = applyAffinityStatModifiers(baseStats, affinities);
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
    primaryAffinity: affinities[0],
    affinities,
    boss: Boolean(profile.boss),
    damageReduction: defenseModifiers.reduce((total, modifier) => total + (Number(modifier.damageReduction) || 0), 0),
    soak: null,
    recoveryInitiative: 0,
    statuses: [],
    phase: 1,
    patternIndex: 0,
    cooldowns: {}, reservedAction: null
  };
}

