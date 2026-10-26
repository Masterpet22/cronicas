const MISSION_COLORS = Object.freeze({
  m01: 0x7ee0a8,
  m02: 0xf0c27c,
  m03: 0x82cfff,
  m04: 0xef9a68,
  m05: 0xc5a1f2,
  s01: 0x9ad6c8,
  s02: 0x8bd5ed
});

export function missionTravelPresentation(mission = {}, { direction, result } = {}) {
  const toVillage = direction === "toVillage";
  const toRoute = direction === "toDoctorRoute";
  const outcome = result?.outcome;
  const accent = outcome === "failed" || outcome === "abandoned" ? 0xef9186 : MISSION_COLORS[mission.id] || 0x83d8ff;
  const location = (mission.location || "EL CAMINO").toLocaleUpperCase("es");
  const missionLabel = mission.category === "secondary"
    ? "MISIÓN SECUNDARIA"
    : `MISIÓN ${String(mission.number || 1).padStart(2, "0")} · RANGO ${mission.rank || "D"}`;
  return {
    accent,
    missionLabel,
    location,
    departure: toVillage || toRoute ? location : "ALDEA",
    destination: toVillage ? "ALDEA" : toRoute ? "BÚSQUEDA" : location,
    arrival: toVillage
      ? outcome === "completed" ? "OBJETIVO CUMPLIDO" : outcome === "abandoned" ? "RETIRADA CONFIRMADA" : "REGRESO A SALVO"
      : toRoute ? "LA BÚSQUEDA CONTINÚA" : "EL ENCUENTRO SE ACERCA"
  };
}
