import { AFFINITY_IDS, availableAffinitySlots, validateAffinityOrder } from "../affinity-system.js?v=0.114.0";
import { canAccessElement } from "../elements.js?v=0.20.0";

export const BASIC_AFFINITY_TECHNIQUES = Object.freeze({
  fuego: "fire_embers", agua: "water_bullet", tierra: "earth_fist", viento: "wind_palm"
});

export function enemyAffinityOrder(profile) {
  const order = profile.affinities ?? [profile.affinity];
  if (!AFFINITY_IDS.includes(profile.affinity) || !validateAffinityOrder(order) || order[0] !== profile.affinity) {
    throw new Error(`${profile.name || "Enemigo"}: necesita una afinidad dominante válida y un orden de afinidades coherente`);
  }
  const slots = availableAffinitySlots(profile.level, 1, false, "Novicio", profile.completedAffinityTrials || []);
  if (order.length > slots) throw new Error(`${profile.name || "Enemigo"}: afinidades adicionales sin nivel y pruebas de afinidad completadas`);
  return [...order];
}

export function enemyCanUseElement(enemy, action) {
  if (!action) return false;
  if (["physical", "none"].includes(action.element) || (!action.element && !action.seals?.length)) return true;
  const order = enemy.affinities ?? [enemy.primaryAffinity];
  return validateAffinityOrder(order) && order[0] === enemy.primaryAffinity
    && canAccessElement(action.element, order, order.length);
}
