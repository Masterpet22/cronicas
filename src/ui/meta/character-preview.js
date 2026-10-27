const PUPPET_PREVIEW_LAYERS = Object.freeze([
  { id: "pie_derecho", x: -175.526, y: 732.316, width: 146, height: 136 },
  { id: "brazo_izquierdo", asset: "brazo_derecho", x: 161.481, y: -174.474, width: 228, height: 290 },
  { id: "mano_derecha", x: -291.203, y: 251.237, width: 146, height: 187 },
  { id: "muslo_izquierdo", x: 117.315, y: 255.895, width: 264, height: 332 },
  { id: "torso", x: -41, y: -72.5, width: 372, height: 577 },
  { id: "muslo_derecho", x: -93.789, y: 261.869, width: 198, height: 351 },
  { id: "pie_izquierdo", x: 153.763, y: 715.421, width: 219, height: 132 },
  { id: "pierna_derecha", x: -140.026, y: 527.974, width: 157, height: 297 },
  { id: "pierna_izquierda", x: 151.263, y: 520.474, width: 254, height: 336 },
  { id: "brazo_derecho", asset: "brazo_izquierdo", x: -242.955, y: -164.184, width: 228, height: 321 },
  { id: "antebrazo_derecho", x: -315.639, y: 62.658, width: 126, height: 239 },
  { id: "antebrazo_izquierdo", x: 278.403, y: 24.447, width: 197, height: 239 },
  { id: "mano_izquierda", x: 355.423, y: 215.474, width: 115, height: 188 },
  { id: "cabeza", x: -10.737, y: -498.684, width: 260, height: 392 }
]);
const FEMALE_PUPPET_PREVIEW_LAYERS = Object.freeze([
  { id: "brazo_izquierdo", asset: "antebrazo_izquierdo", x: 137.717778, y: -155.855556, width: 184.8, height: 256.96 },
  { id: "antebrazo_izquierdo", asset: "brazo_izquierdo", x: 228.835556, y: 13.19, width: 165.44, height: 203.28 },
  { id: "mano_izquierda", x: 304.218889, y: 166.491111, width: 102.96, height: 165.44 },
  { id: "muslo_izquierdo", x: 69.366667, y: 227.555556, width: 166.32, height: 310.64 },
  { id: "pierna_izquierda", x: 80.96, y: 460.936667, width: 130.24, height: 220 },
  { id: "pie_izquierdo", x: 130.68, y: 613.31, width: 192.72, height: 157.52 },
  { id: "torso", x: -22, y: -56.32, width: 320.32, height: 542.08 },
  { id: "muslo_derecho", x: -87.894444, y: 231.515556, width: 175.12, height: 318.56 },
  { id: "pierna_derecha", x: -119.325556, y: 466.704444, width: 139.04, height: 220.88 },
  { id: "pie_derecho", x: -147.533333, y: 616.533333, width: 130.24, height: 147.84 },
  { id: "brazo_derecho", asset: "antebrazo_derecho", x: -186.5, y: -143.822222, width: 193.6, height: 274.56, restRotation: -12 },
  { id: "antebrazo_derecho", asset: "brazo_derecho", x: -235.77, y: 62.231111, width: 102.96, height: 212.08, restRotation: 6 },
  { id: "mano_derecha", x: -234.603333, y: 213.724444, width: 129.36, height: 167.2, restRotation: 4 },
  { id: "cabeza", x: -3.96, y: -443.06, width: 229.68, height: 345.84 }
]);
export function rasterCharacterPreviewMarkup(save, assetVersion, { backdrop = null } = {}) {
  const female = save.character.bodyType === "female";
  const puppetLayers = female ? FEMALE_PUPPET_PREVIEW_LAYERS : PUPPET_PREVIEW_LAYERS;
  const puppetRoot = female ? "woman_sprites" : "man_sprites";
  const hair = Number(save.character.hair) === 4
    ? { asset: "hair_coleta", x: female ? -46.43144 : -59, y: female ? -497.89808 : -561, width: female ? 344.96 : 392, height: female ? 276.32 : 314, version: "0.79.0" }
    : Number(save.character.hair) === 1
      ? { asset: "hair_corto", x: female ? -17.39144 : -26, y: female ? -521.65808 : -588, width: female ? 259.6 : 295, height: female ? 201.52 : 229, version: "0.101.0" }
      : null;
  const layer = ({ id, asset = id, x, y, width, height, restRotation = 0 }, index) => `<img class="puppet-preview-layer" src="assets/modular/${puppetRoot}/runtime/${asset}.png?v=${assetVersion}" alt="" width="${width}" height="${height}" draggable="false" style="--puppet-x:${((550 + x) / 11).toFixed(3)}%;--puppet-y:${((800 + y) / 16).toFixed(3)}%;--puppet-w:${(width / 11).toFixed(3)}%;--puppet-h:${(height / 16).toFixed(3)}%;--puppet-z:${index};--puppet-rotation:${restRotation}deg">`;
  const hairLayer = hair ? `<img class="puppet-preview-layer puppet-preview-hair" src="assets/modular/hair/${hair.asset}.png?v=${hair.version}" alt="" width="${hair.width}" height="${hair.height}" draggable="false" style="--puppet-x:${((550 + hair.x) / 11).toFixed(3)}%;--puppet-y:${((800 + hair.y) / 16).toFixed(3)}%;--puppet-w:${(hair.width / 11).toFixed(3)}%;--puppet-h:${(hair.height / 16).toFixed(3)}%;--puppet-z:${puppetLayers.length}">` : "";
  return `<div class="raster-character-stage" role="img" aria-label="Marioneta del combatiente usada en combate">${backdrop ?? '<div class="raster-character-aura" aria-hidden="true"></div>'}<div class="puppet-preview-rig">${puppetLayers.map(layer).join("")}${hairLayer}</div></div>`;
}

