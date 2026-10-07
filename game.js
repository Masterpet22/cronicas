import { SEALS, BASE_ACTIONS, JUTSU_LIBRARY, ENEMY_ACTIONS, ENEMY_ROSTER } from "./src/data.js?v=0.15.1";
import { applyStatus, affinityLabel, affinityMultiplier, formatStatuses, hasStatus, hitChance } from "./src/rules.js?v=0.15.1";
import { createGeometricFighter, destroyFighter, fighterTextureKey, queueFighterTexture } from "./src/fighters.js?v=0.9.0";
import { playerFighterAppearance } from "./src/character.js?v=0.9.0";
import { createActionButton, createBar } from "./src/ui.js?v=0.15.1";
import { mountMetaUI } from "./src/meta-ui.js?v=0.15.1";
import { awardEncounter, completeMission, derivedStats, loadSave, writeSave } from "./src/save.js?v=0.15.1";
import { canAccessElement, elementIcon, elementName as localizedElementName } from "./src/elements.js?v=0.15.1";

const Phaser = window.Phaser;

const WIDTH = 960;
const HEIGHT = 540;
const TIMELINE_START = 288;
const TIMELINE_END = 668;
let activeSave = loadSave();
let activeMission = null;
let game = null;

class BattleScene extends Phaser.Scene {
  constructor() { super("battle"); }

  preload() {
    this.load.image("sealSheet", "assets/sellos-originales.webp?v=0.12.0");
    // Texturas de combatientes generadas con el mismo SVG del Dojo.
    this.saveData = activeSave;
    this.mission = activeMission;
    this.saveData.loadout.map((id) => JUTSU_LIBRARY.find((jutsu) => jutsu.id === id)?.element).filter(Boolean).forEach((element) => {
      const key = `element-${element}`;
      if (!this.textures.exists(key)) this.load.image(key, elementIcon(element));
    });
    queueFighterTexture(this, this.playerAppearance());
    this.mission.encounters.forEach((id, index) => {
      const profile = ENEMY_ROSTER[id];
      queueFighterTexture(this, this.enemyAppearance(profile, index));
      if (profile.boss) queueFighterTexture(this, this.bossPhaseAppearance(profile, index));
    });
  }

  create() {
    this.saveData = activeSave;
    this.mission = activeMission;
    this.encounters = this.mission.encounters.map((id) => ENEMY_ROSTER[id]);
    const stats = derivedStats(this.saveData);
    this.player = { ...stats, hp: stats.maxHp, chakra: stats.maxChakra, statuses: [], guarding: false };
    const selectedJutsus = this.saveData.loadout.map((id) => JUTSU_LIBRARY.find((jutsu) => jutsu.id === id)).filter(Boolean)
      .map((jutsu) => ({ ...jutsu, elementTexture: `element-${jutsu.element}` }));
    this.actions = [BASE_ACTIONS[0], ...selectedJutsus, BASE_ACTIONS[1]];
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
    this.setMessage(`${this.mission.title} · Los combatientes toman posición.`);
    this.startTurnCharge();
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
    const g = this.add.graphics();
    const theme = (this.mission.number - 1) % 3;
    if (theme === 0) this.drawDuskPass(g);
    else if (theme === 1) this.drawMistMarsh(g);
    else this.drawMoonShrine(g);
    g.fillGradientStyle(0x07101d, 0x07101d, 0x03060b, 0x03060b, 1);
    g.fillRect(0, 350, WIDTH, 190);
    g.lineStyle(2, theme === 1 ? 0x59d6b0 : theme === 2 ? 0x9f8cff : 0xff9e52, 0.45);
    g.lineBetween(0, 350, WIDTH, 350);
    this.arenaLabel = ["PASO DEL CREPÚSCULO", "MARISMA DE LOS JUNCOS", "SANTUARIO DE LA LUNA"][theme];
    this.add.text(480, 339, this.arenaLabel, this.textStyle(9, "#adc1d9", "700")).setOrigin(0.5, 1).setAlpha(0.75);
  }

  drawDuskPass(g) {
    g.fillGradientStyle(0x071526, 0x071526, 0x6b3028, 0x6b3028, 1); g.fillRect(0, 0, WIDTH, 350);
    g.fillStyle(0xf4a358, 0.2); g.fillCircle(785, 133, 78);
    g.fillStyle(0x0b101b, 0.76); g.fillTriangle(-80, 350, 170, 145, 410, 350); g.fillTriangle(250, 350, 520, 105, 755, 350); g.fillTriangle(620, 350, 850, 155, 1040, 350);
    g.fillStyle(0x301923, 0.72); g.fillRect(0, 325, WIDTH, 25);
    for (let x = 20; x < WIDTH; x += 72) { g.fillStyle(0xffbd73, 0.18); g.fillCircle(x, 305 + (x % 3) * 5, 2); }
  }

  drawMistMarsh(g) {
    g.fillGradientStyle(0x071a22, 0x071a22, 0x17483f, 0x17483f, 1); g.fillRect(0, 0, WIDTH, 350);
    g.fillStyle(0xbde9dd, 0.11); g.fillCircle(745, 105, 68);
    for (let x = 20; x < WIDTH; x += 54) {
      const h = 105 + (x % 5) * 18; g.fillStyle(0x071713, 0.76); g.fillRect(x, 350 - h, 9, h); g.fillTriangle(x - 16, 350 - h + 30, x + 5, 350 - h - 35, x + 22, 350 - h + 34);
    }
    g.fillStyle(0xbceee5, 0.06); g.fillEllipse(260, 260, 470, 62); g.fillEllipse(710, 220, 520, 72); g.fillStyle(0x071414, 0.82); g.fillRect(0, 326, WIDTH, 24);
  }

  drawMoonShrine(g) {
    g.fillGradientStyle(0x09091d, 0x09091d, 0x2b1740, 0x2b1740, 1); g.fillRect(0, 0, WIDTH, 350);
    g.fillStyle(0xd7d5ff, 0.2); g.fillCircle(478, 113, 82); g.fillStyle(0x09091d, 0.92); g.fillCircle(510, 94, 75);
    g.fillStyle(0x080711, 0.82); g.fillRect(0, 320, WIDTH, 30);
    g.fillRect(410, 178, 140, 16); g.fillRect(427, 194, 14, 128); g.fillRect(519, 194, 14, 128); g.fillTriangle(388, 178, 480, 132, 572, 178);
    for (let x = 80; x < WIDTH; x += 155) { g.fillStyle(0xaa8cff, 0.12); g.fillCircle(x, 250 - (x % 2) * 38, 3); }
  }

  createHud() {
    const panel = this.add.graphics();
    const panelWidth = 340;
    const panelHeight = 98;
    const playerX = 18;
    const enemyX = WIDTH - 18 - panelWidth;
    const barWidth = 280;
    const barHeight = 20;

    panel.fillStyle(0x06101c, 0.9);
    panel.fillRoundedRect(playerX, 14, panelWidth, panelHeight, 10);
    panel.fillRoundedRect(enemyX, 14, panelWidth, panelHeight, 10);
    panel.lineStyle(2, 0x168ed6, 0.78);
    panel.strokeRoundedRect(playerX, 14, panelWidth, panelHeight, 10);
    panel.lineStyle(2, 0xf04455, 0.82);
    panel.strokeRoundedRect(enemyX, 14, panelWidth, panelHeight, 10);

    this.playerName = this.add.text(
      playerX + 16,
      23,
      `${this.saveData.character.name.toUpperCase()} · NV ${this.saveData.progression.level}`,
      this.textStyle(14, "#f8f2e7", "700")
    );
    this.playerRank = this.add.text(
      playerX + panelWidth - 16,
      25,
      this.saveData.campaign.rank.toUpperCase(),
      this.textStyle(9, "#8fc7ff", "700")
    ).setOrigin(1, 0);

    this.enemyName = this.add.text(
      enemyX + panelWidth - 16,
      23,
      this.encounters[this.enemyIndex].name.toUpperCase(),
      this.textStyle(14, "#f8f2e7", "700")
    ).setOrigin(1, 0);

    this.playerHpBar = createBar(this, playerX + 16, 53, barWidth, barHeight, 0x54d69a);
    this.chakraBar = createBar(this, playerX + 16, 79, barWidth, barHeight, 0x58a7ff);
    this.enemyHpBar = createBar(this, enemyX + panelWidth - 16 - barWidth, 53, barWidth, barHeight, 0xef665f);

    this.playerStatusText = this.add.text(playerX + 16, 96, "", this.textStyle(9, "#f5c96b", "700"));
    this.enemyStatusText = this.add.text(enemyX + panelWidth - 16, 78, "", this.textStyle(9, "#f5c96b", "700")).setOrigin(1, 0);

    if (this.saveData.campaign.companion) {
      this.companionText = this.add.text(playerX + 16, 116, "MIKA · APOYO EN 2 RONDAS", this.textStyle(10, "#67e8c3", "700"));
    }

    this.refreshHud();
    this.sealLayer = this.add.container(WIDTH / 2, 120).setDepth(30);
  }

  createTurnTimeline() {
    this.timelineLayer = this.add.container(0, 0).setDepth(12);
    const centerY = 384;
    const trackY = 387;
    const plate = this.add.rectangle(478, centerY, 920, 36, 0x06101c, 0.94).setStrokeStyle(1, 0x54769e, 0.85);
    const title = this.add.text(478, centerY - 13, "ORDEN DE ACCIÓN", this.textStyle(9, "#9fb9d8", "700")).setOrigin(0.5);
    const track = this.add.rectangle(478, trackY, TIMELINE_END - TIMELINE_START, 5, 0x26364b, 1);
    const finish = this.add.rectangle(TIMELINE_END, trackY, 4, 25, 0xf5c96b, 1);
    this.playerTurnMarker = this.add.circle(TIMELINE_START, trackY - 6, 11, 0x31baff, 1).setStrokeStyle(2, 0xd9f5ff);
    this.enemyTurnMarker = this.add.circle(TIMELINE_START, trackY + 6, 11, 0xee4053, 1).setStrokeStyle(2, 0xffd8dc);
    this.playerTurnLetter = this.add.text(TIMELINE_START, trackY - 6, "TÚ", this.textStyle(7, "#07111c", "800")).setOrigin(0.5);
    this.enemyTurnLetter = this.add.text(TIMELINE_START, trackY + 6, "R", this.textStyle(8, "#16070b", "800")).setOrigin(0.5);
    this.timelineLayer.add([plate, title, track, finish, this.playerTurnMarker, this.enemyTurnMarker, this.playerTurnLetter, this.enemyTurnLetter]);
  }

  createPauseButton() {
    const bg = this.add.rectangle(480, 72, 96, 30, 0x091421, 0.96)
      .setStrokeStyle(1, 0xf5c96b, 0.85)
      .setDepth(25)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(480, 72, "Ⅱ  PAUSA", this.textStyle(9, "#f7d99b", "700")).setOrigin(0.5).setDepth(26);
    bg.on("pointerover", () => bg.setFillStyle(0x24334a));
    bg.on("pointerout", () => bg.setFillStyle(0x091421));
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
    const enemyTarget = Phaser.Math.Clamp(TIMELINE_START + 205 + (this.enemy.speed - this.player.speed) * 8, TIMELINE_START + 125, TIMELINE_END - 24);
    this.tweens.add({ targets: [this.enemyTurnMarker, this.enemyTurnLetter], x: enemyTarget, duration: 950, ease: "Sine.out" });
    this.tweens.add({
      targets: [this.playerTurnMarker, this.playerTurnLetter], x: TIMELINE_END, duration: 1050, ease: "Sine.inOut",
      onComplete: () => {
        if (this.finished) return;
        this.turnReady = true;
        this.busy = false;
        this.setButtonsEnabled(true);
        this.setMessage(`Ronda ${this.round} · ¡Tu turno! Selecciona una acción.`, "#f7d99b");
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
    this.hero = createGeometricFighter(this, 220, 248, this.playerAppearance(), false);
    this.foe = createGeometricFighter(this, 740, 248, this.enemyAppearance(profile), true);
    this.tweens.add({ targets: this.hero.targets, y: "-=4", duration: 920, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.tweens.add({ targets: this.foe.targets, y: "-=3", duration: 1100, yoyo: true, repeat: -1, ease: "Sine.inOut", delay: 180 });
  }

  createActionPanel() {
    this.buttons = [];

    this.actions.forEach((jutsu, index) => {
      const button = createActionButton(this, jutsu, index, this.textStyle.bind(this));
      const { bg, hit } = button;
      hit.on("pointerover", () => { if (!this.busy && !this.finished) bg.setFillStyle(0x24334a); });
      hit.on("pointerout", () => bg.setFillStyle(0x182231));
      hit.on("pointerdown", () => this.useJutsu(jutsu));
      this.buttons.push(button);
    });
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

    if (this.enemy.hp > 0 && this.saveData.campaign.companion && this.round % 2 === 0) await this.companionAttack();

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
    this.setMessage(`${defeatedName} derrotado · +${this.lastReward.xp} PX · +${this.lastReward.coins} monedas${levelNote}`, "#79e8b5");
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
    this.tweens.add({ targets: this.hero.targets, x: "+=62", duration: 120, yoyo: true, hold: 50, ease: "Quad.out" });
    await this.delay(125);

    if (!this.rollHit(chance)) {
      this.tone(205, 0.08);
      this.floatLabel(this.foe.body.x, this.foe.body.y - 118, "FALLO", 0xd7dce5);
      this.setMessage(`${jutsu.name} falló (${chance} % de precisión).`, "#d7dce5");
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
    const rewardText = won && this.missionReward?.firstClear ? ` +${this.missionReward.xp} PX y +${this.missionReward.coins} monedas de misión.` : "";
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
    const reset = this.add.text(WIDTH / 2, 392, "VOLVER A LA ALDEA", this.textStyle(16, "#0b1018", "800"))
      .setOrigin(0.5).setPadding(20, 10).setBackgroundColor("#f5a357").setDepth(50).setInteractive({ useHandCursor: true });
    reset.once("pointerup", () => {
      reset.disableInteractive().setText("REGRESANDO...");
      // Una recarga limpia evita conservar entradas, tweens y texturas de la
      // batalla anterior. scene.restart() puede destruir la escena mientras
      // Phaser todavía procesa el puntero y dejar el juego bloqueado.
      window.setTimeout(() => window.location.reload(), 80);
    });
  }

  setButtonsEnabled(enabled) {
    this.buttons.forEach(({ hit, bg, sub, jutsu }) => {
      const affordable = this.player.chakra >= this.actionCost(jutsu);
      const cooldown = this.cooldowns[jutsu.id] || 0;
      const available = enabled && this.turnReady && affordable && cooldown === 0;
      if (available) hit.setInteractive({ useHandCursor: true }); else hit.disableInteractive();
      bg.setAlpha(available ? 1 : 0.43);
      const adjustedSubtitle = jutsu.cost > 0 ? jutsu.subtitle.replace(/^\d+CH/, `${this.actionCost(jutsu)}CH`) : jutsu.subtitle;
      sub.setText(cooldown > 0 ? `ENFRIAMIENTO · ${cooldown} RONDA${cooldown === 1 ? "" : "S"}` : adjustedSubtitle);
      sub.setColor(cooldown > 0 ? "#ffab83" : "#aeb9c8");
    });
  }

  refreshHud() {
    this.playerHpBar.fill.width = this.playerHpBar.width * Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1);
    this.chakraBar.fill.width = this.chakraBar.width * Phaser.Math.Clamp(this.player.chakra / this.player.maxChakra, 0, 1);
    this.enemyHpBar.fill.width = this.enemyHpBar.width * Phaser.Math.Clamp(this.enemy.hp / this.enemy.maxHp, 0, 1);

    this.playerHpBar.valueText.setText(`${this.player.hp}/${this.player.maxHp}`);
    this.chakraBar.valueText.setText(`${this.player.chakra}/${this.player.maxChakra}`);
    this.enemyHpBar.valueText.setText(`${this.enemy.hp}/${this.enemy.maxHp}`);

    this.playerStatusText.setText(formatStatuses(this.player));
    const affinityInfo = `DÉBIL ${this.elementName(this.enemy.weakness)} · RES ${this.elementName(this.enemy.resistance)}`;
    const enemyStatuses = formatStatuses(this.enemy);
    this.enemyStatusText.setText(enemyStatuses ? `${affinityInfo} · ${enemyStatuses}` : affinityInfo);
    if (this.companionText) this.companionText.setText(this.round % 2 === 0 ? "MIKA · APOYO LISTO" : "MIKA · APOYO EN 1 RONDA");
    if (this.buttons) this.setButtonsEnabled(!this.busy && !this.finished && this.turnReady);
  }

  setMessage(text, color = "#f7d6a5") {
    this.lastBattleMessage = { text, color };
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

  textStyle(size, color, weight = "500") {
    return { fontFamily: "Arial, sans-serif", fontSize: `${size}px`, color, fontStyle: weight === "700" || weight === "800" ? "bold" : "normal" };
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
    this.battle = this.scene.get("battle");
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x02050a, 0.84).setOrigin(0).setDepth(100);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, 560, 460, 0x091421, 0.985)
      .setStrokeStyle(2, 0xf5c96b, 0.9).setDepth(101);

    this.add.text(WIDTH / 2, 92, "MISIÓN EN PAUSA", {
      fontFamily: "Arial, sans-serif", fontSize: "26px", color: "#f8f2e7", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(102);
    this.add.text(WIDTH / 2, 124, "Ajusta la partida o vuelve al combate.", {
      fontFamily: "Arial, sans-serif", fontSize: "13px", color: "#9fb0c6"
    }).setOrigin(0.5).setDepth(102);

    this.add.text(320, 160, "AJUSTES", {
      fontFamily: "Arial, sans-serif", fontSize: "11px", color: "#f5c96b", fontStyle: "bold"
    }).setDepth(102);

    const rows = [
      ["Sellos manuales", "manual-seals"],
      ["Efectos de cámara", "camera-effects"],
      ["Destellos", "flash-effects"],
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
  }

  makePauseToggle(x, y, label, inputId) {
    const input = document.getElementById(inputId);
    const bg = this.add.rectangle(x, y, 330, 31, 0x101c2b, 1)
      .setStrokeStyle(1, 0x41546d, 0.95).setDepth(102).setInteractive({ useHandCursor: true });
    this.add.text(x - 150, y, label, {
      fontFamily: "Arial, sans-serif", fontSize: "12px", color: "#dce4ef", fontStyle: "bold"
    }).setOrigin(0, 0.5).setDepth(103);

    const value = this.add.text(x + 145, y, input.checked ? "ACTIVADO" : "DESACTIVADO", {
      fontFamily: "Arial, sans-serif", fontSize: "10px", color: input.checked ? "#79e8b5" : "#91a0b3", fontStyle: "bold"
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
      fontFamily: "Arial, sans-serif", fontSize: "12px", color: "#dce4ef", fontStyle: "bold"
    }).setOrigin(0, 0.5).setDepth(103);

    const value = this.add.text(x, y, `${input.value}%`, {
      fontFamily: "Arial, sans-serif", fontSize: "12px", color: "#f5c96b", fontStyle: "bold"
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
    this.add.text(x, y, label, { fontFamily: "Arial, sans-serif", fontSize: "12px", color: "#f8f2e7", fontStyle: "bold" })
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
  const checkboxPreferences = [
    ["manual-seals", "seal-input-mode", "manual", "automatic", "manual"],
    ["camera-effects", "camera-effects", "on", "off", "on"],
    ["flash-effects", "flash-effects", "on", "off", "on"],
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

mountMetaUI(metaRoot, activeSave, (save, mission) => {
  activeSave = writeSave(save);
  activeMission = mission;
  document.querySelector(".game-settings")?.removeAttribute("open");
  metaRoot.hidden = true;
  gameRoot.hidden = false;
  if (game) game.destroy(true);
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: "#101622",
    scene: [BattleScene, PauseScene],
    render: { antialias: true, pixelArt: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
  });
});
