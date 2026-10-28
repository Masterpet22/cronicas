export const M04 = {
    id: "m04", number: 6, category: "main", arenaNumber: 4, board: "headquarters", title: "El corazón de la guarida", location: "Galerías interiores", duration: "12–15 min", rank: "D",
    encounters: ["bandit_pathfinder", "venom_medic", "ash_adept"], reward: { xp: 125, coins: 105 },
    requirements: [{ type: "main-completed", id: "m03" }],
    dialogueId: "mission.m04.briefing", tacticalBriefing: true,
    flow: [
      { type: "dialogue" },
      {
        type: "resource", id: "hideout-supplies", afterEncounter: "each",
        modifiers: [{ type: "field-supplies", sourceFlag: "hideoutSupplies", minimum: 1 }]
      },
      { type: "combat", id: "inner-galleries" },
      { type: "choice", id: "hideout-discovery", afterCombat: true }
    ],
    completionEffects: []
  };
