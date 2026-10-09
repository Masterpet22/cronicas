export function createBar(scene, x, y, width, height, color) {
  const bg = scene.add.rectangle(x, y, width, height, 0x000000, 0).setOrigin(0, 0.5);
  const slot = scene.add.rectangle(x + 2, y, width - 4, height - 4, 0x000000, 0).setOrigin(0, 0.5);
  const fill = scene.add.rectangle(x + 2, y, width - 4, height - 4, color, 1).setOrigin(0, 0.5);
  const sheen = scene.add.rectangle(x + 2, y - height / 4 + 1, width - 4, Math.max(2, Math.floor(height / 3)), 0xffffff, 0.16)
    .setOrigin(0, 0.5);
  const valueText = scene.add.text(x + width / 2, y, "", {
    fontFamily: "Alegreya Sans, Segoe UI, sans-serif",
    fontSize: "12px",
    color: "#f4f9fd",
    fontStyle: "bold",
    stroke: "#060a10",
    strokeThickness: 2
  }).setOrigin(0.5);
  return { bg, slot, fill, sheen, valueText, width: width - 4, x: x + 2 };
}

function actionLines(action) {
  if (action.type === "guard") return ["Recupera 12 chakra", "Reduce 50%", "Vel. 20"];

  const speed = action.subtitle.match(/(?:^|·)\s*V(\d+)/)?.[1];
  const accuracy = action.subtitle.match(/(?:^|·)\s*P(\d+)/)?.[1];
  const cooldown = action.subtitle.match(/(?:^|·)\s*CD(\d+)/)?.[1];
  const cost = action.cost > 0 ? `${action.cost} chakra` : "Sin coste";
  const timing = accuracy ? `Prec. ${accuracy}%` : speed ? `Vel. ${speed}` : cooldown ? `Rec. ${cooldown}` : "";
  return [cost, `${action.damage} de daño`, timing];
}

function actionDescription(action) {
  if (action.type === "guard") return "Reduce el daño recibido y recupera chakra.";
  if (action.id === "strike") return "Ataque físico rápido contra el enemigo.";
  if (action.id === "water_whip") return "Ataca con un látigo de agua a presión.";
  if (action.id === "water_bullet") return "Dispara una esfera de agua concentrada.";
  const element = ({ fuego: "fuego", agua: "agua", viento: "viento", tierra: "tierra", rayo: "rayo" })[action.element] || "energía elemental";
  return `Técnica concentrada de ${element}.`;
}

export function createActionButton(scene, action, index) {
  const width = 146;
  const height = 153;
  const gap = 9;
  const x = 20 + index * (width + gap);
  const y = 377;
  const accent = action?.color || 0x267bb0;
  const bg = scene.add.rectangle(x + 4, y + 4, width - 8, height - 8, 0x0b3552, 0.001).setOrigin(0).setDepth(20);
  const shortcutBg = scene.add.rectangle(x + 20, y + 18, 27, 27, 0x000000, 0).setAngle(45).setDepth(25);
  const shortcut = scene.add.text(x + 20, y + 18, String(index + 1), {
    fontFamily: "Cinzel, Georgia, serif", fontSize: "14px", color: action ? "#f7fbff" : "#55778c", fontStyle: "bold"
  }).setOrigin(0.5).setDepth(26);

  if (!action) return { empty: true, bg, shortcutBg, shortcut };

  const icon = scene.add.circle(x + width / 2, y + 39, 32, 0x020914, 0.96).setStrokeStyle(1.5, accent, 0.72).setDepth(22);
  const glyph = action.type === "guard" ? "◇" : action.element === "fire" ? "✦" : action.element === "wind" ? "≋" : action.element === "lightning" ? "ϟ" : "◆";
  const iconText = action.iconTexture && scene.textures.exists(action.iconTexture)
    ? scene.add.image(x + width / 2, y + 39, action.iconTexture).setDisplaySize(68, 68).setDepth(23)
    : scene.add.text(x + width / 2, y + 39, glyph, {
        fontFamily: "Cinzel, Georgia, serif",
        fontSize: "26px",
        color: `#${action.color.toString(16).padStart(6, "0")}`,
        fontStyle: "bold"
      }).setOrigin(0.5).setDepth(23);
  const name = scene.add.text(x + width / 2, y + 65, action.name, {
    fontFamily: "Cinzel, Georgia, serif",
    fontSize: "12px",
    color: "#f7fbff",
    fontStyle: "bold",
    stroke: "#070c12",
    strokeThickness: 1,
    wordWrap: { width: width - 18 },
    maxLines: 1
  }).setOrigin(0.5, 0).setDepth(24);

  const [cost, damage, timing] = actionLines(action);
  const divider = scene.add.rectangle(x + 10, y + 84, width - 20, 1, 0x41a8dc, 0.34).setOrigin(0).setDepth(23);
  const costText = scene.add.text(x + width / 2, y + 88, `◉  ${cost}`, {
    fontFamily: "Alegreya Sans, Segoe UI, sans-serif",
    fontSize: "10px", color: "#59d5ff", fontStyle: "bold"
  }).setOrigin(0.5, 0).setDepth(24);
  const description = scene.add.text(x + width / 2, y + 104, actionDescription(action), {
    fontFamily: "Alegreya Sans, Segoe UI, sans-serif",
    fontSize: "9px",
    color: "#d6e2ec",
    fontStyle: "bold",
    align: "center",
    wordWrap: { width: width - 18 },
    maxLines: 2,
    lineSpacing: -2
  }).setOrigin(0.5, 0).setDepth(24);
  const bottomDivider = scene.add.rectangle(x + 10, y + 130, width - 20, 1, 0x41a8dc, 0.34).setOrigin(0).setDepth(23);
  const summaryText = scene.add.text(x + 12, y + 135, damage, {
    fontFamily: "Alegreya Sans, Segoe UI, sans-serif",
    fontSize: "10px",
    color: action.type === "guard" ? "#f3c85e" : "#ff7f83",
    fontStyle: "bold",
  }).setDepth(24);
  const sub = scene.add.text(x + width - 12, y + 135, timing, {
    fontFamily: "Alegreya Sans, Segoe UI, sans-serif", fontSize: "9px", color: "#d7e3ec", fontStyle: "bold"
  }).setOrigin(1, 0).setDepth(24);

  const hit = scene.add.rectangle(x, y, width, height, 0xffffff, 0.001).setOrigin(0).setDepth(25).setInteractive({ useHandCursor: true });
  return { bg, icon, iconText, shortcutBg, shortcut, name, divider, costText, description, bottomDivider, summaryText, sub, hit, jutsu: action };
}
