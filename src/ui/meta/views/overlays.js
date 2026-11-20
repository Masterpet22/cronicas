export function createOverlayView(deps) {
  const controllers = new Set();

  const listen = (target, event, handler, options = {}) => {
    if (!target) return () => {};
    const controller = new AbortController();
    controllers.add(controller);
    target?.addEventListener(event, handler, { ...options, signal: controller.signal });
    return () => { controller.abort(); controllers.delete(controller); };
  };

  const mountOverlay = (overlay, { cancellable = false, modal = false, label = "Preparación de misión", onCancel } = {}, cleanup = () => {}) => {
    const previousFocus = document.activeElement;
    const mounted = deps.viewRuntime.mountOverlay(overlay);
    const subscriptions = [];
    const on = (...args) => subscriptions.push(listen(...args));
    const close = (cancelled = false) => {
      if (!mounted.isCurrent()) return false;
      cleanup();
      subscriptions.splice(0).forEach(unsubscribe => unsubscribe());
      mounted.remove();
      if (cancelled) {
        if (previousFocus?.isConnected) previousFocus.focus();
        onCancel?.();
      }
      return true;
    };
    if (cancellable || modal) {
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-label", label);
      on(overlay, "keydown", (event) => {
        if (!mounted.isCurrent()) return;
        if (event.key === "Escape" && cancellable) {
          event.preventDefault();
          event.stopPropagation();
          close(true);
        }
        if (event.key === "Tab") {
          const buttons = [...overlay.querySelectorAll("button:not([disabled])")];
          const first = buttons[0], last = buttons.at(-1);
          if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
            event.preventDefault();
            (event.shiftKey ? last : first)?.focus();
          }
        }
      });
    }
    return { ...mounted, close, listen: on,
      cancelButton: cancellable ? '<button type="button" class="secondary-button mission-cancel scene-button scene-button-quiet" data-cancel-mission>CANCELAR MISIÓN</button>' : "",
      bindCancel() { on(overlay.querySelector("[data-cancel-mission]"), "click", () => close(true)); }
    };
  };

  const showDialogue = (lines, onComplete, finalLabel = "CONTINUAR", type = "message", options = {}) => {
    if (!lines.length) { onComplete(); return; }
    let index = 0;
    let previousSpeaker = null;
    let nextSpeakerSide = "left";
    const speakerSides = new Map();
    const location = type === "story" ? deps.root.querySelector("[data-location-stage]") : null;
    const overlay = document.createElement("div");
    overlay.className = `dialogue-overlay dialogue-${type}`;
    const mounted = mountOverlay(overlay, options, () => { if (location) location.classList.remove("story-dialogue-active"); });
    if (location) location.classList.add("story-dialogue-active");
    const draw = () => {
      const [speaker, dialogue] = lines[index];
      const last = index === lines.length - 1;
      const npc = deps.npcByName(speaker);
      if (type === "story") {
        const role = npc?.title || "Historia";
        if (!speakerSides.has(speaker)) {
          speakerSides.set(speaker, nextSpeakerSide);
          nextSpeakerSide = nextSpeakerSide === "left" ? "right" : "left";
        }
        const side = speakerSides.get(speaker);
        const entering = previousSpeaker !== speaker;
        const mirrorClass = side === "right" ? "story-character-mirrored" : "";
        overlay.classList.toggle("story-speaker-left", side === "left");
        overlay.classList.toggle("story-speaker-right", side === "right");
        const character = npc ? `<div class="story-character story-character-${side} ${entering ? "story-entering" : "story-speaking"}"><img class="${mirrorClass}" src="${npc.image}?v=${deps.assetVersion}" alt="${deps.escapeHtml(npc.name)}" width="1145" height="1374" decoding="async"></div>` : "";
        overlay.innerHTML = `${character}<section class="story-dialogue-panel scene-panel"><header class="scene-speaker"><strong>${deps.escapeHtml(speaker)}</strong><span>${deps.escapeHtml(role)}</span></header><p aria-live="polite">${deps.escapeHtml(dialogue)}</p><footer><small class="scene-step" aria-label="Parlamento ${index + 1} de ${lines.length}">${index + 1}/${lines.length}</small><div class="dialogue-actions">${mounted.cancelButton}<button type="button" class="primary-button scene-button">${last ? finalLabel : "SIGUIENTE"}</button></div></footer></section>`;
        previousSpeaker = speaker;
      } else {
        const portrait = npc ? `<div class="dialogue-portrait"><img src="${npc.image}?v=${deps.assetVersion}" alt="${deps.escapeHtml(npc.name)}" width="1145" height="1374" decoding="async"><span>${deps.escapeHtml(npc.title)}</span></div>` : "";
        overlay.innerHTML = `<section class="dialogue-box scene-panel ${npc ? "with-portrait" : ""}">${portrait}<div class="dialogue-copy"><header class="scene-speaker"><strong>${deps.escapeHtml(speaker)}</strong></header><p>${deps.escapeHtml(dialogue)}</p>${mounted.cancelButton}<button class="primary-button scene-button">${last ? finalLabel : "SIGUIENTE"}</button><small>${index + 1}/${lines.length}</small></div></section>`;
      }
      mounted.bindCancel();
      const next = overlay.querySelector(".primary-button");
      if (options.cancellable || options.modal) next.focus();
      mounted.listen(next, "click", () => {
        if (!mounted.isCurrent()) return;
        if (!last) { index += 1; draw(); return; }
        if (mounted.close()) onComplete();
      }, { once: true });
    };
    draw();
  };

  const showMissionDecision = ({ eyebrow, title, text, options }, onChoice, controls = {}) => {
    const overlay = document.createElement("div");
    overlay.className = "mission-decision-overlay";
    const mounted = mountOverlay(overlay, controls);
    overlay.innerHTML = `<section class="mission-decision-panel scene-panel">${eyebrow ? `<p class="eyebrow">${deps.escapeHtml(eyebrow)}</p>` : ""}<h2 class="scene-title">${deps.escapeHtml(title)}</h2><p class="scene-copy">${deps.escapeHtml(text)}</p><div class="scene-choices">${options.map((option) => `<button type="button" data-decision="${option.id}" class="scene-choice ${option.primary ? "is-primary" : ""}"><strong>${deps.escapeHtml(option.label)}</strong><small>${deps.escapeHtml(option.description)}</small></button>`).join("")}</div>${mounted.cancelButton}</section>`;
    mounted.bindCancel();
    if (controls.cancellable) overlay.querySelector("[data-decision]")?.focus();
    overlay.querySelectorAll("[data-decision]").forEach((button) => mounted.listen(button, "click", () => {
      if (!mounted.isCurrent()) return;
      const value = button.dataset.decision;
      if (mounted.close()) onChoice(value);
    }, { once: true }));
  };

  return {
    id: "overlays",
    render() { return ""; },
    mount() {},
    showDialogue,
    showMissionDecision,
    dispose() {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    }
  };
}

