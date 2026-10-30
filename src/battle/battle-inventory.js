import { ITEMS } from "../items.js?v=0.114.0";
import { countItem, missionItemEffect, removeItem } from "../inventory.js?v=0.114.0";
import { writeSave } from "../save.js?v=0.114.0";
import { battleRuntime } from "./session.js?v=1.0.0";
import { itemIcon, bagIcon } from "../ui/item-icons.js?v=0.114.0";

// Los gastos se guardan contra el inicio de misión, nunca contra las recompensas
// provisionales. Se sincronizan todas las copias para que ni retirada ni victoria
// devuelvan pociones/pergaminos ya consumidos.
export function consumeBattleItem(scene, itemId, persist = writeSave) {
  const result = removeItem(scene.saveData, itemId);
  if (!result.ok) return result;
  for (const key of ["saveData", "missionStartSave", "rewardPreviewSave"]) {
    if (scene[key]) scene[key] = { ...scene[key], inventory: structuredClone(result.save.inventory) };
  }
  scene.missionStartSave = persist(scene.missionStartSave);
  battleRuntime.activeSave = scene.missionStartSave;
  return result;
}

export function itemUseReason(scene, id) {
  if (!countItem(scene.saveData, id)) return "No tienes este objeto.";
  if (scene.mission.tutorialReplay || scene.combatTutorial?.active) return "Completa el entrenamiento antes de usar objetos.";
  if (scene.finished || scene.busy || !scene.turnReady) return "Espera a tu turno para usar un objeto.";
  const effect = missionItemEffect(id, scene.player);
  return effect.ok ? "" : effect.reason;
}

export async function applyBattleConsumable(scene, id) {
  const effect = missionItemEffect(id, scene.player);
  if (!effect.ok) return false;
  if (!consumeBattleItem(scene, id).ok) return false;
  scene.player.hp += effect.hp;
  scene.player.chakra += effect.chakra;
  if (effect.cleanse) { scene.player.statuses = []; scene.player.soak = null; }
  scene.refreshHud();
  const parts = [effect.hp ? `+${effect.hp} PV` : "", effect.chakra ? `+${effect.chakra} CH` : "", effect.cleanse ? "PURIFICADO" : ""].filter(Boolean);
  scene.floatLabel(scene.hero.body.x, scene.hero.body.y - 125, parts.join(" · "), 0xa8d99c);
  scene.setMessage(`${ITEMS[id].name}: ${parts.join(" · ")}.`);
  await scene.delay(240);
  return true;
}

export function mountBattleInventory(scene, parent) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "combat-access-inventory";
  button.setAttribute("aria-label", "Abrir mochila de misión");
  button.innerHTML = `${bagIcon}<span>Mochila</span>`;
  parent.append(button);
  let dialog = null;
  const close = () => {
    if (!dialog) return;
    dialog.close(); dialog.remove(); dialog = null;
    scene.inventoryDialogOpen = false;
    if (scene.scene.isPaused()) scene.scene.resume();
    button.focus({ preventScroll: true });
  };
  const open = () => {
    if (dialog || !scene.scene.isActive() || scene.finished || scene.busy) return;
    scene.inventoryDialogOpen = true;
    dialog = document.createElement("dialog");
    dialog.className = "battle-inventory-dialog player-inventory-dialog";
    dialog.setAttribute("aria-label", "Mochila de misión");
    const consumables = Object.values(ITEMS).filter(item => item.kind === "consumable" && countItem(scene.saveData, item.id) > 0);
    dialog.innerHTML = `<header><div><p class="eyebrow">SUMINISTROS DE MISIÓN</p><h2>Mochila</h2></div><button type="button" data-bag-close aria-label="Cerrar mochila">×</button></header><p>Usar un objeto consume tu turno. Los objetos gastados no se recuperan al retirarte o reintentar.</p><div class="inventory-items">${consumables.map(item => {
      const reason = itemUseReason(scene, item.id);
      return `<article class="item-card"><div class="item-card-top"><span class="item-art">${itemIcon(item)}</span><strong>×${countItem(scene.saveData, item.id)}</strong></div><h3>${item.name}</h3><p>${item.description}</p>${reason ? `<small>${reason}</small>` : ""}<button type="button" data-use-item="${item.id}" ${reason ? "disabled" : ""}>Usar ${item.name}</button></article>`;
    }).join("") || '<p class="inventory-empty">No llevas consumibles. Puedes comprarlos en la tienda de la aldea.</p>'}</div><p class="inventory-use-note">Pergaminos de reintento: ${countItem(scene.saveData, "retry_scroll")}. Se ofrecen al perder un duelo después de los reintentos gratuitos.</p>`;
    scene.game.canvas.parentElement.append(dialog);
    scene.scene.pause();
    dialog.addEventListener("cancel", event => { event.preventDefault(); close(); });
    dialog.addEventListener("click", event => {
      if (event.target.closest("[data-bag-close]")) return close();
      const use = event.target.closest("[data-use-item]");
      if (!use || use.disabled) return;
      const id = use.dataset.useItem;
      if (itemUseReason(scene, id)) return;
      close();
      scene.useJutsu({ id, itemId: id, type: "item", name: ITEMS[id].name, cost: 0, cooldown: 0, speedMod: 0, seals: [], element: "none" });
    });
    dialog.showModal();
    dialog.querySelector("[data-bag-close]").focus();
  };
  button.addEventListener("click", open);
  scene.events.once("shutdown", () => { dialog?.remove(); dialog = null; scene.inventoryDialogOpen = false; });
  return { refresh() { button.disabled = Boolean(scene.finished || scene.busy); }, button };
}
