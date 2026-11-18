// Anclajes del cuerpo en el escenario lógico de 960 × 540. Phaser escala
// el escenario completo y los controles del Dojo usan estas mismas posiciones.
const slot = (id, side, role, x, y) => Object.freeze({ id, side, role, x, y });

export const COMBAT_SLOTS = Object.freeze({
  protagonist: slot("protagonist", "ally", "fighter", 220, 372),
  companion: slot("companion", "ally", "fighter", 305, 340),
  pet: slot("pet", "ally", "support", 240, 396),
  protect: slot("protect", "ally", "protect", 365, 391),
  enemyCenter: slot("enemyCenter", "enemy", "fighter", 662, 372),
  enemyUpper: slot("enemyUpper", "enemy", "fighter", 765, 330),
  enemyLower: slot("enemyLower", "enemy", "fighter", 868, 395),
  destroy: slot("destroy", "enemy", "destroy", 600, 393)
});

const { protagonist, enemyCenter, enemyUpper, enemyLower } = COMBAT_SLOTS;
const proposedEnemies = Object.freeze([enemyCenter, enemyUpper, enemyLower]);
const at = (position, x, y = position.y) => Object.freeze({ ...position, x, y });

// Coordenadas en uso mientras se revisa la propuesta del Dojo.
const currentFormations = Object.freeze([
  Object.freeze([at(enemyCenter, 740)]),
  Object.freeze([at(enemyCenter, 650), at(enemyUpper, 770, enemyCenter.y)]),
  Object.freeze([at(enemyCenter, 600), at(enemyUpper, 700, 338), at(enemyLower, 800, enemyCenter.y)])
]);

export function enemyFormation(count, { preview = false } = {}) {
  return preview ? proposedEnemies.slice(0, count) : currentFormations[count - 1];
}

export function combatFighterDepth({ y }) {
  return 6 + (y - protagonist.y) / 1000;
}
