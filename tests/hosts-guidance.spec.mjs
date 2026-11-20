import { test, expect } from "@playwright/test";
import { receiveGuildGiftsOnPage } from "./helpers/guild-gifts.mjs";

async function seed(page, legacy = false) {
  await page.goto("/");
  await page.evaluate(async legacy => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.140.0");
    const { STORY_SAGAS } = await import("/src/content/index.js");
    const { LOCATION_CAST } = await import("/src/npcs.js?v=0.131.0");
    const { FIRST_SAGA_CONCLUSION_NOTICE, receiveGuildGifts } = await import("/src/kurogane.js");
    let save = createCharacter(createDefaultSave(), { name: "Visitante", affinity: "agua", bodyType: "male" });
    save.campaign.completedMissions = (legacy ? [STORY_SAGAS[0]] : STORY_SAGAS).flatMap(s => s.missionIds);
    save.campaign.tutorialSeen = true; save.campaign.archiveUnlocked = true;
    save.campaign.seenMissionNotices = [FIRST_SAGA_CONCLUSION_NOTICE];
    save.campaign.npcIntroductions = Object.entries(LOCATION_CAST).flatMap(([place, cast]) => cast.map(id => `${place}:${id}`));
    save.progression.level = 30; save.progression.coins = 2500;
    save.campaign.completedSecondaryMissions = ["affinity_trial_2"];
    if (legacy) {
      save.campaign.kuroganeGiftsGranted = true;
      save.campaign.kuroganeRoomLessons = ["plant"];
      save.inventory.items.guild_decor_plant = 2; save.inventory.items.guild_decor_novice = 2;
      save.guild.room.decorations = [{ id: "decor-1", type: "novice", x: 220, y: 190, scale: 1 }, { id: "decor-2", type: "plant", x: 520, y: 510, scale: 1 }];
    } else {
      // A completed prologue has already acknowledged the master's delivery.
      save.campaign.completedMissions = [...STORY_SAGAS[0].missionIds];
      save = receiveGuildGifts(save);
      save.campaign.completedMissions = STORY_SAGAS.flatMap(s => s.missionIds);
      save.campaign.kuroganePrologueCompleted = true;
    }
    writeSave(save); sessionStorage.setItem("cronicas-save-slot-selected", "1");
    localStorage.setItem("music-enabled", "off");
  }, legacy);
  await page.reload(); await expect(page.locator(".village-map")).toBeVisible();
}

test("los ocho lugares dan su ayuda mediante el encargado y no mediante bloques repetidos", async ({ page }, info) => {
  test.setTimeout(150000);
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await seed(page);
  await page.evaluate(() => { Math.random = () => 0; });
  for (const [place, npc, removed] of [
    ["headquarters", "ren", ".mission-board > .lead"], ["missions", "riku", ".mission-board > .lead"],
    ["dojo", "mei", ".dojo-title small, .dojo-section-heading p"], ["shop", "hana", ".shop-heading p, .shop-tabs > span"],
    ["archive", "sayo", ".archive-tutorial > p:not(.eyebrow)"], ["arena", "goro", ".arena-practice-note"],
    ["tower", "kureha", ".tower-note"], ["event", "nao", null]
  ]) {
    await page.locator(`[data-go="${place}"]`).click();
    const actor = page.locator(`[data-stage-npc="${npc}"]`);
    await expect(actor).toBeVisible(); await actor.click();
    await expect(page.locator("[data-stage-ambient]")).toBeVisible();
    await expect(page.locator("[data-ambient-text]")).not.toBeEmpty();
    if (removed) await expect(page.locator(removed)).toHaveCount(0);
    if (place === "event") await expect(page.locator(".events-calendar")).toBeVisible();
    await actor.locator("img").evaluate(image => image.decode());
    await expect.poll(() => actor.evaluate(element => {
      const image = element.querySelector("img").getBoundingClientRect();
      const label = element.querySelector("span").getBoundingClientRect();
      return label.top >= image.bottom;
    })).toBe(true);
    await page.screenshot({ path: info.outputPath(`${place}-encargado.png`), animations: "disabled" });
    await page.locator('[data-view="plaza"]').click();
  }
  expect(errors).toEqual([]);
});

test("las primeras visitas presentan a los encargados con maniquí y diálogo de escena", async ({ page }, info) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1024, height: 768 });
  await seed(page);
  await page.evaluate(async () => {
    const { loadSave, writeSave } = await import("/src/save.js");
    const save = loadSave();
    save.campaign.npcIntroductions = [];
    writeSave(save);
  });
  await page.reload();
  for (const [place, npc] of [
    ["headquarters", "ren"], ["dojo", "mei"], ["archive", "sayo"], ["shop", "hana"],
    ["tower", "kureha"], ["arena", "goro"], ["inn", "yuna"], ["missions", "riku"], ["event", "nao"]
  ]) {
    await page.locator(`[data-go="${place}"]`).click();
    const stage = page.locator(`[data-location-stage="${place}"]`);
    const portrait = stage.locator(`[data-stage-npc="${npc}"] img`);
    await expect(portrait).toHaveAttribute("src", new RegExp(`representatives/${npc}\\.webp`));
    await portrait.evaluate(image => image.decode());
    const intro = stage.locator("[data-stage-speech]");
    await expect(intro).toBeVisible();
    await expect(intro.locator(".scene-speaker strong")).not.toBeEmpty();
    const next = intro.locator("[data-stage-next]");
    await expect(next).toBeInViewport();
    if (npc === "ren" || npc === "hana") await stage.screenshot({ path: info.outputPath(`${npc}-primera-visita.png`) });
    while ((await next.textContent()) !== "VER OPCIONES") await next.click();
    await next.click();
    await expect(stage.locator("[data-stage-options]")).toBeVisible();
    if (npc === "hana") {
      await expect.poll(() => stage.evaluate(element => {
        const image = element.querySelector(".stage-character img");
        const { naturalWidth, naturalHeight } = image;
        const canvas = Object.assign(document.createElement("canvas"), { width: naturalWidth, height: naturalHeight });
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        const sole = context.getImageData(0, Math.floor(naturalHeight * .87), naturalWidth, Math.ceil(naturalHeight * .13)).data;
        let farthestPixel = 0;
        for (let pixel = 0; pixel < sole.length / 4; pixel++) {
          if (sole[pixel * 4 + 3] > 128) farthestPixel = Math.max(farthestPixel, pixel % naturalWidth);
        }
        const box = image.getBoundingClientRect();
        const scale = Math.min(box.width / naturalWidth, box.height / naturalHeight);
        const shoeEdge = box.left + (box.width - naturalWidth * scale) / 2 + farthestPixel * scale;
        return shoeEdge < element.querySelector("[data-stage-options]").getBoundingClientRect().left;
      })).toBe(true);
      await stage.screenshot({ path: info.outputPath("hana-calzado-visible.png") });
    }
    await page.locator('[data-view="plaza"]').click();
  }
  await page.reload();
  await page.locator('[data-go="headquarters"]').click();
  await expect(page.locator("[data-stage-speech]")).toBeHidden();
});

test("una habitación anterior con progreso 1/2 reconoce los regalos y permite seguir sin duplicarlos", async ({ page }, info) => {
  await seed(page, true);
  await page.locator('[data-go="inn"]').click();
  const gift = page.getByRole("dialog", { name: "Los regalos de tu maestro" });
  await expect(gift).toBeVisible(); await expect(gift).toContainText("sin recibir copias adicionales");
  await gift.locator(".story-character img").evaluate(image => image.decode());
  await page.screenshot({ path: info.outputPath("maestro-entrega-recuerdos.png"), animations: "disabled" });
  await receiveGuildGiftsOnPage(page);
  await expect(page.getByRole("button", { name: "Ir al Cuartel", exact: true })).toBeVisible();
  expect(await page.evaluate(async () => {
    const { loadSave } = await import("/src/save.js?v=0.140.0"); const save = loadSave();
    return { plant: save.inventory.items.guild_decor_plant, novice: save.inventory.items.guild_decor_novice, placed: save.guild.room.decorations.length };
  })).toEqual({ plant: 2, novice: 2, placed: 2 });
  await page.getByRole("button", { name: "Ir al Cuartel", exact: true }).click();
  await expect(page.locator('[data-mission="k01"]')).toBeVisible();
});
