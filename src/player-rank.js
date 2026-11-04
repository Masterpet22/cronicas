import { availableAffinitySlots } from "./affinity-system.js?v=0.114.0";

export const PLAYER_RANK_LABELS = Object.freeze({ 1: "Novicio", 2: "Experto", 3: "Veterano" });

export function playerRank(save) {
  return availableAffinitySlots(save?.progression?.level, 1, false, "Novicio", save?.campaign?.completedSecondaryMissions || []);
}

export const playerRankLabel = save => PLAYER_RANK_LABELS[playerRank(save)];
