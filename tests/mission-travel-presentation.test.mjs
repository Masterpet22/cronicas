import assert from "node:assert/strict";
import { missionTravelPresentation } from "../src/battle/mission-travel-presentation.js";

const mission = { id: "m05", number: 5, rank: "D", category: "main", location: "Sala del Cuervo" };
const outbound = missionTravelPresentation(mission, { direction: "toMission" });
assert.equal(outbound.missionLabel, "MISIÓN 05 · RANGO D");
assert.equal(outbound.departure, "ALDEA");
assert.equal(outbound.destination, "SALA DEL CUERVO");
assert.equal(outbound.arrival, "EL ENCUENTRO SE ACERCA");

const victory = missionTravelPresentation(mission, { direction: "toVillage", result: { outcome: "completed" } });
assert.equal(victory.arrival, "OBJETIVO CUMPLIDO");
assert.equal(victory.destination, "ALDEA");
const retreat = missionTravelPresentation(mission, { direction: "toVillage", result: { outcome: "abandoned" } });
assert.equal(retreat.arrival, "RETIRADA CONFIRMADA");
assert.notEqual(retreat.accent, victory.accent);
const doctor = missionTravelPresentation({ id: "s02", category: "secondary", location: "Caminos del Norte" }, { direction: "toDoctorRoute" });
assert.equal(doctor.arrival, "LA BÚSQUEDA CONTINÚA");
assert.equal(doctor.missionLabel, "MISIÓN SECUNDARIA");

console.log("Presentación contextual de viajes de misión superada.");
