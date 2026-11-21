import { TECHNIQUE_VFX, TECHNIQUE_VFX_FRAMES } from "./runtime.js?v=0.91.0";
import { rememberCombatTexture } from "./combat-textures.js?v=1.0.0";

export function queueTechniqueAnimations(scene, abilityIds) {
  Object.entries(TECHNIQUE_VFX).forEach(([jutsuId, effect]) => {
    if (!abilityIds.includes(jutsuId)) return;
    if (effect.creationFile) {
      [["creation", effect.creationFile], ["destruction", effect.destructionFile]].filter(([, file]) => file).forEach(([phase, file]) => {
        const phaseTexture = `technique-vfx-${jutsuId}-${phase}`;
        rememberCombatTexture(scene, phaseTexture, `${phaseTexture}-animation`);
        if (!scene.textures.exists(phaseTexture)) scene.load.spritesheet(phaseTexture, `assets/vfx/${file}?v=0.81.0`, {
          frameWidth: effect.frameWidth,
          frameHeight: effect.frameHeight,
          endFrame: effect.frames - 1
        });
      });
      if (effect.projectileFile) {
        const projectileTexture = `technique-vfx-${jutsuId}-projectile`;
        rememberCombatTexture(scene, projectileTexture);
        if (!scene.textures.exists(projectileTexture)) scene.load.image(projectileTexture, `assets/vfx/${effect.projectileFile}?v=0.81.0`);
      }
      return;
    }
    const texture = `technique-vfx-${jutsuId}`;
    rememberCombatTexture(scene, texture, `${texture}-animation`);
    if (scene.textures.exists(texture)) return;
    const source = `assets/vfx/${effect.file}?v=${effect.version || "0.81.0"}`;
    if (Number.isFinite(effect.sourceY)) scene.load.image(texture, source);
    else scene.load.spritesheet(texture, source, {
        frameWidth: effect.frameWidth,
        frameHeight: effect.frameHeight,
        endFrame: (effect.frames || TECHNIQUE_VFX_FRAMES) - 1
      });
  });
}

export function registerTechniqueAnimations(scene) {
  Object.entries(TECHNIQUE_VFX).forEach(([jutsuId, effect]) => {
    if (effect.creationFile) {
      ["creation", "destruction"].forEach((phase) => {
        const phaseTexture = `technique-vfx-${jutsuId}-${phase}`;
        const phaseAnimation = `${phaseTexture}-animation`;
        if (!scene.textures.exists(phaseTexture) || scene.anims.exists(phaseAnimation)) return;
        scene.anims.create({
          key: phaseAnimation,
          frames: scene.anims.generateFrameNumbers(phaseTexture, { start: 0, end: effect.frames - 1 }),
          frameRate: phase === "destruction" ? (effect.destructionFrameRate || effect.frameRate) : effect.frameRate,
          repeat: 0,
          hideOnComplete: phase === "destruction"
        });
      });
      return;
    }
    const texture = `technique-vfx-${jutsuId}`;
    const animation = `${texture}-animation`;
    if (!scene.textures.exists(texture) || scene.anims.exists(animation)) return;
    if (Number.isFinite(effect.sourceY)) {
      const sheet = scene.textures.get(texture);
      Array.from({ length: effect.frames }, (_, index) => index).forEach((index) => {
        if (!sheet.has(index)) sheet.add(index, 0, index * effect.frameWidth, effect.sourceY, effect.frameWidth, effect.frameHeight);
      });
    }
    scene.anims.create({
      key: animation,
      frames: scene.anims.generateFrameNumbers(texture, { start: 0, end: (effect.frames || TECHNIQUE_VFX_FRAMES) - 1 }),
      frameRate: effect.frameRate,
      repeat: 0,
      hideOnComplete: !effect.projectile
    });
  });
}
