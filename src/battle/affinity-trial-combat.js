import { derivedStats } from "../save.js?v=0.140.0";

export function affinityTrialProfile(profile, mission, save) {
  if (!mission.affinitySlot) return profile;
  const stats = derivedStats(save);
  return { ...profile, name: mission.affinitySlot === 2 ? "CUSTODIO DE LA CONFLUENCIA" : `CUSTODIO · ${profile.name}`,
    level: save.progression.level, boss: false, phase2Pattern: undefined,
    stats: { ...profile.stats, health: Math.round(stats.maxHp * .9), strength: Math.round(stats.baseStrength * .7),
      speed: Math.max(1, Math.round(stats.baseSpeed * .9)), luck: Math.min(stats.luck, 12) }, accuracy: 90 };
}
