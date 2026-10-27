import { HEIGHT, Phaser, WIDTH, battleRuntime, sharpenTextTree } from "../runtime.js?v=0.91.0";
import { mountAccessiblePause } from "../hud-accessibility.js?v=0.95.0";

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

    this.makePauseAction(560, 454, this.battle.mission.tutorialReplay ? "SALIR" : "ABANDONAR", 0xef665f, () => {
      if (this.battle.mission.tutorialReplay) this.battle.exitTutorialReplay();
      else this.showAbandonWarning();
    }, 150, false);

    this.input.keyboard.on("keydown-ESC", () => {
      if (this.abandonWarningOpen) {
        this.closeAbandonWarning?.();
        return;
      }
      this.scene.resume("battle");
      this.scene.stop();
    });
    sharpenTextTree(this.children.list);
    this.pauseAccess = mountAccessiblePause(this);
  }

  showAbandonWarning() {
    if (this.abandonWarningOpen) return;
    this.abandonWarningOpen = true;
    if (this.pauseAccess?.root) this.pauseAccess.root.inert = true;
    const pendingLevels = Math.max(0, this.battle.rewardPreviewSave.progression.level - this.battle.missionStartSave.progression.level);
    const levelLine = pendingLevels
      ? `También perderás ${pendingLevels} nivel${pendingLevels === 1 ? "" : "es"} mostrado${pendingLevels === 1 ? "" : "s"} durante el combate.`
      : "Cualquier nivel mostrado durante esta misión también se perderá.";
    const layer = [];
    const add = (object) => { layer.push(object); return object; };
    add(this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x010813, 0.88).setOrigin(0).setDepth(110).setInteractive());
    add(this.add.rectangle(480, 270, 620, 278, 0x102033, 0.99).setStrokeStyle(2, 0xef8075, 0.95).setDepth(111));
    add(this.add.text(480, 172, "¿ABANDONAR LA MISIÓN?", {
      fontFamily: "Cinzel, Georgia, serif", fontSize: "23px", color: "#fff0e0", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(112));
    add(this.add.text(480, 229, "Si sales ahora, perderás toda la experiencia, las monedas y las recompensas de esta misión.", {
      fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "16px", color: "#e7e1dc", align: "center", wordWrap: { width: 530 }
    }).setOrigin(0.5).setDepth(112));
    add(this.add.text(480, 289, levelLine, {
      fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "16px", color: "#ffd0aa", align: "center", wordWrap: { width: 530 }
    }).setOrigin(0.5).setDepth(112));
    const stay = add(this.add.rectangle(360, 354, 206, 43, 0x1a5472, 1).setStrokeStyle(1, 0x9bd9f0).setInteractive({ useHandCursor: true }).setDepth(112));
    add(this.add.text(360, 354, "SEGUIR JUGANDO", { fontFamily: "Cinzel, Georgia, serif", fontSize: "13px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5).setDepth(113));
    const leave = add(this.add.rectangle(600, 354, 206, 43, 0x8b3334, 1).setStrokeStyle(1, 0xff9f96).setInteractive({ useHandCursor: true }).setDepth(112).setName("confirm-abandon-mission"));
    add(this.add.text(600, 354, "ABANDONAR MISIÓN", { fontFamily: "Cinzel, Georgia, serif", fontSize: "13px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5).setDepth(113));

    const dialog = document.createElement("div");
    dialog.className = "combat-abandon-confirm-access";
    dialog.setAttribute("role", "alertdialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Confirmar abandono de misión");
    dialog.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
    const message = document.createElement("p");
    message.textContent = `Si abandonas, perderás toda la experiencia, monedas y recompensas de esta misión. ${levelLine}`;
    const stayButton = document.createElement("button");
    stayButton.type = "button";
    stayButton.textContent = "Seguir jugando";
    const leaveButton = document.createElement("button");
    leaveButton.type = "button";
    leaveButton.textContent = "Abandonar misión y perder recompensas";
    dialog.append(message, stayButton, leaveButton);
    this.game.canvas.parentElement?.append(dialog);
    const close = () => {
      layer.forEach((object) => object.destroy());
      dialog.remove();
      this.abandonWarningOpen = false;
      this.closeAbandonWarning = null;
      if (this.pauseAccess?.root) this.pauseAccess.root.inert = false;
    };
    const confirm = () => {
      close();
      const payload = this.battle.abandonPayload();
      this.scene.stop("battle");
      if (this.battle.mission.type === "route-combat") this.scene.start("travel", { direction: "toVillage", secondaryResult: true, result: payload });
      else this.scene.start("travel", { direction: "toVillage", result: payload });
    };
    this.closeAbandonWarning = close;
    stay.on("pointerup", close);
    leave.once("pointerup", confirm);
    stayButton.addEventListener("click", close);
    leaveButton.addEventListener("click", confirm);
    stayButton.focus({ preventScroll: true });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => dialog.remove());
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


