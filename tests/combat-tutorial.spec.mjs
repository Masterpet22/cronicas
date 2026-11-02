import { expect, test } from "@playwright/test";
import { ensurePhaser } from "./helpers/phaser-loader.mjs";

// La primera visita a Sayo se guarda; repetir la guía no cambia el resto de la partida.
const afterArchiveIntroduction = raw => {
  const save = JSON.parse(raw);
  save.campaign.npcIntroductions = [...new Set([...save.campaign.npcIntroductions, "archive:sayo"])];
  return JSON.stringify(save);
};

async function prepare(page, { manual = false, emptyLoadout = false, completed = false, power = false, affinity = "fuego", mastered = false } = {}) {
  await page.goto("/");
  await page.evaluate(async ({ manual, emptyLoadout, completed, power, affinity, mastered }) => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.94.0");
    localStorage.clear();
    sessionStorage.clear();
    const save = createCharacter(createDefaultSave(), { name: "Aprendiz", affinity, bodyType: "male", appearance: "#315f87" });
    save.campaign.tutorialSeen = true;
    if (mastered) {
      save.progression.level = 8;
      save.progression.resonance.investments = { fire_embers: 2 };
    }
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
  }, { manual, emptyLoadout, completed, power, affinity, mastered });
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

for (const [affinity, weak] of Object.entries({ fuego: "viento", agua: "fuego", tierra: "agua", viento: "tierra" })) {
  test(`balance aplicado: ${affinity}, jefe favorable y chakra real`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await prepare(page, { affinity });
    await launch(page);
    await next(page); await next(page);
    await step(page, "chakra");
    await expect(page.locator("#tutorial-copy")).toContainText("5 CH");
    await expect(page.locator("#tutorial-copy")).toContainText("25 CH en total");
    const boss = await page.evaluate(() => {
      const s = window.__tutorialGame.scene.getScene("battle");
      const profile = s.encounters[s.encounterIds.indexOf("boss_varek")];
      return { profile: profile.affinity, effective: s.createEnemyState(profile).primaryAffinity, maxChakra: s.player.maxChakra };
    });
    expect(boss).toEqual({ profile: weak, effective: weak, maxChakra: { fuego: 80, agua: 80, tierra: 70, viento: 96 }[affinity] });
    await page.locator("[data-tutorial-skip]").click();
    await expect(page.locator('[data-combat-action="6"]')).toHaveAttribute("aria-disabled", "false", { timeout: 20000 });
    const round = await page.evaluate(async () => {
      const s = window.__tutorialGame.scene.getScene("battle");
      s.player.chakra = 40; s.refreshHud();
      const round = s.round;
      await s.useJutsu(s.actions[1]);
      return round;
    });
    await expect.poll(() => page.evaluate(() => window.__tutorialGame.scene.getScene("battle").round), { timeout: 20000 }).toBe(round + 1);
    expect(await page.evaluate(() => window.__tutorialGame.scene.getScene("battle").player.chakra)).toBe(15);
    await expect(page.locator('[data-combat-action="6"]')).toHaveAttribute("aria-disabled", "false", { timeout: 20000 });
    await page.locator('[data-combat-action="6"]').click();
    await expect.poll(() => page.evaluate(() => window.__tutorialGame.scene.getScene("battle").round)).toBe(round + 2);
    expect(await page.evaluate(() => window.__tutorialGame.scene.getScene("battle").player.chakra)).toBe(40);
    await expect(page.locator('[data-combat-action="1"]')).toHaveAttribute("aria-disabled", "false", { timeout: 20000 });
    const blocked = await page.evaluate(async () => {
      const s = window.__tutorialGame.scene.getScene("battle");
      s.player.chakra = 29; s.refreshHud();
      await s.useJutsu(s.actions[1]);
      return { chakra: s.player.chakra, pending: Boolean(s.pendingActions.player), round: s.round };
    });
    expect(blocked).toEqual({ chakra: 29, pending: false, round: round + 2 });
    expect(errors).toEqual([]);
  });
}

test("maestría tres: combate usa el coste reducido y prepara un solo sello", async ({ page }) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await prepare(page, { mastered: true });
  await launch(page);
  const mastery = await page.evaluate(async () => {
    const scene = window.__tutorialGame.scene.getScene("battle");
    const action = scene.actions[1];
    const { millisecondsToTimelineThreshold } = await import("/src/battle/timeline.js?v=0.69.0");
    const speed = scene.combatantSpeed(scene.player);
    return { level: action.techniqueLevel, damage: action.damage, cost: scene.actionCost(action), seals: action.seals.length,
      preparation: millisecondsToTimelineThreshold(.8, speed, action),
      novicePreparation: millisecondsToTimelineThreshold(.8, speed, { ...action, seals: action.baseSeals }) };
  });
  expect(mastery).toMatchObject({ level: 3, damage: 18, cost: 27, seals: 1 });
  expect(mastery.preparation).toBeCloseTo(mastery.novicePreparation / 2, 8);
  await page.locator("[data-tutorial-skip]").click();
  await expect(page.locator('[data-combat-action="6"]')).toHaveAttribute("aria-disabled", "false", { timeout: 20000 });
  const round = await page.evaluate(async () => {
    const scene = window.__tutorialGame.scene.getScene("battle");
    scene.player.chakra = 40;
    scene.enemy.hp = scene.enemy.maxHp = 1000;
    const round = scene.round;
    await scene.useJutsu(scene.actions[1]);
    return round;
  });
  await expect.poll(() => page.evaluate(() => window.__tutorialGame.scene.getScene("battle").round), { timeout: 20000 }).toBe(round + 1);
  expect(await page.evaluate(() => window.__tutorialGame.scene.getScene("battle").player.chakra)).toBe(18);
  expect(errors).toEqual([]);
});

test("iniciativa temporal y Guardia sobreviven a fallos y aturdimiento hasta el impacto", async ({ page }) => {
  test.setTimeout(120000);
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await prepare(page); await launch(page);
  await page.evaluate(() => {
    const s = window.__tutorialGame.scene.getScene("battle");
    s.rollHit = () => false;
    s.enemy.baseSpeed = 2; s.enemy.hp = s.enemy.maxHp = 1000;
    window.__recoveries = [];
    const charge = s.startTurnCharge;
    s.startTurnCharge = function() { window.__recoveries.push({ round: this.round, initiative: this.player.recoveryInitiative }); return charge.call(this); };
  });
  await page.locator("[data-tutorial-skip]").click();
  for (let n = 0; n < 2; n++) {
    await expect(page.locator('[data-combat-action="1"]')).toHaveAttribute("aria-disabled", "false", { timeout: 20000 });
    expect(await page.evaluate(() => window.__tutorialGame.scene.getScene("battle").player.recoveryInitiative)).toBe(0);
    const round = await page.evaluate(() => window.__tutorialGame.scene.getScene("battle").round);
    await page.locator('[data-combat-action="1"]').click();
    await expect.poll(() => page.evaluate(() => window.__tutorialGame.scene.getScene("battle").round)).toBe(round + 1);
    await expect.poll(() => page.evaluate(round => window.__recoveries.some(r => r.round === round && r.initiative === 1), round + 1)).toBe(true);
  }
  await expect(page.locator('[data-combat-action="6"]')).toHaveAttribute("aria-disabled", "false", { timeout: 20000 });
  const round = await page.evaluate(() => {
    const s = window.__tutorialGame.scene.getScene("battle");
    s.player.chakra = 10; s.player.hp = 100;
    s.player.statuses = [{ type: "poison", label: "VENENO", power: 3, duration: 3 }];
    s.refreshHud(); return s.round;
  });
  await page.locator('[data-combat-action="6"]').click();
  await expect.poll(() => page.evaluate(() => window.__tutorialGame.scene.getScene("battle").round)).toBe(round + 1);
  await expect(page.locator('[data-combat-action="1"]')).toHaveAttribute("aria-disabled", "false", { timeout: 20000 });
  await expect(page.locator('[data-combat-action="6"]')).toHaveAttribute("aria-disabled", "true");
  const result = await page.evaluate(async () => {
    const s = window.__tutorialGame.scene.getScene("battle");
    const { ENEMY_ACTIONS } = await import("/src/data.js?v=0.114.0");
    const before = { chakra: s.player.chakra, hp: s.player.hp, guarding: s.player.guarding };
    await s.useJutsu(s.actions[5]);
    const afterRepeatedGuard = s.player.chakra;
    s.enemy.statuses = [{ type: "stun", duration: 1, power: 0 }];
    s.enemy.soak = { stacks: 1, turns: 2, boss: false };
    await s.executeTimelineAction("enemy", ENEMY_ACTIONS.heavy);
    const afterStun = { guarding: s.player.guarding, soakTurns: s.enemy.soak.turns };
    await s.executeTimelineAction("enemy", ENEMY_ACTIONS.quick);
    const afterMiss = s.player.guarding;
    s.rollHit = chance => chance > 25;
    s.player.damageReduction = 0; s.player.primaryAffinity = null;
    s.enemy.baseStrength = 0; s.enemy.primaryAffinity = null;
    await s.executeTimelineAction("enemy", ENEMY_ACTIONS.heavy);
    return { before, afterRepeatedGuard, afterStun, afterMiss, guarding: s.player.guarding,
      damage: before.hp - s.player.hp, chakra: s.player.chakra, statuses: s.player.statuses,
      initiatives: window.__recoveries.map(r => r.initiative) };
  });
  expect(result.before).toEqual({ chakra: 35, hp: 97, guarding: true });
  expect(result.afterRepeatedGuard).toBe(35);
  expect(result.afterStun).toEqual({ guarding: true, soakTurns: 1 });
  expect(result.afterMiss).toBe(true);
  expect(result.guarding).toBe(false);
  expect(result.damage).toBeGreaterThanOrEqual(8); expect(result.damage).toBeLessThanOrEqual(10);
  expect(result.chakra).toBe(35);
  expect(result.statuses).toEqual([{ type: "poison", label: "VENENO", power: 3, duration: 2 }]);
  expect(result.initiatives).toContain(-1);
  expect(result.initiatives.every(i => [-1, 0, 1].includes(i))).toBe(true);
  expect(errors).toEqual([]);
});

test("el golpe final cierra recargas y chakra y gana antes del veneno propio", async ({ page }) => {
  test.setTimeout(120000);
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await prepare(page); await launch(page);
  await page.locator("[data-tutorial-skip]").click();
  await expect(page.locator('[data-combat-action="1"]')).toHaveAttribute("aria-disabled", "false", { timeout: 20000 });
  const snapshot = await page.evaluate(async () => {
    const s = window.__tutorialGame.scene.getScene("battle");
    s.enemyIndex = s.encounters.length - 1;
    s.enemy = s.createEnemyState(s.encounters[s.enemyIndex]);
    s.defeatedEncounters = s.enemyIndex;
    s.player.hp = 3; s.player.chakra = 10;
    s.player.statuses = [{ type: "poison", label: "VENENO", power: 3, duration: 1 }];
    s.cooldowns.closure_probe = 2;
    s.playerAttack = async () => { s.enemy.hp = 0; };
    const finish = s.finishBattle;
    let result;
    s.finishBattle = async function(won) {
      result = { won, hp: this.player.hp, chakra: this.player.chakra, cooldown: this.cooldowns.closure_probe,
        pending: this.pendingActions.player, progress: this.timelineProgress.player };
      return finish.call(this, won);
    };
    await s.useJutsu(s.actions[0]);
    const { battleRuntime } = await import("/src/battle/runtime.js?v=0.91.0");
    return { ...result, completed: battleRuntime.pendingVictorySave?.campaign.completedMissions.includes("m01") };
  });
  expect(snapshot).toEqual({ won: true, hp: 3, chakra: 15, cooldown: 1, pending: null, progress: 0, completed: true });
  expect(errors).toEqual([]);
});

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
  expect(await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"))).toBe(afterArchiveIntroduction(saved));
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
  expect(await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"))).toBe(afterArchiveIntroduction(saved));
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
  expect(await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"))).toBe(afterArchiveIntroduction(saved));
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
  expect(await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"))).toBe(afterArchiveIntroduction(saved));
  expect(errors).toEqual([]);
});
