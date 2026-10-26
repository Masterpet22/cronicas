import assert from "node:assert/strict";
import { chooseDoctorRoute, createDoctorRouteState, normalizeDoctorRouteState, resolveDoctorRouteCombat, resolveRiverPassage } from "../src/doctor-mission.js";
import { DOCTOR_MAP_DESTINATION, DOCTOR_MAP_NODES, DOCTOR_MAP_START, availableDoctorMapNodes, doctorMapNode } from "../src/content/sagas/futuro-prometedor/s02-medico/route-map.js";
import { DOCTOR_ROUTE_DEFINITIONS } from "../src/content/sagas/futuro-prometedor/s02-medico/routes.js";
import { renderDoctorRouteMap } from "../src/ui/meta/doctor-route-map.js";

const start = () => ({ ...createDoctorRouteState(), active: true });
const all = [DOCTOR_MAP_START, ...DOCTOR_MAP_NODES, DOCTOR_MAP_DESTINATION];
assert.equal(new Set(all.map((node) => node.id)).size, all.length);
for (const node of all) {
  for (const id of node.next) {
    const target = all.find((candidate) => candidate.id === id);
    assert.ok(target, `${node.id} debe conectar con un nodo existente`);
    assert.ok(target.x > node.x, "Los caminos deben avanzar hacia Haru sin ciclos");
    if (node.phase !== undefined && target.phase !== undefined) assert.equal(target.phase, node.phase + 1);
  }
}

let exploredPaths = 0;
function walk(state) {
  if (state.phase === 3) { exploredPaths += 1; return; }
  const available = availableDoctorMapNodes(state);
  assert.ok(available.length, "Ninguna ruta jugable debe terminar sin salida");
  for (const routeId of ["elevated", "river", "forest", "unknown"]) {
    if (!available.some((node) => node.routeId === routeId)) {
      assert.deepEqual(chooseDoctorRoute(state, routeId), state, "No se puede saltar a un nodo desconectado");
    }
  }
  for (const node of available) {
    let next = chooseDoctorRoute(state, node.routeId);
    if (next.pendingEvent) {
      assert.equal(next.phase, state.phase, "Un encuentro no resuelto mantiene el tramo");
      assert.deepEqual(availableDoctorMapNodes(next), []);
      assert.deepEqual(chooseDoctorRoute(next, "elevated"), next);
      const restored = normalizeDoctorRouteState(JSON.parse(JSON.stringify(next)));
      assert.deepEqual(restored, next, "La reanudación conserva el encuentro y la posición");
      if (next.pendingEvent.type === "river") {
        const wrong = resolveRiverPassage(next, "wrong");
        assert.equal(wrong.phase, state.phase);
        assert.equal(wrong.time, next.time + 1);
        next = resolveRiverPassage(restored, restored.pendingEvent.correct);
      } else next = resolveDoctorRouteCombat(restored);
    }
    assert.equal(next.phase, state.phase + 1);
    assert.equal(doctorMapNode(state.phase, next.choices[state.phase]).id, node.id);
    walk(normalizeDoctorRouteState(JSON.parse(JSON.stringify(next))));
  }
}
walk(start());
assert.ok(exploredPaths > 3, "El mapa debe ofrecer varios recorridos completos");
assert.deepEqual(availableDoctorMapNodes(createDoctorRouteState()), []);
assert.deepEqual(availableDoctorMapNodes({ ...start(), phase: 3 }), []);

// Existing saves retain their history, even if an old transition is no longer offered.
const legacy = normalizeDoctorRouteState({ ...start(), phase: 2, choices: ["elevated", "forest"] });
assert.deepEqual(legacy.choices, ["elevated", "forest"]);
assert.deepEqual(availableDoctorMapNodes(legacy).map((node) => node.id), ["camp"]);
assert.equal(chooseDoctorRoute(legacy, "forest").phase, 3);
assert.match(renderDoctorRouteMap(legacy, DOCTOR_ROUTE_DEFINITIONS, (text) => text), /class="route-edge travelled" data-route-edge="ridge:ambush"/, "El recorrido antiguo sigue dibujado aunque esa conexión ya no se ofrezca");
console.log(`Mapa del médico: ${exploredPaths} recorridos completos, conexiones, encuentros y reanudación verificados.`);
