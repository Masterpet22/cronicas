import { DOCTOR_MAP_DESTINATION, DOCTOR_MAP_NODES, DOCTOR_MAP_SIZE, DOCTOR_MAP_START, availableDoctorMapNodes, doctorMapNode, doctorMapPosition } from "../../content/sagas/futuro-prometedor/s02-medico/route-map.js";

const ICONS = {
  elevated: '<path d="m3 19 7-13 5 9 3-5 4 9H3Z"/><path d="m8 10 2 3 2-3"/>',
  river: '<path d="M2 7c3-4 5 4 9 0s6 4 11 0M2 12c3-4 5 4 9 0s6 4 11 0M2 17c3-4 5 4 9 0s6 4 11 0"/>',
  forest: '<path d="m12 2-6 8h3l-5 7h6v5h4v-5h6l-5-7h3L12 2Z"/>',
  combat: '<path d="m4 3 17 17m-1-17L3 20M3 3l1 5 4-4-5-1Zm18 0-5 1 4 4 1-5ZM2 17l5 5m10 0 5-5"/>',
  start: '<path d="M5 12h14m-6-6 6 6-6 6"/>'
};
const icon = (type) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[type]}</svg>`;
const position = (node) => `left:${node.x / DOCTOR_MAP_SIZE.width * 100}%;top:${node.y / DOCTOR_MAP_SIZE.height * 100}%`;

export function renderDoctorRouteMap(current, definitions, escapeHtml) {
  const available = new Set(availableDoctorMapNodes(current).map((node) => node.id));
  const visited = current.choices.map((routeId, phase) => doctorMapNode(phase, routeId)?.id).filter(Boolean);
  const pending = current.pendingEvent ? doctorMapNode(current.phase, current.pendingEvent.routeId) : null;
  const currentNode = pending || doctorMapPosition(current);
  const journey = [DOCTOR_MAP_START.id, ...visited, ...(pending ? [pending.id] : [])];
  const allNodes = [DOCTOR_MAP_START, ...DOCTOR_MAP_NODES, DOCTOR_MAP_DESTINATION];
  const connections = allNodes.flatMap((from) => from.next.map((id) => [from, allNodes.find((node) => node.id === id)]));
  // Conserva también los caminos recorridos en partidas anteriores al grafo.
  journey.slice(1).forEach((id, index) => {
    const from = allNodes.find((node) => node.id === journey[index]);
    const to = allNodes.find((node) => node.id === id);
    if (!from.next.includes(id)) connections.push([from, to]);
  });
  const edges = connections.map(([from, to]) => {
    const travelled = journey.some((nodeId, index) => nodeId === from.id && journey[index + 1] === to.id);
    const availableEdge = from.id === currentNode.id && available.has(to.id);
    const bypassed = (from.phase < current.phase && !visited.includes(from.id)) || (to.phase < current.phase && !visited.includes(to.id));
    const state = travelled ? "travelled" : availableEdge ? "available" : bypassed ? "bypassed" : "future";
    const bend = (to.x - from.x) * .48;
    return `<path class="route-edge ${state}" data-route-edge="${from.id}:${to.id}" d="M${from.x},${from.y} C${from.x + bend},${from.y} ${to.x - bend},${to.y} ${to.x},${to.y}"/>`;
  }).join("");
  const nodes = DOCTOR_MAP_NODES.map((node) => {
    const definition = definitions[node.routeId];
    const selected = visited.includes(node.id);
    const active = currentNode.id === node.id;
    const status = pending?.id === node.id ? "pending" : selected ? "chosen" : available.has(node.id) ? "available" : node.phase < current.phase ? "passed" : "locked";
    const type = node.kind || node.routeId;
    const subtitle = type === "combat" ? "Duelo · suministros" : definition.subtitle;
    const outcome = definition.outcomes[node.phase];
    const costs = `Peligro +${outcome.danger}, tiempo +${outcome.time}, pistas +${outcome.clues}, recursos +${outcome.resources}`;
    const label = `${node.title}. ${subtitle}. ${costs}. ${active ? "Posición actual." : available.has(node.id) ? "Camino disponible." : ""}`;
    return `<button class="route-node route-${node.routeId} ${status} ${active ? "current" : ""}" style="${position(node)}" type="button" data-route="${node.routeId}" data-route-node="${node.id}" ${available.has(node.id) ? "" : "disabled"} ${active ? 'aria-current="step"' : ""} aria-label="${escapeHtml(label)}" title="${escapeHtml(`${definition.description} ${costs}`)}"><i>${selected && !active ? '<b aria-hidden="true">✓</b>' : icon(type)}</i><span>${escapeHtml(node.title)}</span><small>${escapeHtml(subtitle)}</small>${active ? '<em>ESTÁS AQUÍ</em>' : ""}</button>`;
  }).join("");
  const count = available.size;
  return `<section class="route-atlas" aria-label="Mapa de rutas hacia Haru"><div class="route-map-heading"><span>CAMINOS DEL NORTE</span><small>INICIO → HARU</small></div><div class="route-map"><svg class="route-map-links" viewBox="0 0 ${DOCTOR_MAP_SIZE.width} ${DOCTOR_MAP_SIZE.height}" preserveAspectRatio="none" aria-hidden="true">${edges}</svg><div class="route-map-start ${currentNode.id === "start" ? "current" : ""}" style="${position(DOCTOR_MAP_START)}"><i>${icon("start")}</i><strong>INICIO</strong>${currentNode.id === "start" ? '<em>ESTÁS AQUÍ</em>' : ""}</div>${nodes}<div class="route-destination" style="${position(DOCTOR_MAP_DESTINATION)}"><i aria-hidden="true">医</i><strong>HARU</strong><small>El médico errante</small></div></div><footer class="route-map-footer"><div class="route-map-legend"><span class="legend-current">Tu recorrido</span><span class="legend-available">Disponible</span><span class="legend-future">Por explorar</span></div><p class="route-map-help" aria-live="polite">${pending ? "Resuelve el encuentro para continuar el camino." : `${count === 1 ? "Queda un camino conectado" : `Elige entre ${count} caminos conectados`} a tu posición.`}</p></footer></section>`;
}
