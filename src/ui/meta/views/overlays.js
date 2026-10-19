export function createOverlayView(deps) {
  const controllers = new Set();

  const listen = (target, event, handler, options = {}) => {
    const controller = new AbortController();
    controllers.add(controller);
    target?.addEventListener(event, handler, { ...options, signal: controller.signal });
    return () => { controller.abort(); controllers.delete(controller); };
  };

  const showDialogue = (lines, onComplete, finalLabel = "CONTINUAR", type = "message") => {
    if (!lines.length) { onComplete(); return; }
    let index = 0;
    let previousSpeaker = null;
    let nextSpeakerSide = "left";
    const speakerSides = new Map();
    const location = type === "story" ? deps.root.querySelector("[data-location-stage]") : null;
    const overlay = document.createElement("div");
    overlay.className = `dialogue-overlay dialogue-${type}`;
    const mounted = deps.viewRuntime.mountOverlay(overlay);
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
        const character = npc ? `<div class="story-character story-character-${side} ${entering ? "story-entering" : "story-speaking"}"><img class="${mirrorClass}" src="${npc.image}?v=${deps.assetVersion}" alt="${deps.escapeHtml(npc.name)}" width="1145" height="1374" decoding="async"><span>${deps.escapeHtml(npc.name)}</span></div>` : "";
        overlay.innerHTML = `${character}<section class="story-dialogue-panel"><header>${deps.escapeHtml(speaker)} · ${deps.escapeHtml(role)}</header><p>${deps.escapeHtml(dialogue)}</p><footer><small>${index + 1}/${lines.length}</small><button class="primary-button">${last ? finalLabel : "SIGUIENTE"}</button></footer></section>`;
        previousSpeaker = speaker;
      } else {
        const portrait = npc ? `<div class="dialogue-portrait"><img src="${npc.image}?v=${deps.assetVersion}" alt="${deps.escapeHtml(npc.name)}" width="1145" height="1374" decoding="async"><span>${deps.escapeHtml(npc.title)}</span></div>` : "";
        overlay.innerHTML = `<section class="dialogue-box ${npc ? "with-portrait" : ""}">${portrait}<div class="dialogue-copy"><p class="eyebrow">${deps.escapeHtml(speaker)}</p><p>${deps.escapeHtml(dialogue)}</p><button class="primary-button">${last ? finalLabel : "SIGUIENTE"}</button><small>${index + 1}/${lines.length}</small></div></section>`;
      }
      listen(overlay.querySelector("button"), "click", () => {
        if (!mounted.isCurrent()) return;
        if (!last) { index += 1; draw(); return; }
        if (location) location.classList.remove("story-dialogue-active");
        mounted.remove();
        onComplete();
      }, { once: true });
    };
    draw();
  };

  const showMissionDecision = ({ eyebrow, title, text, options }, onChoice) => {
    const overlay = document.createElement("div");
    overlay.className = "mission-decision-overlay";
    const mounted = deps.viewRuntime.mountOverlay(overlay);
    overlay.innerHTML = `<section class="mission-decision-panel"><p class="eyebrow">${deps.escapeHtml(eyebrow)}</p><h2>${deps.escapeHtml(title)}</h2><p>${deps.escapeHtml(text)}</p><div>${options.map((option) => `<button type="button" data-decision="${option.id}" class="${option.primary ? "primary" : ""}"><strong>${deps.escapeHtml(option.label)}</strong><small>${deps.escapeHtml(option.description)}</small></button>`).join("")}</div></section>`;
    overlay.querySelectorAll("[data-decision]").forEach((button) => listen(button, "click", () => {
      if (!mounted.isCurrent()) return;
      const value = button.dataset.decision;
      mounted.remove();
      onChoice(value);
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

