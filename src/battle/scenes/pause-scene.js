import { HEIGHT, Phaser, WIDTH, battleRuntime } from "../runtime.js?v=0.91.0";
import { mountAccessiblePause } from "../hud-accessibility.js?v=0.122.0";
import { resumeSceneIfPaused, stopSceneIfRunning } from "../scene-lifecycle.js?v=1.0.0";

export class PauseScene extends Phaser.Scene {
  constructor() { super("pause"); }

  create() {
    this.cameras.main.setZoom(battleRuntime.renderResolution).centerOn(WIDTH / 2, HEIGHT / 2);
    this.battle = this.scene.get("battle");
    this.abandonWarningOpen = false;
    this.closeAbandonWarning = null;
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x02050a, .4).setOrigin(0).setDepth(100);
    this.pauseAccess = mountAccessiblePause(this);
    this.input.keyboard.on("keydown-ESC", () => {
      if (this.abandonWarningOpen) this.closeAbandonWarning?.();
      else this.resumeMission();
    });
  }

  resumeMission() {
    resumeSceneIfPaused(this.scene, "battle");
    stopSceneIfRunning(this.scene);
  }

  showAbandonWarning() {
    if (this.abandonWarningOpen) return;
    this.abandonWarningOpen = true;
    this.pauseAccess.root.inert = true;
    const pendingLevels = Math.max(0, this.battle.rewardPreviewSave.progression.level - this.battle.missionStartSave.progression.level);
    const levelLine = pendingLevels
      ? `También perderás ${pendingLevels} nivel${pendingLevels === 1 ? "" : "es"} mostrado${pendingLevels === 1 ? "" : "s"} durante el combate.`
      : "Cualquier nivel mostrado durante esta misión también se perderá.";
    const dialog = document.createElement("section");
    dialog.className = "combat-abandon-confirm-access";
    dialog.setAttribute("role", "alertdialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Confirmar abandono de misión");
    dialog.innerHTML = `<div class="combat-pause-panel pause-confirm-panel"><p class="pause-kicker">RETIRADA</p><h2>¿ABANDONAR LA MISIÓN?</h2><p>Si sales ahora, perderás toda la experiencia, las monedas y las recompensas de esta misión.</p><p class="pause-confirm-warning">${levelLine}</p><footer class="pause-actions"><button type="button" class="pause-resume" data-stay>SEGUIR JUGANDO</button><button type="button" class="pause-leave" data-leave aria-label="Abandonar misión y perder recompensas">ABANDONAR MISIÓN</button></footer></div>`;
    this.game.canvas.parentElement.append(dialog);
    const close = () => {
      dialog.remove();
      this.abandonWarningOpen = false;
      this.closeAbandonWarning = null;
      this.pauseAccess.root.inert = false;
      this.pauseAccess.root.querySelector("[data-pause-leave]").focus({ preventScroll: true });
    };
    const confirm = () => {
      close();
      const payload = this.battle.abandonPayload();
      stopSceneIfRunning(this.scene, "battle");
      if (this.battle.mission.type === "route-combat") this.scene.start("travel", { direction: "toVillage", secondaryResult: true, result: payload });
      else this.scene.start("travel", { direction: "toVillage", result: payload });
    };
    this.closeAbandonWarning = close;
    dialog.querySelector("[data-stay]").addEventListener("click", close);
    dialog.querySelector("[data-leave]").addEventListener("click", confirm);
    dialog.addEventListener("keydown", event => {
      if (event.key !== "Tab") return;
      event.preventDefault();
      const buttons = [...dialog.querySelectorAll("button")];
      buttons[document.activeElement === buttons[0] ? 1 : 0].focus();
    });
    dialog.querySelector("[data-stay]").focus({ preventScroll: true });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => dialog.remove());
  }
}
