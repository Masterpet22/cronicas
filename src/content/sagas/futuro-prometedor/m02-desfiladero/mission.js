export const M02 = {
    id: "m02", number: 3, category: "main", arenaNumber: 2, board: "headquarters", title: "Asalto al Desfiladero del Cuervo", location: "Ruta de la cantera", duration: "12–15 min", rank: "D",
    encounters: ["bandit_pathfinder", "bandit_lieutenant", "boss_akumori"], reward: { xp: 95, coins: 80 },
    requirements: [{ type: "main-completed", id: "s01" }],
    dialogueId: "mission.m02.briefing", relic: "Mapa cifrado",
    flow: [
      { type: "dialogue" },
      { type: "combat", id: "canyon-assault" },
      {
        type: "choice", id: "lieutenant-fate", afterEncounter: 1, relicDecision: true,
        modifiers: [{
          type: "enemy-stats", target: "boss", stats: { health: 22, strength: 2, speed: 2, luck: 1 }, accuracy: 4,
          when: { type: "flag", id: "banditPrisonerChoice", equals: "interrogate" }
        }]
      }
    ],
    completionEffects: []
  };
