import { expect, test } from "@playwright/test";

async function newCharacter(page, slot = 1) {
  await page.goto("/");
  await page.locator(`[data-select-slot="${slot}"]`).click();
  await expect(page.locator(".creator-customizer")).toBeVisible();
}

async function waitForPreview(page, selector = "[data-creator-preview]") {
  await page.locator(selector).evaluate(async (element) => {
    await Promise.all([...element.querySelectorAll("img")].map((image) => image.decode()));
  });
}

for (const viewport of [{ width: 1600, height: 900 }, { width: 1360, height: 748 }]) {
  test(`creación con vista previa, género y afinidad a ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await newCharacter(page);
    await waitForPreview(page);
    await expect(page.locator(".creator-affinity-choice")).toHaveCount(4);
    await expect(page.locator("[data-creator-preview]")).toHaveAttribute("data-body-type", "male");
    await expect(page.locator(".creator-preview img").first()).toHaveAttribute("src", /man_sprites/);
    await expect(page.locator('select[name="hair"], input[type="color"]')).toHaveCount(0);
    await page.screenshot({ path: `artifacts/character-creator/masculino-${viewport.width}.png` });

    await page.locator('[data-creator-gender-step="1"]').click();
    await expect(page.locator('select[name="bodyType"]')).toHaveValue("female");
    await expect(page.locator(".creator-preview img").first()).toHaveAttribute("src", /woman_sprites/);
    await page.locator('[data-creator-gender-step="-1"]').click();
    await expect(page.locator('select[name="bodyType"]')).toHaveValue("male");
    await page.locator('select[name="bodyType"]').selectOption("female");
    await page.locator('input[name="name"]').fill("Mika");
    await expect(page.locator("[data-creator-name]")).toHaveText("Mika");
    await page.locator('.creator-affinity-choice:has(input[value="agua"])').click();
    await expect(page.locator('input[value="agua"]')).toBeChecked();
    await expect(page.locator("[data-creator-affinity-name]")).toHaveText("Agua");
    await expect(page.locator("[data-creator-affinity-icon]")).toHaveAttribute("src", /agua.webp/);
    await waitForPreview(page);
    const geometry = await page.locator(".creator-customizer").evaluate((card) => {
      const stage = document.querySelector("main").getBoundingClientRect();
      const box = card.getBoundingClientRect();
      const preview = card.querySelector(".creator-preview").getBoundingClientRect();
      const rig = card.querySelector(".puppet-preview-rig").getBoundingClientRect();
      const label = card.querySelector(".creator-gender-control label").getBoundingClientRect();
      const stepper = card.querySelector(".creator-gender-control .cosmetic-stepper").getBoundingClientRect();
      return { fits: box.left >= stage.left && box.right <= stage.right && box.top >= stage.top && box.bottom <= stage.bottom, overflow: card.scrollHeight - card.clientHeight, contained: rig.top >= preview.top && rig.bottom <= preview.bottom, genderLayout: label.right <= stepper.left && Math.abs(label.top - stepper.top) < 25 };
    });
    expect(geometry).toEqual({ fits: true, overflow: 0, contained: true, genderLayout: true });
    await page.screenshot({ path: `artifacts/character-creator/femenino-${viewport.width}.png` });
    const beforeSave = await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"));
    expect(beforeSave).toBeNull();
    const previewLayers = await page.locator(".creator-preview .puppet-preview-layer").evaluateAll((layers) => layers.map((layer) => ({ src: layer.getAttribute("src"), geometry: layer.getAttribute("style") })));
    await page.locator("#character-form").getByRole("button", { name: "CREAR PERSONAJE" }).click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")));
    expect(saved.character).toMatchObject({ name: "Mika", bodyType: "female", affinity: "agua", affinities: ["agua"], hair: 1, appearance: "#55bfff" });
    const dialogue = page.locator(".dialogue-overlay");
    for (let i = 0; i < 6 && await dialogue.isVisible(); i += 1) await dialogue.locator("button").click();
    await page.locator(".debug-tools-trigger").click();
    await page.locator('[data-debug-view="dojo"]').click();
    await page.locator('[data-dojo-tab="appearance"]').click();
    await waitForPreview(page, "#dojo-panel-appearance");
    const dojoLayers = await page.locator("#dojo-panel-appearance .puppet-preview-layer").evaluateAll((layers) => layers.map((layer) => ({ src: layer.getAttribute("src"), geometry: layer.getAttribute("style") })));
    expect(dojoLayers).toEqual(previewLayers);
    expect(errors).toEqual([]);
  });
}

test("volver a partidas descarta el borrador y un nombre vacío no crea personaje", async ({ page }) => {
  await newCharacter(page);
  await page.locator('input[name="name"]').fill("   ");
  await page.locator("#character-form").getByRole("button", { name: "CREAR PERSONAJE" }).click();
  await expect(page.locator('input[name="name"]:invalid')).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"))).toBeNull();
  await page.locator('input[name="name"]').fill("Borrador");
  await page.locator('[data-creator-gender-step="1"]').click();
  await page.locator("[data-back-to-slots]").click();
  await expect(page.locator(".save-slot.empty")).toHaveCount(3);
  await page.locator('[data-select-slot="2"]').click();
  await expect(page.locator('input[name="name"]')).toHaveValue("Akio");
  await expect(page.locator('select[name="bodyType"]')).toHaveValue("male");
  await expect(page.locator(".creator-heading")).toContainText("PARTIDA 2");
});
