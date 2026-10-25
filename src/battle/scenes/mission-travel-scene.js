import { createPlayerFighter, queuePlayerFighterTextures, startPlayerRunning, stopPlayerRunning } from "../../fighters.js?v=0.81.0";
import { playerFighterAppearance } from "../../character.js?v=0.76.0";
import { HEIGHT, Phaser, WIDTH, battleRuntime, sharpenTextTree } from "../runtime.js?v=0.91.0";

export class MissionTravelScene extends Phaser.Scene {
  constructor() { super("travel"); }

  preload() {
    if (!this.textures.exists("village-outskirts")) this.load.image("village-outskirts", "assets/locations/village-outskirts.webp?v=0.74.0");
    if (!this.textures.exists("forest-road")) this.load.image("forest-road", "assets/locations/forest-road.webp?v=0.75.0");
    if (!this.textures.exists("village-outskirts-branches")) this.load.image("village-outskirts-branches", "assets/locations/village-outskirts-branches.webp?v=0.74.0");
    queuePlayerFighterTextures(this, playerFighterAppearance(battleRuntime.activeSave));
  }

  create(data = {}) {
    if (battleRuntime.pendingSecondaryResults && Object.keys(data).length === 0) {
      data = { direction: "toVillage", result: battleRuntime.pendingSecondaryResults, secondaryResult: true };
      battleRuntime.pendingSecondaryResults = null;
    }
    this.cameras.main.setZoom(battleRuntime.renderResolution).centerOn(WIDTH / 2, HEIGHT / 2);
    const returningToVillage = data.direction === "toVillage";
    const returningToRoute = data.direction === "toDoctorRoute";
    const returning = returningToVillage || returningToRoute;
    const backgroundStartX = returning ? WIDTH / 2 - 22 : WIDTH / 2 + 22;
    const backgroundEndX = returning ? WIDTH / 2 + 22 : WIDTH / 2 - 22;
    const foregroundStartX = returning ? WIDTH / 2 - 62 : WIDTH / 2 + 62;
    const foregroundEndX = returning ? WIDTH / 2 + 62 : WIDTH / 2 - 62;
    const beginsAtVillage = !returningToVillage && !returningToRoute;
    const villageBackground = this.add.image(backgroundStartX, HEIGHT / 2, "village-outskirts")
      .setDisplaySize(WIDTH + 88, HEIGHT + 50).setDepth(0).setAlpha(beginsAtVillage ? 1 : 0);
    const forestBackground = this.add.image(backgroundStartX, HEIGHT / 2, "forest-road")
      .setDisplaySize(WIDTH + 88, HEIGHT + 50).setDepth(0).setAlpha(beginsAtVillage ? 0 : 1);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x06101a, 0.12).setOrigin(0).setDepth(1);

    const travelTitle = this.add.text(WIDTH / 2, HEIGHT / 2 - 16, returningToVillage ? "RUMBO A LA ALDEA" : returningToRoute ? "RETOMANDO LA BÚSQUEDA" : "RUMBO A LA MISIÓN", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "24px", color: "#f5edd8", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(10);
    const travelSubtitle = this.add.text(WIDTH / 2, HEIGHT / 2 + 22, returningToVillage ? "El sendero de vuelta atraviesa el bosque." : returningToRoute ? "El rastro de Haru continúa entre los caminos." : battleRuntime.activeMission.title, {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "14px", color: "#bcd4c1"
    }).setOrigin(0.5).setDepth(10);

    const startX = returning ? WIDTH + 90 : -90;
    const endX = returning ? -90 : WIDTH + 90;
    const runner = createPlayerFighter(this, startX, 330, playerFighterAppearance(battleRuntime.activeSave));
    if (returning) runner.body.setScale(-1, 1);
    startPlayerRunning(this, runner);
    this.cameras.main.fadeIn(220, 4, 10, 7);
    const duration = 2350;
    const backgroundTransitionDuration = 500;
    const backgroundTransitionDelay = duration / 2 - backgroundTransitionDuration / 2;
    const foreground = this.add.image(foregroundStartX, HEIGHT / 2, "village-outskirts-branches")
      .setDisplaySize(WIDTH + 165, HEIGHT + 92).setDepth(5);
    this.tweens.add({ targets: [villageBackground, forestBackground], x: backgroundEndX, duration, ease: "Linear" });
    this.tweens.add({ targets: foreground, x: foregroundEndX, duration, ease: "Linear" });
    this.tweens.add({ targets: runner.body, x: endX, duration, ease: "Linear" });
    this.tweens.add({ targets: runner.shadow, x: endX, duration, ease: "Linear" });
    this.tweens.add({ targets: [travelTitle, travelSubtitle], alpha: 0, delay: 850, duration: 260, ease: "Sine.easeIn" });
    if (!returningToRoute) {
      const fadingOut = returningToVillage ? forestBackground : villageBackground;
      const fadingIn = returningToVillage ? villageBackground : forestBackground;
      this.time.delayedCall(backgroundTransitionDelay, () => {
        this.tweens.add({ targets: fadingOut, alpha: 0, duration: backgroundTransitionDuration, ease: "Sine.easeInOut" });
        this.tweens.add({ targets: fadingIn, alpha: 1, duration: backgroundTransitionDuration, ease: "Sine.easeInOut" });
      });
    }
    this.time.delayedCall(duration - 260, () => this.cameras.main.fadeOut(250, 4, 10, 7));
    this.time.delayedCall(duration, () => {
      stopPlayerRunning(runner);
      if (returningToVillage && data.result) this.scene.start(data.secondaryResult ? "secondary-results" : "results", data.result);
      else if (returningToVillage) battleRuntime.releaseGameToMeta("plaza");
      else if (returningToRoute || battleRuntime.activeMission?.type === "route-search") battleRuntime.releaseGameToMeta("doctor-route");
      else if (battleRuntime.activeMission?.type === "investigation") battleRuntime.releaseGameToMeta("kagemori");
      else this.scene.start("battle");
    });
    sharpenTextTree(this.children.list);
  }
}


