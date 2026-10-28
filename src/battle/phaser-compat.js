import { Phaser } from "./runtime.js?v=0.91.0";

export function applyFillTint(target, color) {
  if (!target?.setTint || !target?.setTintMode) return target;
  target.setTint(color).setTintMode(Phaser.TintModes.FILL);
  return target;
}
