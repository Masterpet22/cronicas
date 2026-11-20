import { SAGA_TUTORIAL, SAGA_TUTORIAL_VERSION, TUTORIAL_LESSON_IDS } from "./content/sagas/futuro-prometedor/tutorial.js";
// Compatibilidad con partidas anteriores; no activa guías ni requisitos de prácticas.

export function normalizeSagaTutorial(candidate, campaign = {}) {
  const completed = new Set(Array.isArray(candidate?.completed) ? candidate.completed.filter(id => TUTORIAL_LESSON_IDS.includes(id)) : []);
  // El historial anterior acredita únicamente las misiones ya superadas.
  if (!candidate || candidate.version < SAGA_TUTORIAL_VERSION) for (const course of SAGA_TUTORIAL) if (campaign.completedMissions?.includes(course.missionId)) {
    [...course.before.map(step => step.id), ...course.practices].forEach(id => completed.add(id));
  }
  return { version: SAGA_TUTORIAL_VERSION, completed: [...completed] };
}
export const lessonCompleted = (save, id) => Boolean(save.campaign?.sagaTutorial?.completed?.includes(id));
export function recordTutorialLesson(save, id) {
  if (!TUTORIAL_LESSON_IDS.includes(id) || lessonCompleted(save, id)) return save;
  const tutorial = normalizeSagaTutorial(save.campaign.sagaTutorial);
  return { ...save, campaign: { ...save.campaign, sagaTutorial: { ...tutorial, completed: [...tutorial.completed, id] } } };
}
export function recordRouteLesson(save, previousPhase) {
  const phase = save.campaign.doctorRoute.phase;
  return phase > previousPhase ? recordTutorialLesson(save, `route-${phase}`) : save;
}
