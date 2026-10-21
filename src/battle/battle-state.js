export const SESSION_FIELDS = Object.freeze([
  "saveData", "missionStartSave", "mission", "combatFeatures",
  "encounterIds", "encounters", "enemyIndex", "actions", "cooldowns", "round",
  "timelineProgress", "pendingActions",
  "defeatedEncounters", "battleRewards", "pendingEncounterRewards", "rewardPreviewSave",
  "fieldSupplies", "nextRecovery", "lastReward", "missionReward"
]);

export const COMBATANT_FIELDS = Object.freeze(["player", "enemy"]);

export function createBattleState(initial = {}) {
  return {
    session: Object.fromEntries(SESSION_FIELDS.map((field) => [field, initial.session?.[field] ?? null])),
    combatants: Object.fromEntries(COMBATANT_FIELDS.map((field) => [field, initial.combatants?.[field] ?? null]))
  };
}

export function bindBattleState(scene, state = createBattleState()) {
  Object.defineProperty(scene, "battleState", { value: state, writable: false, configurable: true });
  const bind = (group, field) => Object.defineProperty(scene, field, {
    configurable: true,
    enumerable: false,
    get() { return state[group][field]; },
    set(value) { state[group][field] = value; }
  });
  SESSION_FIELDS.forEach((field) => bind("session", field));
  COMBATANT_FIELDS.forEach((field) => bind("combatants", field));
  return state;
}

export function serializeBattleState(state) {
  return JSON.parse(JSON.stringify(state));
}

