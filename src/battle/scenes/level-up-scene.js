import { createPlayerFighter, queuePlayerFighterTextures } from "../../fighters.js?v=0.115.0";
import { playerFighterAppearance } from "../../character.js?v=0.76.0";
import { showElementalImpact } from "../elemental-effects.js?v=0.92.0";
import { teleportArrival, teleportVanish, teleportFadeOut } from "../teleport-transition.js?v=1.1.0";
import { HEIGHT, Phaser, WIDTH, battleRuntime, sharpenTextTree } from "../runtime.js?v=0.91.0";
import { SHARED_BATTLE_ASSETS } from "../../asset-urls.js?v=0.115.0";
import { applyFillTint } from "../phaser-compat.js?v=1.0.0";

const THEMES = Object.freeze({
  fuego: { color: 0xff914f, ink: "#ffb17d", title: "FUEGO" },
  agua: { color: 0x5bc7f4, ink: "#9ce1ff", title: "AGUA" },
  tierra: { color: 0xd4ad71, ink: "#f0d4a7", title: "TIERRA" },
  viento: { color: 0x74dfba, ink: "#a8f1d8", title: "VIENTO" }
});

export function shouldShowLevelUp(result) {
  return result?.outcome === "completed"
    && Number(result.levelUp?.afterLevel) > Number(result.levelUp?.beforeLevel);
}

export class LevelUpScene extends Phaser.Scene {
  constructor() { super("level-up"); }

  preload() {
    if (!this.textures.exists("preparation-mote")) this.load.image("preparation-mote", SHARED_BATTLE_ASSETS.preparationMote);
    queuePlayerFighterTextures(this, playerFighterAppearance(battleRuntime.activeSave));
  }

  create({ result = {}, nextScene = "results", returnToBattle = false } = {}) {
    if (!shouldShowLevelUp(result)) {
      this.scene.start(nextScene, result);
      return;
    }
    this.cameras.main.setZoom(battleRuntime.renderResolution).centerOn(WIDTH / 2, HEIGHT / 2);
    const report = result.levelUp;
    const theme = THEMES[report.affinity] || THEMES.fuego;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const flashesEnabled = !reducedMotion && window.localStorage.getItem("flash-effects") !== "off";

    this.cameras.main.setBackgroundColor(0x07111c);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x07111c).setOrigin(0).setDepth(0);
    this.add.circle(218, 302, 226, theme.color, 0.055).setDepth(1);
    this.add.circle(218, 302, 166, theme.color, 0.065).setDepth(1);
    this.add.text(58, 42, "CRÓNICAS DEL SELLO  /  PROGRESIÓN", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "13px", color: "#9daebd", fontStyle: "bold", letterSpacing: 2
    }).setDepth(4);

    const outerAura = this.add.circle(220, 326, 130, theme.color, 0.12).setStrokeStyle(3, theme.color, 0.72).setDepth(3).setName("level-up-aura");
    const innerAura = this.add.circle(220, 326, 99, theme.color, 0.11).setStrokeStyle(1.5, 0xffffff, 0.5).setDepth(3);
    const fighter = createPlayerFighter(this, 220, 390, playerFighterAppearance(battleRuntime.activeSave));
    fighter.body.setName("level-up-fighter");
    fighter.body.setAlpha(0);
    fighter.shadow.setAlpha(0);
    const name = this.add.text(220, 471, battleRuntime.activeSave.character.name.toUpperCase(), {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "16px", color: "#f5e6c5", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(8);
    const arrival = new Promise(resolve => this.time.delayedCall(90, () => { resolve(teleportArrival(this, fighter, { pace: "substitution" })); }));

    if (!reducedMotion) {
      this.tweens.add({ targets: outerAura, scale: 1.18, alpha: 0.3, duration: 900, ease: "Sine.inOut", yoyo: true, repeat: -1 });
      this.tweens.add({ targets: innerAura, scale: 1.12, alpha: 0.28, duration: 740, ease: "Sine.inOut", yoyo: true, repeat: -1 });
      this.tweens.add({ targets: [fighter.body, name], y: "-=7", duration: 800, ease: "Sine.inOut", yoyo: true, repeat: -1 });
    }
    if (flashesEnabled) {
      const flash = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0xffffff, 0).setOrigin(0).setDepth(30).setName("level-up-flash");
      this.tweens.add({ targets: flash, alpha: 0.52, duration: 120, yoyo: true, hold: 70, onComplete: () => flash.destroy() });
      this.time.delayedCall(90, () => {
        fighter.layers.forEach((layer) => applyFillTint(layer, 0xffffff));
        this.time.delayedCall(140, () => fighter.layers.forEach((layer) => layer.clearTint?.()));
        showElementalImpact(this, { element: report.affinity, color: theme.color }, 220, 310, 1.7);
      });
    }

    const panel = this.add.container(636, 270).setName("level-up-panel").setDepth(12).setAlpha(0).setScale(reducedMotion ? 1 : 0.94);
    const add = (item) => { panel.add(item); return item; };
    add(this.add.rectangle(0, 0, 610, 448, 0x102033, 0.97).setStrokeStyle(2, theme.color, 0.95));
    add(this.add.rectangle(-291, 0, 5, 418, theme.color, 0.92));
    add(this.add.text(0, -193, "¡NUEVO NIVEL!", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "27px", color: "#fff0ce", fontStyle: "bold"
    }).setOrigin(0.5));
    add(this.add.text(0, -153, `NIVEL ${report.beforeLevel}  →  ${report.afterLevel}`, {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "19px", color: theme.ink, fontStyle: "bold"
    }).setOrigin(0.5));
    add(this.add.text(0, -117, `AFINIDAD ${theme.title}  ·  ESPECIALIDAD: ${report.focus?.label || "PROGRESO"}`, {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "15px", color: "#f2ead9", fontStyle: "bold"
    }).setOrigin(0.5));
    add(this.add.text(0, -92, report.focus?.description || "Tus atributos han crecido.", {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "15px", color: "#aebdcc"
    }).setOrigin(0.5));
    add(this.add.rectangle(0, -69, 527, 1, theme.color, 0.45));

    report.stats.forEach((stat, index) => {
      const y = -43 + index * 35;
      const focused = stat.id === report.focus?.stat;
      add(this.add.text(-249, y, stat.label, {
        fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "16px", color: focused ? theme.ink : "#d8e2e9", fontStyle: focused ? "bold" : "normal"
      }).setOrigin(0, 0.5));
      add(this.add.text(86, y, `${stat.before}  →  ${stat.after}`, {
        fontFamily: '"Cinzel", Georgia, serif', fontSize: "15px", color: "#f3eee2", fontStyle: "bold"
      }).setOrigin(1, 0.5));
      add(this.add.text(248, y, `+${stat.gain}`, {
        fontFamily: '"Cinzel", Georgia, serif', fontSize: "16px", color: stat.gain > 0 ? theme.ink : "#8799a8", fontStyle: "bold"
      }).setOrigin(1, 0.5));
    });
    add(this.add.rectangle(0, 128, 527, 1, theme.color, 0.45));
    add(this.add.text(0, 150, `+${report.pointsGained} PUNTOS DE ATRIBUTO PARA EL DOJO`, {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "15px", color: "#fff0ce", fontStyle: "bold"
    }).setOrigin(0.5));
    add(this.add.text(0, 174, "SE CONFIRMA AL REGRESAR A LA ALDEA", {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "12px", color: "#b9c9d4", fontStyle: "bold"
    }).setOrigin(0.5));
    const button = add(this.add.rectangle(0, 199, 263, 39, theme.color, 0.92)
      .setName("level-up-continue").setStrokeStyle(1.5, 0xffffff, 0.7).setInteractive({ useHandCursor: true }));
    button.disableInteractive().setAlpha(.55);
    add(this.add.text(0, 199, "ACEPTAR", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "14px", color: "#122032", fontStyle: "bold"
    }).setOrigin(0.5));

    let ready = false;
    let continuing = false;
    const continueToResults = async () => {
      if (!ready || continuing) return;
      continuing = true;
      if (returnToBattle) {
        if (!await teleportVanish(this, fighter)) return;
        if (!await teleportFadeOut(this, { pace: "substitution" })) return;
        this.scene.resume("battle");
        this.scene.stop();
      } else this.scene.start(nextScene, result);
    };
    button.on("pointerup", continueToResults);
    const onKeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        continueToResults();
      }
    };
    document.addEventListener("keydown", onKeydown);
    const accessibleDialog = document.createElement("div");
    accessibleDialog.className = "level-up-accessible";
    accessibleDialog.setAttribute("role", "dialog");
    accessibleDialog.setAttribute("aria-modal", "true");
    accessibleDialog.setAttribute("aria-label", `Nuevo nivel ${report.afterLevel}`);
    accessibleDialog.tabIndex = -1;
    accessibleDialog.textContent = `Subiste del nivel ${report.beforeLevel} al ${report.afterLevel}. Afinidad ${theme.title}. ${report.stats.map((stat) => `${stat.label}: ${stat.before} a ${stat.after}, más ${stat.gain}`).join(". ")}. Ganaste ${report.pointsGained} puntos de atributo para el Dojo. Se confirmará al regresar a la aldea. Pulsa Intro para aceptar y ${returnToBattle ? "volver al combate" : "continuar al informe"}.`;
    accessibleDialog.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
    this.game.canvas.parentElement?.append(accessibleDialog);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener("keydown", onKeydown);
      accessibleDialog.remove();
    });
    this.tweens.add({ targets: panel, alpha: 1, scale: 1, delay: reducedMotion ? 0 : 90, duration: reducedMotion ? 100 : 180, ease: "Back.out",
      onComplete: async () => { await arrival; ready = true; button.setAlpha(1).setInteractive({ useHandCursor: true }); accessibleDialog.focus(); } });
    this.cameras.main.fadeIn(90, 6, 15, 27);
    sharpenTextTree(this.children.list);
  }
}
