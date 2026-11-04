import { SAGA_TUTORIAL, SHARED_TUTORIAL_PRACTICES } from "../../src/content/sagas/futuro-prometedor/tutorial.js";
import { COMBAT_LESSONS } from "../../src/content/sagas/futuro-prometedor/combat-lessons.js";

// Los escenarios ajenos a la formación parten de un jugador que ya la practicó.
// Los casos de currículo utilizan partidas nuevas y controles reales por separado.
export function learnedTutorialForTest(save) {
  save.equipment.weapon = "kunai"; save.equipment.throwable = "shuriken";
  save.campaign.sagaTutorial.completed = [...new Set([...SAGA_TUTORIAL.flatMap(course => course.before.map(step => step.id)), ...Object.values(COMBAT_LESSONS).flatMap(plan => plan.actions.map(step => step.lesson).filter(Boolean)), ...SHARED_TUTORIAL_PRACTICES])];
  return save;
}

export async function useLearnedTutorialSave(page, view = "headquarters") {
  await page.evaluate(async view => {
    const { loadSave, writeSave } = await import("/src/save.js?v=0.131.0");
    const { learnedTutorialForTest } = await import("/tests/helpers/saga-tutorial.mjs");
    const { battleRuntime } = await import("/src/battle/session.js?v=1.0.0");
    battleRuntime.activeSave = writeSave(learnedTutorialForTest(loadSave()));
    battleRuntime.releaseGameToMeta(view);
  }, view);
}
