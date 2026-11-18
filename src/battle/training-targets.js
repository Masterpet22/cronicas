// Native controls share the HUD's pause/visibility lifecycle and work with touch.
export function mountTrainingTargets(scene) {
  const root = scene.game.canvas.parentElement.querySelector(".combat-access");
  const panel = document.createElement("section");
  panel.className = "training-target-panel";
  panel.setAttribute("aria-label", "Objetivos de entrenamiento");
  const heading = document.createElement("strong");
  heading.textContent = "Elige a quién atacar";
  const list = document.createElement("div");
  list.className = "training-target-list";
  const controls = scene.trainingTargets.map((target, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.trainingTarget = index;
    const name = document.createElement("strong"), health = document.createElement("span");
    const meter = document.createElement("progress");
    meter.max = target.state.maxHp;
    meter.setAttribute("aria-label", `Vida de marioneta ${index + 1}`);
    button.append(name, meter, health);
    button.addEventListener("click", () => scene.selectTrainingTarget(index));
    list.append(button);
    return { button, name, health, meter };
  });
  const footer = document.createElement("div");
  footer.className = "training-target-footer";
  const note = document.createElement("span");
  note.textContent = "Rivales pasivos · Daño individual · Sin recompensas";
  const reset = document.createElement("button");
  reset.type = "button";
  reset.dataset.resetTrainingTargets = "";
  reset.textContent = "Restaurar objetivos";
  reset.addEventListener("click", () => {
    if (scene.busy || scene.finished || scene.scene.isPaused()) return;
    scene.resetTraining();
    scene.selectTrainingTarget(0);
    scene.startTurnCharge();
    scene.setMessage("Marionetas restauradas. Elige un objetivo y sigue practicando.");
  });
  footer.append(note, reset);
  panel.append(heading, list, footer);
  root.insertBefore(panel, root.querySelector(".combat-table-tools"));
  const refresh = () => {
    const blocked = scene.busy || scene.finished || scene.scene.isPaused();
    controls.forEach(({ button, name, health, meter }, index) => {
      const { state } = scene.trainingTargets[index];
      const selected = index === scene.enemyIndex;
      name.textContent = `Marioneta ${index + 1}${selected ? " · Objetivo" : ""}`;
      health.textContent = state.hp > 0 ? `${state.hp} / ${state.maxHp} PV` : "Derribada";
      meter.value = state.hp;
      button.disabled = blocked || state.hp <= 0;
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute("aria-label", `${name.textContent}, ${health.textContent}`);
    });
    reset.disabled = blocked;
  };
  const onPause = () => refresh();
  scene.events.on("pause", onPause);
  scene.events.on("resume", onPause);
  scene.events.once("shutdown", () => {
    scene.events.off("pause", onPause);
    scene.events.off("resume", onPause);
    panel.remove();
  });
  refresh();
  return { refresh };
}
