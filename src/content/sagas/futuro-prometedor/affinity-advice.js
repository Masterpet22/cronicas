import { AFFINITY_CONFIG } from "../../../affinity-system.js?v=0.114.0";
import { elementName } from "../../../elements.js?v=0.20.0";

const STATS = { health: "Vida", strength: "Fuerza", speed: "Velocidad", chakra: "Chakra" };
const PASSIVES = {
  fury: "Furia aumenta tu daño al perder vida.",
  soak: "Como afinidad principal, Agua aplica Empapado al acertar y ralentiza al rival.",
  reprisal: "Represalia puede devolver parte del daño recibido con un contraataque.",
  hurricaneEye: "Ojo del huracán mejora tu evasión mientras conserves todo el chakra."
};

export function affinityTutorialCopy(affinity) {
  const config = AFFINITY_CONFIG.affinities[affinity], slot = AFFINITY_CONFIG.slots[0];
  if (!config) return "Normal carece de ventajas y pasivas elementales.";
  return `Tu afinidad principal, ${elementName(affinity)}, aporta +${Math.round(slot.bonus * 100)} % de ${STATS[config.boosts]} y ${Math.round(slot.penalty * 100)} % de ${STATS[config.penalizes]}. ${PASSIVES[config.passive]} El ciclo de ventajas frente a otro elemento se enseñará ante tu primer rival elemental.`;
}
