export function isSceneActive(scenePlugin, key) {
  return Boolean(scenePlugin?.isActive?.(key)) && !scenePlugin?.isPaused?.(key);
}

export function pauseSceneIfActive(scenePlugin, key) {
  if (!isSceneActive(scenePlugin, key)) return false;
  scenePlugin.pause(key);
  return true;
}

export function resumeSceneIfPaused(scenePlugin, key) {
  if (!scenePlugin?.isPaused?.(key)) return false;
  scenePlugin.resume(key);
  return true;
}

export function stopSceneIfRunning(scenePlugin, key) {
  const running = scenePlugin?.isActive?.(key) || scenePlugin?.isPaused?.(key) || scenePlugin?.isSleeping?.(key);
  if (!running) return false;
  scenePlugin.stop(key);
  return true;
}
