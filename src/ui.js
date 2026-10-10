export function createBar(scene, x, y, width, height, color) {
  const bg = scene.add.rectangle(x, y, width, height, 0x020812, 0.92)
    .setOrigin(0, 0.5)
    .setStrokeStyle(1, 0x258fc0, 0.72);
  const slot = scene.add.rectangle(x + 3, y, width - 6, height - 6, 0x04111e, 0.98).setOrigin(0, 0.5);
  const fill = scene.add.rectangle(x + 3, y, width - 6, height - 6, color, 1).setOrigin(0, 0.5);
  const sheen = scene.add.rectangle(x + 3, y - height / 5, width - 6, Math.max(2, Math.floor(height / 3)), 0xffffff, 0.14)
    .setOrigin(0, 0.5);
  const valueText = scene.add.text(x + width - 8, y, "", {
    fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif',
    fontSize: "12px",
    color: "#f4f9fd",
    fontStyle: "bold",
    stroke: "#060a10",
    strokeThickness: 2
  }).setOrigin(1, 0.5);
  return { bg, slot, fill, sheen, valueText, width: width - 6, x: x + 3 };
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

function drawNamePlate(scene, x, y, width) {
  const plate = scene.add.graphics().setDepth(31);
  plate.fillStyle(0x020914, 0.94);
  plate.fillRoundedRect(x, y - 14, width, 28, 8);
  plate.lineStyle(1.5, 0x2eb7ee, 0.78);
  plate.strokeRoundedRect(x, y - 14, width, 28, 8);
  return plate;
}

function createTooltip(scene, action, index) {
  const position = ACTION_POSITIONS[index];
  const x = 168;
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
  const statText = scene.add.text(x + 20, y + 46, stats.map((line, statIndex) => `${statIndex === 0 ? "◉" : statIndex === 1 ? "◆" : "»"}  ${line}`).join("\n"), {
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
  layer.add([bg, title, divider, statText, description]);
  return { layer, title, statText, description };
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
    const lock = scene.add.graphics().setDepth(35);
    lock.lineStyle(3, 0x72889a, 0.9);
    lock.beginPath();
    lock.arc(x, y - 5, 7, Math.PI, Math.PI * 2, false);
    lock.strokePath();
    lock.fillStyle(0x72889a, 0.92);
    lock.fillRoundedRect(x - 9, y - 4, 18, 15, 3);
    lock.fillStyle(0x0b1721, 1);
    lock.fillCircle(x, y + 2, 2);
    lock.fillRect(x - 1, y + 2, 2, 5);
    return { empty: true, bg: chrome, shortcutBg, shortcut, lock, visualParts: [chrome, shortcutBg, shortcut, lock] };
  }

  const plateX = x + 27;
  const plateWidth = Math.max(102, Math.min(122, action.name.length * 7.2 + 24));
  const namePlate = drawNamePlate(scene, plateX, y, plateWidth);
  const icon = action.iconTexture && scene.textures.exists(action.iconTexture)
    ? scene.add.image(x, y, action.iconTexture).setDisplaySize(54, 54).setDepth(34)
    : null;
  const glyph = icon ? null : scene.add.text(x, y, action.type === "guard" ? "◇" : "◆", {
    fontFamily: '"Cinzel", Georgia, serif', fontSize: "25px", color: `#${action.color.toString(16).padStart(6, "0")}`, fontStyle: "bold"
  }).setOrigin(0.5).setDepth(34);
  const name = scene.add.text(plateX + plateWidth / 2, y, action.name.toUpperCase(), {
    fontFamily: '"Cinzel", Georgia, serif',
    fontSize: action.name.length > 16 ? "8px" : "9px",
    color: "#f7fbff",
    fontStyle: "bold",
    stroke: "#05090f",
    strokeThickness: 1
  }).setOrigin(0.5).setDepth(35);
  const hoverRing = scene.add.circle(x, y, 32, 0x000000, 0)
    .setStrokeStyle(3, 0xf1c55d, 1)
    .setDepth(38)
    .setVisible(false);
  const hoverPlate = scene.add.graphics().setDepth(30).setVisible(false);
  hoverPlate.fillStyle(0x4c3608, 0.28);
  hoverPlate.fillRoundedRect(plateX, y - 14, plateWidth, 28, 8);
  hoverPlate.lineStyle(2, 0xf1c55d, 0.94);
  hoverPlate.strokeRoundedRect(plateX, y - 14, plateWidth, 28, 8);
  const hit = scene.add.rectangle(plateX + plateWidth / 2 - 20, y, plateWidth + 70, 60, 0xffffff, 0.001)
    .setDepth(40)
    .setInteractive({ useHandCursor: true });
  const tooltip = createTooltip(scene, action, index);
  const visualParts = [chrome, shortcutBg, shortcut, namePlate, icon, glyph, name].filter(Boolean);
  return {
    bg: chrome,
    icon,
    iconText: glyph,
    shortcutBg,
    shortcut,
    namePlate,
    name,
    hoverRing,
    hoverPlate,
    hit,
    tooltip,
    visualParts,
    jutsu: action,
    available: false
  };
}
