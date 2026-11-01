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

test("dos ranuras independientes permiten desbloquear, equipar, mover y quitar taijutsus", async ({ page }) => {
  await page.setViewportSize({ width:1280,height:720 });
  const errors = []; page.on("pageerror",error => errors.push(error.message));
  await openDojo(page);
  const original = await loadout(page);
  const physical = () => page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")).taijutsuLoadout);
  await expect(page.locator(".taijutsu-loadout-slot")).toHaveCount(2);
  await expect(page.locator("[data-taijutsu-count]")).toHaveText("0/2 EQUIPADOS");
  await page.locator('[data-taijutsu-choose="0"]').click();
  await expect(page.locator('[data-taijutsu-equip="physical_1"][data-taijutsu-target="0"]')).toBeDisabled();
  for (const id of ["physical_0","physical_1","physical_2"]) {
    await page.locator(`[data-skill-select="${id}"]`).click();
    await page.locator(`[data-skill-invest="${id}"]`).click();
    if (id !== "physical_0") await page.locator(`[data-taijutsu-equip="${id}"][data-taijutsu-target="${id === "physical_1" ? 0 : 1}"]`).click();
  }
  await expect(page.locator("[data-taijutsu-count]")).toHaveText("2/2 EQUIPADOS");
  expect(await physical()).toEqual(["physical_1","physical_2"]);
  expect(await loadout(page)).toEqual(original);
  await page.mouse.move(10,10);
  await page.screenshot({ path:"test-results/dojo-techniques/taijutsus-1280.png" });
  await enterDojo(page);
  await expect(page.locator('[data-taijutsu-choose="0"]')).toContainText("Puño de hierro");
  await expect(page.locator('[data-taijutsu-choose="1"]')).toContainText("Paso fugaz");
  await expect(page.locator('[data-skill-select="physical_1"] .skill-state')).toHaveText("EN COMBATE · TAIJUTSU 1");
  await page.locator('[data-taijutsu-choose="0"]').click();
  await page.locator('[data-taijutsu-equip="physical_1"][data-taijutsu-target="1"]').click();
  expect(await physical()).toEqual(["physical_2","physical_1"]);
  await page.locator('[data-taijutsu-remove="0"]').click();
  expect(await physical()).toEqual([null,"physical_1"]);
  expect(await loadout(page)).toEqual(original);
  expect(errors).toEqual([]);
});

test("los puntos desbloquean especializaciones físicas, mejoran técnicas y persisten", async ({ page }) => {
  await openDojo(page);
  await expect(page.locator("[data-resonance-points]")).toHaveText("7");
  const stats = () => page.evaluate(async () => {
    const { loadSave,derivedStats } = await import("/src/save.js");
    return derivedStats(loadSave());
  });
  const original = await stats();
  await page.locator('[data-skill-select="physical_1"]').click();
  await expect(page.locator('[data-skill-invest="physical_1"]')).toBeDisabled();
  await page.locator('[data-skill-select="physical_0"]').click();
  await page.locator('[data-skill-invest="physical_0"]').click();
  await expect(page.locator("[data-resonance-points]")).toHaveText("6");
  expect((await stats()).maxHp).toBe(original.maxHp+5);
  await expect(page.locator('[data-skill-select="physical_0"]')).toHaveAttribute("data-state","unlocked");
  await page.locator('[data-skill-select="fire_embers"]').click();
  await page.locator('[data-skill-invest="fire_embers"]').click();
  await expect(page.locator("[data-resonance-points]")).toHaveText("5");
  await expect(page.locator(".technique-metrics")).toContainText("16");
  await expect(page.locator('[data-skill-select="fire_embers"]')).toHaveAttribute("data-state","upgraded");
  await enterDojo(page);
  expect((await stats()).maxHp).toBe(original.maxHp+5);
  await expect(page.locator("[data-resonance-points]")).toHaveText("5");
  expect(await loadout(page)).toEqual(["fire_embers","fire_breath"]);
});

test("el árbol permite zoom anclado, arrastre, ajuste y navegación por teclado", async ({ page }) => {
  await openDojo(page);
  const canvas = page.locator("[data-tree-canvas]");
  const initial = await canvas.getAttribute("viewBox");
  await page.getByRole("button",{ name:"Acercar árbol",exact:true }).click();
  const zoomed = await canvas.getAttribute("viewBox");
  expect(Number(zoomed.split(" ")[2])).toBeLessThan(Number(initial.split(" ")[2]));
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x+box.width*.15,box.y+box.height*.3);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.15+45,box.y+box.height*.3+30,{ steps:6 });
  await page.mouse.up();
  expect(await canvas.getAttribute("viewBox")).not.toBe(zoomed);
  await page.getByRole("button",{ name:"Mostrar árbol completo",exact:true }).click();
  expect(await canvas.getAttribute("viewBox")).toBe(initial);
  const node = page.locator('[data-skill-select="physical_0"]');
  await node.focus(); await page.keyboard.press("Enter");
  await expect(page.locator(".technique-detail h3")).toHaveText("Disciplina del cuerpo");
  await page.keyboard.press("+");
  expect(await canvas.getAttribute("viewBox")).not.toBe(initial);
  await page.keyboard.press("Home");
  expect(await canvas.getAttribute("viewBox")).toBe(initial);
  await page.locator("[data-tree-core]").click();
  await expect(page.locator(".technique-detail h3")).toHaveText("Núcleo de Resonancia");
});

test("tres afinidades revelan sus ocho celdas, puentes híbridos y técnicas avanzadas", async ({ page }) => {
  await openDojo(page);
  await page.evaluate(async () => {
    const { loadSave,writeSave } = await import("/src/save.js");
    const save = loadSave(); save.progression.level=35;
    save.character.affinities=["agua","tierra","fuego"];
    save.character.affinityXp={ agua:1000,tierra:1000,fuego:1000,viento:0 };
    save.campaign.elementRank=3; save.inventory.extraAffinityUnlocked=true;
    writeSave(save);
  });
  await enterDojo(page);
  for (let slot=0;slot<3;slot++) await expect(page.locator(`[data-category="affinity"][data-slot="${slot}"]`)).toHaveCount(8);
  const regionColors = await page.locator("[data-region]").evaluateAll(regions => regions.map(region => region.dataset.regionColor));
  expect(regionColors).toEqual(["#bca0ff","#55bfff","#b78a55","#ff783d"]);
  expect(new Set(regionColors).size).toBe(4);
  for (const border of await page.locator(".resonance-region-border").all()) expect(await border.evaluate(path => parseFloat(getComputedStyle(path).strokeWidth))).toBeGreaterThanOrEqual(6);
  await expect(page.locator('[data-category="physical"]')).toHaveCount(8);
  expect(await page.locator('[data-category="hybrid"]').count()).toBeGreaterThanOrEqual(9);
  await page.locator('[data-skill-select="hybrid_agua_tierra_1"]').click();
  await expect(page.locator(".resonance-requirements")).toContainText("Aqua Shuriken");
  await expect(page.locator(".resonance-requirements")).toContainText("Puño de roca");
  await page.locator('[data-skill-invest="hybrid_agua_tierra_1"]').click();
  await expect(page.locator('[data-skill-select="hybrid_agua_tierra_1"]')).toHaveAttribute("data-state","unlocked");
  await page.mouse.move(10,10);
  await page.screenshot({ path:"test-results/dojo-techniques/panal-tres-afinidades.png" });
});

test("las técnicas de tiers superiores reutilizan los iconos básicos", async ({ page }) => {
  const failures = [];
  page.on("response", response => { if (response.status() >= 400 && response.url().includes("/assets/")) failures.push(response.url()); });
  await openDojo(page);
  await page.evaluate(async () => {
    const { loadSave, writeSave } = await import("/src/save.js?v=0.106.0");
    const save = loadSave();
    save.progression.level = 35;
    save.character.affinities = ["viento", "fuego", "agua"];
    save.character.knownAffinities = ["viento", "fuego", "agua"];
    save.character.affinityXp = { viento: 1000, fuego: 1000, agua: 1000, tierra: 0 };
    save.campaign.elementRank = 3;
    save.inventory.extraAffinityUnlocked = true;
    save.loadout = ["storm_domain"];
    writeSave(save);
  });
  await enterDojo(page);
  await page.locator('[data-skill-select="storm_domain"]').click();
  await expect(page.locator(".technique-element-art .element-composition img")).toHaveCount(3);
  const images = await page.locator(".element-composition img").evaluateAll(images => images.map(img => ({ src: img.getAttribute("src"), loaded: img.complete && img.naturalWidth > 0 })));
  expect(images.every(image => image.src.startsWith("assets/elements/tier-1/") && image.loaded)).toBe(true);
  expect(await page.evaluate(() => performance.getEntriesByType("resource").filter(entry => /assets\/elements\/tier-[234]\//.test(entry.name)).length)).toBe(0);
  expect(failures).toEqual([]);
  await page.screenshot({ path: "test-results/dojo-techniques/elementos-combinados.png" });
});

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
    await page.locator('[data-skill-select="fire_embers"]').click();
    await page.mouse.move(10,10);
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
    await expect(page.locator("[data-tree-canvas]")).toBeVisible();
    await expect(page.locator("[data-skill-select]")).toHaveCount(41);
    await page.screenshot({ path: `test-results/dojo-techniques/panel-${viewport.width}.png` });
  });
}
