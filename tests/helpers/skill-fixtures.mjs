import { SKILLS_BY_ID } from "../../src/skills/definitions.js?v=1.4.0";
import { investResonance, prerequisiteEntries, skillLevel, skillRequirements } from "../../src/skills/progression.js?v=1.0.0";

// Los fixtures recorren las mismas transacciones y requisitos que el jugador.
export function learnSkillForTest(save,id,rank = 1) {
  const node = SKILLS_BY_ID.get(id);
  if (!node) throw new Error(`Habilidad inexistente: ${id}`);
  for (const [parent,required] of prerequisiteEntries(save,node)) save = learnSkillForTest(save,parent,required);
  while (skillLevel(save,node) < rank) {
    const next = investResonance(save,id);
    if (next === save) throw new Error(`${id} rango ${rank}: ${skillRequirements(save,node).join("; ")} o faltan puntos`);
    save = next;
  }
  return save;
}
