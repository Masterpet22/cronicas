import { lessonCompleted, tutorialCourseFor } from "../tutorial-system.js";
import { COMBAT_LESSONS } from "../content/sagas/futuro-prometedor/combat-lessons.js";
import { recordBattleLesson } from "./tutorial-progress.js";
import { tutorialActor, tutorialSpeakerMarkup, updateTutorialActor } from "../tutorial-speakers.js";
import { affinityTutorialCopy } from "../content/sagas/futuro-prometedor/affinity-advice.js";
import { CHAKRA_BALANCE } from "../chakra-balance.js?v=1.0.0";

export function needsCombatTutorial(save, mission) {
  const plan = COMBAT_LESSONS[tutorialCourseFor(mission)?.battle];
  return Boolean(plan && !save.campaign.completedMissions.includes(mission.id) && plan.actions.some(step => step.lesson && !lessonCompleted(save, step.lesson)));
}

// Cada avance práctico procede del control real o de una acción terminada.
export function mountCombatTutorial(scene, { onReplayExit } = {}) {
  const course = tutorialCourseFor(scene.mission);
  const plan = COMBAT_LESSONS[onReplayExit ? "basics" : course?.battle || "basics"];
  const parent = scene.game.canvas.parentElement;
  const root = document.createElement("div"); root.className = "combat-tutorial";
  const initialActor = tutorialActor(scene.saveData, "battle", "master");
  root.innerHTML = `<div class="tutorial-shade"></div><div class="tutorial-spotlight" aria-hidden="true"></div><div class="tutorial-character-dialogue"><section class="tutorial-dialogue-box tutorial-voice" role="dialog" aria-labelledby="tutorial-title" aria-describedby="tutorial-copy"><header data-dialogue-speaker>${tutorialSpeakerMarkup(initialActor)}</header><h2 id="tutorial-title" class="tutorial-sr-only"></h2><div class="tutorial-dialogue-body"><p id="tutorial-copy"></p></div><footer><button type="button" data-tutorial-next>Entendido</button></footer></section></div><button type="button" class="tutorial-skip" ${onReplayExit ? "data-tutorial-skip" : "data-tutorial-pause"}>${onReplayExit ? "Salir del repaso" : "Pausar formación"}</button>`;
  parent.append(root);
  const presentation = root.querySelector(".tutorial-character-dialogue"), spotlight = root.querySelector(".tutorial-spotlight"), shade = root.querySelector(".tutorial-shade");
  const next = root.querySelector("[data-tutorial-next]"), exit = root.querySelector(".tutorial-skip");
  let active = true, current = null, pending = null, index = 0, phase = "intro", destroyed = false, sealsExplained = false;
  const step = () => plan.actions[index];
  const actionFor = specification => {
    const actions = Array.from({ length: 6 }, (_, i) => scene.accessibleHud.getAction(i)).filter(Boolean);
    return actions.find(action => specification.kind === "technique" ? action.seals?.length : specification.kind === "item" ? action.itemId === specification.item : specification.kind === action.type || specification.kind === action.id);
  };
  const canvasRect = ([x, y, w, h]) => {
    const bounds = scene.game.canvas.getBoundingClientRect();
    return { left: bounds.left + x / 960 * bounds.width, top: bounds.top + y / 540 * bounds.height,
      width: w / 960 * bounds.width, height: h / 540 * bounds.height };
  };
  const targetRect = (target) => {
    const compact = parent.querySelector(".combat-access.compact");
    const selector = target === "pause" ? ".combat-access-pause" : target === "table" ? "[data-skill-table-switch]" : target === "bag" ? ".combat-access-inventory" : target?.startsWith("action:") ? `[data-combat-action="${target.split(":")[1]}"]`
      : compact && ({ health: ".combat-access-status:first-child", chakra: ".combat-access-status:first-child", timeline: ".combat-access-progress", preparation: ".combat-access-progress", statuses: ".combat-access-status", pause: ".combat-access-pause" })[target];
    const el = selector && parent.querySelector(selector);
    if (el) return el.getBoundingClientRect();
    if (target === "seals") {
      const bounds = scene.sealLayer.getBounds();
      if (bounds.width && bounds.height) return canvasRect([bounds.x, bounds.y, bounds.width, bounds.height]);
    }
    return canvasRect(({ health: [100, 34, 260, 28], chakra: [100, 62, 260, 29], timeline: [205, 452, 620, 80],
      preparation: [677, 466, 139, 63], seals: [265, 65, 430, 148], statuses: [146, 83, 210, 30], pause: [412, 49, 36, 36] })[target] || [360, 230, 240, 120]);
  };
  const position = () => {
    if (!current || destroyed) return;
    const bounds = parent.getBoundingClientRect();
    const rect = targetRect(current.target);
    const left = Math.max(4, rect.left - bounds.left - 7);
    const top = Math.max(4, rect.top - bounds.top - 7);
    const width = Math.min(bounds.width - left - 4, rect.width + 14);
    const height = Math.min(bounds.height - top - 4, rect.height + 14);
    spotlight.style.cssText = `left:${left}px;top:${top}px;width:${width}px;height:${height}px`;
    spotlight.hidden = !current.target;
    shade.hidden = Boolean(current.target);
    // El diálogo se acopla al borde opuesto al control; nunca tapa la barra señalada.
    presentation.dataset.dialoguePlacement = current.target && rect.top - bounds.top > bounds.height * .62 ? "top" : "bottom";
  };
  const observer = new ResizeObserver(() => position()); observer.observe(parent);
  const controlFor = target => parent.querySelector(target === "table" ? "[data-skill-table-switch]" : target === "bag" ? ".combat-access-inventory" : target?.startsWith("action:") ? `[data-combat-action="${target.split(":")[1]}"]` : ".combat-access-pause");
  const hide = () => { current = null; presentation.hidden = spotlight.hidden = shade.hidden = true; root.classList.remove("is-explaining", "is-practicing"); };
  const show = (item, callback) => {
    if (!active || destroyed) return;
    current = item; root.dataset.tutorialStep = item.id; root.dataset.tutorialTarget = item.target || "";
    root.classList.add("is-explaining"); presentation.hidden = false;
    root.classList.toggle("is-practicing", Boolean(item.practice));
    const actor = tutorialActor(scene.saveData, "battle", "master");
    updateTutorialActor(presentation, actor);
    root.querySelector("#tutorial-title").textContent = item.title;
    root.querySelector("#tutorial-copy").textContent = item.id === "affinity" ? affinityTutorialCopy(scene.player.primaryAffinity) : item.copy;
    next.textContent = item.button || "Entendido";
    next.hidden = Boolean(item.practice && !item.button);
    next.onclick = item.practice && !item.button ? () => controlFor(item.target)?.focus({ preventScroll: true }) : callback;
    position(); (next.hidden ? controlFor(item.target) : next)?.focus({ preventScroll: true });
  };
  const page = item => new Promise(resolve => {
    if (!active || destroyed) return resolve(false);
    pending = resolve; show(item, () => { pending = null; hide(); resolve(true); });
  });
  const close = () => { active = false; phase = "done"; hide(); root.hidden = true; pending?.(false); pending = null; scene.accessibleHud?.refresh(); };
  const pause = () => scene.openBattlePause();
  exit.onclick = () => { if (onReplayExit) { close(); onReplayExit(); } else pause(); };
  const onKey = event => {
    if (!active || destroyed || scene.scene.isPaused()) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); if (onReplayExit) { close(); onReplayExit(); } else pause(); }
  };
  document.addEventListener("keydown", onKey, true);
  const onPause = () => { root.hidden = true; };
  const onResume = () => {
    root.hidden = !active;
    position();
  };
  scene.events.on("pause", onPause); scene.events.on("resume", onResume); hide();
  if (course?.battle === "resources" && !onReplayExit && !lessonCompleted(scene.saveData, "potion")) scene.player.hp = Math.max(1, scene.player.maxHp - Math.min(20, Math.round(scene.player.maxHp * .2)));
  if (course?.battle === "statuses" && !onReplayExit && !lessonCompleted(scene.saveData, "cleanse")) scene.player.statuses.push({ type: "burn", label: "QUEMADURA", duration: 2, power: 2 });
  scene.refreshHud();
  const finishPractice = async () => {
  phase = "outro";
  if (plan === COMBAT_LESSONS.basics) await page({ id: "cooldowns", target: "action:2", title: "Tu técnica necesita recuperarse", copy: `CD indica cuántas acciones debes esperar para repetir una técnica. Mientras se recupera, puedes usar Golpe veloz, tu equipo o Guardia. Cada acción recupera ${CHAKRA_BALANCE.turnRecovery} CH; Guardia recupera ${CHAKRA_BALANCE.guardRecovery} CH en total.` });
  if (active) await page({ id: "complete", title: "Ahora tú decides", copy: "Ya has realizado las acciones guiadas. A partir de ahora ambos podéis caer: elige tus ataques y defensas para completar el duelo.", button: onReplayExit ? "Volver a la Biblioteca" : "Continuar la misión" });
  const complete = active; close(); if (complete && onReplayExit) onReplayExit();
  };
  const guide = {
    get active() { return active; },
    get sealPractice() { return active && sealsExplained; },
    get allowTableChange() { return active && phase === "practice" && step()?.kind === "table"; },
    get allowsItems() { return active && phase === "practice" && step()?.kind === "item"; },
    async start() { for (const item of plan.intro) { if (!await page(item)) return; } phase = "practice"; },
    canUse(action) {
      if (!active) return true;
      if (phase !== "practice" || step()?.kind === "table") return false;
      const expected = step();
      return expected.kind === "item" ? action.type === "item" && action.itemId === expected.item : actionFor(expected)?.id === action.id;
    },
    onReady() {
      if (!active || phase !== "practice") return;
      while (!onReplayExit && step()?.lesson && lessonCompleted(scene.saveData, step().lesson)) index += 1;
      const item = step(); if (!item) { void finishPractice(); return; }
      scene.setButtonsEnabled(true);
      if (item.kind === "table") {
        if (parent.querySelector(".combat-access").dataset.skillTable === item.table) { index += 1; guide.onReady(); return; }
        show({ ...item, target: "table", practice: true }, () => controlFor("table")?.click());
        scene.accessibleHud.refresh(); return;
      }
      const action = actionFor(item);
      const slot = action && Array.from({ length: 6 }, (_, i) => scene.accessibleHud.getAction(i)?.id).indexOf(action.id) + 1;
      const target = item.kind === "item" ? "bag" : `action:${slot}`;
      show({ ...item, target, practice: true }, () => controlFor(target)?.click());
    },
    onTableChanged(table) {
      if (!active || phase !== "practice" || step()?.kind !== "table" || step().table !== table) return;
      index += 1; hide(); if (scene.turnReady) guide.onReady();
    },
    selected() { if (active) hide(); },
    async preparation() {
      if (active && step()?.kind === "technique") await page({ id: "preparation", target: "preparation", title: "Prepara la técnica", copy: "Ya has gastado el chakra. Ahora tu marcador debe llegar al 100 % antes de ejecutar los sellos. El rival también avanza y puede atacar durante la preparación." });
    },
    async seals() {
      if (!active || sealsExplained) return; sealsExplained = true;
      await page({ id: "seals", target: "seals", title: "Completa los sellos de esta técnica", copy: scene.manualSeals ? "Pulsa la letra de la tarjeta iluminada con QWER / ASDF / ZXCV o haz clic en ella. La práctica no tiene reloj. Sin errores: +10 % de daño; más de dos errores lo reducen." : "Tienes sellos automáticos: las tarjetas se completan solas y no conceden la bonificación manual." });
    },
    async afterAction(action) {
      if (!active || phase !== "practice" || !guide.canUse(action)) return;
      recordBattleLesson(scene, step().lesson); index += 1;
      if (index < plan.actions.length) return;
      await finishPractice();
    },
    destroy() { if (destroyed) return; destroyed = true; close(); observer.disconnect(); document.removeEventListener("keydown", onKey, true); scene.events.off("pause", onPause); scene.events.off("resume", onResume); root.remove(); }
  };
  return guide;
}
