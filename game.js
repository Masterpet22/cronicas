import { SEALS, BASE_ACTIONS, JUTSU_LIBRARY, ENEMY_ACTIONS, ENEMY_ROSTER } from "./src/data.js?v=0.20.0";
import { applyStatus, affinityLabel, affinityMultiplier, formatStatuses, hasStatus, hitChance } from "./src/rules.js?v=0.20.0";
import { createGeometricFighter, createPlayerFighter, destroyFighter, fighterTextureKey, preparePlayerPunch, queueFighterTexture, queuePlayerFighterTextures, recoverPlayerPunch, releasePlayerPunch, startPlayerRunning, stopPlayerRunning } from "./src/fighters.js?v=0.37.0";
import { playerFighterAppearance } from "./src/character.js?v=0.20.0";
import { createActionButton, createBar } from "./src/ui.js?v=0.31.0";
import { mountMetaUI } from "./src/meta-ui.js?v=0.23.0";
import { awardEncounter, completeMission, derivedStats, loadSave, writeSave } from "./src/save.js?v=0.20.0";
import { canAccessElement, elementIcon, elementName as localizedElementName } from "./src/elements.js?v=0.20.0";

const Phaser = window.Phaser;

const WIDTH = 960;
const HEIGHT = 540;
const RENDER_RESOLUTION = window.innerWidth >= 981
  ? 1.5
  : Math.min(2, Math.max(window.devicePixelRatio || 1, 1));
const RENDER_WIDTH = WIDTH * RENDER_RESOLUTION;
const RENDER_HEIGHT = HEIGHT * RENDER_RESOLUTION;
const TIMELINE_START = 188;
const TIMELINE_END = 812;
let activeSave = loadSave();
let activeMission = null;
let game = null;

class MissionTravelScene extends Phaser.Scene {
  constructor() { super("travel"); }

  preload() {
    this.load.image("travel-forest", "assets/locations/battle-dusk-pass.jpg?v=0.20.0");
    queuePlayerFighterTextures(this, playerFighterAppearance(activeSave));
  }

  create(data = {}) {
    this.cameras.main.setZoom(RENDER_RESOLUTION).centerOn(WIDTH / 2, HEIGHT / 2);
    const returning = data.direction === "toVillage";
    this.add.image(WIDTH / 2, HEIGHT / 2, "travel-forest").setDisplaySize(WIDTH, HEIGHT).setDepth(0);
    const forest = this.add.graphics().setDepth(1);
    forest.fillStyle(0x071711, 0.34).fillRect(0, 0, WIDTH, HEIGHT);
    forest.fillStyle(0x10261b, 0.92).fillRect(0, 382, WIDTH, 158);
    forest.fillStyle(0x1c3423, 0.96);
    forest.fillTriangle(0, 436, 480, 356, 960, 436);
    forest.fillStyle(0x07130d, 0.88);
    for (let x = 18; x < WIDTH; x += 74) {
      const height = 105 + ((x * 17) % 72);
      forest.fillRect(x - 7, 382 - height, 14, height + 74);
      forest.fillTriangle(x - 47, 382 - height + 54, x, 382 - height - 34, x + 47, 382 - height + 54);
      forest.fillTriangle(x - 39, 382 - height + 92, x, 382 - height + 12, x + 39, 382 - height + 92);
    }
    forest.fillStyle(0x06100b, 0.82).fillRect(0, 421, WIDTH, 119);

    this.add.text(WIDTH / 2, 62, returning ? "REGRESO A LA ALDEA" : "RUMBO A LA MISIÓN", {
      fontFamily: '"Cinzel", Georgia, serif', fontSize: "24px", color: "#f5edd8", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(10);
    this.add.text(WIDTH / 2, 94, returning ? "El sendero de vuelta atraviesa el bosque." : activeMission.title, {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "14px", color: "#bcd4c1"
    }).setOrigin(0.5).setDepth(10);

    const startX = returning ? WIDTH + 90 : -90;
    const endX = returning ? -90 : WIDTH + 90;
    const runner = createPlayerFighter(this, startX, 330, playerFighterAppearance(activeSave));
    if (returning) runner.body.setScale(-1, 1);
    startPlayerRunning(this, runner);
    this.cameras.main.fadeIn(220, 4, 10, 7);
    const duration = 2350;
    this.tweens.add({ targets: runner.body, x: endX, duration, ease: "Linear" });
    this.tweens.add({ targets: runner.shadow, x: endX, duration, ease: "Linear" });
    this.time.delayedCall(duration - 260, () => this.cameras.main.fadeOut(250, 4, 10, 7));
    this.time.delayedCall(duration, () => {
      stopPlayerRunning(runner);
      if (returning) window.location.reload();
      else this.scene.start("battle");
    });
  }
}

class BattleScene extends Phaser.Scene {
  constructor() { super("battle"); }

  preload() {
    this.load.image("sealSheet", "assets/sellos-originales.webp?v=0.20.0");
    this.load.image("actionFrame", "assets/ui/action-button-frame.webp?v=0.20.0");
    this.load.image("hudFrame", "assets/ui/hud-frame.webp?v=0.20.0");
    this.load.image("cardFrame", "assets/ui/card-frame.webp?v=0.20.0");
    this.load.image("navFrame", "assets/ui/nav-button-frame.webp?v=0.20.0");
    this.load.image("panelFrame", "assets/ui/panel-frame.webp?v=0.20.0");
    this.load.image("battleHudOverlay", "assets/ui/battle-hud-overlay-v1.png?v=0.30.0");
    this.load.image("bg-dusk", "assets/locations/battle-dusk-pass.jpg?v=0.20.0");
    this.load.image("bg-marsh", "assets/locations/battle-mist-marsh.jpg?v=0.20.0");
    this.load.image("bg-moon", "assets/locations/battle-moon-shrine.jpg?v=0.20.0");
    this.load.image("bg-arena", "assets/locations/arena.webp?v=0.20.0");
    // Texturas de combatientes generadas con el mismo SVG del Dojo.
    this.saveData = activeSave;
    this.mission = activeMission;
    BASE_ACTIONS.forEach((action) => {
      const key = `action-${action.id}`;
      if (!this.textures.exists(key)) this.load.image(key, action.icon);
    });
    this.saveData.loadout.map((id) => JUTSU_LIBRARY.find((jutsu) => jutsu.id === id)?.element).filter(Boolean).forEach((element) => {
      const key = `element-${element}`;
      if (!this.textures.exists(key)) this.load.image(key, elementIcon(element));
    });
    queuePlayerFighterTextures(this, this.playerAppearance());
    this.mission.encounters.forEach((id, index) => {
      const profile = ENEMY_ROSTER[id];
      queueFighterTexture(this, this.enemyAppearance(profile, index));
      if (profile.boss) queueFighterTexture(this, this.bossPhaseAppearance(profile, index));
    });
  }

  create() {
    // Phaser 3.90 no escala el framebuffer mediante GameConfig.resolution.
    // Renderizamos una superficie física acorde al escenario y la cámara conserva el lienzo
    // lógico de 960 × 540, evitando que el navegador amplíe texto rasterizado.
    this.cameras.main.setZoom(RENDER_RESOLUTION).centerOn(WIDTH / 2, HEIGHT / 2);
    this.saveData = activeSave;
    this.mission = activeMission;
    this.encounters = this.mission.encounters.map((id) => ENEMY_ROSTER[id]);
    const stats = derivedStats(this.saveData);
    this.player = { ...stats, hp: stats.maxHp, chakra: stats.maxChakra, statuses: [], guarding: false };
    const selectedJutsus = this.saveData.loadout.map((id) => JUTSU_LIBRARY.find((jutsu) => jutsu.id === id)).filter(Boolean)
      .map((jutsu) => ({ ...jutsu, iconTexture: `element-${jutsu.element}` }));
    this.actions = [
      { ...BASE_ACTIONS[0], iconTexture: "action-strike" },
      ...selectedJutsus,
      { ...BASE_ACTIONS[1], iconTexture: "action-guard" }
    ];
    this.enemyIndex = 0;
    this.enemy = this.createEnemyState(this.encounters[this.enemyIndex]);
    this.cooldowns = Object.fromEntries(this.actions.map((action) => [action.id, 0]));
    this.round = 1;
    this.busy = true;
    this.turnReady = false;
    this.finished = false;
    this.audioContext = null;
    this.configureSealMode();
    this.configurePresentationOptions();
    try { this.seenJutsus = new Set(JSON.parse(window.localStorage.getItem("seen-jutsus") || "[]")); } catch (_) { this.seenJutsus = new Set(); }

    this.makeSealFrames();
    this.drawArena();
    this.hudChrome = this.add.image(WIDTH / 2, HEIGHT / 2, "battleHudOverlay").setDisplaySize(WIDTH, HEIGHT).setDepth(18);
    this.createHud();
    this.createFighters();
    this.createActionPanel();
    this.createTurnTimeline();
    this.createPauseButton();
    this.startMusic();
    this.setMessage(`${this.mission.title} · Los combatientes toman posición.`);
    this.startTurnCharge();
    this.sharpenSceneText();
  }

  configureSealMode() {
    const toggle = document.getElementById("manual-seals");
    const hint = document.getElementById("mode-hint");
    this.manualSeals = toggle.checked;

    const updateHint = () => {
      hint.textContent = this.manualSeals
        ? "Completa las secuencias con QWER / ASDF / ZXCV."
        : "Los sellos se ejecutarán automáticamente.";
    };

    this.onSealModeChange = () => {
      this.manualSeals = toggle.checked;
      try { window.localStorage.setItem("seal-input-mode", this.manualSeals ? "manual" : "automatic"); } catch (_) { /* El juego continúa sin persistencia. */ }
      updateHint();
      if (!this.busy && !this.finished) {
        this.setMessage(this.manualSeals ? "Sellos manuales activados." : "Sellos automáticos activados.");
      }
    };

    toggle.addEventListener("change", this.onSealModeChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => toggle.removeEventListener("change", this.onSealModeChange));
    updateHint();
  }

  configurePresentationOptions() {
    const cameraToggle = document.getElementById("camera-effects");
    const flashToggle = document.getElementById("flash-effects");
    const musicToggle = document.getElementById("music-enabled");
    const lightToggle = document.getElementById("light-mode");
    const volumeInput = document.getElementById("game-volume");
    this.cameraEffects = cameraToggle.checked;
    this.flashEffects = flashToggle.checked;
    this.musicEnabled = musicToggle.checked;
    this.lightMode = lightToggle.checked;
    this.volume = Number(volumeInput.value) / 100;

    const update = () => {
      this.cameraEffects = cameraToggle.checked;
      this.flashEffects = flashToggle.checked;
      this.musicEnabled = musicToggle.checked;
      this.lightMode = lightToggle.checked;
      this.volume = Number(volumeInput.value) / 100;
      try {
        window.localStorage.setItem("camera-effects", this.cameraEffects ? "on" : "off");
        window.localStorage.setItem("flash-effects", this.flashEffects ? "on" : "off");
        window.localStorage.setItem("music-enabled", this.musicEnabled ? "on" : "off");
        window.localStorage.setItem("light-mode", this.lightMode ? "on" : "off");
        window.localStorage.setItem("game-volume", volumeInput.value);
      } catch (_) { /* Las opciones funcionan aunque no puedan persistir. */ }
    };

    cameraToggle.addEventListener("change", update);
    flashToggle.addEventListener("change", update);
    musicToggle.addEventListener("change", update);
    lightToggle.addEventListener("change", update);
    volumeInput.addEventListener("input", update);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      cameraToggle.removeEventListener("change", update);
      flashToggle.removeEventListener("change", update);
      musicToggle.removeEventListener("change", update);
      lightToggle.removeEventListener("change", update);
      volumeInput.removeEventListener("input", update);
    });
  }

  createEnemyState(profile) {
    return {
      hp: profile.hp,
      maxHp: profile.hp,
      speed: profile.speed,
      accuracy: profile.accuracy,
      evasion: profile.evasion,
      weakness: profile.weakness,
      resistance: profile.resistance,
      statuses: [],
      phase: 1,
      patternIndex: 0
    };
  }

  chooseEnemyAction() {
    const profile = this.encounters[this.enemyIndex];
    const pattern = profile.boss && this.enemy.phase === 2 ? profile.phase2Pattern : profile.pattern;
    const actionId = pattern[this.enemy.patternIndex % pattern.length];
    this.enemy.patternIndex += 1;
    return ENEMY_ACTIONS[actionId];
  }

  makeSealFrames() {
    const texture = this.textures.get("sealSheet");
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const index = row * 4 + col;
        // La textura sobrevive al reinicio de la escena. Registrar los mismos
        // fotogramas otra vez deja la escena incompleta en algunas versiones.
        if (!texture.has(index)) texture.add(index, 0, col * 688, row * 512, 688, 512);
      }
    }
  }

  drawArena() {
    const theme = (this.mission.number - 1) % 3;
    const bgKey = theme === 0 ? "bg-dusk" : theme === 1 ? "bg-marsh" : "bg-moon";
    if (this.textures.exists(bgKey)) {
      this.add.image(WIDTH / 2, HEIGHT / 2, bgKey).setDisplaySize(WIDTH, HEIGHT).setDepth(0);
    } else if (this.textures.exists("bg-arena")) {
      this.add.image(WIDTH / 2, HEIGHT / 2, "bg-arena").setDisplaySize(WIDTH, HEIGHT).setDepth(0);
    }

    const g = this.add.graphics().setDepth(1);
    if (theme === 0) this.drawDuskPass(g);
    else if (theme === 1) this.drawMistMarsh(g);
    else this.drawMoonShrine(g);

    // Velo inferior común al resto del metajuego: azul tinta, limpio y legible.
    g.fillGradientStyle(0x061321, 0x061321, 0x020812, 0x020812, 0.04, 0.04, 0.42, 0.56);
    g.fillRect(0, 282, WIDTH, 258);
    g.lineStyle(1, 0x65bce9, 0.18);
    g.lineBetween(0, 326, WIDTH, 326);

    this.arenaLabel = ["PASO DEL CREPÚSCULO", "MARISMA DE LOS JUNCOS", "SANTUARIO DE LA LUNA"][theme];
  }

  drawDuskPass(g) {
    g.fillGradientStyle(0x000000, 0x000000, 0x2a1210, 0x2a1210, 0.08, 0.08, 0.38, 0.38);
    g.fillRect(0, 0, WIDTH, 350);
    for (let x = 30; x < WIDTH; x += 64) {
      g.fillStyle(0xffbd73, 0.22);
      g.fillCircle(x, 260 + (x % 5) * 12, 2);
    }
  }

  drawMistMarsh(g) {
    g.fillGradientStyle(0x000000, 0x000000, 0x0b2420, 0x0b2420, 0.08, 0.08, 0.42, 0.42);
    g.fillRect(0, 0, WIDTH, 350);
    g.fillStyle(0x67e8c3, 0.06);
    g.fillEllipse(320, 320, 480, 40);
    g.fillEllipse(720, 310, 460, 45);
  }

  drawMoonShrine(g) {
    g.fillGradientStyle(0x000000, 0x000000, 0x1d0f2e, 0x1d0f2e, 0.08, 0.08, 0.42, 0.42);
    g.fillRect(0, 0, WIDTH, 350);
    for (let x = 60; x < WIDTH; x += 96) {
      g.fillStyle(0xb879ff, 0.18);
      g.fillCircle(x, 230 + (x % 4) * 18, 2);
    }
  }

  createHud() {
    const panelWidth = 354;
    const panelHeight = 91;
    const playerX = 22;
    const enemyX = 594;
    const barXOffset = 78;
    const barWidth = panelWidth - barXOffset - 16;
    const barHeight = 21;

    this.playerName = this.add.text(
      playerX + 70,
      19,
      `${this.saveData.character.name.toUpperCase()} · NV ${this.saveData.progression.level}`,
      {
        fontFamily: '"Cinzel", Georgia, serif',
        fontSize: "15px",
        color: "#f7fbff",
        fontStyle: "bold",
        stroke: "#06090e",
        strokeThickness: 2
      }
    ).setDepth(21);

    this.playerRank = this.add.text(
      playerX + panelWidth - 16,
      21,
      this.saveData.campaign.rank.toUpperCase(),
      {
        fontFamily: '"Cinzel", Georgia, serif',
        fontSize: "9px",
        color: "#82d3f7",
        fontStyle: "bold"
      }
    ).setOrigin(1, 0).setDepth(21);

    this.enemyName = this.add.text(
      enemyX + panelWidth / 2,
      19,
      this.encounters[this.enemyIndex].name.toUpperCase(),
      {
        fontFamily: '"Cinzel", Georgia, serif',
        fontSize: "15px",
        color: "#f7fbff",
        fontStyle: "bold",
        stroke: "#06090e",
        strokeThickness: 2
      }
    ).setOrigin(0.5, 0).setDepth(21);

    const statStyle = { fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "9px", color: "#91b2c8", fontStyle: "bold" };
    this.add.text(playerX + 18, 57, "♥  VIDA", { ...statStyle, color: "#52f3a2" }).setOrigin(0, 0.5).setDepth(24);
    this.add.text(playerX + 18, 80, "◉  CHAKRA", { ...statStyle, color: "#56cfff" }).setOrigin(0, 0.5).setDepth(24);
    this.add.text(enemyX + 18, 57, "♥  VIDA", { ...statStyle, color: "#ff6571" }).setOrigin(0, 0.5).setDepth(24);

    this.playerHpBar = createBar(this, playerX + barXOffset, 57, barWidth, barHeight, 0x38df87);
    this.chakraBar = createBar(this, playerX + barXOffset, 80, barWidth, barHeight, 0x2eaff4);
    this.enemyHpBar = createBar(this, enemyX + barXOffset, 57, barWidth - 8, barHeight, 0xef4755);

    [this.playerHpBar, this.chakraBar, this.enemyHpBar].forEach((bar) => {
      bar.bg.setDepth(21);
      if (bar.slot) bar.slot.setDepth(21);
      bar.fill.setDepth(22);
      if (bar.sheen) bar.sheen.setDepth(23);
      bar.valueText.setDepth(24);
    });

    this.playerStatusText = this.add.text(playerX + 18, 94, "", {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif',
      fontSize: "10px",
      color: "#79e8b5",
      fontStyle: "bold"
    }).setDepth(21);

    this.enemyStatusText = this.add.text(enemyX + panelWidth - 18, 78, "", {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif',
      fontSize: "10px",
      color: "#f0b55f",
      fontStyle: "bold"
    }).setOrigin(1, 0).setDepth(21);

    if (this.saveData.equipment.companion) {
      this.companionText = this.add.text(playerX + panelWidth - 18, 94, "MIKA · APOYO EN 2 RONDAS", {
        fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif',
        fontSize: "9px",
        color: "#82d3f7",
        fontStyle: "bold"
      }).setOrigin(1, 0).setDepth(21);
    }

    this.messagePlate = this.add.rectangle(WIDTH / 2, 299, 410, 31, 0x000000, 0.001)
      .setOrigin(0.5)
      .setDepth(22);
    this.messageText = this.add.text(WIDTH / 2, 299, "", {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif',
      fontSize: "13px",
      color: "#edf7fd",
      fontStyle: "bold",
      stroke: "#05080e",
      strokeThickness: 1
    }).setOrigin(0.5).setDepth(23);

    this.refreshHud();
    this.sealLayer = this.add.container(WIDTH / 2, 120).setDepth(30);
  }

  createTurnTimeline() {
    this.timelineLayer = this.add.container(0, 0).setDepth(30);
    const trackY = 354;
    const title = this.add.text(480, 327, "ORDEN DEL TURNO", {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif',
      fontSize: "10px",
      color: "#f2f7fb",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.playerTurnMarker = this.add.circle(TIMELINE_START, trackY, 17, 0x0c2b45, 1)
      .setStrokeStyle(3, 0x50d7ff, 1);
    this.enemyTurnMarker = this.add.circle(TIMELINE_START + 330, trackY, 17, 0x45131b, 1)
      .setStrokeStyle(3, 0xff5668, 1);
    this.playerTurnLetter = this.add.text(TIMELINE_START, trackY, "TÚ", {
      fontFamily: '"Cinzel", Georgia, serif',
      fontSize: "9px",
      color: "#fff4df",
      fontStyle: "bold"
    }).setOrigin(0.5);
    this.enemyTurnLetter = this.add.text(TIMELINE_START + 330, trackY, "R", {
      fontFamily: '"Cinzel", Georgia, serif',
      fontSize: "9px",
      color: "#ffd8dc",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.timelineLayer.add([
      title,
      this.playerTurnMarker, this.enemyTurnMarker,
      this.playerTurnLetter, this.enemyTurnLetter
    ]);
  }

  createPauseButton() {
    const bg = this.add.rectangle(480, 55, 146, 42, 0x0d5b86, 0.001)
      .setDepth(25)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(480, 55, "Ⅱ  PAUSA", {
      fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif',
      fontSize: "11px",
      color: "#f7fbff",
      fontStyle: "bold"
    }).setOrigin(0.5).setDepth(26);

    bg.on("pointerover", () => {
      bg.setFillStyle(0x2b9bd0, 0.18);
    });
    bg.on("pointerout", () => {
      bg.setFillStyle(0x0d5b86, 0.001);
    });
    const openPause = () => {
      if (this.finished || this.scene.isPaused()) return;
      this.scene.launch("pause");
      this.scene.pause();
    };
    bg.on("pointerup", openPause);
    this.input.keyboard.on("keydown-ESC", openPause);
    this.pauseButton = { bg, label };
  }

  startTurnCharge() {
    if (this.finished) return;
    this.turnReady = false;
    this.busy = true;
    this.setButtonsEnabled(false);
    this.setMessage(`Ronda ${this.round} · Preparando el siguiente turno...`, "#adc9e8");
    const enemyTarget = Phaser.Math.Clamp(TIMELINE_START + 330 + (this.enemy.speed - this.player.speed) * 6, TIMELINE_START + 250, TIMELINE_END - 80);
    this.tweens.add({ targets: [this.enemyTurnMarker, this.enemyTurnLetter], x: enemyTarget, duration: 950, ease: "Sine.out" });
    this.tweens.add({
      targets: [this.playerTurnMarker, this.playerTurnLetter], x: TIMELINE_END, duration: 1050, ease: "Sine.inOut",
      onComplete: () => {
        if (this.finished) return;
        this.turnReady = true;
        this.busy = false;
        this.setButtonsEnabled(true);
        this.setMessage(`Ronda ${this.round} · ¡Tu turno! Selecciona una acción.`, "#bceaff");
        this.tweens.add({ targets: [this.playerTurnMarker, this.playerTurnLetter], scale: 1.22, duration: 170, yoyo: true, repeat: 1 });
      }
    });
  }

  async resetTurnTimeline() {
    this.turnReady = false;
    this.setButtonsEnabled(false);
    this.tweens.add({ targets: [this.playerTurnMarker, this.playerTurnLetter, this.enemyTurnMarker, this.enemyTurnLetter], x: TIMELINE_START, duration: 330, ease: "Cubic.inOut" });
    await this.delay(360);
  }

  createFighters() {
    const profile = this.encounters[this.enemyIndex];
    const auraColor = Number.parseInt(this.saveData.character.appearance.slice(1), 16);
    this.heroAura = this.add.circle(220, 220, 82, auraColor, 0.055).setStrokeStyle(3, auraColor, 0.24).setDepth(5);
    this.tweens.add({ targets: this.heroAura, scale: 1.06, alpha: 0.16, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.hero = createPlayerFighter(this, 220, 248, this.playerAppearance());
    this.foe = createGeometricFighter(this, 740, 248, this.enemyAppearance(profile), true);
    this.tweens.add({ targets: this.foe.targets, y: "-=3", duration: 1100, yoyo: true, repeat: -1, ease: "Sine.inOut", delay: 180 });
  }

  createActionPanel() {
    this.buttons = [];

    for (let index = 0; index < 6; index += 1) {
      const jutsu = this.actions[index] || null;
      const button = createActionButton(this, jutsu, index);
      if (!jutsu) continue;
      const { bg, hit, shortcutBg } = button;
      hit.on("pointerover", () => {
        if (!this.busy && !this.finished) {
          bg.setFillStyle(0x2b9bd0, 0.2);
        }
      });
      hit.on("pointerout", () => {
        bg.setFillStyle(0x0d5b86, 0.001);
      });
      hit.on("pointerdown", () => this.useJutsu(jutsu));
      this.buttons.push(button);
    }

    this.onActionShortcut = (event) => {
      const index = Number(event.key) - 1;
      if (index < 0 || index >= this.actions.length) return;
      this.useJutsu(this.actions[index]);
    };
    this.input.keyboard.on("keydown", this.onActionShortcut);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard.off("keydown", this.onActionShortcut));
  }

  async useJutsu(jutsu) {
    if (this.busy || this.finished || !this.turnReady) return;
    if (this.cooldowns[jutsu.id] > 0) {
      this.setMessage(`${jutsu.name} sigue en enfriamiento.`, "#ff9d8d");
      return;
    }
    const cost = this.actionCost(jutsu);
    if (this.player.chakra < cost) {
      this.setMessage("No tienes suficiente chakra para esa técnica.", "#ff9d8d");
      this.shake(90, 0.003);
      return;
    }

    this.busy = true;
    this.turnReady = false;
    this.player.chakra -= cost;
    if (jutsu.cooldown) this.cooldowns[jutsu.id] = jutsu.cooldown + 1;
    this.refreshHud();
    this.setButtonsEnabled(false);
    this.setMessage(jutsu.seals.length ? `Preparando ${jutsu.name}...` : `Preparando ${jutsu.name}...`);

    const casting = jutsu.seals.length ? await this.playSeals(jutsu) : { mistakes: 0, multiplier: 1 };
    const enemyAction = this.chooseEnemyAction();
    const playerActionSpeed = this.player.speed + jutsu.speedMod;
    const enemyActionSpeed = this.enemy.speed + enemyAction.speedMod - (hasStatus(this.enemy, "seal") ? 4 : 0);
    const enemyFirst = enemyActionSpeed > playerActionSpeed && jutsu.type !== "guard";
    this.tweens.add({ targets: [this.enemyTurnMarker, this.enemyTurnLetter], x: TIMELINE_END - 20, duration: 260, ease: "Cubic.out" });

    if (enemyFirst) {
      this.setMessage(`${enemyAction.name} es más rápido (${enemyActionSpeed} > ${playerActionSpeed}).`);
      await this.delay(480);
      await this.executeEnemyAction(enemyAction);
      if (this.player.hp <= 0) return this.finishBattle(false);
    }

    if (jutsu.type === "guard") await this.playerGuard();
    else await this.playerAttack(jutsu, casting);

    if (this.enemy.hp > 0 && this.saveData.equipment.companion && this.round % 2 === 0) await this.companionAttack();

    if (await this.resolveEnemyOutcome()) return;

    if (!enemyFirst) {
      await this.delay(420);
      await this.executeEnemyAction(enemyAction);
      if (this.player.hp <= 0) return this.finishBattle(false);
    }

    await this.resolveEndRoundStatuses();
    if (await this.resolveEnemyOutcome()) return;
    if (this.player.hp <= 0) return this.finishBattle(false);

    this.clearGuard();
    this.advanceCooldowns();
    this.player.chakra = Math.min(this.player.maxChakra, this.player.chakra + 8);
    this.round += 1;
    this.refreshHud();

    await this.resetTurnTimeline();
    this.startTurnCharge();
  }

  async resolveEnemyOutcome() {
    const profile = this.encounters[this.enemyIndex];
    if (this.enemy.hp <= 0) {
      const reward = awardEncounter(this.saveData, this.enemyIndex);
      this.saveData = writeSave(reward.save);
      activeSave = this.saveData;
      this.lastReward = reward;
      if (this.enemyIndex === this.encounters.length - 1) {
        const completion = completeMission(this.saveData, this.mission.id);
        this.saveData = writeSave(completion.save);
        activeSave = this.saveData;
        this.missionReward = completion;
        await this.finishBattle(true);
      } else {
        await this.advanceEncounter();
      }
      return true;
    }

    if (profile.boss && this.enemy.phase === 1 && this.enemy.hp <= this.enemy.maxHp / 2) {
      await this.triggerBossPhaseTwo();
    }
    return false;
  }

  async advanceEncounter() {
    const defeatedName = this.encounters[this.enemyIndex].name;
    const levelNote = this.lastReward?.levelsGained ? ` · ¡Nivel +${this.lastReward.levelsGained}!` : "";
    this.setMessage(`${defeatedName} derrotado · +${this.lastReward.xp} PX · +${this.lastReward.affinityXp} PX de afinidad · +${this.lastReward.coins} monedas${levelNote}`, "#79e8b5");
    this.stopFighterFlash(this.foe);
    this.tweens.add({ targets: this.foe.targets, alpha: 0, x: "+=70", duration: 480 });
    await this.delay(560);
    destroyFighter(this.foe);

    this.enemyIndex += 1;
    const profile = this.encounters[this.enemyIndex];
    this.enemy = this.createEnemyState(profile);
    this.enemyName.setText(profile.name);
    this.foe = createGeometricFighter(this, 810, 248, this.enemyAppearance(profile), true);
    this.foe.targets.forEach((target) => target.setAlpha(0));
    this.tweens.add({ targets: this.foe.targets, x: "-=70", alpha: 1, duration: 520, ease: "Cubic.out" });
    this.tweens.add({ targets: this.foe.targets, y: "-=3", duration: 1100, yoyo: true, repeat: -1, ease: "Sine.inOut", delay: 550 });

    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35);
    this.player.chakra = Math.min(this.player.maxChakra, this.player.chakra + 25);
    this.player.statuses = [];
    this.clearGuard();
    Object.keys(this.cooldowns).forEach((id) => { this.cooldowns[id] = 0; });
    this.round += 1;
    this.refreshHud();
    await this.delay(620);
    await this.resetTurnTimeline();
    this.setMessage(`Encuentro ${this.enemyIndex + 1}/${this.encounters.length}: ${profile.name}.`);
    this.startTurnCharge();
  }

  async triggerBossPhaseTwo() {
    const profile = this.encounters[this.enemyIndex];
    this.enemy.phase = 2;
    this.enemy.patternIndex = 0;
    this.enemy.speed += 3;
    this.enemy.accuracy += 4;
    this.enemy.evasion += 2;
    this.enemy.weakness = "lightning";
    this.enemyName.setText(`${profile.name} · FASE II`);
    this.setMessage("El Maestro rompe su sello: comienza la Fase II.", "#d6a5ff");
    this.bossAura = this.add.circle(this.foe.body.x, this.foe.body.y - 20, 82, 0x9a55df, 0.12)
      .setStrokeStyle(5, 0xb879ff, 0.72).setDepth(7);
    this.tweens.add({ targets: this.bossAura, scale: 1.1, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
    this.foe.sprite.setTexture(fighterTextureKey(this.bossPhaseAppearance(profile, this.enemyIndex)));
    this.screenFlash(220, 130, 55, 180);
    this.tone(95, 0.35);
    this.refreshHud();
    await this.delay(900);
  }

  async playSeals(jutsu) {
    const manualCasting = this.manualSeals;
    const speedFactor = this.seenJutsus.has(jutsu.id) ? 0.55 : 1;
    let overlay;
    if (jutsu.cinematic) {
      overlay = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x020307, 0.92).setOrigin(0).setDepth(20).setAlpha(0);
      this.tweens.add({ targets: overlay, alpha: 1, duration: 180 });
      this.setMessage(jutsu.name.toUpperCase());
      await this.delay(180 * speedFactor);
    }

    const spacing = jutsu.cinematic ? 122 : 96;
    const size = jutsu.cinematic ? 104 : 80;
    const shuffledSealIds = [...jutsu.seals];
    for (let i = shuffledSealIds.length - 1; i > 0; i -= 1) {
      const swapIndex = Phaser.Math.Between(0, i);
      [shuffledSealIds[i], shuffledSealIds[swapIndex]] = [shuffledSealIds[swapIndex], shuffledSealIds[i]];
    }
    const startX = -((shuffledSealIds.length - 1) * spacing) / 2;
    const cards = [];

    for (let i = 0; i < shuffledSealIds.length; i += 1) {
      const seal = SEALS[shuffledSealIds[i]];
      const x = startX + i * spacing;
      const card = this.add.container(x, jutsu.cinematic ? 120 : 0).setAlpha(0).setScale(0.45).setSize(size, size);
      const plate = this.add.rectangle(0, 0, size, size, 0x0b0e14, 0.94).setStrokeStyle(2, jutsu.color, 0.9);
      const imageWidth = size - 12;
      const image = this.add.image(0, -6, "sealSheet", seal.frame).setDisplaySize(imageWidth, imageWidth * (512 / 688));
      const label = this.add.text(0, size / 2 - 4, `${seal.key} · ${seal.label}`, this.textStyle(jutsu.cinematic ? 12 : 9, "#fff1d6", "800")).setOrigin(0.5, 1);
      card.add([plate, image, label]);
      this.sealLayer.add(card);
      this.tweens.add({ targets: card, alpha: 1, scale: 1, duration: 130, ease: "Back.out" });
      cards.push({ card, plate, seal });
      await this.delay((jutsu.cinematic ? 115 : 80) * speedFactor);
    }

    let mistakes = 0;
    for (let i = 0; i < cards.length; i += 1) {
      const current = cards[i];
      current.plate.setStrokeStyle(4, 0xffffff, 1);
      this.tweens.add({ targets: current.card, scale: 1.1, duration: 110, yoyo: true, repeat: -1, ease: "Sine.inOut" });

      if (manualCasting) {
        const inputWindow = jutsu.cinematic ? 1500 : 1200;
        this.setMessage(`Haz clic en ${current.seal.label} antes de que se agote el tiempo  (${i + 1}/${cards.length})`);
        const result = await this.waitForSealInput(current.seal.key, current.card, jutsu.color, inputWindow);
        mistakes += result.mistakes;
        current.plate.setStrokeStyle(3, result.timedOut ? 0xff665f : result.mistakes === 0 ? 0x66efad : 0xffc46b, 1);
      } else {
        this.setMessage(`Ejecutando ${current.seal.label}  (${i + 1}/${cards.length})`);
        await this.delay((jutsu.cinematic ? 230 : 175) * speedFactor);
        current.plate.setStrokeStyle(3, 0x68a8ff, 1);
      }

      this.tweens.killTweensOf(current.card);
      current.card.setScale(1);
      this.tone(270 + i * 72, 0.065);
    }

    const multiplier = manualCasting ? (mistakes === 0 ? 1.1 : mistakes <= 2 ? 1 : 0.85) : 1;
    const quality = !manualCasting
      ? "Secuencia automática completada."
      : mistakes === 0
        ? "Secuencia perfecta: +10 % de daño."
        : mistakes <= 2
          ? `Secuencia completada con ${mistakes} error${mistakes === 1 ? "" : "es"}.`
          : "Secuencia inestable: daño reducido.";
    const qualityColor = !manualCasting || mistakes <= 2 ? (manualCasting && mistakes === 0 ? "#79e8b5" : "#f7d6a5") : "#ff9d8d";
    this.setMessage(quality, qualityColor);
    await this.delay(320);
    this.tone(580, 0.11);
    this.tweens.add({ targets: this.sealLayer, scale: 1.08, duration: 90, yoyo: true });
    await this.delay(150);
    this.sealLayer.removeAll(true);
    this.sealLayer.setScale(1);
    if (overlay) {
      this.tweens.add({ targets: overlay, alpha: 0, duration: 140, onComplete: () => overlay.destroy() });
      await this.delay(120);
    }
    this.seenJutsus.add(jutsu.id);
    try { window.localStorage.setItem("seen-jutsus", JSON.stringify([...this.seenJutsus])); } catch (_) { /* La aceleración sigue activa durante la sesión. */ }
    return { mistakes, multiplier };
  }

  waitForSealInput(expectedKey, card, color, timeoutMs = 1200) {
    return new Promise((resolve) => {
      let mistakes = 0;
      let done = false;
      let timedOut = false;

      // La barra de tiempo queda fuera de la tarjeta para no tapar
      // la tecla ni el nombre del sello.
      const timerY = card.height / 2 + 9;
      const timerBg = this.add.rectangle(0, timerY, card.width - 12, 5, 0x202a38, 0.95).setOrigin(0.5);
      const timerFill = this.add.rectangle(-(card.width - 12) / 2, timerY, card.width - 12, 5, 0xf5c96b, 1).setOrigin(0, 0.5);
      card.add([timerBg, timerFill]);

      const timerTween = this.tweens.add({
        targets: timerFill,
        scaleX: 0,
        duration: timeoutMs,
        ease: "Linear"
      });

      const timeoutEvent = this.time.delayedCall(timeoutMs, () => {
        if (done) return;
        timedOut = true;
        mistakes += 1;
        this.tone(90, 0.1);
        this.shake(70, 0.003);
        this.setMessage("Tiempo agotado: el sello se perdió.", "#ff786d");
        finish();
      });

      const finish = () => {
        if (done) return;
        done = true;
        timeoutEvent.remove(false);
        timerTween.stop();
        this.input.keyboard.off("keydown", onKey);
        card.disableInteractive();
        resolve({ mistakes, timedOut });
      };

      const wrong = () => {
        mistakes += 1;
        this.tone(105, 0.06);
        this.shake(55, 0.002);
        this.tweens.add({ targets: card, x: card.x + 7, duration: 35, yoyo: true, repeat: 2 });
        this.setMessage(`Sello incorrecto. Busca ${expectedKey}.`, "#ff9d8d");
      };

      const onKey = (event) => {
        if (event.repeat) return;
        const pressed = event.code.startsWith("Key") ? event.code.slice(3) : event.key.toUpperCase();
        if (pressed === expectedKey) finish(); else if (/^[A-Z]$/.test(pressed)) wrong();
      };

      this.input.keyboard.on("keydown", onKey);
      card.setInteractive({ useHandCursor: true });
      card.once("pointerdown", finish);
      card.getAt(0).setStrokeStyle(4, color, 1);
    });
  }

  async playerAttack(jutsu, casting) {
    const elementalMultiplier = affinityMultiplier(jutsu, this.enemy);
    const affinityBonus = canAccessElement(jutsu.element, this.saveData.character.affinities, this.saveData.campaign.elementRank) ? 1.1 : 1;
    const damage = Math.max(1, Math.round((jutsu.damage + this.player.damageBonus) * casting.multiplier * elementalMultiplier * affinityBonus));
    const chance = hitChance(this.player, this.enemy, jutsu);
    const originX = this.hero.body.x;
    const usesPuppetPunch = jutsu.id === "strike" && this.hero.joints?.shoulderRight;
    if (usesPuppetPunch) await preparePlayerPunch(this, this.hero);
    this.tweens.add({ targets: this.hero.targets, x: "+=62", duration: 120, yoyo: true, hold: 50, ease: "Quad.out" });
    if (usesPuppetPunch) releasePlayerPunch(this, this.hero);
    await this.delay(125);

    if (!this.rollHit(chance)) {
      this.tone(205, 0.08);
      this.floatLabel(this.foe.body.x, this.foe.body.y - 118, "FALLO", 0xd7dce5);
      this.setMessage(`${jutsu.name} falló (${chance} % de precisión).`, "#d7dce5");
      if (usesPuppetPunch) recoverPlayerPunch(this, this.hero);
      await this.delay(430);
      this.hero.body.x = originX;
      return;
    }

    this.createImpact(this.foe.body.x, this.foe.body.y - 15, jutsu.color, jutsu.cinematic ? 1.6 : 1);
    this.tone(jutsu.cinematic ? 92 : 128, 0.12);
    this.shake(jutsu.cinematic ? 240 : 130, jutsu.cinematic ? 0.012 : 0.006);
    this.enemy.hp = Math.max(0, this.enemy.hp - damage);
    if (jutsu.status && this.enemy.hp > 0) {
      applyStatus(this.enemy, jutsu.status);
      this.refreshHud();
    }
    this.flashFighter(this.foe);
    this.floatDamage(this.foe.body.x, this.foe.body.y - 120, damage, jutsu.color);
    this.refreshHud();
    const statusNote = jutsu.status && this.enemy.hp > 0 ? ` · ${jutsu.status.label}` : "";
    const elementNote = affinityLabel(elementalMultiplier);
    this.setMessage(`${jutsu.name}: ${damage} de daño${statusNote}${elementNote ? ` · ${elementNote}` : ""}.`);
    if (usesPuppetPunch) recoverPlayerPunch(this, this.hero);
    await this.delay(430);
    this.hero.body.x = originX;
  }

  async playerGuard() {
    this.player.guarding = true;
    this.player.chakra = Math.min(this.player.maxChakra, this.player.chakra + 12);
    this.guardAura = this.add.circle(this.hero.body.x, this.hero.body.y - 18, 72, 0xf5c96b, 0.12)
      .setStrokeStyle(5, 0xf5c96b, 0.8).setDepth(8);
    this.tweens.add({ targets: this.guardAura, scale: 1.08, alpha: 0.35, duration: 420, yoyo: true, repeat: -1 });
    this.tone(390, 0.1);
    this.refreshHud();
    this.setMessage("Guardia preparada: el próximo impacto se reduce 50 %.");
    await this.delay(420);
  }

  async companionAttack() {
    const damage = 6 + this.saveData.progression.level * 2;
    this.setMessage("Mika encuentra una apertura y lanza su kunai.", "#79e8d1");
    this.createImpact(this.foe.body.x - 18, this.foe.body.y - 30, 0x67e8c3, 0.62);
    this.tone(330, 0.09);
    this.enemy.hp = Math.max(0, this.enemy.hp - damage);
    this.floatDamage(this.foe.body.x, this.foe.body.y - 145, damage, 0x67e8c3);
    this.flashFighter(this.foe);
    this.refreshHud();
    await this.delay(420);
  }

  async executeEnemyAction(action) {
    const stun = this.enemy.statuses.find((status) => status.type === "stun");
    if (stun) {
      this.enemy.statuses = this.enemy.statuses.filter((status) => status !== stun);
      this.refreshHud();
      this.setMessage("El rival está aturdido y pierde su acción.", "#8fc7ff");
      this.tone(180, 0.16);
      await this.delay(620);
      return;
    }
    await this.enemyTurn(action);
  }

  async enemyTurn(action) {
    const rawDamage = Phaser.Math.Between(action.damage[0], action.damage[1]);
    const damage = this.player.guarding ? Math.ceil(rawDamage * 0.5) : rawDamage;
    const chance = hitChance(this.enemy, this.player, action);
    this.setMessage(`El rival usa ${action.name}${this.player.guarding ? " contra tu guardia" : ""}...`);
    this.tweens.add({ targets: this.foe.targets, x: "-=55", duration: 150, yoyo: true, hold: 40, ease: "Quad.out" });
    await this.delay(170);

    if (!this.rollHit(chance)) {
      this.tone(205, 0.08);
      this.floatLabel(this.hero.body.x, this.hero.body.y - 118, "ESQUIVA", 0x67e8c3);
      this.setMessage(`Esquivaste ${action.name} (${chance} % de precisión enemiga).`, "#79e8b5");
      await this.delay(520);
      return;
    }

    this.createImpact(this.hero.body.x, this.hero.body.y - 10, action.color, 0.8);
    this.tone(110, 0.1);
    this.shake(120, 0.005);
    this.player.hp = Math.max(0, this.player.hp - damage);
    if (action.status && !this.player.guarding && this.player.hp > 0) {
      applyStatus(this.player, action.status);
      this.refreshHud();
    }
    this.flashFighter(this.hero);
    this.floatDamage(this.hero.body.x, this.hero.body.y - 120, damage, action.color);
    this.refreshHud();
    await this.delay(520);
  }

  rollHit(chance) {
    return Math.random() * 100 < chance;
  }

  async resolveEndRoundStatuses() {
    const targets = [
      { data: this.player, fighter: this.hero, x: this.hero.body.x, color: 0xb58cff },
      { data: this.enemy, fighter: this.foe, x: this.foe.body.x, color: 0xff784f }
    ];
    let triggered = false;

    for (const target of targets) {
      for (const status of target.data.statuses) {
        if (status.power <= 0) continue;
        triggered = true;
        target.data.hp = Math.max(0, target.data.hp - status.power);
        this.floatDamage(target.x, target.fighter.body.y - 118, status.power, target.color);
        this.flashFighter(target.fighter);
        this.setMessage(`${status.label}: ${status.power} de daño.`);
        await this.delay(330);
      }
      target.data.statuses.forEach((status) => {
        if (status.type !== "stun") status.duration -= 1;
      });
      target.data.statuses = target.data.statuses.filter((status) => status.duration > 0);
    }

    if (triggered) {
      this.refreshHud();
      await this.delay(220);
    }
  }

  advanceCooldowns() {
    Object.keys(this.cooldowns).forEach((id) => {
      this.cooldowns[id] = Math.max(0, this.cooldowns[id] - 1);
    });
  }

  clearGuard() {
    this.player.guarding = false;
    if (this.guardAura) {
      this.tweens.killTweensOf(this.guardAura);
      this.guardAura.destroy();
      this.guardAura = null;
    }
  }

  createImpact(x, y, color, scale) {
    const ring = this.add.circle(x, y, 12, color, 0.26).setStrokeStyle(7, color, 1).setDepth(15);
    const slash = this.add.rectangle(x, y, 145 * scale, 10, 0xffffff, 0.94).setAngle(-32).setDepth(16);
    this.tweens.add({ targets: ring, radius: 72 * scale, alpha: 0, duration: 260, onComplete: () => ring.destroy() });
    this.tweens.add({ targets: slash, scaleX: 0.2, alpha: 0, duration: 220, onComplete: () => slash.destroy() });
  }

  flashFighter(fighter) {
    this.stopFighterFlash(fighter);
    fighter.targets.forEach((target) => target.setAlpha(1));
    if (!this.flashEffects || this.lightMode) return;
    fighter.flashTween = this.tweens.add({
      targets: fighter.targets,
      alpha: 0.25,
      duration: 65,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        fighter.targets.forEach((target) => target.setAlpha(1));
        fighter.flashTween = null;
      }
    });
  }

  stopFighterFlash(fighter) {
    if (fighter.flashTween) {
      fighter.flashTween.stop();
      fighter.flashTween = null;
    }
    fighter.targets.forEach((target) => target.setAlpha(1));
  }

  floatDamage(x, y, amount, color) {
    const label = this.add.text(x, y, `-${amount}`, this.textStyle(28, `#${color.toString(16).padStart(6, "0")}`, "800")).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: label, y: y - 38, alpha: 0, duration: 720, ease: "Cubic.out", onComplete: () => label.destroy() });
  }

  floatLabel(x, y, text, color) {
    const label = this.add.text(x, y, text, this.textStyle(21, `#${color.toString(16).padStart(6, "0")}`, "800")).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: label, y: y - 32, alpha: 0, duration: 720, ease: "Cubic.out", onComplete: () => label.destroy() });
  }

  async finishBattle(won) {
    this.finished = true;
    this.busy = false;
    const rewardText = won && this.missionReward?.firstClear ? ` +${this.missionReward.xp} PX, +${this.missionReward.affinityXp} PX de afinidad y +${this.missionReward.coins} monedas de misión.` : "";
    const rankText = won && this.mission.exam && this.missionReward?.firstClear ? " ¡Ascenso a Guardián!" : "";
    this.setMessage(won ? `¡Misión completada!${rewardText}${rankText}` : "Misión fallida. Conservas las recompensas de encuentros superados.", won ? "#79e8b5" : "#ff8e80");
    const target = won ? this.foe : this.hero;
    this.stopFighterFlash(target);
    this.tweens.killTweensOf(target.targets);
    this.tweens.add({
      targets: target.targets,
      alpha: 0,
      duration: 900,
      ease: "Sine.inOut"
    });
    const reset = this.add.text(WIDTH / 2, 392, "VOLVER A LA ALDEA", this.textStyle(16, "#0b1018", "800", true))
      .setOrigin(0.5).setPadding(24, 12).setBackgroundColor("#f5a357").setDepth(50).setInteractive({ useHandCursor: true });
    reset.once("pointerup", () => {
      reset.disableInteractive().setText("REGRESANDO...");
      this.scene.start("travel", { direction: "toVillage" });
    });
  }

  setButtonsEnabled(enabled) {
    this.buttons.forEach(({ hit, shadow, bg, inner, glow, icon, iconText, shortcutBg, shortcut, name, divider, costText, description, bottomDivider, summaryText, sub, jutsu }) => {
      const affordable = this.player.chakra >= this.actionCost(jutsu);
      const cooldown = this.cooldowns[jutsu.id] || 0;
      const available = enabled && this.turnReady && affordable && cooldown === 0;
      if (available) hit.setInteractive({ useHandCursor: true }); else hit.disableInteractive();
      const visualAlpha = available ? 1 : 0.62;
      [shadow, bg, inner, glow, icon, iconText, shortcutBg, shortcut, name, divider, costText, description, bottomDivider, summaryText, sub].filter(Boolean)
        .forEach((part) => part.setAlpha(visualAlpha));
      if (jutsu.cost > 0 && costText) costText.setText(`◉  ${this.actionCost(jutsu)} chakra`);
      if (cooldown > 0) {
        sub.setText(`Recarga: ${cooldown} ronda${cooldown === 1 ? "" : "s"}`);
        sub.setColor("#ffb49d");
      } else {
        sub.setColor("#83bddc");
      }
    });
  }

  refreshHud() {
    this.playerHpBar.fill.width = this.playerHpBar.width * Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1);
    if (this.playerHpBar.sheen) this.playerHpBar.sheen.width = this.playerHpBar.fill.width;
    this.chakraBar.fill.width = this.chakraBar.width * Phaser.Math.Clamp(this.player.chakra / this.player.maxChakra, 0, 1);
    if (this.chakraBar.sheen) this.chakraBar.sheen.width = this.chakraBar.fill.width;
    this.enemyHpBar.fill.width = this.enemyHpBar.width * Phaser.Math.Clamp(this.enemy.hp / this.enemy.maxHp, 0, 1);
    if (this.enemyHpBar.sheen) this.enemyHpBar.sheen.width = this.enemyHpBar.fill.width;

    this.playerHpBar.valueText.setText(`${this.player.hp}/${this.player.maxHp}`);
    this.chakraBar.valueText.setText(`${this.player.chakra}/${this.player.maxChakra}`);
    this.enemyHpBar.valueText.setText(`${this.enemy.hp}/${this.enemy.maxHp}`);

    this.playerStatusText.setText(formatStatuses(this.player));
    const affinityInfo = `DÉBIL: ${this.elementName(this.enemy.weakness)} · RESISTE: ${this.elementName(this.enemy.resistance)}`;
    const enemyStatuses = formatStatuses(this.enemy);
    this.enemyStatusText.setText(enemyStatuses ? `${affinityInfo} · ${enemyStatuses}` : affinityInfo);
    if (this.companionText) this.companionText.setText(this.round % 2 === 0 ? "MIKA · APOYO LISTO" : "MIKA · APOYO EN 1 RONDA");
    if (this.buttons) this.setButtonsEnabled(!this.busy && !this.finished && this.turnReady);
  }

  setMessage(text, color = "#edf7fd") {
    this.lastBattleMessage = { text, color };
    if (this.messageText) {
      this.messageText.setText(text);
      this.messageText.setColor(color);
      if (this.messagePlate) {
        this.messagePlate.setAlpha(0.85);
        this.tweens.add({ targets: this.messagePlate, alpha: 0.65, duration: 400, yoyo: true });
      }
    }
  }

  actionCost(action) {
    return Math.max(0, action.cost - this.player.costReduction);
  }

  playerAppearance() {
    return playerFighterAppearance(this.saveData);
  }

  enemyAppearance(profile, index = this.enemyIndex) {
    const seed = index + this.mission.number;
    return { bodyType: seed % 2 ? "female" : "male", face: seed % 3 + 1, hair: seed % 5 + 1, top: seed % 3 + 1, bottom: (seed + 1) % 3 + 1, shoes: seed % 2 + 1, weapon: ["dagger", "sword", "staff", "kunai"][seed % 4], clothColor: profile.colors.cloth, accentColor: profile.colors.accent };
  }

  bossPhaseAppearance(profile, index = this.enemyIndex) {
    return { ...this.enemyAppearance(profile, index), clothColor: 0x9a55df, accentColor: 0x612348 };
  }

  elementName(element) {
    return ({ fire: "FUEGO", wind: "VIENTO", lightning: "RAYO", physical: "FÍSICO", arcane: "ARCANO" })[element] || localizedElementName(element).toUpperCase();
  }

  shake(duration, intensity) {
    if (this.cameraEffects && !this.lightMode) this.cameras.main.shake(duration, intensity);
  }

  screenFlash(duration, red, green, blue) {
    if (this.flashEffects && !this.lightMode) this.cameras.main.flash(duration, red, green, blue);
  }

  textStyle(size, color, weight = "500", display = false) {
    return {
      fontFamily: display ? '"Cinzel", Georgia, serif' : '"Alegreya Sans", "Segoe UI", sans-serif',
      fontSize: `${size}px`,
      color,
      fontStyle: weight === "700" || weight === "800" ? "bold" : "normal",
      resolution: Math.max(2, Math.ceil(RENDER_RESOLUTION))
    };
  }

  sharpenSceneText() {
    const resolution = Math.max(2, Math.ceil(RENDER_RESOLUTION));
    this.children.list.forEach((child) => {
      if (child instanceof Phaser.GameObjects.Text && typeof child.setResolution === "function") child.setResolution(resolution);
    });
  }

  delay(ms) { return new Promise((resolve) => this.time.delayedCall(ms, resolve)); }

  startMusic() {
    const notes = [110, 146, 123, 164, 110, 196];
    let step = 0;
    this.musicEvent = this.time.addEvent({
      delay: 920,
      loop: true,
      callback: () => {
        if (this.musicEnabled && !this.finished) this.tone(notes[step++ % notes.length], 0.42, 0.011);
      }
    });
  }

  tone(frequency, duration, gainAmount = 0.045) {
    if (this.volume <= 0) return;
    try {
      this.audioContext = this.audioContext || new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(gainAmount * this.volume, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
      oscillator.connect(gain).connect(this.audioContext.destination);
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (_) { /* El audio es decorativo; el juego funciona sin él. */ }
  }
}

class PauseScene extends Phaser.Scene {
  constructor() { super("pause"); }

  create() {
    this.cameras.main.setZoom(RENDER_RESOLUTION).centerOn(WIDTH / 2, HEIGHT / 2);
    this.battle = this.scene.get("battle");
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x02050a, 0.84).setOrigin(0).setDepth(100);
    this.add.rectangle(WIDTH / 2 + 5, HEIGHT / 2 + 7, 560, 460, 0x000000, 0.45).setDepth(101);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, 560, 460, 0x061321, 0.99)
      .setStrokeStyle(1.5, 0x65bce9, 0.95).setDepth(101);

    this.add.text(WIDTH / 2, 92, "MISIÓN EN PAUSA", {
      fontFamily: "Cinzel, Georgia, serif", fontSize: "26px", color: "#f7fbff", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(102);
    this.add.text(WIDTH / 2, 124, "Ajusta la partida o vuelve al combate.", {
      fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "13px", color: "#9fb0c6"
    }).setOrigin(0.5).setDepth(102);

    this.add.text(320, 160, "AJUSTES", {
      fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "12px", color: "#82d3f7", fontStyle: "bold"
    }).setDepth(102);

    const rows = [
      ["Sellos manuales", "manual-seals"],
      ["Sacudida de cámara", "camera-effects"],
      ["Destellos de pantalla", "flash-effects"],
      ["Música", "music-enabled"],
      ["Modo ligero", "light-mode"]
    ];

    rows.forEach(([label, id], index) => this.makePauseToggle(480, 188 + index * 38, label, id));

    this.makeVolumeControl(480, 382);

    this.makePauseAction(400, 447, "REANUDAR", 0x36b5e8, () => {
      this.scene.resume("battle");
      this.scene.stop();
    }, 150);

    this.makePauseAction(560, 447, "ABANDONAR", 0xef665f, () => {
      const button = this.children.getByName("pause-action-ABANDONAR");
      if (button) button.disableInteractive();
      window.setTimeout(() => window.location.reload(), 80);
    }, 150);

    this.input.keyboard.once("keydown-ESC", () => {
      this.scene.resume("battle");
      this.scene.stop();
    });
    const textResolution = Math.max(2, Math.ceil(RENDER_RESOLUTION));
    this.children.list.forEach((child) => {
      if (child instanceof Phaser.GameObjects.Text && typeof child.setResolution === "function") child.setResolution(textResolution);
    });
  }

  makePauseToggle(x, y, label, inputId) {
    const input = document.getElementById(inputId);
    const bg = this.add.rectangle(x, y, 330, 31, 0x101c2b, 1)
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

    const value = this.add.text(x, y, `${input.value}%`, {
      fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "12px", color: "#82d3f7", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(103);

    const adjust = (delta) => {
      input.value = String(Phaser.Math.Clamp(Number(input.value) + delta, 0, 100));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      value.setText(`${input.value}%`);
    };

    this.makePauseAction(x - 72, y, "−", 0x6f8fb7, () => adjust(-10), 42, false);
    this.makePauseAction(x + 72, y, "+", 0x6f8fb7, () => adjust(10), 42, false);
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

const metaRoot = document.getElementById("meta");
const gameRoot = document.getElementById("game");

function bindGlobalOptions() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const checkboxPreferences = [
    ["manual-seals", "seal-input-mode", "manual", "automatic", "manual"],
    ["camera-effects", "camera-effects", "on", "off", reduceMotion ? "off" : "on"],
    ["flash-effects", "flash-effects", "on", "off", reduceMotion ? "off" : "on"],
    ["music-enabled", "music-enabled", "on", "off", "on"],
    ["light-mode", "light-mode", "on", "off", "off"]
  ];
  checkboxPreferences.forEach(([id, key, onValue, offValue, defaultValue]) => {
    const input = document.getElementById(id);
    try { input.checked = (window.localStorage.getItem(key) || defaultValue) === onValue; } catch (_) { /* Preferencias opcionales. */ }
    input.addEventListener("change", () => {
      try { window.localStorage.setItem(key, input.checked ? onValue : offValue); } catch (_) { /* Preferencias opcionales. */ }
      if (id === "manual-seals") document.getElementById("mode-hint").textContent = input.checked ? "Completa las secuencias con QWER / ASDF / ZXCV." : "Los sellos se ejecutarán automáticamente.";
    });
  });
  const volume = document.getElementById("game-volume");
  try { volume.value = window.localStorage.getItem("game-volume") || "70"; } catch (_) { /* Preferencias opcionales. */ }
  volume.addEventListener("input", () => { try { window.localStorage.setItem("game-volume", volume.value); } catch (_) { /* Preferencias opcionales. */ } });
  document.getElementById("mode-hint").textContent = document.getElementById("manual-seals").checked ? "Completa las secuencias con QWER / ASDF / ZXCV." : "Los sellos se ejecutarán automáticamente.";
}

bindGlobalOptions();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // La caché persistente es una mejora; el juego sigue funcionando sin ella.
    });
  }, { once: true });
}

mountMetaUI(metaRoot, activeSave, async (save, mission) => {
  activeSave = writeSave(save);
  activeMission = mission;
  document.querySelector(".game-settings")?.removeAttribute("open");
  metaRoot.hidden = true;
  gameRoot.hidden = false;
  gameRoot.setAttribute("aria-busy", "true");
  if (game) game.destroy(true);
  await Promise.all([
    document.fonts.load('700 16px "Cinzel"'),
    document.fonts.load('700 16px "Alegreya Sans"')
  ]);
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: RENDER_WIDTH,
    height: RENDER_HEIGHT,
    backgroundColor: "#101622",
    scene: [MissionTravelScene, BattleScene, PauseScene],
    render: { antialias: true, pixelArt: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
  });
  gameRoot.removeAttribute("aria-busy");
});
