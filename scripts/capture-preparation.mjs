import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { ensurePhaser } from "../tests/helpers/phaser-loader.mjs";

// Ejecutar con scripts/static-server.mjs activo en el puerto 4173.
await mkdir("docs/screenshots", { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("http://127.0.0.1:4173/");
  await page.evaluate(async () => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js");
    const { STORY_SAGAS } = await import("/src/content/index.js");
    const { FIRST_SAGA_CONCLUSION_NOTICE } = await import("/src/kurogane.js");
    const save = createCharacter(createDefaultSave(), { name: "Akio", affinity: "fuego", bodyType: "male" });
    save.campaign.completedMissions = [...STORY_SAGAS[0].missionIds, "k01", "k02"];
    Object.assign(save.campaign, { archiveUnlocked: true, tutorialSeen: true,
      kuroganePrologueCompleted: true, kuroganeGiftsGranted: true, kuroganeCompanion: "akari" });
    save.campaign.seenMissionNotices.push(FIRST_SAGA_CONCLUSION_NOTICE);
    save.progression.level = 9;
    writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
    localStorage.setItem("music-enabled", "off");
    localStorage.setItem("seal-input-mode", "automatic");
  });
  await page.reload();
  await ensurePhaser(page);
  await page.evaluate(() => {
    const Original = Phaser.Game;
    Phaser.Game = class extends Original { constructor(config) { super(config); window.__captureGame = this; } };
  });
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-mission="k03"]').click();
  await page.waitForFunction(() => window.__captureGame?.scene.getScene("battle")?.trainingTargets?.length, null, { timeout: 45000 });
  await page.evaluate(async () => {
    const s = window.__captureGame.scene.getScene("battle");
    s.stopTurnTimeline(); s.timelinePaused = true; s.busy = false;
    const { startPlayerPreparing } = await import("/src/fighters.js?v=0.159.0");
    s.selectTrainingTarget(1);
    window.__captureFighter = s.trainingTargets[1].fighter;
    startPlayerPreparing(s, window.__captureFighter);
    s.refreshHud();
  });
  await page.waitForFunction(() => window.__captureFighter?.preparationSeal?.visible);
  await page.waitForTimeout(350);
  await page.screenshot({ path: "docs/screenshots/manos-preparacion-v2.png" });
  const detail = await page.evaluate(() => {
    const s = window.__captureGame.scene.getScene("battle"), f = window.__captureFighter;
    const canvas = s.game.canvas.getBoundingClientRect(), scale = canvas.width / 960;
    return { clip: { x: canvas.x + (f.body.x - 64) * scale, y: canvas.y + (f.body.y - 146) * scale,
      width: 128 * scale, height: 216 * scale }, seams: f.preparationSeamWidths };
  });
  await page.screenshot({ path: "docs/screenshots/manos-preparacion-v2-detalle.png", clip: detail.clip });
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(JSON.stringify(detail));
} finally { await browser.close(); }
