import { DOCTOR_ROUTE_DEFINITIONS } from "./content/sagas/futuro-prometedor/s02-medico/routes.js";
export { DOCTOR_ROUTE_DEFINITIONS, RIVER_PASSAGES } from "./content/sagas/futuro-prometedor/s02-medico/routes.js";

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
