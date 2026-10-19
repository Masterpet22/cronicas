export function createLocationStage(deps) {
  return {
    id: "location-stage",
    render(locationId, content) {
      const cast = deps.locationCast[locationId] || [];
      const introduced = deps.introducedViews.has(locationId);
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
        <div class="stage-ambient" data-stage-ambient role="status" aria-live="polite" hidden><strong data-ambient-speaker></strong><span data-ambient-text></span></div>
        <div class="stage-options ${introduced ? "ready" : ""}" data-stage-options ${introduced ? "" : "hidden"}>${content}</div>
      </section>`;
    },
    mount(root, scope, locationId) {
      const stage = root.querySelector(`[data-location-stage="${locationId}"]`);
      if (!stage) return;
      const cast = deps.locationCast[locationId] || [];
      const lines = deps.locationDialogue(locationId, "intro");
      const speech = stage.querySelector("[data-stage-speech]");
      const options = stage.querySelector("[data-stage-options]");
      const ambient = stage.querySelector("[data-stage-ambient]");
      let lineIndex = 0;
      let tipTimer = 0;
      let leaveTimer = 0;
      let revealTimer = 0;
      let commentHoverReadyAt = performance.now() + 650;

      const activateSpeaker = (speaker) => {
        const activeIndex = cast.findIndex((id) => deps.npcs[id]?.name === speaker);
        const speakerOnRight = locationId === "dojo" ? activeIndex === 0 : activeIndex > 0;
        stage.classList.toggle("speaker-left", !speakerOnRight);
        stage.classList.toggle("speaker-right", speakerOnRight);
        stage.querySelectorAll("[data-stage-npc]").forEach((button) => button.classList.toggle("active", deps.npcs[button.dataset.stageNpc]?.name === speaker));
      };
      const showTip = (text, npcId = cast[0]) => {
        const npc = deps.npcs[npcId] || deps.npcs[cast[0]];
        if (!npc || !ambient || !stage.isConnected) return;
        window.clearTimeout(tipTimer);
        window.clearTimeout(leaveTimer);
        ambient.querySelector("[data-ambient-speaker]").textContent = `${npc.name} · ${npc.title}`;
        ambient.querySelector("[data-ambient-text]").textContent = text;
        ambient.hidden = false;
        ambient.classList.remove("leaving");
        activateSpeaker(npc.name);
        tipTimer = window.setTimeout(() => {
          if (!ambient.isConnected) return;
          ambient.classList.add("leaving");
          leaveTimer = window.setTimeout(() => { if (ambient.isConnected) ambient.hidden = true; }, 180);
        }, 5200);
      };
      const revealOptions = () => {
        deps.introducedViews.add(locationId);
        speech.classList.add("leaving");
        if (locationId === "kagemori") stage.classList.add("investigation-ready");
        revealTimer = window.setTimeout(() => {
          if (!stage.isConnected) return;
          speech.hidden = true;
          options.hidden = false;
          commentHoverReadyAt = performance.now() + 650;
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
      if (!deps.introducedViews.has(locationId) && lines.length) {
        drawLine();
        scope.listen(speech.querySelector("[data-stage-next]"), "click", () => {
          if (lineIndex < lines.length - 1) { lineIndex += 1; drawLine(); return; }
          revealOptions();
        });
      } else {
        stage.querySelector("[data-stage-npc]")?.classList.add("active");
      }
      stage.querySelectorAll("[data-stage-npc]").forEach((button) => scope.listen(button, "click", () => {
        if (!options.hidden) {
          const guide = deps.npcs[button.dataset.stageNpc]?.guide || [];
          showTip(guide[Math.floor(Math.random() * guide.length)], button.dataset.stageNpc);
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
        window.clearTimeout(tipTimer);
        window.clearTimeout(leaveTimer);
        window.clearTimeout(revealTimer);
      });
    },
    dispose() {}
  };
}

