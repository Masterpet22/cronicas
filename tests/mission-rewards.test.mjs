import assert from "node:assert/strict";
import { missionXpPlan, withMissionRewards } from "../src/mission-rewards.js";
import { experienceForNextLevel } from "../src/progression-balance.js";
import { MISSIONS, ALL_MISSIONS } from "../src/content/index.js";
import { createCharacter, createDefaultSave, awardEncounter, completeMission, completeSecondaryMission } from "../src/save.js";

const encounterIds=["tutorial_bandit","tutorial_bandit_second","boss_varek"];
for (let level=1;level<=60;level++) for (const [profile,rate] of Object.entries({ short:.25,normal:.5,hard:.75,boss:1 })) {
  const mission={ recommendedLevel:level,rewardProfile:profile,category:"secondary",encounters:encounterIds,reward:{coins:0} };
  for (const xpBonus of [0,.15]) {
    const plan=missionXpPlan(mission,{xpBonus});
    assert.equal(plan.totalXp,Math.round(Math.round(experienceForNextLevel(level)*rate)*(1+xpBonus)));
    assert.equal(plan.encounterXp.reduce((a,b)=>a+b,0)+plan.completionXp,plan.totalXp,"El reparto y el bono no duplican ni pierden PX");
    assert.equal(plan.completionXp,plan.totalXp-Math.round(plan.totalXp*.6));
    assert.ok(plan.encounterXp.every(Number.isInteger));
  }
}
const normal={recommendedLevel:30,rewardProfile:"normal",category:"secondary",encounters:encounterIds,reward:{coins:10}};
assert.equal(missionXpPlan(normal).totalXp,640);
assert.equal(missionXpPlan({...normal,recommendedLevel:59}).totalXp,1220);
assert.equal(missionXpPlan({...normal,encounters:[]}).completionXp,640,"Las misiones sin combate pagan su presupuesto al completarse");
assert.equal(missionXpPlan({...normal,encounters:["tutorial_bandit"]}).totalXp,640,"Una ruta con menos duelos conserva el total");
assert.equal(missionXpPlan({...normal,rewardProfile:"affinity"}).totalXp,0);
assert.equal(missionXpPlan({...normal,rewardProfile:"normal",category:"main",recommendedLevel:5,introductory:true}).totalXp,280);
assert.throws(()=>missionXpPlan({...normal,recommendedLevel:10,introductory:true}));
assert.throws(()=>missionXpPlan({...normal,rewardProfile:"unknown"}));
assert.throws(()=>missionXpPlan({...normal,rewardProfile:"toString"}));
assert.throws(()=>missionXpPlan(normal,{xpBonus:Infinity}));
assert.throws(()=>missionXpPlan({...normal,recommendedLevel:0}));
assert.equal(withMissionRewards(normal).reward.totalXp,640);
for (const mission of ALL_MISSIONS) assert.equal(mission.reward.totalXp,missionXpPlan(mission).totalXp);
let save=createCharacter(createDefaultSave(),{affinity:"fuego"});
const mission=MISSIONS[0];
let paid=0;
for (const [encounterIndex,id] of mission.encounters.entries()) {
  const reward=awardEncounter(save,id,{mission,encounterIndex});paid+=reward.xp;save=reward.save;
}
const completion=completeMission(save,mission.id);paid+=completion.xp;save=completion.save;
assert.equal(paid,120);
assert.equal(save.progression.level,2);assert.equal(save.progression.xp,0);
assert.equal(completeMission(save,mission.id).xp,0);
assert.equal(awardEncounter(save,mission.encounters[0],{firstClear:false}).xp,0);
const investigation=completeSecondaryMission(save,MISSIONS[1]);
assert.equal(investigation.xp,40);assert.equal(investigation.save.progression.xp,40);
assert.equal(completeSecondaryMission(investigation.save,MISSIONS[1]).xp,0);
console.log("Recompensas: tipos, niveles 1–60, reparto 60/40, bonos, rutas, investigación y cobro único verificados.");
