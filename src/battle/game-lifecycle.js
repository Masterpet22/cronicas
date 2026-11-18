import { uninstallPerformanceTools } from "../dev/performance-tools.js?v=1.3.0";
import { trimParkedCombatTextures } from "./combat-textures.js?v=1.0.0";

export function stopGameScenes(game) {
  game.scene.scenes.forEach((scene) => {
    scene.arenaVisuals?.destroy();
    if (scene.scene.isActive() || scene.scene.isPaused() || scene.scene.isSleeping()) game.scene.stop(scene.scene.key);
  });
}

export function parkCombatGame(game) {
  stopGameScenes(game);
  trimParkedCombatTextures(game);
  uninstallPerformanceTools(game);
  game.loop.sleep();
}
