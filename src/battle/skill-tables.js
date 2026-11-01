import { ITEMS } from "../items.js?v=0.126.0";

export function actionHealthCost(action) {
  return Math.max(0, Math.floor(Number(action?.healthCost) || 0));
}

export function physicalSkillActions(save, elementalActions) {
  const weapon = ITEMS[save.equipment.weapon];
  const owned = weapon?.slot === "weapon" && save.inventory.items[weapon.id] > 0;
  // Conserva las estadísticas del golpe actual: el arma ya aporta sus bonos al luchador.
  // Los movimientos específicos de cada arma se incorporarán con sus animaciones.
  const weaponStrike = owned ? { ...elementalActions[0], id: "weapon_strike", name: "Golpe de arma", type: "weapon",
    weaponId: weapon.id, equipmentName: weapon.name, iconTexture: null, cost: 0, healthCost: 0,
    description: `Ataca con ${weapon.name}, el arma que llevas equipada.` } : null;
  return [elementalActions[0], weaponStrike, null, null, null, elementalActions[5]];
}

export function physicalEmptySkill(index) {
  if (index === 1) return { name: "Golpe de arma", requirement: "SIN ARMA", locked: false, description: "Necesitas llevar un arma equipada en el Dojo." };
  if (index === 2) return { name: "Arma arrojadiza", requirement: "SIN EQUIPO", locked: false, description: "Ranura reservada para el arma arrojadiza equipada." };
  return { name: "Sin taijutsu", requirement: "LIBRE", locked: false, description: "Ranura para equipar una técnica física. Los taijutsus consumirán vida en lugar de chakra." };
}

export function physicalActionAvailable(scene, action) {
  return Boolean(action && !scene.busy && !scene.finished && scene.turnReady && !scene.scene.isPaused()
    && scene.player.hp > actionHealthCost(action) && scene.player.chakra >= scene.actionCost(action)
    && !(scene.cooldowns[action.id] > 0) && (action.type !== "guard" || !scene.player.guarding));
}

export function skillResourceLabel(scene, action, physical = false) {
  const health = actionHealthCost(action);
  return health || physical ? `${health} PV` : `${scene.actionCost(action)} CH`;
}
