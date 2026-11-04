import { SAGA_TUTORIAL, SAGA_TUTORIAL_VERSION, TUTORIAL_LESSON_IDS } from "./content/sagas/futuro-prometedor/tutorial.js";
import { AFFINITY_CONFIG } from "./affinity-system.js?v=0.114.0";

export function normalizeSagaTutorial(candidate, campaign = {}) {
  const completed = new Set(Array.isArray(candidate?.completed) ? candidate.completed.filter(id => TUTORIAL_LESSON_IDS.includes(id)) : []);
  // El historial anterior acredita únicamente las misiones ya superadas.
  if (!candidate) for (const course of SAGA_TUTORIAL) if (campaign.completedMissions?.includes(course.missionId)) {
    [...course.before.map(step => step.id), ...course.practices].forEach(id => completed.add(id));
  }
  return { version: SAGA_TUTORIAL_VERSION, completed: [...completed] };
}
export const tutorialCourseFor = mission => SAGA_TUTORIAL.find(course => course.missionId === mission?.id) || null;
export const currentTutorialCourse = save => SAGA_TUTORIAL.find(course => !save.campaign.completedMissions.includes(course.missionId)) || null;
export const lessonCompleted = (save, id) => Boolean(save.campaign?.sagaTutorial?.completed?.includes(id));
export function recordTutorialLesson(save, id) {
  if (!TUTORIAL_LESSON_IDS.includes(id) || lessonCompleted(save, id)) return save;
  const tutorial = normalizeSagaTutorial(save.campaign.sagaTutorial);
  return { ...save, campaign: { ...save.campaign, sagaTutorial: { ...tutorial, completed: [...tutorial.completed, id] } } };
}
const sum = value => Object.values(value || {}).reduce((total, n) => total + (Number(n) || 0), 0);
export function tutorialStepSatisfied(step, save) {
  if (step.practice && lessonCompleted(save, step.practice)) return true;
  if (step.state === "item") return (save.inventory?.items?.[step.key] || 0) > 0;
  if (step.state === "investment") return (save.progression?.resonance?.investments?.[step.key] || 0) > 0;
  if (step.state === "attribute") return sum(save.progression?.attributes) > 0;
  if (step.state === "taijutsu") return Boolean(save.taijutsuLoadout?.some(Boolean));
  if (step.state === "elemental") return Boolean(save.loadout?.length);
  if (step.state === "equipment") return Boolean(save.equipment?.weapon && save.equipment?.throwable);
  if (step.state === "combat-ready") return Boolean(save.loadout?.length && save.taijutsuLoadout?.some(Boolean) && save.equipment?.weapon && save.equipment?.throwable);
  return false;
}
export function pendingTutorialPreparation(save, mission) {
  const course = mission ? tutorialCourseFor(mission) : currentTutorialCourse(save);
  if (!course || save.campaign.completedMissions.includes(course.missionId)) return null;
  return course.before.find(step => step.state && !step.event ? !tutorialStepSatisfied(step, save) : !lessonCompleted(save, step.id) && !tutorialStepSatisfied(step, save)) || null;
}
export function observeTutorialEvent(save, event) {
  const course = currentTutorialCourse(save);
  if (!course) return save;
  let next = save;
  for (const step of course.before) {
    if (!step.event || step.event.type !== event.type || step.event.key && step.event.key !== event.key || (event.amount || 1) < (step.event.minimum || 1)) continue;
    if (step.quiz === "affinity" && AFFINITY_CONFIG.cycle.matrix[save.character.affinity]?.[event.key] !== AFFINITY_CONFIG.cycle.advantage) continue;
    next = recordTutorialLesson(next, step.id);
  }
  return next;
}
export function observeTutorialChanges(before, after, view) {
  // Las vistas pueden conservar una instantánea anterior a una lección del coach.
  // Las lecciones son acumulativas dentro de una partida y no se deben sobrescribir.
  let next = { ...after, campaign: { ...after.campaign, sagaTutorial: normalizeSagaTutorial({ completed: [...(before.campaign.sagaTutorial?.completed || []), ...(after.campaign.sagaTutorial?.completed || [])] }) } };
  const emit = event => { next = observeTutorialEvent(next, event); };
  if (sum(after.progression.attributes) > sum(before.progression.attributes)) emit({ type: "attribute" });
  for (const [key, count] of Object.entries(after.progression.resonance.investments)) if (count > (before.progression.resonance.investments[key] || 0)) emit({ type: "invest", key });
  if (after.taijutsuLoadout.some((id, i) => id && id !== before.taijutsuLoadout[i])) emit({ type: "taijutsu" });
  if (after.loadout.some(id => !before.loadout.includes(id))) emit({ type: "loadout-equip" });
  if (before.loadout.some(id => !after.loadout.includes(id))) emit({ type: "loadout-remove" });
  if (view === "shop") for (const key of new Set([...Object.keys(before.inventory.items), ...Object.keys(after.inventory.items)])) {
    const amount = (after.inventory.items[key] || 0) - (before.inventory.items[key] || 0);
    if (amount > 0 && after.progression.coins < before.progression.coins) emit({ type: "buy", key, amount });
    if (amount < 0 && after.progression.coins > before.progression.coins) emit({ type: "sell", key, amount: -amount });
  }
  return next;
}
export function missingTutorialPractices(save, mission) {
  return (tutorialCourseFor(mission)?.practices || []).filter(id => !lessonCompleted(save, id));
}
export function recordRouteLesson(save, previousPhase) {
  const phase = save.campaign.doctorRoute.phase;
  return phase > previousPhase ? recordTutorialLesson(save, `route-${phase}`) : save;
}
