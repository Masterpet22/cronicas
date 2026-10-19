export const S01 = {
    id: "s01", number: 1, category: "secondary", board: "missions", type: "investigation", title: "El silencio de Kagemori", location: "Aldea de Kagemori", duration: "5–7 min", rank: "D",
    reward: { xp: 0, coins: 0 },
    requirements: [{ type: "main-completed", id: "m01" }, { type: "flag", id: "secondaryBoardUnlocked" }],
    dialogueId: "mission.s01.briefing",
    flow: [{ type: "dialogue" }, { type: "investigation", id: "kagemori-clues" }],
    completionEffects: [{ type: "set-flag", id: "kagemoriInvestigated", value: true }, { type: "set-flag", id: "banditBossMissionUnlocked", value: true }]
  };
