export const M03 = {
    id: "m03", number: 3, category: "main", board: "headquarters", title: "El umbral de los cuervos", location: "Accesos a la guarida", duration: "10–12 min", rank: "D",
    encounters: ["gate_guard", "bandit_pathfinder", "stone_hunter"], reward: { xp: 105, coins: 85 },
    requirements: [{ type: "secondary-completed", id: "s02" }],
    dialogueId: "mission.m03.briefing", tacticalBriefing: true,
    flow: [
      { type: "dialogue" },
      {
        type: "choice", id: "hideout-entry", beforeCombat: true,
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
