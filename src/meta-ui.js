import { fighterPreviewSvg, playerFighterAppearance } from "./character.js?v=0.62.0";
import { ENEMY_ACTIONS, ENEMY_ROSTER, EQUIPMENT, JUTSU_LIBRARY, MISSIONS, SECONDARY_MISSIONS, STORY_SAGAS } from "./data.js?v=0.66.0";
import { getDialogue } from "./dialogues.js?v=0.66.0";
import { missionHasStep, missionState, missionStep, missionsForBoard, nextAvailableMission } from "./mission-system.js?v=0.67.0";
import { LOCATION_CAST, NPCS, locationDialogue, npcByName, npcName } from "./npcs.js?v=0.66.0";
import { DEBUG_CHECKPOINTS, activeSaveSlot, affinityXpForElement, applyDebugCheckpoint, cancelDoctorMission, chooseDoctorMissionRoute, chooseHideoutEntrance, completeDoctorMission, createCharacter, deleteSaveSlot, deliverBestiaryBook, derivedStats, isTechniqueLearned, listSaveSlots, loadoutSlotsForLevel, markSecondaryMissionCompleted, masterIdForCharacter, normalizeSave, resolveDoctorRiverPassage, selectMaster, selectNextAffinity, selectSaveSlot, spendAttribute, startDoctorMission, writeSave, xpForNextLevel } from "./save.js?v=0.66.0";
import { createViewRuntime } from "./view-runtime.js?v=0.66.0";
import { BASIC_ELEMENT_IDS, ELEMENTS, ELEMENT_RANK_LABELS, basicRequirements, canAccessElement, elementIcon, elementName } from "./elements.js?v=0.20.0";
import { AFFINITY_CONFIG, availableAffinitySlots } from "./affinity-system.js?v=0.58.0";
import { DOCTOR_ROUTE_DEFINITIONS, RIVER_PASSAGES } from "./doctor-mission.js?v=0.60.0";
import { secondaryMissionByType, secondaryMissionCardModel } from "./secondary-missions.js?v=0.66.0";
import { createDebugToolsView } from "./ui/meta/views/debug-tools.js?v=0.67.0";
import { createArchiveView } from "./ui/meta/views/archive.js?v=0.67.0";
import { createDojoView } from "./ui/meta/views/dojo.js?v=0.67.0";
import { createMissionBoardsView } from "./ui/meta/views/mission-boards.js?v=0.67.0";
import { createVillageView, VILLAGE_LOCATIONS } from "./ui/meta/views/village.js?v=0.67.0";
export { VILLAGE_LOCATIONS };
const masterForCharacter = (character) => NPCS[masterIdForCharacter(character)];

const ASSET_VERSION = "0.21.0";
const LOCATION_BACKGROUNDS = { kagemori: "assets/locations/kagemori.webp" };
const warmedImages = new Map();

function warmImage(src) {
  if (warmedImages.has(src)) return warmedImages.get(src);
  const request = new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(true);
    image.onerror = () => {
      warmedImages.delete(src);
      resolve(false);
    };
    image.src = src;
  });
  warmedImages.set(src, request);
  return request;
}

function warmLocationAssets(locationId) {
  const background = LOCATION_BACKGROUNDS[locationId] || `assets/locations/${locationId}.webp`;
  return Promise.all([
    warmImage(`${background}?v=${ASSET_VERSION}`),
    ...(LOCATION_CAST[locationId] || []).map((id) => warmImage(`${NPCS[id].image}?v=${ASSET_VERSION}`))
  ]);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

export function mountMetaUI(root, initialSave, onStartMission, onFinishSecondaryMission) {
  let save = initialSave;
  let view = "plaza";
  const viewRuntime = createViewRuntime(root);
  let viewScope = null;
  let choosingSaveSlot = (() => {
    try { return sessionStorage.getItem("cronicas-save-slot-selected") !== "1"; } catch (_) { return true; }
  })();
  let activeDojoTab = "equipment";
  let debugSnapshot = null;
  let selectedSagaId = null;
  const introducedViews = new Set();
  const investigatedClues = new Set();
  const villageView = createVillageView({
    mainMissions: MISSIONS,
    secondaryMissions: SECONDARY_MISSIONS,
    missionState,
    nextAvailableMission,
    secondaryMissionByType,
    masterForCharacter,
    escapeHtml,
    assetVersion: ASSET_VERSION,
    npcs: NPCS,
    locationCast: LOCATION_CAST,
    warmImage,
    showDialogue: (...args) => showDialogue(...args),
    onMissionNoticesSeen(ids) {
      save = writeSave({ ...save, campaign: { ...save.campaign, seenMissionNotices: [...new Set([...save.campaign.seenMissionNotices, ...ids])] } });
      return save;
    },
    onTutorialComplete() {
      save = writeSave({ ...save, campaign: { ...save.campaign, tutorialSeen: true } });
      view = "headquarters";
      introducedViews.add("headquarters");
      render();
    }
  });
  const debugToolsView = createDebugToolsView({
    checkpoints: DEBUG_CHECKPOINTS,
    missions: STORY_SAGAS.flatMap((saga) => saga.missionIds.map((id) => MISSIONS.find((mission) => mission.id === id)).filter(Boolean)),
    escapeHtml,
    onCheckpoint(checkpointId) {
      save = writeSave(applyDebugCheckpoint(save, checkpointId));
      introducedViews.clear();
      investigatedClues.clear();
      renderDebugTools();
    },
    onNavigate(nextView) {
      view = nextView;
      introducedViews.add(view);
      render();
    },
    onChoice(choice) {
      save = writeSave(normalizeSave({
        ...save,
        campaign: {
          ...save.campaign,
          banditPrisonerChoice: choice === "clear" ? null : choice,
          nextSideMissionGoldMultiplier: choice === "interrogate" ? 2 : 1
        }
      }));
      renderDebugTools();
    },
    onMission(missionId) {
      const mission = MISSIONS.find((entry) => entry.id === missionId);
      if (mission && !mission.comingSoon) onStartMission(save, mission);
    },
    onRestore() {
      if (!debugSnapshot) return;
      save = writeSave(normalizeSave(JSON.parse(debugSnapshot)));
      debugSnapshot = null;
      introducedViews.clear();
      investigatedClues.clear();
      view = "plaza";
      render();
    }
  });
  const sagaMissions = STORY_SAGAS.flatMap((saga) => saga.missionIds.map((id) => MISSIONS.find((mission) => mission.id === id)).filter(Boolean));
  const archiveView = createArchiveView({
    missions: sagaMissions,
    enemyRoster: ENEMY_ROSTER,
    enemyActions: ENEMY_ACTIONS,
    elementName,
    escapeHtml,
    showDialogue: (...args) => showDialogue(...args),
    onDeliverBook() {
      save = writeSave(deliverBestiaryBook(save));
      introducedViews.add("archive");
      renderArchive();
    }
  });
  const dojoView = createDojoView({
    assetVersion: ASSET_VERSION,
    affinityConfig: AFFINITY_CONFIG,
    elements: ELEMENTS,
    elementRankLabels: ELEMENT_RANK_LABELS,
    equipment: EQUIPMENT,
    jutsus: JUTSU_LIBRARY,
    npcs: NPCS,
    affinityXpForElement,
    availableAffinitySlots,
    basicRequirements,
    canAccessElement,
    derivedStats,
    elementIcon,
    elementName,
    fighterPreviewSvg,
    isTechniqueLearned,
    loadoutSlotsForLevel,
    masterIdForCharacter,
    playerFighterAppearance,
    selectMaster,
    selectNextAffinity,
    spendAttribute,
    xpForNextLevel,
    onPersist(next) { save = writeSave(next); return save; },
    onTabSelected(tabId) { activeDojoTab = tabId; },
    onRerender: () => renderDojo()
  });
  const missionBoardsView = createMissionBoardsView({
    mainMissions: MISSIONS,
    secondaryMissions: SECONDARY_MISSIONS,
    sagas: STORY_SAGAS,
    enemyActions: ENEMY_ACTIONS,
    enemyRoster: ENEMY_ROSTER,
    doctorRouteDefinitions: DOCTOR_ROUTE_DEFINITIONS,
    riverPassages: RIVER_PASSAGES,
    elementName,
    escapeHtml,
    getDialogue,
    masterForCharacter,
    missionHasStep,
    missionState,
    missionStep,
    missionsForBoard,
    npcName,
    secondaryMissionByType,
    secondaryMissionCardModel,
    warmLocationAssets,
    showDialogue: (...args) => showDialogue(...args),
    showMissionDecision: (...args) => showMissionDecision(...args),
    onSagaSelected(sagaId) { selectedSagaId = sagaId; renderStoryMissions(); },
    onStartMission,
    onChooseHideoutEntrance(currentSave, choice) { save = writeSave(chooseHideoutEntrance(currentSave, choice)); return save; },
    onStartDoctorMission(currentSave, mission) { save = writeSave(startDoctorMission(currentSave, mission)); return save; },
    onCompleteInvestigation(currentSave, mission, clues) {
      save = markSecondaryMissionCompleted(currentSave, mission);
      onFinishSecondaryMission(save, mission, { outcome: "completed", clues });
    },
    onCompleteDoctor(currentSave, mission) {
      const routeStats = { ...currentSave.campaign.doctorRoute };
      const completion = completeDoctorMission(currentSave, mission);
      save = writeSave(completion.save);
      onFinishSecondaryMission(save, mission, { outcome: "completed", routeStats, rewards: { xp: completion.xp, affinityXp: completion.affinityXp, coins: completion.coins, supplyBonus: completion.supplyBonus } });
    },
    onChooseDoctorRoute(currentSave, routeId) { save = writeSave(chooseDoctorMissionRoute(currentSave, routeId)); return save; },
    onResolveRiverPassage(currentSave, passageId) { save = writeSave(resolveDoctorRiverPassage(currentSave, passageId)); return save; },
    onRerender: () => renderDoctorRoute()
  });

  const persist = (next, shouldRender = true) => {
    save = writeSave(next);
    if (shouldRender) render();
  };

  const renderSaveSlots = () => {
    const selectedSlot = activeSaveSlot();
    const cards = listSaveSlots().map(({ slot, save: slotSave }) => {
      if (!slotSave?.character) return `
        <article class="save-slot empty">
          <span class="save-slot-number">PARTIDA ${slot}</span>
          <div class="save-slot-empty" aria-hidden="true">＋</div>
          <h3>Nueva partida</h3>
          <p>Crea un combatiente y comienza una historia independiente.</p>
          <button class="primary-button" type="button" data-select-slot="${slot}">CREAR PARTIDA</button>
        </article>`;
      const completed = slotSave.campaign.completedMissions.length;
      return `
        <article class="save-slot ${slot === selectedSlot ? "active" : ""}">
          <span class="save-slot-number">PARTIDA ${slot}${slot === selectedSlot ? " · ACTIVA" : ""}</span>
          <span class="save-slot-avatar" style="--slot-color:${slotSave.character.appearance}">${escapeHtml(slotSave.character.name.slice(0, 1))}</span>
          <h3>${escapeHtml(slotSave.character.name)}</h3>
          <p>${escapeHtml(slotSave.campaign.rank)} · Nivel ${slotSave.progression.level} · ${completed} ${completed === 1 ? "misión" : "misiones"}</p>
          <div class="save-slot-actions"><button class="primary-button" type="button" data-select-slot="${slot}">CONTINUAR</button><button class="save-slot-delete" type="button" data-delete-slot="${slot}" aria-label="Borrar partida ${slot}">BORRAR</button></div>
        </article>`;
    }).join("");
    viewScope = viewRuntime.replace("save-slots", `<section class="save-selector"><p class="eyebrow">CRÓNICAS DEL SELLO</p><h2>Elige una partida</h2><p class="lead">Puedes mantener hasta tres historias independientes. El cuerpo y el maestro se fijan al crear cada combatiente.</p><div class="save-slot-grid">${cards}</div></section>`);
    root.querySelectorAll("[data-select-slot]").forEach((button) => button.addEventListener("click", () => {
      save = selectSaveSlot(button.dataset.selectSlot);
      choosingSaveSlot = false;
      try { sessionStorage.setItem("cronicas-save-slot-selected", "1"); } catch (_) { /* La selección seguirá activa durante esta vista. */ }
      view = save.character ? "plaza" : "headquarters";
      render();
    }));
    root.querySelectorAll("[data-delete-slot]").forEach((button) => button.addEventListener("click", () => {
      const slot = Number(button.dataset.deleteSlot);
      const slotState = listSaveSlots().find((entry) => entry.slot === slot)?.save;
      if (!slotState?.character || !window.confirm(`¿Borrar definitivamente la partida de ${slotState.character.name}?`)) return;
      deleteSaveSlot(slot);
      if (slot === activeSaveSlot()) save = selectSaveSlot(slot);
      renderSaveSlots();
    }));
  };

  const renderCreator = () => {
    const affinityChoices = BASIC_ELEMENT_IDS.map((id, index) => `<label class="affinity-choice"><input type="radio" name="affinity" value="${id}" ${index === 0 ? "checked" : ""}><img src="${elementIcon(id)}" alt="" width="512" height="512"><span><strong>${elementName(id)}</strong><small>Afinidad básica</small></span></label>`).join("");
    viewScope = viewRuntime.replace("character-creator", `
      <section class="dojo-card creator-card">
        <p class="eyebrow">PRIMER PASO</p><h2>Crea tu combatiente</h2>
        <p class="lead">Comienzas con una afinidad básica. Los rangos 2 y 3 abrirán nuevos espacios y combinaciones.</p>
        <form id="character-form" class="creator-form">
          <label>Nombre<input name="name" maxlength="18" value="Akio" required></label>
          <fieldset class="affinity-picker"><legend>Afinidad inicial</legend>${affinityChoices}</fieldset>
          <label>Tipo de cuerpo<select name="bodyType"><option value="male">Masculino</option><option value="female">Femenino</option></select><small>Esta elección queda fija para esta partida.</small></label>
          <label>Peinado<select name="hair"><option value="1">Corto</option><option value="2">Largo</option><option value="3">Puntiagudo</option><option value="4">Coleta</option><option value="5">Ninja</option></select></label>
          <label>Color principal y aura<input name="appearance" type="color" value="#68a8ff"></label>
          <div class="creator-actions"><button class="primary-button" type="submit">CREAR PERSONAJE</button><button class="secondary-button" type="button" data-back-to-slots>VOLVER A PARTIDAS</button></div>
        </form>
      </section>`);
    root.querySelector("#character-form").addEventListener("submit", (event) => {
      event.preventDefault();
      save = writeSave(createCharacter(save, Object.fromEntries(new FormData(event.currentTarget))));
      view = "headquarters";
      introducedViews.add("headquarters");
      render();
      showDialogue(welcomeDialogue(save.character), () => {
        save.campaign.tutorialSeen = true;
        persist(save);
      }, "VER SAGAS", "story");
    });
    root.querySelector("[data-back-to-slots]")?.addEventListener("click", () => {
      choosingSaveSlot = true;
      render();
    });
  };

  const shell = (content) => {
    const { character, progression, campaign } = save;
    const visibleStoryMissionIds = STORY_SAGAS.flatMap((saga) => saga.missionIds);
    const currentLocation = VILLAGE_LOCATIONS.find((location) => location.id === view)
      || (view === "kagemori" ? { name: "Aldea de Kagemori" } : view === "doctor-route" ? { name: "Caminos del Norte" } : view === "debug" ? { name: "Herramientas de pruebas" } : null);
    const isSecondaryField = view === "kagemori" || view === "doctor-route";
    const navigation = view === "plaza" ? "" : `<nav class="village-nav village-return" aria-label="Navegación de la aldea"><button ${isSecondaryField ? "data-abandon-secondary" : "data-view=\"plaza\""}>← ${isSecondaryField ? "Abandonar misión" : "Volver al mapa"}</button><span>${escapeHtml(currentLocation?.name || "Aldea del Horizonte")}</span></nav>`;
    viewScope = viewRuntime.replace(view, `
      <div class="village-shell">
        <section class="village-topbar">
          <div class="profile-heading">
            <span class="avatar-swatch" style="--avatar:${character.appearance}"></span>
            <div class="profile-copy"><p class="eyebrow">${campaign.rank.toUpperCase()}</p><h2>${escapeHtml(character.name)}</h2></div>
            <strong class="level-chip">Nivel ${progression.level}</strong>
          </div>
          <div class="campaign-summary">
            <span class="summary-item"><b aria-hidden="true">★</b><strong>${progression.xp}/${xpForNextLevel(progression.level)}</strong><small>PX</small></span>
            <span class="summary-item"><b aria-hidden="true">▣</b><strong>${progression.coins}</strong><small>monedas</small></span>
            <span class="summary-item"><b aria-hidden="true">♛</b><strong>${campaign.completedMissions.filter((id) => visibleStoryMissionIds.includes(id)).length}/${visibleStoryMissionIds.length}</strong><small>misiones</small></span>
          </div>
          <button class="player-settings-trigger" type="button" aria-label="Abrir ajustes" aria-expanded="false">
            <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 4 39 24 60 18 44 32 60 46 39 40 32 60 25 40 4 46 20 32 4 18 25 24Z"/><circle cx="32" cy="32" r="6"/></svg>
          </button>
          <button class="save-slots-trigger" type="button" aria-label="Cambiar de partida">PARTIDAS</button>
          <!-- RELEASE-BLOCKER 1.0: eliminar este acceso y todo renderDebugTools antes de publicar la versión final. -->
          <button class="debug-tools-trigger" type="button" aria-label="Abrir herramientas de pruebas">PRUEBAS</button>
        </section>
        ${navigation}
        ${content}
      </div>`);
    const settingsDetails = document.querySelector(".game-settings");
    const settingsTrigger = root.querySelector(".player-settings-trigger");
    if (settingsTrigger && settingsDetails) {
      let closeSettingsTimer = 0;

      const openSettings = () => {
        window.clearTimeout(closeSettingsTimer);
        settingsDetails.classList.remove("is-closing");
        settingsDetails.open = true;
        settingsTrigger.setAttribute("aria-expanded", "true");
      };

      const closeSettings = () => {
        if (!settingsDetails.open) return;
        settingsDetails.classList.add("is-closing");
        settingsTrigger.setAttribute("aria-expanded", "false");
        closeSettingsTimer = window.setTimeout(() => {
          settingsDetails.open = false;
          settingsDetails.classList.remove("is-closing");
        }, 280);
      };

      settingsTrigger.setAttribute("aria-expanded", settingsDetails.open ? "true" : "false");
      settingsTrigger.addEventListener("click", () => {
        if (settingsDetails.open && !settingsDetails.classList.contains("is-closing")) closeSettings();
        else openSettings();
      });
      settingsDetails.addEventListener("toggle", () => {
        if (settingsTrigger.isConnected) settingsTrigger.setAttribute("aria-expanded", settingsDetails.open ? "true" : "false");
      }, { signal: viewScope.signal });
      viewScope.onCleanup(() => window.clearTimeout(closeSettingsTimer));
    }

    root.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
      document.querySelector(".game-settings")?.removeAttribute("open");
      view = button.dataset.view;
      render();
    }));
    root.querySelector(".save-slots-trigger")?.addEventListener("click", () => {
      document.querySelector(".game-settings")?.removeAttribute("open");
      choosingSaveSlot = true;
      render();
    });
    root.querySelector(".debug-tools-trigger")?.addEventListener("click", () => {
      document.querySelector(".game-settings")?.removeAttribute("open");
      if (!debugSnapshot) debugSnapshot = JSON.stringify(save);
      view = "debug";
      render();
    });
    root.querySelector("[data-abandon-secondary]")?.addEventListener("click", () => {
      const mission = view === "doctor-route" ? SECONDARY_MISSIONS[1] : SECONDARY_MISSIONS[0];
      const routeStats = { ...save.campaign.doctorRoute };
      if (view === "doctor-route") save = writeSave(cancelDoctorMission(save));
      onFinishSecondaryMission(save, mission, { outcome: "abandoned", clues: investigatedClues.size, routeStats });
    });
    root.querySelectorAll("[data-go]").forEach((button) => {
      const openLocation = () => {
        view = button.dataset.go;
        render();
      };
      button.addEventListener("click", openLocation);
      if (button.classList.contains("village-hotspot")) {
        button.addEventListener("mouseenter", () => warmLocationAssets(button.dataset.go), { once: true });
        button.addEventListener("focus", () => warmLocationAssets(button.dataset.go), { once: true });
        const label = root.querySelector(`[data-map-label="${button.dataset.go}"]`);
        const showLabel = () => label?.classList.add("visible");
        const hideLabel = () => label?.classList.remove("visible");
        button.addEventListener("mouseenter", showLabel);
        button.addEventListener("mouseleave", hideLabel);
        button.addEventListener("focus", showLabel);
        button.addEventListener("blur", hideLabel);
        button.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          openLocation();
        });
      }
    });
  };

  const showDialogue = (lines, onComplete, finalLabel = "CONTINUAR", type = "message") => {
    if (!lines.length) { onComplete(); return; }
    let index = 0;
    let previousSpeaker = null;
    let nextSpeakerSide = "left";
    const speakerSides = new Map();
    const location = type === "story" ? root.querySelector("[data-location-stage]") : null;
    const overlay = document.createElement("div");
    overlay.className = `dialogue-overlay dialogue-${type}`;
    const mounted = viewRuntime.mountOverlay(overlay);
    if (location) location.classList.add("story-dialogue-active");
    const draw = () => {
      const [speaker, dialogue] = lines[index];
      const last = index === lines.length - 1;
      const npc = npcByName(speaker);
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
        const character = npc ? `<div class="story-character story-character-${side} ${entering ? "story-entering" : "story-speaking"}"><img class="${mirrorClass}" src="${npc.image}?v=${ASSET_VERSION}" alt="${escapeHtml(npc.name)}" width="1145" height="1374" decoding="async"><span>${escapeHtml(npc.name)}</span></div>` : "";
        overlay.innerHTML = `${character}<section class="story-dialogue-panel"><header>${escapeHtml(speaker)} · ${escapeHtml(role)}</header><p>${escapeHtml(dialogue)}</p><footer><small>${index + 1}/${lines.length}</small><button class="primary-button">${last ? finalLabel : "SIGUIENTE"}</button></footer></section>`;
        previousSpeaker = speaker;
      } else {
        const portrait = npc ? `<div class="dialogue-portrait"><img src="${npc.image}?v=${ASSET_VERSION}" alt="${escapeHtml(npc.name)}" width="1145" height="1374" decoding="async"><span>${escapeHtml(npc.title)}</span></div>` : "";
        overlay.innerHTML = `<section class="dialogue-box ${npc ? "with-portrait" : ""}">${portrait}<div class="dialogue-copy"><p class="eyebrow">${escapeHtml(speaker)}</p><p>${escapeHtml(dialogue)}</p><button class="primary-button">${last ? finalLabel : "SIGUIENTE"}</button><small>${index + 1}/${lines.length}</small></div></section>`;
      }
      overlay.querySelector("button").addEventListener("click", () => {
        if (!mounted.isCurrent()) return;
        if (!last) { index += 1; draw(); return; }
        if (location) location.classList.remove("story-dialogue-active");
        mounted.remove();
        onComplete();
      });
    };
    draw();
  };

  const showMissionDecision = ({ eyebrow, title, text, options }, onChoice) => {
    const overlay = document.createElement("div");
    overlay.className = "mission-decision-overlay";
    const mounted = viewRuntime.mountOverlay(overlay);
    overlay.innerHTML = `<section class="mission-decision-panel"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p><div>${options.map((option) => `<button type="button" data-decision="${option.id}" class="${option.primary ? "primary" : ""}"><strong>${escapeHtml(option.label)}</strong><small>${escapeHtml(option.description)}</small></button>`).join("")}</div></section>`;
    overlay.querySelectorAll("[data-decision]").forEach((button) => button.addEventListener("click", () => {
      if (!mounted.isCurrent()) return;
      const value = button.dataset.decision;
      mounted.remove();
      onChoice(value);
    }));
  };

  const locationStage = (locationId, content) => {
    const cast = LOCATION_CAST[locationId] || [];
    const introduced = introducedViews.has(locationId);
    const locationName = VILLAGE_LOCATIONS.find((location) => location.id === locationId)?.name || (locationId === "kagemori" ? "Aldea de Kagemori" : locationId);
    const background = LOCATION_BACKGROUNDS[locationId] || `assets/locations/${locationId}.webp`;
    const portraits = (locationId === "kagemori" && introduced ? [] : cast).map((id) => {
      const npc = NPCS[id];
      const kagemoriPortrait = locationId === "kagemori";
      return `<button class="stage-character" type="button" data-stage-npc="${id}" aria-label="Hablar con ${escapeHtml(npc.name)}"><img src="${npc.image}?v=${ASSET_VERSION}" alt="${escapeHtml(npc.name)}" width="${kagemoriPortrait ? 768 : 1145}" height="${kagemoriPortrait ? 1152 : 1374}" loading="eager" fetchpriority="high" decoding="async"><span>${escapeHtml(npc.name)}</span></button>`;
    }).join("");
    const investigationReady = locationId === "kagemori" && introduced ? "investigation-ready" : "";
    return `<section class="location-stage location-${locationId} ${cast.length > 1 ? "has-cast" : ""} ${investigationReady}" data-location-stage="${locationId}" style="--location-bg:url('${background}?v=${ASSET_VERSION}')" aria-label="${escapeHtml(locationName)}">
      <div class="stage-characters">${portraits}</div>
      <div class="stage-speech" data-stage-speech aria-live="polite" ${introduced ? "hidden" : ""}><p class="stage-speaker" data-stage-speaker></p><p data-stage-text></p><div><small data-stage-count></small><button class="primary-button" type="button" data-stage-next>SIGUIENTE</button></div></div>
      <div class="stage-ambient" data-stage-ambient role="status" aria-live="polite" hidden><strong data-ambient-speaker></strong><span data-ambient-text></span></div>
      <div class="stage-options ${introduced ? "ready" : ""}" data-stage-options ${introduced ? "" : "hidden"}>${content}</div>
    </section>`;
  };

  const bindLocationStage = (locationId) => {
    const stage = root.querySelector(`[data-location-stage="${locationId}"]`);
    if (!stage) return;
    const cast = LOCATION_CAST[locationId] || [];
    const lines = locationDialogue(locationId, "intro");
    const speech = stage.querySelector("[data-stage-speech]");
    const options = stage.querySelector("[data-stage-options]");
    const ambient = stage.querySelector("[data-stage-ambient]");
    let lineIndex = 0;
    let tipTimer = 0;
    let commentHoverReadyAt = performance.now() + 650;

    const activateSpeaker = (speaker) => {
      const activeIndex = cast.findIndex((id) => NPCS[id]?.name === speaker);
      const speakerOnRight = locationId === "dojo" ? activeIndex === 0 : activeIndex > 0;
      stage.classList.toggle("speaker-left", !speakerOnRight);
      stage.classList.toggle("speaker-right", speakerOnRight);
      stage.querySelectorAll("[data-stage-npc]").forEach((button) => button.classList.toggle("active", NPCS[button.dataset.stageNpc]?.name === speaker));
    };
    const showTip = (text, npcId = cast[0]) => {
      const npc = NPCS[npcId] || NPCS[cast[0]];
      if (!npc || !ambient || !stage.isConnected) return;
      clearTimeout(tipTimer);
      ambient.querySelector("[data-ambient-speaker]").textContent = `${npc.name} · ${npc.title}`;
      ambient.querySelector("[data-ambient-text]").textContent = text;
      ambient.hidden = false;
      ambient.classList.remove("leaving");
      activateSpeaker(npc.name);
      tipTimer = window.setTimeout(() => {
        if (!ambient.isConnected) return;
        ambient.classList.add("leaving");
        window.setTimeout(() => { if (ambient.isConnected) ambient.hidden = true; }, 180);
      }, 5200);
    };
    const revealOptions = () => {
      introducedViews.add(locationId);
      speech.classList.add("leaving");
      if (locationId === "kagemori") stage.classList.add("investigation-ready");
      window.setTimeout(() => {
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
      const npc = npcByName(speaker);
      speech.querySelector("[data-stage-speaker]").textContent = npc ? `${npc.name} · ${npc.title}` : speaker;
      speech.querySelector("[data-stage-text]").textContent = text;
      speech.querySelector("[data-stage-count]").textContent = `${lineIndex + 1}/${lines.length}`;
      speech.querySelector("[data-stage-next]").textContent = lineIndex === lines.length - 1 ? "VER OPCIONES" : "SIGUIENTE";
      activateSpeaker(speaker);
    };
    if (!introducedViews.has(locationId) && lines.length) {
      drawLine();
      speech.querySelector("[data-stage-next]").addEventListener("click", () => {
        if (lineIndex < lines.length - 1) { lineIndex += 1; drawLine(); return; }
        revealOptions();
      });
    } else {
      stage.querySelector("[data-stage-npc]")?.classList.add("active");
    }
    stage.querySelectorAll("[data-stage-npc]").forEach((button) => button.addEventListener("click", () => {
      if (!options.hidden) {
        const guide = NPCS[button.dataset.stageNpc]?.guide || [];
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
      control.addEventListener("mouseenter", explain);
      control.addEventListener("focusin", explain);
    });
  };

  const renderVillageView = () => {
    const content = villageView.render({ save, view });
    const { locationId } = villageView.getLayout();
    shell(locationId ? locationStage(locationId, content) : content);
    if (locationId) bindLocationStage(locationId);
    villageView.mount(root, viewScope);
  };
  const renderPlaza = renderVillageView;
  const renderVillageService = () => renderVillageView();

  const renderMissionBoardView = () => {
    if (view === "doctor-route") {
      const mission = secondaryMissionByType("route-search", SECONDARY_MISSIONS);
      if (!save.campaign.doctorRoute.active && !missionState(mission, save).completed) save = writeSave(startDoctorMission(save, mission));
    }
    const content = missionBoardsView.render({ save, view, selectedSagaId, investigatedClues });
    const { locationId } = missionBoardsView.getLayout();
    shell(locationId ? locationStage(locationId, content) : content);
    if (locationId) bindLocationStage(locationId);
    missionBoardsView.mount(root, viewScope);
  };
  const renderStoryMissions = renderMissionBoardView;
  const renderSecondaryMissions = renderMissionBoardView;
  const renderKagemori = renderMissionBoardView;
  const renderDoctorRoute = renderMissionBoardView;

  const renderDojo = () => {
    shell(locationStage("dojo", dojoView.render({ save, activeDojoTab })));
    dojoView.mount(root, viewScope);
    bindLocationStage("dojo");
  };

  const renderArchive = () => {
    shell(locationStage("archive", archiveView.render({ save })));
    bindLocationStage("archive");
    archiveView.mount(root, viewScope);
  };

  const renderDebugTools = () => {
    // RELEASE-BLOCKER 1.0: esta herramienta modifica el progreso y no debe incluirse en producción.
    shell(debugToolsView.render({ save, debugSnapshot }));
    debugToolsView.mount(root, viewScope);
  };

  const render = () => {
    if (choosingSaveSlot) return renderSaveSlots();
    if (!save.character) return renderCreator();
    if (view === "headquarters") return renderStoryMissions();
    if (view === "missions") return renderSecondaryMissions();
    if (view === "kagemori") return renderKagemori();
    if (view === "doctor-route") return renderDoctorRoute();
    if (view === "dojo") return renderDojo();
    if (view === "archive") return renderArchive();
    if (view === "debug") return renderDebugTools();
    if (VILLAGE_SERVICES[view]) return renderVillageService(view);
    return renderPlaza();
  };
  render();
  return {
    refresh(nextSave) { save = nextSave; view = "plaza"; render(); },
    openLocation(nextSave, locationId) { save = nextSave; view = locationId; render(); }
  };
}
