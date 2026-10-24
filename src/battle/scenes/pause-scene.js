import { HEIGHT, Phaser, WIDTH, battleRuntime, sharpenTextTree } from "../runtime.js?v=0.82.9";
import { mountAccessiblePause } from "../hud-accessibility.js?v=0.88.1";

export class PauseScene extends Phaser.Scene {
  constructor() { super("pause"); }

  create() {
    this.cameras.main.setZoom(battleRuntime.renderResolution).centerOn(WIDTH / 2, HEIGHT / 2);
    this.battle = this.scene.get("battle");
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x02050a, 0.84).setOrigin(0).setDepth(100);
    this.add.rectangle(WIDTH / 2 + 5, HEIGHT / 2 + 7, 560, 460, 0x000000, 0.45).setDepth(101);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, 560, 460, 0x061321, 0.99)
      .setStrokeStyle(1.5, 0x65bce9, 0.95).setDepth(101);

    this.add.text(WIDTH / 2, 86, "MISIÓN EN PAUSA", {
      fontFamily: "Cinzel, Georgia, serif", fontSize: "26px", color: "#f7fbff", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(102);
    this.add.text(WIDTH / 2, 118, "Ajusta la partida o vuelve al combate.", {
      fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "13px", color: "#9fb0c6"
    }).setOrigin(0.5).setDepth(102);

    this.add.text(315, 145, "AJUSTES", {
      fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "12px", color: "#82d3f7", fontStyle: "bold"
    }).setOrigin(0, 0.5).setDepth(102);

    const rows = [
      ["Sellos manuales", "manual-seals"],
      ["Sacudida de cámara", "camera-effects"],
      ["Destellos de pantalla", "flash-effects"],
      ["Música", "music-enabled"],
      ["Modo ligero", "light-mode"]
    ];

    rows.forEach(([label, id], index) => this.makePauseToggle(480, 172 + index * 33, label, id));

    this.makeVolumeControl(480, 357);

    this.makePauseAction(400, 454, "REANUDAR", 0x36b5e8, () => {
      this.scene.resume("battle");
      this.scene.stop();
    }, 150);

    this.makePauseAction(560, 454, "ABANDONAR", 0xef665f, () => {
      const button = this.children.getByName("pause-action-ABANDONAR");
      if (button) button.disableInteractive();
      const payload = this.battle.abandonPayload();
      this.scene.stop("battle");
      if (this.battle.mission.type === "route-combat") this.scene.start("travel", { direction: "toVillage", secondaryResult: true, result: payload });
      else this.scene.start("travel", { direction: "toVillage", result: payload });
    }, 150);

    this.input.keyboard.once("keydown-ESC", () => {
      this.scene.resume("battle");
      this.scene.stop();
    });
    sharpenTextTree(this.children.list);
    mountAccessiblePause(this);
  }

  makePauseToggle(x, y, label, inputId) {
    const input = document.getElementById(inputId);
    const bg = this.add.rectangle(x, y, 330, 29, 0x101c2b, 1)
      .setStrokeStyle(1, 0x41546d, 0.95).setDepth(102).setInteractive({ useHandCursor: true });
    this.add.text(x - 150, y, label, {
      fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "12px", color: "#dce4ef", fontStyle: "bold"
    }).setOrigin(0, 0.5).setDepth(103);

    const value = this.add.text(x + 145, y, input.checked ? "ACTIVADO" : "DESACTIVADO", {
      fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "11px", color: input.checked ? "#79e8b5" : "#91a0b3", fontStyle: "bold"
    }).setOrigin(1, 0.5).setDepth(103);

    bg.on("pointerover", () => bg.setFillStyle(0x1a2a3d, 1));
    bg.on("pointerout", () => bg.setFillStyle(0x101c2b, 1));
    bg.on("pointerup", () => {
      input.checked = !input.checked;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      value.setText(input.checked ? "ACTIVADO" : "DESACTIVADO");
      value.setColor(input.checked ? "#79e8b5" : "#91a0b3");
    });
  }

  makeVolumeControl(x, y) {
    const input = document.getElementById("game-volume");
    this.add.text(x - 165, y, "VOLUMEN", {
      fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "12px", color: "#dce4ef", fontStyle: "bold"
    }).setOrigin(0, 0.5).setDepth(103);

    const value = this.add.text(x + 45, y, `${input.value}%`, {
      fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "12px", color: "#82d3f7", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(103);

    const adjust = (delta) => {
      input.value = String(Phaser.Math.Clamp(Number(input.value) + delta, 0, 100));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      value.setText(`${input.value}%`);
    };

    this.makePauseAction(x - 32, y, "−", 0x6f8fb7, () => adjust(-10), 42, false);
    this.makePauseAction(x + 112, y, "+", 0x6f8fb7, () => adjust(10), 42, false);
  }

  makePauseAction(x, y, label, color, callback, width = 260, once = true) {
    const bg = this.add.rectangle(x, y, width, 39, 0x111d2c, 1).setStrokeStyle(1, color, 1).setDepth(102)
      .setInteractive({ useHandCursor: true }).setName(`pause-action-${label}`);
    this.add.text(x, y, label, { fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "12px", color: "#f8f2e7", fontStyle: "bold" })
      .setOrigin(0.5).setDepth(103);
    bg.on("pointerover", () => bg.setFillStyle(color, 0.32));
    bg.on("pointerout", () => bg.setFillStyle(0x111d2c, 1));
    if (once) bg.once("pointerup", callback);
    else bg.on("pointerup", callback);
  }
}


