import { TUTORIAL_LESSON_IDS } from "../../src/content/sagas/futuro-prometedor/tutorial.js";

// Fixture de partidas anteriores con equipo e historial del tutorial retirado.
export function learnedTutorialForTest(save) {
  save.equipment.weapon = "kunai"; save.equipment.throwable = "shuriken";
  save.campaign.sagaTutorial.completed = TUTORIAL_LESSON_IDS.filter(id => !id.startsWith("clue-"));
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
