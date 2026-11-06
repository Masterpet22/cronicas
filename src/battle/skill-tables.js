import { ITEMS } from "../items.js?v=0.140.0";
import { normalizeTaijutsuLoadout, taijutsuAction } from "../skills/taijutsu.js?v=1.0.0";
import { EQUIPMENT_ACTIONS } from "../data.js?v=1.5.0";

export function actionHealthCost(action) {
  return Math.max(0, Math.floor(Number(action?.healthCost) || 0));
}

export function physicalSkillActions(save, elementalActions) {
  const weapon = ITEMS[save.equipment.weapon];
  const owned = weapon?.slot === "weapon" && save.inventory.items[weapon.id] > 0;
  // Equipment bonuses already contribute to the fighter's derived statistics.
  const weaponStrike = owned ? { ...EQUIPMENT_ACTIONS[0],
    weaponId: weapon.id, equipmentName: weapon.name, iconTexture: null, cost: 0, healthCost: 0, initiative: 0,
    description: `Ataca con ${weapon.name}, el arma que llevas equipada.` } : null;
  const taijutsus = normalizeTaijutsuLoadout(save).map(id => taijutsuAction(save,id));
  const throwable = ITEMS[save.equipment.throwable];
  const thrownStrike = throwable?.slot === "throwable" && save.inventory.items[throwable.id] > 0
    ? { ...EQUIPMENT_ACTIONS[1], name: throwable.name, weaponId: throwable.id,
      equipmentName: throwable.name, iconTexture: null, cost: 0, healthCost: 0,
      description: "Lanza el shuriken equipado contra el rival. Es reutilizable y no consume vida ni chakra." } : null;
  return [elementalActions[0], weaponStrike, thrownStrike, ...taijutsus, elementalActions[5]];
}

export function physicalEmptySkill(index) {
  if (index === 1) return { name: "Golpe de arma", requirement: "SIN ARMA", locked: false, description: "Necesitas llevar un arma equipada en el Dojo." };
  if (index === 2) return { name: "Arma arrojadiza", requirement: "SIN EQUIPO", locked: false, description: "Equipa un arma arrojadiza en el Dojo para poder lanzarla." };
  return { name: "Sin taijutsu", requirement: "LIBRE", locked: false, description: "Equipa un taijutsu en el Dojo. Consume vida en lugar de chakra." };
}

export function physicalActionAvailable(scene, action) {
  if (scene.mission?.training) return Boolean(action && !scene.busy && !scene.finished && scene.turnReady && !scene.scene.isPaused());
  return Boolean(action && !scene.busy && !scene.finished && scene.turnReady && !scene.scene.isPaused()
    && (!scene.combatTutorial?.active || scene.combatTutorial.canUse(action))
    && scene.player.hp > actionHealthCost(action) && scene.player.chakra >= scene.actionCost(action)
    && !(scene.cooldowns[action.id] > 0) && (action.type !== "guard" || !scene.player.guarding));
}

export function skillResourceLabel(scene, action, physical = false) {
  const health = actionHealthCost(action);
  return health || physical ? `${health} PV` : `${scene.actionCost(action)} CH`;
}
