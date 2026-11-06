import { ArenaBattleScene } from "./arena-battle-scene.js?v=0.140.0";
import { battleRuntime, WIDTH, HEIGHT } from "../runtime.js?v=0.91.0";
import { trainingActions, trainingDummyProfile } from "../../training.js?v=0.140.0";
import { CHAKRA_BALANCE } from "../../chakra-balance.js?v=1.0.0";
import { closeActionState } from "../action-resolution.js?v=1.4.0";
import { createEnemyState } from "../enemy-state.js?v=1.5.0";
import { META_ASSET_VERSION } from "../../asset-urls.js?v=0.115.0";
import { stopPlayerBreathing } from "../../fighters.js?v=0.140.0";

export class TrainingBattleScene extends ArenaBattleScene {
  battleLoadoutForMission() {
    if (!battleRuntime.activeMission.training) return super.battleLoadoutForMission();
    return trainingActions(battleRuntime.activeSave).filter(action => action.seals?.length).map(action => action.id);
  }
  preload() {
    super.preload();
    if (this.mission.training && !this.textures.exists("training-dojo")) this.load.image("training-dojo", `assets/locations/dojo.webp?v=${META_ASSET_VERSION}`);
  }
  drawArena() {
    if (!this.mission.training) return super.drawArena();
    this.arenaVisuals = null;
    this.add.image(WIDTH / 2, HEIGHT / 2, "training-dojo").setDisplaySize(WIDTH, HEIGHT).setDepth(0);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x06101a, .2).setOrigin(0).setDepth(1);
  }
  createEnemyState(profile) {
    if (!this.mission.training) return super.createEnemyState(profile);
    const dummy = trainingDummyProfile(profile);
    this.encounters[this.enemyIndex] = dummy;
    return { ...createEnemyState(dummy, this.mission, this.saveData.campaign), evasion: -100, baseEvasion: -100 };
  }
  createFighters() {
    super.createFighters();
    if (this.mission.training) {
      stopPlayerBreathing(this.foe);
      this.foe.layers.forEach(layer => layer.setTint(0xc89a60));
    }
  }
  combatantEvasion(combatant) {
    if (this.mission.training && combatant === this.enemy) return -100;
    return super.combatantEvasion(combatant);
  }
  create() {
    this.trainingMoves = this.mission.training ? trainingActions(this.saveData)
      .map(action => action.seals?.length ? { ...action, iconTexture: `element-${action.element}` } : action) : null;
    super.create();
    if (!this.mission.training) return;
    this.timelineLayer.setVisible(false);
    const host = this.game.canvas.parentElement;
    host.classList.add("training-mode");
    this.events.once("shutdown", () => host.classList.remove("training-mode"));
    this.setMessage("Entrenamiento libre: usa la tabla de ataques. La marioneta no ataca y los recursos se restauran en cada prueba. Puedes volver al Dojo desde la pausa.");
    // The table switch becomes available once Phaser finishes creating the scene.
    this.time.delayedCall(0, () => this.accessibleHud?.refresh());
  }
  startTurnCharge() {
    if (!this.mission.training) return super.startTurnCharge();
    if (this.finished) return;
    this.stopTurnTimeline();
    this.timelinePaused = true; this.busy = false; this.turnReady = true;
    this.setButtonsEnabled(true); this.refreshHud();
  }
  resetTraining() {
    this.clearGuard();
    Object.assign(this.player, { hp: this.player.maxHp, chakra: this.player.maxChakra, statuses: [], soak: null, guarding: false, recoveryInitiative: 0 });
    Object.assign(this.enemy, { hp: this.enemy.maxHp, chakra: 0, statuses: [], soak: null, guarding: false, recoveryInitiative: 0 });
    this.cooldowns = {};
    this.refreshHud();
  }
  async useJutsu(action) {
    if (!this.mission.training) return super.useJutsu(action);
    if (!action || this.busy || this.finished || this.scene.isPaused() || !this.turnReady) return;
    // Only learned moves may be invoked, including through the regular HUD.
    const move = this.trainingMoves.find(candidate => candidate.id === action.id);
    if (!move) return;
    this.resetTraining();
    this.busy = true; this.turnReady = false;
    this.setButtonsEnabled(false);
    const cost = this.actionCost(move), healthCost = move.healthCost || 0;
    this.player.chakra = Math.max(0, this.player.chakra - cost);
    this.player.hp = Math.max(1, this.player.hp - healthCost);
    this.refreshHud();
    try {
      const casting = move.seals?.length ? await this.playSeals(move) : { mistakes: 0, multiplier: 1 };
      if (this.finished) return;
      if (move.type === "guard") await this.playerGuard();
      else await this.playerAttack(move, casting);
      if (this.finished) return;
      closeActionState(this, "player", move);
      const damage = this.enemy.maxHp - this.enemy.hp;
      const statuses = this.enemy.statuses.map(status => `${status.label} (${status.duration} turnos)${status.power > 0 ? `: ${status.power} de daño por turno` : ""}`).join(" · ");
      const soak = this.enemy.soak?.stacks ? ` · Empapado ×${this.enemy.soak.stacks}` : "";
      const result = move.type === "guard" ? `${move.name}: reduce el daño recibido un 50 % y recupera ${CHAKRA_BALANCE.guardRecovery} CH en total.`
        : `${move.name}: ${damage} de daño${statuses ? ` · ${statuses}` : ""}${soak}. Coste: ${healthCost ? `${healthCost} PV` : `${cost} CH`}.`;
      this.setMessage(result);
    } finally {
      if (!this.finished) {
        this.player.hp = this.player.maxHp; this.player.chakra = this.player.maxChakra;
        this.player.recoveryInitiative = 0;
        this.enemy.hp = this.enemy.maxHp;
        this.startTurnCharge();
      }
    }
  }
  leaveExhibition() {
    if (!this.mission.training) return super.leaveExhibition();
    this.finished = true; this.stopTurnTimeline();
    battleRuntime.releaseGameToMeta(this.mission.trainingOrigin);
  }
}
