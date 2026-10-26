// Las mismas coordenadas anclan los lugares interactivos y sus caminos visibles.
export const DOCTOR_MAP_SIZE = Object.freeze({ width: 1100, height: 430 });
export const DOCTOR_MAP_START = Object.freeze({ id: "start", x: 65, y: 215, next: ["ridge", "riverbank", "clearing"] });
export const DOCTOR_MAP_DESTINATION = Object.freeze({ id: "haru", x: 1035, y: 215, next: [] });
export const DOCTOR_MAP_NODES = Object.freeze([
  { id: "ridge", phase: 0, routeId: "elevated", title: "La cornisa", x: 280, y: 80, next: ["lookout", "reeds"] },
  { id: "riverbank", phase: 0, routeId: "river", title: "La ribera", x: 265, y: 215, next: ["reeds", "ambush"] },
  { id: "clearing", phase: 0, routeId: "forest", title: "Claro de hierbas", x: 280, y: 350, next: ["ambush"] },
  { id: "lookout", phase: 1, routeId: "elevated", title: "El mirador", x: 535, y: 65, next: ["milestone"] },
  { id: "reeds", phase: 1, routeId: "river", title: "El juncal", x: 550, y: 215, next: ["milestone", "ford", "camp"] },
  { id: "ambush", phase: 1, routeId: "forest", kind: "combat", title: "La emboscada", x: 535, y: 365, next: ["camp"] },
  { id: "milestone", phase: 2, routeId: "elevated", title: "Mojón del médico", x: 810, y: 80, next: ["haru"] },
  { id: "ford", phase: 2, routeId: "river", title: "El vado oculto", x: 825, y: 215, next: ["haru"] },
  { id: "camp", phase: 2, routeId: "forest", title: "Campamento viejo", x: 810, y: 350, next: ["haru"] }
].map((node) => Object.freeze({ ...node, next: Object.freeze(node.next) })));

export function doctorMapNode(phase, routeId) {
  return DOCTOR_MAP_NODES.find((node) => node.phase === phase && node.routeId === routeId);
}

export function doctorMapPosition(state) {
  return doctorMapNode(state.phase - 1, state.choices?.[state.phase - 1]) || DOCTOR_MAP_START;
}

export function availableDoctorMapNodes(state) {
  if (!state.active || state.phase >= 3 || state.pendingEvent) return [];
  return DOCTOR_MAP_NODES.filter((node) => node.phase === state.phase && doctorMapPosition(state).next.includes(node.id));
}
