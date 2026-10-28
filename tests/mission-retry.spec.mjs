import { expect, test } from "@playwright/test";

async function advanceDialogue(page) {
  const overlay = page.locator(".dialogue-overlay");
  await expect(overlay).toBeVisible();
  for (let guard = 0; guard < 12 && await overlay.isVisible(); guard += 1) await overlay.locator("button").click();
  await expect(overlay).toHaveCount(0);
}

async function openFirstMission(page) {
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-view="headquarters"]').click();
  await page.locator('[data-saga="saga-1"]').click();
  return page.locator('[data-mission="m01"]');
}

test("una misión fallida puede reintentarse después de recargar", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("music-enabled", "off");
  });
  await page.reload();
  await page.locator('[data-select-slot="1"]').click();
  await page.locator('input[name="name"]').fill("Retry");
  await page.locator("#character-form").getByRole("button", { name: "CREAR PERSONAJE" }).click();
  await advanceDialogue(page);

  await page.evaluate(() => {
    const slot = localStorage.getItem("cronicas-del-sello-save-active-slot") || "1";
    const key = `cronicas-del-sello-save-slot-${slot}`;
    const save = JSON.parse(localStorage.getItem(key));
    save.campaign.missionProgress.m01 = {
      status: "failed",
      currentStepId: "bandit-ambush",
      completedSteps: [],
      context: {},
      appliedEffects: [],
      attempts: 1
    };
    localStorage.setItem(key, JSON.stringify(save));
  });
  await page.reload();

  let retryButton = await openFirstMission(page);
  await expect(retryButton).toHaveText("REINTENTAR");
  await page.reload();
  retryButton = await openFirstMission(page);
  await expect(retryButton).toHaveText("REINTENTAR");

  await retryButton.click();
  await expect(page.locator(".dialogue-overlay")).toBeVisible();
  await advanceDialogue(page);
  await expect(page.locator("#game canvas")).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const slot = localStorage.getItem("cronicas-del-sello-save-active-slot") || "1";
    const save = JSON.parse(localStorage.getItem(`cronicas-del-sello-save-slot-${slot}`));
    return save.campaign.missionProgress.m01;
  })).toMatchObject({ status: "in-progress", attempts: 2 });
});
