import { sceneResourceUsage } from "../battle/visual-resources.js?v=0.99.0";
import { createFrameWindow, resourceViolations, sceneBudget } from "./performance-metrics.js?v=0.99.0";

export function createPerformanceMonitor(game, { logicalWidth = 960, logicalHeight = 540, renderScale = 1, renderProfile = null } = {}) {
  const windowFrames = createFrameWindow();
  let lastFrame = null;
  let frameStart = null;
  let scenario = "live";
  let peaks = new Map();
  let current = [];
  let disposed = false;
  const renderer = game.renderer.type === window.Phaser.WEBGL ? "WebGL" : "Canvas";
  const gl = game.renderer.gl;
  const debugRenderer = gl?.getExtension("WEBGL_debug_renderer_info");
  const graphics = gl ? { vendor: gl.getParameter(debugRenderer?.UNMASKED_VENDOR_WEBGL || gl.VENDOR),
    renderer: gl.getParameter(debugRenderer?.UNMASKED_RENDERER_WEBGL || gl.RENDERER) } : null;
  const lightMode = () => Boolean(document.getElementById("light-mode")?.checked);
  let lastMode = lightMode();
  const resetVisibility = () => { lastFrame = null; frameStart = null; };
  const begin = () => { frameStart = performance.now(); };
  const sampleResources = () => {
    // Incluye escenas pausadas pero visibles: siguen siendo parte del coste de renderizado.
    current = game.scene.scenes.filter((scene) => scene.sys.isVisible() && (scene.sys.isActive() || scene.sys.isPaused()))
      .map((scene) => {
        const key = scene.sys.settings.key;
        const usage = sceneResourceUsage(scene);
        const budget = sceneBudget(key, { lightMode: lightMode(), renderer });
        const previous = peaks.get(key)?.peak || {};
        const peak = Object.fromEntries(Object.entries(usage).map(([name, value]) => [name, Math.max(value, previous[name] || 0)]));
        const entry = { key, current: usage, peak, budget, violations: resourceViolations(peak, budget) };
        peaks.set(key, entry);
        return entry;
      });
  };
  const sample = () => {
    const now = performance.now();
    if (document.hidden) { lastFrame = null; frameStart = null; return; }
    if (lightMode() !== lastMode) {
      lastMode = lightMode();
      peaks = new Map();
      windowFrames.reset();
      lastFrame = null;
    }
    if (lastFrame !== null && frameStart !== null) windowFrames.add(now - lastFrame, now - frameStart);
    lastFrame = now;
    sampleResources();
  };
  game.events.on("prestep", begin);
  game.events.on("postrender", sample);
  document.addEventListener("visibilitychange", resetVisibility);

  return {
    startCapture(label = "live") {
      scenario = label;
      windowFrames.reset();
      peaks = new Map();
      lastFrame = null;
      frameStart = null;
      sampleResources();
    },
    snapshot() {
      const bounds = game.canvas?.getBoundingClientRect() || { width: 0, height: 0 };
      return {
        schemaVersion: 1, scenario, renderer, graphics, phaserVersion: window.Phaser.VERSION,
        capturedAt: new Date().toISOString(), lightMode: lightMode(),
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        resolution: { width: game.canvas?.width || 0, height: game.canvas?.height || 0 },
        logicalResolution: { width: logicalWidth, height: logicalHeight },
        displaySize: { width: Math.round(bounds.width), height: Math.round(bounds.height) },
        scale: { render: renderScale, profile: renderProfile ? { id: renderProfile.id, maxScale: renderProfile.maxScale, maxPixels: renderProfile.maxPixels } : null,
          cssX: bounds.width / (game.canvas?.width || 1), cssY: bounds.height / (game.canvas?.height || 1), devicePixelRatio: window.devicePixelRatio },
        timing: windowFrames.summary(), scenes: [...peaks.values()], activeScenes: current.map(({ key }) => key)
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      game.events.off("prestep", begin);
      game.events.off("postrender", sample);
      document.removeEventListener("visibilitychange", resetVisibility);
    }
  };
}
