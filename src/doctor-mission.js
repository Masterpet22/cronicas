export const DOCTOR_ROUTE_DEFINITIONS = Object.freeze({
  elevated: Object.freeze({
    id: "elevated",
    title: "Camino elevado",
    subtitle: "Seguro · lento",
    description: "La altura permite anticipar peligros, aunque obliga a rodear los barrancos.",
    outcomes: Object.freeze([
      { danger: 0, time: 2, clues: 1, resources: 0, text: "Desde la cornisa distingues humo al norte. Un arriero aconseja no confundir rapidez con progreso." },
      { danger: 0, time: 2, clues: 1, resources: 0, text: "Las marcas de rueda continúan por un paso largo, pero libre de emboscadas." },
      { danger: 0, time: 2, clues: 1, resources: 0, text: "Un mojón médico confirma que Haru cruzó esta ruta. El rodeo te deja cerca de su campamento." }
    ])
  }),
  river: Object.freeze({
    id: "river",
    title: "Sendero del río",
    subtitle: "Investigación · pistas",
    description: "Hay que leer la corriente y encontrar un paso seguro antes de avanzar.",
    passages: Object.freeze([
      Object.freeze({ correct: "stones", hint: "Las piedras con musgo roto soportaron peso recientemente." }),
      Object.freeze({ correct: "reeds", hint: "Los juncos inclinados señalan una corriente menos profunda." }),
      Object.freeze({ correct: "ford", hint: "Las huellas desaparecen frente a un vado oculto por grava." })
    ]),
    outcomes: Object.freeze([
      { danger: 0, time: 1, clues: 2, resources: 1, text: "Encuentras el primer cruce y recuperas vendas atrapadas entre las piedras." },
      { danger: 0, time: 1, clues: 2, resources: 1, text: "El cauce revela marcas antiguas iguales a las del mapa cifrado." },
      { danger: 0, time: 1, clues: 2, resources: 1, text: "El vado conduce a un campamento reciente con el emblema de Haru." }
    ])
  }),
  forest: Object.freeze({
    id: "forest",
    title: "Bosque cerrado",
    subtitle: "Peligro · recursos",
    description: "Es la ruta más corta y fértil, pero un enemigo puede bloquear el paso.",
    outcomes: Object.freeze([
      { danger: 1, time: 0, clues: 1, resources: 2, text: "Cruzas la maleza y encuentras hierbas medicinales junto a una fogata apagada." },
      { danger: 2, time: 0, clues: 1, resources: 2, text: "Un saqueador protege una mochila con suministros. Tendrás que abrirte paso en un duelo." },
      { danger: 1, time: 0, clues: 1, resources: 2, text: "Las ramas rotas forman un atajo hasta el campamento del médico." }
    ])
  })
});

export const RIVER_PASSAGES = Object.freeze([
  { id: "stones", label: "Piedras cubiertas de musgo" },
  { id: "reeds", label: "Franja de juncos doblados" },
  { id: "ford", label: "Vado de grava" }
]);

export function createDoctorRouteState() {
  return { active: false, phase: 0, danger: 0, time: 0, clues: 0, resources: 0, choices: [], pendingEvent: null, lastEvent: "" };
}

export function normalizeDoctorRouteState(candidate = {}) {
  const phase = Math.min(3, Math.max(0, Math.floor(Number(candidate.phase) || 0)));
  const pending = candidate.pendingEvent;
  return {
    active: Boolean(candidate.active),
    phase,
    danger: Math.max(0, Math.floor(Number(candidate.danger) || 0)),
    time: Math.max(0, Math.floor(Number(candidate.time) || 0)),
    clues: Math.max(0, Math.floor(Number(candidate.clues) || 0)),
    resources: Math.max(0, Math.floor(Number(candidate.resources) || 0)),
    choices: Array.isArray(candidate.choices) ? candidate.choices.filter((id) => Object.hasOwn(DOCTOR_ROUTE_DEFINITIONS, id)).slice(0, phase) : [],
    pendingEvent: pending && ["river", "combat"].includes(pending.type) ? { type: pending.type, routeId: pending.routeId, correct: pending.correct || null } : null,
    lastEvent: String(candidate.lastEvent || "").slice(0, 300)
  };
}

function applyOutcome(state, routeId) {
  const next = normalizeDoctorRouteState(state);
  const route = DOCTOR_ROUTE_DEFINITIONS[routeId];
  if (!route || next.phase >= 3) return next;
  const outcome = route.outcomes[next.phase];
  next.danger += outcome.danger;
  next.time += outcome.time;
  next.clues += outcome.clues;
  next.resources += outcome.resources;
  next.choices.push(routeId);
  next.phase += 1;
  next.pendingEvent = null;
  next.lastEvent = outcome.text;
  return next;
}

export function chooseDoctorRoute(state, routeId) {
  const next = normalizeDoctorRouteState(state);
  if (!next.active || next.phase >= 3 || next.pendingEvent) return next;
  const route = DOCTOR_ROUTE_DEFINITIONS[routeId];
  if (!route) return next;
  if (routeId === "river") {
    next.pendingEvent = { type: "river", routeId, correct: route.passages[next.phase].correct };
    next.lastEvent = route.passages[next.phase].hint;
    return next;
  }
  if (routeId === "forest" && next.phase === 1) {
    next.pendingEvent = { type: "combat", routeId, correct: null };
    next.lastEvent = route.outcomes[next.phase].text;
    return next;
  }
  return applyOutcome(next, routeId);
}

export function resolveRiverPassage(state, passageId) {
  const next = normalizeDoctorRouteState(state);
  if (next.pendingEvent?.type !== "river") return next;
  if (passageId !== next.pendingEvent.correct) {
    next.time += 1;
    next.danger += 1;
    next.lastEvent = "La corriente se vuelve demasiado profunda. Retrocedes y conservas la pista, pero pierdes tiempo y aumentas el riesgo.";
    return next;
  }
  return applyOutcome(next, "river");
}

export function resolveDoctorRouteCombat(state) {
  const next = normalizeDoctorRouteState(state);
  return next.pendingEvent?.type === "combat" ? applyOutcome(next, "forest") : next;
}
