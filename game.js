import { SEALS, BASE_ACTIONS, JUTSU_LIBRARY, ENEMY_ACTIONS, ENEMY_ROSTER } from "./src/data.js?v=0.9.0";
import { applyStatus, affinityLabel, affinityMultiplier, formatStatuses, hasStatus, hitChance } from "./src/rules.js?v=0.9.0";
import { createGeometricFighter, destroyFighter, fighterTextureKey, queueFighterTexture } from "./src/fighters.js?v=0.9.0";
import { playerFighterAppearance } from "./src/character.js?v=0.9.0";
import { createActionButton, createBar } from "./src/ui.js?v=0.9.0";
import { mountMetaUI } from "./src/meta-ui.js?v=0.9.0";
import { awardEncounter, completeMission, derivedStats, loadSave, writeSave } from "./src/save.js?v=0.9.0";

const Phaser = window.Phaser;

const WIDTH = 960;
const HEIGHT = 540;
let activeSave = loadSave();
let activeMission = null;
let game = null;

class BattleScene extends Phaser.Scene {
  constructor() { super("battle"); }

  preload() {
    this.load.image("sealSheet", "assets/sellos-originales.jpg?v=0.9.0");
    // Texturas de combatientes generadas con el mismo SVG del Dojo.
    this.saveData = activeSave;
    this.mission = activeMission;
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
    const selectedJutsus = this.saveData.loadout.map((id) => JUTSU_LIBRARY.find((jutsu) => jutsu.id === id)).filter(Boolean);
    this.actions = [BASE_ACTIONS[0], ...selectedJutsus, BASE_ACTIONS[1]];
    this.enemyIndex = 0;
    this.enemy = this.createEnemyState(this.encounters[this.enemyIndex]);
    this.cooldowns = Object.fromEntries(this.actions.map((action) => [action.id, 0]));
    this.round = 1;
    this.busy = false;
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
    this.startMusic();
    this.setMessage(`${this.mission.title} · Ronda 1: selecciona una acción.`);
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
    g.fillGradientStyle(0x1a2334, 0x1a2334, 0x47251e, 0x47251e, 1);
    g.fillRect(0, 0, WIDTH, 410);
    g.fillStyle(0x0d1420, 1);
    g.fillRect(0, 410, WIDTH, 130);

    g.fillStyle(0x0a0d13, 0.68);
    g.fillTriangle(0, 345, 180, 170, 390, 345);
    g.fillTriangle(230, 345, 485, 120, 690, 345);
    g.fillTriangle(560, 345, 790, 155, 960, 330);

    g.lineStyle(2, 0xff9e52, 0.26);
    g.lineBetween(0, 350, WIDTH, 350);
  }

  createHud() {
    this.playerName = this.add.text(38, 28, `${this.saveData.character.name.toUpperCase()}  ·  ${this.saveData.campaign.rank.toUpperCase()} · NV ${this.saveData.progression.level}`, this.textStyle(16, "#f8f2e7", "700"));
    this.enemyName = this.add.text(922, 28, this.encounters[this.enemyIndex].name, this.textStyle(17, "#f8f2e7", "700")).setOrigin(1, 0);
    this.playerHpBar = createBar(this, 38, 58, 250, 14, 0x54d69a);
    this.chakraBar = createBar(this, 38, 80, 190, 9, 0x58a7ff);
    this.enemyHpBar = createBar(this, 672, 58, 250, 14, 0xef665f);
    this.playerStat = this.add.text(298, 54, "", this.textStyle(13, "#cdd5e3")).setOrigin(0, 0);
    this.enemyStat = this.add.text(662, 54, "", this.textStyle(13, "#cdd5e3")).setOrigin(1, 0);
    this.playerStatusText = this.add.text(38, 98, "", this.textStyle(11, "#f5c96b", "700"));
    this.enemyStatusText = this.add.text(922, 98, "", this.textStyle(11, "#f5c96b", "700")).setOrigin(1, 0);
    if (this.saveData.campaign.companion) this.companionText = this.add.text(38, 117, "MIKA · APOYO EN 2 RONDAS", this.textStyle(10, "#67e8c3", "700"));
    this.refreshHud();

    this.sealLayer = this.add.container(WIDTH / 2, 120).setDepth(30);
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
    this.messageBg = this.add.rectangle(20, 368, 920, 32, 0x070b12, 0.92).setOrigin(0);
    this.messageText = this.add.text(36, 376, "", this.textStyle(14, "#f7d6a5", "600"));
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
    if (this.busy || this.finished) return;
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

    this.busy = false;
    this.setButtonsEnabled(true);
    this.setMessage(`Ronda ${this.round}: selecciona una acción.`);
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
    this.busy = false;
    this.setButtonsEnabled(true);
    this.setMessage(`Encuentro ${this.enemyIndex + 1}/${this.encounters.length}: ${profile.name}.`);
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
    const startX = -((jutsu.seals.length - 1) * spacing) / 2;
    const cards = [];

    for (let i = 0; i < jutsu.seals.length; i += 1) {
      const seal = SEALS[jutsu.seals[i]];
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
        this.setMessage(`Pulsa ${current.seal.key} · ${current.seal.label}  (${i + 1}/${cards.length})`);
        const result = await this.waitForSealInput(current.seal.key, current.card, jutsu.color);
        mistakes += result.mistakes;
        current.plate.setStrokeStyle(3, result.mistakes === 0 ? 0x66efad : 0xffc46b, 1);
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

  waitForSealInput(expectedKey, card, color) {
    return new Promise((resolve) => {
      let mistakes = 0;
      let done = false;

      const finish = () => {
        if (done) return;
        done = true;
        this.input.keyboard.off("keydown", onKey);
        card.disableInteractive();
        resolve({ mistakes });
      };

      const wrong = () => {
        mistakes += 1;
        this.tone(105, 0.06);
        this.shake(55, 0.002);
        this.tweens.add({ targets: card, x: card.x + 7, duration: 35, yoyo: true, repeat: 2 });
        this.setMessage(`Sello incorrecto. Pulsa ${expectedKey}.`, "#ff9d8d");
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
    const affinityBonus = jutsu.element === this.saveData.character.affinity ? 1.1 : 1;
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
    this.tweens.add({ targets: target.targets, angle: won ? 82 : -82, y: "+=38", alpha: 0.35, duration: 650, ease: "Cubic.in" });
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
      const available = enabled && affordable && cooldown === 0;
      if (available) hit.setInteractive({ useHandCursor: true }); else hit.disableInteractive();
      bg.setAlpha(available ? 1 : 0.43);
      const adjustedSubtitle = jutsu.cost > 0 ? jutsu.subtitle.replace(/^\d+CH/, `${this.actionCost(jutsu)}CH`) : jutsu.subtitle;
      sub.setText(cooldown > 0 ? `ENFRIAMIENTO · ${cooldown} RONDA${cooldown === 1 ? "" : "S"}` : adjustedSubtitle);
      sub.setColor(cooldown > 0 ? "#ffab83" : "#aeb9c8");
    });
  }

  refreshHud() {
    this.playerHpBar.fill.width = this.playerHpBar.width * (this.player.hp / this.player.maxHp);
    this.chakraBar.fill.width = this.chakraBar.width * (this.player.chakra / this.player.maxChakra);
    this.enemyHpBar.fill.width = this.enemyHpBar.width * (this.enemy.hp / this.enemy.maxHp);
    this.playerStat.setText(`${this.player.hp}/${this.player.maxHp} PV · VEL ${this.player.speed}\n${this.player.chakra}/${this.player.maxChakra} CH · EVA ${this.player.evasion}`);
    this.enemyStat.setText(`${this.enemy.hp} PV · VEL ${this.enemy.speed}\nEVA ${this.enemy.evasion}`);
    this.playerStatusText.setText(formatStatuses(this.player));
    const affinityInfo = `DÉBIL ${this.elementName(this.enemy.weakness)} · RES ${this.elementName(this.enemy.resistance)}`;
    const enemyStatuses = formatStatuses(this.enemy);
    this.enemyStatusText.setText(enemyStatuses ? `${affinityInfo} · ${enemyStatuses}` : affinityInfo);
    if (this.companionText) this.companionText.setText(this.round % 2 === 0 ? "MIKA · APOYO LISTO" : "MIKA · APOYO EN 1 RONDA");
    if (this.buttons) this.setButtonsEnabled(!this.busy && !this.finished);
  }

  setMessage(text, color = "#f7d6a5") {
    this.messageText.setText(text).setColor(color);
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
    return ({ fire: "FUEGO", wind: "VIENTO", lightning: "RAYO", physical: "FÍSICO", arcane: "ARCANO" })[element] || element.toUpperCase();
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
  metaRoot.hidden = true;
  gameRoot.hidden = false;
  if (game) game.destroy(true);
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: "#101622",
    scene: BattleScene,
    render: { antialias: true, pixelArt: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
  });
});
