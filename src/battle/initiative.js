export const INITIATIVE_SPEED_STEP = 0.10;

export function actionInitiative(action) {
  const value = Number(action?.initiative);
  return value === -1 || value === 1 ? value : 0;
}

export function recoverySpeed(speed, initiative = 0) {
  const base = Number.isFinite(Number(speed)) ? Math.max(1, Number(speed)) : 10;
  return base * (1 + actionInitiative({ initiative }) * INITIATIVE_SPEED_STEP);
}

export function initiativeLabel(action) {
  const value = actionInitiative(action);
  return `Iniciativa ${value > 0 ? "+" : ""}${value}`;
}
