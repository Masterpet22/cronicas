import { ENEMY_ACTIONS, ENEMY_ROSTER, EQUIPMENT, JUTSU_LIBRARY, MISSIONS, SECONDARY_MISSIONS } from "./data.js?v=0.66.0";
import { applyMissionEffects, missionState, missionStep, requirementMet } from "./mission-system.js?v=0.67.0";
import { BASIC_ELEMENT_IDS, basicRequirements, canAccessElement } from "./elements.js?v=0.20.0";
import { AFFINITY_CONFIG, applyAffinityStatModifiers, availableAffinitySlots, normalizeAffinityOrder } from "./affinity-system.js?v=0.58.0";
import { chooseDoctorRoute as chooseRoute, createDoctorRouteState, normalizeDoctorRouteState, resolveDoctorRouteCombat as resolveRouteCombat, resolveRiverPassage } from "./doctor-mission.js?v=0.60.0";
import { completeInvestigationMission, completeSecondaryByType, emptySecondaryCompletion, secondaryMissionByType } from "./secondary-missions.js?v=0.66.0";
export const SAVE_KEY = "cronicas-del-sello-save";
export const ACTIVE_SAVE_SLOT_KEY = `${SAVE_KEY}-active-slot`;
export const MAX_SAVE_SLOTS = 3;
export const SAVE_VERSION = 16;

const DEFAULT_EQUIPMENT = { weapon: "kunai", armor: "light_vest", accessory: "chakra_charm" };
export const MASTER_IDS = Object.freeze(["mei", "daichi"]);

export function assignedMasterId(bodyType) {
  return bodyType === "female" ? "daichi" : "mei";
}

export function masterIdForCharacter(character) {
  return MASTER_IDS.includes(character?.masterId) ? character.masterId : assignedMasterId(character?.bodyType);
}

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
      rank: "Novicio",
      elementRank: 1,
      tutorialSeen: false,
      sayoEncounterSeen: false,
      secondaryBoardUnlocked: false,
      kagemoriInvestigated: false,
      banditBossMissionUnlocked: false,
      banditPrisonerChoice: null,
      nextSideMissionGoldMultiplier: 1,
      archiveUnlocked: false,
      sayoRelicPending: false,
      sayoRelicDelivered: false,
      seenMissionNotices: [],
      cipherMapObtained: false,
      doctorMissionUnlocked: false,
      doctorMissionCompleted: false,
      doctorSupplyBonus: 0,
      bestiaryBookObtained: false,
      doctorBookDeliveryPending: false,
      hideoutLocationRevealed: false,
      hideoutMissionUnlocked: false,
      secretEntranceKnown: false,
      hideoutEntryChoice: null,
      secretWarehouseLooted: false,
      heartMissionUnlocked: false,
      hideoutSupplies: 0,
      hideoutDiscoveryChoice: null,
      prisonersRescued: false,
      organizationDocumentsRecovered: false,
      organizationRevealed: false,
      banditLeaderMissionUnlocked: false,
      firstSagaCompleted: false,
      doctorRoute: createDoctorRouteState(),
      masterSelectionUnlocked: false
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

export function createCharacter(save, { name, affinity, appearance, bodyType, hair }) {
  const cleanName = String(name || "").trim().slice(0, 18) || "Akio";
  const cleanAffinity = BASIC_ELEMENT_IDS.includes(affinity) ? affinity : "fuego";
  const cleanAppearance = /^#[0-9a-f]{6}$/i.test(appearance || "") ? appearance : "#e8edf5";
  return {
    ...createDefaultSave(),
    ...save,
    version: SAVE_VERSION,
    character: { name: cleanName, affinity: cleanAffinity, affinities: [cleanAffinity], knownAffinities: [cleanAffinity], affinityXp: Object.fromEntries(BASIC_ELEMENT_IDS.map((id) => [id, id === cleanAffinity ? 50 : 0])), appearance: cleanAppearance, bodyType: bodyType === "female" ? "female" : "male", masterId: assignedMasterId(bodyType), face: 1, hair: Math.min(5, Math.max(1, Number(hair) || 1)), top: 1, bottom: 1, shoes: 1 },
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
  const defaults = createDefaultSave();
  if (!candidate || typeof candidate !== "object") return defaults;
  const progression = candidate.progression || {};
  const attributes = progression.attributes || {};
  const level = Math.max(1, Math.floor(Number(progression.level) || 1));
  const sourceVersion = Math.max(0, Math.floor(Number(candidate.version) || 0));
  const migratedMissionIds = sourceVersion < 16
    ? (candidate.campaign?.completedMissions || []).flatMap((id) => {
        const migrated = { m11: "m02", m12: "m03", m13: "m04", m14: "m05" }[id];
        return migrated ? [migrated] : id === "m01" ? [id] : [];
      })
    : (candidate.campaign?.completedMissions || []);
  const completedMissions = [...new Set(Array.isArray(migratedMissionIds) ? migratedMissionIds : [])]
    .filter((id) => MISSIONS.some((mission) => mission.id === id));
  const completedSecondaryMissions = [...new Set([
    ...(Array.isArray(candidate.campaign?.completedSecondaryMissions) ? candidate.campaign.completedSecondaryMissions : []),
    ...(candidate.campaign?.kagemoriInvestigated ? ["s01"] : []),
    ...(candidate.campaign?.doctorMissionCompleted ? ["s02"] : [])
  ])].filter((id) => SECONDARY_MISSIONS.some((mission) => mission.id === id));
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
      hair: Math.min(5, Math.max(1, Math.floor(Number(candidate.character.hair) || 1))),
      top: Math.min(3, Math.max(1, Math.floor(Number(candidate.character.top) || 1))),
      bottom: Math.min(3, Math.max(1, Math.floor(Number(candidate.character.bottom) || 1))),
      shoes: Math.min(2, Math.max(1, Math.floor(Number(candidate.character.shoes) || 1)))
    } : null,
    progression: {
      level,
      xp: Math.max(0, Math.floor(Number(progression.xp) || 0)),
      coins: Math.max(0, Math.floor(Number(progression.coins) || 0)),
      attributePoints: Math.max(0, Math.floor(Number(progression.attributePoints) || 0)),
      attributes: {
        health: Math.max(0, Math.floor(Number(attributes.health) || 0)),
        strength: Math.max(0, Math.floor(Number(attributes.strength) || 0)),
        speed: Math.max(0, Math.floor(Number(attributes.speed) || 0)),
        chakra: Math.max(0, Math.floor(Number(attributes.chakra) || 0)),
        luck: Math.max(0, Math.floor(Number(attributes.luck) || 0))
      }
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
      rank: candidate.campaign?.rank === "Guardián" ? "Guardián" : "Novicio",
      elementRank,
      tutorialSeen: Boolean(candidate.campaign?.tutorialSeen),
      sayoEncounterSeen: Boolean(candidate.campaign?.sayoEncounterSeen),
      secondaryBoardUnlocked: Boolean(candidate.campaign?.secondaryBoardUnlocked),
      kagemoriInvestigated: Boolean(candidate.campaign?.kagemoriInvestigated) || completedSecondaryMissions.includes("s01"),
      banditBossMissionUnlocked: Boolean(candidate.campaign?.banditBossMissionUnlocked) || completedSecondaryMissions.includes("s01"),
      banditPrisonerChoice: ["interrogate", "eliminate"].includes(candidate.campaign?.banditPrisonerChoice) ? candidate.campaign.banditPrisonerChoice : null,
      nextSideMissionGoldMultiplier: Number(candidate.campaign?.nextSideMissionGoldMultiplier) === 2 ? 2 : 1,
      archiveUnlocked: Boolean(candidate.campaign?.archiveUnlocked),
      sayoRelicPending: Boolean(candidate.campaign?.sayoRelicPending),
      sayoRelicDelivered: Boolean(candidate.campaign?.sayoRelicDelivered),
      seenMissionNotices: [...new Set(Array.isArray(candidate.campaign?.seenMissionNotices) ? candidate.campaign.seenMissionNotices : [])]
        .filter((id) => typeof id === "string" && /^[a-z0-9:_-]+$/i.test(id))
        .slice(-50),
      cipherMapObtained: Boolean(candidate.campaign?.cipherMapObtained) || completedMissions.includes("m02"),
      doctorMissionUnlocked: Boolean(candidate.campaign?.doctorMissionUnlocked) || completedMissions.includes("m02"),
      doctorMissionCompleted: Boolean(candidate.campaign?.doctorMissionCompleted) || completedSecondaryMissions.includes("s02"),
      doctorSupplyBonus: Math.min(1, Math.max(0, Math.floor(Number(candidate.campaign?.doctorSupplyBonus) || 0))),
      bestiaryBookObtained: Boolean(candidate.campaign?.bestiaryBookObtained),
      doctorBookDeliveryPending: Boolean(candidate.campaign?.doctorBookDeliveryPending),
      hideoutLocationRevealed: Boolean(candidate.campaign?.hideoutLocationRevealed),
      hideoutMissionUnlocked: Boolean(candidate.campaign?.hideoutMissionUnlocked),
      secretEntranceKnown: Boolean(candidate.campaign?.secretEntranceKnown),
      hideoutEntryChoice: ["main", "secret"].includes(candidate.campaign?.hideoutEntryChoice) ? candidate.campaign.hideoutEntryChoice : null,
      secretWarehouseLooted: Boolean(candidate.campaign?.secretWarehouseLooted),
      heartMissionUnlocked: Boolean(candidate.campaign?.heartMissionUnlocked) || completedMissions.includes("m03"),
      hideoutSupplies: Math.max(0, Math.floor(Number(candidate.campaign?.hideoutSupplies) || 0)),
      hideoutDiscoveryChoice: ["prisoners", "documents"].includes(candidate.campaign?.hideoutDiscoveryChoice) ? candidate.campaign.hideoutDiscoveryChoice : null,
      prisonersRescued: Boolean(candidate.campaign?.prisonersRescued),
      organizationDocumentsRecovered: Boolean(candidate.campaign?.organizationDocumentsRecovered),
      organizationRevealed: Boolean(candidate.campaign?.organizationRevealed) || completedMissions.includes("m04"),
      banditLeaderMissionUnlocked: Boolean(candidate.campaign?.banditLeaderMissionUnlocked) || completedMissions.includes("m04"),
      firstSagaCompleted: Boolean(candidate.campaign?.firstSagaCompleted) || completedMissions.includes("m05"),
      doctorRoute: normalizeDoctorRouteState(candidate.campaign?.doctorRoute),
      masterSelectionUnlocked: Boolean(candidate.campaign?.masterSelectionUnlocked) || completedMissions.includes("m05")
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
      completedMissions: ["m01"],
      sayoEncounterSeen: true,
      secondaryBoardUnlocked: true
    },
    "mission-2-ready": {
      completedMissions: ["m01"],
      completedSecondaryMissions: ["s01"],
      sayoEncounterSeen: true,
      secondaryBoardUnlocked: true,
      kagemoriInvestigated: true,
      banditBossMissionUnlocked: true
    },
    "doctor-ready": {
      completedMissions: ["m01", "m02"],
      completedSecondaryMissions: ["s01"],
      sayoEncounterSeen: true,
      secondaryBoardUnlocked: true,
      kagemoriInvestigated: true,
      banditBossMissionUnlocked: true,
      cipherMapObtained: true,
      doctorMissionUnlocked: true
    },
    "library-ready": {
      completedMissions: ["m01", "m02"],
      completedSecondaryMissions: ["s01", "s02"],
      sayoEncounterSeen: true,
      secondaryBoardUnlocked: true,
      kagemoriInvestigated: true,
      banditBossMissionUnlocked: true,
      cipherMapObtained: true,
      doctorMissionUnlocked: true,
      doctorMissionCompleted: true,
      bestiaryBookObtained: true,
      archiveUnlocked: true,
      hideoutLocationRevealed: true,
      hideoutMissionUnlocked: true
    },
    "mission-3-ready": {
      completedMissions: ["m01", "m02"],
      completedSecondaryMissions: ["s01", "s02"],
      banditPrisonerChoice: "interrogate",
      cipherMapObtained: true,
      doctorMissionUnlocked: true,
      doctorMissionCompleted: true,
      bestiaryBookObtained: true,
      archiveUnlocked: true,
      hideoutLocationRevealed: true,
      hideoutMissionUnlocked: true,
      secretEntranceKnown: true
    },
    "mission-4-ready": {
      completedMissions: ["m01", "m02", "m03"],
      completedSecondaryMissions: ["s01", "s02"],
      banditPrisonerChoice: "interrogate",
      bestiaryBookObtained: true,
      archiveUnlocked: true,
      hideoutMissionUnlocked: true,
      secretEntranceKnown: true,
      secretWarehouseLooted: true,
      heartMissionUnlocked: true,
      hideoutSupplies: 2
    },
    "mission-5-ready": {
      completedMissions: ["m01", "m02", "m03", "m04"],
      completedSecondaryMissions: ["s01", "s02"],
      banditPrisonerChoice: "interrogate",
      bestiaryBookObtained: true,
      archiveUnlocked: true,
      hideoutMissionUnlocked: true,
      heartMissionUnlocked: true,
      organizationRevealed: true,
      banditLeaderMissionUnlocked: true
    }
  };
  if (!Object.hasOwn(checkpoints, checkpointId)) return result;
  result.campaign = { ...baseCampaign, ...checkpoints[checkpointId] };
  return normalizeSave(result);
}

function validSaveSlot(slot) {
  const parsed = Math.floor(Number(slot));
  return parsed >= 1 && parsed <= MAX_SAVE_SLOTS ? parsed : 1;
}

export function saveSlotKey(slot) {
  return `${SAVE_KEY}-slot-${validSaveSlot(slot)}`;
}

export function activeSaveSlot(storage = globalThis.localStorage) {
  try { return validSaveSlot(storage?.getItem(ACTIVE_SAVE_SLOT_KEY)); } catch (_) { return 1; }
}

export function listSaveSlots(storage = globalThis.localStorage) {
  return Array.from({ length: MAX_SAVE_SLOTS }, (_, index) => {
    const slot = index + 1;
    try {
      const raw = storage?.getItem(saveSlotKey(slot));
      return { slot, save: raw ? normalizeSave(JSON.parse(raw)) : null };
    } catch (_) {
      return { slot, save: null };
    }
  });
}

export function selectSaveSlot(slot, storage = globalThis.localStorage) {
  const selected = validSaveSlot(slot);
  try { storage?.setItem(ACTIVE_SAVE_SLOT_KEY, String(selected)); } catch (_) { /* El juego continúa en memoria. */ }
  return loadSave(storage, selected);
}

export function deleteSaveSlot(slot, storage = globalThis.localStorage) {
  const selected = validSaveSlot(slot);
  try { storage?.removeItem(saveSlotKey(selected)); } catch (_) { /* El selector seguirá disponible. */ }
  return createDefaultSave();
}

export function loadSave(storage = globalThis.localStorage, slot = activeSaveSlot(storage)) {
  try {
    const raw = storage?.getItem(saveSlotKey(slot));
    return normalizeSave(raw ? JSON.parse(raw) : null);
  } catch (_) {
    return createDefaultSave();
  }
}

export function writeSave(save, storage = globalThis.localStorage) {
  const normalized = normalizeSave(save);
  try { storage?.setItem(saveSlotKey(activeSaveSlot(storage)), JSON.stringify(normalized)); } catch (_) { /* El juego continúa sin persistencia. */ }
  return normalized;
}

export function xpForNextLevel(level) {
  return 80 + level * 40;
}

export function awardEncounter(save, encounterIndex) {
  const rewards = [
    { xp: 28, coins: 18 },
    { xp: 36, coins: 26 },
    { xp: 48, coins: 36 },
    { xp: 90, coins: 70 }
  ];
  const result = normalizeSave(save);
  const stats = derivedStats(result);
  const base = rewards[encounterIndex] || rewards[0];
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
  if (missionState(mission, result).completed || result.campaign.doctorRoute.phase < 3) return emptySecondaryCompletion(result);
  const gainedXp = Math.round(mission.reward.xp * (1 + derivedStats(result).xpBonus));
  const gainedCoins = mission.reward.coins * result.campaign.nextSideMissionGoldMultiplier;
  const affinityXp = Math.max(8, Math.round(gainedXp * 0.35));
  const supplyBonus = result.campaign.doctorRoute.resources >= 2 ? 1 : 0;
  result.progression.xp += gainedXp;
  result.progression.coins += gainedCoins;
  result.character.affinities.forEach((id) => { result.character.affinityXp[id] += affinityXp; });
  result.campaign.doctorMissionCompleted = true;
  result.campaign.completedSecondaryMissions = [...new Set([...result.campaign.completedSecondaryMissions, mission.id])];
  result.campaign.doctorSupplyBonus = supplyBonus;
  result.campaign.bestiaryBookObtained = true;
  result.campaign.doctorBookDeliveryPending = true;
  result.campaign.hideoutLocationRevealed = true;
  result.campaign.nextSideMissionGoldMultiplier = 1;
  result.campaign.doctorRoute.active = false;
  applyMissionEffects(result, mission.completionEffects);
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
  result.campaign.hideoutEntryChoice = entrance === "secret" && result.campaign.secretEntranceKnown ? "secret" : "main";
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

export function deliverBestiaryBook(save) {
  const result = normalizeSave(save);
  if (!result.campaign.doctorBookDeliveryPending) return result;
  result.campaign.doctorBookDeliveryPending = false;
  result.campaign.archiveUnlocked = true;
  result.campaign.hideoutMissionUnlocked = true;
  result.campaign.secretEntranceKnown = result.campaign.banditPrisonerChoice === "interrogate";
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
  if (!result.campaign.bestiaryBookObtained || !Object.hasOwn(ENEMY_ROSTER, enemyId)) return result;
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
  if (!Object.hasOwn(result.progression.attributes, attribute) || result.progression.attributePoints <= 0) return result;
  result.progression.attributes[attribute] += 1;
  result.progression.attributePoints -= 1;
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
  const baseStats = {
    health: AFFINITY_CONFIG.baseStats.health + health * AFFINITY_CONFIG.attributeGains.health,
    strength: AFFINITY_CONFIG.baseStats.strength + strength * AFFINITY_CONFIG.attributeGains.strength,
    speed: AFFINITY_CONFIG.baseStats.speed + speed * AFFINITY_CONFIG.attributeGains.speed,
    chakra: AFFINITY_CONFIG.baseStats.chakra + chakra * AFFINITY_CONFIG.attributeGains.chakra,
    luck: AFFINITY_CONFIG.baseStats.luck + trainedLuck * AFFINITY_CONFIG.attributeGains.luck
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

export function selectMaster(save, masterId) {
  const result = normalizeSave(save);
  if (!result.campaign.masterSelectionUnlocked || !MASTER_IDS.includes(masterId)) return result;
  result.character.masterId = masterId;
  return result;
}
