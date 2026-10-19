export const M02 = {
    id: "m02", number: 2, category: "main", board: "headquarters", title: "Asalto al Desfiladero del Cuervo", location: "Ruta de la cantera", duration: "12–15 min", rank: "D",
    encounters: ["bandit_pathfinder", "bandit_lieutenant", "boss_akumori"], reward: { xp: 95, coins: 80 },
    requirements: [{ type: "secondary-completed", id: "s01" }],
    dialogueId: "mission.m02.briefing", relic: "Mapa cifrado",
    flow: [
      { type: "dialogue" },
      { type: "combat", id: "canyon-assault" },
      { type: "investigation", id: "canyon-traces", afterEncounter: 0 },
      {
        type: "choice", id: "lieutenant-fate", afterEncounter: 1, relicDecision: true,
        modifiers: [{
          type: "enemy-stats", target: "boss", stats: { health: 22, strength: 2, speed: 2, luck: 1 }, accuracy: 4,
          when: { type: "flag", id: "banditPrisonerChoice", equals: "interrogate" }
        }]
      }
    ],
    completionEffects: [{ type: "set-flag", id: "cipherMapObtained", value: true }, { type: "set-flag", id: "doctorMissionUnlocked", value: true }]
  };
