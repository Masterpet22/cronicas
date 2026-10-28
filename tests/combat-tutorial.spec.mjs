import { expect, test } from "@playwright/test";
import { ensurePhaser } from "./helpers/phaser-loader.mjs";

async function prepare(page, { manual = false, emptyLoadout = false, completed = false, power = false } = {}) {
  await page.goto("/");
  await page.evaluate(async ({ manual, emptyLoadout, completed, power }) => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.94.0");
    localStorage.clear();
    sessionStorage.clear();
    const save = createCharacter(createDefaultSave(), { name: "Aprendiz", affinity: "fuego", bodyType: "male", appearance: "#315f87" });
    save.campaign.tutorialSeen = true;
    if (emptyLoadout) save.loadout = [];
    if (completed) save.campaign.completedMissions = ["m01"];
    if (power) {
      save.progression.level = 30;
      save.progression.attributes = { health: 250, strength: 250, speed: 250, chakra: 250, luck: 250 };
    }
    writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
    localStorage.setItem("music-enabled", "off");
    localStorage.setItem("seal-input-mode", manual ? "manual" : "automatic");
  }, { manual, emptyLoadout, completed, power });
  await page.reload();
  await ensurePhaser(page);
  await page.evaluate(() => {
    const Game = window.Phaser.Game;
    window.Phaser.Game = class extends Game {
      constructor(config) { super(config); window.__tutorialGame = this; }
    };
  });
}

async function launch(page, replay = false) {
  if (replay) {
    await openArchive(page);
    await page.locator("[data-replay-tutorial]").click();
  } else {
    await page.locator(".debug-tools-trigger").click();
    await page.locator('[data-debug-mission="m01"]').click();
  }
  await expect(page.locator('[data-tutorial-step="welcome"]')).toBeVisible({ timeout: 30000 });
}

async function openArchive(page) {
  await page.locator('[data-go="archive"]').click();
  const advance = page.locator('[data-stage-next]');
  for (let guard = 0; guard < 8 && !await page.locator('[data-replay-tutorial]').isVisible(); guard += 1) {
    await advance.click();
    await page.waitForTimeout(220);
  }
}

async function step(page, id) {
  await expect(page.locator(`.combat-tutorial[data-tutorial-step="${id}"] .tutorial-card`)).toBeVisible({ timeout: 20000 });
}
const next = page => page.locator("[data-tutorial-next]").click();
async function intro(page) {
  for (const id of ["welcome", "health", "chakra", "timeline"]) { await step(page, id); await next(page); }
}

test("la misión enseña sobre el HUD real y omitir permite combatir y pausar", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await prepare(page);
  await launch(page);
  await next(page);
  await step(page, "health");
  const before = await page.evaluate(async () => {
    const { battleRuntime } = await import("/src/battle/runtime.js?v=0.91.0");
    return JSON.stringify(battleRuntime.activeSave);
  });
  await page.waitForTimeout(1500);
  await expect(page.locator(".combat-access-progress progress").first()).toHaveJSProperty("value", 0);
  await page.locator("[data-tutorial-back]").click();
  await step(page, "welcome");
  await intro(page);
  await step(page, "strike");
  await page.locator("#game").screenshot({ path: "test-results/tutorial-strike.png" });
  await page.keyboard.press("6");
  await step(page, "strike");
  await page.locator('[data-combat-action="1"]').click();
  await step(page, "guard");
  await page.locator("[data-tutorial-skip]").click();
  await expect(page.locator(".combat-tutorial")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.locator(".combat-pause-access")).toBeVisible();
  expect(await page.evaluate(async () => {
    const { battleRuntime } = await import("/src/battle/runtime.js?v=0.91.0");
    return JSON.stringify(battleRuntime.activeSave);
  })).toBe(before);
  expect(errors).toEqual([]);
});

test("el repaso completo con sellos manuales y equipo vacío conserva la partida", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await prepare(page, { manual: true, emptyLoadout: true, completed: true });
  const saved = await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"));
  await launch(page, true);
  await intro(page);
  for (const id of ["strike", "guard", "technique", "preparation", "seals"]) { await step(page, id); await next(page); }
  await page.waitForTimeout(1600); // First practice deliberately has no timeout.
  await expect(page.locator('.combat-tutorial')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    return window.__tutorialGame.scene.getScene("battle").sealPrompt?.text;
  })).toMatch(/^PULSA/);
  for (let index = 0; index < 2; index += 1) {
    const key = await page.evaluate(() => {
      return window.__tutorialGame.scene.getScene("battle").sealPrompt.text.match(/^PULSA ([A-Z])/)[1];
    });
    await page.keyboard.press(key);
    if (index === 0) await page.waitForTimeout(180);
  }
  await step(page, "cooldowns");
  await next(page);
  await step(page, "complete");
  await next(page);
  await expect(page.locator("[data-replay-tutorial]")).toBeVisible();
  await expect(page.locator("#game canvas")).toHaveCount(1);
  await expect(page.locator("#game")).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"))).toBe(saved);
  expect(errors).toEqual([]);
});

test("la biblioteca ofrece la guía desde el inicio y salir no añade progreso", async ({ page }) => {
  await prepare(page);
  await openArchive(page);
  await expect(page.locator("[data-replay-tutorial]")).toBeVisible();
  await expect(page.locator(".bestiary-grid")).toHaveCount(0);
  const saved = await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"));
  await page.locator("[data-replay-tutorial]").click();
  await step(page, "welcome");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-replay-tutorial]")).toBeVisible();
  await expect(page.locator(".combat-tutorial")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"))).toBe(saved);
});

test("se puede salir mientras un sello manual espera sin límite de tiempo", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await prepare(page, { manual: true });
  const saved = await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"));
  await launch(page, true);
  await intro(page);
  for (const id of ["strike", "guard", "technique", "preparation", "seals"]) { await step(page, id); await next(page); }
  await expect.poll(() => page.evaluate(() => window.__tutorialGame.scene.getScene("battle").sealPrompt?.text)).toMatch(/^PULSA/);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-replay-tutorial]")).toBeVisible();
  await expect(page.locator("#game canvas")).toHaveCount(1);
  await expect(page.locator("#game")).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"))).toBe(saved);
  expect(errors).toEqual([]);
});

test("omitir desde la bienvenida deja ejecutar acciones normales", async ({ page }) => {
  await prepare(page, { power: true });
  await launch(page);
  await page.locator('[data-tutorial-skip]').click();
  const action = page.locator('[data-combat-action="1"]');
  await expect(action).toHaveAttribute('aria-disabled', 'false');
  const before = await page.evaluate(() => window.__tutorialGame.scene.getScene('battle').round);
  await page.keyboard.press("1");
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__tutorialGame.scene.getScene('battle');
    return { hp: scene.enemy.hp, busy: scene.busy, ready: scene.turnReady, active: scene.combatTutorial.active, allowed: scene.combatTutorial.canUse(scene.actions[0]), message: scene.lastBattleMessage?.text };
  })).toMatchObject({ active: false });
  await expect.poll(() => page.evaluate(() => window.__tutorialGame.scene.getScene('battle').round)).toBeGreaterThan(before);
});

test("el repaso también se completa con sellos automáticos", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await prepare(page);
  const saved = await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"));
  await launch(page, true);
  await intro(page);
  for (const id of ["strike", "guard", "technique", "preparation", "seals", "cooldowns", "complete"]) {
    await step(page, id);
    if (id === "seals") await expect(page.locator("#tutorial-copy")).toContainText("sellos automáticos");
    await next(page);
  }
  await expect(page.locator("[data-replay-tutorial]")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"))).toBe(saved);
  expect(errors).toEqual([]);
});
