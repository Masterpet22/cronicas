// Estaciones meteorológicas de Japón: Haru mar–may, Natsu jun–ago,
// Aki sep–nov y Fuyu dic–feb. El reloj de la aldea sigue en America/La_Paz.
const annual = (id, title, month, day, summary) => ({ id, title, shortLabel: title, type: "festival", schedule: { monthly: { months: [month], from: day, to: day } }, summary, description: summary, activity: "announcement" });
const seasons = [["haru", "Haru", 3, 1, 5, 31], ["natsu", "Natsu", 6, 1, 8, 31], ["aki", "Aki", 9, 1, 11, 30], ["fuyu", "Fuyu", 12, 1, 2, -1]];
export const PLAZA_EVENTS = Object.freeze([
  annual("new-year", "Año Nuevo", 1, 1, "La aldea recibe un nuevo año."),
  annual("friendship-day", "Día de la amistad", 2, 14, "Una celebración de los lazos entre compañeros."),
  annual("birth-festival", "Festival del nacimiento", 4, 30, "La aldea celebra el festival del nacimiento."),
  annual("arts-festival", "Festival de las artes", 5, 6, "Una jornada dedicada a la creatividad y las artes de la aldea."),
  annual("star-festival", "Festival de las estrellas", 7, 7, "La aldea comparte sus deseos bajo las estrellas."),
  annual("halloween", "Halloween", 10, 31, "Una noche de máscaras y misterio en la aldea."),
  annual("memorial-day", "Día de los difuntos", 11, 2, "La aldea recuerda a quienes forman parte de su historia."),
  annual("christmas", "Navidad", 12, 25, "La aldea se reúne para celebrar la Navidad."),
  annual("year-end", "Fin de año", 12, 31, "La última celebración del año en la aldea."),
  ...seasons.flatMap(([id, name, startMonth, startDay, endMonth, endDay]) => [["start", "Inicio", startMonth, startDay], ["end", "Fin", endMonth, endDay]].map(([edge, label, month, day]) => ({ ...annual(`${id}-${edge}`, `${label} de ${name}`, month, day, `${label} de ${name} en el calendario de la aldea.`), type: "season" }))),
  { id: "second-friday-visit", title: "Visita del segundo viernes", shortLabel: "Visita", type: "visit", schedule: { monthly: { weekday: 5, ordinal: 2 } },
    summary: "Mei Hayate comparte sus consejos con los combatientes.", description: "Esta visita se celebra el segundo viernes de cada mes.", activity: "conversation", steps: 1, guest: "mei", dialogue: ["Cuida tu chakra y observa el ritmo de tu rival.", "Cada afinidad abre un camino diferente. Entrena antes de afrontar un desafío elemental."] },
  { id: "last-friday-visit", title: "Visita del último viernes", shortLabel: "Visita", type: "visit", schedule: { monthly: { weekday: 5, ordinal: -1 } },
    summary: "Daichi Kazan visita la plaza al cerrar el mes.", description: "Esta segunda visita se celebra el último viernes de cada mes.", activity: "conversation", steps: 1, guest: "daichi", dialogue: ["La constancia pesa más que una victoria aislada.", "Revisa tu equipo en el Dojo y prepara el siguiente mes de entrenamiento."] },
  { id: "bitsfury-visit", title: "Visita especial de Bitsfury Arena", shortLabel: "Bitsfury", type: "visit", schedule: { monthly: { from: 11, to: 11 } }, activity: "announcement", pending: "server",
    summary: "Visita especial programada para el día 11 de cada mes.", description: "Pendiente de la conexión al servidor. Los personajes de Bitsfury Arena se incorporarán cuando esté disponible esa integración." },
  ...[[5, "agua", "Agua"], [12, "tierra", "Tierra"], [19, "fuego", "Fuego"], [26, "viento", "Aire"]].map(([day, element, name]) => ({ id: `element-day-${element}`, title: `Día de ${name}`, shortLabel: name, type: "elemental", element, schedule: { monthly: { from: day, to: day } }, activity: "tower", steps: 1,
    summary: `Un minijefe de ${name.toLowerCase()} te espera en la Torre de Desafíos.`, description: "Desafío local contra un minijefe. Se guarda la victoria de esta edición; por ahora no entrega PX, monedas ni objetos.", destination: "tower" })),
  { id: "elemental-festival", title: "Festival elemental", shortLabel: "Festival", type: "festival", schedule: { monthly: { lastDays: 3 } }, activity: "announcement", pending: "details", destination: "arena",
    summary: "Los últimos tres días de cada mes se celebra el Festival elemental.", description: "La Arena de Combate acogerá combates especiales. Sus reglas y recompensas están pendientes de definir; las exhibiciones normales siguen disponibles." }
].map(event => Object.freeze({ ...event, schedule: Object.freeze({ ...event.schedule, monthly: event.schedule.monthly && Object.freeze(event.schedule.monthly) }), dialogue: event.dialogue && Object.freeze(event.dialogue) })));
export const EVENT_TYPES = Object.freeze({
  festival: Object.freeze({ label: "Festival", symbol: "灯", color: "#dbac60" }),
  visit: Object.freeze({ label: "Visita", symbol: "旅", color: "#6abeb3" }),
  elemental: Object.freeze({ label: "Elemental", symbol: "試", color: "#af92d7" }),
  season: Object.freeze({ label: "Estación", symbol: "季", color: "#83bd85" }),
  birthday: Object.freeze({ label: "Cumpleaños", symbol: "祝", color: "#dba1c2" })
});
