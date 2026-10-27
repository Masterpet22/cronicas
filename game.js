import { mountMetaUI } from "./src/meta-ui.js?v=0.107.0";
import { loadSave, startMissionProgress, writeSave } from "./src/save.js?v=0.106.0";
import { BattleScene } from "./src/battle/scenes/battle-scene.js?v=1.5.0";
import { MissionTravelScene } from "./src/battle/scenes/mission-travel-scene.js?v=1.5.0";
import { MissionEpilogueScene } from "./src/battle/scenes/mission-epilogue-scene.js?v=0.95.0";
import { LevelUpScene } from "./src/battle/scenes/level-up-scene.js?v=1.5.0";
import { SecondaryResultsScene } from "./src/battle/scenes/secondary-results-scene.js?v=0.96.0";
import { ResultsScene } from "./src/battle/scenes/results-scene.js?v=0.96.0";
import { PauseScene } from "./src/battle/scenes/pause-scene.js?v=1.1.0";
import { Phaser, battleRuntime, configureRenderResolution } from "./src/battle/runtime.js?v=0.91.0";
import { commitVictory as commitPendingVictory, discardVictory, stageVictory } from "./src/battle/victory-transaction.js?v=0.95.0";
import { installPerformanceTools, uninstallPerformanceTools } from "./src/dev/performance-tools.js?v=0.99.0";

let game = null;
let metaUi = null;
battleRuntime.activeSave = loadSave();

const metaRoot = document.getElementById("meta");
const gameRoot = document.getElementById("game");
let gameLaunchRevision = 0;

function destroyGameInstance(instance = game) {
  if (!instance) return;
  uninstallPerformanceTools(instance);
  // destroy() de Phaser se difiere al siguiente frame, que puede estar dormido al volver a HTML.
  instance.scene.scenes.forEach((scene) => scene.arenaVisuals?.destroy());
  if (game === instance) game = null;
  try { instance.destroy(true); } catch (_) { /* La vista HTML debe recuperarse aunque Phaser ya se haya cerrado. */ }
  gameRoot.replaceChildren();
  gameRoot.removeAttribute("aria-busy");
}

function releaseGameToMeta(locationId = "plaza", { commitVictory = false } = {}) {
  gameLaunchRevision += 1;
  const instance = game;
  instance?.loop.sleep();
  uninstallPerformanceTools(instance);
  if (commitVictory) commitPendingVictory(battleRuntime, writeSave);
  else {
    if (battleRuntime.pendingVictorySave) battleRuntime.activeSave = loadSave();
    discardVictory(battleRuntime);
  }
  metaRoot.hidden = false;
  gameRoot.hidden = true;
  if (locationId === "plaza") metaUi?.refresh(battleRuntime.activeSave);
  else metaUi?.openLocation(battleRuntime.activeSave, locationId);
  queueMicrotask(() => destroyGameInstance(instance));
}

function bindGlobalOptions() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const checkboxPreferences = [
    ["manual-seals", "seal-input-mode", "manual", "automatic", "manual"],
    ["camera-effects", "camera-effects", "on", "off", reduceMotion ? "off" : "on"],
    ["flash-effects", "flash-effects", "on", "off", reduceMotion ? "off" : "on"],
    ["music-enabled", "music-enabled", "on", "off", "on"],
    ["light-mode", "light-mode", "on", "off", "off"]
  ];
  checkboxPreferences.forEach(([id, key, onValue, offValue, defaultValue]) => {
    const input = document.getElementById(id);
    try { input.checked = (window.localStorage.getItem(key) || defaultValue) === onValue; } catch (_) { /* Preferencias opcionales. */ }
    input.addEventListener("change", () => {
      try { window.localStorage.setItem(key, input.checked ? onValue : offValue); } catch (_) { /* Preferencias opcionales. */ }
      if (id === "manual-seals") document.getElementById("mode-hint").textContent = input.checked ? "Completa las secuencias con QWER / ASDF / ZXCV." : "Los sellos se ejecutarán automáticamente.";
    });
  });
  const volume = document.getElementById("game-volume");
  try { volume.value = window.localStorage.getItem("game-volume") || "70"; } catch (_) { /* Preferencias opcionales. */ }
  volume.addEventListener("input", () => { try { window.localStorage.setItem("game-volume", volume.value); } catch (_) { /* Preferencias opcionales. */ } });
  document.getElementById("mode-hint").textContent = document.getElementById("manual-seals").checked ? "Completa las secuencias con QWER / ASDF / ZXCV." : "Los sellos se ejecutarán automáticamente.";
}

battleRuntime.releaseGameToMeta = releaseGameToMeta;
bindGlobalOptions();

metaUi = mountMetaUI(metaRoot, battleRuntime.activeSave, async (save, mission) => {
  const launchRevision = ++gameLaunchRevision;
  discardVictory(battleRuntime);
  battleRuntime.activeSave = mission.tutorialReplay ? structuredClone(save) : writeSave(startMissionProgress(save, mission.id));
  battleRuntime.activeMission = mission;
  document.querySelector(".game-settings")?.removeAttribute("open");
  metaRoot.hidden = true;
  gameRoot.hidden = false;
  destroyGameInstance();
  gameRoot.setAttribute("aria-busy", "true");
  await Promise.all([
    document.fonts.load('700 16px "Cinzel"'),
    document.fonts.load('700 16px "Alegreya Sans"')
  ]);
  if (launchRevision !== gameLaunchRevision) return;
  const renderSize = configureRenderResolution(gameRoot);
  game = new Phaser.Game({
    type: Phaser.AUTO,
    callbacks: { postBoot: (instance) => installPerformanceTools(instance, gameRoot, { renderScale: battleRuntime.renderResolution }) },
    parent: "game",
    width: renderSize.width,
    height: renderSize.height,
    backgroundColor: "#101622",
    scene: [MissionTravelScene, BattleScene, MissionEpilogueScene, LevelUpScene, SecondaryResultsScene, ResultsScene, PauseScene],
    loader: { maxParallelDownloads: 6 },
    render: { antialias: true, antialiasGL: true, pixelArt: false, roundPixels: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
  });
  gameRoot.removeAttribute("aria-busy");
}, (save, mission, result) => {
  gameLaunchRevision += 1;
  if (result.outcome === "completed") stageVictory(battleRuntime, save);
  else {
    battleRuntime.activeSave = writeSave(save);
    discardVictory(battleRuntime);
  }
  battleRuntime.activeMission = mission;
  destroyGameInstance();
  metaRoot.hidden = true;
  gameRoot.hidden = false;
  battleRuntime.pendingSecondaryResults = { ...result, missionTitle: mission.title, missionId: mission.id, missionType: mission.type };
  const renderSize = configureRenderResolution(gameRoot);
  game = new Phaser.Game({
    type: Phaser.AUTO,
    callbacks: { postBoot: (instance) => installPerformanceTools(instance, gameRoot, { renderScale: battleRuntime.renderResolution }) },
    parent: "game",
    width: renderSize.width,
    height: renderSize.height,
    backgroundColor: "#101622",
    scene: [MissionTravelScene, LevelUpScene, SecondaryResultsScene],
    loader: { maxParallelDownloads: 4 },
    render: { antialias: true, antialiasGL: true, pixelArt: false, roundPixels: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
  });
});


