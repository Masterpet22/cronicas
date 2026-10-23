import { SEALS, BASE_ACTIONS, JUTSU_LIBRARY, ENEMY_ACTIONS, ENEMY_ROSTER } from "../../data.js?v=0.69.0";
import { applyStatus, affinityLabel, hasStatus, hitChance } from "../../rules.js?v=0.20.0";
import { AFFINITY_CONFIG, affinityCycleModifier, furyDamageBonus, reprisalChance, reprisalDamage } from "../../affinity-system.js?v=0.58.0";
import { createPlayerFighter, destroyFighter, playFighterDamageReaction, preparePlayerPunch, queuePlayerFighterTextures, recoverPlayerPunch, releasePlayerPunch, startPlayerGuard, startPlayerRunning, stopPlayerGuard, stopPlayerRunning } from "../../fighters.js?v=0.80.0";
import { enemyFighterAppearance, playerFighterAppearance } from "../../character.js?v=0.76.0";
import { actionLines, createActionButton, createBar } from "../../ui.js?v=0.85.0";
import { awardEncounter, cancelDoctorMission, completeMission, derivedStats, masterIdForCharacter, recordBestiaryObservation, resolveDoctorMissionCombat, writeSave } from "../../save.js?v=0.66.0";
import { elementIcon } from "../../elements.js?v=0.20.0";
import { createUiIcon, loadUiIcons } from "../../icons.js?v=0.44.0";
import { missionStep } from "../../mission-system.js?v=0.67.0";
import { getMissionSceneDialogue } from "../../dialogues.js?v=0.66.0";
import { bossPhaseMessage, combatFeatures, fieldSuppliesForBattle, resolveEncounterIds } from "../../combat-modifiers.js?v=0.67.0";
import { resolveDamage } from "../damage.js?v=0.68.0";
import { createEnemyState } from "../enemy-state.js?v=0.68.0";
import { advanceCooldowns, combatantEvasion, combatantSpeed, nextEnemyAction, resolveStatusTick, soakAfterTurn, waterSoakAfterAttack } from "../turn.js?v=0.68.0";
import { addBattleReward, bestiaryObservation, createBattleResult, emptyBattleRewards } from "../rewards.js?v=0.68.0";
import { bindBattleState, createBattleState } from "../battle-state.js?v=0.68.0";


import { BATTLE_ARENAS, HEIGHT, HUD_THEMES, Phaser, RANK_LEVELS, TECHNIQUE_VFX, TECHNIQUE_VFX_FRAMES, TIMELINE_END, TIMELINE_START, WIDTH, battleRuntime, drawCubicBezier, sharpenTextTree } from "../runtime.js?v=0.82.9";

import { BATTLE_INTERFACE_SKINS, BattlePresentationMethods } from "./battle-presentation.js?v=0.85.0";
import { BattleFlowMethods } from "./battle-flow.js?v=0.72.0";
import { BattleActionMethods } from "./battle-actions.js?v=0.81.0";
import { BattleFeedbackMethods } from "./battle-feedback.js?v=0.72.0";
import { installBattleMethods } from "./install-battle-methods.js?v=0.68.0";

export class BattleScene extends Phaser.Scene {
  constructor() {
    super("battle");
    bindBattleState(this, createBattleState());
  }

  preload() {
    const arenaIndex = ((battleRuntime.activeMission?.number || 1) - 1) % BATTLE_ARENAS.length;
    const arena = BATTLE_ARENAS[arenaIndex];
    this.battleBackgroundKey = arena.texture;
    if (!this.textures.exists(arena.texture)) this.load.image(arena.texture, arena.file);
    if (!this.textures.exists("substitution-log")) this.load.image("substitution-log", "assets/vfx/substitution-log-runtime.png?v=0.64.0");
    if (!this.textures.exists("timeline-player-shuriken")) this.load.image("timeline-player-shuriken", "assets/vfx/feedback/timeline-player-shuriken.png?v=0.83.0");
    if (!this.textures.exists("timeline-enemy-shuriken")) this.load.image("timeline-enemy-shuriken", "assets/vfx/feedback/timeline-enemy-shuriken.png?v=0.83.0");
    if (!this.textures.exists("timeline-ready-brush")) this.load.image("timeline-ready-brush", "assets/vfx/feedback/timeline-ready-brush.png?v=0.70.0");
    if (!this.textures.exists("preparation-ribbons")) this.load.image("preparation-ribbons", "assets/vfx/feedback/preparation-ribbons.png?v=0.70.0");
    if (!this.textures.exists("preparation-mote")) this.load.image("preparation-mote", "assets/vfx/feedback/preparation-mote.png?v=0.71.0");
    if (!this.textures.exists("forest-road")) this.load.image("forest-road", "assets/locations/forest-road.webp?v=0.75.0");
    if (!this.textures.exists("village-outskirts-branches")) this.load.image("village-outskirts-branches", "assets/locations/village-outskirts-branches.webp?v=0.74.0");

    // Ambos marcos optimizados pesan juntos menos de un tercio del PNG ancestral
    // anterior. Cargarlos aquí evita parpadeos al alternarlos desde la pausa.
    Object.values(HUD_THEMES).forEach((theme) => {
      if (!this.textures.exists(theme.texture)) this.load.image(theme.texture, theme.file);
    });
    Object.values(BATTLE_INTERFACE_SKINS).forEach((skin) => {
      if (!this.textures.exists(skin.actionSlotTexture)) this.load.image(skin.actionSlotTexture, skin.actionSlotFile);
      if (!this.textures.exists(skin.speedSwordTexture)) this.load.image(skin.speedSwordTexture, skin.speedSwordFile);
    });

    const needsSealSheet = battleRuntime.activeSave.loadout.some((id) => JUTSU_LIBRARY.find((jutsu) => jutsu.id === id)?.seals.length);
    if (needsSealSheet) this.load.image("sealSheet", "assets/sellos-originales.webp?v=0.20.0");
    Object.entries(TECHNIQUE_VFX).forEach(([jutsuId, effect]) => {
      if (!battleRuntime.activeSave.loadout.includes(jutsuId)) return;
      if (effect.creationFile) {
        [["creation", effect.creationFile], ["destruction", effect.destructionFile]].filter(([, file]) => file).forEach(([phase, file]) => {
          const phaseTexture = `technique-vfx-${jutsuId}-${phase}`;
          if (!this.textures.exists(phaseTexture)) this.load.spritesheet(phaseTexture, `assets/vfx/${file}?v=0.81.0`, {
            frameWidth: effect.frameWidth,
            frameHeight: effect.frameHeight,
            endFrame: effect.frames - 1
          });
        });
        if (effect.projectileFile) {
          const projectileTexture = `technique-vfx-${jutsuId}-projectile`;
          if (!this.textures.exists(projectileTexture)) this.load.image(projectileTexture, `assets/vfx/${effect.projectileFile}?v=0.81.0`);
        }
        return;
      }
      const texture = `technique-vfx-${jutsuId}`;
      if (this.textures.exists(texture)) return;
      const source = `assets/vfx/${effect.file}?v=0.81.0`;
      if (Number.isFinite(effect.sourceY)) this.load.image(texture, source);
      else this.load.spritesheet(texture, source, {
          frameWidth: effect.frameWidth,
          frameHeight: effect.frameHeight,
          endFrame: (effect.frames || TECHNIQUE_VFX_FRAMES) - 1
        });
    });
    loadUiIcons(this);
    if (missionStep(battleRuntime.activeMission, "choice")?.relicDecision) {
      if (!this.textures.exists("kagemori-investigation")) this.load.image("kagemori-investigation", "assets/locations/kagemori.webp?v=0.62.0");
      const master = masterIdForCharacter(battleRuntime.activeSave.character) === "mei" ? "mei-hayate" : "daichi-kazan";
      if (!this.textures.exists(master)) this.load.image(master, `assets/npcs/${master}.webp?v=0.62.0`);
    }
    // Texturas de combatientes generadas con el mismo SVG del Dojo.
    this.saveData = battleRuntime.activeSave;
    this.missionStartSave = JSON.parse(JSON.stringify(battleRuntime.activeSave));
    this.mission = battleRuntime.activeMission;
    this.combatFeatures = combatFeatures(this.mission, this.saveData.campaign);
    battleRuntime.activeMission.encounters.forEach((enemyId) => queuePlayerFighterTextures(this, enemyFighterAppearance(ENEMY_ROSTER[enemyId], enemyId)));
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
    this.cameras.main.setZoom(battleRuntime.renderResolution).centerOn(WIDTH / 2, HEIGHT / 2);
    this.saveData = battleRuntime.activeSave;
    Object.entries(TECHNIQUE_VFX).forEach(([jutsuId, effect]) => {
      if (effect.creationFile) {
        ["creation", "destruction"].forEach((phase) => {
          const phaseTexture = `technique-vfx-${jutsuId}-${phase}`;
          const phaseAnimation = `${phaseTexture}-animation`;
          if (!this.textures.exists(phaseTexture) || this.anims.exists(phaseAnimation)) return;
          this.anims.create({
            key: phaseAnimation,
            frames: this.anims.generateFrameNumbers(phaseTexture, { start: 0, end: effect.frames - 1 }),
            frameRate: phase === "destruction" ? (effect.destructionFrameRate || effect.frameRate) : effect.frameRate,
            repeat: 0,
            hideOnComplete: phase === "destruction"
          });
        });
        return;
      }
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
    this.mission = battleRuntime.activeMission;
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
    this.timelineProgress = { player: 0, enemy: 0 };
    this.pendingActions = { player: null, enemy: null };
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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stopTurnTimeline?.();
      this.clearBossPhaseSilhouette?.({ restoreIdle: false });
    });
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
    battleRuntime.activeSave = this.saveData;
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
      this.refreshPreparationFeedback?.();
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

}

installBattleMethods(BattleScene, BattlePresentationMethods, BattleFlowMethods, BattleActionMethods, BattleFeedbackMethods);

