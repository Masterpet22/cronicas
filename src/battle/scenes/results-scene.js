import { createPlayerFighter, queuePlayerFighterTextures } from "../../fighters.js?v=0.62.0";
import { playerFighterAppearance } from "../../character.js?v=0.62.0";
import { masterIdForCharacter } from "../../save.js?v=0.66.0";
import { HEIGHT, Phaser, WIDTH, battleRuntime, sharpenTextTree } from "../runtime.js?v=0.68.0";

export class ResultsScene extends Phaser.Scene {
  constructor() { super("results"); }

  preload() {
    if (!this.textures.exists("results-headquarters")) this.load.image("results-headquarters", "assets/locations/headquarters.webp?v=0.20.0");
    queuePlayerFighterTextures(this, playerFighterAppearance(battleRuntime.activeSave));
  }

  create(data = {}) {
    this.cameras.main.setZoom(battleRuntime.renderResolution).centerOn(WIDTH / 2, HEIGHT / 2);
    const outcome = data.outcome || "failed";
    const completed = outcome === "completed";
    const abandoned = outcome === "abandoned";
    const title = completed ? "MISIÓN COMPLETADA" : abandoned ? "MISIÓN ABANDONADA" : "MISIÓN FALLIDA";
    const subtitle = completed ? "El objetivo ha sido cumplido." : abandoned ? "Regresas a la aldea para reorganizarte." : "La misión termina, pero conservas lo aprendido.";
    const masterName = masterIdForCharacter(battleRuntime.activeSave.character) === "mei" ? "Mei Hayate" : "Daichi Kazan";
    const masterLine = data.decision === "interrogate"
      ? `${masterName}: «Conservamos la información, pero Akumori recibió refuerzos. Toda ventaja tiene un coste.»`
      : data.decision === "eliminate"
        ? `${masterName}: «Akumori no recibió refuerzos, pero perdimos la entrada secreta y un posible aliado.»`
        : completed
          ? `${masterName}: «Buen trabajo. Recuerda qué decisión te permitió volver.»`
      : abandoned
        ? `${masterName}: «Retirarse a tiempo también es parte del entrenamiento.»`
        : `${masterName}: «Analiza la derrota, ajusta tu estrategia y vuelve.»`;

    this.add.image(WIDTH / 2, HEIGHT / 2, "results-headquarters").setDisplaySize(WIDTH, HEIGHT).setDepth(0);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x020914, 0.48).setOrigin(0).setDepth(1);
    this.add.rectangle(0, 0, WIDTH, 5, 0x43c9ff, 0.9).setOrigin(0).setDepth(2);

    const fighter = createPlayerFighter(this, 205, 392, playerFighterAppearance(battleRuntime.activeSave));
    fighter.targets.forEach((target) => target.setAlpha(0));
    fighter.shadow.setAlpha(0);
    this.tweens.add({ targets: [...fighter.targets, fighter.shadow], alpha: 1, x: "+=18", duration: 650, ease: "Cubic.out" });
    const namePlate = this.add.text(223, 493, battleRuntime.activeSave.character.name, { fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "11px", color: "#eaf7ff", fontStyle: "bold" })
      .setOrigin(0.5).setPadding(13, 5).setBackgroundColor("#031220").setStroke("#5ecfff", 1).setDepth(12);
    this.tweens.add({ targets: namePlate, alpha: { from: 0, to: 1 }, duration: 450, delay: 300 });

    const titleColor = completed ? "#f0b85c" : "#83d8ff";
    this.add.text(625, 55, "INFORME DE MISIÓN", { fontFamily: '"Cinzel", Georgia, serif', fontSize: "11px", color: "#83d8ff", fontStyle: "bold", letterSpacing: 2 }).setOrigin(0.5);
    this.add.text(625, 83, title, { fontFamily: '"Cinzel", Georgia, serif', fontSize: "27px", color: titleColor, fontStyle: "bold" }).setOrigin(0.5).setAlpha(0).setName("results-title");
    this.add.text(625, 116, data.missionTitle || battleRuntime.activeMission?.title || "Misión", { fontFamily: '"Cinzel", Georgia, serif', fontSize: "15px", color: "#f4f0e8", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(625, 143, subtitle, { fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "13px", color: "#b5c8d7" }).setOrigin(0.5);
    this.add.text(625, 165, masterLine, { fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "12px", color: "#d8c29b", fontStyle: "italic" }).setOrigin(0.5);

    this.add.rectangle(625, 317, 530, 270, 0x031220, 0.95).setStrokeStyle(1.5, 0x55c9ff, 0.78).setDepth(3);
    this.add.rectangle(362, 182, 4, 270, 0x3fcaff, 0.95).setOrigin(0, 0).setDepth(4);
    this.add.text(385, 198, "ESTADO DEL EQUIPO", { fontFamily: '"Cinzel", Georgia, serif', fontSize: "11px", color: "#83d8ff", fontStyle: "bold", letterSpacing: 1 }).setOrigin(0, 0.5).setDepth(5);
    const hpRatio = Phaser.Math.Clamp((data.playerHp || 0) / Math.max(1, data.maxHp || 1), 0, 1);
    this.add.text(385, 230, "VIDA RESTANTE", { fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "12px", color: "#dce7ef", fontStyle: "bold" }).setOrigin(0, 0.5).setDepth(5);
    this.add.rectangle(385, 253, 480, 18, 0x101f30, 1).setOrigin(0, 0.5).setStrokeStyle(1, 0x315b77, 0.9).setDepth(5);
    const hpColor = hpRatio > 0.5 ? 0x43c9ff : hpRatio > 0.25 ? 0xf0b85c : 0xef6b72;
    const hpFill = this.add.rectangle(387, 253, 1, 12, hpColor, 1).setOrigin(0, 0.5).setDepth(6);
    this.tweens.add({ targets: hpFill, displayWidth: 476 * hpRatio, duration: 850, delay: 250, ease: "Cubic.out" });
    this.add.text(865, 230, `${data.playerHp || 0}/${data.maxHp || 0}`, { fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "12px", color: "#f4f0e8", fontStyle: "bold" }).setOrigin(1, 0.5).setDepth(5);

    const rows = [
      ["♛", "Rivales derrotados", `${data.defeated || 0}/${data.totalEncounters || 0}`],
      ["★", "Experiencia obtenida", completed ? `+${data.rewards?.xp || 0} PX` : "Sin recompensa"],
      ["◆", "Afinidad obtenida", completed ? `+${data.rewards?.affinityXp || 0} PX` : "Sin recompensa"],
      ["▣", "Monedas obtenidas", completed ? `+${data.rewards?.coins || 0}` : "Sin recompensa"]
    ];
    if (data.item) rows.push(["◇", "Objeto recuperado", data.item]);
    rows.forEach(([icon, label, value], index) => {
      const y = 286 + index * 32;
      this.add.text(385, y, icon, { fontFamily: '"Cinzel", Georgia, serif', fontSize: "16px", color: "#f0b85c", fontStyle: "bold" }).setOrigin(0, 0.5).setDepth(5);
      this.add.text(414, y, label, { fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "13px", color: "#b5c8d7" }).setOrigin(0, 0.5).setDepth(5);
      const amount = this.add.text(865, y, value, { fontFamily: '"Cinzel", Georgia, serif', fontSize: "13px", color: completed ? "#f4f0e8" : "#8195a5", fontStyle: "bold" }).setOrigin(1, 0.5).setAlpha(0).setDepth(5);
      this.tweens.add({ targets: amount, alpha: 1, x: "-=10", duration: 350, delay: 520 + index * 120, ease: "Cubic.out" });
    });

    const buttonBg = this.add.rectangle(625, 485, 220, 44, 0x0d4668, 1).setStrokeStyle(1.5, 0x55c9ff, 1).setInteractive({ useHandCursor: true }).setDepth(5);
    const buttonLabel = this.add.text(625, 485, "← VOLVER A LA ALDEA", { fontFamily: '"Cinzel", Georgia, serif', fontSize: "13px", color: "#f4f8fb", fontStyle: "bold" }).setOrigin(0.5).setDepth(6);
    buttonBg.on("pointerover", () => buttonBg.setFillStyle(0x17638d, 1));
    buttonBg.on("pointerout", () => buttonBg.setFillStyle(0x0d4668, 1));
    buttonBg.once("pointerup", () => {
      buttonBg.disableInteractive();
      buttonLabel.setText("REGRESANDO...");
      this.scene.start("travel", { direction: "toVillage" });
    });
    this.tweens.add({ targets: this.children.getByName("results-title"), alpha: 1, y: "+=8", duration: 600, ease: "Cubic.out" });
    this.cameras.main.fadeIn(350, 3, 9, 18);
    sharpenTextTree(this.children.list);
  }
}


