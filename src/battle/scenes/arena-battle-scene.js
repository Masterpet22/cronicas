import { BattleScene } from "./battle-scene.js?v=0.131.0";
import { arenaRivalProfile, ARENA_BACKGROUND } from "../../arena.js?v=0.131.0";
import { showExhibitionResult } from "../exhibition-results.js?v=0.131.0";
import { WIDTH, HEIGHT, battleRuntime } from "../runtime.js?v=0.91.0";
import { TOWER_BACKGROUND, towerRivalProfile } from "../../tower.js?v=0.131.0";

// Comparte el combate y la clave de escena. Las misiones conservan sus reglas;
// las exhibiciones sustituyen únicamente persistencia, rival y desenlace.
export class ArenaBattleScene extends BattleScene {
  preload() {
    super.preload();
    const key = this.mission.tower ? "elemental-tower" : "exhibition-arena";
    if (this.mission.exhibition && !this.textures.exists(key)) this.load.image(key, this.mission.tower ? TOWER_BACKGROUND : ARENA_BACKGROUND);
  }
  create() {
    super.create();
    if (this.mission.exhibition) this.setMessage(this.mission.tower ? "Desafío elemental: derrota al minijefe. La victoria se guarda al volver a la Torre." : "Exhibición contra la IA. Sin consumibles, recompensas ni cambios en tu campaña.");
  }
  drawArena() {
    if (!this.mission.exhibition) return super.drawArena();
    this.arenaVisuals = null;
    this.add.image(WIDTH / 2, HEIGHT / 2, this.mission.tower ? "elemental-tower" : "exhibition-arena").setDisplaySize(WIDTH, HEIGHT).setDepth(0);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x06101a, .12).setOrigin(0).setDepth(1);
  }
  createEnemyState(profile) {
    if (!this.mission.exhibition) return super.createEnemyState(profile);
    const opponent = this.mission.tower ? towerRivalProfile(this.saveData, this.mission) : arenaRivalProfile(this.saveData, this.mission.arenaSettings);
    this.encounters[this.enemyIndex] = opponent;
    return super.createEnemyState(opponent);
  }
  recordEnemyObservation(observation) {
    if (!this.mission.exhibition) return super.recordEnemyObservation(observation);
  }
  async resolveEnemyOutcome() {
    if (!this.mission.exhibition) return super.resolveEnemyOutcome();
    if (this.enemy.hp > 0) return false;
    this.defeatedEncounters = 1;
    await this.finishBattle(true);
    return true;
  }
  async finishBattle(won) {
    if (!this.mission.exhibition) return super.finishBattle(won);
    if (this.finished) return;
    this.finished = true; this.busy = true; this.timelinePaused = true;
    if (won && this.mission.tower) battleRuntime.activeMission.towerVictory = this.mission.tower.key;
    this.stopTurnTimeline();
    this.clearPreparationFeedback("player"); this.clearPreparationFeedback("enemy");
    this.setButtonsEnabled(false); this.refreshHud();
    showExhibitionResult(this, won);
  }
  abandonPayload() {
    if (!this.mission.exhibition) return super.abandonPayload();
    this.leaveExhibition();
  }
  leaveExhibition() {
    this.finished = true; this.stopTurnTimeline();
    battleRuntime.releaseGameToMeta(this.mission.tower ? "tower" : "arena");
  }
}
