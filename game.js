import { mountMetaUI } from "./src/meta-ui.js?v=0.107.0";
import { loadSave, startMissionProgress, writeSave } from "./src/save.js?v=0.106.0";
import { battleRuntime } from "./src/battle/session.js?v=1.0.0";
import { loadPhaser } from "./src/battle/load-phaser.js?v=1.0.0";
import { commitVictory as commitPendingVictory, discardVictory, stageVictory } from "./src/battle/victory-transaction.js?v=0.95.0";
import { installPerformanceTools, uninstallPerformanceTools } from "./src/dev/performance-tools.js?v=0.99.0";

let game = null;
let metaUi = null;
let battleBundlePromise = null;
battleRuntime.activeSave = loadSave();

const metaRoot = document.getElementById("meta");
const gameRoot = document.getElementById("game");
let gameLaunchRevision = 0;

function loadBattleBundle() {
  if (!battleBundlePromise) battleBundlePromise = loadPhaser()
    .then(() => import("./src/battle/bundle.js?v=1.0.0"))
    .catch((error) => { battleBundlePromise = null; throw error; });
  return battleBundlePromise;
}

function stopGameScenes(instance) {
  instance.scene.scenes.forEach((scene) => {
    scene.arenaVisuals?.destroy();
    if (scene.scene.isActive() || scene.scene.isPaused() || scene.scene.isSleeping()) instance.scene.stop(scene.scene.key);
  });
}

function parkGameInstance(instance = game) {
  if (!instance || instance !== game) return;
  stopGameScenes(instance);
  uninstallPerformanceTools(instance);
  instance.loop.sleep();
  gameRoot.removeAttribute("aria-busy");
}

function releaseGameToMeta(locationId = "plaza", { commitVictory = false } = {}) {
  gameLaunchRevision += 1;
  const instance = game;
  if (commitVictory) commitPendingVictory(battleRuntime, writeSave);
  else {
    if (battleRuntime.pendingVictorySave) battleRuntime.activeSave = loadSave();
    discardVictory(battleRuntime);
  }
  // Captura las métricas mientras el canvas aún conserva su tamaño visible.
  uninstallPerformanceTools(instance);
  metaRoot.hidden = false;
  gameRoot.hidden = true;
  if (locationId === "plaza") metaUi?.refresh(battleRuntime.activeSave);
  else metaUi?.openLocation(battleRuntime.activeSave, locationId);
  queueMicrotask(() => parkGameInstance(instance));
}

function createGame(renderSize, bundle) {
  const { Phaser, GAME_SCENES } = bundle;
  return new Phaser.Game({
    type: Phaser.AUTO,
    callbacks: { postBoot: (instance) => {
      installPerformanceTools(instance, gameRoot, { renderScale: battleRuntime.renderResolution, renderProfile: battleRuntime.renderProfile });
      gameRoot.removeAttribute("aria-busy");
    } },
    parent: "game", width: renderSize.width, height: renderSize.height, backgroundColor: "#101622",
    scene: GAME_SCENES, loader: { maxParallelDownloads: 6 },
    render: { antialias: true, antialiasGL: true, pixelArt: false, roundPixels: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
  });
}

async function launchGame() {
  const launchRevision = ++gameLaunchRevision;
  metaRoot.hidden = true;
  gameRoot.hidden = false;
  gameRoot.setAttribute("aria-busy", "true");
  let bundle;
  try {
    [bundle] = await Promise.all([loadBattleBundle(), document.fonts.load('700 16px "Cinzel"'), document.fonts.load('700 16px "Alegreya Sans"')]);
  } catch (error) {
    console.error(error);
    if (launchRevision === gameLaunchRevision) { metaRoot.hidden = false; gameRoot.hidden = true; gameRoot.removeAttribute("aria-busy"); }
    return;
  }
  if (launchRevision !== gameLaunchRevision) return;
  const renderSize = bundle.configureRenderResolution(gameRoot, battleRuntime);
  if (!game) {
    game = createGame(renderSize, bundle);
    return;
  }
  stopGameScenes(game);
  game.scale.resize(renderSize.width, renderSize.height);
  installPerformanceTools(game, gameRoot, { renderScale: battleRuntime.renderResolution, renderProfile: battleRuntime.renderProfile });
  game.loop.wake();
  game.scene.start("travel");
  gameRoot.removeAttribute("aria-busy");
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
  discardVictory(battleRuntime);
  battleRuntime.pendingSecondaryResults = null;
  battleRuntime.activeSave = mission.tutorialReplay ? structuredClone(save) : writeSave(startMissionProgress(save, mission.id));
  battleRuntime.activeMission = mission;
  document.querySelector(".game-settings")?.removeAttribute("open");
  await launchGame();
}, (save, mission, result) => {
  if (result.outcome === "completed") stageVictory(battleRuntime, save);
  else {
    battleRuntime.activeSave = writeSave(save);
    discardVictory(battleRuntime);
  }
  battleRuntime.activeMission = mission;
  battleRuntime.pendingSecondaryResults = { ...result, missionTitle: mission.title, missionId: mission.id, missionType: mission.type };
  void launchGame();
});


