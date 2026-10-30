import { BattleScene } from "./scenes/battle-scene.js?v=0.114.0";
import { MissionTravelScene } from "./scenes/mission-travel-scene.js?v=1.5.0";
import { MissionEpilogueScene } from "./scenes/mission-epilogue-scene.js?v=0.95.0";
import { LevelUpScene } from "./scenes/level-up-scene.js?v=1.5.0";
import { SecondaryResultsScene } from "./scenes/secondary-results-scene.js?v=0.114.0";
import { ResultsScene } from "./scenes/results-scene.js?v=0.114.0";
import { PauseScene } from "./scenes/pause-scene.js?v=0.114.0";
import { Phaser } from "./runtime.js?v=0.91.0";
import { configureRenderResolution } from "./render-resolution.js?v=0.114.0";

export const GAME_SCENES = Object.freeze([
  MissionTravelScene, BattleScene, MissionEpilogueScene, LevelUpScene, SecondaryResultsScene, ResultsScene, PauseScene
]);

export { Phaser, configureRenderResolution };
