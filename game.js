import { SEALS, BASE_ACTIONS, JUTSU_LIBRARY, ENEMY_ACTIONS, ENEMY_ROSTER } from "./src/data.js?v=0.66.0";
import { applyStatus, affinityLabel, hasStatus, hitChance } from "./src/rules.js?v=0.20.0";
import { AFFINITY_CONFIG, affinityCycleModifier, furyDamageBonus, reprisalChance, reprisalDamage } from "./src/affinity-system.js?v=0.58.0";
import { createPlayerFighter, destroyFighter, playFighterDamageReaction, preparePlayerPunch, queuePlayerFighterTextures, recoverPlayerPunch, releasePlayerPunch, startPlayerGuard, startPlayerRunning, stopPlayerGuard, stopPlayerRunning } from "./src/fighters.js?v=0.62.0";
import { enemyFighterAppearance, playerFighterAppearance } from "./src/character.js?v=0.62.0";
import { actionLines, createActionButton, createBar } from "./src/ui.js?v=0.64.0";
import { mountMetaUI } from "./src/meta-ui.js?v=0.66.0";
import { awardEncounter, cancelDoctorMission, completeMission, derivedStats, loadSave, masterIdForCharacter, recordBestiaryObservation, resolveDoctorMissionCombat, writeSave } from "./src/save.js?v=0.66.0";
import { elementIcon } from "./src/elements.js?v=0.20.0";
import { createUiIcon, loadUiIcons } from "./src/icons.js?v=0.44.0";
import { missionStep } from "./src/mission-system.js?v=0.67.0";
import { getMissionSceneDialogue } from "./src/dialogues.js?v=0.66.0";
import { bossPhaseMessage, combatFeatures, fieldSuppliesForBattle, resolveEncounterIds } from "./src/combat-modifiers.js?v=0.67.0";
import { resolveDamage } from "./src/battle/damage.js?v=0.68.0";
import { createEnemyState } from "./src/battle/enemy-state.js?v=0.68.0";
import { advanceCooldowns, combatantEvasion, combatantSpeed, nextEnemyAction, resolveStatusTick, soakAfterTurn, waterSoakAfterAttack } from "./src/battle/turn.js?v=0.68.0";
import { addBattleReward, bestiaryObservation, createBattleResult, emptyBattleRewards } from "./src/battle/rewards.js?v=0.68.0";

const Phaser = window.Phaser;

const WIDTH = 960;
const HEIGHT = 540;
const MAX_RENDER_RESOLUTION = 4;
let renderResolution = 1;
let textTextureResolution = 2;

function configureRenderResolution(element) {
  const bounds = element.getBoundingClientRect();
  const cssScale = Math.min(bounds.width / WIDTH, bounds.height / HEIGHT);
  const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
  renderResolution = Math.min(MAX_RENDER_RESOLUTION, Math.max(1, cssScale * pixelRatio));
  textTextureResolution = Math.min(4, Math.max(2, Math.ceil(renderResolution)));
  return {
    width: Math.round(WIDTH * renderResolution),
    height: Math.round(HEIGHT * renderResolution)
  };
}

function sharpenTextTree(objects, resolution = textTextureResolution) {
  objects.forEach((child) => {
    if (child instanceof Phaser.GameObjects.Text && typeof child.setResolution === "function") {
      child.setResolution(resolution);
    }
    if (Array.isArray(child.list)) sharpenTextTree(child.list, resolution);
  });
}

function drawCubicBezier(graphics, start, controlA, controlB, end, segments = 32) {
  graphics.moveTo(start.x, start.y);
  for (let index = 1; index <= segments; index += 1) {
    const t = index / segments;
    const inverse = 1 - t;
    const x = (inverse ** 3 * start.x)
      + (3 * inverse ** 2 * t * controlA.x)
      + (3 * inverse * t ** 2 * controlB.x)
      + (t ** 3 * end.x);
    const y = (inverse ** 3 * start.y)
      + (3 * inverse ** 2 * t * controlA.y)
      + (3 * inverse * t ** 2 * controlB.y)
      + (t ** 3 * end.y);
    graphics.lineTo(x, y);
  }
}
const TIMELINE_START = 310;
const TIMELINE_END = 914;
const RANK_LEVELS = Object.freeze(["Novicio", "Guardián"]);
const HUD_THEMES = Object.freeze({
  ancestral: Object.freeze({
    texture: "hud-theme-ancestral",
    file: "assets/ui/hud-themes/ancestral.webp?v=0.45.1",
    health: Object.freeze({ x: 28, y: 127, width: 2119, height: 289, displayWidth: 360 }),
    chakra: Object.freeze({ x: 38, y: 434, width: 2097, height: 199, displayWidth: 340 }),
    barOffset: Object.freeze({ healthY: -4, chakraY: -5 })
  }),
  lunar: Object.freeze({
    texture: "hud-theme-lunar",
    file: "assets/ui/hud-themes/lunar.webp?v=0.45.1",
    health: Object.freeze({ x: 8, y: 43, width: 851, height: 128, displayWidth: 360 }),
    chakra: Object.freeze({ x: 12, y: 182, width: 843, height: 67, displayWidth: 340 }),
    barOffset: Object.freeze({ healthY: 3, chakraY: 2 })
  })
});
const BATTLE_ARENAS = Object.freeze([
  Object.freeze({ texture: "travel-forest", file: "assets/locations/battle-dusk-pass.jpg?v=0.20.0" }),
  Object.freeze({ texture: "bg-marsh", file: "assets/locations/battle-mist-marsh-water.png?v=0.63.0" }),
  Object.freeze({ texture: "bg-moon", file: "assets/locations/battle-moon-shrine.jpg?v=0.20.0" })
]);
const TECHNIQUE_VFX = Object.freeze({
  fire_embers: Object.freeze({ file: "fire-embers-spritesheet.png", frameWidth: 550.4, frameHeight: 280, sourceY: 620, width: 210, height: 112, frameRate: 10, frames: 5, projectile: true }),
  fire_breath: Object.freeze({ file: "fire-breath-spritesheet.png", frameWidth: 313, frameHeight: 717, width: 170, height: 390, frameRate: 11 }),
  water_bullet: Object.freeze({ file: "water-bullet-spritesheet.png", frameWidth: 310, frameHeight: 725, width: 180, height: 270, frameRate: 13 }),
  water_whip: Object.freeze({ file: "water-whip-spritesheet.png", frameWidth: 310, frameHeight: 725, width: 220, height: 390, frameRate: 10 }),
  earth_fist: Object.freeze({ file: "earth-fist-spritesheet.png", frameWidth: 310, frameHeight: 724, width: 175, height: 330, frameRate: 12 }),
  earth_wall: Object.freeze({ file: "earth-wall-spritesheet.png", frameWidth: 310, frameHeight: 725, width: 240, height: 410, frameRate: 10 }),
  wind_palm: Object.freeze({ file: "wind-palm-spritesheet.png", frameWidth: 310, frameHeight: 724, width: 180, height: 285, frameRate: 13 }),
  wind_blade: Object.freeze({ file: "wind-blade-spritesheet.png", frameWidth: 310, frameHeight: 724, width: 220, height: 390, frameRate: 10 })
});
const TECHNIQUE_VFX_FRAMES = 7;
let activeSave = loadSave();
let activeMission = null;
let game = null;
let metaUi = null;
let pendingSecondaryResults = null;

class MissionTravelScene extends Phaser.Scene {
  constructor() { super("travel"); }

  preload() {
    this.load.image(BATTLE_ARENAS[0].texture, BATTLE_ARENAS[0].file);
    queuePlayerFighterTextures(this, playerFighterAppearance(activeSave));
  }

  create(data = {}) {
    this.cameras.main.setZoom(renderResolution).centerOn(WIDTH / 2, HEIGHT / 2);
    const returningToVillage = data.direction === "toVillage";
    const returningToRoute = data.direction === "toDoctorRoute";
    const returning = returningToVillage || returningToRoute;
    this.add.image(WIDTH / 2, HEIGHT / 2, "travel-forest").setDisplaySize(WIDTH, HEIGHT).setDepth(0);
    const forest = this.add.graphics().setDepth(1);
    forest.fillStyle(0x071711, 0.34).fillRect(0, 0, WIDTH, HEIGHT);
    forest.fillStyle(0x10261b, 0.92).fillRect(0, 382, WIDTH, 158);
    forest.fillStyle(0x1c3423, 0.96);
    forest.fillTriangle(0, 436, 480, 356, 960, 436);
    forest.fillStyle(0x07130d, 0.88);
    for (let x = 18; x < WIDTH; x += 74) {
      const height = 105 + ((x * 17) % 72);
      forest.fillRect(x - 7, 382 - height, 14, height + 74);
      forest.fillTriangle(x - 47, 382 - height + 54, x, 382 - height - 34, x + 47, 382 - height + 54);
      forest.fillTriangle(x - 39, 382 - height + 92, x, 382 - height + 12, x + 39, 382 - height + 92);
    }
    forest.fillStyle(0x06100b, 0.82).fillRect(0, 421, WIDTH, 119);

    this.add.text(WIDTH / 2, 62, returningToVillage ? "REGRESO A LA ALDEA" : returningToRoute ? "RETOMANDO LA BÚSQUEDA" : "RUMBO A LA MISIÓN", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "24px", color: "#f5edd8", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(10);
    this.add.text(WIDTH / 2, 94, returningToVillage ? "El sendero de vuelta atraviesa el bosque." : returningToRoute ? "El rastro de Haru continúa entre los caminos." : activeMission.title, {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "14px", color: "#bcd4c1"
    }).setOrigin(0.5).setDepth(10);

    const startX = returning ? WIDTH + 90 : -90;
    const endX = returning ? -90 : WIDTH + 90;
    const runner = createPlayerFighter(this, startX, 330, playerFighterAppearance(activeSave));
    if (returning) runner.body.setScale(-1, 1);
    startPlayerRunning(this, runner);
    this.cameras.main.fadeIn(220, 4, 10, 7);
    const duration = 2350;
    this.tweens.add({ targets: runner.body, x: endX, duration, ease: "Linear" });
    this.tweens.add({ targets: runner.shadow, x: endX, duration, ease: "Linear" });
    this.time.delayedCall(duration - 260, () => this.cameras.main.fadeOut(250, 4, 10, 7));
    this.time.delayedCall(duration, () => {
      stopPlayerRunning(runner);
      if (returningToVillage) releaseGameToMeta("plaza");
      else if (returningToRoute || activeMission?.type === "route-search") releaseGameToMeta("doctor-route");
      else if (activeMission?.type === "investigation") releaseGameToMeta("kagemori");
      else this.scene.start("battle");
    });
    sharpenTextTree(this.children.list);
  }
}

class BattleScene extends Phaser.Scene {
  constructor() { super("battle"); }

  preload() {
    const arenaIndex = ((activeMission?.number || 1) - 1) % BATTLE_ARENAS.length;
    const arena = BATTLE_ARENAS[arenaIndex];
    this.battleBackgroundKey = arena.texture;
    if (!this.textures.exists(arena.texture)) this.load.image(arena.texture, arena.file);
    if (!this.textures.exists("substitution-log")) this.load.image("substitution-log", "assets/vfx/substitution-log-runtime.png?v=0.64.0");

    // Ambos marcos optimizados pesan juntos menos de un tercio del PNG ancestral
    // anterior. Cargarlos aquí evita parpadeos al alternarlos desde la pausa.
    Object.values(HUD_THEMES).forEach((theme) => {
      if (!this.textures.exists(theme.texture)) this.load.image(theme.texture, theme.file);
    });

    const needsSealSheet = activeSave.loadout.some((id) => JUTSU_LIBRARY.find((jutsu) => jutsu.id === id)?.seals.length);
    if (needsSealSheet) this.load.image("sealSheet", "assets/sellos-originales.webp?v=0.20.0");
    Object.entries(TECHNIQUE_VFX).forEach(([jutsuId, effect]) => {
      if (!activeSave.loadout.includes(jutsuId) || this.textures.exists(`technique-vfx-${jutsuId}`)) return;
      const texture = `technique-vfx-${jutsuId}`;
      const source = `assets/vfx/${effect.file}?v=0.52.0`;
      if (Number.isFinite(effect.sourceY)) this.load.image(texture, source);
      else this.load.spritesheet(texture, source, {
          frameWidth: effect.frameWidth,
          frameHeight: effect.frameHeight,
          endFrame: (effect.frames || TECHNIQUE_VFX_FRAMES) - 1
        });
    });
    loadUiIcons(this);
    if (missionStep(activeMission, "choice")?.relicDecision) {
      if (!this.textures.exists("kagemori-investigation")) this.load.image("kagemori-investigation", "assets/locations/kagemori.webp?v=0.62.0");
      const master = masterIdForCharacter(activeSave.character) === "mei" ? "mei-hayate" : "daichi-kazan";
      if (!this.textures.exists(master)) this.load.image(master, `assets/npcs/${master}.webp?v=0.62.0`);
    }
    // Texturas de combatientes generadas con el mismo SVG del Dojo.
    this.saveData = activeSave;
    this.missionStartSave = JSON.parse(JSON.stringify(activeSave));
    this.mission = activeMission;
    this.combatFeatures = combatFeatures(this.mission, this.saveData.campaign);
    activeMission.encounters.forEach((enemyId) => queuePlayerFighterTextures(this, enemyFighterAppearance(ENEMY_ROSTER[enemyId], enemyId)));
    BASE_ACTIONS.forEach((action) => {
      const key = `action-${action.id}`;
      if (!this.textures.exists(key)) this.load.image(key, action.icon);
    });
    this.saveData.loadout.map((id) => JUTSU_LIBRARY.find((jutsu) => jutsu.id === id)?.element).filter(Boolean).forEach((element) => {
      const key = `element-${element}`;
      if (!this.textures.exists(key)) this.load.image(key, elementIcon(element));
    });
    queuePlayerFighterTextures(this, this.playerAppearance());
  }

  create() {
    // Phaser 3.90 no escala el framebuffer mediante GameConfig.resolution.
    // Renderizamos una superficie física acorde al escenario y la cámara conserva el lienzo
    // lógico de 960 × 540, evitando que el navegador amplíe texto rasterizado.
    this.cameras.main.setZoom(renderResolution).centerOn(WIDTH / 2, HEIGHT / 2);
    this.saveData = activeSave;
    Object.entries(TECHNIQUE_VFX).forEach(([jutsuId, effect]) => {
      const texture = `technique-vfx-${jutsuId}`;
      const animation = `${texture}-animation`;
      if (!this.textures.exists(texture) || this.anims.exists(animation)) return;
      if (Number.isFinite(effect.sourceY)) {
        const sheet = this.textures.get(texture);
        Array.from({ length: effect.frames }, (_, index) => index).forEach((index) => {
          if (!sheet.has(index)) sheet.add(index, 0, index * effect.frameWidth, effect.sourceY, effect.frameWidth, effect.frameHeight);
        });
      }
      this.anims.create({
        key: animation,
        frames: this.anims.generateFrameNumbers(texture, { start: 0, end: (effect.frames || TECHNIQUE_VFX_FRAMES) - 1 }),
        frameRate: effect.frameRate,
        repeat: 0,
        hideOnComplete: !effect.projectile
      });
    });
    this.mission = activeMission;
    this.encounterIds = resolveEncounterIds(this.mission, this.saveData.campaign);
    this.encounters = this.encounterIds.map((id) => ENEMY_ROSTER[id]);
    const stats = derivedStats(this.saveData);
    this.player = { ...stats, hp: stats.maxHp, chakra: stats.maxChakra, statuses: [], guarding: false };
    const selectedJutsus = this.saveData.loadout.map((id) => JUTSU_LIBRARY.find((jutsu) => jutsu.id === id)).filter(Boolean)
      .map((jutsu) => ({ ...jutsu, iconTexture: `element-${jutsu.element}` }));
    // La barra tiene un contrato estable: Golpe siempre ocupa 1, las cuatro
    // técnicas configurables viven en 2–5 y Guardia siempre ocupa 6.
    const techniqueSlots = Array.from({ length: 4 }, (_, index) => selectedJutsus[index] || null);
    this.actions = [
      { ...BASE_ACTIONS[0], iconTexture: "action-strike" },
      ...techniqueSlots,
      { ...BASE_ACTIONS[1], iconTexture: "action-guard" }
    ];
    this.enemyIndex = 0;
    this.enemy = this.createEnemyState(this.encounters[this.enemyIndex]);
    this.recordEnemyObservation({ encounter: true });
    this.cooldowns = Object.fromEntries(this.actions.filter(Boolean).map((action) => [action.id, 0]));
    this.round = 1;
    this.busy = true;
    this.turnReady = false;
    this.finished = false;
    this.defeatedEncounters = 0;
    this.battleRewards = emptyBattleRewards();
    this.pendingEncounterRewards = [];
    this.rewardPreviewSave = this.saveData;
    this.fieldSupplies = fieldSuppliesForBattle(this.mission, this.saveData.campaign);
    this.nextRecovery = null;
    this.audioContext = null;
    this.configureSealMode();
    this.configurePresentationOptions();
    try { this.seenJutsus = new Set(JSON.parse(window.localStorage.getItem("seen-jutsus") || "[]")); } catch (_) { this.seenJutsus = new Set(); }

    if (this.textures.exists("sealSheet")) this.makeSealFrames();
    this.drawArena();
    this.createHud();
    this.createFighters();
    if (this.combatFeatures.defenseAura && this.enemy.damageReduction > 0) {
      this.raizenDefenseAura = this.add.circle(this.foe.body.x, this.foe.body.y - 20, 74, 0x7f91b8, 0.08).setStrokeStyle(4, 0x9eb8e8, 0.6).setDepth(7);
      this.tweens.add({ targets: this.raizenDefenseAura, scale: 1.08, alpha: 0.2, duration: 720, yoyo: true, repeat: -1 });
    }
    this.createActionPanel();
    this.createTurnTimeline();
    this.createPauseButton();
    this.startMusic();
    if (this.combatFeatures.tutorial && !this.saveData.campaign.completedMissions.includes(this.mission.id)) {
      this.time.delayedCall(120, async () => {
        await this.playMissionOneTutorial();
        this.startTurnCharge();
      });
    } else if (this.combatFeatures.secretEntry) {
      this.time.delayedCall(120, async () => {
        await this.playSecretWarehouse();
        this.startTurnCharge();
      });
    } else if (this.combatFeatures.lieutenantIntervention) {
      this.time.delayedCall(120, async () => {
        await this.playLieutenantIntervention();
        this.startTurnCharge();
      });
    } else this.startTurnCharge();
    this.sharpenSceneText();
  }

  recordEnemyObservation(observation) {
    const entry = bestiaryObservation(this.encounterIds, this.enemyIndex, observation);
    this.saveData = writeSave(recordBestiaryObservation(this.saveData, entry.enemyId, entry.observation));
    activeSave = this.saveData;
  }

  configureSealMode() {
    const toggle = document.getElementById("manual-seals");
    const hint = document.getElementById("mode-hint");
    this.manualSeals = toggle.checked;

    const updateHint = () => {
      hint.textContent = this.manualSeals
        ? "Completa las secuencias con QWER / ASDF / ZXCV."
        : "Los sellos se ejecutarán automáticamente.";
    };

    this.onSealModeChange = () => {
      this.manualSeals = toggle.checked;
      try { window.localStorage.setItem("seal-input-mode", this.manualSeals ? "manual" : "automatic"); } catch (_) { /* El juego continúa sin persistencia. */ }
      updateHint();
      if (!this.busy && !this.finished) {
        this.setMessage(this.manualSeals ? "Sellos manuales activados." : "Sellos automáticos activados.");
      }
    };

    toggle.addEventListener("change", this.onSealModeChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => toggle.removeEventListener("change", this.onSealModeChange));
    updateHint();
  }

  configurePresentationOptions() {
    const cameraToggle = document.getElementById("camera-effects");
    const flashToggle = document.getElementById("flash-effects");
    const musicToggle = document.getElementById("music-enabled");
    const lightToggle = document.getElementById("light-mode");
    const volumeInput = document.getElementById("game-volume");
    const hudThemeSelect = document.getElementById("hud-theme");
    this.cameraEffects = cameraToggle.checked;
    this.flashEffects = flashToggle.checked;
    this.musicEnabled = musicToggle.checked;
    this.lightMode = lightToggle.checked;
    this.volume = Number(volumeInput.value) / 100;
    this.hudTheme = HUD_THEMES[hudThemeSelect.value] ? hudThemeSelect.value : "ancestral";

    const update = () => {
      this.cameraEffects = cameraToggle.checked;
      this.flashEffects = flashToggle.checked;
      this.musicEnabled = musicToggle.checked;
      this.lightMode = lightToggle.checked;
      this.volume = Number(volumeInput.value) / 100;
      this.hudTheme = HUD_THEMES[hudThemeSelect.value] ? hudThemeSelect.value : "ancestral";
      try {
        window.localStorage.setItem("camera-effects", this.cameraEffects ? "on" : "off");
        window.localStorage.setItem("flash-effects", this.flashEffects ? "on" : "off");
        window.localStorage.setItem("music-enabled", this.musicEnabled ? "on" : "off");
        window.localStorage.setItem("light-mode", this.lightMode ? "on" : "off");
        window.localStorage.setItem("game-volume", volumeInput.value);
        window.localStorage.setItem("hud-theme", this.hudTheme);
      } catch (_) { /* Las opciones funcionan aunque no puedan persistir. */ }
      if (this.hudFrames) this.applyHudTheme(this.hudTheme);
    };

    cameraToggle.addEventListener("change", update);
    flashToggle.addEventListener("change", update);
    musicToggle.addEventListener("change", update);
    lightToggle.addEventListener("change", update);
    volumeInput.addEventListener("input", update);
    hudThemeSelect.addEventListener("change", update);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      cameraToggle.removeEventListener("change", update);
      flashToggle.removeEventListener("change", update);
      musicToggle.removeEventListener("change", update);
      lightToggle.removeEventListener("change", update);
      volumeInput.removeEventListener("input", update);
      hudThemeSelect.removeEventListener("change", update);
    });
  }

  createEnemyState(profile) {
    return createEnemyState(profile, this.mission, this.saveData.campaign);
  }

  combatantSpeed(combatant) {
    return combatantSpeed(combatant);
  }

  combatantEvasion(combatant) {
    return combatantEvasion(combatant);
  }

  applyWaterPassive(attacker, defender) {
    const previous = defender.soak;
    defender.soak = waterSoakAfterAttack(attacker, defender);
    if (defender.soak === previous) return null;
    return defender.soak;
  }

  finishCombatantTurn(combatant) {
    combatant.soak = soakAfterTurn(combatant);
  }

  async applyEarthReprisal(defender, attacker, attackerFighter, receivedDamage) {
    if (defender.primaryAffinity !== "tierra" || defender.hp <= 0) return;
    if (Math.random() >= reprisalChance(defender.hp, defender.maxHp)) return;
    const damage = reprisalDamage(receivedDamage, attacker.maxHp);
    if (!damage) return;
    this.floatLabel(attackerFighter.body.x, attackerFighter.body.y - 156, "REPRESALIA", 0xd7a86e);
    const { reaction } = this.loseHealth(attacker, attackerFighter, damage);
    await reaction;
  }

  chooseEnemyAction() {
    const profile = this.encounters[this.enemyIndex];
    const next = nextEnemyAction(profile, this.enemy);
    this.enemy.patternIndex = next.patternIndex;
    return ENEMY_ACTIONS[next.actionId];
  }

  makeSealFrames() {
    const texture = this.textures.get("sealSheet");
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const index = row * 4 + col;
        // La textura sobrevive al reinicio de la escena. Registrar los mismos
        // fotogramas otra vez deja la escena incompleta en algunas versiones.
        if (!texture.has(index)) texture.add(index, 0, col * 688, row * 512, 688, 512);
      }
    }
  }

  drawArena() {
    const theme = (this.mission.number - 1) % 3;
    const bgKey = this.battleBackgroundKey || BATTLE_ARENAS[theme].texture;
    if (this.textures.exists(bgKey)) {
      this.add.image(WIDTH / 2, HEIGHT / 2, bgKey).setDisplaySize(WIDTH, HEIGHT).setDepth(0);
    }

    const g = this.add.graphics().setDepth(1);
    if (theme === 0) this.drawDuskPass(g);
    else if (theme === 1) this.drawMistMarsh(g);
    else this.drawMoonShrine(g);

    // Solo se oscurece el borde inferior para integrar la barra de velocidad
    // sin cubrir el campo de batalla.
    g.fillGradientStyle(0x061321, 0x061321, 0x020812, 0x020812, 0, 0, 0.24, 0.38);
    g.fillRect(0, 450, WIDTH, 90);

    this.arenaLabel = ["PASO DEL CREPÚSCULO", "MARISMA DE LOS JUNCOS", "SANTUARIO DE LA LUNA"][theme];
  }

  drawDuskPass(g) {
    g.fillGradientStyle(0x000000, 0x000000, 0x2a1210, 0x2a1210, 0.08, 0.08, 0.38, 0.38);
    g.fillRect(0, 0, WIDTH, 350);
    for (let x = 30; x < WIDTH; x += 64) {
      g.fillStyle(0xffbd73, 0.22);
      g.fillCircle(x, 260 + (x % 5) * 12, 2);
    }
  }

  drawMistMarsh(g) {
    g.fillGradientStyle(0x000000, 0x000000, 0x0b2420, 0x0b2420, 0.08, 0.08, 0.42, 0.42);
    g.fillRect(0, 0, WIDTH, 350);
    g.fillStyle(0x67e8c3, 0.06);
    g.fillEllipse(320, 320, 480, 40);
    g.fillEllipse(720, 310, 460, 45);
  }

  drawMoonShrine(g) {
    g.fillGradientStyle(0x000000, 0x000000, 0x1d0f2e, 0x1d0f2e, 0.08, 0.08, 0.42, 0.42);
    g.fillRect(0, 0, WIDTH, 350);
    for (let x = 60; x < WIDTH; x += 96) {
      g.fillStyle(0xb879ff, 0.18);
      g.fillCircle(x, 230 + (x % 4) * 18, 2);
    }
  }

  createHud() {
    const playerFrameX = 205;
    const enemyFrameX = 755;
    const healthFrameY = 58;
    const chakraFrameY = 91;
    // El relleno sobresale levemente del hueco transparente y el marco
    // ilustrado oculta sus extremos, evitando rendijas entre temas.
    const healthBarWidth = 326;
    const chakraBarWidth = 324;
    const playerHealthX = playerFrameX - healthBarWidth / 2;
    const playerChakraX = playerFrameX - chakraBarWidth / 2;
    const enemyHealthX = enemyFrameX - healthBarWidth / 2;
    const enemyChakraX = enemyFrameX - chakraBarWidth / 2;

    this.registerHudThemeFrames();

    this.playerName = this.add.text(
      38,
      10,
      `${this.saveData.character.name.toUpperCase()} · NV ${this.saveData.progression.level}`,
      {
        fontFamily: '"Cinzel", Georgia, serif',
        fontSize: "15px",
        color: "#f7fbff",
        fontStyle: "bold",
        stroke: "#06090e",
        strokeThickness: 2
      }
    ).setDepth(21);

    this.enemyName = this.add.text(
      enemyFrameX,
      10,
      this.encounters[this.enemyIndex].name.toUpperCase(),
      {
        fontFamily: '"Cinzel", Georgia, serif',
        fontSize: "15px",
        color: "#f7fbff",
        fontStyle: "bold",
        stroke: "#06090e",
        strokeThickness: 2
      }
    ).setOrigin(0.5, 0).setDepth(21);

    this.playerHpBar = createBar(this, playerHealthX, healthFrameY - 4, healthBarWidth, 24, 0x38df87);
    this.chakraBar = createBar(this, playerChakraX, chakraFrameY - 5, chakraBarWidth, 9, 0x2eaff4);
    this.enemyHpBar = createBar(this, enemyHealthX, healthFrameY - 4, healthBarWidth, 24, 0xef4755, { direction: "rtl" });
    this.enemyChakraBar = createBar(this, enemyChakraX, chakraFrameY - 5, chakraBarWidth, 9, 0x24485e, { direction: "rtl" });
    this.enemyChakraBar.valueText.setVisible(false);
    this.enemyChakraLock = createUiIcon(this, "lock", enemyFrameX, chakraFrameY - 5, { size: 8, tint: 0xa9bfcc, depth: 24 });
    this.enemyChakraBar.centerIcon = this.enemyChakraLock;
    this.hudBarCenters = { healthFrameY, chakraFrameY };

    const rankNumber = Math.max(1, RANK_LEVELS.indexOf(this.saveData.campaign.rank) + 1);
    const rankY = 125;
    this.playerRankStar = this.add.text(110, rankY, "★", {
      fontFamily: '"Cinzel", Georgia, serif',
      fontSize: "29px",
      color: "#f5c84b",
      stroke: "#6a3c09",
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(24);
    this.playerRankNumber = this.add.text(110, rankY, String(rankNumber), {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif',
      fontSize: "10px",
      color: "#241300",
      fontStyle: "bold"
    }).setOrigin(0.5, 0.55).setDepth(25);

    const enemyRankNumber = this.enemyRankForProfile(this.encounters[this.enemyIndex]);
    this.enemyRankStar = this.add.text(WIDTH - 110, rankY, "★", {
      fontFamily: '"Cinzel", Georgia, serif',
      fontSize: "29px",
      color: "#f5c84b",
      stroke: "#6a3c09",
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(24);
    this.enemyRankNumber = this.add.text(WIDTH - 110, rankY, String(enemyRankNumber), {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif',
      fontSize: "10px",
      color: "#241300",
      fontStyle: "bold"
    }).setOrigin(0.5, 0.55).setDepth(25);

    this.hudFrames = {
      health: [
        this.add.image(playerFrameX, healthFrameY, HUD_THEMES[this.hudTheme].texture, "health").setDepth(25),
        this.add.image(enemyFrameX, healthFrameY, HUD_THEMES[this.hudTheme].texture, "health").setDepth(25)
      ],
      chakra: [
        this.add.image(playerFrameX, chakraFrameY, HUD_THEMES[this.hudTheme].texture, "chakra").setDepth(25),
        this.add.image(enemyFrameX, chakraFrameY, HUD_THEMES[this.hudTheme].texture, "chakra").setDepth(25)
      ]
    };
    this.applyHudTheme(this.hudTheme);

    [this.playerHpBar, this.chakraBar, this.enemyHpBar, this.enemyChakraBar].forEach((bar) => {
      bar.bg.setDepth(21);
      if (bar.slot) bar.slot.setDepth(21);
      bar.fill.setDepth(22);
      if (bar.sheen) bar.sheen.setDepth(23);
      bar.valueText.setDepth(24);
    });

    this.refreshHud();
    this.sealLayer = this.add.container(WIDTH / 2, 120).setDepth(30);
  }

  registerHudThemeFrames(themeId = this.hudTheme) {
    const theme = HUD_THEMES[themeId] || HUD_THEMES.ancestral;
    if (!this.textures.exists(theme.texture)) return false;
    const texture = this.textures.get(theme.texture);
    for (const frameName of ["health", "chakra"]) {
      if (!texture.has(frameName)) {
        const frame = theme[frameName];
        texture.add(frameName, 0, frame.x, frame.y, frame.width, frame.height);
      }
    }
    return true;
  }

  loadHudTheme(themeId) {
    const theme = HUD_THEMES[themeId] || HUD_THEMES.ancestral;
    if (this.loadingHudTheme === theme.texture) return;
    this.loadingHudTheme = theme.texture;
    this.load.once(`filecomplete-image-${theme.texture}`, () => {
      this.loadingHudTheme = null;
      this.registerHudThemeFrames(themeId);
      if (this.hudFrames && this.hudTheme === themeId) this.applyHudTheme(themeId);
    });
    this.load.once("loaderror", () => { this.loadingHudTheme = null; });
    this.load.image(theme.texture, theme.file);
    this.load.start();
  }

  applyHudTheme(themeId) {
    const theme = HUD_THEMES[themeId] || HUD_THEMES.ancestral;
    this.hudTheme = HUD_THEMES[themeId] ? themeId : "ancestral";
    if (!this.registerHudThemeFrames(this.hudTheme)) {
      this.loadHudTheme(this.hudTheme);
      return;
    }
    this.hudFrames.health.forEach((frame, index) => frame
      .setTexture(theme.texture, "health")
      .setDisplaySize(theme.health.displayWidth, theme.health.displayWidth * (theme.health.height / theme.health.width))
      .setFlipX(index === 1));
    this.hudFrames.chakra.forEach((frame, index) => frame
      .setTexture(theme.texture, "chakra")
      .setDisplaySize(theme.chakra.displayWidth, theme.chakra.displayWidth * (theme.chakra.height / theme.chakra.width))
      .setFlipX(index === 1));
    this.moveHudBar(this.playerHpBar, this.hudBarCenters.healthFrameY + theme.barOffset.healthY);
    this.moveHudBar(this.enemyHpBar, this.hudBarCenters.healthFrameY + theme.barOffset.healthY);
    this.moveHudBar(this.chakraBar, this.hudBarCenters.chakraFrameY + theme.barOffset.chakraY);
    this.moveHudBar(this.enemyChakraBar, this.hudBarCenters.chakraFrameY + theme.barOffset.chakraY);
  }

  moveHudBar(bar, y) {
    bar.bg.setY(y);
    bar.slot.setY(y);
    bar.fill.setY(y);
    if (bar.sheen) bar.sheen.setY(y - bar.height / 4);
    bar.valueText.setY(y);
    if (bar.centerIcon) bar.centerIcon.setY(y);
    if (bar.maskShape) bar.maskShape.setPosition(bar.x, y);
  }

  enemyRankForProfile(profile) {
    return profile?.boss ? 2 : 1;
  }

  createTurnTimeline() {
    this.timelineLayer = this.add.container(0, 0).setDepth(30);
    const trackY = 505;
    const chrome = this.add.graphics();
    chrome.fillStyle(0x020914, 0.92);
    chrome.fillRoundedRect(184, 487, 752, 36, 12);
    chrome.lineStyle(1.5, 0x4abce9, 0.72);
    chrome.strokeRoundedRect(184, 487, 752, 36, 12);
    chrome.lineStyle(2, 0x8bdcff, 0.46);
    chrome.lineBetween(TIMELINE_START, trackY, TIMELINE_END, trackY);
    chrome.lineStyle(1, 0xa9c8d9, 0.38);
    [TIMELINE_START, 425, 540, 655, 770, TIMELINE_END].forEach((x) => chrome.lineBetween(x, trackY - 3, x, trackY + 3));
    const speedIcon = createUiIcon(this, "speed", 204, trackY, { size: 18, tint: 0x38caff, depth: 31 });

    const title = this.add.text(221, trackY, "VELOCIDAD", {
      fontFamily: '"Cinzel", Georgia, serif',
      fontSize: "10px",
      color: "#f2f7fb",
      fontStyle: "bold"
    }).setOrigin(0, 0.5);
    const chevrons = this.add.graphics();
    chevrons.lineStyle(2, 0x29c9ff, 0.62);
    [375, 475, 575, 675, 775, 875].forEach((x) => {
      [0, 7].forEach((offset) => {
        chevrons.beginPath();
        chevrons.moveTo(x + offset - 4, trackY - 4);
        chevrons.lineTo(x + offset, trackY);
        chevrons.lineTo(x + offset - 4, trackY + 4);
        chevrons.strokePath();
      });
    });

    this.playerTurnMarker = this.add.circle(TIMELINE_START, trackY, 17, 0x0c2b45, 1)
      .setStrokeStyle(3, 0x50d7ff, 1);
    this.enemyTurnMarker = this.add.circle(TIMELINE_START, trackY, 17, 0x45131b, 1)
      .setStrokeStyle(3, 0xff5668, 1);
    this.playerTurnLetter = this.add.text(TIMELINE_START, trackY, "TÚ", {
      fontFamily: '"Cinzel", Georgia, serif',
      fontSize: "9px",
      color: "#fff4df",
      fontStyle: "bold"
    }).setOrigin(0.5);
    this.enemyTurnLetter = this.add.text(TIMELINE_START, trackY, "R", {
      fontFamily: '"Cinzel", Georgia, serif',
      fontSize: "9px",
      color: "#ffd8dc",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.timelineLayer.add([
      chrome, speedIcon, title, chevrons,
      this.playerTurnMarker, this.enemyTurnMarker,
      this.playerTurnLetter, this.enemyTurnLetter
    ]);
  }

  createPauseButton() {
    const bg = this.add.circle(480, 24, 14, 0x020914, 0.72)
      .setStrokeStyle(1, 0x53cfff, 0.34)
      .setDepth(25)
      .setInteractive({ useHandCursor: true });
    const label = createUiIcon(this, "pause", 480, 24, { size: 13, tint: 0x9fdfff, depth: 26 });

    bg.on("pointerover", () => {
      bg.setFillStyle(0x2b9bd0, 0.34);
    });
    bg.on("pointerout", () => {
      bg.setFillStyle(0x020914, 0.72);
    });
    const openPause = () => {
      if (this.finished || this.scene.isPaused()) return;
      this.scene.launch("pause");
      this.scene.pause();
    };
    bg.on("pointerup", openPause);
    this.input.keyboard.on("keydown-ESC", openPause);
    this.pauseButton = { bg, label };
  }

  startTurnCharge() {
    if (this.finished) return;
    this.turnReady = false;
    this.busy = true;
    this.setButtonsEnabled(false);
    const enemyTarget = Phaser.Math.Clamp(TIMELINE_START + 330 + (this.combatantSpeed(this.enemy) - this.combatantSpeed(this.player)) * 6, TIMELINE_START + 250, TIMELINE_END - 80);
    this.tweens.add({ targets: [this.enemyTurnMarker, this.enemyTurnLetter], x: enemyTarget, duration: 950, ease: "Sine.out" });
    this.tweens.add({
      targets: [this.playerTurnMarker, this.playerTurnLetter], x: TIMELINE_END, duration: 1050, ease: "Sine.inOut",
      onComplete: () => {
        if (this.finished) return;
        this.turnReady = true;
        this.busy = false;
        this.setButtonsEnabled(true);
        this.tweens.add({ targets: [this.playerTurnMarker, this.playerTurnLetter], scale: 1.22, duration: 170, yoyo: true, repeat: 1 });
      }
    });
  }

  async resetTurnTimeline() {
    this.turnReady = false;
    this.setButtonsEnabled(false);
    this.tweens.add({ targets: [this.playerTurnMarker, this.playerTurnLetter, this.enemyTurnMarker, this.enemyTurnLetter], x: TIMELINE_START, duration: 330, ease: "Cubic.inOut" });
    await this.delay(360);
  }

  createFighters() {
    const fighterY = 372;
    this.hero = createPlayerFighter(this, 220, fighterY, this.playerAppearance());
    this.foe = createPlayerFighter(this, 740, fighterY, this.enemyAppearance(), true);
    this.styleFighterGrounding(this.hero);
    this.styleFighterGrounding(this.foe);
  }

  styleFighterGrounding(fighter) {
    if (this.battleBackgroundKey !== "bg-marsh" || !fighter?.shadow) return;
    fighter.shadow.setFillStyle(0x123e45, 0.22).setStrokeStyle(2, 0x75d9da, 0.38).setScale(1.14, 0.58);
  }

  createActionPanel() {
    this.buttons = [];
    const rail = this.add.graphics().setDepth(28);
    rail.lineStyle(3, 0x24c8ff, 0.82);
    rail.beginPath();
    drawCubicBezier(rail, { x: -8, y: 112 }, { x: 108, y: 166 }, { x: 108, y: 478 }, { x: -8, y: 532 });
    rail.strokePath();
    rail.lineStyle(1, 0x9cecff, 0.3);
    rail.beginPath();
    drawCubicBezier(rail, { x: -5, y: 122 }, { x: 92, y: 172 }, { x: 92, y: 472 }, { x: -5, y: 522 });
    rail.strokePath();

    const hideTooltip = (entry) => {
      if (entry.tooltipTimer) {
        entry.tooltipTimer.remove(false);
        entry.tooltipTimer = null;
      }
      entry.tooltip.layer.setVisible(false);
      entry.hoverRing.setVisible(false);
    };

    for (let index = 0; index < 6; index += 1) {
      const jutsu = this.actions[index] || null;
      const button = createActionButton(this, jutsu, index);
      if (!jutsu) continue;
      const { hit } = button;
      hit.on("pointerover", () => {
        this.buttons.forEach(hideTooltip);
        button.tooltip.layer.setVisible(true);
        button.hoverRing.setVisible(true);
        button.tooltipTimer = this.time.delayedCall(3200, () => {
          button.tooltip.layer.setVisible(false);
          button.hoverRing.setVisible(false);
          button.tooltipTimer = null;
        });
      });
      hit.on("pointerout", () => hideTooltip(button));
      hit.on("pointerdown", () => {
        if (button.available) this.useJutsu(jutsu);
      });
      this.buttons.push(button);
    }

    this.onActionShortcut = (event) => {
      const index = Number(event.key) - 1;
      if (index < 0 || index >= this.actions.length) return;
      const jutsu = this.actions[index];
      if (jutsu) this.useJutsu(jutsu);
    };
    this.input.keyboard.on("keydown", this.onActionShortcut);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard.off("keydown", this.onActionShortcut));
  }

  async useJutsu(jutsu) {
    if (this.busy || this.finished || !this.turnReady) return;
    if (this.cooldowns[jutsu.id] > 0) {
      this.setMessage(`${jutsu.name} sigue en enfriamiento.`, "#ff9d8d");
      return;
    }
    const cost = this.actionCost(jutsu);
    if (this.player.chakra < cost) {
      this.setMessage("No tienes suficiente chakra para esa técnica.", "#ff9d8d");
      this.shake(90, 0.003);
      return;
    }

    this.busy = true;
    this.turnReady = false;
    this.player.chakra -= cost;
    if (jutsu.cooldown) this.cooldowns[jutsu.id] = jutsu.cooldown + 1;
    this.refreshHud();
    this.setButtonsEnabled(false);
    const elementalTechnique = !["physical", "none"].includes(jutsu.element);
    this.setMessage(
      elementalTechnique
        ? `Preparando la técnica elemental ${jutsu.name}...`
        : jutsu.type === "guard"
          ? `Adoptando ${jutsu.name}...`
          : `Ejecutando ${jutsu.name}...`,
    );

    const casting = jutsu.seals.length ? await this.playSeals(jutsu) : { mistakes: 0, multiplier: 1 };
    const enemyAction = this.chooseEnemyAction();
    const enemyFirst = elementalTechnique;

    if (enemyFirst) {
      this.setMessage(`Preparando ${jutsu.name}: el rival puede actuar mientras completas la técnica elemental.`);
      this.tweens.add({ targets: [this.enemyTurnMarker, this.enemyTurnLetter], x: TIMELINE_END - 20, duration: 260, ease: "Cubic.out" });
      await this.playTechniquePreparationNotice(jutsu.name);
      await this.executeEnemyAction(enemyAction);
      if (this.player.hp <= 0) return this.finishBattle(false);
      if (this.enemy.hp <= 0 && await this.resolveEnemyOutcome()) return;
    }

    if (jutsu.type === "guard") await this.playerGuard();
    else await this.playerAttack(jutsu, casting);
    this.finishCombatantTurn(this.player);

    if (await this.resolveEnemyOutcome()) return;
    if (this.player.hp <= 0) return this.finishBattle(false);

    if (!enemyFirst) {
      await this.delay(420);
      this.tweens.add({ targets: [this.enemyTurnMarker, this.enemyTurnLetter], x: TIMELINE_END - 20, duration: 260, ease: "Cubic.out" });
      await this.executeEnemyAction(enemyAction);
      if (this.player.hp <= 0) return this.finishBattle(false);
    }

    await this.resolveEndRoundStatuses();
    if (await this.resolveEnemyOutcome()) return;
    if (this.player.hp <= 0) return this.finishBattle(false);

    this.clearGuard();
    this.advanceCooldowns();
    this.player.chakra = Math.min(this.player.maxChakra, this.player.chakra + 8);
    this.round += 1;
    this.refreshHud();

    await this.resetTurnTimeline();
    this.startTurnCharge();
  }

  async playTechniquePreparationNotice(techniqueName) {
    const layer = [];
    const add = (item) => { layer.push(item); return item; };
    add(this.add.rectangle(WIDTH / 2, 246, 460, 92, 0x020914, 0.9)
      .setStrokeStyle(2, 0xf0b85c, 0.9).setDepth(58).setAlpha(0).setScale(0.96));
    add(this.add.rectangle(WIDTH / 2 - 220, 246, 5, 92, 0xf0b85c, 1)
      .setDepth(59).setAlpha(0));
    add(this.add.text(WIDTH / 2, 226, "PREPARANDO TÉCNICA ELEMENTAL", this.textStyle(15, "#f0c77c", "800", true))
      .setOrigin(0.5).setDepth(60).setAlpha(0));
    add(this.add.text(WIDTH / 2, 254, techniqueName, this.textStyle(13, "#f5f0e8", "800"))
      .setOrigin(0.5).setDepth(60).setAlpha(0));
    add(this.add.text(WIDTH / 2, 278, "El rival puede actuar mientras completas la preparación.", this.textStyle(10, "#b9c8d4", "700"))
      .setOrigin(0.5).setDepth(60).setAlpha(0));
    await this.tween({ targets: layer, alpha: 1, scaleX: 1, scaleY: 1, duration: 180, ease: "Back.out" });
    await this.delay(620);
    await this.tween({ targets: layer, alpha: 0, y: "-=8", duration: 170, ease: "Sine.in" });
    layer.forEach((item) => item.destroy());
  }

  async resolveEnemyOutcome() {
    const profile = this.encounters[this.enemyIndex];
    if (this.enemy.hp <= 0) {
      this.recordEnemyObservation({ defeated: true });
      if (this.mission.type === "route-combat") {
        this.defeatedEncounters += 1;
        this.saveData = writeSave(resolveDoctorMissionCombat(this.saveData));
        activeSave = this.saveData;
        this.finished = true;
        this.busy = false;
        this.setMessage("El paso queda libre. La búsqueda de Haru continúa.", "#79e8b5");
        this.stopFighterFlash(this.foe);
        this.tweens.add({ targets: [...this.foe.targets, this.foe.shadow], alpha: 0, duration: 620 });
        await this.delay(700);
        this.scene.start("travel", { direction: "toDoctorRoute" });
        return true;
      }
      // Las recompensas se calculan para informar al jugador, pero no se
      // incorporan al guardado hasta completar toda la misión.
      const reward = awardEncounter(this.rewardPreviewSave, this.enemyIndex);
      this.rewardPreviewSave = reward.save;
      this.pendingEncounterRewards.push(this.enemyIndex);
      this.lastReward = reward;
      this.defeatedEncounters += 1;
      this.battleRewards = addBattleReward(this.battleRewards, reward);
      if (this.enemyIndex === this.encounters.length - 1) {
        if (this.combatFeatures.relicDecision) await this.playRelicDrop();
        if (this.combatFeatures.postCombatChoice) await this.playHideoutDiscoveryChoice();
        this.pendingEncounterRewards.forEach((encounterIndex) => {
          this.saveData = awardEncounter(this.saveData, encounterIndex).save;
        });
        const completion = completeMission(this.saveData, this.mission.id);
        this.saveData = writeSave(completion.save);
        activeSave = this.saveData;
        this.missionReward = completion;
        this.battleRewards = addBattleReward(this.battleRewards, completion);
        await this.finishBattle(true);
      } else {
        const investigationStep = missionStep(this.mission, "investigation");
        const choiceStep = missionStep(this.mission, "choice");
        const resourceStep = missionStep(this.mission, "resource");
        const interlude = investigationStep?.afterEncounter === this.enemyIndex
          ? () => this.playInvestigationPhase()
          : choiceStep?.afterEncounter === this.enemyIndex
            ? () => this.playPrisonerChoice()
            : resourceStep?.afterEncounter === "each"
              ? () => this.playResourceChoice()
              : null;
        await this.advanceEncounter(interlude);
      }
      return true;
    }

    if (profile.boss && this.enemy.phase === 1 && this.enemy.hp <= this.enemy.maxHp / 2) {
      await this.triggerBossPhaseTwo();
    }
    return false;
  }

  async advanceEncounter(interlude = null) {
    const defeatedName = this.encounters[this.enemyIndex].name;
    const levelNote = this.lastReward?.levelsGained ? ` · ¡Nivel +${this.lastReward.levelsGained}!` : "";
    this.setMessage(`${defeatedName} derrotado · +${this.lastReward.xp} PX · +${this.lastReward.affinityXp} PX de afinidad · +${this.lastReward.coins} monedas${levelNote}`, "#79e8b5");
    this.stopFighterFlash(this.foe);
    this.tweens.add({ targets: [...this.foe.targets, this.foe.shadow], alpha: 0, x: "+=70", duration: 480 });
    await this.delay(560);
    destroyFighter(this.foe);

    if (interlude) await interlude();

    this.enemyIndex += 1;
    const profile = this.encounters[this.enemyIndex];
    await this.playEncounterTransition(profile);
    this.enemy = this.createEnemyState(profile);
    this.recordEnemyObservation({ encounter: true });
    this.enemyName.setText(profile.name);
    this.enemyRankNumber.setText(String(this.enemyRankForProfile(profile)));
    this.foe = createPlayerFighter(this, 810, 372, this.enemyAppearance(), true);
    this.styleFighterGrounding(this.foe);
    this.foe.targets.forEach((target) => target.setAlpha(0));
    this.foe.shadow.setAlpha(0);
    this.tweens.add({ targets: this.foe.targets, x: "-=70", alpha: 1, duration: 520, ease: "Cubic.out" });
    this.tweens.add({ targets: this.foe.shadow, x: "-=70", alpha: 0.4, duration: 520, ease: "Cubic.out" });

    const recovery = this.nextRecovery || { hp: 35, chakra: 25, clearStatuses: true };
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + recovery.hp);
    this.player.chakra = Math.min(this.player.maxChakra, this.player.chakra + recovery.chakra);
    if (recovery.clearStatuses) this.player.statuses = [];
    this.nextRecovery = null;
    this.clearGuard();
    Object.keys(this.cooldowns).forEach((id) => { this.cooldowns[id] = 0; });
    this.round += 1;
    this.refreshHud();
    await this.delay(620);
    await this.resetTurnTimeline();
    const tutorialMessages = [
      "Observa la barra de velocidad: ambos marcadores parten a la izquierda y avanzan al iniciar el turno.",
      "Prueba Guardia para reducir el próximo impacto y recuperar chakra.",
      "Combina lo aprendido: lee el ritmo, administra chakra y usa una técnica elemental."
    ];
    this.setMessage(this.combatFeatures.tutorial ? tutorialMessages[this.enemyIndex] : `Encuentro ${this.enemyIndex + 1}/${this.encounters.length}: ${profile.name}.`);
    this.startTurnCharge();
  }

  async playBattleChoice(title, description, choices) {
    const layer = [];
    const add = (item) => { layer.push(item); return item; };
    add(this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x020914, 0.9).setOrigin(0).setDepth(80));
    add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, 690, 330, 0x031220, 0.98).setStrokeStyle(1.5, 0x55c9ff, 0.85).setDepth(81));
    add(this.add.rectangle(135, 105, 5, 330, 0x3fcaff, 1).setOrigin(0, 0).setDepth(82));
    add(this.add.text(WIDTH / 2, 135, title, this.textStyle(18, "#83d8ff", "800", true)).setOrigin(0.5).setDepth(83));
    add(this.add.text(WIDTH / 2, 185, description, { ...this.textStyle(14, "#e9f1f6", "700"), align: "center", wordWrap: { width: 570 }, lineSpacing: 5 }).setOrigin(0.5).setDepth(83));
    const spacing = 250;
    const startX = WIDTH / 2 - ((choices.length - 1) * spacing) / 2;
    const value = await new Promise((resolve) => choices.forEach((choice, index) => {
      const x = startX + index * spacing;
      const button = add(this.add.rectangle(x, 340, 220, 92, choice.primary ? 0x174d65 : 0x0b2638, 1).setStrokeStyle(1.5, choice.primary ? 0xf0b85c : 0x55c9ff, 0.9).setInteractive({ useHandCursor: true }).setDepth(83));
      add(this.add.text(x, 325, choice.label, this.textStyle(12, "#f4f0e8", "800", true)).setOrigin(0.5).setDepth(84));
      add(this.add.text(x, 354, choice.detail, { ...this.textStyle(10, "#adc0cc", "700"), align: "center", wordWrap: { width: 185 } }).setOrigin(0.5).setDepth(84));
      button.on("pointerover", () => button.setFillStyle(0x17638d, 1));
      button.on("pointerout", () => button.setFillStyle(choice.primary ? 0x174d65 : 0x0b2638, 1));
      button.once("pointerup", () => resolve(choice.value));
    }));
    await this.tween({ targets: layer, alpha: 0, duration: 180 });
    layer.forEach((item) => item.destroy());
    return value;
  }

  missionSceneText(sceneId, variables = {}) {
    return getMissionSceneDialogue(this.mission.id, sceneId, { save: this.saveData, variables })
      .map((line) => line.text)
      .join("\n\n");
  }

  async playMissionOneTutorial() {
    const masterName = masterIdForCharacter(this.saveData.character) === "mei" ? "Mei Hayate" : "Daichi Kazan";
    await this.playBattleChoice("TUTORIAL DE COMBATE", this.missionSceneText("combat-tutorial", { master: masterName }), [
      { value: "continue", label: "COMENZAR ENTRENAMIENTO", detail: "Primer objetivo: elige Golpe veloz o una técnica elemental.", primary: true }
    ]);
    this.setMessage("Elige una acción. Mantén el cursor sobre ella para consultar coste, daño y velocidad.", "#83d8ff");
  }

  async playResourceChoice() {
    const masterName = masterIdForCharacter(this.saveData.character) === "mei" ? "Mei Hayate" : "Daichi Kazan";
    const choices = [{ value: "conserve", label: "CONSERVAR", detail: "Recuperación menor; guardas los suministros." }];
    if (this.fieldSupplies > 0) choices.unshift({ value: "rest", label: "DESCANSAR", detail: `Recuperación amplia; consume 1 de ${this.fieldSupplies}.`, primary: true });
    const choice = await this.playBattleChoice("ADMINISTRACIÓN ENTRE DUELOS", this.missionSceneText("resource-choice", { master: masterName }), choices);
    if (choice === "rest") {
      this.fieldSupplies -= 1;
      this.nextRecovery = { hp: 70, chakra: 55, clearStatuses: true };
    } else this.nextRecovery = { hp: 10, chakra: 8, clearStatuses: false };
    this.saveData.campaign.hideoutSupplies = this.fieldSupplies;
    this.saveData = writeSave(this.saveData);
    activeSave = this.saveData;
  }

  async playHideoutDiscoveryChoice() {
    const choiceStep = missionStep(this.mission, "choice");
    const choice = await this.playBattleChoice("EL CORAZÓN DE LA GUARIDA", this.missionSceneText(choiceStep?.sceneId || choiceStep?.id), [
      { value: "prisoners", label: "LIBERAR PRISIONEROS", detail: "Rescatas a los cautivos y obtienes sus testimonios.", primary: true },
      { value: "documents", label: "RECUPERAR DOCUMENTOS", detail: "La Biblioteca obtiene datos parciales sobre Raizen." }
    ]);
    this.saveData.campaign.hideoutDiscoveryChoice = choice;
    this.saveData.campaign.prisonersRescued = choice === "prisoners";
    this.saveData.campaign.organizationDocumentsRecovered = choice === "documents";
    this.saveData.campaign.organizationRevealed = true;
    this.saveData = recordBestiaryObservation(this.saveData, "boss_raizen", { document: choice === "documents", vulnerability: "agua" });
    this.saveData = writeSave(this.saveData);
    activeSave = this.saveData;
    const revelation = this.missionSceneText(choice === "documents" ? "revelation-documents" : "revelation-prisoners");
    await this.playBattleChoice("UNA ORGANIZACIÓN MAYOR", revelation, [
      { value: "continue", label: "REGISTRAR HALLAZGO", detail: "La información se añade al informe de la saga y desbloquea el enfrentamiento con Raizen.", primary: true }
    ]);
  }

  async playLieutenantIntervention() {
    await this.playBattleChoice("UNA DEUDA PENDIENTE", this.missionSceneText("lieutenant-intervention"), [
      { value: "continue", label: "ENFRENTAR A RAIZEN", detail: "La decisión tomada en la cantera altera el combate final.", primary: true }
    ]);
    this.floatLabel(this.foe.body.x, this.foe.body.y - 150, "−15 % VIDA", 0xf0b85c);
    this.refreshHud();
  }

  async playSecretWarehouse() {
    await this.playBattleChoice("ALMACÉN DE LOS CUERVOS", this.missionSceneText("secret-warehouse"), [
      { value: "continue", label: "ASEGURAR EL ALMACÉN", detail: `Bonificación de misión: +${this.mission.secretBonusCoins} monedas.`, primary: true }
    ]);
  }

  async playInvestigationPhase() {
    const masterName = masterIdForCharacter(activeSave.character) === "mei" ? "Mei Hayate" : "Daichi Kazan";
    const masterFile = masterIdForCharacter(activeSave.character) === "mei" ? "mei-hayate.webp" : "daichi-kazan.webp";
    const regions = [
      { id: "cart", label: "CARRETA", labelX: 21, labelY: 67, clue: "Cuerdas con polvo de cantera", real: true, path: "M0 360 L115 335 L232 370 L360 407 L472 468 L575 512 L690 621 L654 706 L559 751 L420 748 L310 713 L205 678 L80 666 L0 620 Z" },
      { id: "house", label: "CASA INCENDIADA", labelX: 47, labelY: 38, clue: "Un mapa rasgado del desfiladero aparece entre las cenizas", real: true, path: "M420 273 L492 239 L554 154 L628 128 L784 133 L870 157 L927 194 L1041 220 L1083 268 L1035 302 L1024 438 L944 453 L849 439 L782 390 L721 349 L651 371 L610 329 L529 350 L469 320 Z" },
      { id: "tracks", label: "HUELLAS", labelX: 61, labelY: 80, clue: "Carga pesada rumbo al norte", real: true, path: "M965 941 L900 884 L951 824 L923 770 L965 716 L991 648 L1072 620 L1120 670 L1081 731 L1107 786 L1056 840 L1088 908 L1058 941 Z" },
      { id: "well", label: "POZO", labelX: 89, labelY: 64, clue: "El agua está limpia: nadie manipuló el pozo recientemente", real: false, path: "M1360 402 L1478 369 L1609 383 L1672 423 L1672 782 L1608 841 L1462 828 L1379 759 L1328 661 L1339 532 Z" },
      { id: "gate", label: "PUERTA DEL FINAL", labelX: 75, labelY: 42, clue: "Las marcas de la puerta son antiguas y no pertenecen a los bandidos", real: false, path: "M1123 303 L1191 278 L1316 284 L1372 323 L1379 456 L1326 500 L1214 489 L1138 451 Z" }
    ];
    const realClueCount = regions.filter((entry) => entry.real).length;
    const found = new Set();
    const examined = new Set();
    const overlay = document.createElement("section");
    overlay.className = "mission-investigation-overlay";
    overlay.setAttribute("aria-label", "Fase 2 de investigación");
    overlay.innerHTML = `<img class="mission-investigation-background" src="assets/locations/kagemori.webp?v=0.63.0" alt="Aldea de Kagemori incendiada"><div class="mission-investigation-shade"></div><header class="mission-investigation-header"><p>FASE 2 · INVESTIGACIÓN</p><h2>Reconstruye la ruta de los bandidos</h2><strong data-mission-clue-count>0/${realClueCount} pistas reales</strong></header><p class="mission-investigation-log" data-mission-investigation-log>Examina la casa, la carreta, las huellas, el pozo y la puerta.</p><svg class="mission-investigation-hotspots" viewBox="0 0 1672 941" preserveAspectRatio="none" aria-label="Áreas de investigación">${regions.map((entry) => `<g class="mission-investigation-region" data-investigation-region="${entry.id}" role="button" tabindex="0" aria-label="Investigar ${entry.label}"><path d="${entry.path}"/></g>`).join("")}</svg>${regions.map((entry) => `<span class="mission-investigation-label" data-investigation-label="${entry.id}" style="--label-x:${entry.labelX}%;--label-y:${entry.labelY}%"><strong>${entry.label}</strong></span>`).join("")}<img class="mission-investigation-master" src="assets/npcs/${masterFile}" alt="${masterName}"><button class="mission-investigation-continue" type="button" disabled data-mission-investigation-continue>REÚNE ${realClueCount} PISTAS</button>`;
    const canvas = gameRoot.querySelector("canvas");
    const previousCanvasVisibility = canvas?.style.visibility || "";
    gameRoot.append(overlay);
    if (canvas) canvas.style.visibility = "hidden";
    game?.loop.sleep();

    try {
      const clueText = overlay.querySelector("[data-mission-investigation-log]");
      const clueCount = overlay.querySelector("[data-mission-clue-count]");
      const continueButton = overlay.querySelector("[data-mission-investigation-continue]");
      regions.forEach((entry) => {
        const marker = overlay.querySelector(`[data-investigation-region="${entry.id}"]`);
        const label = overlay.querySelector(`[data-investigation-label="${entry.id}"]`);
        const showLabel = () => label?.classList.add("visible");
        const hideLabel = () => { if (!examined.has(entry.id)) label?.classList.remove("visible"); };
        const inspect = () => {
          if (examined.has(entry.id)) return;
          examined.add(entry.id);
          label?.classList.add("visible");
          marker?.classList.add(entry.real ? "found" : "discarded");
        if (!entry.real) {
            if (label) label.querySelector("strong").textContent = `${entry.label} · SIN PISTA`;
            clueText.textContent = `${entry.clue} · Sigue investigando.`;
          return;
        }
          found.add(entry.id);
          if (label) label.querySelector("strong").textContent = `✓ ${entry.label}`;
          clueCount.textContent = `${found.size}/${realClueCount} pistas reales`;
          clueText.textContent = `${entry.clue} · ${found.size}/${realClueCount} pistas reales`;
        if (found.size === realClueCount) {
            clueText.textContent = this.missionSceneText("investigation-complete", { master: masterName });
            continueButton.disabled = false;
            continueButton.textContent = "SEGUIR EL RASTRO";
        }
        };
        marker?.addEventListener("mouseenter", showLabel);
        marker?.addEventListener("mouseleave", hideLabel);
        marker?.addEventListener("focus", showLabel);
        marker?.addEventListener("blur", hideLabel);
        marker?.addEventListener("click", inspect);
        marker?.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          inspect();
        });
      });
      await new Promise((resolve) => continueButton.addEventListener("click", () => {
        if (found.size === realClueCount) resolve();
      }, { once: true }));
      overlay.classList.add("leaving");
      await new Promise((resolve) => window.setTimeout(resolve, 220));
    } finally {
      overlay.remove();
      if (canvas) canvas.style.visibility = previousCanvasVisibility;
      game?.loop.wake();
    }
  }

  async playPrisonerChoice() {
    const layer = [];
    const add = (item) => { layer.push(item); return item; };
    add(this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x020914, 0.88).setOrigin(0).setDepth(70));
    add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, 620, 330, 0x031220, 0.98).setStrokeStyle(1.5, 0x55c9ff, 0.85).setDepth(71));
    add(this.add.rectangle(168, 105, 4, 330, 0x3fcaff, 1).setOrigin(0, 0).setDepth(72));
    add(this.add.text(WIDTH / 2, 132, "DECISIÓN DE MISIÓN", this.textStyle(18, "#83d8ff", "800", true)).setOrigin(0.5).setDepth(73));
    add(this.add.text(WIDTH / 2, 180, this.missionSceneText("prisoner-choice"), { ...this.textStyle(16, "#f4f0e8", "700"), align: "center", lineSpacing: 8 }).setOrigin(0.5).setDepth(73));
    add(this.add.text(330, 250, "INTERROGAR Y PERDONAR\n+ Entrada secreta y monedas ×2\n− Escapa y refuerza a Akumori", { ...this.textStyle(12, "#caffea", "700"), align: "center", lineSpacing: 4 }).setOrigin(0.5).setDepth(73));
    add(this.add.text(630, 250, "ELIMINAR\n+ Akumori no recibe refuerzos\n− Sin entrada secreta ni aliado futuro", { ...this.textStyle(12, "#ffd0c8", "700"), align: "center", lineSpacing: 4 }).setOrigin(0.5).setDepth(73));
    const makeChoice = (x, label, color, value) => {
      const bg = add(this.add.rectangle(x, 350, 220, 44, 0x0d2638, 1).setStrokeStyle(1.5, color, 1).setInteractive({ useHandCursor: true }).setDepth(73));
      add(this.add.text(x, 350, label, this.textStyle(12, "#f4f8fb", "800", true)).setOrigin(0.5).setDepth(74));
      return { bg, value };
    };
    const choices = [makeChoice(330, "INTERROGAR", 0x79e8b5, "interrogate"), makeChoice(630, "ELIMINAR", 0xef6b72, "eliminate")];
    const choice = await new Promise((resolve) => choices.forEach(({ bg, value }) => bg.once("pointerup", () => resolve(value))));
    this.saveData.campaign.banditPrisonerChoice = choice;
    this.saveData.campaign.nextSideMissionGoldMultiplier = choice === "interrogate" ? 2 : 1;
    choices.forEach(({ bg }) => bg.disableInteractive());
    const response = add(this.add.text(WIDTH / 2, 414, this.missionSceneText(choice === "interrogate" ? "prisoner-interrogate" : "prisoner-eliminate"), this.textStyle(12, choice === "interrogate" ? "#f0ca80" : "#d9e6ef", "800")).setOrigin(0.5).setDepth(74));
    await this.delay(1100);
    await this.tween({ targets: layer, alpha: 0, duration: 260, ease: "Sine.in" });
    layer.forEach((item) => item.destroy());
    return response;
  }

  async playRelicDrop() {
    const shade = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x020914, 0.72).setOrigin(0).setDepth(70).setAlpha(0);
    const relic = this.add.circle(WIDTH / 2, 245, 42, 0x17111f, 1).setStrokeStyle(4, 0xf0b85c, 0.95).setDepth(72).setScale(0.2);
    const mark = this.add.text(WIDTH / 2, 245, "◆", this.textStyle(30, "#f0b85c", "800", true)).setOrigin(0.5).setDepth(73).setAlpha(0);
    const title = this.add.text(WIDTH / 2, 320, "OBJETO OBTENIDO", this.textStyle(12, "#83d8ff", "800", true)).setOrigin(0.5).setDepth(73).setAlpha(0);
    const name = this.add.text(WIDTH / 2, 350, String(this.mission.relic || "MAPA CIFRADO").toUpperCase(), this.textStyle(19, "#f4f0e8", "800", true)).setOrigin(0.5).setDepth(73).setAlpha(0);
    await this.tween({ targets: shade, alpha: 1, duration: 180 });
    await this.tween({ targets: relic, scale: 1, duration: 420, ease: "Back.out" });
    await this.tween({ targets: [mark, title, name], alpha: 1, duration: 280 });
    await this.delay(1100);
    await this.tween({ targets: [shade, relic, mark, title, name], alpha: 0, duration: 260 });
    [shade, relic, mark, title, name].forEach((item) => item.destroy());
  }

  async playEncounterTransition(profile) {
    const backdrop = this.add.image(WIDTH / 2, HEIGHT / 2, "travel-forest").setDisplaySize(WIDTH, HEIGHT).setDepth(70).setAlpha(0);
    const shade = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x06130d, 0.38).setOrigin(0).setDepth(71).setAlpha(0);
    const ground = this.add.rectangle(0, 421, WIDTH, 119, 0x06100b, 0.88).setOrigin(0).setDepth(72).setAlpha(0);
    const chapter = this.add.text(WIDTH / 2, 62, `RUMBO AL ENCUENTRO ${this.enemyIndex + 1} DE ${this.encounters.length}`, this.textStyle(18, "#f5edd8", "800", true)).setOrigin(0.5).setDepth(75).setAlpha(0);
    const title = this.add.text(WIDTH / 2, 94, profile.boss ? "El cabecilla bloquea el camino" : "Las huellas continúan", this.textStyle(13, "#bcd4c1", "700")).setOrigin(0.5).setDepth(75).setAlpha(0);
    const runner = createPlayerFighter(this, -90, 330, this.playerAppearance());
    runner.targets.forEach((target) => target.setDepth(74).setAlpha(0));
    runner.shadow.setDepth(73).setAlpha(0);
    startPlayerRunning(this, runner);
    await this.tween({ targets: [backdrop, shade, ground, chapter, title, ...runner.targets, runner.shadow], alpha: 1, duration: 240, ease: "Sine.out" });
    await Promise.all([
      this.tween({ targets: runner.body, x: WIDTH + 90, duration: 1900, ease: "Linear" }),
      this.tween({ targets: runner.shadow, x: WIDTH + 90, duration: 1900, ease: "Linear" })
    ]);
    stopPlayerRunning(runner);
    await this.tween({ targets: [backdrop, shade, ground, chapter, title], alpha: 0, duration: 240, ease: "Sine.in" });
    destroyFighter(runner);
    backdrop.destroy(); shade.destroy(); ground.destroy(); chapter.destroy(); title.destroy();
  }

  async triggerBossPhaseTwo() {
    const profile = this.encounters[this.enemyIndex];
    this.enemy.phase = 2;
    this.enemy.patternIndex = 0;
    this.enemy.baseSpeed += 3;
    this.enemy.speed = this.combatantSpeed(this.enemy);
    this.enemy.accuracy += 4;
    this.enemy.baseEvasion += 2;
    this.enemy.evasion = this.combatantEvasion(this.enemy);
    this.enemyName.setText(`${profile.name} · FASE II`);
    this.setMessage(bossPhaseMessage(this.mission), "#d6a5ff");
    this.bossAura = this.add.circle(this.foe.body.x, this.foe.body.y - 20, 82, 0x9a55df, 0.12)
      .setStrokeStyle(5, 0xb879ff, 0.72).setDepth(7);
    this.tweens.add({ targets: this.bossAura, scale: 1.1, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
    this.screenFlash(220, 130, 55, 180);
    this.tone(95, 0.35);
    this.refreshHud();
    await this.delay(900);
  }

  async playSeals(jutsu) {
    const manualCasting = this.manualSeals;
    const speedFactor = this.seenJutsus.has(jutsu.id) ? 0.55 : 1;
    this.sealPrompt = this.add.text(0, jutsu.cinematic ? 195 : 66, "", this.textStyle(12, "#eaf7ff", "800"))
      .setOrigin(0.5)
      .setPadding(14, 7)
      .setBackgroundColor("rgba(2, 8, 18, 0.9)");
    this.sealLayer.add(this.sealPrompt);
    let overlay;
    if (jutsu.cinematic) {
      overlay = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x020307, 0.92).setOrigin(0).setDepth(20).setAlpha(0);
      this.tweens.add({ targets: overlay, alpha: 1, duration: 180 });
      this.setSealPrompt(jutsu.name.toUpperCase());
      await this.delay(180 * speedFactor);
    }

    const spacing = jutsu.cinematic ? 122 : 96;
    const size = jutsu.cinematic ? 104 : 80;
    const shuffledSealIds = [...jutsu.seals];
    for (let i = shuffledSealIds.length - 1; i > 0; i -= 1) {
      const swapIndex = Phaser.Math.Between(0, i);
      [shuffledSealIds[i], shuffledSealIds[swapIndex]] = [shuffledSealIds[swapIndex], shuffledSealIds[i]];
    }
    const startX = -((shuffledSealIds.length - 1) * spacing) / 2;
    const cards = [];

    for (let i = 0; i < shuffledSealIds.length; i += 1) {
      const seal = SEALS[shuffledSealIds[i]];
      const x = startX + i * spacing;
      const card = this.add.container(x, jutsu.cinematic ? 120 : 0).setAlpha(0).setScale(0.45).setSize(size, size);
      const plate = this.add.rectangle(0, 0, size, size, 0x0b0e14, 0.94).setStrokeStyle(2, jutsu.color, 0.9);
      const imageWidth = size - 12;
      const image = this.add.image(0, -6, "sealSheet", seal.frame).setDisplaySize(imageWidth, imageWidth * (512 / 688));
      const label = this.add.text(0, size / 2 - 4, `${seal.key} · ${seal.label}`, this.textStyle(jutsu.cinematic ? 12 : 9, "#fff1d6", "800")).setOrigin(0.5, 1);
      card.add([plate, image, label]);
      this.sealLayer.add(card);
      this.tweens.add({ targets: card, alpha: 1, scale: 1, duration: 130, ease: "Back.out" });
      cards.push({ card, plate, seal });
      await this.delay((jutsu.cinematic ? 115 : 80) * speedFactor);
    }

    let mistakes = 0;
    for (let i = 0; i < cards.length; i += 1) {
      const current = cards[i];
      current.plate.setStrokeStyle(4, 0xffffff, 1);
      this.tweens.add({ targets: current.card, scale: 1.1, duration: 110, yoyo: true, repeat: -1, ease: "Sine.inOut" });

      if (manualCasting) {
        const inputWindow = jutsu.cinematic ? 1500 : 1200;
        this.setSealPrompt(`PULSA ${current.seal.key} · ${current.seal.label.toUpperCase()}  (${i + 1}/${cards.length})`);
        const result = await this.waitForSealInput(current.seal.key, current.card, jutsu.color, inputWindow);
        mistakes += result.mistakes;
        current.plate.setStrokeStyle(3, result.timedOut ? 0xff665f : result.mistakes === 0 ? 0x66efad : 0xffc46b, 1);
      } else {
        this.setSealPrompt(`EJECUTANDO ${current.seal.label.toUpperCase()}  (${i + 1}/${cards.length})`);
        await this.delay((jutsu.cinematic ? 230 : 175) * speedFactor);
        current.plate.setStrokeStyle(3, 0x68a8ff, 1);
      }

      this.tweens.killTweensOf(current.card);
      current.card.setScale(1);
      this.tone(270 + i * 72, 0.065);
    }

    const multiplier = manualCasting ? (mistakes === 0 ? 1.1 : mistakes <= 2 ? 1 : 0.85) : 1;
    const quality = !manualCasting
      ? "Secuencia automática completada."
      : mistakes === 0
        ? "Secuencia perfecta: +10 % de daño."
        : mistakes <= 2
          ? `Secuencia completada con ${mistakes} error${mistakes === 1 ? "" : "es"}.`
          : "Secuencia inestable: daño reducido.";
    const qualityColor = !manualCasting || mistakes <= 2 ? (manualCasting && mistakes === 0 ? "#79e8b5" : "#f7d6a5") : "#ff9d8d";
    this.setSealPrompt(quality, qualityColor);
    await this.delay(320);
    this.tone(580, 0.11);
    this.tweens.add({ targets: this.sealLayer, scale: 1.08, duration: 90, yoyo: true });
    await this.delay(150);
    this.sealLayer.removeAll(true);
    this.sealPrompt = null;
    this.sealLayer.setScale(1);
    if (overlay) {
      this.tweens.add({ targets: overlay, alpha: 0, duration: 140, onComplete: () => overlay.destroy() });
      await this.delay(120);
    }
    this.seenJutsus.add(jutsu.id);
    try { window.localStorage.setItem("seen-jutsus", JSON.stringify([...this.seenJutsus])); } catch (_) { /* La aceleración sigue activa durante la sesión. */ }
    return { mistakes, multiplier };
  }

  waitForSealInput(expectedKey, card, color, timeoutMs = 1200) {
    return new Promise((resolve) => {
      let mistakes = 0;
      let done = false;
      let timedOut = false;

      // La barra de tiempo queda fuera de la tarjeta para no tapar
      // la tecla ni el nombre del sello.
      const timerY = card.height / 2 + 9;
      const timerBg = this.add.rectangle(0, timerY, card.width - 12, 5, 0x202a38, 0.95).setOrigin(0.5);
      const timerFill = this.add.rectangle(-(card.width - 12) / 2, timerY, card.width - 12, 5, 0xf5c96b, 1).setOrigin(0, 0.5);
      card.add([timerBg, timerFill]);

      const timerTween = this.tweens.add({
        targets: timerFill,
        scaleX: 0,
        duration: timeoutMs,
        ease: "Linear"
      });

      const timeoutEvent = this.time.delayedCall(timeoutMs, () => {
        if (done) return;
        timedOut = true;
        mistakes += 1;
        this.tone(90, 0.1);
        this.shake(70, 0.003);
        this.setSealPrompt("TIEMPO AGOTADO", "#ff786d");
        finish();
      });

      const finish = () => {
        if (done) return;
        done = true;
        timeoutEvent.remove(false);
        timerTween.stop();
        this.input.keyboard.off("keydown", onKey);
        card.disableInteractive();
        resolve({ mistakes, timedOut });
      };

      const wrong = () => {
        mistakes += 1;
        this.tone(105, 0.06);
        this.shake(55, 0.002);
        this.tweens.add({ targets: card, x: card.x + 7, duration: 35, yoyo: true, repeat: 2 });
        this.setSealPrompt(`SELLO INCORRECTO · PULSA ${expectedKey}`, "#ff9d8d");
      };

      const onKey = (event) => {
        if (event.repeat) return;
        const pressed = event.code.startsWith("Key") ? event.code.slice(3) : event.key.toUpperCase();
        if (pressed === expectedKey) finish(); else if (/^[A-Z]$/.test(pressed)) wrong();
      };

      this.input.keyboard.on("keydown", onKey);
      card.setInteractive({ useHandCursor: true });
      card.once("pointerdown", finish);
      card.getAt(0).setStrokeStyle(4, color, 1);
    });
  }

  createSubstitutionSmoke(x, y, spread = 1) {
    const colors = [0xe2e7eb, 0xb9c2c9, 0x87939e];
    const puffs = Array.from({ length: 14 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 14;
      const innerRadius = 18 + (index % 4) * 7;
      const puff = this.add.circle(
        x + Math.cos(angle) * innerRadius * 0.45,
        y + Math.sin(angle) * innerRadius * 0.28,
        11 + (index % 5) * 3,
        colors[index % colors.length],
        0.76
      ).setDepth(19).setScale(0.18);
      const distance = (42 + (index % 4) * 12) * spread;
      this.tweens.add({
        targets: puff,
        x: puff.x + Math.cos(angle) * distance,
        y: puff.y + Math.sin(angle) * distance * 0.58 - 12,
        scale: 1.25 + (index % 3) * 0.22,
        alpha: 0,
        duration: 430 + (index % 4) * 45,
        ease: "Cubic.out",
        onComplete: () => puff.destroy()
      });
      return puff;
    });
    return puffs;
  }

  async playSubstitution(fighter) {
    if (!fighter?.body || !fighter?.shadow || !this.textures.exists("substitution-log")) return;
    const x = fighter.body.x;
    const groundY = fighter.shadow.y + 8;
    const bodyAlpha = fighter.body.alpha;
    const shadowAlpha = fighter.shadow.alpha;
    this.createSubstitutionSmoke(x, groundY - 48, 1.05);
    fighter.body.setAlpha(0);
    fighter.shadow.setAlpha(0);
    const log = this.add.image(x, groundY, "substitution-log")
      .setOrigin(0.5, 0.88)
      .setDisplaySize(178, 119)
      .setDepth(18)
      .setAngle(-4);
    const finalScaleX = log.scaleX;
    const finalScaleY = log.scaleY;
    log.setScale(finalScaleX * 0.04, finalScaleY * 0.04);
    this.tone(155, 0.11);
    this.floatLabel(x, groundY - 142, "SUSTITUCIÓN", 0xdde6ec);
    await this.tween({ targets: log, scaleX: finalScaleX, scaleY: finalScaleY, angle: 0, duration: 230, ease: "Back.out" });
    await this.delay(260);
    this.createSubstitutionSmoke(x, groundY - 45, 0.78);
    await this.tween({ targets: log, alpha: 0, scaleX: finalScaleX * 0.72, scaleY: finalScaleY * 0.72, y: groundY - 10, duration: 170, ease: "Cubic.in" });
    log.destroy();
    fighter.body.setAlpha(0);
    fighter.shadow.setAlpha(0);
    await Promise.all([
      this.tween({ targets: fighter.body, alpha: bodyAlpha, duration: 130, ease: "Sine.out" }),
      this.tween({ targets: fighter.shadow, alpha: shadowAlpha, duration: 130, ease: "Sine.out" })
    ]);
  }

  async playerAttack(jutsu, casting) {
    const cycleModifier = affinityCycleModifier(this.player.primaryAffinity, this.enemy.primaryAffinity);
    const furyBonus = this.player.primaryAffinity === "fuego" ? furyDamageBonus(this.player.hp, this.player.maxHp) : 0;
    const baseDamageInput = (jutsu.damage + this.player.baseStrength) * casting.multiplier;
    const chance = hitChance(this.player, { ...this.enemy, evasion: this.combatantEvasion(this.enemy) }, jutsu);
    const originX = this.hero.body.x;
    const originShadowX = this.hero.shadow.x;
    const usesPuppetPunch = jutsu.id === "strike" && this.hero.joints?.shoulderRight;
    const usesHandProjectile = jutsu.id === "fire_embers";
    const usesCastPose = usesHandProjectile && this.hero.animations?.supports("punch-release");
    if (usesPuppetPunch) {
      await preparePlayerPunch(this, this.hero);
      const strikeX = this.foe.body.x - 105;
      await Promise.all([
        this.tween({ targets: this.hero.body, x: strikeX, duration: 250, ease: "Cubic.out" }),
        this.tween({ targets: this.hero.shadow, x: strikeX, duration: 250, ease: "Cubic.out" })
      ]);
      await releasePlayerPunch(this, this.hero);
    } else if (usesHandProjectile) {
      if (usesCastPose) {
        await preparePlayerPunch(this, this.hero);
        await releasePlayerPunch(this, this.hero);
      } else await this.delay(125);
    } else {
      this.tweens.add({ targets: this.hero.targets, x: "+=62", duration: 120, yoyo: true, hold: 50, ease: "Quad.out" });
      await this.delay(125);
    }

    if (!this.rollHit(chance)) {
      if (usesHandProjectile) await this.playFireEmbersProjectile(true);
      this.tone(205, 0.08);
      this.setMessage(`El rival evitó ${jutsu.name} con una Sustitución.`, "#d7dce5");
      const substitution = this.playSubstitution(this.foe);
      if (usesPuppetPunch) {
        await Promise.all([
          substitution,
          recoverPlayerPunch(this, this.hero),
          this.tween({ targets: this.hero.body, x: originX, duration: 260, ease: "Cubic.inOut" }),
          this.tween({ targets: this.hero.shadow, x: originShadowX, duration: 260, ease: "Cubic.inOut" })
        ]);
      } else if (usesCastPose) await Promise.all([substitution, recoverPlayerPunch(this, this.hero)]);
      else await substitution;
      await this.delay(120);
      this.hero.body.x = originX;
      this.hero.shadow.x = originShadowX;
      return;
    }

    const critical = this.rollHit(this.player.criticalChance);
    const { damage } = resolveDamage({
      baseDamage: baseDamageInput,
      strengthModifier: this.player.strengthModifier,
      cycleModifier,
      furyBonus,
      critical,
      criticalMultiplier: AFFINITY_CONFIG.damage.criticalMultiplier,
      damageReduction: this.enemy.damageReduction || 0
    });
    if (usesHandProjectile) await this.playFireEmbersProjectile(false);
    else if (TECHNIQUE_VFX[jutsu.id]) await this.playTechniqueEffect(jutsu.id);
    else this.createImpact(this.foe.body.x, this.foe.body.y - 15, jutsu.color, jutsu.cinematic ? 1.6 : 1);
    this.tone(jutsu.cinematic ? 92 : 128, 0.12);
    this.shake(jutsu.cinematic ? 240 : 130, jutsu.cinematic ? 0.012 : 0.006);
    if (critical) this.floatLabel(this.foe.body.x, this.foe.body.y - 156, "CRÍTICO", 0xf5c96b);
    const { amount, reaction } = this.loseHealth(this.enemy, this.foe, damage);
    const appliedSoak = this.applyWaterPassive(this.player, this.enemy);
    if (appliedSoak) this.floatLabel(this.foe.body.x, this.foe.body.y - 178, `EMPAPADO ×${appliedSoak.stacks}`, 0x63cfff);
    if (jutsu.status && this.enemy.hp > 0) {
      applyStatus(this.enemy, jutsu.status);
      this.refreshHud();
    }
    const statusNote = jutsu.status && this.enemy.hp > 0 ? ` · ${jutsu.status.label}` : "";
    const elementNote = affinityLabel(1 + cycleModifier);
    if (cycleModifier > 0 && this.player.primaryAffinity) this.recordEnemyObservation({ vulnerability: this.player.primaryAffinity });
    this.setMessage(`${jutsu.name}: ${damage} de daño${critical ? " · CRÍTICO" : ""}${statusNote}${elementNote ? ` · ${elementNote}` : ""}.`);
    if (usesPuppetPunch) {
      await Promise.all([
        reaction,
        recoverPlayerPunch(this, this.hero),
        this.tween({ targets: this.hero.body, x: originX, duration: 260, ease: "Cubic.inOut" }),
        this.tween({ targets: this.hero.shadow, x: originShadowX, duration: 260, ease: "Cubic.inOut" })
      ]);
    } else if (usesCastPose) await Promise.all([reaction, recoverPlayerPunch(this, this.hero)]);
    else await reaction;
    await this.applyEarthReprisal(this.enemy, this.player, this.hero, amount);
    await this.delay(usesPuppetPunch || usesCastPose ? 150 : 430);
    this.hero.body.x = originX;
    this.hero.shadow.x = originShadowX;
  }

  playTechniqueEffect(jutsuId) {
    const effect = TECHNIQUE_VFX[jutsuId];
    const texture = `technique-vfx-${jutsuId}`;
    const animation = `${texture}-animation`;
    if (!effect || !this.textures.exists(texture) || !this.anims.exists(animation)) return Promise.resolve();
    const sprite = this.add.sprite(this.foe.body.x, this.foe.shadow.y + 8, texture, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(effect.width, effect.height)
      .setDepth(14);
    return new Promise((resolve) => {
      sprite.once("animationcomplete", () => {
        sprite.destroy();
        resolve();
      });
      sprite.play(animation);
    });
  }

  playerProjectileOrigin() {
    const wrist = this.hero.joints?.wristRight;
    if (wrist?.getWorldTransformMatrix) {
      const point = wrist.getWorldTransformMatrix().transformPoint(0, 0);
      const direction = this.hero.body.scaleX < 0 ? -1 : 1;
      return { x: point.x + 18 * direction, y: point.y };
    }
    return { x: this.hero.body.x + 62, y: this.hero.body.y - 12 };
  }

  async playFireEmbersProjectile(missed = false) {
    const effect = TECHNIQUE_VFX.fire_embers;
    const texture = "technique-vfx-fire_embers";
    const animation = `${texture}-animation`;
    if (!this.textures.exists(texture) || !this.anims.exists(animation)) return Promise.resolve();
    const origin = this.playerProjectileOrigin();
    const target = { x: this.foe.body.x + (missed ? 90 : -8), y: this.foe.body.y - 18 };
    const sprite = this.add.sprite(origin.x, origin.y, texture, 0)
      .setOrigin(0.58, 0.5)
      .setDisplaySize(effect.width, effect.height)
      .setDepth(14);
    const animationDone = new Promise((resolve) => sprite.once("animationcomplete", resolve));
    sprite.play(animation);
    await Promise.all([
      animationDone,
      this.tween({ targets: sprite, x: target.x, y: target.y, duration: 560, ease: "Cubic.in" })
    ]);
    if (!missed) this.createImpact(target.x, target.y, 0xff8a38, 0.8);
    await this.tween({
      targets: sprite,
      alpha: 0,
      scaleX: sprite.scaleX * 0.45,
      scaleY: sprite.scaleY * 0.45,
      duration: 160,
      ease: "Quad.in"
    });
    sprite.destroy();
  }

  async playerGuard() {
    this.player.guarding = true;
    startPlayerGuard(this, this.hero);
    this.player.chakra = Math.min(this.player.maxChakra, this.player.chakra + 12);
    this.guardAura = this.add.circle(this.hero.body.x, this.hero.body.y - 18, 72, 0xf5c96b, 0.12)
      .setStrokeStyle(5, 0xf5c96b, 0.8).setDepth(8);
    this.tweens.add({ targets: this.guardAura, scale: 1.08, alpha: 0.35, duration: 420, yoyo: true, repeat: -1 });
    this.tone(390, 0.1);
    this.refreshHud();
    this.setMessage("Guardia preparada: el próximo impacto se reduce 50 %.");
    await this.delay(420);
  }

  async executeEnemyAction(action) {
    const stun = this.enemy.statuses.find((status) => status.type === "stun");
    if (stun) {
      this.enemy.statuses = this.enemy.statuses.filter((status) => status !== stun);
      this.finishCombatantTurn(this.enemy);
      this.refreshHud();
      this.setMessage("El rival está aturdido y pierde su acción.", "#8fc7ff");
      this.tone(180, 0.16);
      await this.delay(620);
      return;
    }
    await this.enemyTurn(action);
  }

  async enemyTurn(action) {
    if (this.combatFeatures.announcedActionIds.includes(action.id)) {
      this.floatLabel(this.foe.body.x, this.foe.body.y - 165, `ANUNCIA: ${action.name.toUpperCase()}`, 0xf0b85c);
      this.setMessage(`Raizen anuncia ${action.name}. Memoriza el patrón para anticipar el siguiente ciclo.`, "#f0c77c");
      await this.delay(650);
    }
    this.recordEnemyObservation({ technique: action.id });
    const cycleModifier = affinityCycleModifier(this.enemy.primaryAffinity, this.player.primaryAffinity);
    const furyBonus = this.enemy.primaryAffinity === "fuego" ? furyDamageBonus(this.enemy.hp, this.enemy.maxHp) : 0;
    const baseDamageInput = Phaser.Math.Between(action.damage[0], action.damage[1]) + this.enemy.baseStrength;
    const critical = this.rollHit(this.enemy.criticalChance);
    const { damage } = resolveDamage({
      baseDamage: baseDamageInput,
      strengthModifier: this.enemy.strengthModifier,
      cycleModifier,
      furyBonus,
      critical,
      criticalMultiplier: AFFINITY_CONFIG.damage.criticalMultiplier,
      damageReduction: this.player.damageReduction,
      guarding: this.player.guarding
    });
    const chance = hitChance(this.enemy, { ...this.player, evasion: this.combatantEvasion(this.player) }, action);
    const originX = this.foe.body.x;
    const originShadowX = this.foe.shadow.x;
    const usesPuppetPunch = Boolean(this.foe.joints?.shoulderRight);
    this.setMessage(`El rival usa ${action.name}${this.player.guarding ? " contra tu guardia" : ""}...`);
    if (usesPuppetPunch) {
      await preparePlayerPunch(this, this.foe);
      const strikeX = this.hero.body.x + 105;
      await Promise.all([
        this.tween({ targets: this.foe.body, x: strikeX, duration: 250, ease: "Cubic.out" }),
        this.tween({ targets: this.foe.shadow, x: strikeX, duration: 250, ease: "Cubic.out" })
      ]);
      await releasePlayerPunch(this, this.foe);
    } else {
      this.tweens.add({ targets: this.foe.targets, x: "-=55", duration: 150, yoyo: true, hold: 40, ease: "Quad.out" });
      await this.delay(170);
    }

    if (!this.rollHit(chance)) {
      this.tone(205, 0.08);
      this.setMessage(`Evitaste ${action.name} con una Sustitución.`, "#79e8b5");
      const substitution = this.playSubstitution(this.hero);
      if (usesPuppetPunch) {
        await Promise.all([
          substitution,
          recoverPlayerPunch(this, this.foe),
          this.tween({ targets: this.foe.body, x: originX, duration: 260, ease: "Cubic.inOut" }),
          this.tween({ targets: this.foe.shadow, x: originShadowX, duration: 260, ease: "Cubic.inOut" })
        ]);
      } else await substitution;
      await this.delay(120);
      this.foe.body.x = originX;
      this.foe.shadow.x = originShadowX;
      this.finishCombatantTurn(this.enemy);
      return;
    }

    this.createImpact(this.hero.body.x, this.hero.body.y - 10, action.color, 0.8);
    this.tone(110, 0.1);
    this.shake(120, 0.005);
    if (critical) this.floatLabel(this.hero.body.x, this.hero.body.y - 156, "CRÍTICO", 0xf5c96b);
    const { amount, reaction } = this.loseHealth(this.player, this.hero, damage, { guarded: this.player.guarding });
    const appliedSoak = this.applyWaterPassive(this.enemy, this.player);
    if (appliedSoak) this.floatLabel(this.hero.body.x, this.hero.body.y - 178, `EMPAPADO ×${appliedSoak.stacks}`, 0x63cfff);
    if (action.status && !this.player.guarding && this.player.hp > 0) {
      applyStatus(this.player, action.status);
      this.refreshHud();
    }
    await reaction;
    await this.applyEarthReprisal(this.player, this.enemy, this.foe, amount);
    if (usesPuppetPunch) {
      await Promise.all([
        recoverPlayerPunch(this, this.foe),
        this.tween({ targets: this.foe.body, x: originX, duration: 260, ease: "Cubic.inOut" }),
        this.tween({ targets: this.foe.shadow, x: originShadowX, duration: 260, ease: "Cubic.inOut" })
      ]);
      this.foe.body.x = originX;
      this.foe.shadow.x = originShadowX;
    }
    this.finishCombatantTurn(this.enemy);
    await this.delay(220);
  }

  rollHit(chance) {
    return Math.random() * 100 < chance;
  }

  async resolveEndRoundStatuses() {
    const targets = [
      { data: this.player, fighter: this.hero },
      { data: this.enemy, fighter: this.foe }
    ];
    let triggered = false;

    for (const target of targets) {
      const tick = resolveStatusTick(target.data.statuses);
      for (const status of tick.damage) {
        triggered = true;
        const { amount, reaction } = this.loseHealth(target.data, target.fighter, status.power, { yOffset: -118 });
        this.setMessage(`${status.label}: ${amount} de daño.`);
        await Promise.all([
          reaction,
          this.delay(330)
        ]);
      }
      target.data.statuses = tick.statuses;
    }

    if (triggered) {
      this.refreshHud();
      await this.delay(220);
    }
  }

  advanceCooldowns() {
    this.cooldowns = advanceCooldowns(this.cooldowns);
  }

  clearGuard() {
    this.player.guarding = false;
    stopPlayerGuard(this, this.hero);
    if (this.guardAura) {
      this.tweens.killTweensOf(this.guardAura);
      this.guardAura.destroy();
      this.guardAura = null;
    }
  }

  createImpact(x, y, color, scale) {
    const ring = this.add.circle(x, y, 12, color, 0.26).setStrokeStyle(7, color, 1).setDepth(15);
    const slash = this.add.rectangle(x, y, 145 * scale, 10, 0xffffff, 0.94).setAngle(-32).setDepth(16);
    this.tweens.add({ targets: ring, radius: 72 * scale, alpha: 0, duration: 260, onComplete: () => ring.destroy() });
    this.tweens.add({ targets: slash, scaleX: 0.2, alpha: 0, duration: 220, onComplete: () => slash.destroy() });
  }

  flashFighter(fighter) {
    this.stopFighterFlash(fighter);
    fighter.targets.forEach((target) => target.setAlpha(1));
    if (!this.flashEffects || this.lightMode) return;
    fighter.flashTween = this.tweens.add({
      targets: fighter.targets,
      alpha: 0.25,
      duration: 65,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        fighter.targets.forEach((target) => target.setAlpha(1));
        fighter.flashTween = null;
      }
    });
  }

  stopFighterFlash(fighter) {
    if (fighter.flashTween) {
      fighter.flashTween.stop();
      fighter.flashTween = null;
    }
    fighter.targets.forEach((target) => target.setAlpha(1));
  }

  loseHealth(target, fighter, requestedAmount, { guarded = false, react = true, yOffset = -120 } = {}) {
    const previousHp = target.hp;
    const normalizedAmount = Number.isFinite(Number(requestedAmount)) ? Math.max(0, Math.round(Number(requestedAmount))) : 0;
    target.hp = Math.max(0, previousHp - normalizedAmount);
    const amount = previousHp - target.hp;
    if (amount <= 0) return { amount: 0, reaction: Promise.resolve(false) };

    this.floatHealthLoss(fighter.body.x, fighter.body.y + yOffset, amount);
    this.flashFighter(fighter);
    this.healthLossPulse(fighter);
    this.refreshHud();
    const reaction = react
      ? playFighterDamageReaction(this, fighter, {
          guarded,
          heavy: amount >= Math.max(10, Math.ceil(target.maxHp * 0.16))
        })
      : Promise.resolve(false);
    return { amount, reaction };
  }

  floatHealthLoss(x, y, amount) {
    const icon = createUiIcon(this, "healthLoss", x - 19, y, { size: 20, tint: 0xff4057, depth: 41 });
    const label = this.add.text(x + 7, y, `-${amount}`, this.textStyle(30, "#ff4057", "800"))
      .setOrigin(0.5).setDepth(41).setStroke("#35040b", 4);
    this.tweens.add({
      targets: [icon, label],
      y: y - 46,
      alpha: 0,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 820,
      ease: "Cubic.out",
      onComplete: () => { icon.destroy(); label.destroy(); }
    });
  }

  healthLossPulse(fighter) {
    const pulse = this.add.circle(fighter.body.x, fighter.body.y - 18, 34, 0xff4057, 0.08)
      .setStrokeStyle(4, 0xff4057, 0.72).setDepth(14);
    this.tweens.add({
      targets: pulse,
      scale: 1.9,
      alpha: 0,
      duration: 320,
      ease: "Quad.out",
      onComplete: () => pulse.destroy()
    });
  }

  floatLabel(x, y, text, color) {
    const label = this.add.text(x, y, text, this.textStyle(21, `#${color.toString(16).padStart(6, "0")}`, "800")).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: label, y: y - 32, alpha: 0, duration: 720, ease: "Cubic.out", onComplete: () => label.destroy() });
  }

  async finishBattle(won) {
    const routeFailureStats = !won && this.mission.type === "route-combat" ? { ...this.saveData.campaign.doctorRoute } : null;
    if (!won) {
      this.missionStartSave.bestiary = this.saveData.bestiary;
      this.saveData = this.mission.type === "route-combat"
        ? cancelDoctorMission(this.missionStartSave)
        : this.missionStartSave;
      this.saveData = writeSave(this.saveData);
      activeSave = this.saveData;
    }
    this.finished = true;
    this.busy = false;
    const rewardText = won && this.missionReward?.firstClear ? ` +${this.missionReward.xp} PX, +${this.missionReward.affinityXp} PX de afinidad y +${this.missionReward.coins} monedas de misión.` : "";
    const rankText = won && this.mission.exam && this.missionReward?.firstClear ? " ¡Ascenso a Guardián!" : "";
    this.setMessage(won ? `¡Misión completada!${rewardText}${rankText}` : "Misión fallida. No se entregan recompensas.", won ? "#79e8b5" : "#ff8e80");
    const target = won ? this.foe : this.hero;
    this.stopFighterFlash(target);
    this.tweens.killTweensOf([...target.targets, target.shadow]);
    this.tweens.add({
      targets: [...target.targets, target.shadow],
      alpha: 0,
      duration: 900,
      ease: "Sine.inOut"
    });
    await this.delay(950);
    const result = this.resultPayload(won ? "completed" : "failed");
    if (routeFailureStats) {
      this.scene.start("secondary-results", { ...result, routeStats: routeFailureStats });
      return;
    }
    if (won && this.combatFeatures.tutorial && !activeSave.campaign.sayoEncounterSeen) {
      this.scene.start("epilogue", { result });
      return;
    }
    this.scene.start("results", result);
  }
  resultPayload(outcome) {
    return createBattleResult({
      outcome,
      mission: this.mission,
      player: this.player,
      defeatedEncounters: this.defeatedEncounters,
      encounterCount: this.encounters.length,
      battleRewards: this.battleRewards,
      combatFeatures: this.combatFeatures,
      campaign: this.saveData.campaign
    });
  }
  abandonPayload() {
    const routeStats = this.mission.type === "route-combat" ? { ...this.saveData.campaign.doctorRoute } : null;
    this.missionStartSave.bestiary = this.saveData.bestiary;
    this.saveData = writeSave(this.missionStartSave);
    if (this.mission.type === "route-combat") this.saveData = writeSave(cancelDoctorMission(this.saveData));
    activeSave = this.saveData;
    this.battleRewards = emptyBattleRewards();
    const result = this.resultPayload("abandoned");
    return routeStats ? { ...result, routeStats } : result;
  }

  setButtonsEnabled(enabled) {
    this.buttons.forEach((button) => {
      const { jutsu } = button;
      const affordable = this.player.chakra >= this.actionCost(jutsu);
      const cooldown = this.cooldowns[jutsu.id] || 0;
      const available = enabled && this.turnReady && affordable && cooldown === 0;
      button.available = available;
      const visualAlpha = available ? 1 : affordable && cooldown === 0 ? 0.76 : 0.42;
      button.visualParts.forEach((part) => part.setAlpha(visualAlpha));

      const [baseCost, damage, timing] = actionLines(jutsu);
      const cost = this.actionCost(jutsu) > 0 ? `${this.actionCost(jutsu)} chakra` : baseCost;
      const liveTiming = cooldown > 0 ? `Recarga: ${cooldown}` : timing;
      const liveStats = jutsu.type === "guard"
        ? [baseCost, damage, timing]
        : [cost, damage, liveTiming];
      button.tooltip.statText.setText(liveStats.join("\n"));
    });
  }

  refreshHud() {
    this.updateHealthBar(this.playerHpBar, this.player.hp, this.player.maxHp);
    this.setBarRatio(this.chakraBar, this.player.chakra / this.player.maxChakra);
    this.updateHealthBar(this.enemyHpBar, this.enemy.hp, this.enemy.maxHp);

    this.playerHpBar.valueText.setText(`${this.player.hp}/${this.player.maxHp}`);
    this.chakraBar.valueText.setText(`${this.player.chakra}/${this.player.maxChakra}`);
    this.enemyHpBar.valueText.setText(`${this.enemy.hp}/${this.enemy.maxHp}`);

    if (this.buttons) this.setButtonsEnabled(!this.busy && !this.finished && this.turnReady);
  }

  updateHealthBar(bar, hp, maxHp) {
    const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    const color = ratio > 0.5 ? 0x38df87 : ratio > 0.25 ? 0xf1c84b : 0xef4755;
    this.setBarRatio(bar, ratio);
    bar.fill.setFillStyle(color, 1);
  }

  setBarRatio(bar, ratio) {
    const fillWidth = bar.width * Phaser.Math.Clamp(ratio, 0, 1);
    const fillX = bar.direction === "rtl" ? bar.x + bar.width - fillWidth : bar.x;
    bar.fill.width = fillWidth;
    bar.fill.setX(fillX);
    if (bar.sheen) {
      bar.sheen.width = fillWidth;
      bar.sheen.setX(fillX);
    }
  }

  setMessage(text, color = "#edf7fd") {
    this.lastBattleMessage = { text, color };
  }

  setSealPrompt(text, color = "#eaf7ff") {
    if (!this.sealPrompt) return;
    this.sealPrompt.setText(text);
    this.sealPrompt.setColor(color);
  }

  actionCost(action) {
    return Math.max(0, action.cost - this.player.costReduction);
  }

  playerAppearance() {
    return playerFighterAppearance(this.saveData);
  }

  enemyAppearance() {
    const enemyId = this.encounterIds[this.enemyIndex];
    return enemyFighterAppearance(this.encounters[this.enemyIndex], enemyId);
  }

  shake(duration, intensity) {
    if (this.cameraEffects && !this.lightMode) this.cameras.main.shake(duration, intensity);
  }

  screenFlash(duration, red, green, blue) {
    if (this.flashEffects && !this.lightMode) this.cameras.main.flash(duration, red, green, blue);
  }

  textStyle(size, color, weight = "500", display = false) {
    return {
      fontFamily: display ? '"Cinzel", Georgia, serif' : '"Alegreya Sans", "Segoe UI", sans-serif',
      fontSize: `${size}px`,
      color,
      fontStyle: weight === "700" || weight === "800" ? "bold" : "normal",
      resolution: textTextureResolution
    };
  }

  sharpenSceneText() {
    sharpenTextTree(this.children.list);
  }

  tween(config) { return new Promise((resolve) => this.tweens.add({ ...config, onComplete: resolve })); }

  delay(ms) { return new Promise((resolve) => this.time.delayedCall(ms, resolve)); }

  startMusic() {
    const notes = [110, 146, 123, 164, 110, 196];
    let step = 0;
    this.musicEvent = this.time.addEvent({
      delay: 920,
      loop: true,
      callback: () => {
        if (this.musicEnabled && !this.finished) this.tone(notes[step++ % notes.length], 0.42, 0.011);
      }
    });
  }

  tone(frequency, duration, gainAmount = 0.045) {
    if (this.volume <= 0) return;
    try {
      this.audioContext = this.audioContext || new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(gainAmount * this.volume, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
      oscillator.connect(gain).connect(this.audioContext.destination);
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (_) { /* El audio es decorativo; el juego funciona sin él. */ }
  }
}

class MissionEpilogueScene extends Phaser.Scene {
  constructor() { super("epilogue"); }

  preload() {
    const arenaIndex = ((activeMission?.number || 1) - 1) % BATTLE_ARENAS.length;
    const arena = BATTLE_ARENAS[arenaIndex];
    this.epilogueBackground = arena.texture;
    if (!this.textures.exists(arena.texture)) this.load.image(arena.texture, arena.file);
    if (!this.textures.exists("sayo-kisaragi")) this.load.image("sayo-kisaragi", "assets/npcs/sayo-kisaragi.webp?v=0.21.0");
  }

  create(data = {}) {
    this.cameras.main.setZoom(renderResolution).centerOn(WIDTH / 2, HEIGHT / 2);
    const lines = [
      "Seguí el rastro de estos bandidos. No era un grupo aislado: llevan semanas saqueando las aldeas vecinas.",
      "Perdí su rastro en la Aldea de Kagemori. Cuando regreses, dejaré una misión de investigación en el Tablón."
    ];
    let lineIndex = 0;

    this.add.image(WIDTH / 2, HEIGHT / 2, this.epilogueBackground).setDisplaySize(WIDTH, HEIGHT);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x020914, 0.16).setOrigin(0);
    const sayo = this.add.image(-120, 548, "sayo-kisaragi").setOrigin(0.5, 1).setDisplaySize(420, 505).setDepth(3);
    this.tweens.add({ targets: sayo, x: 214, duration: 720, ease: "Cubic.out" });
    this.add.text(214, 510, "Sayo Kisaragi", {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "12px", color: "#eaf7ff", fontStyle: "bold"
    }).setOrigin(0.5).setPadding(14, 5).setBackgroundColor("#031220").setStroke("#5ecfff", 1).setDepth(6);

    this.add.rectangle(690, 161, 500, 214, 0x031220, 0.95).setStrokeStyle(1.5, 0x55c9ff, 0.8).setDepth(4);
    this.add.rectangle(438, 54, 4, 214, 0x3fcaff, 1).setOrigin(0, 0).setDepth(5);
    this.add.text(462, 76, "SAYO KISARAGI · ARCHIVERA MAYOR", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "11px", color: "#83d8ff", fontStyle: "bold", letterSpacing: 1
    }).setDepth(6);
    this.add.rectangle(462, 101, 455, 1, 0x84c4e0, 0.3).setOrigin(0, 0).setDepth(6);
    const dialogue = this.add.text(462, 120, lines[0], {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "16px", color: "#f4f0e8", fontStyle: "bold", wordWrap: { width: 430 }, lineSpacing: 6
    }).setDepth(6);
    const counter = this.add.text(462, 240, "1/2", {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "12px", color: "#aac1d2", fontStyle: "bold"
    }).setDepth(6);
    const button = this.add.rectangle(846, 238, 122, 38, 0x0d4668, 1).setStrokeStyle(1, 0x55c9ff, 1).setInteractive({ useHandCursor: true }).setDepth(6);
    const buttonLabel = this.add.text(846, 238, "SIGUIENTE", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "11px", color: "#f4f8fb", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(7);
    button.on("pointerover", () => button.setFillStyle(0x17638d, 1));
    button.on("pointerout", () => button.setFillStyle(0x0d4668, 1));
    button.on("pointerup", () => {
      if (lineIndex === 0) {
        lineIndex = 1;
        dialogue.setText(lines[1]);
        counter.setText("2/2");
        buttonLabel.setText("REGRESAR");
        return;
      }
      button.disableInteractive();
      activeSave.campaign.sayoEncounterSeen = true;
      activeSave.campaign.secondaryBoardUnlocked = true;
      activeSave = writeSave(activeSave);
      this.scene.start("results", data.result || {});
    });
    this.cameras.main.fadeIn(300, 3, 9, 18);
    sharpenTextTree(this.children.list);
  }
}

class SecondaryResultsScene extends Phaser.Scene {
  constructor() { super("secondary-results"); }

  textStyle(size, color, weight = "500", display = false) {
    return {
      fontFamily: display ? '"Cinzel", Georgia, serif' : '"Alegreya Sans", "Segoe UI", sans-serif',
      fontSize: `${size}px`, color,
      fontStyle: weight === "700" || weight === "800" ? "bold" : "normal",
      resolution: textTextureResolution
    };
  }

  preload() {
    if (!this.textures.exists("kagemori-investigation")) this.load.image("kagemori-investigation", "assets/locations/kagemori.webp?v=0.59.0");
    if (!this.textures.exists("travel-forest")) this.load.image("travel-forest", BATTLE_ARENAS[0].file);
  }

  create(data = {}) {
    if (pendingSecondaryResults && Object.keys(data).length === 0) {
      data = pendingSecondaryResults;
      pendingSecondaryResults = null;
    }
    this.cameras.main.setZoom(renderResolution).centerOn(WIDTH / 2, HEIGHT / 2);
    if (activeMission?.type === "route-search" || data.missionType === "route-search") {
      this.createDoctorResults(data);
      return;
    }
    const completed = data.outcome === "completed";
    this.add.image(WIDTH / 2, HEIGHT / 2, "kagemori-investigation").setDisplaySize(WIDTH, HEIGHT);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x020914, 0.7).setOrigin(0);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, 760, 430, 0x031220, 0.96).setStrokeStyle(1.5, 0x55c9ff, 0.82);
    this.add.rectangle(100, 55, 5, 430, 0x3fcaff, 1).setOrigin(0, 0);
    this.add.text(140, 88, completed ? "INFORME DE INVESTIGACIÓN" : "INVESTIGACIÓN SUSPENDIDA", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "24px", color: completed ? "#83d8ff" : "#ef9a91", fontStyle: "bold"
    });
    this.add.text(140, 126, "EL SILENCIO DE KAGEMORI", this.textStyle(12, "#f0b85c", "800", true));
    this.add.text(140, 158, completed ? "Las pistas forman una ruta verificable hacia el Desfiladero del Cuervo." : "Regresas sin cerrar la ruta. El encargo seguirá disponible en el Tablón.", this.textStyle(14, "#d6e3eb", "700")).setWordWrapWidth(680);

    const clues = ["CARRETA SAQUEADA", "POLVO DE CANTERA", "HUELLAS AL NORTE"];
    clues.forEach((label, index) => {
      const x = 240 + index * 240;
      const found = index < (data.clues || 0);
      const card = this.add.rectangle(x, 275, 190, 118, 0x0b1b2a, 1).setStrokeStyle(1, found ? 0x79e8b5 : 0x52677a, 0.95).setScale(0.84).setAlpha(0);
      this.add.text(x, 250, found ? "✓" : "—", this.textStyle(27, found ? "#79e8b5" : "#718596", "800", true)).setOrigin(0.5).setAlpha(0).setName(`secondary-mark-${index}`);
      this.add.text(x, 300, label, { ...this.textStyle(10, found ? "#e6fff5" : "#91a2af", "800", true), align: "center", wordWrap: { width: 160 } }).setOrigin(0.5).setAlpha(0).setName(`secondary-label-${index}`);
      this.tweens.add({ targets: [card, this.children.getByName(`secondary-mark-${index}`), this.children.getByName(`secondary-label-${index}`)], alpha: 1, scale: 1, duration: 360, delay: 180 + index * 150, ease: "Back.out" });
    });

    this.add.text(WIDTH / 2, 374, completed ? "NUEVA MISIÓN PRINCIPAL DESBLOQUEADA" : "SIN RECOMPENSAS", this.textStyle(13, completed ? "#f0b85c" : "#9aaab6", "800", true)).setOrigin(0.5);
    const button = this.add.rectangle(WIDTH / 2, 440, 240, 44, 0x0d4668, 1).setStrokeStyle(1.5, 0x55c9ff, 1).setInteractive({ useHandCursor: true });
    this.add.text(WIDTH / 2, 440, "← REGRESAR A LA ALDEA", this.textStyle(12, "#f4f8fb", "800", true)).setOrigin(0.5);
    button.on("pointerover", () => button.setFillStyle(0x17638d, 1));
    button.on("pointerout", () => button.setFillStyle(0x0d4668, 1));
    button.once("pointerup", () => this.scene.start("travel", { direction: "toVillage" }));
    this.cameras.main.fadeIn(320, 3, 9, 18);
    sharpenTextTree(this.children.list);
  }

  createDoctorResults(data) {
    const completed = data.outcome === "completed";
    const stats = data.routeStats || {};
    this.add.image(WIDTH / 2, HEIGHT / 2, "travel-forest").setDisplaySize(WIDTH, HEIGHT);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x020914, 0.6).setOrigin(0);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, 790, 438, 0x031220, 0.96).setStrokeStyle(1.5, 0x55c9ff, 0.82);
    this.add.rectangle(85, 51, 5, 438, completed ? 0xf0b85c : 0x8ea3b2, 1).setOrigin(0, 0);
    this.add.text(125, 80, completed ? "BÚSQUEDA COMPLETADA" : "BÚSQUEDA SUSPENDIDA", this.textStyle(24, completed ? "#f0b85c" : "#9eb1bf", "800", true));
    this.add.text(125, 117, "EL MÉDICO ERRANTE", this.textStyle(12, "#83d8ff", "800", true));
    this.add.text(125, 148, completed ? "Haru descifró el mapa y confió su libro a la Biblioteca." : "El rastro permanece abierto. No se entregan recompensas.", this.textStyle(14, "#d6e3eb", "700"));
    const cards = [
      ["PELIGRO", stats.danger || 0], ["TIEMPO", stats.time || 0], ["PISTAS", stats.clues || 0], ["RECURSOS", stats.resources || 0]
    ];
    cards.forEach(([label, value], index) => {
      const x = 190 + index * 190;
      const card = this.add.rectangle(x, 255, 160, 108, 0x0b1b2a, 1).setStrokeStyle(1, 0x55c9ff, 0.55).setScale(0.85).setAlpha(0);
      const valueText = this.add.text(x, 238, String(value), this.textStyle(29, "#f4f0e8", "800", true)).setOrigin(0.5).setAlpha(0);
      const labelText = this.add.text(x, 280, label, this.textStyle(10, "#83d8ff", "800", true)).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: [card, valueText, labelText], alpha: 1, scale: 1, duration: 340, delay: 150 + index * 100, ease: "Back.out" });
    });
    const rewards = data.rewards || { xp: 0, affinityXp: 0, coins: 0 };
    this.add.text(WIDTH / 2, 346, completed ? `LIBRO ANTIGUO · +${rewards.xp} PX · +${rewards.affinityXp} AFINIDAD · +${rewards.coins} MONEDAS` : "SIN RECOMPENSAS", this.textStyle(12, completed ? "#f0b85c" : "#9aaab6", "800", true)).setOrigin(0.5);
    this.add.text(WIDTH / 2, 371, completed ? "Siguiente destino obligatorio: Biblioteca" : "Puedes reiniciar el encargo desde el Tablón.", this.textStyle(12, "#b9cad5", "700")).setOrigin(0.5);
    if (completed && rewards.supplyBonus) this.add.text(WIDTH / 2, 396, "+1 SUMINISTRO PARA LA GUARIDA POR LOS RECURSOS RECUPERADOS", this.textStyle(10, "#79e8b5", "800", true)).setOrigin(0.5);
    const button = this.add.rectangle(WIDTH / 2, 438, 250, 44, 0x0d4668, 1).setStrokeStyle(1.5, 0x55c9ff, 1).setInteractive({ useHandCursor: true });
    this.add.text(WIDTH / 2, 438, "← REGRESAR A LA ALDEA", this.textStyle(12, "#f4f8fb", "800", true)).setOrigin(0.5);
    button.on("pointerover", () => button.setFillStyle(0x17638d, 1));
    button.on("pointerout", () => button.setFillStyle(0x0d4668, 1));
    button.once("pointerup", () => this.scene.start("travel", { direction: "toVillage" }));
    this.cameras.main.fadeIn(320, 3, 9, 18);
    sharpenTextTree(this.children.list);
  }
}

class ResultsScene extends Phaser.Scene {
  constructor() { super("results"); }

  preload() {
    if (!this.textures.exists("results-headquarters")) this.load.image("results-headquarters", "assets/locations/headquarters.webp?v=0.20.0");
    queuePlayerFighterTextures(this, playerFighterAppearance(activeSave));
  }

  create(data = {}) {
    this.cameras.main.setZoom(renderResolution).centerOn(WIDTH / 2, HEIGHT / 2);
    const outcome = data.outcome || "failed";
    const completed = outcome === "completed";
    const abandoned = outcome === "abandoned";
    const title = completed ? "MISIÓN COMPLETADA" : abandoned ? "MISIÓN ABANDONADA" : "MISIÓN FALLIDA";
    const subtitle = completed ? "El objetivo ha sido cumplido." : abandoned ? "Regresas a la aldea para reorganizarte." : "La misión termina, pero conservas lo aprendido.";
    const masterName = masterIdForCharacter(activeSave.character) === "mei" ? "Mei Hayate" : "Daichi Kazan";
    const masterLine = data.decision === "interrogate"
      ? `${masterName}: «Conservamos la información, pero Akumori recibió refuerzos. Toda ventaja tiene un coste.»`
      : data.decision === "eliminate"
        ? `${masterName}: «Akumori no recibió refuerzos, pero perdimos la entrada secreta y un posible aliado.»`
        : completed
          ? `${masterName}: «Buen trabajo. Recuerda qué decisión te permitió volver.»`
      : abandoned
        ? `${masterName}: «Retirarse a tiempo también es parte del entrenamiento.»`
        : `${masterName}: «Analiza la derrota, ajusta tu estrategia y vuelve.»`;

    this.add.image(WIDTH / 2, HEIGHT / 2, "results-headquarters").setDisplaySize(WIDTH, HEIGHT).setDepth(0);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x020914, 0.48).setOrigin(0).setDepth(1);
    this.add.rectangle(0, 0, WIDTH, 5, 0x43c9ff, 0.9).setOrigin(0).setDepth(2);

    const fighter = createPlayerFighter(this, 205, 392, playerFighterAppearance(activeSave));
    fighter.targets.forEach((target) => target.setAlpha(0));
    fighter.shadow.setAlpha(0);
    this.tweens.add({ targets: [...fighter.targets, fighter.shadow], alpha: 1, x: "+=18", duration: 650, ease: "Cubic.out" });
    const namePlate = this.add.text(223, 493, activeSave.character.name, { fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "11px", color: "#eaf7ff", fontStyle: "bold" })
      .setOrigin(0.5).setPadding(13, 5).setBackgroundColor("#031220").setStroke("#5ecfff", 1).setDepth(12);
    this.tweens.add({ targets: namePlate, alpha: { from: 0, to: 1 }, duration: 450, delay: 300 });

    const titleColor = completed ? "#f0b85c" : "#83d8ff";
    this.add.text(625, 55, "INFORME DE MISIÓN", { fontFamily: '"Cinzel", Georgia, serif', fontSize: "11px", color: "#83d8ff", fontStyle: "bold", letterSpacing: 2 }).setOrigin(0.5);
    this.add.text(625, 83, title, { fontFamily: '"Cinzel", Georgia, serif', fontSize: "27px", color: titleColor, fontStyle: "bold" }).setOrigin(0.5).setAlpha(0).setName("results-title");
    this.add.text(625, 116, data.missionTitle || activeMission?.title || "Misión", { fontFamily: '"Cinzel", Georgia, serif', fontSize: "15px", color: "#f4f0e8", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(625, 143, subtitle, { fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "13px", color: "#b5c8d7" }).setOrigin(0.5);
    this.add.text(625, 165, masterLine, { fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "12px", color: "#d8c29b", fontStyle: "italic" }).setOrigin(0.5);

    this.add.rectangle(625, 317, 530, 270, 0x031220, 0.95).setStrokeStyle(1.5, 0x55c9ff, 0.78).setDepth(3);
    this.add.rectangle(362, 182, 4, 270, 0x3fcaff, 0.95).setOrigin(0, 0).setDepth(4);
    this.add.text(385, 198, "ESTADO DEL EQUIPO", { fontFamily: '"Cinzel", Georgia, serif', fontSize: "11px", color: "#83d8ff", fontStyle: "bold", letterSpacing: 1 }).setOrigin(0, 0.5).setDepth(5);
    const hpRatio = Phaser.Math.Clamp((data.playerHp || 0) / Math.max(1, data.maxHp || 1), 0, 1);
    this.add.text(385, 230, "VIDA RESTANTE", { fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "12px", color: "#dce7ef", fontStyle: "bold" }).setOrigin(0, 0.5).setDepth(5);
    this.add.rectangle(385, 253, 480, 18, 0x101f30, 1).setOrigin(0, 0.5).setStrokeStyle(1, 0x315b77, 0.9).setDepth(5);
    const hpColor = hpRatio > 0.5 ? 0x43c9ff : hpRatio > 0.25 ? 0xf0b85c : 0xef6b72;
    const hpFill = this.add.rectangle(387, 253, 1, 12, hpColor, 1).setOrigin(0, 0.5).setDepth(6);
    this.tweens.add({ targets: hpFill, displayWidth: 476 * hpRatio, duration: 850, delay: 250, ease: "Cubic.out" });
    this.add.text(865, 230, `${data.playerHp || 0}/${data.maxHp || 0}`, { fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "12px", color: "#f4f0e8", fontStyle: "bold" }).setOrigin(1, 0.5).setDepth(5);

    const rows = [
      ["♛", "Rivales derrotados", `${data.defeated || 0}/${data.totalEncounters || 0}`],
      ["★", "Experiencia obtenida", completed ? `+${data.rewards?.xp || 0} PX` : "Sin recompensa"],
      ["◆", "Afinidad obtenida", completed ? `+${data.rewards?.affinityXp || 0} PX` : "Sin recompensa"],
      ["▣", "Monedas obtenidas", completed ? `+${data.rewards?.coins || 0}` : "Sin recompensa"]
    ];
    if (data.item) rows.push(["◇", "Objeto recuperado", data.item]);
    rows.forEach(([icon, label, value], index) => {
      const y = 286 + index * 32;
      this.add.text(385, y, icon, { fontFamily: '"Cinzel", Georgia, serif', fontSize: "16px", color: "#f0b85c", fontStyle: "bold" }).setOrigin(0, 0.5).setDepth(5);
      this.add.text(414, y, label, { fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "13px", color: "#b5c8d7" }).setOrigin(0, 0.5).setDepth(5);
      const amount = this.add.text(865, y, value, { fontFamily: '"Cinzel", Georgia, serif', fontSize: "13px", color: completed ? "#f4f0e8" : "#8195a5", fontStyle: "bold" }).setOrigin(1, 0.5).setAlpha(0).setDepth(5);
      this.tweens.add({ targets: amount, alpha: 1, x: "-=10", duration: 350, delay: 520 + index * 120, ease: "Cubic.out" });
    });

    const buttonBg = this.add.rectangle(625, 485, 220, 44, 0x0d4668, 1).setStrokeStyle(1.5, 0x55c9ff, 1).setInteractive({ useHandCursor: true }).setDepth(5);
    const buttonLabel = this.add.text(625, 485, "← VOLVER A LA ALDEA", { fontFamily: '"Cinzel", Georgia, serif', fontSize: "13px", color: "#f4f8fb", fontStyle: "bold" }).setOrigin(0.5).setDepth(6);
    buttonBg.on("pointerover", () => buttonBg.setFillStyle(0x17638d, 1));
    buttonBg.on("pointerout", () => buttonBg.setFillStyle(0x0d4668, 1));
    buttonBg.once("pointerup", () => {
      buttonBg.disableInteractive();
      buttonLabel.setText("REGRESANDO...");
      this.scene.start("travel", { direction: "toVillage" });
    });
    this.tweens.add({ targets: this.children.getByName("results-title"), alpha: 1, y: "+=8", duration: 600, ease: "Cubic.out" });
    this.cameras.main.fadeIn(350, 3, 9, 18);
    sharpenTextTree(this.children.list);
  }
}

class PauseScene extends Phaser.Scene {
  constructor() { super("pause"); }

  create() {
    this.cameras.main.setZoom(renderResolution).centerOn(WIDTH / 2, HEIGHT / 2);
    this.battle = this.scene.get("battle");
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x02050a, 0.84).setOrigin(0).setDepth(100);
    this.add.rectangle(WIDTH / 2 + 5, HEIGHT / 2 + 7, 560, 460, 0x000000, 0.45).setDepth(101);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, 560, 460, 0x061321, 0.99)
      .setStrokeStyle(1.5, 0x65bce9, 0.95).setDepth(101);

    this.add.text(WIDTH / 2, 86, "MISIÓN EN PAUSA", {
      fontFamily: "Cinzel, Georgia, serif", fontSize: "26px", color: "#f7fbff", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(102);
    this.add.text(WIDTH / 2, 118, "Ajusta la partida o vuelve al combate.", {
      fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "13px", color: "#9fb0c6"
    }).setOrigin(0.5).setDepth(102);

    this.add.text(315, 145, "AJUSTES", {
      fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "12px", color: "#82d3f7", fontStyle: "bold"
    }).setOrigin(0, 0.5).setDepth(102);

    const rows = [
      ["Sellos manuales", "manual-seals"],
      ["Sacudida de cámara", "camera-effects"],
      ["Destellos de pantalla", "flash-effects"],
      ["Música", "music-enabled"],
      ["Modo ligero", "light-mode"]
    ];

    rows.forEach(([label, id], index) => this.makePauseToggle(480, 172 + index * 33, label, id));

    this.makeHudThemeControl(480, 347);
    this.makeVolumeControl(480, 392);

    this.makePauseAction(400, 454, "REANUDAR", 0x36b5e8, () => {
      this.scene.resume("battle");
      this.scene.stop();
    }, 150);

    this.makePauseAction(560, 454, "ABANDONAR", 0xef665f, () => {
      const button = this.children.getByName("pause-action-ABANDONAR");
      if (button) button.disableInteractive();
      const payload = this.battle.abandonPayload();
      this.scene.stop("battle");
      this.scene.start(this.battle.mission.type === "route-combat" ? "secondary-results" : "results", payload);
    }, 150);

    this.input.keyboard.once("keydown-ESC", () => {
      this.scene.resume("battle");
      this.scene.stop();
    });
    sharpenTextTree(this.children.list);
  }

  makePauseToggle(x, y, label, inputId) {
    const input = document.getElementById(inputId);
    const bg = this.add.rectangle(x, y, 330, 29, 0x101c2b, 1)
      .setStrokeStyle(1, 0x41546d, 0.95).setDepth(102).setInteractive({ useHandCursor: true });
    this.add.text(x - 150, y, label, {
      fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "12px", color: "#dce4ef", fontStyle: "bold"
    }).setOrigin(0, 0.5).setDepth(103);

    const value = this.add.text(x + 145, y, input.checked ? "ACTIVADO" : "DESACTIVADO", {
      fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "11px", color: input.checked ? "#79e8b5" : "#91a0b3", fontStyle: "bold"
    }).setOrigin(1, 0.5).setDepth(103);

    bg.on("pointerover", () => bg.setFillStyle(0x1a2a3d, 1));
    bg.on("pointerout", () => bg.setFillStyle(0x101c2b, 1));
    bg.on("pointerup", () => {
      input.checked = !input.checked;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      value.setText(input.checked ? "ACTIVADO" : "DESACTIVADO");
      value.setColor(input.checked ? "#79e8b5" : "#91a0b3");
    });
  }

  makeVolumeControl(x, y) {
    const input = document.getElementById("game-volume");
    this.add.text(x - 165, y, "VOLUMEN", {
      fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "12px", color: "#dce4ef", fontStyle: "bold"
    }).setOrigin(0, 0.5).setDepth(103);

    const value = this.add.text(x + 45, y, `${input.value}%`, {
      fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "12px", color: "#82d3f7", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(103);

    const adjust = (delta) => {
      input.value = String(Phaser.Math.Clamp(Number(input.value) + delta, 0, 100));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      value.setText(`${input.value}%`);
    };

    this.makePauseAction(x - 32, y, "−", 0x6f8fb7, () => adjust(-10), 42, false);
    this.makePauseAction(x + 112, y, "+", 0x6f8fb7, () => adjust(10), 42, false);
  }

  makeHudThemeControl(x, y) {
    const input = document.getElementById("hud-theme");
    const themes = Object.keys(HUD_THEMES);
    const labels = { ancestral: "PERGAMINO", lunar: "LUNAR" };
    this.add.text(x - 165, y, "MARCO DEL HUD", {
      fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "12px", color: "#dce4ef", fontStyle: "bold"
    }).setOrigin(0, 0.5).setDepth(103);

    const value = this.add.text(x + 45, y, labels[input.value] || labels.ancestral, {
      fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "11px", color: "#f5c96b", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(103);

    const selectTheme = (delta) => {
      const currentIndex = Math.max(0, themes.indexOf(input.value));
      input.value = themes[(currentIndex + delta + themes.length) % themes.length];
      input.dispatchEvent(new Event("change", { bubbles: true }));
      value.setText(labels[input.value] || input.value.toUpperCase());
    };

    this.makePauseAction(x - 32, y, "<", 0xb98545, () => selectTheme(-1), 38, false);
    this.makePauseAction(x + 112, y, ">", 0xb98545, () => selectTheme(1), 38, false);
  }

  makePauseAction(x, y, label, color, callback, width = 260, once = true) {
    const bg = this.add.rectangle(x, y, width, 39, 0x111d2c, 1).setStrokeStyle(1, color, 1).setDepth(102)
      .setInteractive({ useHandCursor: true }).setName(`pause-action-${label}`);
    this.add.text(x, y, label, { fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "12px", color: "#f8f2e7", fontStyle: "bold" })
      .setOrigin(0.5).setDepth(103);
    bg.on("pointerover", () => bg.setFillStyle(color, 0.32));
    bg.on("pointerout", () => bg.setFillStyle(0x111d2c, 1));
    if (once) bg.once("pointerup", callback);
    else bg.on("pointerup", callback);
  }
}

const metaRoot = document.getElementById("meta");
const gameRoot = document.getElementById("game");
let gameLaunchRevision = 0;

function destroyGameInstance(instance = game) {
  if (!instance) return;
  if (game === instance) game = null;
  try { instance.destroy(true); } catch (_) { /* La vista HTML debe recuperarse aunque Phaser ya se haya cerrado. */ }
  gameRoot.replaceChildren();
  gameRoot.removeAttribute("aria-busy");
}

function releaseGameToMeta(locationId = "plaza") {
  gameLaunchRevision += 1;
  const instance = game;
  instance?.loop.sleep();
  metaRoot.hidden = false;
  gameRoot.hidden = true;
  if (locationId === "plaza") metaUi?.refresh(activeSave);
  else metaUi?.openLocation(activeSave, locationId);
  queueMicrotask(() => destroyGameInstance(instance));
}

function bindGlobalOptions() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const checkboxPreferences = [
    ["manual-seals", "seal-input-mode", "manual", "automatic", "manual"],
    ["camera-effects", "camera-effects", "on", "off", reduceMotion ? "off" : "on"],
    ["flash-effects", "flash-effects", "on", "off", reduceMotion ? "off" : "on"],
    ["music-enabled", "music-enabled", "on", "off", "on"],
    ["light-mode", "light-mode", "on", "off", "off"]
  ];
  checkboxPreferences.forEach(([id, key, onValue, offValue, defaultValue]) => {
    const input = document.getElementById(id);
    try { input.checked = (window.localStorage.getItem(key) || defaultValue) === onValue; } catch (_) { /* Preferencias opcionales. */ }
    input.addEventListener("change", () => {
      try { window.localStorage.setItem(key, input.checked ? onValue : offValue); } catch (_) { /* Preferencias opcionales. */ }
      if (id === "manual-seals") document.getElementById("mode-hint").textContent = input.checked ? "Completa las secuencias con QWER / ASDF / ZXCV." : "Los sellos se ejecutarán automáticamente.";
    });
  });
  const volume = document.getElementById("game-volume");
  try { volume.value = window.localStorage.getItem("game-volume") || "70"; } catch (_) { /* Preferencias opcionales. */ }
  volume.addEventListener("input", () => { try { window.localStorage.setItem("game-volume", volume.value); } catch (_) { /* Preferencias opcionales. */ } });
  const hudTheme = document.getElementById("hud-theme");
  try {
    const savedHudTheme = window.localStorage.getItem("hud-theme");
    hudTheme.value = HUD_THEMES[savedHudTheme] ? savedHudTheme : "ancestral";
  } catch (_) { hudTheme.value = "ancestral"; }
  hudTheme.addEventListener("change", () => {
    try { window.localStorage.setItem("hud-theme", hudTheme.value); } catch (_) { /* Preferencias opcionales. */ }
  });
  document.getElementById("mode-hint").textContent = document.getElementById("manual-seals").checked ? "Completa las secuencias con QWER / ASDF / ZXCV." : "Los sellos se ejecutarán automáticamente.";
}

bindGlobalOptions();

metaUi = mountMetaUI(metaRoot, activeSave, async (save, mission) => {
  const launchRevision = ++gameLaunchRevision;
  activeSave = writeSave(save);
  activeMission = mission;
  document.querySelector(".game-settings")?.removeAttribute("open");
  metaRoot.hidden = true;
  gameRoot.hidden = false;
  destroyGameInstance();
  gameRoot.setAttribute("aria-busy", "true");
  await Promise.all([
    document.fonts.load('700 16px "Cinzel"'),
    document.fonts.load('700 16px "Alegreya Sans"')
  ]);
  if (launchRevision !== gameLaunchRevision) return;
  const renderSize = configureRenderResolution(gameRoot);
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: renderSize.width,
    height: renderSize.height,
    backgroundColor: "#101622",
    scene: [MissionTravelScene, BattleScene, MissionEpilogueScene, SecondaryResultsScene, ResultsScene, PauseScene],
    loader: { maxParallelDownloads: 6 },
    render: { antialias: true, antialiasGL: true, pixelArt: false, roundPixels: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
  });
  gameRoot.removeAttribute("aria-busy");
}, (save, mission, result) => {
  gameLaunchRevision += 1;
  activeSave = writeSave(save);
  activeMission = mission;
  destroyGameInstance();
  metaRoot.hidden = true;
  gameRoot.hidden = false;
  pendingSecondaryResults = { ...result, missionTitle: mission.title, missionId: mission.id, missionType: mission.type };
  const renderSize = configureRenderResolution(gameRoot);
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: renderSize.width,
    height: renderSize.height,
    backgroundColor: "#101622",
    scene: [SecondaryResultsScene, MissionTravelScene],
    loader: { maxParallelDownloads: 4 },
    render: { antialias: true, antialiasGL: true, pixelArt: false, roundPixels: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
  });
});
