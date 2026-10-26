import assert from "node:assert/strict";
import { createFrameWindow, sceneBudget, resourceViolations } from "../src/dev/performance-metrics.js";
import { sceneObjects, sceneResourceUsage, clearSceneFilters } from "../src/battle/visual-resources.js";

const frames = createFrameWindow(3);
assert.equal(frames.summary().fpsMean, null, "Sin muestras no se inventan FPS");
[10, 20, 40].forEach((ms) => frames.add(ms, 2));
assert.deepEqual(frames.summary(), { frames: 3, elapsedMs: 70, fpsMean: 42.86, frameMsMean: 23.33,
  frameMsP50: 20, frameMsP95: 40, frameMsMax: 40, cpuMsMean: 2, framesOver33ms: 1 });
frames.add(NaN); frames.add(-1); frames.add(0); frames.add(10, Infinity);
assert.equal(frames.summary().frames, 3);
frames.add(30, 3);
assert.equal(frames.summary().elapsedMs, 90, "La ventana expulsa la muestra más antigua");
frames.reset();
assert.equal(frames.summary().frames, 0);

const list = { list: [{ active: true }], clear() { this.list.length = 0; } };
const particle = { getAliveParticleCount: () => 7, filters: { internal: list } };
const container = { list: [particle] };
const scene = { children: { list: [container, particle] }, cameras: { cameras: [{ filters: { internal: list } }] } };
assert.equal(sceneObjects(scene).length, 2, "Los hijos duplicados se cuentan una vez");
assert.deepEqual(sceneResourceUsage(scene), { objects: 2, emitters: 1, particles: 7, filters: 1 });
const budget = sceneBudget("battle", { lightMode: true });
assert.equal(budget.filters, 0);
assert.equal(sceneBudget("battle", { renderer: "Canvas" }).filters, 0);
assert.deepEqual(resourceViolations(sceneResourceUsage(scene), budget).map((v) => v.metric), ["particles", "emitters", "filters"]);
clearSceneFilters(scene);
assert.equal(sceneResourceUsage(scene).filters, 0, "También se retiran filtros compartidos con cámaras");
assert.ok(resourceViolations({ objects: 801, particles: 0, emitters: 0, filters: 0 }, sceneBudget("battle")).some((v) => v.metric === "objects"));
console.log("Pruebas de métricas, presupuestos y recursos visuales superadas.");
