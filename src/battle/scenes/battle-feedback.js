import { actionChakraCost } from "../../chakra-balance.js?v=1.0.0";
import { SEALS, BASE_ACTIONS, JUTSU_LIBRARY, ENEMY_ACTIONS, ENEMY_ROSTER } from "../../data.js?v=1.5.0";
import { applyStatus, affinityLabel, hasStatus, hitChance } from "../../rules.js?v=0.20.0";
import { AFFINITY_CONFIG, affinityCycleModifier, furyDamageBonus, reprisalChance, reprisalDamage } from "../../affinity-system.js?v=0.114.0";
import { hairTextureKey, fighterAtlasKey, fighterFaceTextureKey, fighterCombatPortraitLayout, createPlayerFighter, destroyFighter, playFighterDamageReaction, preparePlayerPunch, queuePlayerFighterTextures, recoverPlayerPunch, releasePlayerPunch, startPlayerGuard, startPlayerRunning, stopPlayerGuard, stopPlayerRunning } from "../../fighters.js?v=0.171.0";
import { enemyFighterAppearance, playerFighterAppearance } from "../../character.js?v=0.171.0";
import { actionLines, createActionButton, createBar } from "../../ui.js?v=0.171.0";
import { abandonMissionProgress, awardEncounter, cancelDoctorMission, completeMission, derivedStats, levelUpReport, masterIdForCharacter, recordBestiaryObservation, resolveDoctorMissionCombat, writeSave } from "../../save.js?v=0.171.0";
import { elementIcon } from "../../elements.js?v=0.20.0";
import { createUiIcon, loadUiIcons } from "../../icons.js?v=0.44.0";
import { missionStep } from "../../mission-system.js?v=0.155.0";
import { getMissionSceneDialogue } from "../../dialogues.js?v=0.155.0";
import { bossPhaseMessage, combatFeatures, fieldSuppliesForBattle, resolveEncounterIds } from "../../combat-modifiers.js?v=0.155.0";
import { resolveDamage } from "../damage.js?v=0.114.0";
import { createEnemyState } from "../enemy-state.js?v=0.155.0";
import { advanceCooldowns, combatantEvasion, combatantSpeed, nextEnemyAction, resolveStatusTick, soakAfterTurn, waterSoakAfterAttack } from "../turn.js?v=1.4.0";
import { addBattleReward, bestiaryObservation, createBattleResult, emptyBattleRewards } from "../rewards.js?v=0.114.0";
import { bindBattleState, createBattleState } from "../battle-state.js?v=0.68.0";


import { BATTLE_ARENAS, HEIGHT, HUD_THEMES, Phaser, RANK_LEVELS, TECHNIQUE_VFX, TECHNIQUE_VFX_FRAMES, TIMELINE_END, TIMELINE_START, WIDTH, battleRuntime, drawCubicBezier, sharpenTextTree } from "../runtime.js?v=0.91.0";
import { discardVictory } from "../victory-transaction.js?v=0.95.0";
import { availableRetries, consumeRetry, restoreDuel, showRetryDialog } from "../mission-retries.js?v=0.114.0";
import { countItem } from "../../inventory.js?v=0.171.0";
import { consumeBattleItem } from "../battle-inventory.js?v=0.171.0";
import { acquireEffect } from "../effect-pool.js?v=1.0.0";

const statusGlyphs = { burn: "火", bleed: "血", stun: "雷", soak: "水", guard: "守", poison: "毒", slow: "鈍", seal: "封" };
const statusColors = { burn: 0xe57343, bleed: 0xc6534f, stun: 0xe0bd55, soak: 0x59b9d1, guard: 0x8fb39f, poison: 0x9d7ab6, slow: 0x7790a4 };
const fittedNames = new WeakMap();

function fitHudName(name, text, size, width) {
  if (fittedNames.get(name) === text && name.text === text) return;
  name.setText(text).setFontSize(size);
  name.setScale(Math.min(1, width / name.width));
  fittedNames.set(name, text);
}

export class BattleFeedbackMethods {
  createImpact(x, y, color, scale) {
    const { objects: [ring], release: releaseRing } = acquireEffect(this, "impact-ring",
      () => [this.add.circle(x, y, 12).setDepth(15)]);
    const { objects: [slash], release: releaseSlash } = acquireEffect(this, "impact-slash",
      () => [this.add.rectangle(x, y, 145, 10, 0xffffff, 0.94).setAngle(-32).setDepth(16)]);
    ring.setPosition(x, y).setRadius(12).setFillStyle(color, 0.26).setStrokeStyle(7, color, 1).setAlpha(1);
    slash.setPosition(x, y).setSize(145 * scale, 10).setScale(1).setAlpha(1);
    this.tweens.add({ targets: ring, radius: 72 * scale, alpha: 0, duration: 260, onComplete: releaseRing });
    this.tweens.add({ targets: slash, scaleX: 0.2, alpha: 0, duration: 220, onComplete: releaseSlash });
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
    this.healthLossPulse(fighter, guarded);
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
    const { objects, release } = acquireEffect(this, "health-loss-label", () => [
      createUiIcon(this, "healthLoss", x - 19, y, { size: 20, tint: 0xff4057, depth: 41 }),
      this.add.text(x + 7, y, "", this.textStyle(30, "#ff4057", "800"))
        .setOrigin(0.5).setDepth(41).setStroke("#35040b", 4)
    ]);
    const [icon, label] = objects;
    icon.setPosition(x - 19, y).setDisplaySize(20, 20).setAlpha(1);
    label.setPosition(x + 7, y).setText(`-${amount}`).setScale(1).setAlpha(1);
    this.tweens.add({
      targets: objects,
      y: y - 46,
      alpha: 0,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 820,
      ease: "Cubic.out",
      onComplete: release
    });
  }

  healthLossPulse(fighter, guarded) {
    const { objects: [pulse], release } = acquireEffect(this, "health-loss-pulse", () => [
      this.add.circle(0, 0, 34, 0xff4057, 0.08).setStrokeStyle(4, 0xff4057, 0.72).setDepth(14)
    ]);
    const color = guarded ? 0xadce9c : 0xff4057;
    pulse.setPosition(fighter.body.x, fighter.body.y - 18).setScale(1).setAlpha(1)
      .setFillStyle(color, .08).setStrokeStyle(guarded ? 3 : 4, color, .72);
    this.tweens.add({
      targets: pulse,
      scale: 1.9,
      alpha: 0,
      duration: 320,
      ease: "Quad.out",
      onComplete: release
    });
  }

  floatLabel(x, y, text, color) {
    const labelColor = `#${color.toString(16).padStart(6, "0")}`;
    const { objects: [label], release } = acquireEffect(this, "battle-label", () => [
      this.add.text(x, y, "", this.textStyle(21, labelColor, "800")).setOrigin(0.5).setDepth(40)
    ]);
    label.setPosition(x, y).setColor(labelColor).setText(text).setAlpha(1);
    this.tweens.add({ targets: label, y: y - 32, alpha: 0, duration: 720, ease: "Cubic.out", onComplete: release });
  }

  async finishBattle(won) {
    if (this.finished) return;
    this.stopTurnTimeline?.();
    this.clearPreparationFeedback?.("player");
    this.clearPreparationFeedback?.("enemy");
    this.clearBossPhaseSilhouette?.();
    this.timelinePaused = true;
    if (!won) {
      this.finished = true;
      this.busy = true;
      this.setButtonsEnabled(false);
      this.refreshHud();
      const choice = await showRetryDialog(this, availableRetries(this.freeRetries), countItem(this.saveData, "retry_scroll"));
      if (!choice) return;
      if (choice === "retry") {
        const consumed = consumeRetry(this.freeRetries);
        if (consumed === null) { if (!consumeBattleItem(this, "retry_scroll").ok) return; }
        else this.freeRetries = consumed;
        this.clearGuard();
        this.stopFighterFlash(this.hero);
        this.stopFighterFlash(this.foe);
        destroyFighter(this.foe);
        restoreDuel(this);
        this.foe = this.createEnemyFighterAt();
        this.finished = false;
        this.refreshHud();
        await this.resetTurnTimeline();
        this.setMessage(`Encuentro ${this.enemyIndex + 1}/${this.encounters.length}: ${this.encounters[this.enemyIndex].name}.`);
        this.startTurnCharge();
        return;
      }
      const result = this.abandonPayload();
      this.scene.start("travel", { direction: "toVillage", result, secondaryResult: this.mission.type === "route-combat" });
      return;
    }
    this.finished = true;
    this.busy = false;
    const rewardText = won && this.missionReward?.firstClear ? ` +${this.missionReward.xp} PX, +${this.missionReward.affinityXp} PX de afinidad y +${this.missionReward.coins} monedas de misión.` : "";
    const rankText = won && this.mission.affinitySlot && this.missionReward?.firstClear ? ` ¡Ascenso a ${RANK_LEVELS[this.mission.affinitySlot - 1]} (rango ${this.mission.affinitySlot})!${this.mission.affinitySlot === 2 ? " La Torre de Desafíos está disponible." : ""}` : "";
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
    if (won && this.combatFeatures.sayoEncounter && !battleRuntime.activeSave.campaign.sayoEncounterSeen) {
      this.scene.start("epilogue", { result });
      return;
    }
    this.scene.start("travel", { direction: "toVillage", result });
  }
  resultPayload(outcome) {
    const result = createBattleResult({
      outcome,
      mission: this.mission,
      player: this.player,
      defeatedEncounters: this.defeatedEncounters,
      encounterCount: this.encounters.length,
      battleRewards: this.battleRewards,
      combatFeatures: this.combatFeatures,
      campaign: this.saveData.campaign
    });
    return {
      ...result,
      levelUp: outcome === "completed" ? levelUpReport(this.missionStartSave.progression.level, this.saveData) : null,
      levelUpShown: outcome === "completed" && this.lastShownLevel >= this.saveData.progression.level
    };
  }
  abandonPayload() {
    discardVictory(battleRuntime);
    const routeStats = this.mission.type === "route-combat" ? { ...this.saveData.campaign.doctorRoute } : null;
    this.missionStartSave.bestiary = this.saveData.bestiary;
    this.saveData = writeSave(abandonMissionProgress(this.missionStartSave, this.mission.parentMissionId || this.mission.id));
    if (this.mission.type === "route-combat") this.saveData = writeSave(cancelDoctorMission(this.saveData));
    battleRuntime.activeSave = this.saveData;
    this.battleRewards = emptyBattleRewards();
    const result = this.resultPayload("abandoned");
    return routeStats ? { ...result, routeStats } : result;
  }

  setButtonsEnabled(enabled) {
    this.buttons.forEach((button) => {
      const { jutsu } = button;
      const chakraCost = this.actionCost(jutsu);
      const affordable = this.player.chakra >= chakraCost;
      const cooldown = this.cooldowns[jutsu.id] || 0;
      const guardAvailable = jutsu.type !== "guard" || !this.player.guarding;
      const available = enabled && this.turnReady && affordable && cooldown === 0 && guardAvailable;
      button.available = available;
      const visualAlpha = available ? 1 : affordable && cooldown === 0 && guardAvailable ? 0.76 : 0.6;
      button.visualParts.forEach((part) => {
        if (part.alpha !== visualAlpha) part.setAlpha(visualAlpha);
      });
      if (button.cost) {
        const color = affordable ? "#b2e5ff" : "#ff998d";
        button.cost.setText(`${chakraCost} CH`);
        if (button.cost.style?.color !== color) button.cost.setColor(color);
      }
      button.availability?.setText(cooldown > 0 ? `CD ${cooldown}` : !affordable ? "SIN CH" : "");

      const [baseCost, damage, timing] = actionLines(jutsu);
      const cost = chakraCost > 0 ? `${chakraCost} chakra` : baseCost;
      const liveTiming = cooldown > 0 ? `Recarga: ${cooldown}` : timing;
      const liveStats = jutsu.type === "guard"
        ? [baseCost, damage, timing]
        : [cost, damage, liveTiming];
      button.tooltip.statText.setText(liveStats.join("\n"));
    });
    this.refreshBattlePhase?.();
    this.playerTurnAccent?.setAlpha(this.turnReady ? 1 : 0);
  }

  refreshHud() {
    const enemyLook = this.enemyAppearance();
    this.playerPortrait?.setAppearance?.(this.playerAppearance());
    this.enemyPortrait?.setAppearance?.(enemyLook);
    if (this.enemyTurnMarker && !this.groupMarkers) {
      const layout = fighterCombatPortraitLayout(enemyLook, false, 11);
      this.enemyTimelinePortraitLayout = layout;
      const x = this.enemyMarkerHalo.x, y = this.enemyMarkerHalo.y;
      this.enemyTurnMarker.setTexture(fighterAtlasKey(enemyLook), 'cabeza').setDisplaySize(layout.head.width, layout.head.height)
        .setPosition(x + layout.head.x, y + layout.head.y);
      this.enemyMarkerFace.setTexture(fighterFaceTextureKey(enemyLook)).setDisplaySize(layout.head.width, layout.head.height)
        .setPosition(this.enemyTurnMarker.x, this.enemyTurnMarker.y);
      const key = hairTextureKey(enemyLook.hair);
      this.enemyMarkerHair.setVisible(Boolean(key && layout.hair));
      if (key && layout.hair) this.enemyMarkerHair.setTexture(key).setDisplaySize(layout.hair.width, layout.hair.height)
        .setPosition(x + layout.hair.x, y + layout.hair.y);
    }
    this.playerPortrait?.setAffinity?.(this.player.primaryAffinity);
    this.enemyPortrait?.setAffinity?.(this.enemy.primaryAffinity);
    this.updateHealthBar(this.playerHpBar, this.player);
    this.setBarRatio(this.chakraBar, this.player.maxChakra > 0 ? this.player.chakra / this.player.maxChakra : 0);
    this.updateHealthBar(this.enemyHpBar, this.enemy);

    this.playerHpBar.valueText.setText(`${this.player.hp}/${this.player.maxHp}`);
    this.chakraBar.valueText.setText(`${this.player.chakra}/${this.player.maxChakra}`);
    this.enemyHpBar.valueText.setText(`${this.enemy.hp}/${this.enemy.maxHp}`);
    this.setBarRatio(this.enemyChakraBar, this.enemy.maxChakra > 0 ? this.enemy.chakra / this.enemy.maxChakra : 0);
    this.enemyChakraBar.valueText.setText(`${this.enemy.chakra}/${this.enemy.maxChakra}`);
    const enemyName = this.encounters[this.enemyIndex].name.toUpperCase();
    fitHudName(this.playerName, this.playerName.text, 17, 151);
    fitHudName(this.enemyName, enemyName, 14, 176);
    this.targetPortraitAccent?.setAlpha(this.enemy.hp > 0 ? 1 : 0);
    this.playerRankNumber.setText(`NV ${this.saveData.progression.level}`);
    this.refreshStatusSlots(this.playerStatusSlots, this.player.statuses, this.player.guarding, this.player.soak);
    this.refreshStatusSlots(this.enemyStatusSlots, this.enemy.statuses, this.enemy.guarding, this.enemy.soak);
    if (this.buttons) this.setButtonsEnabled(!this.busy && !this.finished && this.turnReady);
  }

  updateHealthBar(bar, combatant) {
    const { hp, maxHp } = combatant;
    const ratio = maxHp > 0 ? Phaser.Math.Clamp(hp / maxHp, 0, 1) : 0;
    const previous = bar.health;
    const sameCombatant = previous?.combatant === combatant;
    if (sameCombatant && previous.hp === hp && previous.ratio === ratio) return;
    bar.health = { combatant, hp, ratio };
    if (bar.ghost) {
      this.tweens.killTweensOf(bar.ghost);
      const nextWidth = bar.width * ratio;
      // La estela pertenece al luchador que recibe el daño. Al cambiar de
      // objetivo, la barra compartida se sincroniza con la vida del nuevo rival.
      if (sameCombatant && hp < previous.hp && ratio < previous.ratio) {
        const previousWidth = Math.max(bar.ghost.fillWidth, bar.width * previous.ratio);
        bar.ghost.setFillWidth(previousWidth);
        this.tweens.add({ targets: bar.ghost, fillWidth: nextWidth, delay: 260, duration: 720, ease: "Cubic.out" });
      } else {
        bar.ghost.setFillWidth(nextWidth);
      }
    }
    this.setBarRatio(bar, ratio);
    if (!previous || (ratio <= 0.25) !== (previous.ratio <= 0.25)) {
      bar.fill.setFillStyle(ratio <= 0.25 ? 0xe06b52 : 0x06d45a, 1);
    }
  }

  refreshStatusSlots(slots, statuses = [], guarding = false, soak = null) {
    if (!slots) return;
    const entries = [...statuses];
    if (soak?.stacks) entries.push({ type: "soak", label: `EMPAPADO ×${soak.stacks}`, duration: soak.turns });
    if (guarding) entries.unshift({ type: "guard", label: "GUARDIA" });
    slots.forEach((slot, index) => {
      const status = entries[index];
      const description = status ? `${status.label || status.type}${status.duration ? ` · ${status.duration} turno(s)` : ""}` : null;
      if (slot.status !== description) {
        slot.status = description;
        if (!description) slot.detail?.setVisible(false);
        else if (slot.detail?.visible) slot.detail.setText(description);
      }
      const type = status ? status.type || "" : null;
      if (slot.statusType === type) return;
      slot.statusType = type;
      slot.bg.setAlpha(status ? 1 : 0);
      const color = statusColors[type] || 0xd1b36d;
      slot.glyph.setText(status ? statusGlyphs[type] || "印" : "");
      slot.glyph.setColor(status ? `#${color.toString(16).padStart(6, "0")}` : "#667176");
      slot.bg.setFillStyle(status ? 0x125c81 : 0x07101a, status ? 0.98 : 0.78)
        .setStrokeStyle(1, status ? color : 0x76552f, status ? 0.9 : 0.5);
    });
  }

  setBarRatio(bar, ratio) {
    const fillWidth = bar.width * Phaser.Math.Clamp(ratio, 0, 1);
    if (bar.fill.fillWidth !== fillWidth) bar.fill.setFillWidth(fillWidth);
  }

  setMessage(text, color = "#edf7fd") {
    this.lastBattleMessage = { text, color };
    this.refreshBattlePhase?.();
  }

  setSealPrompt(text, color = "#eaf7ff") {
    if (!this.sealPrompt) return;
    this.sealPrompt.setText(text);
    this.sealPrompt.setColor(color);
  }

  actionCost(action) {
    return actionChakraCost(action, this.player.costReduction);
  }

  playerAppearance() {
    return playerFighterAppearance(this.saveData);
  }

  enemyAppearance() {
    const enemyId = this.encounterIds[this.enemyIndex];
    return enemyFighterAppearance(this.encounters[this.enemyIndex], enemyId);
  }

  shake(duration, intensity) {
    const strength = intensity * (this.arenaVisuals?.cameraIntensity ?? 1);
    if (this.cameraEffects && !this.lightMode && strength > 0) this.cameras.main.shake(duration, strength);
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
      resolution: battleRuntime.textTextureResolution
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
      const context = this.game?.sound?.context
        || (this.audioContext ||= new (window.AudioContext || window.webkitAudioContext)());
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(gainAmount * this.volume, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    } catch (_) { /* El audio es decorativo; el juego funciona sin él. */ }
  }

  stopBattleAudio() {
    this.musicEvent = null;
    const context = this.audioContext;
    this.audioContext = null;
    if (context && context.state !== "closed") void context.close().catch(() => {});
  }
}

