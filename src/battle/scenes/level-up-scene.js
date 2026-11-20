import { addNoticeText, mountSceneNotice } from "../scene-notices.js?v=0.171.0";
import { createPlayerFighter, queuePlayerFighterTextures } from "../../fighters.js?v=0.171.0";
import { playerFighterAppearance } from "../../character.js?v=0.171.0";
import { showElementalImpact } from "../elemental-effects.js?v=0.93.0";
import { teleportArrival, teleportVanish, teleportFadeOut } from "../teleport-transition.js?v=1.2.0";
import { HEIGHT, Phaser, WIDTH, battleRuntime, sharpenTextTree } from "../runtime.js?v=0.91.0";
import { SHARED_BATTLE_ASSETS } from "../../asset-urls.js?v=0.115.0";
import { applyFillTint } from "../phaser-compat.js?v=1.0.0";
import { suspendPauseRendering } from "../pause-rendering.js?v=1.1.0";

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
    const lightMode = window.localStorage.getItem("light-mode") === "on";
    const flashesEnabled = !reducedMotion && !lightMode && window.localStorage.getItem("flash-effects") !== "off";

    this.cameras.main.setBackgroundColor(0x07111c);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x07111c).setOrigin(0).setDepth(0);
    this.add.circle(220, 288, 206, theme.color, 0.035).setDepth(1);
    this.add.circle(220, 288, 173, theme.color, 0.045).setDepth(1);
    const outerAura = this.add.circle(220, 288, 144, theme.color, 0.08).setStrokeStyle(2, theme.color, 0.63).setDepth(3).setName("level-up-aura");
    const innerAura = this.add.circle(220, 288, 113, theme.color, 0.075).setStrokeStyle(1, theme.color, 0.35).setDepth(3);
    this.add.ellipse(220, 458, 183, 37, theme.color, 0.07).setStrokeStyle(1, theme.color, 0.38).setDepth(3);
    const fighter = createPlayerFighter(this, 220, 376, playerFighterAppearance(battleRuntime.activeSave));
    fighter.body.setName("level-up-fighter");
    fighter.body.setScale(1.38).setAlpha(0);
    fighter.shadow.setY(459).setScale(1.25).setAlpha(0);
    this.add.text(220, 491, battleRuntime.activeSave.character.name.toUpperCase(), {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "16px", color: "#f5e6c5", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(8);
    const arrival = new Promise(resolve => this.time.delayedCall(90, () => { resolve(teleportArrival(this, fighter, { pace: "substitution" })); }));

    if (!reducedMotion && !lightMode) {
      this.tweens.add({ targets: outerAura, scale: 1.18, alpha: 0.3, duration: 900, ease: "Sine.inOut", yoyo: true });
      this.tweens.add({ targets: innerAura, scale: 1.12, alpha: 0.28, duration: 740, ease: "Sine.inOut", yoyo: true });
      this.tweens.add({ targets: fighter.body, y: "-=5", duration: 800, ease: "Sine.inOut", yoyo: true });
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

    const { overlay, panel } = mountSceneNotice(this, "level-up-notice", `Nuevo nivel ${report.afterLevel}`);
    overlay.style.setProperty("--notice-accent", theme.ink);
    panel.focus({ preventScroll: true });
    const heading = document.createElement("header");
    heading.className = "level-notice-heading";
    panel.append(heading);
    const headline = document.createElement("div");
    heading.append(headline);
    addNoticeText(headline, "h2", "Subida de nivel", "scene-title");
    addNoticeText(headline, "p", `De nivel ${report.beforeLevel} a nivel ${report.afterLevel}`, "level-notice-transition");
    addNoticeText(heading, "span", report.afterLevel, "level-notice-number").setAttribute("aria-hidden", "true");
    const focus = document.createElement("div");
    focus.className = "level-notice-focus";
    panel.append(focus);
    addNoticeText(focus, "strong", `Afinidad ${theme.title.toLowerCase()} · ${report.focus?.label || "Progreso"}`);
    addNoticeText(focus, "p", report.focus?.description || "Tus atributos han crecido.");
    const stats = document.createElement("dl");
    stats.className = "level-notice-stats";
    panel.append(stats);
    for (const stat of report.stats) {
      const row = document.createElement("div");
      row.classList.toggle("level-stat-focused", stat.id === report.focus?.stat);
      addNoticeText(row, "dt", stat.label);
      addNoticeText(row, "dd", `${stat.before} → ${stat.after}`);
      addNoticeText(row, "dd", `+${stat.gain}`).classList.toggle("level-stat-gain", stat.gain > 0);
      stats.append(row);
    }
    const footer = document.createElement("footer");
    footer.className = "level-notice-footer";
    panel.append(footer);
    const rewards = document.createElement("div");
    footer.append(rewards);
    const resonance = 2 * (report.afterLevel - report.beforeLevel);
    addNoticeText(rewards, "strong", `+${report.pointsGained} puntos de atributo · +${resonance} PR`);
    addNoticeText(rewards, "small", "Se confirma al regresar a la aldea.");
    const button = addNoticeText(footer, "button", returnToBattle ? "Volver al combate" : "Continuar al informe", "scene-button");
    button.type = "button";
    button.disabled = true;

    let ready = false;
    let continuing = false;
    let frozen = null;
    this.staticConfirmation = false;
    const continueToResults = async () => {
      if (!ready || continuing) return;
      continuing = true;
      button.disabled = true;
      this.staticConfirmation = false;
      frozen?.dispose();
      if (returnToBattle) {
        overlay.hidden = true;
        if (!await teleportVanish(this, fighter)) return;
        if (!await teleportFadeOut(this, { pace: "substitution" })) return;
        this.scene.resume("battle");
        this.scene.stop();
      } else this.scene.start(nextScene, result);
    };
    button.addEventListener("click", continueToResults);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => frozen?.dispose());
    void arrival.then(() => {
      if (!overlay.isConnected) return;
      ready = true;
      button.disabled = false;
      button.focus({ preventScroll: true });
      this.time.delayedCall(reducedMotion || lightMode ? 120 : 1700, () => {
        if (!continuing) {
          frozen = suspendPauseRendering(this, { htmlOnly: true });
          this.staticConfirmation = true;
        }
      });
    });
    this.cameras.main.fadeIn(90, 6, 15, 27);
    sharpenTextTree(this.children.list);
  }
}
