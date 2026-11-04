import { expect, test } from "@playwright/test";
import { ensurePhaser } from "./helpers/phaser-loader.mjs";

test.afterEach(async ({ page }) => {
  if (page.isClosed()) return;
  await page.evaluate(async () => {
    const game = window.__tutorialGame;
    if (!game?.scene) return;
    await new Promise(resolve => {
      game.events.once("destroy", resolve); game.destroy(true); game.loop.wake();
      setTimeout(resolve, 1000);
    });
  });
});

// La primera visita a Sayo se guarda; repetir la guía no cambia el resto de la partida.
const afterArchiveIntroduction = raw => {
  const save = JSON.parse(raw);
  save.campaign.npcIntroductions = [...new Set([...save.campaign.npcIntroductions, "archive:sayo"])];
  return JSON.stringify(save);
};

async function prepare(page, { manual = false, emptyLoadout = false, completed = false, power = false, affinity = "fuego", mastered = false, trained = true } = {}) {
  await page.goto("/");
  await page.evaluate(async ({ manual, emptyLoadout, completed, power, affinity, mastered, trained }) => {
    const { createCharacter, createDefaultSave, writeSave } = await import("/src/save.js?v=0.94.0");
    localStorage.clear();
    sessionStorage.clear();
    const save = createCharacter(createDefaultSave(), { name: "Aprendiz", affinity, bodyType: "male", appearance: "#315f87" });
    save.equipment.weapon = "kunai"; save.equipment.throwable = "shuriken";
    save.campaign.tutorialSeen = true; save.campaign.doctorBookDeliveryPending = true;
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
    if (trained) {
      const { SAGA_TUTORIAL } = await import("/src/content/sagas/futuro-prometedor/tutorial.js");
      save.campaign.sagaTutorial.completed = [...SAGA_TUTORIAL[0].practices];
    }
    writeSave(save);
    sessionStorage.setItem("cronicas-save-slot-selected", "1");
    localStorage.setItem("music-enabled", "off");
    localStorage.setItem("seal-input-mode", manual ? "manual" : "automatic");
  }, { manual, emptyLoadout, completed, power, affinity, mastered, trained });
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
  await expect.poll(() => page.evaluate(() => Boolean(window.__tutorialGame?.scene.getScene("battle")?.player)), { timeout: 30000 }).toBe(true);
  const guided = await page.evaluate(() => Boolean(window.__tutorialGame?.scene.getScene("battle")?.combatTutorial?.active));
  if (replay || guided) await step(page, "welcome");
  else await expect(page.locator('[data-combat-action="1"]')).toBeVisible({ timeout: 30000 });
}

async function openArchive(page) {
  await page.locator('[data-go="archive"]').click();
  const advance = page.locator('[data-stage-next]');
  for (let guard = 0; guard < 8 && await advance.isVisible(); guard += 1) {
    await advance.click();
    await page.waitForTimeout(220);
  }
  await page.getByRole("tab", { name: "Tutorial", exact: true }).click();
}

async function step(page, id) {
  await expect(page.locator(`.combat-tutorial[data-tutorial-step="${id}"] .tutorial-dialogue-box`)).toBeVisible({ timeout: 20000 });
}
const next = async page => {
  const guide = page.locator(".combat-tutorial");
  const practicing = await guide.evaluate(el => el.classList.contains("is-practicing"));
  const target = await guide.getAttribute("data-tutorial-target");
  if (practicing && target !== "pause") {
    const selector = target === "table" ? "[data-skill-table-switch]" : target === "bag" ? ".combat-access-inventory" : `[data-combat-action="${target.split(":")[1]}"]`;
    await page.locator(selector).click();
  } else await page.locator("[data-tutorial-next]").click();
};
test("el maestro acompaña el combate y Ren permanece en el Cuartel", async ({ page }, info) => {
  test.setTimeout(150000);
  await prepare(page, { trained: false }); await launch(page);
  await expect(page.locator('.combat-tutorial img, .combat-tutorial .story-character')).toHaveCount(0);
  await expect(page.locator('[data-tutorial-speaker="mei"]')).toBeVisible();
  await expect(page.locator('.tutorial-voice')).toHaveCSS('border-top-width', '0px');
  await expect(page.locator('#tutorial-title')).toHaveClass(/tutorial-sr-only/);
  const game = await page.locator("#game").boundingBox();
  const box = await page.locator(".tutorial-dialogue-box").boundingBox();
  expect(box.y).toBeGreaterThan(game.y + game.height * .6);
  await page.locator("#game").screenshot({ path: info.outputPath("ren-dialogo-escena.png") });
  await next(page); await step(page, "timeline");
  await expect(page.locator('[data-tutorial-speaker="mei"]')).toBeVisible();
  await next(page); await step(page, "strike");
  await expect(page.locator('[data-tutorial-next]')).toBeHidden();
  await expect(page.locator('[data-combat-action="1"]')).toBeFocused();
  await expect(page.locator('.combat-tutorial')).toHaveAttribute("data-tutorial-step", "strike");
  await expect(page.locator('.tutorial-character-stage')).toHaveCount(0);
  await page.locator("#game").screenshot({ path: info.outputPath("practica-control-real.png") });
  await page.locator('[data-combat-action="1"]').click();
  await step(page, "guard");
});
async function practical(page, manual = false) {
  await intro(page);
  for (const id of ["strike", "guard", "physical-table", "weapon", "throwable", "elemental-table", "technique", "preparation", "seals"]) {
    await step(page, id); await next(page);
  }
  if (manual) {
    await expect.poll(() => page.evaluate(() => window.__tutorialGame.scene.getScene("battle").sealPrompt?.text)).toMatch(/^PULSA/);
    for (let guard = 0; guard < 6; guard++) {
      const key = await page.evaluate(() => window.__tutorialGame.scene.getScene("battle").sealPrompt?.text?.match(/^PULSA ([A-Z])/)?.[1]);
      if (!key) break;
      await page.keyboard.press(key); await page.waitForTimeout(230);
    }
  }
  await step(page, "cooldowns"); await next(page);
  await step(page, "pause");
  const highlight = await page.locator(".tutorial-spotlight").boundingBox();
  const pause = await page.locator(".combat-access-pause").boundingBox();
  const bag = await page.locator(".combat-access-inventory").boundingBox();
  const contains = box => box.x + box.width / 2 >= highlight.x && box.x + box.width / 2 <= highlight.x + highlight.width && box.y + box.height / 2 >= highlight.y && box.y + box.height / 2 <= highlight.y + highlight.height;
  expect(contains(pause)).toBe(true); expect(contains(bag)).toBe(false);
  await next(page);
  await expect(page.locator("[data-pause-resume]")).toBeVisible();
  await page.locator("[data-pause-resume]").click();
  await step(page, "complete"); await next(page);
}
async function intro(page) {
  for (const id of ["welcome", "timeline"]) { await step(page, id); await next(page); }
}

for (const [affinity, weak] of Object.entries({ fuego: "viento", agua: "fuego", tierra: "agua", viento: "tierra" })) {
  test(`balance aplicado: ${affinity}, jefe favorable y chakra real`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await prepare(page, { affinity });
    await launch(page);
    const boss = await page.evaluate(() => {
      const s = window.__tutorialGame.scene.getScene("battle");
      const profile = s.encounters[s.encounterIds.indexOf("boss_varek")];
      return { profile: profile.affinity, effective: s.createEnemyState(profile).primaryAffinity, maxChakra: s.player.maxChakra };
    });
    expect(boss).toEqual({ profile: weak, effective: weak, maxChakra: { fuego: 80, agua: 80, tierra: 70, viento: 96 }[affinity] });
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
    const { ENEMY_ACTIONS } = await import("/src/data.js?v=1.5.0");
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
    s.enemy.baseStrength = 0; s.enemy.strengthModifier = 0; s.enemy.primaryAffinity = null;
    await s.executeTimelineAction("enemy", ENEMY_ACTIONS.heavy);
    return { before, afterRepeatedGuard, afterStun, afterMiss, guarding: s.player.guarding,
      damage: before.hp - s.player.hp, baseDamage: ENEMY_ACTIONS.heavy.damage, chakra: s.player.chakra, statuses: s.player.statuses,
      initiatives: window.__recoveries.map(r => r.initiative) };
  });
  expect(result.before).toEqual({ chakra: 35, hp: 97, guarding: true });
  expect(result.afterRepeatedGuard).toBe(35);
  expect(result.afterStun).toEqual({ guarding: true, soakTurns: 1 });
  expect(result.afterMiss).toBe(true);
  expect(result.guarding).toBe(false);
  expect(result.damage).toBe(Math.ceil(result.baseDamage / 2));
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

test("la primera misión exige prácticas reales y conserva las lecciones al pausar", async ({ page }, info) => {
  test.setTimeout(240000);
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await prepare(page, { trained: false }); await launch(page);
  await expect(page.locator("[data-tutorial-skip]")).toHaveCount(0);
  const baseline = await page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")));
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__tutorialGame.scene.getScene("battle").round)).toBe(1);
  await page.locator("#game").screenshot({ path: info.outputPath("tutorial-actual.png") });
  await practical(page);
  await expect(page.locator(".combat-tutorial")).toBeHidden();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("cronicas-del-sello-save-slot-1")));
  for (const id of ["strike", "guard", "weapon", "throwable", "technique", "pause"]) expect(saved.campaign.sagaTutorial.completed).toContain(id);
  expect(saved.progression).toEqual(baseline.progression);
  expect(saved.campaign.completedMissions).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.locator(".combat-pause-access")).toBeVisible();
  expect(errors).toEqual([]);
});

for (const manual of [false, true]) test(`repaso completo actualizado, sellos ${manual ? "manuales" : "automáticos"}, sin cambiar equipo ni progreso`, async ({ page }) => {
  test.setTimeout(240000);
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await prepare(page, { manual, emptyLoadout: true, completed: true });
  const saved = await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"));
  await launch(page, true); await practical(page, manual);
  await expect(page.locator("[data-replay-tutorial]")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"))).toBe(afterArchiveIntroduction(saved));
  expect(errors).toEqual([]);
});

test("salir del repaso con Escape conserva el guardado", async ({ page }) => {
  await prepare(page); await launch(page, true);
  const saved = await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"));
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-replay-tutorial]")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("cronicas-del-sello-save-slot-1"))).toBe(saved);
});
