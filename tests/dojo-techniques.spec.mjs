import { expect, test } from "@playwright/test";

async function openDojo(page, { level = 3, loadout = ["fire_embers", "fire_breath"], learned = [] } = {}) {
  await page.goto("/");
  await expect(page.locator(".save-selector")).toBeVisible();
  await page.evaluate(async ({ level, loadout, learned }) => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.106.0");
    let save = createCharacter(createDefaultSave(), { name: "Akio", affinity: "fuego", bodyType: "male" });
    save.progression.level = level;
    save.character.affinityXp.fuego = 196;
    save.campaign.tutorialSeen = true;
    save.loadout = loadout;
    const { learnSkillForTest } = await import("/tests/helpers/skill-fixtures.mjs");
    for (const id of learned) save = learnSkillForTest(save,id);
    writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
  }, { level, loadout, learned });
  await enterDojo(page);
}

async function enterDojo(page) {
  await page.reload();
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-view="dojo"]').click();
  await expect(page.locator(".dojo-technique-workspace")).toBeVisible();
}

const loadout = page => page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")).loadout);

test("nivel y PX habilitan la compra, pero los padres y rangos son obligatorios", async ({ page }) => {
  await openDojo(page,{ level:6 });
  await page.locator('[data-skill-select="fire_arc"]').click();
  await expect(page.locator('[data-skill-invest="fire_arc"]')).toBeDisabled();
  await expect(page.locator('[data-technique-toggle="fire_arc"]')).toBeDisabled();
  await expect(page.locator(".resonance-requirements")).toContainText("Ascuas veloces · rango 2");
  await page.locator('[data-skill-select="fire_embers"]').click();
  await page.locator('[data-skill-invest="fire_embers"]').click();
  await page.locator('[data-skill-select="fire_arc"]').click();
  await expect(page.locator('[data-skill-invest="fire_arc"]')).toBeEnabled();
  await expect(page.locator('[data-technique-toggle="fire_arc"]')).toBeDisabled();
  await page.locator('[data-skill-invest="fire_arc"]').click();
  await expect(page.locator('[data-technique-toggle="fire_arc"]')).toBeEnabled();
  await expect(page.locator('[data-skill-invest="fire_arc"]')).toBeDisabled();
  await expect(page.locator(".resonance-requirements")).toContainText("Nivel de personaje 8 para rango 2");
  await page.locator('[data-technique-toggle="fire_arc"]').click();
  await enterDojo(page);
  expect(await loadout(page)).toContain("fire_arc");
  await page.locator('[data-skill-select="fire_phoenix"]').click();
  await expect(page.locator('[data-skill-invest="fire_phoenix"]')).toBeDisabled();
  await expect(page.locator(".resonance-requirements")).toContainText("Anillo de ceniza · rango 3");
});

test("el personaje empieza sin puntos y recibe dos al subir de nivel", async ({ page }) => {
  await openDojo(page, { level: 1 });
  await expect(page.locator("[data-resonance-points]")).toHaveText("0");
  await page.locator("[data-tree-core]").click();
  await expect(page.locator(".technique-detail")).toContainText("Sin puntos iniciales");
  await page.locator('[data-skill-select="physical_0"]').click();
  await expect(page.locator('[data-skill-invest="physical_0"]')).toBeDisabled();
  await page.evaluate(async () => {
    const { loadSave, writeSave } = await import("/src/save.js");
    const save = loadSave(); save.progression.level = 2; writeSave(save);
  });
  await enterDojo(page);
  await expect(page.locator("[data-resonance-points]")).toHaveText("2");
  await page.locator('[data-skill-select="physical_0"]').click();
  await expect(page.locator('[data-skill-invest="physical_0"]')).toBeEnabled();
  await page.reload();
  await page.locator(".debug-tools-trigger").click();
  await page.locator('[data-debug-view="dojo"]').click();
  await expect(page.locator("[data-resonance-points]")).toHaveText("2");
});

test("maestría tres: comprar mejoras actualiza daño, chakra, sellos y guardado", async ({ page }) => {
  await openDojo(page,{ level:8 });
  await page.locator('[data-skill-select="fire_embers"]').click();
  const detail = page.locator(".technique-detail");
  const metrics = detail.locator(".technique-metrics strong");
  await expect(detail.locator(".resonance-rank strong")).toHaveText("NIVEL 1 / 3");
  await expect(metrics).toHaveText(["14", "30 CH", "1 turnos", "2"]);
  for (const [level, cost, damage, seals] of [[2,29,16,2],[3,27,18,1]]) {
    await page.locator('[data-skill-invest="fire_embers"]').click();
    await expect(detail.locator(".resonance-rank strong")).toHaveText(`NIVEL ${level} / 3`);
    await expect(metrics).toHaveText([String(damage), `${cost} CH`, "1 turnos", String(seals)]);
  }
  await expect(page.locator('[data-skill-invest="fire_embers"]')).toBeDisabled();
  await expect(detail).toContainText("NIVEL MÁXIMO");
  await enterDojo(page);
  await page.locator('[data-skill-select="fire_embers"]').click();
  await expect(detail.locator(".resonance-rank strong")).toHaveText("NIVEL 3 / 3");
  await expect(metrics).toHaveText(["18", "27 CH", "1 turnos", "1"]);
});

test("el núcleo sigue el color del jugador y mantiene legible el kanji", async ({ page }) => {
  await openDojo(page);
  for (const [color,ink] of [["#143078","rgb(245, 243, 235)"],["#ffe35c","rgb(23, 27, 21)"]]) {
    await page.evaluate(async color => {
      const { loadSave,writeSave }=await import("/src/save.js");
      const save=loadSave(); save.character.appearance=color; save.character.birthday={ month:12,day:1 }; writeSave(save);
    },color);
    await enterDojo(page);
    await expect(page.locator("[data-tree-core]")).toHaveAttribute("data-core-color",color);
    expect(await page.locator("[data-tree-core] > polygon").evaluate(p => getComputedStyle(p).fill)).toBe(color === "#143078" ? "rgb(20, 48, 120)" : "rgb(255, 227, 92)");
    expect(await page.locator("[data-core-kanji]").evaluate(p => getComputedStyle(p).fill)).toBe(ink);
    await expect(page.locator("[data-core-kanji]")).toHaveText("十二");
    await expect(page.locator("[data-skill-select]")).toHaveCount(38);
  }
});

test("las afinidades inactivas son grises y los pares mezclan los colores equipados", async ({ page }) => {
  await openDojo(page);
  const gray="#707984";
  for (const id of ["affinity-2","affinity-3"]) await expect(page.locator(`[data-region="${id}"]`)).toHaveAttribute("data-region-color",gray);
  for (const region of await page.locator("[data-bridge-region]").all()) await expect(region).toHaveAttribute("data-region-color",gray);
  for (const cell of await page.locator('.resonance-node.is-locked').all()) await expect(cell).toHaveAttribute("data-node-color",gray);
  await page.mouse.move(10,10);
  await page.locator(".resonance-tree").screenshot({ path:"test-results/dojo-techniques/panal-afinidades-bloqueadas.png" });
  await page.evaluate(async () => {
    const { loadSave,writeSave }=await import("/src/save.js");
    let save=loadSave(); save.progression.level=20; save.campaign.elementRank=2; save.campaign.completedSecondaryMissions=["affinity_trial_2"];
    save.character.affinities=["fuego","agua"]; save.character.affinityXp={ fuego:1000,agua:1000,tierra:0,viento:0 };
    const { learnSkillForTest } = await import("/tests/helpers/skill-fixtures.mjs");
    save=learnSkillForTest(learnSkillForTest(save,"fire_arc",2),"water_wall",2); writeSave(save);
  });
  await enterDojo(page);
  await expect(page.locator('[data-region="affinity-1"]')).toHaveAttribute("data-region-color","#ff783d");
  await expect(page.locator('[data-region="affinity-2"]')).toHaveAttribute("data-region-color","#55bfff");
  await expect(page.locator('[data-region="affinity-3"]')).toHaveAttribute("data-region-color",gray);
  await expect(page.locator('[data-bridge-region="affinity-1-2"]')).toHaveAttribute("data-region-color","#aa9c9e");
  await expect(page.locator('[data-bridge="affinity-1-2"]').first()).toHaveAttribute("data-node-color","#aa9c9e");
  const positions=await page.locator("[data-skill-select]").evaluateAll(nodes => nodes.map(n => n.getAttribute("transform")));
  await page.evaluate(async () => { const { loadSave,writeSave }=await import("/src/save.js"); const save=loadSave(); save.character.affinities=["agua","fuego"]; writeSave(save); });
  await enterDojo(page);
  await expect(page.locator('[data-region="affinity-1"]')).toHaveAttribute("data-region-color","#55bfff");
  await expect(page.locator('[data-region="affinity-2"]')).toHaveAttribute("data-region-color","#ff783d");
  await expect(page.locator('[data-bridge-region="affinity-1-2"]')).toHaveAttribute("data-region-color","#aa9c9e");
  expect(await page.locator("[data-skill-select]").evaluateAll(nodes => nodes.map(n => n.getAttribute("transform")))).toEqual(positions);
});

test("cada uno de los 38 hexágonos muestra una única habilidad", async ({ page }) => {
  await openDojo(page);
  const positions=() => page.locator("[data-skill-select]").evaluateAll(nodes => nodes.map(n => [n.dataset.cellId,n.dataset.q,n.dataset.r]));
  const before=await positions();
  const points=await page.locator("[data-resonance-points]").textContent();
  const original=await loadout(page);
  const ids=await page.locator("[data-skill-select]").evaluateAll(nodes => nodes.map(n=>n.dataset.skillSelect));
  expect(ids).toHaveLength(38);
  expect(new Set(ids).size).toBe(38);
  for (const id of ids) {
    await page.locator(`[data-skill-select="${id}"]`).click();
    await expect(page.locator("[data-skill-invest]")).toHaveAttribute("data-skill-invest",id);
    await expect(page.locator("[data-linked-skill], .resonance-linked-count")).toHaveCount(0);
  }
  await page.locator('[data-skill-select="physical_5"]').click();
  await expect(page.locator(".technique-detail h3")).toHaveText("Instinto de combate");
  expect(await positions()).toEqual(before);
  await expect(page.locator("[data-resonance-points]")).toHaveText(points);
  expect(await loadout(page)).toEqual(original);
});

test("el núcleo muestra el mes en kanji y vuelve a yin yang al quitar la fecha", async ({ page }) => {
  await openDojo(page);
  await expect(page.locator("[data-tree-core]")).toHaveAttribute("data-character-symbol","☯");
  for (const [month,symbol] of [[1,"一"],[11,"十一"],[12,"十二"],[null,"☯"]]) {
    await page.evaluate(async month => {
      const { loadSave,writeSave }=await import("/src/save.js");
      const save=loadSave(); save.character.birthday=month ? { month,day:1 } : null; writeSave(save);
    },month);
    await enterDojo(page);
    await expect(page.locator("[data-tree-core]")).toHaveAttribute("data-character-symbol",symbol);
    await expect(page.locator("[data-skill-select]")).toHaveCount(38);
    if (month) await expect(page.locator("[data-core-kanji]")).toHaveText(symbol);
    if (month===12) await page.locator("[data-tree-core]").screenshot({ path:"test-results/dojo-techniques/nucleo-diciembre.png" });
  }
});

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
  await expect(page.locator("[data-resonance-points]")).toHaveText("4");
  const stats = () => page.evaluate(async () => {
    const { loadSave,derivedStats } = await import("/src/save.js");
    return derivedStats(loadSave());
  });
  const original = await stats();
  await page.locator('[data-skill-select="physical_1"]').click();
  await expect(page.locator('[data-skill-invest="physical_1"]')).toBeDisabled();
  await page.locator('[data-skill-select="physical_0"]').click();
  await page.locator('[data-skill-invest="physical_0"]').click();
  await expect(page.locator("[data-resonance-points]")).toHaveText("3");
  expect((await stats()).maxHp).toBe(original.maxHp+5);
  await expect(page.locator('[data-skill-select="physical_0"]')).toHaveAttribute("data-state","upgraded");
  await page.locator('[data-skill-select="fire_embers"]').click();
  await page.locator('[data-skill-invest="fire_embers"]').click();
  await expect(page.locator("[data-resonance-points]")).toHaveText("2");
  await expect(page.locator(".technique-metrics")).toContainText("16");
  await expect(page.locator('[data-skill-select="fire_embers"]')).toHaveAttribute("data-state","upgraded");
  await enterDojo(page);
  expect((await stats()).maxHp).toBe(original.maxHp+5);
  await expect(page.locator("[data-resonance-points]")).toHaveText("2");
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

test("tres afinidades conservan el plano exacto de 39 celdas y sus tres combinaciones", async ({ page }) => {
  await page.setViewportSize({ width:1600,height:1000 });
  await openDojo(page);
  await page.evaluate(async () => {
    const { loadSave,writeSave } = await import("/src/save.js");
    let save = loadSave(); save.progression.level=35;
    save.character.affinities=["fuego","agua","tierra"];
    save.character.appearance="#b8578f";
    save.character.affinityXp={ agua:1000,tierra:1000,fuego:1000,viento:0 };
    save.campaign.elementRank=3; save.inventory.extraAffinityUnlocked=true; save.campaign.completedSecondaryMissions=["affinity_trial_2","affinity_trial_3"];
    const { learnSkillForTest } = await import("/tests/helpers/skill-fixtures.mjs");
    for (const id of ["physical_1","physical_2","physical_3","physical_4","physical_5"]) save=learnSkillForTest(save,id);
    for (const id of ["fire_arc","water_wall","earth_spike","magma_forge"]) save=learnSkillForTest(save,id,2);
    save.taijutsuLoadout = ["physical_1","physical_2"];
    writeSave(save);
  });
  await enterDojo(page);
  for (let slot=0;slot<3;slot++) await expect(page.locator(`[data-category="affinity"][data-slot="${slot}"]`)).toHaveCount([8,7,8][slot]);
  const regionColors = await page.locator("[data-region]").evaluateAll(regions => regions.map(region => region.dataset.regionColor));
  expect(regionColors).toEqual(["#657fff","#ff783d","#55bfff","#b78a55"]);
  expect(new Set(regionColors).size).toBe(4);
  for (const border of await page.locator("[data-region] .resonance-region-border").all()) expect(await border.evaluate(path => parseFloat(getComputedStyle(path).strokeWidth))).toBeGreaterThanOrEqual(6);
  await expect(page.locator('[data-category="physical"]')).toHaveCount(6);
  await expect(page.locator('[data-category="hybrid"]')).toHaveCount(9);
  await expect(page.locator("[data-bridge-region]")).toHaveCount(3);
  await page.locator('[data-skill-select="hybrid_fuego_tierra_1"]').click();
  await expect(page.locator(".resonance-requirements")).toContainText("Arco de llama · rango 2");
  await expect(page.locator(".resonance-requirements")).toContainText("Púa tectónica · rango 2");
  await page.locator('[data-skill-invest="hybrid_fuego_tierra_1"]').click();
  await expect(page.locator('[data-skill-select="hybrid_fuego_tierra_1"]')).toHaveAttribute("data-state","unlocked");
  await page.mouse.move(10,10);
  await page.screenshot({ path:"test-results/dojo-techniques/panal-tres-afinidades.png" });
  await page.locator(".resonance-tree").screenshot({ path:"test-results/dojo-techniques/panal-referencia.png" });
});

test("las técnicas de tiers superiores reutilizan los iconos básicos", async ({ page }) => {
  const failures = [];
  page.on("response", response => { if (response.status() >= 400 && response.url().includes("/assets/")) failures.push(response.url()); });
  await openDojo(page);
  await page.evaluate(async () => {
    const { loadSave, writeSave } = await import("/src/save.js?v=0.106.0");
    let save = loadSave();
    save.progression.level = 56;
    save.character.affinities = ["viento", "fuego", "agua"];
    save.character.knownAffinities = ["viento", "fuego", "agua"];
    save.character.affinityXp = { viento: 1000, fuego: 1000, agua: 1000, tierra: 0 };
    save.campaign.elementRank = 3;
    save.inventory.extraAffinityUnlocked = true; save.campaign.completedSecondaryMissions=["affinity_trial_2","affinity_trial_3"];
    const { learnSkillForTest } = await import("/tests/helpers/skill-fixtures.mjs");
    save=learnSkillForTest(save,"lightning_heaven");
    save.loadout = ["lightning_heaven"];
    writeSave(save);
  });
  await enterDojo(page);
  await page.locator('[data-skill-select="lightning_heaven"]').click();
  await expect(page.locator(".technique-element-art .element-composition img")).toHaveCount(2);
  const images = await page.locator(".element-composition img").evaluateAll(images => images.map(img => ({ src: img.getAttribute("src"), loaded: img.complete && img.naturalWidth > 0 })));
  expect(images.every(image => image.src.startsWith("assets/elements/tier-1/") && image.loaded)).toBe(true);
  expect(await page.evaluate(() => performance.getEntriesByType("resource").filter(entry => /assets\/elements\/tier-[234]\//.test(entry.name)).length)).toBe(0);
  expect(failures).toEqual([]);
  await page.screenshot({ path: "test-results/dojo-techniques/elementos-combinados.png" });
});

test("nivel 24 explica la capacidad y permite reemplazar una equipada por una aprendida", async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 748 });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await openDojo(page,{ level:24,loadout:["fire_embers","fire_breath","fire_arc","fire_brand"],learned:["fire_arc","fire_brand","fire_ring"] });
  await expect(page.locator("[data-equipped-count]")).toHaveText("4/4 EQUIPADAS");
  await expect(page.locator("[data-loadout-locked]")).toHaveCount(0);
  await expect(page.locator("[data-technique-feedback]")).toBeVisible();
  await expect(page.locator("[data-technique-feedback]")).toContainText("ranuras están ocupadas");
  await expect(page.locator('[data-skill-select="fire_ring"] .skill-state')).toHaveText("APRENDIDA");
  const original = await loadout(page);
  await page.locator('[data-skill-select="fire_ring"]').click();
  expect(await loadout(page)).toEqual(original);
  await expect(page.locator(".technique-detail h3")).toHaveText("Anillo de ceniza");
  await expect(page.locator('[data-technique-toggle="fire_ring"]')).toHaveText("REEMPLAZAR UNA EQUIPADA");
  await page.locator('[data-technique-toggle="fire_ring"]').click();
  await expect(page.locator("[data-replace-slot]")).toHaveCount(4);
  await expect(page.locator("[data-technique-feedback]")).toContainText("Elige qué técnica reemplazar");
  expect(await loadout(page)).toEqual(original);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-replace-slot]")).toHaveCount(0);
  expect(await loadout(page)).toEqual(original);
  await page.locator('[data-technique-toggle="fire_ring"]').click();
  await page.screenshot({ path: "test-results/dojo-techniques/reemplazar-1360.png" });
  await page.getByRole("button", { name: "Reemplazar Aliento de brasa por Anillo de ceniza", exact: true }).click();
  expect(await loadout(page)).toEqual(["fire_embers", "fire_ring", "fire_arc", "fire_brand"]);
  await expect(page.locator('[data-skill-select="fire_ring"] .skill-state')).toHaveText("EN COMBATE · RANURA 2");
  await expect(page.locator('[data-skill-select="fire_breath"] .skill-state')).toHaveText("MEJORADA");
  await expect(page.locator("[data-technique-feedback]")).toContainText("Ambas siguen aprendidas");
  await enterDojo(page);
  expect(await loadout(page)).toEqual(["fire_embers", "fire_ring", "fire_arc", "fire_brand"]);
  await expect(page.locator('[data-loadout-inspect="fire_ring"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test("una ranura libre permite equipar y consultar una bloqueada no cambia el equipo", async ({ page }) => {
  await openDojo(page, { level:6,loadout: ["fire_embers"],learned:["fire_arc"] });
  await expect(page.locator("[data-equipped-count]")).toHaveText("1/3 EQUIPADAS");
  await expect(page.locator(".technique-loadout-slot.is-empty").first()).toContainText("Ranura libre");
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
  await expect(page.locator('[data-skill-select="fire_embers"] .skill-state')).toHaveText("MEJORADA");
  await page.locator('[data-dojo-tab="appearance"]').click();
  await page.locator('[data-dojo-tab="techniques"]').click();
  await page.locator('[data-skill-select="fire_embers"]').click();
  await page.locator('[data-technique-toggle="fire_embers"]').click();
  expect(await loadout(page)).toEqual(["fire_arc", "fire_embers"]);
});

for (const { level, capacity, locked, initial, incoming } of [
  { level:5,capacity:3,locked:1,initial:["fire_embers"],incoming:"fire_breath" },
  { level:8,capacity:4,locked:0,initial:["fire_embers","fire_breath"],incoming:"fire_arc" }
]) {
  test(`el nivel ${level} muestra ${capacity} ranuras y equipa en el espacio nuevo`, async ({ page }) => {
    await openDojo(page,{ level,loadout:initial,learned:incoming === "fire_arc" ? [incoming] : [] });
    await expect(page.locator(".technique-loadout-slot.is-locked")).toHaveCount(locked);
    await expect(page.locator("[data-equipped-count]")).toHaveText(`${initial.length}/${capacity} EQUIPADAS`);
    await page.locator(`[data-skill-select="${incoming}"]`).click();
    await page.locator(`[data-technique-toggle="${incoming}"]`).click();
    expect(await loadout(page)).toEqual([...initial,incoming]);
    await expect(page.locator(`[data-skill-select="${incoming}"] .skill-state`)).toHaveText(`EN COMBATE · RANURA ${initial.length+1}`);
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
    await expect(page.locator("[data-skill-select]")).toHaveCount(38);
    await page.screenshot({ path: `test-results/dojo-techniques/panel-${viewport.width}.png` });
  });
}


test("el Dojo muestra el nivel máximo 60 y limita el presupuesto a 118", async ({ page }) => {
  await openDojo(page, { level: 100 });
  await expect(page.locator(".dojo-level strong")).toHaveText("NIVEL 60");
  await expect(page.locator(".dojo-level span")).toHaveText("NIVEL MÁXIMO");
  await expect(page.locator(".dojo-level i b")).toHaveAttribute("style", "width:100%");
  await expect(page.locator("[data-resonance-points]")).toHaveText("118");
  expect(await page.locator(".village-topbar").innerText()).not.toContain("0/0");
});
