import { ITEM_CATEGORIES, ITEMS, SHOP_ITEMS, sellPrice } from "../../../items.js?v=0.126.0";
import { countItem, purchaseItem, sellItem, saleBlockReason, sellableItemCount } from "../../../inventory.js?v=0.126.0";
import { itemIcon } from "../../item-icons.js?v=0.126.0";

export function createShopView(deps) {
  let save, mode = "buy", category = "all", message = "", host;
  const escape = deps.escapeHtml;
  function catalog() {
    const items = mode === "buy" ? SHOP_ITEMS : Object.values(ITEMS).filter(item => countItem(save, item.id) && sellPrice(item));
    return items.filter(item => category === "all" || item.category === category).map(item => {
      const count = countItem(save, item.id), selling = mode === "sell";
      const completed = item.kind === "contract" && save.campaign.completedSecondaryMissions.includes(item.missionId);
      const owned = item.stackLimit === 1 && (count > 0 || item.kind === "affinity" && save.inventory.extraAffinityUnlocked);
      const reason = selling ? saleBlockReason(save, item.id) : completed ? "Contrato completado" : owned ? "Ya lo tienes" : count >= item.stackLimit ? "Capacidad máxima" : save.progression.coins < item.price ? "Sin monedas" : "";
      const maximum = selling ? sellableItemCount(save, item.id) : item.stackLimit - count;
      const placed = item.kind === "decoration" ? count - sellableItemCount(save, item.id) : 0;
      return `<form class="item-card shop-item" data-shop-item="${item.id}"><div class="item-card-top"><span class="item-art">${itemIcon(item)}</span><span class="item-price">${item.price === 0 ? "Inicial" : `${selling ? sellPrice(item) : item.price} <small>monedas / unidad</small>`}</span></div><h3>${escape(item.name)}</h3><p>${escape(item.description)}</p><small class="shop-stock">En inventario: ${count}${placed ? ` · En Mi espacio: ${placed}` : ""}${reason && selling ? `<br>${escape(reason)}` : ""}</small><div class="shop-purchase">${item.stackLimit > 1 ? `<label>Cantidad<input type="number" min="1" max="${Math.max(1, maximum)}" value="1" aria-label="Cantidad de ${escape(item.name)}" ${maximum < 1 ? "disabled" : ""}></label>` : ""}<button type="submit" ${reason ? "disabled" : ""}>${selling ? "Vender" : reason || "Comprar"}</button></div></form>`;
    }).join("") || '<p class="inventory-empty">No tienes objetos para vender en esta categoría.</p>';
  }
  function contents() {
    return `<header class="shop-heading"><div><h2>Prepara tu próximo viaje</h2><p>Gestiona equipo, apariencia y sustitución en el Dojo. Los contratos se juegan en el tablón y las decoraciones se colocan en el Gremio.</p></div><strong class="shop-wallet">${save.progression.coins}<small>MONEDAS</small></strong></header><nav class="shop-tabs" aria-label="Operación de la tienda"><button type="button" data-shop-mode="buy" aria-pressed="${mode === "buy"}">Comprar</button><button type="button" data-shop-mode="sell" aria-pressed="${mode === "sell"}">Vender</button><span>Vendemos por el precio indicado y compramos a mitad de precio, redondeada hacia abajo.</span></nav><p class="shop-feedback" role="status">${escape(message)}</p><nav class="shop-categories" aria-label="Tipos de objetos">${Object.entries(ITEM_CATEGORIES).map(([id, label]) => `<button type="button" data-shop-category="${id}" aria-pressed="${category === id}">${label}</button>`).join("")}</nav><div class="shop-items">${catalog()}</div>`;
  }
  const refresh = () => { host.innerHTML = contents(); };
  return {
    id: "shop",
    render(state) { save = state.save; return `<section class="shop-panel" aria-label="Tienda">${contents()}</section>`; },
    mount(root, scope) {
      host = root.querySelector(".shop-panel");
      scope.listen(host, "click", event => {
        const tab = event.target.closest("[data-shop-mode]"), filter = event.target.closest("[data-shop-category]");
        if (tab) { mode = tab.dataset.shopMode; category = "all"; message = ""; refresh(); }
        if (filter) { category = filter.dataset.shopCategory; refresh(); }
      });
      scope.listen(host, "submit", event => {
        event.preventDefault();
        const form = event.target.closest("[data-shop-item]");
        if (!form) return;
        const result = (mode === "buy" ? purchaseItem : sellItem)(save, form.dataset.shopItem, Number(form.querySelector("input")?.value || 1));
        if (result.ok) save = deps.onPersist(result.save);
        message = result.message;
        refresh();
        const coins = root.querySelector(".summary-item:last-child strong");
        if (coins) { coins.textContent = save.progression.coins; coins.parentElement.setAttribute("aria-label", `${save.progression.coins} monedas`); }
      });
    },
    dispose() { host = null; }
  };
}
