import { buildSkillTree, SKILLS_BY_ID, SKILL_CATALOG } from "./definitions.js?v=1.0.0";
import { ELEMENTS } from "../elements.js?v=0.20.0";

const integer = value => Number.isFinite(Number(value)) ? Math.max(0,Math.floor(Number(value))) : 0;
// Separate from attribute points: three initial points, two per character level.
export const earnedResonancePoints = save => 3 + 2 * Math.max(0, integer(save?.progression?.level) - 1);
export const purchasedRanks = (save,id) => integer(save?.progression?.resonance?.investments?.[id]);

export function naturalSkillLevel(save, node) {
  if (!node?.jutsuId) return 0;
  const xp = Math.min(...node.affinityIds.map(id => integer(save?.character?.affinityXp?.[id])));
  return xp >= node.affinityXpRequired && integer(save?.progression?.level) >= node.unlockLevel ? 1 : 0;
}

export function skillLevel(save,node) {
  if (!node || node.placeholder) return 0;
  return Math.min(node.maxLevel, naturalSkillLevel(save,node) + purchasedRanks(save,node.id));
}

/** @returns {import('./definitions.js').SkillNode[]} */
export function skillTreeNodes(save) {
  return buildSkillTree(save?.character?.affinities || [],save?.campaign?.elementRank || 1)
    .map(node => ({ ...node,level:skillLevel(save,node) }));
}

export function normalizeResonance(resonance, level) {
  let budget = earnedResonancePoints({ progression: { level } });
  const investments = {};
  for (const [id, value] of Object.entries(resonance?.investments || {})) {
    const node = SKILLS_BY_ID.get(id);
    if (!node) continue;
    const ranks = Math.min(node.jutsuId ? node.maxLevel-1 : node.maxLevel, integer(value), Math.floor(budget/node.cost));
    if (ranks) { investments[id] = ranks; budget -= ranks * node.cost; }
  }
  return { investments };
}

export function resonancePoints(save) {
  const spent = Object.entries(save?.progression?.resonance?.investments || {}).reduce((sum,[id,ranks]) => sum + (SKILLS_BY_ID.get(id)?.cost || 0)*integer(ranks),0);
  return Math.max(0, earnedResonancePoints(save) - spent);
}

export function skillRequirements(save,node) {
  if (node.placeholder) return [node.description];
  const missing = [];
  const affinities = save?.character?.affinities || [];
  if (!node.affinityIds.every(id => affinities.includes(id))) missing.push("Equipa las afinidades de esta habilidad");
  if (node.element && ELEMENTS[node.element].tier > (save?.campaign?.elementRank || 1)) missing.push(`Rango elemental ${ELEMENTS[node.element].tier}`);
  if (node.jutsuId && !naturalSkillLevel(save,node)) {
    if ((save?.progression?.level || 1) < node.unlockLevel) missing.push(`Nivel ${node.unlockLevel}`);
    missing.push(`${node.affinityXpRequired} PX de afinidad`);
  }
  node.prerequisites.forEach(id => {
    const parent = SKILLS_BY_ID.get(id);
    if (!skillLevel(save,parent)) missing.push(`${parent?.name || id} · nivel 1`);
  });
  return missing;
}

export function skillState(save,node) {
  const level = skillLevel(save,node);
  const active = !node.placeholder && node.affinityIds.every(id => save?.character?.affinities?.includes(id)) && (!node.element || ELEMENTS[node.element].tier <= (save?.campaign?.elementRank || 1));
  if (!active) return "locked";
  if (level > 1) return "upgraded";
  if (level) return "unlocked";
  return skillRequirements(save,node).length ? "locked" : "available";
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
  const bonus = node && skillState(save,node) !== "locked" ? purchasedRanks(save,jutsu.id) * 2 : 0;
  return bonus ? { ...jutsu, damage: jutsu.damage + bonus } : jutsu;
}
