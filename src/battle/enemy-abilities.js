import { ABILITY_CATALOG, canonicalAbilityId } from "../data.js?v=1.5.0";
import { actionChakraCost } from "../chakra-balance.js?v=1.0.0";
import { actionHealthCost } from "./skill-tables.js?v=0.140.0";
import { nextEnemyAction } from "./turn.js?v=1.4.0";
import { enemyCanUseElement } from "./enemy-affinities.js?v=1.0.0";

export function canUseEnemyAbility(enemy, action) {
  return Boolean(action && enemyCanUseElement(enemy, action) && !(enemy.cooldowns?.[action.id] > 0)
    && enemy.chakra >= actionChakraCost(action)
    && enemy.hp > actionHealthCost(action)
    && !(action.type === "guard" && enemy.guarding));
}

export function reserveEnemyAbility(enemy, action) {
  if (!enemyCanUseElement(enemy, action)) return null;
  if (enemy.reservedAction === action) return action;
  if (!canUseEnemyAbility(enemy, action)) return null;
  enemy.chakra -= actionChakraCost(action);
  enemy.hp -= actionHealthCost(action);
  enemy.cooldowns ||= {};
  if (action.cooldown) enemy.cooldowns[action.id] = action.cooldown + 1;
  enemy.reservedAction = action;
  return action;
}

export function chooseEnemyAbility(profile, enemy) {
  const next = nextEnemyAction(profile, enemy);
  enemy.patternIndex = next.patternIndex;
  if (enemy.statuses.some(status => status.type === "stun")) return ABILITY_CATALOG.strike;
  const id = canonicalAbilityId(next.actionId);
  const requested = Object.hasOwn(ABILITY_CATALOG, id) ? ABILITY_CATALOG[id] : null;
  // Sin chakra se recupera con Guardia; una recarga o un coste de vida bloqueado usa Golpe.
  const fallback = requested && enemyCanUseElement(enemy, requested) && enemy.chakra < actionChakraCost(requested) && !enemy.guarding
    ? ABILITY_CATALOG.guard : ABILITY_CATALOG.strike;
  return reserveEnemyAbility(enemy, requested) || reserveEnemyAbility(enemy, fallback);
}
