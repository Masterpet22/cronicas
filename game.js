import { SEALS, BASE_ACTIONS, JUTSU_LIBRARY, ENEMY_ACTIONS, ENEMY_ROSTER } from "./src/data.js?v=0.20.0";
import { applyStatus, affinityLabel, affinityMultiplier, hasStatus, hitChance } from "./src/rules.js?v=0.20.0";
import { createPlayerFighter, destroyFighter, playPlayerDamageReaction, preparePlayerPunch, queuePlayerFighterTextures, recoverPlayerPunch, releasePlayerPunch, startPlayerGuard, startPlayerRunning, stopPlayerGuard, stopPlayerRunning } from "./src/fighters.js?v=0.43.3";
import { playerFighterAppearance } from "./src/character.js?v=0.20.0";
import { actionLines, createActionButton, createBar } from "./src/ui.js?v=0.43.0";
import { mountMetaUI } from "./src/meta-ui.js?v=0.23.0";
import { awardEncounter, completeMission, derivedStats, loadSave, writeSave } from "./src/save.js?v=0.20.0";
import { canAccessElement, elementIcon } from "./src/elements.js?v=0.20.0";
import { createUiIcon, loadUiIcons } from "./src/icons.js?v=0.43.0";

const Phaser = window.Phaser;

const WIDTH = 960;
const HEIGHT = 540;
const RENDER_RESOLUTION = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
const TEXT_TEXTURE_RESOLUTION = Math.min(4, Math.max(3, Math.ceil(RENDER_RESOLUTION * 1.5)));
const RENDER_WIDTH = WIDTH * RENDER_RESOLUTION;
const RENDER_HEIGHT = HEIGHT * RENDER_RESOLUTION;

function drawCubicBezier(graphics, start, controlA, controlB, end, segments = 32) {
  graphics.moveTo(start.x, start.y);
  for (let index = 1; index <= segments; index += 1) {
    const t = index / segments;
    const inverse = 1 - t;
    const x = (inverse ** 3 * start.x)
      + (3 * inverse ** 2 * t * controlA.x)
      + (3 * inverse * t ** 2 * controlB.x)
      + (t ** 3 * end.x);
    const y = (inverse ** 3 * start.y)
      + (3 * inverse ** 2 * t * controlA.y)
      + (3 * inverse * t ** 2 * controlB.y)
      + (t ** 3 * end.y);
    graphics.lineTo(x, y);
  }
}
const TIMELINE_START = 310;
const TIMELINE_END = 914;
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
    loadUiIcons(this);
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
    this.createHud();
    this.createFighters();
    this.createActionPanel();
    this.createTurnTimeline();
    this.createPauseButton();
    this.startMusic();
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

    // Solo se oscurece el borde inferior para integrar la barra de velocidad
    // sin cubrir el campo de batalla.
    g.fillGradientStyle(0x061321, 0x061321, 0x020812, 0x020812, 0, 0, 0.24, 0.38);
    g.fillRect(0, 450, WIDTH, 90);

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
    const panelHeight = 88;
    const playerX = 22;
    const enemyX = 584;
    const barXOffset = 78;
    const barWidth = panelWidth - barXOffset - 16;
    const barHeight = 18;

    const drawPanel = (x, y, width, height, accent, fill) => {
      const panel = this.add.graphics().setDepth(18);
      panel.fillStyle(fill, 0.94);
      panel.fillRoundedRect(x, y, width, height, 12);
      panel.lineStyle(2, accent, 0.95);
      panel.strokeRoundedRect(x, y, width, height, 12);
      panel.lineStyle(1, accent, 0.24);
      panel.strokeRoundedRect(x + 5, y + 5, width - 10, height - 10, 9);
      panel.lineStyle(3, accent, 0.9);
      panel.lineBetween(x + 12, y + 3, x + 58, y + 3);
      panel.lineBetween(x + width - 58, y + height - 3, x + width - 12, y + height - 3);
      panel.fillStyle(accent, 0.9);
      panel.fillTriangle(x, y + 18, x + 13, y + 5, x + 13, y + 31);
      panel.fillTriangle(x + width, y + height - 18, x + width - 13, y + height - 5, x + width - 13, y + height - 31);
      return panel;
    };

    this.playerHudPanel = drawPanel(playerX, 12, panelWidth, panelHeight, 0x16bff7, 0x020a14);
    this.enemyHudPanel = drawPanel(enemyX, 12, panelWidth, panelHeight, 0xff4056, 0x16060b);

    this.playerName = this.add.text(
      playerX + 70,
      20,
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
      20,
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

    const statStyle = { fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "10px", color: "#91b2c8", fontStyle: "bold" };
    createUiIcon(this, "health", playerX + 22, 57, { size: 12, tint: 0x52f3a2, depth: 24 });
    createUiIcon(this, "chakra", playerX + 22, 80, { size: 13, tint: 0x56cfff, depth: 24 });
    createUiIcon(this, "health", enemyX + 22, 64, { size: 12, tint: 0xff6571, depth: 24 });
    this.add.text(playerX + 32, 57, "VIDA", { ...statStyle, color: "#52f3a2" }).setOrigin(0, 0.5).setDepth(24);
    this.add.text(playerX + 32, 80, "CHAKRA", { ...statStyle, color: "#56cfff" }).setOrigin(0, 0.5).setDepth(24);
    this.add.text(enemyX + 32, 64, "VIDA", { ...statStyle, color: "#ff6571" }).setOrigin(0, 0.5).setDepth(24);

    this.playerHpBar = createBar(this, playerX + barXOffset, 57, barWidth, barHeight, 0x38df87);
    this.chakraBar = createBar(this, playerX + barXOffset, 80, barWidth, barHeight, 0x2eaff4);
    this.enemyHpBar = createBar(this, enemyX + barXOffset, 64, barWidth - 8, barHeight, 0xef4755);

    [this.playerHpBar, this.chakraBar, this.enemyHpBar].forEach((bar) => {
      bar.bg.setDepth(21);
      if (bar.slot) bar.slot.setDepth(21);
      bar.fill.setDepth(22);
      if (bar.sheen) bar.sheen.setDepth(23);
      bar.valueText.setDepth(24);
    });

    this.refreshHud();
    this.sealLayer = this.add.container(WIDTH / 2, 120).setDepth(30);
  }

  createTurnTimeline() {
    this.timelineLayer = this.add.container(0, 0).setDepth(30);
    const trackY = 505;
    const chrome = this.add.graphics();
    chrome.fillStyle(0x020914, 0.92);
    chrome.fillRoundedRect(184, 487, 752, 36, 12);
    chrome.lineStyle(1.5, 0x4abce9, 0.72);
    chrome.strokeRoundedRect(184, 487, 752, 36, 12);
    chrome.lineStyle(2, 0x8bdcff, 0.46);
    chrome.lineBetween(TIMELINE_START, trackY, TIMELINE_END, trackY);
    chrome.lineStyle(1, 0xa9c8d9, 0.38);
    [TIMELINE_START, 425, 540, 655, 770, TIMELINE_END].forEach((x) => chrome.lineBetween(x, trackY - 3, x, trackY + 3));
    const speedIcon = createUiIcon(this, "speed", 204, trackY, { size: 18, tint: 0x38caff, depth: 31 });

    const title = this.add.text(221, trackY, "VELOCIDAD", {
      fontFamily: '"Cinzel", Georgia, serif',
      fontSize: "10px",
      color: "#f2f7fb",
      fontStyle: "bold"
    }).setOrigin(0, 0.5);
    const chevrons = this.add.graphics();
    chevrons.lineStyle(2, 0x29c9ff, 0.62);
    [375, 475, 575, 675, 775, 875].forEach((x) => {
      [0, 7].forEach((offset) => {
        chevrons.beginPath();
        chevrons.moveTo(x + offset - 4, trackY - 4);
        chevrons.lineTo(x + offset, trackY);
        chevrons.lineTo(x + offset - 4, trackY + 4);
        chevrons.strokePath();
      });
    });

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
      chrome, speedIcon, title, chevrons,
      this.playerTurnMarker, this.enemyTurnMarker,
      this.playerTurnLetter, this.enemyTurnLetter
    ]);
  }

  createPauseButton() {
    const bg = this.add.circle(480, 24, 14, 0x020914, 0.72)
      .setStrokeStyle(1, 0x53cfff, 0.34)
      .setDepth(25)
      .setInteractive({ useHandCursor: true });
    const label = createUiIcon(this, "pause", 480, 24, { size: 13, tint: 0x9fdfff, depth: 26 });

    bg.on("pointerover", () => {
      bg.setFillStyle(0x2b9bd0, 0.34);
    });
    bg.on("pointerout", () => {
      bg.setFillStyle(0x020914, 0.72);
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
    const enemyTarget = Phaser.Math.Clamp(TIMELINE_START + 330 + (this.enemy.speed - this.player.speed) * 6, TIMELINE_START + 250, TIMELINE_END - 80);
    this.tweens.add({ targets: [this.enemyTurnMarker, this.enemyTurnLetter], x: enemyTarget, duration: 950, ease: "Sine.out" });
    this.tweens.add({
      targets: [this.playerTurnMarker, this.playerTurnLetter], x: TIMELINE_END, duration: 1050, ease: "Sine.inOut",
      onComplete: () => {
        if (this.finished) return;
        this.turnReady = true;
        this.busy = false;
        this.setButtonsEnabled(true);
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
    const fighterY = 372;
    this.hero = createPlayerFighter(this, 220, fighterY, this.playerAppearance());
    this.foe = createPlayerFighter(this, 740, fighterY, this.playerAppearance(), true);
  }

  createActionPanel() {
    this.buttons = [];
    const rail = this.add.graphics().setDepth(28);
    rail.lineStyle(3, 0x24c8ff, 0.82);
    rail.beginPath();
    drawCubicBezier(rail, { x: -8, y: 112 }, { x: 108, y: 166 }, { x: 108, y: 478 }, { x: -8, y: 532 });
    rail.strokePath();
    rail.lineStyle(1, 0x9cecff, 0.3);
    rail.beginPath();
    drawCubicBezier(rail, { x: -5, y: 122 }, { x: 92, y: 172 }, { x: 92, y: 472 }, { x: -5, y: 522 });
    rail.strokePath();

    const hideTooltip = (entry) => {
      if (entry.tooltipTimer) {
        entry.tooltipTimer.remove(false);
        entry.tooltipTimer = null;
      }
      entry.tooltip.layer.setVisible(false);
      entry.hoverRing.setVisible(false);
    };

    for (let index = 0; index < 6; index += 1) {
      const jutsu = this.actions[index] || null;
      const button = createActionButton(this, jutsu, index);
      if (!jutsu) continue;
      const { hit } = button;
      hit.on("pointerover", () => {
        this.buttons.forEach(hideTooltip);
        button.tooltip.layer.setVisible(true);
        button.hoverRing.setVisible(true);
        button.tooltipTimer = this.time.delayedCall(3200, () => {
          button.tooltip.layer.setVisible(false);
          button.hoverRing.setVisible(false);
          button.tooltipTimer = null;
        });
      });
      hit.on("pointerout", () => hideTooltip(button));
      hit.on("pointerdown", () => {
        if (button.available) this.useJutsu(jutsu);
      });
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
    this.foe = createPlayerFighter(this, 810, 372, this.playerAppearance(), true);
    this.foe.targets.forEach((target) => target.setAlpha(0));
    this.foe.shadow.setAlpha(0);
    this.tweens.add({ targets: this.foe.targets, x: "-=70", alpha: 1, duration: 520, ease: "Cubic.out" });
    this.tweens.add({ targets: this.foe.shadow, x: "-=70", alpha: 0.4, duration: 520, ease: "Cubic.out" });

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
    this.screenFlash(220, 130, 55, 180);
    this.tone(95, 0.35);
    this.refreshHud();
    await this.delay(900);
  }

  async playSeals(jutsu) {
    const manualCasting = this.manualSeals;
    const speedFactor = this.seenJutsus.has(jutsu.id) ? 0.55 : 1;
    this.sealPrompt = this.add.text(0, jutsu.cinematic ? 195 : 66, "", this.textStyle(12, "#eaf7ff", "800"))
      .setOrigin(0.5)
      .setPadding(14, 7)
      .setBackgroundColor("rgba(2, 8, 18, 0.9)");
    this.sealLayer.add(this.sealPrompt);
    let overlay;
    if (jutsu.cinematic) {
      overlay = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x020307, 0.92).setOrigin(0).setDepth(20).setAlpha(0);
      this.tweens.add({ targets: overlay, alpha: 1, duration: 180 });
      this.setSealPrompt(jutsu.name.toUpperCase());
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
        this.setSealPrompt(`PULSA ${current.seal.key} · ${current.seal.label.toUpperCase()}  (${i + 1}/${cards.length})`);
        const result = await this.waitForSealInput(current.seal.key, current.card, jutsu.color, inputWindow);
        mistakes += result.mistakes;
        current.plate.setStrokeStyle(3, result.timedOut ? 0xff665f : result.mistakes === 0 ? 0x66efad : 0xffc46b, 1);
      } else {
        this.setSealPrompt(`EJECUTANDO ${current.seal.label.toUpperCase()}  (${i + 1}/${cards.length})`);
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
    this.setSealPrompt(quality, qualityColor);
    await this.delay(320);
    this.tone(580, 0.11);
    this.tweens.add({ targets: this.sealLayer, scale: 1.08, duration: 90, yoyo: true });
    await this.delay(150);
    this.sealLayer.removeAll(true);
    this.sealPrompt = null;
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
        this.setSealPrompt("TIEMPO AGOTADO", "#ff786d");
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
        this.setSealPrompt(`SELLO INCORRECTO · PULSA ${expectedKey}`, "#ff9d8d");
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
    const originShadowX = this.hero.shadow.x;
    const usesPuppetPunch = jutsu.id === "strike" && this.hero.joints?.shoulderRight;
    if (usesPuppetPunch) {
      await preparePlayerPunch(this, this.hero);
      const strikeX = this.foe.body.x - 105;
      await Promise.all([
        this.tween({ targets: this.hero.body, x: strikeX, duration: 250, ease: "Cubic.out" }),
        this.tween({ targets: this.hero.shadow, x: strikeX, duration: 250, ease: "Cubic.out" })
      ]);
      await releasePlayerPunch(this, this.hero);
    } else {
      this.tweens.add({ targets: this.hero.targets, x: "+=62", duration: 120, yoyo: true, hold: 50, ease: "Quad.out" });
      await this.delay(125);
    }

    if (!this.rollHit(chance)) {
      this.tone(205, 0.08);
      this.floatLabel(this.foe.body.x, this.foe.body.y - 118, "FALLO", 0xd7dce5);
      this.setMessage(`${jutsu.name} falló (${chance} % de precisión).`, "#d7dce5");
      if (usesPuppetPunch) {
        await Promise.all([
          recoverPlayerPunch(this, this.hero),
          this.tween({ targets: this.hero.body, x: originX, duration: 260, ease: "Cubic.inOut" }),
          this.tween({ targets: this.hero.shadow, x: originShadowX, duration: 260, ease: "Cubic.inOut" })
        ]);
      }
      await this.delay(usesPuppetPunch ? 150 : 430);
      this.hero.body.x = originX;
      this.hero.shadow.x = originShadowX;
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
    if (usesPuppetPunch) {
      await Promise.all([
        recoverPlayerPunch(this, this.hero),
        this.tween({ targets: this.hero.body, x: originX, duration: 260, ease: "Cubic.inOut" }),
        this.tween({ targets: this.hero.shadow, x: originShadowX, duration: 260, ease: "Cubic.inOut" })
      ]);
    }
    await this.delay(usesPuppetPunch ? 150 : 430);
    this.hero.body.x = originX;
    this.hero.shadow.x = originShadowX;
  }

  async playerGuard() {
    this.player.guarding = true;
    startPlayerGuard(this, this.hero);
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
    const originX = this.foe.body.x;
    const originShadowX = this.foe.shadow.x;
    const usesPuppetPunch = Boolean(this.foe.joints?.shoulderRight);
    this.setMessage(`El rival usa ${action.name}${this.player.guarding ? " contra tu guardia" : ""}...`);
    if (usesPuppetPunch) {
      await preparePlayerPunch(this, this.foe);
      const strikeX = this.hero.body.x + 105;
      await Promise.all([
        this.tween({ targets: this.foe.body, x: strikeX, duration: 250, ease: "Cubic.out" }),
        this.tween({ targets: this.foe.shadow, x: strikeX, duration: 250, ease: "Cubic.out" })
      ]);
      await releasePlayerPunch(this, this.foe);
    } else {
      this.tweens.add({ targets: this.foe.targets, x: "-=55", duration: 150, yoyo: true, hold: 40, ease: "Quad.out" });
      await this.delay(170);
    }

    if (!this.rollHit(chance)) {
      this.tone(205, 0.08);
      this.floatLabel(this.hero.body.x, this.hero.body.y - 118, "ESQUIVA", 0x67e8c3);
      this.setMessage(`Esquivaste ${action.name} (${chance} % de precisión enemiga).`, "#79e8b5");
      if (usesPuppetPunch) {
        await Promise.all([
          recoverPlayerPunch(this, this.foe),
          this.tween({ targets: this.foe.body, x: originX, duration: 260, ease: "Cubic.inOut" }),
          this.tween({ targets: this.foe.shadow, x: originShadowX, duration: 260, ease: "Cubic.inOut" })
        ]);
      }
      await this.delay(520);
      this.foe.body.x = originX;
      this.foe.shadow.x = originShadowX;
      return;
    }

    this.createImpact(this.hero.body.x, this.hero.body.y - 10, action.color, 0.8);
    const reaction = playPlayerDamageReaction(this, this.hero, {
      guarded: this.player.guarding,
      heavy: damage >= Math.max(10, Math.ceil(this.player.maxHp * 0.16))
    });
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
    await reaction;
    if (usesPuppetPunch) {
      await Promise.all([
        recoverPlayerPunch(this, this.foe),
        this.tween({ targets: this.foe.body, x: originX, duration: 260, ease: "Cubic.inOut" }),
        this.tween({ targets: this.foe.shadow, x: originShadowX, duration: 260, ease: "Cubic.inOut" })
      ]);
      this.foe.body.x = originX;
      this.foe.shadow.x = originShadowX;
    }
    await this.delay(220);
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
    stopPlayerGuard(this, this.hero);
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
    this.buttons.forEach((button) => {
      const { jutsu } = button;
      const affordable = this.player.chakra >= this.actionCost(jutsu);
      const cooldown = this.cooldowns[jutsu.id] || 0;
      const available = enabled && this.turnReady && affordable && cooldown === 0;
      button.available = available;
      const visualAlpha = available ? 1 : affordable && cooldown === 0 ? 0.76 : 0.42;
      button.visualParts.forEach((part) => part.setAlpha(visualAlpha));

      const [baseCost, damage, timing] = actionLines(jutsu);
      const cost = this.actionCost(jutsu) > 0 ? `${this.actionCost(jutsu)} chakra` : baseCost;
      const liveTiming = cooldown > 0 ? `Recarga: ${cooldown}` : timing;
      const liveStats = jutsu.type === "guard"
        ? [baseCost, damage, timing]
        : [cost, damage, liveTiming];
      button.tooltip.statText.setText(liveStats.join("\n"));
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

    if (this.buttons) this.setButtonsEnabled(!this.busy && !this.finished && this.turnReady);
  }

  setMessage(text, color = "#edf7fd") {
    this.lastBattleMessage = { text, color };
  }

  setSealPrompt(text, color = "#eaf7ff") {
    if (!this.sealPrompt) return;
    this.sealPrompt.setText(text);
    this.sealPrompt.setColor(color);
  }

  actionCost(action) {
    return Math.max(0, action.cost - this.player.costReduction);
  }

  playerAppearance() {
    return playerFighterAppearance(this.saveData);
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
      resolution: TEXT_TEXTURE_RESOLUTION
    };
  }

  sharpenSceneText() {
    const resolution = TEXT_TEXTURE_RESOLUTION;
    this.children.list.forEach((child) => {
      if (child instanceof Phaser.GameObjects.Text && typeof child.setResolution === "function") child.setResolution(resolution);
    });
  }

  tween(config) { return new Promise((resolve) => this.tweens.add({ ...config, onComplete: resolve })); }

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
    const textResolution = TEXT_TEXTURE_RESOLUTION;
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
    render: { antialias: true, antialiasGL: true, pixelArt: false, roundPixels: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
  });
  gameRoot.removeAttribute("aria-busy");
});
