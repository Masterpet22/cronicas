import { test, expect } from "@playwright/test";

async function seedDojo(page, bodyType, unlocked = false) {
  await page.goto("/");
  await page.evaluate(async ({ bodyType, unlocked }) => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.119.0");
    const { MISSIONS } = await import("/src/content/index.js");
    const save = createCharacter(createDefaultSave(), { name: "Akio", affinity: "fuego", bodyType });
    save.campaign.tutorialSeen = true;
    if (unlocked) save.campaign.completedMissions = MISSIONS.map(mission => mission.id);
    writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
  }, { bodyType, unlocked });
  await page.reload();
  await page.locator('[data-go="dojo"]').click();
}

for (const { viewport, bodyType, master } of [
  { viewport: { width: 1600, height: 900 }, bodyType: "male", master: "mei" },
  { viewport: { width: 1280, height: 720 }, bodyType: "female", master: "daichi" }
]) test(`el maestro activo acompaña las cuatro pestañas a ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize(viewport);
  await seedDojo(page, bodyType);
  const host = page.locator(`.location-dojo [data-stage-npc="${master}"]`);
  await expect(page.locator(".location-dojo [data-stage-npc]")).toHaveCount(1);
  await expect(host).toBeVisible();
  await host.locator("img").evaluate(image => image.decode());
  await host.click();
  await expect(page.locator(".location-dojo [data-stage-ambient]")).toBeVisible();
  await expect(page.locator(".location-dojo [data-ambient-speaker]")).toContainText(master === "mei" ? "Mei Hayate" : "Daichi Kazan");
  await expect(page.locator(".location-dojo [data-ambient-text]")).not.toBeEmpty();
  for (const tab of ["techniques", "equipment", "statistics", "appearance"]) {
    await page.locator(`[data-dojo-tab="${tab}"]`).click();
    await expect(page.locator(`#dojo-panel-${tab}`)).toBeVisible();
    const layout = await page.locator(".location-dojo").evaluate(stage => {
      const host = stage.querySelector("[data-stage-npc]").getBoundingClientRect();
      const panel = stage.querySelector(".stage-options").getBoundingClientRect();
      const main = stage.querySelector(".dojo-main-panel");
      const tabs = stage.querySelector(".dojo-tabs").getBoundingClientRect();
      return { separate: host.right < panel.left, fits: panel.right <= innerWidth && panel.bottom <= innerHeight && tabs.right <= panel.right,
        overflowX: main.scrollWidth - main.clientWidth, overflowY: main.scrollHeight - main.clientHeight };
    });
    expect(layout).toMatchObject({ separate: true, fits: true });
    expect(layout.overflowX).toBeLessThanOrEqual(1);
    expect(layout.overflowY).toBeLessThanOrEqual(1);
    if (tab === "statistics") {
      await page.locator(".statistics-radar-card").scrollIntoViewIfNeeded();
      const visible = await page.locator(".statistics-radar-card").evaluate(card => {
        const bounds = card.getBoundingClientRect(), panel = card.closest(".dojo-main-panel").getBoundingClientRect();
        return bounds.height >= 240 && bounds.bottom <= panel.bottom + 1;
      });
      expect(visible).toBe(true);
    }
    await page.screenshot({ path: testInfo.outputPath(`maestro-${tab}.png`) });
  }
  expect(errors).toEqual([]);
});

test("cambiar de maestro actualiza el retrato lateral y lo conserva al recargar", async ({ page }) => {
  await seedDojo(page, "male", true);
  await expect(page.locator('.location-dojo [data-stage-npc="mei"]')).toBeVisible();
  await page.locator('[data-dojo-tab="equipment"]').click();
  await page.locator("[data-open-master]").click();
  await page.locator('.master-modal [data-master="daichi"]').click();
  await expect(page.locator('.location-dojo [data-stage-npc="daichi"]')).toBeVisible();
  await expect(page.locator('.location-dojo [data-stage-npc="mei"]')).toHaveCount(0);
  await expect(page.locator(".master-summary-card")).toContainText("Daichi Kazan");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")).character.masterId)).toBe("daichi");
  await page.reload();
  await page.locator('[data-go="dojo"]').click();
  await expect(page.locator('.location-dojo [data-stage-npc="daichi"]')).toBeVisible();
});
