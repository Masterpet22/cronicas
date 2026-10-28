export const S01 = {
    id: "s01", number: 2, category: "main", legacyCategory: "secondary", board: "headquarters", type: "investigation", title: "El silencio de Kagemori", location: "Aldea de Kagemori", duration: "5–7 min", rank: "D",
    reward: { xp: 0, coins: 0 },
    requirements: [{ type: "main-completed", id: "m01" }],
    dialogueId: "mission.s01.briefing",
    flow: [{ type: "dialogue" }, { type: "investigation", id: "kagemori-clues" }],
    completionEffects: []
  };
