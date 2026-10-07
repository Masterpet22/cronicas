import { EQUIPMENT, JUTSU_LIBRARY, MISSIONS } from "./data.js?v=0.15.2";
import { BASIC_ELEMENT_IDS, canAccessElement } from "./elements.js?v=0.15.1";

export const SAVE_KEY = "cronicas-del-sello-save";
export const SAVE_VERSION = 4;

const DEFAULT_EQUIPMENT = { weapon: "kunai", armor: "light_vest", accessory: "chakra_charm" };
const LEGACY_AFFINITIES = { fire: "fuego", wind: "viento", lightning: "viento" };

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
      companion: null
    }
  };
}

export function initialLoadout(affinity) {
  return JUTSU_LIBRARY.filter((jutsu) => jutsu.element === affinity && jutsu.unlockLevel === 1)
    .slice(0, 4).map((jutsu) => jutsu.id);
}

export function createCharacter(save, { name, affinity, appearance, bodyType, hair }) {
  const cleanName = String(name || "").trim().slice(0, 18) || "Akio";
  const cleanAffinity = BASIC_ELEMENT_IDS.includes(affinity) ? affinity : "fuego";
  const cleanAppearance = /^#[0-9a-f]{6}$/i.test(appearance || "") ? appearance : "#e8edf5";
  return {
    ...createDefaultSave(),
    ...save,
    version: SAVE_VERSION,
    character: { name: cleanName, affinity: cleanAffinity, affinities: [cleanAffinity], appearance: cleanAppearance, bodyType: bodyType === "female" ? "female" : "male", face: 1, hair: Math.min(5, Math.max(1, Number(hair) || 1)), top: 1, bottom: 1, shoes: 1 },
    progression: { ...createDefaultSave().progression },
    equipment: { ...DEFAULT_EQUIPMENT },
    loadout: initialLoadout(cleanAffinity),
    campaign: { ...createDefaultSave().campaign }
  };
}

function validEquipment(type, id) {
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
  const unlockedIds = new Set(JUTSU_LIBRARY.filter((jutsu) => jutsu.unlockLevel <= level && canAccessElement(jutsu.element, affinities, elementRank)).map((jutsu) => jutsu.id));
  const selectedLoadout = [...new Set(Array.isArray(candidate.loadout) ? candidate.loadout : [])]
    .filter((id) => unlockedIds.has(id));
  const loadout = [...new Set([...selectedLoadout, ...initialLoadout(affinity)])]
    .filter((id) => unlockedIds.has(id)).slice(0, 4);

  return {
    version: SAVE_VERSION,
    character: candidate.character ? {
      name: String(candidate.character.name || "Akio").trim().slice(0, 18) || "Akio",
      affinity,
      affinities,
      appearance: /^#[0-9a-f]{6}$/i.test(candidate.character.appearance || "") ? candidate.character.appearance : "#e8edf5",
      bodyType: candidate.character.bodyType === "female" ? "female" : "male",
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
      accessory: validEquipment("accessory", candidate.equipment?.accessory)
    },
    loadout: candidate.character ? loadout : [],
    campaign: {
      completedMissions,
      rank: candidate.campaign?.rank === "Guardián" ? "Guardián" : "Novicio",
      elementRank,
      tutorialSeen: Boolean(candidate.campaign?.tutorialSeen),
      companion: candidate.campaign?.companion === "mika" ? "mika" : null
    }
  };
}

export function loadSave(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    return normalizeSave(raw ? JSON.parse(raw) : null);
  } catch (_) {
    return createDefaultSave();
  }
}

export function writeSave(save, storage = globalThis.localStorage) {
  const normalized = normalizeSave(save);
  try { storage?.setItem(SAVE_KEY, JSON.stringify(normalized)); } catch (_) { /* El juego continúa sin persistencia. */ }
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
  let levelsGained = 0;
  while (result.progression.xp >= xpForNextLevel(result.progression.level)) {
    result.progression.xp -= xpForNextLevel(result.progression.level);
    result.progression.level += 1;
    result.progression.attributePoints += 2;
    levelsGained += 1;
  }
  return { save: result, xp: gainedXp, coins: base.coins, levelsGained };
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
  result.campaign.completedMissions.push(missionId);
  if (missionId === "m02") result.campaign.companion = "mika";
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
  return { save: result, xp: gainedXp, coins: mission.reward.coins, levelsGained, firstClear: true };
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
    xpBonus: 0
  };
  Object.entries(normalized.equipment).forEach(([type, id]) => {
    const item = EQUIPMENT[type].find((entry) => entry.id === id);
    Object.entries(item?.bonuses || {}).forEach(([stat, value]) => { stats[stat] += value; });
  });
  return stats;
}
