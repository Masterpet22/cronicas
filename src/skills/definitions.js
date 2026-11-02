import { JUTSU_LIBRARY } from "../data.js?v=0.114.0";
import { TECHNIQUE_MASTERY } from "./technique-mastery.js?v=1.0.0";
import { ELEMENTS, BASIC_ELEMENT_IDS, basicRequirements } from "../elements.js?v=0.20.0";
// Physical skills keep their own color; affinity and mixed colors are derived.
export const PHYSICAL_COLOR = "#657fff";

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
 * @property {string[]} prerequisites All listed nodes are required.
 * @property {Object<string,number>} prerequisiteLevels Required rank of each preceding skill.
 * @property {number[]} rankLevels Minimum character level for ranks 1, 2 and 3.
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
  ["Instinto de combate", "evasion", 1, "Evasión", "eye"]
];
const STAT_LABELS = { health: "vida máxima", strength: "fuerza", speed: "velocidad", damageReduction: "reducción de daño", accuracy: "precisión", evasion: "evasión", chakra: "chakra máximo", costReduction: "reducción del coste de chakra" };
export const effectText = effect => `+${effect.amount} ${STAT_LABELS[effect.stat]} por nivel`;
function passive(id, name, category, affinityIds, index, effect) {
  return { id, name, category, affinityIds, description: `Entrenamiento permanente. ${effectText(effect)}. Se aplica mientras sus afinidades estén equipadas.`, icon: ICONS[index % 8], type: "Pasiva", maxLevel: TECHNIQUE_MASTERY.maxLevel, cost: 1, prerequisites: [], effect };
}

function techniqueNode(jutsu, category, index) {
  return {
    id: jutsu.id, name: jutsu.name, category, affinityIds: basicRequirements(jutsu.element),
    description: jutsu.status ? `Inflige daño y aplica ${jutsu.status.label.toLowerCase()} durante ${jutsu.status.duration} turno(s).` : "Concentra la afinidad en un impacto elemental directo.",
    icon: ICONS[index % 8], type: jutsu.cinematic || jutsu.finisher ? "Definitiva" : jutsu.status ? "Ataque · Estado" : jutsu.seals.length <= 2 ? "Ataque veloz" : "Ataque directo",
    maxLevel: TECHNIQUE_MASTERY.maxLevel, cost: 1, prerequisites: [], jutsuId: jutsu.id, element: jutsu.element,
    unlockLevel: jutsu.unlockLevel, affinityXpRequired: jutsu.affinityXpRequired
  };
}

function route(node, unlockLevel, requirements = []) {
  return { ...node, unlockLevel, rankLevels: [unlockLevel, Math.max(3, unlockLevel + 2), Math.max(8, unlockLevel + 5)],
    prerequisites: requirements.map(([id]) => id), prerequisiteLevels: Object.fromEntries(requirements) };
}

export const PHYSICAL_SKILLS = PHYSICAL.map(([name, stat, amount, type, icon], index) => ({
  ...passive(`physical_${index}`, name, "physical", [], index, { stat, amount }),
  type, icon, description: `Técnica física independiente. ${effectText({ stat, amount })}.`
})).map((node,index,nodes) => {
  const levels = [1,2,3,8,12,20];
  const parents = [[],[[0,2]],[[0,2]],[[1,2]],[[1,2],[2,1]],[[2,2],[4,2]]];
  const result = route(node, levels[index], parents[index].map(([i,rank]) => [nodes[i].id,rank]));
  return index === 0 ? { ...result, rankLevels: [1,2,6] } : result;
});

// Active moves share their physical node's unlock and retain its existing bonus.
export const TAIJUTSU_ACTIONS = [
  { id:"physical_1", name:"Puño de hierro", description:"Un impacto físico potente. Iniciativa -1: recuperas el ritmo más despacio para la próxima acción.", damage:22, healthCost:8, initiative:-1, speedMod:-1, accuracyMod:2, cooldown:1 },
  { id:"physical_2", name:"Paso fugaz", description:"Un golpe rápido. Iniciativa +1: la barra de tu próxima acción avanza más rápido.", damage:15, healthCost:5, initiative:1, speedMod:6, accuracyMod:5, cooldown:1 }
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
  const sixTechniques = techniques.length === 6;
  const levels = sixTechniques ? [1,1,6,12,24,40,16,32] : [1,1,6,40,12,20,32,48];
  const parents = sixTechniques
    ? [[],[[0,2]],[[0,2]],[[1,2]],[[2,2],[3,2]],[[4,3]],[[1,2],[2,2]],[[3,2],[4,2]]]
    : [[],[[0,2]],[[0,2]],[[2,3],[6,2]],[[1,2]],[[2,2]],[[2,2],[5,2]],[[3,3],[6,2]]];
  return nodes.map((node,i) => route({ ...node,affinityIndex:i }, levels[i], parents[i].map(([parent,rank]) => [nodes[parent].id,rank])));
}

export function pairSkills(affinityIds) {
  const ids = [...affinityIds].sort();
  const key = ids.join("_");
  const techniques = JUTSU_LIBRARY.filter(j => {
    const requirements = basicRequirements(j.element).sort();
    return requirements.length === 2 && requirements.join("_") === key;
  }).sort((a,b) => a.affinityXpRequired - b.affinityXpRequired);
  // Tres celdas por combinación. Rayo conserva entrada, intermedia y definitiva.
  const selectedTechniques = techniques.length > 3 ? [techniques[0], ...techniques.slice(-2)] : techniques;
  const nodes = selectedTechniques.map((j,i) => techniqueNode(j, "hybrid", i));
  while (nodes.length < 3) {
    const index = nodes.length;
    const titles = ["Confluencia", "Sello dual", "Sincronía"];
    nodes.push(passive(`hybrid_${key}_${index}`, `${titles[index]} · ${ids.map(id => ELEMENTS[id].name).join(" + ")}`, "hybrid", ids, index,
      { stat: index === 1 ? "damageReduction" : "costReduction", amount: 1 }));
  }
  const branchRoots = ids.map(id => affinitySkills(id)[2].id);
  return nodes.map((node,i) => route(node, [20,32,48][i], [
    ...branchRoots.map(id => [id,2]), ...(i ? [[nodes[i-1].id,i === 2 ? 3 : 2]] : [])
  ]));
}

export const SKILL_CATALOG = [
  ...PHYSICAL_SKILLS,
  ...BASIC_ELEMENT_IDS.flatMap(affinitySkills),
  ...BASIC_ELEMENT_IDS.flatMap((id,i) => BASIC_ELEMENT_IDS.slice(i+1).flatMap(other => pairSkills([id,other])))
];
export const SKILLS_BY_ID = new Map(SKILL_CATALOG.map(node => [node.id, node]));

// Una habilidad solo pertenece al árbol si dispone de su propia celda.
export function skillHasCell(affinities = [], id) {
  const node = SKILLS_BY_ID.get(id);
  if (!node || !node.affinityIds.every(affinity => affinities.includes(affinity))) return false;
  if (node.category !== "affinity") return true;
  const slot = affinities.indexOf(node.affinityIds[0]);
  return node.affinityIndex < (SKILL_LAYOUT.affinities[slot]?.length || 0);
}

function place(nodes,cells,metadata = {}) {
  return cells.map(([q,r],i) => ({ ...nodes[i],...metadata,q,r }));
}

export function buildSkillTree(affinities = [],rank = 1) {
  const nodes = place(PHYSICAL_SKILLS,SKILL_LAYOUT.physical);
  for (let slot=0;slot<3;slot++) {
    const id = affinities[slot];
    const branch = id ? affinitySkills(id) : Array.from({ length:8 },(_,i) => ({
      id:`empty_${slot}_${i}`,name:`Afinidad ${slot+1} por descubrir`,description:"Equipa una afinidad en esta ranura del Dojo para revelar sus habilidades.",
      category:"affinity",affinityIds:[],icon:"seal",type:"Sin afinidad",maxLevel:TECHNIQUE_MASTERY.maxLevel,cost:1,prerequisites:[],placeholder:true
    }));
    nodes.push(...place(branch,SKILL_LAYOUT.affinities[slot],{ slot }));
  }
  for (const { slots:[a,b],cells } of SKILL_LAYOUT.affinityBridges) {
    const ids = [affinities[a],affinities[b]];
    const branch = ids.every(Boolean) ? pairSkills(ids) : cells.map((_,i) => ({
      id:`empty_hybrid_${a}_${b}_${i}`,name:`Afinidad ${a+1} + Afinidad ${b+1}`,category:"hybrid",affinityIds:ids.filter(Boolean),
      description:"Equipa ambas afinidades y desarrolla sus habilidades de entrada.",icon:"bind",type:"Confluencia",maxLevel:TECHNIQUE_MASTERY.maxLevel,cost:1,prerequisites:[],placeholder:true
    }));
    nodes.push(...place(branch,cells,{ bridge:`affinity-${a+1}-${b+1}`,pair:[a,b] }));
  }
  return nodes;
}

export const axialToPixel = (q,r,size = HEX_GRID_SIZE) => ({ x: size * 1.5 * q, y: size * Math.sqrt(3) * (r + q/2) });
export const hexDistance = (a,b) => Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r));
