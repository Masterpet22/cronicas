import { AFFINITY_TRIALS } from "./affinity-progression.js?v=1.0.0";
import { PLAYER_RANK_LABELS } from "../player-rank.js";

export const AFFINITY_TRIAL_MISSIONS = Object.freeze(AFFINITY_TRIALS.map(({ slot, level, id, title }) => ({
  id, number: slot + 1, category: "secondary", board: "missions", arenaNumber: 2,
  title, affinitySlot: slot, location: "Santuario de la Confluencia", duration: "5–8 min", rank: "Especial",
  recommendedLevel: level, encounters: slot === 2 ? ["stone_hunter"] : ["venom_medic", "ash_adept"],
  rewardProfile: "affinity", reward: { coins: 0 }, rewardLabel: `Ascenso a ${PLAYER_RANK_LABELS[slot]} · ${slot} afinidades disponibles y primera técnica gratuita`,
  dialogueId: `mission.${id}.briefing`,
  requirements: [{ type: "level", minimum: level },
    ...(slot === 3 ? [{ type: "secondary-completed", id: "affinity_trial_2" }, { type: "flag", id: "secondAffinityChosen", equals: true }] : [])],
  flow: [{ type: "dialogue" }, { type: "combat", id: `trial-${slot}` }],
  completionEffects: [{ type: "set-flag", id: "elementRank", value: slot }]
})));

export const AFFINITY_TRIAL_DIALOGUES = Object.fromEntries(AFFINITY_TRIALS.map(trial => [
  `mission.${trial.id}.briefing`, [{ speaker: "master", text: trial.slot === 2
    ? `Dominar otro elemento exige disciplina. Supera al custodio del santuario para ascender de ${PLAYER_RANK_LABELS[1]} a ${PLAYER_RANK_LABELS[2]}, rango 2. Tendrás dos afinidades disponibles y acceso a la Torre de Desafíos. Después elige tu segunda afinidad en el Dojo; su primera técnica será gratuita.`
    : `Tres afinidades deben convivir en equilibrio. Supera los dos duelos del santuario para ascender a ${PLAYER_RANK_LABELS[3]}, rango 3, y disponer de tres afinidades. Al regresar, elige el nuevo elemento en el Dojo.` }]
]));
