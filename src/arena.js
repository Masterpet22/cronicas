import { ENEMY_ROSTER } from "./data.js?v=0.114.0";
import { derivedStats } from "./save.js?v=0.123.0";
import { createEnemyState } from "./battle/enemy-state.js?v=0.114.0";
import { META_ASSET_VERSION } from "./asset-urls.js?v=0.115.0";

export const ARENA_BACKGROUND = `assets/locations/arena.webp?v=${META_ASSET_VERSION}`;
export const ARENA_RIVALS = Object.freeze([
  { id: "fire", name: "Duelista de fuego", affinity: "fuego", profile: "ash_adept", detail: "Presiona con ataques de fuego y golpes directos." },
  { id: "water", name: "Duelista de agua", affinity: "agua", profile: "venom_medic", detail: "Alterna estados alterados y ataques para desgastarte." },
  { id: "earth", name: "Duelista de tierra", affinity: "tierra", profile: "stone_hunter", detail: "Favorece los golpes fuertes y una defensa resistente." },
  { id: "wind", name: "Duelista de viento", affinity: "viento", profile: "reed_bandit", detail: "Mantiene la presión con ataques rápidos." }
].map(Object.freeze));
export const ARENA_DIFFICULTIES = Object.freeze([
  { id: "casual", name: "Iniciación", health: .8, power: .65, speed: .85, accuracy: 80, detail: "Un rival más débil para practicar tus técnicas." },
  { id: "balanced", name: "Equilibrado", health: 1, power: .9, speed: 1, accuracy: 90, detail: "Estadísticas ajustadas al nivel y equipo de tu personaje." },
  { id: "challenge", name: "Desafío", health: 1.25, power: 1.15, speed: 1.1, accuracy: 96, detail: "Más resistencia y potencia para poner a prueba tu configuración." }
].map(Object.freeze));
export function normalizeArenaSettings(settings = {}) {
  settings = settings && typeof settings === "object" ? settings : {};
  return { rival: ARENA_RIVALS.some(entry => entry.id === settings.rival) ? settings.rival : "fire",
    difficulty: ARENA_DIFFICULTIES.some(entry => entry.id === settings.difficulty) ? settings.difficulty : "balanced" };
}
export function arenaRivalProfile(save, settings) {
  const config = normalizeArenaSettings(settings), rival = ARENA_RIVALS.find(entry => entry.id === config.rival);
  const difficulty = ARENA_DIFFICULTIES.find(entry => entry.id === config.difficulty), stats = derivedStats(save);
  const base = ENEMY_ROSTER[rival.profile];
  return { ...base, name: rival.name.toUpperCase(), level: save.progression.level, boss: false, phase2Pattern: undefined,
    stats: { health: Math.max(1, Math.round(stats.maxHp * difficulty.health)), chakra: stats.maxChakra,
      strength: Math.max(0, Math.round((stats.baseStrength ?? stats.strength) * difficulty.power)),
      speed: Math.max(1, Math.round((stats.baseSpeed ?? stats.speed) * difficulty.speed)), luck: stats.luck },
    accuracy: difficulty.accuracy, pattern: config.difficulty === "casual" ? ["quick", "quick", "heavy"] : [...base.pattern] };
}
export function createExhibition(settings) {
  const config = normalizeArenaSettings(settings), rival = ARENA_RIVALS.find(entry => entry.id === config.rival);
  return { id: "arena-exhibition", type: "exhibition", category: "arena", exhibition: true, arenaSettings: config,
    title: "Exhibición local", location: "Arena del Horizonte", number: 1, arenaNumber: 1,
    encounters: [rival.profile], flow: [{ type: "combat" }] };
}
export function arenaPreview(save, settings) {
  const mission = createExhibition(settings), profile = arenaRivalProfile(save, mission.arenaSettings);
  return { profile, enemy: createEnemyState(profile, mission, save.campaign), player: derivedStats(save) };
}
