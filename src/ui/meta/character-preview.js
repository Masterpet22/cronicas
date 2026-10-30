import { CHARACTER_RIGS, characterHairConfig } from "../../character-rigs.js?v=0.115.0";

export function rasterCharacterPreviewMarkup(save, assetVersion, { backdrop = null } = {}) {
  const female = save.character.bodyType === "female";
  const puppetLayers = CHARACTER_RIGS[female ? "female" : "male"].layers;
  const puppetRoot = female ? "woman_sprites" : "man_sprites";
  const rig = CHARACTER_RIGS[female ? "female" : "male"];
  const display = rig.preview;
  const hairBase = characterHairConfig(female ? "female" : "male", Number(save.character.hair));
  const hair = hairBase ? {
    ...hairBase,
    x: display.x + (hairBase.x + rig.joints.neck.x) * display.scale,
    y: display.y + (hairBase.y + rig.joints.neck.y) * display.scale,
    width: hairBase.width * display.scale,
    height: hairBase.height * display.scale,
    asset: `hair_${hairBase.id}`,
    version: hairBase.id === "corto" ? "0.101.0" : "0.79.0"
  } : null;
  const layer = ({ id, assetId: asset = id, x, y, width, height, scaleX = 1, scaleY = scaleX, restRotation = 0 }, index) => {
    const displayX = display.x + x * display.scale;
    const displayY = display.y + y * display.scale;
    const displayWidth = width * scaleX * display.scale;
    const displayHeight = height * scaleY * display.scale;
    return `<img class="puppet-preview-layer" src="assets/modular/${puppetRoot}/runtime/${asset}.png?v=${assetVersion}" alt="" width="${displayWidth}" height="${displayHeight}" draggable="false" style="--puppet-x:${((550 + displayX) / 11).toFixed(3)}%;--puppet-y:${((800 + displayY) / 16).toFixed(3)}%;--puppet-w:${(displayWidth / 11).toFixed(3)}%;--puppet-h:${(displayHeight / 16).toFixed(3)}%;--puppet-z:${index};--puppet-rotation:${restRotation}deg">`;
  };
  const hairLayer = hair ? `<img class="puppet-preview-layer puppet-preview-hair" src="assets/modular/hair/${hair.asset}.png?v=${hair.version}" alt="" width="${hair.width}" height="${hair.height}" draggable="false" style="--puppet-x:${((550 + hair.x) / 11).toFixed(3)}%;--puppet-y:${((800 + hair.y) / 16).toFixed(3)}%;--puppet-w:${(hair.width / 11).toFixed(3)}%;--puppet-h:${(hair.height / 16).toFixed(3)}%;--puppet-z:${puppetLayers.length}">` : "";
  return `<div class="raster-character-stage" role="img" aria-label="Marioneta del combatiente usada en combate">${backdrop ?? '<div class="raster-character-aura" aria-hidden="true"></div>'}<div class="puppet-preview-rig">${puppetLayers.map(layer).join("")}${hairLayer}</div></div>`;
}

