import { affinityScrollRequirement, countItem, unlockAffinityWithScroll } from "../../inventory.js?v=0.114.0";
import { BASIC_ELEMENT_IDS, elementIcon, elementName } from "../../elements.js?v=0.20.0";

export function mountDojoAffinityScroll(root, scope, { getSave, persist, rerender }) {
  const trigger = root.querySelector("[data-dojo-affinity-scroll]");
  if (!trigger) return;
  let dialog;
  const close = () => { dialog?.close(); dialog?.remove(); dialog = null; trigger.focus(); };
  scope.listen(trigger, "click", () => {
    const save = getSave();
    if (dialog || affinityScrollRequirement(save) || !countItem(save, "affinity_scroll")) return;
    dialog = document.createElement("dialog");
    dialog.className = "player-inventory-dialog dojo-affinity-dialog";
    dialog.setAttribute("aria-labelledby", "dojo-affinity-title");
    dialog.innerHTML = `<header><div><p class="eyebrow">DOJO · TERCER ESPACIO DE AFINIDAD</p><h2 id="dojo-affinity-title">Elige tu tercera afinidad</h2></div><button type="button" data-affinity-close aria-label="Cancelar elección de afinidad">×</button></header><p>Desbloquear una afinidad consume un pergamino. Esta elección quedará fijada.</p><div class="affinity-scroll-choice"><div>${BASIC_ELEMENT_IDS.filter(id => !save.character.affinities.includes(id)).map(id => `<button type="button" data-scroll-affinity="${id}"><img src="${elementIcon(id)}" alt="">Desbloquear ${elementName(id)}</button>`).join("")}</div></div><p role="alert"></p>`;
    root.append(dialog);
    scope.listen(dialog, "cancel", event => { event.preventDefault(); close(); });
    scope.listen(dialog, "click", event => {
      if (event.target.closest("[data-affinity-close]")) return close();
      const choice = event.target.closest("[data-scroll-affinity]");
      if (!choice) return;
      const result = unlockAffinityWithScroll(getSave(), choice.dataset.scrollAffinity);
      if (!result.ok) { dialog.querySelector("[role=alert]").textContent = result.message; return; }
      persist(result.save);
      close();
      rerender();
      root.querySelector('[data-dojo-tab="equipment"]')?.focus();
    });
    dialog.showModal();
  });
  scope.onCleanup(() => { dialog?.remove(); dialog = null; });
}
