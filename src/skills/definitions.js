import { JUTSU_LIBRARY } from "../data.js?v=0.114.0";
import { ELEMENTS, BASIC_ELEMENT_IDS, basicRequirements } from "../elements.js?v=0.20.0";
export const PHYSICAL_COLOR = "#bca0ff";

/**
 * @typedef {Object} SkillDefinition
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {"physical"|"affinity"|"hybrid"} category
 * @property {string[]} affinityIds
 * @property {string} icon
 * @property {number} maxLevel
 * @property {number} cost Resonance points per purchased rank (not chakra).
 * @property {string[]} prerequisites All listed nodes must have at least one rank.
 * @property {number} q Axial coordinate; belongs to layout, never player progression.
 * @property {number} r
 */
/** @typedef {SkillDefinition & { level: number }} SkillNode Runtime projection of definition + player progression. */

// Flat-top axial cells. Layout is data, shared by every equipped element.
export const SKILL_LAYOUT = Object.freeze({
  physical: [[0,-1],[-1,-1],[1,-2],[0,-2],[-1,-2],[1,-3],[-2,-1],[0,-3]],
  affinities: [
    [[-1,0],[-2,0],[-2,1],[-3,1],[-3,0],[-4,1],[-4,2],[-3,2]],
    [[1,0],[2,0],[2,-1],[3,-1],[3,0],[4,-1],[4,-2],[3,-2]],
    [[0,1],[1,1],[-1,2],[0,2],[1,2],[-1,3],[-2,3],[0,3]]
  ],
  hybrids: [[[1,-1],[2,-2],[2,-3]],[[-1,1],[-2,2],[-3,3]],[[2,1],[3,1],[2,2]]]
});

const ICONS = ["strike", "burst", "shield", "seal", "flame", "step", "bind", "crown"];
const PHYSICAL = [
  ["Disciplina del cuerpo", "health", 5, "Resistencia", "shield"],
  ["Puño de hierro", "strength", 1, "Ataque físico", "strike"],
  ["Paso fugaz", "speed", 1, "Movilidad", "step"],
  ["Guardia inquebrantable", "damageReduction", 1, "Defensa", "shield"],
  ["Pulso certero", "accuracy", 1, "Precisión", "target"],
  ["Instinto de combate", "evasion", 1, "Evasión", "eye"],
  ["Respiración profunda", "chakra", 5, "Recuperación", "seal"],
  ["Cuerpo trascendente", "strength", 2, "Maestría física", "crown"]
];
const STAT_LABELS = { health: "vida máxima", strength: "fuerza", speed: "velocidad", damageReduction: "reducción de daño", accuracy: "precisión", evasion: "evasión", chakra: "chakra máximo", costReduction: "reducción del coste de chakra" };
export const effectText = effect => `+${effect.amount} ${STAT_LABELS[effect.stat]} por nivel`;
const path = [[], [0], [0], [1], [1], [2], [3,4], [5,6]];

function passive(id, name, category, affinityIds, index, effect, prerequisites = []) {
  return { id, name, category, affinityIds, description: `Entrenamiento permanente. ${effectText(effect)}. Se aplica mientras sus afinidades estén equipadas.`, icon: ICONS[index % 8], type: "Pasiva", maxLevel: 3, cost: index >= 6 ? 2 : 1, prerequisites, effect };
}

function techniqueNode(jutsu, category, index) {
  return {
    id: jutsu.id, name: jutsu.name, category, affinityIds: basicRequirements(jutsu.element),
    description: jutsu.status ? `Inflige daño y aplica ${jutsu.status.label.toLowerCase()} durante ${jutsu.status.duration} turno(s).` : "Concentra la afinidad en un impacto elemental directo.",
    icon: ICONS[index % 8], type: jutsu.cinematic ? "Definitiva" : jutsu.status ? "Ataque · Estado" : jutsu.speedMod >= 4 ? "Ataque veloz" : "Ataque directo",
    maxLevel: 3, cost: jutsu.cinematic ? 2 : 1, prerequisites: [], jutsuId: jutsu.id, element: jutsu.element,
    unlockLevel: jutsu.unlockLevel, affinityXpRequired: jutsu.affinityXpRequired
  };
}

export const PHYSICAL_SKILLS = PHYSICAL.map(([name, stat, amount, type, icon], index) => ({
  ...passive(`physical_${index}`, name, "physical", [], index, { stat, amount }, (path[index] || [index-1]).map(i => `physical_${i}`)),
  type, icon, description: `Técnica física independiente. ${effectText({ stat, amount })}.`
}));

// Active moves share their physical node's unlock and retain its existing bonus.
export const TAIJUTSU_ACTIONS = [
  { id:"physical_1", name:"Puño de hierro", description:"Un impacto físico potente, sin sellos ni gasto de chakra.", damage:22, healthCost:8, speedMod:-1, accuracyMod:2, cooldown:1 },
  { id:"physical_2", name:"Paso fugaz", description:"Un golpe rápido que adelanta tu acción en la línea de combate.", damage:15, healthCost:5, speedMod:6, accuracyMod:5, cooldown:1 }
].map(action => ({ ...action, type:"taijutsu", cost:0, seals:[], color:0xbca0ff, iconTexture:null }));
export const TAIJUTSUS_BY_ID = new Map(TAIJUTSU_ACTIONS.map(action => [action.id,action]));

export function affinitySkills(elementId) {
  const techniques = JUTSU_LIBRARY.filter(j => j.element === elementId).sort((a,b) => a.affinityXpRequired - b.affinityXpRequired);
  const nodes = techniques.map((j, i) => techniqueNode(j, "affinity", i));
  const additions = [
    ["Sello protector", "damageReduction", 1], ["Flujo interior", "chakra", 5],
    ["Paso elemental", "speed", 1], ["Dominio", "costReduction", 1]
  ].slice(0, Math.max(0, 8 - nodes.length));
  additions.forEach(([name, stat, amount]) => {
    const index = nodes.length;
    nodes.push(passive(`${elementId}_resonance_${index}`, `${name} · ${ELEMENTS[elementId].name}`, "affinity", [elementId], index, { stat, amount }));
  });
  return nodes.map((node, i) => ({ ...node, prerequisites: (path[i] || [i-1]).map(parent => nodes[parent].id) }));
}

export function pairSkills(affinityIds) {
  const ids = [...affinityIds].sort();
  const key = ids.join("_");
  const techniques = JUTSU_LIBRARY.filter(j => {
    const requirements = basicRequirements(j.element).sort();
    return requirements.length === 2 && requirements.join("_") === key;
  }).sort((a,b) => a.affinityXpRequired - b.affinityXpRequired);
  const roots = ids.map(id => affinitySkills(id)[0].id);
  const nodes = techniques.map((j,i) => ({ ...techniqueNode(j, "hybrid", i), prerequisites: roots }));
  while (nodes.length < 3) {
    const index = nodes.length;
    const titles = ["Confluencia", "Sello dual", "Sincronía"];
    nodes.push(passive(`hybrid_${key}_${index}`, `${titles[index]} · ${ids.map(id => ELEMENTS[id].name).join(" + ")}`, "hybrid", ids, index,
      { stat: index === 1 ? "damageReduction" : "costReduction", amount: 1 }, [...roots, ...(index ? [nodes[index - 1].id] : [])]));
  }
  return nodes;
}

export const SKILL_CATALOG = [
  ...PHYSICAL_SKILLS,
  ...BASIC_ELEMENT_IDS.flatMap(affinitySkills),
  ...BASIC_ELEMENT_IDS.flatMap((id,i) => BASIC_ELEMENT_IDS.slice(i+1).flatMap(other => pairSkills([id,other]))),
  ...JUTSU_LIBRARY.filter(j => basicRequirements(j.element).length === 3).map((j,i) => ({
    ...techniqueNode(j,"hybrid",i), prerequisites: basicRequirements(j.element).map(id => affinitySkills(id)[0].id)
  }))
];
export const SKILLS_BY_ID = new Map(SKILL_CATALOG.map(node => [node.id, node]));

function place(nodes, cells) { return nodes.map((node,i) => ({ ...node, q: cells[i][0], r: cells[i][1] })); }

export function buildSkillTree(affinities = [], rank = 1) {
  const nodes = place(PHYSICAL_SKILLS.slice(0,SKILL_LAYOUT.physical.length), SKILL_LAYOUT.physical);
  const overflow = PHYSICAL_SKILLS.slice(SKILL_LAYOUT.physical.length);
  for (let slot = 0; slot < 3; slot++) {
    const elementId = affinities[slot];
    const branch = elementId ? affinitySkills(elementId) : Array.from({ length: 8 }, (_,i) => ({
      id: `empty_${slot}_${i}`, name: `Afinidad ${slot+1} por descubrir`, description: "Equipa una afinidad en esta ranura del Dojo para revelar sus habilidades.",
      category: "affinity", affinityIds: [], icon: "seal", type: "Sin afinidad", maxLevel: 3, cost: 1, prerequisites: [], placeholder: true
    }));
    nodes.push(...place(branch.slice(0,SKILL_LAYOUT.affinities[slot].length), SKILL_LAYOUT.affinities[slot]).map(node => ({ ...node, slot })));
    overflow.push(...branch.slice(SKILL_LAYOUT.affinities[slot].length).map(node => ({ ...node, slot })));
  }
  [[0,1],[0,2],[1,2]].forEach(([a,b], index) => {
    const ids = [affinities[a],affinities[b]];
    const branch = ids.every(Boolean) ? pairSkills(ids) : Array.from({ length: 3 }, (_,i) => ({
      id: `empty_hybrid_${index}_${i}`, name: `Puente de afinidades ${a+1} + ${b+1}`, category: "hybrid", affinityIds: ids.filter(Boolean),
      description: "Equipa ambas afinidades y desarrolla sus nodos de entrada para activar este puente.", icon: "bind", type: "Híbrida", maxLevel: 3, cost: 1, prerequisites: [], placeholder: true
    }));
    nodes.push(...place(branch.slice(0,3), SKILL_LAYOUT.hybrids[index]).map(node => ({ ...node, pair: [a,b] })));
    overflow.push(...branch.slice(3));
  });
  // Existing advanced techniques remain reachable. New seasons can add data
  // without changing the renderer: reserve the nearest unoccupied axial cells.
  overflow.push(...SKILL_CATALOG.filter(node => node.affinityIds.length === 3 && rank >= ELEMENTS[node.element].tier && node.affinityIds.every(id => affinities.includes(id))));
  const occupied = new Set(["0,0", ...nodes.map(n => `${n.q},${n.r}`)]);
  const candidates = [];
  const radius = Math.max(5,Math.ceil(Math.sqrt(nodes.length + overflow.length)));
  for (let q = -radius; q <= radius; q++) for (let r = -radius; r <= radius; r++) {
    if (!occupied.has(`${q},${r}`)) candidates.push({ q,r, distance: Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r)) });
  }
  const radiusSquared = cell => cell.q*cell.q + cell.q*cell.r + cell.r*cell.r;
  candidates.sort((a,b) => a.distance - b.distance || radiusSquared(a)-radiusSquared(b) || a.r-b.r || a.q-b.q);
  overflow.forEach((node,i) => nodes.push({ ...node, q: candidates[i].q, r: candidates[i].r, advanced: true }));
  return nodes;
}

export const axialToPixel = (q,r,size = 44) => ({ x: size * 1.5 * q, y: size * Math.sqrt(3) * (r + q/2) });
export const hexDistance = (a,b) => Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r));
