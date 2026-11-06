import { BASE_ACTIONS, JUTSU_LIBRARY } from "./data.js?v=1.5.0";
import { isTechniqueLearned } from "./save.js?v=0.140.0";
import { canAccessElement } from "./elements.js?v=0.20.0";
import { TAIJUTSU_ACTIONS } from "./skills/definitions.js?v=1.4.0";
import { taijutsuAction } from "./skills/taijutsu.js?v=1.0.0";
import { upgradedTechnique } from "./skills/progression.js?v=1.0.0";
import { physicalSkillActions } from "./battle/skill-tables.js?v=0.140.0";
import { NORMAL_AFFINITY_ID } from "./affinity-system.js?v=0.114.0";

export function trainingDummyProfile(profile = {}) {
  return { ...profile, name: "MARIONETA DE ENTRENAMIENTO", affinity: NORMAL_AFFINITY_ID,
    affinities: [NORMAL_AFFINITY_ID], completedAffinityTrials: [], level: 1, boss: false,
    stats: { health: 10000, chakra: 0, strength: 0, speed: 1, luck: 0 }, accuracy: 0, pattern: [], phase2Pattern: [] };
}

// Training includes learned moves independently of the equipped combat slots.
export function trainingActions(save) {
  const elemental = JUTSU_LIBRARY.filter(action => isTechniqueLearned(save, action)
    && canAccessElement(action.element, save.character.affinities, save.campaign.elementRank))
    .map(action => upgradedTechnique(save, action));
  const weapons = physicalSkillActions(save, [BASE_ACTIONS[0], null, null, null, null, BASE_ACTIONS[1]]).slice(1, 3).filter(Boolean);
  const physical = TAIJUTSU_ACTIONS.map(action => taijutsuAction(save, action.id)).filter(Boolean);
  return [BASE_ACTIONS[0], ...elemental, ...weapons, ...physical, BASE_ACTIONS[1]];
}

export function createTraining() {
  return { id: "free-training", type: "exhibition", category: "arena", exhibition: true, training: true,
    trainingOrigin: "dojo", title: "Entrenamiento libre", location: "Dojo de entrenamiento",
    number: 1, encounters: ["reed_bandit"], flow: [{ type: "combat" }] };
}
