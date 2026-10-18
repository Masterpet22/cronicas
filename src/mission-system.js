export const MISSION_CATEGORIES = Object.freeze({ MAIN: "main", SECONDARY: "secondary" });
export const MISSION_STEP_TYPES = Object.freeze(["dialogue", "combat", "investigation", "route", "choice", "resource", "consequence"]);
export const MISSION_REQUIREMENT_TYPES = Object.freeze(["main-completed", "secondary-completed", "flag", "level", "all", "any"]);
export const MISSION_EFFECT_TYPES = Object.freeze(["set-flag", "sum-flags", "context-flag"]);

const campaignOf = (save) => save?.campaign || {};
const completedMain = (save) => new Set(campaignOf(save).completedMissions || []);
const completedSecondary = (save) => new Set(campaignOf(save).completedSecondaryMissions || []);

export function requirementMet(requirement, save) {
  if (!requirement) return true;
  const campaign = campaignOf(save);
  switch (requirement.type) {
    case "main-completed": return completedMain(save).has(requirement.id);
    case "secondary-completed": return completedSecondary(save).has(requirement.id);
    case "flag": return Boolean(campaign[requirement.id]) === (requirement.value ?? true);
    case "level": return (Number(save?.progression?.level) || 1) >= requirement.minimum;
    case "all": return requirement.requirements.every((entry) => requirementMet(entry, save));
    case "any": return requirement.requirements.some((entry) => requirementMet(entry, save));
    default: return false;
  }
}

export function unmetRequirements(mission, save) {
  return (mission.requirements || []).filter((requirement) => !requirementMet(requirement, save));
}

export function missionState(mission, save) {
  const completed = mission.category === MISSION_CATEGORIES.SECONDARY
    ? completedSecondary(save).has(mission.id)
    : completedMain(save).has(mission.id);
  const unmet = unmetRequirements(mission, save);
  return { completed, unlocked: completed || unmet.length === 0, unmet };
}

export function missionsForBoard(missions, board, save, { includeLocked = true } = {}) {
  return missions
    .filter((mission) => mission.board === board)
    .map((mission) => ({ mission, state: missionState(mission, save) }))
    .filter(({ state }) => includeLocked || state.unlocked);
}

export function nextAvailableMission(missions, category, save) {
  return missions
    .filter((mission) => mission.category === category)
    .map((mission) => ({ mission, state: missionState(mission, save) }))
    .find(({ state }) => state.unlocked && !state.completed)?.mission || null;
}

export function missionHasStep(mission, type, id = null) {
  return (mission?.flow || []).some((step) => step.type === type && (id === null || step.id === id));
}

export function missionStep(mission, type, id = null) {
  return (mission?.flow || []).find((step) => step.type === type && (id === null || step.id === id)) || null;
}

export function applyMissionEffects(save, effects = [], context = {}) {
  const campaign = save.campaign;
  effects.forEach((effect) => {
    if (effect.type === "set-flag") campaign[effect.id] = effect.value;
    if (effect.type === "sum-flags") {
      campaign[effect.id] = (effect.base || 0) + (effect.sources || []).reduce((sum, id) => sum + (Number(campaign[id]) || 0), 0);
    }
    if (effect.type === "context-flag") campaign[effect.id] = Boolean(context[effect.context]);
  });
  return save;
}

export function validateMissionCatalog(missions, sagas = []) {
  const errors = [];
  const ids = new Set();
  const supportedSteps = new Set(MISSION_STEP_TYPES);
  const supportedRequirements = new Set(MISSION_REQUIREMENT_TYPES);
  const supportedEffects = new Set(MISSION_EFFECT_TYPES);
  const validateRequirement = (requirement, missionId) => {
    if (!requirement || !supportedRequirements.has(requirement.type)) {
      errors.push(`${missionId}: requisito desconocido ${requirement?.type || "(vacío)"}`);
      return;
    }
    if (["all", "any"].includes(requirement.type)) {
      if (!Array.isArray(requirement.requirements) || requirement.requirements.length === 0) errors.push(`${missionId}: ${requirement.type} necesita requisitos internos`);
      (requirement.requirements || []).forEach((entry) => validateRequirement(entry, missionId));
      return;
    }
    if (requirement.type === "level" && !Number.isFinite(requirement.minimum)) errors.push(`${missionId}: requisito de nivel inválido`);
    if (requirement.type === "main-completed" && !missions.some((entry) => entry.id === requirement.id && entry.category === MISSION_CATEGORIES.MAIN)) {
      errors.push(`${missionId}: requisito principal inexistente ${requirement.id}`);
    }
    if (requirement.type === "secondary-completed" && !missions.some((entry) => entry.id === requirement.id && entry.category === MISSION_CATEGORIES.SECONDARY)) {
      errors.push(`${missionId}: requisito secundario inexistente ${requirement.id}`);
    }
  };
  missions.forEach((mission) => {
    if (!mission.id || ids.has(mission.id)) errors.push(`ID de misión duplicado o vacío: ${mission.id || "(vacío)"}`);
    ids.add(mission.id);
    if (!Object.values(MISSION_CATEGORIES).includes(mission.category)) errors.push(`${mission.id}: categoría desconocida`);
    if (!mission.board) errors.push(`${mission.id}: falta board`);
    if (!Array.isArray(mission.flow) || mission.flow.length === 0) errors.push(`${mission.id}: falta flujo de actividades`);
    (mission.flow || []).forEach((step) => {
      if (!supportedSteps.has(step.type)) errors.push(`${mission.id}: mecánica desconocida ${step.type}`);
      if (step.type !== "dialogue" && !step.id) errors.push(`${mission.id}: paso ${step.type} sin ID semántico`);
    });
    (mission.requirements || []).forEach((requirement) => validateRequirement(requirement, mission.id));
    (mission.completionEffects || []).forEach((effect) => {
      if (!supportedEffects.has(effect.type)) errors.push(`${mission.id}: efecto desconocido ${effect.type}`);
      if (!effect.id) errors.push(`${mission.id}: efecto ${effect.type} sin destino`);
    });
  });
  [
    [MISSION_CATEGORIES.MAIN, "m"],
    [MISSION_CATEGORIES.SECONDARY, "s"]
  ].forEach(([category, prefix]) => {
    missions.filter((mission) => mission.category === category).sort((a, b) => a.number - b.number).forEach((mission, index) => {
      const expected = `${prefix}${String(index + 1).padStart(2, "0")}`;
      if (mission.id !== expected || mission.number !== index + 1) errors.push(`${mission.id}: secuencia inválida; se esperaba ${expected}`);
    });
  });
  sagas.forEach((saga) => saga.missionIds.forEach((id) => {
    if (!missions.some((mission) => mission.id === id && mission.category === MISSION_CATEGORIES.MAIN)) errors.push(`${saga.id}: misión principal inexistente ${id}`);
  }));
  return errors;
}
