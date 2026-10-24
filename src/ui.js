import { HUD_ART, emptySkillInfo } from "./battle/hud-art.js?v=0.87.0";
import { createUiIcon } from "./icons.js?v=0.43.0";

export function createBar(scene, x, y, width, height, color, {
  direction = "ltr",
  ghostColor = null,
  slotColor = 0x08111b,
  edgeColor = 0xc29a53
} = {}) {
  const radius = Math.min(height / 2, 8);
  const maskShape = scene.make.graphics({ x, y, add: false });
  maskShape.fillStyle(0xffffff).fillRoundedRect(0, -height / 2, width, height, radius);
  const slotMask = maskShape.createGeometryMask();
  const bg = scene.add.rectangle(x, y, width, height, 0x03070d, 0.98)
    .setOrigin(0, 0.5)
    .setMask(slotMask);
  const slot = scene.add.rectangle(x, y, width, height, slotColor, 0.98)
    .setOrigin(0, 0.5)
    .setMask(slotMask);
  const ghost = ghostColor === null ? null : scene.add.rectangle(x, y, width, height, ghostColor, 0.92)
    .setOrigin(0, 0.5)
    .setMask(slotMask);
  const fill = scene.add.rectangle(x, y, width, height, color, 1)
    .setOrigin(0, 0.5)
    .setMask(slotMask);
  const shade = scene.add.rectangle(x, y + height / 3, width, Math.max(2, Math.ceil(height / 2)), 0x183328, 0.2)
    .setOrigin(0, 0.5)
    .setMask(slotMask);
  const sheen = scene.add.rectangle(x, y - height / 4, width, Math.max(2, Math.floor(height / 3)), 0xffffff, 0.13)
    .setOrigin(0, 0.5)
    .setMask(slotMask);
  const edge = scene.add.graphics({ x, y });
  edge.lineStyle(1, edgeColor, 0.86).strokeRoundedRect(0, -height / 2, width, height, radius);
  const valueText = scene.add.text(x + width / 2, y, "", {
    fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif',
    fontSize: height <= 12 ? "9px" : "13px",
    color: "#fff4d4",
    fontStyle: "bold",
    stroke: "#080706",
    strokeThickness: 3
  }).setOrigin(0.5);
  return { bg, slot, ghost, fill, shade, sheen, edge, valueText, maskShape, slotMask, width, height, x, direction, currentRatio: null };
}

export function actionLines(action) {
  if (action.type === "guard") return ["Recupera 12 chakra", "Reduce 50%", "Vel. 20"];

  const speed = action.subtitle.match(/(?:^|·)\s*V(\d+)/)?.[1];
  const accuracy = action.subtitle.match(/(?:^|·)\s*P(\d+)/)?.[1];
  const cooldown = action.subtitle.match(/(?:^|·)\s*CD(\d+)/)?.[1];
  const cost = action.cost > 0 ? `${action.cost} chakra` : "Sin coste";
  const prepared = Boolean(action.preparation || action.seals?.length);
  const timing = prepared ? "Preparación: 80–100 %" : cooldown ? `Recarga: ${cooldown}` : accuracy ? `Prec. ${accuracy}%` : speed ? `Vel. ${speed}` : "";
  return [cost, `${action.damage} de daño`, timing];
}

export function actionDescription(action) {
  if (action.type === "guard") return "Adopta una postura defensiva que reduce el daño entrante y recupera chakra.";
  if (action.id === "strike") return "Ataque físico rápido contra el enemigo.";
  if (action.id === "water_whip") return "Ataca con un látigo de agua a presión.";
  if (action.id === "water_bullet") return "Forma un shuriken de agua y lo lanza girando contra el rival.";
  const element = ({ fuego: "fuego", agua: "agua", viento: "viento", tierra: "tierra", rayo: "rayo" })[action.element] || "energía elemental";
  return `Técnica concentrada de ${element}.`;
}

export const ACTION_POSITIONS = Array.from({ length: 6 }, (_, index) => ({
  x: HUD_ART.skills.iconX, y: HUD_ART.skills.y + HUD_ART.skills.rowHeight * (index + 0.5)
}));

const DEFAULT_INTERFACE_SKIN = Object.freeze({
  actionSlotTexture: "battle-ui-lunar-action-slot",
  panel: 0x020914,
  buttonFill: 0x061321,
  buttonEdge: 0x1d5c7a,
  accent: 0x39c7ff,
  highlight: 0x9be9ff,
  muted: 0x315c72,
  shortcutFill: 0x071421,
  text: "#f7fbff",
  mutedText: "#66849a",
  tooltipFill: 0x020812,
  tooltipEdge: 0xf1c55d,
  tooltipHighlight: 0xffe6a0,
  tooltipTitle: "#fff0bd",
  tooltipText: "#e9f5fb",
  tooltipMutedText: "#d7e2ea"
});

function drawActionChrome(scene, x, y, hasAction, index, initialSkin = DEFAULT_INTERFACE_SKIN) {
  const ultimate = index === 5;
  const radius = 29;
  const chrome = scene.add.graphics().setDepth(32);
  chrome.applyTheme = (skin = DEFAULT_INTERFACE_SKIN) => {
    chrome.clear();
    chrome.fillStyle(0x02060d, hasAction ? 0.9 : 0.76).fillCircle(x, y, radius + 3);
    chrome.lineStyle(4, 0x6e1e18, hasAction ? 0.98 : 0.58).strokeCircle(x, y, radius);
    chrome.lineStyle(1.5, 0xc79a4a, hasAction ? 0.9 : 0.42).strokeCircle(x, y, radius - 4);
    chrome.lineStyle(1, 0xf0cb76, hasAction ? 0.24 : 0.12).strokeCircle(x, y, radius - 8);
  };
  chrome.applyTheme(initialSkin);
  return chrome;
}

function createTooltip(scene, action, index, initialSkin = DEFAULT_INTERFACE_SKIN) {
  const position = ACTION_POSITIONS[index];
  const x = 169;
  const y = Math.max(112, Math.min(350, position.y - 45));
  const width = 252;
  const height = 136;
  const layer = scene.add.container(0, 0).setDepth(58).setVisible(false);
  const bg = scene.add.graphics();

  const title = scene.add.text(x + 18, y + 13, action.name.toUpperCase(), {
    fontFamily: '"Cinzel", Georgia, serif', fontSize: "12px", wordWrap: { width: 220 }, color: initialSkin.tooltipTitle, fontStyle: "bold"
  });
  const divider = scene.add.rectangle(x + 16, y + 39, width - 32, 1, initialSkin.accent, 0.35).setOrigin(0);
  const [cost, damage, timing] = actionLines(action);
  const stats = [cost, damage, timing].filter(Boolean);
  const statIcons = stats.map((line, statIndex) => createUiIcon(
    scene,
    ["energy", "damage", "speed"][statIndex],
    x + 23,
    y + 53 + statIndex * 17,
    { size: 11, tint: statIndex === 1 ? initialSkin.tooltipEdge : initialSkin.highlight, depth: 59 }
  ));
  const statText = scene.add.text(x + 34, y + 46, stats.join("\n"), {
    fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif',
    fontSize: "11px",
    color: initialSkin.tooltipText,
    fontStyle: "bold",
    lineSpacing: 2
  });
  const description = scene.add.text(x + 18, y + 99, actionDescription(action), {
    fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif',
    fontSize: "10px",
    color: initialSkin.tooltipMutedText,
    wordWrap: { width: width - 36 },
    maxLines: 2,
    lineSpacing: -1
  });
  layer.add([bg, title, divider, ...statIcons, statText, description]);
  const applyTheme = (skin = DEFAULT_INTERFACE_SKIN) => {
    bg.clear();
    bg.fillStyle(skin.tooltipFill, 0.97).fillRoundedRect(x, y, width, height, 12);
    bg.lineStyle(3, skin.tooltipEdge, 0.9).strokeRoundedRect(x, y, width, height, 12);
    bg.lineStyle(1, skin.tooltipHighlight, 0.34).strokeRoundedRect(x + 4, y + 4, width - 8, height - 8, 9);
    bg.fillStyle(skin.tooltipEdge, 0.96).fillTriangle(x - 9, position.y, x + 1, position.y - 8, x + 1, position.y + 8);
    title.setColor(skin.tooltipTitle);
    divider.setFillStyle(skin.accent, 0.38);
    statIcons.forEach((icon, statIndex) => icon.setTint(statIndex === 1 ? skin.tooltipEdge : skin.highlight));
    statText.setColor(skin.tooltipText);
    description.setColor(skin.tooltipMutedText);
  };
  applyTheme(initialSkin);
  return { layer, title, statIcons, statText, description, applyTheme };
}

export function createActionButton(scene, action, index, initialSkin = DEFAULT_INTERFACE_SKIN) {
  const { x, y } = ACTION_POSITIONS[index];
  const ultimate = index === 5;
  const chrome = drawActionChrome(scene, x, y, Boolean(action), index, initialSkin);
  const shortcutOffset = 26;
  const shortcutBg = scene.add.circle(x - shortcutOffset, y - shortcutOffset, 10, 0x4c1714, 1)
    .setStrokeStyle(1.25, action ? 0xc79a4a : 0x6f573b, 0.95)
    .setDepth(36);
  const shortcut = scene.add.text(x - shortcutOffset, y - shortcutOffset, String(index + 1), {
    fontFamily: '"Cinzel", Georgia, serif', fontSize: "9px", color: action ? "#f0cf7a" : "#8f795b", fontStyle: "bold"
  }).setOrigin(0.5).setDepth(37);

  if (!action) {
    const faintKanji = scene.add.text(x, y - 1, "技", {
      fontFamily: '"Yu Mincho", "MS Mincho", serif', fontSize: ultimate ? "30px" : "25px", color: "#6c342b", fontStyle: "bold"
    }).setOrigin(0.5).setAlpha(0.48).setDepth(33);
    const seal = scene.add.rectangle(x, y, ultimate ? 18 : 16, ultimate ? 40 : 35, 0xe0d0a7, 0.92)
      .setStrokeStyle(1, 0x7a241d, 0.92).setAngle(-7).setDepth(34);
    const sealGlyph = scene.add.text(x, y, "封", {
      fontFamily: '"Yu Mincho", "MS Mincho", serif', fontSize: ultimate ? "14px" : "12px", color: "#8e241d", fontStyle: "bold"
    }).setOrigin(0.5).setAngle(-7).setDepth(35);
    const info = emptySkillInfo(scene, index);
    const name = scene.add.text(106, y - 17, info.name, {
      fontFamily: 'Georgia, "Yu Mincho", serif', fontSize: "11px", color: "#a59d91", fontStyle: "bold", wordWrap: { width: 51 }, lineSpacing: -1
    }).setDepth(37);
    const costBg = scene.add.rectangle(126, y + 21, 39, 16, HUD_ART.inkDeep, 1).setStrokeStyle(0.8, 0x826742, 0.9).setDepth(36);
    const unlock = scene.add.text(126, y + 21, info.requirement, {
      fontFamily: '"Alegreya Sans", sans-serif', fontSize: "10px", color: "#a59d91", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(37);
    const applyTheme = (skin = DEFAULT_INTERFACE_SKIN) => {
      chrome.applyTheme(skin);
      shortcutBg.setFillStyle(0x321513, 1).setStrokeStyle(1.25, 0x6f573b, 0.95);
      shortcut.setColor("#8f795b");
    };
    return { empty: true, bg: chrome, shortcutBg, shortcut, lock: seal, visualParts: [chrome, shortcutBg, shortcut, faintKanji, seal, sealGlyph, name, costBg, unlock], name, requirement: unlock, applyTheme };
  }

  const icon = action.iconTexture && scene.textures.exists(action.iconTexture)
    ? scene.add.image(x, y, action.iconTexture).setDisplaySize(47, 47).setDepth(34)
    : null;
  if (icon && action.id === "strike") icon.setTint(0xd1a25b);
  if (icon && action.type === "guard") icon.setTint(0xa6412d);
  const techniqueMark = ({
    fire_embers: "火", fire_breath: "炎", fire_ring: "輪", fire_phoenix: "鳳"
  })[action.id];
  const mark = techniqueMark ? scene.add.text(x, y + 1, techniqueMark, {
    fontFamily: '"Yu Mincho", "MS Mincho", serif', fontSize: ultimate ? "25px" : "21px", color: "#ffe4a0", fontStyle: "bold", stroke: "#4f120c", strokeThickness: 4
  }).setOrigin(0.5).setDepth(35) : null;
  const glyph = icon ? null : scene.add.text(x, y, action.type === "guard" ? "◇" : "◆", {
    fontFamily: '"Cinzel", Georgia, serif', fontSize: "25px", color: `#${action.color.toString(16).padStart(6, "0")}`, fontStyle: "bold"
  }).setOrigin(0.5).setDepth(34);
  const hoverRing = scene.add.rectangle(90, y, 134, 65, 0xe8a948, 0.08)
    .setStrokeStyle(1, HUD_ART.light, 0.88)
    .setAlpha(0.86)
    .setDepth(38)
    .setVisible(false);
  const hit = scene.add.rectangle(90, y, 134, 66, 0xffffff, 0.001)
    .setDepth(40)
    .setInteractive({ useHandCursor: true });
  const name = scene.add.text(104, y - 23, action.name, {
    fontFamily: 'Georgia, "Yu Mincho", serif', fontSize: "11px", fontStyle: "bold", color: HUD_ART.text,
    wordWrap: { width: 54 }, lineSpacing: -1
  }).setDepth(37);
  // Fit long real technique names above the cost, without replacing their text.
  for (let size = 11; size > 9 && (name.height > 33 || name.width > 54); size -= 0.5) name.setFontSize(size - 0.5);
  const costBg = scene.add.rectangle(126, y + 21, 39, 16, HUD_ART.inkDeep, 0.98)
    .setStrokeStyle(0.8, HUD_ART.gold, 1).setDepth(36);
  const cost = scene.add.text(126, y + 21, `${scene.actionCost(action)} CH`, {
    fontFamily: '"Alegreya Sans", sans-serif', fontSize: "10px", color: "#b2e5ff", fontStyle: "bold"
  }).setOrigin(0.5).setDepth(37);
  const availability = scene.add.text(x + 15, y + 16, "", {
    fontFamily: '"Alegreya Sans", sans-serif', fontSize: "9px", color: "#fff0bc", fontStyle: "bold", stroke: "#02050a", strokeThickness: 3
  }).setOrigin(0.5).setDepth(38);
  const tooltip = createTooltip(scene, action, index, initialSkin);
  const visualParts = [chrome, shortcutBg, shortcut, icon, mark, glyph, name, costBg, cost, availability].filter(Boolean);
  const applyTheme = (skin = DEFAULT_INTERFACE_SKIN) => {
    chrome.applyTheme(skin);
    shortcutBg.setFillStyle(0x4c1714, 1).setStrokeStyle(1.25, 0xc79a4a, 0.95);
    shortcut.setColor("#f0cf7a");
    hoverRing.setFillStyle(0xe8a948, 0.1).setStrokeStyle(1, HUD_ART.light, 0.88);
    tooltip.applyTheme(skin);
  };
  return {
    bg: chrome,
    icon,
    name, cost, availability,
    mark,
    iconText: glyph,
    shortcutBg,
    shortcut,
    hoverRing,
    hit,
    tooltip,
    visualParts,
    applyTheme,
    selected: false,
    jutsu: action,
    available: false
  };
}
