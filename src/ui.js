export function createBar(scene, x, y, width, height, color) {
  const bg = scene.add.rectangle(x, y, width, height, 0x05070a, 0.75).setOrigin(0, 0.5);
  const fill = scene.add.rectangle(x + 2, y, width - 4, height - 4, color, 1).setOrigin(0, 0.5);
  return { bg, fill, width: width - 4, x: x + 2 };
}

export function createActionButton(scene, action, index, textStyle) {
  const col = index % 3;
  const row = Math.floor(index / 3);
  const x = 28 + col * 303;
  const y = 414 + row * 59;
  const bg = scene.add.rectangle(x, y, 289, 50, 0x182231, 1).setOrigin(0).setStrokeStyle(1, 0x344154);
  const stripe = scene.add.rectangle(x, y, 5, 50, action.color, 1).setOrigin(0);
  const name = scene.add.text(x + 17, y + 8, action.name, textStyle(14, "#f4f7fb", "700"));
  const sub = scene.add.text(x + 17, y + 29, action.subtitle, textStyle(10, "#aeb9c8", "500"));
  const hit = scene.add.rectangle(x, y, 289, 50, 0xffffff, 0.001).setOrigin(0).setInteractive({ useHandCursor: true });
  return { bg, stripe, name, sub, hit, jutsu: action };
}

