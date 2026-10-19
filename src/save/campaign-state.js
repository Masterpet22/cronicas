import { MISSIONS, SECONDARY_MISSIONS } from "../content/index.js";
import { missionState } from "../mission-system.js?v=0.67.0";
import { createCompletedMissionProgress } from "./save-migrations.js";

const ALL_MISSIONS = [...MISSIONS, ...SECONDARY_MISSIONS];

export function normalizeMissionProgress(candidate, completedMissions, completedSecondaryMissions) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const completedIds = new Set([...completedMissions, ...completedSecondaryMissions]);
  return Object.fromEntries(ALL_MISSIONS.flatMap((mission) => {
    const entry = source[mission.id];
    if (!entry && !completedIds.has(mission.id)) return [];
    if (!entry && completedIds.has(mission.id)) return [[mission.id, createCompletedMissionProgress(mission)]];
    const validSteps = new Set((mission.flow || []).map((step) => step.id).filter(Boolean));
    const completedSteps = [...new Set(Array.isArray(entry.completedSteps) ? entry.completedSteps : [])].filter((id) => validSteps.has(id));
    const currentStepId = validSteps.has(entry.currentStepId) && !completedSteps.includes(entry.currentStepId) ? entry.currentStepId : null;
    const status = completedIds.has(mission.id) ? "completed" : "in-progress";
    return [[mission.id, {
      status,
      currentStepId: status === "completed" ? null : currentStepId || mission.flow.find((step) => step.id && !completedSteps.includes(step.id))?.id || null,
      completedSteps: status === "completed" ? [...validSteps] : completedSteps,
      context: entry.context && typeof entry.context === "object" && !Array.isArray(entry.context) ? entry.context : {},
      appliedEffects: [...new Set(Array.isArray(entry.appliedEffects) ? entry.appliedEffects : [])].filter((id) => typeof id === "string" && id.startsWith(`${mission.id}:`)),
      attempts: Math.max(1, Math.floor(Number(entry.attempts) || 1))
    }]];
  }));
}

export function startMissionProgress(save, missionId) {
  const mission = ALL_MISSIONS.find((entry) => entry.id === missionId);
  if (!mission || missionState(mission, save).completed || !missionState(mission, save).unlocked) return save;
  const progress = save.campaign.missionProgress[missionId];
  save.campaign.missionProgress[missionId] = progress
    ? { ...progress, status: "in-progress", attempts: progress.attempts + 1 }
    : { status: "in-progress", currentStepId: mission.flow.find((step) => step.id)?.id || null, completedSteps: [], context: {}, appliedEffects: [], attempts: 1 };
  return save;
}

export function advanceMissionProgress(save, missionId, completedStepId, context = {}) {
  const mission = ALL_MISSIONS.find((entry) => entry.id === missionId);
  const progress = save?.campaign?.missionProgress?.[missionId];
  if (!mission || !progress || progress.status === "completed") return save;
  const index = mission.flow.findIndex((step) => step.id === completedStepId);
  if (index < 0) return save;
  const completedSteps = [...new Set([...progress.completedSteps, completedStepId])];
  const nextStep = mission.flow.slice(index + 1).find((step) => step.id && !completedSteps.includes(step.id));
  save.campaign.missionProgress[missionId] = {
    ...progress,
    completedSteps,
    currentStepId: nextStep?.id || completedStepId,
    context: { ...progress.context, ...context }
  };
  return save;
}
