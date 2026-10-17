export const AFFINITY_IDS = Object.freeze(["fuego", "agua", "tierra", "viento"]);
export const COMBAT_STAT_IDS = Object.freeze(["health", "strength", "speed", "chakra", "luck"]);

export const AFFINITY_CONFIG = Object.freeze({
  maxAffinities: 3,
  // Todo personaje comienza desde una base legible y comparable. Afinidad,
  // entrenamiento, equipo y maestro se aplican después sobre estos valores.
  baseStats: Object.freeze({ health: 100, strength: 10, speed: 10, chakra: 100, luck: 10 }),
  attributeGains: Object.freeze({ health: 10, strength: 1, speed: 1, chakra: 5, luck: 1 }),
  derived: Object.freeze({ baseEvasion: 3, baseCriticalChance: 5, luckCriticalScale: 1.5, criticalChanceCap: 35 }),
  slots: Object.freeze([
    Object.freeze({ position: 1, weight: 1, bonus: 0.20, penalty: -0.12, level: 1, storyRank: 1 }),
    Object.freeze({ position: 2, weight: 0.5, bonus: 0.10, penalty: -0.06, level: 15, storyRank: 2 }),
    Object.freeze({ position: 3, weight: 0.25, bonus: 0.05, penalty: -0.03, level: 35, storyRank: 3 })
  ]),
  affinities: Object.freeze({
    fuego: Object.freeze({ boosts: "strength", penalizes: "speed", passive: "fury" }),
    agua: Object.freeze({ boosts: "speed", penalizes: "strength", passive: "soak" }),
    tierra: Object.freeze({ boosts: "health", penalizes: "chakra", passive: "reprisal" }),
    viento: Object.freeze({ boosts: "chakra", penalizes: "health", passive: "hurricaneEye" })
  }),
  cycle: Object.freeze({
    advantage: 0.20,
    disadvantage: -0.20,
    matrix: Object.freeze({
      fuego: Object.freeze({ fuego: 0, viento: 0.20, tierra: 0, agua: -0.20 }),
      viento: Object.freeze({ fuego: -0.20, viento: 0, tierra: 0.20, agua: 0 }),
      tierra: Object.freeze({ fuego: 0, viento: -0.20, tierra: 0, agua: 0.20 }),
      agua: Object.freeze({ fuego: 0.20, viento: 0, tierra: -0.20, agua: 0 })
    })
  }),
  passives: Object.freeze({
    fury: Object.freeze({ scale: 0.30, cap: 0.25, capHealthRatio: 0.17 }),
    soak: Object.freeze({ perStack: 0.03, maxStacks: 5, duration: 2, bossScale: 0.5, globalSpeedFloor: 0.70, minimumSpeed: 1 }),
    reprisal: Object.freeze({ chance: 0.20, damageRatio: 0.30, maxHealthRatio: 0.05, dynamicChanceEnabled: false, dynamicBaseChance: 0.10, dynamicLostHealthScale: 0.20, dynamicChanceCap: 0.30 }),
    hurricaneEye: Object.freeze({ evasionBonus: 8, globalEvasionCap: 75, requiresFullChakra: true })
  }),
  damage: Object.freeze({ criticalHandledSeparately: true, criticalMode: "separate-after-affinity", criticalMultiplier: 1.5, pendingReview: true })
});

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export function validateAffinityOrder(affinities) {
  return Array.isArray(affinities)
    && affinities.length >= 1
    && affinities.length <= AFFINITY_CONFIG.maxAffinities
    && affinities.every((id) => AFFINITY_IDS.includes(id))
    && new Set(affinities).size === affinities.length;
}

export function normalizeAffinityOrder(affinities) {
  if (!Array.isArray(affinities)) return [];
  return [...new Set(affinities.filter((id) => AFFINITY_IDS.includes(id)))].slice(0, AFFINITY_CONFIG.maxAffinities);
}

export function availableAffinitySlots(level, storyRank) {
  const safeLevel = Math.max(1, Math.floor(finite(level, 1)));
  const safeStoryRank = Math.max(1, Math.floor(finite(storyRank, 1)));
  return AFFINITY_CONFIG.slots.filter((slot) => safeLevel >= slot.level && safeStoryRank >= slot.storyRank).length;
}

export function affinityStatModifiers(affinities) {
  const result = Object.fromEntries(COMBAT_STAT_IDS.map((stat) => [stat, 0]));
  normalizeAffinityOrder(affinities).forEach((id, index) => {
    const affinity = AFFINITY_CONFIG.affinities[id];
    const slot = AFFINITY_CONFIG.slots[index];
    result[affinity.boosts] += slot.bonus;
    result[affinity.penalizes] += slot.penalty;
  });
  return result;
}

export function applyAffinityStatModifiers(baseStats, affinities) {
  const modifiers = affinityStatModifiers(affinities);
  const stats = {};
  COMBAT_STAT_IDS.forEach((stat) => {
    const base = Math.max(0, finite(baseStats?.[stat]));
    const change = base * modifiers[stat];
    const adjustedChange = modifiers[stat] > 0 && change > 0 && change < 1 ? 1 : change;
    stats[stat] = Math.max(0, Math.round(base + adjustedChange));
  });
  return { stats, modifiers };
}

export function affinityCycleModifier(attackerPrimary, defenderPrimary) {
  return AFFINITY_CONFIG.cycle.matrix[attackerPrimary]?.[defenderPrimary] || 0;
}

export function furyDamageBonus(currentHealth, maximumHealth) {
  const maximum = Math.max(1, finite(maximumHealth, 1));
  const currentRatio = clamp(finite(currentHealth) / maximum, 0, 1);
  if (currentRatio <= AFFINITY_CONFIG.passives.fury.capHealthRatio) return AFFINITY_CONFIG.passives.fury.cap;
  return Math.min(AFFINITY_CONFIG.passives.fury.cap, (1 - currentRatio) * AFFINITY_CONFIG.passives.fury.scale);
}

export function addSoak(current = {}, isBoss = false) {
  const config = AFFINITY_CONFIG.passives.soak;
  return {
    stacks: Math.min(config.maxStacks, Math.max(0, Math.floor(finite(current?.stacks))) + 1),
    turns: config.duration,
    boss: Boolean(isBoss)
  };
}

export function tickSoak(current) {
  if (!current?.stacks || current.turns <= 1) return null;
  return { ...current, turns: current.turns - 1 };
}

export function soakReduction(soak) {
  if (!soak?.stacks || soak.turns <= 0) return 0;
  const config = AFFINITY_CONFIG.passives.soak;
  const scale = soak.boss ? config.bossScale : 1;
  return Math.min(config.perStack * config.maxStacks * scale, soak.stacks * config.perStack * scale);
}

export function effectiveSpeed(baseSpeed, affinityModifier = 0, soak = null, otherReduction = 0) {
  const config = AFFINITY_CONFIG.passives.soak;
  const base = Math.max(config.minimumSpeed, finite(baseSpeed, config.minimumSpeed));
  const affinityAdjusted = base * (1 + finite(affinityModifier));
  const reduced = affinityAdjusted * (1 - soakReduction(soak)) * (1 - clamp(finite(otherReduction), 0, 1));
  return Math.max(config.minimumSpeed, base * config.globalSpeedFloor, reduced);
}

export function reprisalChance(currentHealth, maximumHealth) {
  const config = AFFINITY_CONFIG.passives.reprisal;
  if (!config.dynamicChanceEnabled) return config.chance;
  const maximum = Math.max(1, finite(maximumHealth, 1));
  const lostRatio = 1 - clamp(finite(currentHealth) / maximum, 0, 1);
  return Math.min(config.dynamicChanceCap, config.dynamicBaseChance + lostRatio * config.dynamicLostHealthScale);
}

export function reprisalDamage(receivedDamage, targetMaximumHealth) {
  const config = AFFINITY_CONFIG.passives.reprisal;
  return Math.max(0, Math.min(
    Math.round(Math.max(0, finite(receivedDamage)) * config.damageRatio),
    Math.round(Math.max(1, finite(targetMaximumHealth, 1)) * config.maxHealthRatio)
  ));
}

export function hurricaneEyeEvasionBonus(currentChakra, maximumChakra) {
  const config = AFFINITY_CONFIG.passives.hurricaneEye;
  if (!config.requiresFullChakra) return config.evasionBonus;
  return finite(maximumChakra) > 0 && finite(currentChakra) >= finite(maximumChakra) ? config.evasionBonus : 0;
}

export function cappedEvasion(baseEvasion, bonus = 0) {
  return Math.min(AFFINITY_CONFIG.passives.hurricaneEye.globalEvasionCap, Math.max(0, finite(baseEvasion) + finite(bonus)));
}

export function finalAffinityDamage({ baseDamage, strengthModifier = 0, cycleModifier = 0, furyBonus = 0 }) {
  return Math.max(0, Math.round(
    Math.max(0, finite(baseDamage))
      * (1 + finite(strengthModifier))
      * (1 + finite(cycleModifier))
      * (1 + finite(furyBonus))
  ));
}
