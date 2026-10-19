import { BATTLE_ARENAS, HEIGHT, Phaser, WIDTH, battleRuntime, sharpenTextTree } from "../runtime.js?v=0.68.0";

export class SecondaryResultsScene extends Phaser.Scene {
  constructor() { super("secondary-results"); }

  textStyle(size, color, weight = "500", display = false) {
    return {
      fontFamily: display ? '"Cinzel", Georgia, serif' : '"Alegreya Sans", "Segoe UI", sans-serif',
      fontSize: `${size}px`, color,
      fontStyle: weight === "700" || weight === "800" ? "bold" : "normal",
      resolution: battleRuntime.textTextureResolution
    };
  }

  preload() {
    if (!this.textures.exists("kagemori-investigation")) this.load.image("kagemori-investigation", "assets/locations/kagemori.webp?v=0.59.0");
    if (!this.textures.exists("travel-forest")) this.load.image("travel-forest", BATTLE_ARENAS[0].file);
  }

  create(data = {}) {
    if (battleRuntime.pendingSecondaryResults && Object.keys(data).length === 0) {
      data = battleRuntime.pendingSecondaryResults;
      battleRuntime.pendingSecondaryResults = null;
    }
    this.cameras.main.setZoom(battleRuntime.renderResolution).centerOn(WIDTH / 2, HEIGHT / 2);
    if (battleRuntime.activeMission?.type === "route-search" || data.missionType === "route-search") {
      this.createDoctorResults(data);
      return;
    }
    const completed = data.outcome === "completed";
    this.add.image(WIDTH / 2, HEIGHT / 2, "kagemori-investigation").setDisplaySize(WIDTH, HEIGHT);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x020914, 0.7).setOrigin(0);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, 760, 430, 0x031220, 0.96).setStrokeStyle(1.5, 0x55c9ff, 0.82);
    this.add.rectangle(100, 55, 5, 430, 0x3fcaff, 1).setOrigin(0, 0);
    this.add.text(140, 88, completed ? "INFORME DE INVESTIGACIÓN" : "INVESTIGACIÓN SUSPENDIDA", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "24px", color: completed ? "#83d8ff" : "#ef9a91", fontStyle: "bold"
    });
    this.add.text(140, 126, "EL SILENCIO DE KAGEMORI", this.textStyle(12, "#f0b85c", "800", true));
    this.add.text(140, 158, completed ? "Las pistas forman una ruta verificable hacia el Desfiladero del Cuervo." : "Regresas sin cerrar la ruta. El encargo seguirá disponible en el Tablón.", this.textStyle(14, "#d6e3eb", "700")).setWordWrapWidth(680);

    const clues = ["CARRETA SAQUEADA", "POLVO DE CANTERA", "HUELLAS AL NORTE"];
    clues.forEach((label, index) => {
      const x = 240 + index * 240;
      const found = index < (data.clues || 0);
      const card = this.add.rectangle(x, 275, 190, 118, 0x0b1b2a, 1).setStrokeStyle(1, found ? 0x79e8b5 : 0x52677a, 0.95).setScale(0.84).setAlpha(0);
      this.add.text(x, 250, found ? "✓" : "—", this.textStyle(27, found ? "#79e8b5" : "#718596", "800", true)).setOrigin(0.5).setAlpha(0).setName(`secondary-mark-${index}`);
      this.add.text(x, 300, label, { ...this.textStyle(10, found ? "#e6fff5" : "#91a2af", "800", true), align: "center", wordWrap: { width: 160 } }).setOrigin(0.5).setAlpha(0).setName(`secondary-label-${index}`);
      this.tweens.add({ targets: [card, this.children.getByName(`secondary-mark-${index}`), this.children.getByName(`secondary-label-${index}`)], alpha: 1, scale: 1, duration: 360, delay: 180 + index * 150, ease: "Back.out" });
    });

    this.add.text(WIDTH / 2, 374, completed ? "NUEVA MISIÓN PRINCIPAL DESBLOQUEADA" : "SIN RECOMPENSAS", this.textStyle(13, completed ? "#f0b85c" : "#9aaab6", "800", true)).setOrigin(0.5);
    const button = this.add.rectangle(WIDTH / 2, 440, 240, 44, 0x0d4668, 1).setStrokeStyle(1.5, 0x55c9ff, 1).setInteractive({ useHandCursor: true });
    this.add.text(WIDTH / 2, 440, "← REGRESAR A LA ALDEA", this.textStyle(12, "#f4f8fb", "800", true)).setOrigin(0.5);
    button.on("pointerover", () => button.setFillStyle(0x17638d, 1));
    button.on("pointerout", () => button.setFillStyle(0x0d4668, 1));
    button.once("pointerup", () => this.scene.start("travel", { direction: "toVillage" }));
    this.cameras.main.fadeIn(320, 3, 9, 18);
    sharpenTextTree(this.children.list);
  }

  createDoctorResults(data) {
    const completed = data.outcome === "completed";
    const stats = data.routeStats || {};
    this.add.image(WIDTH / 2, HEIGHT / 2, "travel-forest").setDisplaySize(WIDTH, HEIGHT);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x020914, 0.6).setOrigin(0);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, 790, 438, 0x031220, 0.96).setStrokeStyle(1.5, 0x55c9ff, 0.82);
    this.add.rectangle(85, 51, 5, 438, completed ? 0xf0b85c : 0x8ea3b2, 1).setOrigin(0, 0);
    this.add.text(125, 80, completed ? "BÚSQUEDA COMPLETADA" : "BÚSQUEDA SUSPENDIDA", this.textStyle(24, completed ? "#f0b85c" : "#9eb1bf", "800", true));
    this.add.text(125, 117, "EL MÉDICO ERRANTE", this.textStyle(12, "#83d8ff", "800", true));
    this.add.text(125, 148, completed ? "Haru descifró el mapa y confió su libro a la Biblioteca." : "El rastro permanece abierto. No se entregan recompensas.", this.textStyle(14, "#d6e3eb", "700"));
    const cards = [
      ["PELIGRO", stats.danger || 0], ["TIEMPO", stats.time || 0], ["PISTAS", stats.clues || 0], ["RECURSOS", stats.resources || 0]
    ];
    cards.forEach(([label, value], index) => {
      const x = 190 + index * 190;
      const card = this.add.rectangle(x, 255, 160, 108, 0x0b1b2a, 1).setStrokeStyle(1, 0x55c9ff, 0.55).setScale(0.85).setAlpha(0);
      const valueText = this.add.text(x, 238, String(value), this.textStyle(29, "#f4f0e8", "800", true)).setOrigin(0.5).setAlpha(0);
      const labelText = this.add.text(x, 280, label, this.textStyle(10, "#83d8ff", "800", true)).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: [card, valueText, labelText], alpha: 1, scale: 1, duration: 340, delay: 150 + index * 100, ease: "Back.out" });
    });
    const rewards = data.rewards || { xp: 0, affinityXp: 0, coins: 0 };
    this.add.text(WIDTH / 2, 346, completed ? `LIBRO ANTIGUO · +${rewards.xp} PX · +${rewards.affinityXp} AFINIDAD · +${rewards.coins} MONEDAS` : "SIN RECOMPENSAS", this.textStyle(12, completed ? "#f0b85c" : "#9aaab6", "800", true)).setOrigin(0.5);
    this.add.text(WIDTH / 2, 371, completed ? "Siguiente destino obligatorio: Biblioteca" : "Puedes reiniciar el encargo desde el Tablón.", this.textStyle(12, "#b9cad5", "700")).setOrigin(0.5);
    if (completed && rewards.supplyBonus) this.add.text(WIDTH / 2, 396, "+1 SUMINISTRO PARA LA GUARIDA POR LOS RECURSOS RECUPERADOS", this.textStyle(10, "#79e8b5", "800", true)).setOrigin(0.5);
    const button = this.add.rectangle(WIDTH / 2, 438, 250, 44, 0x0d4668, 1).setStrokeStyle(1.5, 0x55c9ff, 1).setInteractive({ useHandCursor: true });
    this.add.text(WIDTH / 2, 438, "← REGRESAR A LA ALDEA", this.textStyle(12, "#f4f8fb", "800", true)).setOrigin(0.5);
    button.on("pointerover", () => button.setFillStyle(0x17638d, 1));
    button.on("pointerout", () => button.setFillStyle(0x0d4668, 1));
    button.once("pointerup", () => this.scene.start("travel", { direction: "toVillage" }));
    this.cameras.main.fadeIn(320, 3, 9, 18);
    sharpenTextTree(this.children.list);
  }
}


