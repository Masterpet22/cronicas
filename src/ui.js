export function createBar(scene, x, y, width, height, color) {
  const bg = scene.add.rectangle(x, y, width, height, 0x090d15, 0.96)
    .setOrigin(0, 0.5)
    .setStrokeStyle(1.5, 0x7a5b35, 0.9);
  const slot = scene.add.rectangle(x + 2, y, width - 4, height - 4, 0x05070c, 0.85).setOrigin(0, 0.5);
  const fill = scene.add.rectangle(x + 2, y, width - 4, height - 4, color, 1).setOrigin(0, 0.5);
  const sheen = scene.add.rectangle(x + 2, y - height / 4 + 1, width - 4, Math.max(2, Math.floor(height / 3)), 0xffffff, 0.12)
    .setOrigin(0, 0.5);
  const valueText = scene.add.text(x + width / 2, y, "", {
    fontFamily: "Alegreya Sans, Segoe UI, sans-serif",
    fontSize: "11px",
    color: "#fff4df",
    fontStyle: "bold",
    stroke: "#060a10",
    strokeThickness: 3
  }).setOrigin(0.5);
  return { bg, slot, fill, sheen, valueText, width: width - 4, x: x + 2 };
}

export function createActionButton(scene, action, index, textStyle) {
  const width = 145;
  const height = 102;
  const x = 18 + index * 155;
  const y = 428;

  const bg = scene.add.rectangle(x, y, width, height, 0x0e1420, 0.98)
    .setOrigin(0)
    .setStrokeStyle(1.5, 0x8a6b3e, 0.95);

  let frame = null;
  if (scene.textures.exists("actionFrame")) {
    if (typeof scene.add.nineslice === "function") {
      frame = scene.add.nineslice(x + width / 2, y + height / 2, "actionFrame", null, width, height, 44, 44, 44, 44).setAlpha(0.92);
    } else {
      frame = scene.add.image(x + width / 2, y + height / 2, "actionFrame").setDisplaySize(width, height).setAlpha(0.92);
    }
  }

  const glow = scene.add.rectangle(x + 4, y + 4, width - 8, 2.5, action.color, 0.88).setOrigin(0);
  const icon = scene.add.circle(x + 32, y + 29, 23, 0x080d14, 1).setStrokeStyle(2, 0xb88846, 0.92);
  const glyph = action.type === "guard" ? "◇" : action.element === "fire" ? "✦" : action.element === "wind" ? "≋" : action.element === "lightning" ? "ϟ" : "◆";
  const iconText = action.iconTexture && scene.textures.exists(action.iconTexture)
    ? scene.add.image(x + 32, y + 29, action.iconTexture).setDisplaySize(48, 48)
    : scene.add.text(x + 32, y + 29, glyph, {
        fontFamily: "Cinzel, Georgia, serif",
        fontSize: "20px",
        color: `#${action.color.toString(16).padStart(6, "0")}`,
        fontStyle: "bold"
      }).setOrigin(0.5);

  const shortcutBg = scene.add.rectangle(x + width - 15, y + 15, 20, 20, 0x140e0b, 0.95)
    .setStrokeStyle(1, 0xc5925c, 0.95);
  const shortcut = scene.add.text(x + width - 15, y + 15, String(index + 1), {
    fontFamily: "Cinzel, Georgia, serif",
    fontSize: "11px",
    color: "#fff4df",
    fontStyle: "bold"
  }).setOrigin(0.5);

  const name = scene.add.text(x + 12, y + 56, action.name, {
    fontFamily: "Cinzel, Georgia, serif",
    fontSize: "12px",
    color: "#fff4df",
    fontStyle: "bold",
    stroke: "#070c12",
    strokeThickness: 2,
    wordWrap: { width: width - 24 },
    maxLines: 1
  });

  const sub = scene.add.text(x + 12, y + 78, action.subtitle, {
    fontFamily: "Alegreya Sans, Segoe UI, sans-serif",
    fontSize: "10px",
    color: "#c5b8a5",
    fontStyle: "bold",
    stroke: "#070c12",
    strokeThickness: 2,
    wordWrap: { width: width - 24 },
    maxLines: 1
  });

  const hit = scene.add.rectangle(x, y, width, height, 0xffffff, 0.001).setOrigin(0).setInteractive({ useHandCursor: true });
  return { bg, frame, glow, icon, iconText, shortcutBg, shortcut, name, sub, hit, jutsu: action };
}
