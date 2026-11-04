import { normalizeBirthday } from "./birthday.js?v=0.127.0";
import { normalizeSagaTutorial, recordRouteLesson, recordTutorialLesson } from "./tutorial-system.js";
import { PLAYER_RANK_LABELS, playerRank } from "./player-rank.js";
import { locationAccess } from "./village-progression.js";
import { normalizeResonance, resonanceBonuses, skillLevel } from "./skills/progression.js?v=1.0.0";
import { SKILLS_BY_ID } from "./skills/definitions.js?v=1.4.0";
import { missionXpPlan } from "./mission-rewards.js?v=1.0.0";
import { resolveEncounterIds } from "./combat-modifiers.js?v=0.114.0";
import { normalizeTaijutsuLoadout } from "./skills/taijutsu.js?v=1.0.0";
import { normalizeIntroductions } from "./location-conversations.js?v=0.131.0";
import { normalizeSkinTone } from "./skin-tones.js?v=0.119.0";
import { defaultGuildState, normalizeGuildState } from "./guild.js?v=0.126.0";
import { defaultEventState, normalizeEventState } from "./plaza-events.js?v=0.130.0";
import { canonicalAbilityId, ENEMY_ACTIONS, ENEMY_ROSTER, EQUIPMENT, JUTSU_LIBRARY } from "./data.js?v=1.5.0";
import { MISSIONS, SECONDARY_MISSIONS } from "./content/index.js?v=0.114.0";
import { applyMissionEffects, campaignFlag, missionState, missionStep, requirementMet } from "./mission-system.js?v=0.114.0";
import { BASIC_ELEMENT_IDS, basicRequirements, canAccessElement } from "./elements.js?v=0.20.0";
import { AFFINITY_CONFIG, applyAffinityStatModifiers, availableAffinitySlots, normalizeAffinityOrder } from "./affinity-system.js?v=0.114.0";
import { chooseDoctorRoute as chooseRoute, createDoctorRouteState, normalizeDoctorRouteState, resolveDoctorRouteCombat as resolveRouteCombat, resolveRiverPassage } from "./doctor-mission.js?v=0.100.0";
import { completeInvestigationMission, completeSecondaryByType, emptySecondaryCompletion, secondaryMissionByType } from "./secondary-missions.js?v=0.114.0";
import { createCompletedMissionProgress, migrateSaveToV18 } from "./save/save-migrations.js";
import { createSlotRepository } from "./save/slot-repository.js";
import { teleportObject } from "./teleport-objects.js";
import { ITEMS } from "./items.js?v=0.126.0";
import { LEGACY_SEALS } from "./cosmetics.js?v=0.114.0";
import { normalizeAppearance, normalizeInventory, starterInventory } from "./inventory.js?v=0.126.0";
import { applyCipherAction, cipherComplete } from "./puzzles/seal-cipher.js";
import { advanceMissionProgress as advanceCampaignMission, failMissionProgress as markMissionFailed, normalizeMissionProgress, startMissionProgress as markMissionStarted } from "./save/campaign-state.js?v=0.114.0";
import { AFFINITY_LEVEL_FOCUS, ENCOUNTER_REWARDS, MAX_CHARACTER_LEVEL, addExperience, characterLevel, attributeTrainingLimit, experienceForNextLevel, levelStatBonus } from "./progression-balance.js?v=0.94.0";
import { AFFINITY_TRIALS } from "./content/affinity-progression.js?v=1.0.0";
export { attributeTrainingLimit };
import { MASTER_IDS, assignedMasterId, masterIdForCharacter } from "./save/character-state.js";
export { MASTER_IDS, assignedMasterId, masterIdForCharacter } from "./save/character-state.js";
export const SAVE_KEY = "cronicas-del-sello-save";
export const ACTIVE_SAVE_SLOT_KEY = `${SAVE_KEY}-active-slot`;
export const MAX_SAVE_SLOTS = 3;
export const SAVE_VERSION = 29;

const DEFAULT_EQUIPMENT = { weapon: "kunai", throwable: "shuriken", seal: "seal_wind", accessory: "chakra_charm", companion: null };
const MAIN_MISSION_IDS = Object.freeze(MISSIONS.map((mission) => mission.id));
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
      resonance: { investments: {} },
      attributes: { health: 0, strength: 0, speed: 0, chakra: 0, luck: 0 }
    },
    equipment: { ...DEFAULT_EQUIPMENT },
    inventory: { items: {}, extraAffinityUnlocked: false },
    guild: defaultGuildState(),
    events: defaultEventState(),
    loadout: [],
    taijutsuLoadout: [null,null],
    campaign: {
      completedMissions: [],
      completedSecondaryMissions: [],
      missionProgress: {},
      rank: "Novicio",
      elementRank: 1,
      tutorialSeen: false,
      sagaTutorial: normalizeSagaTutorial(null),
      npcIntroductions: [],
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
  return Boolean(jutsu?.id) && skillLevel(save, SKILLS_BY_ID.get(jutsu.id)) > 0;
}

function normalizeHairStyle(value) {
  const hair = Number(value);
  return hair === 0 || hair === 1 || hair === 4 ? hair : 1;
}

export function createCharacter(save, { name, affinity, appearance, bodyType, hair, skinTone, birthday, teleportObject: selectedObject }) {
  const cleanName = String(name || "").trim().slice(0, 18) || "Akio";
  const cleanAffinity = BASIC_ELEMENT_IDS.includes(affinity) ? affinity : "fuego";
  const cleanAppearance = /^#[0-9a-f]{6}$/i.test(appearance || "") ? appearance : "#e8edf5";
  return {
    ...createDefaultSave(),
    ...save,
    version: SAVE_VERSION,
    character: { birthday: normalizeBirthday(birthday), name: cleanName, affinity: cleanAffinity, affinities: [cleanAffinity], knownAffinities: [cleanAffinity], affinityXp: Object.fromEntries(BASIC_ELEMENT_IDS.map((id) => [id, id === cleanAffinity ? 50 : 0])), appearance: cleanAppearance, bodyType: bodyType === "female" ? "female" : "male", skinTone: normalizeSkinTone(skinTone), masterId: assignedMasterId(bodyType), face: 1, hair: normalizeHairStyle(hair), teleportObject: teleportObject(selectedObject).id, top: 1, bottom: 1, shoes: 1 },
    progression: { ...createDefaultSave().progression },
    equipment: { ...DEFAULT_EQUIPMENT, weapon: null, throwable: null },
    inventory: starterInventory({ hair: normalizeHairStyle(hair) }),
    guild: defaultGuildState(),
    events: defaultEventState(),
    loadout: initialLoadout(cleanAffinity),
    taijutsuLoadout: [null,null],
    campaign: { ...createDefaultSave().campaign }
  };
}

function validEquipment(type, id, inventory) {
  if (id === null) return null;
  return EQUIPMENT[type]?.some((item) => item.id === id) && inventory.items[id] > 0 ? id : null;
}

export function normalizeSave(candidate) {
  const sourceVersion = Number(candidate?.version) || 0;
  const inventory = normalizeInventory(candidate);
  candidate = migrateSaveToV18(candidate, { missions: MISSIONS, secondaryMissions: SECONDARY_MISSIONS });
  const defaults = createDefaultSave();
  if (!candidate || typeof candidate !== "object") return defaults;
  const progression = candidate.progression || {};
  const attributes = progression.attributes || {};
  const level = characterLevel(progression.level);
  const trainingLimit = attributeTrainingLimit(level);
  const trainedAttributes = Object.fromEntries(["health", "strength", "speed", "chakra", "luck"].map((id) => [id, Math.max(0, Math.floor(Number(attributes[id]) || 0))]));
  const excessTraining = Object.values(trainedAttributes).reduce((sum, points) => sum + Math.max(0, points - trainingLimit), 0);
  const balancedAttributes = Object.fromEntries(Object.entries(trainedAttributes).map(([id, points]) => [id, Math.min(points, trainingLimit)]));
  const completedMissions = [...new Set(Array.isArray(candidate.campaign?.completedMissions) ? candidate.campaign.completedMissions : [])]
    .filter((id) => MISSIONS.some((mission) => mission.id === id));
  const completedSecondaryMissions = [...new Set(Array.isArray(candidate.campaign?.completedSecondaryMissions) ? candidate.campaign.completedSecondaryMissions : [])]
    .filter((id) => SECONDARY_MISSIONS.some((mission) => mission.id === id));
  const requestedAffinities = normalizeAffinityOrder(Array.isArray(candidate.character?.affinities) ? candidate.character.affinities : [candidate.character?.affinity]);
  // Las afinidades ya aprendidas antes de introducir las pruebas se conservan.
  if (sourceVersion < 28) {
    for (const trial of AFFINITY_TRIALS) {
      if (requestedAffinities.length >= trial.slot && level >= trial.level && !completedSecondaryMissions.includes(trial.id)) completedSecondaryMissions.push(trial.id);
    }
  }
  const slots = availableAffinitySlots(level, 1, false, "Novicio", completedSecondaryMissions);
  const elementRank = slots;
  const affinities = requestedAffinities.slice(0, slots);
  if (!affinities.length) affinities.push("fuego");
  const affinity = affinities[0];
  const knownAffinities = [...new Set([...(candidate.character?.knownAffinities || []), ...affinities, ...(slots >= 2 ? BASIC_ELEMENT_IDS : [])])].filter((id) => BASIC_ELEMENT_IDS.includes(id));
  const affinityXp = Object.fromEntries(BASIC_ELEMENT_IDS.map((id) => {
    const stored = Number(candidate.character?.affinityXp?.[id]);
    return [id, Number.isFinite(stored) ? Math.max(0, Math.floor(stored)) : (id === affinity ? 50 : 0)];
  }));
  const bodyType = candidate.character?.bodyType === "female" ? "female" : "male";
  const masterId = MASTER_IDS.includes(candidate.character?.masterId) ? candidate.character.masterId : assignedMasterId(bodyType);
  const normalizedCharacter = { affinityXp, affinities };
  const skillContext = { character: normalizedCharacter,progression:{ level },campaign:{ elementRank } };
  const resonance = normalizeResonance(progression.resonance,skillContext,{ reset: sourceVersion < 29 });
  skillContext.progression.resonance = resonance;
  const unlockedIds = new Set(JUTSU_LIBRARY.filter((jutsu) => isTechniqueLearned(skillContext, jutsu)).map((jutsu) => jutsu.id));
  const requestedLoadout = Array.isArray(candidate.loadout) ? candidate.loadout : initialLoadout(affinity);
  const selectedLoadout = [...new Set(requestedLoadout)]
    .filter((id) => unlockedIds.has(id));
  const repairedLoadout = requestedLoadout.length > 0 && selectedLoadout.length === 0 ? initialLoadout(affinity) : selectedLoadout;
  const loadout = repairedLoadout.filter((id) => unlockedIds.has(id)).slice(0, loadoutSlotsForLevel(level));

  return {
    version: SAVE_VERSION,
    character: candidate.character ? {
      birthday: normalizeBirthday(candidate.character.birthday),
      name: String(candidate.character.name || "Akio").trim().slice(0, 18) || "Akio",
      affinity,
      affinities,
      knownAffinities,
      affinityXp,
      appearance: /^#[0-9a-f]{6}$/i.test(candidate.character.appearance || "") ? candidate.character.appearance : "#e8edf5",
      bodyType,
      skinTone: normalizeSkinTone(candidate.character.skinTone),
      masterId,
      face: Math.min(3, Math.max(1, Math.floor(Number(candidate.character.face) || 1))),
      hair: normalizeHairStyle(candidate.character.hair),
      teleportObject: teleportObject(candidate.character.teleportObject).id,
      top: Math.min(3, Math.max(1, Math.floor(Number(candidate.character.top) || 1))),
      bottom: Math.min(3, Math.max(1, Math.floor(Number(candidate.character.bottom) || 1))),
      shoes: Math.min(2, Math.max(1, Math.floor(Number(candidate.character.shoes) || 1))),
      ...normalizeAppearance(candidate.character, inventory)
    } : null,
    progression: {
      level,
      xp: level === MAX_CHARACTER_LEVEL ? 0 : Math.max(0, Math.floor(Number(progression.xp) || 0)),
      coins: Number.isFinite(Number(progression.coins)) ? Math.max(0, Math.min(9999999, Math.floor(Number(progression.coins) || 0))) : 0,
      attributePoints: Math.max(0, Math.floor(Number(progression.attributePoints) || 0)) + excessTraining,
      resonance,
      attributes: balancedAttributes
    },
    equipment: {
      weapon: validEquipment("weapon", candidate.equipment?.weapon, inventory),
      throwable: validEquipment("throwable", candidate.equipment?.throwable === undefined && Number(candidate.version || 0) < 27 && candidate.character ? "shuriken" : candidate.equipment?.throwable, inventory),
      seal: validEquipment("seal", candidate.equipment?.seal ?? LEGACY_SEALS[candidate.equipment?.armor], inventory),
      companion: validEquipment("companion", candidate.equipment?.companion, inventory),
      accessory: validEquipment("accessory", candidate.equipment?.accessory, inventory)
    },
    inventory,
    guild: candidate.character ? normalizeGuildState(candidate.guild, { inventory }) : defaultGuildState(),
    events: normalizeEventState(candidate.events),
    loadout: candidate.character ? loadout : [],
    taijutsuLoadout: candidate.character ? normalizeTaijutsuLoadout({ progression:{ level,resonance } },candidate.taijutsuLoadout) : [null,null],
    campaign: {
      completedMissions,
      completedSecondaryMissions,
      missionProgress: normalizeMissionProgress(candidate.campaign?.missionProgress, completedMissions, completedSecondaryMissions),
      rank: PLAYER_RANK_LABELS[elementRank],
      elementRank,
      tutorialSeen: Boolean(candidate.campaign?.tutorialSeen),
      sagaTutorial: normalizeSagaTutorial(candidate.campaign?.sagaTutorial, { completedMissions }),
      npcIntroductions: normalizeIntroductions(candidate.campaign?.npcIntroductions),
      sayoEncounterSeen: Boolean(candidate.campaign?.sayoEncounterSeen),
      secondaryBoardUnlocked: locationAccess("missions", { character: candidate.character, campaign: { completedMissions } }).unlocked,
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
          techniques: [...new Set((Array.isArray(entry?.techniques) ? entry.techniques : []).map(canonicalAbilityId))].filter((technique) => Object.hasOwn(ENEMY_ACTIONS, technique)),
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

export function abandonMissionProgress(save, missionId) {
  const result = markMissionFailed(normalizeSave(save), missionId);
  const progress = result.campaign.missionProgress[missionId];
  if (progress?.status === "failed") progress.status = "abandoned";
  return result;
}

export const DEBUG_CHECKPOINTS = Object.freeze([
  { id: "saga-start", label: "Inicio de la saga", description: "Cuartel disponible; ninguna misión completada." },
  { id: "kagemori-ready", label: "Investigar Kagemori", description: "Primera misión completada; investigación disponible en el Cuartel." },
  { id: "mission-2-ready", label: "Desfiladero disponible", description: "Kagemori resuelta y Desfiladero desbloqueado." },
  { id: "doctor-ready", label: "Buscar al doctor", description: "Mapa cifrado obtenido; misión del médico disponible." },
  { id: "library-ready", label: "Biblioteca desbloqueada", description: "Doctor encontrado, libro recibido y Biblioteca abierta." },
  { id: "mission-3-ready", label: "El umbral disponible", description: "Entrada secreta y Biblioteca preparadas para probar El umbral." },
  { id: "mission-4-ready", label: "El corazón disponible", description: "El umbral completado; suministros listos para las galerías." },
  { id: "mission-5-ready", label: "Raizen disponible", description: "El corazón completado; Raizen listo para el duelo final." }
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
      completedMissions: MAIN_MISSION_IDS.slice(0, 2),
      sayoEncounterSeen: true,
      secondaryBoardUnlocked: true,
    },
    "doctor-ready": {
      completedMissions: MAIN_MISSION_IDS.slice(0, 3),
      sayoEncounterSeen: true,
      secondaryBoardUnlocked: true,
    },
    "library-ready": {
      completedMissions: MAIN_MISSION_IDS.slice(0, 4),
      sayoEncounterSeen: true,
      secondaryBoardUnlocked: true,
      archiveUnlocked: true,
    },
    "mission-3-ready": {
      completedMissions: MAIN_MISSION_IDS.slice(0, 4),
      banditPrisonerChoice: "interrogate",
      archiveUnlocked: true,
    },
    "mission-4-ready": {
      completedMissions: MAIN_MISSION_IDS.slice(0, 5),
      banditPrisonerChoice: "interrogate",
      archiveUnlocked: true,
      secretWarehouseLooted: true,
      hideoutSupplies: 2
    },
    "mission-5-ready": {
      completedMissions: MAIN_MISSION_IDS.slice(0, 6),
      banditPrisonerChoice: "interrogate",
      archiveUnlocked: true,
    }
  };
  if (!Object.hasOwn(checkpoints, checkpointId)) return result;
  result.campaign = { ...baseCampaign, ...checkpoints[checkpointId] };
  return normalizeSave(result);
}

export function xpForNextLevel(level) {
  return characterLevel(level) === MAX_CHARACTER_LEVEL ? 0 : experienceForNextLevel(level);
}

export function awardEncounter(save, enemyId, { firstClear = true, mission, encounterIndex, encounterIds } = {}) {
  const result = normalizeSave(save);
  const base = firstClear && mission?.rewardProfile !== "affinity" ? ENCOUNTER_REWARDS[enemyId] : null;
  if (!base) return { save: result, xp: 0, affinityXp: 0, coins: 0, levelsGained: 0 };
  if (!mission) throw new Error("La recompensa de un enemigo requiere su misión.");
  const stats = derivedStats(result);
  const ids = encounterIds || resolveEncounterIds(mission,result.campaign);
  const index = encounterIndex ?? ids.indexOf(enemyId);
  if (ids[index] !== enemyId) throw new Error("El enemigo no corresponde al encuentro de la misión.");
  const experienceReward = missionXpPlan(mission,{ encounterIds:ids,xpBonus:stats.xpBonus }).encounterXp[index];
  const { xp: gainedXp, levelsGained } = addExperience(result.progression, experienceReward);
  result.progression.coins += base.coins;
  const affinityXp = mission.affinitySlot ? 0 : Math.max(8, Math.round(experienceReward * 0.5));
  result.character.affinities.forEach((id) => { result.character.affinityXp[id] += affinityXp; });
  return { save: result, xp: gainedXp, affinityXp, coins: base.coins, levelsGained };
}

export function completeMission(save, missionId) {
  const result = normalizeSave(save);
  const mission = ALL_MISSIONS.find((entry) => entry.id === missionId);
  if (mission?.type) return completeSecondaryMission(result, mission);
  const state = mission ? missionState(mission, result) : null;
  if (!mission || state.completed || !state.unlocked) {
    return { save: result, xp: 0, coins: 0, levelsGained: 0, firstClear: false, blocked: Boolean(mission && !state.unlocked) };
  }

  const experienceReward = missionXpPlan(mission,{ encounterIds:resolveEncounterIds(mission,result.campaign),xpBonus:derivedStats(result).xpBonus }).completionXp;
  const { xp: gainedXp, levelsGained } = addExperience(result.progression, experienceReward);
  const completionBonus = missionStep(mission, "choice")?.completionBonus;
  const secretBonus = completionBonus?.requirements?.every((requirement) => requirementMet(requirement, result))
    ? completionBonus.coins || 0
    : 0;
  const gainedCoins = mission.reward.coins + secretBonus;
  result.progression.coins += gainedCoins;
  const affinityXp = mission.affinitySlot ? 0 : Math.max(10, Math.round(experienceReward * 0.35));
  result.character.affinities.forEach((id) => { result.character.affinityXp[id] += affinityXp; });
  result.campaign[mission.category === "secondary" ? "completedSecondaryMissions" : "completedMissions"].push(missionId);
  for (const [id, quantity] of Object.entries(mission.reward.items || {})) if (ITEMS[id]) result.inventory.items[id] = Math.min(ITEMS[id].stackLimit, (result.inventory.items[id] || 0) + quantity);
  if (mission.contractItem) delete result.inventory.items[mission.contractItem];
  applyMissionEffects(result, mission.completionEffects, { secretBonusAwarded: secretBonus > 0 });
  result.campaign.rank = PLAYER_RANK_LABELS[playerRank(result)];
  result.campaign.secondaryBoardUnlocked = locationAccess("missions", result).unlocked;
  result.campaign.missionProgress[missionId] = createCompletedMissionProgress(mission);
  return { save: result, xp: gainedXp, affinityXp, coins: gainedCoins, bonusCoins: secretBonus, levelsGained, firstClear: true };
}
function completeRouteSearchMission(result, mission) {
  if (missionState(mission, result).completed || result.campaign.doctorRoute.phase < 3 || !cipherComplete(result.campaign.doctorRoute.cipher)) return emptySecondaryCompletion(result, { blocked: true });
  const experienceReward = Math.round(mission.reward.xp * (1 + derivedStats(result).xpBonus));
  const { xp: gainedXp, levelsGained } = addExperience(result.progression, experienceReward);
  const gainedCoins = mission.reward.coins * (result.campaign.banditPrisonerChoice === "interrogate" ? 2 : 1);
  const affinityXp = Math.max(8, Math.round(experienceReward * 0.35));
  const supplyBonus = result.campaign.doctorRoute.resources >= 2 ? 1 : 0;
  result.progression.coins += gainedCoins;
  result.character.affinities.forEach((id) => { result.character.affinityXp[id] += affinityXp; });
  const history = mission.category === "main" ? "completedMissions" : "completedSecondaryMissions";
  result.campaign[history] = [...new Set([...result.campaign[history], mission.id])];
  result.campaign.doctorSupplyBonus = supplyBonus;
  result.campaign.doctorBookDeliveryPending = true;
  result.campaign.doctorRoute.active = false;
  applyMissionEffects(result, mission.completionEffects);
  result.campaign.missionProgress[mission.id] = createCompletedMissionProgress(mission);
  return { save: normalizeSave(recordTutorialLesson(result, "cipher")), xp: gainedXp, affinityXp, coins: gainedCoins, supplyBonus, levelsGained, firstClear: true };
}
const SECONDARY_COMPLETION_HANDLERS = Object.freeze({
  investigation: (result,mission) => completeInvestigationMission(result,mission,{ xpBonus:derivedStats(result).xpBonus }),
  "route-search": completeRouteSearchMission
});

export function completeSecondaryMission(save, missionOrId) {
  return completeSecondaryByType(normalizeSave(save), missionOrId, ALL_MISSIONS, SECONDARY_COMPLETION_HANDLERS);
}

export function markSecondaryMissionCompleted(save, missionOrId) {
  return completeSecondaryMission(save, missionOrId).save;
}

export function chooseHideoutEntrance(save, entrance) {
  const result = normalizeSave(save);
  result.campaign.hideoutEntryChoice = entrance === "secret" && campaignFlag(result, "secretEntranceKnown") ? "secret" : "main";
  return normalizeSave(recordTutorialLesson(result, "entry-choice"));
}

export function startDoctorMission(save, mission = secondaryMissionByType("route-search", ALL_MISSIONS)) {
  const result = normalizeSave(save);
  if (!mission || !missionState(mission, result).unlocked || missionState(mission, result).completed) return result;
  result.campaign.doctorRoute = { ...createDoctorRouteState(), active: true };
  return normalizeSave(result);
}

export function chooseDoctorMissionRoute(save, routeId) {
  const result = normalizeSave(save);
  result.campaign.doctorRoute = chooseRoute(result.campaign.doctorRoute, routeId);
  return normalizeSave(recordRouteLesson(result, save.campaign.doctorRoute.phase));
}

export function resolveDoctorRiverPassage(save, passageId) {
  const result = normalizeSave(save);
  result.campaign.doctorRoute = resolveRiverPassage(result.campaign.doctorRoute, passageId);
  return normalizeSave(recordRouteLesson(result, save.campaign.doctorRoute.phase));
}

export function resolveDoctorMissionCombat(save) {
  const result = normalizeSave(save);
  result.campaign.doctorRoute = resolveRouteCombat(result.campaign.doctorRoute);
  return normalizeSave(recordRouteLesson(result, save.campaign.doctorRoute.phase));
}

export function cancelDoctorMission(save) {
  const result = normalizeSave(save);
  result.campaign.doctorRoute = createDoctorRouteState();
  return normalizeSave(result);
}

export function completeDoctorMission(save, mission = secondaryMissionByType("route-search", ALL_MISSIONS)) {
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
  return normalizeSave(recordTutorialLesson(result, "book"));
}

export function recordBestiaryObservation(save, enemyId, observation = {}) {
  const result = normalizeSave(save);
  if (!campaignFlag(result, "bestiaryBookObtained") || !Object.hasOwn(ENEMY_ROSTER, enemyId)) return result;
  const current = result.bestiary.entries[enemyId] || { encounters: 0, defeated: 0, techniques: [], vulnerabilities: [], documents: 0 };
  if (observation.encounter) current.encounters += 1;
  if (observation.defeated) current.defeated += 1;
  if (observation.technique && Object.hasOwn(ENEMY_ACTIONS, canonicalAbilityId(observation.technique))) current.techniques = [...new Set([...current.techniques, canonicalAbilityId(observation.technique)])];
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
  const availableSlots = availableAffinitySlots(result.progression.level, result.campaign.elementRank, false, result.campaign.rank, result.campaign.completedSecondaryMissions);
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
  Object.entries(resonanceBonuses(normalized)).forEach(([stat, value]) => {
    if (Object.hasOwn(baseStats, stat)) baseStats[stat] += value;
    else if (stat === "evasion") utility.equipmentEvasion += value;
    else if (Object.hasOwn(utility, stat)) utility[stat] += value;
  });
  const equipmentItems = Object.entries(normalized.equipment).map(([type, id]) => EQUIPMENT[type]?.find(entry => entry.id === id));
  equipmentItems.push(ITEMS[normalized.character?.outfit]);
  equipmentItems.forEach(item => {
    Object.entries(item?.bonuses || {}).forEach(([stat, value]) => {
      const statMap = { maxHp: "health", maxChakra: "chakra", damageBonus: "strength", speed: "speed", luck: "luck" };
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
