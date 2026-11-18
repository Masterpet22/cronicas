// Anclajes del cuerpo en el escenario lógico de 960 × 540. Phaser escala
// el escenario completo y los controles del Dojo usan estas mismas posiciones.
const slot = (id, side, role, x, y) => Object.freeze({ id, side, role, x, y });

export const COMBAT_SLOTS = Object.freeze({
  protagonist: slot("protagonist", "ally", "fighter", 280, 372),
  companion: slot("companion", "ally", "fighter", 360, 340),
  pet: slot("pet", "ally", "support", 240, 396),
  protect: slot("protect", "ally", "protect", 486, 391),
  enemyCenter: slot("enemyCenter", "enemy", "fighter", 662, 372),
  enemyUpper: slot("enemyUpper", "enemy", "fighter", 765, 360),
  enemyLower: slot("enemyLower", "enemy", "fighter", 868, 395),
  destroy: slot("destroy", "enemy", "destroy", 600, 393)
});

const { protagonist, enemyCenter, enemyUpper, enemyLower } = COMBAT_SLOTS;
const enemyFormations = Object.freeze([
  Object.freeze([enemyCenter]),
  Object.freeze([enemyCenter, enemyUpper]),
  Object.freeze([enemyCenter, enemyUpper, enemyLower])
]);

export function enemyFormation(count) {
  return enemyFormations[count - 1];
}

export function combatFighterDepth({ y }) {
  return 6 + (y - protagonist.y) / 1000;
}
