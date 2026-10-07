export function createBar(scene, x, y, width, height, color) {
  const bg = scene.add.rectangle(x, y, width, height, 0x05070a, 0.75).setOrigin(0, 0.5);
  const fill = scene.add.rectangle(x + 2, y, width - 4, height - 4, color, 1).setOrigin(0, 0.5);
  return { bg, fill, width: width - 4, x: x + 2 };
}

export function createActionButton(scene, action, index, textStyle) {
  const width = 145;
  const height = 102;
  const x = 18 + index * 155;
  const y = 428;
  const bg = scene.add.rectangle(x, y, width, height, 0x0b1524, 0.97).setOrigin(0).setStrokeStyle(1, 0x375478);
  const glow = scene.add.rectangle(x + 3, y + 3, width - 6, 3, action.color, 0.88).setOrigin(0);
  const icon = scene.add.circle(x + 29, y + 30, 20, 0x08111d, 1).setStrokeStyle(2, action.color, 0.9);
  const glyph = action.type === "guard" ? "◇" : action.element === "fire" ? "✦" : action.element === "wind" ? "≋" : action.element === "lightning" ? "ϟ" : "◆";
  const iconText = scene.add.text(x + 29, y + 30, glyph, textStyle(20, `#${action.color.toString(16).padStart(6, "0")}`, "800")).setOrigin(0.5);
  const name = scene.add.text(x + 12, y + 56, action.name, { ...textStyle(13, "#f4f7fb", "700"), wordWrap: { width: width - 22 }, maxLines: 1 });
  const sub = scene.add.text(x + 12, y + 78, action.subtitle, { ...textStyle(9, "#9fb3cf", "500"), wordWrap: { width: width - 22 }, maxLines: 1 });
  const hit = scene.add.rectangle(x, y, width, height, 0xffffff, 0.001).setOrigin(0).setInteractive({ useHandCursor: true });
  return { bg, glow, icon, iconText, name, sub, hit, jutsu: action };
}

