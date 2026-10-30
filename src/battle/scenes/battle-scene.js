import { mountAccessibleBattleHud } from "../hud-accessibility.js?v=0.114.0";
import { mountCombatTutorial } from "../combat-tutorial.js?v=0.114.0";
import { queueTeleportObjects } from "../teleport-transition.js?v=1.1.0";
import { clearSceneFilters, clearSceneParticles } from "../visual-resources.js?v=0.99.0";
import { SEALS, BASE_ACTIONS, JUTSU_LIBRARY, ENEMY_ACTIONS, ENEMY_ROSTER } from "../../data.js?v=0.114.0";
import { applyStatus, affinityLabel, hasStatus, hitChance } from "../../rules.js?v=0.20.0";
import { AFFINITY_CONFIG, affinityCycleModifier, furyDamageBonus, reprisalChance, reprisalDamage } from "../../affinity-system.js?v=0.114.0";
import { createPlayerFighter, destroyFighter, playFighterDamageReaction, preparePlayerPunch, queuePlayerFighterTextures, recoverPlayerPunch, releasePlayerPunch, startPlayerGuard, startPlayerRunning, stopPlayerGuard, stopPlayerRunning } from "../../fighters.js?v=0.115.0";
import { enemyFighterAppearance, playerFighterAppearance } from "../../character.js?v=0.76.0";
import { actionLines, createActionButton, createBar } from "../../ui.js?v=0.114.0";
import { awardEncounter, cancelDoctorMission, completeMission, derivedStats, masterIdForCharacter, recordBestiaryObservation, resolveDoctorMissionCombat, writeSave } from "../../save.js?v=0.114.0";
import { queueElementIcons, composeElementIcons } from "../element-icons.js?v=1.0.0";
import { createUiIcon, loadUiIcons } from "../../icons.js?v=0.44.0";
import { missionStep } from "../../mission-system.js?v=0.114.0";
import { getMissionSceneDialogue } from "../../dialogues.js?v=0.114.0";
import { bossPhaseMessage, combatFeatures, fieldSuppliesForBattle, resolveEncounterIds } from "../../combat-modifiers.js?v=0.114.0";
import { resolveDamage } from "../damage.js?v=0.114.0";
import { createEnemyState } from "../enemy-state.js?v=0.114.0";
import { advanceCooldowns, combatantEvasion, combatantSpeed, nextEnemyAction, resolveStatusTick, soakAfterTurn, waterSoakAfterAttack } from "../turn.js?v=0.114.0";
import { addBattleReward, bestiaryObservation, createBattleResult, emptyBattleRewards } from "../rewards.js?v=0.114.0";
import { bindBattleState, createBattleState } from "../battle-state.js?v=0.68.0";


import { BATTLE_ARENAS, COIN_DROP_VFX, EXPERIENCE_DROP_VFX, HEIGHT, HUD_THEMES, Phaser, RANK_LEVELS, TECHNIQUE_VFX, TECHNIQUE_VFX_FRAMES, TIMELINE_END, TIMELINE_START, WIDTH, battleRuntime, drawCubicBezier, sharpenTextTree } from "../runtime.js?v=0.91.0";

import { BattlePresentationMethods } from "./battle-presentation.js?v=0.115.0";
import { BattleFlowMethods } from "./battle-flow.js?v=0.115.0";
import { BattleActionMethods } from "./battle-actions.js?v=0.115.0";
import { BattleFeedbackMethods } from "./battle-feedback.js?v=0.115.0";
import { installBattleMethods } from "./install-battle-methods.js?v=0.68.0";
import { SHARED_BATTLE_ASSETS } from "../../asset-urls.js?v=0.115.0";
import { FREE_MISSION_RETRIES } from "../mission-retries.js?v=0.114.0";

export class BattleScene extends Phaser.Scene {
  constructor() {
    super("battle");
    bindBattleState(this, createBattleState());
  }

  preload() {
    queueTeleportObjects(this);
    const arenaIndex = ((battleRuntime.activeMission?.arenaNumber || battleRuntime.activeMission?.number || 1) - 1) % BATTLE_ARENAS.length;
    const arena = BATTLE_ARENAS[arenaIndex];
    this.battleBackgroundKey = arena.texture;
    if (!this.textures.exists(arena.texture)) this.load.image(arena.texture, arena.file);
    if (!this.textures.exists("timeline-ready-brush")) this.load.image("timeline-ready-brush", "assets/vfx/feedback/timeline-ready-brush.png?v=0.70.0");
    if (!this.textures.exists("preparation-ribbons")) this.load.image("preparation-ribbons", "assets/vfx/feedback/preparation-ribbons.png?v=0.70.0");
    if (!this.textures.exists("preparation-mote")) this.load.image("preparation-mote", SHARED_BATTLE_ASSETS.preparationMote);
    if (!this.textures.exists("forest-road")) this.load.image("forest-road", SHARED_BATTLE_ASSETS.forestRoad);
    if (!this.textures.exists("village-outskirts-branches")) this.load.image("village-outskirts-branches", SHARED_BATTLE_ASSETS.villageOutskirtsBranches);
    if (!this.textures.exists("coin-drop")) this.load.spritesheet("coin-drop", `assets/vfx/${COIN_DROP_VFX.file}?v=0.89.0`, {
      frameWidth: COIN_DROP_VFX.frameWidth,
      frameHeight: COIN_DROP_VFX.frameHeight,
      endFrame: COIN_DROP_VFX.frames - 1
    });
    if (!this.textures.exists("experience-drop")) this.load.spritesheet("experience-drop", `assets/vfx/${EXPERIENCE_DROP_VFX.file}?v=0.91.0`, {
      frameWidth: EXPERIENCE_DROP_VFX.frameWidth,
      frameHeight: EXPERIENCE_DROP_VFX.frameHeight,
      endFrame: EXPERIENCE_DROP_VFX.frames - 1
    });

    // An empty loadout must not prevent learning seals. The loaned technique
    // exists only in this battle and never changes the player's saved loadout.
    this.battleLoadout = [...battleRuntime.activeSave.loadout];
    this.practiceTechnique = false;
    this.tutorialRequested = combatFeatures(battleRuntime.activeMission, battleRuntime.activeSave.campaign).tutorial
      && (battleRuntime.activeMission.tutorialReplay || !battleRuntime.activeSave.campaign.completedMissions.includes(battleRuntime.activeMission.id));
    if (this.tutorialRequested
      && !this.battleLoadout.some(id => JUTSU_LIBRARY.find(jutsu => jutsu.id === id)?.seals.length)) {
      const practice = JUTSU_LIBRARY.find(jutsu => jutsu.element === battleRuntime.activeSave.character.affinity && jutsu.seals?.length);
      if (practice) { this.battleLoadout[0] = practice.id; this.practiceTechnique = true; }
    }
    const needsSealSheet = this.battleLoadout.some((id) => JUTSU_LIBRARY.find((jutsu) => jutsu.id === id)?.seals.length);
    if (needsSealSheet) this.load.image("sealSheet", "assets/sellos-constelaciones.png?v=1.0.1");
    Object.entries(TECHNIQUE_VFX).forEach(([jutsuId, effect]) => {
      if (!this.battleLoadout.includes(jutsuId)) return;
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
      const source = `assets/vfx/${effect.file}?v=${effect.version || "0.81.0"}`;
      if (Number.isFinite(effect.sourceY)) this.load.image(texture, source);
      else this.load.spritesheet(texture, source, {
          frameWidth: effect.frameWidth,
          frameHeight: effect.frameHeight,
          endFrame: (effect.frames || TECHNIQUE_VFX_FRAMES) - 1
        });
    });
    loadUiIcons(this);
    if (missionStep(battleRuntime.activeMission, "choice")?.relicDecision) {
      if (!this.textures.exists("kagemori-investigation")) this.load.image("kagemori-investigation", SHARED_BATTLE_ASSETS.kagemori);
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
    queueElementIcons(this, this.battleLoadout.map((id) => JUTSU_LIBRARY.find((jutsu) => jutsu.id === id)?.element).filter(Boolean));
    queuePlayerFighterTextures(this, this.playerAppearance());
  }

  create() {
    composeElementIcons(this, this.battleLoadout.map((id) => JUTSU_LIBRARY.find((jutsu) => jutsu.id === id)?.element).filter(Boolean));
    // Los objetos del HUD anterior ya están destruidos cuando Phaser reinicia la escena.
    this.actionSlots = [];
    this.buttons = [];
    this.actionBackdropThemeParts = null;
    this.timelineThemeParts = null;
    this.playerTimelineTag = null;
    this.enemyTimelineTag = null;
    this.accessibleHud = null;
    this.combatTutorial = null;
    // La resolución lógica se escala explícitamente para conservar un HUD nítido.
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
    if (this.textures.exists("coin-drop") && !this.anims.exists("coin-drop-spin")) {
      this.anims.create({
        key: "coin-drop-spin",
        frames: this.anims.generateFrameNumbers("coin-drop", { start: 0, end: COIN_DROP_VFX.frames - 1 }),
        frameRate: COIN_DROP_VFX.frameRate,
        repeat: -1
      });
    }
    if (this.textures.exists("experience-drop") && !this.anims.exists("experience-drop-spin")) {
      this.anims.create({
        key: "experience-drop-spin",
        frames: this.anims.generateFrameNumbers("experience-drop", { start: 0, end: EXPERIENCE_DROP_VFX.frames - 1 }),
        frameRate: EXPERIENCE_DROP_VFX.frameRate,
        repeat: -1
      });
    }
    this.mission = battleRuntime.activeMission;
    this.encounterIds = resolveEncounterIds(this.mission, this.saveData.campaign);
    this.encounters = this.encounterIds.map((id) => ENEMY_ROSTER[id]);
    const stats = derivedStats(this.saveData);
    this.player = { ...stats, hp: stats.maxHp, chakra: stats.maxChakra, statuses: [], guarding: false };
    const selectedJutsus = this.battleLoadout.map((id) => JUTSU_LIBRARY.find((jutsu) => jutsu.id === id)).filter(Boolean)
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
    this.freeRetries = FREE_MISSION_RETRIES;
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
    this.lastShownLevel = this.saveData.progression.level;
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
      this.finished = true;
      this.combatTutorial?.destroy();
      this.stopTurnTimeline?.();
      this.clearBossPhaseSilhouette?.({ restoreIdle: false });
    });
    this.createPauseButton();
    this.accessibleHud = mountAccessibleBattleHud(this);
    this.startMusic();
    if (this.tutorialRequested) {
      this.combatTutorial = mountCombatTutorial(this, { onReplayExit: this.mission.tutorialReplay ? () => this.exitTutorialReplay() : null });
      this.time.delayedCall(120, async () => {
        await this.playMissionOneTutorial();
        if (!this.finished) this.startTurnCharge();
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
    if (this.mission.tutorialReplay) return;
    const entry = bestiaryObservation(this.encounterIds, this.enemyIndex, observation);
    this.saveData = writeSave(recordBestiaryObservation(this.saveData, entry.enemyId, entry.observation));
    battleRuntime.activeSave = this.saveData;
  }

  exitTutorialReplay() {
    if (this.finished) return;
    this.finished = true;
    this.stopTurnTimeline?.();
    this.combatTutorial?.destroy();
    battleRuntime.releaseGameToMeta("archive");
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
    this.cameraEffects = cameraToggle.checked;
    this.flashEffects = flashToggle.checked;
    this.musicEnabled = musicToggle.checked;
    this.lightMode = lightToggle.checked;
    this.volume = Number(volumeInput.value) / 100;
    this.hudTheme = "ancestral";
    try {
      const savedTheme = window.localStorage.getItem("hud-theme");
      if (HUD_THEMES[savedTheme]) this.hudTheme = savedTheme;
    } catch (_) { /* El estilo predeterminado no depende del almacenamiento. */ }

    const update = () => {
      this.cameraEffects = cameraToggle.checked;
      this.flashEffects = flashToggle.checked;
      this.musicEnabled = musicToggle.checked;
      this.lightMode = lightToggle.checked;
      this.volume = Number(volumeInput.value) / 100;
      if (this.lightMode) { clearSceneFilters(this); clearSceneParticles(this); }
      this.arenaVisuals?.update();
      this.refreshActionPanelFilter?.();
      try {
        window.localStorage.setItem("camera-effects", this.cameraEffects ? "on" : "off");
        window.localStorage.setItem("flash-effects", this.flashEffects ? "on" : "off");
        window.localStorage.setItem("music-enabled", this.musicEnabled ? "on" : "off");
        window.localStorage.setItem("light-mode", this.lightMode ? "on" : "off");
        window.localStorage.setItem("game-volume", volumeInput.value);
      } catch (_) { /* Las opciones funcionan aunque no puedan persistir. */ }
      if (this.hudFrames) this.applyHudTheme(this.hudTheme);
      this.refreshPreparationFeedback?.();
    };

    cameraToggle.addEventListener("change", update);
    flashToggle.addEventListener("change", update);
    musicToggle.addEventListener("change", update);
    lightToggle.addEventListener("change", update);
    volumeInput.addEventListener("input", update);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      cameraToggle.removeEventListener("change", update);
      flashToggle.removeEventListener("change", update);
      musicToggle.removeEventListener("change", update);
      lightToggle.removeEventListener("change", update);
      volumeInput.removeEventListener("input", update);
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
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const index = row * 3 + col;
        // La textura sobrevive al reinicio de la escena. Registrar los mismos
        // fotogramas otra vez deja la escena incompleta en algunas versiones.
        if (!texture.has(index)) texture.add(index, 0, col * 512, row * 512, 512, 512);
      }
    }
  }

}

installBattleMethods(BattleScene, BattlePresentationMethods, BattleFlowMethods, BattleActionMethods, BattleFeedbackMethods);

