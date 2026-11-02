import { actionChakraRecovery } from "../chakra-balance.js?v=1.0.0";
import { actionInitiative } from "./initiative.js?v=1.0.0";
import { advanceCooldowns, soakAfterTurn } from "./turn.js?v=0.114.0";

// Cierre común, previo a cualquier victoria, derrota o cambio de encuentro.
export function closeActionState(battle, actor, action, { skipped = false } = {}) {
  const unit = battle[actor];
  unit.soak = soakAfterTurn(unit);
  unit.recoveryInitiative = skipped ? 0 : actionInitiative(action);
  if (actor === "player") {
    battle.cooldowns = advanceCooldowns(battle.cooldowns);
    if (!skipped) unit.chakra = Math.min(unit.maxChakra, unit.chakra + actionChakraRecovery(action));
    battle.round += 1;
  }
  battle.pendingActions[actor] = null;
  battle.timelineProgress[actor] = 0;
}

export function isFinalOpponent(battle) {
  return Boolean(battle.mission?.exhibition || battle.mission?.tutorialReplay || battle.mission?.type === "route-combat"
    || battle.enemyIndex === battle.encounters?.length - 1);
}
