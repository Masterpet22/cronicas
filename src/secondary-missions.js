import { applyMissionEffects, missionState } from "./mission-system.js?v=0.66.0";
import { createCompletedMissionProgress } from "./save/save-migrations.js";

export function secondaryMissionByType(type, missions) {
  return missions.find((mission) => mission.type === type) || null;
}

export function secondaryMissionDefinition(missionOrId, missions) {
  if (missionOrId && typeof missionOrId === "object") return missionOrId;
  return missions.find((mission) => mission.id === missionOrId) || null;
}

const CARD_PRESENTERS = Object.freeze({
  investigation: (mission, state) => ({
    visible: state.unlocked || state.completed,
    detail: `${mission.location} · ${mission.duration} · Investigación sin combate`,
    actionLabel: state.completed ? "COMPLETADA" : "INVESTIGAR"
  }),
  "route-search": (mission, state, save) => ({
    visible: state.unlocked || state.completed,
    detail: `${mission.location} · ${mission.duration} · Rutas y descifrado de sellos`,
    actionLabel: state.completed ? "COMPLETADA" : save.campaign.doctorRoute.active ? "CONTINUAR" : "BUSCAR A HARU"
  })
});

export function secondaryMissionCardModel(mission, save) {
  const state = missionState(mission, save);
  const present = CARD_PRESENTERS[mission.type];
  if (!present) return null;
  return { mission, state, disabled: state.completed || !state.unlocked, ...present(mission, state, save) };
}

export function emptySecondaryCompletion(result, { blocked = false } = {}) {
  return { save: result, xp: 0, affinityXp: 0, coins: 0, supplyBonus: 0, levelsGained: 0, firstClear: false, blocked };
}

export function completeInvestigationMission(result, mission) {
  const state = missionState(mission, result);
  if (state.completed || !state.unlocked) return emptySecondaryCompletion(result, { blocked: !state.unlocked });
  result.campaign.completedSecondaryMissions = [...new Set([...result.campaign.completedSecondaryMissions, mission.id])];
  applyMissionEffects(result, mission.completionEffects);
  result.campaign.missionProgress[mission.id] = createCompletedMissionProgress(mission);
  return { ...emptySecondaryCompletion(result), firstClear: true };
}

export function completeSecondaryByType(result, missionOrId, missions, handlers) {
  const mission = secondaryMissionDefinition(missionOrId, missions);
  const handler = mission && handlers[mission.type];
  return handler ? handler(result, mission) : emptySecondaryCompletion(result, { blocked: Boolean(mission) });
}
