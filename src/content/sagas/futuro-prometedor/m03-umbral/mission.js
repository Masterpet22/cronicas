export const M03 = {
    id: "m03", number: 5, category: "main", arenaNumber: 3, board: "headquarters", title: "El umbral de los cuervos", location: "Accesos a la guarida", duration: "10–12 min", rank: "D",
    encounters: ["gate_guard", "bandit_pathfinder", "stone_hunter"], reward: { xp: 105, coins: 85 },
    requirements: [{ type: "main-completed", id: "s02" }, { type: "flag", id: "archiveUnlocked" }],
    dialogueId: "mission.m03.briefing", tacticalBriefing: true,
    flow: [
      { type: "dialogue" },
      {
        type: "choice", id: "hideout-entry", beforeCombat: true, progressKey: "hideoutEntryChoice",
        completionBonus: {
          coins: 90,
          requirements: [
            { type: "flag", id: "hideoutEntryChoice", equals: "secret" },
            { type: "flag", id: "secretEntranceKnown", equals: true }
          ]
        },
        modifiers: [{
          type: "encounter-route", skip: 1, openingEvent: "secret-warehouse",
          when: { type: "flag", id: "hideoutEntryChoice", equals: "secret" }
        }]
      },
      { type: "combat", id: "hideout-threshold" }
    ],
    completionEffects: [{ type: "context-flag", id: "secretWarehouseLooted", context: "secretBonusAwarded" }, { type: "sum-flags", id: "hideoutSupplies", base: 1, sources: ["doctorSupplyBonus"] }]
  };
