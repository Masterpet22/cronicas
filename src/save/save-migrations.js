const DERIVED_CAMPAIGN_FIELDS = Object.freeze([
  "kagemoriInvestigated", "banditBossMissionUnlocked", "nextSideMissionGoldMultiplier",
  "cipherMapObtained", "doctorMissionUnlocked", "doctorMissionCompleted", "bestiaryBookObtained",
  "hideoutLocationRevealed", "hideoutMissionUnlocked", "secretEntranceKnown", "heartMissionUnlocked",
  "prisonersRescued", "organizationDocumentsRecovered", "organizationRevealed",
  "banditLeaderMissionUnlocked", "firstSagaCompleted", "masterSelectionUnlocked"
]);

export function createCompletedMissionProgress(mission) {
  return {
    status: "completed",
    currentStepId: null,
    completedSteps: (mission.flow || []).filter((step) => step.id).map((step) => step.id),
    context: {},
    appliedEffects: (mission.completionEffects || []).map((effect) => `${mission.id}:${effect.type}:${effect.id}`),
    attempts: 1
  };
}

export function migrateSaveToV17(candidate, { missions, secondaryMissions }) {
  if (!candidate || typeof candidate !== "object") return candidate;
  const version = Math.max(0, Math.floor(Number(candidate.version) || 0));
  if (version >= 17) return candidate;
  const campaign = { ...(candidate.campaign || {}) };
  const mainIds = missions.map((mission) => mission.id);
  const oldIds = { m11: mainIds[1], m12: mainIds[2], m13: mainIds[3], m14: mainIds[4] };
  let completedMissions = Array.isArray(campaign.completedMissions) ? campaign.completedMissions : [];
  if (version < 16) {
    completedMissions = completedMissions.flatMap((id) => oldIds[id] ? [oldIds[id]] : id === mainIds[0] ? [id] : []);
  }
  completedMissions = [...new Set(completedMissions)].filter((id) => mainIds.includes(id));
  let completedSecondaryMissions = Array.isArray(campaign.completedSecondaryMissions) ? campaign.completedSecondaryMissions : [];
  const investigationId = secondaryMissions.find((mission) => mission.type === "investigation")?.id;
  const routeId = secondaryMissions.find((mission) => mission.type === "route-search")?.id;
  if (campaign.kagemoriInvestigated && investigationId) completedSecondaryMissions.push(investigationId);
  if (campaign.doctorMissionCompleted && routeId) completedSecondaryMissions.push(routeId);
  if (!campaign.hideoutDiscoveryChoice) {
    if (campaign.prisonersRescued) campaign.hideoutDiscoveryChoice = "prisoners";
    else if (campaign.organizationDocumentsRecovered) campaign.hideoutDiscoveryChoice = "documents";
  }
  completedSecondaryMissions = [...new Set(completedSecondaryMissions)].filter((id) => secondaryMissions.some((mission) => mission.id === id));
  const missionProgress = { ...(campaign.missionProgress || {}) };
  for (const missionId of [...completedMissions, ...completedSecondaryMissions]) {
    if (missionProgress[missionId]?.status === "completed") continue;
    const mission = [...missions, ...secondaryMissions].find((entry) => entry.id === missionId);
    if (mission) missionProgress[missionId] = createCompletedMissionProgress(mission);
  }
  Object.keys(campaign).forEach((key) => { if (DERIVED_CAMPAIGN_FIELDS.includes(key)) delete campaign[key]; });
  campaign.completedMissions = completedMissions;
  campaign.completedSecondaryMissions = completedSecondaryMissions;
  campaign.missionProgress = missionProgress;
  return { ...candidate, version: 17, campaign };
}
