export const TECHNIQUE_MASTERY = Object.freeze({ maxLevel: 3, damagePerLevel: 2, costDiscountPercentPerLevel: 5 });

export function techniqueAtLevel(action, requestedLevel) {
  const level = Math.min(TECHNIQUE_MASTERY.maxLevel, Math.max(1, Math.floor(Number(requestedLevel) || 1)));
  const gained = level - 1;
  // Conserva el original para que proyectar dos veces no duplique las mejoras.
  const baseDamage = action.baseDamage ?? action.damage;
  const baseChakraCost = action.baseChakraCost ?? action.cost;
  const baseSeals = action.baseSeals ?? action.seals ?? [];
  const cost = Math.ceil(baseChakraCost * (100 - gained * TECHNIQUE_MASTERY.costDiscountPercentPerLevel) / 100);
  return {
    ...action, techniqueLevel: level, baseDamage, baseChakraCost, baseSeals: [...baseSeals],
    damage: baseDamage + gained * TECHNIQUE_MASTERY.damagePerLevel,
    cost,
    seals: level === TECHNIQUE_MASTERY.maxLevel ? baseSeals.slice(0, -1) : [...baseSeals],
    ...(action.subtitle ? { subtitle: action.subtitle.replace(/^\d+CH/, `${cost}CH`) } : {})
  };
}
