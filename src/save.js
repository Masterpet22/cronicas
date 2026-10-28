import { ENEMY_ACTIONS, ENEMY_ROSTER, EQUIPMENT, JUTSU_LIBRARY } from "./data.js?v=0.93.0";
import { MISSIONS, SECONDARY_MISSIONS } from "./content/index.js";
import { applyMissionEffects, campaignFlag, missionState, missionStep, requirementMet } from "./mission-system.js?v=0.67.0";
import { BASIC_ELEMENT_IDS, basicRequirements, canAccessElement } from "./elements.js?v=0.20.0";
import { AFFINITY_CONFIG, applyAffinityStatModifiers, availableAffinitySlots, normalizeAffinityOrder } from "./affinity-system.js?v=0.93.0";
import { chooseDoctorRoute as chooseRoute, createDoctorRouteState, normalizeDoctorRouteState, resolveDoctorRouteCombat as resolveRouteCombat, resolveRiverPassage } from "./doctor-mission.js?v=0.100.0";
import { completeInvestigationMission, completeSecondaryByType, emptySecondaryCompletion, secondaryMissionByType } from "./secondary-missions.js?v=0.66.0";
import { createCompletedMissionProgress, migrateSaveToV17 } from "./save/save-migrations.js";
import { createSlotRepository } from "./save/slot-repository.js";
import { teleportObject } from "./teleport-objects.js";
import { applyCipherAction, cipherComplete } from "./puzzles/seal-cipher.js";
import { advanceMissionProgress as advanceCampaignMission, failMissionProgress as markMissionFailed, normalizeMissionProgress, startMissionProgress as markMissionStarted } from "./save/campaign-state.js";
import { AFFINITY_LEVEL_FOCUS, ENCOUNTER_REWARDS, attributeTrainingLimit, experienceForNextLevel, levelStatBonus } from "./progression-balance.js?v=0.94.0";
export { attributeTrainingLimit };
import { MASTER_IDS, assignedMasterId, masterIdForCharacter } from "./save/character-state.js";
export { MASTER_IDS, assignedMasterId, masterIdForCharacter } from "./save/character-state.js";
export const SAVE_KEY = "cronicas-del-sello-save";
export const ACTIVE_SAVE_SLOT_KEY = `${SAVE_KEY}-active-slot`;
export const MAX_SAVE_SLOTS = 3;
export const SAVE_VERSION = 17;

const DEFAULT_EQUIPMENT = { weapon: "kunai", armor: "light_vest", accessory: "chakra_charm" };
const MAIN_MISSION_IDS = Object.freeze(MISSIONS.map((mission) => mission.id));
const SECONDARY_MISSION_IDS = Object.freeze(SECONDARY_MISSIONS.map((mission) => mission.id));
const ALL_MISSIONS = [...MISSIONS, ...SECONDARY_MISSIONS];

export function createDefaultSave() {
  return {
    version: SAVE_VERSION,
    character: null,
    progression: {
      level: 1,
      xp: 0,
      coins: 0,
      attributePoints: 0,
      attributes: { health: 0, strength: 0, speed: 0, chakra: 0, luck: 0 }
    },
    equipment: { ...DEFAULT_EQUIPMENT },
    loadout: [],
    campaign: {
      completedMissions: [],
      completedSecondaryMissions: [],
      missionProgress: {},
      rank: "Novicio",
      elementRank: 1,
      tutorialSeen: false,
      sayoEncounterSeen: false,
      secondaryBoardUnlocked: false,
      banditPrisonerChoice: null,
      archiveUnlocked: false,
      sayoRelicPending: false,
      sayoRelicDelivered: false,
      seenMissionNotices: [],
      doctorSupplyBonus: 0,
      doctorBookDeliveryPending: false,
      hideoutEntryChoice: null,
      secretWarehouseLooted: false,
      hideoutSupplies: 0,
      hideoutDiscoveryChoice: null,
      doctorRoute: createDoctorRouteState(),
    },
    bestiary: { entries: {} }
  };
}

export function initialLoadout(affinity) {
  return JUTSU_LIBRARY.filter((jutsu) => jutsu.element === affinity && jutsu.unlockLevel === 1 && jutsu.affinityXpRequired <= 50)
    .sort((a, b) => a.affinityXpRequired - b.affinityXpRequired).slice(0, 2).map((jutsu) => jutsu.id);
}

export function loadoutSlotsForLevel(level) {
  return level >= 8 ? 4 : level >= 5 ? 3 : 2;
}

export function affinityXpForElement(character, elementId) {
  const requirements = basicRequirements(elementId);
  if (!requirements.length) return 0;
  return Math.min(...requirements.map((id) => Math.max(0, Math.floor(Number(character?.affinityXp?.[id]) || 0))));
}

export function isTechniqueLearned(save, jutsu) {
  return Boolean(jutsu)
    && jutsu.unlockLevel <= (Number(save?.progression?.level) || 1)
    && affinityXpForElement(save?.character, jutsu.element) >= jutsu.affinityXpRequired;
}

function normalizeHairStyle(value) {
  const hair = Number(value);
  return hair === 0 || hair === 1 || hair === 4 ? hair : 1;
}

export function createCharacter(save, { name, affinity, appearance, bodyType, hair, teleportObject: selectedObject }) {
  const cleanName = String(name || "").trim().slice(0, 18) || "Akio";
  const cleanAffinity = BASIC_ELEMENT_IDS.includes(affinity) ? affinity : "fuego";
  const cleanAppearance = /^#[0-9a-f]{6}$/i.test(appearance || "") ? appearance : "#e8edf5";
  return {
    ...createDefaultSave(),
    ...save,
    version: SAVE_VERSION,
    character: { name: cleanName, affinity: cleanAffinity, affinities: [cleanAffinity], knownAffinities: [cleanAffinity], affinityXp: Object.fromEntries(BASIC_ELEMENT_IDS.map((id) => [id, id === cleanAffinity ? 50 : 0])), appearance: cleanAppearance, bodyType: bodyType === "female" ? "female" : "male", masterId: assignedMasterId(bodyType), face: 1, hair: normalizeHairStyle(hair), teleportObject: teleportObject(selectedObject).id, top: 1, bottom: 1, shoes: 1 },
    progression: { ...createDefaultSave().progression },
    equipment: { ...DEFAULT_EQUIPMENT },
    loadout: initialLoadout(cleanAffinity),
    campaign: { ...createDefaultSave().campaign }
  };
}

function validEquipment(type, id) {
  if (id === null) return null;
  return EQUIPMENT[type].some((item) => item.id === id) ? id : DEFAULT_EQUIPMENT[type];
}

export function normalizeSave(candidate) {
  candidate = migrateSaveToV17(candidate, { missions: MISSIONS, secondaryMissions: SECONDARY_MISSIONS });
  const defaults = createDefaultSave();
  if (!candidate || typeof candidate !== "object") return defaults;
  const progression = candidate.progression || {};
  const attributes = progression.attributes || {};
  const level = Math.max(1, Math.floor(Number(progression.level) || 1));
  const trainingLimit = attributeTrainingLimit(level);
  const trainedAttributes = Object.fromEntries(["health", "strength", "speed", "chakra", "luck"].map((id) => [id, Math.max(0, Math.floor(Number(attributes[id]) || 0))]));
  const excessTraining = Object.values(trainedAttributes).reduce((sum, points) => sum + Math.max(0, points - trainingLimit), 0);
  const balancedAttributes = Object.fromEntries(Object.entries(trainedAttributes).map(([id, points]) => [id, Math.min(points, trainingLimit)]));
  const completedMissions = [...new Set(Array.isArray(candidate.campaign?.completedMissions) ? candidate.campaign.completedMissions : [])]
    .filter((id) => MISSIONS.some((mission) => mission.id === id));
  const completedSecondaryMissions = [...new Set(Array.isArray(candidate.campaign?.completedSecondaryMissions) ? candidate.campaign.completedSecondaryMissions : [])]
    .filter((id) => SECONDARY_MISSIONS.some((mission) => mission.id === id));
  const elementRank = Math.min(3, Math.max(1, Math.floor(Number(candidate.campaign?.elementRank) || 1)));
  const requestedAffinities = Array.isArray(candidate.character?.affinities) ? candidate.character.affinities : [candidate.character?.affinity];
  const affinities = normalizeAffinityOrder(requestedAffinities).slice(0, availableAffinitySlots(level, elementRank));
  if (!affinities.length) affinities.push("fuego");
  const affinity = affinities[0];
  const knownAffinities = [...new Set([...(candidate.character?.knownAffinities || []), ...affinities])].filter((id) => BASIC_ELEMENT_IDS.includes(id));
  const affinityXp = Object.fromEntries(BASIC_ELEMENT_IDS.map((id) => {
    const stored = Number(candidate.character?.affinityXp?.[id]);
    return [id, Number.isFinite(stored) ? Math.max(0, Math.floor(stored)) : (id === affinity ? 50 : 0)];
  }));
  const bodyType = candidate.character?.bodyType === "female" ? "female" : "male";
  const masterId = MASTER_IDS.includes(candidate.character?.masterId) ? candidate.character.masterId : assignedMasterId(bodyType);
  const normalizedCharacter = { affinityXp };
  const unlockedIds = new Set(JUTSU_LIBRARY.filter((jutsu) => isTechniqueLearned({ character: normalizedCharacter, progression: { level } }, jutsu) && canAccessElement(jutsu.element, affinities, elementRank)).map((jutsu) => jutsu.id));
  const requestedLoadout = Array.isArray(candidate.loadout) ? candidate.loadout : initialLoadout(affinity);
  const selectedLoadout = [...new Set(requestedLoadout)]
    .filter((id) => unlockedIds.has(id));
  const repairedLoadout = requestedLoadout.length > 0 && selectedLoadout.length === 0 ? initialLoadout(affinity) : selectedLoadout;
  const loadout = repairedLoadout.filter((id) => unlockedIds.has(id)).slice(0, loadoutSlotsForLevel(level));

  return {
    version: SAVE_VERSION,
    character: candidate.character ? {
      name: String(candidate.character.name || "Akio").trim().slice(0, 18) || "Akio",
      affinity,
      affinities,
      knownAffinities,
      affinityXp,
      appearance: /^#[0-9a-f]{6}$/i.test(candidate.character.appearance || "") ? candidate.character.appearance : "#e8edf5",
      bodyType,
      masterId,
      face: Math.min(3, Math.max(1, Math.floor(Number(candidate.character.face) || 1))),
      hair: normalizeHairStyle(candidate.character.hair),
      teleportObject: teleportObject(candidate.character.teleportObject).id,
      top: Math.min(3, Math.max(1, Math.floor(Number(candidate.character.top) || 1))),
      bottom: Math.min(3, Math.max(1, Math.floor(Number(candidate.character.bottom) || 1))),
      shoes: Math.min(2, Math.max(1, Math.floor(Number(candidate.character.shoes) || 1)))
    } : null,
    progression: {
      level,
      xp: Math.max(0, Math.floor(Number(progression.xp) || 0)),
      coins: Math.max(0, Math.floor(Number(progression.coins) || 0)),
      attributePoints: Math.max(0, Math.floor(Number(progression.attributePoints) || 0)) + excessTraining,
      attributes: balancedAttributes
    },
    equipment: {
      weapon: validEquipment("weapon", candidate.equipment?.weapon),
      armor: validEquipment("armor", candidate.equipment?.armor),
      accessory: validEquipment("accessory", candidate.equipment?.accessory)
    },
    loadout: candidate.character ? loadout : [],
    campaign: {
      completedMissions,
      completedSecondaryMissions,
      missionProgress: normalizeMissionProgress(candidate.campaign?.missionProgress, completedMissions, completedSecondaryMissions),
      rank: candidate.campaign?.rank === "Guardián" ? "Guardián" : "Novicio",
      elementRank,
      tutorialSeen: Boolean(candidate.campaign?.tutorialSeen),
      sayoEncounterSeen: Boolean(candidate.campaign?.sayoEncounterSeen),
      secondaryBoardUnlocked: Boolean(candidate.campaign?.secondaryBoardUnlocked),
      banditPrisonerChoice: ["interrogate", "eliminate"].includes(candidate.campaign?.banditPrisonerChoice) ? candidate.campaign.banditPrisonerChoice : null,
      archiveUnlocked: Boolean(candidate.campaign?.archiveUnlocked),
      sayoRelicPending: Boolean(candidate.campaign?.sayoRelicPending),
      sayoRelicDelivered: Boolean(candidate.campaign?.sayoRelicDelivered),
      seenMissionNotices: [...new Set(Array.isArray(candidate.campaign?.seenMissionNotices) ? candidate.campaign.seenMissionNotices : [])]
        .filter((id) => typeof id === "string" && /^[a-z0-9:_-]+$/i.test(id))
        .slice(-50),
      doctorSupplyBonus: Math.min(1, Math.max(0, Math.floor(Number(candidate.campaign?.doctorSupplyBonus) || 0))),
      doctorBookDeliveryPending: Boolean(candidate.campaign?.doctorBookDeliveryPending),
      hideoutEntryChoice: ["main", "secret"].includes(candidate.campaign?.hideoutEntryChoice) ? candidate.campaign.hideoutEntryChoice : null,
      secretWarehouseLooted: Boolean(candidate.campaign?.secretWarehouseLooted),
      hideoutSupplies: Math.max(0, Math.floor(Number(candidate.campaign?.hideoutSupplies) || 0)),
      hideoutDiscoveryChoice: ["prisoners", "documents"].includes(candidate.campaign?.hideoutDiscoveryChoice) ? candidate.campaign.hideoutDiscoveryChoice : null,
      doctorRoute: normalizeDoctorRouteState(candidate.campaign?.doctorRoute),
    },
    bestiary: {
      entries: Object.fromEntries(Object.entries(candidate.bestiary?.entries || {})
        .filter(([id]) => Object.hasOwn(ENEMY_ROSTER, id))
        .map(([id, entry]) => [id, {
          encounters: Math.max(0, Math.floor(Number(entry?.encounters) || 0)),
          defeated: Math.max(0, Math.floor(Number(entry?.defeated) || 0)),
          techniques: [...new Set(Array.isArray(entry?.techniques) ? entry.techniques : [])].filter((technique) => Object.hasOwn(ENEMY_ACTIONS, technique)),
          vulnerabilities: [...new Set(Array.isArray(entry?.vulnerabilities) ? entry.vulnerabilities : [])].filter((affinityId) => BASIC_ELEMENT_IDS.includes(affinityId)),
          documents: Math.max(0, Math.floor(Number(entry?.documents) || 0))
        }]))
    }
  };
}

const slotRepository = createSlotRepository({
  saveKey: SAVE_KEY, activeSlotKey: ACTIVE_SAVE_SLOT_KEY, maxSlots: MAX_SAVE_SLOTS,
  normalize: normalizeSave, createDefault: createDefaultSave
});
export const { saveSlotKey, activeSaveSlot, listSaveSlots, selectSaveSlot, deleteSaveSlot, loadSave, writeSave } = slotRepository;

export function startMissionProgress(save, missionId) {
  return markMissionStarted(normalizeSave(save), missionId);
}

export function advanceMissionProgress(save, missionId, completedStepId, context = {}) {
  return advanceCampaignMission(normalizeSave(save), missionId, completedStepId, context);
}

export function failMissionProgress(save, missionId) {
  return markMissionFailed(normalizeSave(save), missionId);
}

export const DEBUG_CHECKPOINTS = Object.freeze([
  { id: "saga-start", label: "Inicio de la saga", description: "Cuartel disponible; ninguna misión completada." },
  { id: "kagemori-ready", label: "Investigar Kagemori", description: "Misión 1 completada y Tablón desbloqueado." },
  { id: "mission-2-ready", label: "Misión 2 disponible", description: "Kagemori resuelta y Desfiladero desbloqueado." },
  { id: "doctor-ready", label: "Buscar al doctor", description: "Mapa cifrado obtenido; misión del médico disponible." },
  { id: "library-ready", label: "Biblioteca desbloqueada", description: "Doctor encontrado, libro recibido y Biblioteca abierta." },
  { id: "mission-3-ready", label: "Misión 3 disponible", description: "Entrada secreta y Biblioteca preparadas para probar El umbral." },
  { id: "mission-4-ready", label: "Misión 4 disponible", description: "El umbral completado; suministros listos para las galerías." },
  { id: "mission-5-ready", label: "Misión 5 disponible", description: "El corazón completado; Raizen listo para el duelo final." }
]);

export function applyDebugCheckpoint(save, checkpointId) {
  const result = normalizeSave(save);
  const baseCampaign = { ...createDefaultSave().campaign, tutorialSeen: true };
  const checkpoints = {
    "saga-start": {},
    "kagemori-ready": {
      completedMissions: MAIN_MISSION_IDS.slice(0, 1),
      sayoEncounterSeen: true,
      secondaryBoardUnlocked: true
    },
    "mission-2-ready": {
      completedMissions: MAIN_MISSION_IDS.slice(0, 1),
      completedSecondaryMissions: SECONDARY_MISSION_IDS.slice(0, 1),
      sayoEncounterSeen: true,
      secondaryBoardUnlocked: true,
    },
    "doctor-ready": {
      completedMissions: MAIN_MISSION_IDS.slice(0, 2),
      completedSecondaryMissions: SECONDARY_MISSION_IDS.slice(0, 1),
      sayoEncounterSeen: true,
      secondaryBoardUnlocked: true,
    },
    "library-ready": {
      completedMissions: MAIN_MISSION_IDS.slice(0, 2),
      completedSecondaryMissions: SECONDARY_MISSION_IDS.slice(0, 2),
      sayoEncounterSeen: true,
      secondaryBoardUnlocked: true,
      archiveUnlocked: true,
    },
    "mission-3-ready": {
      completedMissions: MAIN_MISSION_IDS.slice(0, 2),
      completedSecondaryMissions: SECONDARY_MISSION_IDS.slice(0, 2),
      banditPrisonerChoice: "interrogate",
      archiveUnlocked: true,
    },
    "mission-4-ready": {
      completedMissions: MAIN_MISSION_IDS.slice(0, 3),
      completedSecondaryMissions: SECONDARY_MISSION_IDS.slice(0, 2),
      banditPrisonerChoice: "interrogate",
      archiveUnlocked: true,
      secretWarehouseLooted: true,
      hideoutSupplies: 2
    },
    "mission-5-ready": {
      completedMissions: MAIN_MISSION_IDS.slice(0, 4),
      completedSecondaryMissions: SECONDARY_MISSION_IDS.slice(0, 2),
      banditPrisonerChoice: "interrogate",
      archiveUnlocked: true,
    }
  };
  if (!Object.hasOwn(checkpoints, checkpointId)) return result;
  result.campaign = { ...baseCampaign, ...checkpoints[checkpointId] };
  return normalizeSave(result);
}

export function xpForNextLevel(level) {
  return experienceForNextLevel(level);
}

export function awardEncounter(save, enemyId, { firstClear = true } = {}) {
  const result = normalizeSave(save);
  const base = firstClear ? ENCOUNTER_REWARDS[enemyId] : null;
  if (!base) return { save: result, xp: 0, affinityXp: 0, coins: 0, levelsGained: 0 };
  const stats = derivedStats(result);
  const gainedXp = Math.round(base.xp * (1 + stats.xpBonus));
  result.progression.xp += gainedXp;
  result.progression.coins += base.coins;
  const affinityXp = Math.max(8, Math.round(gainedXp * 0.5));
  result.character.affinities.forEach((id) => { result.character.affinityXp[id] += affinityXp; });
  let levelsGained = 0;
  while (result.progression.xp >= xpForNextLevel(result.progression.level)) {
    result.progression.xp -= xpForNextLevel(result.progression.level);
    result.progression.level += 1;
    result.progression.attributePoints += 2;
    levelsGained += 1;
  }
  return { save: result, xp: gainedXp, affinityXp, coins: base.coins, levelsGained };
}

export function completeMission(save, missionId) {
  const result = normalizeSave(save);
  const mission = MISSIONS.find((entry) => entry.id === missionId);
  const state = mission ? missionState(mission, result) : null;
  if (!mission || state.completed || !state.unlocked) {
    return { save: result, xp: 0, coins: 0, levelsGained: 0, firstClear: false, blocked: Boolean(mission && !state.unlocked) };
  }

  const gainedXp = Math.round(mission.reward.xp * (1 + derivedStats(result).xpBonus));
  result.progression.xp += gainedXp;
  const completionBonus = missionStep(mission, "choice")?.completionBonus;
  const secretBonus = completionBonus?.requirements?.every((requirement) => requirementMet(requirement, result))
    ? completionBonus.coins || 0
    : 0;
  const gainedCoins = mission.reward.coins + secretBonus;
  result.progression.coins += gainedCoins;
  const affinityXp = Math.max(10, Math.round(gainedXp * 0.35));
  result.character.affinities.forEach((id) => { result.character.affinityXp[id] += affinityXp; });
  result.campaign.completedMissions.push(missionId);
  applyMissionEffects(result, mission.completionEffects, { secretBonusAwarded: secretBonus > 0 });
  result.campaign.missionProgress[missionId] = createCompletedMissionProgress(mission);
  let levelsGained = 0;
  while (result.progression.xp >= xpForNextLevel(result.progression.level)) {
    result.progression.xp -= xpForNextLevel(result.progression.level);
    result.progression.level += 1;
    result.progression.attributePoints += 2;
    levelsGained += 1;
  }
  return { save: result, xp: gainedXp, affinityXp, coins: gainedCoins, bonusCoins: secretBonus, levelsGained, firstClear: true };
}
function completeRouteSearchMission(result, mission) {
  if (missionState(mission, result).completed || result.campaign.doctorRoute.phase < 3 || !cipherComplete(result.campaign.doctorRoute.cipher)) return emptySecondaryCompletion(result, { blocked: true });
  const gainedXp = Math.round(mission.reward.xp * (1 + derivedStats(result).xpBonus));
  const gainedCoins = mission.reward.coins * (result.campaign.banditPrisonerChoice === "interrogate" ? 2 : 1);
  const affinityXp = Math.max(8, Math.round(gainedXp * 0.35));
  const supplyBonus = result.campaign.doctorRoute.resources >= 2 ? 1 : 0;
  result.progression.xp += gainedXp;
  result.progression.coins += gainedCoins;
  result.character.affinities.forEach((id) => { result.character.affinityXp[id] += affinityXp; });
  result.campaign.completedSecondaryMissions = [...new Set([...result.campaign.completedSecondaryMissions, mission.id])];
  result.campaign.doctorSupplyBonus = supplyBonus;
  result.campaign.doctorBookDeliveryPending = true;
  result.campaign.doctorRoute.active = false;
  applyMissionEffects(result, mission.completionEffects);
  result.campaign.missionProgress[mission.id] = createCompletedMissionProgress(mission);
  let levelsGained = 0;
  while (result.progression.xp >= xpForNextLevel(result.progression.level)) {
    result.progression.xp -= xpForNextLevel(result.progression.level);
    result.progression.level += 1;
    result.progression.attributePoints += 2;
    levelsGained += 1;
  }
  return { save: normalizeSave(result), xp: gainedXp, affinityXp, coins: gainedCoins, supplyBonus, levelsGained, firstClear: true };
}
const SECONDARY_COMPLETION_HANDLERS = Object.freeze({
  investigation: completeInvestigationMission,
  "route-search": completeRouteSearchMission
});

export function completeSecondaryMission(save, missionOrId) {
  return completeSecondaryByType(normalizeSave(save), missionOrId, SECONDARY_MISSIONS, SECONDARY_COMPLETION_HANDLERS);
}

export function markSecondaryMissionCompleted(save, missionOrId) {
  return completeSecondaryMission(save, missionOrId).save;
}

export function chooseHideoutEntrance(save, entrance) {
  const result = normalizeSave(save);
  result.campaign.hideoutEntryChoice = entrance === "secret" && campaignFlag(result, "secretEntranceKnown") ? "secret" : "main";
  return normalizeSave(result);
}

export function startDoctorMission(save, mission = secondaryMissionByType("route-search", SECONDARY_MISSIONS)) {
  const result = normalizeSave(save);
  if (!mission || !missionState(mission, result).unlocked || missionState(mission, result).completed) return result;
  result.campaign.doctorRoute = { ...createDoctorRouteState(), active: true };
  return normalizeSave(result);
}

export function chooseDoctorMissionRoute(save, routeId) {
  const result = normalizeSave(save);
  result.campaign.doctorRoute = chooseRoute(result.campaign.doctorRoute, routeId);
  return normalizeSave(result);
}

export function resolveDoctorRiverPassage(save, passageId) {
  const result = normalizeSave(save);
  result.campaign.doctorRoute = resolveRiverPassage(result.campaign.doctorRoute, passageId);
  return normalizeSave(result);
}

export function resolveDoctorMissionCombat(save) {
  const result = normalizeSave(save);
  result.campaign.doctorRoute = resolveRouteCombat(result.campaign.doctorRoute);
  return normalizeSave(result);
}

export function cancelDoctorMission(save) {
  const result = normalizeSave(save);
  result.campaign.doctorRoute = createDoctorRouteState();
  return normalizeSave(result);
}

export function completeDoctorMission(save, mission = secondaryMissionByType("route-search", SECONDARY_MISSIONS)) {
  return completeSecondaryMission(save, mission);
}

export function actOnDoctorCipher(save, action, payload) {
  const result = normalizeSave(save);
  const route = result.campaign.doctorRoute;
  if (!route.active || route.phase < 3 || route.pendingEvent) return { save: result, valid: false, steps: [] };
  const resolution = applyCipherAction(route.cipher, action, payload);
  route.cipher = resolution.state;
  return { ...resolution, save: normalizeSave(result) };
}

export function deliverBestiaryBook(save) {
  const result = normalizeSave(save);
  if (!result.campaign.doctorBookDeliveryPending) return result;
  result.campaign.doctorBookDeliveryPending = false;
  result.campaign.archiveUnlocked = true;
  // Sayo transcribe los informes de la misión anterior al recibir el libro.
  // La primera consulta ya sirve para preparar la guarida, mientras técnicas
  // y debilidades permanecen todavía sin revelar.
  ["bandit_pathfinder", "bandit_lieutenant", "boss_akumori"].forEach((enemyId) => {
    if (result.bestiary.entries[enemyId]) return;
    result.bestiary.entries[enemyId] = { encounters: 1, defeated: 1, techniques: [], vulnerabilities: [], documents: 0 };
  });
  return normalizeSave(result);
}

export function recordBestiaryObservation(save, enemyId, observation = {}) {
  const result = normalizeSave(save);
  if (!campaignFlag(result, "bestiaryBookObtained") || !Object.hasOwn(ENEMY_ROSTER, enemyId)) return result;
  const current = result.bestiary.entries[enemyId] || { encounters: 0, defeated: 0, techniques: [], vulnerabilities: [], documents: 0 };
  if (observation.encounter) current.encounters += 1;
  if (observation.defeated) current.defeated += 1;
  if (observation.technique && Object.hasOwn(ENEMY_ACTIONS, observation.technique)) current.techniques = [...new Set([...current.techniques, observation.technique])];
  if (observation.vulnerability && BASIC_ELEMENT_IDS.includes(observation.vulnerability)) current.vulnerabilities = [...new Set([...current.vulnerabilities, observation.vulnerability])];
  if (observation.document) current.documents += 1;
  result.bestiary.entries[enemyId] = current;
  return normalizeSave(result);
}

export function spendAttribute(save, attribute) {
  const result = normalizeSave(save);
  if (!Object.hasOwn(result.progression.attributes, attribute)
    || result.progression.attributePoints <= 0
    || result.progression.attributes[attribute] >= attributeTrainingLimit(result.progression.level)) return result;
  result.progression.attributes[attribute] += 1;
  result.progression.attributePoints -= 1;
  return result;
}

export function resetAttributes(save) {
  const result = normalizeSave(save);
  const keys = Object.keys(result.progression.attributes);
  const refunded = keys.reduce((sum, key) => sum + result.progression.attributes[key], 0);
  result.progression.attributes = Object.fromEntries(keys.map((key) => [key, 0]));
  result.progression.attributePoints += refunded;
  return result;
}

export function learnAffinity(save, affinityId) {
  const result = normalizeSave(save);
  if (!BASIC_ELEMENT_IDS.includes(affinityId)) return result;
  result.character.knownAffinities = [...new Set([...result.character.knownAffinities, affinityId])];
  return result;
}

export function selectNextAffinity(save, affinityId) {
  const result = normalizeSave(save);
  const availableSlots = availableAffinitySlots(result.progression.level, result.campaign.elementRank);
  if (!result.character.knownAffinities.includes(affinityId)
    || result.character.affinities.includes(affinityId)
    || result.character.affinities.length >= availableSlots
    || result.character.affinities.length >= AFFINITY_CONFIG.maxAffinities) return result;
  result.character.affinities.push(affinityId);
  result.character.affinityXp[affinityId] = Math.max(0, result.character.affinityXp[affinityId] || 0);
  return normalizeSave(result);
}

export function derivedStats(save) {
  const normalized = normalizeSave(save);
  const { health, strength, speed, chakra, luck: trainedLuck } = normalized.progression.attributes;
  const levelBonus = levelStatBonus(normalized.progression.level, normalized.character?.affinity);
  const baseStats = {
    health: AFFINITY_CONFIG.baseStats.health + levelBonus.health + health * AFFINITY_CONFIG.attributeGains.health,
    strength: AFFINITY_CONFIG.baseStats.strength + levelBonus.strength + strength * AFFINITY_CONFIG.attributeGains.strength,
    speed: AFFINITY_CONFIG.baseStats.speed + levelBonus.speed + speed * AFFINITY_CONFIG.attributeGains.speed,
    chakra: AFFINITY_CONFIG.baseStats.chakra + levelBonus.chakra + chakra * AFFINITY_CONFIG.attributeGains.chakra,
    luck: AFFINITY_CONFIG.baseStats.luck + levelBonus.luck + trainedLuck * AFFINITY_CONFIG.attributeGains.luck
  };
  const utility = {
    accuracy: 95,
    equipmentEvasion: 0,
    costReduction: 0,
    xpBonus: 0,
    damageReduction: 0
  };
  Object.entries(normalized.equipment).forEach(([type, id]) => {
    const item = EQUIPMENT[type]?.find((entry) => entry.id === id);
    Object.entries(item?.bonuses || {}).forEach(([stat, value]) => {
      const statMap = { maxHp: "health", maxChakra: "chakra", damageBonus: "strength", speed: "speed" };
      if (statMap[stat]) baseStats[statMap[stat]] += value;
      else if (stat === "evasion") utility.equipmentEvasion += value;
      else utility[stat] += value;
    });
  });
  if (masterIdForCharacter(normalized.character) === "mei") utility.damageReduction += 2;
  else baseStats.strength += 3;
  const { stats: modified, modifiers } = applyAffinityStatModifiers(baseStats, normalized.character?.affinities || []);
  const derived = AFFINITY_CONFIG.derived;
  return {
    maxHp: modified.health,
    maxChakra: modified.chakra,
    speed: modified.speed,
    baseSpeed: baseStats.speed,
    strength: modified.strength,
    baseStrength: baseStats.strength,
    strengthModifier: modifiers.strength,
    speedModifier: modifiers.speed,
    luck: modified.luck,
    criticalChance: Math.min(derived.criticalChanceCap, derived.baseCriticalChance + Math.floor(modified.luck * derived.luckCriticalScale)),
    accuracy: utility.accuracy,
    baseEvasion: derived.baseEvasion + modified.luck + utility.equipmentEvasion,
    evasion: derived.baseEvasion + modified.luck + utility.equipmentEvasion,
    damageBonus: baseStats.strength,
    affinityModifiers: modifiers,
    primaryAffinity: normalized.character?.affinities?.[0] || "fuego",
    costReduction: utility.costReduction,
    xpBonus: utility.xpBonus,
    damageReduction: utility.damageReduction
  };
}

export function levelUpReport(previousLevel, save) {
  const afterSave = normalizeSave(save);
  const beforeLevel = Math.max(1, Math.floor(Number(previousLevel) || 1));
  const afterLevel = afterSave.progression.level;
  if (afterLevel <= beforeLevel) return null;
  const beforeSave = { ...afterSave, progression: { ...afterSave.progression, level: beforeLevel } };
  const beforeStats = derivedStats(beforeSave);
  const afterStats = derivedStats(afterSave);
  const affinity = afterSave.character?.affinity || "fuego";
  const statDefinitions = [
    ["health", "VIDA", "maxHp"],
    ["strength", "FUERZA", "strength"],
    ["speed", "VELOCIDAD", "speed"],
    ["chakra", "CHAKRA", "maxChakra"],
    ["luck", "SUERTE", "luck"]
  ];
  return {
    beforeLevel,
    afterLevel,
    affinity,
    focus: AFFINITY_LEVEL_FOCUS[affinity],
    pointsGained: (afterLevel - beforeLevel) * 2,
    stats: statDefinitions.map(([id, label, key]) => ({ id, label, before: beforeStats[key], after: afterStats[key], gain: afterStats[key] - beforeStats[key] }))
  };
}

export function selectMaster(save, masterId) {
  const result = normalizeSave(save);
  if (!campaignFlag(result, "masterSelectionUnlocked") || !MASTER_IDS.includes(masterId)) return result;
  result.character.masterId = masterId;
  return result;
}
