// Programa inicial de la plaza. Las fechas se interpretan en la hora de la aldea.
// schedule también admite { start: "AAAA-MM-DD", end: "AAAA-MM-DD" } para eventos únicos.
export const PLAZA_EVENTS = Object.freeze([
  { id: "lantern-festival", title: "Festival de los faroles", type: "festival", schedule: { monthly: { from: 6, to: 8 } },
    summary: "La aldea se reúne para iluminar la plaza y compartir sus deseos.",
    description: "Enciende los tres faroles del festival: valor, amistad y camino. Cada edición comienza con nuevos faroles por encender.",
    activity: "lanterns", steps: 3 },
  { id: "mei-visit", title: "Visita de Mei Hayate", type: "visit", schedule: { monthly: { from: 15, to: 16 } },
    summary: "Mei visita la plaza para compartir sus consejos con los combatientes.",
    description: "Acércate a conversar con Mei. Esta visita está abierta a todos los personajes, sea quien sea su maestro actual.",
    activity: "conversation", steps: 1, guest: "mei", dialogue: [
      "El dominio de una técnica comienza por comprender cuándo usarla. No gastes todo tu chakra en la primera oportunidad.",
      "Observa la afinidad principal del rival y prepara una segunda técnica mientras la primera se recupera.",
      "La Arena es un buen lugar para probar tu equipo. Practica sin arriesgar los avances de tu historia."
    ] },
  { id: "elemental-trial", title: "Desafío del ciclo elemental", type: "temporary", schedule: { monthly: { from: 24, to: 26 } },
    summary: "Una prueba temporal de estrategia para conocer las ventajas elementales.",
    description: "Resuelve tres preguntas sobre el ciclo elemental. Puedes corregir tus respuestas mientras dure el evento.",
    activity: "quiz", steps: 3 }
].map(event => Object.freeze({ ...event, schedule: Object.freeze({ ...event.schedule, monthly: event.schedule.monthly && Object.freeze(event.schedule.monthly) }), dialogue: event.dialogue && Object.freeze(event.dialogue) })));

export const EVENT_TYPES = Object.freeze({
  festival: Object.freeze({ label: "Festival", symbol: "灯", color: "#dbac60" }),
  visit: Object.freeze({ label: "Visita", symbol: "旅", color: "#6abeb3" }),
  temporary: Object.freeze({ label: "Temporal", symbol: "試", color: "#af92d7" })
});
