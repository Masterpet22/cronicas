// Una sola regla para combate, HUD, tutorial y entrenamiento.
export const CHAKRA_BALANCE = Object.freeze({ baseReserve: 60, turnRecovery: 5, guardRecovery: 25 });

// Costes de nivel 1. La maestría aplica después su descuento por nivel.
const TECHNIQUE_COSTS = Object.freeze({
  fire_embers: 30, fire_breath: 42, fire_arc: 32, fire_brand: 38, fire_ring: 48, fire_phoenix: 64,
  wind_palm: 30, wind_blade: 38, wind_step: 32, wind_wave: 40, wind_needles: 46, wind_cyclone: 62,
  water_bullet: 30, water_whip: 36, water_wall: 42, water_lance: 48,
  earth_fist: 30, earth_wall: 36, earth_spike: 42, earth_quake: 48,
  lightning_spark: 32, lightning_prison: 60, lightning_chain: 48, lightning_heaven: 72,
  vapor_burst: 48, magma_forge: 52, plant_bind: 46, ice_spear: 48, sand_coffin: 50,
  venom_bloom: 58, metal_bastion: 60, frost_crown: 56, glass_rain: 60,
  storm_domain: 64, crystal_prism: 60, ash_funeral: 60, root_colossus: 64
});

export function balanceTechniqueChakra(action) {
  const cost = TECHNIQUE_COSTS[action.id] ?? action.cost;
  return { ...action, cost, subtitle: action.subtitle.replace(/^\d+CH/, `${cost}CH`) };
}

export function actionChakraCost(action, costReduction = 0) {
  const base = Math.max(0, Number(action?.cost) || 0);
  if (!base) return 0;
  // El equipo conserva valor, pero nunca elimina más de la mitad del coste.
  return Math.max(Math.ceil(base / 2), base - Math.max(0, Number(costReduction) || 0));
}

export function actionChakraRecovery(action) {
  return action?.type === "guard" ? CHAKRA_BALANCE.guardRecovery : CHAKRA_BALANCE.turnRecovery;
}
