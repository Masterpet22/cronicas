import { recordMissionGrade } from "../mission-grades.js?v=1.0.0";

// La victoria permanece en memoria hasta que el jugador sale del informe.
export function stageVictory(runtime, save) {
  runtime.activeSave = save;
  runtime.pendingVictorySave = save;
  return save;
}

export function stageMissionGrade(runtime, missionId, grade) {
  if (!runtime.pendingVictorySave) return;
  stageVictory(runtime, recordMissionGrade(runtime.pendingVictorySave, missionId, grade));
}

export function commitVictory(runtime, persist) {
  if (!runtime.pendingVictorySave) return runtime.activeSave;
  const committed = persist(runtime.pendingVictorySave);
  runtime.activeSave = committed;
  runtime.pendingVictorySave = null;
  return committed;
}

export function discardVictory(runtime) {
  runtime.pendingVictorySave = null;
}
