import { REFERENCE_SCENARIOS } from "./performance-metrics.js?v=0.99.0";

export function mountPerformancePanel(root, monitor, capture, exportReport) {
  const panel = document.createElement("details");
  panel.className = "performance-panel";
  panel.open = true;
  panel.innerHTML = `<summary>DEV · Rendimiento</summary><pre aria-label="Mediciones de rendimiento"></pre>
    <label>Escenario <select>${REFERENCE_SCENARIOS.map(({ id, label }) => `<option value="${id}">${label}</option>`).join("")}</select></label>
    <div><button type="button" data-perf-start>Iniciar muestra</button><button type="button" data-perf-capture>Guardar muestra</button><button type="button" data-perf-export>Exportar JSON</button></div>`;
  root.append(panel);
  const abort = new AbortController();
  const listen = (selector, callback) => panel.querySelector(selector).addEventListener("click", (event) => {
    event.stopPropagation();
    callback();
  }, { signal: abort.signal });
  listen("[data-perf-start]", () => monitor.startCapture(panel.querySelector("select").value));
  listen("[data-perf-capture]", capture);
  listen("[data-perf-export]", exportReport);
  const update = () => {
    if (!panel.open) return;
    const report = monitor.snapshot();
    const t = report.timing;
    const format = (number) => number === null ? "…" : number.toFixed(1);
    panel.querySelector("pre").textContent = `${report.renderer} · ${report.resolution.width}×${report.resolution.height} · render ×${report.scale.render.toFixed(2)}\n`
      + `CSS ${report.displaySize.width}×${report.displaySize.height} · DPR ${report.scale.devicePixelRatio}\n`
      + `FPS ${format(t.fpsMean)} · frame ${format(t.frameMsMean)} ms · p95 ${format(t.frameMsP95)} ms\n`
      + `CPU ${format(t.cpuMsMean)} ms · ${t.frames} frames · ${report.lightMode ? "ligero" : "normal"}\n`
      + report.scenes.map(({ key, current: c, peak: p, budget: b, violations }) =>
        `${key}: obj ${c.objects} (pico ${p.objects}/${b.objects}) · part ${c.particles}/${b.particles}\n`
        + `emisores ${c.emitters}/${b.emitters} · filtros ${c.filters}/${b.filters}${violations.length ? " · EXCEDE PRESUPUESTO" : ""}`).join("\n");
  };
  update();
  const timer = setInterval(update, 500);
  return () => { clearInterval(timer); abort.abort(); panel.remove(); };
}
