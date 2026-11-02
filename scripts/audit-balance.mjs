// Auditoría de solo lectura: no modifica reglas ni partidas del navegador.
// node scripts/audit-balance.mjs [--json=artifacts/balance-audit.json]
import fs from "node:fs";
import path from "node:path";
import { AFFINITY_IDS, affinityCycleModifier } from "../src/affinity-system.js";
import { BASE_ACTIONS, ENEMY_ROSTER, JUTSU_LIBRARY } from "../src/data.js";
import { ALL_MISSIONS, MISSIONS, SECONDARY_MISSIONS } from "../src/content/index.js";
import { resolveEncounterIds } from "../src/combat-modifiers.js";
import { attackBaseDamage, resolveDamage } from "../src/battle/damage.js";
import { createEnemyState } from "../src/battle/enemy-state.js";
import { combatantSpeed, combatantEvasion, advanceCooldowns } from "../src/battle/turn.js";
import { millisecondsToTimelineThreshold } from "../src/battle/timeline.js";
import { awardEncounter, completeMission, createCharacter, createDefaultSave, derivedStats,
  deliverBestiaryBook } from "../src/save.js";
import { sellItem, purchaseItem } from "../src/inventory.js";
import { ENCOUNTER_REWARDS, experienceForNextLevel } from "../src/progression-balance.js";
import { createCipherState } from "../src/puzzles/seal-cipher.js";
import { arenaPreview } from "../src/arena.js";
import { investResonance, earnedResonancePoints } from "../src/skills/progression.js";
import { TAIJUTSU_ACTIONS } from "../src/skills/definitions.js";
import { CHAKRA_BALANCE, actionChakraCost, actionChakraRecovery } from "../src/chakra-balance.js";
import { TECHNIQUE_MASTERY, techniqueAtLevel } from "../src/skills/technique-mastery.js";
import { actionInitiative, INITIATIVE_SPEED_STEP } from "../src/battle/initiative.js";

const round = x => Math.round(x * 100) / 100;
const fresh = (affinity = "fuego", bodyType = "male") => createCharacter(createDefaultSave(), { name: "Auditoría", affinity, bodyType });

// Se da por resuelta la parte narrativa/puzle; las recompensas y niveles pasan
// por las funciones del juego. No se usan checkpoints de depuración ni victorias
// simuladas para afirmar que una configuración puede superar una misión.
function campaign({ secret = false, scholar = false, contracts = false, affinity = "fuego" } = {}) {
  let save = fresh(affinity);
  const rows = [];
  for (const mission of [...MISSIONS, ...(contracts ? SECONDARY_MISSIONS : [])]) {
    if (scholar && mission.id === "s01") {
      save.equipment.accessory = null;
      save = sellItem(save, "chakra_charm").save;
      const purchase = purchaseItem(save, "scholar_mark");
      if (!purchase.ok) throw new Error(purchase.message);
      save = purchase.save;
      save.equipment.accessory = "scholar_mark";
    }
    if (mission.id === "m02") save.campaign.banditPrisonerChoice = secret ? "interrogate" : "eliminate";
    if (mission.id === "s02") {
      const cipher = createCipherState();
      cipher.revealed.fill(true);
      save.campaign.doctorRoute = { ...save.campaign.doctorRoute, phase: 3, resources: 2, cipher };
    }
    if (mission.id === "m03") save.campaign.hideoutEntryChoice = secret ? "secret" : "main";
    if (mission.contractItem) {
      const purchase = purchaseItem(save, mission.contractItem);
      if (!purchase.ok) throw new Error(purchase.message);
      save = purchase.save;
    }
    const before = { level: save.progression.level, coins: save.progression.coins };
    const ids = mission.encounters ? resolveEncounterIds(mission, save.campaign) : [];
    let encounterXp = 0;
    for (const id of ids) {
      const reward = awardEncounter(save, id);
      encounterXp += reward.xp;
      save = reward.save;
    }
    const result = completeMission(save, mission.id);
    if (!result.firstClear) throw new Error(`No se pudo liquidar ${mission.id}`);
    save = result.save;
    if (mission.id === "s02") save = deliverBestiaryBook(save);
    rows.push({ id: mission.id, encounters: ids.length, xp: encounterXp + result.xp,
      levelBefore: before.level, level: save.progression.level, xpRemainder: save.progression.xp,
      affinityXp: save.character.affinityXp[affinity], rewardCoins: save.progression.coins - before.coins,
      wallet: save.progression.coins });
  }
  return { rows, level: save.progression.level, xpRemainder: save.progression.xp,
    affinityXp: save.character.affinityXp[affinity], rank: save.campaign.rank, elementRank: save.campaign.elementRank,
    save };
}

function attackMetrics(save, action, target) {
  const p = derivedStats(save);
  const damage = resolveDamage({ baseDamage: attackBaseDamage(action.damage, p.baseStrength),
    strengthModifier: p.strengthModifier, cycleModifier: affinityCycleModifier(p.primaryAffinity, target.primaryAffinity),
    damageReduction: target.damageReduction }).damage;
  const speed = combatantSpeed(p);
  const readyMs = millisecondsToTimelineThreshold(0, speed, null, actionInitiative(action));
  const preparationMs = action.seals?.length ? millisecondsToTimelineThreshold(.8, speed, action) : 0;
  return { id: action.id, damage, rawHits: Math.ceil(target.hp / damage),
    cycleMs: round(readyMs + preparationMs), rawDamagePerTimelineSecond: round(damage / ((readyMs + preparationMs) / 1000)),
    cost: actionChakraCost(action, p.costReduction), netCostAfterNormalAction: actionChakraCost(action, p.costReduction) - actionChakraRecovery(action) };
}

// Ejecuta el flujo real sin Phaser ni animaciones para observar orden de cierre,
// regeneración y consumo de Guardia. Los ataques y desenlaces se inyectan.
globalThis.window = { Phaser: { Scene: class {} } };
const { BattleFlowMethods } = await import("../src/battle/scenes/battle-flow.js");
const { BattleActionMethods } = await import("../src/battle/scenes/battle-actions.js");
const noop = () => {};
function probeScene() {
  return { player: { hp: 3, maxHp: 100, chakra: 30, maxChakra: 100, statuses: [{ type: "poison", power: 3, duration: 1 }], guarding: false },
    enemy: { hp: 20 }, hero: { body: { x: 0, y: 0 } }, pendingActions: {}, timelineProgress: {}, cooldowns: { demo: 2 }, round: 1,
    scene: { isActive: () => true }, clearPreparationFeedback: noop, stopTurnTimeline: noop,
    setButtonsEnabled: noop, finishCombatantTurn: noop, setTimelineMarkerState: noop,
    updateTimelineMarkers: noop, refreshHud: noop, startTurnCharge: noop,
    playerAttack: async () => {}, resolveEnemyOutcome: async () => false,
    resolveCombatantStatusTick: async function(p) { this.statusTicks = (this.statusTicks || 0) + 1; p.hp -= 3; },
    finishBattle: async function() { this.finished = true; },
    advanceCooldowns: function() { this.cooldowns = advanceCooldowns(this.cooldowns); },
    clearGuard: function() { this.player.guarding = false; },
    executeEnemyAction: async () => {}, delay: async () => {}, tone: noop, setMessage: noop,
    tweens: { add: noop }, add: { circle: () => ({ setStrokeStyle() { return this; }, setDepth() { return this; } }) } };
}
const guardScene = probeScene();
guardScene.player.hp = 100; guardScene.player.statuses = [];
guardScene.resolveCombatantStatusTick = async () => {};
guardScene.playerGuard = () => BattleActionMethods.prototype.playerGuard.call(guardScene);
await BattleFlowMethods.prototype.executeTimelineAction.call(guardScene, "player", BASE_ACTIONS[1]);
const lethalScene = probeScene();
lethalScene.enemy.hp = 0;
lethalScene.enemyIndex = 0;
lethalScene.encounters = [{}];
lethalScene.resolveEnemyOutcome = async () => true;
await BattleFlowMethods.prototype.executeTimelineAction.call(lethalScene, "player", BASE_ACTIONS[0]);
const missScene = probeScene(); missScene.player.guarding = true;
missScene.resolveCombatantStatusTick = async () => {};
await BattleFlowMethods.prototype.executeTimelineAction.call(missScene, "enemy", { id: "injected-miss" });

const paths = Object.fromEntries(Object.entries({ main: {}, secret: { secret: true },
  allContent: { contracts: true }, allContentSecret: { contracts: true, secret: true },
  allContentScholar: { contracts: true, scholar: true } }).map(([key, opts]) => {
    const { save, ...data } = campaign(opts); return [key, data];
  }));
const starters = AFFINITY_IDS.flatMap(affinity => ["male", "female"].map(bodyType => {
  const p = derivedStats(fresh(affinity, bodyType));
  return { affinity, bodyType, hp: p.maxHp, chakra: p.maxChakra, strength: p.strength,
    speedShown: p.speed, speedActual: combatantSpeed(p), evasion: combatantEvasion({ ...p, chakra: p.maxChakra }),
    crit: p.criticalChance, reduction: p.damageReduction };
}));
const raizen = AFFINITY_IDS.map(affinity => {
  const save = fresh(affinity); save.progression.level = 5;
  const mission = MISSIONS.find(m => m.id === "m05");
  const enemy = createEnemyState(ENEMY_ROSTER.boss_raizen, mission, { banditPrisonerChoice: "eliminate" });
  return { affinity, enemyHp: enemy.hp, actions: [BASE_ACTIONS[0], ...JUTSU_LIBRARY.filter(j => j.element === affinity)].map(a => attackMetrics(save, a, enemy)) };
});
const resonance = AFFINITY_IDS.map(affinity => {
  const save = fresh(affinity); save.progression.level = 4;
  const p = derivedStats(save);
  let trained = save;
  for (const [id, times] of [["physical_0", 1], ["physical_1", 1], ["physical_3", 3], [`hybrid_physical_${affinity}_0`, 1], [`hybrid_physical_${affinity}_1`, 3]])
    for (let i = 0; i < times; i++) trained = investResonance(trained, id);
  return { affinity, level: 4, pointsAvailable: earnedResonancePoints(save), initialReduction: p.damageReduction,
    defensiveReduction: derivedStats(trained).damageReduction, investments: trained.progression.resonance.investments };
});
const arena = AFFINITY_IDS.map(affinity => {
  const { enemy, player } = arenaPreview(fresh(), { rival: { fuego: "fire", agua: "water", tierra: "earth", viento: "wind" }[affinity], difficulty: "balanced" });
  return { rival: affinity, playerHp: player.maxHp, playerChakra: player.maxChakra, enemyHp: enemy.maxHp,
    enemyChakra: enemy.maxChakra, enemySpeed: combatantSpeed(enemy), enemyStrength: enemy.strength };
});
const report = { schema: 2, method: "Reglas puras, liquidación de recompensas y sondas del flujo real. Sin estimación de victorias ni duración de animaciones.",
  chakraRules: CHAKRA_BALANCE,
  initiativeRules: { speedStep: INITIATIVE_SPEED_STEP, stacking: false, consumedAtProgress: .8 },
  techniqueMastery: { rules: TECHNIQUE_MASTERY, example: Array.from({ length: 5 }, (_, i) => {
    const action = techniqueAtLevel(JUTSU_LIBRARY.find(j => j.id === "fire_embers"), i + 1);
    return { level: i + 1, damage: action.damage, cost: action.cost, netCost: action.cost - actionChakraRecovery(action),
      seals: action.seals.length, preparationMsAtSpeed10: millisecondsToTimelineThreshold(.8, 10, action) };
  }) },
  tutorialBossAffinities: Object.fromEntries(AFFINITY_IDS.map(affinity => [affinity,
    createEnemyState(ENEMY_ROSTER.boss_varek, MISSIONS[0], {}, affinity).primaryAffinity])),
  paths, starters, raizen, resonance, arena, taijutsu: TAIJUTSU_ACTIONS.map(a => ({ id: a.id, speedMod: a.speedMod,
    actualCycleMsAtSpeed10: millisecondsToTimelineThreshold(0, 10), damage: a.damage, healthCost: a.healthCost })),
  runtimeProbes: { guardChakraGained: guardScene.player.chakra - 30,
    guardingAfterEnemyActionWithoutHit: missScene.player.guarding,
    immediateEnemyOutcome: { statusTicks: lethalScene.statusTicks || 0, hp: lethalScene.player.hp,
      chakra: lethalScene.player.chakra, cooldown: lethalScene.cooldowns.demo } },
  xpThresholds: Array.from({ length: 10 }, (_, i) => ({ level: i + 1, next: experienceForNextLevel(i + 1) })),
  xpUpperBound: { allRewardsWithScholarFromStart: ALL_MISSIONS.reduce((sum, m) => sum + Math.round(m.reward.xp * 1.15)
    + (m.encounters || []).reduce((total, id) => total + Math.round(ENCOUNTER_REWARDS[id].xp * 1.15), 0), 0),
    requiredForLevel8: Array.from({ length: 7 }, (_, i) => experienceForNextLevel(i + 1)).reduce((a, b) => a + b, 0) },
  catalog: { missions: ALL_MISSIONS.length, techniques: JUTSU_LIBRARY.length,
    mainBossAffinities: Object.values(ENEMY_ROSTER).filter(e => e.boss).map(e => e.affinity) } };
const arg = process.argv.find(arg => arg.startsWith("--json="));
if (arg) { const out = arg.slice(7); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`); }
console.table(Object.entries(paths).map(([route, p]) => ({ route, level: p.level, xpRemainder: p.xpRemainder,
  affinityXp: p.affinityXp, rank: p.rank, elementRank: p.elementRank })));
console.log("Sondas del flujo real:", JSON.stringify(report.runtimeProbes));
console.log(arg ? `Detalle JSON: ${arg.slice(7)}` : JSON.stringify(report, null, 2));
