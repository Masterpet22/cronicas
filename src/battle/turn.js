import { addSoak, cappedEvasion, effectiveSpeed, hurricaneEyeEvasionBonus, tickSoak } from "../affinity-system.js?v=0.58.0";

export function combatantSpeed(combatant) {
  return effectiveSpeed(combatant.baseSpeed, combatant.speedModifier, combatant.soak);
}

export function combatantEvasion(combatant) {
  const windBonus = combatant.primaryAffinity === "viento"
    ? hurricaneEyeEvasionBonus(combatant.chakra, combatant.maxChakra)
    : 0;
  return cappedEvasion(combatant.baseEvasion, windBonus);
}

export function waterSoakAfterAttack(attacker, defender) {
  if (attacker.primaryAffinity !== "agua" || defender.hp <= 0) return defender.soak;
  return addSoak(defender.soak, defender.boss);
}

export function soakAfterTurn(combatant) {
  return tickSoak(combatant.soak);
}

export function nextEnemyAction(profile, enemyState) {
  const pattern = profile.boss && enemyState.phase === 2 ? profile.phase2Pattern : profile.pattern;
  return {
    actionId: pattern[enemyState.patternIndex % pattern.length],
    patternIndex: enemyState.patternIndex + 1
  };
}

export function resolveStatusTick(statuses) {
  return {
    damage: statuses.filter((status) => status.power > 0).map((status) => ({ label: status.label, power: status.power })),
    statuses: statuses
      .map((status) => status.type === "stun" ? { ...status } : { ...status, duration: status.duration - 1 })
      .filter((status) => status.duration > 0)
  };
}

export function advanceCooldowns(cooldowns) {
  return Object.fromEntries(Object.entries(cooldowns).map(([id, turns]) => [id, Math.max(0, turns - 1)]));
}

