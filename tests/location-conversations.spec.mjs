import { test, expect } from "@playwright/test";

async function seed(page) {
  await page.clock.install({ time: new Date("2026-11-03T16:00:00Z") });
  await page.goto("/");
  await page.evaluate(async () => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.131.0");
    const save = createCharacter(createDefaultSave(), { name: "Akio", affinity: "fuego", bodyType: "male" });
    save.campaign.tutorialSeen = true; save.progression.coins = 2000;
    writeSave(save); sessionStorage.setItem("cronicas-save-slot-selected", "1"); localStorage.setItem("music-enabled", "off");
  });
  await page.reload();
}
async function finishIntro(page) {
  const speech = page.locator("[data-stage-speech]");
  for (let i = 0; i < 8 && await speech.isVisible(); i++) {
    const next = speech.locator("[data-stage-next]"), last = await next.textContent() === "VER OPCIONES";
    await next.click(); if (last) break;
  }
  await expect(speech).toBeHidden();
}
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")));
const back = page => page.locator('[data-view="plaza"]').first().click();

test("cada encargado se presenta una vez y los paneles conservan solo los títulos útiles", async ({ page }, testInfo) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 }); await seed(page);
  for (const place of ["headquarters", "dojo", "archive", "shop", "inn", "missions", "tower", "event", "arena"]) {
    await page.locator(`[data-go="${place}"]`).click();
    await expect(page.locator("[data-stage-speech]")).toBeVisible();
    if (place === "dojo") {
      await expect(page.locator("[data-stage-speaker]")).toContainText("Mei Hayate");
      await expect(page.locator("[data-stage-count]")).toHaveText("1/2");
    }
    await finishIntro(page);
    await expect(page.locator(".stage-options .eyebrow").filter({ hasText: /^(GORO TETSUGAN|YUNA AMETSUKI|HANA KOGANE|KUREHA TSUKIKAGE|NAO MATSURI) ·/ })).toHaveCount(0);
    await expect(page.locator("[data-stage-npc] span").first()).not.toBeEmpty();
    const before = await stored(page);
    await back(page); await page.locator(`[data-go="${place}"]`).click();
    await expect(page.locator("[data-stage-speech]")).toBeHidden();
    expect((await stored(page)).campaign.npcIntroductions).toEqual(before.campaign.npcIntroductions);
    if (place === "arena") await page.screenshot({ path: testInfo.outputPath("arena-sin-cabecera-repetida.png") });
    await back(page);
  }
  await page.reload(); await page.locator('[data-go="dojo"]').click();
  await expect(page.locator("[data-stage-speech]")).toBeHidden();
  expect((await stored(page)).campaign.npcIntroductions).toHaveLength(9);
  expect(errors).toEqual([]);
});

test("Goro conversa al esperar, reacciona a selecciones y no deja temporizadores al salir", async ({ page }) => {
  await seed(page); await page.locator('[data-go="arena"]').click(); await finishIntro(page);
  await page.mouse.move(1, 1); await page.clock.runFor(2300);
  const text = page.locator("[data-ambient-text]");
  await expect(text).toContainText("público");
  await page.locator('[data-arena-difficulty="challenge"]').click();
  await expect(text).toContainText("Dificultad");
  await page.clock.runFor(15000); await expect(text).toContainText("Dificultad");
  await page.clock.runFor(7000); await expect(text).toContainText("buen duelo");
  await back(page); await page.clock.runFor(60000);
  await expect(page.locator("[data-stage-ambient]")).toHaveCount(0);
});

test("Hana comenta compras y ventas guardadas sin perder la presentación", async ({ page }) => {
  await seed(page); await page.locator('[data-go="shop"]').click(); await finishIntro(page);
  const initial = await stored(page), product = page.locator('[data-shop-item="health_potion"]');
  await product.locator('button[type="submit"]').click();
  await expect(page.locator("[data-ambient-text]")).toContainText("Buena compra");
  const purchased = await stored(page); expect(purchased.progression.coins).toBeLessThan(initial.progression.coins);
  expect(purchased.campaign.npcIntroductions).toContain("shop:hana");
  await page.locator('[data-shop-mode="sell"]').click();
  await product.locator('button[type="submit"]').click();
  await expect(page.locator("[data-ambient-text]")).toContainText("venta");
  expect((await stored(page)).progression.coins).toBeGreaterThan(purchased.progression.coins);
  await back(page); await page.reload(); await page.locator('[data-go="shop"]').click();
  await expect(page.locator("[data-stage-speech]")).toBeHidden();
});

test("Nao mantiene las actividades y sus accesos mientras se consulta el calendario", async ({ page }) => {
  await seed(page); await page.locator('[data-go="event"]').click(); await finishIntro(page);
  await page.locator('[data-event-day="2026-11-05"]').click();
  await page.clock.runFor(60000);
  await expect(page.locator("[data-ambient-text]")).toContainText("Día de Agua");
  await expect(page.getByRole("button", { name: "Ir a la Torre de Desafíos", exact: true })).toBeVisible();
  await expect(page.locator(".events-calendar")).toBeVisible();
});
