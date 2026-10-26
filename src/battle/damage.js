import { finalAffinityDamage } from "../affinity-system.js?v=0.93.0";

export function attackBaseDamage(techniqueDamage, strength) {
  const technique = Math.max(0, Number(techniqueDamage) || 0);
  const contribution = Math.round(Math.max(0, Number(strength) || 0) * 0.75);
  return technique + contribution;
}

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

export function splitDamageAcrossHits(totalDamage, hitCount) {
  const total = Number.isFinite(Number(totalDamage)) ? Math.max(0, Math.round(Number(totalDamage))) : 0;
  const count = Number.isFinite(Number(hitCount)) ? Math.max(1, Math.floor(Number(hitCount))) : 1;
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

