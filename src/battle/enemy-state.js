import { AFFINITY_CONFIG, applyAffinityStatModifiers } from "../affinity-system.js?v=0.58.0";
import { activeCombatModifiers } from "../combat-modifiers.js?v=0.67.0";

function targetsProfile(modifier, profile) {
  return !modifier.target || modifier.target === "all" || (modifier.target === "boss" && profile.boss);
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

