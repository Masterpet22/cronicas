import { drawStatusPanel, drawTurnPlaque, drawInitiativeFrame, drawResourceEmblem, chromePath } from "../hud-chrome.js?v=0.171.0";
import { HUD_ART, drawOrnatePanel } from "../hud-art.js?v=0.171.0";
import { SEALS, BASE_ACTIONS, JUTSU_LIBRARY, ENEMY_ACTIONS, ENEMY_ROSTER } from "../../data.js?v=1.5.0";
import { applyStatus, affinityLabel, hasStatus, hitChance } from "../../rules.js?v=0.20.0";
import { hairTextureKey, createPlayerFighter, preparePlayerFighterTextures, useFighterTextureRendering, destroyFighter, fighterCombatPortraitLayout, fighterFaceTextureKey, fighterAtlasKey, playFighterDamageReaction, preparePlayerPunch, queuePlayerFighterTextures, recoverPlayerPunch, releasePlayerPunch, startPlayerBreathing, startPlayerGuard, startPlayerPreparing, startPlayerRunning, stopPlayerGuard, stopPlayerPreparing, stopPlayerRunning } from "../../fighters.js?v=0.171.0";
import { enemyFighterAppearance, playerFighterAppearance } from "../../character.js?v=0.171.0";
import { actionLines, createActionButton, createBar } from "../../ui.js?v=0.171.0";
import { awardEncounter, cancelDoctorMission, completeMission, derivedStats, masterIdForCharacter, recordBestiaryObservation, resolveDoctorMissionCombat, writeSave } from "../../save.js?v=0.171.0";
import { ELEMENTS, elementIcon } from "../../elements.js?v=0.20.0";
import { createUiIcon, loadUiIcons } from "../../icons.js?v=0.44.0";
import { missionStep } from "../../mission-system.js?v=0.155.0";
import { getMissionSceneDialogue } from "../../dialogues.js?v=0.155.0";
import { bossPhaseMessage, combatFeatures, fieldSuppliesForBattle, resolveEncounterIds } from "../../combat-modifiers.js?v=0.155.0";
import { resolveDamage } from "../damage.js?v=0.114.0";
import { createEnemyState } from "../enemy-state.js?v=0.155.0";
import { advanceCooldowns, combatantEvasion, combatantSpeed, nextEnemyAction, resolveStatusTick, soakAfterTurn, waterSoakAfterAttack } from "../turn.js?v=1.4.0";
import { addBattleReward, bestiaryObservation, createBattleResult, emptyBattleRewards } from "../rewards.js?v=0.114.0";
import { bindBattleState, createBattleState } from "../battle-state.js?v=0.68.0";
import { actionNeedsPreparation, advanceTimelineProgress, millisecondsToTimelineThreshold, timelineMarkerPosition, timelineMilestones } from "../timeline.js?v=0.69.0";
import { COMBAT_SLOTS, combatFighterDepth } from "../combat-positions.js?v=0.153.0";
import { paintTimelinePortraits } from "../timeline-hud.js?v=1.0.0";
import { drawTargetCorners } from "../fighter-indicators.js?v=1.0.0";


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
      || BATTLE_ARENAS[((this.mission.arenaNumber || this.mission.number || 1) - 1) % BATTLE_ARENAS.length];
    mountArenaVisuals(this, arena, { width: WIDTH, height: HEIGHT });
  }

  createHud() {
    preparePlayerFighterTextures(this, this.playerAppearance());
    preparePlayerFighterTextures(this, this.enemyAppearance());
    const firstHudChild = this.children.list.length;
    const healthFrameY = 49;
    const chakraFrameY = 72;
    const healthBarWidth = 170;
    const chakraBarWidth = 170;
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
      { iconX: WIDTH - 111, labelOffset: -16, labelOrigin: 1 }
    ]) {
      drawResourceEmblem(this, "health", iconX, healthFrameY);
      drawResourceEmblem(this, "chakra", iconX, chakraFrameY);
      for (const [label, y] of [["PV", healthFrameY], ["CH", chakraFrameY]]) {
        this.add.text(iconX + labelOffset, y, label, { fontFamily: HUD_ART.font, fontSize: "11px", color: HUD_ART.text, fontStyle: "bold" }).setOrigin(labelOrigin, 0.5).setDepth(25);
      }
    }
    this.playerRankStar = this.createLevelBadge(295, 25, `NV ${this.saveData.progression.level}`);
    this.playerRankNumber = this.playerRankStar.text;
    this.enemyRankStar = this.createLevelBadge(650, 25, `NV ${this.enemyRankForProfile(this.encounters[this.enemyIndex])}`);
    this.enemyRankNumber = this.enemyRankStar.text;
    this.playerPortrait = this.createCombatPortrait(61, 50, this.playerAppearance(), false);
    this.enemyPortrait = this.createCombatPortrait(900, 50, this.enemyAppearance(), true);
    this.playerTurnAccent = this.add.graphics().setDepth(27).setAlpha(0);
    this.playerTurnAccent.lineStyle(2, 0x92dfed, 1).lineBetween(117, 35, 155, 35);
    this.targetPortraitAccent = this.add.graphics().setDepth(27);
    drawTargetCorners(this.targetPortraitAccent, 872, 22, 928, 78, 7, 1.5);
    this.playerStatusSlots = this.createStatusRow(168, 86, "ltr");
    this.enemyStatusSlots = this.createStatusRow(WIDTH - 168, 86, "rtl");
    this.hudFrames = { health: [], chakra: [] };
    this.applyHudTheme(this.hudTheme);
    [this.playerHpBar, this.chakraBar, this.enemyHpBar, this.enemyChakraBar].forEach((bar) => {
      bar.bg.setDepth(21); bar.slot.setDepth(21);
      bar.ghost?.setDepth(22); bar.fill.setDepth(22);
      bar.edge.setDepth(24);
      const mirrored = bar.direction === "rtl";
      bar.valueText.setOrigin(mirrored ? 0 : 1, 0.5).setX(mirrored ? bar.x + 8 : bar.x + bar.width - 8).setFontSize(12).setDepth(25);
    });
    const phaseChrome = this.add.graphics().setDepth(24);
    drawTurnPlaque(phaseChrome, 356, 12, 248, 30);
    this.phaseLabel = this.add.text(480, 27, "INICIATIVA", {
      fontFamily: HUD_ART.font, fontSize: "14px", fontStyle: "bold", color: HUD_ART.text, stroke: "#170607", strokeThickness: 2
    }).setOrigin(0.5).setDepth(25);
    this.refreshHud();
    this.hudCanvasParts = this.children.list.slice(firstHudChild).filter(part => part.depth < 58);
    this.sealLayer = this.add.container(WIDTH / 2, 120).setDepth(30);
  }

  paintHudLacquerChrome({ playerHealthX, playerChakraX, enemyHealthX, enemyChakraX, healthFrameY, chakraFrameY, healthBarWidth, chakraBarWidth }) {
    const g = this.hudLacquerChrome;
    g.clear();
    drawStatusPanel(g, 23, 12, 310, 84);
    g.fillStyle(HUD_ART.inkDeep, .96).fillRoundedRect(632, 13, 302, 83, 10);
    g.lineStyle(1, 0x967044, 1).strokeRoundedRect(632, 13, 302, 83, 10);
    for (const [x, y, width] of [[playerHealthX, healthFrameY, healthBarWidth], [enemyHealthX, healthFrameY, healthBarWidth], [playerChakraX, chakraFrameY, chakraBarWidth], [enemyChakraX, chakraFrameY, chakraBarWidth]]) {
      g.fillStyle(0x02070d, 1).fillRoundedRect(x - 3, y - 10, width + 6, 20, 10);
      const primary = x < WIDTH / 2;
      g.lineStyle(primary ? 1.2 : .7, HUD_ART.gold, primary ? 1 : .65).strokeRoundedRect(x - 2, y - 9, width + 4, 18, 9);
      if (primary) g.lineStyle(0.6, HUD_ART.light, 0.5).lineBetween(x + 8, y - 7, x + width - 8, y - 7);
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
    const radius = flipped ? 25 : 34;
    const shadow = this.add.circle(x, y + 2, radius, 0x02050a, 0.9).setDepth(23);
    const wash = this.add.circle(x, y, radius - 4, 0x182536, 0.96).setDepth(24);
    const layout = fighterCombatPortraitLayout(appearance, flipped, radius - 6);
    const head = this.add.image(x + layout.head.x, y + layout.head.y, fighterAtlasKey(appearance), "cabeza").setDisplaySize(layout.head.width, layout.head.height).setFlipX(flipped).setDepth(25);
    const face = this.add.image(x + layout.head.x, y + layout.head.y, fighterFaceTextureKey(appearance)).setDisplaySize(layout.head.width, layout.head.height).setFlipX(flipped).setDepth(25.5);
    useFighterTextureRendering(face);
    const hairKey = hairTextureKey(appearance?.hair);
    const hairLayout = layout.hair;
    const hair = this.add.image(x + (hairLayout?.x || 0), y + (hairLayout?.y || 0), hairKey || fighterFaceTextureKey(appearance))
      .setDisplaySize(hairLayout?.width || 1, hairLayout?.height || 1).setFlipX(flipped).setDepth(26).setVisible(Boolean(hairKey));
    if (hair) useFighterTextureRendering(hair);
    const frame = this.add.graphics().setDepth(27);
    const side = flipped ? 1 : -1;
    let affinity = null;
    const setAffinity = id => {
      if (affinity === id || !ELEMENTS[id]) return;
      affinity = id;
      const color = ELEMENTS[id].color;
      frame.clear();
      if (!flipped) chromePath(frame, [['M', 0, 8], ['L', 10, -3], ['L', 7, 7], ['L', 16, 12], ['L', 5, 10], ['Z']], { x: x + side * 31, y: y - 31, sx: side, fill: color, width: .9 });
      frame.lineStyle(flipped ? 2 : 5, color, 1).strokeCircle(x, y, radius);
      frame.lineStyle(flipped ? .7 : 1.5, HUD_ART.gold, 1).strokeCircle(x, y, radius + 2);
      if (!flipped) {
        frame.lineStyle(1, HUD_ART.light, 0.8).strokeCircle(x, y, 32);
        frame.lineStyle(1.5, 0xd0a04f, 0.95).strokeCircle(x, y, 29);
        frame.lineStyle(1, 0xf2d88c, 0.3).strokeCircle(x - 1, y - 1, 26);
      }
    };
    setAffinity(flipped ? this.enemy.primaryAffinity : this.player.primaryAffinity);
    let lookKey = '';
    const setAppearance = next => {
      const nextKey = JSON.stringify(next);
      const nextHairKey = hairTextureKey(next.hair);
      hair.setVisible(Boolean(nextHairKey) && head.visible);
      if (nextKey === lookKey) return;
      lookKey = nextKey;
      preparePlayerFighterTextures(this, next);
      const nextLayout = fighterCombatPortraitLayout(next, flipped, radius - 6);
      head.setTexture(fighterAtlasKey(next), 'cabeza').setPosition(x + nextLayout.head.x, y + nextLayout.head.y)
        .setDisplaySize(nextLayout.head.width, nextLayout.head.height);
      face.setTexture(fighterFaceTextureKey(next)).setPosition(head.x, head.y).setDisplaySize(head.displayWidth, head.displayHeight);
      if (nextHairKey && nextLayout.hair) hair.setTexture(nextHairKey)
        .setPosition(x + nextLayout.hair.x, y + nextLayout.hair.y).setDisplaySize(nextLayout.hair.width, nextLayout.hair.height);
    };
    setAppearance(appearance);
    return { shadow, wash, head, face, hair, frame, setAffinity, setAppearance, get affinity() { return affinity; } };
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
      chrome.fillStyle(0x030810, 1).fillRect(start - 3, trackY - 5, end - start + 6, 10);
      chrome.fillStyle(0x271a24, 1).fillRect(start, trackY - 3, end - start, 6);
      chrome.fillStyle(0x833b34, 1).fillRect(preparationStart, trackY - 3, end - preparationStart, 6);
      chrome.lineStyle(1, 0xa47b4d, 1).strokeRect(start - 3, trackY - 5, end - start + 6, 10);
      chrome.lineStyle(.65, HUD_ART.light, .5).lineBetween(start, trackY - 3, end, trackY - 3);
      chrome.lineStyle(1, HUD_ART.light, 0.8).lineBetween(preparationStart, trackY - 9, preparationStart, trackY + 9);
      drawTurnPlaque(chrome, 350, 454, 268, 21, HUD_ART.inkDeep);
      ticks.clear();
      timelineMilestones(start, end).filter((tick) => tick < preparationStart).forEach((tick) => {
        ticks.lineStyle(1, HUD_ART.light, .8).lineBetween(tick, trackY - 4, tick, trackY + 4);
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
    const title = this.add.text(484, 465, "ORDEN DE TURNO", { fontFamily: HUD_ART.font, fontSize: "12px", fontStyle: "bold", color: HUD_ART.text }).setOrigin(0.5);
    // Keep both phases explicit: this is the real 80–100 % preparation zone.
    const preparationLabel = this.add.text((preparationStart + end) / 2, 470, "PREPARACIÓN", { fontFamily: '"Alegreya Sans", sans-serif', fontSize: "9px", color: "#f5e1af", backgroundColor: "#07101d", padding: { x: 4, y: 2 } }).setOrigin(0.5);
    const links = this.add.graphics();
    const portraits = ["player", "enemy"].map(actor => {
      const look = actor === "player" ? this.playerAppearance() : this.enemyAppearance();
      const layout = fighterCombatPortraitLayout(look, false, 11);
      const halo = this.add.circle(start, trackY, 12, 0x07101d, 1);
      const marker = this.add.image(start, trackY, fighterAtlasKey(look), "cabeza").setDisplaySize(layout.head.width, layout.head.height);
      const face = useFighterTextureRendering(this.add.image(start, trackY, fighterFaceTextureKey(look))
        .setDisplaySize(layout.head.width, layout.head.height));
      const hairKey = hairTextureKey(look.hair);
      const hair = useFighterTextureRendering(this.add.image(start, trackY, hairKey || fighterFaceTextureKey(look))
        .setDisplaySize(layout.hair?.width || 1, layout.hair?.height || 1).setVisible(Boolean(hairKey && layout.hair)));
      this[`${actor}TurnMarker`] = marker;
      this[`${actor}MarkerHalo`] = halo;
      this[`${actor}MarkerFace`] = face;
      this[`${actor}MarkerHair`] = hair;
      this[`${actor}TimelinePortraitLayout`] = layout;
      return [halo, marker, face, hair];
    });
    this.timelineLayer.add([chrome, progressGlow, ticks, preparationLabel, title, links, ...portraits.flat()]);
    this.timelineThemeParts = { chrome, ticks, progressGlow, title, links, preparationStart, trackY };
    this.timelineNextActor = null;
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

  bindBattlePause() {
    this.pauseOpening = false;
    this.openBattlePause = () => {
      if (this.finished || this.pauseOpening || !isSceneActive(this.scene)) return;
      // launch/pause se encolan hasta el siguiente frame; bloquear también ese intervalo.
      this.pauseOpening = true;
      this.scene.launch("pause");
      if (!pauseSceneIfActive(this.scene)) {
        this.pauseOpening = false;
        stopSceneIfRunning(this.scene, "pause");
        return;
      }
      this.refreshBattlePhase();
    };
    this.input.keyboard.on("keydown-ESC", this.openBattlePause);
    const onResume = () => { this.pauseOpening = false; this.refreshBattlePhase(); };
    this.events.on(Phaser.Scenes.Events.RESUME, onResume);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.RESUME, onResume);
      this.input.keyboard.off("keydown-ESC", this.openBattlePause);
    });
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
    this.player.recoveryInitiative = 0;
    this.enemy.recoveryInitiative = 0;
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
    const { start, end } = HUD_ART.timeline;
    const playerX = timelineMarkerPosition(progress.player, start, end);
    paintTimelinePortraits(this, [
      { id: "player", lane: 0, progress: progress.player, name: this.saveData.character.name,
        place: (x, y, highlighted) => this.placeTimelinePortrait("player", x, y, highlighted) },
      { id: "enemy", lane: 1, progress: progress.enemy, name: this.encounters[this.enemyIndex].name,
        place: (x, y, highlighted) => this.placeTimelinePortrait("enemy", x, y, highlighted) }
    ]);
    this.timelineThemeParts.progressGlow.width = Math.max(0, playerX - start);
    this.accessibleHud?.updateProgress(progress);
  }

  placeTimelinePortrait(actor, x, y, highlighted) {
    const halo = this[`${actor}MarkerHalo`];
    const color = highlighted ? 0xffdf92 : actor === "player" ? 0x83c6d4 : HUD_ART.gold;
    const width = highlighted ? 2 : 1.2;
    if (halo.lineWidth !== width || halo.strokeColor !== color) halo.setStrokeStyle(width, color);
    halo.setPosition(x, y);
    const { head, hair } = this[`${actor}TimelinePortraitLayout`];
    this[`${actor}TurnMarker`].setPosition(x + head.x, y + head.y);
    this[`${actor}MarkerFace`].setPosition(x + head.x, y + head.y);
    if (hair) this[`${actor}MarkerHair`].setPosition(x + hair.x, y + hair.y);
  }

  setTimelineMarkerState(actor, state, action = null) {
    const marker = actor === "player" ? this.playerTurnMarker : this.enemyTurnMarker;
    if (!marker) return;
    marker.clearTint().setAlpha(state === "charging" ? 0.92 : 1).setAngle(0);
    this.updateTimelineMarkers();
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
    const fighter = actor === "player" ? this.hero : this.foe;
    if (!fighter?.body || !action) return;
    startPlayerPreparing(this, fighter);
    this.setTimelineMarkerState(actor, "preparing", action);
    const previous = this.preparationFeedback[actor];
    if (previous?.fighter === fighter && previous.action === action && previous.ribbon.active) return;
    this.destroyPreparationVisual(actor);
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
    const feedback = { fighter, action, ribbon, ...particleFeedback };
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
    const world = new Phaser.GameObjects.Components.TransformMatrix();
    const parent = new Phaser.GameObjects.Components.TransformMatrix();
    const point = { x: 0, y: 0 };
    const sync = () => {
      hands.forEach((hand, index) => {
        const emitter = emitters[index];
        if (!hand?.active || !emitter?.active) return;
        hand.getWorldTransformMatrix(world, parent).transformPoint(0, 0, point);
        if (emitter.x !== point.x || emitter.y !== point.y) emitter.setPosition(point.x, point.y);
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
        initiative: this[actor].recoveryInitiative,
        duration: millisecondsToTimelineThreshold(this.timelineProgress[actor], speed, action, this[actor].recoveryInitiative)
      };
    });
    const duration = Math.min(...timings.map((entry) => entry.duration));
    const priority = ({ action, actor }) => action ? (actor === "player" ? 0 : 1) : actor === "enemy" ? 2 : 3;
    const arrivals = timings.filter((entry) => Math.abs(entry.duration - duration) < 0.5)
      .sort((left, right) => priority(left) - priority(right));
    this.timelineNextActor = arrivals[0].actor;
    this.updateTimelineMarkers();
    if (duration <= 0) {
      this.time.delayedCall(0, () => this.handleTimelineArrivals(arrivals));
      return;
    }

    const from = { ...this.timelineProgress };
    const to = Object.fromEntries(timings.map(({ actor, action, speed, initiative }) => [
      actor,
      advanceTimelineProgress(from[actor], speed, duration, action, initiative)
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
    const [arrival] = arrivals;
    if (!arrival) return;

    if (arrival.action) {
      await this.executeTimelineAction(arrival.actor, arrival.action);
      return;
    }

    // El modificador se agota al llegar al 80 %; no afecta la preparación.
    this[arrival.actor].recoveryInitiative = 0;

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

  createFighters(enemyPosition) {
    const { x, y } = COMBAT_SLOTS.protagonist;
    this.hero = createPlayerFighter(this, x, y, this.playerAppearance());
    this.styleFighterGrounding(this.hero);
    this.foe = this.createEnemyFighterAt(enemyPosition);
    this.bossPhaseSilhouette = null;
  }

  createEnemyFighterAt(position = COMBAT_SLOTS.enemyCenter, entryOffset = 0) {
    const fighter = createPlayerFighter(this, position.x + entryOffset, position.y, this.enemyAppearance(), true);
    fighter.body.setDepth(combatFighterDepth(position));
    this.styleFighterGrounding(fighter);
    return fighter;
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
    this.selectedHudActionId = this.actions[0]?.id;
    this.selectHudAction = (index) => {
      this.selectedHudActionId = this.actions[index]?.id;
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
    // Phaser can deliver the same native event again before clearing its queue.
    // A physical key press must only activate its action once.
    const handledShortcutEvents = new WeakSet();
    this.onActionShortcut = (event) => {
      if (event.key === "Tab") {
        if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || event.repeat || event.defaultPrevented || handledShortcutEvents.has(event)
          || event.target?.closest?.("dialog, input, textarea, select, [contenteditable=true], .combat-access-utilities, .combat-access-actions, .combat-table-switch, .combat-skill-detail, .training-target-hit, .combat-roster-card")) return;
        handledShortcutEvents.add(event);
        if (this.accessibleHud?.toggleSkillTable?.()) event.preventDefault();
        return;
      }
      const index = Number(event.key) - 1;
      if (!Number.isInteger(index) || index < 0 || index >= this.actions.length || handledShortcutEvents.has(event)) return;
      handledShortcutEvents.add(event);
      if (this.accessibleHud?.activateAction) { this.accessibleHud.activateAction(index); return; }
      const jutsu = this.actions[index];
      if (this.actionSlots[index]?.available) this.selectHudAction(index);
      if (jutsu) this.useJutsu(jutsu);
    };
    this.input.keyboard.on("keydown", this.onActionShortcut);
    // Tab must be consumed before the browser moves focus, rather than next frame.
    const onTableShortcut = event => {
      if (event.key === "Tab" && isSceneActive(this.scene)) this.onActionShortcut(event);
    };
    document.addEventListener("keydown", onTableShortcut);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard.off("keydown", this.onActionShortcut);
      document.removeEventListener("keydown", onTableShortcut);
    });
    this.applyBattleInterfaceTheme(this.hudTheme);
  }

}
