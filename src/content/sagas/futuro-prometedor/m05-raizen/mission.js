export const M05 = {
    id: "m05", number: 7, category: "main", arenaNumber: 5, board: "headquarters", title: "El jefe de los bandidos", location: "Sala del Cuervo", duration: "10–13 min", rank: "D",
    encounters: ["boss_raizen"], reward: { xp: 165, coins: 145 },
    requirements: [{ type: "main-completed", id: "m04" }],
    dialogueId: "mission.m05.briefing", sagaFinal: true, tacticalBriefing: true,
    flow: [
      { type: "dialogue" },
      {
        type: "consequence", id: "prisoner-intelligence", beforeCombat: true, progressKey: "banditPrisonerChoice",
        modifiers: [
          {
            type: "enemy-opening", target: "boss", hpMultiplier: 0.85, openingEvent: "lieutenant-intervention",
            when: { type: "flag", id: "banditPrisonerChoice", equals: "interrogate" }
          },
          {
            type: "enemy-defense", target: "boss", damageReduction: 3, presentation: "defense-aura",
            unless: { type: "flag", id: "banditPrisonerChoice", equals: "interrogate" }
          }
        ]
      },
      {
        type: "combat", id: "raizen-duel", phaseMessageKey: "raizen",
        phaseMessage: "Raizen altera el ritmo: aumenta su velocidad y cambia su patrón.",
        announcedActionIds: ["heavy", "toxin"]
      }
    ],
    completionEffects: []
  };
