import { createPlayerFighter, queuePlayerFighterTextures, startPlayerRunning, stopPlayerRunning } from "../../fighters.js?v=0.62.0";
import { playerFighterAppearance } from "../../character.js?v=0.62.0";
import { BATTLE_ARENAS, HEIGHT, Phaser, WIDTH, battleRuntime, sharpenTextTree } from "../runtime.js?v=0.68.0";

export class MissionTravelScene extends Phaser.Scene {
  constructor() { super("travel"); }

  preload() {
    this.load.image(BATTLE_ARENAS[0].texture, BATTLE_ARENAS[0].file);
    queuePlayerFighterTextures(this, playerFighterAppearance(battleRuntime.activeSave));
  }

  create(data = {}) {
    this.cameras.main.setZoom(battleRuntime.renderResolution).centerOn(WIDTH / 2, HEIGHT / 2);
    const returningToVillage = data.direction === "toVillage";
    const returningToRoute = data.direction === "toDoctorRoute";
    const returning = returningToVillage || returningToRoute;
    this.add.image(WIDTH / 2, HEIGHT / 2, "travel-forest").setDisplaySize(WIDTH, HEIGHT).setDepth(0);
    const forest = this.add.graphics().setDepth(1);
    forest.fillStyle(0x071711, 0.34).fillRect(0, 0, WIDTH, HEIGHT);
    forest.fillStyle(0x10261b, 0.92).fillRect(0, 382, WIDTH, 158);
    forest.fillStyle(0x1c3423, 0.96);
    forest.fillTriangle(0, 436, 480, 356, 960, 436);
    forest.fillStyle(0x07130d, 0.88);
    for (let x = 18; x < WIDTH; x += 74) {
      const height = 105 + ((x * 17) % 72);
      forest.fillRect(x - 7, 382 - height, 14, height + 74);
      forest.fillTriangle(x - 47, 382 - height + 54, x, 382 - height - 34, x + 47, 382 - height + 54);
      forest.fillTriangle(x - 39, 382 - height + 92, x, 382 - height + 12, x + 39, 382 - height + 92);
    }
    forest.fillStyle(0x06100b, 0.82).fillRect(0, 421, WIDTH, 119);

    this.add.text(WIDTH / 2, 62, returningToVillage ? "REGRESO A LA ALDEA" : returningToRoute ? "RETOMANDO LA BÚSQUEDA" : "RUMBO A LA MISIÓN", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "24px", color: "#f5edd8", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(10);
    this.add.text(WIDTH / 2, 94, returningToVillage ? "El sendero de vuelta atraviesa el bosque." : returningToRoute ? "El rastro de Haru continúa entre los caminos." : battleRuntime.activeMission.title, {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "14px", color: "#bcd4c1"
    }).setOrigin(0.5).setDepth(10);

    const startX = returning ? WIDTH + 90 : -90;
    const endX = returning ? -90 : WIDTH + 90;
    const runner = createPlayerFighter(this, startX, 330, playerFighterAppearance(battleRuntime.activeSave));
    if (returning) runner.body.setScale(-1, 1);
    startPlayerRunning(this, runner);
    this.cameras.main.fadeIn(220, 4, 10, 7);
    const duration = 2350;
    this.tweens.add({ targets: runner.body, x: endX, duration, ease: "Linear" });
    this.tweens.add({ targets: runner.shadow, x: endX, duration, ease: "Linear" });
    this.time.delayedCall(duration - 260, () => this.cameras.main.fadeOut(250, 4, 10, 7));
    this.time.delayedCall(duration, () => {
      stopPlayerRunning(runner);
      if (returningToVillage) battleRuntime.releaseGameToMeta("plaza");
      else if (returningToRoute || battleRuntime.activeMission?.type === "route-search") battleRuntime.releaseGameToMeta("doctor-route");
      else if (battleRuntime.activeMission?.type === "investigation") battleRuntime.releaseGameToMeta("kagemori");
      else this.scene.start("battle");
    });
    sharpenTextTree(this.children.list);
  }
}


