import { SEALS, BASE_ACTIONS, JUTSU_LIBRARY, ENEMY_ACTIONS, ENEMY_ROSTER } from "../../data.js?v=0.66.0";
import { applyStatus, affinityLabel, hasStatus, hitChance } from "../../rules.js?v=0.20.0";
import { createPlayerFighter, destroyFighter, playFighterDamageReaction, preparePlayerPunch, queuePlayerFighterTextures, recoverPlayerPunch, releasePlayerPunch, startPlayerBreathing, startPlayerGuard, startPlayerPreparing, startPlayerRunning, stopPlayerGuard, stopPlayerPreparing, stopPlayerRunning } from "../../fighters.js?v=0.80.0";
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
import { actionNeedsPreparation, advanceTimelineProgress, millisecondsToTimelineThreshold, timelineMarkerPosition, timelineMilestones } from "../timeline.js?v=0.69.0";


import { BATTLE_ARENAS, HEIGHT, HUD_THEMES, Phaser, TECHNIQUE_VFX, TECHNIQUE_VFX_FRAMES, TIMELINE_END, TIMELINE_START, WIDTH, battleRuntime, sharpenTextTree } from "../runtime.js?v=0.82.9";

export const BATTLE_INTERFACE_SKINS = Object.freeze({
  ancestral: Object.freeze({
    actionSlotTexture: "battle-ui-ancestral-action-slot",
    actionSlotFile: "assets/ui/hud-themes/ancestral-action-slot.png?v=0.84.0",
    speedSwordTexture: "battle-ui-ancestral-speed-sword",
    speedSwordFile: "assets/ui/hud-themes/ancestral-speed-sword.png?v=0.82.8",
    panel: 0x160c08,
    buttonFill: 0x24150d,
    buttonEdge: 0x74461f,
    accent: 0xc9913b,
    highlight: 0xf5d58b,
    muted: 0x69513a,
    shortcutFill: 0x21140d,
    text: "#fff1cf",
    mutedText: "#9e8870",
    tooltipFill: 0x160c08,
    tooltipEdge: 0xd4a34e,
    tooltipHighlight: 0xffe4a3,
    tooltipTitle: "#ffe9b5",
    tooltipText: "#f5e7d2",
    tooltipMutedText: "#cdbda8",
    preparation: 0xb64b36,
    playerMarker: 0xe0ae51,
    enemyMarker: 0xb8443d,
    timelineSwordWidth: 600,
    timelineSwordHeight: 200
  }),
  lunar: Object.freeze({
    actionSlotTexture: "battle-ui-lunar-action-slot",
    actionSlotFile: "assets/ui/hud-themes/lunar-action-slot.png?v=0.84.0",
    speedSwordTexture: "battle-ui-lunar-speed-sword",
    speedSwordFile: "assets/ui/hud-themes/lunar-speed-sword.png?v=0.82.8",
    panel: 0x020914,
    buttonFill: 0x061321,
    buttonEdge: 0x1d5c7a,
    accent: 0x39c7ff,
    highlight: 0x9be9ff,
    muted: 0x315c72,
    shortcutFill: 0x071421,
    text: "#f7fbff",
    mutedText: "#66849a",
    tooltipFill: 0x020812,
    tooltipEdge: 0xe0bd69,
    tooltipHighlight: 0xffe6a0,
    tooltipTitle: "#fff0bd",
    tooltipText: "#e9f5fb",
    tooltipMutedText: "#d7e2ea",
    preparation: 0xe0bd69,
    playerMarker: 0x50d7ff,
    enemyMarker: 0xff5668,
    timelineSwordWidth: 600,
    timelineSwordHeight: 200
  })
});

const ACTION_BACKDROP_BOUNDS = Object.freeze({ x: 17, y: 120, width: 90, height: 410, radius: 40 });

function paintActionBackdrop(parts, skin) {
  if (!parts) return;
  const { haze, surface } = parts;
  const { x, y, width, height, radius } = ACTION_BACKDROP_BOUNDS;

  haze.clear();
  haze.fillStyle(0x02050b, 0.18).fillRoundedRect(x - 5, y - 4, width + 10, height + 8, radius + 4);

  surface.clear();
  surface.fillGradientStyle(0x3f1517, 0x250d11, 0x050913, 0x050913, 0.28, 0.22, 0.42, 0.42);
  surface.fillRoundedRect(x, y, width, height, radius);
  surface.fillStyle(0x921f1a, 0.07).fillRoundedRect(x + 7, y + 8, width - 14, height - 16, radius - 7);
  surface.lineStyle(1, 0xd2a14c, 0.34).strokeRoundedRect(x + 1, y + 1, width - 2, height - 2, radius - 1);
  surface.lineStyle(1, 0x8c2a20, 0.4).strokeRoundedRect(x + 5, y + 5, width - 10, height - 10, radius - 5);
  for (let stroke = 0; stroke < 5; stroke += 1) {
    surface.lineStyle(1, 0xe2c783, 0.025).lineBetween(x + 19 + stroke * 11, y + 18, x + 11 + stroke * 12, y + height - 18);
  }
}

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
    const playerFrameX = 248;
    const enemyFrameX = 712;
    const healthFrameY = 55;
    const chakraFrameY = 85;
    const healthBarWidth = 270;
    const chakraBarWidth = 264;
    const playerHealthX = 113;
    const playerChakraX = 116;
    const enemyHealthX = 577;
    const enemyChakraX = 580;

    this.hudLacquerChrome = this.add.graphics().setDepth(20);
    this.paintHudLacquerChrome({
      playerHealthX, playerChakraX, enemyHealthX, enemyChakraX,
      healthFrameY, chakraFrameY, healthBarWidth, chakraBarWidth
    });

    this.playerName = this.add.text(
      113,
      10,
      this.saveData.character.name.toUpperCase(),
      {
        fontFamily: '"Yu Mincho", "Cinzel", Georgia, serif',
        fontSize: "16px",
        color: "#f4dfae",
        fontStyle: "bold",
        stroke: "#120907",
        strokeThickness: 3
      }
    ).setDepth(21);

    this.enemyName = this.add.text(
      847,
      10,
      this.encounters[this.enemyIndex].name.toUpperCase(),
      {
        fontFamily: '"Yu Mincho", "Cinzel", Georgia, serif',
        fontSize: "16px",
        color: "#f4dfae",
        fontStyle: "bold",
        stroke: "#120907",
        strokeThickness: 3
      }
    ).setOrigin(1, 0).setDepth(21);

    this.playerHpBar = createBar(this, playerHealthX, healthFrameY, healthBarWidth, 22, 0x6ea782, { ghostColor: 0xf1d57a, slotColor: 0x0a1717 });
    this.chakraBar = createBar(this, playerChakraX, chakraFrameY, chakraBarWidth, 9, 0x35c7e8, { slotColor: 0x07131d, edgeColor: 0x9b793e });
    this.enemyHpBar = createBar(this, enemyHealthX, healthFrameY, healthBarWidth, 22, 0x6ea782, { direction: "rtl", ghostColor: 0xf1d57a, slotColor: 0x0a1717 });
    this.enemyChakraBar = createBar(this, enemyChakraX, chakraFrameY, chakraBarWidth, 9, 0x1c3842, { direction: "rtl", slotColor: 0x081016, edgeColor: 0x755c35 });
    this.chakraSwirl = this.add.graphics().setDepth(23).setMask(this.chakraBar.slotMask);
    for (let swirl = 0; swirl < 9; swirl += 1) {
      const cx = playerChakraX + 18 + swirl * 29;
      this.chakraSwirl.lineStyle(1, 0xcaf8ff, 0.24).beginPath().arc(cx, chakraFrameY, 5, Math.PI * 0.15, Math.PI * 1.45).strokePath();
    }
    this.enemyChakraBar.valueText.setVisible(false);
    this.enemyChakraLock = this.createOfudaSeal(enemyFrameX, chakraFrameY);
    this.enemyChakraBar.centerIcon = this.enemyChakraLock;
    this.hudBarCenters = { healthFrameY, chakraFrameY };

    const enemyRankNumber = this.enemyRankForProfile(this.encounters[this.enemyIndex]);
    this.playerRankStar = this.createLevelBadge(354, 21, `NV ${this.saveData.progression.level}`);
    this.playerRankNumber = this.playerRankStar.text;
    this.enemyRankStar = this.createLevelBadge(606, 21, `NV ${enemyRankNumber}`);
    this.enemyRankNumber = this.enemyRankStar.text;

    this.playerPortrait = this.createCombatPortrait(78, 58, this.playerAppearance(), false);
    this.enemyPortrait = this.createCombatPortrait(882, 58, this.enemyAppearance(), true);
    this.playerStatusSlots = this.createStatusRow(121, 106, "ltr");
    this.enemyStatusSlots = this.createStatusRow(839, 106, "rtl");

    this.hudFrames = { health: [], chakra: [] };
    this.applyHudTheme(this.hudTheme);

    [this.playerHpBar, this.chakraBar, this.enemyHpBar, this.enemyChakraBar].forEach((bar) => {
      bar.bg.setDepth(21);
      if (bar.slot) bar.slot.setDepth(21);
      if (bar.ghost) bar.ghost.setDepth(22);
      bar.fill.setDepth(22);
      if (bar.shade) bar.shade.setDepth(23);
      if (bar.sheen) bar.sheen.setDepth(23);
      if (bar.edge) bar.edge.setDepth(24);
      bar.valueText.setDepth(25);
    });

    this.refreshHud();
    this.sealLayer = this.add.container(WIDTH / 2, 120).setDepth(30);
  }

  paintHudLacquerChrome({ playerHealthX, playerChakraX, enemyHealthX, enemyChakraX, healthFrameY, chakraFrameY, healthBarWidth, chakraBarWidth }) {
    const g = this.hudLacquerChrome;
    g.clear();
    [[42, 4], [563, 4]].forEach(([x, y]) => {
      g.fillGradientStyle(0x11182a, 0x11182a, 0x040811, 0x040811, 0.7, 0.7, 0.88, 0.88)
        .fillRoundedRect(x, y, 355, 116, 24);
      g.lineStyle(1, 0x9c3729, 0.28).strokeRoundedRect(x + 1, y + 1, 353, 114, 23);
    });
    const bars = [
      [playerHealthX, healthFrameY, healthBarWidth, 22], [enemyHealthX, healthFrameY, healthBarWidth, 22],
      [playerChakraX, chakraFrameY, chakraBarWidth, 9], [enemyChakraX, chakraFrameY, chakraBarWidth, 9]
    ];
    bars.forEach(([x, y, width, height], index) => {
      const large = index < 2;
      g.fillStyle(0x5e1917, 0.98).fillRoundedRect(x - 6, y - height / 2 - 5, width + 12, height + 10, large ? 10 : 7);
      g.lineStyle(1.5, 0xc49748, 0.9).strokeRoundedRect(x - 4, y - height / 2 - 3, width + 8, height + 6, large ? 8 : 5);
      g.lineStyle(1, 0xf1cc76, 0.22).lineBetween(x + 8, y - height / 2 - 1, x + width - 8, y - height / 2 - 1);
      g.fillStyle(0x7b201b, 1).fillRoundedRect(x - 10, y - height / 2 - 1, 8, height + 2, 3);
      g.fillRoundedRect(x + width + 2, y - height / 2 - 1, 8, height + 2, 3);
      g.lineStyle(1, 0xc49748, 0.74).strokeRoundedRect(x - 9, y - height / 2, 6, height, 2);
      g.strokeRoundedRect(x + width + 3, y - height / 2, 6, height, 2);
    });
  }

  createLevelBadge(x, y, label) {
    const plate = this.add.rectangle(x, y, 39, 18, 0x7b201b, 0.98)
      .setStrokeStyle(1, 0xd0a04f, 0.9).setDepth(25);
    const text = this.add.text(x, y, label, {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "9px", color: "#f6d986", fontStyle: "bold", stroke: "#1a0907", strokeThickness: 2
    }).setOrigin(0.5).setDepth(26);
    return { plate, text };
  }

  createCombatPortrait(x, y, appearance, flipped) {
    const shadow = this.add.circle(x, y + 2, 34, 0x02050a, 0.9).setDepth(23);
    const wash = this.add.circle(x, y, 30, 0x182536, 0.96).setDepth(24);
    const maskShape = this.make.graphics({ add: false });
    maskShape.fillStyle(0xffffff).fillCircle(x, y, 29);
    const mask = maskShape.createGeometryMask();
    const head = this.add.image(x, y + 8, "player-man-cabeza").setDisplaySize(42, 64).setFlipX(flipped).setMask(mask).setDepth(25);
    const hairKey = ({ 1: "player-hair-corto", 4: "player-hair-coleta" })[appearance?.hair];
    const hair = hairKey && this.textures.exists(hairKey)
      ? this.add.image(x + (flipped ? 1 : -1), y - 17, hairKey).setDisplaySize(55, appearance?.hair === 4 ? 50 : 43).setFlipX(flipped).setMask(mask).setDepth(26)
      : null;
    const frame = this.add.graphics().setDepth(27);
    frame.lineStyle(5, 0x6f1d18, 1).strokeCircle(x, y, 32);
    frame.lineStyle(1.5, 0xd0a04f, 0.95).strokeCircle(x, y, 29);
    frame.lineStyle(1, 0xf2d88c, 0.3).strokeCircle(x - 1, y - 1, 26);
    return { shadow, wash, head, hair, frame, maskShape };
  }

  createOfudaSeal(x, y) {
    const paper = this.add.rectangle(x, y, 14, 22, 0xe7dab7, 0.96)
      .setStrokeStyle(1, 0x8c2b22, 0.9).setAngle(-4).setDepth(26);
    const glyph = this.add.text(x, y, "封", {
      fontFamily: '"Yu Mincho", "MS Mincho", serif', fontSize: "10px", color: "#92251d", fontStyle: "bold"
    }).setOrigin(0.5).setAngle(-4).setDepth(27);
    return { paper, glyph, setY: (nextY) => { paper.setY(nextY); glyph.setY(nextY); } };
  }

  createStatusRow(anchorX, y, direction) {
    return Array.from({ length: 5 }, (_, index) => {
      const x = anchorX + (direction === "rtl" ? -index : index) * 20;
      const bg = this.add.circle(x, y, 7, 0x07101a, 0.88).setStrokeStyle(1, 0x9b6e38, 0.62).setDepth(24);
      const glyph = this.add.text(x, y, "·", {
        fontFamily: '"Yu Mincho", "Alegreya Sans", sans-serif', fontSize: "8px", color: "#6f7a7e", fontStyle: "bold"
      }).setOrigin(0.5).setDepth(25);
      return { bg, glyph };
    });
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
    this.hudTheme = HUD_THEMES[themeId] ? themeId : "ancestral";
    this.moveHudBar(this.playerHpBar, this.hudBarCenters.healthFrameY);
    this.moveHudBar(this.enemyHpBar, this.hudBarCenters.healthFrameY);
    this.moveHudBar(this.chakraBar, this.hudBarCenters.chakraFrameY);
    this.moveHudBar(this.enemyChakraBar, this.hudBarCenters.chakraFrameY);
    this.applyBattleInterfaceTheme(this.hudTheme);
  }

  moveHudBar(bar, y) {
    bar.bg.setY(y);
    bar.slot.setY(y);
    if (bar.ghost) bar.ghost.setY(y);
    bar.fill.setY(y);
    if (bar.shade) bar.shade.setY(y + bar.height / 3);
    if (bar.sheen) bar.sheen.setY(y - bar.height / 4);
    if (bar.edge) bar.edge.setY(y);
    bar.valueText.setY(y);
    if (bar.centerIcon) bar.centerIcon.setY(y);
    if (bar.maskShape) bar.maskShape.setPosition(bar.x, y);
  }

  applyBattleInterfaceTheme(themeId = this.hudTheme) {
    const resolvedThemeId = BATTLE_INTERFACE_SKINS[themeId] ? themeId : "ancestral";
    const skin = BATTLE_INTERFACE_SKINS[resolvedThemeId];
    if (this.timelineThemeParts) {
      const { chrome, ticks, sword, speedIcon, title, preparationLabel, preparationStart, trackY } = this.timelineThemeParts;
      chrome.clear();
      // Katana parcialmente desenvainada: empuñadura y saya bermellón,
      // filo cálido y una zona de acción roja en la punta.
      chrome.fillStyle(0x010309, 0.62).fillRoundedRect(252, trackY - 24, 602, 48, 24);
      chrome.fillStyle(0x35100f, 1).fillRoundedRect(254, trackY - 8, 82, 16, 7);
      for (let wrap = 0; wrap < 6; wrap += 1) {
        chrome.lineStyle(2, 0xc69b52, 0.66).lineBetween(262 + wrap * 11, trackY - 7, 270 + wrap * 11, trackY + 7);
      }
      chrome.fillStyle(0x6f1d18, 1).fillEllipse(338, trackY, 18, 42);
      chrome.lineStyle(2, 0xd0a24f, 0.95).strokeEllipse(338, trackY, 18, 42);
      chrome.fillStyle(0xdbc17e, 0.96);
      chrome.fillTriangle(344, trackY - 8, 850, trackY - 5, 862, trackY);
      chrome.fillTriangle(344, trackY + 8, 850, trackY + 5, 862, trackY);
      chrome.fillStyle(0xffefd0, 0.45).fillTriangle(354, trackY - 5, 850, trackY - 3, 858, trackY);
      chrome.lineStyle(1, 0x6e441f, 0.95).lineBetween(344, trackY + 8, 851, trackY + 5);
      chrome.fillStyle(0x711c18, 0.98).fillRoundedRect(327, trackY - 11, 186, 22, 10);
      chrome.lineStyle(2, 0xc89b4b, 0.9).strokeRoundedRect(329, trackY - 9, 182, 18, 8);
      chrome.lineStyle(1, 0xf0cf7b, 0.22).lineBetween(342, trackY - 6, 498, trackY - 6);
      chrome.fillStyle(0x2d0b0b, 0.88).fillRoundedRect(preparationStart - 2, trackY - 10, TIMELINE_END - preparationStart + 10, 20, 9);
      chrome.fillStyle(0xa63724, 0.66).fillRoundedRect(preparationStart, trackY - 8, TIMELINE_END - preparationStart + 7, 16, 8);
      chrome.lineStyle(1, 0xf1c75f, 0.9).lineBetween(preparationStart + 2, trackY - 6, TIMELINE_END + 4, trackY - 3);
      chrome.lineStyle(2, 0xd9a34b, 1).lineBetween(preparationStart, trackY - 17, preparationStart, trackY + 17);
      chrome.fillStyle(0xf0cb70, 0.98).fillTriangle(preparationStart, trackY - 19, preparationStart - 5, trackY - 12, preparationStart + 5, trackY - 12);
      chrome.fillTriangle(preparationStart, trackY + 19, preparationStart - 5, trackY + 12, preparationStart + 5, trackY + 12);
      ticks.clear();
      timelineMilestones(TIMELINE_START, TIMELINE_END).forEach((x) => {
        ticks.lineStyle(3, 0x120908, 0.72).lineBetween(x, trackY - 8, x, trackY + 8);
        ticks.lineStyle(1, 0xe2c06e, 0.88).lineBetween(x, trackY - 7, x, trackY + 7);
      });
      sword.setVisible(false);
      speedIcon.setTint(0xd1a24d);
      title.setColor("#f1d78f");
      preparationLabel.setColor("#e8b958");
    }
    paintActionBackdrop(this.actionBackdropThemeParts, skin);
    this.actionSlots?.forEach((button) => button.applyTheme?.(skin));
  }

  enemyRankForProfile(profile) {
    return profile?.boss ? 2 : 1;
  }

  createTurnTimeline() {
    this.timelineLayer = this.add.container(0, 0).setDepth(30);
    const trackY = 500;
    const preparationStart = timelineMarkerPosition(0.8, TIMELINE_START, TIMELINE_END);
    const chrome = this.add.graphics();
    const ticks = this.add.graphics();
    const progressGlow = this.add.rectangle(TIMELINE_START, trackY, 1, 10, 0xf0c96a, 0.42).setOrigin(0, 0.5);
    const speedSword = this.add.rectangle(0, 0, 1, 1, 0x000000, 0).setVisible(false);
    const speedIcon = createUiIcon(this, "speed", 273, trackY - 31, { size: 14, tint: 0xd1a24d, depth: 31 });

    const title = this.add.text(287, trackY - 31, "VELOCIDAD", {
      fontFamily: '"Cinzel", Georgia, serif',
      fontSize: "11px",
      color: "#f1d78f",
      fontStyle: "bold",
      stroke: "#080504",
      strokeThickness: 3,
      shadow: { offsetX: 1, offsetY: 2, color: "#000000", blur: 4, stroke: true, fill: true }
    }).setOrigin(0, 0.5);
    const preparationLabel = this.add.text((preparationStart + TIMELINE_END) / 2, trackY - 31, "PREPARACIÓN", {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif',
      fontSize: "11px",
      color: "#e8b958",
      fontStyle: "bold",
      stroke: "#080504",
      strokeThickness: 3,
      shadow: { offsetX: 1, offsetY: 2, color: "#000000", blur: 5, stroke: true, fill: true }
    }).setOrigin(0.5);

    this.playerMarkerHalo = this.add.circle(TIMELINE_START, trackY - 21, 15, 0x10222b, 0.96).setStrokeStyle(2, 0xd2a34f, 0.95);
    this.enemyMarkerHalo = this.add.circle(TIMELINE_START, trackY + 21, 15, 0x251214, 0.96).setStrokeStyle(2, 0xa94532, 0.95);
    this.playerTurnMarker = this.add.image(TIMELINE_START, trackY - 21, "player-man-cabeza")
      .setDisplaySize(20, 30);
    this.enemyTurnMarker = this.add.image(TIMELINE_START, trackY + 21, "player-man-cabeza")
      .setDisplaySize(20, 30).setFlipX(true);

    this.timelineLayer.add([
      speedSword, chrome, progressGlow, ticks, speedIcon, title,
      preparationLabel,
      this.playerMarkerHalo, this.enemyMarkerHalo,
      this.playerTurnMarker, this.enemyTurnMarker
    ]);
    this.timelineThemeParts = { chrome, ticks, progressGlow, sword: speedSword, speedIcon, title, preparationLabel, preparationStart, trackY };
    this.timelineProgress ||= { player: 0, enemy: 0 };
    this.pendingActions ||= { player: null, enemy: null };
    this.timelineRunToken = 0;
    this.timelinePaused = true;
    this.timelineTween = null;
    this.preparationFeedback = { player: null, enemy: null };
    this.updateTimelineMarkers();
    this.setTimelineMarkerState("player", "charging");
    this.setTimelineMarkerState("enemy", "charging");
    this.applyBattleInterfaceTheme(this.hudTheme);
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
      targets: [this.playerTurnMarker, this.enemyTurnMarker, this.playerMarkerHalo, this.enemyMarkerHalo],
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
    this.enemyTurnMarker.setX(enemyX);
    this.playerMarkerHalo?.setX(playerX);
    this.enemyMarkerHalo?.setX(enemyX);
    if (this.timelineThemeParts?.progressGlow) {
      this.timelineThemeParts.progressGlow.width = Math.max(1, playerX - TIMELINE_START);
      this.timelineThemeParts.progressGlow.setAlpha(0.26 + progress.player * 0.52);
    }
  }

  setTimelineMarkerState(actor, state, action = null) {
    const marker = actor === "player" ? this.playerTurnMarker : this.enemyTurnMarker;
    if (!marker) return;
    const halo = actor === "player" ? this.playerMarkerHalo : this.enemyMarkerHalo;
    const size = state === "ready" ? 24 : state === "preparing" ? 22 : 20;
    marker.clearTint()
      .setDisplaySize(size, size * 1.5)
      .setAlpha(state === "charging" ? 0.86 : 1)
      .setAngle(0);
    halo?.setScale(state === "ready" ? 1.14 : state === "preparing" ? 1.07 : 1)
      .setAlpha(state === "charging" ? 0.86 : 1);
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
    this.actionSlots = [];
    const interfaceSkin = BATTLE_INTERFACE_SKINS[this.hudTheme] || BATTLE_INTERFACE_SKINS.ancestral;
    const haze = this.add.graphics().setDepth(29);
    const surface = this.add.graphics().setDepth(30);
    const blur = haze.postFX?.addBlur?.(0, 2, 2, 1.25, interfaceSkin.panel, 3) || null;
    this.actionBackdropThemeParts = { haze, surface, blur };
    paintActionBackdrop(this.actionBackdropThemeParts, interfaceSkin);

    const hideTooltip = (entry) => {
      if (entry.tooltipTimer) {
        entry.tooltipTimer.remove(false);
        entry.tooltipTimer = null;
      }
      entry.tooltip.layer.setVisible(false);
      entry.hoverRing.setVisible(Boolean(entry.selected));
    };

    for (let index = 0; index < 6; index += 1) {
      const jutsu = this.actions[index] || null;
      const button = createActionButton(this, jutsu, index, interfaceSkin);
      this.actionSlots.push(button);
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
        this.buttons.forEach((entry) => {
          entry.selected = entry === button;
          entry.hoverRing.setVisible(entry.selected);
        });
        if (button.available) this.useJutsu(jutsu);
      });
      this.buttons.push(button);
    }

    if (this.buttons[0]) {
      this.buttons[0].selected = true;
      this.buttons[0].hoverRing.setVisible(true).setAlpha(0.5);
    }

    this.onActionShortcut = (event) => {
      const index = Number(event.key) - 1;
      if (index < 0 || index >= this.actions.length) return;
      const jutsu = this.actions[index];
      if (jutsu) this.useJutsu(jutsu);
    };
    this.input.keyboard.on("keydown", this.onActionShortcut);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard.off("keydown", this.onActionShortcut));
    this.applyBattleInterfaceTheme(this.hudTheme);
  }

}

