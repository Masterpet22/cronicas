import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { bootPerformanceReference, preparePerformanceScenario, readPerformanceReference, capturePerformancePreview, disposePerformanceReference } from "../tests/helpers/performance-harness.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "artifacts/phaser-phase1/arenas");
const baseURL = "http://127.0.0.1:4173";
const reports = [], errors = [], skipped = [];
let server, browser;
try {
  try { await fetch(baseURL); } catch {
    server = spawn(process.execPath, ["scripts/static-server.mjs"], { cwd: root, stdio: "ignore", windowsHide: true });
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try { await fetch(baseURL); break; } catch { await new Promise((done) => setTimeout(done, 100)); }
    }
  }
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true });
  for (const mode of [{ renderer: "WebGL", lightMode: false }, { renderer: "WebGL", lightMode: true }, { renderer: "Canvas", lightMode: false }]) {
    for (let arenaIndex = 0; arenaIndex < 3; arenaIndex += 1) {
      const context = await browser.newContext({ baseURL, viewport: { width: 1366, height: 768 }, reducedMotion: "no-preference", deviceScaleFactor: 1 });
      const page = await context.newPage();
      const label = `${arenaIndex + 1}-${mode.renderer.toLowerCase()}-${mode.lightMode ? "light" : "normal"}`;
      page.on("pageerror", (error) => errors.push({ label, message: error.message }));
      page.on("console", (message) => { if (message.type() === "error") errors.push({ label, message: message.text() }); });
      try {
        if (mode.renderer === "WebGL" && !await page.evaluate(() => Boolean(document.createElement("canvas").getContext("webgl2")))) {
          skipped.push(label); continue;
        }
        await bootPerformanceReference(page, { ...mode, arenaIndex });
        await preparePerformanceScenario(page, "charged-turn");
        await page.waitForTimeout(1200);
        const report = await readPerformanceReference(page);
        const profile = await page.evaluate(() => {
          const controller = window.__performanceReference.scene.arenaVisuals;
          return { id: controller.profile.id, label: controller.profile.label, owned: controller.ownedCount };
        });
        assert.deepEqual(report.scenes.flatMap((scene) => scene.violations), [], label);
        const screenshot = `${profile.id}-${label}.png`;
        await capturePerformancePreview(page, "charged-turn", resolve(output, screenshot));
        reports.push({ ...report, profile, screenshot });
        await disposePerformanceReference(page);
        process.stdout.write(`Arena verificada: ${profile.id} · ${mode.renderer} · ${mode.lightMode ? "ligero" : "normal"}\n`);
      } finally { await context.close(); }
    }
  }
  await writeFile(resolve(output, "verification.json"), JSON.stringify({ generatedAt: new Date().toISOString(), reports, errors, skipped }, null, 2) + "\n");
  assert.deepEqual(errors, [], "No debe haber errores del navegador");
  assert.ok(reports.length >= 3, "Se deben verificar al menos las tres arenas en Canvas");
} finally { await browser?.close(); server?.kill(); }
