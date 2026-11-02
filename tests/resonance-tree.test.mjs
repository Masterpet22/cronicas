import assert from "node:assert/strict";
import { BASIC_ELEMENT_IDS } from "../src/elements.js";
import { JUTSU_LIBRARY } from "../src/data.js";
import { buildSkillTree, hexDistance, SKILL_CATALOG, SKILLS_BY_ID } from "../src/skills/definitions.js";
import { investResonance, resonancePoints, skillLevel, skillState, upgradedTechnique } from "../src/skills/progression.js";
import { createCharacter, createDefaultSave, derivedStats, normalizeSave } from "../src/save.js";
import { hexBoundarySegments } from "../src/skills/hex-boundaries.js";

assert.equal(hexBoundarySegments([{ q:0,r:0 }]).length,6);
assert.equal(hexBoundarySegments([{ q:0,r:0 },{ q:1,r:0 }]).length,10,"Shared interior edge is removed from the outline");
for (const category of ["physical",0,1,2]) {
  const region = buildSkillTree(["agua","fuego","viento"],3).filter(node => category === "physical" ? node.category === category : node.category === "affinity" && node.slot === category);
  const degrees = new Map();
  for (const edge of hexBoundarySegments(region)) for (const [x,y] of [[edge.x1,edge.y1],[edge.x2,edge.y2]]) {
    const key = `${Math.round(x*1e6)},${Math.round(y*1e6)}`;
    degrees.set(key,(degrees.get(key)||0)+1);
  }
  assert.ok([...degrees.values()].every(degree => degree===2),"Each branch contour closes exactly, without gaps or interior lines");
}

assert.equal(new Set(SKILL_CATALOG.map(n => n.id)).size, SKILL_CATALOG.length);
assert.ok(JUTSU_LIBRARY.every(j => SKILLS_BY_ID.has(j.id)), "Every existing technique remains in the catalog");
for (const element of BASIC_ELEMENT_IDS) {
  const other = BASIC_ELEMENT_IDS.filter(id => id !== element);
  for (const affinities of [[element], [element,...other.slice(0,2)]]) {
    const nodes = buildSkillTree(affinities,3);
    assert.equal(new Set(nodes.map(n => `${n.q},${n.r}`)).size,nodes.length,"Cells never overlap");
    assert.ok(nodes.every(n => Number.isInteger(n.q) && Number.isInteger(n.r)));
    for (let slot=0; slot<3; slot++) assert.equal(nodes.filter(n => n.category === "affinity" && n.slot === slot).length,8);
    const physical = nodes.filter(n => n.category === "physical");
    assert.equal(physical.length,8);
    assert.ok(physical.filter(n => !n.advanced).every(n => n.r+n.q/2<0));
    assert.ok(nodes.filter(n => n.slot === 0 && !n.advanced).every(n => n.q<0));
    assert.ok(nodes.filter(n => n.slot === 1 && !n.advanced).every(n => n.q>0));
    assert.ok(nodes.filter(n => n.slot === 2 && !n.advanced).every(n => n.r+n.q/2>0));
    const reached = new Set(["core"]), graph = [{ id:"core",q:0,r:0 },...nodes];
    for (let pass=0; pass<graph.length; pass++) for (const n of graph) if (graph.some(p => reached.has(p.id) && hexDistance(n,p)===1)) reached.add(n.id);
    assert.equal(reached.size,graph.length,"Every cell belongs to the connected honeycomb");
    for (const n of nodes) assert.ok(n.prerequisites.every(id => nodes.some(p => p.id===id)),"Visible requirements are reachable");
  }
}
// The illustrated silhouette is a geometry contract, independent of guide counts.
const silhouette = buildSkillTree(["fuego","agua","tierra"],3).filter(node => !node.advanced);
assert.equal(silhouette.length,30);
assert.equal(silhouette.filter(node => node.category === "physical").length,6);
assert.deepEqual([-3,-2,-1,0,1,2,3].map(q => silhouette.filter(node => node.q === q).length + (q === 0 ? 1 : 0)),[3,4,6,5,6,4,3]);
const mainCells = new Set(silhouette.map(node => `${node.q},${node.r}`));
assert.ok(!mainCells.has("0,-1"),"Keep the recess directly above Resonance, as in the reference");
for (const node of silhouette) assert.ok(mainCells.has(`${-node.q},${node.r+node.q}`),"The main honeycomb mirrors exactly across the vertical core axis");
for (const bridge of ["physical-affinity-1","physical-affinity-2","affinity-1-3","affinity-2-3"]) assert.equal(silhouette.filter(node => node.bridge === bridge).length,2);
let physicalHybridSave = createCharacter(createDefaultSave(),{ affinity:"fuego" });
const physicalHybrid = SKILLS_BY_ID.get("hybrid_physical_fuego_0");
assert.equal(investResonance(physicalHybridSave,physicalHybrid.id),physicalHybridSave);
physicalHybridSave = investResonance(physicalHybridSave,"physical_0");
physicalHybridSave = investResonance(physicalHybridSave,physicalHybrid.id);
assert.equal(derivedStats(physicalHybridSave).baseStrength,derivedStats({ ...physicalHybridSave,progression:{ ...physicalHybridSave.progression,resonance:{ investments:{ physical_0:1 } } } }).baseStrength+1);

const visit = (node,path=[]) => {
  assert.ok(!path.includes(node.id),`Prerequisite cycle: ${node.id}`);
  node.prerequisites.forEach(id => { assert.ok(SKILLS_BY_ID.has(id)); visit(SKILLS_BY_ID.get(id),[...path,node.id]); });
};
SKILL_CATALOG.forEach(node => visit(node));

let save = createCharacter(createDefaultSave(),{ name:"Resonance",affinity:"fuego" });
assert.equal(resonancePoints(save),3);
const before = derivedStats(save);
assert.equal(investResonance(save,"physical_1"),save,"Prerequisites cannot be bypassed");
assert.equal(investResonance(save,"unknown"),save);
save = investResonance(save,"physical_0");
assert.equal(skillLevel(save,SKILLS_BY_ID.get("physical_0")),1);
assert.equal(derivedStats(save).maxHp,before.maxHp+5,"Physical investment affects the combat stats");
assert.equal(resonancePoints(save),2);
const jutsu = JUTSU_LIBRARY.find(j => j.id === "fire_embers");
save = investResonance(save,jutsu.id);
assert.equal(upgradedTechnique(save,jutsu).damage,jutsu.damage+2,"Technique investment affects the battle action");
assert.equal(jutsu.damage,14,"Catalog remains immutable");
save = investResonance(save,jutsu.id);
assert.equal(resonancePoints(save),0);
assert.equal(skillLevel(save,SKILLS_BY_ID.get(jutsu.id)),3);
assert.equal(investResonance(save,jutsu.id),save,"Maximum rank cannot be exceeded");
assert.equal(investResonance(save,"physical_1"),save,"No overspending");
assert.deepEqual(normalizeSave(JSON.parse(JSON.stringify(save))).progression.resonance,save.progression.resonance);
assert.deepEqual(derivedStats(normalizeSave(save)),derivedStats(save),"Saving does not change bonuses");
save.progression.level++;
assert.equal(resonancePoints(save),2,"Leveling grants the configured points without duplicate rewards");
const forged = normalizeSave({ ...save,progression:{ ...save.progression,resonance:{ investments:{ physical_0:Infinity,unknown:99,physical_1:-10,fire_embers:200,physical_2:200 } } } });
assert.ok(resonancePoints(forged)>=0);
assert.equal(forged.progression.resonance.investments.unknown,undefined);
assert.ok((forged.progression.resonance.investments.fire_embers || 0)<=2);

let dual = normalizeSave({ ...save, progression:{ ...save.progression,level:15 },campaign:{ ...save.campaign,elementRank:2 },character:{ ...save.character,affinities:["agua","tierra"],affinityXp:{ agua:0,tierra:0 } } });
const hybrid = buildSkillTree(dual.character.affinities,2).find(n => n.id === "hybrid_agua_tierra_1");
assert.ok(hybrid);
assert.equal(investResonance(dual,hybrid.id),dual,"Hybrid requires progression in both branches and the preceding hybrid technique");
dual.character.affinityXp.agua=200;
dual.character.affinityXp.tierra=200;
assert.equal(skillState(dual,hybrid),"available");
dual = investResonance(dual,hybrid.id);
const active = derivedStats(dual).damageReduction;
const switched = normalizeSave({ ...dual,character:{ ...dual.character,affinities:["agua","fuego"] } });
assert.equal(derivedStats(switched).damageReduction,active-1,"Unequipped hybrid has no combat effect");
assert.equal(switched.progression.resonance.investments[hybrid.id],1,"Changing affinities preserves investment");
const reordered = buildSkillTree(["tierra","agua"],2).find(n => n.id===hybrid.id);
assert.equal(skillLevel(dual,reordered),1,"Identity is independent of slot order");
const old = { ...save,progression:{ ...save.progression } }; delete old.progression.resonance;
assert.deepEqual(normalizeSave(old).loadout,save.loadout,"Legacy saves preserve their combat loadout");
console.log("Resonance: connected axial layout, affinity permutations, requirements, spending, saves and combat effects verified.");
