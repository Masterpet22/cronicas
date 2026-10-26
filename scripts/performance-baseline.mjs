import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { bootPerformanceReference, preparePerformanceScenario, readPerformanceReference, disposePerformanceReference, capturePerformancePreview } from "../tests/helpers/performance-harness.mjs";
import { REFERENCE_SCENARIOS, SCENE_PERFORMANCE_BUDGETS } from "../src/dev/performance-metrics.js";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const baseURL = "http://127.0.0.1:4173";
const output = resolve(projectRoot, process.argv.find((arg) => arg.startsWith("--output="))?.slice(9) || "artifacts/phaser-performance");
const sampleMs = 3000;
const screenshots = !process.argv.includes("--no-screenshots");
const viewports = [{ width: 1366, height: 768 }, { width: 1600, height: 900 }, { width: 844, height: 390 }];
const modes = [{ renderer: "WebGL", lightMode: false }, { renderer: "WebGL", lightMode: true }, { renderer: "Canvas", lightMode: false }];
let server;
let browser;
const errors = [];
const reports = [];
const skipped = [];
try {
  try { await fetch(baseURL); } catch {
    server = spawn(process.execPath, ["scripts/static-server.mjs"], { cwd: projectRoot, stdio: "ignore", windowsHide: true });
    let available = false;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try { await fetch(baseURL); available = true; break; } catch { await new Promise((done) => setTimeout(done, 100)); }
    }
    if (!available) throw new Error("No se pudo iniciar el servidor de referencia");
  }
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true });
  for (const viewport of viewports) {
    for (const mode of modes) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: "no-preference", baseURL });
      const page = await context.newPage();
      const label = `${viewport.width}x${viewport.height}-${mode.renderer.toLowerCase()}-${mode.lightMode ? "light" : "normal"}`;
      page.on("pageerror", (error) => errors.push({ label, message: error.message }));
      page.on("console", (message) => { if (message.type() === "error") errors.push({ label, message: message.text() }); });
      try {
        if (mode.renderer === "WebGL") {
          const supported = await page.evaluate(() => Boolean(document.createElement("canvas").getContext("webgl2")));
          if (!supported) { skipped.push({ label, reason: "WebGL2 no disponible; no se sustituye silenciosamente por Canvas" }); continue; }
        }
        await bootPerformanceReference(page, mode);
        for (const scenario of REFERENCE_SCENARIOS) {
          await preparePerformanceScenario(page, scenario.id);
          // El tiempo de captura de PNG queda fuera de las muestras de rendimiento.
          await page.waitForTimeout(sampleMs);
          const report = await readPerformanceReference(page);
          report.reference = label;
          report.viewport = viewport;
          report.captureWindowMs = sampleMs;
          reports.push(report);
          if (screenshots) {
            const screenshot = `${label}-${scenario.id}.png`;
            await capturePerformancePreview(page, scenario.id, resolve(output, screenshot));
            report.screenshot = screenshot;
          }
          process.stdout.write(`${label} · ${scenario.id}: ${report.timing.fpsMean} FPS · p95 ${report.timing.frameMsP95} ms\n`);
        }
        await disposePerformanceReference(page);
      } finally { await context.close(); }
    }
  }
  const violations = reports.flatMap((report) => report.scenes.flatMap((scene) => scene.violations.map((violation) =>
    ({ reference: report.reference, scenario: report.scenario, scene: scene.key, ...violation }))));
  const baseline = { schemaVersion: 1, generatedAt: new Date().toISOString(), browser: browser.version(),
    host: { platform: os.platform(), release: os.release(), cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length },
    method: "Cadencia postrender sin suavizado; CPU desde prestep hasta postrender; PNG fuera de la ventana medida; no es tiempo GPU",
    budgets: SCENE_PERFORMANCE_BUDGETS, reports, skipped, errors, violations };
  await writeFile(resolve(output, "baseline.json"), JSON.stringify(baseline, null, 2) + "\n");
  const rows = reports.map((r) => `| ${r.reference} | ${r.scenario} | ${r.timing.frames} | ${r.timing.fpsMean} | ${r.timing.frameMsMean} | ${r.timing.frameMsP95} | ${r.scenes.map((s) => `${s.peak.objects}/${s.peak.particles}/${s.peak.filters}`).join("; ")} |`);
  await writeFile(resolve(output, "baseline.md"), `# Línea base de Phaser 4\n\nGenerada: ${baseline.generatedAt}. Chromium ${baseline.browser}.\n\n${baseline.method}.\n\nFPS depende del equipo y del navegador; los presupuestos estructurales sí se verifican. Cada muestra dura ${sampleMs} ms.\n\n| Referencia | Escenario | Frames | FPS medio | Frame medio ms | Frame p95 ms | Picos objetos/partículas/filtros |\n| --- | --- | ---: | ---: | ---: | ---: | --- |\n${rows.join("\n")}\n\nErrores: ${errors.length}. Excesos: ${violations.length}. Omitidos: ${skipped.length}.\n`);
  if (errors.length || violations.length || !reports.length || reports.some((r) => r.timing.frames < 5)) {
    process.exitCode = 1;
    process.stderr.write(JSON.stringify({ errors, violations, insufficientSamples: reports.filter((r) => r.timing.frames < 5).map((r) => r.reference) }, null, 2) + "\n");
  }
} finally {
  await browser?.close();
  server?.kill();
}
