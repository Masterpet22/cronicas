import { expect, test } from "@playwright/test";

async function openDojo(page, { level = 3, loadout = ["fire_embers", "fire_breath"] } = {}) {
  await page.goto("/");
  await expect(page.locator(".save-selector")).toBeVisible();
  await page.evaluate(async ({ level, loadout }) => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.106.0");
    const save = createCharacter(createDefaultSave(), { name: "Akio", affinity: "fuego", bodyType: "male" });
    save.progression.level = level;
    save.character.affinityXp.fuego = 196;
    save.campaign.tutorialSeen = true;
    save.loadout = loadout;
    writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
  }, { level, loadout });
  await enterDojo(page);
}

async function enterDojo(page) {
  await page.reload();
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-view="dojo"]').click();
  await expect(page.locator(".dojo-technique-workspace")).toBeVisible();
}

const loadout = page => page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")).loadout);

test("nivel 3 explica la capacidad y permite reemplazar una equipada por una aprendida", async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 748 });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await openDojo(page);
  await expect(page.locator("[data-equipped-count]")).toHaveText("2/2 EQUIPADAS");
  await expect(page.locator('[data-loadout-locked="3"]')).toContainText("nivel 5");
  await expect(page.locator('[data-loadout-locked="4"]')).toContainText("nivel 8");
  await expect(page.locator("[data-technique-feedback]")).toBeVisible();
  await expect(page.locator("[data-technique-feedback]")).toContainText("ranuras están ocupadas");
  await expect(page.locator('[data-skill-select="fire_arc"] .skill-state')).toHaveText("APRENDIDA");
  const original = await loadout(page);
  await page.locator('[data-skill-select="fire_arc"]').click();
  expect(await loadout(page)).toEqual(original);
  await expect(page.locator(".technique-detail h3")).toHaveText("Arco de llama");
  await expect(page.locator('[data-technique-toggle="fire_arc"]')).toHaveText("REEMPLAZAR UNA EQUIPADA");
  await page.locator('[data-technique-toggle="fire_arc"]').click();
  await expect(page.locator("[data-replace-slot]")).toHaveCount(2);
  await expect(page.locator("[data-technique-feedback]")).toContainText("Elige qué técnica reemplazar");
  expect(await loadout(page)).toEqual(original);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-replace-slot]")).toHaveCount(0);
  expect(await loadout(page)).toEqual(original);
  await page.locator('[data-technique-toggle="fire_arc"]').click();
  await page.screenshot({ path: "test-results/dojo-techniques/reemplazar-1360.png" });
  await page.getByRole("button", { name: "Reemplazar Aliento de brasa por Arco de llama", exact: true }).click();
  expect(await loadout(page)).toEqual(["fire_embers", "fire_arc"]);
  await expect(page.locator('[data-skill-select="fire_arc"] .skill-state')).toHaveText("EN COMBATE · RANURA 2");
  await expect(page.locator('[data-skill-select="fire_breath"] .skill-state')).toHaveText("APRENDIDA");
  await expect(page.locator("[data-technique-feedback]")).toContainText("Ambas siguen aprendidas");
  await enterDojo(page);
  expect(await loadout(page)).toEqual(["fire_embers", "fire_arc"]);
  await expect(page.locator('[data-loadout-inspect="fire_arc"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test("una ranura libre permite equipar y consultar una bloqueada no cambia el equipo", async ({ page }) => {
  await openDojo(page, { loadout: ["fire_embers"] });
  await expect(page.locator("[data-equipped-count]")).toHaveText("1/2 EQUIPADAS");
  await expect(page.locator(".technique-loadout-slot.is-empty")).toContainText("Ranura libre");
  await page.locator('[data-skill-select="fire_arc"]').click();
  await expect(page.locator('[data-technique-toggle="fire_arc"]')).toHaveText("EQUIPAR EN RANURA LIBRE");
  await page.locator('[data-technique-toggle="fire_arc"]').click();
  expect(await loadout(page)).toEqual(["fire_embers", "fire_arc"]);
  await page.locator('[data-skill-select="fire_phoenix"]').click();
  await expect(page.locator('[data-technique-toggle="fire_phoenix"]')).toBeDisabled();
  await expect(page.locator(".technique-detail")).toContainText("280 PX de afinidad");
  expect(await loadout(page)).toEqual(["fire_embers", "fire_arc"]);
  await page.locator('[data-loadout-remove="0"]').click();
  expect(await loadout(page)).toEqual(["fire_arc"]);
  await expect(page.locator('[data-skill-select="fire_embers"] .skill-state')).toHaveText("APRENDIDA");
  await page.locator('[data-dojo-tab="appearance"]').click();
  await page.locator('[data-dojo-tab="techniques"]').click();
  await page.locator('[data-skill-select="fire_embers"]').click();
  await page.locator('[data-technique-toggle="fire_embers"]').click();
  expect(await loadout(page)).toEqual(["fire_arc", "fire_embers"]);
});

for (const { level, capacity, locked } of [{ level: 5, capacity: 3, locked: 1 }, { level: 8, capacity: 4, locked: 0 }]) {
  test(`el nivel ${level} muestra ${capacity} ranuras y equipa en el espacio nuevo`, async ({ page }) => {
    await openDojo(page, { level });
    await expect(page.locator(".technique-loadout-slot.is-locked")).toHaveCount(locked);
    await expect(page.locator("[data-equipped-count]")).toHaveText(`2/${capacity} EQUIPADAS`);
    await page.locator('[data-skill-select="fire_arc"]').click();
    await page.locator('[data-technique-toggle="fire_arc"]').click();
    expect(await loadout(page)).toEqual(["fire_embers", "fire_breath", "fire_arc"]);
    await expect(page.locator('[data-skill-select="fire_arc"] .skill-state')).toHaveText("EN COMBATE · RANURA 3");
  });
}

for (const viewport of [{ width: 1600, height: 900 }, { width: 1360, height: 748 }, { width: 1280, height: 720 }]) {
  test(`el detalle y sus acciones quedan dentro del panel a ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openDojo(page);
    const layout = await page.locator("#dojo-panel-techniques").evaluate(panel => {
      const outer = panel.getBoundingClientRect();
      const detail = panel.querySelector(".technique-detail").getBoundingClientRect();
      const actions = panel.querySelector(".technique-detail-actions").getBoundingClientRect();
      const equip = panel.querySelector(".technique-equip-button").getBoundingClientRect();
      const loadout = panel.querySelector(".technique-loadout").getBoundingClientRect();
      const catalog = panel.querySelector(".skill-tree").getBoundingClientRect();
      const contained = (child, parent) => child.top >= parent.top - 1 && child.bottom <= parent.bottom + 1 && child.left >= parent.left - 1 && child.right <= parent.right + 1;
      return { detail: contained(detail, outer), actions: contained(actions, detail), equip: contained(equip, actions), loadout: contained(loadout, outer), catalog: contained(catalog, outer), outerOverflow: panel.scrollHeight - panel.clientHeight, actionVisible: equip.height >= 44 };
    });
    expect(layout).toEqual({ detail: true, actions: true, equip: true, loadout: true, catalog: true, outerOverflow: 0, actionVisible: true });
    expect((await page.locator(".skill-branch > header").first().boundingBox()).height).toBeGreaterThanOrEqual(28);
    await page.screenshot({ path: `test-results/dojo-techniques/panel-${viewport.width}.png` });
  });
}
