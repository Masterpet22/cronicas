export const FREE_MISSION_RETRIES = 2;
export function availableRetries(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function consumeRetry(remaining) {
  return availableRetries(remaining) > 0 ? remaining - 1 : null;
}

export function restoreDuel(battle) {
  battle.player = { ...battle.player, hp: battle.player.maxHp, chakra: battle.player.maxChakra,
    statuses: [], guarding: false, soak: null };
  battle.enemy = battle.createEnemyState(battle.encounters[battle.enemyIndex]);
  battle.enemy.hp = battle.enemy.maxHp;
  battle.cooldowns = Object.fromEntries(Object.keys(battle.cooldowns).map((id) => [id, 0]));
  battle.pendingActions = { player: null, enemy: null };
  battle.timelineProgress = { player: 0, enemy: 0 };
  battle.round = 1;
  battle.turnReady = false;
}

export function showRetryDialog(scene, count, scrolls = 0) {
  const restoreHud = scene.accessibleHud?.suspend?.();
  const dialog = document.createElement("dialog");
  dialog.className = "mission-retry-dialog";
  dialog.setAttribute("aria-label", "Duelo perdido");
  dialog.style.cssText = "color:#f4f0e8;background:#091b2b;border:2px solid #55c9ff;border-radius:12px;padding:32px;max-width:calc(100vw - 40px);text-align:center;font-family:inherit";
  const title = document.createElement("h2");
  title.textContent = "DUELO PERDIDO";
  const message = document.createElement("p");
  message.textContent = "Puedes repetir este duelo con ambos combatientes recuperados o retirarte de la misión.";
  const retreat = document.createElement("button");
  retreat.className = "secondary-button";
  retreat.textContent = "RETIRADA";
  const retry = document.createElement("button");
  retry.className = "primary-button";
  retry.textContent = count > 0 ? `REINTENTAR (${count})` : scrolls > 0 ? `USAR PERGAMINO Y REINTENTAR (${scrolls})` : "SIN REINTENTOS";
  retry.disabled = count === 0 && scrolls === 0;
  if (scrolls > 0) message.textContent += ` Llevas ${scrolls} pergamino(s); se consumen solo cuando no quedan reintentos gratuitos.`;
  for (const button of [retreat, retry]) {
    button.type = "button";
    button.style.cssText = "margin:8px;padding:14px 22px;font:inherit";
  }
  dialog.append(title, message, retreat, retry);
  scene.game.canvas.parentElement.append(dialog);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (choice) => {
      if (settled) return;
      settled = true;
      scene.events.off("shutdown", onShutdown);
      dialog.close();
      dialog.remove();
      restoreHud?.();
      resolve(choice);
    };
    const onShutdown = () => finish(null);
    scene.events.once("shutdown", onShutdown);
    dialog.addEventListener("cancel", (event) => event.preventDefault());
    retreat.addEventListener("click", () => finish("retreat"));
    retry.addEventListener("click", () => { if (!retry.disabled) finish("retry"); });
    dialog.showModal();
    (count > 0 || scrolls > 0 ? retry : retreat).focus();
  });
}
