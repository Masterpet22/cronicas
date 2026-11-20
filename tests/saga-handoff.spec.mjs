import { test, expect } from "@playwright/test";
import { receiveGuildGiftsOnPage } from "./helpers/guild-gifts.mjs";

async function seed(page, { bodyType = "male", complete = true } = {}) {
  await page.goto("/");
  await page.evaluate(async ({ bodyType, complete }) => {
    const { createDefaultSave, createCharacter, writeSave } = await import("/src/save.js?v=0.140.0");
    const { STORY_SAGAS } = await import("/src/content/index.js");
    let save = createCharacter(createDefaultSave(), { name: "Aprendiz", affinity: "agua", bodyType });
    save.campaign.completedMissions = STORY_SAGAS[0].missionIds.slice(0, complete ? undefined : -1);
    save.campaign.tutorialSeen = true; save.campaign.archiveUnlocked = true;
    save.progression.level = 6;
    writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
    localStorage.setItem("music-enabled", "off");
  }, { bodyType, complete });
  await page.reload();
  await expect(page.locator(".story-mission-current")).toBeVisible();
}

async function finishConclusion(page) {
  const overlay = page.getByRole("dialog", { name: "Saga 1 completada · Comienza la saga 2" });
  for (let index = 0; index < 3; index++) await overlay.getByRole("button", { name: "SIGUIENTE", exact: true }).click();
  await expect(overlay.getByRole("button", { name: "IR AL GREMIO", exact: true })).toBeVisible();
  await overlay.getByRole("button", { name: "IR AL GREMIO", exact: true }).click();
  await expect(page.locator('[data-location-stage="inn"]')).toBeVisible();
  await receiveGuildGiftsOnPage(page);
  const next = page.locator('[data-stage-speech]:not(.leaving) [data-stage-next]');
  for (let i = 0; i < 6 && await next.isVisible(); i++) await next.click();
  await expect(page.locator(".guild-hall")).toBeVisible();
}

for (const [bodyType, master, width] of [["male", "Mei Hayate", 1440], ["female", "Daichi Kazan", 1024]]) {
  test(`partida anterior: consejo de ${master}, apertura del Gremio y objetivo persistente`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await seed(page, { bodyType });
    const overlay = page.getByRole("dialog", { name: "Saga 1 completada · Comienza la saga 2" });
    await expect(overlay.locator(".story-dialogue-panel header")).toContainText(master);
    await expect(overlay.locator(".story-dialogue-panel p")).toContainText("formación");
    await expect(page.locator(".story-mission-current")).toBeEnabled();
    await expect(page.locator(".story-mission-current")).toHaveAttribute("data-view", "inn");
    await overlay.locator(".story-character img").evaluate(image => image.decode());
    await page.screenshot({ path: info.outputPath("consejo-maestro.png"), animations: "disabled" });
    await finishConclusion(page);
    await page.getByRole('button', { name: 'Hablar con Yuna Ametsuki', exact: true }).click();
    await expect(page.locator('[data-stage-ambient]')).toContainText('Llevas 0/2');
    await expect(page.locator('.guild-body > .guild-room-layout')).toHaveCount(1);
    if (width === 1440) expect(await page.locator('.guild-body').evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath("yuna-habitacion-sin-panel.png"), animations: "disabled" });
    await page.reload();
    await expect(page.locator(".dialogue-overlay")).toHaveCount(0);
    await expect(page.locator(".story-mission-current")).toContainText("IR A: Gremio");
    await page.locator(".story-mission-current").click();
    const next = page.locator('[data-stage-speech]:not(.leaving) [data-stage-next]');
    for (let i = 0; i < 6 && await next.isVisible(); i++) await next.click();
    for (const type of ["plant", "novice"]) {
      await page.locator(`[data-place-decor="${type}"]`).click();
      await page.locator("[data-room-place]").click();
    }
    await page.getByRole("button", { name: "Ir al Cuartel", exact: true }).click();
    for (let i = 0; i < 6 && await next.isVisible(); i++) await next.click();
    await expect(page.locator('.saga-header h2')).toHaveText("Los hermanos Kurogane");
    await expect(page.locator('[data-mission="k01"]')).toBeVisible();
  });
}

test("una victoria nueva presenta el cierre solo después de confirmar el informe", async ({ page }) => {
  await seed(page, { complete: false });
  await expect(page.locator(".dialogue-overlay")).toHaveCount(0);
  const staged = await page.evaluate(async () => {
    const { loadSave, completeMission } = await import("/src/save.js?v=0.140.0");
    const { STORY_SAGAS } = await import("/src/content/index.js");
    const { stageVictory } = await import("/src/battle/victory-transaction.js?v=0.95.0");
    const { battleRuntime } = await import("/src/battle/session.js?v=1.0.0");
    const completion = completeMission(loadSave(), STORY_SAGAS[0].missionIds.at(-1));
    stageVictory(battleRuntime, completion.save);
    return { first: completion.firstClear, completed: battleRuntime.activeSave.campaign.completedMissions, connection: battleRuntime.releaseGameToMeta.toString() };
  });
  expect(staged.first).toBe(true); expect(staged.connection).toContain("commitVictory");
  await expect(page.locator(".dialogue-overlay")).toHaveCount(0);
  await page.evaluate(async () => {
    const { battleRuntime } = await import("/src/battle/session.js?v=1.0.0");
    battleRuntime.releaseGameToMeta("plaza", { commitVictory: true });
  });
  await expect(page.getByRole("dialog", { name: "Saga 1 completada · Comienza la saga 2" })).toBeVisible();
  await finishConclusion(page);
});
