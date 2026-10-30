import { BattleScene } from "./battle-scene.js?v=0.122.0";
import { arenaRivalProfile, ARENA_BACKGROUND } from "../../arena.js?v=0.122.0";
import { showExhibitionResult } from "../exhibition-results.js?v=0.122.0";
import { WIDTH, HEIGHT, battleRuntime } from "../runtime.js?v=0.91.0";

// Comparte el combate y la clave de escena. Las misiones conservan sus reglas;
// las exhibiciones sustituyen únicamente persistencia, rival y desenlace.
export class ArenaBattleScene extends BattleScene {
  preload() {
    super.preload();
    if (this.mission.exhibition && !this.textures.exists("exhibition-arena")) this.load.image("exhibition-arena", ARENA_BACKGROUND);
  }
  create() {
    super.create();
    if (this.mission.exhibition) this.setMessage("Exhibición contra la IA. Sin consumibles, recompensas ni cambios en tu campaña.");
  }
  drawArena() {
    if (!this.mission.exhibition) return super.drawArena();
    this.arenaVisuals = null;
    this.add.image(WIDTH / 2, HEIGHT / 2, "exhibition-arena").setDisplaySize(WIDTH, HEIGHT).setDepth(0);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x06101a, .12).setOrigin(0).setDepth(1);
  }
  createEnemyState(profile) {
    if (!this.mission.exhibition) return super.createEnemyState(profile);
    const opponent = arenaRivalProfile(this.saveData, this.mission.arenaSettings);
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
    battleRuntime.releaseGameToMeta("arena");
  }
}
