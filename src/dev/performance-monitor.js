import { sceneResourceUsage } from "../battle/visual-resources.js?v=0.99.0";
import { createDurationWindow, createFrameWindow, resourceViolations, sceneBudget } from "./performance-metrics.js?v=1.1.0";

export function createPerformanceMonitor(game, { logicalWidth = 960, logicalHeight = 540, renderScale = 1, renderProfile = null } = {}) {
  const windowFrames = createFrameWindow();
  const browserFrames = createFrameWindow();
  const longTasks = createDurationWindow();
  const inputDelay = createDurationWindow();
  const inputToFrame = createDurationWindow();
  const history = [];
  const pendingInputs = new Set();
  let lastFrame = null;
  let lastBrowserFrame = null;
  let frameStart = null;
  let renderingSuspended = false;
  let lastResourceSample = -Infinity;
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
  const contextKey = () => game.scene.scenes.filter(scene => scene.sys.isVisible() && scene.sys.isActive())
    .map(scene => scene.sys.settings.key).join("+") || "loading";
  let context = contextKey();
  let segmentStart = performance.now();
  let segmentRevision = 0;
  let longTaskObserver = null;
  const segment = (now = performance.now()) => ({ context, startedAtMs: segmentStart, endedAtMs: now,
    durationMs: Math.round(now - segmentStart), lightMode: lastMode, renderingSuspended,
    resolution: { width: game.canvas?.width || 0, height: game.canvas?.height || 0 },
    timing: windowFrames.summary(), browserTiming: browserFrames.summary(),
    mainThread: { supported: Boolean(longTaskObserver), longTasks: longTasks.summary() },
    input: { queueDelay: inputDelay.summary(), untilAnimationFrame: inputToFrame.summary() } });
  const resetIntervals = () => { lastFrame = null; lastBrowserFrame = null; frameStart = null; };
  const resetSegment = () => {
    windowFrames.reset(); browserFrames.reset(); longTasks.reset(); inputDelay.reset(); inputToFrame.reset();
    peaks = new Map();
    lastResourceSample = -Infinity;
    resetIntervals();
    segmentStart = performance.now();
    segmentRevision += 1;
  };
  const archiveSegment = () => {
    if (!windowFrames.summary().frames && !browserFrames.summary().frames) return;
    history.push(segment());
    if (history.length > 12) history.shift();
  };
  const syncContext = () => {
    const next = contextKey();
    if (next === context && lightMode() === lastMode) return;
    archiveSegment();
    context = next;
    lastMode = lightMode();
    resetSegment();
  };
  const resetVisibility = () => {
    resetIntervals();
    pendingInputs.clear();
  };
  const begin = () => { syncContext(); frameStart = performance.now(); };
  const sampleResources = () => {
    // Cuenta también recursos residentes de escenas pausadas, aunque el canvas esté congelado.
    current = game.scene.scenes.filter((scene) => scene.sys.isVisible() && (scene.sys.isActive() || scene.sys.isPaused()))
      .map((scene) => {
        const key = scene.sys.settings.key;
        const usage = sceneResourceUsage(scene);
        const budget = sceneBudget(key, { lightMode: lightMode(), renderer });
        const previous = peaks.get(key)?.peak || {};
        const peak = Object.fromEntries(Object.entries(usage).map(([name, value]) => [name, Math.max(value, previous[name] || 0)]));
        const entry = { key, status: scene.sys.isPaused() ? "paused" : "active",
          current: usage, peak, budget, violations: resourceViolations(peak, budget) };
        peaks.set(key, entry);
        return entry;
      });
  };
  const sample = renderer => {
    renderingSuspended = renderer === null;
    const now = performance.now();
    if (document.hidden) { lastFrame = null; frameStart = null; return; }
    if (lastFrame !== null && frameStart !== null) windowFrames.add(now - lastFrame, now - frameStart);
    lastFrame = now;
    // El diagnóstico no necesita recorrer todas las marionetas en cada frame.
    if (now - lastResourceSample >= 250) { sampleResources(); lastResourceSample = now; }
  };
  const browserSample = () => {
    if (disposed) return;
    const now = performance.now();
    if (!document.hidden) {
      if (lastBrowserFrame !== null) browserFrames.add(now - lastBrowserFrame);
      lastBrowserFrame = now;
      for (const input of pendingInputs) {
        if (input.revision === segmentRevision) inputToFrame.add(now - input.time);
      }
      pendingInputs.clear();
    } else resetVisibility();
    browserFrame = requestAnimationFrame(browserSample);
  };
  let browserFrame = requestAnimationFrame(browserSample);
  // Solo cuenta entradas reales; no guarda teclas, coordenadas ni texto del jugador.
  const onInput = event => {
    if (!event.isTrusted || document.hidden || !game.canvas?.parentElement?.contains(event.target)
      || event.target.closest?.(".performance-panel")) return;
    syncContext();
    const now = performance.now();
    const time = event.timeStamp > performance.timeOrigin ? event.timeStamp - performance.timeOrigin : event.timeStamp;
    if (!Number.isFinite(time) || time < 0 || time > now) return;
    inputDelay.add(now - time);
    if (pendingInputs.size < 32) pendingInputs.add({ time, revision: segmentRevision });
  };
  if (globalThis.PerformanceObserver?.supportedEntryTypes?.includes("longtask")) {
    try {
      longTaskObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (!document.hidden && entry.startTime >= segmentStart) longTasks.add(entry.duration);
        }
      });
      longTaskObserver.observe({ type: "longtask" });
    } catch (_) { longTaskObserver = null; }
  }
  game.events.on("prestep", begin);
  game.events.on("postrender", sample);
  document.addEventListener("visibilitychange", resetVisibility);
  document.addEventListener("pointerdown", onInput, { capture: true, passive: true });
  document.addEventListener("keydown", onInput, { capture: true, passive: true });

  return {
    startCapture(label = "live") {
      scenario = label;
      resetSegment();
      history.length = 0;
      pendingInputs.clear();
      context = contextKey();
      lastMode = lightMode();
      sampleResources();
    },
    snapshot() {
      const bounds = game.canvas?.getBoundingClientRect() || { width: 0, height: 0 };
      const live = segment();
      return {
        schemaVersion: 2, scenario, context, renderer, graphics, renderingSuspended, phaserVersion: window.Phaser.VERSION,
        capturedAt: new Date().toISOString(), lightMode: lightMode(),
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        resolution: { width: game.canvas?.width || 0, height: game.canvas?.height || 0 },
        logicalResolution: { width: logicalWidth, height: logicalHeight },
        displaySize: { width: Math.round(bounds.width), height: Math.round(bounds.height) },
        scale: { render: renderScale, profile: renderProfile ? { id: renderProfile.id, maxScale: renderProfile.maxScale, maxPixels: renderProfile.maxPixels } : null,
          cssX: bounds.width / (game.canvas?.width || 1), cssY: bounds.height / (game.canvas?.height || 1), devicePixelRatio: window.devicePixelRatio },
        timing: live.timing, browserTiming: live.browserTiming,
        mainThread: live.mainThread, input: live.input,
        segments: [...history, live],
        scenes: [...peaks.values()], activeScenes: current.map(({ key }) => key)
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(browserFrame);
      longTaskObserver?.disconnect();
      pendingInputs.clear();
      game.events.off("prestep", begin);
      game.events.off("postrender", sample);
      document.removeEventListener("visibilitychange", resetVisibility);
      document.removeEventListener("pointerdown", onInput, true);
      document.removeEventListener("keydown", onInput, true);
    }
  };
}
