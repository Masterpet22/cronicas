import { Phaser, TECHNIQUE_VFX } from "../../battle/runtime.js?v=0.91.0";
import { BattleActionMethods } from "../../battle/scenes/battle-actions.js?v=0.178.0";
import { BattleFeedbackMethods } from "../../battle/scenes/battle-feedback.js?v=0.171.0";
import { queueTechniqueAnimations, registerTechniqueAnimations } from "../../battle/technique-animations.js?v=1.0.0";
import { showElementalImpact } from "../../battle/elemental-effects.js?v=0.93.0";
import { enemyFighterAppearance, playerFighterAppearance } from "../../character.js?v=0.171.0";
import { createPlayerFighter, queuePlayerFighterTextures, stopPlayerBreathing } from "../../fighters.js?v=0.171.0";
import { ENEMY_ROSTER } from "../../data.js?v=1.5.0";

const WIDTH = 840;
const HEIGHT = 380;
const FLOOR_Y = 315;
const attack = BattleActionMethods.prototype;
const feedback = BattleFeedbackMethods.prototype;

export function mountTechniquePreview(parent, save, action, { onStart, onError, onEnd }) {
  const player = playerFighterAppearance(save);
  const dummy = enemyFighterAppearance(ENEMY_ROSTER.reed_bandit, "reed_bandit");
  let disposed = false;
  const fail = () => { if (!disposed) onError(); };

  class PreviewScene extends Phaser.Scene {
    preload() {
      queuePlayerFighterTextures(this, player);
      queuePlayerFighterTextures(this, dummy);
      queueTechniqueAnimations(this, [action.id]);
      this.load.once("loaderror", fail);
    }

    create() {
      if (disposed) return;
      this.perform().catch(fail);
    }

    async perform() {
      registerTechniqueAnimations(this);
      const animation = TECHNIQUE_VFX[action.id];
      const camera = this.cameras.main;
      if (animation?.position === "battlefield") camera.setZoom(.65).centerOn(WIDTH / 2, animation.y);
      else if (action.id === "earth_fist") camera.setZoom(.90).centerOn(WIDTH / 2, 255);
      else if (animation?.height > FLOOR_Y || animation?.width > 300) camera.setZoom(.85).centerOn(WIDTH / 2, 210);
      else camera.setZoom(1.25).centerOn(WIDTH / 2, 265);

      this.hero = createPlayerFighter(this, 220, FLOOR_Y, player);
      this.foe = createPlayerFighter(this, 570, FLOOR_Y, dummy, true);
      stopPlayerBreathing(this.foe);
      this.foe.layers.forEach(layer => layer.setTint(0xc89a60));
      const visuals = attack.attackVisuals(action, this.hero);
      const originX = this.hero.body.x;
      const shadowX = this.hero.shadow.x;

      onStart();
      await attack.playAttackPreparation.call(this, this.hero, this.foe, 1, visuals);
      if (disposed) return;
      if (visuals.usesWindBladeMultiHit) await this.playWindBladeEffect();
      else await attack.playAttackAnimation.call(this, action, "player", visuals);
      if (disposed) return;
      if (!animation) showElementalImpact(this, action, this.foe.body.x, this.foe.body.y - 26, action.cinematic ? 1.25 : 1);
      await attack.playAttackRecovery.call(this, this.hero, originX, shadowX, visuals);
      if (disposed) return;
      await this.delay(430);
      if (disposed) return;
      this.scene.pause();
      onEnd();
    }
  }

  Object.assign(PreviewScene.prototype, {
    playTechniqueEffect: attack.playTechniqueEffect,
    playFireEmbersProjectile: attack.playFireEmbersProjectile,
    playWaterShurikenProjectile: attack.playWaterShurikenProjectile,
    playEarthFistProjectile: attack.playEarthFistProjectile,
    playWindPalmProjectile: attack.playWindPalmProjectile,
    playWindBladeEffect: attack.playWindBladeEffect,
    playerHandPosition: attack.playerHandPosition,
    playerProjectileOrigin: attack.playerProjectileOrigin,
    delay: feedback.delay,
    tween: feedback.tween
  });

  const game = new Phaser.Game({
    type: Phaser.CANVAS, parent, width: WIDTH, height: HEIGHT, scene: PreviewScene,
    transparent: true, audio: { noAudio: true }, input: { keyboard: false, mouse: false, touch: false }
  });
  return () => {
    disposed = true;
    game.destroy(true);
  };
}
