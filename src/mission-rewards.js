import { ENCOUNTER_REWARDS, MAX_CHARACTER_LEVEL, experienceForNextLevel } from "./progression-balance.js?v=0.94.0";

export const MISSION_XP_POLICY = Object.freeze({
  rates: Object.freeze({ short: .25, normal: .5, hard: .75, boss: 1, affinity: 0 }),
  encounterShare: .6, introductoryMaxLevel: 5, introductoryRate: 1
});

export function missionXpPlan(mission, { encounterIds = mission.encounters || [], xpBonus = 0 } = {}) {
  const level = mission.recommendedLevel;
  const rate = Object.hasOwn(MISSION_XP_POLICY.rates,mission.rewardProfile) ? MISSION_XP_POLICY.rates[mission.rewardProfile] : undefined;
  if (!Number.isInteger(level) || level < 1 || level > MAX_CHARACTER_LEVEL || rate === undefined) throw new Error("La misión necesita recommendedLevel (1–60) y rewardProfile válido.");
  if (!Number.isFinite(xpBonus) || xpBonus < 0) throw new Error("El bono de PX debe ser finito y no negativo.");
  if (mission.introductory && (mission.category !== "main" || level > MISSION_XP_POLICY.introductoryMaxLevel)) throw new Error("La progresión introductoria solo se aplica a principales de nivel 1–5.");
  const baseTotal = Math.round(experienceForNextLevel(level) * (rate === 0 ? 0 : mission.introductory ? MISSION_XP_POLICY.introductoryRate : rate));
  const totalXp = Math.round(baseTotal * (1 + xpBonus));
  const encounterPool = encounterIds.length ? Math.round(totalXp * MISSION_XP_POLICY.encounterShare) : 0;
  const weights = encounterIds.map(id => {
    const weight = ENCOUNTER_REWARDS[id]?.xpWeight;
    if (!weight) throw new Error(`Enemigo sin peso de recompensa: ${id}`);
    return weight;
  });
  const weightSum = weights.reduce((sum,weight) => sum+weight,0);
  const shares = weights.map(weight => encounterPool * weight / weightSum);
  const encounterXp = shares.map(Math.floor);
  const order = shares.map((share,index) => ({ index,fraction:share-Math.floor(share) })).sort((a,b) => b.fraction-a.fraction || a.index-b.index);
  const remainder = encounterPool - encounterXp.reduce((sum,xp) => sum+xp,0);
  for (let i=0;i<remainder;i++) encounterXp[order[i].index]++;
  return { totalXp, completionXp:totalXp-encounterPool, encounterXp };
}

export function withMissionRewards(mission) {
  const plan = missionXpPlan(mission);
  return { ...mission,reward:{ ...mission.reward,xp:plan.completionXp,totalXp:plan.totalXp } };
}
