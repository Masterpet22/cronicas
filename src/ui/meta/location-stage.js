import { hasIntroduction, locationChangeComment, locationSelectionComment, NPC_IDLE_LINES } from "../../location-conversations.js?v=0.131.0";

export function createLocationStage(deps) {
  let activeSpeech = null;
  return {
    id: "location-stage",
    speak(locationId, text, npcId, options) {
      if (activeSpeech?.locationId === locationId) activeSpeech.showTip(text, npcId, options);
    },
    react(locationId, before, after) {
      if (activeSpeech?.locationId !== locationId) return;
      const text = locationChangeComment(locationId, before, after, activeSpeech.npcId, deps.items);
      if (text) queueMicrotask(() => { if (activeSpeech?.locationId === locationId) activeSpeech.showTip(text); });
    },
    render(locationId, content, options = {}) {
      const cast = options.cast || deps.locationCast[locationId] || [];
      const introduced = (locationId !== "dojo" && deps.introducedViews.has(locationId)) || hasIntroduction(deps.getSave(), locationId, cast);
      const locationName = deps.locations.find((location) => location.id === locationId)?.name || (locationId === "kagemori" ? "Aldea de Kagemori" : locationId);
      const background = deps.locationBackgrounds[locationId] || `assets/locations/${locationId}.webp`;
      const portraits = (locationId === "kagemori" && introduced ? [] : cast).map((id) => {
        const npc = deps.npcs[id];
        const kagemoriPortrait = locationId === "kagemori";
        return `<button class="stage-character" type="button" data-stage-npc="${id}" aria-label="Hablar con ${deps.escapeHtml(npc.name)}"><img src="${npc.image}?v=${deps.assetVersion}" alt="${deps.escapeHtml(npc.name)}" width="${kagemoriPortrait ? 768 : 1145}" height="${kagemoriPortrait ? 1152 : 1374}" loading="eager" fetchpriority="high" decoding="async"><span>${deps.escapeHtml(npc.name)}</span></button>`;
      }).join("");
      const investigationReady = locationId === "kagemori" && introduced ? "investigation-ready" : "";
      return `<section class="location-stage location-${locationId} ${cast.length > 1 ? "has-cast" : ""} ${investigationReady}" data-location-stage="${locationId}" style="--location-bg:url('${background}?v=${deps.assetVersion}')" aria-label="${deps.escapeHtml(locationName)}">
        <div class="stage-characters">${portraits}</div>
        <div class="stage-speech" data-stage-speech aria-live="polite" ${introduced ? "hidden" : ""}><p class="stage-speaker" data-stage-speaker></p><p data-stage-text></p><div><small data-stage-count></small><button class="primary-button" type="button" data-stage-next>SIGUIENTE</button></div></div>
        <div class="stage-ambient" data-stage-ambient role="status" aria-live="polite" hidden><strong data-ambient-speaker></strong><span data-ambient-text></span><div class="stage-ambient-actions" data-ambient-actions role="group" aria-label="Accesos a las actividades" hidden></div></div>
        <div class="stage-options ${introduced ? "ready" : ""}" data-stage-options ${introduced ? "" : "hidden"}>${content}</div>
      </section>`;
    },
    mount(root, scope, locationId) {
      const stage = root.querySelector(`[data-location-stage="${locationId}"]`);
      if (!stage) return;
      const cast = [...stage.querySelectorAll("[data-stage-npc]")].map(button => button.dataset.stageNpc);
      const lines = deps.locationDialogue(locationId, "intro").filter(([speaker]) => cast.some(id => deps.npcs[id]?.name === speaker));
      const speech = stage.querySelector("[data-stage-speech]");
      const options = stage.querySelector("[data-stage-options]");
      const ambient = stage.querySelector("[data-stage-ambient]");
      let lineIndex = 0;
      let tipTimer = 0;
      let leaveTimer = 0;
      let revealTimer = 0;
      let tipActions = [];
      let lastActivity = performance.now();
      let nextIdleAt = lastActivity + 1200;
      let pinned = false;
      let idleIndex = 0;
      let commentHoverReadyAt = performance.now() + 650;

      const activateSpeaker = (speaker) => {
        const activeIndex = cast.findIndex((id) => deps.npcs[id]?.name === speaker);
        const speakerOnRight = activeIndex > 0;
        stage.classList.toggle("speaker-left", !speakerOnRight);
        stage.classList.toggle("speaker-right", speakerOnRight);
        stage.querySelectorAll("[data-stage-npc]").forEach((button) => button.classList.toggle("active", deps.npcs[button.dataset.stageNpc]?.name === speaker));
      };
      const showTip = (text, npcId = cast[0], { persistent = false, actions = [], idle = false } = {}) => {
        const npc = deps.npcs[npcId] || deps.npcs[cast[0]];
        if (!npc || !ambient || !stage.isConnected || options.hidden) return;
        window.clearTimeout(tipTimer);
        window.clearTimeout(leaveTimer);
        pinned = persistent;
        if (!idle) { lastActivity = performance.now(); nextIdleAt = lastActivity + 20000; }
        ambient.querySelector("[data-ambient-speaker]").textContent = `${npc.name} · ${npc.title}`;
        ambient.querySelector("[data-ambient-text]").textContent = text;
        tipActions = actions;
        const controls = ambient.querySelector("[data-ambient-actions]");
        controls.replaceChildren(...actions.map((action, index) => {
          const button = document.createElement("button");
          button.type = "button"; button.dataset.stageAction = index; button.textContent = action.label;
          button.disabled = Boolean(action.disabled);
          return button;
        }));
        controls.hidden = actions.length === 0;
        ambient.classList.toggle("has-actions", actions.length > 0);
        ambient.classList.toggle("has-many-actions", actions.length > 1);
        ambient.querySelector("[data-ambient-text]").tabIndex = actions.length > 1 ? 0 : -1;
        ambient.hidden = false;
        ambient.classList.remove("leaving");
        activateSpeaker(npc.name);
        if (!persistent) tipTimer = window.setTimeout(() => {
          if (!ambient.isConnected) return;
          ambient.classList.add("leaving");
          leaveTimer = window.setTimeout(() => { if (ambient.isConnected) ambient.hidden = true; }, 180);
        }, 5200);
      };
      const speechContext = { locationId, npcId: cast[0], showTip };
      activeSpeech = speechContext;
      const activity = () => { lastActivity = performance.now(); nextIdleAt = lastActivity + 20000; };
      for (const type of ["pointerdown", "pointermove", "keydown", "input", "change", "focusin"]) scope.listen(stage, type, activity);
      scope.listen(stage, "click", event => {
        if (options.hidden || event.target.closest("[data-stage-npc], [data-stage-action]")) return;
        const text = locationSelectionComment(event.target, cast[0]);
        if (text) queueMicrotask(() => { if (activeSpeech?.locationId === locationId) activeSpeech.showTip(text); });
      });
      const idleTimer = window.setInterval(() => {
        if (options.hidden || !speech.hidden || document.hidden || pinned || !stage.isConnected || document.querySelector('[role="dialog"]:not([hidden]), dialog[open], .dialogue-overlay, .mission-decision-overlay, .game-settings[open]')) return;
        if (performance.now() < nextIdleAt) return;
        const npcId = cast[idleIndex % cast.length], idleLines = NPC_IDLE_LINES[npcId];
        if (!idleLines?.length) return;
        const index = Math.floor(idleIndex / cast.length) % idleLines.length;
        idleIndex += 1;
        showTip(idleLines[index], npcId, { idle: true });
        nextIdleAt = performance.now() + 28000;
      }, 1000);
      scope.listen(ambient, "click", event => {
        const button = event.target.closest("[data-stage-action]");
        if (!button || button.disabled) return;
        tipActions[Number(button.dataset.stageAction)]?.onSelect?.();
      });
      const revealOptions = () => {
        deps.introducedViews.add(locationId);
        deps.onIntroduced(locationId, cast);
        speech.classList.add("leaving");
        if (locationId === "kagemori") stage.classList.add("investigation-ready");
        revealTimer = window.setTimeout(() => {
          if (!stage.isConnected) return;
          speech.hidden = true;
          options.hidden = false;
          commentHoverReadyAt = performance.now() + 650;
          nextIdleAt = performance.now() + 1200;
          requestAnimationFrame(() => options.classList.add("ready"));
          if (locationId === "kagemori") stage.querySelector(".stage-characters")?.remove();
        }, 180);
      };
      const drawLine = () => {
        const [speaker, text] = lines[lineIndex];
        const npc = deps.npcByName(speaker);
        speech.querySelector("[data-stage-speaker]").textContent = npc ? `${npc.name} · ${npc.title}` : speaker;
        speech.querySelector("[data-stage-text]").textContent = text;
        speech.querySelector("[data-stage-count]").textContent = `${lineIndex + 1}/${lines.length}`;
        speech.querySelector("[data-stage-next]").textContent = lineIndex === lines.length - 1 ? "VER OPCIONES" : "SIGUIENTE";
        activateSpeaker(speaker);
      };
      if (!speech.hidden && lines.length) {
        drawLine();
        scope.listen(speech.querySelector("[data-stage-next]"), "click", () => {
          if (lineIndex < lines.length - 1) { lineIndex += 1; drawLine(); return; }
          revealOptions();
        });
      } else {
        speech.hidden = true;
        options.hidden = false;
        stage.querySelector("[data-stage-npc]")?.classList.add("active");
      }
      stage.querySelectorAll("[data-stage-npc]").forEach((button) => scope.listen(button, "click", () => {
        if (!options.hidden) {
          const character = deps.npcs[button.dataset.stageNpc];
          const guide = deps.locationDialogue(locationId, "guide").filter(([speaker]) => speaker === character?.name).map(([, text]) => text);
          if (guide.length) showTip(guide[Math.floor(Math.random() * guide.length)], button.dataset.stageNpc);
        }
      }));
      stage.querySelectorAll("[data-comment]").forEach((control) => {
        let shown = false;
        const explain = (event) => {
          if (event.type === "mouseenter" && performance.now() < commentHoverReadyAt) return;
          if (shown || options.hidden) return;
          shown = true;
          showTip(control.dataset.comment, control.dataset.commentNpc || cast[0]);
        };
        scope.listen(control, "mouseenter", explain);
        scope.listen(control, "focusin", explain);
      });
      scope.onCleanup(() => {
        tipActions = [];
        if (activeSpeech === speechContext) activeSpeech = null;
        window.clearTimeout(tipTimer);
        window.clearTimeout(leaveTimer);
        window.clearTimeout(revealTimer);
        window.clearInterval(idleTimer);
      });
    },
    dispose() { activeSpeech = null; }
  };
}

