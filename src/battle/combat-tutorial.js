import { masterIdForCharacter } from "../save.js?v=0.114.0";

// The guide observes real combat actions; it never awards progress or simulates hits.
export function mountCombatTutorial(scene, { onReplayExit } = {}) {
  const parent = scene.game.canvas.parentElement;
  const root = document.createElement("div");
  root.className = "combat-tutorial";
  root.innerHTML = `<div class="tutorial-shade"></div><div class="tutorial-spotlight" aria-hidden="true"></div>
    <section class="tutorial-card" role="dialog" aria-labelledby="tutorial-title" aria-describedby="tutorial-copy">
      <p class="tutorial-kicker"></p><h2 id="tutorial-title"></h2><p id="tutorial-copy"></p>
      <p class="tutorial-hint"></p><div class="tutorial-navigation"><button type="button" data-tutorial-back>Anterior</button><button type="button" data-tutorial-next>Continuar</button></div>
    </section><button type="button" class="tutorial-skip" data-tutorial-skip>${onReplayExit ? "Salir del tutorial" : "Omitir tutorial"}</button>`;
  parent.append(root);
  const card = root.querySelector(".tutorial-card");
  const spotlight = root.querySelector(".tutorial-spotlight");
  const shade = root.querySelector(".tutorial-shade");
  const next = root.querySelector("[data-tutorial-next]");
  const back = root.querySelector("[data-tutorial-back]");
  const skip = root.querySelector("[data-tutorial-skip]");
  let active = true;
  let phase = "intro";
  let pending = null;
  let current = null;
  let expected = null;
  let sealsExplained = false;
  let destroyed = false;
  const master = masterIdForCharacter(scene.saveData.character) === "mei" ? "Mei Hayate" : "Daichi Kazan";
  const technique = scene.actions.find(action => action?.seals?.length);
  const techniqueSlot = scene.actions.indexOf(technique) + 1;
  const canvasRect = ([x, y, w, h]) => {
    const bounds = scene.game.canvas.getBoundingClientRect();
    return { left: bounds.left + x / 960 * bounds.width, top: bounds.top + y / 540 * bounds.height,
      width: w / 960 * bounds.width, height: h / 540 * bounds.height };
  };
  const targetRect = (target) => {
    const compact = parent.querySelector(".combat-access.compact");
    const selector = target?.startsWith("action:") ? `[data-combat-action="${target.split(":")[1]}"]`
      : compact && ({ health: ".combat-access-status:first-child", chakra: ".combat-access-status:first-child", timeline: ".combat-access-progress", preparation: ".combat-access-progress", statuses: ".combat-access-status", pause: ".combat-access-pause" })[target];
    const el = selector && parent.querySelector(selector);
    if (el) return el.getBoundingClientRect();
    if (target === "seals") {
      const bounds = scene.sealLayer.getBounds();
      if (bounds.width && bounds.height) return canvasRect([bounds.x, bounds.y, bounds.width, bounds.height]);
    }
    return canvasRect(({ health: [100, 34, 260, 28], chakra: [100, 62, 260, 29], timeline: [205, 452, 620, 80],
      preparation: [677, 466, 139, 63], seals: [265, 65, 430, 148], statuses: [146, 83, 210, 30], pause: [457, 44, 46, 46] })[target] || [360, 230, 240, 120]);
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
    // Reserve the action column and the highlighted region. Measure the card
    // in CSS pixels so text stays readable when the canvas changes resolution.
    card.style.left = `${Math.max(12, Math.min(bounds.width - card.offsetWidth - 12, bounds.width * 0.49))}px`;
    let cardTop = bounds.height * 0.31;
    if (current.target === "seals") cardTop = rect.bottom - bounds.top + 20;
    card.style.top = `${Math.max(68, Math.min(bounds.height - card.offsetHeight - 14, cardTop))}px`;
  };
  const observer = new ResizeObserver(position);
  observer.observe(parent);
  const hideCard = () => {
    current = null;
    card.hidden = spotlight.hidden = shade.hidden = true;
    root.classList.remove("is-explaining");
  };
  const show = (step, callback, previous = null) => {
    if (!active || destroyed) return;
    current = step;
    root.dataset.tutorialStep = step.id;
    root.classList.add("is-explaining");
    card.hidden = false;
    root.querySelector(".tutorial-kicker").textContent = `${master} · PASO ${step.number} DE 11`;
    root.querySelector("#tutorial-title").textContent = step.title;
    root.querySelector("#tutorial-copy").textContent = step.copy;
    root.querySelector(".tutorial-hint").textContent = step.hint || "El combate espera mientras lees.";
    next.textContent = step.button || "Continuar";
    next.onclick = callback;
    back.hidden = !previous;
    back.onclick = previous;
    position();
    next.focus({ preventScroll: true });
  };
  const page = (step) => new Promise(resolve => {
    if (!active || destroyed) return resolve(false);
    pending = resolve;
    show(step, () => { pending = null; hideCard(); resolve(true); });
  });
  const close = () => {
    active = false;
    expected = null;
    hideCard();
    root.hidden = true;
    pending?.(false);
    pending = null;
  };
  skip.onclick = () => {
    close();
    if (onReplayExit) onReplayExit();
    else {
      scene.setMessage("Tutorial omitido. Puedes repetirlo en la Biblioteca.", "#f0c77c");
      parent.querySelector('[data-combat-action="1"]')?.focus({ preventScroll: true });
    }
  };
  const onKey = event => {
    if (!active || destroyed || scene.scene.isPaused()) return;
    if (event.key === "Escape") {
      event.preventDefault(); event.stopImmediatePropagation(); skip.click(); return;
    }
    if (current && event.key === "Tab") {
      const controls = [back, next, skip].filter(button => !button.hidden);
      const index = controls.indexOf(document.activeElement);
      event.preventDefault();
      controls[(index + (event.shiftKey ? controls.length - 1 : 1)) % controls.length].focus();
    }
  };
  document.addEventListener("keydown", onKey, true);
  const onPause = () => { root.hidden = true; };
  const onResume = () => { root.hidden = !active; position(); };
  scene.events.on("pause", onPause);
  scene.events.on("resume", onResume);
  hideCard();
  const intro = [
    { id: "welcome", number: 1, title: "Tu primer combate, paso a paso", copy: "Te acompañaré sobre el campo de batalla. Primero conocerás la interfaz; después practicarás un golpe, una guardia y una técnica con sellos.", hint: "Durante la práctica nadie cae. Puedes omitir con el botón o Escape y repetir la guía en la Biblioteca.", button: "Comenzar tutorial" },
    { id: "health", number: 2, target: "health", title: "Vida · resiste hasta el final", copy: "Esta es tu vida (PV). Cada impacto recibido la reduce. Si llega a cero, fallas la misión. La barra del lado derecho pertenece al rival: vacíala para vencerlo." },
    { id: "chakra", number: 3, target: "chakra", title: "Chakra · el coste de tus técnicas", copy: "La barra azul muestra tu chakra (CH). Cada técnica indica su coste: si no tienes suficiente, no podrás usarla. Golpe veloz y Guardia cuestan 0 CH. Al terminar tu acción recuperas 8 CH; Guardia añade otros 12 CH." },
    { id: "timeline", number: 4, target: "timeline", title: "Velocidad · quién actúa primero", copy: "Los dos retratos avanzan por esta barra según la velocidad de cada combatiente. Al alcanzar el 80 %, eliges tu acción y el tiempo se detiene para decidir. Golpe veloz y Guardia se ejecutan entonces; una técnica con sellos debe completar el tramo del 80 al 100 %.", hint: "Observa ahora cómo avanzan los retratos. Te avisaré cuando puedas elegir.", button: "Observar la barra" }
  ];
  const outro = [
    { id: "cooldowns", number: 10, target: `action:${techniqueSlot}`, title: "Enfriamiento, afinidades y estados", copy: "CD indica cuántos turnos faltan para reutilizar una técnica. Los elementos pueden aprovechar una debilidad o causar estados como quemadura o sellado; los iconos bajo las barras permiten consultar esos efectos. En el Dojo puedes preparar hasta cuatro técnicas, según tu nivel." },
    { id: "complete", number: 11, target: "pause", title: "Ya conoces lo esencial", copy: "Combina golpe, guardia y técnicas según tu chakra y el ritmo del rival. Escape o el botón de pausa abren los ajustes, incluido el modo de sellos manuales o automáticos.", hint: onReplayExit ? "Entrenamiento de repaso completado. Tu progreso y tus recompensas se conservan." : "Continúa los tres duelos de la misión. La guía queda disponible en Biblioteca → Tutorial de combate.", button: onReplayExit ? "Volver a la Biblioteca" : "Continuar la misión" }
  ];
  return {
    get active() { return active; },
    get sealPractice() { return active && sealsExplained && phase === "technique"; },
    async start() {
      if (!active || destroyed) return;
      await new Promise(resolve => {
        let index = 0;
        const render = () => {
          pending = resolve;
          show(intro[index], () => {
            if (++index < intro.length) render();
            else { pending = null; hideCard(); resolve(); }
          }, index ? () => { index -= 1; render(); } : null);
        };
        render();
      });
      if (active) phase = "strike";
    },
    canUse(action) { return !active || expected === action.id; },
    onReady() {
      if (!active || phase === "intro") return;
      const action = phase === "strike" ? scene.actions[0] : phase === "guard" ? scene.actions[5] : technique;
      if (!action) return;
      expected = action.id;
      const slot = scene.actions.indexOf(action) + 1;
      const step = phase === "strike"
        ? { id: "strike", number: 5, title: "Prueba Golpe veloz", copy: "Has alcanzado el 80 %. Elige el golpe resaltado o pulsa 1: no consume chakra ni requiere sellos y se ejecuta sin preparación." }
        : phase === "guard"
          ? { id: "guard", number: 6, title: "Ahora prepara Guardia", copy: "Elige Guardia o pulsa 6. Reduce a la mitad el próximo impacto y recupera 12 CH adicionales. Es una forma de resistir mientras recuperas recursos." }
          : { id: "technique", number: 7, title: "Usa una técnica elemental", copy: `Elige ${action.name} o pulsa ${slot}. Consume ${scene.actionCost(action)} CH. Después de elegirla, tu retrato recorrerá la zona de preparación; el rival puede actuar antes de que termines.${scene.practiceTechnique ? " Te presto esta técnica para la práctica: tu equipo se conserva." : ""}` };
      show({ ...step, target: `action:${slot}`, hint: "Práctica guiada: usa la acción resaltada. También puedes omitir la guía.", button: `Usar ${action.name}` }, () => scene.useJutsu(action));
    },
    selected() { if (active) { expected = null; hideCard(); } },
    async preparation() {
      if (!active || phase !== "technique") return;
      await page({ id: "preparation", number: 8, target: "preparation", title: "Del 80 al 100 % · preparación", copy: "El chakra ya se ha consumido y la técnica está elegida. Tu marcador debe llegar al final de esta zona antes de ejecutar los sellos. La velocidad de la técnica modifica el tiempo de preparación.", button: "Preparar la técnica" });
    },
    async seals() {
      if (!active || sealsExplained) return;
      sealsExplained = true;
      await page({ id: "seals", number: 9, target: "seals", title: "Sellos · sigue la tarjeta iluminada", copy: scene.manualSeals
        ? "Las tarjetas muestran el orden de esta ejecución. Pulsa la letra indicada (QWER / ASDF / ZXCV) o toca la tarjeta iluminada. En esta práctica no hay límite de tiempo. Una secuencia sin errores da +10 % de daño; más de dos errores reducen el daño."
        : "Tienes activados los sellos automáticos: las tarjetas se completan solas, sin bonificación. En modo manual pulsas la letra indicada o la tarjeta iluminada. Puedes cambiar el modo desde los ajustes de pausa.", button: scene.manualSeals ? "Practicar los sellos" : "Ver los sellos automáticos" });
    },
    async afterAction() {
      if (!active) return;
      if (phase === "strike") phase = "guard";
      else if (phase === "guard") phase = "technique";
      else if (phase === "technique") {
        for (const step of outro) { if (!active) break; await page(step); }
        const completed = active;
        close();
        if (completed && onReplayExit) onReplayExit();
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      close();
      observer.disconnect();
      document.removeEventListener("keydown", onKey, true);
      scene.events.off("pause", onPause);
      scene.events.off("resume", onResume);
      root.remove();
    }
  };
}
