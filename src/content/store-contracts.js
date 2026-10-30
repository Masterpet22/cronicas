export const CONTRACT_MISSIONS = Object.freeze([
  { id: "contract_relic", number: 1, category: "secondary", board: "missions", arenaNumber: 2,
    title: "El sello extraviado", location: "Paso del Crepúsculo", duration: "3–5 min", rank: "D",
    contractItem: "contract_relic", contractPrice: 80, recommendedLevel: 3,
    encounters: ["bandit_pathfinder", "gate_guard"], reward: { xp: 45, coins: 25, items: { seal_guardian: 1 } },
    rewardLabel: "Sello del guardián (+18 PV, +2 precisión)", dialogueId: "mission.contract_relic.briefing",
    requirements: [{ type: "item-owned", id: "contract_relic" }], flow: [{ type: "dialogue" }, { type: "combat", id: "recover-seal" }], completionEffects: [] },
  { id: "contract_hound", number: 2, category: "secondary", board: "missions", arenaNumber: 1,
    title: "El pacto del sabueso", location: "Bosque del Este", duration: "4–6 min", rank: "D",
    contractItem: "contract_hound", contractPrice: 150, recommendedLevel: 8,
    encounters: ["reed_bandit", "bandit_lieutenant"], reward: { xp: 60, coins: 35, items: { companion_hound: 1 } },
    rewardLabel: "Invocación: Sabueso del horizonte (+3 precisión, +2 suerte)", dialogueId: "mission.contract_hound.briefing",
    requirements: [{ type: "item-owned", id: "contract_hound" }], flow: [{ type: "dialogue" }, { type: "combat", id: "hound-pact" }], completionEffects: [] }
]);
export const CONTRACT_DIALOGUES = {
  "mission.contract_relic.briefing": [{ speaker: "sayo", text: "Unos saqueadores se llevaron un sello protector. Recupera la reliquia en el paso y podrás conservarla como recompensa." }],
  "mission.contract_hound.briefing": [{ speaker: "sayo", text: "Un sabueso del horizonte protege un pergamino de invocación. Ahuyenta a los saqueadores del bosque y se unirá a ti. Después podrás equiparlo como compañero en el Dojo." }]
};
