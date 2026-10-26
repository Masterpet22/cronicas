import { createPlayerFighter, queuePlayerFighterTextures } from "../../fighters.js?v=0.81.0";
import { playerFighterAppearance } from "../../character.js?v=0.76.0";
import { secondaryMissionGrade } from "../rewards.js?v=0.82.6";
import { returnToVillage } from "../return-to-village.js?v=0.96.0";
import { HEIGHT, Phaser, WIDTH, battleRuntime, sharpenTextTree } from "../runtime.js?v=0.91.0";

const PARCHMENT_TEXT = "#352217";
const PARCHMENT_MUTED = "#6d5139";
const STAMP_RED = "#9f201b";
const GRADE_COLORS = {
  S: "#c88a16",
  A: "#287348",
  B: "#28658b",
  C: "#a45e1d",
  D: "#735346",
  F: "#a12620"
};

export class SecondaryResultsScene extends Phaser.Scene {
  constructor() { super("secondary-results"); }

  preload() {
    if (!this.textures.exists("results-parchment")) this.load.image("results-parchment", "assets/ui/results/results-parchment.png?v=0.72.0");
    if (!this.textures.exists("result-stamp-frame")) this.load.image("result-stamp-frame", "assets/ui/results/result-stamp-frame.png?v=0.72.0");
    queuePlayerFighterTextures(this, playerFighterAppearance(battleRuntime.activeSave));
  }

  create(data = {}) {
    if (battleRuntime.pendingSecondaryResults && Object.keys(data).length === 0) {
      data = battleRuntime.pendingSecondaryResults;
      battleRuntime.pendingSecondaryResults = null;
    }
    this.cameras.main.setZoom(battleRuntime.renderResolution).centerOn(WIDTH / 2, HEIGHT / 2);
    const outcome = data.outcome || "abandoned";
    const completed = outcome === "completed";
    const abandoned = outcome === "abandoned";
    const doctorMission = battleRuntime.activeMission?.type === "route-search" || data.missionType === "route-search";
    const title = completed ? "MISIÓN SECUNDARIA COMPLETADA" : abandoned ? "MISIÓN SECUNDARIA ABANDONADA" : "MISIÓN SECUNDARIA FALLIDA";
    const stampText = completed ? "APROBADO" : abandoned ? "ABANDONADO" : "FALLIDA";
    const subtitle = doctorMission
      ? completed ? "Haru confió su libro a la Biblioteca." : "El rastro permanece abierto para un nuevo intento."
      : completed ? "Las pistas revelaron una ruta verificable." : "El encargo seguirá disponible en el Tablón.";

    this.cameras.main.setBackgroundColor(0x1b0e08);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x1b0e08, 1).setOrigin(0).setDepth(1);
    this.add.image(WIDTH / 2, HEIGHT / 2, "results-parchment").setDisplaySize(WIDTH, HEIGHT).setDepth(2);

    this.add.text(480, 76, "INFORME DE MISIÓN SECUNDARIA", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "10px", color: PARCHMENT_MUTED, fontStyle: "bold", letterSpacing: 3
    }).setOrigin(0.5).setDepth(5);
    this.add.text(480, 100, title, {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "22px", color: PARCHMENT_TEXT, fontStyle: "bold"
    }).setOrigin(0.5).setAlpha(0).setName("secondary-results-title").setDepth(5);
    this.add.text(480, 127, data.missionTitle || battleRuntime.activeMission?.title || "Misión secundaria", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "14px", color: "#4d3220", fontStyle: "bold", align: "center", wordWrap: { width: 470 }
    }).setOrigin(0.5).setDepth(5);
    this.add.text(480, 149, subtitle, {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "13px", color: PARCHMENT_MUTED, fontStyle: "italic"
    }).setOrigin(0.5).setDepth(5);

    const grade = secondaryMissionGrade({ ...data, outcome });
    const gradeColor = GRADE_COLORS[grade];
    const gradeMark = this.add.text(205, 176, grade, {
      fontFamily: '"Segoe Print", "Bradley Hand", "Brush Script MT", cursive',
      fontSize: "86px", color: gradeColor, fontStyle: "bold italic"
    }).setPadding(24, 16, 24, 18).setOrigin(0.5).setStroke("#3a2317", 2.8).setShadow(2, 3, "#2f1b10", 0.32).setAngle(-7).setDepth(10).setAlpha(0).setScale(1.65);
    const gradeBrush = this.add.graphics().setDepth(8).setAlpha(0);
    gradeBrush.lineStyle(5, Phaser.Display.Color.HexStringToColor(gradeColor).color, 0.65)
      .beginPath().moveTo(154, 235).lineTo(256, 224).strokePath();
    gradeBrush.lineStyle(2, 0x3a2317, 0.45)
      .beginPath().moveTo(166, 241).lineTo(247, 232).strokePath();
    this.tweens.add({ targets: gradeBrush, alpha: 1, duration: 240, delay: 420 });
    this.tweens.add({ targets: gradeMark, alpha: 1, scale: 1, angle: -3, duration: 420, delay: 330, ease: "Back.out" });

    const fighter = createPlayerFighter(this, 213, 391, playerFighterAppearance(battleRuntime.activeSave));
    fighter.targets.forEach((target) => target.setAlpha(0));
    fighter.shadow.setAlpha(0.16);
    this.tweens.add({ targets: fighter.targets, alpha: 1, x: "+=12", duration: 620, ease: "Cubic.out" });
    this.tweens.add({ targets: fighter.shadow, alpha: 0.42, duration: 620, ease: "Cubic.out" });
    const namePlate = this.add.text(225, 458, battleRuntime.activeSave.character.name, {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "11px", color: "#f5e5bd", fontStyle: "bold"
    }).setOrigin(0.5).setPadding(15, 5).setBackgroundColor("#4b2c1d").setDepth(12).setAlpha(0);
    this.tweens.add({ targets: namePlate, alpha: 1, duration: 450, delay: 280 });

    const ink = this.add.graphics().setDepth(3);
    ink.lineStyle(2, 0x62432d, 0.58).beginPath().moveTo(330, 164).lineTo(330, 444).strokePath();
    ink.lineStyle(1, 0x8c6847, 0.45).strokeRect(351, 165, 512, 279);
    ink.fillStyle(0x6b4a31, 0.07).fillRect(352, 166, 510, 277);
    ink.lineStyle(1, 0x745136, 0.34).beginPath().moveTo(370, 215).lineTo(843, 215).strokePath();

    this.add.text(371, 188, doctorMission ? "RESUMEN DE LA BÚSQUEDA" : "PISTAS DE LA INVESTIGACIÓN", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "11px", color: "#5b3b25", fontStyle: "bold", letterSpacing: 1
    }).setOrigin(0, 0.5).setDepth(5);

    const rows = doctorMission ? this.doctorRows(data) : this.investigationRows(data);
    rows.forEach(([label, value], index) => {
      const y = 242 + index * 38;
      this.add.circle(377, y, 2.5, index === 0 ? 0x39251a : 0xa32620, 0.82).setDepth(5);
      this.add.text(390, y, label, {
        fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "13px", color: "#4d3929"
      }).setOrigin(0, 0.5).setDepth(5);
      const amount = this.add.text(843, y, value, {
        fontFamily: '"Cinzel", Georgia, serif', fontSize: "12px", color: completed ? PARCHMENT_TEXT : "#786959", fontStyle: "bold"
      }).setOrigin(1, 0.5).setAlpha(0).setDepth(5);
      this.tweens.add({ targets: amount, alpha: 1, x: "-=8", duration: 330, delay: 440 + index * 105, ease: "Cubic.out" });
    });

    const footer = this.resultFooter(data, doctorMission, completed);
    this.add.text(607, 414, footer, {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "11px", color: PARCHMENT_MUTED,
      fontStyle: "italic", align: "center", wordWrap: { width: 450 }
    }).setOrigin(0.5).setDepth(5);

    const stamp = this.add.container(779, 177).setDepth(14).setAngle(-7).setAlpha(0).setScale(1.35);
    const stampFrame = this.add.image(0, 0, "result-stamp-frame").setDisplaySize(166, 76).setAlpha(0.83);
    const stampLabel = this.add.text(0, 0, stampText, {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: stampText.length > 8 ? "14px" : "17px", color: STAMP_RED, fontStyle: "bold", letterSpacing: 1
    }).setOrigin(0.5).setStroke(STAMP_RED, 0.4);
    stamp.add([stampFrame, stampLabel]);
    this.time.delayedCall(340, () => {
      this.tweens.add({ targets: stamp, alpha: 0.92, scale: 1, duration: 230, ease: "Back.out" });
      this.cameras.main.shake(70, 0.0015);
    });

    const buttonShadow = this.add.rectangle(608, 483, 256, 42, 0x2a1a12, 0.26).setDepth(4);
    const buttonBg = this.add.rectangle(608, 478, 250, 40, 0xd7bd87, 0.95)
      .setStrokeStyle(2, 0x5d3a22, 0.95).setInteractive({ useHandCursor: true }).setDepth(5);
    const leftRoller = this.add.rectangle(480, 478, 12, 48, 0x765133, 1).setStrokeStyle(1, 0x352217).setDepth(6);
    const rightRoller = this.add.rectangle(736, 478, 12, 48, 0x765133, 1).setStrokeStyle(1, 0x352217).setDepth(6);
    const buttonLabel = this.add.text(608, 478, "CONTINUAR EN LA ALDEA", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "13px", color: PARCHMENT_TEXT, fontStyle: "bold"
    }).setOrigin(0.5).setDepth(7);
    buttonBg.on("pointerover", () => {
      buttonBg.setFillStyle(0xe8d19c, 1);
      this.tweens.add({ targets: [buttonBg, buttonLabel, leftRoller, rightRoller], y: 476, duration: 100 });
      buttonShadow.setAlpha(0.34);
    });
    buttonBg.on("pointerout", () => {
      buttonBg.setFillStyle(0xd7bd87, 0.95);
      this.tweens.add({ targets: [buttonBg, buttonLabel, leftRoller, rightRoller], y: 478, duration: 100 });
      buttonShadow.setAlpha(0.26);
    });
    buttonBg.once("pointerup", () => {
      buttonBg.disableInteractive();
      buttonLabel.setText("CERRANDO INFORME...");
      returnToVillage(this, completed);
    });

    this.tweens.add({ targets: this.children.getByName("secondary-results-title"), alpha: 1, y: "+=6", duration: 560, ease: "Cubic.out" });
    this.cameras.main.fadeIn(350, 18, 11, 7);
    sharpenTextTree(this.children.list);
  }

  investigationRows(data) {
    const clues = Phaser.Math.Clamp(Number(data.clues) || 0, 0, 3);
    return [
      ["Pistas reunidas", `${clues}/3`],
      ["Carreta saqueada", clues >= 1 ? "VERIFICADA" : "PENDIENTE"],
      ["Polvo de cantera", clues >= 2 ? "VERIFICADO" : "PENDIENTE"],
      ["Huellas al norte", clues >= 3 ? "VERIFICADAS" : "PENDIENTE"]
    ];
  }

  doctorRows(data) {
    const stats = data.routeStats || {};
    return [
      ["Peligro afrontado", String(stats.danger || 0)],
      ["Tiempo empleado", String(stats.time || 0)],
      ["Pistas encontradas", String(stats.clues || 0)],
      ["Recursos recuperados", String(stats.resources || 0)]
    ];
  }

  resultFooter(data, doctorMission, completed) {
    if (!completed) return "Sin recompensas. Podrás retomar el encargo desde el Tablón de Misiones.";
    if (!doctorMission) return "La ruta hacia el Desfiladero del Cuervo ha quedado registrada.";
    const rewards = data.rewards || { xp: 0, affinityXp: 0, coins: 0 };
    const supply = rewards.supplyBonus ? " · +1 suministro" : "";
    return `Libro antiguo · +${rewards.xp || 0} PX · +${rewards.affinityXp || 0} afinidad · +${rewards.coins || 0} monedas${supply}`;
  }
}
