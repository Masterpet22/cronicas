import { lessonCompleted, tutorialCourseFor } from "../tutorial-system.js";
import { tutorialActor, tutorialCharacterMarkup, tutorialSpeakerMarkup } from "../tutorial-speakers.js";
import { recordBattleLesson } from "./tutorial-progress.js";
import { suspendPauseRendering } from "./pause-rendering.js?v=1.0.0";

export async function explainSagaEvent(scene, lesson, { title, copy, guardianCopy }) {
  if (scene.mission.tutorialReplay || !tutorialCourseFor(scene.mission) || scene.saveData.campaign.completedMissions.includes(scene.mission.id) || lessonCompleted(scene.saveData, lesson)) return;
  const parent = scene.game.canvas.parentElement;
  const dialog = document.createElement("dialog"); dialog.className = "battle-lesson-dialog"; dialog.dataset.battleLesson = lesson;
  const heading = document.createElement("h2"); heading.textContent = title; heading.id = "battle-lesson-title";
  const text = document.createElement("p"); text.textContent = copy;
  dialog.setAttribute("aria-labelledby", heading.id);
  const actor = tutorialActor(scene.saveData, "battle", "master");
  dialog.innerHTML = `${tutorialCharacterMarkup(actor)}<section class="tutorial-dialogue-box"><header data-dialogue-speaker>${tutorialSpeakerMarkup(actor)}</header><div class="tutorial-dialogue-body"></div><footer></footer></section>`;
  const button = document.createElement("button"); button.type = "button"; button.className = "primary-button"; button.textContent = "Entendido · Continuar";
  text.textContent = [guardianCopy, copy].filter(Boolean).join(" ");
  const box = dialog.querySelector(".tutorial-dialogue-box"); box.insertBefore(heading, box.querySelector(".tutorial-dialogue-body")); box.querySelector(".tutorial-dialogue-body").append(text); box.querySelector("footer").append(button);
  parent.append(dialog);
  const restoreHud = scene.accessibleHud?.suspend?.();
  const keyboard = scene.input.keyboard, wasEnabled = keyboard.enabled; keyboard.enabled = false;
  const frozen = suspendPauseRendering(scene);
  try {
    const accepted = await new Promise(resolve => {
      const shutdown = () => resolve(false);
      scene.events.once("shutdown", shutdown);
      button.addEventListener("click", () => { scene.events.off("shutdown", shutdown); resolve(true); }, { once: true });
      dialog.addEventListener("cancel", event => event.preventDefault());
      dialog.showModal(); button.focus();
    });
    if (accepted) recordBattleLesson(scene, lesson);
  } finally {
    frozen.dispose(); dialog.remove(); keyboard.enabled = wasEnabled; restoreHud?.();
  }
}
