// Pesos para repartir el presupuesto de PX de la misión y monedas por enemigo.
export const ENCOUNTER_REWARDS = Object.freeze({
  tutorial_bandit: Object.freeze({ xpWeight: 1, coins: 12 }),
  tutorial_bandit_second: Object.freeze({ xpWeight: 1, coins: 16 }),
  boss_varek: Object.freeze({ xpWeight: 3, coins: 32 }),
  bandit_pathfinder: Object.freeze({ xpWeight: 1, coins: 18 }),
  bandit_lieutenant: Object.freeze({ xpWeight: 2, coins: 26 }),
  boss_akumori: Object.freeze({ xpWeight: 3, coins: 48 }),
  boss_raizen: Object.freeze({ xpWeight: 3, coins: 75 }),
  gate_guard: Object.freeze({ xpWeight: 1, coins: 18 }),
  ash_adept: Object.freeze({ xpWeight: 1, coins: 22 }),
  reed_bandit: Object.freeze({ xpWeight: 1, coins: 18 }),
  stone_hunter: Object.freeze({ xpWeight: 1, coins: 24 }),
  venom_medic: Object.freeze({ xpWeight: 1, coins: 22 })
});

export const MAX_CHARACTER_LEVEL = 60;

export function characterLevel(level) {
  return Math.min(MAX_CHARACTER_LEVEL, Math.max(1, Math.floor(Number(level) || 1)));
}

export function addExperience(progression, amount) {
  progression.level = characterLevel(progression.level);
  if (progression.level === MAX_CHARACTER_LEVEL) {
    progression.xp = 0;
    return { xp: 0, levelsGained: 0 };
  }
  const remaining = Math.max(0, Math.floor(Number(amount) || 0));
  const capacity = Array.from({ length: MAX_CHARACTER_LEVEL - progression.level },
    (_, index) => experienceForNextLevel(progression.level + index)).reduce((a, b) => a + b, 0) - progression.xp;
  const xp = Math.min(remaining, Math.max(0, capacity));
  progression.xp += xp;
  let levelsGained = 0;
  while (progression.level < MAX_CHARACTER_LEVEL && progression.xp >= experienceForNextLevel(progression.level)) {
    progression.xp -= experienceForNextLevel(progression.level);
    progression.level++;
    progression.attributePoints += 2;
    levelsGained++;
  }
  if (progression.level === MAX_CHARACTER_LEVEL) progression.xp = 0;
  return { xp, levelsGained };
}

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
  const gained = characterLevel(level) - 1;
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
  return Math.max(2, characterLevel(level) + 1);
}

export function encounterRecovery(maxHp, maxChakra) {
  return {
    hp: Math.max(12, Math.round(Math.max(1, Number(maxHp) || 1) * 0.22)),
    chakra: Math.max(12, Math.round(Math.max(1, Number(maxChakra) || 1) * 0.18)),
    clearStatuses: true
  };
}
