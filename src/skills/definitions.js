import { JUTSU_LIBRARY } from "../data.js?v=0.114.0";
import { ELEMENTS, BASIC_ELEMENT_IDS, basicRequirements } from "../elements.js?v=0.20.0";
// Diagram colors identify progression categories; equipped elements supply skills/icons.
export const PHYSICAL_COLOR = "#657fff";
export const SKILL_REGION_COLORS = Object.freeze({
  physical:PHYSICAL_COLOR, affinities:["#ff4b55","#ba701c","#2f9b68"],
  bridges:{ "affinity-1-2":"#19c3ed", "affinity-2-3":"#e1df27", "affinity-1-3":"#a33df1" }
});

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

// Exact 39-cell blueprint from the user's diagram, including the character at 0,0.
// The three 1+3 cells are deliberately scattered; never infer their placement.
export const HEX_GRID_SIZE = 47;
export const SKILL_LAYOUT = Object.freeze({
  physical:[[0,-1],[-1,-1],[1,-2],[-1,-2],[1,-3],[0,-2]],
  affinities:[
    [[-1,0],[-2,1],[-2,0],[-3,1],[-3,0],[-4,1],[-4,2],[-3,2]],
    [[0,1],[-1,2],[1,1],[0,2],[-1,3],[1,2],[0,3]],
    [[1,-1],[2,-1],[2,-2],[3,-2],[3,-3],[4,-3],[4,-2],[3,-1]]
  ],
  affinityBridges:[
    { slots:[0,1],cells:[[-1,1],[-2,2],[-2,3]] },
    { slots:[1,2],cells:[[1,0],[2,0],[2,1]] },
    { slots:[0,2],cells:[[0,-3],[-2,-1],[2,-3]] }
  ]
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
].map(action => ({ ...action, type:"taijutsu", cost:0, seals:[], color:0x657fff, iconTexture:null }));
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

export function physicalAffinitySkills(elementId) {
  const key = `physical_${elementId}`;
  const root = affinitySkills(elementId)[0].id;
  return [
    passive(`hybrid_${key}_0`, `Impacto resonante · ${ELEMENTS[elementId].name}`, "hybrid", [elementId], 0,
      { stat:"strength",amount:1 }, ["physical_0",root]),
    passive(`hybrid_${key}_1`, `Cuerpo resonante · ${ELEMENTS[elementId].name}`, "hybrid", [elementId], 2,
      { stat:"damageReduction",amount:1 }, [`hybrid_${key}_0`,"physical_0",root])
  ].map(node => ({ ...node,physicalHybrid:true,description:`Combina el entrenamiento físico con ${ELEMENTS[elementId].name}. ${effectText(node.effect)}.` }));
}

export const SKILL_CATALOG = [
  ...PHYSICAL_SKILLS,
  ...BASIC_ELEMENT_IDS.flatMap(affinitySkills),
  ...BASIC_ELEMENT_IDS.flatMap(physicalAffinitySkills),
  ...BASIC_ELEMENT_IDS.flatMap((id,i) => BASIC_ELEMENT_IDS.slice(i+1).flatMap(other => pairSkills([id,other]))),
  ...JUTSU_LIBRARY.filter(j => basicRequirements(j.element).length === 3).map((j,i) => ({
    ...techniqueNode(j,"hybrid",i), prerequisites: basicRequirements(j.element).map(id => affinitySkills(id)[0].id)
  }))
];
export const SKILLS_BY_ID = new Map(SKILL_CATALOG.map(node => [node.id, node]));

function place(nodes,cells,metadata = {}) {
  return nodes.slice(0,cells.length).map((node,i) => ({ ...node,...metadata,q:cells[i][0],r:cells[i][1],linkedSkills:[] }));
}

export function buildSkillTree(affinities = [],rank = 1) {
  const physical = place(PHYSICAL_SKILLS,SKILL_LAYOUT.physical);
  physical.at(-1).linkedSkills.push(...PHYSICAL_SKILLS.slice(SKILL_LAYOUT.physical.length));
  const nodes = [...physical];
  for (let slot=0;slot<3;slot++) {
    const id = affinities[slot];
    const branch = id ? affinitySkills(id) : Array.from({ length:8 },(_,i) => ({
      id:`empty_${slot}_${i}`,name:`Afinidad ${slot+1} por descubrir`,description:"Equipa una afinidad en esta ranura del Dojo para revelar sus habilidades.",
      category:"affinity",affinityIds:[],icon:"seal",type:"Sin afinidad",maxLevel:3,cost:1,prerequisites:[],placeholder:true
    }));
    const cells = place(branch,SKILL_LAYOUT.affinities[slot],{ slot });
    cells.at(-1).linkedSkills.push(...branch.slice(cells.length));
    // Keep existing physical/elemental mastery reachable without adding any cells.
    if (id) cells.at(-1).linkedSkills.push(...physicalAffinitySkills(id));
    nodes.push(...cells);
  }
  for (const { slots:[a,b],cells } of SKILL_LAYOUT.affinityBridges) {
    const ids = [affinities[a],affinities[b]];
    const branch = ids.every(Boolean) ? pairSkills(ids) : cells.map((_,i) => ({
      id:`empty_hybrid_${a}_${b}_${i}`,name:`Afinidad ${a+1} + Afinidad ${b+1}`,category:"hybrid",affinityIds:ids.filter(Boolean),
      description:"Equipa ambas afinidades y desarrolla sus habilidades de entrada.",icon:"bind",type:"Confluencia",maxLevel:3,cost:1,prerequisites:[],placeholder:true
    }));
    const bridge = place(branch,cells,{ bridge:`affinity-${a+1}-${b+1}`,pair:[a,b] });
    bridge.at(-1).linkedSkills.push(...branch.slice(cells.length));
    if (a===0 && b===2) bridge.at(-1).linkedSkills.push(...SKILL_CATALOG.filter(node =>
      node.affinityIds.length===3 && rank >= ELEMENTS[node.element].tier && node.affinityIds.every(id => affinities.includes(id))));
    nodes.push(...bridge);
  }
  return nodes;
}

export const axialToPixel = (q,r,size = HEX_GRID_SIZE) => ({ x: size * 1.5 * q, y: size * Math.sqrt(3) * (r + q/2) });
export const hexDistance = (a,b) => Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r));
