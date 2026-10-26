import { createPlayerFighter, queuePlayerFighterTextures, startPlayerRunning, stopPlayerRunning } from "../../fighters.js?v=0.81.0";
import { playerFighterAppearance } from "../../character.js?v=0.76.0";
import { shouldShowLevelUp } from "./level-up-scene.js?v=0.95.0";
import { missionTravelPresentation } from "../mission-travel-presentation.js?v=0.96.0";
import { BATTLE_ARENAS, HEIGHT, Phaser, WIDTH, battleRuntime, sharpenTextTree } from "../runtime.js?v=0.91.0";

export class MissionTravelScene extends Phaser.Scene {
  constructor() { super("travel"); }

  preload() {
    if (!this.textures.exists("village-outskirts")) this.load.image("village-outskirts", "assets/locations/village-outskirts.webp?v=0.74.0");
    if (!this.textures.exists("forest-road")) this.load.image("forest-road", "assets/locations/forest-road.webp?v=0.75.0");
    if (!this.textures.exists("village-outskirts-branches")) this.load.image("village-outskirts-branches", "assets/locations/village-outskirts-branches.webp?v=0.74.0");
    if (!this.textures.exists("preparation-mote")) this.load.image("preparation-mote", "assets/vfx/feedback/preparation-mote.png?v=0.91.0");
    if (battleRuntime.activeMission?.encounters?.length) {
      const arena = BATTLE_ARENAS[((battleRuntime.activeMission.number || 1) - 1) % BATTLE_ARENAS.length];
      if (!this.textures.exists(arena.texture)) this.load.image(arena.texture, arena.file);
    }
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
    const presentation = missionTravelPresentation(battleRuntime.activeMission, data);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const lightMode = window.localStorage.getItem("light-mode") === "on";
    const backgroundStartX = returning ? WIDTH / 2 - 22 : WIDTH / 2 + 22;
    const backgroundEndX = returning ? WIDTH / 2 + 22 : WIDTH / 2 - 22;
    const foregroundStartX = returning ? WIDTH / 2 - 62 : WIDTH / 2 + 62;
    const foregroundEndX = returning ? WIDTH / 2 + 62 : WIDTH / 2 - 62;
    const beginsAtVillage = !returningToVillage && !returningToRoute;
    const villageBackground = this.add.image(backgroundStartX, HEIGHT / 2, "village-outskirts")
      .setDisplaySize(WIDTH + 88, HEIGHT + 50).setDepth(0).setAlpha(beginsAtVillage ? 1 : 0);
    const forestBackground = this.add.image(backgroundStartX, HEIGHT / 2, "forest-road")
      .setDisplaySize(WIDTH + 88, HEIGHT + 50).setDepth(0).setAlpha(beginsAtVillage ? 0 : 1);
    const arenaPreview = battleRuntime.activeMission?.encounters?.length
      ? this.add.image(backgroundStartX, HEIGHT / 2, BATTLE_ARENAS[((battleRuntime.activeMission.number || 1) - 1) % BATTLE_ARENAS.length].texture)
        .setDisplaySize(WIDTH + 88, HEIGHT + 50).setDepth(1).setAlpha(returning ? 1 : 0).setName("travel-arena-preview")
      : null;
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x06101a, 0.12).setOrigin(0).setDepth(1);
    const atmosphere = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, presentation.accent, 0.06).setDepth(2);
    if (!reducedMotion && !lightMode) {
      this.add.particles(0, 0, "preparation-mote", {
        x: { min: 0, max: WIDTH }, y: { min: 130, max: HEIGHT - 65 },
        speedX: { min: returning ? -32 : 12, max: returning ? -8 : 34 },
        speedY: { min: -15, max: 5 },
        lifespan: { min: 900, max: 1600 }, frequency: 85, maxParticles: 24,
        scale: { start: 0.34, end: 0 }, alpha: { start: 0.68, end: 0 },
        tint: presentation.accent, blendMode: "ADD"
      }).setDepth(4).setName("travel-atmosphere-particles");
    }

    const eyebrow = this.add.text(WIDTH / 2, 169, presentation.missionLabel, {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "12px", color: "#d9e9ee", fontStyle: "bold", letterSpacing: 2
    }).setOrigin(0.5).setDepth(11).setAlpha(0).setName("travel-mission-label");

    const travelTitle = this.add.text(WIDTH / 2, HEIGHT / 2 - 16, returningToVillage ? "RUMBO A LA ALDEA" : returningToRoute ? "RETOMANDO LA BÚSQUEDA" : "RUMBO A LA MISIÓN", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "24px", color: "#f5edd8", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(10);
    const travelSubtitle = this.add.text(WIDTH / 2, HEIGHT / 2 + 22, returningToVillage ? "El sendero de vuelta atraviesa el bosque." : returningToRoute ? "El rastro de Haru continúa entre los caminos." : battleRuntime.activeMission.title, {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "14px", color: "#bcd4c1"
    }).setOrigin(0.5).setDepth(10);
    const arrival = this.add.text(WIDTH / 2, HEIGHT / 2 - 12, presentation.arrival, {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "24px", color: "#f8f3e8", fontStyle: "bold",
      stroke: "#102536", strokeThickness: 4
    }).setOrigin(0.5).setDepth(11).setAlpha(0).setName("travel-arrival");
    const arrivalLocation = this.add.text(WIDTH / 2, HEIGHT / 2 + 26, presentation.location, {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "15px", color: "#d5e2e8", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(11).setAlpha(0);

    this.add.rectangle(WIDTH / 2, 486, 360, 3, 0xdde8e5, 0.25).setDepth(10);
    const progress = this.add.rectangle(returning ? 660 : 300, 486, 0, 3, presentation.accent, 0.95)
      .setOrigin(returning ? 1 : 0, 0.5).setDepth(11).setName("travel-progress");
    this.add.circle(returning ? 660 : 300, 486, 5, presentation.accent, 0.92).setDepth(12);
    this.add.circle(returning ? 300 : 660, 486, 5, 0xe4efed, 0.7).setDepth(12);
    this.add.text(300, 466, returning ? presentation.destination : presentation.departure, {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "11px", color: "#d6e7e4", fontStyle: "bold"
    }).setOrigin(0, 0.5).setDepth(11);
    this.add.text(660, 466, returning ? presentation.departure : presentation.destination, {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "11px", color: "#d6e7e4", fontStyle: "bold"
    }).setOrigin(1, 0.5).setDepth(11);

    const startX = returning ? WIDTH + 90 : -90;
    const endX = returning ? -90 : WIDTH + 90;
    const runner = createPlayerFighter(this, startX, 330, playerFighterAppearance(battleRuntime.activeSave));
    runner.body.setName("travel-runner");
    if (returning) runner.body.setScale(-1, 1);
    startPlayerRunning(this, runner);
    this.cameras.main.fadeIn(220, 4, 10, 7);
    const duration = reducedMotion ? 1250 : 2350;
    const backgroundTransitionDuration = 500;
    const backgroundTransitionDelay = duration / 2 - backgroundTransitionDuration / 2;
    const foreground = this.add.image(foregroundStartX, HEIGHT / 2, "village-outskirts-branches")
      .setDisplaySize(WIDTH + 165, HEIGHT + 92).setDepth(5);
    this.tweens.add({ targets: [villageBackground, forestBackground], x: backgroundEndX, duration, ease: "Linear" });
    this.tweens.add({ targets: foreground, x: foregroundEndX, duration, ease: "Linear" });
    this.tweens.add({ targets: runner.body, x: endX, duration, ease: "Linear" });
    this.tweens.add({ targets: runner.shadow, x: endX, duration, ease: "Linear" });
    this.tweens.add({ targets: eyebrow, alpha: 1, y: "-=8", duration: reducedMotion ? 100 : 300, ease: "Sine.out" });
    this.tweens.add({ targets: [travelTitle, travelSubtitle], alpha: 0, delay: duration * 0.37, duration: 200, ease: "Sine.easeIn" });
    this.tweens.add({ targets: [arrival, arrivalLocation], alpha: 1, y: "-=8", delay: duration * 0.58,
      duration: reducedMotion ? 120 : 330, ease: "Cubic.out" });
    this.tweens.add({ targets: progress, width: 360, duration: duration - 210, ease: "Sine.inOut" });
    this.tweens.add({ targets: atmosphere, alpha: 0.12, duration: duration / 2, yoyo: true, ease: "Sine.inOut" });
    if (!reducedMotion && !lightMode) {
      this.cameras.main.zoomTo(battleRuntime.renderResolution * 1.045, duration - 180);
      this.cameras.main.pan(WIDTH / 2 + (returning ? -12 : 12), HEIGHT / 2 - 3, duration - 180);
    }
    if (!returningToRoute) {
      const fadingOut = returningToVillage ? forestBackground : villageBackground;
      const fadingIn = returningToVillage ? villageBackground : forestBackground;
      this.time.delayedCall(backgroundTransitionDelay, () => {
        this.tweens.add({ targets: fadingOut, alpha: 0, duration: backgroundTransitionDuration, ease: "Sine.easeInOut" });
        this.tweens.add({ targets: fadingIn, alpha: 1, duration: backgroundTransitionDuration, ease: "Sine.easeInOut" });
      });
    }
    if (arenaPreview) {
      this.tweens.add({ targets: arenaPreview, x: backgroundEndX, duration, ease: "Linear" });
      this.tweens.add({ targets: arenaPreview, alpha: returning ? 0 : 0.9,
        delay: returning ? duration * 0.12 : duration * 0.69,
        duration: duration * 0.24, ease: "Sine.inOut" });
    }
    this.time.delayedCall(duration - 260, () => this.cameras.main.fadeOut(250, 4, 10, 7));
    this.time.delayedCall(duration, () => {
      stopPlayerRunning(runner);
      if (returningToVillage && data.result) {
        const nextScene = data.secondaryResult ? "secondary-results" : "results";
        if (!data.result.levelUpShown && shouldShowLevelUp(data.result)) this.scene.start("level-up", { result: data.result, nextScene });
        else this.scene.start(nextScene, data.result);
      }
      else if (returningToVillage) battleRuntime.releaseGameToMeta("plaza");
      else if (returningToRoute || battleRuntime.activeMission?.type === "route-search") battleRuntime.releaseGameToMeta("doctor-route");
      else if (battleRuntime.activeMission?.type === "investigation") battleRuntime.releaseGameToMeta("kagemori");
      else this.scene.start("battle");
    });
    sharpenTextTree(this.children.list);
  }
}


