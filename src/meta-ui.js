import { ENEMY_ACTIONS, ENEMY_ROSTER, EQUIPMENT, JUTSU_LIBRARY } from "./data.js?v=0.93.0"; import { MISSIONS, SECONDARY_MISSIONS, STORY_SAGAS } from "./content/index.js";
import { getDialogue, getMissionSceneDialogue } from "./dialogues.js?v=0.66.0";
import { missionHasStep, missionState, missionStep, missionsForBoard, nextAvailableMission } from "./mission-system.js?v=0.67.0";
import { LOCATION_CAST, NPCS, locationDialogue, npcByName, npcName } from "./npcs.js?v=0.66.0";
import { DEBUG_CHECKPOINTS, actOnDoctorCipher, activeSaveSlot, affinityXpForElement, applyDebugCheckpoint, attributeTrainingLimit, cancelDoctorMission, chooseDoctorMissionRoute, chooseHideoutEntrance, completeDoctorMission, createCharacter, deleteSaveSlot, deliverBestiaryBook, derivedStats, isTechniqueLearned, levelUpReport, listSaveSlots, loadoutSlotsForLevel, markSecondaryMissionCompleted, masterIdForCharacter, normalizeSave, resetAttributes, resolveDoctorRiverPassage, selectMaster, selectNextAffinity, selectSaveSlot, spendAttribute, startDoctorMission, writeSave, xpForNextLevel } from "./save.js?v=0.94.0";
import { createViewRuntime } from "./view-runtime.js?v=0.66.0";
import { BASIC_ELEMENT_IDS, ELEMENTS, ELEMENT_RANK_LABELS, basicRequirements, canAccessElement, elementIcon, elementName } from "./elements.js?v=0.20.0";
import { AFFINITY_CONFIG, availableAffinitySlots } from "./affinity-system.js?v=0.93.0";
import { DOCTOR_ROUTE_DEFINITIONS, RIVER_PASSAGES } from "./content/sagas/futuro-prometedor/s02-medico/routes.js";
import { secondaryMissionByType, secondaryMissionCardModel } from "./secondary-missions.js?v=0.66.0";
import { createDebugToolsView } from "./ui/meta/views/debug-tools.js?v=0.99.0";
import { createArchiveView } from "./ui/meta/views/archive.js?v=0.67.0";
import { createDojoView } from "./ui/meta/views/dojo.js?v=0.102.0";
import { createMissionBoardsView } from "./ui/meta/views/mission-boards.js?v=0.101.0";
import { createVillageView, VILLAGE_LOCATIONS } from "./ui/meta/views/village.js?v=0.67.0";
import { createSaveCreatorView } from "./ui/meta/views/save-creator.js?v=0.102.0";
import { createOverlayView } from "./ui/meta/views/overlays.js?v=0.67.0";
import { createMetaShell } from "./ui/meta/meta-shell.js?v=0.67.0";
import { confirmSecondaryAbandon } from "./ui/meta/abandon-secondary.js?v=0.95.0";
import { createLocationStage } from "./ui/meta/location-stage.js?v=0.67.2";
export { VILLAGE_LOCATIONS };
const masterForCharacter = (character) => NPCS[masterIdForCharacter(character)];
const ASSET_VERSION = "0.82.5";
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
  let activeDojoTab = "techniques";
  let debugSnapshot = null;
  let selectedSagaId = null;
  const introducedViews = new Set();
  const investigatedClues = new Set();
  const overlayView = createOverlayView({ root, viewRuntime, npcByName, escapeHtml, assetVersion: ASSET_VERSION });
  const showDialogue = (...args) => overlayView.showDialogue(...args);
  const showMissionDecision = (...args) => overlayView.showMissionDecision(...args);
  const shellView = createMetaShell({
    sagas: STORY_SAGAS, locations: VILLAGE_LOCATIONS,
    escapeHtml, xpForNextLevel, warmLocationAssets,
    onNavigate(nextView) { view = nextView; render(); },
    onSaveSlots() { choosingSaveSlot = true; render(); },
    onDebug() {
      if (!debugSnapshot) debugSnapshot = JSON.stringify(save);
      view = "debug";
      render();
    },
    onAbandonSecondary(currentView, currentSave) {
      confirmSecondaryAbandon(showMissionDecision, () => {
        const type = currentView === "doctor-route" ? "route-search" : "investigation";
        const mission = secondaryMissionByType(type, SECONDARY_MISSIONS);
        const routeStats = { ...currentSave.campaign.doctorRoute };
        if (currentView === "doctor-route") save = writeSave(cancelDoctorMission(currentSave));
        onFinishSecondaryMission(save, mission, { outcome: "abandoned", clues: investigatedClues.size, routeStats });
      });
    }
  });
  const stageView = createLocationStage({
    locations: VILLAGE_LOCATIONS, locationCast: LOCATION_CAST, locationBackgrounds: LOCATION_BACKGROUNDS,
    locationDialogue, npcs: NPCS, npcByName, escapeHtml, introducedViews,
    assetVersion: ASSET_VERSION
  });
  const saveCreatorView = createSaveCreatorView({
    basicElementIds: BASIC_ELEMENT_IDS, elements: ELEMENTS,
    activeSaveSlot, listSaveSlots, elementIcon, elementName, escapeHtml, masterForCharacter,
    confirmDelete: (name) => window.confirm(`¿Borrar definitivamente la partida de ${name}?`),
    onSelectSlot(slot) {
      save = selectSaveSlot(slot);
      choosingSaveSlot = false;
      try { sessionStorage.setItem("cronicas-save-slot-selected", "1"); } catch (_) { /* La selección seguirá activa durante esta vista. */ }
      view = save.character ? "plaza" : "headquarters";
      render();
    },
    onDeleteSlot(slot) {
      deleteSaveSlot(slot);
      if (slot === activeSaveSlot()) save = selectSaveSlot(slot);
      renderSaveSlots();
    },
    onCreateCharacter(formData) {
      save = writeSave(createCharacter(save, formData));
      view = "headquarters";
      introducedViews.add("headquarters");
      render();
      return save;
    },
    showDialogue: (...args) => showDialogue(...args),
    onTutorialComplete() { save = writeSave({ ...save, campaign: { ...save.campaign, tutorialSeen: true } }); render(); },
    onBackToSlots() { choosingSaveSlot = true; render(); }
  });
  const villageView = createVillageView({
    mainMissions: MISSIONS, secondaryMissions: SECONDARY_MISSIONS,
    missionState, nextAvailableMission, secondaryMissionByType, masterForCharacter, escapeHtml,
    assetVersion: ASSET_VERSION,
    npcs: NPCS, locationCast: LOCATION_CAST, warmImage,
    showDialogue: (...args) => showDialogue(...args),
    onMissionNoticesSeen(ids) { save = writeSave({ ...save, campaign: { ...save.campaign, seenMissionNotices: [...new Set([...save.campaign.seenMissionNotices, ...ids])] } }); return save; },
    onTutorialComplete() { save = writeSave({ ...save, campaign: { ...save.campaign, tutorialSeen: true } }); view = "headquarters"; introducedViews.add("headquarters"); render(); }
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
    missions: sagaMissions, enemyRoster: ENEMY_ROSTER, enemyActions: ENEMY_ACTIONS,
    elementName, escapeHtml,
    showDialogue: (...args) => showDialogue(...args),
    onDeliverBook() {
      save = writeSave(deliverBestiaryBook(save));
      introducedViews.add("archive");
      renderArchive();
    }
  });
  const dojoView = createDojoView({
    assetVersion: ASSET_VERSION,
    affinityConfig: AFFINITY_CONFIG, elements: ELEMENTS, elementRankLabels: ELEMENT_RANK_LABELS,
    equipment: EQUIPMENT, jutsus: JUTSU_LIBRARY, npcs: NPCS,
    affinityXpForElement, availableAffinitySlots, basicRequirements, canAccessElement, derivedStats,
    elementIcon, elementName, isTechniqueLearned, loadoutSlotsForLevel,
    attributeTrainingLimit, masterIdForCharacter, resetAttributes, selectMaster, selectNextAffinity, spendAttribute, xpForNextLevel,
    onPersist(next) { save = writeSave(next); return save; },
    onTabSelected(tabId) { activeDojoTab = tabId; },
    onRerender: () => renderDojo()
  });
  const missionBoardsView = createMissionBoardsView({
    mainMissions: MISSIONS, secondaryMissions: SECONDARY_MISSIONS, sagas: STORY_SAGAS,
    enemyActions: ENEMY_ACTIONS, enemyRoster: ENEMY_ROSTER,
    doctorRouteDefinitions: DOCTOR_ROUTE_DEFINITIONS, riverPassages: RIVER_PASSAGES,
    elementName, escapeHtml, getDialogue, getMissionSceneDialogue, masterForCharacter, npcName,
    missionHasStep, missionState, missionStep, missionsForBoard,
    secondaryMissionByType, secondaryMissionCardModel, warmLocationAssets,
    showDialogue: (...args) => showDialogue(...args),
    showMissionDecision: (...args) => showMissionDecision(...args),
    onSagaSelected(sagaId) { selectedSagaId = sagaId; renderStoryMissions(); },
    onStartMission,
    onStartDoctorRoute(currentSave, mission) { save = currentSave; onStartMission(save, mission); },
    onChooseHideoutEntrance(currentSave, choice) { save = writeSave(chooseHideoutEntrance(currentSave, choice)); return save; },
    onStartDoctorMission(currentSave, mission) { save = writeSave(startDoctorMission(currentSave, mission)); return save; },
    onCompleteInvestigation(currentSave, mission, clues) {
      save = markSecondaryMissionCompleted(currentSave, mission);
      onFinishSecondaryMission(save, mission, { outcome: "completed", clues });
    },
    onCompleteDoctor(currentSave, mission) {
      const routeStats = { ...currentSave.campaign.doctorRoute };
      const completion = completeDoctorMission(currentSave, mission);
      if (completion.blocked) return;
      save = completion.save;
      onFinishSecondaryMission(save, mission, { outcome: "completed", routeStats, levelUp: levelUpReport(currentSave.progression.level, save), rewards: { xp: completion.xp, affinityXp: completion.affinityXp, coins: completion.coins, supplyBonus: completion.supplyBonus } });
    },
    onChooseDoctorRoute(currentSave, routeId) { save = writeSave(chooseDoctorMissionRoute(currentSave, routeId)); return save; },
    onResolveRiverPassage(currentSave, passageId) { save = writeSave(resolveDoctorRiverPassage(currentSave, passageId)); return save; },
    onDoctorCipherAction(currentSave, action, payload) { const result = actOnDoctorCipher(currentSave, action, payload); save = writeSave(result.save); return { ...result, save }; },
    onRerender: () => renderDoctorRoute()
  });

  const renderSaveCreator = (mode) => {
    const content = saveCreatorView.render({ mode, save });
    viewScope = viewRuntime.replace(saveCreatorView.getId(), content);
    saveCreatorView.mount(root, viewScope);
  };
  const renderSaveSlots = () => renderSaveCreator("slots");
  const renderCreator = () => renderSaveCreator("creator");
  const shell = (content) => {
    viewScope = viewRuntime.replace(view, shellView.render({ save, view }, content));
    shellView.mount(root, viewScope, { save, view });
  };
  const locationStage = (locationId, content) => stageView.render(locationId, content);
  const bindLocationStage = (locationId) => stageView.mount(root, viewScope, locationId);

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
    if (["shop", "tower", "arena", "inn", "event"].includes(view)) return renderVillageService(view);
    return renderPlaza();
  };
  render();
  return {
    refresh(nextSave) { save = nextSave; view = "plaza"; render(); },
    openLocation(nextSave, locationId) { save = nextSave; view = locationId; render(); }
  };
}

