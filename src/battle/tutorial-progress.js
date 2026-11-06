import { recordTutorialLesson, tutorialCourseFor } from "../tutorial-system.js";
import { writeSave } from "../save.js?v=0.140.0";
import { battleRuntime } from "./session.js?v=1.0.0";
import { SHARED_TUTORIAL_PRACTICES } from "../content/sagas/futuro-prometedor/tutorial.js";

export function recordBattleLesson(scene, id) {
  const course = tutorialCourseFor(scene.mission);
  if (scene.mission?.tutorialReplay || !course || !course.practices.includes(id) && !SHARED_TUTORIAL_PRACTICES.includes(id)) return;
  const next = recordTutorialLesson(scene.saveData, id);
  if (next === scene.saveData) return;
  scene.saveData = next;
  for (const key of ["missionStartSave", "rewardPreviewSave"]) if (scene[key]) {
    scene[key] = { ...scene[key], campaign: { ...scene[key].campaign, sagaTutorial: next.campaign.sagaTutorial } };
  }
  // Se guarda la lección, nunca PX, monedas ni recompensas provisionales.
  if (scene.missionStartSave) scene.missionStartSave = writeSave(scene.missionStartSave);
  battleRuntime.activeSave = scene.saveData;
}
