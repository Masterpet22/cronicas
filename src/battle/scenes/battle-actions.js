import { SEALS, BASE_ACTIONS, JUTSU_LIBRARY, ENEMY_ACTIONS, ENEMY_ROSTER } from "../../data.js?v=0.66.0";
import { applyStatus, affinityLabel, hasStatus, hitChance } from "../../rules.js?v=0.20.0";
import { AFFINITY_CONFIG, affinityCycleModifier, furyDamageBonus, reprisalChance, reprisalDamage } from "../../affinity-system.js?v=0.58.0";
import { createPlayerFighter, destroyFighter, playEarthWallCast, playFighterDamageReaction, preparePlayerPunch, queuePlayerFighterTextures, recoverPlayerPunch, releasePlayerPunch, startPlayerGuard, startPlayerRunning, stopPlayerGuard, stopPlayerRunning } from "../../fighters.js?v=0.80.0";
import { enemyFighterAppearance, playerFighterAppearance } from "../../character.js?v=0.76.0";
import { actionLines, createActionButton, createBar } from "../../ui.js?v=0.87.0";
import { awardEncounter, cancelDoctorMission, completeMission, derivedStats, masterIdForCharacter, recordBestiaryObservation, resolveDoctorMissionCombat, writeSave } from "../../save.js?v=0.66.0";
import { elementIcon } from "../../elements.js?v=0.20.0";
import { createUiIcon, loadUiIcons } from "../../icons.js?v=0.44.0";
import { missionStep } from "../../mission-system.js?v=0.67.0";
import { getMissionSceneDialogue } from "../../dialogues.js?v=0.66.0";
import { bossPhaseMessage, combatFeatures, fieldSuppliesForBattle, resolveEncounterIds } from "../../combat-modifiers.js?v=0.67.0";
import { resolveDamage } from "../damage.js?v=0.68.0";
import { createEnemyState } from "../enemy-state.js?v=0.68.0";
import { advanceCooldowns, combatantEvasion, combatantSpeed, nextEnemyAction, resolveStatusTick, soakAfterTurn, waterSoakAfterAttack } from "../turn.js?v=0.68.0";
import { addBattleReward, bestiaryObservation, createBattleResult, emptyBattleRewards } from "../rewards.js?v=0.68.0";
import { bindBattleState, createBattleState } from "../battle-state.js?v=0.68.0";


import { BATTLE_ARENAS, HEIGHT, HUD_THEMES, Phaser, RANK_LEVELS, TECHNIQUE_VFX, TECHNIQUE_VFX_FRAMES, TIMELINE_END, TIMELINE_START, WIDTH, battleRuntime, drawCubicBezier, sharpenTextTree } from "../runtime.js?v=0.82.9";

export class BattleActionMethods {
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

  createSubstitutionSmoke(x, y, spread = 1) {
    const colors = [0xe2e7eb, 0xb9c2c9, 0x87939e];
    const puffs = Array.from({ length: 14 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 14;
      const innerRadius = 18 + (index % 4) * 7;
      const puff = this.add.circle(
        x + Math.cos(angle) * innerRadius * 0.45,
        y + Math.sin(angle) * innerRadius * 0.28,
        11 + (index % 5) * 3,
        colors[index % colors.length],
        0.76
      ).setDepth(19).setScale(0.18);
      const distance = (42 + (index % 4) * 12) * spread;
      this.tweens.add({
        targets: puff,
        x: puff.x + Math.cos(angle) * distance,
        y: puff.y + Math.sin(angle) * distance * 0.58 - 12,
        scale: 1.25 + (index % 3) * 0.22,
        alpha: 0,
        duration: 430 + (index % 4) * 45,
        ease: "Cubic.out",
        onComplete: () => puff.destroy()
      });
      return puff;
    });
    return puffs;
  }

  async playSubstitution(fighter) {
    if (!fighter?.body || !fighter?.shadow || !this.textures.exists("substitution-log")) return;
    const x = fighter.body.x;
    const groundY = fighter.shadow.y + 8;
    const bodyAlpha = fighter.body.alpha;
    const shadowAlpha = fighter.shadow.alpha;
    this.createSubstitutionSmoke(x, groundY - 48, 1.05);
    fighter.body.setAlpha(0);
    fighter.shadow.setAlpha(0);
    const log = this.add.image(x, groundY, "substitution-log")
      .setOrigin(0.5, 0.88)
      .setDisplaySize(178, 119)
      .setDepth(18)
      .setAngle(-4);
    const finalScaleX = log.scaleX;
    const finalScaleY = log.scaleY;
    log.setScale(finalScaleX * 0.04, finalScaleY * 0.04);
    this.tone(155, 0.11);
    this.floatLabel(x, groundY - 142, "SUSTITUCIÓN", 0xdde6ec);
    await this.tween({ targets: log, scaleX: finalScaleX, scaleY: finalScaleY, angle: 0, duration: 230, ease: "Back.out" });
    await this.delay(260);
    this.createSubstitutionSmoke(x, groundY - 45, 0.78);
    await this.tween({ targets: log, alpha: 0, scaleX: finalScaleX * 0.72, scaleY: finalScaleY * 0.72, y: groundY - 10, duration: 170, ease: "Cubic.in" });
    log.destroy();
    fighter.body.setAlpha(0);
    fighter.shadow.setAlpha(0);
    await Promise.all([
      this.tween({ targets: fighter.body, alpha: bodyAlpha, duration: 130, ease: "Sine.out" }),
      this.tween({ targets: fighter.shadow, alpha: shadowAlpha, duration: 130, ease: "Sine.out" })
    ]);
  }

  async playerAttack(jutsu, casting) {
    const cycleModifier = affinityCycleModifier(this.player.primaryAffinity, this.enemy.primaryAffinity);
    const furyBonus = this.player.primaryAffinity === "fuego" ? furyDamageBonus(this.player.hp, this.player.maxHp) : 0;
    const baseDamageInput = (jutsu.damage + this.player.baseStrength) * casting.multiplier;
    const chance = hitChance(this.player, { ...this.enemy, evasion: this.combatantEvasion(this.enemy) }, jutsu);
    const originX = this.hero.body.x;
    const originShadowX = this.hero.shadow.x;
    const usesPuppetPunch = jutsu.id === "strike" && this.hero.joints?.shoulderRight;
    const usesFireEmbersProjectile = jutsu.id === "fire_embers";
    const usesWaterShurikenProjectile = jutsu.id === "water_bullet";
    const usesHandProjectile = usesFireEmbersProjectile || usesWaterShurikenProjectile;
    const usesCastPose = usesHandProjectile && this.hero.animations?.supports("punch-release");
    const usesEarthWallCast = jutsu.id === "earth_wall" && this.hero.animations?.supports("earth-wall-cast");
    const usesEarthFistProjectile = jutsu.id === "earth_fist";
    if (usesPuppetPunch) {
      await preparePlayerPunch(this, this.hero);
      const strikeX = this.foe.body.x - 105;
      await Promise.all([
        this.tween({ targets: this.hero.body, x: strikeX, duration: 250, ease: "Cubic.out" }),
        this.tween({ targets: this.hero.shadow, x: strikeX, duration: 250, ease: "Cubic.out" })
      ]);
      await releasePlayerPunch(this, this.hero);
    } else if (usesHandProjectile) {
      if (usesCastPose) {
        await preparePlayerPunch(this, this.hero);
        await releasePlayerPunch(this, this.hero);
      } else await this.delay(125);
    } else if (usesEarthWallCast) {
      await playEarthWallCast(this, this.hero);
    } else if (usesEarthFistProjectile) {
      await this.delay(90);
    } else {
      this.tweens.add({ targets: this.hero.targets, x: "+=62", duration: 120, yoyo: true, hold: 50, ease: "Quad.out" });
      await this.delay(125);
    }

    if (!this.rollHit(chance)) {
      if (usesFireEmbersProjectile) await this.playFireEmbersProjectile(true);
      else if (usesWaterShurikenProjectile) await this.playWaterShurikenProjectile(true);
      else if (usesEarthFistProjectile) await this.playEarthFistProjectile(true);
      this.tone(205, 0.08);
      this.setMessage(`El rival evitó ${jutsu.name} con una Sustitución.`, "#d7dce5");
      const substitution = this.playSubstitution(this.foe);
      if (usesPuppetPunch) {
        await Promise.all([
          substitution,
          recoverPlayerPunch(this, this.hero),
          this.tween({ targets: this.hero.body, x: originX, duration: 260, ease: "Cubic.inOut" }),
          this.tween({ targets: this.hero.shadow, x: originShadowX, duration: 260, ease: "Cubic.inOut" })
        ]);
      } else if (usesCastPose) await Promise.all([substitution, recoverPlayerPunch(this, this.hero)]);
      else await substitution;
      await this.delay(120);
      this.hero.body.x = originX;
      this.hero.shadow.x = originShadowX;
      return;
    }

    const critical = this.rollHit(this.player.criticalChance);
    const { damage } = resolveDamage({
      baseDamage: baseDamageInput,
      strengthModifier: this.player.strengthModifier,
      cycleModifier,
      furyBonus,
      critical,
      criticalMultiplier: AFFINITY_CONFIG.damage.criticalMultiplier,
      damageReduction: this.enemy.damageReduction || 0
    });
    if (usesFireEmbersProjectile) await this.playFireEmbersProjectile(false);
    else if (usesWaterShurikenProjectile) await this.playWaterShurikenProjectile(false);
    else if (usesEarthFistProjectile) await this.playEarthFistProjectile(false);
    else if (TECHNIQUE_VFX[jutsu.id]) await this.playTechniqueEffect(jutsu.id);
    else this.createImpact(this.foe.body.x, this.foe.body.y - 15, jutsu.color, jutsu.cinematic ? 1.6 : 1);
    this.tone(jutsu.cinematic ? 92 : 128, 0.12);
    this.shake(jutsu.cinematic ? 240 : 130, jutsu.cinematic ? 0.012 : 0.006);
    if (critical) this.floatLabel(this.foe.body.x, this.foe.body.y - 156, "CRÍTICO", 0xf5c96b);
    const { amount, reaction } = this.loseHealth(this.enemy, this.foe, damage);
    const appliedSoak = this.applyWaterPassive(this.player, this.enemy);
    if (appliedSoak) this.floatLabel(this.foe.body.x, this.foe.body.y - 178, `EMPAPADO ×${appliedSoak.stacks}`, 0x63cfff);
    if (jutsu.status && this.enemy.hp > 0) {
      applyStatus(this.enemy, jutsu.status);
      this.refreshHud();
    }
    const statusNote = jutsu.status && this.enemy.hp > 0 ? ` · ${jutsu.status.label}` : "";
    const elementNote = affinityLabel(1 + cycleModifier);
    if (cycleModifier > 0 && this.player.primaryAffinity) this.recordEnemyObservation({ vulnerability: this.player.primaryAffinity });
    this.setMessage(`${jutsu.name}: ${damage} de daño${critical ? " · CRÍTICO" : ""}${statusNote}${elementNote ? ` · ${elementNote}` : ""}.`);
    if (usesPuppetPunch) {
      await Promise.all([
        reaction,
        recoverPlayerPunch(this, this.hero),
        this.tween({ targets: this.hero.body, x: originX, duration: 260, ease: "Cubic.inOut" }),
        this.tween({ targets: this.hero.shadow, x: originShadowX, duration: 260, ease: "Cubic.inOut" })
      ]);
    } else if (usesCastPose) await Promise.all([reaction, recoverPlayerPunch(this, this.hero)]);
    else await reaction;
    await this.applyEarthReprisal(this.enemy, this.player, this.hero, amount);
    await this.delay(usesPuppetPunch || usesCastPose || usesEarthWallCast || usesEarthFistProjectile ? 150 : 430);
    this.hero.body.x = originX;
    this.hero.shadow.x = originShadowX;
  }

  playTechniqueEffect(jutsuId) {
    const effect = TECHNIQUE_VFX[jutsuId];
    const texture = `technique-vfx-${jutsuId}`;
    const animation = `${texture}-animation`;
    if (!effect || !this.textures.exists(texture) || !this.anims.exists(animation)) return Promise.resolve();
    const occupiesBattlefield = effect.position === "battlefield";
    const x = occupiesBattlefield ? (this.hero.body.x + this.foe.body.x) / 2 : this.foe.body.x;
    const y = occupiesBattlefield ? effect.y : this.foe.shadow.y + 8;
    const sprite = this.add.sprite(x, y, texture, 0)
      .setOrigin(0.5, occupiesBattlefield ? 0.5 : 1)
      .setDisplaySize(effect.width, effect.height)
      .setDepth(14);
    return new Promise((resolve) => {
      sprite.once("animationcomplete", () => {
        sprite.destroy();
        resolve();
      });
      sprite.play(animation);
    });
  }

  async playEarthFistProjectile(missed = false) {
    const effect = TECHNIQUE_VFX.earth_fist;
    const creationTexture = "technique-vfx-earth_fist-creation";
    const destructionTexture = "technique-vfx-earth_fist-destruction";
    const creationAnimation = `${creationTexture}-animation`;
    const destructionAnimation = `${destructionTexture}-animation`;
    if (!this.textures.exists(creationTexture) || !this.anims.exists(creationAnimation)) return;

    const origin = { x: this.hero.body.x + 165, y: this.hero.shadow.y + 86 };
    const projectile = this.add.sprite(origin.x, origin.y, creationTexture, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(effect.width, effect.height)
      .setDepth(14);
    await new Promise((resolve) => {
      projectile.once("animationcomplete", resolve);
      projectile.play(creationAnimation);
    });

    const target = {
      x: this.foe.body.x + (missed ? 145 : -18),
      y: this.foe.shadow.y + (missed ? 56 : 86)
    };
    await this.tween({
      targets: projectile,
      x: target.x,
      y: target.y,
      alpha: missed ? 0 : 1,
      duration: 480,
      ease: "Cubic.in"
    });
    projectile.destroy();
    if (missed || !this.textures.exists(destructionTexture) || !this.anims.exists(destructionAnimation)) return;

    const destruction = this.add.sprite(this.foe.body.x - 18, this.foe.shadow.y + 86, destructionTexture, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(effect.width, effect.height)
      .setDepth(15);
    await new Promise((resolve) => {
      destruction.once("animationcomplete", resolve);
      destruction.play(destructionAnimation);
    });
    destruction.destroy();
  }

  playerHandPosition() {
    const wrist = this.hero.joints?.wristRight;
    if (wrist?.getWorldTransformMatrix) {
      const point = wrist.getWorldTransformMatrix().transformPoint(0, 0);
      return { x: point.x, y: point.y };
    }
    return { x: this.hero.body.x + 44, y: this.hero.body.y - 12 };
  }

  playerProjectileOrigin() {
    const hand = this.playerHandPosition();
    const direction = this.hero.body.scaleX < 0 ? -1 : 1;
    return { x: hand.x + 18 * direction, y: hand.y };
  }

  async playWaterShurikenProjectile(missed = false) {
    const effect = TECHNIQUE_VFX.water_bullet;
    const creationTexture = "technique-vfx-water_bullet-creation";
    const creationAnimation = `${creationTexture}-animation`;
    const projectileTexture = "technique-vfx-water_bullet-projectile";
    if (!this.textures.exists(creationTexture) || !this.anims.exists(creationAnimation) || !this.textures.exists(projectileTexture)) return;

    const origin = this.playerHandPosition();
    const creation = this.add.sprite(origin.x, origin.y, creationTexture, 0)
      .setDisplaySize(effect.creationWidth, effect.creationHeight)
      .setDepth(14);
    await new Promise((resolve) => {
      creation.once("animationcomplete", resolve);
      creation.play(creationAnimation);
    });
    creation.destroy();

    const target = { x: this.foe.body.x + (missed ? 90 : -8), y: this.foe.body.y - 18 };
    const projectile = this.add.image(origin.x, origin.y, projectileTexture)
      .setDisplaySize(effect.width, effect.height)
      .setDepth(14);
    await this.tween({
      targets: projectile,
      x: target.x,
      y: target.y,
      angle: 1440,
      alpha: missed ? 0 : 1,
      duration: 560,
      ease: "Linear"
    });
    if (!missed) this.createImpact(target.x, target.y, 0x55bfff, 0.9);
    projectile.destroy();
  }

  async playFireEmbersProjectile(missed = false) {
    const effect = TECHNIQUE_VFX.fire_embers;
    const texture = "technique-vfx-fire_embers";
    const animation = `${texture}-animation`;
    if (!this.textures.exists(texture) || !this.anims.exists(animation)) return Promise.resolve();
    const origin = this.playerProjectileOrigin();
    const target = { x: this.foe.body.x + (missed ? 90 : -8), y: this.foe.body.y - 18 };
    const sprite = this.add.sprite(origin.x, origin.y, texture, 0)
      .setOrigin(0.58, 0.5)
      .setDisplaySize(effect.width, effect.height)
      .setDepth(14);
    const animationDone = new Promise((resolve) => sprite.once("animationcomplete", resolve));
    sprite.play(animation);
    await Promise.all([
      animationDone,
      this.tween({ targets: sprite, x: target.x, y: target.y, duration: 560, ease: "Cubic.in" })
    ]);
    if (!missed) this.createImpact(target.x, target.y, 0xff8a38, 0.8);
    await this.tween({
      targets: sprite,
      alpha: 0,
      scaleX: sprite.scaleX * 0.45,
      scaleY: sprite.scaleY * 0.45,
      duration: 160,
      ease: "Quad.in"
    });
    sprite.destroy();
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

  async executeEnemyAction(action) {
    const stun = this.enemy.statuses.find((status) => status.type === "stun");
    if (stun) {
      this.enemy.statuses = this.enemy.statuses.filter((status) => status !== stun);
      this.finishCombatantTurn(this.enemy);
      this.refreshHud();
      this.setMessage("El rival está aturdido y pierde su acción.", "#8fc7ff");
      this.tone(180, 0.16);
      await this.delay(620);
      return;
    }
    await this.enemyTurn(action);
  }

  async enemyTurn(action) {
    if (this.combatFeatures.announcedActionIds.includes(action.id)) {
      this.floatLabel(this.foe.body.x, this.foe.body.y - 165, `ANUNCIA: ${action.name.toUpperCase()}`, 0xf0b85c);
      this.setMessage(`Raizen anuncia ${action.name}. Memoriza el patrón para anticipar el siguiente ciclo.`, "#f0c77c");
      await this.delay(650);
    }
    this.recordEnemyObservation({ technique: action.id });
    const cycleModifier = affinityCycleModifier(this.enemy.primaryAffinity, this.player.primaryAffinity);
    const furyBonus = this.enemy.primaryAffinity === "fuego" ? furyDamageBonus(this.enemy.hp, this.enemy.maxHp) : 0;
    const baseDamageInput = Phaser.Math.Between(action.damage[0], action.damage[1]) + this.enemy.baseStrength;
    const critical = this.rollHit(this.enemy.criticalChance);
    const { damage } = resolveDamage({
      baseDamage: baseDamageInput,
      strengthModifier: this.enemy.strengthModifier,
      cycleModifier,
      furyBonus,
      critical,
      criticalMultiplier: AFFINITY_CONFIG.damage.criticalMultiplier,
      damageReduction: this.player.damageReduction,
      guarding: this.player.guarding
    });
    const chance = hitChance(this.enemy, { ...this.player, evasion: this.combatantEvasion(this.player) }, action);
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
      this.setMessage(`Evitaste ${action.name} con una Sustitución.`, "#79e8b5");
      const substitution = this.playSubstitution(this.hero);
      if (usesPuppetPunch) {
        await Promise.all([
          substitution,
          recoverPlayerPunch(this, this.foe),
          this.tween({ targets: this.foe.body, x: originX, duration: 260, ease: "Cubic.inOut" }),
          this.tween({ targets: this.foe.shadow, x: originShadowX, duration: 260, ease: "Cubic.inOut" })
        ]);
      } else await substitution;
      await this.delay(120);
      this.foe.body.x = originX;
      this.foe.shadow.x = originShadowX;
      this.finishCombatantTurn(this.enemy);
      return;
    }

    this.createImpact(this.hero.body.x, this.hero.body.y - 10, action.color, 0.8);
    this.tone(110, 0.1);
    this.shake(120, 0.005);
    if (critical) this.floatLabel(this.hero.body.x, this.hero.body.y - 156, "CRÍTICO", 0xf5c96b);
    const { amount, reaction } = this.loseHealth(this.player, this.hero, damage, { guarded: this.player.guarding });
    const appliedSoak = this.applyWaterPassive(this.enemy, this.player);
    if (appliedSoak) this.floatLabel(this.hero.body.x, this.hero.body.y - 178, `EMPAPADO ×${appliedSoak.stacks}`, 0x63cfff);
    if (action.status && !this.player.guarding && this.player.hp > 0) {
      applyStatus(this.player, action.status);
      this.refreshHud();
    }
    await reaction;
    await this.applyEarthReprisal(this.player, this.enemy, this.foe, amount);
    if (usesPuppetPunch) {
      await Promise.all([
        recoverPlayerPunch(this, this.foe),
        this.tween({ targets: this.foe.body, x: originX, duration: 260, ease: "Cubic.inOut" }),
        this.tween({ targets: this.foe.shadow, x: originShadowX, duration: 260, ease: "Cubic.inOut" })
      ]);
      this.foe.body.x = originX;
      this.foe.shadow.x = originShadowX;
    }
    this.finishCombatantTurn(this.enemy);
    await this.delay(220);
  }

  rollHit(chance) {
    return Math.random() * 100 < chance;
  }

  async resolveCombatantStatusTick(data, fighter) {
    let triggered = false;
    const tick = resolveStatusTick(data.statuses);
    for (const status of tick.damage) {
      triggered = true;
      const { amount, reaction } = this.loseHealth(data, fighter, status.power, { yOffset: -118 });
      this.setMessage(`${status.label}: ${amount} de daño.`);
      await Promise.all([
        reaction,
        this.delay(330)
      ]);
    }
    data.statuses = tick.statuses;

    if (triggered) {
      this.refreshHud();
      await this.delay(220);
    }
  }

  async resolveEndRoundStatuses() {
    await this.resolveCombatantStatusTick(this.player, this.hero);
    await this.resolveCombatantStatusTick(this.enemy, this.foe);
  }

  advanceCooldowns() {
    this.cooldowns = advanceCooldowns(this.cooldowns);
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

}

