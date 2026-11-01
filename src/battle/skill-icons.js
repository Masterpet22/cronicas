import { createCachedIconCanvas } from "./icon-canvas-cache.js?v=1.0.0";

export function paintBattleSkillArt(scene, art, action, { physical = false, index = 0 } = {}) {
  art.replaceChildren();
  if (physical && index > 0 && index < 5) {
    const weapon = action?.weaponId;
    const path = index === 2 ? "M12 2 14 8 22 12 16 14 12 22 10 16 2 12 8 10Z M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4"
      : index > 2 ? "M6 12V8a2 2 0 0 1 4 0V5a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v2a2 2 0 0 1 3 1v7l-4 5H8l-5-7a2 2 0 0 1 3-2Z"
        : weapon === "axe" ? "M7 22 16 2 M12 6C7 2 3 5 3 10c4 3 7 3 10 0m3-7c5 0 7 4 6 9-4 1-7-1-8-4"
          : ["kunai", "steel_kunai"].includes(weapon) ? "M5 20 12 13 15 4 22 2 20 9 12 13 M7 17l3 3 M3 23a2 2 0 1 0 0-4 2 2 0 0 0 0 4"
            : "M4 21 9 16 6 13 9 10 12 13 21 2 22 7 14 15 17 18 14 21 11 18 6 23Z";
    art.innerHTML = `<svg class="combat-physical-art" viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
    return;
  }
  const source = action?.iconTexture && scene.textures.get(action.iconTexture)?.getSourceImage();
  const tint = action?.id === "strike" ? [0xd1, 0xa2, 0x5b] : action?.type === "guard" ? [0xa6, 0x41, 0x2d] : null;
  const icon = source && createCachedIconCanvas(scene.game, source, { textureKey: action.iconTexture, tint });
  if (icon) art.append(icon);
  else {
    const seal = document.createElement("span"); seal.className = "combat-skill-seal"; seal.textContent = "封"; art.append(seal);
  }
  const mark = ({ fire_embers: "火", fire_breath: "炎", fire_ring: "輪", fire_phoenix: "鳳" })[action?.id];
  if (mark) {
    const glyph = document.createElement("span"); glyph.className = "combat-skill-mark"; glyph.textContent = mark; art.append(glyph);
  }
}
