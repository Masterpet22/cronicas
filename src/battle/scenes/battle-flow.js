import { SEALS, BASE_ACTIONS, JUTSU_LIBRARY, ENEMY_ACTIONS, ENEMY_ROSTER } from "../../data.js?v=0.69.0";
import { applyStatus, affinityLabel, hasStatus, hitChance } from "../../rules.js?v=0.20.0";
import { AFFINITY_CONFIG, affinityCycleModifier, furyDamageBonus, reprisalChance, reprisalDamage } from "../../affinity-system.js?v=0.58.0";
import { createPlayerFighter, destroyFighter, playFighterDamageReaction, preparePlayerPunch, queuePlayerFighterTextures, recoverPlayerPunch, releasePlayerPunch, startPlayerGuard, startPlayerRunning, stopPlayerGuard, stopPlayerRunning } from "../../fighters.js?v=0.80.0";
import { enemyFighterAppearance, playerFighterAppearance } from "../../character.js?v=0.76.0";
import { actionLines, createActionButton, createBar } from "../../ui.js?v=0.88.0";
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
import { actionNeedsPreparation } from "../timeline.js?v=0.69.0";


import { BATTLE_ARENAS, HEIGHT, HUD_THEMES, Phaser, RANK_LEVELS, TECHNIQUE_VFX, TECHNIQUE_VFX_FRAMES, TIMELINE_END, TIMELINE_START, WIDTH, battleRuntime, drawCubicBezier, sharpenTextTree } from "../runtime.js?v=0.82.9";

export class BattleFlowMethods {
  async useJutsu(jutsu) {
    if (this.busy || this.finished || !this.turnReady) return;
    if (jutsu.type === "guard" && this.player.guarding) {
      this.setMessage("La Guardia ya está preparada.", "#f0c77c");
      return;
    }
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
    this.timelinePaused = true;
    this.player.chakra -= cost;
    if (jutsu.cooldown) this.cooldowns[jutsu.id] = jutsu.cooldown + 1;
    this.pendingActions.player = jutsu;
    this.refreshHud();
    this.setButtonsEnabled(false);
    if (actionNeedsPreparation(jutsu)) {
      this.showPreparationFeedback("player", jutsu);
      this.setMessage(`Preparando ${jutsu.name}: debe recorrer el tramo final de la barra.`, "#f0c77c");
      this.busy = false;
      this.timelinePaused = false;
      this.startTurnCharge();
      return;
    }
    await this.executeTimelineAction("player", jutsu);
  }

  async executeTimelineAction(actor, action) {
    if (this.finished) return;
    this.clearPreparationFeedback(actor);
    this.stopTurnTimeline();
    this.timelinePaused = true;
    this.busy = true;
    this.turnReady = false;
    this.setButtonsEnabled(false);

    if (actor === "player") {
      const casting = action.seals?.length ? await this.playSeals(action) : { mistakes: 0, multiplier: 1 };
      if (action.type === "guard") await this.playerGuard();
      else await this.playerAttack(action, casting);
      this.finishCombatantTurn(this.player);
      this.pendingActions.player = null;
      this.timelineProgress.player = 0;
      this.setTimelineMarkerState("player", "charging");
      this.updateTimelineMarkers();

      if (await this.resolveEnemyOutcome()) return;
      await this.resolveCombatantStatusTick(this.player, this.hero);
      if (this.player.hp <= 0) return this.finishBattle(false);
      if (await this.resolveEnemyOutcome()) return;

      this.advanceCooldowns();
      this.player.chakra = Math.min(this.player.maxChakra, this.player.chakra + 8);
      this.round += 1;
    } else {
      await this.executeEnemyAction(action);
      if (this.player.guarding) this.clearGuard();
      this.pendingActions.enemy = null;
      this.timelineProgress.enemy = 0;
      this.setTimelineMarkerState("enemy", "charging");
      this.updateTimelineMarkers();

      if (this.player.hp <= 0) return this.finishBattle(false);
      await this.resolveCombatantStatusTick(this.enemy, this.foe);
      if (await this.resolveEnemyOutcome()) return;
    }

    this.refreshHud();
    if (this.finished) return;
    this.busy = false;
    this.timelinePaused = false;
    this.startTurnCharge();
  }

  async resolveEnemyOutcome() {
    const profile = this.encounters[this.enemyIndex];
    if (this.enemy.hp <= 0) {
      this.clearPreparationFeedback("enemy");
      this.recordEnemyObservation({ defeated: true });
      if (this.mission.type === "route-combat") {
        this.defeatedEncounters += 1;
        this.saveData = writeSave(resolveDoctorMissionCombat(this.saveData));
        battleRuntime.activeSave = this.saveData;
        this.finished = true;
        this.busy = false;
        this.setMessage("El paso queda libre. La búsqueda de Haru continúa.", "#79e8b5");
        this.stopFighterFlash(this.foe);
        this.tweens.add({ targets: [...this.foe.targets, this.foe.shadow], alpha: 0, duration: 620 });
        await this.delay(700);
        this.scene.start("travel", { direction: "toDoctorRoute" });
        return true;
      }
      // Las recompensas se calculan para informar al jugador, pero no se
      // incorporan al guardado hasta completar toda la misión.
      const reward = awardEncounter(this.rewardPreviewSave, this.enemyIndex);
      this.rewardPreviewSave = reward.save;
      this.pendingEncounterRewards.push(this.enemyIndex);
      this.lastReward = reward;
      this.defeatedEncounters += 1;
      this.battleRewards = addBattleReward(this.battleRewards, reward);
      if (this.enemyIndex === this.encounters.length - 1) {
        if (this.combatFeatures.relicDecision) await this.playRelicDrop();
        if (this.combatFeatures.postCombatChoice) await this.playHideoutDiscoveryChoice();
        this.pendingEncounterRewards.forEach((encounterIndex) => {
          this.saveData = awardEncounter(this.saveData, encounterIndex).save;
        });
        const completion = completeMission(this.saveData, this.mission.id);
        this.saveData = writeSave(completion.save);
        battleRuntime.activeSave = this.saveData;
        this.missionReward = completion;
        this.battleRewards = addBattleReward(this.battleRewards, completion);
        await this.finishBattle(true);
      } else {
        const investigationStep = missionStep(this.mission, "investigation");
        const choiceStep = missionStep(this.mission, "choice");
        const resourceStep = missionStep(this.mission, "resource");
        const interlude = investigationStep?.afterEncounter === this.enemyIndex
          ? () => this.playInvestigationPhase()
          : choiceStep?.afterEncounter === this.enemyIndex
            ? () => this.playPrisonerChoice()
            : resourceStep?.afterEncounter === "each"
              ? () => this.playResourceChoice()
              : null;
        await this.advanceEncounter(interlude);
      }
      return true;
    }

    if (profile.boss && this.enemy.phase === 1 && this.enemy.hp <= this.enemy.maxHp / 2) {
      await this.triggerBossPhaseTwo();
    }
    return false;
  }

  async advanceEncounter(interlude = null) {
    const restoreHud = this.accessibleHud?.suspend?.();
    try {
      const defeatedName = this.encounters[this.enemyIndex].name;
      const levelNote = this.lastReward?.levelsGained ? ` · ¡Nivel +${this.lastReward.levelsGained}!` : "";
      this.setMessage(`${defeatedName} derrotado · +${this.lastReward.xp} PX · +${this.lastReward.affinityXp} PX de afinidad · +${this.lastReward.coins} monedas${levelNote}`, "#79e8b5");
      this.stopFighterFlash(this.foe);
      this.tweens.add({ targets: [...this.foe.targets, this.foe.shadow], alpha: 0, x: "+=70", duration: 480 });
      await this.delay(560);
      this.clearBossPhaseSilhouette?.();
      destroyFighter(this.foe);

      if (interlude) await interlude();

      this.enemyIndex += 1;
      const profile = this.encounters[this.enemyIndex];
      await this.playEncounterTransition(profile);
      this.enemy = this.createEnemyState(profile);
      this.recordEnemyObservation({ encounter: true });
      this.enemyName.setText(profile.name);
      this.enemyRankNumber.setText(`NV ${this.enemyRankForProfile(profile)}`);
      this.foe = createPlayerFighter(this, 810, 372, this.enemyAppearance(), true);
      this.styleFighterGrounding(this.foe);
      this.foe.targets.forEach((target) => target.setAlpha(0));
      this.foe.shadow.setAlpha(0);
      this.tweens.add({ targets: this.foe.targets, x: "-=70", alpha: 1, duration: 520, ease: "Cubic.out" });
      this.tweens.add({ targets: this.foe.shadow, x: "-=70", alpha: 0.4, duration: 520, ease: "Cubic.out" });

      const recovery = this.nextRecovery || { hp: 35, chakra: 25, clearStatuses: true };
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + recovery.hp);
      this.player.chakra = Math.min(this.player.maxChakra, this.player.chakra + recovery.chakra);
      if (recovery.clearStatuses) this.player.statuses = [];
      this.nextRecovery = null;
      this.clearGuard();
      Object.keys(this.cooldowns).forEach((id) => { this.cooldowns[id] = 0; });
      this.round += 1;
      this.refreshHud();
      await this.delay(620);
      await this.resetTurnTimeline();
      const tutorialMessages = [
        "Observa la barra de velocidad: cada marcador avanza según la velocidad del combatiente; al 80 % se puede elegir una acción.",
        "Prueba Guardia para reducir el próximo impacto y recuperar chakra.",
        "Combina lo aprendido: lee el ritmo, administra chakra y usa una técnica elemental."
      ];
      this.setMessage(this.combatFeatures.tutorial ? tutorialMessages[this.enemyIndex] : `Encuentro ${this.enemyIndex + 1}/${this.encounters.length}: ${profile.name}.`);
      this.startTurnCharge();
    } finally {
      restoreHud?.();
    }
  }

  async playBattleChoice(title, description, choices) {
    const restoreHud = this.accessibleHud?.suspend?.();
    try {
      const layer = [];
      const add = (item) => { layer.push(item); return item; };
      add(this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x020914, 0.9).setOrigin(0).setDepth(80));
      add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, 690, 330, 0x031220, 0.98).setStrokeStyle(1.5, 0x55c9ff, 0.85).setDepth(81));
      add(this.add.rectangle(135, 105, 5, 330, 0x3fcaff, 1).setOrigin(0, 0).setDepth(82));
      add(this.add.text(WIDTH / 2, 135, title, this.textStyle(18, "#83d8ff", "800", true)).setOrigin(0.5).setDepth(83));
      add(this.add.text(WIDTH / 2, 185, description, { ...this.textStyle(14, "#e9f1f6", "700"), align: "center", wordWrap: { width: 570 }, lineSpacing: 5 }).setOrigin(0.5).setDepth(83));
      const spacing = 250;
      const startX = WIDTH / 2 - ((choices.length - 1) * spacing) / 2;
      const value = await new Promise((resolve) => choices.forEach((choice, index) => {
        const x = startX + index * spacing;
        const button = add(this.add.rectangle(x, 340, 220, 92, choice.primary ? 0x174d65 : 0x0b2638, 1).setStrokeStyle(1.5, choice.primary ? 0xf0b85c : 0x55c9ff, 0.9).setInteractive({ useHandCursor: true }).setDepth(83));
        add(this.add.text(x, 325, choice.label, this.textStyle(12, "#f4f0e8", "800", true)).setOrigin(0.5).setDepth(84));
        add(this.add.text(x, 354, choice.detail, { ...this.textStyle(10, "#adc0cc", "700"), align: "center", wordWrap: { width: 185 } }).setOrigin(0.5).setDepth(84));
        button.on("pointerover", () => button.setFillStyle(0x17638d, 1));
        button.on("pointerout", () => button.setFillStyle(choice.primary ? 0x174d65 : 0x0b2638, 1));
        button.once("pointerup", () => resolve(choice.value));
      }));
      await this.tween({ targets: layer, alpha: 0, duration: 180 });
      layer.forEach((item) => item.destroy());
      return value;
    } finally {
      restoreHud?.();
    }
  }

  missionSceneText(sceneId, variables = {}) {
    return getMissionSceneDialogue(this.mission.id, sceneId, { save: this.saveData, variables })
      .map((line) => line.text)
      .join("\n\n");
  }

  async playMissionOneTutorial() {
    const masterName = masterIdForCharacter(this.saveData.character) === "mei" ? "Mei Hayate" : "Daichi Kazan";
    await this.playBattleChoice("TUTORIAL DE COMBATE", this.missionSceneText("combat-tutorial", { master: masterName }), [
      { value: "continue", label: "COMENZAR ENTRENAMIENTO", detail: "Primer objetivo: elige Golpe veloz o una técnica elemental.", primary: true }
    ]);
    this.setMessage("Espera a alcanzar el 80 % y elige una acción. Las técnicas recorren el tramo final de preparación.", "#83d8ff");
  }

  async playResourceChoice() {
    const masterName = masterIdForCharacter(this.saveData.character) === "mei" ? "Mei Hayate" : "Daichi Kazan";
    const choices = [{ value: "conserve", label: "CONSERVAR", detail: "Recuperación menor; guardas los suministros." }];
    if (this.fieldSupplies > 0) choices.unshift({ value: "rest", label: "DESCANSAR", detail: `Recuperación amplia; consume 1 de ${this.fieldSupplies}.`, primary: true });
    const choice = await this.playBattleChoice("ADMINISTRACIÓN ENTRE DUELOS", this.missionSceneText("resource-choice", { master: masterName }), choices);
    if (choice === "rest") {
      this.fieldSupplies -= 1;
      this.nextRecovery = { hp: 70, chakra: 55, clearStatuses: true };
    } else this.nextRecovery = { hp: 10, chakra: 8, clearStatuses: false };
    this.saveData.campaign.hideoutSupplies = this.fieldSupplies;
    this.saveData = writeSave(this.saveData);
    battleRuntime.activeSave = this.saveData;
  }

  async playHideoutDiscoveryChoice() {
    const choiceStep = missionStep(this.mission, "choice");
    const choice = await this.playBattleChoice("EL CORAZÓN DE LA GUARIDA", this.missionSceneText(choiceStep?.sceneId || choiceStep?.id), [
      { value: "prisoners", label: "LIBERAR PRISIONEROS", detail: "Rescatas a los cautivos y obtienes sus testimonios.", primary: true },
      { value: "documents", label: "RECUPERAR DOCUMENTOS", detail: "La Biblioteca obtiene datos parciales sobre Raizen." }
    ]);
    this.saveData.campaign.hideoutDiscoveryChoice = choice;
    this.saveData = recordBestiaryObservation(this.saveData, "boss_raizen", { document: choice === "documents", vulnerability: "agua" });
    this.saveData = writeSave(this.saveData);
    battleRuntime.activeSave = this.saveData;
    const revelation = this.missionSceneText(choice === "documents" ? "revelation-documents" : "revelation-prisoners");
    await this.playBattleChoice("UNA ORGANIZACIÓN MAYOR", revelation, [
      { value: "continue", label: "REGISTRAR HALLAZGO", detail: "La información se añade al informe de la saga y desbloquea el enfrentamiento con Raizen.", primary: true }
    ]);
  }

  async playLieutenantIntervention() {
    await this.playBattleChoice("UNA DEUDA PENDIENTE", this.missionSceneText("lieutenant-intervention"), [
      { value: "continue", label: "ENFRENTAR A RAIZEN", detail: "La decisión tomada en la cantera altera el combate final.", primary: true }
    ]);
    this.floatLabel(this.foe.body.x, this.foe.body.y - 150, "−15 % VIDA", 0xf0b85c);
    this.refreshHud();
  }

  async playSecretWarehouse() {
    await this.playBattleChoice("ALMACÉN DE LOS CUERVOS", this.missionSceneText("secret-warehouse"), [
      { value: "continue", label: "ASEGURAR EL ALMACÉN", detail: `Bonificación de misión: +${this.mission.secretBonusCoins} monedas.`, primary: true }
    ]);
  }

  async playInvestigationPhase() {
    const restoreHud = this.accessibleHud?.suspend?.();
    try {
      const masterName = masterIdForCharacter(battleRuntime.activeSave.character) === "mei" ? "Mei Hayate" : "Daichi Kazan";
      const masterFile = masterIdForCharacter(battleRuntime.activeSave.character) === "mei" ? "mei-hayate.webp" : "daichi-kazan.webp";
      const regions = [
        { id: "cart", label: "CARRETA", labelX: 21, labelY: 67, clue: "Cuerdas con polvo de cantera", real: true, path: "M0 360 L115 335 L232 370 L360 407 L472 468 L575 512 L690 621 L654 706 L559 751 L420 748 L310 713 L205 678 L80 666 L0 620 Z" },
        { id: "house", label: "CASA INCENDIADA", labelX: 47, labelY: 38, clue: "Un mapa rasgado del desfiladero aparece entre las cenizas", real: true, path: "M420 273 L492 239 L554 154 L628 128 L784 133 L870 157 L927 194 L1041 220 L1083 268 L1035 302 L1024 438 L944 453 L849 439 L782 390 L721 349 L651 371 L610 329 L529 350 L469 320 Z" },
        { id: "tracks", label: "HUELLAS", labelX: 61, labelY: 80, clue: "Carga pesada rumbo al norte", real: true, path: "M965 941 L900 884 L951 824 L923 770 L965 716 L991 648 L1072 620 L1120 670 L1081 731 L1107 786 L1056 840 L1088 908 L1058 941 Z" },
        { id: "well", label: "POZO", labelX: 89, labelY: 64, clue: "El agua está limpia: nadie manipuló el pozo recientemente", real: false, path: "M1360 402 L1478 369 L1609 383 L1672 423 L1672 782 L1608 841 L1462 828 L1379 759 L1328 661 L1339 532 Z" },
        { id: "gate", label: "PUERTA DEL FINAL", labelX: 75, labelY: 42, clue: "Las marcas de la puerta son antiguas y no pertenecen a los bandidos", real: false, path: "M1123 303 L1191 278 L1316 284 L1372 323 L1379 456 L1326 500 L1214 489 L1138 451 Z" }
      ];
      const realClueCount = regions.filter((entry) => entry.real).length;
      const found = new Set();
      const examined = new Set();
      const overlay = document.createElement("section");
      overlay.className = "mission-investigation-overlay";
      overlay.setAttribute("aria-label", "Fase 2 de investigación");
      overlay.innerHTML = `<img class="mission-investigation-background" src="assets/locations/kagemori.webp?v=0.63.0" alt="Aldea de Kagemori incendiada"><div class="mission-investigation-shade"></div><header class="mission-investigation-header"><p>FASE 2 · INVESTIGACIÓN</p><h2>Reconstruye la ruta de los bandidos</h2><strong data-mission-clue-count>0/${realClueCount} pistas reales</strong></header><p class="mission-investigation-log" data-mission-investigation-log>Examina la casa, la carreta, las huellas, el pozo y la puerta.</p><svg class="mission-investigation-hotspots" viewBox="0 0 1672 941" preserveAspectRatio="none" aria-label="Áreas de investigación">${regions.map((entry) => `<g class="mission-investigation-region" data-investigation-region="${entry.id}" role="button" tabindex="0" aria-label="Investigar ${entry.label}"><path d="${entry.path}"/></g>`).join("")}</svg>${regions.map((entry) => `<span class="mission-investigation-label" data-investigation-label="${entry.id}" style="--label-x:${entry.labelX}%;--label-y:${entry.labelY}%"><strong>${entry.label}</strong></span>`).join("")}<img class="mission-investigation-master" src="assets/npcs/${masterFile}" alt="${masterName}"><button class="mission-investigation-continue" type="button" disabled data-mission-investigation-continue>REÚNE ${realClueCount} PISTAS</button>`;
      const container = this.game.canvas.parentElement;
      const canvas = this.game.canvas;
      const previousCanvasVisibility = canvas?.style.visibility || "";
      container.append(overlay);
      if (canvas) canvas.style.visibility = "hidden";
      this.game.loop.sleep();

      try {
        const clueText = overlay.querySelector("[data-mission-investigation-log]");
        const clueCount = overlay.querySelector("[data-mission-clue-count]");
        const continueButton = overlay.querySelector("[data-mission-investigation-continue]");
        regions.forEach((entry) => {
          const marker = overlay.querySelector(`[data-investigation-region="${entry.id}"]`);
          const label = overlay.querySelector(`[data-investigation-label="${entry.id}"]`);
          const showLabel = () => label?.classList.add("visible");
          const hideLabel = () => { if (!examined.has(entry.id)) label?.classList.remove("visible"); };
          const inspect = () => {
            if (examined.has(entry.id)) return;
            examined.add(entry.id);
            label?.classList.add("visible");
            marker?.classList.add(entry.real ? "found" : "discarded");
          if (!entry.real) {
              if (label) label.querySelector("strong").textContent = `${entry.label} · SIN PISTA`;
              clueText.textContent = `${entry.clue} · Sigue investigando.`;
            return;
          }
            found.add(entry.id);
            if (label) label.querySelector("strong").textContent = `✓ ${entry.label}`;
            clueCount.textContent = `${found.size}/${realClueCount} pistas reales`;
            clueText.textContent = `${entry.clue} · ${found.size}/${realClueCount} pistas reales`;
          if (found.size === realClueCount) {
              clueText.textContent = this.missionSceneText("investigation-complete", { master: masterName });
              continueButton.disabled = false;
              continueButton.textContent = "SEGUIR EL RASTRO";
          }
          };
          marker?.addEventListener("mouseenter", showLabel);
          marker?.addEventListener("mouseleave", hideLabel);
          marker?.addEventListener("focus", showLabel);
          marker?.addEventListener("blur", hideLabel);
          marker?.addEventListener("click", inspect);
          marker?.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            inspect();
          });
        });
        await new Promise((resolve) => continueButton.addEventListener("click", () => {
          if (found.size === realClueCount) resolve();
        }, { once: true }));
        overlay.classList.add("leaving");
        await new Promise((resolve) => window.setTimeout(resolve, 220));
      } finally {
        overlay.remove();
        if (canvas) canvas.style.visibility = previousCanvasVisibility;
        this.game.loop.wake();
      }
    } finally {
      restoreHud?.();
    }
  }

  async playPrisonerChoice() {
    const restoreHud = this.accessibleHud?.suspend?.();
    try {
      const layer = [];
      const add = (item) => { layer.push(item); return item; };
      add(this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x020914, 0.88).setOrigin(0).setDepth(70));
      add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, 620, 330, 0x031220, 0.98).setStrokeStyle(1.5, 0x55c9ff, 0.85).setDepth(71));
      add(this.add.rectangle(168, 105, 4, 330, 0x3fcaff, 1).setOrigin(0, 0).setDepth(72));
      add(this.add.text(WIDTH / 2, 132, "DECISIÓN DE MISIÓN", this.textStyle(18, "#83d8ff", "800", true)).setOrigin(0.5).setDepth(73));
      add(this.add.text(WIDTH / 2, 180, this.missionSceneText("prisoner-choice"), { ...this.textStyle(16, "#f4f0e8", "700"), align: "center", lineSpacing: 8 }).setOrigin(0.5).setDepth(73));
      add(this.add.text(330, 250, "INTERROGAR Y PERDONAR\n+ Entrada secreta y monedas ×2\n− Escapa y refuerza a Akumori", { ...this.textStyle(12, "#caffea", "700"), align: "center", lineSpacing: 4 }).setOrigin(0.5).setDepth(73));
      add(this.add.text(630, 250, "ELIMINAR\n+ Akumori no recibe refuerzos\n− Sin entrada secreta ni aliado futuro", { ...this.textStyle(12, "#ffd0c8", "700"), align: "center", lineSpacing: 4 }).setOrigin(0.5).setDepth(73));
      const makeChoice = (x, label, color, value) => {
        const bg = add(this.add.rectangle(x, 350, 220, 44, 0x0d2638, 1).setStrokeStyle(1.5, color, 1).setInteractive({ useHandCursor: true }).setDepth(73));
        add(this.add.text(x, 350, label, this.textStyle(12, "#f4f8fb", "800", true)).setOrigin(0.5).setDepth(74));
        return { bg, value };
      };
      const choices = [makeChoice(330, "INTERROGAR", 0x79e8b5, "interrogate"), makeChoice(630, "ELIMINAR", 0xef6b72, "eliminate")];
      const choice = await new Promise((resolve) => choices.forEach(({ bg, value }) => bg.once("pointerup", () => resolve(value))));
      this.saveData.campaign.banditPrisonerChoice = choice;
      choices.forEach(({ bg }) => bg.disableInteractive());
      const response = add(this.add.text(WIDTH / 2, 414, this.missionSceneText(choice === "interrogate" ? "prisoner-interrogate" : "prisoner-eliminate"), this.textStyle(12, choice === "interrogate" ? "#f0ca80" : "#d9e6ef", "800")).setOrigin(0.5).setDepth(74));
      await this.delay(1100);
      await this.tween({ targets: layer, alpha: 0, duration: 260, ease: "Sine.in" });
      layer.forEach((item) => item.destroy());
      return response;
    } finally {
      restoreHud?.();
    }
  }

  async playRelicDrop() {
    const restoreHud = this.accessibleHud?.suspend?.();
    try {
      const shade = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x020914, 0.72).setOrigin(0).setDepth(70).setAlpha(0);
      const relic = this.add.circle(WIDTH / 2, 245, 42, 0x17111f, 1).setStrokeStyle(4, 0xf0b85c, 0.95).setDepth(72).setScale(0.2);
      const mark = this.add.text(WIDTH / 2, 245, "◆", this.textStyle(30, "#f0b85c", "800", true)).setOrigin(0.5).setDepth(73).setAlpha(0);
      const title = this.add.text(WIDTH / 2, 320, "OBJETO OBTENIDO", this.textStyle(12, "#83d8ff", "800", true)).setOrigin(0.5).setDepth(73).setAlpha(0);
      const name = this.add.text(WIDTH / 2, 350, String(this.mission.relic || "MAPA CIFRADO").toUpperCase(), this.textStyle(19, "#f4f0e8", "800", true)).setOrigin(0.5).setDepth(73).setAlpha(0);
      await this.tween({ targets: shade, alpha: 1, duration: 180 });
      await this.tween({ targets: relic, scale: 1, duration: 420, ease: "Back.out" });
      await this.tween({ targets: [mark, title, name], alpha: 1, duration: 280 });
      await this.delay(1100);
      await this.tween({ targets: [shade, relic, mark, title, name], alpha: 0, duration: 260 });
      [shade, relic, mark, title, name].forEach((item) => item.destroy());
    } finally {
      restoreHud?.();
    }
  }

  async playEncounterTransition(profile) {
    const restoreHud = this.accessibleHud?.suspend?.();
    try {
      const backdrop = this.add.image(WIDTH / 2 + 22, HEIGHT / 2, "forest-road").setDisplaySize(WIDTH + 88, HEIGHT + 50).setDepth(70).setAlpha(0);
      const shade = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x06130d, 0.38).setOrigin(0).setDepth(71).setAlpha(0);
      const foreground = this.add.image(WIDTH / 2 + 62, HEIGHT / 2, "village-outskirts-branches")
        .setDisplaySize(WIDTH + 165, HEIGHT + 92).setDepth(75).setAlpha(0);
      const chapter = this.add.text(WIDTH / 2, HEIGHT / 2 - 16, `RUMBO AL ENCUENTRO ${this.enemyIndex + 1} DE ${this.encounters.length}`, this.textStyle(18, "#f5edd8", "800", true)).setOrigin(0.5).setDepth(77).setAlpha(0);
      const title = this.add.text(WIDTH / 2, HEIGHT / 2 + 20, profile.boss ? "El cabecilla bloquea el camino" : "Las huellas continúan", this.textStyle(13, "#bcd4c1", "700")).setOrigin(0.5).setDepth(77).setAlpha(0);
      const runner = createPlayerFighter(this, -90, 330, this.playerAppearance());
      runner.targets.forEach((target) => target.setDepth(74).setAlpha(0));
      runner.shadow.setDepth(73).setAlpha(0);
      startPlayerRunning(this, runner);
      await this.tween({ targets: [backdrop, shade, foreground, chapter, title, ...runner.targets, runner.shadow], alpha: 1, duration: 240, ease: "Sine.out" });
      await Promise.all([
        this.tween({ targets: runner.body, x: WIDTH + 90, duration: 1900, ease: "Linear" }),
        this.tween({ targets: runner.shadow, x: WIDTH + 90, duration: 1900, ease: "Linear" }),
        this.tween({ targets: backdrop, x: WIDTH / 2 - 22, duration: 1900, ease: "Linear" }),
        this.tween({ targets: foreground, x: WIDTH / 2 - 62, duration: 1900, ease: "Linear" }),
        this.tween({ targets: [chapter, title], alpha: 0, delay: 650, duration: 260, ease: "Sine.in" })
      ]);
      stopPlayerRunning(runner);
      await this.tween({ targets: [backdrop, shade, foreground], alpha: 0, duration: 240, ease: "Sine.in" });
      destroyFighter(runner);
      backdrop.destroy(); shade.destroy(); foreground.destroy(); chapter.destroy(); title.destroy();
    } finally {
      restoreHud?.();
    }
  }

  async triggerBossPhaseTwo() {
    const profile = this.encounters[this.enemyIndex];
    this.enemy.phase = 2;
    this.enemy.patternIndex = 0;
    this.enemy.baseSpeed += 3;
    this.enemy.speed = this.combatantSpeed(this.enemy);
    this.enemy.accuracy += 4;
    this.enemy.baseEvasion += 2;
    this.enemy.evasion = this.combatantEvasion(this.enemy);
    this.enemyName.setText(`${profile.name} · FASE II`);
    this.setMessage(bossPhaseMessage(this.mission), "#d6a5ff");
    this.showBossPhaseSilhouette(this.foe);
    this.screenFlash(220, 130, 55, 180);
    this.tone(95, 0.35);
    this.refreshHud();
    await this.delay(900);
  }

}

