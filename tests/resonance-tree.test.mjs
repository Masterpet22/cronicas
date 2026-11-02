import { BIRTH_MONTH_KANJI, characterResonanceSymbol } from "../src/skills/character-symbol.js";
import assert from "node:assert/strict";
import { BASIC_ELEMENT_IDS } from "../src/elements.js";
import { JUTSU_LIBRARY } from "../src/data.js";
import { buildSkillTree, hexDistance, SKILL_CATALOG, SKILLS_BY_ID } from "../src/skills/definitions.js";
import { investResonance, resonancePoints, skillLevel, skillState, upgradedTechnique } from "../src/skills/progression.js";
import { createCharacter, createDefaultSave, derivedStats, normalizeSave } from "../src/save.js";
import { hexBoundarySegments } from "../src/skills/hex-boundaries.js";
import { LOCKED_SKILL_COLOR, affinitySlotColor, characterCoreColors, mixSkillColors, skillRegionColor } from "../src/skills/colors.js";

assert.equal(mixSkillColors("#ff0000","#0000ff"),"#800080","Red and blue combine into purple");
assert.equal(mixSkillColors("#123456","#123456"),"#123456");
assert.equal(mixSkillColors("#55bfff","#ff783d"),mixSkillColors("#ff783d","#55bfff"));
assert.equal(mixSkillColors(null,"#0000ff"),LOCKED_SKILL_COLOR);
assert.deepEqual(characterCoreColors({ appearance:"#ABCDEF" }),{ fill:"#abcdef",ink:"#171b15" });
assert.equal(characterCoreColors({ appearance:"#000000" }).ink,"#f5f3eb");
assert.equal(characterCoreColors({ appearance:"invalid" }).fill,"#e8edf5");
const colorSave={ character:{ affinities:["fuego","agua","tierra"] },progression:{ level:1 },campaign:{ elementRank:1 },inventory:{} };
assert.equal(affinitySlotColor(colorSave,0),"#ff783d");
assert.equal(affinitySlotColor(colorSave,1),LOCKED_SKILL_COLOR,"Assigned but still locked slots are gray");
colorSave.progression.level=15; colorSave.campaign.elementRank=2;
assert.equal(affinitySlotColor(colorSave,1),"#55bfff");
assert.equal(affinitySlotColor(colorSave,2),LOCKED_SKILL_COLOR);
assert.equal(skillRegionColor(colorSave,{ category:"hybrid",pair:[0,2] }),LOCKED_SKILL_COLOR);
assert.equal(skillRegionColor(colorSave,{ category:"hybrid",pair:[0,1] }),"#aa9c9e");
colorSave.inventory.extraAffinityUnlocked=true;
assert.equal(affinitySlotColor(colorSave,2),"#b78a55");
assert.equal(affinitySlotColor({},0),LOCKED_SKILL_COLOR,"Unassigned slots have no elemental color");

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

const expectedGroups = {
  physical:["0,-1","-1,-1","1,-2","-1,-2","1,-3","0,-2"],
  a1:["-1,0","-2,1","-2,0","-3,1","-3,0","-4,1","-4,2","-3,2"],
  a2:["0,1","-1,2","1,1","0,2","-1,3","1,2","0,3"],
  a3:["1,-1","2,-1","2,-2","3,-2","3,-3","4,-3","4,-2","3,-1"],
  "affinity-1-2":["-1,1","-2,2","-2,3"],
  "affinity-2-3":["1,0","2,0","2,1"],
  "affinity-1-3":["0,-3","-2,-1","2,-3"]
};
assert.equal(new Set(SKILL_CATALOG.map(n => n.id)).size, SKILL_CATALOG.length);
assert.ok(JUTSU_LIBRARY.every(j => SKILLS_BY_ID.has(j.id)));
for (const first of BASIC_ELEMENT_IDS) for (const second of BASIC_ELEMENT_IDS.filter(id => id!==first)) for (const third of BASIC_ELEMENT_IDS.filter(id => ![first,second].includes(id))) {
  const nodes=buildSkillTree([first,second,third],3);
  assert.equal(nodes.length,38,"Exactly 38 skill cells + one character, at every affinity configuration");
  assert.equal(new Set(["0,0",...nodes.map(n => `${n.q},${n.r}`)]).size,39);
  for (const [group,positions] of Object.entries(expectedGroups)) {
    const branch=nodes.filter(n => group === "physical" ? n.category === "physical" : group.startsWith("a") && group.length===2 ? n.slot===Number(group[1])-1 : n.bridge===group);
    assert.deepEqual(branch.map(n => `${n.q},${n.r}`).sort(),[...positions].sort(),`Exact reference cells: ${group}`);
  }
  const all=nodes.flatMap(cell => [cell,...cell.linkedSkills]);
  assert.equal(new Set(all.map(n => n.id)).size,all.length);
  for (const node of all) assert.ok(node.prerequisites.every(id => all.some(n => n.id===id)),"All existing requirements remain inspectable without extra cells");
  const reached=new Set(["core"]),graph=[{ id:"core",q:0,r:0 },...nodes];
  for (let pass=0;pass<graph.length;pass++) for (const n of graph) if (graph.some(p => reached.has(p.id) && hexDistance(n,p)===1)) reached.add(n.id);
  assert.equal(reached.size,39);
}
let physicalHybridSave = createCharacter(createDefaultSave(),{ affinity:"fuego" });
const physicalHybrid = SKILLS_BY_ID.get("hybrid_physical_fuego_0");
assert.equal(investResonance(physicalHybridSave,physicalHybrid.id),physicalHybridSave);
physicalHybridSave=investResonance(physicalHybridSave,"physical_0");
physicalHybridSave=investResonance(physicalHybridSave,physicalHybrid.id);
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
assert.equal(investResonance(save,jutsu.id),save,"No overspending before the new maximum");
assert.equal(investResonance(save,"physical_1"),save,"No overspending");
assert.deepEqual(normalizeSave(JSON.parse(JSON.stringify(save))).progression.resonance,save.progression.resonance);
assert.deepEqual(derivedStats(normalizeSave(save)),derivedStats(save),"Saving does not change bonuses");
save.progression.level++;
assert.equal(resonancePoints(save),2,"Leveling grants the configured points without duplicate rewards");
const forged = normalizeSave({ ...save,progression:{ ...save.progression,resonance:{ investments:{ physical_0:Infinity,unknown:99,physical_1:-10,fire_embers:200,physical_2:200 } } } });
assert.ok(resonancePoints(forged)>=0);
assert.equal(forged.progression.resonance.investments.unknown,undefined);
assert.ok((forged.progression.resonance.investments.fire_embers || 0)<=4);

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

assert.deepEqual(BIRTH_MONTH_KANJI,["一","二","三","四","五","六","七","八","九","十","十一","十二"]);
for (let month=1;month<=12;month++) assert.equal(characterResonanceSymbol({ birthday:{ day:1,month } }).symbol,BIRTH_MONTH_KANJI[month-1]);
for (const birthday of [null,undefined,{ month:0,day:1 },{ month:2,day:31 }]) assert.equal(characterResonanceSymbol({ birthday }).symbol,"☯");
