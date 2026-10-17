export function hasStatus(target, type) {
  return target.statuses.some((status) => status.type === type);
}

export function hitChance(attacker, defender, action) {
  const sealPenalty = hasStatus(attacker, "seal") ? 15 : 0;
  return Math.max(50, Math.min(100, attacker.accuracy + action.accuracyMod - defender.evasion - sealPenalty));
}

export function affinityLabel(multiplier) {
  if (multiplier > 1) return "VENTAJA ELEMENTAL";
  if (multiplier < 1) return "RESISTIDO";
  return "";
}

export function applyStatus(target, incoming) {
  const current = target.statuses.find((status) => status.type === incoming.type);
  if (current) {
    current.duration = Math.max(current.duration, incoming.duration);
    current.power = Math.max(current.power, incoming.power);
  } else {
    target.statuses.push({ ...incoming });
  }
}

export function formatStatuses(target) {
  const labels = target.statuses.map((status) => `${status.label} ${status.duration}`);
  if (target.guarding) labels.unshift("GUARDIA");
  return labels.join("  ·  ");
}

