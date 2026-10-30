import { missionStep, requirementMet } from "./mission-system.js?v=0.114.0";

export function missionCombatModifiers(mission, type = null) {
  return (mission?.flow || [])
    .flatMap((step) => step.modifiers || [])
    .filter((modifier) => type === null || modifier.type === type);
}

export function activeCombatModifiers(mission, campaign = {}, type = null) {
  const save = { campaign };
  return missionCombatModifiers(mission, type).filter((modifier) => {
    const matches = !modifier.when || requirementMet(modifier.when, save);
    const excluded = modifier.unless && requirementMet(modifier.unless, save);
    return matches && !excluded;
  });
}

export function resolveEncounterIds(mission, campaign = {}) {
  const route = activeCombatModifiers(mission, campaign, "encounter-route")[0];
  return route ? mission.encounters.slice(Math.max(0, Number(route.skip) || 0)) : [...mission.encounters];
}

export function fieldSuppliesForBattle(mission, campaign = {}) {
  const modifier = activeCombatModifiers(mission, campaign, "field-supplies")[0];
  if (!modifier) return 0;
  const minimum = Math.max(0, Number(modifier.minimum) || 0);
  return Math.max(minimum, Number(campaign[modifier.sourceFlag]) || minimum);
}

export function combatFeatures(mission, campaign = {}) {
  const tutorial = Boolean(missionStep(mission, "combat")?.tutorial);
  const relicDecision = Boolean(missionStep(mission, "choice")?.relicDecision);
  const route = activeCombatModifiers(mission, campaign, "encounter-route")[0];
  const secretEntry = route?.openingEvent === "secret-warehouse";
  const opening = activeCombatModifiers(mission, campaign, "enemy-opening")[0];
  const defense = activeCombatModifiers(mission, campaign, "enemy-defense")[0];
  const combatStep = missionStep(mission, "combat");
  return {
    tutorial,
    secretEntry,
    lieutenantIntervention: opening?.openingEvent === "lieutenant-intervention",
    defenseAura: defense?.presentation === "defense-aura",
    relicDecision,
    postCombatChoice: Boolean(missionStep(mission, "choice")?.afterCombat),
    phaseMessage: combatStep?.phaseMessageKey || "generic",
    announcedActionIds: combatStep?.announcedActionIds || []
  };
}

export function bossPhaseMessage(mission) {
  return missionStep(mission, "combat")?.phaseMessage || "El Maestro rompe su sello: comienza la Fase II.";
}

export function interludePlan(mission) {
  return (mission?.flow || [])
    .filter((step) => ["investigation", "choice", "resource"].includes(step.type) && step.afterEncounter !== undefined)
    .map(({ type, afterEncounter }) => ({ type, afterEncounter }));
}
