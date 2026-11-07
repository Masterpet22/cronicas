import { isBaseOutfitPart, baseOutfitAsset } from "../../base-outfit.js?v=0.140.0";
import { ensureSkinToneFilters, normalizeSkinTone } from "../../skin-tones.js?v=0.135.0";
import { CHARACTER_FACES, CHARACTER_RIGS, characterHairConfig } from "../../character-rigs.js?v=0.149.0";

export function rasterCharacterPreviewMarkup(save, assetVersion, { backdrop = null } = {}) {
  ensureSkinToneFilters();
  const selectedTone = normalizeSkinTone(save.character.skinTone);
  const female = save.character.bodyType === "female";
  const puppetLayers = CHARACTER_RIGS[female ? "female" : "male"].layers;
  const puppetRoot = female ? "woman_sprites" : "man_sprites";
  const rig = CHARACTER_RIGS[female ? "female" : "male"];
  const display = rig.preview;
  const face = CHARACTER_FACES[Number(save.character.face) || 1] || CHARACTER_FACES[1];
  const hairBase = characterHairConfig(female ? "female" : "male", Number(save.character.hair));
  const projectHairLayer = (source, asset) => source ? {
    ...source,
    x: display.x + (source.x + rig.joints.neck.x) * display.scale,
    y: display.y + (source.y + rig.joints.neck.y) * display.scale,
    width: source.width * display.scale,
    height: source.height * display.scale,
    asset,
    version: hairBase.id === "corto" ? "0.137.0" : "0.141.0"
  } : null;
  const hair = hairBase ? projectHairLayer(hairBase, `hair_${hairBase.id}`) : null;
  const tail = hairBase?.tail ? projectHairLayer(hairBase.tail, `tail_${hairBase.id}`) : null;
  const layer = ({ id, assetId: asset = id, x, y, width, height, scaleX = 1, scaleY = scaleX, restRotation = 0 }, index) => {
    const displayX = display.x + x * display.scale;
    const displayY = display.y + y * display.scale;
    const displayWidth = width * scaleX * display.scale;
    const displayHeight = height * scaleY * display.scale;
    return `<img class="puppet-preview-layer ${isBaseOutfitPart(id) ? "puppet-preview-cloth" : "puppet-preview-skin"}" src="${isBaseOutfitPart(id) ? baseOutfitAsset(save.character.bodyType,id) : `assets/modular/${puppetRoot}/runtime/${asset}.png?v=${assetVersion}`}" alt="" width="${displayWidth}" height="${displayHeight}" draggable="false" style="--puppet-x:${((550 + displayX) / 11).toFixed(3)}%;--puppet-y:${((800 + displayY) / 16).toFixed(3)}%;--puppet-w:${(displayWidth / 11).toFixed(3)}%;--puppet-h:${(displayHeight / 16).toFixed(3)}%;--puppet-z:${index};--puppet-rotation:${restRotation}deg">`;
  };
  const hairLayer = hair ? `<img class="puppet-preview-layer puppet-preview-hair" src="assets/modular/hair/${hair.asset}.png?v=${hair.version}" alt="" width="${hair.width}" height="${hair.height}" draggable="false" style="--puppet-x:${((550 + hair.x) / 11).toFixed(3)}%;--puppet-y:${((800 + hair.y) / 16).toFixed(3)}%;--puppet-w:${(hair.width / 11).toFixed(3)}%;--puppet-h:${(hair.height / 16).toFixed(3)}%;--puppet-z:${puppetLayers.length + 1}">` : "";
  const tailLayer = tail ? `<img class="puppet-preview-layer puppet-preview-tail" src="assets/modular/hair/${tail.asset}.png?v=${tail.version}" alt="" width="${tail.width}" height="${tail.height}" draggable="false" style="--puppet-x:${((550 + tail.x) / 11).toFixed(3)}%;--puppet-y:${((800 + tail.y) / 16).toFixed(3)}%;--puppet-w:${(tail.width / 11).toFixed(3)}%;--puppet-h:${(tail.height / 16).toFixed(3)}%;--puppet-z:-1">` : "";
  const head = rig.byId.cabeza;
  const faceX = display.x + head.x * display.scale;
  const faceY = display.y + head.y * display.scale;
  const faceWidth = head.width * (head.scaleX || 1) * display.scale;
  const faceHeight = head.height * (head.scaleY || head.scaleX || 1) * display.scale;
  const faceLayer = `<img class="puppet-preview-layer puppet-preview-face" src="assets/modular/faces/male_${face.id}_${selectedTone}.png?v=${assetVersion}" alt="" width="${faceWidth}" height="${faceHeight}" draggable="false" style="--puppet-x:${((550 + faceX) / 11).toFixed(3)}%;--puppet-y:${((800 + faceY) / 16).toFixed(3)}%;--puppet-w:${(faceWidth / 11).toFixed(3)}%;--puppet-h:${(faceHeight / 16).toFixed(3)}%;--puppet-z:${puppetLayers.length};--puppet-rotation:${head.restRotation || 0}deg">`;
  return `<div class="raster-character-stage" data-skin-tone="${selectedTone}" style="--skin-tone-filter:url('#skin-tone-${selectedTone}')" role="img" aria-label="Combatiente con atuendo de entrenamiento, usado también en combate" data-base-outfit="training">${backdrop ?? '<div class="raster-character-aura" aria-hidden="true"></div>'}<div class="puppet-preview-rig">${tailLayer}${puppetLayers.map(layer).join("")}${faceLayer}${hairLayer}</div></div>`;
}

