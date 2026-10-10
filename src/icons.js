const ICON_ROOT = "assets/icons/lucide";

export const UI_ICONS = Object.freeze({
  health: { texture: "lucide-heart", file: "heart.svg" },
  chakra: { texture: "lucide-droplets", file: "droplets.svg" },
  speed: { texture: "lucide-gauge", file: "gauge.svg" },
  lock: { texture: "lucide-lock", file: "lock.svg" },
  pause: { texture: "lucide-pause", file: "pause.svg" },
  guard: { texture: "lucide-shield", file: "shield.svg" },
  damage: { texture: "lucide-swords", file: "swords.svg" },
  energy: { texture: "lucide-zap", file: "zap.svg" }
});

export function loadUiIcons(scene) {
  Object.values(UI_ICONS).forEach(({ texture, file }) => {
    if (!scene.textures.exists(texture)) {
      scene.load.svg(texture, `${ICON_ROOT}/${file}`, { width: 128, height: 128 });
    }
  });
}

export function createUiIcon(scene, name, x, y, options = {}) {
  const definition = UI_ICONS[name];
  if (!definition) throw new Error(`Icono de interfaz desconocido: ${name}`);
  const size = options.size || 16;
  return scene.add.image(x, y, definition.texture)
    .setDisplaySize(size, size)
    .setTint(options.tint ?? 0xffffff)
    .setAlpha(options.alpha ?? 1)
    .setDepth(options.depth ?? 24);
}
