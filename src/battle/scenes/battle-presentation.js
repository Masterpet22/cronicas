import { SEALS, BASE_ACTIONS, JUTSU_LIBRARY, ENEMY_ACTIONS, ENEMY_ROSTER } from "../../data.js?v=0.66.0";
import { applyStatus, affinityLabel, hasStatus, hitChance } from "../../rules.js?v=0.20.0";
import { createPlayerFighter, destroyFighter, playFighterDamageReaction, preparePlayerPunch, queuePlayerFighterTextures, recoverPlayerPunch, releasePlayerPunch, startPlayerBreathing, startPlayerGuard, startPlayerPreparing, startPlayerRunning, stopPlayerGuard, stopPlayerPreparing, stopPlayerRunning } from "../../fighters.js?v=0.71.0";
import { enemyFighterAppearance, playerFighterAppearance } from "../../character.js?v=0.62.0";
import { actionLines, createActionButton, createBar } from "../../ui.js?v=0.69.0";
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
import { actionNeedsPreparation, advanceTimelineProgress, millisecondsToTimelineThreshold, timelineMarkerPosition, timelineMilestones } from "../timeline.js?v=0.69.0";


import { BATTLE_ARENAS, HEIGHT, HUD_THEMES, Phaser, RANK_LEVELS, TECHNIQUE_VFX, TECHNIQUE_VFX_FRAMES, TIMELINE_END, TIMELINE_START, WIDTH, battleRuntime, drawCubicBezier, sharpenTextTree } from "../runtime.js?v=0.68.0";

export class BattlePresentationMethods {
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
    const preparationStart = timelineMarkerPosition(0.8, TIMELINE_START, TIMELINE_END);
    const chrome = this.add.graphics();
    chrome.fillStyle(0x020914, 0.92);
    chrome.fillRoundedRect(184, 487, 752, 36, 12);
    chrome.fillStyle(0xf0b85c, 0.1);
    chrome.fillRect(preparationStart, 489, TIMELINE_END - preparationStart, 32);
    chrome.lineStyle(1.5, 0x4abce9, 0.72);
    chrome.strokeRoundedRect(184, 487, 752, 36, 12);
    chrome.lineStyle(2, 0x8bdcff, 0.46);
    chrome.lineBetween(TIMELINE_START, trackY, TIMELINE_END, trackY);
    chrome.lineStyle(1, 0xa9c8d9, 0.38);
    timelineMilestones(TIMELINE_START, TIMELINE_END).forEach((x) => chrome.lineBetween(x, trackY - 5, x, trackY + 5));
    chrome.lineStyle(2, 0xf0b85c, 0.9);
    chrome.lineBetween(preparationStart, trackY - 14, preparationStart, trackY + 14);
    const speedIcon = createUiIcon(this, "speed", 204, trackY, { size: 18, tint: 0x38caff, depth: 31 });

    const title = this.add.text(221, trackY, "VELOCIDAD", {
      fontFamily: '"Cinzel", Georgia, serif',
      fontSize: "10px",
      color: "#f2f7fb",
      fontStyle: "bold"
    }).setOrigin(0, 0.5);
    const chevrons = this.add.graphics();
    chevrons.lineStyle(2, 0x29c9ff, 0.62);
    timelineMilestones(TIMELINE_START, TIMELINE_END).forEach((x) => {
      [0, 7].forEach((offset) => {
        chevrons.beginPath();
        chevrons.moveTo(x + offset - 4, trackY - 4);
        chevrons.lineTo(x + offset, trackY);
        chevrons.lineTo(x + offset - 4, trackY + 4);
        chevrons.strokePath();
      });
    });
    const preparationLabel = this.add.text((preparationStart + TIMELINE_END) / 2, trackY - 18, "PREPARACIÓN", {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif',
      fontSize: "9px",
      color: "#f0c77c",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.playerTurnMarker = this.add.image(TIMELINE_START, trackY, "timeline-crest")
      .setDisplaySize(38, 37).setTint(0x50d7ff);
    this.enemyTurnMarker = this.add.image(TIMELINE_START, trackY, "timeline-crest")
      .setDisplaySize(38, 37).setTint(0xff5668).setFlipX(true);
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
      preparationLabel,
      this.playerTurnMarker, this.enemyTurnMarker,
      this.playerTurnLetter, this.enemyTurnLetter
    ]);
    this.timelineProgress ||= { player: 0, enemy: 0 };
    this.pendingActions ||= { player: null, enemy: null };
    this.timelineRunToken = 0;
    this.timelinePaused = true;
    this.timelineTween = null;
    this.preparationFeedback = { player: null, enemy: null };
    this.updateTimelineMarkers();
    this.setTimelineMarkerState("player", "charging");
    this.setTimelineMarkerState("enemy", "charging");
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
    this.timelinePaused = false;
    this.turnReady = false;
    this.busy = false;
    this.setButtonsEnabled(false);
    this.runTurnTimeline();
  }

  async resetTurnTimeline() {
    this.stopTurnTimeline();
    this.clearPreparationFeedback("player");
    this.clearPreparationFeedback("enemy");
    this.timelinePaused = true;
    this.turnReady = false;
    this.setButtonsEnabled(false);
    this.timelineProgress = { player: 0, enemy: 0 };
    this.pendingActions = { player: null, enemy: null };
    this.setTimelineMarkerState("player", "charging");
    this.setTimelineMarkerState("enemy", "charging");
    await new Promise((resolve) => this.tweens.add({
      targets: [this.playerTurnMarker, this.playerTurnLetter, this.enemyTurnMarker, this.enemyTurnLetter],
      x: TIMELINE_START,
      duration: 330,
      ease: "Cubic.inOut",
      onComplete: resolve
    }));
  }

  stopTurnTimeline() {
    this.timelineRunToken = (this.timelineRunToken || 0) + 1;
    if (this.timelineTween) {
      this.timelineTween.remove();
      this.timelineTween = null;
    }
  }

  updateTimelineMarkers(progress = this.timelineProgress) {
    if (!progress || !this.playerTurnMarker || !this.enemyTurnMarker) return;
    const playerX = timelineMarkerPosition(progress.player, TIMELINE_START, TIMELINE_END);
    const enemyX = timelineMarkerPosition(progress.enemy, TIMELINE_START, TIMELINE_END);
    this.playerTurnMarker.setX(playerX);
    this.playerTurnLetter.setX(playerX);
    this.enemyTurnMarker.setX(enemyX);
    this.enemyTurnLetter.setX(enemyX);
  }

  setTimelineMarkerState(actor, state, action = null) {
    const marker = actor === "player" ? this.playerTurnMarker : this.enemyTurnMarker;
    const letter = actor === "player" ? this.playerTurnLetter : this.enemyTurnLetter;
    if (!marker || !letter) return;
    const baseColor = actor === "player" ? 0x50d7ff : 0xff5668;
    const color = state === "ready" ? 0xf0c77c : state === "preparing" ? action?.color || 0xf0b85c : baseColor;
    marker.setTint(color).setAlpha(state === "charging" ? 0.82 : 1).setAngle(state === "ready" ? 45 : 0);
    letter.setColor(state === "ready" ? "#ffe4a6" : "#fff4df");
  }

  playTimelineReadyBrush(actor) {
    if (this.lightMode) return;
    const marker = actor === "player" ? this.playerTurnMarker : this.enemyTurnMarker;
    const color = actor === "player" ? 0x50d7ff : 0xff5668;
    const brush = this.add.image(marker.x, marker.y, "timeline-ready-brush")
      .setDisplaySize(104, 42)
      .setTint(color)
      .setAlpha(0)
      .setDepth(31);
    const targetScaleX = brush.scaleX;
    const targetScaleY = brush.scaleY;
    brush.setScale(targetScaleX * 0.55, targetScaleY * 0.72);
    this.tweens.add({
      targets: brush,
      alpha: 0.86,
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      duration: 125,
      yoyo: true,
      hold: 55,
      ease: "Quad.out",
      onComplete: () => brush.destroy()
    });
  }

  showPreparationFeedback(actor, action) {
    this.clearPreparationFeedback(actor);
    const fighter = actor === "player" ? this.hero : this.foe;
    if (!fighter?.body || !action) return;
    startPlayerPreparing(this, fighter);
    this.setTimelineMarkerState(actor, "preparing", action);
    if (this.lightMode) return;
    const ribbon = this.add.image(0, -58, "preparation-ribbons")
      .setDisplaySize(116, 70)
      .setTint(action.color || 0xf0b85c)
      .setAlpha(0);
    fighter.body.addAt(ribbon, 0);
    const targetScaleX = ribbon.scaleX;
    const targetScaleY = ribbon.scaleY;
    ribbon.setScale(targetScaleX * 0.72, targetScaleY * 0.72);
    const particleFeedback = this.createPreparationParticles(fighter, action);
    const feedback = { ribbon, ...particleFeedback };
    this.preparationFeedback[actor] = feedback;
    this.tweens.add({
      targets: ribbon,
      alpha: 0.62,
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      duration: 170,
      ease: "Back.out",
      onComplete: () => {
        if (this.preparationFeedback[actor] !== feedback || !ribbon.active) return;
        this.tweens.add({ targets: ribbon, alpha: 0.46, angle: actor === "player" ? 3 : -3, duration: 310, yoyo: true, repeat: -1, ease: "Sine.inOut" });
      }
    });
  }

  createPreparationParticles(fighter, action) {
    const hands = fighter.layers?.filter(({ name }) => name === "mano_derecha" || name === "mano_izquierda") || [];
    const emitters = hands.map(() => this.add.particles(0, 0, "preparation-mote", {
      lifespan: { min: 420, max: 720 },
      frequency: 105,
      quantity: 1,
      maxParticles: 8,
      speed: { min: 8, max: 23 },
      angle: { min: 248, max: 292 },
      accelerationY: -12,
      scale: { start: 0.26, end: 0.04 },
      alpha: { start: 0.8, end: 0 },
      rotate: { min: -35, max: 35 },
      tint: action.color || 0xf0b85c,
      blendMode: "ADD"
    }).setDepth(8));
    const sync = () => {
      hands.forEach((hand, index) => {
        if (!hand?.active || !emitters[index]?.active) return;
        const pose = hand.getWorldTransformMatrix().decomposeMatrix();
        emitters[index].setPosition(pose.translateX, pose.translateY);
      });
    };
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, sync);
    sync();
    return { emitters, particleSync: sync };
  }

  destroyPreparationVisual(actor) {
    const feedback = this.preparationFeedback?.[actor];
    if (!feedback) return;
    if (feedback.particleSync) this.events.off(Phaser.Scenes.Events.POST_UPDATE, feedback.particleSync);
    if (feedback.ribbon?.active) {
      this.tweens.killTweensOf(feedback.ribbon);
      feedback.ribbon.destroy();
    }
    feedback.emitters?.forEach((emitter) => {
      if (!emitter?.active) return;
      emitter.stop();
      emitter.destroy();
    });
    this.preparationFeedback[actor] = null;
  }

  clearPreparationFeedback(actor) {
    const fighter = actor === "player" ? this.hero : this.foe;
    this.destroyPreparationVisual(actor);
    if (fighter?.body?.active && fighter.preparing) stopPlayerPreparing(this, fighter);
  }

  refreshPreparationFeedback() {
    if (!this.preparationFeedback) return;
    ["player", "enemy"].forEach((actor) => {
      const action = this.pendingActions?.[actor];
      const feedback = this.preparationFeedback[actor];
      const hasVisual = Boolean(feedback?.ribbon?.active || feedback?.emitters?.some(({ active }) => active));
      if (this.lightMode) {
        this.destroyPreparationVisual(actor);
      } else if (action && !hasVisual) {
        this.showPreparationFeedback(actor, action);
      }
    });
  }

  runTurnTimeline() {
    if (this.finished || this.timelinePaused || this.busy || this.timelineTween) return;
    const actors = ["player", "enemy"];
    const timings = actors.map((actor) => {
      const action = this.pendingActions[actor];
      const speed = this.combatantSpeed(this[actor]);
      return {
        actor,
        action,
        speed,
        duration: millisecondsToTimelineThreshold(this.timelineProgress[actor], speed, action)
      };
    });
    const duration = Math.min(...timings.map((entry) => entry.duration));
    const arrivals = timings.filter((entry) => Math.abs(entry.duration - duration) < 0.5);
    if (duration <= 0) {
      this.time.delayedCall(0, () => this.handleTimelineArrivals(arrivals));
      return;
    }

    const from = { ...this.timelineProgress };
    const to = Object.fromEntries(timings.map(({ actor, action, speed }) => [
      actor,
      advanceTimelineProgress(from[actor], speed, duration, action)
    ]));
    const clock = { value: 0 };
    const token = ++this.timelineRunToken;
    this.timelineTween = this.tweens.add({
      targets: clock,
      value: 1,
      duration,
      ease: "Linear",
      onUpdate: () => this.updateTimelineMarkers({
        player: Phaser.Math.Linear(from.player, to.player, clock.value),
        enemy: Phaser.Math.Linear(from.enemy, to.enemy, clock.value)
      }),
      onComplete: () => {
        if (token !== this.timelineRunToken || this.finished) return;
        this.timelineTween = null;
        this.timelineProgress = to;
        this.updateTimelineMarkers();
        this.handleTimelineArrivals(arrivals);
      }
    });
  }

  async handleTimelineArrivals(arrivals) {
    if (this.finished || this.timelinePaused || this.busy) return;
    const ordered = [...arrivals].sort((left, right) => {
      const leftComplete = left.action ? 0 : left.actor === "enemy" ? 1 : 2;
      const rightComplete = right.action ? 0 : right.actor === "enemy" ? 1 : 2;
      if (leftComplete !== rightComplete) return leftComplete - rightComplete;
      return left.actor === "player" ? -1 : 1;
    });
    const arrival = ordered[0];
    if (!arrival) return;

    if (arrival.action) {
      await this.executeTimelineAction(arrival.actor, arrival.action);
      return;
    }

    if (arrival.actor === "player") {
      this.timelinePaused = true;
      this.turnReady = true;
      this.busy = false;
      this.setButtonsEnabled(true);
      this.setMessage("Tu iniciativa está lista. Elige una acción.", "#83d8ff");
      this.setTimelineMarkerState("player", "ready");
      this.playTimelineReadyBrush("player");
      return;
    }

    this.setTimelineMarkerState("enemy", "ready");
    this.playTimelineReadyBrush("enemy");
    const action = this.chooseEnemyAction();
    if (actionNeedsPreparation(action)) {
      this.pendingActions.enemy = action;
      this.showPreparationFeedback("enemy", action);
      this.setMessage(`${this.encounters[this.enemyIndex].name} prepara ${action.name}.`, "#f0c77c");
      this.floatLabel(this.foe.body.x, this.foe.body.y - 165, `PREPARA: ${action.name.toUpperCase()}`, 0xf0b85c);
      this.runTurnTimeline();
      return;
    }
    await this.executeTimelineAction("enemy", action);
  }

  createFighters() {
    const fighterY = 372;
    this.hero = createPlayerFighter(this, 220, fighterY, this.playerAppearance());
    this.foe = createPlayerFighter(this, 740, fighterY, this.enemyAppearance(), true);
    this.styleFighterGrounding(this.hero);
    this.styleFighterGrounding(this.foe);
    this.bossPhaseSilhouette = null;
  }

  styleFighterGrounding(fighter) {
    if (this.battleBackgroundKey !== "bg-marsh" || !fighter?.shadow) return;
    fighter.shadow.setFillStyle(0x123e45, 0.22).setStrokeStyle(2, 0x75d9da, 0.38).setScale(1.14, 0.58);
  }

  showBossPhaseSilhouette(fighter) {
    this.clearBossPhaseSilhouette();
    if (!fighter?.layers?.length) return;
    fighter.phaseTwoActive = true;
    if (!fighter.animations?.state || fighter.animations.state === "idle") startPlayerBreathing(this, fighter);
    const clones = fighter.layers.map((source) => ({
      source,
      image: this.add.image(0, 0, source.texture.key, source.frame.name)
        .setOrigin(source.originX, source.originY)
        .setTintFill(0x8d4de8)
        .setDepth(5)
    }));
    const intensity = { alpha: 0.38 };
    const effect = { fighter, clones, intensity, sync: null };
    effect.sync = () => {
      clones.forEach(({ source, image }) => {
        if (!source?.active || !image?.active) return;
        const pose = source.getWorldTransformMatrix().decomposeMatrix();
        image.setPosition(pose.translateX, pose.translateY)
          .setRotation(pose.rotation)
          .setScale(pose.scaleX * 1.075, pose.scaleY * 1.075)
          .setAlpha(fighter.body.alpha * intensity.alpha)
          .setVisible(source.visible && fighter.body.visible);
      });
    };
    this.bossPhaseSilhouette = effect;
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, effect.sync);
    effect.sync();
    effect.pulse = this.tweens.add({ targets: intensity, alpha: 0.58, duration: 520, yoyo: true, repeat: -1, ease: "Sine.inOut" });
  }

  clearBossPhaseSilhouette({ restoreIdle = true } = {}) {
    const effect = this.bossPhaseSilhouette;
    if (!effect) return;
    this.events.off(Phaser.Scenes.Events.POST_UPDATE, effect.sync);
    effect.pulse?.stop();
    effect.clones.forEach(({ image }) => image?.destroy());
    const fighter = effect.fighter;
    this.bossPhaseSilhouette = null;
    if (!fighter?.phaseTwoActive) return;
    fighter.phaseTwoActive = false;
    if (restoreIdle && !fighter.preparing && fighter.animations?.state === "idle") {
      fighter.animations.stop({ reset: true });
      startPlayerBreathing(this, fighter);
    }
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

}

