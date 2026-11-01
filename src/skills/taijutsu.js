import { TAIJUTSUS_BY_ID, SKILLS_BY_ID } from "./definitions.js?v=1.0.0";
import { skillLevel } from "./progression.js?v=1.0.0";

export const TAIJUTSU_SLOT_COUNT = 2;
export function learnedTaijutsu(save,id) {
  return TAIJUTSUS_BY_ID.has(id) && skillLevel(save,SKILLS_BY_ID.get(id)) > 0;
}

export function normalizeTaijutsuLoadout(save,requested = save?.taijutsuLoadout) {
  const slots = Array(TAIJUTSU_SLOT_COUNT).fill(null);
  if (!Array.isArray(requested)) return slots;
  requested.slice(0,TAIJUTSU_SLOT_COUNT).forEach((id,index) => {
    if (learnedTaijutsu(save,id) && !slots.includes(id)) slots[index] = id;
  });
  return slots;
}

export function equipTaijutsu(save,slot,id) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= TAIJUTSU_SLOT_COUNT || !learnedTaijutsu(save,id)) return save;
  const taijutsuLoadout = normalizeTaijutsuLoadout(save);
  const previous = taijutsuLoadout.indexOf(id);
  if (previous === slot) return save;
  if (previous >= 0) taijutsuLoadout[previous] = taijutsuLoadout[slot];
  taijutsuLoadout[slot] = id;
  return { ...save,taijutsuLoadout };
}

export function unequipTaijutsu(save,slot) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= TAIJUTSU_SLOT_COUNT) return save;
  const taijutsuLoadout = normalizeTaijutsuLoadout(save);
  if (!taijutsuLoadout[slot]) return save;
  taijutsuLoadout[slot] = null;
  return { ...save,taijutsuLoadout };
}

export function taijutsuAction(save,id) {
  if (!learnedTaijutsu(save,id)) return null;
  const action = TAIJUTSUS_BY_ID.get(id);
  return { ...action,damage:action.damage + 2*(skillLevel(save,SKILLS_BY_ID.get(id))-1) };
}
