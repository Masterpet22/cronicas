import { SEALS, BASE_ACTIONS, JUTSU_LIBRARY, ENEMY_ACTIONS, ENEMY_ROSTER } from "../../data.js?v=0.66.0";
import { applyStatus, affinityLabel, hasStatus, hitChance } from "../../rules.js?v=0.20.0";
import { AFFINITY_CONFIG, affinityCycleModifier, furyDamageBonus, reprisalChance, reprisalDamage } from "../../affinity-system.js?v=0.58.0";
import { createPlayerFighter, destroyFighter, playFighterDamageReaction, preparePlayerPunch, queuePlayerFighterTextures, recoverPlayerPunch, releasePlayerPunch, startPlayerGuard, startPlayerRunning, stopPlayerGuard, stopPlayerRunning } from "../../fighters.js?v=0.71.0";
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


import { BATTLE_ARENAS, HEIGHT, HUD_THEMES, Phaser, RANK_LEVELS, TECHNIQUE_VFX, TECHNIQUE_VFX_FRAMES, TIMELINE_END, TIMELINE_START, WIDTH, battleRuntime, drawCubicBezier, sharpenTextTree } from "../runtime.js?v=0.68.0";

export class BattleFeedbackMethods {
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
    this.stopTurnTimeline?.();
    this.clearPreparationFeedback?.("player");
    this.clearPreparationFeedback?.("enemy");
    this.clearBossPhaseSilhouette?.();
    this.timelinePaused = true;
    const routeFailureStats = !won && this.mission.type === "route-combat" ? { ...this.saveData.campaign.doctorRoute } : null;
    if (!won) {
      this.missionStartSave.bestiary = this.saveData.bestiary;
      this.saveData = this.mission.type === "route-combat"
        ? cancelDoctorMission(this.missionStartSave)
        : this.missionStartSave;
      this.saveData = writeSave(this.saveData);
      battleRuntime.activeSave = this.saveData;
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
      this.scene.start("travel", { direction: "toVillage", secondaryResult: true, result: { ...result, routeStats: routeFailureStats } });
      return;
    }
    if (won && this.combatFeatures.tutorial && !battleRuntime.activeSave.campaign.sayoEncounterSeen) {
      this.scene.start("epilogue", { result });
      return;
    }
    this.scene.start("travel", { direction: "toVillage", result });
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
    battleRuntime.activeSave = this.saveData;
    this.battleRewards = emptyBattleRewards();
    const result = this.resultPayload("abandoned");
    return routeStats ? { ...result, routeStats } : result;
  }

  setButtonsEnabled(enabled) {
    this.buttons.forEach((button) => {
      const { jutsu } = button;
      const affordable = this.player.chakra >= this.actionCost(jutsu);
      const cooldown = this.cooldowns[jutsu.id] || 0;
      const guardAvailable = jutsu.type !== "guard" || !this.player.guarding;
      const available = enabled && this.turnReady && affordable && cooldown === 0 && guardAvailable;
      button.available = available;
      const visualAlpha = available ? 1 : affordable && cooldown === 0 && guardAvailable ? 0.76 : 0.42;
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
  }}

