// Reglas de progresión de la primera saga. Cada enemigo paga por su dificultad,
// no por el lugar que ocupa en la lista de encuentros de una misión.
export const ENCOUNTER_REWARDS = Object.freeze({
  tutorial_bandit: Object.freeze({ xp: 18, coins: 12 }),
  tutorial_bandit_second: Object.freeze({ xp: 22, coins: 16 }),
  boss_varek: Object.freeze({ xp: 35, coins: 32 }),
  bandit_pathfinder: Object.freeze({ xp: 30, coins: 18 }),
  bandit_lieutenant: Object.freeze({ xp: 32, coins: 26 }),
  boss_akumori: Object.freeze({ xp: 50, coins: 48 }),
  boss_raizen: Object.freeze({ xp: 85, coins: 75 }),
  gate_guard: Object.freeze({ xp: 28, coins: 18 }),
  ash_adept: Object.freeze({ xp: 34, coins: 22 }),
  reed_bandit: Object.freeze({ xp: 28, coins: 18 }),
  stone_hunter: Object.freeze({ xp: 34, coins: 24 }),
  venom_medic: Object.freeze({ xp: 34, coins: 22 })
});

export function experienceForNextLevel(level) {
  return 80 + Math.max(1, Math.floor(Number(level) || 1)) * 40;
}

export const AFFINITY_LEVEL_FOCUS = Object.freeze({
  fuego: Object.freeze({ stat: "strength", label: "FUERZA", description: "La llama fortalece tus ataques." }),
  agua: Object.freeze({ stat: "speed", label: "VELOCIDAD", description: "El agua afina tus reflejos." }),
  tierra: Object.freeze({ stat: "health", label: "VIDA", description: "La tierra refuerza tu resistencia." }),
  viento: Object.freeze({ stat: "chakra", label: "CHAKRA", description: "El viento amplía tu reserva de chakra." })
});

export function levelStatBonus(level, affinity = null) {
  const gained = Math.max(0, Math.floor(Number(level) || 1) - 1);
  const bonus = {
    health: gained * 6,
    strength: gained,
    speed: Math.floor(gained / 3),
    chakra: gained * 3,
    luck: Math.floor(gained / 4)
  };
  if (affinity === "fuego") bonus.strength += Math.ceil(gained / 2);
  if (affinity === "agua") bonus.speed += Math.ceil(gained / 2);
  if (affinity === "tierra") bonus.health += gained * 3;
  if (affinity === "viento") bonus.chakra += gained * 3;
  return bonus;
}

export function attributeTrainingLimit(level) {
  return Math.max(2, Math.floor(Number(level) || 1) + 1);
}

export function encounterRecovery(maxHp, maxChakra) {
  return {
    hp: Math.max(12, Math.round(Math.max(1, Number(maxHp) || 1) * 0.22)),
    chakra: Math.max(12, Math.round(Math.max(1, Number(maxChakra) || 1) * 0.18)),
    clearStatuses: true
  };
}
