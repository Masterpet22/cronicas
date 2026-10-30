import { createPlayerFighter, queuePlayerFighterTextures } from "../../fighters.js?v=0.115.0";
import { playerFighterAppearance } from "../../character.js?v=0.76.0";
import { masterIdForCharacter } from "../../save.js?v=0.114.0";
import { missionGrade } from "../rewards.js?v=0.114.0";
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

export class ResultsScene extends Phaser.Scene {
  constructor() { super("results"); }

  preload() {
    if (!this.textures.exists("results-parchment")) this.load.image("results-parchment", "assets/ui/results/results-parchment.png?v=0.72.0");
    if (!this.textures.exists("result-stamp-frame")) this.load.image("result-stamp-frame", "assets/ui/results/result-stamp-frame.png?v=0.72.0");
    queuePlayerFighterTextures(this, playerFighterAppearance(battleRuntime.activeSave));
  }

  create(data = {}) {
    this.cameras.main.setZoom(battleRuntime.renderResolution).centerOn(WIDTH / 2, HEIGHT / 2);
    const outcome = data.outcome || "failed";
    const completed = outcome === "completed";
    const abandoned = outcome === "abandoned";
    const title = completed ? "MISIÓN COMPLETADA" : abandoned ? "MISIÓN ABANDONADA" : "MISIÓN FALLIDA";
    const stampText = completed ? "APROBADO" : abandoned ? "ABANDONADO" : "FALLIDA";
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

    this.cameras.main.setBackgroundColor(0x1b0e08);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x1b0e08, 1).setOrigin(0).setDepth(1);
    this.add.image(WIDTH / 2, HEIGHT / 2, "results-parchment").setDisplaySize(WIDTH, HEIGHT).setDepth(2);

    this.add.text(480, 76, "INFORME DE MISIÓN", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "10px", color: PARCHMENT_MUTED, fontStyle: "bold", letterSpacing: 3
    }).setOrigin(0.5).setDepth(5);
    this.add.text(480, 100, title, {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "25px", color: PARCHMENT_TEXT, fontStyle: "bold"
    }).setOrigin(0.5).setAlpha(0).setName("results-title").setDepth(5);
    this.add.text(480, 127, data.missionTitle || battleRuntime.activeMission?.title || "Misión", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "14px", color: "#4d3220", fontStyle: "bold", align: "center", wordWrap: { width: 470 }
    }).setOrigin(0.5).setDepth(5);
    this.add.text(480, 149, subtitle, {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "13px", color: PARCHMENT_MUTED, fontStyle: "italic"
    }).setOrigin(0.5).setDepth(5);

    const grade = missionGrade(outcome, data.playerHp, data.maxHp);
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
    ink.lineStyle(1, 0x745136, 0.34).beginPath().moveTo(370, 268).lineTo(843, 268).strokePath();

    this.add.text(371, 183, "ESTADO DEL EQUIPO", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "11px", color: "#5b3b25", fontStyle: "bold", letterSpacing: 1
    }).setOrigin(0, 0.5).setDepth(5);

    const hp = Number(data.playerHp) || 0;
    const maxHp = Math.max(1, Number(data.maxHp) || 1);
    const hpRatio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    this.add.text(371, 216, "VIDA RESTANTE", {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "12px", color: PARCHMENT_TEXT, fontStyle: "bold"
    }).setOrigin(0, 0.5).setDepth(5);
    this.add.text(843, 216, `${hp}/${Number(data.maxHp) || 0}`, {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "12px", color: PARCHMENT_TEXT, fontStyle: "bold"
    }).setOrigin(1, 0.5).setDepth(5);
    this.add.rectangle(371, 241, 472, 17, 0x5a3c28, 0.24).setOrigin(0, 0.5).setStrokeStyle(1, 0x5e422c, 0.7).setDepth(5);
    const hpColor = hpRatio > 0.5 ? 0x2e9c5d : hpRatio > 0.25 ? 0xc78c2a : 0xaa302b;
    const hpFill = this.add.rectangle(374, 241, 1, 11, hpColor, 0.96).setOrigin(0, 0.5).setDepth(6);
    this.tweens.add({ targets: hpFill, displayWidth: 466 * hpRatio, duration: 850, delay: 250, ease: "Cubic.out" });

    const rows = [
      ["Rivales derrotados", `${data.defeated || 0}/${data.totalEncounters || 0}`],
      ["Experiencia obtenida", completed ? `+${data.rewards?.xp || 0} PX` : "+0 PX"],
      ["Afinidad obtenida", completed ? `+${data.rewards?.affinityXp || 0} PX` : "+0 PX"],
      ["Monedas obtenidas", completed ? `+${data.rewards?.coins || 0}` : "+0"]
    ];
    if (data.item) rows.push(["Objeto recuperado", data.item]);
    rows.forEach(([label, value], index) => {
      const y = 290 + index * 27;
      this.add.circle(377, y, 2.5, index === 0 ? 0x39251a : 0xa32620, 0.82).setDepth(5);
      this.add.text(390, y, label, {
        fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "13px", color: "#4d3929"
      }).setOrigin(0, 0.5).setDepth(5);
      const amount = this.add.text(843, y, value, {
        fontFamily: '"Cinzel", Georgia, serif', fontSize: "12px", color: completed ? PARCHMENT_TEXT : "#786959", fontStyle: "bold"
      }).setOrigin(1, 0.5).setAlpha(0).setDepth(5);
      this.tweens.add({ targets: amount, alpha: 1, x: "-=8", duration: 330, delay: 500 + index * 105, ease: "Cubic.out" });
    });

    this.add.text(607, 425, masterLine, {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "10px", color: PARCHMENT_MUTED, fontStyle: "italic", align: "center", wordWrap: { width: 450 }
    }).setOrigin(0.5).setDepth(5);

    const stamp = this.add.container(779, 177).setDepth(14).setAngle(-7).setAlpha(0).setScale(1.35);
    const stampFrame = this.add.image(0, 0, "result-stamp-frame").setDisplaySize(166, 76).setAlpha(0.83);
    const stampLabel = this.add.text(0, 0, stampText, {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: stampText.length > 8 ? "14px" : "17px", color: STAMP_RED, fontStyle: "bold", letterSpacing: 1
    }).setOrigin(0.5).setStroke("#9f201b", 0.4);
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

    this.tweens.add({ targets: this.children.getByName("results-title"), alpha: 1, y: "+=6", duration: 560, ease: "Cubic.out" });
    this.cameras.main.fadeIn(350, 18, 11, 7);
    sharpenTextTree(this.children.list);
  }
}
