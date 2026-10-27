export const TRANSITION_MODES = Object.freeze(["route", "teleport"]);
export const TRANSITION_POINTS = Object.freeze(["departure", "betweenEncounters", "return"]);

export function missionTransitionMode(mission, point, encounterNumber = null) {
  const setting = mission?.transitions?.[point];
  const mode = point === "betweenEncounters" && setting && typeof setting === "object"
    ? setting[encounterNumber] ?? setting.default
    : setting;
  return TRANSITION_MODES.includes(mode) ? mode : "route";
}

export function validateMissionTransitions(mission) {
  const config = mission.transitions;
  if (config === undefined) return [];
  const errors = [];
  const invalid = detail => errors.push(`${mission.id}: transición ${detail}`);
  if (!config || typeof config !== "object" || Array.isArray(config)) return [`${mission.id}: transitions debe ser un objeto`];
  Object.entries(config).forEach(([point, setting]) => {
    if (!TRANSITION_POINTS.includes(point)) return invalid(`desconocida ${point}`);
    if (point === "betweenEncounters" && setting && typeof setting === "object" && !Array.isArray(setting)) {
      Object.entries(setting).forEach(([key, mode]) => {
        if (key !== "default" && (!/^[1-9]\d*$/.test(key) || Number(key) < 2 || Number(key) > (mission.encounters?.length || 0))) invalid(`de encuentro inválida ${key}`);
        if (!TRANSITION_MODES.includes(mode)) invalid(`con modo desconocido ${String(mode)}`);
      });
    } else if (!TRANSITION_MODES.includes(setting)) invalid(`con modo desconocido ${String(setting)}`);
  });
  return errors;
}
