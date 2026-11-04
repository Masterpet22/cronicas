import { currentTutorialCourse, lessonCompleted, observeTutorialEvent, pendingTutorialPreparation, recordTutorialLesson, tutorialStepSatisfied } from "../../tutorial-system.js";
import { BASIC_ELEMENT_IDS, elementName } from "../../elements.js?v=0.20.0";
import { FIELD_LESSONS } from "../../content/sagas/futuro-prometedor/tutorial.js";
import { resonancePoints } from "../../skills/progression.js?v=1.0.0";
import { ITEMS } from "../../items.js?v=0.126.0";
import { tutorialActor, tutorialCharacterMarkup, tutorialSpeakerMarkup } from "../../tutorial-speakers.js";
import { revealTutorialControl, tutorialControl } from "./tutorial-controls.js";

export function createSagaTutorialCoach({ root, getSave, persist, navigate }) {
  let view, host, ambient, stage, launcher, marked, message = "", signature = "", dismissed = "", previousStep = "", notice = "", noticeTimer = 0;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const currentStep = () => pendingTutorialPreparation(getSave()) || FIELD_LESSONS[view]?.find(item => !lessonCompleted(getSave(), item.id));
  const event = value => {
    const before = getSave(), next = observeTutorialEvent(before, value);
    if (next !== before) { notice = ""; clearTimeout(noticeTimer); persist(next); message = "Práctica registrada."; refresh(); }
  };
  const tell = text => {
    notice = text; dismissed = ""; clearTimeout(noticeTimer); refresh();
    noticeTimer = setTimeout(() => { notice = ""; refresh(); }, 6500);
  };
  const support = step => {
    const save = getSave();
    if (view === "dojo" && step?.state === "investment" && resonancePoints(save) < 1) return { reset: true };
    const item = step?.id === "buy-potions" ? "health_potion" : step?.state === "item" ? step.key : null;
    const amount = step?.id === "buy-potions" ? 2 : 1;
    if (view === "shop" && item && save.progression.coins < ITEMS[item].price * amount && !lessonCompleted(save, `aid-${step.id}`)) return { coins: ITEMS[item].price * amount - save.progression.coins };
    return null;
  };
  function refresh() {
    if (!host?.isConnected) return;
    const step = notice ? { id: "notice", view, title: "Un consejo antes de continuar", text: notice } : currentStep(), save = getSave();
    if (previousStep !== step?.id) { message = ""; previousStep = step?.id; }
    const options = root.querySelector("[data-stage-options]");
    if (view === "archive" && save.campaign.archiveUnlocked && !options?.hidden) {
      const active = root.querySelector('[data-archive-tab][aria-selected="true"]')?.dataset.archiveTab;
      if (["bestiary", "chronicle"].includes(active)) {
        const next = observeTutorialEvent(save, { type: active });
        if (next !== save) { persist(next); return; }
      }
    }
    const visible = Boolean(step && (!step.view || step.view === view) && dismissed !== `${view}:${step.id}` && !options?.hidden);
    if (host.hidden === visible) host.hidden = !visible;
    stage?.classList.toggle("has-guided-speaker", visible);
    if (ambient) {
      const wasTutorial = ambient.classList.contains("has-tutorial-dialogue");
      ambient.classList.toggle("has-tutorial-dialogue", visible);
      if (visible && !ambient.hidden) ambient.hidden = true;
      else if (!visible && wasTutorial) ambient.hidden = true;
    }
    const control = visible ? tutorialControl(root, step, save, view) : null;
    if (marked !== control?.element) { marked?.classList.remove("saga-tutorial-target"); marked = control?.element; }
    marked?.classList.add("saga-tutorial-target");
    if (control?.skill) root.dataset.tutorialSkill = control.skill; else delete root.dataset.tutorialSkill;
    if (launcher) {
      const label = step ? "Pedir ayuda al maestro" : "Volver al Cuartel";
      if (launcher.textContent !== label) launcher.textContent = label;
    }
    if (!visible) return;
    const aid = support(step);
    const actor = tutorialActor(save, view, view !== "dojo" && !["affinity-cycle", "field-pause"].includes(step.id) ? "guardian" : "master");
    const key = JSON.stringify([step.id, step.text, control?.instruction, aid, message, actor.id, save.character.affinity]);
    if (key === signature) return;
    signature = key;
    host.innerHTML = `${tutorialCharacterMarkup(actor)}<section class="tutorial-dialogue-box"><header data-dialogue-speaker>${tutorialSpeakerMarkup(actor)}<button type="button" data-coach-close aria-label="Cerrar explicación">×</button></header><h3>${escape(step.title)}</h3><div class="tutorial-dialogue-body"><p>${escape(step.text)}</p>${notice ? "" : `<p class="tutorial-control-instruction" role="status">${escape(control?.instruction || "Sigue la indicación de tu maestro.")}</p>`}${step.quiz === "affinity" ? `<div class="saga-coach-answers" role="group" aria-label="Rival vulnerable a ${escape(elementName(save.character.affinity))}">${BASIC_ELEMENT_IDS.map(id => `<button type="button" data-coach-answer="${id}">${elementName(id)}</button>`).join("")}</div>` : ""}<p class="saga-coach-message" role="status">${escape(message)}</p></div><footer><button type="button" data-coach-go>${notice ? "Entendido" : control?.reveal ? "Abrir el paso indicado" : "Mostrar el control"}</button></footer></section>`;
    if (aid) host.querySelector(".saga-coach-message").insertAdjacentHTML("beforebegin", aid.reset
      ? '<p>Puedes devolver todas las inversiones de técnicas y reasignarlas. Se retiran las mejoras compradas; conservas los atributos.</p><button type="button" data-coach-support>Recuperar PR invertidos</button>'
      : `<p>Tu maestro puede aportar las ${aid.coins} monedas que faltan, una sola vez para esta práctica.</p><button type="button" data-coach-support>Solicitar ayuda para materiales</button>`);
  }
  return {
    refresh,
    gate(mission) {
      const step = pendingTutorialPreparation(getSave(), mission);
      if (!step || mission.tutorialReplay || mission.exhibition || mission.type === "route-combat") return false;
      dismissed = ""; navigate(step.view); return true;
    },
    mount(nextView, scope) {
      view = nextView; signature = ""; previousStep = "";
      if (["debug", "plaza"].includes(view) || !currentTutorialCourse(getSave())) return;
      const nextScope = scope;
      host = document.createElement("section"); host.className = "saga-tutorial-coach"; host.setAttribute("aria-label", "Explicación del maestro y del guardián"); host.hidden = true;
      host.dataset.dialogueArea = view;
      ambient = root.querySelector("[data-stage-ambient]");
      stage = root.querySelector("[data-location-stage]") || root.querySelector(".village-shell");
      stage?.append(host);
      launcher = document.createElement("button"); launcher.type = "button"; launcher.dataset.coachOpen = ""; launcher.className = "tutorial-help-button";
      (root.querySelector(".village-return") || root.querySelector(".mission-pause-trigger")?.parentElement)?.append(launcher);
      scope.listen(launcher, "click", () => {
        const step = currentStep(); dismissed = ""; notice = "";
        if (step && (!step.view || step.view === view)) refresh(); else navigate(step?.view || "headquarters");
      });
      scope.listen(host, "click", action => {
        if (action.target.closest("[data-coach-close]")) { notice = ""; dismissed = `${view}:${currentStep()?.id}`; refresh(); if (ambient) ambient.hidden = true; return; }
        if (action.target.closest("[data-coach-support]")) {
          const step = currentStep(), aid = support(step), save = getSave();
          if (aid?.reset) persist({ ...save, progression: { ...save.progression, resonance: { investments: {} } } });
          else if (aid) persist(recordTutorialLesson({ ...save, progression: { ...save.progression, coins: save.progression.coins + aid.coins } }, `aid-${step.id}`));
          navigate(view); return;
        }
        if (action.target.closest("[data-coach-go]")) { if (notice) { notice = ""; refresh(); } else revealTutorialControl(tutorialControl(root, currentStep(), getSave(), view)); }
        const answer = action.target.closest("[data-coach-answer]");
        if (answer) { const before = getSave(); event({ type: "affinity-answer", key: answer.dataset.coachAnswer }); if (before === getSave()) { message = "Revisa el ciclo elemental y vuelve a elegir."; refresh(); } }
      });
      scope.listen(root, "click", action => {
        const button = action.target.closest("button"); if (!button || button.disabled || host.contains(button)) return;
        queueMicrotask(() => {
          if (!nextScope.isCurrent()) return;
          if (button.dataset.saga) event({ type: "saga" });
          if (button.dataset.equipmentType && getSave().equipment[button.dataset.equipmentType] === button.dataset.equipmentId) event({ type: "gear", key: button.dataset.equipmentType });
          if (button.hasAttribute("data-open-master") && !root.querySelector(".master-modal")?.hidden) event({ type: "master" });
          const archive = button.dataset.archiveTab;
          if (archive && getSave().campaign.archiveUnlocked && !root.querySelector(`[data-archive-panel="${archive}"]`)?.hidden) event({ type: archive });
          refresh();
        });
      });
      scope.listen(root, "mission-resumed", () => {
        if (view === "kagemori") { persist(recordTutorialLesson(getSave(), "field-pause")); refresh(); }
      });
      scope.listen(root, "input", action => {
        if (action.target.matches("[data-dictionary-search]") && action.target.value.trim() && root.querySelectorAll(".dictionary-entry").length) event({ type: "dictionary" });
      });
      scope.listen(root, "click", action => {
        const button = action.target.closest("button"), course = currentTutorialCourse(getSave());
        if (button?.dataset.skillInvest) {
          const required = course?.before.find(step => step.state === "investment" && !tutorialStepSatisfied(step, getSave()));
          if (required && required.key !== button.dataset.skillInvest) { action.preventDefault(); action.stopImmediatePropagation(); tell(`Reserva estos PR para la práctica: ${required.title}.`); }
        }
        if (action.target.closest("[data-clue]") && !lessonCompleted(getSave(), "field-pause")) {
          action.preventDefault(); action.stopImmediatePropagation(); tell("Primero abre Pausa y pulsa Reanudar. Después podrás investigar.");
        }
      }, { capture: true });
      scope.listen(root, "submit", action => {
        if (view !== "shop") return;
        const course = currentTutorialCourse(getSave()), form = action.target.closest("[data-shop-item]");
        const selling = root.querySelector('[data-shop-mode="sell"][aria-pressed="true"]');
        const reserved = { health_potion: "potion", purifying_tonic: "cleanse", kunai: "weapon", shuriken: "throwable" };
        const item = form?.dataset.shopItem;
        if (course && selling && reserved[item] && !lessonCompleted(getSave(), reserved[item]) && Number(form.querySelector("input")?.value || 1) >= getSave().inventory.items[item]) {
          action.preventDefault(); action.stopImmediatePropagation(); tell("Conserva una unidad para la práctica pendiente."); return;
        }
        const step = course?.before.find(item => item.event?.type === "buy" && !lessonCompleted(getSave(), item.id));
        if (!step || !form || selling) return;
        if (form.dataset.shopItem !== step.event.key || Number(form.querySelector("input")?.value || 1) < step.event.minimum) {
          action.preventDefault(); action.stopImmediatePropagation(); tell(step.text);
        }
      }, { capture: true });
      let queued = false;
      const observer = new MutationObserver(changes => {
        if (queued || changes.every(change => host.contains(change.target))) return;
        queued = true;
        queueMicrotask(() => { queued = false; if (scope.isCurrent()) refresh(); });
      });
      observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "aria-selected", "aria-pressed", "data-selected-skill"] });
      queueMicrotask(() => { if (scope.isCurrent()) refresh(); });
      scope.onCleanup(() => { observer.disconnect(); clearTimeout(noticeTimer); notice = ""; stage?.classList.remove("has-guided-speaker"); marked?.classList.remove("saga-tutorial-target"); delete root.dataset.tutorialSkill; });
    }
  };
}
