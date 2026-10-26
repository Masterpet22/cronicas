import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const before = JSON.parse(await readFile(resolve(root, "artifacts/phaser-performance/baseline.json"), "utf8"));
const after = JSON.parse(await readFile(resolve(root, "artifacts/phaser-phase1/performance/baseline.json"), "utf8"));
const changes = after.reports.map((report) => {
  const previous = before.reports.find((entry) => entry.reference === report.reference && entry.scenario === report.scenario);
  if (!previous) throw new Error(`Falta la referencia anterior: ${report.reference}/${report.scenario}`);
  const comparable = JSON.stringify(previous.resolution) === JSON.stringify(report.resolution)
    && previous.graphics?.renderer === report.graphics?.renderer && previous.phaserVersion === report.phaserVersion
    && before.browser === after.browser && before.host.cpu === after.host.cpu;
  return { reference: report.reference, scenario: report.scenario, comparable,
    beforeFps: previous.timing.fpsMean, afterFps: report.timing.fpsMean,
    frameMeanDeltaPercent: Math.round((report.timing.frameMsMean / previous.timing.frameMsMean - 1) * 1000) / 10,
    p95Before: previous.timing.frameMsP95, p95After: report.timing.frameMsP95,
    beforePeak: previous.scenes.find((scene) => scene.key === "battle")?.peak,
    afterPeak: report.scenes.find((scene) => scene.key === "battle")?.peak };
});
await writeFile(resolve(root, "artifacts/phaser-phase1/comparison.json"), JSON.stringify({ before: before.generatedAt, after: after.generatedAt, changes }, null, 2) + "\n");
const rows = changes.map((r) => `| ${r.reference} | ${r.scenario} | ${r.beforeFps} → ${r.afterFps} | ${r.frameMeanDeltaPercent}% | ${r.p95Before} → ${r.p95After} | ${r.afterPeak.objects}/${r.afterPeak.particles}/${r.afterPeak.emitters}/${r.afterPeak.filters} | ${r.comparable ? "sí" : "revisar entorno"} |`);
await writeFile(resolve(root, "artifacts/phaser-phase1/comparison.md"), `# Phaser: fase 0 frente a fase 1\n\nMuestras únicas de 3000 ms, con el mismo escenario de referencia; el delta positivo indica mayor tiempo por frame. No es una prueba estadística ni una medición GPU.\n\nAntes: ${before.generatedAt}. Después: ${after.generatedAt}.\n\n| Referencia | Escenario | FPS antes → después | Delta frame medio | p95 ms antes → después | Pico objetos/partículas/emisores/filtros | Entorno comparable |\n| --- | --- | --- | ---: | --- | --- | --- |\n${rows.join("\n")}\n\nErrores después: ${after.errors.length}; excesos: ${after.violations.length}; omitidos: ${after.skipped.length}.\n`);
process.stdout.write(`Comparadas ${changes.length} muestras; ${changes.filter((row) => row.comparable).length} con renderer, resolución, navegador y CPU coincidentes.\n`);
