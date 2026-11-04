import { skillTreeNodes } from "../../skills/progression.js?v=1.0.0";

export function tutorialControl(root, step, save, view) {
  if (!step || step.view && step.view !== view) return null;
  const result = (selector, instruction, reveal = false, skill = null) => ({ element: root.querySelector(selector), instruction, reveal, skill });
  const equipmentSteps = ["equipment", "throwable-equipment", "mentor", "initial-kit"];
  const finalEquipment = step.id === "final-loadout" && (!save.equipment.weapon || !save.equipment.throwable);
  const tab = step.id === "attribute" ? "statistics" : equipmentSteps.includes(step.id) || finalEquipment ? "equipment" : "techniques";
  if (view === "dojo" && root.querySelector(`[data-dojo-tab="${tab}"]`)?.getAttribute("aria-selected") === "false") return result(`[data-dojo-tab="${tab}"]`, `1. Abre ${tab === "statistics" ? "Estadísticas" : tab === "equipment" ? "Equipo" : "Técnicas"}.`, true);
  if (view === "archive" && step.id === "dictionary" && root.querySelector('[data-archive-tab="dictionary"]')?.getAttribute("aria-selected") === "false") return result('[data-archive-tab="dictionary"]', "Abre la pestaña Diccionario.", true);
  if (["equipment", "throwable-equipment"].includes(step.id)) {
    const slot = step.key;
    const modal = root.querySelector('.equipment-modal:not(.master-modal)');
    if (modal && !modal.hidden) return result(`[data-equipment-type="${slot}"][data-equipment-id="${slot === "weapon" ? "kunai" : "shuriken"}"]`, "Elige el objeto para colocarlo en la ranura. Abrir esta ventana todavía no lo equipa.");
    return result(`[data-gear-slot="${slot}"]`, `Abre ${slot === "weapon" ? "Arma" : "Arma arrojadiza"} para elegir el objeto.`, true);
  }
  if (step.id === "mentor") return result('[data-open-master]', "Abre la ficha, lee tu ventaja y pulsa × para volver.", true);
  const skillStep = ["foundation", "learn-punch", "equip-punch", "punch-ready"].includes(step.id);
  let skill = skillStep ? step.key || "physical_1" : null;
  if (["equip-technique", "element-ready", "initial-elemental"].includes(step.id) || step.id === "final-loadout" && !save.loadout.length) skill = skillTreeNodes(save).find(node => node.jutsuId && node.level > 0 && !save.loadout.includes(node.id))?.id;
  if (skill) {
    const node = skillTreeNodes(save).find(node => node.id === skill);
    const selector = `[data-skill-select="${skill}"]`;
    if (root.querySelector(selector)?.getAttribute("aria-pressed") !== "true") return result(selector, `2. Selecciona «${node?.name || "la técnica indicada"}», el hexágono resaltado.`, true, skill);
    if (step.state === "investment") return result(`[data-skill-invest="${skill}"]`, `3. Pulsa ${step.id === "foundation" ? "MEJORAR" : "DESBLOQUEAR"} · 1 PR en esta ficha.`, false, skill);
    if (skillStep) return result(`[data-taijutsu-equip="${skill}"]:not([disabled])`, "3. Pulsa T1 · EQUIPAR para preparar el taijutsu.", false, skill);
    return result(`[data-technique-toggle="${skill}"]`, "3. Pulsa EQUIPAR EN RANURA LIBRE.", false, skill);
  }
  if (step.id === "final-loadout" && !save.taijutsuLoadout.some(Boolean)) return result("[data-taijutsu-choose]", "Selecciona una ranura de taijutsu y prepara una técnica.", true);
  if (step.id === "attribute") return result(step.selector, "2. Pulsa + en un atributo. Se gastará 1 punto de atributo; los PR se administran en Técnicas.");
  return result(step.selector, step.id === "remove-technique" ? "Pulsa × en una ranura elemental ocupada." : "Usa el control resaltado.");
}

export function revealTutorialControl(control) {
  if (!control?.element) return;
  if (control.reveal) control.element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  else {
    control.element.scrollIntoView({ block: "nearest", inline: "nearest" });
    control.element.focus({ preventScroll: true });
  }
}
