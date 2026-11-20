import { test, expect } from "@playwright/test";
import { ensurePhaser } from "./helpers/phaser-loader.mjs";
import { bootPerformanceReference } from "./helpers/performance-harness.mjs";

async function seed(page, archiveUnlocked = false) {
  await page.goto("/");
  await page.evaluate(async archiveUnlocked => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js");
    localStorage.clear(); sessionStorage.clear();
    const save = createCharacter(createDefaultSave(), { name: "Libre", affinity: "fuego" });
    save.campaign.tutorialSeen = true;
    save.campaign.archiveUnlocked = archiveUnlocked;
    save.campaign.npcIntroductions = ["headquarters:ren", "dojo:mei", "archive:sayo"];
    writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
    localStorage.setItem("music-enabled", "off");
  }, archiveUnlocked);
  await page.reload();
  await expect(page.locator(".village-map")).toBeVisible();
}

test("una partida nueva inicia la primera misión sin preparación forzada ni guías", async ({ page }, info) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await seed(page);
  await ensurePhaser(page);
  await page.locator('[data-go="headquarters"]').click();
  await page.locator('[data-saga="saga-1"]').click();
  await expect(page.locator('[data-mission="m01"]')).toBeEnabled();
  await expect(page.locator(".saga-tutorial-coach, [data-coach-open]")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("misiones-sin-guias.png") });
  await page.locator('[data-mission="m01"]').click();
  const dialogue = page.locator(".dialogue-overlay");
  await expect(dialogue).toBeVisible();
  for (let i = 0; i < 6 && await dialogue.isVisible(); i++) await dialogue.locator(".primary-button").click();
  await expect(page.locator("#game canvas")).toBeVisible({ timeout: 30000 });
  await expect(page.locator("[data-skill-table-switch]")).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".combat-tutorial, .tutorial-dialogue-box, .saga-tutorial-coach")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("primer-combate-sin-guias.png") });
  expect(errors).toEqual([]);
});

test("Biblioteca conserva consulta e historia sin curso ni repetición del tutorial", async ({ page }, info) => {
  await seed(page, true);
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-view="archive"]').click();
  await expect(page.getByRole("tab", { name: "Diccionario" })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Bestiario/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Crónica/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Tutorial" })).toHaveCount(0);
  await expect(page.locator("[data-replay-tutorial], .saga-tutorial-coach")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("biblioteca-sin-tutorial.png") });
});

for (const renderer of ["Canvas", "WebGL"]) test(`${renderer}: la primera misión inicia sin guía con historial vacío`, async ({ page }) => {
  await bootPerformanceReference(page, { renderer, arenaIndex: 0, completed: false });
  const result = await page.evaluate(() => {
    const scene = window.__performanceReference.scene;
    return { mission: scene.mission.id, guide: Boolean(scene.combatTutorial),
      phase: typeof scene.triggerBossPhaseTwo, loadout: scene.battleLoadout };
  });
  expect(result.mission).toBe("m01");
  expect(result.guide).toBe(false);
  expect(result.phase).toBe("function");
  await expect(page.locator(".combat-tutorial, .level-up-explanation")).toHaveCount(0);
});
