import { MISSIONS, SECONDARY_MISSIONS } from "./content/index.js?v=0.114.0";
import { validateMissionTransitions } from "./mission-transitions.js";

export const MISSION_CATEGORIES = Object.freeze({ MAIN: "main", SECONDARY: "secondary" });
export const MISSION_STEP_TYPES = Object.freeze(["dialogue", "combat", "investigation", "route", "choice", "resource", "consequence"]);
export const MISSION_REQUIREMENT_TYPES = Object.freeze(["main-completed", "secondary-completed", "flag", "item-owned", "level", "all", "any"]);
export const MISSION_EFFECT_TYPES = Object.freeze(["set-flag", "sum-flags", "context-flag"]);
export const MISSION_MODIFIER_TYPES = Object.freeze(["enemy-stats", "enemy-opening", "enemy-defense", "encounter-route", "field-supplies"]);

const campaignOf = (save) => save?.campaign || {};
const completedMain = (save) => new Set(campaignOf(save).completedMissions || []);
const completedSecondary = (save) => new Set(campaignOf(save).completedSecondaryMissions || []);

const combatIds = MISSIONS.filter((mission) => !mission.type).map((mission) => mission.id);
const fieldIdsByType = Object.fromEntries([...MISSIONS, ...SECONDARY_MISSIONS].map((mission) => [mission.type, mission.id]));
const DERIVED_CAMPAIGN_VALUES = Object.freeze({
  kagemoriInvestigated: (save) => completedMain(save).has(fieldIdsByType.investigation),
  banditBossMissionUnlocked: (save) => completedMain(save).has(fieldIdsByType.investigation),
  doctorMissionUnlocked: (save) => completedMain(save).has(combatIds[1]),
  doctorMissionCompleted: (save) => completedMain(save).has(fieldIdsByType["route-search"]),
  cipherMapObtained: (save) => completedMain(save).has(combatIds[1]),
  bestiaryBookObtained: (save) => completedMain(save).has(fieldIdsByType["route-search"]),
  hideoutLocationRevealed: (save) => completedMain(save).has(fieldIdsByType["route-search"]),
  hideoutMissionUnlocked: (save) => Boolean(campaignOf(save).archiveUnlocked),
  secretEntranceKnown: (save) => campaignOf(save).banditPrisonerChoice === "interrogate" && Boolean(campaignOf(save).archiveUnlocked),
  heartMissionUnlocked: (save) => completedMain(save).has(combatIds[2]),
  prisonersRescued: (save) => campaignOf(save).hideoutDiscoveryChoice === "prisoners",
  organizationDocumentsRecovered: (save) => campaignOf(save).hideoutDiscoveryChoice === "documents",
  organizationRevealed: (save) => Boolean(campaignOf(save).hideoutDiscoveryChoice) || completedMain(save).has(combatIds[3]),
  banditLeaderMissionUnlocked: (save) => completedMain(save).has(combatIds[3]),
  firstSagaCompleted: (save) => completedMain(save).has(combatIds[4]),
  masterSelectionUnlocked: (save) => completedMain(save).has(combatIds[4])
});

export function campaignFlag(save, id) {
  return DERIVED_CAMPAIGN_VALUES[id] ? DERIVED_CAMPAIGN_VALUES[id](save) : campaignOf(save)[id] ?? false;
}

export function requirementMet(requirement, save) {
  if (!requirement) return true;
  const campaign = campaignOf(save);
  switch (requirement.type) {
    case "main-completed": return completedMain(save).has(requirement.id);
    case "secondary-completed": return completedSecondary(save).has(requirement.id);
    case "flag": {
      if (Object.hasOwn(requirement, "equals")) return campaignFlag(save, requirement.id) === requirement.equals;
      return campaignFlag(save, requirement.id) === (requirement.value ?? true);
    }
    case "item-owned": return (Number(save?.inventory?.items?.[requirement.id]) || 0) > 0;
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
  missions.forEach(mission => errors.push(...validateMissionTransitions(mission)));
  const supportedSteps = new Set(MISSION_STEP_TYPES);
  const supportedRequirements = new Set(MISSION_REQUIREMENT_TYPES);
  const supportedEffects = new Set(MISSION_EFFECT_TYPES);
  const supportedModifiers = new Set(MISSION_MODIFIER_TYPES);
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
    if (["flag", "item-owned", "main-completed", "secondary-completed"].includes(requirement.type) && !requirement.id) {
      errors.push(`${missionId}: requisito ${requirement.type} sin ID`);
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
      (step.modifiers || []).forEach((modifier) => {
        if (!supportedModifiers.has(modifier.type)) errors.push(`${mission.id}: modificador desconocido ${modifier.type}`);
        if (modifier.when) validateRequirement(modifier.when, mission.id);
        if (modifier.unless) validateRequirement(modifier.unless, mission.id);
        if (modifier.target && !["all", "boss"].includes(modifier.target)) errors.push(`${mission.id}: objetivo de modificador desconocido ${modifier.target}`);
        if (modifier.type === "enemy-stats") {
          const values = [...Object.values(modifier.stats || {}), ...(Object.hasOwn(modifier, "accuracy") ? [modifier.accuracy] : [])];
          if (!values.length || values.some((value) => !Number.isFinite(value))) errors.push(`${mission.id}: enemy-stats necesita ajustes numéricos`);
        }
        if (modifier.type === "enemy-opening" && (!Number.isFinite(modifier.hpMultiplier) || modifier.hpMultiplier <= 0)) {
          errors.push(`${mission.id}: enemy-opening necesita hpMultiplier positivo`);
        }
        if (modifier.type === "enemy-defense" && (!Number.isFinite(modifier.damageReduction) || modifier.damageReduction < 0)) {
          errors.push(`${mission.id}: enemy-defense necesita damageReduction no negativo`);
        }
        if (modifier.type === "encounter-route" && (!Number.isInteger(modifier.skip) || modifier.skip < 0)) {
          errors.push(`${mission.id}: encounter-route necesita skip entero no negativo`);
        }
        if (modifier.type === "field-supplies" && (!modifier.sourceFlag || !Number.isFinite(modifier.minimum) || modifier.minimum < 0)) {
          errors.push(`${mission.id}: field-supplies necesita sourceFlag y mínimo no negativo`);
        }
      });
      if (step.announcedActionIds && (!Array.isArray(step.announcedActionIds) || step.announcedActionIds.some((id) => typeof id !== "string" || !id))) {
        errors.push(`${mission.id}: announcedActionIds debe contener IDs no vacíos`);
      }
      if (step.completionBonus) {
        if (!Number.isFinite(step.completionBonus.coins) || step.completionBonus.coins < 0) errors.push(`${mission.id}: bonificación de monedas inválida`);
        if (!Array.isArray(step.completionBonus.requirements) || !step.completionBonus.requirements.length) errors.push(`${mission.id}: bonificación sin requisitos`);
        (step.completionBonus.requirements || []).forEach((requirement) => validateRequirement(requirement, mission.id));
      }
    });
    (mission.requirements || []).forEach((requirement) => validateRequirement(requirement, mission.id));
    (mission.completionEffects || []).forEach((effect) => {
      if (!supportedEffects.has(effect.type)) errors.push(`${mission.id}: efecto desconocido ${effect.type}`);
      if (!effect.id) errors.push(`${mission.id}: efecto ${effect.type} sin destino`);
    });
  });
  [MISSION_CATEGORIES.MAIN, MISSION_CATEGORIES.SECONDARY].forEach((category) => {
    missions.filter((mission) => mission.category === category).sort((a, b) => a.number - b.number).forEach((mission, index) => {
      if (mission.number !== index + 1) errors.push(`${mission.id}: número de misión inválido; se esperaba ${index + 1}`);
    });
  });
  sagas.forEach((saga) => saga.missionIds.forEach((id) => {
    if (!missions.some((mission) => mission.id === id && mission.category === MISSION_CATEGORIES.MAIN)) errors.push(`${saga.id}: misión principal inexistente ${id}`);
  }));
  return errors;
}

