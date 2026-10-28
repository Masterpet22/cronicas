export const S02 = {
    id: "s02", number: 4, category: "main", legacyCategory: "secondary", arenaNumber: 2, board: "headquarters", type: "route-search", title: "El médico errante", location: "Caminos del Norte", duration: "8–12 min", rank: "D",
    requirements: [{ type: "main-completed", id: "m02" }],
    dialogueId: "mission.s02.briefing", routeMode: "convergent",
    flow: [{ type: "dialogue" }, { type: "route", id: "doctor-search" }, { type: "dialogue", id: "doctor-lesson" }, { type: "investigation", id: "map-decipher" }, { type: "dialogue", id: "doctor-farewell" }],
    cipher: { speaker: "Haru Takamine", lessonScene: "doctor-lesson", farewellScene: "doctor-farewell", seals: ["pajaro", "liebre", "caballo", "rata", "tigre"] },
    reward: { xp: 45, coins: 30 },
    routeEvents: [
      { id: "elevated", label: "Camino elevado", type: "dialogue", description: "Una ruta segura y lenta donde los viajeros ofrecen consejos útiles." },
      { id: "river", label: "Sendero del río", type: "investigation", description: "Exige interpretar señales y encontrar el paso correcto." },
      { id: "forest", label: "Bosque cerrado", type: "combat", description: "Puede contener un duelo individual y ofrece mejores recursos." }
    ]
  };
