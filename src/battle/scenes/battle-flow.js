import { actionHealthCost } from "../skill-tables.js?v=0.171.0";
import { closeActionState, isFinalOpponent } from "../action-resolution.js?v=0.155.0";
import { SEALS, BASE_ACTIONS, JUTSU_LIBRARY, ENEMY_ACTIONS, ENEMY_ROSTER } from "../../data.js?v=1.5.0";
import { applyBattleConsumable, itemUseReason } from "../battle-inventory.js?v=0.171.0";
import { applyStatus, affinityLabel, hasStatus, hitChance } from "../../rules.js?v=0.20.0";
import { AFFINITY_CONFIG, affinityCycleModifier, furyDamageBonus, reprisalChance, reprisalDamage } from "../../affinity-system.js?v=0.114.0";
import { createPlayerFighter, destroyFighter, playFighterDamageReaction, preparePlayerPunch, queuePlayerFighterTextures, recoverPlayerPunch, releasePlayerPunch, startPlayerGuard, startPlayerRunning, stopPlayerGuard, stopPlayerRunning } from "../../fighters.js?v=0.171.0";
import { enemyFighterAppearance, playerFighterAppearance } from "../../character.js?v=0.171.0";
import { actionLines, createActionButton, createBar } from "../../ui.js?v=0.171.0";
import { awardEncounter, cancelDoctorMission, completeMission, derivedStats, levelUpReport, masterIdForCharacter, recordBestiaryObservation, resolveDoctorMissionCombat, writeSave } from "../../save.js?v=0.171.0";
import { elementIcon } from "../../elements.js?v=0.20.0";
import { createUiIcon, loadUiIcons } from "../../icons.js?v=0.44.0";
import { missionStep } from "../../mission-system.js?v=0.155.0";
import { getMissionSceneDialogue } from "../../dialogues.js?v=0.155.0";
import { bossPhaseMessage, combatFeatures, fieldSuppliesForBattle, resolveEncounterIds } from "../../combat-modifiers.js?v=0.155.0";
import { resolveDamage } from "../damage.js?v=0.114.0";
import { createEnemyState } from "../enemy-state.js?v=0.155.0";
import { advanceCooldowns, combatantEvasion, combatantSpeed, nextEnemyAction, resolveStatusTick, soakAfterTurn, waterSoakAfterAttack } from "../turn.js?v=1.4.0";
import { addBattleReward, bestiaryObservation, createBattleResult, emptyBattleRewards, visibleRewardCountForEncounter } from "../rewards.js?v=0.114.0";
import { bindBattleState, createBattleState } from "../battle-state.js?v=0.68.0";
import { actionNeedsPreparation } from "../timeline.js?v=0.69.0";
import { encounterRecovery } from "../../progression-balance.js?v=0.94.0";
import { playLevelUpFlash } from "../level-up-transition.js?v=1.6.0";
import { playBossPhaseTransition } from "../phase-transition.js?v=0.97.0";
import { stageVictory } from "../victory-transaction.js?v=0.95.0";
import { createTravelProgress } from "../travel-progress.js?v=1.0.0";
import { missionTravelPresentation } from "../mission-travel-presentation.js?v=0.96.0";
import { missionTransitionMode } from "../../mission-transitions.js";
import { playTeleportTransition, teleportArrival, teleportFadeOut } from "../teleport-transition.js?v=1.2.0";


import { BATTLE_ARENAS, COIN_DROP_VFX, EXPERIENCE_DROP_VFX, HEIGHT, HUD_THEMES, Phaser, RANK_LEVELS, TECHNIQUE_VFX, TECHNIQUE_VFX_FRAMES, TIMELINE_END, TIMELINE_START, WIDTH, battleRuntime, drawCubicBezier, sharpenTextTree } from "../runtime.js?v=0.91.0";
import { SHARED_BATTLE_ASSETS } from "../../asset-urls.js?v=0.115.0";
import { isSceneActive, pauseSceneIfActive, stopSceneIfRunning } from "../scene-lifecycle.js?v=1.0.0";
import { presentBattleNotice } from "../scene-notices.js?v=0.173.0";
import { elementName } from "../../elements.js?v=0.20.0";

export class BattleFlowMethods {
  async useJutsu(jutsu) {
    if (this.busy || this.finished || !this.turnReady) return;
    if (jutsu.type === "item" && itemUseReason(this, jutsu.itemId)) return;
    if (jutsu.type === "guard" && this.player.guarding) {
      this.setMessage("La Guardia ya está preparada.", "#f0c77c");
      return;
    }
    if (this.cooldowns[jutsu.id] > 0) {
      this.setMessage(`${jutsu.name} sigue en enfriamiento.`, "#ff9d8d");
      return;
    }
    const healthCost = actionHealthCost(jutsu);
    if (healthCost && this.player.hp <= healthCost) { this.setMessage("No tienes suficiente vida para esa técnica física.", "#ff9d8d"); return; }
    const cost = this.actionCost(jutsu);
    if (this.player.chakra < cost) {
      this.setMessage("No tienes suficiente chakra para esa técnica.", "#ff9d8d");
      this.shake(90, 0.003);
      return;
    }

    this.busy = true;
    this.turnReady = false;
    this.timelinePaused = true;
    this.player.chakra -= cost;
    this.player.hp -= healthCost;
    if (jutsu.cooldown) this.cooldowns[jutsu.id] = jutsu.cooldown + 1;
    this.pendingActions.player = jutsu;
    this.refreshHud();
    this.setButtonsEnabled(false);
    if (actionNeedsPreparation(jutsu)) {
      this.showPreparationFeedback("player", jutsu);
      this.setMessage(`Preparando ${jutsu.name}: debe recorrer el tramo final de la barra.`, "#f0c77c");
      this.busy = false;
      this.timelinePaused = false;
      if (this.finished) return;
      this.startTurnCharge();
      return;
    }
    await this.executeTimelineAction("player", jutsu);
  }

  async executeTimelineAction(actor, action) {
    if (this.finished || this.actionExecution) return;
    const execution = Symbol("action");
    this.actionExecution = execution;
    const activeFighter = actor === "player" ? this.hero : this.foe;
    this.hudActiveFighter = activeFighter;
    const playerAtStart = this.player;
    const current = () => !this.finished && this.player === playerAtStart && (this.scene?.isActive?.() !== false || this.scene?.isPaused?.());
    try {
      if (!action.seals?.length) this.clearPreparationFeedback(actor);
      this.stopTurnTimeline();
      this.timelinePaused = true;
      this.busy = true;
      this.turnReady = false;
      this.setButtonsEnabled(false);

      if (actor === "player") {
        const casting = action.seals?.length ? await this.playSeals(action) : { mistakes: 0, multiplier: 1 };
        if (!current()) return;
        if (action.type === "item") await applyBattleConsumable(this, action.itemId);
        else if (action.type === "guard") await this.playerGuard();
        else await this.playerAttack(action, casting);
        if (!current()) return;
        closeActionState(this, actor, action);
        this.refreshHud();
        this.setTimelineMarkerState("player", "charging");
        this.updateTimelineMarkers();

        if (!current()) return;

        // Dar el golpe final gana antes del veneno propio; los encuentros
        // intermedios sí deben cerrar sus estados antes de cambiar de rival.
        if (this.player.hp > 0 && this.enemy.hp <= 0 && isFinalOpponent(this)) {
          if (await this.resolveEnemyOutcome()) return;
        }
        if (this.player.hp <= 0) return this.finishBattle(false);
        await this.resolveCombatantStatusTick(this.player, this.hero);
        if (!current()) return;
        if (this.player.hp <= 0) return this.finishBattle(false);
        if (await this.resolveEnemyOutcome()) return;

      } else {
        const result = await this.executeEnemyAction(action);
        if (!current()) return;
        closeActionState(this, actor, action, { skipped: Boolean(result?.skipped) });
        this.setTimelineMarkerState("enemy", "charging");
        this.updateTimelineMarkers();

        if (this.player.hp <= 0) return this.finishBattle(false);
        if (this.enemy.hp > 0) await this.resolveCombatantStatusTick(this.enemy, this.foe);
        if (!current()) return;
        if (await this.resolveEnemyOutcome()) return;
      }

      this.refreshHud();
      if (this.finished) return;
      this.busy = false;
      this.timelinePaused = false;
      this.startTurnCharge();
    } finally {
      if (this.hudActiveFighter === activeFighter) this.hudActiveFighter = null;
      if (this.actionExecution === execution) this.actionExecution = null;
    }
  }

  async resolveEnemyOutcome() {
    const profile = this.encounters[this.enemyIndex];
    if (this.enemy.hp <= 0) {
      this.clearPreparationFeedback("enemy");
      this.recordEnemyObservation({ defeated: true });
      if (this.mission.type === "route-combat") {
        this.defeatedEncounters += 1;
        this.saveData = writeSave(resolveDoctorMissionCombat(this.saveData));
        battleRuntime.activeSave = this.saveData;
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
      const firstClear = !this.mission.affinitySlot && !this.missionStartSave.campaign[this.mission.category === "secondary" ? "completedSecondaryMissions" : "completedMissions"].includes(this.mission.id);
      const reward = awardEncounter(this.rewardPreviewSave, this.encounterIds[this.enemyIndex], { firstClear,mission:this.mission,encounterIndex:this.enemyIndex,encounterIds:this.encounterIds });
      this.rewardPreviewSave = reward.save;
      this.pendingEncounterRewards.push(this.enemyIndex);
      this.lastReward = reward;
      this.defeatedEncounters += 1;
      this.battleRewards = addBattleReward(this.battleRewards, reward);
      if (reward.xp || reward.coins) await this.playEncounterRewards(this.enemyIndex);
      await this.showPendingLevelUp(this.rewardPreviewSave);
      if (this.enemyIndex === this.encounters.length - 1) {
        if (this.combatFeatures.relicDecision) await this.playRelicDrop();
        if (this.combatFeatures.postCombatChoice) await this.playHideoutDiscoveryChoice();
        if (!isSceneActive(this.scene)) return true;
        this.pendingEncounterRewards.forEach((encounterIndex) => {
          this.saveData = awardEncounter(this.saveData, this.encounterIds[encounterIndex], { firstClear,mission:this.mission,encounterIndex,encounterIds:this.encounterIds }).save;
        });
        const completion = completeMission(this.saveData, this.mission.id);
        this.saveData = completion.save;
        this.rewardPreviewSave = this.saveData;
        this.missionReward = completion;
        this.battleRewards = addBattleReward(this.battleRewards, completion);
        await this.showPendingLevelUp(this.saveData);
        stageVictory(battleRuntime, this.saveData);
        await this.finishBattle(true);
      } else {
        const choiceStep = missionStep(this.mission, "choice");
        const resourceStep = missionStep(this.mission, "resource");
        const interlude = choiceStep?.afterEncounter === this.enemyIndex
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

  async showPendingLevelUp(previewSave) {
    const report = levelUpReport(this.lastShownLevel, previewSave);
    if (!report) return;
    this.stopTurnTimeline?.();
    const restoreHudCallback = this.accessibleHud?.suspend?.();
    const wasVisible = this.sys.settings.visible;
    let hudRestored = false;
    const restoreHud = () => {
      if (hudRestored) return;
      hudRestored = true;
      this.scene.setVisible(wasVisible);
      restoreHudCallback?.();
    };
    const arrivalAppearance = { bodyAlpha: this.hero.body.alpha, shadowAlpha: this.hero.shadow.alpha, pace: "substitution" };
    const flashed = await playLevelUpFlash(this, this.hero);
    if (!flashed || this.finished || !isSceneActive(this.scene)) { restoreHud(); return; }
    const teleportCover = await teleportFadeOut(this, { pace: "substitution" });
    if (!teleportCover || this.finished || !isSceneActive(this.scene)) { teleportCover?.destroy?.(); restoreHud(); return; }
    await new Promise((resolve) => {
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        this.events.off(Phaser.Scenes.Events.RESUME, onResume);
        this.events.off(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
        resolve();
      };
      const onShutdown = () => {
        teleportCover.destroy?.();
        restoreHud();
        settle();
      };
      const onResume = async () => {
        this.scene.setVisible(wasVisible);
        teleportCover.destroy?.();
        if (!isSceneActive(this.scene)) { restoreHud(); settle(); return; }
        const oldHp = this.player.maxHp;
        const oldChakra = this.player.maxChakra;
        Object.assign(this.player, derivedStats(previewSave));
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp - oldHp);
        this.player.chakra = Math.min(this.player.maxChakra, this.player.chakra + this.player.maxChakra - oldChakra);
        this.lastShownLevel = report.afterLevel;
        this.refreshHud();
        await teleportArrival(this, this.hero, arrivalAppearance);
        restoreHud();
        settle();
      };
      this.events.once(Phaser.Scenes.Events.RESUME, onResume);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
      this.scene.setVisible(false);
      this.scene.launch("level-up", { result: { outcome: "completed", levelUp: report }, returnToBattle: true });
      if (!pauseSceneIfActive(this.scene)) {
        stopSceneIfRunning(this.scene, "level-up");
        onShutdown();
      }
    });
  }

  async playEncounterRewards(encounterIndex) {
    const count = visibleRewardCountForEncounter(encounterIndex);
    await Promise.all([
      this.playRewardBurst(count, {
        texture: "coin-drop",
        animation: "coin-drop-spin",
        effect: COIN_DROP_VFX,
        originYOffset: -38,
        groundYOffset: -10,
        targetYOffset: -28,
        horizontalShift: -12
      }),
      this.playRewardBurst(count, {
        texture: "experience-drop",
        animation: "experience-drop-spin",
        effect: EXPERIENCE_DROP_VFX,
        originYOffset: -66,
        groundYOffset: -52,
        targetYOffset: -58,
        horizontalShift: 12
      })
    ]);
  }

  async playRewardBurst(count, { texture, animation, effect, originYOffset, groundYOffset, targetYOffset, horizontalShift }) {
    if (!count || !this.textures.exists(texture) || !this.anims.exists(animation)) return;
    const originX = this.foe.body.x + horizontalShift;
    const originY = this.foe.body.y + originYOffset;
    const groundY = this.foe.shadow.y + groundYOffset;
    const spacing = count > 1 ? Math.min(24, 132 / (count - 1)) : 0;
    const center = (count - 1) / 2;
    const rewardSprites = Array.from({ length: count }, (_, index) => {
      const rewardSprite = this.add.sprite(originX, originY, texture, index % effect.frames)
        .setDisplaySize(effect.displaySize, effect.displaySize)
        .setDepth(18)
        .play(animation);
      rewardSprite.setScale((effect.displaySize / effect.frameWidth) * 0.18);
      return rewardSprite;
    });

    await Promise.all(rewardSprites.map((rewardSprite, index) => this.tween({
      targets: rewardSprite,
      x: originX + (index - center) * spacing,
      y: groundY - (index % 2) * 8,
      scaleX: effect.displaySize / effect.frameWidth,
      scaleY: effect.displaySize / effect.frameHeight,
      angle: (index - center) * 12,
      delay: index * 24,
      duration: 340,
      ease: "Cubic.out"
    })));
    await this.delay(160);

    const playerTarget = { x: this.hero.body.x, y: this.hero.body.y + targetYOffset };
    await Promise.all(rewardSprites.map((rewardSprite, index) => this.tween({
      targets: rewardSprite,
      x: playerTarget.x,
      y: playerTarget.y,
      delay: index * 28,
      duration: 380,
      ease: "Cubic.in"
    }).then(() => rewardSprite.destroy())));
  }

  async advanceEncounter(interlude = null) {
    const restoreHud = this.accessibleHud?.suspend?.();
    try {
      const defeatedName = this.encounters[this.enemyIndex].name;
      const levelNote = this.lastReward?.levelsGained ? ` · ¡Nivel +${this.lastReward.levelsGained}!` : "";
      const rewardMessage = this.lastReward.xp || this.lastReward.coins
        ? `+${this.lastReward.xp} PX · +${this.lastReward.affinityXp} PX de afinidad · +${this.lastReward.coins} monedas${levelNote}`
        : this.mission.affinitySlot ? "prueba de afinidad superada" : "sin nuevas recompensas por repetición";
      this.setMessage(`${defeatedName} derrotado · ${rewardMessage}`, "#79e8b5");
      this.stopFighterFlash(this.foe);
      this.tweens.add({ targets: [...this.foe.targets, this.foe.shadow], alpha: 0, x: "+=70", duration: 480 });
      await this.delay(560);
      this.clearBossPhaseSilhouette?.();
      destroyFighter(this.foe);

      if (interlude) await interlude();
      if (this.finished || !isSceneActive(this.scene)) return;

      this.enemyIndex += 1;
      let profile = this.encounters[this.enemyIndex];
      await this.playEncounterTransition(profile);
      if (this.finished) return;
      this.enemy = this.createEnemyState(profile);
      profile = this.encounters[this.enemyIndex];
      this.recordEnemyObservation({ encounter: true });
      this.enemyName.setText(profile.name);
      this.enemyRankNumber.setText(`NV ${this.enemyRankForProfile(profile)}`);
      this.foe = this.createEnemyFighterAt(undefined, 70);
      this.foe.targets.forEach((target) => target.setAlpha(0));
      this.foe.shadow.setAlpha(0);
      this.tweens.add({ targets: this.foe.targets, x: "-=70", alpha: 1, duration: 520, ease: "Cubic.out" });
      this.tweens.add({ targets: this.foe.shadow, x: "-=70", alpha: 0.4, duration: 520, ease: "Cubic.out" });

      const recovery = this.nextRecovery || encounterRecovery(this.player.maxHp, this.player.maxChakra);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + recovery.hp);
      this.player.chakra = Math.min(this.player.maxChakra, this.player.chakra + recovery.chakra);
      if (recovery.clearStatuses) this.player.statuses = [];
      this.nextRecovery = null;
      this.clearGuard();
      Object.keys(this.cooldowns).forEach((id) => { this.cooldowns[id] = 0; });
      this.refreshHud();
      await this.delay(620);
      await this.resetTurnTimeline();
      this.setMessage(`Encuentro ${this.enemyIndex + 1}/${this.encounters.length}: ${profile.name}.`);
      this.startTurnCharge();
    } finally {
      restoreHud?.();
    }
  }

  playBattleChoice(title, description, choices, options) {
    return presentBattleNotice(this, title, description, choices, options);
  }

  missionSceneText(sceneId, variables = {}) {
    return getMissionSceneDialogue(this.mission.id, sceneId, { save: this.saveData, variables })
      .map((line) => line.text)
      .join("\n\n");
  }

  async playResourceChoice() {
    const masterName = masterIdForCharacter(this.saveData.character) === "mei" ? "Mei Hayate" : "Daichi Kazan";
    const choices = [{ value: "conserve", label: "CONSERVAR", detail: "Recuperación menor; guardas los suministros." }];
    if (this.fieldSupplies > 0) choices.unshift({ value: "rest", label: "DESCANSAR", detail: `Recuperación amplia; consume 1 de ${this.fieldSupplies}.`, primary: true });
    const choice = await this.playBattleChoice("ADMINISTRACIÓN ENTRE DUELOS", this.missionSceneText("resource-choice", { master: masterName }), choices);
    if (choice === undefined) return;
    if (choice === "rest") {
      this.fieldSupplies -= 1;
      this.nextRecovery = { hp: 70, chakra: 55, clearStatuses: true };
    } else this.nextRecovery = { hp: 10, chakra: 8, clearStatuses: false };
    this.saveData.campaign.hideoutSupplies = this.fieldSupplies;
    this.saveData = writeSave(this.saveData);
    battleRuntime.activeSave = this.saveData;
  }

  async playHideoutDiscoveryChoice() {
    const choiceStep = missionStep(this.mission, "choice");
    const choice = await this.playBattleChoice("EL CORAZÓN DE LA GUARIDA", this.missionSceneText(choiceStep?.sceneId || choiceStep?.id), [
      { value: "prisoners", label: "LIBERAR PRISIONEROS", detail: "Rescatas a los cautivos y obtienes sus testimonios.", primary: true },
      { value: "documents", label: "RECUPERAR DOCUMENTOS", detail: "La Biblioteca obtiene datos parciales sobre Raizen." }
    ]);
    if (choice === undefined) return;
    this.saveData.campaign.hideoutDiscoveryChoice = choice;
    this.saveData = recordBestiaryObservation(this.saveData, "boss_raizen", { document: choice === "documents", vulnerability: "agua" });
    this.saveData = writeSave(this.saveData);
    battleRuntime.activeSave = this.saveData;
    const revelation = this.missionSceneText(choice === "documents" ? "revelation-documents" : "revelation-prisoners");
    await this.playBattleChoice("UNA ORGANIZACIÓN MAYOR", revelation, [
      { value: "continue", label: "REGISTRAR HALLAZGO", detail: "La información se añade al informe de la saga y desbloquea el enfrentamiento con Raizen.", primary: true }
    ]);
  }

  async playLieutenantIntervention() {
    const choice = await this.playBattleChoice("UNA DEUDA PENDIENTE", this.missionSceneText("lieutenant-intervention"), [
      { value: "continue", label: "ENFRENTAR A RAIZEN", detail: "La decisión tomada en la cantera altera el combate final.", primary: true }
    ]);
    if (choice === undefined) return;
    this.floatLabel(this.foe.body.x, this.foe.body.y - 150, "−15 % VIDA", 0xf0b85c);
    this.refreshHud();
  }

  async playSecretWarehouse() {
    await this.playBattleChoice("ALMACÉN DE LOS CUERVOS", this.missionSceneText("secret-warehouse"), [
      { value: "continue", label: "ASEGURAR EL ALMACÉN", detail: `Bonificación de misión: +${this.mission.secretBonusCoins} monedas.`, primary: true }
    ]);
  }

  playPrisonerChoice() {
    return this.playBattleChoice("Decisión de misión", this.missionSceneText("prisoner-choice"), [
      { value: "interrogate", label: "Interrogar y perdonar", detail: "+ Entrada secreta y monedas ×2\n− Escapa y refuerza a Akumori" },
      { value: "eliminate", label: "Eliminar", detail: "+ Akumori no recibe refuerzos\n− Sin entrada secreta ni aliado futuro" }
    ], { afterChoice: choice => {
      this.saveData.campaign.banditPrisonerChoice = choice;
      return this.missionSceneText(choice === "interrogate" ? "prisoner-interrogate" : "prisoner-eliminate");
    } });
  }

  async playRelicDrop() {
    const restoreHud = this.accessibleHud?.suspend?.();
    try {
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
    } finally {
      restoreHud?.();
    }
  }

  async playEncounterTransition(profile) {
    const restoreHud = this.accessibleHud?.suspend?.();
    try {
      if (missionTransitionMode(this.mission, "betweenEncounters", this.enemyIndex + 1) === "teleport") {
        await playTeleportTransition(this, { fighter: this.hero, objectId: this.saveData.character.teleportObject });
        return;
      }
      const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      const duration = reducedMotion ? 900 : 1900;
      const fadeDuration = reducedMotion ? 130 : 240;
      const backdrop = this.add.image(WIDTH / 2 + 22, HEIGHT / 2, "forest-road").setDisplaySize(WIDTH + 88, HEIGHT + 50).setDepth(70).setAlpha(0);
      const shade = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x06130d, 0.38).setOrigin(0).setDepth(71).setAlpha(0);
      const foreground = this.add.image(WIDTH / 2 + 62, HEIGHT / 2, "village-outskirts-branches")
        .setDisplaySize(WIDTH + 165, HEIGHT + 92).setDepth(75).setAlpha(0);
      const phaseTag = this.add.text(WIDTH / 2, HEIGHT / 2 - 58, `FASE DE MISIÓN ${this.enemyIndex + 1} / ${this.encounters.length}`,
        this.textStyle(12, "#b9efce", "800", true)).setOrigin(0.5).setDepth(77).setAlpha(0).setName("encounter-phase-tag");
      const chapter = this.add.text(WIDTH / 2, HEIGHT / 2 - 16, `RUMBO AL ENCUENTRO ${this.enemyIndex + 1} DE ${this.encounters.length}`, this.textStyle(18, "#f5edd8", "800", true)).setOrigin(0.5).setDepth(77).setAlpha(0);
      const title = this.add.text(WIDTH / 2, HEIGHT / 2 + 20, profile.name, this.textStyle(14, "#d6e9df", "700")).setOrigin(0.5).setDepth(77).setAlpha(0);
      const route = createTravelProgress(this, {
        accent: missionTravelPresentation(this.mission).accent,
        departure: `FASE ${String(this.enemyIndex).padStart(2, "0")}`,
        destination: `FASE ${String(this.enemyIndex + 1).padStart(2, "0")}`,
        depth: 76, name: "encounter-transition"
      });
      route.parts.forEach(part => part.setAlpha(0));
      const runner = createPlayerFighter(this, -90, 330, this.playerAppearance());
      runner.targets.forEach((target) => target.setDepth(74).setAlpha(0));
      runner.shadow.setDepth(73).setAlpha(0);
      startPlayerRunning(this, runner);
      await this.tween({ targets: [backdrop, shade, foreground, phaseTag, chapter, title, ...runner.targets, runner.shadow, ...route.parts], alpha: 1, duration: fadeDuration, ease: "Sine.out" });
      await Promise.all([
        this.tween({ targets: runner.body, x: WIDTH + 90, duration, ease: "Linear" }),
        this.tween({ targets: runner.shadow, x: WIDTH + 90, duration, ease: "Linear" }),
        this.tween({ targets: backdrop, x: WIDTH / 2 - 22, duration, ease: "Linear" }),
        this.tween({ targets: foreground, x: WIDTH / 2 - 62, duration, ease: "Linear" }),
        this.tween({ targets: route.fill, scaleX: 1, duration: duration - 200, ease: "Sine.inOut" }),
        this.tween({ targets: [phaseTag, chapter, title], alpha: 0, delay: duration * 0.49, duration: fadeDuration, ease: "Sine.in" })
      ]);
      stopPlayerRunning(runner);
      await this.tween({ targets: [backdrop, shade, foreground, ...route.parts], alpha: 0, duration: fadeDuration, ease: "Sine.in" });
      destroyFighter(runner);
      backdrop.destroy(); shade.destroy(); foreground.destroy(); phaseTag.destroy(); chapter.destroy(); title.destroy();
      route.destroy();
    } finally {
      restoreHud?.();
    }
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
    this.showBossPhaseSilhouette(this.foe);
    this.screenFlash(220, 130, 55, 180);
    this.tone(95, 0.35);
    await playBossPhaseTransition(this, { fighter: this.foe, name: profile.name, detail: bossPhaseMessage(this.mission) });
    this.refreshHud();
  }

}

