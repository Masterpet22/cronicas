import { buildSkillTree, skillHasCell, SKILLS_BY_ID, SKILL_CATALOG } from "./definitions.js?v=1.4.0";
import { ELEMENTS } from "../elements.js?v=0.20.0";
import { techniqueAtLevel } from "./technique-mastery.js?v=1.0.0";
import { characterLevel } from "../progression-balance.js?v=0.94.0";

const integer = value => Number.isFinite(Number(value)) ? Math.max(0,Math.floor(Number(value))) : 0;
// Independientes de los atributos: cero al crear el personaje, dos por subida.
export const earnedResonancePoints = save => 2 * (characterLevel(save?.progression?.level) - 1);
export const purchasedRanks = (save,id) => integer(save?.progression?.resonance?.investments?.[id]);

// Cinco rangos gratuitos: dos iniciales, uno físico y uno por cada nueva afinidad.
export function naturalSkillLevel(save, node) {
  if (!node || !skillHasCell(save?.character?.affinities || [],node.id)) return 0;
  if (node.id === "physical_0") return 1;
  if (node.category !== "affinity") return 0;
  return node.affinityIndex === 0 || (node.affinityIndex === 1 && node.affinityIds[0] === save.character.affinities[0]) ? 1 : 0;
}

export function prerequisiteEntries(save,node) {
  if (naturalSkillLevel(save,node)) return [];
  return node.prerequisites.map(id => [id,node.prerequisiteLevels?.[id] || 1]);
}

export function skillUnlockRequirements(save,node) {
  if (!node || node.placeholder) return [node?.description || "Habilidad inexistente"];
  const missing = [];
  if (!skillHasCell(save?.character?.affinities || [],node.id)) missing.push("Equipa las afinidades y la casilla de esta habilidad");
  if (node.element && ELEMENTS[node.element].tier > (save?.campaign?.elementRank || 1)) missing.push(`Rango elemental ${ELEMENTS[node.element].tier}`);
  if (naturalSkillLevel(save,node)) return missing;
  if ((save?.progression?.level || 1) < node.unlockLevel) missing.push(`Nivel de personaje ${node.unlockLevel}`);
  if (node.jutsuId) {
    const xp = Math.min(...node.affinityIds.map(id => integer(save?.character?.affinityXp?.[id])));
    if (xp < node.affinityXpRequired) missing.push(`${node.affinityXpRequired} PX de afinidad`);
  }
  for (const [id,rank] of prerequisiteEntries(save,node)) {
    const parent = SKILLS_BY_ID.get(id);
    if (skillLevel(save,parent) < rank) missing.push(`${parent?.name || id} · rango ${rank}`);
  }
  return missing;
}

export function skillLevel(save,node) {
  if (!node || node.placeholder || !skillHasCell(save?.character?.affinities || [],node.id)) return 0;
  const raw = Math.min(node.maxLevel, naturalSkillLevel(save,node) + purchasedRanks(save,node.id));
  if (!raw || skillUnlockRequirements(save,node).length) return 0;
  return Math.min(raw, (node.rankLevels || [1,1,1]).filter(level => level <= (save?.progression?.level || 1)).length);
}

/** @returns {import('./definitions.js').SkillNode[]} */
export function skillTreeNodes(save) {
  return buildSkillTree(save?.character?.affinities || [],save?.campaign?.elementRank || 1)
    .map(node => ({ ...node,cellId:node.id,level:skillLevel(save,node) }));
}

export function normalizeResonance(resonance, context, { reset = false } = {}) {
  if (reset) return { investments: {} };
  let budget = earnedResonancePoints(context);
  const investments = {};
  const save = { ...context,progression:{ ...context.progression,resonance:{ investments } } };
  const pending = new Map(Object.entries(resonance?.investments || {}));
  // Repetir permite cargar los hijos antes que sus padres sin depender del orden del JSON.
  for (let pass = 0; pass < SKILL_CATALOG.length && pending.size; pass++) {
    let changed = false;
    for (const [id,value] of pending) {
      const node = SKILLS_BY_ID.get(id);
      if (!node) { pending.delete(id); continue; }
      const equipped = node.affinityIds.every(affinity => context.character.affinities.includes(affinity));
      if (equipped && !skillHasCell(context.character.affinities,id)) { pending.delete(id); continue; }
      if (equipped && skillUnlockRequirements(save,node).length) continue;
      const free = naturalSkillLevel(save,node);
      const cap = (node.rankLevels || [1,1,1]).filter(level => level <= context.progression.level).length;
      const ranks = Math.min(node.maxLevel-free, Math.max(0,cap-free), integer(value), Math.floor(budget/node.cost));
      if (ranks) { investments[id] = ranks; budget -= ranks * node.cost; }
      pending.delete(id); changed = true;
    }
    if (!changed) break;
  }
  return { investments };
}

export function resonancePoints(save) {
  const spent = Object.entries(save?.progression?.resonance?.investments || {}).reduce((sum,[id,ranks]) => sum + (SKILLS_BY_ID.get(id)?.cost || 0)*integer(ranks),0);
  return Math.max(0, earnedResonancePoints(save) - spent);
}

export function skillRequirements(save,node) {
  const missing = skillUnlockRequirements(save,node);
  const level = skillLevel(save,node);
  const next = node?.rankLevels?.[level];
  if (level && next && (save?.progression?.level || 1) < next) missing.push(`Nivel de personaje ${next} para rango ${level+1}`);
  return missing;
}

export function skillState(save,node) {
  if (!node || skillUnlockRequirements(save,node).length) return "locked";
  const level = skillLevel(save,node);
  return level > 1 ? "upgraded" : level ? "unlocked" : "available";
}

export function investResonance(save,id) {
  const node = SKILLS_BY_ID.get(id);
  if (!node || skillRequirements(save,node).length || skillLevel(save,node) >= node.maxLevel || resonancePoints(save) < node.cost) return save;
  const investments = { ...save.progression?.resonance?.investments, [id]: purchasedRanks(save,id)+1 };
  return { ...save, progression: { ...save.progression, resonance: { investments } } };
}

export function resonanceBonuses(save) {
  const bonuses = {};
  for (const node of SKILL_CATALOG) {
    if (!node.effect || skillState(save,node) === "locked") continue;
    const amount = skillLevel(save,node) * node.effect.amount;
    bonuses[node.effect.stat] = (bonuses[node.effect.stat] || 0) + amount;
  }
  return bonuses;
}

export function upgradedTechnique(save,jutsu) {
  const node = SKILLS_BY_ID.get(jutsu.id);
  const level = node && skillState(save,node) !== "locked" ? skillLevel(save,node) : 1;
  return techniqueAtLevel(jutsu, level);
}
