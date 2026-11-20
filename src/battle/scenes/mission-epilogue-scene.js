import { addNoticeText, mountSceneNotice } from "../scene-notices.js?v=0.173.0";
import { BATTLE_ARENAS, HEIGHT, Phaser, WIDTH, battleRuntime } from "../runtime.js?v=0.91.0";
import { stageVictory } from "../victory-transaction.js?v=0.95.0";
import { rememberCombatTexture } from "../combat-textures.js?v=1.0.0";
import { NPCS } from "../../npcs.js?v=0.174.0";

export class MissionEpilogueScene extends Phaser.Scene {
  constructor() { super("epilogue"); }

  preload() {
    const arenaIndex = ((battleRuntime.activeMission?.arenaNumber || battleRuntime.activeMission?.number || 1) - 1) % BATTLE_ARENAS.length;
    const arena = BATTLE_ARENAS[arenaIndex];
    this.epilogueBackground = arena.texture;
    rememberCombatTexture(this, arena.texture);
    if (!this.textures.exists(arena.texture)) this.load.image(arena.texture, arena.file);
    if (!this.textures.exists("sayo-kisaragi")) this.load.image("sayo-kisaragi", NPCS.sayo.image);
  }

  create(data = {}) {
    this.cameras.main.setZoom(battleRuntime.renderResolution).centerOn(WIDTH / 2, HEIGHT / 2);
    const lines = [
      "Seguí el rastro de estos bandidos. No era un grupo aislado: llevan semanas saqueando las aldeas vecinas.",
      "Perdí su rastro en la Aldea de Kagemori. Cuando regreses, dejaré una misión de investigación en el Cuartel General.",
      "Hana abrirá su Tienda para ti al regresar. Usa tus primeras monedas para preparar suministros antes de investigar Kagemori."
    ];
    let lineIndex = 0;

    this.add.image(WIDTH / 2, HEIGHT / 2, this.epilogueBackground).setDisplaySize(WIDTH, HEIGHT);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x020914, 0.16).setOrigin(0);
    const sayo = this.add.image(-120, 520, "sayo-kisaragi").setOrigin(0.5, 1).setDisplaySize(261, 435).setDepth(3);
    this.tweens.add({ targets: sayo, x: 214, duration: 720, ease: "Cubic.out" });
    const { panel } = mountSceneNotice(this, "epilogue-notice", "Sayo Kisaragi");
    const speaker = addNoticeText(panel, "header", "", "scene-speaker");
    addNoticeText(speaker, "strong", "Sayo Kisaragi");
    addNoticeText(speaker, "span", "Archivera mayor");
    const dialogue = addNoticeText(panel, "p", lines[0], "scene-copy");
    dialogue.setAttribute("aria-live", "polite");
    const footer = addNoticeText(panel, "footer", "", "scene-footer");
    const counter = addNoticeText(footer, "small", `1 / ${lines.length}`, "scene-step");
    const button = addNoticeText(footer, "button", "Siguiente", "scene-button");
    button.type = "button";
    button.focus({ preventScroll: true });
    button.addEventListener("click", () => {
      if (lineIndex < lines.length - 1) {
        lineIndex += 1;
        dialogue.textContent = lines[lineIndex];
        counter.textContent = `${lineIndex + 1} / ${lines.length}`;
        button.textContent = lineIndex === lines.length - 1 ? "Regresar" : "Siguiente";
        return;
      }
      button.disabled = true;
      battleRuntime.activeSave.campaign.sayoEncounterSeen = true;
      stageVictory(battleRuntime, battleRuntime.activeSave);
      this.scene.start("travel", { direction: "toVillage", result: data.result || {} });
    });
    this.cameras.main.fadeIn(300, 3, 9, 18);
  }
}


