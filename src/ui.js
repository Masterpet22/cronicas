export function createBar(scene, x, y, width, height, color) {
  const bg = scene.add.rectangle(x, y, width, height, 0x030914, 0.98)
    .setOrigin(0, 0.5)
    .setStrokeStyle(1, 0x39617c, 0.95);
  const slot = scene.add.rectangle(x + 2, y, width - 4, height - 4, 0x07111e, 1).setOrigin(0, 0.5);
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
  if (action.type === "guard") return ["Reduce 50% del daño", "Recupera 12 chakra · Velocidad 20"];

  const speed = action.subtitle.match(/(?:^|·)\s*V(\d+)/)?.[1];
  const accuracy = action.subtitle.match(/(?:^|·)\s*P(\d+)/)?.[1];
  const cooldown = action.subtitle.match(/(?:^|·)\s*CD(\d+)/)?.[1];
  const cost = action.cost > 0 ? `${action.cost} chakra` : "Sin coste";
  const timing = [speed && `Vel. ${speed}`, accuracy && `Prec. ${accuracy}%`, cooldown && `Recarga ${cooldown}`].filter(Boolean).join(" · ");
  return [`${cost} · ${action.damage} de daño`, timing];
}

export function createActionButton(scene, action, index, totalActions) {
  const gap = 10;
  const availableWidth = 916;
  const width = Math.min(210, Math.floor((availableWidth - gap * (totalActions - 1)) / totalActions));
  const totalWidth = width * totalActions + gap * (totalActions - 1);
  const height = 108;
  const x = (960 - totalWidth) / 2 + index * (width + gap);
  const y = 423;
  const accent = action.color || 0x65bce9;

  const shadow = scene.add.rectangle(x + 3, y + 5, width, height, 0x000000, 0.42)
    .setOrigin(0)
    .setDepth(19);
  const bg = scene.add.rectangle(x, y, width, height, 0x06111f, 0.985)
    .setOrigin(0)
    .setStrokeStyle(1.25, 0x477b9e, 0.98)
    .setDepth(20);

  let frame = null;
  if (scene.textures.exists("actionFrame")) {
    if (typeof scene.add.nineslice === "function") {
      frame = scene.add.nineslice(x + width / 2, y + height / 2, "actionFrame", null, width, height, 44, 44, 44, 44).setTint(0x16466a).setAlpha(0.06).setDepth(21);
    } else {
      frame = scene.add.image(x + width / 2, y + height / 2, "actionFrame").setDisplaySize(width, height).setTint(0x16466a).setAlpha(0.06).setDepth(21);
    }
  }

  const glow = scene.add.rectangle(x + 1, y + 1, width - 2, 3, accent, 1).setOrigin(0).setDepth(22);
  const icon = scene.add.circle(x + 35, y + 37, 25, 0x030b16, 1).setStrokeStyle(2, accent, 0.95).setDepth(22);
  const glyph = action.type === "guard" ? "◇" : action.element === "fire" ? "✦" : action.element === "wind" ? "≋" : action.element === "lightning" ? "ϟ" : "◆";
  const iconText = action.iconTexture && scene.textures.exists(action.iconTexture)
    ? scene.add.image(x + 35, y + 37, action.iconTexture).setDisplaySize(52, 52).setDepth(23)
    : scene.add.text(x + 35, y + 37, glyph, {
        fontFamily: "Cinzel, Georgia, serif",
        fontSize: "20px",
        color: `#${action.color.toString(16).padStart(6, "0")}`,
        fontStyle: "bold"
      }).setOrigin(0.5).setDepth(23);

  const shortcutBg = scene.add.rectangle(x + width - 17, y + 17, 24, 24, 0x0b2c44, 1)
    .setStrokeStyle(1, 0x65bce9, 1)
    .setDepth(23);
  const shortcut = scene.add.text(x + width - 17, y + 17, String(index + 1), {
    fontFamily: "Alegreya Sans, Segoe UI, sans-serif",
    fontSize: "13px",
    color: "#f7fbff",
    fontStyle: "bold"
  }).setOrigin(0.5).setDepth(24);

  const name = scene.add.text(x + 70, y + 18, action.name, {
    fontFamily: "Alegreya Sans, Segoe UI, sans-serif",
    fontSize: width >= 180 ? "15px" : "13px",
    color: "#f7fbff",
    fontStyle: "bold",
    stroke: "#070c12",
    strokeThickness: 1,
    wordWrap: { width: width - 105 },
    maxLines: 2,
    lineSpacing: -2
  }).setDepth(24);

  const [summary, timing] = actionLines(action);
  const divider = scene.add.rectangle(x + 12, y + 71, width - 24, 1, 0x5f8eaa, 0.28).setOrigin(0).setDepth(23);
  const summaryText = scene.add.text(x + 12, y + 78, summary, {
    fontFamily: "Alegreya Sans, Segoe UI, sans-serif",
    fontSize: width >= 180 ? "12px" : "10px",
    color: "#dcebf5",
    fontStyle: "bold",
    stroke: "#070c12",
    strokeThickness: 1,
    wordWrap: { width: width - 24 },
    maxLines: 1
  }).setDepth(24);

  const sub = scene.add.text(x + 12, y + (width >= 180 ? 95 : 91), timing, {
    fontFamily: "Alegreya Sans, Segoe UI, sans-serif",
    fontSize: width >= 180 ? "10px" : "9px",
    color: "#83bddc",
    fontStyle: "bold",
    wordWrap: { width: width - 24 },
    maxLines: width >= 180 ? 1 : 2,
    lineSpacing: -2
  }).setDepth(24);

  const hit = scene.add.rectangle(x, y, width, height, 0xffffff, 0.001).setOrigin(0).setDepth(25).setInteractive({ useHandCursor: true });
  return { shadow, bg, frame, glow, icon, iconText, shortcutBg, shortcut, name, divider, summaryText, sub, hit, jutsu: action };
}
