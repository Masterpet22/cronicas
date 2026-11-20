const grades = ["D", "C", "B", "A", "S"];

export function bestMissionGrade(save, missionId) {
  const progress = save?.campaign?.missionProgress?.[missionId];
  const grade = progress?.context?.bestGrade;
  return progress?.status === "completed" && grades.includes(grade) ? grade : null;
}

export function recordMissionGrade(save, missionId, grade) {
  const campaign = save?.campaign;
  const progress = campaign?.missionProgress?.[missionId];
  if (progress?.status !== "completed" || grades.indexOf(grade) <= grades.indexOf(bestMissionGrade(save, missionId))) return save;
  return {
    ...save,
    campaign: {
      ...campaign,
      missionProgress: {
        ...campaign.missionProgress,
        [missionId]: { ...progress, context: { ...progress.context, bestGrade: grade } }
      }
    }
  };
}
