import { STORY_SAGAS } from "./content/sagas/futuro-prometedor/saga.js";
import { VILLAGE_UNLOCKS } from "./content/village-progression.js";
import { playerRank } from "./player-rank.js";

export function reachedSaga(save, sagas = STORY_SAGAS) {
  const completed = new Set(save?.campaign?.completedMissions || []);
  let reached = 1;
  for (const saga of [...sagas].sort((a, b) => a.number - b.number)) {
    if (saga.number !== reached || !saga.missionIds.length || !saga.missionIds.every(id => completed.has(id))) break;
    reached += 1;
  }
  return reached;
}

export function locationAccess(id, save, sagas = STORY_SAGAS) {
  const rule = VILLAGE_UNLOCKS[id];
  if (!rule) return { unlocked: true, reason: "" };
  const completed = new Set(save?.campaign?.completedMissions || []);
  const unlocked = Boolean(save?.character)
    && (!rule.missionId || completed.has(rule.missionId))
    && (!rule.book || save.campaign?.doctorBookDeliveryPending || save.campaign?.archiveUnlocked)
    && (!rule.saga || reachedSaga(save, sagas) >= rule.saga)
    && (!rule.level || save.progression?.level >= rule.level)
    && (!rule.rank || playerRank(save) >= rule.rank);
  return { unlocked: Boolean(unlocked), reason: unlocked ? "" : rule.reason };
}
