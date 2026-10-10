import { createUiIcon } from "./icons.js?v=0.43.0";

export function createBar(scene, x, y, width, height, color) {
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
  return { bg, slot, fill, sheen, valueText, maskShape, slotMask, width, height, x };
}

export function actionLines(action) {
  if (action.type === "guard") return ["Recupera 12 chakra", "Reduce 50%", "Vel. 20"];

  const speed = action.subtitle.match(/(?:^|·)\s*V(\d+)/)?.[1];
  const accuracy = action.subtitle.match(/(?:^|·)\s*P(\d+)/)?.[1];
  const cooldown = action.subtitle.match(/(?:^|·)\s*CD(\d+)/)?.[1];
  const cost = action.cost > 0 ? `${action.cost} chakra` : "Sin coste";
  const timing = cooldown ? `Recarga: ${cooldown}` : accuracy ? `Prec. ${accuracy}%` : speed ? `Vel. ${speed}` : "";
  return [cost, `${action.damage} de daño`, timing];
}

export function actionDescription(action) {
  if (action.type === "guard") return "Adopta una postura defensiva que reduce el daño entrante y recupera chakra.";
  if (action.id === "strike") return "Ataque físico rápido contra el enemigo.";
  if (action.id === "water_whip") return "Ataca con un látigo de agua a presión.";
  if (action.id === "water_bullet") return "Dispara una esfera de agua concentrada.";
  const element = ({ fuego: "fuego", agua: "agua", viento: "viento", tierra: "tierra", rayo: "rayo" })[action.element] || "energía elemental";
  return `Técnica concentrada de ${element}.`;
}

const ACTION_POSITIONS = [
  { x: 58, y: 162 },
  { x: 68, y: 228 },
  { x: 75, y: 294 },
  { x: 75, y: 360 },
  { x: 68, y: 426 },
  { x: 57, y: 492 }
];

function drawActionChrome(scene, x, y, hasAction) {
  const chrome = scene.add.graphics().setDepth(32);
  chrome.fillStyle(0x020914, 0.96);
  chrome.fillCircle(x, y, 29);
  chrome.lineStyle(2, hasAction ? 0x39c7ff : 0x276688, hasAction ? 0.92 : 0.58);
  chrome.strokeCircle(x, y, 29);
  chrome.lineStyle(1, 0x9be9ff, hasAction ? 0.28 : 0.12);
  chrome.strokeCircle(x, y, 24);
  return chrome;
}

function createTooltip(scene, action, index) {
  const position = ACTION_POSITIONS[index];
  const x = 116;
  const y = Math.max(112, Math.min(350, position.y - 45));
  const width = 240;
  const height = 136;
  const layer = scene.add.container(0, 0).setDepth(58).setVisible(false);
  const bg = scene.add.graphics();
  bg.fillStyle(0x020812, 0.97);
  bg.fillRoundedRect(x, y, width, height, 12);
  bg.lineStyle(2, 0xf1c55d, 0.92);
  bg.strokeRoundedRect(x, y, width, height, 12);
  bg.lineStyle(1, 0xffe6a0, 0.28);
  bg.strokeRoundedRect(x + 4, y + 4, width - 8, height - 8, 9);
  bg.fillStyle(0xf1c55d, 0.96);
  bg.fillTriangle(x - 9, position.y, x + 1, position.y - 8, x + 1, position.y + 8);

  const title = scene.add.text(x + 18, y + 13, action.name.toUpperCase(), {
    fontFamily: '"Cinzel", Georgia, serif', fontSize: "15px", color: "#fff0bd", fontStyle: "bold"
  });
  const divider = scene.add.rectangle(x + 16, y + 39, width - 32, 1, 0x8aa1b2, 0.35).setOrigin(0);
  const [cost, damage, timing] = actionLines(action);
  const stats = [cost, damage, timing].filter(Boolean);
  const statIcons = stats.map((line, statIndex) => createUiIcon(
    scene,
    ["energy", "damage", "speed"][statIndex],
    x + 23,
    y + 53 + statIndex * 17,
    { size: 11, tint: statIndex === 1 ? 0xf1c55d : 0xdff6ff, depth: 59 }
  ));
  const statText = scene.add.text(x + 34, y + 46, stats.join("\n"), {
    fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif',
    fontSize: "11px",
    color: "#e9f5fb",
    fontStyle: "bold",
    lineSpacing: 2
  });
  const description = scene.add.text(x + 18, y + 99, actionDescription(action), {
    fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif',
    fontSize: "10px",
    color: "#d7e2ea",
    wordWrap: { width: width - 36 },
    maxLines: 2,
    lineSpacing: -1
  });
  layer.add([bg, title, divider, ...statIcons, statText, description]);
  return { layer, title, statIcons, statText, description };
}

export function createActionButton(scene, action, index) {
  const { x, y } = ACTION_POSITIONS[index];
  const chrome = drawActionChrome(scene, x, y, Boolean(action));
  const shortcutBg = scene.add.circle(x - 24, y - 25, 11, 0x071421, 1)
    .setStrokeStyle(1.5, action ? 0x58d8ff : 0x315c72, 0.95)
    .setDepth(36);
  const shortcut = scene.add.text(x - 24, y - 25, String(index + 1), {
    fontFamily: '"Cinzel", Georgia, serif', fontSize: "10px", color: action ? "#f7fbff" : "#66849a", fontStyle: "bold"
  }).setOrigin(0.5).setDepth(37);

  if (!action) {
    const lock = createUiIcon(scene, "lock", x, y, { size: 22, tint: 0x72889a, depth: 35 });
    return { empty: true, bg: chrome, shortcutBg, shortcut, lock, visualParts: [chrome, shortcutBg, shortcut, lock] };
  }

  const icon = action.iconTexture && scene.textures.exists(action.iconTexture)
    ? scene.add.image(x, y, action.iconTexture).setDisplaySize(54, 54).setDepth(34)
    : null;
  const glyph = icon ? null : scene.add.text(x, y, action.type === "guard" ? "◇" : "◆", {
    fontFamily: '"Cinzel", Georgia, serif', fontSize: "25px", color: `#${action.color.toString(16).padStart(6, "0")}`, fontStyle: "bold"
  }).setOrigin(0.5).setDepth(34);
  const hoverRing = scene.add.circle(x, y, 32, 0x000000, 0)
    .setStrokeStyle(3, 0xf1c55d, 1)
    .setDepth(38)
    .setVisible(false);
  const hit = scene.add.circle(x, y, 32, 0xffffff, 0.001)
    .setDepth(40)
    .setInteractive({ useHandCursor: true });
  const tooltip = createTooltip(scene, action, index);
  const visualParts = [chrome, shortcutBg, shortcut, icon, glyph].filter(Boolean);
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
    jutsu: action,
    available: false
  };
}
