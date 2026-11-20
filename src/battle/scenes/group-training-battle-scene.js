import { TrainingBattleScene } from "./training-battle-scene.js?v=0.159.0";
import { applyBattleConsumable } from "../battle-inventory.js?v=0.155.0";
import { BattleFlowMethods } from "./battle-flow.js?v=0.159.0";
import { createEnemyState } from "../enemy-state.js?v=0.155.0";
import { trainingOpponentProfile } from "../../training.js?v=0.155.0";
import { startPlayerBreathing, startPlayerPreparing, stopPlayerBreathing, stopPlayerPreparing } from "../../fighters.js?v=0.159.0";
import { enemyFormation } from "../combat-positions.js?v=0.153.0";
import { chooseEnemyAbility } from "../enemy-abilities.js?v=0.155.0";
import { closeActionState } from "../action-resolution.js?v=0.155.0";
import { combatantEvasion } from "../turn.js?v=1.4.0";
import { actionNeedsPreparation } from "../timeline.js?v=0.69.0";
import { nextGroupTimelineStep } from "../group-timeline.js?v=0.143.0";
import { teleportSmoke } from "../teleport-transition.js?v=1.2.0";
import { physicalActionAvailable, actionHealthCost } from "../skill-tables.js?v=0.155.0";
import { mountTrainingTargets, mountGroupTimeline, updateGroupTimeline, showGroupTrainingResult } from "../training-targets.js?v=0.159.0";

// Shared group scheduler for active Dojo opponents and campaign teams.
// Passive practice and saga-1 duels keep their existing execution paths.
export class GroupTrainingBattleScene extends TrainingBattleScene {
  create() {
    this.trainingTargets = null;
    this.targetControls = null;
    this.selectedTargetIndex = 0;
    this.groupReservation = null;
    this.groupExecuting = null;
    this.groupEpoch = Symbol("group-training");
    this.groupMarkers = null;
    super.create();
    if (!(this.mission.groupTraining || this.mission.groupCombat)) return;
    this.game.canvas.parentElement.classList.add("group-training-mode");
    this.targetControls = mountTrainingTargets(this);
    this.timelineLayer.setVisible(true);
    this.setMessage("Combate real: toca un rival para elegir objetivo. Cada enemigo tiene su propio turno. Derrota al grupo; tus recursos y recargas se mantienen durante la pelea.");
    this.events.once("shutdown", () => {
      this.game.canvas.parentElement.classList.remove("group-training-mode");
      this.trainingTargets.forEach(target => stopPlayerPreparing(this, target.fighter, { immediate: true }));
    });
  }

  applyGroupConsumable(itemId) { return applyBattleConsumable(this, itemId); }

  groupOpponentProfile(profile, index) {
    return this.mission.groupCombat ? profile : trainingOpponentProfile(profile, this.saveData, index);
  }

  createEnemyState(profile) {
    if (!(this.mission.groupTraining || this.mission.groupCombat)) return super.createEnemyState(profile);
    const opponent = this.groupOpponentProfile(profile, this.enemyIndex);
    this.encounters[this.enemyIndex] = opponent;
    return createEnemyState(opponent, this.mission);
  }

  createFighters() {
    if (!(this.mission.groupTraining || this.mission.groupCombat)) return super.createFighters();
    const positions = enemyFormation(this.encounters.length);
    super.createFighters(positions[0]);
    const firstProfile = this.encounters[0], firstState = this.enemy;
    this.trainingTargets = positions.map((position, index) => {
      this.enemyIndex = index;
      const profile = index === 0 ? firstProfile : this.groupOpponentProfile(this.encounters[index], index);
      this.encounters[index] = profile;
      const state = index === 0 ? firstState : createEnemyState(profile, this.mission);
      const fighter = index === 0 ? this.foe : this.createEnemyFighterAt(position);
      if (index === 0) { fighter.layers.forEach(layer => layer.clearTint()); startPlayerBreathing(this, fighter); }
      const ring = this.add.ellipse(position.x, fighter.shadow.y, 100, 18, 0xd7a857, 0)
        .setStrokeStyle(3, 0xffd784, 1).setDepth(5);
      return { state, fighter, ring, profile, position, progress: 0, pending: null, turns: 0, retired: false };
    });
    this.setGroupContext(0);
  }

  setGroupContext(index) {
    const target = this.trainingTargets[index];
    this.enemyIndex = index; this.enemy = target.state; this.foe = target.fighter;
  }

  withSelectedTarget(callback) {
    const previous = this.enemyIndex;
    this.setGroupContext(this.selectedTargetIndex);
    try { return callback(); } finally { this.setGroupContext(previous); }
  }

  selectTrainingTarget(index) {
    const target = this.trainingTargets?.[index];
    if (!target || target.state.hp <= 0 || this.busy || this.finished || this.scene.isPaused() || this.pendingActions.player) return false;
    this.selectedTargetIndex = index;
    this.setGroupContext(index);
    this.enemyRankNumber.setText(`NV ${target.profile.level}`);
    this.refreshHud();
    this.updateTimelineMarkers();
    this.setMessage(`Objetivo: ${target.profile.name}. Elegirlo no consume turno.`);
    return true;
  }

  refreshHud() {
    if (!this.trainingTargets) return super.refreshHud();
    this.withSelectedTarget(() => super.refreshHud());
    this.trainingTargets.forEach(({ state, ring }, index) => {
      const visible = state.hp > 0 && index === this.selectedTargetIndex;
      if (ring.visible !== visible) ring.setVisible(visible);
    });
  }

  combatantEvasion(combatant) {
    // Active opponents use the campaign's evasion rules, unlike the passive dummy.
    return (this.mission.groupTraining || this.mission.groupCombat) ? combatantEvasion(combatant)
      : super.combatantEvasion(combatant);
  }

  refreshBattlePhase() {
    if (!this.trainingTargets || !this.phaseLabel) return super.refreshBattlePhase();
    this.withSelectedTarget(() => {
      const text = this.finished ? "COMBATE FINALIZADO" : this.scene.isPaused() ? "COMBATE EN PAUSA"
        : this.turnReady ? `TURNO DE ${this.saveData.character.name.toUpperCase()}`
        : this.busy ? "EN COMBATE" : "INICIATIVA";
      if (this.phaseLabel.text !== text || this.phaseLabel.style.fontSize !== "12px") this.phaseLabel.setText(text).setFontSize(12);
      this.accessibleHud?.refresh();
      this.targetControls?.refresh();
    });
  }

  createTurnTimeline() {
    super.createTurnTimeline();
    if (this.trainingTargets) mountGroupTimeline(this);
  }

  updateTimelineMarkers(progress = this.timelineProgress) {
    if (!this.groupMarkers) return super.updateTimelineMarkers(progress);
    updateGroupTimeline(this);
  }

  participants() {
    return [{ id: "player", alive: this.player.hp > 0, progress: this.timelineProgress.player,
      speed: this.combatantSpeed(this.player), action: this.pendingActions.player, initiative: this.player.recoveryInitiative },
    ...this.trainingTargets.map((target, index) => ({ id: `enemy-${index}`, index, alive: target.state.hp > 0,
      progress: target.progress, speed: this.combatantSpeed(target.state), action: target.pending, initiative: target.state.recoveryInitiative }))];
  }

  startTurnCharge() {
    if (!(this.mission.groupTraining || this.mission.groupCombat)) return super.startTurnCharge();
    if (this.finished) return;
    this.busy = false; this.turnReady = false; this.timelinePaused = false;
    this.setButtonsEnabled(false);
    this.runTurnTimeline();
  }

  runTurnTimeline() {
    if (!(this.mission.groupTraining || this.mission.groupCombat)) return super.runTurnTimeline();
    if (this.finished || this.timelinePaused || this.busy || this.timelineTween) return;
    const step = nextGroupTimelineStep(this.participants());
    if (!step) return;
    const token = ++this.timelineRunToken;
    const epoch = this.groupEpoch;
    const arrive = () => {
      if (epoch !== this.groupEpoch || token !== this.timelineRunToken || this.finished || this.scene.isPaused()) return;
      this.timelineTween = null;
      this.handleGroupArrival(step.arrival);
    };
    if (step.duration <= 0) { this.time.delayedCall(0, arrive); return; }
    const from = Object.fromEntries(this.participants().map(unit => [unit.id, unit.progress]));
    const clock = { value: 0 };
    this.timelineTween = this.tweens.add({ targets: clock, value: 1, duration: step.duration, ease: "Linear",
      onUpdate: () => {
        if (epoch !== this.groupEpoch || this.finished) return;
        this.timelineProgress.player = from.player + (step.progress.player - from.player) * clock.value;
        this.trainingTargets.forEach((target, index) => {
          const id = `enemy-${index}`;
          if (id in step.progress) target.progress = from[id] + (step.progress[id] - from[id]) * clock.value;
        });
        this.advanceAdditionalGroupProgress?.(from, step.progress, clock.value);
        this.updateTimelineMarkers();
      }, onComplete: arrive });
  }

  async handleGroupArrival(arrival) {
    if (this.finished || this.busy || this.timelinePaused) return;
    if (arrival.id === "player") {
      if (arrival.action) return this.executeTimelineAction("player", arrival.action);
      this.player.recoveryInitiative = 0;
      this.timelinePaused = true; this.turnReady = true;
      this.setButtonsEnabled(true);
      this.setMessage("Tu turno. Elige un objetivo y una acción; el tiempo espera mientras decides.");
      return;
    }
    const target = this.trainingTargets[arrival.index];
    if (target.state.hp <= 0) return this.runTurnTimeline();
    if (arrival.action) return this.executeGroupAction("enemy", arrival.action, arrival.index);
    target.state.recoveryInitiative = 0;
    const action = chooseEnemyAbility(target.profile, target.state);
    target.pending = action;
    if (actionNeedsPreparation(action)) {
      startPlayerPreparing(this, target.fighter);
      this.refreshHud();
      this.setMessage(`${target.profile.name} prepara ${action.name}.`);
      this.runTurnTimeline();
    } else await this.executeGroupAction("enemy", action, arrival.index);
  }

  async useJutsu(action) {
    if (!(this.mission.groupTraining || this.mission.groupCombat)) return super.useJutsu(action);
    const move = this.mission.groupCombat ? action : this.trainingMoves.find(candidate => candidate.id === action?.id);
    if (!physicalActionAvailable(this, move)) return;
    this.setGroupContext(this.selectedTargetIndex);
    this.groupReservation = { target: this.selectedTargetIndex, cost: this.actionCost(move),
      health: actionHealthCost(move), previousCooldown: this.cooldowns[move.id] || 0 };
    return BattleFlowMethods.prototype.useJutsu.call(this, move);
  }

  async executeTimelineAction(actor, action) {
    if (!(this.mission.groupTraining || this.mission.groupCombat)) return super.executeTimelineAction(actor, action);
    return this.executeGroupAction(actor, action, this.groupReservation?.target ?? this.selectedTargetIndex);
  }

  async retireGroupTargets() {
    const effects = [];
    this.trainingTargets.forEach((target, index) => {
      if (target.state.hp > 0 || target.retired) return;
      target.retired = true; target.pending = null; target.progress = 0; target.state.reservedAction = null;
      stopPlayerPreparing(this, target.fighter, { immediate: true });
      stopPlayerBreathing(target.fighter);
      this.stopFighterFlash(target.fighter);
      effects.push(teleportSmoke(this, target.fighter.body.x, target.fighter.body.y - 48, () => {
        target.fighter.body.setVisible(false);
        target.fighter.shadow.setVisible(false);
      }, { pace: "substitution" }));
      target.ring.setVisible(false);
      const marker = this.groupMarkers?.[index];
      if (marker) [marker.marker, marker.halo, marker.label].forEach(part => part.setVisible(false));
    });
    if (this.trainingTargets[this.selectedTargetIndex].state.hp <= 0) {
      const next = this.trainingTargets.findIndex(target => target.state.hp > 0);
      if (next >= 0) this.selectedTargetIndex = next;
    }
    this.targetControls?.refresh();
    await Promise.all(effects);
  }

  async executeGroupAction(actor, action, index) {
    if (this.finished || this.groupExecuting) return;
    const execution = { actor, index }, playerAtStart = this.player;
    const current = () => !this.finished && this.player === playerAtStart;
    this.groupExecuting = execution;
    this.stopTurnTimeline(); this.timelinePaused = true; this.busy = true; this.turnReady = false;
    this.setButtonsEnabled(false);
    this.setGroupContext(index);
    const target = this.trainingTargets[index];
    const activeFighter = actor === "player" ? this.hero : target.fighter;
    this.hudActiveFighter = activeFighter;
    try {
      if (actor === "player") {
        if (!action.seals?.length) this.clearPreparationFeedback("player");
        // A reserved target can die from its own burn while the player prepares.
        // Cancel and refund only this reservation, never restore earlier HP.
        if (target.state.hp <= 0 && action.type !== "guard") {
          this.clearPreparationFeedback("player");
          this.player.chakra = Math.min(this.player.maxChakra, this.player.chakra + (this.groupReservation?.cost || 0));
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + (this.groupReservation?.health || 0));
          this.cooldowns[action.id] = this.groupReservation?.previousCooldown || 0;
          this.pendingActions.player = null; this.timelineProgress.player = 0; this.groupReservation = null;
          this.setMessage("El objetivo cayó durante la preparación. Recuperas el coste; elige otro rival en tu próximo turno.");
          return;
        }
        const casting = action.seals?.length ? await this.playSeals(action) : { mistakes: 0, multiplier: 1 };
        if (!current()) return;
        if (action.type === "item") await this.applyGroupConsumable(action.itemId);
        else if (action.type === "guard") await this.playerGuard(); else await this.playerAttack(action, casting);
        if (!current()) return;
        closeActionState(this, "player", action); this.groupReservation = null;
        await this.retireGroupTargets();
        if (!current()) return;
        if (this.trainingTargets.every(entry => entry.state.hp <= 0) && this.player.hp > 0) return this.finishBattle(true);
        if (this.player.hp <= 0) return this.finishBattle(false);
        await this.resolveCombatantStatusTick(this.player, this.hero);
      } else {
        if (!action.seals?.length) stopPlayerPreparing(this, target.fighter);
        const result = await this.executeEnemyAction(action);
        if (!current()) return;
        closeActionState(this, "enemy", action, { skipped: Boolean(result?.skipped) });
        target.turns += 1; target.pending = null; target.progress = 0;
        if (this.player.hp <= 0) return this.finishBattle(false);
        if (target.state.hp > 0) await this.resolveCombatantStatusTick(target.state, target.fighter);
      }
      if (!current()) return;
      await this.retireGroupTargets();
      if (!current()) return;
      if (this.player.hp <= 0) return this.finishBattle(false);
      if (this.trainingTargets.every(entry => entry.state.hp <= 0)) return this.finishBattle(true);
    } finally {
      if (this.hudActiveFighter === activeFighter) this.hudActiveFighter = null;
      if (this.groupExecuting === execution) this.groupExecuting = null;
      if (current()) {
        this.setGroupContext(this.selectedTargetIndex);
        this.refreshHud();
        this.startTurnCharge();
      }
    }
  }

  async finishBattle(won) {
    if (!(this.mission.groupTraining || this.mission.groupCombat)) return super.finishBattle(won);
    if (this.finished) return;
    this.finished = true; this.busy = true; this.turnReady = false; this.timelinePaused = true;
    this.stopTurnTimeline(); this.clearPreparationFeedback("player");
    this.trainingTargets.forEach(target => stopPlayerPreparing(this, target.fighter));
    const epoch = this.groupEpoch;
    await this.retireGroupTargets();
    if (epoch !== this.groupEpoch || !this.scene.isActive()) return;
    this.setGroupContext(this.selectedTargetIndex);
    this.refreshHud();
    showGroupTrainingResult(this, won);
  }
}
