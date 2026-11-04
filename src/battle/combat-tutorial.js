import { lessonCompleted, tutorialCourseFor } from "../tutorial-system.js";
import { COMBAT_LESSONS } from "../content/sagas/futuro-prometedor/combat-lessons.js";
import { recordBattleLesson } from "./tutorial-progress.js";
import { tutorialActor, tutorialCharacterMarkup, tutorialSpeakerMarkup, updateTutorialActor } from "../tutorial-speakers.js";
import { affinityTutorialCopy } from "../content/sagas/futuro-prometedor/affinity-advice.js";

export function needsCombatTutorial(save, mission) {
  const plan = COMBAT_LESSONS[tutorialCourseFor(mission)?.battle];
  return Boolean(plan && !save.campaign.completedMissions.includes(mission.id) && (plan.actions.some(step => step.lesson && !lessonCompleted(save, step.lesson)) || plan.pause && !lessonCompleted(save, "pause")));
}

// Cada avance práctico procede del control real o de una acción terminada.
export function mountCombatTutorial(scene, { onReplayExit } = {}) {
  const course = tutorialCourseFor(scene.mission);
  const plan = COMBAT_LESSONS[onReplayExit ? "basics" : course?.battle || "basics"];
  const parent = scene.game.canvas.parentElement;
  const root = document.createElement("div"); root.className = "combat-tutorial";
  const initialActor = tutorialActor(scene.saveData, "battle", "guardian");
  root.innerHTML = `<div class="tutorial-shade"></div><div class="tutorial-spotlight" aria-hidden="true"></div><div class="tutorial-character-dialogue">${tutorialCharacterMarkup(initialActor)}<section class="tutorial-dialogue-box" role="dialog" aria-labelledby="tutorial-title" aria-describedby="tutorial-copy"><header data-dialogue-speaker>${tutorialSpeakerMarkup(initialActor)}</header><p class="tutorial-kicker"></p><h2 id="tutorial-title"></h2><div class="tutorial-dialogue-body"><p id="tutorial-copy"></p></div><footer><p class="tutorial-hint"></p><button type="button" data-tutorial-next>Continuar</button></footer></section></div><button type="button" class="tutorial-skip" ${onReplayExit ? "data-tutorial-skip" : "data-tutorial-pause"}>${onReplayExit ? "Salir del repaso" : "Pausar formación"}</button>`;
  parent.append(root);
  const presentation = root.querySelector(".tutorial-character-dialogue"), spotlight = root.querySelector(".tutorial-spotlight"), shade = root.querySelector(".tutorial-shade");
  const next = root.querySelector("[data-tutorial-next]"), exit = root.querySelector(".tutorial-skip");
  let active = true, current = null, pending = null, index = 0, phase = "intro", destroyed = false, sealsExplained = false, pauseAwaited = false;
  const ids = [...plan.intro.map(step => step.id), ...plan.actions.flatMap(step => step.kind === "technique" ? [step.id, "preparation", "seals"] : [step.id]), ...(plan === COMBAT_LESSONS.basics ? ["cooldowns"] : []), ...(plan.pause ? ["pause"] : []), "complete"];
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
  const hide = () => { current = null; presentation.hidden = spotlight.hidden = shade.hidden = true; root.classList.remove("is-explaining"); };
  const show = (item, callback) => {
    if (!active || destroyed) return;
    current = item; root.dataset.tutorialStep = item.id;
    root.classList.add("is-explaining"); presentation.hidden = false;
    const actor = tutorialActor(scene.saveData, "battle", item.id === plan.intro[0].id ? "guardian" : "master");
    updateTutorialActor(presentation, actor);
    root.querySelector(".tutorial-kicker").textContent = `PASO ${ids.indexOf(item.id) + 1} DE ${ids.length}`;
    root.querySelector("#tutorial-title").textContent = item.title;
    root.querySelector("#tutorial-copy").textContent = item.id === "affinity" ? affinityTutorialCopy(scene.player.primaryAffinity) : item.copy;
    root.querySelector(".tutorial-hint").textContent = item.practice ? "La lección se acredita al realizar la acción. Puedes pausar o abandonar sin perder las prácticas aprendidas." : "El combate espera mientras lees.";
    next.textContent = item.button || (item.practice ? "Usar el control señalado" : "Continuar"); next.onclick = callback;
    position(); next.focus({ preventScroll: true });
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
    if (pauseAwaited) { pauseAwaited = false; recordBattleLesson(scene, "pause"); const done = pending; pending = null; hide(); done?.(true); }
    position();
  };
  scene.events.on("pause", onPause); scene.events.on("resume", onResume); hide();
  if (course?.battle === "resources" && !onReplayExit && !lessonCompleted(scene.saveData, "potion")) scene.player.hp = Math.max(1, scene.player.maxHp - Math.min(20, Math.round(scene.player.maxHp * .2)));
  if (course?.battle === "statuses" && !onReplayExit) scene.player.statuses.push({ type: "burn", label: "QUEMADURA", duration: 2, power: 2 });
  scene.refreshHud();
  const finishPractice = async () => {
  phase = "outro";
  if (plan === COMBAT_LESSONS.basics) await page({ id: "cooldowns", target: "statuses", title: "Enfriamientos, afinidades y estados", copy: "CD indica las acciones que faltan para reutilizar un movimiento. El aro gris corresponde a Normal, sin ventajas ni pasivas elementales. Los iconos de estado muestran efectos y duración. Aprenderás a consultar el ciclo y a limpiar estados en las próximas misiones." });
  if (plan.pause && active) await new Promise(resolve => {
    pending = resolve; pauseAwaited = true;
    show({ id: "pause", target: "pause", title: "Pausa y reanuda el combate", copy: "Abre la pausa real y pulsa Reanudar. Allí puedes cambiar los sellos manuales, sonido, movimiento y destellos. Abandonar exige confirmación y pierde las recompensas provisionales; los objetos consumidos no regresan.", practice: true, button: "Abrir pausa" }, pause);
  });
  if (active) await page({ id: "complete", title: "Práctica completada", copy: "Tus acciones han quedado registradas. Continúa la misión aplicando lo aprendido. Si pierdes un duelo, dispones de dos reintentos gratuitos; después necesitas un pergamino. Reintentar no devuelve objetos gastados.", button: onReplayExit ? "Volver a la Biblioteca" : "Continuar la misión" });
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
      if (active && step()?.kind === "technique") await page({ id: "preparation", target: "preparation", title: "Preparación: del 80 al 100 %", copy: "El chakra ya se ha pagado. El marcador completa ahora la preparación según tu velocidad y los sellos de la técnica. El rival puede actuar antes de que termine; la iniciativa no cambia este tramo." });
    },
    async seals() {
      if (!active || sealsExplained) return; sealsExplained = true;
      await page({ id: "seals", target: "seals", title: "Completa los sellos de esta técnica", copy: scene.manualSeals ? "Pulsa la letra de la tarjeta iluminada con QWER / ASDF / ZXCV o haz clic en ella. La práctica no tiene reloj. Sin errores: +10 % de daño; más de dos errores lo reducen." : "Tienes sellos automáticos: las tarjetas se completan solas y no conceden la bonificación manual. Puedes cambiarlo en los ajustes de pausa." });
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
