import { EQUIPMENT, JUTSU_LIBRARY, MISSIONS } from "./data.js?v=0.56.0";
import { BASIC_ELEMENT_IDS, basicRequirements, canAccessElement } from "./elements.js?v=0.20.0";

export const SAVE_KEY = "cronicas-del-sello-save";
export const ACTIVE_SAVE_SLOT_KEY = `${SAVE_KEY}-active-slot`;
const SAVE_SLOTS_MIGRATED_KEY = `${SAVE_KEY}-slots-migrated`;
export const MAX_SAVE_SLOTS = 3;
export const SAVE_VERSION = 10;

const DEFAULT_EQUIPMENT = { weapon: "kunai", armor: "light_vest", accessory: "chakra_charm", companion: null };
const LEGACY_AFFINITIES = { fire: "fuego", wind: "viento", lightning: "viento" };
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
      attributes: { power: 0, agility: 0, focus: 0 }
    },
    equipment: { ...DEFAULT_EQUIPMENT },
    loadout: [],
    campaign: {
      completedMissions: [],
      rank: "Novicio",
      elementRank: 1,
      tutorialSeen: false,
      companion: null,
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
      bestiaryBookObtained: false,
      masterSelectionUnlocked: false
    }
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
    character: { name: cleanName, affinity: cleanAffinity, affinities: [cleanAffinity], affinityXp: Object.fromEntries(BASIC_ELEMENT_IDS.map((id) => [id, id === cleanAffinity ? 50 : 0])), appearance: cleanAppearance, bodyType: bodyType === "female" ? "female" : "male", masterId: assignedMasterId(bodyType), face: 1, hair: Math.min(5, Math.max(1, Number(hair) || 1)), top: 1, bottom: 1, shoes: 1 },
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
  const completedMissions = [...new Set(Array.isArray(candidate.campaign?.completedMissions) ? candidate.campaign.completedMissions : [])]
    .filter((id) => MISSIONS.some((mission) => mission.id === id));
  const inferredRank = completedMissions.includes("m10") ? 3 : completedMissions.includes("m07") ? 2 : 1;
  const elementRank = Math.min(3, Math.max(inferredRank, Math.floor(Number(candidate.campaign?.elementRank) || 1)));
  const legacyAffinity = LEGACY_AFFINITIES[candidate.character?.affinity] || candidate.character?.affinity;
  const requestedAffinities = Array.isArray(candidate.character?.affinities) ? candidate.character.affinities : [legacyAffinity];
  const affinities = [...new Set(requestedAffinities.map((id) => LEGACY_AFFINITIES[id] || id))]
    .filter((id) => BASIC_ELEMENT_IDS.includes(id)).slice(0, elementRank);
  if (!affinities.length) affinities.push("fuego");
  const affinity = affinities[0];
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
        power: Math.max(0, Math.floor(Number(attributes.power) || 0)),
        agility: Math.max(0, Math.floor(Number(attributes.agility) || 0)),
        focus: Math.max(0, Math.floor(Number(attributes.focus) || 0))
      }
    },
    equipment: {
      weapon: validEquipment("weapon", candidate.equipment?.weapon),
      armor: validEquipment("armor", candidate.equipment?.armor),
      accessory: validEquipment("accessory", candidate.equipment?.accessory),
      companion: candidate.campaign?.companion === "mika" && candidate.equipment?.companion === "mika" ? "mika" : null
    },
    loadout: candidate.character ? loadout : [],
    campaign: {
      completedMissions,
      rank: candidate.campaign?.rank === "Guardián" ? "Guardián" : "Novicio",
      elementRank,
      tutorialSeen: Boolean(candidate.campaign?.tutorialSeen),
      companion: candidate.campaign?.companion === "mika" ? "mika" : null,
      sayoEncounterSeen: Boolean(candidate.campaign?.sayoEncounterSeen),
      secondaryBoardUnlocked: Boolean(candidate.campaign?.secondaryBoardUnlocked),
      kagemoriInvestigated: Boolean(candidate.campaign?.kagemoriInvestigated),
      banditBossMissionUnlocked: Boolean(candidate.campaign?.banditBossMissionUnlocked),
      banditPrisonerChoice: ["interrogate", "eliminate"].includes(candidate.campaign?.banditPrisonerChoice) ? candidate.campaign.banditPrisonerChoice : null,
      nextSideMissionGoldMultiplier: Number(candidate.campaign?.nextSideMissionGoldMultiplier) === 2 ? 2 : 1,
      archiveUnlocked: Boolean(candidate.campaign?.archiveUnlocked),
      sayoRelicPending: Boolean(candidate.campaign?.sayoRelicPending),
      sayoRelicDelivered: Boolean(candidate.campaign?.sayoRelicDelivered),
      seenMissionNotices: [...new Set(Array.isArray(candidate.campaign?.seenMissionNotices) ? candidate.campaign.seenMissionNotices : [])]
        .filter((id) => typeof id === "string" && /^[a-z0-9:_-]+$/i.test(id))
        .slice(-50),
      cipherMapObtained: Boolean(candidate.campaign?.cipherMapObtained) || completedMissions.includes("m11"),
      doctorMissionUnlocked: Boolean(candidate.campaign?.doctorMissionUnlocked) || completedMissions.includes("m11"),
      doctorMissionCompleted: Boolean(candidate.campaign?.doctorMissionCompleted),
      bestiaryBookObtained: Boolean(candidate.campaign?.bestiaryBookObtained),
      masterSelectionUnlocked: Boolean(candidate.campaign?.masterSelectionUnlocked) || completedMissions.includes("m11")
    }
  };
}

export const DEBUG_CHECKPOINTS = Object.freeze([
  { id: "saga-start", label: "Inicio de la saga", description: "Cuartel disponible; ninguna misión completada." },
  { id: "kagemori-ready", label: "Investigar Kagemori", description: "Misión 1 completada y Tablón desbloqueado." },
  { id: "mission-2-ready", label: "Misión 2 disponible", description: "Kagemori resuelta y Desfiladero desbloqueado." },
  { id: "doctor-ready", label: "Buscar al doctor", description: "Mapa cifrado obtenido y elección de maestro habilitada." },
  { id: "library-ready", label: "Biblioteca desbloqueada", description: "Doctor encontrado, libro recibido y Biblioteca abierta." }
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
      sayoEncounterSeen: true,
      secondaryBoardUnlocked: true,
      kagemoriInvestigated: true,
      banditBossMissionUnlocked: true
    },
    "doctor-ready": {
      completedMissions: ["m01", "m11"],
      sayoEncounterSeen: true,
      secondaryBoardUnlocked: true,
      kagemoriInvestigated: true,
      banditBossMissionUnlocked: true,
      cipherMapObtained: true,
      doctorMissionUnlocked: true,
      masterSelectionUnlocked: true
    },
    "library-ready": {
      completedMissions: ["m01", "m11"],
      sayoEncounterSeen: true,
      secondaryBoardUnlocked: true,
      kagemoriInvestigated: true,
      banditBossMissionUnlocked: true,
      cipherMapObtained: true,
      doctorMissionUnlocked: true,
      doctorMissionCompleted: true,
      bestiaryBookObtained: true,
      archiveUnlocked: true,
      masterSelectionUnlocked: true
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

function migrateLegacySave(storage) {
  try {
    if (storage?.getItem(SAVE_SLOTS_MIGRATED_KEY)) return;
    const legacy = storage?.getItem(SAVE_KEY);
    if (legacy && !storage?.getItem(saveSlotKey(1))) {
      const migrated = normalizeSave(JSON.parse(legacy));
      storage?.setItem(saveSlotKey(1), JSON.stringify(migrated));
      storage?.setItem(ACTIVE_SAVE_SLOT_KEY, "1");
    }
    storage?.setItem(SAVE_SLOTS_MIGRATED_KEY, "1");
  } catch (_) { /* Un guardado legado corrupto no impide crear una partida nueva. */ }
}

export function listSaveSlots(storage = globalThis.localStorage) {
  migrateLegacySave(storage);
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
  migrateLegacySave(storage);
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
  if (!mission || result.campaign.completedMissions.includes(missionId)) {
    return { save: result, xp: 0, coins: 0, levelsGained: 0, firstClear: false };
  }

  const gainedXp = Math.round(mission.reward.xp * (1 + derivedStats(result).xpBonus));
  result.progression.xp += gainedXp;
  result.progression.coins += mission.reward.coins;
  const affinityXp = Math.max(10, Math.round(gainedXp * 0.35));
  result.character.affinities.forEach((id) => { result.character.affinityXp[id] += affinityXp; });
  result.campaign.completedMissions.push(missionId);
  if (missionId === "m02") result.campaign.companion = "mika";
  if (missionId === "m11") {
    result.campaign.cipherMapObtained = true;
    result.campaign.doctorMissionUnlocked = true;
    result.campaign.masterSelectionUnlocked = true;
  }
  if (mission.exam) result.campaign.rank = "Guardián";
  if (mission.exam) result.campaign.elementRank = Math.max(2, result.campaign.elementRank);
  if (mission.finale) result.campaign.elementRank = 3;

  let levelsGained = 0;
  while (result.progression.xp >= xpForNextLevel(result.progression.level)) {
    result.progression.xp -= xpForNextLevel(result.progression.level);
    result.progression.level += 1;
    result.progression.attributePoints += 2;
    levelsGained += 1;
  }
  return { save: result, xp: gainedXp, affinityXp, coins: mission.reward.coins, levelsGained, firstClear: true };
}

export function spendAttribute(save, attribute) {
  const result = normalizeSave(save);
  if (!Object.hasOwn(result.progression.attributes, attribute) || result.progression.attributePoints <= 0) return result;
  result.progression.attributes[attribute] += 1;
  result.progression.attributePoints -= 1;
  return result;
}

export function derivedStats(save) {
  const normalized = normalizeSave(save);
  const { power, agility, focus } = normalized.progression.attributes;
  const stats = {
    maxHp: 100,
    maxChakra: 70 + focus * 2,
    speed: 12 + Math.floor(agility / 2),
    accuracy: 95 + focus,
    evasion: 8 + agility,
    damageBonus: power,
    costReduction: 0,
    xpBonus: 0,
    damageReduction: 0
  };
  Object.entries(normalized.equipment).forEach(([type, id]) => {
    const item = EQUIPMENT[type]?.find((entry) => entry.id === id);
    Object.entries(item?.bonuses || {}).forEach(([stat, value]) => { stats[stat] += value; });
  });
  if (masterIdForCharacter(normalized.character) === "mei") stats.damageReduction += 2;
  else stats.damageBonus += 3;
  return stats;
}

export function selectMaster(save, masterId) {
  const result = normalizeSave(save);
  if (!result.campaign.masterSelectionUnlocked || !MASTER_IDS.includes(masterId)) return result;
  result.character.masterId = masterId;
  return result;
}
