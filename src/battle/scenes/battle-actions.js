import { SEALS, BASE_ACTIONS, JUTSU_LIBRARY, ENEMY_ACTIONS, ENEMY_ROSTER } from "../../data.js?v=1.5.0";
import { applyStatus, affinityLabel, hasStatus, hitChance } from "../../rules.js?v=0.20.0";
import { AFFINITY_CONFIG, affinityCycleModifier, furyDamageBonus, reprisalChance, reprisalDamage } from "../../affinity-system.js?v=0.114.0";
import { createPlayerFighter, destroyFighter, playEarthWallCast, playFighterDamageReaction, preparePlayerPunch, queuePlayerFighterTextures, recoverPlayerPunch, releasePlayerPunch, startPlayerGuard, startPlayerRunning, stopPlayerGuard, stopPlayerRunning } from "../../fighters.js?v=0.140.0";
import { enemyFighterAppearance, playerFighterAppearance } from "../../character.js?v=0.119.0";
import { actionLines, createActionButton, createBar } from "../../ui.js?v=0.140.0";
import { awardEncounter, cancelDoctorMission, completeMission, derivedStats, masterIdForCharacter, recordBestiaryObservation, resolveDoctorMissionCombat, writeSave } from "../../save.js?v=0.140.0";
import { elementIcon } from "../../elements.js?v=0.20.0";
import { createUiIcon, loadUiIcons } from "../../icons.js?v=0.44.0";
import { missionStep } from "../../mission-system.js?v=0.114.0";
import { getMissionSceneDialogue } from "../../dialogues.js?v=0.131.0";
import { bossPhaseMessage, combatFeatures, fieldSuppliesForBattle, resolveEncounterIds } from "../../combat-modifiers.js?v=0.114.0";
import { attackBaseDamage, resolveDamage, splitDamageAcrossHits } from "../damage.js?v=0.114.0";
import { showElementalImpact } from "../elemental-effects.js?v=0.92.0";
import { holdKunai, throwShuriken } from "../weapon-effects.js?v=1.4.0";
import { playCombatSubstitution } from "../teleport-transition.js?v=1.1.0";
import { reserveEnemyAbility } from "../enemy-abilities.js?v=0.140.0";
import { createEnemyState } from "../enemy-state.js?v=1.5.0";
import { advanceCooldowns, combatantEvasion, combatantSpeed, nextEnemyAction, resolveStatusTick, soakAfterTurn, waterSoakAfterAttack } from "../turn.js?v=1.4.0";
import { addBattleReward, bestiaryObservation, createBattleResult, emptyBattleRewards } from "../rewards.js?v=0.114.0";
import { bindBattleState, createBattleState } from "../battle-state.js?v=0.68.0";


import { BATTLE_ARENAS, HEIGHT, HUD_THEMES, Phaser, RANK_LEVELS, TECHNIQUE_VFX, TECHNIQUE_VFX_FRAMES, TIMELINE_END, TIMELINE_START, WIDTH, battleRuntime, drawCubicBezier, sharpenTextTree } from "../runtime.js?v=0.91.0";

export class BattleActionMethods {
  async playSeals(jutsu, { actor = "player" } = {}) {
    const playerCasting = actor === "player";
    const manualCasting = playerCasting && this.manualSeals;
    const speedFactor = playerCasting && this.seenJutsus.has(jutsu.id) ? 0.55 : 1;
    this.sealPrompt = this.add.text(0, jutsu.cinematic ? 195 : 66, "", this.textStyle(12, "#eaf7ff", "800"))
      .setOrigin(0.5)
      .setPadding(14, 7)
      .setBackgroundColor("rgba(2, 8, 18, 0.9)");
    this.sealLayer.add(this.sealPrompt);
    if (!playerCasting) this.setSealPrompt(`SELLOS DEL RIVAL · ${jutsu.name.toUpperCase()}`);
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
      const image = this.add.image(0, -6, "sealSheet", seal.frame).setDisplaySize(imageWidth, imageWidth);
      const label = this.add.text(0, size / 2 - 4, playerCasting ? `${seal.key} · ${seal.label}` : seal.label, this.textStyle(jutsu.cinematic ? 12 : 9, "#fff1d6", "800")).setOrigin(0.5, 1);
      card.add([plate, image, label]);
      this.sealLayer.add(card);
      this.tweens.add({ targets: card, alpha: 1, scale: 1, duration: 130, ease: "Back.out" });
      cards.push({ card, plate, seal });
      await this.delay((jutsu.cinematic ? 115 : 80) * speedFactor);
    }

    let mistakes = 0;
    if (playerCasting) await this.combatTutorial?.seals();
    if (this.finished) return { mistakes: 0, multiplier: 1 };
    for (let i = 0; i < cards.length; i += 1) {
      const current = cards[i];
      current.plate.setStrokeStyle(4, 0xffffff, 1);
      this.tweens.add({ targets: current.card, scale: 1.1, duration: 110, yoyo: true, repeat: -1, ease: "Sine.inOut" });

      if (manualCasting) {
        const inputWindow = jutsu.cinematic ? 1500 : 1200;
        this.setSealPrompt(`PULSA ${current.seal.key} · ${current.seal.label.toUpperCase()}  (${i + 1}/${cards.length})`);
        const result = await this.waitForSealInput(current.seal.key, current.card, jutsu.color, inputWindow);
        if (this.finished) return { mistakes: 0, multiplier: 1 };
        mistakes += result.mistakes;
        current.plate.setStrokeStyle(3, result.timedOut ? 0xff665f : result.mistakes === 0 ? 0x66efad : 0xffc46b, 1);
      } else {
        this.setSealPrompt(`${playerCasting ? "EJECUTANDO" : "SELLOS DEL RIVAL ·"} ${current.seal.label.toUpperCase()}  (${i + 1}/${cards.length})`);
        await this.delay((jutsu.cinematic ? 230 : 175) * speedFactor);
        current.plate.setStrokeStyle(3, 0x68a8ff, 1);
      }

      this.tweens.killTweensOf(current.card);
      current.card.setScale(1);
      this.tone(270 + i * 72, 0.065);
    }

    const multiplier = manualCasting ? (mistakes === 0 ? 1.1 : mistakes <= 2 ? 1 : 0.85) : 1;
    const quality = !manualCasting
      ? playerCasting ? "Secuencia automática completada." : "El rival ha completado sus sellos."
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
    if (playerCasting) {
      this.seenJutsus.add(jutsu.id);
      if (!this.mission.tutorialReplay) {
        try { window.localStorage.setItem("seen-jutsus", JSON.stringify([...this.seenJutsus])); } catch (_) { /* La aceleración sigue activa durante la sesión. */ }
      }
    }
    return { mistakes, multiplier };
  }

  waitForSealInput(expectedKey, card, color, timeoutMs = 1200) {
    return new Promise((resolve) => {
      let mistakes = 0;
      let done = false;
      let timedOut = false;
      let onTutorialSkip;

      // La barra de tiempo queda fuera de la tarjeta para no tapar
      // la tecla ni el nombre del sello.
      const timerY = card.height / 2 + 9;
      const timerBg = this.add.rectangle(0, timerY, card.width - 12, 5, 0x202a38, 0.95).setOrigin(0.5);
      const timerFill = this.add.rectangle(-(card.width - 12) / 2, timerY, card.width - 12, 5, 0xf5c96b, 1).setOrigin(0, 0.5);
      card.add([timerBg, timerFill]);

      const guided = this.combatTutorial?.sealPractice;
      timerBg.setVisible(!guided);
      timerFill.setVisible(!guided);
      const timerTween = !guided && this.tweens.add({
        targets: timerFill,
        scaleX: 0,
        duration: timeoutMs,
        ease: "Linear"
      });

      const timeoutEvent = !guided && this.time.delayedCall(timeoutMs, () => {
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
        if (timeoutEvent) timeoutEvent.remove(false);
        if (timerTween) timerTween.stop();
        this.input?.keyboard?.off("keydown", onKey);
        this.game.canvas.parentElement?.querySelector("[data-tutorial-skip]")?.removeEventListener("click", onTutorialSkip);
        this.events.off("shutdown", finish);
        if (card.scene) card.disableInteractive();
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
      // Omitting the guide also releases an untimed seal practice.
      if (guided) {
        onTutorialSkip = () => { if (!this.combatTutorial?.active) finish(); };
        this.game.canvas.parentElement.querySelector("[data-tutorial-skip]")?.addEventListener("click", onTutorialSkip, { once: true });
      }
      this.events.once("shutdown", finish);
      card.setInteractive({ useHandCursor: true });
      card.once("pointerdown", finish);
      card.getAt(0).setStrokeStyle(4, color, 1);
    });
  }

  async playSubstitution(fighter) {
    if (!fighter?.body || !fighter?.shadow) return;
    const objectId = fighter === this.foe ? "log" : this.saveData?.character?.teleportObject;
    this.tone(155, 0.11);
    this.floatLabel(fighter.body.x, fighter.shadow.y - 134, "SUSTITUCIÓN", 0xdde6ec);
    return playCombatSubstitution(this, fighter, objectId);
  }

  async playerAttack(jutsu, casting) {
    return this.combatantAttack("player", jutsu, casting);
  }

  async combatantAttack(actor, jutsu, casting = { multiplier: 1 }) {
    const playerAttacking = actor === "player";
    const attacker = playerAttacking ? this.player : this.enemy;
    const defender = playerAttacking ? this.enemy : this.player;
    const source = playerAttacking ? this.hero : this.foe;
    const target = playerAttacking ? this.foe : this.hero;
    const direction = playerAttacking ? 1 : -1;
    const defenderActor = playerAttacking ? "enemy" : "player";
    const guarded = Boolean(defender.guarding);
    const cycleModifier = affinityCycleModifier(attacker.primaryAffinity, defender.primaryAffinity);
    const furyBonus = attacker.primaryAffinity === "fuego" ? furyDamageBonus(attacker.hp, attacker.maxHp) : 0;
    const baseDamageInput = attackBaseDamage(jutsu.damage, attacker.baseStrength) * casting.multiplier;
    const chance = hitChance(attacker, { ...defender, evasion: this.combatantEvasion(defender) }, jutsu);
    const originX = source.body.x;
    const originShadowX = source.shadow.x;
    const usesWeapon = jutsu.type === "weapon";
    const usesThrowable = jutsu.type === "throwable";
    const usesPuppetPunch = (jutsu.id === "strike" || jutsu.type === "taijutsu" || usesWeapon) && source.joints?.shoulderRight;
    const usesFireEmbersProjectile = jutsu.id === "fire_embers";
    const usesWaterShurikenProjectile = jutsu.id === "water_bullet";
    const usesWindPalmProjectile = jutsu.id === "wind_palm";
    const usesWindBladeMultiHit = jutsu.id === "wind_blade";
    const usesHandProjectile = usesFireEmbersProjectile || usesWaterShurikenProjectile || usesThrowable;
    const usesCastPose = usesHandProjectile && source.animations?.supports("punch-release");
    const usesEarthWallCast = jutsu.id === "earth_wall" && source.animations?.supports("earth-wall-cast");
    const usesEarthFistProjectile = jutsu.id === "earth_fist";
    const removeWeapon = usesWeapon && ["kunai", "steel_kunai"].includes(jutsu.weaponId) ? holdKunai(this, actor) : null;
    const critical = this.rollHit(attacker.criticalChance);
    try {
      if (usesPuppetPunch) {
        await preparePlayerPunch(this, source);
        const strikeX = target.body.x - 105 * direction;
        await Promise.all([
          this.tween({ targets: source.body, x: strikeX, duration: 250, ease: "Cubic.out" }),
          this.tween({ targets: source.shadow, x: strikeX, duration: 250, ease: "Cubic.out" })
        ]);
        await releasePlayerPunch(this, source);
      } else if (usesHandProjectile) {
        if (usesCastPose) {
          await preparePlayerPunch(this, source);
          await releasePlayerPunch(this, source);
        } else await this.delay(125);
      } else if (usesEarthWallCast) {
        await playEarthWallCast(this, source);
      } else if (usesEarthFistProjectile) {
        await this.delay(90);
      } else {
        this.tweens.add({ targets: source.targets, x: `+=${62 * direction}`, duration: 120, yoyo: true, hold: 50, ease: "Quad.out" });
        await this.delay(125);
      }

      if (!this.rollHit(chance)) {
        if (usesThrowable) { await throwShuriken(this, true, actor); if (this.finished) return; }
        else if (usesFireEmbersProjectile) await this.playFireEmbersProjectile(true, actor);
        else if (usesWaterShurikenProjectile) await this.playWaterShurikenProjectile(true, actor);
        else if (usesEarthFistProjectile) await this.playEarthFistProjectile(true, actor);
        else if (usesWindPalmProjectile) await this.playWindPalmProjectile(actor);
        this.tone(205, 0.08);
        this.setMessage(playerAttacking ? `El rival evitó ${jutsu.name} con una Sustitución.` : `Evitaste ${jutsu.name} con una Sustitución.`, "#d7dce5");
        const substitution = this.playSubstitution(target);
        if (usesPuppetPunch) {
          await Promise.all([
            substitution,
            recoverPlayerPunch(this, source),
            this.tween({ targets: source.body, x: originX, duration: 260, ease: "Cubic.inOut" }),
            this.tween({ targets: source.shadow, x: originShadowX, duration: 260, ease: "Cubic.inOut" })
          ]);
        } else if (usesCastPose) await Promise.all([substitution, recoverPlayerPunch(this, source)]);
        else await substitution;
        if (this.finished) return;
        await this.delay(120);
        source.body.x = originX;
        source.shadow.x = originShadowX;
        return;
      }

      const { damage } = resolveDamage({
        baseDamage: baseDamageInput,
        strengthModifier: attacker.strengthModifier,
        cycleModifier,
        furyBonus,
        critical,
        criticalMultiplier: AFFINITY_CONFIG.damage.criticalMultiplier,
        damageReduction: defender.damageReduction || 0,
        guarding: guarded && !usesWindBladeMultiHit
      });
      let amount = 0;
      let reaction = Promise.resolve(false);
      if (usesWindBladeMultiHit) {
        const hitDamages = splitDamageAcrossHits(damage, 3);
        const reactions = [];
        if (critical) this.floatLabel(target.body.x, target.body.y - 178, "CRÍTICO", 0xf5c96b);
        await this.playWindBladeEffect((hitIndex) => {
          showElementalImpact(this, jutsu, target.body.x, target.body.y - 26, 0.65);
          this.tone(128, 0.08);
          this.shake(90, 0.004);
          const hit = this.loseHealth(defender, target, defender.guarding ? Math.ceil(hitDamages[hitIndex] / 2) : hitDamages[hitIndex], {
            guarded: Boolean(defender.guarding),
            react: hitIndex === hitDamages.length - 1,
            yOffset: -112 - hitIndex * 26
          });
          if (defender.guarding && hit.amount > 0) this.clearGuard(defenderActor);
          amount += hit.amount;
          reactions.push(hit.reaction);
        }, actor);
        reaction = Promise.all(reactions);
      } else {
        if (usesThrowable) { await throwShuriken(this, false, actor); if (this.finished) return; }
        else if (usesFireEmbersProjectile) await this.playFireEmbersProjectile(false, actor);
        else if (usesWaterShurikenProjectile) await this.playWaterShurikenProjectile(false, actor);
        else if (usesEarthFistProjectile) await this.playEarthFistProjectile(false, actor);
        else if (usesWindPalmProjectile) await this.playWindPalmProjectile(actor);
        else if (TECHNIQUE_VFX[jutsu.id]) await this.playTechniqueEffect(jutsu.id, actor);
        else this.createImpact(target.body.x, target.body.y - 15, jutsu.color, jutsu.cinematic ? 1.6 : 1);
        this.tone(jutsu.cinematic ? 92 : 128, 0.12);
        this.shake(jutsu.cinematic ? 240 : 130, jutsu.cinematic ? 0.012 : 0.006);
        showElementalImpact(this, jutsu, target.body.x, target.body.y - 26, jutsu.cinematic ? 1.25 : 1);
        if (critical) this.floatLabel(target.body.x, target.body.y - 156, "CRÍTICO", 0xf5c96b);
        ({ amount, reaction } = this.loseHealth(defender, target, damage, { guarded }));
      }
      if (guarded && defender.guarding && amount > 0) this.clearGuard(defenderActor);
      const appliedSoak = this.applyWaterPassive(attacker, defender);
      if (appliedSoak) this.floatLabel(target.body.x, target.body.y - 178, `EMPAPADO ×${appliedSoak.stacks}`, 0x63cfff);
      if (jutsu.status && !guarded && defender.hp > 0) {
        applyStatus(defender, jutsu.status);
        this.refreshHud();
      }
      const statusNote = jutsu.status && !guarded && defender.hp > 0 ? ` · ${jutsu.status.label}` : "";
      const elementNote = affinityLabel(1 + cycleModifier);
      if (playerAttacking && cycleModifier > 0 && attacker.primaryAffinity) this.recordEnemyObservation({ vulnerability: attacker.primaryAffinity });
      this.setMessage(`${jutsu.name}: ${damage} de daño${critical ? " · CRÍTICO" : ""}${statusNote}${elementNote ? ` · ${elementNote}` : ""}.`);
      if (usesPuppetPunch) {
        await Promise.all([
          reaction,
          recoverPlayerPunch(this, source),
          this.tween({ targets: source.body, x: originX, duration: 260, ease: "Cubic.inOut" }),
          this.tween({ targets: source.shadow, x: originShadowX, duration: 260, ease: "Cubic.inOut" })
        ]);
      } else if (usesCastPose) await Promise.all([reaction, recoverPlayerPunch(this, source)]);
      else await reaction;
      await this.applyEarthReprisal(defender, attacker, source, amount);
      await this.delay(usesPuppetPunch || usesCastPose || usesEarthWallCast || usesEarthFistProjectile ? 150 : 430);
      source.body.x = originX;
      source.shadow.x = originShadowX;
    } finally { removeWeapon?.(); }
  }

  playTechniqueEffect(jutsuId, actor = "player") {
    const source = actor === "player" ? this.hero : this.foe;
    const target = actor === "player" ? this.foe : this.hero;
    const effect = TECHNIQUE_VFX[jutsuId];
    const texture = `technique-vfx-${jutsuId}`;
    const animation = `${texture}-animation`;
    if (!effect || !this.textures.exists(texture) || !this.anims.exists(animation)) return Promise.resolve();
    const occupiesBattlefield = effect.position === "battlefield";
    const x = occupiesBattlefield ? (source.body.x + target.body.x) / 2 : target.body.x;
    const y = occupiesBattlefield ? effect.y : target.shadow.y + 8;
    const sprite = this.add.sprite(x, y, texture, 0)
      .setOrigin(0.5, occupiesBattlefield ? 0.5 : 1)
      .setDisplaySize(effect.width, effect.height)
      .setDepth(14).setFlipX(actor === "enemy");
    return new Promise((resolve) => {
      sprite.once("animationcomplete", () => {
        sprite.destroy();
        resolve();
      });
      sprite.play(animation);
    });
  }

  playWindPalmProjectile(actor = "player") {
    const source = actor === "player" ? this.hero : this.foe;
    const target = actor === "player" ? this.foe : this.hero;
    const effect = TECHNIQUE_VFX.wind_palm;
    const texture = "technique-vfx-wind_palm";
    const animation = `${texture}-animation`;
    if (!effect || !this.textures.exists(texture) || !this.anims.exists(animation)) return Promise.resolve();

    const groundY = target.shadow.y + 8;
    const origin = { x: (source.body.x + target.body.x) / 2, y: groundY };
    const destination = { x: target.body.x, y: groundY };
    const sprite = this.add.sprite(origin.x, origin.y, texture, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(effect.width, effect.height)
      .setDepth(14).setFlipX(actor === "enemy");

    return new Promise((resolve) => {
      let launched = false;
      sprite.on("animationupdate", (_animation, frame) => {
        if (launched || Number(frame.textureFrame) < 2) return;
        launched = true;
        this.tweens.add({
          targets: sprite,
          x: destination.x,
          y: destination.y,
          duration: 230,
          ease: "Cubic.in"
        });
      });
      sprite.once("animationcomplete", () => {
        sprite.destroy();
        resolve();
      });
      sprite.play(animation);
    });
  }

  playWindBladeEffect(onHit, actor = "player") {
    const target = actor === "player" ? this.foe : this.hero;
    const effect = TECHNIQUE_VFX.wind_blade;
    const texture = "technique-vfx-wind_blade";
    const animation = `${texture}-animation`;
    const hitFrames = [1, 2, 3];
    const deliveredFrames = new Set();
    const deliverHitsThrough = (frameIndex) => {
      hitFrames.forEach((hitFrame, hitIndex) => {
        if (hitFrame > frameIndex || deliveredFrames.has(hitFrame)) return;
        deliveredFrames.add(hitFrame);
        onHit(hitIndex);
      });
    };

    if (!effect || !this.textures.exists(texture) || !this.anims.exists(animation)) {
      deliverHitsThrough(hitFrames.at(-1));
      return Promise.resolve();
    }

    const sprite = this.add.sprite(target.body.x, target.shadow.y + 8, texture, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(effect.width, effect.height)
      .setDepth(14).setFlipX(actor === "enemy");
    return new Promise((resolve) => {
      sprite.on("animationupdate", (_animation, frame) => deliverHitsThrough(Number(frame.textureFrame)));
      sprite.once("animationcomplete", () => {
        deliverHitsThrough(hitFrames.at(-1));
        sprite.destroy();
        resolve();
      });
      sprite.play(animation);
    });
  }

  async playEarthFistProjectile(missed = false, actor = "player") {
    const source = actor === "player" ? this.hero : this.foe;
    const target = actor === "player" ? this.foe : this.hero;
    const direction = actor === "player" ? 1 : -1;
    const effect = TECHNIQUE_VFX.earth_fist;
    const creationTexture = "technique-vfx-earth_fist-creation";
    const destructionTexture = "technique-vfx-earth_fist-destruction";
    const creationAnimation = `${creationTexture}-animation`;
    const destructionAnimation = `${destructionTexture}-animation`;
    if (!this.textures.exists(creationTexture) || !this.anims.exists(creationAnimation)) return;

    const origin = { x: source.body.x + 165 * direction, y: source.shadow.y + 86 };
    const projectile = this.add.sprite(origin.x, origin.y, creationTexture, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(effect.width, effect.height)
      .setDepth(14).setFlipX(actor === "enemy");
    await new Promise((resolve) => {
      projectile.once("animationcomplete", resolve);
      projectile.play(creationAnimation);
    });

    const destination = {
      x: target.body.x + (missed ? 145 : -18) * direction,
      y: target.shadow.y + (missed ? 56 : 86)
    };
    await this.tween({
      targets: projectile,
      x: destination.x,
      y: destination.y,
      alpha: missed ? 0 : 1,
      duration: 480,
      ease: "Cubic.in"
    });
    projectile.destroy();
    if (missed || !this.textures.exists(destructionTexture) || !this.anims.exists(destructionAnimation)) return;

    const destruction = this.add.sprite(target.body.x - 18 * direction, target.shadow.y + 86, destructionTexture, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(effect.width, effect.height)
      .setDepth(15).setFlipX(actor === "enemy");
    await new Promise((resolve) => {
      destruction.once("animationcomplete", resolve);
      destruction.play(destructionAnimation);
    });
    destruction.destroy();
  }

  playerHandPosition(actor = "player") {
    const source = actor === "player" ? this.hero : this.foe;
    const direction = actor === "player" ? 1 : -1;
    const wrist = source.joints?.wristRight;
    if (wrist?.getWorldTransformMatrix) {
      const point = wrist.getWorldTransformMatrix().transformPoint(0, 0);
      return { x: point.x, y: point.y };
    }
    return { x: source.body.x + 44 * direction, y: source.body.y - 12 };
  }

  playerProjectileOrigin(actor = "player") {
    const direction = actor === "player" ? 1 : -1;
    const hand = this.playerHandPosition(actor);
    return { x: hand.x + 18 * direction, y: hand.y };
  }

  async playWaterShurikenProjectile(missed = false, actor = "player") {
    const target = actor === "player" ? this.foe : this.hero;
    const direction = actor === "player" ? 1 : -1;
    const effect = TECHNIQUE_VFX.water_bullet;
    const creationTexture = "technique-vfx-water_bullet-creation";
    const creationAnimation = `${creationTexture}-animation`;
    const projectileTexture = "technique-vfx-water_bullet-projectile";
    if (!this.textures.exists(creationTexture) || !this.anims.exists(creationAnimation) || !this.textures.exists(projectileTexture)) return;

    const origin = this.playerHandPosition(actor);
    const creation = this.add.sprite(origin.x, origin.y, creationTexture, 0)
      .setDisplaySize(effect.creationWidth, effect.creationHeight)
      .setDepth(14).setFlipX(actor === "enemy");
    await new Promise((resolve) => {
      creation.once("animationcomplete", resolve);
      creation.play(creationAnimation);
    });
    creation.destroy();

    const destination = { x: target.body.x + (missed ? 90 : -8) * direction, y: target.body.y - 18 };
    const projectile = this.add.image(origin.x, origin.y, projectileTexture)
      .setDisplaySize(effect.width, effect.height)
      .setDepth(14).setFlipX(actor === "enemy");
    await this.tween({
      targets: projectile,
      x: destination.x,
      y: destination.y,
      angle: 1440,
      alpha: missed ? 0 : 1,
      duration: 560,
      ease: "Linear"
    });
    if (!missed) this.createImpact(destination.x, destination.y, 0x55bfff, 0.9);
    projectile.destroy();
  }

  async playFireEmbersProjectile(missed = false, actor = "player") {
    const target = actor === "player" ? this.foe : this.hero;
    const direction = actor === "player" ? 1 : -1;
    const effect = TECHNIQUE_VFX.fire_embers;
    const texture = "technique-vfx-fire_embers";
    const animation = `${texture}-animation`;
    if (!this.textures.exists(texture) || !this.anims.exists(animation)) return Promise.resolve();
    const origin = this.playerProjectileOrigin(actor);
    const destination = { x: target.body.x + (missed ? 90 : -8) * direction, y: target.body.y - 18 };
    const sprite = this.add.sprite(origin.x, origin.y, texture, 0)
      .setOrigin(0.58, 0.5)
      .setDisplaySize(effect.width, effect.height)
      .setDepth(14).setFlipX(actor === "enemy");
    const animationDone = new Promise((resolve) => sprite.once("animationcomplete", resolve));
    sprite.play(animation);
    await Promise.all([
      animationDone,
      this.tween({ targets: sprite, x: destination.x, y: destination.y, duration: 560, ease: "Cubic.in" })
    ]);
    if (!missed) this.createImpact(destination.x, destination.y, 0xff8a38, 0.8);
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
      this.refreshHud();
      this.setMessage("El rival está aturdido y pierde su acción.", "#8fc7ff");
      this.tone(180, 0.16);
      await this.delay(620);
      return { skipped: true };
    }
    if (!reserveEnemyAbility(this.enemy, action)) return { skipped: true };
    this.refreshHud();
    if (action.seals?.length) {
      await this.playSeals(action, { actor: "enemy" });
      if (this.finished) return { skipped: true };
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
    if (action.type === "guard") {
      this.enemy.guarding = true;
      startPlayerGuard(this, this.foe);
      this.setMessage("El rival prepara Guardia: reduce el próximo impacto y recupera chakra.");
      await this.delay(420);
      return;
    }
    return this.combatantAttack("enemy", action);
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

  clearGuard(actor = "player") {
    this[actor].guarding = false;
    stopPlayerGuard(this, actor === "player" ? this.hero : this.foe);
    if (actor === "player" && this.guardAura) {
      this.tweens.killTweensOf(this.guardAura);
      this.guardAura.destroy();
      this.guardAura = null;
    }
  }

}

