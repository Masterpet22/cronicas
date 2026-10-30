import { loadoutSlotsForLevel } from '../save.js?v=0.119.0';

// Derive presentation requirements from the game's existing loadout rule.
const SLOT_LEVELS = Array.from({ length: 4 }, (_, slot) =>
  Array.from({ length: 100 }, (_, level) => level + 1).find(level => loadoutSlotsForLevel(level) >= slot + 1));

// All measurements are in the existing 960 × 540 logical canvas. Scene scale,
// camera, fighters and timeline thresholds are deliberately independent of HUD art.
export const HUD_ART = Object.freeze({
  ink: 0x0a1429, inkDeep: 0x050c19, gold: 0xd7a857, light: 0xf2cb7b,
  wine: 0x58151d, health: 0x06d45a, chakra: 0x009fe9,
  text: "#f5e1af", muted: "#a59d91", font: '"Cinzel", Georgia, serif',
  skills: Object.freeze({ x: 20, y: 114, width: 140, rowHeight: 68, iconX: 69 }),
  timeline: Object.freeze({ x: 208, y: 466, width: 606, height: 51, start: 257, end: 790, trackY: 490 })
});

export function drawOrnatePanel(g, x, y, width, height, { fill = HUD_ART.ink, alpha = 0.94, radius = 15 } = {}) {
  g.fillStyle(0x01030a, 0.4).fillRoundedRect(x + 2, y + 3, width, height, radius);
  g.fillGradientStyle(fill, fill, HUD_ART.inkDeep, HUD_ART.inkDeep, alpha, alpha, alpha, alpha)
    .fillRoundedRect(x, y, width, height, radius);
  g.lineStyle(1.2, HUD_ART.gold, 1).strokeRoundedRect(x, y, width, height, radius);
  g.lineStyle(0.6, HUD_ART.gold, 0.45).strokeRoundedRect(x + 3, y + 3, width - 6, height - 6, Math.max(3, radius - 2));
  // Small inward facing scrolls at each corner, drawn as vectors rather than
  // stretching the old raster frame or downloading additional ornament images.
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + width, y, -1, 1], [x, y + height, 1, -1], [x + width, y + height, -1, -1]]) {
    g.lineStyle(1.3, HUD_ART.gold, 1).beginPath();
    g.moveTo(cx + sx * 2, cy + sy * 20);
    g.lineTo(cx + sx * 5, cy + sy * 8);
    g.lineTo(cx + sx * 15, cy + sy * 2);
    g.strokePath();
    g.strokeCircle(cx + sx * 7, cy + sy * 13, 3);
    g.strokeCircle(cx + sx * 13, cy + sy * 6, 2.5);
    g.fillStyle(HUD_ART.light, 1).fillCircle(cx + sx * 5, cy + sy * 5, 1.3);
  }
  return g;
}

export function emptySkillInfo(scene, index) {
  // The actual loadout unlocks its third/fourth slots at levels 5/8.
  // Empty unlocked slots are not fictional locked techniques.
  const required = SLOT_LEVELS[index - 1] || 1;
  const locked = scene.saveData.progression.level < required;
  return { name: locked ? "Ranura sellada" : "Sin técnica", requirement: locked ? `NV ${required}` : "DOJO", locked };
}
