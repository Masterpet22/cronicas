import { finalAffinityDamage } from "../affinity-system.js?v=0.58.0";

export function resolveDamage({
  baseDamage,
  strengthModifier = 0,
  cycleModifier = 0,
  furyBonus = 0,
  critical = false,
  criticalMultiplier,
  damageReduction = 0,
  guarding = false
}) {
  const affinityDamage = finalAffinityDamage({ baseDamage, strengthModifier, cycleModifier, furyBonus });
  const criticalDamage = critical ? Math.round(affinityDamage * criticalMultiplier) : affinityDamage;
  const reducedDamage = Math.max(1, criticalDamage - damageReduction);
  return {
    affinityDamage,
    criticalDamage,
    damage: guarding ? Math.ceil(reducedDamage * 0.5) : reducedDamage
  };
}

