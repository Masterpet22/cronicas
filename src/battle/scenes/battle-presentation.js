import { drawStatusPanel, drawCloudPlate, drawInitiativeFrame, drawTimelineTail, drawResourceEmblem, drawBeveledTag, chromePath } from "../hud-chrome.js?v=0.88.0";
import { HUD_ART, drawOrnatePanel } from "../hud-art.js?v=0.88.0";
import { SEALS, BASE_ACTIONS, JUTSU_LIBRARY, ENEMY_ACTIONS, ENEMY_ROSTER } from "../../data.js?v=0.93.0";
import { applyStatus, affinityLabel, hasStatus, hitChance } from "../../rules.js?v=0.20.0";
import { createPlayerFighter, destroyFighter, fighterHairPortraitLayout, fighterPuppetTextureKey, playFighterDamageReaction, preparePlayerPunch, queuePlayerFighterTextures, recoverPlayerPunch, releasePlayerPunch, startPlayerBreathing, startPlayerGuard, startPlayerPreparing, startPlayerRunning, stopPlayerGuard, stopPlayerPreparing, stopPlayerRunning } from "../../fighters.js?v=0.81.0";
import { enemyFighterAppearance, playerFighterAppearance } from "../../character.js?v=0.76.0";
import { actionLines, createActionButton, createBar } from "../../ui.js?v=0.92.0";
import { awardEncounter, cancelDoctorMission, completeMission, derivedStats, masterIdForCharacter, recordBestiaryObservation, resolveDoctorMissionCombat, writeSave } from "../../save.js?v=0.94.0";
import { elementIcon } from "../../elements.js?v=0.20.0";
import { createUiIcon, loadUiIcons } from "../../icons.js?v=0.44.0";
import { missionStep } from "../../mission-system.js?v=0.67.0";
import { getMissionSceneDialogue } from "../../dialogues.js?v=0.66.0";
import { bossPhaseMessage, combatFeatures, fieldSuppliesForBattle, resolveEncounterIds } from "../../combat-modifiers.js?v=0.67.0";
import { resolveDamage } from "../damage.js?v=0.68.0";
import { createEnemyState } from "../enemy-state.js?v=0.93.0";
import { advanceCooldowns, combatantEvasion, combatantSpeed, nextEnemyAction, resolveStatusTick, soakAfterTurn, waterSoakAfterAttack } from "../turn.js?v=0.93.0";
import { addBattleReward, bestiaryObservation, createBattleResult, emptyBattleRewards } from "../rewards.js?v=0.68.0";
import { bindBattleState, createBattleState } from "../battle-state.js?v=0.68.0";
import { actionNeedsPreparation, advanceTimelineProgress, millisecondsToTimelineThreshold, timelineMarkerPosition, timelineMilestones } from "../timeline.js?v=0.69.0";


import { BATTLE_ARENAS, HEIGHT, HUD_THEMES, Phaser, TECHNIQUE_VFX, TECHNIQUE_VFX_FRAMES, TIMELINE_END, TIMELINE_START, WIDTH, battleRuntime, sharpenTextTree } from "../runtime.js?v=0.91.0";

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
    tooltipFill: 0x0a1429,
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

function paintActionBackdrop(parts) {
  if (!parts) return;
  parts.haze.clear();
  parts.surface.clear();
  const { x, y, width, rowHeight } = HUD_ART.skills;
  drawOrnatePanel(parts.surface, x, y, width, rowHeight * 6, { radius: 12 });
  for (let row = 1; row < 6; row += 1) {
    parts.surface.lineStyle(0.8, HUD_ART.gold, 0.48).lineBetween(x + 5, y + rowHeight * row, x + width - 5, y + rowHeight * row);
  }
}

import { mountArenaVisuals } from "../arena-visual-controller.js?v=1.0.0";
import { isSceneActive, pauseSceneIfActive, stopSceneIfRunning } from "../scene-lifecycle.js?v=1.0.0";

export class BattlePresentationMethods {
  drawArena() {
    const arena = BATTLE_ARENAS.find(({ texture }) => texture === this.battleBackgroundKey)
      || BATTLE_ARENAS[((this.mission.number || 1) - 1) % BATTLE_ARENAS.length];
    mountArenaVisuals(this, arena, { width: WIDTH, height: HEIGHT });
  }

  createHud() {
    const firstHudChild = this.children.list.length;
    const healthFrameY = 49;
    const chakraFrameY = 72;
    const healthBarWidth = 202;
    const chakraBarWidth = 202;
    const playerHealthX = 148;
    const playerChakraX = 148;
    const enemyHealthX = WIDTH - playerHealthX - healthBarWidth;
    const enemyChakraX = WIDTH - playerChakraX - chakraBarWidth;
    this.hudLacquerChrome = this.add.graphics().setDepth(20);
    this.paintHudLacquerChrome({ playerHealthX, playerChakraX, enemyHealthX, enemyChakraX, healthFrameY, chakraFrameY, healthBarWidth, chakraBarWidth });
    const nameStyle = { fontFamily: HUD_ART.font, fontSize: "17px", color: HUD_ART.text, fontStyle: "bold", stroke: "#02050a", strokeThickness: 2 };
    this.playerName = this.add.text(116, 16, this.saveData.character.name.toUpperCase(), nameStyle).setDepth(21);
    this.enemyName = this.add.text(861, 16, this.encounters[this.enemyIndex].name.toUpperCase(), nameStyle).setOrigin(1, 0).setDepth(21);
    this.playerHpBar = createBar(this, playerHealthX, healthFrameY, healthBarWidth, 14, HUD_ART.health, { ghostColor: 0xf1d57a });
    this.chakraBar = createBar(this, playerChakraX, chakraFrameY, chakraBarWidth, 14, HUD_ART.chakra);
    this.enemyHpBar = createBar(this, enemyHealthX, healthFrameY, healthBarWidth, 14, HUD_ART.health, { direction: "rtl", ghostColor: 0xf1d57a });
    this.enemyChakraBar = createBar(this, enemyChakraX, chakraFrameY, chakraBarWidth, 14, HUD_ART.chakra, { direction: "rtl" });
    this.hudBarCenters = { healthFrameY, chakraFrameY };
    for (const { iconX, labelOffset, labelOrigin } of [
      { iconX: 111, labelOffset: 13, labelOrigin: 0 },
      { iconX: WIDTH - 111, labelOffset: -13, labelOrigin: 1 }
    ]) {
      drawResourceEmblem(this, "health", iconX, healthFrameY);
      drawResourceEmblem(this, "chakra", iconX, chakraFrameY);
      for (const [label, y] of [["PV", healthFrameY], ["CH", chakraFrameY]]) {
        this.add.text(iconX + labelOffset, y, label, { fontFamily: HUD_ART.font, fontSize: "11px", color: HUD_ART.text, fontStyle: "bold" }).setOrigin(labelOrigin, 0.5).setDepth(25);
      }
    }
    this.playerRankStar = this.createLevelBadge(325, 25, `NV ${this.saveData.progression.level}`);
    this.playerRankNumber = this.playerRankStar.text;
    this.enemyRankStar = this.createLevelBadge(634, 25, `NV ${this.enemyRankForProfile(this.encounters[this.enemyIndex])}`);
    this.enemyRankNumber = this.enemyRankStar.text;
    this.playerPortrait = this.createCombatPortrait(61, 50, this.playerAppearance(), false);
    this.enemyPortrait = this.createCombatPortrait(900, 50, this.enemyAppearance(), true);
    this.playerStatusSlots = this.createStatusRow(168, 93, "ltr");
    this.enemyStatusSlots = this.createStatusRow(WIDTH - 168, 93, "rtl");
    this.hudFrames = { health: [], chakra: [] };
    this.applyHudTheme(this.hudTheme);
    [this.playerHpBar, this.chakraBar, this.enemyHpBar, this.enemyChakraBar].forEach((bar) => {
      bar.bg.setDepth(21); bar.slot.setDepth(21);
      bar.ghost?.setDepth(22); bar.fill.setDepth(22);
      bar.shade.setDepth(23).setAlpha(0);
      bar.sheen.setDepth(23).setAlpha(0);
      const blue = bar === this.chakraBar || bar === this.enemyChakraBar;
      bar.lustre = this.add.graphics().setPosition(bar.x, bar.bg.y).setDepth(23);
      bar.lustre.fillGradientStyle(0xeafff5, 0xeafff5, blue ? 0x001b39 : 0x00240e, blue ? 0x001b39 : 0x00240e, .24, .24, .38, .38)
        .fillRect(0, -bar.height / 2, bar.width, bar.height);
      bar.edge.setDepth(24);
      bar.edge.lineStyle(.6, 0xe7fbd4, .55).lineBetween(8, -5, bar.width - 8, -5);
      const mirrored = bar.direction === "rtl";
      bar.valueText.setOrigin(mirrored ? 0 : 1, 0.5).setX(mirrored ? bar.x + 6 : bar.x + bar.width - 6).setFontSize(12).setDepth(25);
    });
    const phaseChrome = this.add.graphics().setDepth(24);
    drawCloudPlate(phaseChrome, 380, 17, 200, 28);
    this.phaseLabel = this.add.text(480, 31, "INICIATIVA", {
      fontFamily: HUD_ART.font, fontSize: "14px", fontStyle: "bold", color: HUD_ART.text, stroke: "#170607", strokeThickness: 2
    }).setOrigin(0.5).setDepth(25);
    this.refreshHud();
    this.hudCanvasParts = this.children.list.slice(firstHudChild).filter(part => part.depth < 58);
    this.sealLayer = this.add.container(WIDTH / 2, 120).setDepth(30);
  }

  paintHudLacquerChrome({ playerHealthX, playerChakraX, enemyHealthX, enemyChakraX, healthFrameY, chakraFrameY, healthBarWidth, chakraBarWidth }) {
    const g = this.hudLacquerChrome;
    g.clear();
    drawStatusPanel(g, 23, 12, 341, 94);
    drawStatusPanel(g, 596, 12, 341, 94, true);
    for (const [x, y, width] of [[playerHealthX, healthFrameY, healthBarWidth], [enemyHealthX, healthFrameY, healthBarWidth], [playerChakraX, chakraFrameY, chakraBarWidth], [enemyChakraX, chakraFrameY, chakraBarWidth]]) {
      g.fillStyle(0x02070d, 1).fillRoundedRect(x - 3, y - 10, width + 6, 20, 10);
      g.lineStyle(1.2, HUD_ART.gold, 1).strokeRoundedRect(x - 2, y - 9, width + 4, 18, 9);
      g.lineStyle(0.6, HUD_ART.light, 0.5).lineBetween(x + 8, y - 7, x + width - 8, y - 7);
    }
  }

  createLevelBadge(x, y, label) {
    const plate = this.add.graphics().setPosition(x - 19.5, y - 8.5).setDepth(25);
    plate.fillStyle(0x58151d, 1).fillRoundedRect(0, 0, 39, 17, 3);
    plate.lineStyle(.9, 0xd7a857, 1).strokeRoundedRect(0, 0, 39, 17, 3);
    plate.lineStyle(.5, 0xffdaa1, .3).lineBetween(4, 2, 35, 2);
    const text = this.add.text(x, y, label, {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "9px", color: "#f6d986", fontStyle: "bold", stroke: "#1a0907", strokeThickness: 2
    }).setOrigin(0.5).setDepth(26);
    return { plate, text };
  }

  createCombatPortrait(x, y, appearance, flipped) {
    const shadow = this.add.circle(x, y + 2, 34, 0x02050a, 0.9).setDepth(23);
    const wash = this.add.circle(x, y, 30, 0x182536, 0.96).setDepth(24);
    const head = this.add.image(x, y + 8, fighterPuppetTextureKey(appearance, "cabeza")).setDisplaySize(42, 64).setFlipX(flipped).setDepth(25);
    const hairKey = ({ 1: "player-hair-corto", 4: "player-hair-coleta" })[appearance?.hair];
    const hairLayout = fighterHairPortraitLayout(appearance?.hair, 42, 64, flipped, appearance?.bodyType);
    const hair = hairKey && this.textures.exists(hairKey)
      ? this.add.image(x + hairLayout.x, y + 8 + hairLayout.y, hairKey).setDisplaySize(hairLayout.width, hairLayout.height).setFlipX(flipped).setDepth(26)
      : null;
    const frame = this.add.graphics().setDepth(27);
    const side = flipped ? 1 : -1;
    chromePath(frame, [['M', 0, 8], ['L', 10, -3], ['L', 7, 7], ['L', 16, 12], ['L', 5, 10], ['Z']], { x: x + side * 31, y: y - 31, sx: side, fill: 0x8e3420, width: .9 });
    frame.lineStyle(5, 0x6f1d18, 1).strokeCircle(x, y, 34);
    frame.lineStyle(1.5, HUD_ART.gold, 1).strokeCircle(x, y, 36);
    frame.lineStyle(1, HUD_ART.light, 0.8).strokeCircle(x, y, 32);
    frame.lineStyle(1.5, 0xd0a04f, 0.95).strokeCircle(x, y, 29);
    frame.lineStyle(1, 0xf2d88c, 0.3).strokeCircle(x - 1, y - 1, 26);
    return { shadow, wash, head, hair, frame };
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
      const x = anchorX + (direction === "rtl" ? -index : index) * 24;
      const bg = this.add.circle(x, y, 7, 0x07101a, 0.88).setStrokeStyle(1, 0xc79a52, 0.85).setDepth(24);
      const glyph = this.add.text(x, y, "·", {
        fontFamily: '"Yu Mincho", "Alegreya Sans", sans-serif', fontSize: "8px", color: "#6f7a7e", fontStyle: "bold"
      }).setOrigin(0.5).setDepth(25);
      const detail = this.add.text(x, y + 12, "", { fontFamily: '"Alegreya Sans", sans-serif', fontSize: "10px", color: "#f5e1af", backgroundColor: "#0a1429", padding: { x: 5, y: 4 } }).setOrigin(0.5, 0).setDepth(58).setVisible(false);
      const slot = { bg, glyph, detail, status: null };
      bg.setInteractive();
      bg.on("pointerover", () => { if (slot.status) detail.setText(slot.status).setVisible(true); });
      bg.on("pointerout", () => detail.setVisible(false));
      return slot;
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
    bar.lustre?.setY(y);
    if (bar.edge) bar.edge.setY(y);
    bar.valueText.setY(y);
    if (bar.centerIcon) bar.centerIcon.setY(y);
    if (bar.maskShape) bar.maskShape.setPosition(bar.x, y);
  }

  applyBattleInterfaceTheme(themeId = this.hudTheme) {
    const resolvedThemeId = BATTLE_INTERFACE_SKINS[themeId] ? themeId : "ancestral";
    const skin = BATTLE_INTERFACE_SKINS[resolvedThemeId];
    if (this.timelineThemeParts) {
      const { chrome, ticks, preparationStart, trackY } = this.timelineThemeParts;
      const { x, y, width, height, start, end } = HUD_ART.timeline;
      chrome.clear();
      drawInitiativeFrame(chrome, x - 8, y, width + 16, height);
      chrome.fillStyle(HUD_ART.wine, 1).fillRoundedRect(start - 1, trackY - 6, end - start + 2, 12, 6);
      chrome.fillStyle(0x9b322d, 0.7).fillRoundedRect(preparationStart, trackY - 4, end - preparationStart - 8, 8, 3);
      chrome.lineStyle(1.8, HUD_ART.gold, 1).strokeRoundedRect(start - 1, trackY - 6, end - start + 2, 12, 6);
      chrome.lineStyle(0.8, HUD_ART.light, 0.6).lineBetween(start + 5, trackY - 4, end - 5, trackY - 4);
      drawTimelineTail(chrome, start - 13, trackY);
      chromePath(chrome, [['M', -16, -11], ['L', 5, 0], ['L', -16, 11], ['L', -12, 0], ['Z']], { x: end, y: trackY, fill: HUD_ART.gold, stroke: 0xf4ce7e, width: .7 });
      chrome.lineStyle(1, HUD_ART.light, 0.8).lineBetween(preparationStart, trackY - 9, preparationStart, trackY + 9);
      drawCloudPlate(chrome, 401, 453, 173, 19, HUD_ART.inkDeep);
      ticks.clear();
      timelineMilestones(start, end).filter((tick) => tick < preparationStart).forEach((tick) => {
        ticks.fillStyle(HUD_ART.gold, 1).fillTriangle(tick, trackY - 9, tick - 2, trackY - 5, tick + 2, trackY - 5);
        ticks.fillStyle(HUD_ART.light, 1).fillCircle(tick, trackY, 4.5);
        ticks.lineStyle(1.2, 0x35140d, 1).strokeCircle(tick, trackY, 4.5);
      });
    }
    paintActionBackdrop(this.actionBackdropThemeParts, skin);
    this.actionSlots?.forEach((button) => button.applyTheme?.(skin));
  }

  enemyRankForProfile(profile) {
    return Math.max(1, Math.floor(Number(profile?.level) || 1));
  }

  createTurnTimeline() {
    this.timelineLayer = this.add.container(0, 0).setDepth(30);
    const { start, end, trackY } = HUD_ART.timeline;
    const preparationStart = timelineMarkerPosition(0.8, start, end);
    const chrome = this.add.graphics();
    const ticks = this.add.graphics();
    const progressGlow = this.add.rectangle(start, trackY, 1, 6, HUD_ART.light, 0.3).setOrigin(0, 0.5);
    const title = this.add.text(487, 463, "ORDEN DE TURNO", { fontFamily: HUD_ART.font, fontSize: "11px", fontStyle: "bold", color: HUD_ART.text }).setOrigin(0.5);
    // Keep both phases explicit: this is the real 80–100 % preparation zone.
    const preparationLabel = this.add.text((preparationStart + end) / 2, 477, "PREPARACIÓN", { fontFamily: '"Alegreya Sans", sans-serif', fontSize: "7px", color: "#d4b77a" }).setOrigin(0.5);
    this.playerMarkerHalo = this.add.circle(start, trackY, 19, 0x07101d, 1).setStrokeStyle(2, HUD_ART.light, 1);
    this.enemyMarkerHalo = this.add.circle(start, trackY, 17, 0x07101d, 1).setStrokeStyle(1.5, HUD_ART.gold, 1);
    const markerHairStyle = this.playerAppearance()?.hair;
    this.playerTurnMarker = this.add.image(start, trackY, fighterPuppetTextureKey(this.playerAppearance(), "cabeza")).setDisplaySize(22, 34);
    this.enemyTurnMarker = this.add.image(start, trackY, fighterPuppetTextureKey(this.enemyAppearance(), "cabeza")).setDisplaySize(21, 32).setFlipX(false);
    const hairKey = ({ 1: "player-hair-corto", 4: "player-hair-coleta" })[markerHairStyle];
    this.playerMarkerHairLayout = fighterHairPortraitLayout(markerHairStyle, 22, 34, false, this.playerAppearance()?.bodyType);
    this.playerMarkerHair = hairKey && this.textures.exists(hairKey)
      ? this.add.image(start + this.playerMarkerHairLayout.x, trackY + this.playerMarkerHairLayout.y, hairKey).setDisplaySize(this.playerMarkerHairLayout.width, this.playerMarkerHairLayout.height)
      : null;
    const tag = (name) => {
      const bg = this.add.graphics().setPosition(start, 518);
      drawBeveledTag(bg);
      const text = this.add.text(start, 518, name.toUpperCase(), { fontFamily: HUD_ART.font, fontSize: "9px", color: HUD_ART.text, fontStyle: "bold" }).setOrigin(0.5);
      return { bg, text };
    };
    this.playerTimelineTag = tag(this.saveData.character.name);
    this.enemyTimelineTag = tag(this.encounters[this.enemyIndex].name);
    this.timelineLayer.add([chrome, progressGlow, ticks, preparationLabel, title,
      this.playerMarkerHalo, this.enemyMarkerHalo, this.playerTurnMarker, this.enemyTurnMarker,
      ...[this.playerMarkerHair].filter(Boolean),
      this.playerTimelineTag.bg, this.playerTimelineTag.text, this.enemyTimelineTag.bg, this.enemyTimelineTag.text]);
    this.timelineThemeParts = { chrome, ticks, progressGlow, title, preparationLabel, preparationStart, trackY };
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

  refreshBattlePhase() {
    if (!this.phaseLabel) return;
    const name = this.saveData.character.name.toUpperCase();
    const enemy = this.encounters[this.enemyIndex].name.toUpperCase();
    const actor = this.pendingActions?.player ? name : enemy;
    const text = this.finished ? "COMBATE FINALIZADO"
      : this.scene.isPaused() ? "COMBATE EN PAUSA"
      : this.turnReady ? `TURNO DE ${name}`
      : this.busy ? "EN COMBATE"
      : this.pendingActions?.player || this.pendingActions?.enemy ? `PREPARA ${actor}` : "INICIATIVA";
    if (this.phaseLabel.text !== text) this.phaseLabel.setText(text).setFontSize(Math.min(14, 175 / Math.max(text.length, 1) * 1.6));
    this.accessibleHud?.refresh();
  }

  createPauseButton() {
    const bg = this.add.circle(480, 67, 18, HUD_ART.ink, 0.96).setStrokeStyle(1.1, 0x8adeee, 1)
      .setDepth(25).setInteractive({ useHandCursor: true });
    const label = this.add.graphics().setDepth(26);
    label.fillStyle(0x99dff8, 1).fillRect(475.5, 61, 3, 13).fillRect(481.5, 61, 3, 13);
    bg.on("pointerover", () => bg.setFillStyle(0x23415b, 1));
    bg.on("pointerout", () => bg.setFillStyle(HUD_ART.ink, 0.96));
    bg.on("pointerdown", () => bg.setFillStyle(HUD_ART.wine, 1));
    this.openBattlePause = () => {
      if (this.finished || !isSceneActive(this.scene)) return;
      this.scene.launch("pause");
      if (!pauseSceneIfActive(this.scene)) {
        stopSceneIfRunning(this.scene, "pause");
        return;
      }
      this.refreshBattlePhase();
    };
    bg.on("pointerup", this.openBattlePause);
    this.input.keyboard.on("keydown-ESC", this.openBattlePause);
    const onResume = () => this.refreshBattlePhase();
    this.events.on(Phaser.Scenes.Events.RESUME, onResume);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.RESUME, onResume);
      this.input.keyboard.off("keydown-ESC", this.openBattlePause);
    });
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
    const previousProgress = { ...this.timelineProgress };
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
    const resetClock = { value: 0 };
    await new Promise((resolve) => this.tweens.add({
      targets: resetClock,
      value: 1,
      duration: 330,
      ease: "Cubic.inOut",
      onUpdate: () => this.updateTimelineMarkers({
        player: previousProgress.player * (1 - resetClock.value),
        enemy: previousProgress.enemy * (1 - resetClock.value)
      }),
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
    const { start, end, trackY } = HUD_ART.timeline;
    const playerX = timelineMarkerPosition(progress.player, start, end);
    const enemyX = timelineMarkerPosition(progress.enemy, start, end);
    const overlap = Math.abs(playerX - enemyX) < 42;
    const playerY = overlap ? trackY - 11 : trackY;
    const enemyY = overlap ? trackY + 10 : trackY;
    this.playerTurnMarker.setPosition(playerX, playerY);
    this.enemyTurnMarker.setPosition(enemyX, enemyY);
    this.playerMarkerHalo?.setPosition(playerX, playerY);
    this.enemyMarkerHalo?.setPosition(enemyX, enemyY);
    this.playerMarkerHair?.setPosition(playerX + this.playerMarkerHairLayout.x, playerY + this.playerMarkerHairLayout.y);
    this.timelinePortraitMasks?.[0].setPosition(playerX, playerY);
    this.timelinePortraitMasks?.[1].setPosition(enemyX, enemyY);
    const labelOverlap = Math.abs(playerX - enemyX) < 73;
    const playerTagX = labelOverlap ? Math.min(playerX, enemyX) - 34 : playerX;
    const enemyTagX = labelOverlap ? Math.max(playerX, enemyX) + 34 : enemyX;
    for (const [tag, x] of [[this.playerTimelineTag, playerTagX], [this.enemyTimelineTag, enemyTagX]]) {
      tag?.bg.setX(x); tag?.text.setX(x);
    }
    if (this.timelineThemeParts?.progressGlow) {
      this.timelineThemeParts.progressGlow.width = Math.max(0, playerX - start);
    }
    this.accessibleHud?.updateProgress(progress);
  }

  setTimelineMarkerState(actor, state, action = null) {
    const marker = actor === "player" ? this.playerTurnMarker : this.enemyTurnMarker;
    if (!marker) return;
    const halo = actor === "player" ? this.playerMarkerHalo : this.enemyMarkerHalo;
    marker.clearTint().setAlpha(state === "charging" ? 0.92 : 1).setAngle(0);
    halo?.setStrokeStyle(state === "ready" ? 2.5 : 1.4, state === "ready" ? 0xffe6a0 : HUD_ART.gold, 1);
    this.refreshBattlePhase();
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
      this.combatTutorial?.onReady();
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
    const ground = this.arenaVisuals?.profile.grounding;
    if (!ground || !fighter?.shadow?.scene) return;
    fighter.shadow.setFillStyle(ground.color, ground.alpha)
      .setStrokeStyle(ground.strokeWidth, ground.strokeColor, ground.strokeAlpha).setScale(ground.scaleX, ground.scaleY);
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
        .setTint(0x8d4de8)
        .setTintMode(Phaser.TintModes.FILL)
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

  refreshActionPanelFilter() {
    const parts = this.actionBackdropThemeParts;
    if (!parts) return;
    const allowed = this.game.renderer.type === Phaser.WEBGL && !this.lightMode
      && !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const filters = parts.haze.filters?.internal;
    if (!allowed) {
      if (parts.blur && filters?.list.includes(parts.blur)) filters.remove(parts.blur);
      parts.blur = null;
    } else if (!parts.blur || !filters?.list.includes(parts.blur)) {
      const skin = BATTLE_INTERFACE_SKINS[this.hudTheme] || BATTLE_INTERFACE_SKINS.ancestral;
      parts.blur = parts.haze.enableFilters().filters.internal.addBlur(0, 2, 2, 1.25, skin.panel, 3);
    }
  }

  createActionPanel() {
    const firstActionChild = this.children.list.length;
    this.buttons = [];
    this.actionSlots = [];
    const interfaceSkin = BATTLE_INTERFACE_SKINS[this.hudTheme] || BATTLE_INTERFACE_SKINS.ancestral;
    const haze = this.add.graphics().setDepth(29);
    const surface = this.add.graphics().setDepth(30);
    this.actionBackdropThemeParts = { haze, surface, blur: null };
    this.refreshActionPanelFilter();
    paintActionBackdrop(this.actionBackdropThemeParts, interfaceSkin);

    const hideTooltip = (entry) => {
      if (entry.tooltipTimer) {
        entry.tooltipTimer.remove(false);
        entry.tooltipTimer = null;
      }
      entry.tooltip.layer.setVisible(false);
      entry.hoverRing.setVisible(Boolean(entry.selected));
    };
    this.selectHudAction = (index) => {
      this.buttons.forEach((entry) => {
        entry.selected = entry === this.actionSlots[index];
        entry.hoverRing.setVisible(entry.selected);
      });
      this.accessibleHud?.refresh();
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
        this.selectHudAction(index);
        if (button.available) this.useJutsu(jutsu);
      });
      this.buttons.push(button);
    }

    if (this.buttons[0]) {
      this.buttons[0].selected = true;
      this.buttons[0].hoverRing.setVisible(true).setAlpha(0.5);
    }

    this.actionCanvasParts = this.children.list.slice(firstActionChild).filter(part => part.depth < 58);
    this.onActionShortcut = (event) => {
      const index = Number(event.key) - 1;
      if (index < 0 || index >= this.actions.length) return;
      const jutsu = this.actions[index];
      if (this.actionSlots[index]?.available) this.selectHudAction(index);
      if (jutsu) this.useJutsu(jutsu);
    };
    this.input.keyboard.on("keydown", this.onActionShortcut);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard.off("keydown", this.onActionShortcut));
    this.applyBattleInterfaceTheme(this.hudTheme);
  }

}
