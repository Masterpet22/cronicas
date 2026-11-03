import { CAPTURE_SCENARIOS } from "./performance-metrics.js?v=1.1.0";

export function mountPerformancePanel(root, monitor, capture, exportReport) {
  const panel = document.createElement("details");
  panel.className = "performance-panel";
  panel.open = true;
  panel.innerHTML = `<summary>Rendimiento · FPS y bloqueos</summary><pre aria-label="Mediciones de rendimiento"></pre>
    <label>Escenario <select>${CAPTURE_SCENARIOS.map(({ id, label }) => `<option value="${id}">${label}</option>`).join("")}</select></label>
    <div><button type="button" data-perf-start>Iniciar muestra</button><button type="button" data-perf-capture>Guardar muestra</button><button type="button" data-perf-export>Exportar JSON</button></div>`;
  root.append(panel);
  const abort = new AbortController();
  ["pointerdown", "pointerup", "keydown"].forEach(type => panel.addEventListener(type,
    event => event.stopPropagation(), { signal: abort.signal }));
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
    const label = context => ({ battle: "Combate", pause: "Pausa", travel: "Viaje", loading: "Carga" }[context] || context);
    const previous = report.segments.slice(0, -1).filter(part => part.timing.frames > 0).at(-1);
    panel.querySelector("pre").textContent = `${label(report.context)} · ${report.renderer} · ${report.resolution.width}×${report.resolution.height} · render ×${report.scale.render.toFixed(2)} · perfil ${report.scale.profile?.id || "manual"}\n`
      + `CSS ${report.displaySize.width}×${report.displaySize.height} · DPR ${report.scale.devicePixelRatio}\n`
      + `FPS bucle ${format(t.fpsMean)} · navegador (rAF) ${format(report.browserTiming.fpsMean)}\n`
      + (report.renderingSuspended ? "Canvas congelado · menú y teclado activos\n" : "")
      + `Frame ${format(t.frameMsMean)} ms · p95 ${format(t.frameMsP95)} · peor ${format(t.frameMsMax)} ms\n`
      + `CPU motor ${format(t.cpuMsMean)} ms · lentos (>33 ms) ${t.framesOver33ms}/${t.frames}\n`
      + (report.mainThread.supported ? `Bloqueos CPU (>50 ms): ${report.mainThread.longTasks.count} · peor ${format(report.mainThread.longTasks.maxMs)} ms\n` : "Bloqueos CPU: API no disponible\n")
      + `Entrada p95: cola ${format(report.input.queueDelay.p95Ms)} ms · hasta rAF ${format(report.input.untilAnimationFrame.p95Ms)} ms\n`
      + (previous ? `Antes (${label(previous.context)}): ${format(previous.timing.fpsMean)} FPS · p95 ${format(previous.timing.frameMsP95)} ms\n` : "Los tramos se separan al pausar/reanudar.\n")
      + `${report.lightMode ? "Modo ligero" : "Modo normal"} · CPU no incluye tiempo GPU\n`
      + report.scenes.map(({ key, current: c, peak: p, budget: b, violations }) =>
        `${key}: obj ${c.objects} (pico ${p.objects}/${b.objects}) · part ${c.particles}/${b.particles}\n`
        + `emisores ${c.emitters}/${b.emitters} · filtros ${c.filters}/${b.filters}${violations.length ? " · EXCEDE PRESUPUESTO" : ""}`).join("\n");
  };
  update();
  const timer = setInterval(update, 500);
  return () => { clearInterval(timer); abort.abort(); panel.remove(); };
}
