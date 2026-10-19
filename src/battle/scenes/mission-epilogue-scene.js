import { writeSave } from "../../save.js?v=0.66.0";
import { BATTLE_ARENAS, HEIGHT, Phaser, WIDTH, battleRuntime, sharpenTextTree } from "../runtime.js?v=0.68.0";

export class MissionEpilogueScene extends Phaser.Scene {
  constructor() { super("epilogue"); }

  preload() {
    const arenaIndex = ((battleRuntime.activeMission?.number || 1) - 1) % BATTLE_ARENAS.length;
    const arena = BATTLE_ARENAS[arenaIndex];
    this.epilogueBackground = arena.texture;
    if (!this.textures.exists(arena.texture)) this.load.image(arena.texture, arena.file);
    if (!this.textures.exists("sayo-kisaragi")) this.load.image("sayo-kisaragi", "assets/npcs/sayo-kisaragi.webp?v=0.21.0");
  }

  create(data = {}) {
    this.cameras.main.setZoom(battleRuntime.renderResolution).centerOn(WIDTH / 2, HEIGHT / 2);
    const lines = [
      "Seguí el rastro de estos bandidos. No era un grupo aislado: llevan semanas saqueando las aldeas vecinas.",
      "Perdí su rastro en la Aldea de Kagemori. Cuando regreses, dejaré una misión de investigación en el Tablón."
    ];
    let lineIndex = 0;

    this.add.image(WIDTH / 2, HEIGHT / 2, this.epilogueBackground).setDisplaySize(WIDTH, HEIGHT);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x020914, 0.16).setOrigin(0);
    const sayo = this.add.image(-120, 548, "sayo-kisaragi").setOrigin(0.5, 1).setDisplaySize(420, 505).setDepth(3);
    this.tweens.add({ targets: sayo, x: 214, duration: 720, ease: "Cubic.out" });
    this.add.text(214, 510, "Sayo Kisaragi", {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "12px", color: "#eaf7ff", fontStyle: "bold"
    }).setOrigin(0.5).setPadding(14, 5).setBackgroundColor("#031220").setStroke("#5ecfff", 1).setDepth(6);

    this.add.rectangle(690, 161, 500, 214, 0x031220, 0.95).setStrokeStyle(1.5, 0x55c9ff, 0.8).setDepth(4);
    this.add.rectangle(438, 54, 4, 214, 0x3fcaff, 1).setOrigin(0, 0).setDepth(5);
    this.add.text(462, 76, "SAYO KISARAGI · ARCHIVERA MAYOR", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "11px", color: "#83d8ff", fontStyle: "bold", letterSpacing: 1
    }).setDepth(6);
    this.add.rectangle(462, 101, 455, 1, 0x84c4e0, 0.3).setOrigin(0, 0).setDepth(6);
    const dialogue = this.add.text(462, 120, lines[0], {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "16px", color: "#f4f0e8", fontStyle: "bold", wordWrap: { width: 430 }, lineSpacing: 6
    }).setDepth(6);
    const counter = this.add.text(462, 240, "1/2", {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "12px", color: "#aac1d2", fontStyle: "bold"
    }).setDepth(6);
    const button = this.add.rectangle(846, 238, 122, 38, 0x0d4668, 1).setStrokeStyle(1, 0x55c9ff, 1).setInteractive({ useHandCursor: true }).setDepth(6);
    const buttonLabel = this.add.text(846, 238, "SIGUIENTE", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "11px", color: "#f4f8fb", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(7);
    button.on("pointerover", () => button.setFillStyle(0x17638d, 1));
    button.on("pointerout", () => button.setFillStyle(0x0d4668, 1));
    button.on("pointerup", () => {
      if (lineIndex === 0) {
        lineIndex = 1;
        dialogue.setText(lines[1]);
        counter.setText("2/2");
        buttonLabel.setText("REGRESAR");
        return;
      }
      button.disableInteractive();
      battleRuntime.activeSave.campaign.sayoEncounterSeen = true;
      battleRuntime.activeSave.campaign.secondaryBoardUnlocked = true;
      battleRuntime.activeSave = writeSave(battleRuntime.activeSave);
      this.scene.start("results", data.result || {});
    });
    this.cameras.main.fadeIn(300, 3, 9, 18);
    sharpenTextTree(this.children.list);
  }
}


