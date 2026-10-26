export const SCENE_PERFORMANCE_BUDGETS = Object.freeze({
  battle: Object.freeze({ objects: 450, particles: 64, emitters: 6, filters: 2 }),
  travel: Object.freeze({ objects: 100, particles: 24, emitters: 1, filters: 0 }),
  pause: Object.freeze({ objects: 120, particles: 0, emitters: 0, filters: 0 }),
  results: Object.freeze({ objects: 160, particles: 0, emitters: 0, filters: 0 }),
  "secondary-results": Object.freeze({ objects: 160, particles: 0, emitters: 0, filters: 0 }),
  "level-up": Object.freeze({ objects: 240, particles: 0, emitters: 0, filters: 0 }),
  epilogue: Object.freeze({ objects: 160, particles: 0, emitters: 0, filters: 0 }),
  default: Object.freeze({ objects: 800, particles: 96, emitters: 8, filters: 3 })
});

export const REFERENCE_SCENARIOS = Object.freeze([
  Object.freeze({ id: "battle-entry", label: "Entrada al combate" }),
  Object.freeze({ id: "charged-turn", label: "Turno cargado" }),
  Object.freeze({ id: "elemental-technique", label: "Técnica elemental" })
]);

export function sceneBudget(key, { lightMode = false, renderer = "WebGL" } = {}) {
  const budget = SCENE_PERFORMANCE_BUDGETS[key] || SCENE_PERFORMANCE_BUDGETS.default;
  return { ...budget, ...(lightMode ? { particles: 0, emitters: 0 } : {}),
    filters: lightMode || renderer !== "WebGL" ? 0 : budget.filters };
}

export function resourceViolations(usage, budget) {
  return Object.keys(budget).filter((key) => usage[key] > budget[key])
    .map((metric) => ({ metric, actual: usage[metric], limit: budget[metric] }));
}

const round = (value) => Math.round(value * 100) / 100;
const percentile = (sorted, ratio) => sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)] || 0;

// Una ventana acotada evita acumular una muestra por frame durante toda la partida.
export function createFrameWindow(capacity = 600) {
  const samples = [];
  return {
    add(frameMs, cpuMs = 0) {
      if (!Number.isFinite(frameMs) || frameMs <= 0 || !Number.isFinite(cpuMs) || cpuMs < 0) return;
      samples.push({ frameMs, cpuMs });
      if (samples.length > capacity) samples.shift();
    },
    reset() { samples.length = 0; },
    summary() {
      const frames = samples.length;
      const elapsedMs = samples.reduce((sum, sample) => sum + sample.frameMs, 0);
      const sorted = samples.map((sample) => sample.frameMs).sort((a, b) => a - b);
      return {
        frames, elapsedMs: round(elapsedMs),
        fpsMean: frames ? round(frames * 1000 / elapsedMs) : null,
        frameMsMean: frames ? round(elapsedMs / frames) : null,
        frameMsP50: frames ? round(percentile(sorted, 0.5)) : null,
        frameMsP95: frames ? round(percentile(sorted, 0.95)) : null,
        frameMsMax: frames ? round(sorted[frames - 1]) : null,
        cpuMsMean: frames ? round(samples.reduce((sum, sample) => sum + sample.cpuMs, 0) / frames) : null,
        framesOver33ms: samples.filter((sample) => sample.frameMs > 1000 / 30).length
      };
    }
  };
}
