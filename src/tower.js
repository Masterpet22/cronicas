import { createExhibition, arenaRivalProfile } from "./arena.js?v=0.131.0";
import { eventByKey, plazaSchedule, worldDate, actOnPlazaEvent } from "./plaza-events.js?v=0.130.0";
import { META_ASSET_VERSION } from "./asset-urls.js?v=0.115.0";

export const TOWER_BACKGROUND = `assets/locations/tower.webp?v=${META_ASSET_VERSION}`;
const rivals = { agua: "water", tierra: "earth", fuego: "fire", viento: "wind" };
const names = { agua: "CUSTODIO DEL AGUA", tierra: "CUSTODIO DE LA TIERRA", fuego: "CUSTODIO DEL FUEGO", viento: "CUSTODIO DEL AIRE" };
export function createElementalChallenge(key, today = worldDate()) {
  const event = plazaSchedule(today).active.find(item => item.key === key && item.activity === "tower");
  if (!event) return null;
  return { ...createExhibition({ rival: rivals[event.element], difficulty: "challenge" }), id: "tower-elemental", title: event.title, category: "tower", location: "Torre de Desafíos", tower: { key, element: event.element } };
}
export function towerRivalProfile(save, mission) {
  const base = arenaRivalProfile(save, mission.arenaSettings);
  return { ...base, name: names[mission.tower.element], affinity: mission.tower.element, boss: true, stats: { ...base.stats, health: Math.round(base.stats.health * 1.25) } };
}
export function settleExhibitionSave(runtime, load, write) {
  const save = load(), key = runtime.activeMission?.towerVictory;
  const event = key && eventByKey(key);
  if (!event || event.activity !== "tower" || key !== runtime.activeMission?.tower?.key) return save;
  // Una batalla iniciada en su fecha puede terminar después de medianoche.
  const result = actOnPlazaEvent(save, key, "victory", null, event.start);
  return result.ok ? write(result.save) : save;
}
