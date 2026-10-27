export const M01 = {
    id: "m01", number: 1, category: "main", board: "headquarters", title: "Tras las huellas del gato", location: "Bosque del Este", duration: "8–10 min", rank: "D", encounters: ["tutorial_bandit", "tutorial_bandit_second", "boss_varek"],
    reward: { xp: 55, coins: 40 },
    transitions: { departure: "route", betweenEncounters: "route", return: "route" },
    requirements: [], dialogueId: "mission.m01.briefing",
    flow: [{ type: "dialogue" }, { type: "combat", id: "forest-bandits", tutorial: true }]
  };
