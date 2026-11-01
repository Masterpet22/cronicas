import { physicalActionAvailable, physicalEmptySkill, physicalSkillActions } from "./skill-tables.js?v=0.135.0";

export function mountSkillTableControl(scene, { root, actions, restorePerspective, refresh }) {
  let table = "elemental", switching = false, timer = null, removed = false, returnFocus = false;
  const physical = physicalSkillActions(scene.saveData, scene.actions);
  const slots = Array.from({ length: 6 }, () => ({ available: false, selected: false }));
  const tools = document.createElement("div"); tools.className = "combat-table-tools";
  const heading = document.createElement("span"); heading.className = "combat-table-heading"; heading.setAttribute("aria-hidden", "true");
  const button = document.createElement("button"); button.type = "button"; button.className = "combat-table-switch";
  button.dataset.skillTableSwitch = ""; button.setAttribute("aria-controls", "combat-action-list");
  button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4 4-4-4 4-4"/></svg><span class="combat-table-switch-label"></span>';
  const live = document.createElement("span"); live.className = "combat-table-announcement"; live.setAttribute("role", "status");
  tools.append(heading, button, live); root.insertBefore(tools, actions); actions.id = "combat-action-list";
  const actionAt = index => table === "physical" ? physical[index] : scene.actions[index];
  const middle = index => index > 0 && index < 5;
  const blocked = () => removed || root.hidden || root.inert || scene.finished || !scene.scene.isActive() || scene.combatTutorial?.active;
  const refreshState = () => {
    const target = table === "elemental" ? "físicas" : "elementales";
    if (root.dataset.skillTable !== table) {
      root.dataset.skillTable = table;
      heading.textContent = table === "elemental" ? "ELEMENTALES" : "FÍSICAS";
      button.setAttribute("aria-label", `Cambiar a habilidades ${target}`);
      button.setAttribute("aria-pressed", String(table === "physical"));
      button.querySelector("span").textContent = table === "elemental" ? "Físicas" : "Elementales";
    }
    button.disabled = switching || blocked();
    button.title = scene.combatTutorial?.active ? "Completa la práctica guiada para cambiar de tabla." : `Cambiar a habilidades ${target}`;
    slots.forEach((slot, index) => {
      slot.available = !(switching && middle(index)) && physicalActionAvailable(scene, actionAt(index));
      slot.selected = actionAt(index)?.id === scene.selectedHudActionId;
    });
  };
  const layout = () => {
    if (root.classList.contains("compact")) { button.style.left = ""; button.style.top = ""; heading.style.left = ""; heading.style.top = ""; return; }
    const rect = actions.getBoundingClientRect(), base = root.getBoundingClientRect();
    button.style.left = `${rect.right - base.left + button.offsetWidth * .18}px`;
    button.style.top = `${rect.top - base.top + rect.height / 2}px`;
    heading.style.left = `${rect.left - base.left + rect.width / 2}px`;
    heading.style.top = `${rect.top - base.top - 18}px`;
  };
  const finish = () => {
    if (removed) return;
    switching = false; scene.skillTableSwitching = false;
    actions.classList.remove("is-turning-out", "is-turning-in");
    refresh(); layout();
    if (returnFocus && !root.hidden && !root.inert && document.activeElement === document.body) button.focus({ preventScroll: true });
    returnFocus = false;
  };
  const commit = () => {
    if (removed || blocked()) { finish(); return; }
    table = table === "elemental" ? "physical" : "elemental";
    live.textContent = table === "physical" ? "Tabla física. Golpe veloz y Guardia permanecen en 1 y 6." : "Tabla elemental. Golpe veloz y Guardia permanecen en 1 y 6.";
    refresh();
  };
  button.addEventListener("click", () => {
    if (switching || blocked()) return;
    returnFocus = document.activeElement === button;
    restorePerspective();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { commit(); layout(); return; }
    switching = true; scene.skillTableSwitching = true;
    actions.classList.add("is-turning-out"); refresh();
    timer = window.setTimeout(() => {
      commit();
      if (!switching || removed) return;
      actions.classList.remove("is-turning-out"); actions.classList.add("is-turning-in");
      timer = window.setTimeout(finish, 160);
    }, 160);
  });
  refreshState(); layout();
  return {
    actionAt, layout, refresh: refreshState,
    get physical() { return table === "physical"; },
    emptyAt: index => physicalEmptySkill(index),
    slotAt: index => table === "physical" && middle(index) ? slots[index] : scene.actionSlots[index],
    activate(index) {
      if (removed || root.hidden || root.inert || !scene.scene.isActive() || scene.finished || switching && middle(index)) return;
      const action = actionAt(index); if (!action) return;
      if (table === "physical" && middle(index)) {
        if (!physicalActionAvailable(scene, action)) return;
        scene.selectedHudActionId = action.id;
        scene.useJutsu(action);
      } else if (scene.actionSlots[index]?.available) scene.actionSlots[index].hit.emit("pointerdown");
    },
    destroy() { removed = true; window.clearTimeout(timer); scene.skillTableSwitching = false; tools.remove(); }
  };
}
