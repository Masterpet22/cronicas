import { GroupTrainingBattleScene } from "./group-training-battle-scene.js?v=0.178.0";
import { BattleFeedbackMethods } from "./battle-feedback.js?v=0.171.0";
import { battleRuntime } from "../runtime.js?v=0.91.0";
import { hairTextureKey, createPlayerFighter, queuePlayerFighterTextures, destroyFighter, startPlayerBreathing, stopPlayerBreathing, startPlayerPreparing, stopPlayerPreparing, fighterAtlasKey, fighterCombatPortraitLayout, useFighterTextureRendering } from "../../fighters.js?v=0.171.0";
import { COMBAT_SLOTS, enemyFormation } from "../combat-positions.js?v=0.153.0";
import { createEnemyState } from "../enemy-state.js?v=0.155.0";
import { COMPANIONS, companionDecision } from "../../kurogane.js";
import { KUROGANE_OUTCOMES, COMPANION_REACTIONS } from "../../content/sagas/hermanos-kurogane/saga.js";
import { awardEncounter, completeMission, recordBestiaryObservation, writeSave } from "../../save.js?v=0.171.0";
import { addBattleReward } from "../rewards.js?v=0.114.0";
import { stageVictory } from "../victory-transaction.js?v=0.95.0";
import { showRetryDialog, consumeRetry } from "../mission-retries.js?v=0.114.0";
import { countItem } from "../../inventory.js?v=0.171.0";
import { consumeBattleItem } from "../battle-inventory.js?v=0.171.0";
import { mountTrainingTargets, mountGroupTimeline } from "../training-targets.js?v=0.171.0";
import { ENEMY_ACTIONS } from "../../data.js?v=1.5.0";
import { HUD_ART } from "../hud-art.js?v=0.171.0";

const appearance = id => ({ bodyType: id === "akari" ? "female" : "male", hair: id === "akari" ? 4 : 1,
  skinTone: "medium", weapon: "kunai", clothColor: id === "akari" ? "#426c8c" : "#627847", accentColor: "#25344d" });

export class KuroganeBattleScene extends GroupTrainingBattleScene {
  preload() {
    super.preload();
    if (this.mission.groupCombat) {
      queuePlayerFighterTextures(this, appearance(this.saveData.campaign.kuroganeCompanion));
      if (this.mission.protectObjective && !this.textures.exists("document-crate")) this.load.image("document-crate", "assets/battle/document-crate.png?v=1.0.0");
    }
  }
  create() {
    this.groupFinishing = false; this.protagonistDuringAttack = null;
    this.companion = null; this.companionLabel = null; this.companionMarker = null;
    this.objective = null; this.objectiveLabel = null; this.waveIndex = 0; this.waveOffset = 0;
    this.bloodFury = false; this.enemyActionsTaken = 0; this.objectiveGuard = false; this.companionShield = false;
    super.create();
    if (!this.mission.groupCombat) return;
    this.refreshHud();
    this.setMessage("Elige un rival con toque o los controles de objetivo. Tu compañero tiene su propio turno. Guardia protege también los documentos cuando hay carga.");
  }
  createFighters() {
    if (!this.mission.groupCombat) return super.createFighters();
    this.allEncounters = [...this.encounters];
    this.encounters = this.allEncounters.slice(0, this.mission.waves?.[0] || this.allEncounters.length);
    super.createFighters();
    const id = this.saveData.campaign.kuroganeCompanion || "haruto", definition = COMPANIONS[id];
    const { x, y } = COMBAT_SLOTS.companion;
    const fighter = createPlayerFighter(this, x, y, appearance(id));
    fighter.body.setDepth(5.9); startPlayerBreathing(this, fighter);
    const level = this.saveData.progression.level;
    this.companion = { id, definition, fighter, progress: 0, pending: null, state: {
      hp: 100 + level * 6, maxHp: 100 + level * 6, chakra: 60, maxChakra: 60,
      criticalChance: 8, baseStrength: 3 + level, strengthModifier: 0, accuracy: 90,
      baseSpeed: id === "haruto" ? 13 : 11, speedModifier: 0, statuses: [], soak: null,
      recoveryInitiative: 0, strength: 3 + level, damageReduction: 0, baseEvasion: 8,
      luck: 3, affinities: [definition.affinity], primaryAffinity: definition.affinity
    } };
    this.companionHud = this.add.container(x, y + 72).setDepth(15);
    const panel = this.add.rectangle(0, 13, 124, 40, HUD_ART.inkDeep, .94).setStrokeStyle(1, 0x91b879);
    const name = this.add.text(0, 0, definition.name.split(" ")[0], this.textStyle(10, "#e6f5df", "700")).setOrigin(.5);
    const healthTrack = this.add.rectangle(-56, 14, 112, 12, 0x243426).setOrigin(0, .5);
    this.companionHealthFill = this.add.rectangle(-56, 14, 112, 12, 0x326b39).setOrigin(0, .5);
    this.companionHealthValue = this.add.text(0, 14, "", this.textStyle(10, "#ffffff", "700")).setOrigin(.5);
    this.companionLabel = this.add.text(0, 27, "", this.textStyle(9, "#b9e3f3", "700")).setOrigin(.5);
    this.companionHud.add([panel, name, healthTrack, this.companionHealthFill, this.companionHealthValue, this.companionLabel]);
    if (this.mission.protectObjective) {
      const slot = COMBAT_SLOTS.protect, hp = this.mission.protectObjective.health;
      this.objective = { hp, maxHp: hp };
      this.add.ellipse(slot.x, slot.y + 10, 64, 10, 0x000000, .3).setDepth(4);
      const body = this.add.image(slot.x, slot.y + 12, "document-crate").setOrigin(.5, 1).setDisplaySize(76, 63).setDepth(7).setName("protected-cargo");
      this.objective.fighter = { body, targets: [body] };
      this.add.rectangle(slot.x, slot.y + 24, 68, 10, 0x151a1d).setStrokeStyle(1, 0x5e574a).setDepth(15);
      this.objectiveHealthFill = this.add.rectangle(slot.x - 33, slot.y + 24, 66, 8, 0x48a65a).setOrigin(0, .5).setDepth(15).setName("cargo-health-fill");
      this.objectiveLabel = this.add.text(slot.x, slot.y + 24, "", this.textStyle(8, "#ffffff", "700")).setOrigin(.5).setDepth(16).setName("cargo-health-value");
    }
  }
  participants() {
    const units = super.participants();
    if (this.companion) units.push({ id: "companion", index: -1, alive: this.companion.state.hp > 0,
      speed: this.combatantSpeed(this.companion.state), progress: this.companion.progress, action: this.companion.pending, initiative: 0 });
    return units;
  }
  advanceAdditionalGroupProgress(from, progress, ratio) {
    if (this.companion && "companion" in progress) this.companion.progress = from.companion + (progress.companion - from.companion) * ratio;
  }
  createTurnTimeline() {
    super.createTurnTimeline();
    if (!this.mission.groupCombat) return;
    this.companionMarker = this.add.container(HUD_ART.timeline.start, HUD_ART.timeline.trackY + 12);
    const look = appearance(this.companion.id);
    const layout = fighterCombatPortraitLayout(look, false, 11);
    const halo = this.add.circle(0, 0, 12, HUD_ART.inkDeep).setStrokeStyle(1.2, 0x91b879);
    const head = this.add.image(layout.head.x, layout.head.y, fighterAtlasKey(look), "cabeza")
      .setDisplaySize(layout.head.width, layout.head.height);
    this.companionMarker.add([halo, head]);
    const hairKey = hairTextureKey(look.hair);
    if (layout.hair && this.textures.exists(hairKey)) {
      const hair = this.add.image(layout.hair.x, layout.hair.y, hairKey).setDisplaySize(layout.hair.width, layout.hair.height);
      this.companionMarker.add(useFighterTextureRendering(hair));
    }
    this.timelineLayer.add(this.companionMarker);
  }
  refreshHud() {
    // An enemy may be attacking the companion using the shared attack pipeline.
    // Keep the main portrait bound to the protagonist throughout that animation.
    const actingPlayer = this.player;
    if (this.protagonistDuringAttack) this.player = this.protagonistDuringAttack;
    try { super.refreshHud(); } finally { this.player = actingPlayer; }
    if (this.companionLabel && this.companion) {
      const { state } = this.companion;
      if (state.hp <= 0 && !this.companion.down) {
        this.companion.down = true; this.companion.pending = null;
        stopPlayerPreparing(this, this.companion.fighter, { immediate: true });
        stopPlayerBreathing(this.companion.fighter);
        this.stopFighterFlash(this.companion.fighter);
        this.companion.fighter.body.setAlpha(.3);
      }
      this.companionHealthFill.setDisplaySize(112 * Phaser.Math.Clamp(state.hp / state.maxHp, 0, 1), 12);
      this.companionHealthValue.setText(`${Math.max(0, state.hp)}/${state.maxHp} PV`);
      this.companionLabel.setText(state.hp <= 0 ? "Fuera de combate" : `${state.chakra}/${state.maxChakra} CH`);
    }
    if (this.objectiveLabel) {
      const hp = Math.max(0, this.objective.hp), ratio = Phaser.Math.Clamp(hp / this.objective.maxHp, 0, 1);
      this.objectiveLabel.setText(`${hp}/${this.objective.maxHp}`);
      this.objectiveHealthFill.setDisplaySize(66 * ratio, 8).setFillStyle(ratio > .3 ? 0x48a65a : 0xc45148);
    }
  }
  async handleGroupArrival(arrival) {
    if (arrival.id !== "companion") return super.handleGroupArrival(arrival);
    if (this.finished || this.busy || this.timelinePaused) return;
    const ally = this.companion;
    if (ally.state.hp <= 0) return this.runTurnTimeline();
    if (!ally.pending) {
      const decision = companionDecision(ally.id, ally.state, this.player, this.trainingTargets, this.objective);
      if (!decision) return;
      const ability = ENEMY_ACTIONS[decision.type === "barrier" ? "water_wall" : ally.id === "haruto" ? "wind_palm" : "water_bullet"];
      ally.pending = { ...decision, seals: decision.type === "strike" ? [] : [...ability.seals] };
      if (decision.type !== "strike") { startPlayerPreparing(this, ally.fighter); this.setMessage(`${ally.definition.name} prepara ${decision.type === "barrier" ? "Barrera de Agua" : ally.definition.technique}.`); return this.runTurnTimeline(); }
    }
    const action = ally.pending;
    const epoch = this.groupEpoch;
    const current = () => epoch === this.groupEpoch && !this.finished && this.scene.isActive();
    this.busy = true; this.timelinePaused = true; this.stopTurnTimeline();
    try {
      stopPlayerPreparing(this, ally.fighter);
      const stun = ally.state.statuses.find(status => status.type === "stun");
      if (stun) {
        ally.state.statuses = ally.state.statuses.filter(status => status !== stun);
        this.setMessage(`${ally.definition.name} está aturdido y pierde su acción.`);
        await this.delay(420); return;
      }
      if (action.type !== "strike") {
        const ability = ENEMY_ACTIONS[action.type === "barrier" ? "water_wall" : ally.id === "haruto" ? "wind_palm" : "water_bullet"];
        await this.playSeals({ ...ability, seals: [...ability.seals],
          name: action.type === "barrier" ? "Barrera de Agua" : ally.definition.technique }, { actor: "companion", fighter: ally.fighter });
        if (!current()) return;
      }
      ally.state.chakra -= action.cost;
      if (action.type === "barrier") {
        this.companionShield = true;
        if (this.objective) this.objective.hp = Math.min(this.objective.maxHp, this.objective.hp + 18);
        this.floatLabel(ally.fighter.body.x, ally.fighter.body.y - 100, "BARRERA DE AGUA", 0x75c9ef);
        this.setMessage("Akari protege al protagonista: el siguiente impacto se reduce a la mitad y refuerza los documentos.");
      } else {
        // Re-evaluate a target that fell while the companion prepared.
        let index = action.target;
        if (this.trainingTargets[index]?.state.hp <= 0) index = this.trainingTargets.findIndex(t => t.state.hp > 0);
        if (index >= 0) {
          const target = this.trainingTargets[index];
          const protagonist = this.player, hero = this.hero, previous = this.enemyIndex;
          this.protagonistDuringAttack = protagonist;
          this.player = ally.state; this.hero = ally.fighter; this.setGroupContext(index);
          const move = action.type === "strike" ? ENEMY_ACTIONS.strike : {
            ...ENEMY_ACTIONS[ally.id === "haruto" ? "wind_palm" : "water_bullet"],
            name: ally.id === "haruto" ? ally.definition.technique : "Pulso de Agua",
            damage: ally.id === "haruto" ? 25 : 17, seals: []
          };
          try { await this.combatantAttack("player", move); }
          finally { this.player = protagonist; this.hero = hero; this.protagonistDuringAttack = null; this.setGroupContext(previous); }
          if (!current()) return;
          if (ally.id === "akari" && action.type === "technique") target.progress = Math.max(0, target.progress - .15);
        }
      }
      ally.state.chakra = Math.min(ally.state.maxChakra, ally.state.chakra + 5);
      await this.resolveCombatantStatusTick(ally.state, ally.fighter);
      if (!current()) return;
      await this.delay(420);
      if (!current()) return;
      await this.retireGroupTargets();
      if (!current()) return;
      if (this.trainingTargets.every(t => t.state.hp <= 0)) return await this.finishBattle(true);
    } finally {
      ally.pending = null; ally.progress = 0;
      if (current()) { this.refreshHud(); this.busy = false; this.timelinePaused = false; this.startTurnCharge(); }
    }
  }
  recordEnemyObservation(observation) {
    if (!this.mission.groupCombat) return super.recordEnemyObservation(observation);
    const id = this.encounterIds[this.waveOffset + this.enemyIndex];
    this.saveData = writeSave(recordBestiaryObservation(this.saveData, id, observation));
    battleRuntime.activeSave = this.saveData;
  }
  loseHealth(target, fighter, amount, options) {
    if (this.mission.groupCombat && this.trainingTargets?.some(t => t.state === target && t.profile.bondRole === "protector") && amount >= target.maxHp * .18) this.bloodFury = true;
    if (this.mission.groupCombat && target === (this.protagonistDuringAttack || this.player) && this.companionShield && amount > 0) {
      amount = Math.ceil(amount / 2); this.companionShield = false;
    }
    return super.loseHealth(target, fighter, amount, options);
  }
  async playerGuard() {
    if (this.mission.groupCombat && this.objective) this.objectiveGuard = true;
    return super.playerGuard();
  }
  async executeEnemyAction(action) {
    if (!this.mission.groupCombat) return super.executeEnemyAction(action);
    if (this.enemy.statuses.some(status => status.type === "stun")) return super.executeEnemyAction(action);
    this.enemyActionsTaken++;
    if (this.objective && this.enemyActionsTaken % 3 === 0 && action.type !== "guard") {
      // Pay and close a real enemy action even when it targets the cargo.
      const { reserveEnemyAbility } = await import("../enemy-abilities.js?v=0.171.0");
      if (!reserveEnemyAbility(this.enemy, action)) return { skipped: true };
      const damage = this.objectiveGuard ? 6 : 12;
      this.objectiveGuard = false; this.loseHealth(this.objective, this.objective.fighter, damage, { react: false, yOffset: -50 });
      this.createImpact(COMBAT_SLOTS.protect.x, COMBAT_SLOTS.protect.y - 20, 0xf0b85c, .6);
      this.setMessage(`Atacan los documentos: −${damage} de integridad. Usa Guardia para cubrirlos.`);
      this.refreshHud(); await this.delay(450);
      if (this.objective.hp <= 0) await this.finishBattle(false);
      return;
    }
    const renji = this.trainingTargets.find(t => t.profile.bondRole === "protector" && t.state.hp > 0);
    const tatsu = this.trainingTargets.find(t => t.profile.bondRole === "avenger" && t.state.hp > 0);
    if (renji && tatsu && this.enemy === renji.state && action.type === "guard") {
      tatsu.state.guarding = true;
      this.floatLabel(tatsu.fighter.body.x, tatsu.fighter.body.y - 115, "VÍNCULO DE SANGRE", 0xf0b85c);
    }
    if (renji && tatsu && this.enemy === tatsu.state && this.bloodFury && action.type !== "guard") {
      this.bloodFury = false; action = { ...action, damage: (action.damage || 0) + 8 };
      this.floatLabel(tatsu.fighter.body.x, tatsu.fighter.body.y - 115, "FURIA DEL HERMANO", 0xf08b65);
    }
    const attackCompanion = this.companion.state.hp > 0 && this.enemyActionsTaken % 2 === 0;
    if (!attackCompanion) {
      const result = await super.executeEnemyAction(action);
      if (!result?.skipped && action.id === "fire_breath" && this.companion.state.hp > 0) {
        await this.loseHealth(this.companion.state, this.companion.fighter, 10).reaction;
        this.setMessage("El aliento de fuego alcanza también a tu compañero.");
      }
      return result;
    }
    const protagonist = this.player, hero = this.hero;
    this.protagonistDuringAttack = protagonist;
    this.player = this.companion.state; this.hero = this.companion.fighter;
    try {
      const result = await super.executeEnemyAction(action);
      if (!result?.skipped && action.id === "fire_breath") await this.loseHealth(protagonist, hero, 10).reaction;
    }
    finally {
      this.player = protagonist; this.hero = hero; this.protagonistDuringAttack = null;
      if (this.companion.state.hp <= 0) { this.companion.pending = null; this.companion.fighter.body.setAlpha(.3); }
      this.refreshHud();
    }
  }
  async finishBattle(won) {
    if (!this.mission.groupCombat) return super.finishBattle(won);
    if (this.finished || this.groupFinishing) return;
    this.groupFinishing = true;
    this.stopTurnTimeline(); this.timelinePaused = true; this.busy = true; this.turnReady = false;
    this.setButtonsEnabled(false);
    try {
      if (!won) {
        const choice = await showRetryDialog(this, this.freeRetries, countItem(this.saveData, "retry_scroll"));
        if (!choice) return;
        if (choice === "retry") {
          const remaining = consumeRetry(this.freeRetries);
          if (remaining === null && !consumeBattleItem(this, "retry_scroll").ok) return;
          if (remaining !== null) this.freeRetries = remaining;
          this.clearGuard();
          this.player = { ...this.player, hp: this.player.maxHp, chakra: this.player.maxChakra, statuses: [], soak: null, guarding: false, recoveryInitiative: 0 };
          this.defeatedEncounters = this.waveOffset;
          Object.assign(this.companion.state, { hp: this.companion.state.maxHp, chakra: this.companion.state.maxChakra, statuses: [], soak: null });
          this.companion.fighter.body.setAlpha(1); this.companion.down = false;
          startPlayerBreathing(this, this.companion.fighter);
          this.companion.progress = 0; this.companion.pending = null;
          if (this.objective) this.objective.hp = this.objective.maxHp;
          this.objectiveGuard = false; this.companionShield = false; this.bloodFury = false; this.enemyActionsTaken = 0;
          this.cooldowns = {}; this.pendingActions = { player: null, enemy: null }; this.timelineProgress = { player: 0, enemy: 0 };
          this.groupReservation = null;
          this.replaceGroupWave();
          return;
        }
        this.finished = true;
        this.scene.start("travel", { direction: "toVillage", result: this.abandonPayload() });
        return;
      }
      if (this.mission.waves && this.waveIndex < this.mission.waves.length - 1) {
        this.waveOffset += this.encounters.length; this.waveIndex++;
        await this.playBattleChoice("EL SANTUARIO", "Los guardianes caen. Renji se interpone ante Tatsu: «Esta vez lucharemos juntos». Conservas vida, chakra y consumibles para el enfrentamiento final.", [{ value: "continue", label: "ENFRENTAR A LOS HERMANOS", detail: "Dos enemigos con protección mutua.", primary: true }]);
        if (!this.scene.isActive()) return;
        this.encounters = this.allEncounters.slice(this.waveOffset, this.waveOffset + this.mission.waves[this.waveIndex]);
        this.groupReservation = null; this.pendingActions.player = null; this.timelineProgress.player = 0;
        this.replaceGroupWave();
        return;
      }
      const reaction = COMPANION_REACTIONS[this.companion.id][this.mission.sagaMissionNumber - 1];
      await this.playBattleChoice(this.mission.title, KUROGANE_OUTCOMES[this.mission.id], [{ value: "continue", label: "Registrar informe", detail: "Regresar a la aldea y confirmar los resultados.", primary: true }], { quote: { speaker: this.companion.definition.name, text: reaction } });
      if (!this.scene.isActive()) return;
      if (this.mission.sagaFinal) await this.playBattleChoice("UN SÍMBOLO DESCONOCIDO", "Entre los documentos aparece un símbolo parcialmente borrado.\n\n—¿Maestro, conoce este símbolo?\n—¿Dónde lo encontraste?\n—En el cargamento de los Kurogane.\n—Entonces las cosas son más graves de lo que pensaba. Todavía no estás preparado para esa respuesta.\n\nHaruto y Akari vuelven al Dojo: desde ahora puedes cambiar de compañero. Tu rango se conserva. La Arena de Combate acepta equipos desde el nivel 16; el siguiente arco abordará el ascenso.", [{ value: "continue", label: "VOLVER A LA ALDEA", detail: "Los hermanos permanecen bajo custodia.", primary: true }]);
      if (!this.scene.isActive()) return;
      const firstClear = !this.missionStartSave.campaign.completedMissions.includes(this.mission.id);
      for (let index = 0; index < this.encounterIds.length; index++) {
        const reward = awardEncounter(this.saveData, this.encounterIds[index], { firstClear, mission: this.mission, encounterIndex: index, encounterIds: this.encounterIds });
        this.saveData = reward.save; this.battleRewards = addBattleReward(this.battleRewards, reward);
      }
      this.missionReward = completeMission(this.saveData, this.mission.id);
      this.saveData = this.missionReward.save; this.battleRewards = addBattleReward(this.battleRewards, this.missionReward);
      this.defeatedEncounters = this.encounterIds.length;
      this.encounters = this.allEncounters;
      stageVictory(battleRuntime, this.saveData);
      await BattleFeedbackMethods.prototype.finishBattle.call(this, true);
    } finally {
      this.groupFinishing = false;
      if (!this.finished && this.scene.isActive()) { this.refreshHud(); this.busy = false; this.timelinePaused = false; this.startTurnCharge(); }
    }
  }
  replaceGroupWave() {
    this.targetControls?.destroy?.();
    this.trainingTargets.forEach(target => { stopPlayerPreparing(this, target.fighter, { immediate: true }); destroyFighter(target.fighter); });
    this.groupMarkers?.forEach(({ parts }) => parts.forEach(part => part.destroy()));
    const positions = enemyFormation(this.encounters.length);
    this.trainingTargets = positions.map((position, index) => {
      this.enemyIndex = index;
      const profile = this.encounters[index], state = createEnemyState(profile, this.mission);
      const fighter = this.createEnemyFighterAt(position);
      return { profile, state, position, fighter, progress: 0, pending: null, turns: 0, retired: false };
    });
    this.selectedTargetIndex = 0; this.setGroupContext(0);
    this.enemyRankNumber.setText(`NV ${this.encounters[0].level}`);
    // Timeline source parts are new because the previous group's markers were destroyed.
    this.enemyTurnMarker = this.add.image(HUD_ART.timeline.start, HUD_ART.timeline.trackY, this.playerTurnMarker.texture.key).setDisplaySize(18, 28);
    this.enemyMarkerHalo = this.add.circle(HUD_ART.timeline.start, HUD_ART.timeline.trackY, 12, 0x07101d, 1);
    this.timelineLayer.add([this.enemyTurnMarker, this.enemyMarkerHalo]);
    mountGroupTimeline(this); this.targetControls = mountTrainingTargets(this);
    this.refreshHud();
  }
  resultPayload(outcome) {
    const result = super.resultPayload(outcome);
    return this.mission.groupCombat ? { ...result, totalEncounters: this.encounterIds.length } : result;
  }
  async retireGroupTargets() {
    if (this.mission.groupCombat) this.trainingTargets?.forEach((target, index) => {
      if (target.state.hp > 0 || target.retired) return;
      const id = this.encounterIds[this.waveOffset + index];
      this.saveData = recordBestiaryObservation(this.saveData, id, { defeated: true });
      this.defeatedEncounters++;
    });
    return super.retireGroupTargets();
  }
}
