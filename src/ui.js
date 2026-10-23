import { createUiIcon } from "./icons.js?v=0.43.0";

export function createBar(scene, x, y, width, height, color, { direction = "ltr" } = {}) {
  const radius = Math.min(height / 2, 8);
  const maskShape = scene.make.graphics({ x, y, add: false });
  maskShape.fillStyle(0xffffff).fillRoundedRect(0, -height / 2, width, height, radius);
  const slotMask = maskShape.createGeometryMask();
  const bg = scene.add.rectangle(x, y, width, height, 0x020812, 0.96)
    .setOrigin(0, 0.5)
    .setMask(slotMask);
  const slot = scene.add.rectangle(x, y, width, height, 0x04111e, 0.98)
    .setOrigin(0, 0.5)
    .setMask(slotMask);
  const fill = scene.add.rectangle(x, y, width, height, color, 1)
    .setOrigin(0, 0.5)
    .setMask(slotMask);
  const sheen = scene.add.rectangle(x, y - height / 4, width, Math.max(2, Math.floor(height / 3)), 0xffffff, 0.13)
    .setOrigin(0, 0.5)
    .setMask(slotMask);
  const valueText = scene.add.text(x + width / 2, y, "", {
    fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif',
    fontSize: height <= 12 ? "10px" : "11px",
    color: "#f4f9fd",
    fontStyle: "bold",
    stroke: "#060a10",
    strokeThickness: 2
  }).setOrigin(0.5);
  return { bg, slot, fill, sheen, valueText, maskShape, slotMask, width, height, x, direction };
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

const ACTION_POSITIONS = [
  { x: 68, y: 162 },
  { x: 68, y: 228 },
  { x: 68, y: 294 },
  { x: 68, y: 360 },
  { x: 68, y: 426 },
  { x: 68, y: 492 }
];

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

function drawActionChrome(scene, x, y, hasAction, initialSkin = DEFAULT_INTERFACE_SKIN) {
  const chrome = scene.add.image(x, y, initialSkin.actionSlotTexture)
    .setDisplaySize(70, 70)
    .setDepth(32);
  chrome.applyTheme = (skin = DEFAULT_INTERFACE_SKIN) => {
    chrome.setTexture(skin.actionSlotTexture).setAlpha(hasAction ? 1 : 0.42).clearTint();
  };
  chrome.applyTheme(initialSkin);
  return chrome;
}

function createTooltip(scene, action, index, initialSkin = DEFAULT_INTERFACE_SKIN) {
  const position = ACTION_POSITIONS[index];
  const x = 116;
  const y = Math.max(112, Math.min(350, position.y - 45));
  const width = 240;
  const height = 136;
  const layer = scene.add.container(0, 0).setDepth(58).setVisible(false);
  const bg = scene.add.graphics();

  const title = scene.add.text(x + 18, y + 13, action.name.toUpperCase(), {
    fontFamily: '"Cinzel", Georgia, serif', fontSize: "15px", color: initialSkin.tooltipTitle, fontStyle: "bold"
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
  const chrome = drawActionChrome(scene, x, y, Boolean(action), initialSkin);
  const shortcutBg = scene.add.circle(x - 24, y - 25, 11, initialSkin.shortcutFill, 1)
    .setStrokeStyle(1.5, action ? initialSkin.accent : initialSkin.muted, 0.95)
    .setDepth(36);
  const shortcut = scene.add.text(x - 24, y - 25, String(index + 1), {
    fontFamily: '"Cinzel", Georgia, serif', fontSize: "10px", color: action ? initialSkin.text : initialSkin.mutedText, fontStyle: "bold"
  }).setOrigin(0.5).setDepth(37);

  if (!action) {
    const lock = createUiIcon(scene, "lock", x, y, { size: 22, tint: initialSkin.muted, depth: 35 });
    const applyTheme = (skin = DEFAULT_INTERFACE_SKIN) => {
      chrome.applyTheme(skin);
      shortcutBg.setFillStyle(skin.shortcutFill, 1).setStrokeStyle(1.5, skin.muted, 0.95);
      shortcut.setColor(skin.mutedText);
      lock.setTint(skin.muted);
    };
    return { empty: true, bg: chrome, shortcutBg, shortcut, lock, visualParts: [chrome, shortcutBg, shortcut, lock], applyTheme };
  }

  const icon = action.iconTexture && scene.textures.exists(action.iconTexture)
    ? scene.add.image(x, y, action.iconTexture).setDisplaySize(48, 48).setDepth(34)
    : null;
  const glyph = icon ? null : scene.add.text(x, y, action.type === "guard" ? "◇" : "◆", {
    fontFamily: '"Cinzel", Georgia, serif', fontSize: "25px", color: `#${action.color.toString(16).padStart(6, "0")}`, fontStyle: "bold"
  }).setOrigin(0.5).setDepth(34);
  const hoverRing = scene.add.image(x, y, initialSkin.actionSlotTexture)
    .setDisplaySize(77, 77)
    .setAlpha(0.72)
    .setDepth(38)
    .setVisible(false);
  const hit = scene.add.circle(x, y, 32, 0xffffff, 0.001)
    .setDepth(40)
    .setInteractive({ useHandCursor: true });
  const tooltip = createTooltip(scene, action, index, initialSkin);
  const visualParts = [chrome, shortcutBg, shortcut, icon, glyph].filter(Boolean);
  const applyTheme = (skin = DEFAULT_INTERFACE_SKIN) => {
    chrome.applyTheme(skin);
    shortcutBg.setFillStyle(skin.shortcutFill, 1).setStrokeStyle(1.5, skin.accent, 0.95);
    shortcut.setColor(skin.text);
    hoverRing.setTexture(skin.actionSlotTexture).clearTint();
    tooltip.applyTheme(skin);
  };
  return {
    bg: chrome,
    icon,
    iconText: glyph,
    shortcutBg,
    shortcut,
    hoverRing,
    hit,
    tooltip,
    visualParts,
    applyTheme,
    jutsu: action,
    available: false
  };
}
